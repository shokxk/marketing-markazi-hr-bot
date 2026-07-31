import { BotContext } from '../types';
import { getQuestionControlKeyboard, getPhoneRequestKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getProgressBar(current: number, total: number): string {
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((percent / 100) * 10);
  const empty = 10 - filled;
  const bar = '▓'.repeat(filled) + '░'.repeat(empty);
  return `${bar} <b>${percent}%</b>`;
}

function getEncouragement(step: number): string {
  if (step === 3) return '🔥 Ajoyib boshlanish!';
  if (step === 7) return '👍 Zo\'r ketyapsiz! Yarmi tugadi.';
  if (step === 12) return '✨ Yaxshi! Qolgan savollar ham muhim.';
  if (step === 16) return '💪 Deyarli yetib keldik!';
  if (step === 19) return '🏆 Oxirgi hal qiluvchi savol!';
  return '';
}

export async function startQuestionnaire(ctx: BotContext) {
  ctx.session.step = 'QUESTIONNAIRE';
  ctx.session.currentQuestionIndex = 1;
  ctx.session.answers = {};
  await renderQuestion(ctx);
}

export async function renderQuestion(ctx: BotContext) {
  const step = ctx.session.currentQuestionIndex;

  // Load questions ordered by sortOrder
  const questions = await prisma.question.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  if (step > questions.length) {
    // Finished all 20 questions -> proceed to video prompt
    const { startVideoStep } = await import('./video.handler');
    await startVideoStep(ctx);
    return;
  }

  const q = questions[step - 1];

  // Smart Question Branching logic
  if (q.code === 'Q11_LAST_JOB' || q.code === 'Q12_REASON_LEAVING') {
    const q10Answer = ctx.session.answers['Q10_TOTAL_EXPERIENCE'];
    if (q10Answer === 'Tajribam yo‘q' || q10Answer === 'Tajribam yo\'q') {
      ctx.session.currentQuestionIndex += 1;
      await renderQuestion(ctx);
      return;
    }
  }

  // Update application currentStep in DB
  if (ctx.session.applicationId) {
    const completionPercent = Math.round((step / questions.length) * 100);
    await prisma.application.update({
      where: { id: ctx.session.applicationId },
      data: {
        currentStep: step,
        completionPercent,
      },
    });
  }

  const progressBarText = getProgressBar(step, questions.length);
  const encouragement = getEncouragement(step);
  const encouragementText = encouragement ? `\n\n<i>${encouragement}</i>` : '';

  const questionHeader = `📋 <b>Savol ${step}/${questions.length}</b>\n${progressBarText}${encouragementText}\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  const questionText = q.textUz;
  
  let options: string[] | undefined = undefined;
  if (typeof q.optionsJson === 'string') {
    try {
      options = JSON.parse(q.optionsJson);
    } catch {
      options = undefined;
    }
  } else if (Array.isArray(q.optionsJson)) {
    options = q.optionsJson as string[];
  }

  if (q.answerType === 'PHONE') {
    await ctx.reply(`${questionHeader}${questionText}`, {
      parse_mode: 'HTML',
      reply_markup: getPhoneRequestKeyboard(ctx.session.lang),
    });
  } else {
    const keyboard = getQuestionControlKeyboard(options, step > 1, ctx.session.lang);
    if (ctx.callbackQuery) {
      await ctx.editMessageText(`${questionHeader}${questionText}`, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(`${questionHeader}${questionText}`, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
  }
}

export async function handleQuestionAnswer(ctx: BotContext, answerValue: string) {
  const step = ctx.session.currentQuestionIndex;

  const questions = await prisma.question.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  const q = questions[step - 1];

  // Validation rules
  if (q.code === 'Q1_FULL_NAME') {
    if (answerValue.length < 5 || answerValue.split(' ').length < 2 || /\d/.test(answerValue)) {
      await ctx.reply('⚠️ Iltimos, Ism va Familiyangizni to‘liq yozing! (Masalan: <i>Karimov Azizbek</i>)', {
        parse_mode: 'HTML',
      });
      return;
    }
  }

  if (q.code === 'Q20_SELF_INTRO') {
    if (answerValue.length < 30) {
      await ctx.reply('⚠️ O‘zingiz haqingizda kamida 30 ta belgidan iborat qisqa matn yozing.');
      return;
    }
  }

  // Save answer in session
  ctx.session.answers[q.code] = answerValue;

  // Save answer in DB
  if (ctx.session.applicationId) {
    await prisma.applicationAnswer.create({
      data: {
        applicationId: ctx.session.applicationId,
        questionId: q.id,
        answerText: answerValue,
      },
    });
  }

  // Advance to next question
  ctx.session.currentQuestionIndex += 1;
  await renderQuestion(ctx);
}

export async function handleQuestionBack(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  if (ctx.session.currentQuestionIndex > 1) {
    ctx.session.currentQuestionIndex -= 1;
    await renderQuestion(ctx);
  }
}

export async function handleQuestionCancel(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  ctx.session.step = 'IDLE';
  await ctx.reply('Anketa to‘ldirish bekor qilindi.', {
    reply_markup: { remove_keyboard: true },
  });
}
