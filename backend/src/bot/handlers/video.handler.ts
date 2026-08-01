import { BotContext } from '../types';
import { getVideoPromptKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function startVideoStep(ctx: BotContext) {
  ctx.session.step = 'VIDEO_UPLOAD';

  const promptText = t('video_prompt', ctx.session.lang);
  const keyboard = getVideoPromptKeyboard(ctx.session.lang);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(promptText, { parse_mode: 'HTML', reply_markup: keyboard });
  } else {
    await ctx.reply(promptText, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}

export async function handleVideoReceived(ctx: BotContext) {
  let fileId = '';
  let duration = 0;

  if (ctx.message?.video_note) {
    fileId = ctx.message.video_note.file_id;
    duration = ctx.message.video_note.duration;
  } else if (ctx.message?.video) {
    fileId = ctx.message.video.file_id;
    duration = ctx.message.video.duration;
  } else {
    await ctx.reply(t('video_invalid_format', ctx.session.lang));
    return;
  }

  // Duration validation: max 90 seconds
  if (duration > 90) {
    await ctx.reply(t('video_too_long', ctx.session.lang));
    return;
  }

  ctx.session.videoFileId = fileId;
  ctx.session.videoDuration = duration;

  // Update application in DB with video metadata
  if (ctx.session.applicationId) {
    await prisma.application.update({
      where: { id: ctx.session.applicationId },
      data: {
        videoUrl: `telegram_file_id:${fileId}`,
        videoDuration: duration,
      },
    });
  }

  // Dispatch video to HR Telegram Group
  try {
    const { config } = await import('../../config');
    const captionText = `🎥 <b>YANGI VIDEO TANISHTIRUV</b>\n👤 <b>Ism:</b> ${ctx.from?.first_name || 'Nomzod'} (@${ctx.from?.username || 'yo\'q'})\n⏱ <b>Davomiyligi:</b> ${duration} sek`;
    if (ctx.message?.video_note) {
      await ctx.api.sendVideoNote(config.hrTelegramGroupId, fileId);
      await ctx.api.sendMessage(config.hrTelegramGroupId, captionText, { parse_mode: 'HTML' });
    } else if (ctx.message?.video) {
      await ctx.api.sendVideo(config.hrTelegramGroupId, fileId, { caption: captionText, parse_mode: 'HTML' });
    }
  } catch (hrErr: any) {
    console.error('HR Group video dispatch error:', hrErr.message);
  }

  await ctx.reply('✅ Video tanishtiruv qabul qilindi!');

  // Proceed to preview
  const { startPreviewStep } = await import('./preview.handler');
  await startPreviewStep(ctx);
}

export async function handleSkipVideo(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  ctx.session.videoFileId = undefined;
  ctx.session.videoDuration = 0;

  const { startPreviewStep } = await import('./preview.handler');
  await startPreviewStep(ctx);
}

export async function handleVideoSample(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  await ctx.reply(t('video_sample_text', ctx.session.lang), { parse_mode: 'HTML' });
}
