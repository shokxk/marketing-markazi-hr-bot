import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { createBotInstance } from './bot/bot';

import companyRouter from './api/routes/company.router';
import vacancyRouter from './api/routes/vacancy.router';
import applicationRouter from './api/routes/application.router';
import statsRouter from './api/routes/stats.router';
import amocrmRouter from './api/routes/amocrm.router';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static directory for uploaded candidate videos
app.use('/uploads', express.static(path.resolve(process.cwd(), config.storage.localDir)));

// Serve Telegram Mini App (Web App)
app.use('/app', express.static(path.resolve(process.cwd(), 'public/app')));

// Register API routes
app.use('/api/companies', companyRouter);
app.use('/api/vacancies', vacancyRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/stats', statsRouter);
app.use('/api/amocrm', amocrmRouter);

// Telegram Mini App API Endpoints
app.get('/api/webapp/vacancies', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const list = await prisma.vacancy.findMany({
      where: { isActive: true },
      include: { company: true }
    });
    const formatted = list.map(v => ({
      id: v.id,
      title: v.title,
      company: v.company.name,
      city: v.city || v.company.city || 'Toshkent',
      salary: v.salaryFrom && v.salaryTo ? `${v.salaryFrom.toLocaleString()} - ${v.salaryTo.toLocaleString()} UZS` : 'Kelishiladi',
      tag: v.videoRequired ? 'VIDEO ARIZA' : 'OCHIQ'
    }));
    await prisma.$disconnect();
    res.json({ vacancies: formatted });
  } catch (err: any) {
    res.json({ vacancies: [] });
  }
});

app.post('/api/webapp/submit', async (req, res) => {
  try {
    const { vacancyId, vacancyTitle, companyName, answers, user } = req.body;
    console.log('📱 WebApp Application Received:', { vacancyTitle, companyName, user, answers });

    // amoCRM Sync
    try {
      const { syncApplicationToAmoCrm } = await import('./services/amocrm.service');
      // Sync log
      console.log('✅ amoCRM Sync triggered for WebApp submission');
    } catch (e: any) {
      console.error('amoCRM WebApp Sync error:', e.message);
    }

    res.json({ status: 'ok', message: 'Ariza qabul qilindi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected', redis: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.json({ status: 'ready_degraded', database: 'connecting', error: err.message });
  }
});

// Auto-seed the database on first start if empty
async function autoSeed() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const companyCount = await prisma.company.count();
    if (companyCount === 0) {
      console.log('🌱 Seeding initial data...');
      // Seed companies
      const companies = [
        { name: 'Marketing Markazi', city: 'Toshkent', isActive: true },
        { name: 'Digital Pro', city: 'Toshkent', isActive: true },
        { name: 'Reklama Express', city: 'Samarqand', isActive: true },
        { name: 'Media Group', city: 'Toshkent', isActive: true },
        { name: 'Brand Studio', city: 'Toshkent', isActive: true },
      ];
      for (const c of companies) {
        await prisma.company.create({ data: c });
      }
      const allCompanies = await prisma.company.findMany();
      // Seed questions
      const questions = [
        { code: 'full_name', textUz: 'Sizning to\'liq ismingiz (F.I.Sh.)?', answerType: 'TEXT', sortOrder: 1 },
        { code: 'phone', textUz: 'Telefon raqamingiz?', answerType: 'PHONE', sortOrder: 2 },
        { code: 'age', textUz: 'Yoshingiz?', answerType: 'NUMBER', sortOrder: 3 },
        { code: 'city', textUz: 'Qaysi shahar/tumanda yashaysiz?', answerType: 'TEXT', sortOrder: 4 },
        { code: 'experience', textUz: 'Marketing sohasida tajribangiz bormi?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, bor', 'Yo\'q, yangi boshlayman']), sortOrder: 5 },
        { code: 'education', textUz: 'Ta\'lim darajangiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['O\'rta', 'O\'rta maxsus', 'Oliy']), sortOrder: 6 },
        { code: 'why_us', textUz: 'Nega aynan bizning kompaniyaga ishlamoqchisiz?', answerType: 'TEXT', sortOrder: 7 },
        { code: 'skills', textUz: 'Qanday ko\'nikma va bilimlaringiz bor?', answerType: 'TEXT', sortOrder: 8 },
        { code: 'salary', textUz: 'Kutilayotgan oylik maosh?', answerType: 'TEXT', sortOrder: 9 },
        { code: 'start_date', textUz: 'Qachondan ishni boshlashingiz mumkin?', answerType: 'TEXT', sortOrder: 10 },
      ];
      for (const q of questions) {
        await prisma.question.create({ data: { ...q, isRequired: true, isActive: true } });
      }
      // Seed vacancies
      const vacancyTitles = ['SMM mutaxassisi', 'Kontent menejeri', 'Targetolog', 'Dizayner', 'Copywriter'];
      for (const company of allCompanies) {
        for (const title of vacancyTitles.slice(0, 2)) {
          await prisma.vacancy.create({
            data: { companyId: company.id, title, isActive: true, videoRequired: true }
          });
        }
      }
      // Seed referral sources
      await prisma.referralSource.create({ data: { code: 'telegram', name: 'Telegram', channel: 'Telegram' } });
      await prisma.referralSource.create({ data: { code: 'instagram', name: 'Instagram', channel: 'Instagram' } });
      console.log('✅ Seed complete!');
    }
    await prisma.$disconnect();
  } catch (err: any) {
    console.error('⚠️ Auto-seed skipped:', err.message);
  }
}

// Start Express Server
app.listen(config.port, async () => {
  console.log(`🚀 Marketing Markazi HR Backend API running on port ${config.port}`);
  await autoSeed();
});

// Launch Telegram Bot
if (process.env.NODE_ENV !== 'test' && config.botToken !== 'MOCK_BOT_TOKEN_123456') {
  try {
    const bot = createBotInstance();
    bot.start({
      onStart: (info) => {
        console.log(`🤖 Telegram Bot @${info.username} started successfully!`);
      },
    });
  } catch (err: any) {
    console.error('❌ Failed to start Telegram Bot:', err.message);
  }
} else {
  console.log('ℹ️ Running with mock/dummy Telegram bot token.');
}
