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
        const statuses = match._embedded?.statuses || [];
        const validStatus = statuses.find((s: any) => s.id !== 142 && s.id !== 143 && !s.name.toLowerCase().includes('неразобранное')) || statuses[1] || statuses[0];
        if (validStatus) {
          return {
            pipelineId: String(match.id),
            statusId: String(validStatus.id),
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
  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (answerMap[k]) return String(answerMap[k]);
    }
    return 'Ko\'rsatilmadi';
  };

  const videoInfo = app.videoUrl
    ? `Mavjud ✅ (Telegram HR Group yuborildi)`
    : `Yuborilmadi ❌`;

  return (
    `🤖 Telegram HR-bot orqali yangi ariza\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 Kompaniya: ${app.company?.name || 'Flourenza'}\n` +
    `💼 Vakansiya: ${app.vacancy?.title || 'Call Center Sotuv Menejeri'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 F.I.O.: ${candidateName}\n` +
    `📱 Telefon: ${phone}\n` +
    `🎂 Yosh: ${getVal('Q3_AGE', 'Q2_BIRTH_YEAR', 'age')}\n` +
    `📍 Hudud: ${getVal('Q4_CITY', 'Q6_REGION', 'city', 'shahar')}\n` +
    `💬 Telegram: @${app.user?.telegramUsername || 'mavjud emas'}\n` +
    `💍 Oilaviy ahvol: ${getVal('Q5_MARITAL_STATUS', 'marital_status')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎓 Ta'lim: ${getVal('Q6_EDUCATION_LEVEL', 'Q8_EDUCATION_LEVEL', 'education_level')}\n` +
    `🏫 O'quv muassasa: ${getVal('Q7_EDUCATION_PLACE', 'Q9_EDUCATION_INSTITUTION', 'education_place')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📊 Tajriba: ${getVal('Q8_CALLCENTER_EXP', 'Q10_TOTAL_EXPERIENCE', 'experience')}\n` +
    `🏢 Oxirgi ish: ${getVal('Q9_LAST_JOB', 'Q11_LAST_JOB')}\n` +
    `🚪 Ketish sababi: ${getVal('Q10_REASON_LEAVING', 'Q12_REASON_LEAVING')}\n` +
    `💻 CRM tajribasi: ${getVal('Q11_AMOCRM_EXP', 'Q14_CRM_EXPERIENCE')}\n` +
    `🖥 Kompyuter: ${getVal('Q12_COMPUTER_SKILLS', 'Q15_COMPUTER_SKILLS')}\n` +
    `🌐 Tillar: ${getVal('Q13_LANGUAGES', 'Q16_LANGUAGES')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏰ Ish grafigi: ${getVal('Q14_WORK_SCHEDULE', 'Q17_WORK_SCHEDULE_CONFIRM')}\n` +
    `💰 Kutilayotgan oylik: ${getVal('Q15_SALARY_EXPECTATION', 'Q18_EXPECTED_SALARY')}\n` +
    `📅 Ishga chiqish: ${getVal('Q16_START_DATE', 'Q19_START_DATE')}\n` +
    `🎯 Motivatsiya: ${getVal('Q19_MOTIVATION', 'motivation')}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🎥 Video tanishtiruv: ${videoInfo}\n` +
    `⭐ Avtomatik reyting: ${app.score || 95}/100\n` +
    `💬 Face ID / O'zi haqida:\n${getVal('Q20_SELF_INTRO', 'face_id')}`
  );
}

export async function syncDirectPayloadToAmoCrm(data: {
  candidateName: string;
  phone: string;
  city?: string;
  vacancyTitle?: string;
  companyName?: string;
  answers?: Record<string, any>;
  source?: string;
}) {
  if (!config.amocrm.accessToken) {
    console.log(`⚠️ amoCRM access token not set. Skipping sync.`);
    return;
  }

  const client = buildAmoCrmClient();
  const candidateName = data.candidateName || 'Nomzod';
  const phone = data.phone && data.phone !== 'Ko\'rsatilmadi' ? data.phone : '+998000000000';
  const compName = data.companyName || 'Flourenza';
  const vacTitle = data.vacancyTitle || 'Call Center Sotuv Menejeri';
  const dealName = `${compName} — ${vacTitle} — ${candidateName}`;

  try {
    let contactId: string | null = await findContactByPhone(client, phone);
    if (!contactId) {
      contactId = await createContact(client, candidateName, phone);
    }

    const pipeline = await findHrPipeline(client);
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
    console.log(`🎯 Created amoCRM lead ${leadId} for ${data.source || 'App'}: "${dealName}"`);

    const ans = data.answers || {};
    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        if (ans[k]) return String(ans[k]);
      }
      return 'Ko\'rsatilmadi';
    };

    const noteText =
      `🤖 Telegram HR (${data.source || 'Mini App'}) — Yangi Ariza\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 Kompaniya: ${compName}\n` +
      `💼 Vakansiya: ${vacTitle}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 F.I.O.: ${candidateName}\n` +
      `📱 Telefon: ${phone}\n` +
      `🎂 Yosh: ${getVal('Q3_AGE', 'age')}\n` +
      `📍 Manzil: ${data.city || getVal('Q4_CITY', 'city', 'shahar')}\n` +
      `💍 Oilaviy ahvol: ${getVal('Q5_MARITAL_STATUS', 'marital_status')}\n` +
      `🎓 Ta'lim: ${getVal('Q6_EDUCATION_LEVEL', 'education_level')}\n` +
      `🏫 O'quv muassasa: ${getVal('Q7_EDUCATION_PLACE', 'education_place')}\n` +
      `📊 Tajriba: ${getVal('Q8_CALLCENTER_EXP', 'callcenter_exp', 'experience')}\n` +
      `🏢 Oxirgi ish: ${getVal('Q9_LAST_JOB', 'last_job')}\n` +
      `🚪 Ketish sababi: ${getVal('Q10_REASON_LEAVING', 'reason_leaving')}\n` +
      `💻 CRM tajribasi: ${getVal('Q11_AMOCRM_EXP', 'amocrm_exp')}\n` +
      `🖥 Kompyuter: ${getVal('Q12_COMPUTER_SKILLS', 'computer_skills')}\n` +
      `🌐 Tillar: ${getVal('Q13_LANGUAGES', 'languages')}\n` +
      `⏰ Ish grafigi: ${getVal('Q14_WORK_SCHEDULE', 'work_schedule')}\n` +
      `💰 Kutilayotgan maosh: ${getVal('Q15_SALARY_EXPECTATION', 'salary_expectation')}\n` +
      `📅 Ishga chiqish: ${getVal('Q16_START_DATE', 'start_date')}\n` +
      `🎯 Motivatsiya: ${getVal('Q19_MOTIVATION', 'motivation')}\n` +
      `📸 Face ID: ${getVal('Q20_SELF_INTRO', 'face_id')}\n`;

    await client.post(`/api/v4/leads/${leadId}/notes`, [
      { note_type: 'common', params: { text: noteText } }
    ]);
    console.log(`📝 Note attached to amoCRM lead ${leadId}`);
    return leadId;
  } catch (err: any) {
    console.error('❌ amoCRM direct sync error:', err.response?.data || err.message);
  }
}
