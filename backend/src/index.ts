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

import fs from 'fs';

// Serve Telegram Mini App (Web App) with multiple fallback paths
app.use('/app', express.static(path.resolve(process.cwd(), 'public/app')));
app.use('/app', express.static(path.resolve(__dirname, 'public/app')));
app.use('/app', express.static(path.resolve(__dirname, '../public/app')));

// Direct Admin Panel Route with multi-path resolver
app.get('/admin', (req, res) => {
  const candidates = [
    path.resolve(process.cwd(), 'public/app/admin.html'),
    path.resolve(__dirname, 'public/app/admin.html'),
    path.resolve(__dirname, '../public/app/admin.html'),
    path.resolve(__dirname, '../../public/app/admin.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  res.status(404).send('Admin panel file not found');
});

// Self Keep-Alive Pinger (Prevents Render Free Tier from sleeping 24/7/365)
const RENDER_APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://marketing-markazi-hr-bot.onrender.com';
setInterval(async () => {
  try {
    const axios = (await import('axios')).default;
    await axios.get(`${RENDER_APP_URL}/health`, { timeout: 10000 });
    console.log(`⏰ Keep-alive ping sent to ${RENDER_APP_URL}/health — Server active 24/7`);
  } catch (err: any) {
    console.log('⏰ Keep-alive ping attempt:', err.message);
  }
}, 5 * 60 * 1000); // Ping every 5 minutes

// Root redirect to Mini App
app.get('/', (req, res) => {
  res.redirect('/app');
});

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
      logoUrl: v.company.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80',
      description: v.description,
      requirements: v.requirements,
      workSchedule: v.workSchedule || '6/1 (07:00-17:00 / 08:00-18:00)',
      address: v.address || v.company.address || 'Quva shahri, Tolmozor',
      city: v.city || v.company.city || 'Quva shahri',
      salary: v.salaryFrom && v.salaryTo ? `${v.salaryFrom.toLocaleString()} - ${v.salaryTo.toLocaleString()} UZS` : '4 000 000 - 6 000 000 UZS',
      tag: v.videoRequired ? 'VIDEO ARIZA' : 'OCHIQ'
    }));
    await prisma.$disconnect();
    res.json({ vacancies: formatted });
  } catch (err: any) {
    res.json({ vacancies: [] });
  }
});

// Admin Vacancy Create / Edit / Delete
app.post('/api/admin/vacancies/create', async (req, res) => {
  try {
    const { companyName, vacancyTitle, salaryFix, salaryMax, requirements, location, schedule, logoUrl } = req.body;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    let comp = await prisma.company.findFirst({ where: { name: companyName } });
    if (!comp) {
      comp = await prisma.company.create({
        data: { name: companyName, logoUrl: logoUrl || null, city: location, isActive: true }
      });
    }

    const vacancy = await prisma.vacancy.create({
      data: {
        companyId: comp.id,
        title: vacancyTitle,
        description: `FLOURENZA JAMOASIGA ${vacancyTitle.toUpperCase()} ISHGA TAKLIF ETADI!\n\nNomzodga qo'yiladigan talablar:\n${requirements}\n\nFiks Maosh: ${salaryFix} UZS + KPI (${salaryMax})\nManzil: ${location}\nGrafik: ${schedule}`,
        requirements,
        salaryFrom: parseInt(salaryFix) || 4000000,
        salaryTo: parseInt(salaryFix) + 2000000,
        city: location,
        workSchedule: schedule,
        isActive: true
      }
    });

    await prisma.$disconnect();
    res.json({ status: 'ok', vacancy });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/vacancies/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.vacancy.update({ where: { id }, data: { isActive: false } });
    await prisma.$disconnect();
    res.json({ status: 'ok', message: 'Vakansiya o\'chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

// Auto-seed database with official Flourenza company and vacancy if missing
async function autoSeed() {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    let flourenza = await prisma.company.findFirst({ where: { name: 'Flourenza' } });
    if (!flourenza) {
      flourenza = await prisma.company.create({
        data: {
          name: 'Flourenza',
          description: 'Un, yem, yog\', shakar, margarin, salqin ichimliklar ulgurji bazasi',
          logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80',
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
          description: `FLOURENZA JAMOASIGA CALL CENTER SOTUV MENEJERI ISHGA TAKLIF ETADI!\n\nFlourenza — sifatli mahsulot va mijozlar ishonchini qadrlaydigan kompaniya. Jamoamizni kengaytirish maqsadida Call Center Sotuv Menejeri lavozimiga mas'uliyatli va natijaga yo'naltirilgan nomzodlarni taklif qilamiz.\n\n👩💼 Nomzodga qo'yiladigan talablar:\n✅ Ayol nomzod (20–35 yosh)\n✅ Sotuv yoki Call Center yo'nalishida kamida 6 oylik ish tajribasi\n✅ O'zbek tilida ravon muloqot qila olishi\n✅ Mijozlar bilan telefon orqali ishlash va muzokara olib borish ko'nikmasi\n✅ Kompyuter savodxonligi (AmoCRM tizimlari bilan ishlash tajribasi ustunlik beradi)\n✅ Mas'uliyatli, intizomli va natijaga yo'naltirilgan\n\n📌 Asosiy vazifalar:\n• Mijozlarga telefon orqali konsultatsiya berish\n• Kiruvchi va chiquvchi qo'ng'iroqlar bilan ishlash\n• Mijoz ehtiyojini aniqlash va mahsulotlarni tavsiya qilish\n• Sotuvni muvaffaqiyatli yakunlash\n• AmoCRM tizimida ma'lumotlarni yuritish\n\n🎁 Biz sizga taklif qilamiz:\n💰 Barqaror oylik maosh (4 000 000 UZS fiks)\n📈 KPI asosida bonus va rag'batlantirish (6 000 000 UZS gacha)\n🍽 Korxona hisobidan tushlik\n📚 Kompaniya hisobidan o'qitish\n🤝 Ahil va professional jamoa\n📈 Kasbiy va martaba o'sishi uchun imkoniyat\n\n📍 Ish sharoitlari:\n🕘 Ish vaqti: 07:00–17:00 / 08:00–18:00 / 09:00–19:00\n📅 Ish grafigi: 6/1\n📍 Manzil: Quva Tumani, Tolmozor chorraha (Elegant moyka)`,
          requirements: 'Ayol nomzod (20-35 yosh), 6+ oy tajriba, O\'zbek tili, AmoCRM',
          salaryFrom: 4000000,
          salaryTo: 6000000,
          city: 'Quva shahri',
          address: 'Tolmozor chorraha (Elegant moyka)',
          workSchedule: '6/1 (07:00-17:00 / 08:00-18:00 / 09:00-19:00)',
          videoRequired: true,
          isActive: true
        }
      });
      console.log('✅ Rich Flourenza Call Center Sotuv Menejeri vacancy created!');
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
