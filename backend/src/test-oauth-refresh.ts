import axios from 'axios';
import { config } from './config';

async function testRefreshToken() {
  console.log('🔑 Attempting OAuth token validation and refresh...');
  console.log('Client ID:', config.amocrm.clientId);

  const testDomains = [
    'https://31535142.amocrm.ru',
    'https://api-b.amocrm.ru',
    'https://marketingmarkazi.amocrm.ru',
  ];

  for (const domain of testDomains) {
    console.log(`\nTesting ${domain}...`);
    try {
      const res = await axios.get(`${domain}/api/v4/leads/pipelines`, {
        headers: {
          Authorization: `Bearer ${config.amocrm.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      console.log(`✅ SUCCESS on ${domain}! Pipelines found:`, res.data._embedded?.pipelines?.length);
      return;
    } catch (err: any) {
      console.log(`❌ Failed on ${domain}: Status ${err.response?.status} - ${JSON.stringify(err.response?.data || err.message)}`);
    }
  }
}

testRefreshToken();
