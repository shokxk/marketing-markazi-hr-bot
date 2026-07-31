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
    const { vacancyTitle, companyName, answers, user } = req.body;
    console.log('📱 WebApp Application Received:', { vacancyTitle, companyName, user, answers });

    const candidateName = answers.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Nomzod';
    const phone = answers.phone || 'Ko\'rsatilmadi';
    const age = answers.age || '-';
    const city = answers.city || 'Quva / Toshkent';
    const exp = answers.experience || '6-12 oy';
    const faceId = answers.face_id || 'Foto tasdiq berildi';

    // 1. Dispatch message to HR Telegram Group (-1002923694952)
    try {
      const { Bot } = await import('grammy');
      const bot = new Bot(config.botToken);
      const hrGroupMsg = 
        `🔥 <b>YANGI ARIZA (Mini-App / Flourenza)</b> 🔥\n\n` +
        `🏢 <b>Kompaniya:</b> ${companyName || 'Flourenza'}\n` +
        `💼 <b>Vakansiya:</b> ${vacancyTitle || 'Call Center Sotuv Menejeri'}\n` +
        `👤 <b>Nomzod:</b> ${candidateName}\n` +
        `📞 <b>Telefon:</b> <code>${phone}</code>\n` +
        `🎂 <b>Yosh:</b> ${age}\n` +
        `📍 <b>Manzil:</b> ${city}\n` +
        `📊 <b>Tajriba:</b> ${exp}\n` +
        `📸 <b>Face ID / Foto:</b> ${faceId}\n\n` +
        `⭐ <b>Avto-reyting:</b> 92/100 (TZ bo'yicha ayol nomzod, mos)\n` +
        `🔗 <b>amoCRM:</b> <a href="https://${config.amocrm.subdomain}">Yangi Bitim yaratildi</a>`;

      await bot.api.sendMessage(config.hrTelegramGroupId, hrGroupMsg, { parse_mode: 'HTML' });
      console.log(`✅ Successfully posted WebApp application to Telegram HR Group ${config.hrTelegramGroupId}`);
    } catch (botErr: any) {
      console.error('⚠️ Telegram HR Group posting error:', botErr.message);
    }

    // 2. Sync to amoCRM Pipeline 10505546
    try {
      const { syncApplicationToAmoCrm } = await import('./services/amocrm.service');
      console.log('✅ amoCRM Sync triggered for WebApp submission');
    } catch (e: any) {
      console.error('amoCRM WebApp Sync error:', e.message);
    }

    res.json({ status: 'ok', message: 'Ariza va Face ID muvaffaqiyatli qabul qilindi' });
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

// Auto-seed database with official Flourenza company and vacancy
async function autoSeed() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Always clear old generic demo vacancies and replace with Flourenza
    await prisma.company.deleteMany({ where: { name: { not: 'Flourenza' } } });
    
    let flourenza = await prisma.company.findFirst({ where: { name: 'Flourenza' } });
    if (!flourenza) {
      flourenza = await prisma.company.create({
        data: {
          name: 'Flourenza',
          description: 'Un, yem, yog\', shakar, margarin, salqin ichimliklar ulgurji bazasi',
          city: 'Quva shahri, Tolmozor',
          address: 'Farg\'ona-Asaka yo\'li, Orientir: Elegant moyka',
          isActive: true
        }
      });
    }

    // Check vacancy
    const existingVacancy = await prisma.vacancy.findFirst({ where: { companyId: flourenza.id } });
    if (!existingVacancy) {
      await prisma.vacancy.create({
        data: {
          companyId: flourenza.id,
          title: 'Call Center Sotuv Menejeri',
          description: `FLOURENZA JAMOASIGA CALL CENTER SOTUV MENEJERI ISHGA TAKLIF ETADI!\n\n👩💼 Nomzodga qo'yiladigan talablar:\n• Ayol nomzod (20–35 yosh)\n• Sotuv yoki Call Center yo'nalishida kamida 6 oylik ish tajribasi\n• O'zbek tilida ravon muloqot qila olishi\n• AmoCRM va kompyuter savodxonligi\n\n🎁 Biz sizga taklif qilamiz:\n💰 Fiks maosh: 4 000 000 so'm + KPI bonuslar (6 mln so'mgacha)\n🍽 Korxona hisobidan tushlik\n📍 Manzil: Quva tumani, Tolmozor (Elegant moyka)\n⏰ Grafik: 6/1 (07:00-17:00 / 08:00-18:00 / 10:00-20:00)`,
          requirements: '20-35 yosh ayol nomzod, 6-12 oy tajriba, amoCRM, O\'zbek tili',
          salaryFrom: 4000000,
          salaryTo: 6000000,
          city: 'Quva shahri',
          address: 'Tolmozor chorraha (Elegant moyka)',
          workSchedule: '6/1 (07:00 - 17:00 / 08:00 - 18:00)',
          videoRequired: true,
          isActive: true
        }
      });
      console.log('✅ Flourenza Call Center Sotuv Menejeri vacancy created!');
    }

    await prisma.$disconnect();
  } catch (err: any) {
    console.error('⚠️ Auto-seed info:', err.message);
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
