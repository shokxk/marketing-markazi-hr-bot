import { BotContext } from '../types';
import { getVacancyListKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { renderCompanySelection } from './start.handler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleCompanyPagination(ctx: BotContext, newPage: number) {
  await ctx.answerCallbackQuery();
  ctx.session.companyPage = newPage;
  await renderCompanySelection(ctx);
}

export async function handleCompanySearchPrompt(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  ctx.session.step = 'COMPANY_SEARCH';
  await ctx.reply(t('company_search_prompt', ctx.session.lang), { parse_mode: 'HTML' });
}

export async function handleCompanySearchInput(ctx: BotContext, queryText: string) {
  const matchingCompanies = await prisma.company.findMany({
    where: {
      isActive: true,
      name: { contains: queryText },
    },
    take: 8,
  });

  if (matchingCompanies.length === 0) {
    await ctx.reply(t('company_not_found', ctx.session.lang));
    return;
  }

  const { getCompanyListKeyboard } = await import('../keyboards');
  const keyboard = getCompanyListKeyboard(matchingCompanies, 1, 1, ctx.session.lang);
  await ctx.reply(`<b>"${queryText}" bo'yicha topilgan kompaniyalar:</b>`, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}

export async function handleCompanyRecommendPrompt(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  ctx.session.step = 'RECOMMEND_QUIZ_CITY';
  ctx.session.recommendAnswers = {};
  await ctx.reply(t('recommend_quiz_q1', ctx.session.lang));
}

export async function handleSelectCompany(ctx: BotContext, companyId: string) {
  await ctx.answerCallbackQuery();
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return;

  ctx.session.selectedCompanyId = company.id;
  ctx.session.selectedCompanyName = company.name;
  ctx.session.step = 'VACANCY_SELECT';

  // Load active vacancies for this company
  const vacancies = await prisma.vacancy.findMany({
    where: { companyId: company.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  if (vacancies.length === 0) {
    await ctx.editMessageText(`<b>${company.name}</b>\n\n${t('no_vacancies', ctx.session.lang)}`, {
      parse_mode: 'HTML',
    });
    return;
  }

  const title = `<b>${company.name}</b> kompaniyasining vakansiyalari:\n\n${t('select_vacancy_title', ctx.session.lang)}`;
  const keyboard = getVacancyListKeyboard(vacancies, ctx.session.lang);

  await ctx.editMessageText(title, { parse_mode: 'HTML', reply_markup: keyboard });
}

export async function handleSelectVacancy(ctx: BotContext, vacancyId: string, forceReapply = false) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const vacancy = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    include: { company: true },
  });
  if (!vacancy) return;

  ctx.session.selectedCompanyId = vacancy.companyId;
  ctx.session.selectedCompanyName = vacancy.company.name;
  ctx.session.selectedVacancyId = vacancy.id;
  ctx.session.selectedVacancyName = vacancy.title;

  // Auto-upsert User record if missing
  const telegramUserId = BigInt(ctx.from?.id || 0);
  let user = await prisma.user.findUnique({ where: { telegramUserId } });
  if (!user && ctx.from?.id) {
    const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Nomzod';
    try {
      user = await prisma.user.create({
        data: {
          telegramUserId,
          fullName,
          telegramUsername: ctx.from.username || null,
          language: ctx.session.lang || 'uz',
        }
      });
    } catch (e: any) {
      console.error('User auto-create error:', e.message);
    }
  }

  // Check duplicate active application unless forced
  if (user && !forceReapply) {
    const existingApp = await prisma.application.findFirst({
      where: {
        userId: user.id,
        vacancyId: vacancy.id,
        status: { notIn: ['DRAFT', 'REJECTED'] },
      },
    });

    if (existingApp) {
      const { InlineKeyboard } = await import('grammy');
      const dupMsg = t('duplicate_active_app', ctx.session.lang, {
        appNumber: existingApp.applicationNumber,
        statusText: existingApp.status,
      }) + `\n\nQayta yangi anketa to'ldirmoqchimisiz? 👇`;

      const keyboard = new InlineKeyboard()
        .text('🔄 Yangi anketa to\'ldirish', `force_reapply:${vacancy.id}`)
        .row()
        .text('⬅️ Boshqa vakansiyani tanlash', 'back_to_companies');

      try {
        await ctx.editMessageText(dupMsg, { parse_mode: 'HTML', reply_markup: keyboard });
      } catch (e) {
        await ctx.reply(dupMsg, { parse_mode: 'HTML', reply_markup: keyboard });
      }
      return;
    }
  }

  // Create draft application record
  if (user) {
    const appNumber = `HR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const app = await prisma.application.create({
      data: {
        applicationNumber: appNumber,
        userId: user.id,
        companyId: vacancy.companyId,
        vacancyId: vacancy.id,
        status: 'DRAFT',
        currentStep: 1,
        source: ctx.session.source || 'Telegram Direct',
        referralCode: ctx.session.referralCode,
        consentGiven: true,
      },
    });
    ctx.session.applicationId = app.id;
  }

  // Initialize Questionnaire Form
  const { startQuestionnaire } = await import('./questionnaire.handler');
  await startQuestionnaire(ctx);
}
