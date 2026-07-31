import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Build Axios instance for amoCRM API requests
function buildAmoCrmClient(): AxiosInstance {
  const domain = config.amocrm.subdomain.includes('amocrm.ru') 
    ? config.amocrm.subdomain 
    : `${config.amocrm.subdomain}.amocrm.ru`;

  return axios.create({
    baseURL: `https://${domain}`,
    headers: {
      Authorization: `Bearer ${config.amocrm.accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

/** Search contact by phone number. Returns contactId or null. */
async function findContactByPhone(client: AxiosInstance, phone: string): Promise<string | null> {
  try {
    const cleanPhone = phone.replace(/\s/g, '');
    const res = await client.get(`/api/v4/contacts`, {
      params: { query: cleanPhone },
    });
    const contacts = res.data?._embedded?.contacts;
    if (Array.isArray(contacts) && contacts.length > 0) {
      for (const c of contacts) {
        const fields = c.custom_fields_values || [];
        for (const f of fields) {
          if (f.field_code === 'PHONE') {
            const values: string[] = (f.values || []).map((v: any) => v.value?.replace(/\s/g, ''));
            if (values.includes(cleanPhone)) {
              return String(c.id);
            }
          }
        }
      }
      return String(contacts[0].id);
    }
    return null;
  } catch {
    return null;
  }
}

/** Create a new contact in amoCRM. */
async function createContact(
  client: AxiosInstance,
  candidateName: string,
  phone: string,
  telegramUsername?: string
): Promise<string> {
  const res = await client.post(`/api/v4/contacts`, [
    {
      name: candidateName,
      custom_fields_values: [
        {
          field_code: 'PHONE',
          values: [{ value: phone, enum_code: 'WORK' }],
        },
      ],
    },
  ]);
  return String(res.data._embedded.contacts[0].id);
}

/** Find target pipeline (e.g. 10505546) and status ID */
async function findHrPipeline(client: AxiosInstance): Promise<{ pipelineId: string; statusId: string } | null> {
  try {
    const res = await client.get(`/api/v4/leads/pipelines`);
    const pipelines = res.data?._embedded?.pipelines || [];

    // Target configured pipeline ID if specified (e.g., 10505546)
    if (config.amocrm.pipelineId) {
      const match = pipelines.find((p: any) => String(p.id) === String(config.amocrm.pipelineId));
      if (match) {
        const firstStatus = match._embedded?.statuses[0];
        if (firstStatus) {
          return {
            pipelineId: String(match.id),
            statusId: String(firstStatus.id),
          };
        }
      }
    }

    // Auto-discover fallback by name "HR"
    for (const pipeline of pipelines) {
      if (/hr/i.test(pipeline.name)) {
        const statuses = pipeline._embedded?.statuses || [];
        const firstStatus = statuses.find((s: any) => /yangi|new|incoming/i.test(s.name)) || statuses[0];
        if (firstStatus) {
          return {
            pipelineId: String(pipeline.id),
            statusId: String(firstStatus.id),
          };
        }
      }
    }

    if (pipelines.length > 0) {
      const pipeline = pipelines[0];
      const statuses = pipeline._embedded?.statuses || [];
      if (statuses.length > 0) {
        return {
          pipelineId: String(pipeline.id),
          statusId: String(statuses[0].id),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncApplicationToAmoCrm(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      company: true,
      vacancy: true,
      answers: { include: { question: true } },
    },
  });

  if (!app) throw new Error(`Application ${applicationId} not found`);

  const answerMap: Record<string, string> = {};
  app.answers.forEach((ans) => {
    answerMap[ans.question.code] = ans.answerText || '';
  });

  const candidateName = answerMap['Q1_FULL_NAME'] || app.user.fullName || 'Nomzod';
  const phone = answerMap['Q4_PHONE'] || app.user.phone || '+998000000000';
  const dealName = `${app.company.name} — ${app.vacancy.title} — ${candidateName}`;

  console.log(`📡 Syncing to amoCRM: "${dealName}"`);

  if (!config.amocrm.accessToken) {
    console.log(`⚠️ amoCRM access token not set. Using MOCK mode.`);
    const mockLeadId = `MOCK_LEAD_${Date.now()}`;
    const mockContactId = `MOCK_CONTACT_${Date.now()}`;
    await prisma.application.update({
      where: { id: applicationId },
      data: { amocrmLeadId: mockLeadId, amocrmContactId: mockContactId },
    });
    return { leadId: mockLeadId, contactId: mockContactId, mode: 'mock' };
  }

  const client = buildAmoCrmClient();

  try {
    let contactId: string | null = await findContactByPhone(client, phone);
    let isDuplicateContact = false;

    if (contactId) {
      console.log(`♻️ Found existing contact ${contactId} for phone ${phone} — Duplicate candidate`);
      isDuplicateContact = true;
    } else {
      contactId = await createContact(client, candidateName, phone, app.user.telegramUsername || undefined);
      console.log(`✅ Created new amoCRM contact ${contactId}`);
    }

    const pipeline = await findHrPipeline(client);
    console.log(`📋 Pipeline resolved:`, pipeline);

    const createLeadPayload = [
      {
        name: dealName,
        ...(pipeline?.pipelineId ? { pipeline_id: parseInt(pipeline.pipelineId, 10) } : {}),
        ...(pipeline?.statusId ? { status_id: parseInt(pipeline.statusId, 10) } : {}),
        _embedded: {
          contacts: [{ id: parseInt(contactId!, 10) }],
        },
      },
    ];

    const createLeadRes = await client.post(`/api/v4/leads`, createLeadPayload);
    const leadId = String(createLeadRes.data._embedded.leads[0].id);
    console.log(`🎯 Created amoCRM lead ${leadId}: "${dealName}"`);

    const noteText = buildNoteText(app, answerMap, candidateName, phone);

    await client.post(`/api/v4/leads/${leadId}/notes`, [
      {
        note_type: 'common',
        params: { text: noteText },
      },
    ]);

    console.log(`📝 Note attached to lead ${leadId}`);

    await prisma.application.update({
      where: { id: applicationId },
      data: {
        amocrmLeadId: leadId,
        amocrmContactId: contactId,
        isDuplicate: isDuplicateContact,
      },
    });

    return { leadId, contactId, mode: 'live' };
  } catch (error: any) {
    const errData = error.response?.data;
    console.error('❌ amoCRM API error:', errData || error.message);

    if (error.response?.status === 429) {
      console.warn('⚠️ amoCRM rate limit hit — job will be retried by BullMQ queue');
    }

    throw error;
  }
}

function buildNoteText(app: any, answerMap: Record<string, string>, candidateName: string, phone: string): string {
  const videoInfo = app.videoUrl
    ? `Mavjud ✅ (Telegram HR Group -1002923694952 yuborildi)`
    : `Yuborilmadi ❌`;

  return (
    `🤖 Telegram HR-bot orqali yangi anketa\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 Kompaniya: ${app.company.name}\n` +
    `💼 Vakansiya: ${app.vacancy.title}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 F.I.O.: ${candidateName}\n` +
    `📅 Tug'ilgan yil: ${answerMap['Q2_BIRTH_YEAR'] || ''}\n` +
    `📱 Telefon: ${phone}\n` +
    `💬 Telegram: @${app.user.telegramUsername || 'mavjud emas'}\n` +
    `📍 Hudud: ${answerMap['Q6_REGION'] || ''}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎓 Ta'lim: ${answerMap['Q8_EDUCATION_LEVEL'] || ''}\n` +
    `🏫 O'quv muassasasi: ${answerMap['Q9_EDUCATION_INSTITUTION'] || ''}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 Umumiy tajriba: ${answerMap['Q10_TOTAL_EXPERIENCE'] || ''}\n` +
    `🏢 Oxirgi ish joyi: ${answerMap['Q11_LAST_JOB'] || 'Ko\'rsatilmadi'}\n` +
    `🚪 Ketish sababi: ${answerMap['Q12_REASON_LEAVING'] || 'Ko\'rsatilmadi'}\n` +
    `📈 Sotuv tajribasi: ${answerMap['Q13_SALES_EXPERIENCE'] || ''}\n` +
    `💻 CRM tajribasi: ${answerMap['Q14_CRM_EXPERIENCE'] || ''}\n` +
    `🖥 Kompyuter: ${answerMap['Q15_COMPUTER_SKILLS'] || ''}\n` +
    `🌐 Tillar: ${answerMap['Q16_LANGUAGES'] || ''}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ Ish grafigi: ${answerMap['Q17_WORK_SCHEDULE_CONFIRM'] || ''}\n` +
    `💰 Kutilayotgan oylik: ${answerMap['Q18_EXPECTED_SALARY'] || ''}\n` +
    `📅 Ishga chiqish: ${answerMap['Q19_START_DATE'] || ''}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎥 Video tanishtiruv: ${videoInfo}\n` +
    `⭐ Avtomatik reyting: ${app.score}/100\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💬 O'zi haqida:\n${answerMap['Q20_SELF_INTRO'] || 'Ko\'rsatilmadi'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 AI Xulosasi:\n${app.aiSummary || 'Hisoblash kutilmoqda...'}`
  );
}
