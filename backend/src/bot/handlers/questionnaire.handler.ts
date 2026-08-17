import { BotContext } from '../types';
import {
  getQuestionControlKeyboard,
  getPhoneRequestKeyboard,
  getExtraPhoneRequestKeyboard,
  getExtraPhoneInlineKeyboard,
  getMultiSelectKeyboard
} from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const FALLBACK_QUESTIONS = [
  { id: '1', code: 'Q1_FULL_NAME', textUz: '1. Sizning to\'liq ismingiz (F.I.Sh.)?', answerType: 'TEXT', sortOrder: 1 },
  { id: '2', code: 'Q2_PHONE', textUz: '2. Bog\'lanish uchun asosiy telefon raqamingiz?', answerType: 'PHONE', sortOrder: 2 },
  { id: '3', code: 'Q2B_EXTRA_PHONE', textUz: '3. Qo\'shimcha (zaxira) telefon raqamingiz? (Ixtiyoriy)', answerType: 'EXTRA_PHONE', sortOrder: 3 },
  { id: '4', code: 'Q3_AGE', textUz: '4. Yoshingiz yoki tug\'ilgan yilingiz? (Masalan: 24 yoki 2002)', answerType: 'AGE_OR_YEAR', sortOrder: 4 },
  { id: '5', code: 'Q4_CITY', textUz: '5. Yashash shahringiz va tumaningiz?', answerType: 'TEXT', sortOrder: 5 },
  { id: '6', code: 'Q5_MARITAL_STATUS', textUz: '6. Oilaviy ahvolingiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Turmush qurmagan', 'Turmush qurgan (farzandli)', 'Farqi yo\'q']), sortOrder: 6 },
  { id: '7', code: 'Q6_EDUCATION_LEVEL', textUz: '7. Ma\'lumotingiz darajasi?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Oliy (Bakalavr/Magistr)', 'O\'rta maxsus (Kollej/Litsey)', 'O\'rta maktab']), sortOrder: 7 },
  { id: '8', code: 'Q7_EDUCATION_PLACE', textUz: '8. Qaysi o\'quv muassasasini tamomlagansiz?', answerType: 'TEXT', sortOrder: 8 },
  { id: '9', code: 'Q8_CALLCENTER_EXP', textUz: '9. Call Center yoki Sotuv sohasida tajribangiz bormi?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, 6-12 oy tajribam bor', 'Ha, 1 yildan ortiq tajribam bor', 'Yo\'q, lekin tez o\'rganaman']), sortOrder: 9 },
  { id: '10', code: 'Q9_LAST_JOB', textUz: '10. Oxirgi ish joyingiz va lavozimingiz?', answerType: 'TEXT', sortOrder: 10 },
  { id: '11', code: 'Q10_REASON_LEAVING', textUz: '11. Oxirgi ish joyingizdan ketish sababi?', answerType: 'TEXT', sortOrder: 11 },
  { id: '12', code: 'Q11_AMOCRM_EXP', textUz: '12. amoCRM va kompyuter dasturlari bilan ishlaganmisiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, amoCRM bilan mukammal ishlayman', 'Kompyuterni bilaman, amoCRM o\'rganaman', 'Yo\'q, yangi o\'rganaman']), sortOrder: 12 },
  { id: '13', code: 'Q12_COMPUTER_SKILLS', textUz: '13. Qaysi kompyuter dasturlarini bilasiz? (Bir nechtasini tanlang 👇)', answerType: 'MULTISELECT', optionsJson: JSON.stringify(['MS Word & Excel', '1C Buxgalteriya', 'amoCRM / Bitrix24', 'Photoshop / Grafik dasturlar', 'Kompyuterni yaxshi bilaman', 'Boshlang\'ich (o\'rganaman)']), sortOrder: 13 },
  { id: '14', code: 'Q13_LANGUAGES', textUz: '14. Qaysi tillarda ravon muloqot qilasiz? (Bir nechtasini tanlang 👇)', answerType: 'MULTISELECT', optionsJson: JSON.stringify(['O\'zbek tili (Ona tili)', 'Rus tili (Erkin muloqot)', 'Rus tili (O\'rtacha / Tushunaman)', 'Ingliz tili (Erkin)', 'Ingliz tili (Boshlang\'ich)', 'Tojik tili / Boshqa']), sortOrder: 14 },
  { id: '15', code: 'Q14_WORK_SCHEDULE', textUz: '15. 6/1 grafik va smenalarga tayyormisiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, to\'liq tayyorman', 'Grafik bo\'yicha savollarim bor']), sortOrder: 15 },
  { id: '16', code: 'Q15_SALARY_EXPECTATION', textUz: '16. Kutilayotgan oylik maosh?', answerType: 'TEXT', sortOrder: 16 },
  { id: '17', code: 'Q16_START_DATE', textUz: '17. Qachondan ishni boshlashingiz mumkin?', answerType: 'TEXT', sortOrder: 17 },
  { id: '18', code: 'Q17_SALES_CASE', textUz: '18. E\'tirozlar bilan ishlash: Mijoz "Qimmat" desa nima degan bo\'lardingiz?', answerType: 'TEXT', sortOrder: 18 },
  { id: '19', code: 'Q18_SOFT_SKILLS', textUz: '19. O\'zingizdagi eng kuchli 3 ta sifatni ko\'rsating', answerType: 'TEXT', sortOrder: 19 },
  { id: '20', code: 'Q19_MOTIVATION', textUz: '20. Nega aynan ushbu kompaniya jamoasida ishlamoqchisiz?', answerType: 'TEXT', sortOrder: 20 },
  { id: '21', code: 'Q20_SELF_INTRO', textUz: '21. 📸 Face ID / Foto: O\'zingizning aniq tushgan suratingizni yuboring', answerType: 'TEXT', sortOrder: 21 }
];

export function parseAgeOrYear(input: string): string {
  const clean = input.trim();
  const currentYear = new Date().getFullYear(); // 2026

  // Check 4-digit year like 1998, 2002, 2005
  const yearMatch = clean.match(/(19\d\d|20\d\d)/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 1950 && year <= currentYear - 10) {
      const age = currentYear - year;
      return `${age} yosh (${year}-yil)`;
    }
  }

  // Check 2-digit age like 23, 25 yosh
  const ageMatch = clean.match(/^(\d{2})\b/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1], 10);
    if (age >= 14 && age <= 75) {
      const year = currentYear - age;
      return `${age} yosh (~${year}-yil)`;
    }
  }

  return clean;
}

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
  if (step === 13) return '✨ Yaxshi! Qolgan savollar ham muhim.';
  if (step === 17) return '💪 Deyarli yetib keldik!';
  if (step === 20) return '🏆 Oxirgi hal qiluvchi savol!';
  return '';
}

function escapeHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function startQuestionnaire(ctx: BotContext) {
  ctx.session.step = 'QUESTIONNAIRE';
  ctx.session.currentQuestionIndex = 1;
  ctx.session.answers = {};
  ctx.session.currentMultiSelectAnswers = [];
  await renderQuestion(ctx);
}

export async function renderQuestion(ctx: BotContext) {
  ctx.session.step = 'QUESTIONNAIRE';
  const step = ctx.session.currentQuestionIndex || 1;

  let questions: any[] = [];
  try {
    questions = await prisma.question.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  } catch (dbErr) {
    console.error('DB Question query error:', dbErr);
  }

  if (!questions || questions.length === 0) {
    questions = FALLBACK_QUESTIONS;
  }

  if (step > questions.length) {
    const { startVideoStep } = await import('./video.handler');
    await startVideoStep(ctx);
    return;
  }

  const q = questions[step - 1];

  if (ctx.session.applicationId) {
    try {
      const completionPercent = Math.round((step / questions.length) * 100);
      await prisma.application.update({
        where: { id: ctx.session.applicationId },
        data: {
          currentStep: step,
          completionPercent,
        },
      });
    } catch (e) {
      // Non-blocking catch
    }
  }

  const progressBarText = getProgressBar(step, questions.length);
  const encouragement = getEncouragement(step);
  const encouragementText = encouragement ? `\n\n<i>${encouragement}</i>` : '';

  const questionHeader = `📋 <b>Savol ${step}/${questions.length}</b>\n${progressBarText}${encouragementText}\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
  const rawQuestionText = q.textUz || q.text || `Savol ${step}`;
  const questionText = escapeHtml(rawQuestionText);
  
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

  // 1. Primary Phone
  if (q.answerType === 'PHONE') {
    try {
      await ctx.reply(`${questionHeader}${questionText}`, {
        parse_mode: 'HTML',
        reply_markup: getPhoneRequestKeyboard(ctx.session.lang),
      });
    } catch (err) {
      await ctx.reply(`📋 Savol ${step}/${questions.length}\n${rawQuestionText}`, {
        reply_markup: getPhoneRequestKeyboard(ctx.session.lang),
      });
    }
    return;
  }

  // 2. Extra (Optional) Phone
  if (q.answerType === 'EXTRA_PHONE' || q.code === 'Q2B_EXTRA_PHONE') {
    const inlineKb = getExtraPhoneInlineKeyboard(ctx.session.lang);
    try {
      await ctx.reply(`${questionHeader}${questionText}`, {
        parse_mode: 'HTML',
        reply_markup: inlineKb,
      });
    } catch (err) {
      await ctx.reply(`📋 Savol ${step}/${questions.length}\n${rawQuestionText}`, {
        reply_markup: inlineKb,
      });
    }
    return;
  }

  // 3. Multi-Select (Software / Languages)
  if (q.answerType === 'MULTISELECT' && options && options.length > 0) {
    const selected = ctx.session.currentMultiSelectAnswers || [];
    const keyboard = getMultiSelectKeyboard(options, selected, step > 1, ctx.session.lang);
    
    try {
      if (ctx.callbackQuery && ctx.callbackQuery.message) {
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
    } catch (editErr) {
      await ctx.reply(`${questionHeader}${questionText}`, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    }
    return;
  }

  // 4. Standard Choice or Text
  const keyboard = getQuestionControlKeyboard(options, step > 1, ctx.session.lang);
  try {
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
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
  } catch (editErr) {
    try {
      await ctx.reply(`${questionHeader}${questionText}`, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (replyErr) {
      await ctx.reply(`📋 Savol ${step}/${questions.length}\n\n${rawQuestionText}`, {
        reply_markup: keyboard,
      });
    }
  }
}

export async function handleQuestionAnswer(ctx: BotContext, answerValue: string) {
  ctx.session.step = 'QUESTIONNAIRE';
  const step = ctx.session.currentQuestionIndex || 1;

  let questions: any[] = [];
  try {
    questions = await prisma.question.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  } catch (e) {}

  if (!questions || questions.length === 0) {
    questions = FALLBACK_QUESTIONS;
  }

  const q = questions[step - 1] || questions[0];

  // Gentle Validation rules
  if (q.code === 'Q1_FULL_NAME') {
    if (answerValue.trim().length < 2) {
      await ctx.reply('⚠️ Iltimos, to\'liq ismingizni kiriting:', {
        parse_mode: 'HTML',
      });
      return;
    }
  }

  let finalAnswerValue = answerValue;

  // Smart Age or Birth Year Parsing
  if (q.code === 'Q3_AGE' || q.answerType === 'AGE_OR_YEAR' || q.answerType === 'NUMBER') {
    finalAnswerValue = parseAgeOrYear(answerValue);
  }

  // Save answer in session
  ctx.session.answers[q.code] = finalAnswerValue;
  ctx.session.currentMultiSelectAnswers = [];

  // Save answer in DB
  if (ctx.session.applicationId) {
    try {
      await prisma.applicationAnswer.create({
        data: {
          applicationId: ctx.session.applicationId,
          questionId: q.id || `q_${step}`,
          answerText: finalAnswerValue,
        },
      });
    } catch (e) {}
  }

  // Advance to next question
  ctx.session.currentQuestionIndex = step + 1;
  await renderQuestion(ctx);
}

export async function handleToggleMultiSelect(ctx: BotContext, indexStr: string) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const step = ctx.session.currentQuestionIndex || 1;
  let questions: any[] = [];
  try {
    questions = await prisma.question.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  } catch (e) {}
  if (!questions || questions.length === 0) questions = FALLBACK_QUESTIONS;

  const q = questions[step - 1];
  let options: string[] = [];
  if (typeof q?.optionsJson === 'string') {
    try { options = JSON.parse(q.optionsJson); } catch {}
  } else if (Array.isArray(q?.optionsJson)) {
    options = q.optionsJson;
  }

  const idx = parseInt(indexStr, 10);
  if (isNaN(idx) || !options[idx]) return;

  const targetOption = options[idx];
  let selected = ctx.session.currentMultiSelectAnswers || [];

  if (selected.includes(targetOption)) {
    selected = selected.filter(item => item !== targetOption);
  } else {
    selected.push(targetOption);
  }

  ctx.session.currentMultiSelectAnswers = selected;

  // Re-render keyboard smoothly with editMessageReplyMarkup
  const keyboard = getMultiSelectKeyboard(options, selected, step > 1, ctx.session.lang);
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });
  } catch (err) {
    // Non-blocking
  }
}

export async function handleConfirmMultiSelect(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  const selected = ctx.session.currentMultiSelectAnswers || [];
  const answerValue = selected.length > 0 ? selected.join(', ') : 'Ko\'rsatilmadi';
  ctx.session.currentMultiSelectAnswers = [];

  await handleQuestionAnswer(ctx, answerValue);
}

export async function handleSkipExtraPhone(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  await handleQuestionAnswer(ctx, 'Kiritilmadi (O\'tkazib yuborildi)');
}

export async function handleQuestionBack(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();

  if (ctx.session.currentQuestionIndex > 1) {
    ctx.session.currentQuestionIndex -= 1;
    ctx.session.currentMultiSelectAnswers = [];
    await renderQuestion(ctx);
  }
}

export async function handleQuestionCancel(ctx: BotContext) {
  if (ctx.callbackQuery) await ctx.answerCallbackQuery();
  ctx.session.step = 'IDLE';
  ctx.session.currentMultiSelectAnswers = [];
  await ctx.reply('Anketa to‘ldirish bekor qilindi. Bosh menyudasiz.', {
    reply_markup: { remove_keyboard: true },
  });
}
