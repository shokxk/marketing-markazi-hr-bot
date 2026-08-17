import path from 'path';
import fs from 'fs';
import { InputFile } from 'grammy';
import { BotContext } from '../types';
import { getMainMenuKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';

const prisma = new PrismaClient();

export async function handleStartCommand(ctx: BotContext) {
  const telegramUserId = ctx.from?.id;
  const lang = ctx.session.lang || 'uz';

  if (!telegramUserId) return;

  const fullName = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';

  // Upsert user in database safely
  try {
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
  } catch (dbErr: any) {
    console.error('⚠️ User upsert error in handleStartCommand (non-blocking):', dbErr.message);
  }

  ctx.session.step = 'IDLE';

  const welcomeCaption = t('welcome_msg', lang) + `\n\n💬 <b>Yordam xizmati:</b> @${config.supportUsername}`;

  // Resolve official Marketing Markazi HR banner
  const localCandidates = [
    path.resolve(process.cwd(), 'public/banner.jpg'),
    path.resolve(process.cwd(), 'public/app/banner.jpg'),
    path.resolve(process.cwd(), 'backend/public/banner.jpg'),
    path.resolve(process.cwd(), 'backend/public/app/banner.jpg'),
    path.resolve(process.cwd(), 'dist/banner.jpg'),
    path.resolve(process.cwd(), 'dist/app/banner.jpg'),
    path.resolve(process.cwd(), 'public/app/mentor.png'),
    path.resolve(process.cwd(), 'backend/public/app/mentor.png'),
  ];
  let localBannerPath = localCandidates.find(p => fs.existsSync(p));

  try {
    if (localBannerPath) {
      await ctx.replyWithPhoto(new InputFile(localBannerPath), {
        caption: welcomeCaption,
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(lang),
      });
    } else {
      const fallbackUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1000&q=80';
      await ctx.replyWithPhoto(fallbackUrl, {
        caption: welcomeCaption,
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(lang),
      });
    }
  } catch (photoErr: any) {
    console.log('⚠️ Photo reply failed, sending text fallback:', photoErr.message);
    try {
      await ctx.reply(welcomeCaption, {
        parse_mode: 'HTML',
        reply_markup: getMainMenuKeyboard(lang),
      });
    } catch (txtErr: any) {
      console.error('❌ Failed to send text fallback start message:', txtErr.message);
    }
  }
}

export async function handleStartAnketa(ctx: BotContext) {
  // Move consent to the end of the application! Start with Company/Vacancy directly!
  ctx.session.companyPage = 1;
  await renderCompanySelection(ctx, 1);
}

export async function handleConsentCallback(ctx: BotContext, consent: boolean) {
  const lang = ctx.session.lang || 'uz';

  if (!consent) {
    ctx.session.step = 'IDLE';
    await ctx.reply('Anketa topshirish bekor qilindi. Bosh menyudasiz.', {
      reply_markup: getMainMenuKeyboard(lang),
    });
    return;
  }

  if (ctx.session.step === 'PREVIEW') {
    const { handleAppSubmit } = await import('./preview.handler');
    await handleAppSubmit(ctx);
  } else {
    await renderCompanySelection(ctx, 1);
  }
}

export async function renderCompanySelection(ctx: BotContext, page = 1) {
  ctx.session.step = 'COMPANY_SELECT';
  ctx.session.companyPage = page;

  const pageSize = 5;
  const skip = (page - 1) * pageSize;

  let companies: any[] = [];
  let totalCount = 0;

  try {
    const [compList, count] = await Promise.all([
      prisma.company.findMany({
        where: { isActive: true },
        take: pageSize,
        skip,
        orderBy: { name: 'asc' },
        include: { _count: { select: { vacancies: true } } },
      }),
      prisma.company.count({ where: { isActive: true } }),
    ]);
    companies = compList;
    totalCount = count;
  } catch (dbErr: any) {
    console.error('Company query error (fallback applied):', dbErr.message);
  }

  // If no companies found in DB, provide safe fallback so bot never crashes
  if (!companies || companies.length === 0) {
    companies = [{ id: 'flourenza_default', name: 'Flourenza', _count: { vacancies: 1 } }];
    totalCount = 1;
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const lang = ctx.session.lang || 'uz';

  let text = `<b>${t('select_company_title', lang)}</b>\n`;
  text += `📊 Jami kompaniyalar: <b>${totalCount}</b> | Sahifa <b>${page}</b> / <b>${totalPages}</b>\n\n`;

  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard();

  companies.forEach((comp) => {
    const vacCount = comp._count?.vacancies ?? 1;
    keyboard.text(`🏢 ${comp.name} (${vacCount})`, `select_company:${comp.id}`).row();
  });

  const pageRow = [];
  if (page > 1) {
    pageRow.push(InlineKeyboard.text(t('btn_prev_page', lang), `company_page:${page - 1}`));
  }
  if (totalPages > 1) {
    pageRow.push(InlineKeyboard.text(`📄 ${page}/${totalPages}`, 'noop'));
  }
  if (page < totalPages) {
    pageRow.push(InlineKeyboard.text(t('btn_next_page', lang), `company_page:${page + 1}`));
  }
  if (pageRow.length > 0) {
    keyboard.row(...pageRow);
  }

  keyboard.row(
    InlineKeyboard.text(t('btn_search_company', lang), 'company_search'),
    InlineKeyboard.text(t('btn_recommend_me', lang), 'company_recommend')
  );

  try {
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
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
  } catch (err: any) {
    try {
      await ctx.reply(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (e: any) {
      console.error('Render company error:', e.message);
    }
  }
}
