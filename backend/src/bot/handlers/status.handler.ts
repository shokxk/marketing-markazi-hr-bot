import { BotContext } from '../types';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';
import { getMainMenuKeyboard } from '../keyboards';
import { config } from '../../config';

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, string> = {
  SUBMITTED: '📋 Qabul qilindi, ko\'rib chiqilmoqda',
  UNDER_REVIEW: '🔍 HR menejer ko\'rib chiqmoqda',
  INTERVIEW_SCHEDULED: '📞 Telefon suhbati rejalashtirildi',
  OFFLINE_INTERVIEW: '🏢 Oflayn suhbatga taklif qilindingiz',
  ACCEPTED: '🎉 Ishga qabul qilindingiz!',
  REJECTED: '😔 Rad etildi',
};

export async function handleStatusCheckCommand(ctx: BotContext) {
  const telegramUserId = ctx.from?.id;
  const lang = ctx.session.lang || 'uz';

  if (!telegramUserId) return;

  const user = await prisma.user.findUnique({
    where: { telegramUserId: BigInt(telegramUserId) },
    include: {
      applications: {
        orderBy: { createdAt: 'desc' },
        include: { company: true, vacancy: true },
      },
    },
  });

  if (!user || user.applications.length === 0) {
    await ctx.reply(t('no_applications_found', lang), {
      reply_markup: getMainMenuKeyboard(lang),
    });
    return;
  }

  let text = `<b>🔍 Arizalaringiz holati:</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

  user.applications.forEach((app, idx) => {
    const statusText = STATUS_MAP[app.status] || app.status;
    text += `${idx + 1}. <b>${app.company.name}</b> — <i>${app.vacancy.title}</i>\n`;
    text += `   📌 Ariza №: <code>${app.applicationNumber}</code>\n`;
    text += `   📊 Holat: <b>${statusText}</b>\n`;
    text += `   📅 Sana: ${app.createdAt.toISOString().split('T')[0]}\n\n`;
  });

  text += `💬 Qo'shimcha savollar bo'lsa: @${config.supportUsername}`;

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: getMainMenuKeyboard(lang),
  });
}

export async function handleHelpCommand(ctx: BotContext) {
  const lang = ctx.session.lang || 'uz';
  const text = `${t('help_text', lang)}\n\n📞 <b>Murojaat uchun Telegram:</b> @${config.supportUsername}`;

  const { InlineKeyboard } = await import('grammy');
  const keyboard = new InlineKeyboard()
    .url('💬 HR Qo\'llab-quvvatlash (@HR_MarketingMarkazi)', `https://t.me/${config.supportUsername}`)
    .row()
    .text('📝 Anketa bo\'yicha yordam', 'help_anketa')
    .row()
    .text('🎥 Video bo\'yicha yordam', 'help_video');

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
}
