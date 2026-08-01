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

  // Global Error Handler (Prevents bot crashes)
  bot.catch((err) => {
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
      }),
    })
  );

  // Command listeners
  bot.command('start', handleStartCommand);
  bot.command('status', handleStatusCheckCommand);
  bot.command('help', handleHelpCommand);

  // Hears listeners for bottom main menu buttons (flexible apostrophes)
  bot.hears(/Anketani boshlash/i, handleStartAnketa);
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

  bot.callbackQuery('company_search', handleCompanySearchPrompt);
  bot.callbackQuery('company_recommend', handleCompanyRecommendPrompt);

  bot.callbackQuery(/^select_company:(.+)$/, async (ctx) => {
    await handleSelectCompany(ctx, ctx.match[1]);
  });

  bot.callbackQuery(/^select_vacancy:(.+)$/, async (ctx) => {
    await handleSelectVacancy(ctx, ctx.match[1]);
  });

  bot.callbackQuery('question_back', handleQuestionBack);
  bot.callbackQuery('question_cancel', handleQuestionCancel);

  bot.callbackQuery('video_sample', handleVideoSample);
  bot.callbackQuery('skip_video', handleSkipVideo);

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
      await handleQuestionAnswer(ctx, text);
      return;
    }
  });

  return bot;
}
