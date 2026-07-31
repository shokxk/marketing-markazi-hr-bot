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

export async function handleSelectVacancy(ctx: BotContext, vacancyId: string) {
  await ctx.answerCallbackQuery();
  const vacancy = await prisma.vacancy.findUnique({
    where: { id: vacancyId },
    include: { company: true },
  });
  if (!vacancy) return;

  ctx.session.selectedVacancyId = vacancy.id;
  ctx.session.selectedVacancyName = vacancy.title;

  // Check duplicate active application for this exact user and vacancy
  const telegramUserId = BigInt(ctx.from?.id || 0);
  const user = await prisma.user.findUnique({ where: { telegramUserId } });

  if (user) {
    const existingApp = await prisma.application.findFirst({
      where: {
        userId: user.id,
        vacancyId: vacancy.id,
        status: { notIn: ['DRAFT', 'REJECTED'] },
      },
    });

    if (existingApp) {
      const dupMsg = t('duplicate_active_app', ctx.session.lang, {
        appNumber: existingApp.applicationNumber,
        statusText: existingApp.status,
      });
      await ctx.editMessageText(dupMsg, { parse_mode: 'HTML' });
      return;
    }
  }

  // Create or load draft application record
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
