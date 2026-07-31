import { BotContext } from '../types';
import { getMainMenuKeyboard, getConsentKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';

const prisma = new PrismaClient();

const LOGO_BANNER_URL = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=80';

export async function handleStartCommand(ctx: BotContext) {
  const telegramUserId = ctx.from?.id;
  const lang = ctx.session.lang || 'uz';

  if (!telegramUserId) return;

  const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ');

  // Upsert user in database
  await prisma.user.upsert({
    where: { telegramUserId: BigInt(telegramUserId) },
    update: {
      fullName,
      telegramUsername: ctx.from?.username || null,
    },
    create: {
      telegramUserId: BigInt(telegramUserId),
      fullName,
      telegramUsername: ctx.from?.username || null,
      language: lang,
    },
  });

  ctx.session.step = 'IDLE';

  const welcomeCaption = t('welcome_msg', lang) + `\n\n💬 <b>Yordam xizmati:</b> @${config.supportUsername}`;

  try {
    await ctx.replyWithPhoto(LOGO_BANNER_URL, {
      caption: welcomeCaption,
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(lang),
    });
  } catch {
    await ctx.reply(welcomeCaption, {
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(lang),
    });
  }
}

export async function handleStartAnketa(ctx: BotContext) {
  const lang = ctx.session.lang || 'uz';
  ctx.session.step = 'CONSENT';

  await ctx.reply(
    `<b>${t('consent_title', lang)}</b>\n\n${t('consent_text', lang)}`,
    {
      parse_mode: 'HTML',
      reply_markup: getConsentKeyboard(lang),
    }
  );
}

export async function handleConsentCallback(ctx: BotContext, consent: boolean) {
  const lang = ctx.session.lang || 'uz';

  if (!consent) {
    ctx.session.step = 'IDLE';
    await ctx.reply(t('consent_declined', lang), {
      reply_markup: getMainMenuKeyboard(lang),
    });
    return;
  }

  await renderCompanySelection(ctx, 1);
}

export async function renderCompanySelection(ctx: BotContext, page = 1) {
  ctx.session.step = 'COMPANY_SELECT';
  ctx.session.companyPage = page;

  const pageSize = 5;
  const skip = (page - 1) * pageSize;

  const [companies, totalCount] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      take: pageSize,
      skip,
      orderBy: { name: 'asc' },
      include: { _count: { select: { vacancies: { where: { isActive: true } } } } },
    }),
    prisma.company.count({ where: { isActive: true } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const lang = ctx.session.lang || 'uz';

  let text = `<b>${t('select_company_title', lang)}</b>\n`;
  text += `📊 Total Companies: <b>${totalCount}</b> | Page <b>${page}</b> of <b>${totalPages}</b>\n\n`;

  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard();

  companies.forEach((comp) => {
    keyboard.text(`🏢 ${comp.name} (${comp._count.vacancies})`, `select_company:${comp.id}`).row();
  });

  const pageRow = [];
  if (page > 1) {
    pageRow.push(InlineKeyboard.text(`⬅️ ${t('btn_prev_page', lang)}`, `comp_page:${page - 1}`));
  }
  pageRow.push(InlineKeyboard.text(`📄 ${page}/${totalPages}`, 'noop'));
  if (page < totalPages) {
    pageRow.push(InlineKeyboard.text(`➡️ ${t('btn_next_page', lang)}`, `comp_page:${page + 1}`));
  }
  keyboard.row(...pageRow);

  keyboard.row(
    InlineKeyboard.text(`🔍 ${t('btn_search_company', lang)}`, 'search_company'),
    InlineKeyboard.text(`💡 ${t('btn_recommend_me', lang)}`, 'recommend_company')
  );

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
  }
}
