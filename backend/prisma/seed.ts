import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Super Admin
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@marketingmarkazi.uz' },
    update: {},
    create: {
      email: 'admin@marketingmarkazi.uz',
      passwordHash: 'admin123_hashed',
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✅ Created Super Admin:', admin.email);

  // 2. Create Companies
  const companyNames = [
    'Daler Boilers',
    'Kichkina Tabib',
    'Usta Shop',
    'Yuksak Travel',
    'Active Polimer',
    'Grand Pharma',
    'Safia Bakery',
    'Baku Sweets',
    'Apex Insurance',
    'Orient Group',
    'Texno Mart',
    'Anorbank',
    'Korzinka',
    'EVOS',
    'Les Ailes',
    'Feed Up',
    'Fast Food Co',
    'Silk Road Logistics',
    'Comfort Home',
    'Master Building',
    'Imzo Windows',
    'Akfa Group',
    'Artel Electronics',
    'Toshkent City HR',
    'Samarkand Silk',
    'Fergana Textiles',
    'Namangan Auto',
    'Andijan Trading',
    'Bukhara Crafts',
    'Khiva Tours',
  ];

  const createdCompanies = [];
  for (const name of companyNames) {
    const comp = await prisma.company.create({
      data: {
        name,
        description: `${name} kompaniyasida rasmiy ish o'rinlari va karyera imkoniyatlari.`,
        city: 'Toshkent',
        address: 'Toshkent sh., Markaziy bino',
        isActive: true,
      },
    });
    createdCompanies.push(comp);
  }
  console.log(`✅ Seeded ${createdCompanies.length} companies`);

  // 3. Create Vacancies for first few companies
  const vacancyTitles = [
    'Sotuv menejeri',
    'Call-center operatori',
    'Showroom menejeri',
    'Administrator',
    'Project Manager',
    'Texnik mutaxassis',
    'SMM menejer',
    'Buxgalter yordamchisi',
  ];

  let vacancyCount = 0;
  for (const comp of createdCompanies) {
    const selectedTitles = vacancyTitles.slice(0, 2 + Math.floor(Math.random() * 3));
    for (const title of selectedTitles) {
      await prisma.vacancy.create({
        data: {
          companyId: comp.id,
          title,
          description: `${comp.name} kompaniyasida ${title} lavozimi uchun nomzodlar qidirilmoqda.`,
          requirements: 'Sotuv tajribasi, mas\'uliyatlilik, muloqotga kirishuvchanlik.',
          salaryFrom: 3000000,
          salaryTo: 7000000,
          city: 'Toshkent',
          workSchedule: '09:00 - 18:00 (6/1)',
          videoRequired: true,
          isActive: true,
        },
      });
      vacancyCount++;
    }
  }
  console.log(`✅ Seeded ${vacancyCount} vacancies`);

  // 4. Create Standard 20 Uzbek Questions
  const questionsData = [
    {
      code: 'Q1_FULL_NAME',
      textUz: 'F.I.O.ingizni to‘liq kiriting.',
      answerType: 'TEXT',
      sortOrder: 1,
      isRequired: true,
    },
    {
      code: 'Q2_BIRTH_YEAR',
      textUz: 'Tug‘ilgan yilingizni tanlang.',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify(['2005', '2004', '2003', '2002', '2001', '2000', '1999', '1998', '1997', '1996', '1995', 'Boshqa yil']),
      sortOrder: 2,
      isRequired: true,
    },
    {
      code: 'Q3_GENDER',
      textUz: 'Jinsingizni tanlang.',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify(['Erkak', 'Ayol']),
      sortOrder: 3,
      isRequired: true,
    },
    {
      code: 'Q4_PHONE',
      textUz: 'Telefon raqamingizni yuboring.',
      answerType: 'PHONE',
      sortOrder: 4,
      isRequired: true,
    },
    {
      code: 'Q5_TELEGRAM_USERNAME',
      textUz: 'Telegram username avtomatik olinadi.',
      answerType: 'TEXT',
      sortOrder: 5,
      isRequired: false,
    },
    {
      code: 'Q6_REGION',
      textUz: 'Hozir qaysi hududda yashaysiz?',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify([
        'Toshkent shahri',
        'Toshkent viloyati',
        'Farg‘ona',
        'Andijon',
        'Namangan',
        'Samarqand',
        'Buxoro',
        'Qashqadaryo',
        'Surxondaryo',
        'Xorazm',
        'Navoiy',
        'Jizzax',
        'Sirdaryo',
        'Qoraqalpog‘iston R.',
      ]),
      sortOrder: 6,
      isRequired: true,
    },
    {
      code: 'Q7_LOCATION_CONVENIENCE',
      textUz: 'Tanlangan ish joyiga qatnab ishlash siz uchun qulaymi?',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify([
        'Ha, qulay',
        'Ko‘chib borishim mumkin',
        'Masofadan ishlashni xohlayman',
        'Ish joyi manzilini bilmayman',
      ]),
      sortOrder: 7,
      isRequired: true,
    },
    {
      code: 'Q8_EDUCATION_LEVEL',
      textUz: 'Ta’lim darajangizni tanlang.',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify(['O‘rta', 'O‘rta maxsus', 'Tugallanmagan oliy', 'Oliy', 'Magistratura', 'Talaba']),
      sortOrder: 8,
      isRequired: true,
    },
    {
      code: 'Q9_EDUCATION_INSTITUTION',
      textUz: 'Qayerda va qaysi yo‘nalishda o‘qigansiz?',
      answerType: 'TEXT',
      sortOrder: 9,
      isRequired: true,
    },
    {
      code: 'Q10_TOTAL_EXPERIENCE',
      textUz: 'Umumiy ish tajribangiz qancha?',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify(['Tajribam yo‘q', '6 oygacha', '6 oy – 1 yil', '1–2 yil', '2–3 yil', '3 yildan ko‘p']),
      sortOrder: 10,
      isRequired: true,
    },
    {
      code: 'Q11_LAST_JOB',
      textUz: 'Oxirgi ish joyingiz va lavozimingizni yozing (agar bo‘lsa).',
      answerType: 'TEXT',
      sortOrder: 11,
      isRequired: false,
    },
    {
      code: 'Q12_REASON_LEAVING',
      textUz: 'Oxirgi ish joyingizdan ketish sababini qisqacha yozing.',
      answerType: 'TEXT',
      sortOrder: 12,
      isRequired: false,
    },
    {
      code: 'Q13_SALES_EXPERIENCE',
      textUz: 'Sotuv yoki call-center yo‘nalishida ishlaganmisiz?',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify([
        'Ha, sotuvda ishlaganman',
        'Ha, call-centerda ishlaganman',
        'Ikkalasida ham ishlaganman',
        'Yo‘q, tajribam yo‘q',
      ]),
      sortOrder: 13,
      isRequired: true,
    },
    {
      code: 'Q14_CRM_EXPERIENCE',
      textUz: 'CRM tizimida ishlaganmisiz?',
      answerType: 'MULTI_CHOICE',
      optionsJson: JSON.stringify(['amoCRM', 'Bitrix24', 'Salesforce', 'Boshqa CRM', 'Yo‘q, ishlamaganman']),
      sortOrder: 14,
      isRequired: true,
    },
    {
      code: 'Q15_COMPUTER_SKILLS',
      textUz: 'Kompyuterda ishlash darajangiz va dasturlaringiz:',
      answerType: 'MULTI_CHOICE',
      optionsJson: JSON.stringify([
        'Microsoft Word',
        'Microsoft Excel',
        'Google Sheets',
        'CRM tizimlari',
        'Telegram va Ijtimoiy tarmoqlar',
      ]),
      sortOrder: 15,
      isRequired: true,
    },
    {
      code: 'Q16_LANGUAGES',
      textUz: 'Qaysi tillarda gaplasha olasiz?',
      answerType: 'MULTI_CHOICE',
      optionsJson: JSON.stringify(['O‘zbek tili', 'Rus tili (Boshlang‘ich)', 'Rus tili (O‘rta)', 'Rus tili (Erkin)', 'Ingliz tili']),
      sortOrder: 16,
      isRequired: true,
    },
    {
      code: 'Q17_WORK_SCHEDULE_CONFIRM',
      textUz: 'Taklif etilayotgan ish grafigiga rozimisiz?',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify(['Ha', 'Yo‘q', 'Muhokama qilish kerak']),
      sortOrder: 17,
      isRequired: true,
    },
    {
      code: 'Q18_EXPECTED_SALARY',
      textUz: 'Kutilayotgan oylik daromadingiz qancha?',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify(['2–3 mln so‘m', '3–5 mln so‘m', '5–7 mln so‘m', '7 mln so‘mdan yuqori', 'Vakansiya shartlariga qarab']),
      sortOrder: 18,
      isRequired: true,
    },
    {
      code: 'Q19_START_DATE',
      textUz: 'Ishga qachondan chiqa olasiz?',
      answerType: 'SINGLE_CHOICE',
      optionsJson: JSON.stringify(['Bugundan', 'Ertadan', '3 kun ichida', '1 hafta ichida', '2 hafta ichida', 'Hozirgi ishdan chiqib']),
      sortOrder: 19,
      isRequired: true,
    },
    {
      code: 'Q20_SELF_INTRO',
      textUz: 'O‘zingiz va kuchli tomonlaringiz haqingizda qisqacha yozing (min 50 belgi).',
      answerType: 'TEXT',
      sortOrder: 20,
      isRequired: true,
    },
  ];

  for (const q of questionsData) {
    await prisma.question.upsert({
      where: { code: q.code },
      update: q,
      create: q,
    });
  }
  console.log(`✅ Seeded ${questionsData.length} standard Uzbek questions`);

  // 5. Seed Referral Sources
  const refSources = [
    { code: 'instagram', name: 'Instagram Target Reklama' },
    { code: 'telegram_channel', name: 'Telegram Kanal Post' },
    { code: 'hh_uz', name: 'hh.uz E\'lon' },
    { code: 'olx', name: 'OLX E\'lon' },
    { code: 'friend_referral', name: 'Tanish Tavsiyasi' },
  ];

  for (const ref of refSources) {
    await prisma.referralSource.upsert({
      where: { code: ref.code },
      update: ref,
      create: ref,
    });
  }
  console.log(`✅ Seeded ${refSources.length} referral sources`);

  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
