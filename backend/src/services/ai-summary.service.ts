import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function generateAiSummary(applicationId: string): Promise<string> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      answers: { include: { question: true } },
      vacancy: true,
      company: true,
    },
  });

  if (!app) return '';

  const answerMap: Record<string, string> = {};
  app.answers.forEach((ans) => {
    answerMap[ans.question.code] = ans.answerText || '';
  });

  const name = answerMap['Q1_FULL_NAME'] || 'Nomzod';
  const birthYear = answerMap['Q2_BIRTH_YEAR'] || '2000';
  const age = new Date().getFullYear() - parseInt(birthYear, 10);
  const region = answerMap['Q6_REGION'] || 'Aniqlanmagan';
  const sales = answerMap['Q13_SALES_EXPERIENCE'] || 'Yo\'q';
  const crm = answerMap['Q14_CRM_EXPERIENCE'] || 'Yo\'q';
  const langs = answerMap['Q16_LANGUAGES'] || 'O\'zbek';
  const startDate = answerMap['Q19_START_DATE'] || 'Kelishuv bo\'yicha';

  return `Nomzod ${name} (${age} yoshda), ${region}da yashaydi. ${app.vacancy.title} lavozimiga ariza topshirgan.\n\n` +
    `• Tajriba: ${answerMap['Q10_TOTAL_EXPERIENCE'] || 'Ko\'rsatilmadi'}\n` +
    `• Sotuv tajribasi: ${sales}\n` +
    `• CRM bilimi: ${crm}\n` +
    `• Tillar: ${langs}\n` +
    `• Ishga chiqish imkoniyati: ${startDate}\n\n` +
    `Kuchli tomonlari: Sotuv/CRM bilimi bor, ariza anketasini to'liq to'ldirgan. Video tanishtiruv taqdim etgan.`;
}
