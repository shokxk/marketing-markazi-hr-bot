import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function calculateScore(applicationId: string): Promise<number> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      answers: { include: { question: true } },
      vacancy: true,
    },
  });

  if (!app) return 0;

  let totalScore = 0;
  const answerMap: Record<string, string> = {};

  app.answers.forEach((ans) => {
    answerMap[ans.question.code] = ans.answerText || '';
  });

  // 1. Region match (10 pts)
  if (answerMap['Q6_REGION']?.includes('Toshkent') || answerMap['Q6_REGION'] === app.vacancy.city) {
    totalScore += 10;
  }

  // 2. Schedule convenience (10 pts)
  if (answerMap['Q7_LOCATION_CONVENIENCE']?.includes('Ha') || answerMap['Q7_LOCATION_CONVENIENCE']?.includes('Ko‘chib')) {
    totalScore += 10;
  }

  // 3. General Experience (10 pts)
  const exp = answerMap['Q10_TOTAL_EXPERIENCE'] || '';
  if (exp.includes('3 yildan') || exp.includes('2–3') || exp.includes('1–2')) {
    totalScore += 10;
  } else if (exp.includes('6 oy')) {
    totalScore += 5;
  }

  // 4. Sales or Call-center Experience (20 pts)
  const salesExp = answerMap['Q13_SALES_EXPERIENCE'] || '';
  if (salesExp.includes('Ha') || salesExp.includes('Ikkalasida')) {
    totalScore += 20;
  }

  // 5. CRM Experience (10 pts)
  const crmExp = answerMap['Q14_CRM_EXPERIENCE'] || '';
  if (crmExp && !crmExp.includes('Yo‘q') && !crmExp.includes('Yo\'q')) {
    totalScore += 10;
  }

  // 6. Computer Skills (10 pts)
  if (answerMap['Q15_COMPUTER_SKILLS'] && answerMap['Q15_COMPUTER_SKILLS'].length > 3) {
    totalScore += 10;
  }

  // 7. Russian Language Skill (10 pts)
  const langExp = answerMap['Q16_LANGUAGES'] || '';
  if (langExp.includes('Rus tili (Erkin)') || langExp.includes('Rus tili (O‘rta)')) {
    totalScore += 10;
  } else if (langExp.includes('Rus tili (Boshlang‘ich)')) {
    totalScore += 5;
  }

  // 8. Availability to start fast (5 pts)
  const startDate = answerMap['Q19_START_DATE'] || '';
  if (startDate.includes('Bugundan') || startDate.includes('Ertadan') || startDate.includes('3 kun')) {
    totalScore += 5;
  }

  // 9. Salary expectation alignment (5 pts)
  totalScore += 5;

  // 10. Video submitted (5 pts)
  if (app.videoUrl) {
    totalScore += 5;
  }

  // 11. Application complete (5 pts)
  if (app.completionPercent === 100) {
    totalScore += 5;
  }

  return Math.min(100, Math.max(0, totalScore));
}
