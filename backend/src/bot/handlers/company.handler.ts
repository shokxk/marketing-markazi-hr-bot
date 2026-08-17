import { BotContext } from '../types';
import { getVacancyListKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { renderCompanySelection } from './start.handler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleCompanyPagination(ctx: BotContext, newPage: number) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  ctx.session.companyPage = newPage;
  await renderCompanySelection(ctx, newPage);
}

export async function handleCompanySearchPrompt(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  ctx.session.step = 'COMPANY_SEARCH';
  await ctx.reply(t('company_search_prompt', ctx.session.lang), { parse_mode: 'HTML' });
}

export async function handleCompanySearchInput(ctx: BotContext, queryText: string) {
  let matchingCompanies: any[] = [];
  try {
    matchingCompanies = await prisma.company.findMany({
      where: {
        isActive: true,
        name: { contains: queryText },
      },
      take: 8,
    });
  } catch (e: any) {
    console.error('Company search error:', e.message);
  }

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
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  ctx.session.step = 'RECOMMEND_QUIZ_CITY';
  ctx.session.recommendAnswers = {};
  await ctx.reply(t('recommend_quiz_q1', ctx.session.lang), { parse_mode: 'HTML' });
}

export async function handleSelectCompany(ctx: BotContext, companyId: string) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  let company: any = null;
  try {
    company = await prisma.company.findUnique({ where: { id: companyId } });
  } catch (e: any) {}

  if (!company) {
    try {
      company = await prisma.company.findFirst({ where: { isActive: true } });
    } catch (e: any) {}
  }

  if (!company) {
    company = { id: companyId || 'flourenza_default', name: 'Flourenza' };
  }

  ctx.session.selectedCompanyId = company.id;
  ctx.session.selectedCompanyName = company.name;
  ctx.session.step = 'VACANCY_SELECT';

  // Load active vacancies for this company
  let vacancies: any[] = [];
  try {
    vacancies = await prisma.vacancy.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (e: any) {}

  if (vacancies.length === 0) {
    try {
      vacancies = await prisma.vacancy.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e: any) {}
  }

  if (vacancies.length === 0) {
    vacancies = [{
      id: 'default_callcenter',
      companyId: company.id,
      title: 'Call Center Sotuv Menejeri',
      isActive: true
    }];
  }

  const title = `<b>${company.name}</b> kompaniyasining vakansiyalari:\n\n${t('select_vacancy_title', ctx.session.lang)}`;
  const keyboard = getVacancyListKeyboard(vacancies, ctx.session.lang);

  try {
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      await ctx.editMessageText(title, { parse_mode: 'HTML', reply_markup: keyboard });
    } else {
      await ctx.reply(title, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (err: any) {
    await ctx.reply(title, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

export async function handleSelectVacancy(ctx: BotContext, vacancyId: string, forceReapply = false) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  let vacancy: any = null;
  try {
    vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { company: true },
    });
  } catch (e: any) {}

  if (!vacancy) {
    try {
      vacancy = await prisma.vacancy.findFirst({
        where: { isActive: true },
        include: { company: true },
      });
    } catch (e: any) {}
  }

  const compName = vacancy?.company?.name || ctx.session.selectedCompanyName || 'Flourenza';
  const compId = vacancy?.companyId || ctx.session.selectedCompanyId || 'flourenza_default';
  const vacTitle = vacancy?.title || 'Call Center Sotuv Menejeri';
  const vacId = vacancy?.id || vacancyId || 'default_callcenter';

  ctx.session.selectedCompanyId = compId;
  ctx.session.selectedCompanyName = compName;
  ctx.session.selectedVacancyId = vacId;
  ctx.session.selectedVacancyName = vacTitle;

  // Auto-upsert User record if missing
  const telegramUserId = BigInt(ctx.from?.id || 0);
  let user: any = null;
  if (ctx.from?.id) {
    const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Nomzod';
    try {
      user = await prisma.user.upsert({
        where: { telegramUserId },
        create: {
          telegramUserId,
          fullName,
          telegramUsername: ctx.from.username || null,
          language: ctx.session.lang || 'uz',
        },
        update: {
          fullName,
          telegramUsername: ctx.from.username || undefined,
        }
      });
    } catch (e: any) {
      console.error('User auto-upsert error:', e.message);
    }
  }

  // Create draft application record safely
  if (user && vacancy) {
    try {
      const appNumber = `HR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const app = await prisma.application.create({
        data: {
          applicationNumber: appNumber,
          userId: user.id,
          companyId: compId,
          vacancyId: vacId,
          status: 'DRAFT',
          currentStep: 1,
          source: ctx.session.source || 'Telegram Direct',
          referralCode: ctx.session.referralCode,
          consentGiven: false,
        },
      });
      ctx.session.applicationId = app.id;
    } catch (dbAppErr: any) {
      console.error('Draft application creation error (non-blocking):', dbAppErr.message);
    }
  }

  // Initialize Questionnaire Form
  const { startQuestionnaire } = await import('./questionnaire.handler');
  await startQuestionnaire(ctx);
}
