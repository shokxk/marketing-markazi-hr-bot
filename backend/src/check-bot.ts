import { Bot } from 'grammy';
import { config } from './config';

async function checkBot() {
  console.log('🤖 Checking Bot Status for Token:', config.botToken);
  const bot = new Bot(config.botToken);
  try {
    const me = await bot.api.getMe();
    console.log('✅ Bot identity:', me.username, 'ID:', me.id);

    const webhookInfo = await bot.api.getWebhookInfo();
    console.log('🌐 Webhook Info:', JSON.stringify(webhookInfo, null, 2));

    if (webhookInfo.url) {
      console.log('⚠️ Webhook found! Deleting webhook so long polling works...');
      await bot.api.deleteWebhook({ drop_pending_updates: true });
      console.log('✅ Webhook deleted successfully!');
    } else {
      console.log('✅ No webhook set. Long polling is ready.');
    }
  } catch (err: any) {
    console.error('❌ Bot check error:', err.message);
  }
}

checkBot();
