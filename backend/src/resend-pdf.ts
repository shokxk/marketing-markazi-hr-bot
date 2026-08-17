import { PrismaClient } from '@prisma/client';
import { generateCandidatePdfResume } from './services/pdf-resume.service';
import { Bot, InputFile } from 'grammy';
import { config } from './config';
import fs from 'fs';

const prisma = new PrismaClient();

async function resendCleanPdf() {
  console.log('🔍 Searching for application of Qodirova Azizaxon...');
  
  // Find candidate profile or application
  const app = await prisma.application.findFirst({
    where: {
      OR: [
        { user: { fullName: { contains: 'Qodirova' } } },
        { user: { fullName: { contains: 'Azizaxon' } } },
      ]
    },
    orderBy: { createdAt: 'desc' },
    include: { user: true, company: true, vacancy: true, answers: { include: { question: true } } }
  });

  if (!app) {
    console.log('⚠️ Could not find candidate in DB. Using exact extracted answers from screenshot...');
  } else {
    console.log(`✅ Found candidate application ${app.id} for ${app.user.fullName}`);
  }

  // Exact answers from candidate Qodirova Azizaxon
  const answers: Record<string, string> = {
    full_name: 'Qodirova Azizaxon Nurmuhammad qizi',
    phone: '+998911555532',
    age: '33',
    city: 'Farg\'ona',
    marital_status: 'Turmush qurgan (farzandli)',
    education_level: 'Oliy (Bakalavr/Magistr)',
    education_place: 'Qo\'qon universiteti',
    callcenter_exp: 'Ha, 6-12 oy tajribam bor',
    last_job: 'Grand omad MChJ',
    reason_leaving: 'O\'qish, o\'zimni boshqa sohada sinab ko\'rish',
    amocrm_exp: 'Kompyuterni bilaman, amoCRM o\'rganaman',
    computer_skills: 'Excel word power point telegram Google internet tarmoqlari',
    languages: 'O\'zbek tili — Mukammal',
    work_schedule: 'Ha, to\'liq tayyorman',
    salary_expectation: '5000000',
    start_date: 'Ertaga',
    sales_case: 'Mijozni fikriga rozi bo\'lib, tovarniy ijobiy tomonlari sifatini narxi kafolatiga mijozni jalb qilib, taklif qilingan summani maydalaymiz.Bozordan arzonroq narxga topish mumkin lekin sifatli mahsulot bizda va kafolatlab xizmat ko\'rsatamiz. Tovardan foydalanish davomida garantiya berilgan vaqt davomida bepul xizmat ko\'rsatamiz',
    soft_skills: 'Har qanday yoshdagilar bilan oson muloqotga kirishish, o\'z vaqtida ishga borish, sotuvchilik va reklama mahorati. Savdoda reklama',
    motivation: 'Hozircha KPI borligi uchun. Bu degani harakat qilsak natija bo\'ladi. Yanada ko\'proq intilish reja maqsad bo\'ladi. Erkin muloqot. Jamoa bilan ishlash',
    face_id: 'Foto yuklandi'
  };

  const pdfPath = await generateCandidatePdfResume({
    candidateName: 'Qodirova Azizaxon Nurmuhammad qizi',
    phone: '+998911555532',
    age: '33',
    city: 'Farg\'ona',
    companyName: app?.company?.name || 'Flourenza',
    vacancyTitle: app?.vacancy?.title || 'Call Center Sotuv Menejeri',
    answers
  });

  console.log(`✅ Generated Clean PDF Resume at: ${pdfPath}`);

  if (fs.existsSync(pdfPath)) {
    const bot = new Bot(config.botToken);
    console.log(`📡 Sending document to Telegram HR Group ${config.hrTelegramGroupId}...`);
    await bot.api.sendDocument(config.hrTelegramGroupId, new InputFile(pdfPath), {
      caption: `📄 <b>NOMZOD REZYUMESI (TUZATILGAN CHISTYY PDF)</b> — Qodirova Azizaxon Nurmuhammad qizi`,
      parse_mode: 'HTML'
    });
    console.log('🎉 Successfully sent fixed PDF to Telegram HR Group!');
  }
}

resendCleanPdf()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
