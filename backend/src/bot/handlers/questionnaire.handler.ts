import { BotContext } from '../types';
import { getQuestionControlKeyboard, getPhoneRequestKeyboard } from '../keyboards';
import { t } from '../../locales/i18n';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FALLBACK_QUESTIONS = [
  { id: '1', code: 'Q1_FULL_NAME', textUz: '1. Sizning to\'liq ismingiz (F.I.Sh.)?', answerType: 'TEXT' },
  { id: '2', code: 'Q2_PHONE', textUz: '2. Bog\'lanish uchun telefon raqamingiz?', answerType: 'PHONE' },
  { id: '3', code: 'Q3_AGE', textUz: '3. Yoshingiz nechada? (20 – 35 yosh ayol nomzod)', answerType: 'NUMBER' },
  { id: '4', code: 'Q4_CITY', textUz: '4. Yashash shahringiz va tumaningiz?', answerType: 'TEXT' },
  { id: '5', code: 'Q5_MARITAL_STATUS', textUz: '5. Oilaviy ahvolingiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Turmush qurmagan', 'Turmush qurgan (farzandli)', 'Farqi yo\'q']) },
  { id: '6', code: 'Q6_EDUCATION_LEVEL', textUz: '6. Ma\'lumotingiz darajasi?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Oliy (Bakalavr/Magistr)', 'O\'rta maxsus (Kollej/Litsey)', 'O\'rta maktab']) },
  { id: '7', code: 'Q7_EDUCATION_PLACE', textUz: '7. Qaysi o\'quv muassasasini tamomlagansiz?', answerType: 'TEXT' },
  { id: '8', code: 'Q8_CALLCENTER_EXP', textUz: '8. Call Center yoki Sotuv sohasida tajribangiz bormi?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, 6-12 oy tajribam bor', 'Ha, 1 yildan ortiq tajribam bor', 'Yo\'q, lekin tez o\'rganaman']) },
  { id: '9', code: 'Q9_LAST_JOB', textUz: '9. Oxirgi ish joyingiz va lavozimingiz?', answerType: 'TEXT' },
  { id: '10', code: 'Q10_REASON_LEAVING', textUz: '10. Oxirgi ish joyingizdan ketish sababi?', answerType: 'TEXT' },
  { id: '11', code: 'Q11_AMOCRM_EXP', textUz: '11. amoCRM va kompyuter dasturlari bilan ishlaganmisiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, amoCRM bilan mukammal ishlayman', 'Kompyuterni bilaman, amoCRM o\'rganaman', 'Yo\'q, yangi o\'rganaman']) },
  { id: '12', code: 'Q12_COMPUTER_SKILLS', textUz: '12. Qaysi kompyuter dasturlarini bilasiz?', answerType: 'TEXT' },
  { id: '13', code: 'Q13_LANGUAGES', textUz: '13. Qaysi tillarda ravon muloqot qilasiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['O\'zbek tili — Mukammal', 'O\'zbek va Rus tili — Erkin muloqot']) },
  { id: '14', code: 'Q14_WORK_SCHEDULE', textUz: '14. 6/1 grafik va smenalarga tayyormisiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, to\'liq tayyorman', 'Grafik bo\'yicha savollarim bor']) },
  { id: '15', code: 'Q15_SALARY_EXPECTATION', textUz: '15. Kutilayotgan oylik maosh?', answerType: 'TEXT' },
  { id: '16', code: 'Q16_START_DATE', textUz: '16. Qachondan ishni boshlashingiz mumkin?', answerType: 'TEXT' },
  { id: '17', code: 'Q17_SALES_CASE', textUz: '17. E\'tirozlar bilan ishlash: Mijoz "Qimmat" desa nima degan bo\'lardingiz?', answerType: 'TEXT' },
  { id: '18', code: 'Q18_SOFT_SKILLS', textUz: '18. O\'zingizdagi eng kuchli 3 ta sifatni ko\'rsating', answerType: 'TEXT' },
  { id: '19', code: 'Q19_MOTIVATION', textUz: '19. Nega aynan ushbu kompaniya jamoasida ishlamoqchisiz?', answerType: 'TEXT' },
  { id: '20', code: 'Q20_SELF_INTRO', textUz: '20. 📸 Face ID / Foto: O\'zingizning aniq tushgan suratingizni yuboring', answerType: 'TEXT' }
];

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
  const questionText = q.textUz || q.text || `Savol ${step}`;
  
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
      try {
        await ctx.editMessageText(`${questionHeader}${questionText}`, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      } catch (editErr) {
        await ctx.reply(`${questionHeader}${questionText}`, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      }
    } else {
      await ctx.reply(`${questionHeader}${questionText}`, {
        parse_mode: 'HTML',
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
      await ctx.reply('⚠️ Iltimos, ismingizni kiriting:', {
        parse_mode: 'HTML',
      });
      return;
    }
  }

  // Save answer in session
  ctx.session.answers[q.code] = answerValue;

  // Save answer in DB
  if (ctx.session.applicationId) {
    try {
      await prisma.applicationAnswer.create({
        data: {
          applicationId: ctx.session.applicationId,
          questionId: q.id || `q_${step}`,
          answerText: answerValue,
        },
      });
    } catch (e) {}
  }

  // Advance to next question
  ctx.session.currentQuestionIndex = step + 1;
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
