import { BotContext } from '../types';
import { getPreviewKeyboard, getEditSectionsKeyboard, getMainMenuKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function startPreviewStep(ctx: BotContext) {
  ctx.session.step = 'PREVIEW';

  const answers = ctx.session.answers || {};
  const companyName = ctx.session.selectedCompanyName || 'Tanlanmagan';
  const vacancyName = ctx.session.selectedVacancyName || 'Tanlanmagan';

  const summary =
    `<b>Ma’lumotlaringizni tekshiring 📋</b>\n\n` +
    `🏢 <b>Kompaniya:</b> ${companyName}\n` +
    `💼 <b>Vakansiya:</b> ${vacancyName}\n` +
    `👤 <b>F.I.O.:</b> ${answers['Q1_FULL_NAME'] || 'Ko\'rsatilmadi'}\n` +
    `📅 <b>Tug'ilgan yil:</b> ${answers['Q2_BIRTH_YEAR'] || 'Ko\'rsatilmadi'}\n` +
    `📍 <b>Hudud:</b> ${answers['Q6_REGION'] || 'Ko\'rsatilmadi'}\n` +
    `📱 <b>Telefon:</b> ${answers['Q4_PHONE'] || 'Ko\'rsatilmadi'}\n` +
    `🛠 <b>Ish tajribasi:</b> ${answers['Q10_TOTAL_EXPERIENCE'] || 'Ko\'rsatilmadi'}\n` +
    `📈 <b>Sotuv tajribasi:</b> ${answers['Q13_SALES_EXPERIENCE'] || 'Ko\'rsatilmadi'}\n` +
    `💻 <b>CRM tajribasi:</b> ${Array.isArray(answers['Q14_CRM_EXPERIENCE']) ? answers['Q14_CRM_EXPERIENCE'].join(', ') : answers['Q14_CRM_EXPERIENCE'] || 'Yo\'q'}\n` +
    `💰 <b>Kutilayotgan oylik:</b> ${answers['Q18_EXPECTED_SALARY'] || 'Ko\'rsatilmadi'}\n` +
    `⏰ <b>Ishga chiqish vaqti:</b> ${answers['Q19_START_DATE'] || 'Ko\'rsatilmadi'}\n` +
    `🎥 <b>Video tanishtiruv:</b> ${ctx.session.videoFileId ? 'Yuborilgan ✅' : 'Yuborilmadi ❌'}\n`;

  const keyboard = getPreviewKeyboard(ctx.session.lang);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(summary, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply(summary, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

export async function handleAppSubmit(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const appId = ctx.session.applicationId;
  let appNumber = `HR-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  if (appId) {
    const updatedApp = await prisma.application.update({
      where: { id: appId },
      data: {
        status: 'SUBMITTED',
        completionPercent: 100,
        submittedAt: new Date(),
      },
      include: { company: true, vacancy: true },
    });
    appNumber = updatedApp.applicationNumber;

    // Calculate score & generate AI summary async
    const { calculateScore } = await import('../../services/scoring.service');
    const { generateAiSummary } = await import('../../services/ai-summary.service');

    const score = await calculateScore(appId);
    const aiSummary = await generateAiSummary(appId);

    await prisma.application.update({
      where: { id: appId },
      data: { score, aiSummary },
    });

    // Enqueue amoCRM sync task
    const { enqueueAmoCrmSync } = await import('../../queues/amocrm.queue');
    await enqueueAmoCrmSync(appId);

    // Enqueue HR Telegram Group alert
    const { enqueueHrTelegramNotification } = await import('../../queues/notification.queue');
    await enqueueHrTelegramNotification(appId);
  }

  // Reset session
  ctx.session.step = 'IDLE';
  ctx.session.answers = {};
  ctx.session.videoFileId = undefined;

  const successMsg = t('app_success_msg', ctx.session.lang, {
    appNumber,
    companyName: ctx.session.selectedCompanyName || '',
    vacancyName: ctx.session.selectedVacancyName || '',
  });

  await ctx.reply(successMsg, {
    parse_mode: 'HTML',
    reply_markup: getMainMenuKeyboard(ctx.session.lang),
  });
}

export async function handleAppEditPrompt(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  ctx.session.step = 'EDIT_SECTION_SELECT';

  await ctx.editMessageText(t('edit_choice_prompt', ctx.session.lang), {
    reply_markup: getEditSectionsKeyboard(ctx.session.lang),
  });
}
