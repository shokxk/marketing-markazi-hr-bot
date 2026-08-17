import { Bot, session, GrammyError, HttpError } from 'grammy';
import { BotContext, SessionData } from './types';
import { config } from '../config';
import { handleStartCommand, handleStartAnketa, handleConsentCallback } from './handlers/start.handler';
import {
  handleCompanyPagination,
  handleCompanySearchPrompt,
  handleCompanySearchInput,
  handleCompanyRecommendPrompt,
  handleSelectCompany,
  handleSelectVacancy,
} from './handlers/company.handler';
import {
  handleQuestionAnswer,
  handleQuestionBack,
  handleQuestionCancel,
  handleToggleMultiSelect,
  handleConfirmMultiSelect,
  handleSkipExtraPhone,
} from './handlers/questionnaire.handler';
import {
  handleVideoReceived,
  handleSkipVideo,
  handleVideoSample,
} from './handlers/video.handler';
import {
  handleAppSubmit,
  handleAppEditPrompt,
} from './handlers/preview.handler';
import { handleStatusCheckCommand, handleHelpCommand } from './handlers/status.handler';

export function createBotInstance() {
  const bot = new Bot<BotContext>(config.botToken);

  // Global Error Handler (Prevents bot crashes & loading spinners)
  bot.catch(async (err) => {
    const ctx = err.ctx;
    console.error(`⚠️ Error handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Grammy error:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Network error:", e);
    } else {
      console.error("Unknown bot error:", e);
    }

    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: '⚠️ Xatolik yuz berdi. Qayta urinib ko\'ring.', show_alert: false });
      }
    } catch {}

    try {
      await ctx.reply("⚠️ Texnik xatolik yuz berdi. Qayta boshlash uchun /start buyrug'ini bosing.");
    } catch {}
  });

  // Configure session middleware
  bot.use(
    session({
      initial: (): SessionData => ({
        step: 'IDLE',
        lang: 'uz',
        companyPage: 1,
        currentQuestionIndex: 1,
        answers: {},
        currentMultiSelectAnswers: [],
      }),
    })
  );

  // Automatic Draft Session Hydration Middleware (Prevents lost answers on server restart)
  bot.use(async (ctx, next) => {
    if (ctx.from?.id && ctx.session && (!ctx.session.applicationId || ctx.session.step === 'IDLE')) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        const user = await prisma.user.findUnique({
          where: { telegramUserId: BigInt(ctx.from.id) },
          include: {
            applications: {
              where: { status: 'DRAFT' },
              include: { answers: { include: { question: true } }, company: true, vacancy: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        });
        if (user?.applications?.[0]) {
          const draft = user.applications[0];
          if (Object.keys(ctx.session.answers || {}).length === 0 && draft.answers?.length > 0) {
            ctx.session.applicationId = draft.id;
            ctx.session.selectedCompanyId = draft.companyId;
            ctx.session.selectedCompanyName = draft.company?.name;
            ctx.session.selectedVacancyId = draft.vacancyId;
            ctx.session.selectedVacancyName = draft.vacancy?.title;
            ctx.session.currentQuestionIndex = draft.currentStep || (draft.answers.length + 1);
            for (const a of draft.answers) {
              const qKey = a.question?.code || a.questionId;
              ctx.session.answers[qKey] = a.answerText || '';
            }
          }
        }
        await prisma.$disconnect();
      } catch (e) {
        // Non-blocking catch
      }
    }
    await next();
  });

  // Command listeners
  bot.command('start', handleStartCommand);
  bot.command('status', handleStatusCheckCommand);
  bot.command('help', handleHelpCommand);
  bot.command('admin', async (ctx) => {
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'https://marketing-markazi-hr-bot.onrender.com';
    const adminUrl = `${baseUrl}/admin?v=20260804_v11`;
    const { InlineKeyboard } = await import('grammy');
    
    await ctx.reply(
      `🔐 <b>Marketing Markazi — Admin Panel</b>\n\n` +
      `Ushbu bo'lim faqat rahbarlar va HR xodimlar uchun mo'ljallangan.`,
      {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().webApp('⚙️ Admin Panelni ochish', adminUrl)
      }
    );
  });

  // Hears listeners for bottom main menu buttons (flexible apostrophes)
  bot.hears([/Anketani boshlash/i, /Anketa/i, /📝/i], handleStartAnketa);
  bot.hears(/Arizam holati/i, handleStatusCheckCommand);
  bot.hears(/Yordam/i, handleHelpCommand);
  bot.hears(/Bo['‘`’]?sh ish o['‘`’]?rinlari/i, async (ctx) => {
    ctx.session.step = 'COMPANY_SELECT';
    ctx.session.companyPage = 1;
    const { renderCompanySelection } = await import('./handlers/start.handler');
    await renderCompanySelection(ctx);
  });

  // Callback query listeners
  bot.callbackQuery(/^consent_(yes|no)$/, async (ctx) => {
    const choice = ctx.match[1] as 'yes' | 'no';
    await handleConsentCallback(ctx, choice === 'yes');
  });

  bot.callbackQuery(/^company_page:(\d+)$/, async (ctx) => {
    const page = parseInt(ctx.match[1], 10);
    await handleCompanyPagination(ctx, page);
  });

  // Noop: silently answer to avoid loading spinner
  bot.callbackQuery('noop', async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('company_search', handleCompanySearchPrompt);
  bot.callbackQuery('company_recommend', handleCompanyRecommendPrompt);

  bot.callbackQuery(/^select_company:(.+)$/, async (ctx) => {
    await handleSelectCompany(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^select_vacancy:(.+)$/, async (ctx) => {
    await handleSelectVacancy(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^force_reapply:(.+)$/, async (ctx) => {
    await handleSelectVacancy(ctx, ctx.match[1], true);
  });

  bot.callbackQuery('back_to_companies', async (ctx) => {
    const { renderCompanySelection } = await import('./handlers/start.handler');
    await renderCompanySelection(ctx, 1);
  });

  bot.callbackQuery('question_back', handleQuestionBack);
  bot.callbackQuery('question_cancel', handleQuestionCancel);

  // Multi-select and Extra Phone Callbacks
  bot.callbackQuery(/^toggle_multi:(\d+)$/, async (ctx) => {
    await handleToggleMultiSelect(ctx, ctx.match[1]);
  });
  bot.callbackQuery('confirm_multi', handleConfirmMultiSelect);
  bot.callbackQuery('skip_extra_phone', handleSkipExtraPhone);

  bot.callbackQuery('video_sample', handleVideoSample);
  bot.callbackQuery('skip_video', handleSkipVideo);

  bot.callbackQuery('help_anketa', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📝 <b>Anketa bo'yicha yordam:</b>\n\n` +
      `• Anketada jami 21 ta savol mavjud.\n` +
      `• Har bir savolga to'g'ri va to'liq javob bering.\n` +
      `• Qo'shimcha telefon yoki savollarda "⏩ O'tkazib yuborish" tugmasidan foydalanishingiz mumkin.\n` +
      `• Boshlash uchun: /start bosing yoki pastdagi "📝 Anketani boshlash" tugmasini tanlang.`,
      { parse_mode: 'HTML' }
    );
  });

  bot.callbackQuery('help_video', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `🎥 <b>Video tanishtiruv bo'yicha yordam:</b>\n\n` +
      `• 30–60 soniyalik Telegram video xabar (🎭 kruglyash) yoki oddiy video yuboring.\n` +
      `• O'zingiz haqingizda qisqacha ma'lumot va nima uchun sizni tanlashimiz kerakligini ayting.\n` +
      `• Agar video yubora olmasangiz, "⏩ Keyinroq yuboraman" tugmasini bosishingiz mumkin.`,
      { parse_mode: 'HTML' }
    );
  });

  bot.callbackQuery('app_submit', handleAppSubmit);
  bot.callbackQuery('app_edit', handleAppEditPrompt);
  bot.callbackQuery('app_cancel', handleQuestionCancel);

  bot.callbackQuery(/^answer_opt:(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleQuestionAnswer(ctx, ctx.match[1]);
  });

  // Message Routers based on session state
  bot.on('message:contact', async (ctx) => {
    if (ctx.session.step === 'QUESTIONNAIRE') {
      const phone = ctx.message.contact.phone_number;
      await handleQuestionAnswer(ctx, phone);
    }
  });

  bot.on(['message:video', 'message:video_note'], async (ctx) => {
    if (ctx.session.step === 'VIDEO_UPLOAD') {
      await handleVideoReceived(ctx);
    }
  });

  bot.on('message:photo', async (ctx) => {
    const photos = ctx.message.photo;
    const largestPhoto = photos[photos.length - 1];
    if (ctx.session.step === 'VIDEO_UPLOAD' || ctx.session.step === 'QUESTIONNAIRE') {
      // Forward photo to HR group
      try {
        await ctx.api.sendPhoto(config.hrTelegramGroupId, largestPhoto.file_id, {
          caption: `📸 <b>Nomzod surati (Face ID)</b>\n👤 <b>Ism:</b> ${ctx.from?.first_name || 'Nomzod'} (@${ctx.from?.username || 'yo\'q'})`,
          parse_mode: 'HTML'
        });
      } catch (e: any) {
        console.error('HR group photo send error:', e.message);
      }

      if (ctx.session.step === 'QUESTIONNAIRE') {
        await handleQuestionAnswer(ctx, 'Foto yuborildi');
      } else {
        await handleVideoReceived(ctx);
      }
    }
  });

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;

    if (ctx.session.step === 'COMPANY_SEARCH') {
      await handleCompanySearchInput(ctx, text);
      return;
    }

    if (ctx.session.step === 'QUESTIONNAIRE') {
      if (text.includes('Bekor qilish')) {
        await handleQuestionCancel(ctx);
        return;
      }
      if (text.includes('Orqaga')) {
        await handleQuestionBack(ctx);
        return;
      }
      if (text.includes('O\'tkazib yuborish') || text.toLowerCase() === 'skip') {
        await handleSkipExtraPhone(ctx);
        return;
      }
      await handleQuestionAnswer(ctx, text);
      return;
    }
  });

  return bot;
}
