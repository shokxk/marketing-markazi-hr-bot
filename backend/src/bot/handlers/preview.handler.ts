import { BotContext } from '../types';
import { getPreviewKeyboard, getMainMenuKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function startPreviewStep(ctx: BotContext) {
  ctx.session.step = 'PREVIEW';

  const answers = ctx.session.answers || {};
  const companyName = ctx.session.selectedCompanyName || 'Flourenza';
  const vacancyName = ctx.session.selectedVacancyName || 'Call Center Sotuv Menejeri';

  // Map the ACTUAL question codes used in questionnaire.handler.ts FALLBACK_QUESTIONS
  const fullName    = answers['Q1_FULL_NAME']          || 'Ko\'rsatilmadi';
  const phone       = answers['Q2_PHONE']              || 'Ko\'rsatilmadi';
  const age         = answers['Q3_AGE']                || 'Ko\'rsatilmadi';
  const city        = answers['Q4_CITY']               || 'Ko\'rsatilmadi';
  const marital     = answers['Q5_MARITAL_STATUS']     || 'Ko\'rsatilmadi';
  const education   = answers['Q6_EDUCATION_LEVEL']    || 'Ko\'rsatilmadi';
  const eduPlace    = answers['Q7_EDUCATION_PLACE']    || 'Ko\'rsatilmadi';
  const callExp     = answers['Q8_CALLCENTER_EXP']     || 'Ko\'rsatilmadi';
  const lastJob     = answers['Q9_LAST_JOB']           || 'Ko\'rsatilmadi';
  const amocrm      = answers['Q11_AMOCRM_EXP']        || 'Ko\'rsatilmadi';
  const salary      = answers['Q15_SALARY_EXPECTATION']|| 'Ko\'rsatilmadi';
  const startDate   = answers['Q16_START_DATE']        || 'Ko\'rsatilmadi';
  const salesCase   = answers['Q17_SALES_CASE']        || 'Ko\'rsatilmadi';
  const motivation  = answers['Q19_MOTIVATION']        || 'Ko\'rsatilmadi';
  const faceId      = answers['Q20_SELF_INTRO']        || (ctx.session.videoFileId ? 'Foto/Video yuborildi ✅' : 'Yuborilmadi');

  const summary =
    `<b>Ma'lumotlaringizni tekshiring 📋</b>\n\n` +
    `🏢 <b>Kompaniya:</b> ${companyName}\n` +
    `💼 <b>Vakansiya:</b> ${vacancyName}\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>F.I.O.:</b> ${fullName}\n` +
    `📱 <b>Telefon:</b> ${phone}\n` +
    `🎂 <b>Yosh:</b> ${age}\n` +
    `📍 <b>Shahar:</b> ${city}\n` +
    `💍 <b>Oilaviy holat:</b> ${marital}\n` +
    `🎓 <b>Ta'lim:</b> ${education}\n` +
    `🏫 <b>O'quv muassasa:</b> ${eduPlace}\n` +
    `📞 <b>Call Center tajriba:</b> ${callExp}\n` +
    `💼 <b>Oxirgi ish:</b> ${lastJob}\n` +
    `💻 <b>amoCRM tajriba:</b> ${amocrm}\n` +
    `💰 <b>Kutilayotgan maosh:</b> ${salary}\n` +
    `📅 <b>Ishga chiqish:</b> ${startDate}\n` +
    `🎯 <b>Motivatsiya:</b> ${motivation.substring(0, 80)}${motivation.length > 80 ? '...' : ''}\n` +
    `📸 <b>Face ID / Foto:</b> ${faceId}\n`;

  const keyboard = getPreviewKeyboard(ctx.session.lang);

  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(summary, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(summary, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (e) {
    // If edit fails (e.g. message too old), send new message
    await ctx.reply(summary, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

export async function handleAppSubmit(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const answers = ctx.session.answers || {};
  const companyName = ctx.session.selectedCompanyName || 'Flourenza';
  const vacancyName = ctx.session.selectedVacancyName || 'Call Center Sotuv Menejeri';
  const candidateName = answers['Q1_FULL_NAME'] || ctx.from?.first_name || 'Nomzod';
  const phone = answers['Q2_PHONE'] || 'Ko\'rsatilmadi';
  const city = answers['Q4_CITY'] || 'Ko\'rsatilmadi';

  let appNumber = `HR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  const appId = ctx.session.applicationId;

  try {
    // If we have an applicationId, update it
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
    } else {
      // No applicationId — save directly from session answers
      const telegramUserId = BigInt(ctx.from?.id || 0);
      let user = await prisma.user.findFirst({ where: { telegramUserId } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            telegramUserId,
            fullName: candidateName,
            phone: phone !== 'Ko\'rsatilmadi' ? phone : null,
            city: city !== 'Ko\'rsatilmadi' ? city : null,
            telegramUsername: ctx.from?.username || null,
            language: ctx.session.lang || 'uz',
          }
        });
      }

      const comp = await prisma.company.findFirst({ where: { isActive: true } });
      const vac = await prisma.vacancy.findFirst({ where: { isActive: true } });

      if (comp && vac) {
        const app = await prisma.application.create({
          data: {
            applicationNumber: appNumber,
            userId: user.id,
            companyId: comp.id,
            vacancyId: vac.id,
            status: 'SUBMITTED',
            completionPercent: 100,
            submittedAt: new Date(),
            source: 'Telegram Bot',
            consentGiven: true,
          }
        });
        ctx.session.applicationId = app.id;
      }
    }
  } catch (dbErr: any) {
    console.error('App submit DB error:', dbErr.message);
  }

  // Question Code to Uzbek Label Translator
  const QUESTION_LABELS: Record<string, string> = {
    Q1_FULL_NAME: 'To\'liq ism (F.I.Sh.)',
    Q2_PHONE: 'Telefon raqam',
    Q3_AGE: 'Yosh',
    Q4_CITY: 'Yashash shahri',
    Q5_MARITAL_STATUS: 'Oilaviy ahvoli',
    Q6_EDUCATION_LEVEL: 'Ma\'lumoti darajasi',
    Q7_EDUCATION_PLACE: 'O\'quv muassasasi',
    Q8_CALLCENTER_EXP: 'Call Center / Sotuv tajribasi',
    Q9_LAST_JOB: 'Oxirgi ish joyi va lavozimi',
    Q10_REASON_LEAVING: 'Ishdan ketish sababi',
    Q11_AMOCRM_EXP: 'amoCRM va kompyuter tajribasi',
    Q12_COMPUTER_SKILLS: 'Kompyuter dasturlari',
    Q13_LANGUAGES: 'Biladigan tillari',
    Q14_WORK_SCHEDULE: 'Ish grafigiga tayyorlik',
    Q15_SALARY_EXPECTATION: 'Kutilayotgan maosh',
    Q16_START_DATE: 'Ish boshlash vaqti',
    Q17_SALES_CASE: 'Sotuv keysi ("Qimmat" e\'tiroz)',
    Q18_SOFT_SKILLS: 'Kuchli 3 ta sifatlari',
    Q19_MOTIVATION: 'Nega ushbu kompaniya',
    Q20_SELF_INTRO: 'Face ID / Foto status'
  };

  // Send to HR Telegram Group (Message + PDF Resume)
  try {
    const { config } = await import('../../config');
    const { Bot, InputFile } = await import('grammy');
    const bot = new Bot(config.botToken);

    const formattedAnswersText = Object.entries(answers)
      .filter(([k]) => k !== 'telegram_id' && k !== 'username' && k !== 'face_id_url')
      .map(([k, v]) => `  • <b>${QUESTION_LABELS[k] || k}:</b> ${v}`)
      .join('\n');

    const hrMsg =
      `🔥 <b>YANGI ARIZA (Telegram Bot)</b> 🔥\n\n` +
      `🏢 <b>Kompaniya:</b> ${companyName}\n` +
      `💼 <b>Vakansiya:</b> ${vacancyName}\n` +
      `👤 <b>Nomzod:</b> ${candidateName}\n` +
      `📞 <b>Telefon:</b> <code>${phone}</code>\n` +
      `📍 <b>Shahar:</b> ${city}\n` +
      `🆔 <b>Ariza №:</b> ${appNumber}\n\n` +
      `📊 <b>Barcha javoblar:</b>\n` +
      formattedAnswersText;

    await bot.api.sendMessage(config.hrTelegramGroupId, hrMsg, { parse_mode: 'HTML' });

    // Generate & Send PDF Resume Document to HR Group
    try {
      const { generateCandidatePdfResume } = await import('../../services/pdf-resume.service');
      const fs = await import('fs');

      const pdfPath = await generateCandidatePdfResume({
        candidateName,
        phone,
        age: answers['Q3_AGE'] || '',
        city,
        companyName,
        vacancyTitle: vacancyName,
        answers,
      });

      if (fs.existsSync(pdfPath)) {
        await bot.api.sendDocument(config.hrTelegramGroupId, new InputFile(pdfPath), {
          caption: `📄 <b>NOMZOD REZYUMESI (PDF)</b> — ${candidateName}\n🏢 ${companyName} | 💼 ${vacancyName}`,
          parse_mode: 'HTML'
        });
        console.log('✅ Generated & Sent Telegram Bot candidate PDF resume to HR Group!');
      }
    } catch (pdfErr: any) {
      console.error('Bot PDF generation/send error:', pdfErr.message);
    }
  } catch (tgErr: any) {
    console.error('HR group notify error:', tgErr.message);
  }

  // Reset session
  ctx.session.step = 'IDLE';
  ctx.session.answers = {};
  ctx.session.applicationId = undefined;
  ctx.session.videoFileId = undefined;
  ctx.session.selectedCompanyId = undefined;
  ctx.session.selectedCompanyName = undefined;
  ctx.session.selectedVacancyId = undefined;
  ctx.session.selectedVacancyName = undefined;

  const successText =
    `✅ <b>Tabriklaymiz, ${candidateName}!</b>\n\n` +
    `Arizangiz muvaffaqiyatli qabul qilindi!\n\n` +
    `📋 <b>Ariza №:</b> <code>${appNumber}</code>\n` +
    `🏢 <b>Kompaniya:</b> ${companyName}\n` +
    `💼 <b>Vakansiya:</b> ${vacancyName}\n\n` +
    `⏳ HR menejerimiz tez orada siz bilan bog'lanadi.\n` +
    `❓ Savol bo'lsa: @HR_MarketingMarkazi`;

  await ctx.reply(successText, {
    parse_mode: 'HTML',
    reply_markup: getMainMenuKeyboard(ctx.session.lang),
  });
}

export async function handleAppEditPrompt(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  // Simply go back to question 1 so user can re-fill from start
  ctx.session.currentQuestionIndex = 1;

  const { renderQuestion } = await import('./questionnaire.handler');
  await renderQuestion(ctx);
}
