import axios from 'axios';
import { config } from './config';

async function testAmoCrmNewToken() {
  console.log('🧪 Testing NEW amoCRM Long-Term Access Token...');
  const fullDomain = config.amocrm.subdomain.includes('amocrm.ru') ? config.amocrm.subdomain : `${config.amocrm.subdomain}.amocrm.ru`;
  console.log(`🔗 Target URL: https://${fullDomain}`);
  console.log(`📋 Pipeline ID: ${config.amocrm.pipelineId}`);
  console.log(`🔑 Access Token (first 30 chars): ${config.amocrm.accessToken.slice(0, 30)}...`);

  const client = axios.create({
    baseURL: `https://${fullDomain}`,
    headers: {
      Authorization: `Bearer ${config.amocrm.accessToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

  try {
    // 1. Get Account Info
    console.log('\n--- 1. Account Metadata ---');
    const accountRes = await client.get('/api/v4/account');
    console.log('✅ Account Name:', accountRes.data.name);
    console.log('✅ Account ID:', accountRes.data.id);
    console.log('✅ Subdomain:', accountRes.data.subdomain);

    // 2. Fetch Pipelines
    console.log('\n--- 2. Fetching Pipelines ---');
    const pipelinesRes = await client.get('/api/v4/leads/pipelines');
    const pipelines = pipelinesRes.data?._embedded?.pipelines || [];
    console.log(`✅ Found ${pipelines.length} pipelines:`);
    pipelines.forEach((p: any) => {
      console.log(`   - Pipeline: "${p.name}" (ID: ${p.id})`);
      const statuses = p._embedded?.statuses || [];
      statuses.forEach((s: any) => {
        console.log(`     * Status: "${s.name}" (ID: ${s.id})`);
      });
    });

    // 3. Create Test Contact
    console.log('\n--- 3. Creating Test Contact ---');
    const testPhone = `+99890${Math.floor(1000007 + Math.random() * 8999999)}`;
    const contactRes = await client.post('/api/v4/contacts', [
      {
        name: 'Azizbek Karimov (Test Nomzod)',
        custom_fields_values: [
          {
            field_code: 'PHONE',
            values: [{ value: testPhone, enum_code: 'WORK' }],
          },
        ],
      },
    ]);
    const contactId = contactRes.data._embedded.contacts[0].id;
    console.log(`✅ Created Contact ID: ${contactId} with phone ${testPhone}`);

    // 4. Create Lead in Pipeline 10505546
    console.log(`\n--- 4. Creating Lead in Pipeline ${config.amocrm.pipelineId} ---`);
    const targetPipeline = pipelines.find((p: any) => String(p.id) === String(config.amocrm.pipelineId)) || pipelines[0];
    const initialStatus = targetPipeline._embedded?.statuses.find((s: any) => s.id !== 142 && s.id !== 143 && !s.name.toLowerCase().includes('неразобранное')) || targetPipeline._embedded?.statuses[1];

    const leadPayload = [
      {
        name: `Marketing Markazi — Sotuv Menejeri — Azizbek Karimov`,
        pipeline_id: parseInt(targetPipeline.id, 10),
        status_id: parseInt(initialStatus.id, 10),
        _embedded: {
          contacts: [{ id: contactId }],
        },
      },
    ];

    const leadRes = await client.post('/api/v4/leads', leadPayload);
    const leadId = leadRes.data._embedded.leads[0].id;
    console.log(`🎯 Created Lead ID: ${leadId} in Pipeline "${targetPipeline.name}" Status "${initialStatus.name}"`);

    // 5. Attach Note to Lead
    console.log('\n--- 5. Attaching HR Summary & Video Note ---');
    const noteText =
      `🤖 Telegram HR-bot muvaffaqiyatli anketa\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 Kompaniya: Marketing Markazi\n` +
      `💼 Vakansiya: Sotuv Menejeri\n` +
      `👤 F.I.O.: Azizbek Karimov\n` +
      `📱 Telefon: ${testPhone}\n` +
      `🎥 Video: Telegram HR Group (-1002923694952) yuborildi\n` +
      `⭐ Avtomatik reyting: 92/100\n` +
      `💬 AI Xulosasi: Nomzod sotuv sohasida 2 yillik tajribaga ega, muloqot madaniyati a'lo.`;

    await client.post(`/api/v4/leads/${leadId}/notes`, [
      {
        note_type: 'common',
        params: { text: noteText },
      },
    ]);
    console.log(`✅ Note attached successfully to Lead ID ${leadId}`);

    console.log('\n🎉 ALL AMOCRM LIVE API TESTS PASSED 100% PERFECTLY!');
  } catch (error: any) {
    console.error('❌ amoCRM API Error:', JSON.stringify(error.response?.data, null, 2) || error.message);
  }
}

testAmoCrmNewToken();
