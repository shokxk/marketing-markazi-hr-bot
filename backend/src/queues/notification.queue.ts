import { Queue, Worker } from 'bullmq';
import { config } from '../config';
import { Bot } from 'grammy';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const redisConnection = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword || undefined,
};

export const notificationQueue = new Queue('hr-notification', {
  connection: redisConnection,
  defaultJobOptions: { attempts: 3, backoff: 3000 },
});

export async function enqueueHrTelegramNotification(applicationId: string) {
  try {
    await notificationQueue.add('notify-hr-group', { applicationId });
  } catch (err) {
    console.log('⚠️ Redis queue fallback: sending inline HR Telegram notification');
    await sendHrNotificationInline(applicationId).catch(console.error);
  }
}

export async function sendHrNotificationInline(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      user: true,
      company: true,
      vacancy: true,
      answers: { include: { question: true } },
    },
  });

  if (!app) return;

  const targetGroupId = app.company.telegramGroupId || config.hrTelegramGroupId;
  if (!targetGroupId) return;

  const answerMap: Record<string, string> = {};
  app.answers.forEach((ans) => {
    answerMap[ans.question.code] = ans.answerText || '';
  });

  const candidateName = answerMap['Q1_FULL_NAME'] || app.user.fullName || 'Nomzod';
  const phone = answerMap['Q4_PHONE'] || app.user.phone || 'Ko\'rsatilmadi';

  const caption =
    `<b>YANGI NOMZOD ANKETASI 🔔</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 <b>Kompaniya:</b> ${app.company.name}\n` +
    `💼 <b>Vakansiya:</b> ${app.vacancy.title}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>Nomzod:</b> ${candidateName}\n` +
    `📱 <b>Telefon:</b> ${phone}\n` +
    `💬 <b>Telegram:</b> @${app.user.telegramUsername || 'mavjud emas'}\n` +
    `📍 <b>Hudud:</b> ${answerMap['Q6_REGION'] || 'Ko\'rsatilmadi'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🛠 <b>Ish tajribasi:</b> ${answerMap['Q10_TOTAL_EXPERIENCE'] || 'Ko\'rsatilmadi'}\n` +
    `📈 <b>Sotuv tajribasi:</b> ${answerMap['Q13_SALES_EXPERIENCE'] || 'Ko\'rsatilmadi'}\n` +
    `💻 <b>CRM:</b> ${answerMap['Q14_CRM_EXPERIENCE'] || 'Yo\'q'}\n` +
    `🌐 <b>Tillar:</b> ${answerMap['Q16_LANGUAGES'] || 'Ko\'rsatilmadi'}\n` +
    `💰 <b>Kutilayotgan oylik:</b> ${answerMap['Q18_EXPECTED_SALARY'] || 'Ko\'rsatilmadi'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⭐ <b>Avtomatik reyting:</b> ${app.score}/100\n` +
    `📌 <b>Ariza №:</b> <code>${app.applicationNumber}</code>\n\n` +
    `🤖 <i>AI Xulosasi:</i>\n${app.aiSummary || 'Mavjud emas'}`;

  try {
    const bot = new Bot(config.botToken);

    if (app.videoUrl && app.videoUrl.startsWith('telegram_file_id:')) {
      const fileId = app.videoUrl.replace('telegram_file_id:', '');
      try {
        // First try sending as video note
        await bot.api.sendVideoNote(targetGroupId, fileId);
        await bot.api.sendMessage(targetGroupId, caption, { parse_mode: 'HTML' });
      } catch {
        // Fallback: send as regular video with caption
        await bot.api.sendVideo(targetGroupId, fileId, {
          caption,
          parse_mode: 'HTML',
        });
      }
    } else {
      await bot.api.sendMessage(targetGroupId, caption, { parse_mode: 'HTML' });
    }
    console.log(`✅ Sent candidate application & video to HR Telegram Group (${targetGroupId})`);
  } catch (e: any) {
    console.error('❌ Failed to send Telegram notification to HR group:', e.message);
  }
}

// Worker setup
if (process.env.NODE_ENV !== 'test') {
  try {
    const worker = new Worker(
      'hr-notification',
      async (job) => {
        const { applicationId } = job.data;
        await sendHrNotificationInline(applicationId);
      },
      { connection: redisConnection }
    );
  } catch (e) {
    console.log('⚠️ Redis notification worker disabled');
  }
}
