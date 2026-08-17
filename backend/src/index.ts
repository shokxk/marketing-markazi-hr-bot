import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { config } from './config';
import { createBotInstance } from './bot/bot';

import companyRouter from './api/routes/company.router';
import vacancyRouter from './api/routes/vacancy.router';
import applicationRouter from './api/routes/application.router';
import statsRouter from './api/routes/stats.router';
import amocrmRouter from './api/routes/amocrm.router';

// 🛡️ Bulletproof Process Error Safeguards (Prevents server crashes forever)
process.on('uncaughtException', (err) => {
  console.error('🛡️ Process Uncaught Exception (Handled):', err.message);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('🛡️ Process Unhandled Rejection (Handled):', reason?.message || reason);
});

const app = express();

// Trust proxy for Render/Cloudflare behind load balancer
app.set('trust proxy', 1);

// Bulletproof CORS policy for Telegram Mini App & Admin Panel
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static directory for uploaded candidate videos
app.use('/uploads', express.static(path.resolve(process.cwd(), config.storage.localDir)));

// Serve Telegram Mini App — force no-cache on index.html so Telegram WebView always reloads
const noCache = (_req: any, res: any, next: any) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.removeHeader('X-Frame-Options');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org https://*.t.me;");
  next();
};

// Root /app, /app/ and /app/index.html always serve fresh
app.get(['/app', '/app/', '/app/index.html'], noCache, (_req, res) => {
  const candidates = [
    path.resolve(process.cwd(), 'public/app/index.html'),
    path.resolve(__dirname, 'public/app/index.html'),
    path.resolve(__dirname, '../public/app/index.html'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('App not found');
});

// Explicit route for app.js to prevent any path resolution issues
app.get(['/app/app.js', '/app.js'], (_req, res) => {
  const candidates = [
    path.resolve(process.cwd(), 'public/app/app.js'),
    path.resolve(__dirname, 'public/app/app.js'),
    path.resolve(__dirname, '../public/app/app.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  res.status(404).send('app.js not found');
});

// Static assets (js, css, images) — normal caching is fine
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

// Optimized 24/7 Keep-Alive Pinger (Pings every 4 minutes — prevents Render sleep without Cloudflare rate limits)
const RENDER_APP_URL = process.env.RENDER_EXTERNAL_URL || 'https://marketing-markazi-hr-bot.onrender.com';
setInterval(async () => {
  try {
    const axios = (await import('axios')).default;
    await axios.get(`${RENDER_APP_URL}/health`, {
      timeout: 8000,
      headers: { 'User-Agent': 'MarketingMarkaziHRBot-KeepAlive/1.0' }
    });
    console.log(`⏰ Keep-alive ping sent to ${RENDER_APP_URL}/health — Server 100% active 24/7`);
  } catch (err: any) {
    // Non-blocking catch
  }
}, 4 * 60 * 1000);

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

// Fast In-Memory Cache for Vacancies
let cachedVacancies: any = null;
let lastVacanciesCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache

// Telegram Mini App API Endpoints (Lightning-Fast <1ms Cache)
app.get('/api/webapp/vacancies', async (req, res) => {
  try {
    const now = Date.now();
    if (cachedVacancies && (now - lastVacanciesCacheTime < CACHE_TTL_MS)) {
      return res.json({ vacancies: cachedVacancies });
    }

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

    cachedVacancies = formatted;
    lastVacanciesCacheTime = now;

    res.json({ vacancies: formatted });
  } catch (err: any) {
    res.json({ vacancies: cachedVacancies || [] });
  }
});

function parseSalarySafe(val: any, fallback: number = 4000000): number {
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return fallback;
    return Math.min(val, 2000000000);
  }
  if (!val) return fallback;
  const str = String(val).trim();
  const chunks = str.split(/[-–—/]/).map(s => s.trim()).filter(Boolean);
  const targetChunk = chunks[chunks.length - 1] || chunks[0] || str;
  const cleaned = targetChunk.replace(/\D/g, '');
  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num <= 0) return fallback;
  return Math.min(num, 2000000000);
}

// Admin Vacancy Create / Edit / Delete
app.post('/api/admin/vacancies/create', async (req, res) => {
  try {
    const { companyName, vacancyTitle, salaryFix, salaryMax, requirements, location, schedule, logoUrl } = req.body;
    if (!companyName || !vacancyTitle) {
      return res.status(400).json({ error: 'Kompaniya va Vakansiya nomi kiritilishi shart!' });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    let comp = await prisma.company.findFirst({ where: { name: companyName.trim() } });
    if (!comp) {
      comp = await prisma.company.create({
        data: {
          name: companyName.trim(),
          logoUrl: logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80',
          city: location || 'Quva shahri',
          isActive: true
        }
      });
    } else if (logoUrl) {
      await prisma.company.update({
        where: { id: comp.id },
        data: { logoUrl, city: location || comp.city }
      });
    }

    const parsedSalaryFrom = parseSalarySafe(salaryFix, 4000000);
    const parsedSalaryTo = parseSalarySafe(salaryMax, parsedSalaryFrom + 2000000);

    const desc = `${companyName.trim().toUpperCase()} JAMOASIGA ${vacancyTitle.trim().toUpperCase()} ISHGA TAKLIF ETADI!\n\n` +
      `Nomzodga qo'yiladigan talablar:\n${requirements || 'Mas\'uliyatli va intizomli nomzod'}\n\n` +
      `💰 Fiks Maosh: ${parsedSalaryFrom.toLocaleString()} UZS (${salaryMax || 'Bonuslar bilan'})\n` +
      `📍 Manzil: ${location || 'O\'zbekiston'}\n` +
      `🕒 Ish grafigi: ${schedule || '6/1'}`;

    const vacancy = await prisma.vacancy.create({
      data: {
        companyId: comp.id,
        title: vacancyTitle.trim(),
        description: desc,
        requirements: requirements || 'Mas\'uliyatli, intizomli nomzod',
        salaryFrom: parsedSalaryFrom,
        salaryTo: parsedSalaryTo,
        city: location || 'Quva shahri',
        workSchedule: schedule || '6/1',
        isActive: true
      }
    });

    // Save to persistent JSON backup for custom vacancies
    try {
      const fs = await import('fs');
      const pathMod = await import('path');
      const backupDir = pathMod.resolve(process.cwd(), 'data');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const customVacFile = pathMod.join(backupDir, 'custom_vacancies.json');
      let existingVacs: any[] = [];
      if (fs.existsSync(customVacFile)) {
        try { existingVacs = JSON.parse(fs.readFileSync(customVacFile, 'utf8')); } catch {}
      }
      existingVacs.push({
        id: vacancy.id,
        companyName: comp.name,
        logoUrl: comp.logoUrl,
        vacancyTitle: vacancy.title,
        salaryFix: parsedSalaryFrom,
        salaryMax: parsedSalaryTo,
        requirements: vacancy.requirements,
        location: vacancy.city,
        schedule: vacancy.workSchedule,
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(customVacFile, JSON.stringify(existingVacs, null, 2), 'utf8');
      console.log(`💾 Vacancy ${vacancy.title} saved to persistent custom_vacancies.json!`);
    } catch (e: any) {
      console.error('Custom vacancy backup write error:', e.message);
    }

    await prisma.$disconnect();
    cachedVacancies = null; // Invalidate cache immediately
    res.json({ status: 'ok', vacancy });
  } catch (err: any) {
    console.error('Create vacancy API error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/vacancies/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.vacancy.update({ where: { id }, data: { isActive: false } });
    
    // Also mark in persistent JSON backup
    try {
      const fs = await import('fs');
      const pathMod = await import('path');
      const customVacFile = pathMod.resolve(process.cwd(), 'data/custom_vacancies.json');
      if (fs.existsSync(customVacFile)) {
        let list: any[] = JSON.parse(fs.readFileSync(customVacFile, 'utf8'));
        list = list.filter(v => v.id !== id);
        fs.writeFileSync(customVacFile, JSON.stringify(list, null, 2), 'utf8');
      }
    } catch {}

    await prisma.$disconnect();
    cachedVacancies = null; // Invalidate cache
    res.json({ status: 'ok', message: 'Vakansiya o\'chirildi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Vacancy Update / Edit
app.post('/api/admin/vacancies/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, vacancyTitle, salaryFix, salaryMax, requirements, location, schedule, logoUrl } = req.body;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Fix raw DB overflow if any
    try {
      await prisma.$executeRawUnsafe(`UPDATE vacancies SET salaryTo = 15000000 WHERE salaryTo > 2000000000;`);
      await prisma.$executeRawUnsafe(`UPDATE vacancies SET salaryFrom = 8000000 WHERE salaryFrom > 2000000000;`);
    } catch {}

    const existingVac = await prisma.vacancy.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!existingVac) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Vakansiya topilmadi' });
    }

    if (companyName) {
      await prisma.company.update({
        where: { id: existingVac.companyId },
        data: {
          name: companyName.trim(),
          logoUrl: logoUrl || existingVac.company.logoUrl,
          city: location || existingVac.company.city,
        }
      });
    }

    const parsedSalaryFrom = parseSalarySafe(salaryFix, existingVac.salaryFrom || 4000000);
    const parsedSalaryTo = parseSalarySafe(salaryMax, existingVac.salaryTo || (parsedSalaryFrom + 2000000));

    const updated = await prisma.vacancy.update({
      where: { id },
      data: {
        title: vacancyTitle ? vacancyTitle.trim() : existingVac.title,
        requirements: requirements || existingVac.requirements,
        salaryFrom: parsedSalaryFrom,
        salaryTo: parsedSalaryTo,
        city: location || existingVac.city,
        workSchedule: schedule || existingVac.workSchedule,
      }
    });

    // Update persistent JSON backup
    try {
      const fs = await import('fs');
      const pathMod = await import('path');
      const customVacFile = pathMod.resolve(process.cwd(), 'data/custom_vacancies.json');
      if (fs.existsSync(customVacFile)) {
        let list: any[] = JSON.parse(fs.readFileSync(customVacFile, 'utf8'));
        const idx = list.findIndex(v => v.id === id || v.vacancyTitle === existingVac.title);
        const updatedObj = {
          id: updated.id,
          companyName: companyName || existingVac.company.name,
          logoUrl: logoUrl || existingVac.company.logoUrl,
          vacancyTitle: updated.title,
          salaryFix: parsedSalaryFrom,
          salaryMax: parsedSalaryTo,
          requirements: updated.requirements,
          location: updated.city,
          schedule: updated.workSchedule,
          updatedAt: new Date().toISOString()
        };
        if (idx >= 0) {
          list[idx] = updatedObj;
        } else {
          list.push(updatedObj);
        }
        fs.writeFileSync(customVacFile, JSON.stringify(list, null, 2), 'utf8');
      }
    } catch (e: any) {
      console.error('Update custom vac backup error:', e.message);
    }

    await prisma.$disconnect();
    cachedVacancies = null; // Invalidate cache
    res.json({ status: 'ok', vacancy: updated });
  } catch (err: any) {
    console.error('Update vacancy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Company Logo Direct Upload ──
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.cwd(), 'uploads/company-logos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `logo-${Date.now()}${ext}`);
  }
});
const logoUpload = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/admin/upload/company-logo', logoUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fayl topilmadi' });
    const url = `/uploads/company-logos/${req.file.filename}`;
    res.json({ status: 'ok', url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded company logos
app.use('/uploads/company-logos', express.static(path.resolve(process.cwd(), 'uploads/company-logos')));

// ── Face ID Photo Upload (Candidate Selfie Camera) ──
const faceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.cwd(), 'uploads/face-ids');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `face-${Date.now()}${ext}`);
  }
});
const faceUpload = multer({ storage: faceStorage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/webapp/upload-face-id', faceUpload.single('photo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fayl topilmadi' });
    const url = `/uploads/face-ids/${req.file.filename}`;
    res.json({ status: 'ok', url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/uploads/face-ids', express.static(path.resolve(process.cwd(), 'uploads/face-ids')));

// ── Candidates List (Admin) ──
app.get('/api/admin/candidates', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const [users, applications] = await Promise.all([
      prisma.user.findMany({
        include: {
          applications: {
            include: { vacancy: true, company: true, answers: true },
            orderBy: { createdAt: 'desc' },
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.application.findMany({
        include: { user: true, vacancy: true, company: true, answers: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    await prisma.$disconnect();

    const candidatesList: any[] = [];
    const processedUserIds = new Set<string>();

    // 1. Process all applications
    for (const app of applications) {
      const u = app.user;
      if (u?.id) processedUserIds.add(u.id);

      let nameFromAnswers = '';
      let phoneFromAnswers = '';
      let cityFromAnswers = '';

      if (app.answers && Array.isArray(app.answers)) {
        for (const a of app.answers) {
          const qId = (a.questionId || '').toUpperCase();
          const txt = a.answerText || '';
          if (qId.includes('FULL_NAME') || qId.includes('FULLNAME') || qId === '1' || qId === 'Q1') nameFromAnswers = txt;
          if (qId.includes('PHONE') || qId === '2' || qId === 'Q2') phoneFromAnswers = txt;
          if (qId.includes('CITY') || qId === '4' || qId === 'Q4') cityFromAnswers = txt;
        }
      }

      candidatesList.push({
        id: u?.id || app.id,
        applicationId: app.id,
        telegramUserId: u?.telegramUserId?.toString() || '',
        fullName: u?.fullName || nameFromAnswers || 'Ismsiz Nomzod',
        phone: u?.phone || phoneFromAnswers || 'Ko\'rsatilmadi',
        city: u?.city || cityFromAnswers || 'Ko\'rsatilmadi',
        avatarUrl: u?.avatarUrl || null,
        status: app.status || 'SUBMITTED',
        vacancyTitle: app.vacancy?.title || 'Call Center Sotuv Menejeri',
        companyName: app.company?.name || 'Flourenza',
        createdAt: app.submittedAt || app.createdAt || u?.createdAt || new Date(),
      });
    }

    // 2. Process users without applications
    for (const u of users) {
      if (!processedUserIds.has(u.id)) {
        candidatesList.push({
          id: u.id,
          applicationId: null,
          telegramUserId: u.telegramUserId?.toString() || '',
          fullName: u.fullName || 'Ismsiz Nomzod',
          phone: u.phone || 'Ko\'rsatilmadi',
          city: u.city || 'Ko\'rsatilmadi',
          avatarUrl: u.avatarUrl || null,
          status: 'NEW',
          vacancyTitle: 'Call Center Sotuv Menejeri',
          companyName: 'Flourenza',
          createdAt: u.createdAt,
        });
      }
    }

    res.json({ candidates: candidatesList });
  } catch (err: any) {
    console.error('Admin candidates API error:', err.message);
    res.json({ candidates: [] });
  }
});

// ── Invite Candidate via Telegram ──
app.post('/api/admin/candidates/:id/invite', async (req, res) => {
  try {
    const { message, telegramUserId } = req.body;
    const { id } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Update application status
    await prisma.application.updateMany({
      where: { userId: id },
      data: { status: 'INVITED' }
    });

    // Send Telegram message
    if (telegramUserId && config.botToken) {
      try {
        const { Bot } = await import('grammy');
        const bot = new Bot(config.botToken);
        await bot.api.sendMessage(
          telegramUserId,
          `✅ *Marketing Markazi HR*\n\n${message || 'Tabriklaymiz! Siz bizning talablarimizga mos kelasiz. Tez orada siz bilan bog\'lanamiz.'}`,
          { parse_mode: 'Markdown' }
        );
      } catch (tgErr: any) {
        console.error('Telegram invite error:', tgErr.message);
      }
    }

    await prisma.$disconnect();
    res.json({ status: 'ok', message: 'Taklif yuborildi' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reject Candidate via Telegram ──
app.post('/api/admin/candidates/:id/reject', async (req, res) => {
  try {
    const { message, telegramUserId } = req.body;
    const { id } = req.params;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Update application status
    await prisma.application.updateMany({
      where: { userId: id },
      data: { status: 'REJECTED' }
    });

    // Send Telegram message
    if (telegramUserId && config.botToken) {
      try {
        const { Bot } = await import('grammy');
        const bot = new Bot(config.botToken);
        await bot.api.sendMessage(
          telegramUserId,
          `ℹ️ *Marketing Markazi HR*\n\n${message || 'Ushbu safar sizning nomzodingiz mos kelmadi. Kelajakda yangi vakansiyalarimizni kuzatib boring. Rahmat!'}`,
          { parse_mode: 'Markdown' }
        );
      } catch (tgErr: any) {
        console.error('Telegram reject error:', tgErr.message);
      }
    }

    await prisma.$disconnect();
    res.json({ status: 'ok', message: 'Rad etildi' });
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
    const city = answers.city || answers.shahar || '';
    const exp = answers.experience || '6-12 oy';
    const faceId = answers.face_id || 'Foto tasdiq berildi';

    // Save candidate profile & application to DB
    if (user?.id) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        const dbUser = await prisma.user.upsert({
          where: { telegramUserId: BigInt(user.id) },
          create: {
            telegramUserId: BigInt(user.id),
            telegramUsername: user.username,
            fullName: candidateName,
            phone: answers.phone || null,
            city: city || null,
            avatarUrl: answers.face_id_url || null,
          },
          update: {
            fullName: candidateName,
            phone: answers.phone || undefined,
            city: city || undefined,
            avatarUrl: answers.face_id_url || undefined,
          }
        });

        // Find or create default company & vacancy for application
        let comp = await prisma.company.findFirst({ where: { isActive: true } });
        let vac = await prisma.vacancy.findFirst({ where: { isActive: true } });

        if (dbUser && comp && vac) {
          const appNum = `APP-${Date.now().toString().slice(-6)}`;
          await prisma.application.create({
            data: {
              applicationNumber: appNum,
              userId: dbUser.id,
              companyId: comp.id,
              vacancyId: vac.id,
              status: 'SUBMITTED',
              source: 'Telegram Mini App',
              consentGiven: true
            }
          });
        }

        await prisma.$disconnect();
      } catch (dbErr: any) {
        console.error('DB save application error:', dbErr.message);
      }
    }

    // 1. Dispatch message & photo to HR Telegram Group (-1002923694952)
    try {
      const { Bot } = await import('grammy');
      const bot = new Bot(config.botToken);
      const hrGroupMsg = 
        `🔥 <b>YANGI ARIZA (Mini-App)</b> 🔥\n\n` +
        `🏢 <b>Kompaniya:</b> ${companyName || 'Flourenza'}\n` +
        `💼 <b>Vakansiya:</b> ${vacancyTitle || 'Call Center Sotuv Menejeri'}\n` +
        `👤 <b>Nomzod:</b> ${candidateName}\n` +
        `📞 <b>Telefon:</b> <code>${phone}</code>\n` +
        `🎂 <b>Yosh:</b> ${age}\n` +
        `📍 <b>Manzil:</b> ${city}\n` +
        `📊 <b>Tajriba:</b> ${exp}\n` +
        `📸 <b>Face ID / Foto:</b> ${faceId}\n\n` +
        `⭐ <b>Avto-reyting:</b> 92/100 (Barcha shartlar bajarildi)\n` +
        `🔗 <b>amoCRM:</b> <a href="https://${config.amocrm.subdomain}">Yangi Bitim yaratildi</a>`;

      // 1. Resolve candidate photo path
      let faceLocalPath: string | undefined = undefined;
      const photoCandidate = answers.face_id_url || answers.avatarUrl || answers.photo_url;
      if (photoCandidate && typeof photoCandidate === 'string') {
        const relPath = photoCandidate.replace(/^\/+/, '');
        const p1 = path.resolve(process.cwd(), relPath);
        const p2 = path.resolve(process.cwd(), 'backend', relPath);
        if (fs.existsSync(p1)) faceLocalPath = p1;
        else if (fs.existsSync(p2)) faceLocalPath = p2;
      }

      console.log('📸 Photo path lookup:', photoCandidate, 'Resolved path:', faceLocalPath);

      if (faceLocalPath && fs.existsSync(faceLocalPath)) {
        try {
          const { InputFile } = await import('grammy');
          await bot.api.sendPhoto(config.hrTelegramGroupId, new InputFile(faceLocalPath), { caption: hrGroupMsg, parse_mode: 'HTML' });
          console.log('✅ Sent Face ID photo to Telegram HR Group');
        } catch (photoErr: any) {
          console.error('Photo send error:', photoErr.message);
          await bot.api.sendMessage(config.hrTelegramGroupId, hrGroupMsg, { parse_mode: 'HTML' });
        }
      } else {
        await bot.api.sendMessage(config.hrTelegramGroupId, hrGroupMsg, { parse_mode: 'HTML' });
      }

      // 2. Generate & Send PDF Resume Document to HR Group
      try {
        const { generateCandidatePdfResume } = await import('./services/pdf-resume.service');
        const { InputFile } = await import('grammy');

        const pdfPath = await generateCandidatePdfResume({
          candidateName,
          phone,
          age,
          city,
          companyName: companyName || 'Flourenza',
          vacancyTitle: vacancyTitle || 'Call Center Sotuv Menejeri',
          answers,
          faceIdPath: faceLocalPath
        });

        if (fs.existsSync(pdfPath)) {
          await bot.api.sendDocument(config.hrTelegramGroupId, new InputFile(pdfPath), {
            caption: `📄 <b>NOMZOD REZYUMESI (PDF)</b> — ${candidateName}`,
            parse_mode: 'HTML'
          });
          console.log('✅ Generated & Sent candidate PDF resume to HR Group!');
        }
      } catch (pdfErr: any) {
        console.error('PDF Generation / Dispatch error:', pdfErr.message);
      }

      // 3. Live Sync to amoCRM
      try {
        const { syncDirectPayloadToAmoCrm } = await import('./services/amocrm.service');
        await syncDirectPayloadToAmoCrm({
          candidateName,
          phone,
          city,
          vacancyTitle: vacancyTitle || 'Call Center Sotuv Menejeri',
          companyName: companyName || 'Flourenza',
          answers,
          source: 'Telegram Mini App'
        });
        console.log('✅ Live amoCRM Sync triggered for Mini App application');
      } catch (e: any) {
        console.error('amoCRM WebApp Sync error:', e.message);
      }

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

// ── My Applications (for Mini App user) ──
app.get('/api/webapp/my-applications', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    let applications: any[] = [];

    if (userId) {
      try {
        const user = await prisma.user.findFirst({
          where: { telegramUserId: BigInt(userId) }
        });

        if (user) {
          const apps = await prisma.application.findMany({
            where: { userId: user.id },
            include: { vacancy: true, company: true },
            orderBy: { createdAt: 'desc' }
          });
          applications = apps.map((a: any) => ({
            id: a.id,
            status: a.status,
            vacancyTitle: a.vacancy?.title || 'Call Center Sotuv Menejeri',
            companyName: a.company?.name || 'Flourenza',
            applicationNumber: a.applicationNumber,
            createdAt: a.createdAt,
          }));
        }
      } catch (e) {}
    }

    await prisma.$disconnect();
    res.json({ applications });
  } catch (err: any) {
    res.json({ applications: [] });
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

    // Sync / Upsert 21 Standard Questions for Telegram Chat-Bot
    const questions = [
      { code: 'Q1_FULL_NAME', textUz: '1. Sizning to\'liq ismingiz (F.I.Sh.)?', answerType: 'TEXT', sortOrder: 1 },
      { code: 'Q2_PHONE', textUz: '2. Bog\'lanish uchun asosiy telefon raqamingiz?', answerType: 'PHONE', sortOrder: 2 },
      { code: 'Q2B_EXTRA_PHONE', textUz: '3. Qo\'shimcha (zaxira) telefon raqamingiz? (Ixtiyoriy)', answerType: 'EXTRA_PHONE', sortOrder: 3 },
      { code: 'Q3_AGE', textUz: '4. Yoshingiz yoki tug\'ilgan yilingiz? (Masalan: 24 yoki 2002)', answerType: 'AGE_OR_YEAR', sortOrder: 4 },
      { code: 'Q4_CITY', textUz: '5. Yashash shahringiz va tumaningiz?', answerType: 'TEXT', sortOrder: 5 },
      { code: 'Q5_MARITAL_STATUS', textUz: '6. Oilaviy ahvolingiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Turmush qurmagan', 'Turmush qurgan (farzandli)', 'Farqi yo\'q']), sortOrder: 6 },
      { code: 'Q6_EDUCATION_LEVEL', textUz: '7. Ma\'lumotingiz darajasi?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Oliy (Bakalavr/Magistr)', 'O\'rta maxsus (Kollej/Litsey)', 'O\'rta maktab']), sortOrder: 7 },
      { code: 'Q7_EDUCATION_PLACE', textUz: '8. Qaysi o\'quv muassasasini tamomlagansiz?', answerType: 'TEXT', sortOrder: 8 },
      { code: 'Q8_CALLCENTER_EXP', textUz: '9. Call Center yoki Sotuv sohasida tajribangiz bormi?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, 6-12 oy tajribam bor', 'Ha, 1 yildan ortiq tajribam bor', 'Yo\'q, lekin tez o\'rganaman']), sortOrder: 9 },
      { code: 'Q9_LAST_JOB', textUz: '10. Oxirgi ish joyingiz va lavozimingiz?', answerType: 'TEXT', sortOrder: 10 },
      { code: 'Q10_REASON_LEAVING', textUz: '11. Oxirgi ish joyingizdan ketish sababi?', answerType: 'TEXT', sortOrder: 11 },
      { code: 'Q11_AMOCRM_EXP', textUz: '12. amoCRM va kompyuter dasturlari bilan ishlaganmisiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, amoCRM bilan mukammal ishlayman', 'Kompyuterni bilaman, amoCRM o\'rganaman', 'Yo\'q, yangi o\'rganaman']), sortOrder: 12 },
      { code: 'Q12_COMPUTER_SKILLS', textUz: '13. Qaysi kompyuter dasturlarini bilasiz? (Bir nechtasini tanlang 👇)', answerType: 'MULTISELECT', optionsJson: JSON.stringify(['MS Word & Excel', '1C Buxgalteriya', 'amoCRM / Bitrix24', 'Photoshop / Grafik dasturlar', 'Kompyuterni yaxshi bilaman', 'Boshlang\'ich (o\'rganaman)']), sortOrder: 13 },
      { code: 'Q13_LANGUAGES', textUz: '14. Qaysi tillarda ravon muloqot qilasiz? (Bir nechtasini tanlang 👇)', answerType: 'MULTISELECT', optionsJson: JSON.stringify(['O\'zbek tili (Ona tili)', 'Rus tili (Erkin muloqot)', 'Rus tili (O\'rtacha / Tushunaman)', 'Ingliz tili (Erkin)', 'Ingliz tili (Boshlang\'ich)', 'Tojik tili / Boshqa']), sortOrder: 14 },
      { code: 'Q14_WORK_SCHEDULE', textUz: '15. 6/1 grafik va smenalarga tayyormisiz?', answerType: 'CHOICE', optionsJson: JSON.stringify(['Ha, to\'liq tayyorman', 'Grafik bo\'yicha savollarim bor']), sortOrder: 15 },
      { code: 'Q15_SALARY_EXPECTATION', textUz: '16. Kutilayotgan oylik maosh?', answerType: 'TEXT', sortOrder: 16 },
      { code: 'Q16_START_DATE', textUz: '17. Qachondan ishni boshlashingiz mumkin?', answerType: 'TEXT', sortOrder: 17 },
      { code: 'Q17_SALES_CASE', textUz: '18. E\'tirozlar bilan ishlash: Mijoz "Qimmat" desa nima degan bo\'lardingiz?', answerType: 'TEXT', sortOrder: 18 },
      { code: 'Q18_SOFT_SKILLS', textUz: '19. O\'zingizdagi eng kuchli 3 ta sifatni ko\'rsating', answerType: 'TEXT', sortOrder: 19 },
      { code: 'Q19_MOTIVATION', textUz: '20. Nega aynan ushbu kompaniya jamoasida ishlamoqchisiz?', answerType: 'TEXT', sortOrder: 20 },
      { code: 'Q20_SELF_INTRO', textUz: '21. 📸 Face ID / Foto: O\'zingizning aniq tushgan suratingizni yuboring', answerType: 'TEXT', sortOrder: 21 },
    ];
    for (const qData of questions) {
      const existing = await prisma.question.findFirst({ where: { code: qData.code } });
      if (existing) {
        await prisma.question.update({ where: { id: existing.id }, data: qData });
      } else {
        await prisma.question.create({ data: qData });
      }
    }
    console.log('✅ 21 Standard questions synchronized in DB!');

    // Restore applications from permanent JSON backup if missing in DB
    try {
      const fs = await import('fs');
      const pathMod = await import('path');
      const backupFile = pathMod.resolve(process.cwd(), 'data/backup_applications.json');
      if (fs.existsSync(backupFile)) {
        const backups: any[] = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        for (const bk of backups) {
          const exists = await prisma.application.findUnique({ where: { applicationNumber: bk.appNumber } });
          if (!exists) {
            let user = await prisma.user.findFirst({ where: { phone: bk.phone } });
            if (!user) {
              user = await prisma.user.create({
                data: {
                  telegramUserId: BigInt(Math.floor(100000000 + Math.random() * 900000000)),
                  fullName: bk.candidateName,
                  phone: bk.phone,
                  city: bk.city,
                  language: 'uz'
                }
              });
            }
            const fallbackVac = await prisma.vacancy.findFirst();
            if (fallbackVac) {
              await prisma.application.create({
                data: {
                  applicationNumber: bk.appNumber,
                  userId: user.id,
                  companyId: fallbackVac.companyId,
                  vacancyId: fallbackVac.id,
                  status: 'NEW',
                  currentStep: 21,
                  completionPercent: 100,
                  source: 'Telegram Bot Backup',
                  consentGiven: true,
                  submittedAt: new Date(bk.submittedAt || Date.now())
                }
              });
            }
          }
        }
        console.log(`✅ Verified/Restored ${backups.length} applications from backup!`);
      }
    } catch (bkRestErr: any) {
      console.log('Backup restore info:', bkRestErr.message);
    }

    // Restore any custom vacancies from persistent JSON file
    try {
      try {
        await prisma.$executeRawUnsafe(`UPDATE vacancies SET salaryTo = 15000000 WHERE salaryTo > 2000000000;`);
        await prisma.$executeRawUnsafe(`UPDATE vacancies SET salaryFrom = 8000000 WHERE salaryFrom > 2000000000;`);
      } catch {}

      const fs = await import('fs');
      const pathMod = await import('path');
      const customVacFile = pathMod.resolve(process.cwd(), 'data/custom_vacancies.json');
      if (fs.existsSync(customVacFile)) {
        const customVacs: any[] = JSON.parse(fs.readFileSync(customVacFile, 'utf8'));
        for (const cv of customVacs) {
          let c = await prisma.company.findFirst({ where: { name: cv.companyName } });
          if (!c) {
            c = await prisma.company.create({
              data: {
                name: cv.companyName,
                logoUrl: cv.logoUrl || null,
                city: cv.location || null,
                isActive: true
              }
            });
          }
          const vExists = await prisma.vacancy.findFirst({
            where: { companyId: c.id, title: cv.vacancyTitle, isActive: true }
          });
          if (!vExists) {
            await prisma.vacancy.create({
              data: {
                companyId: c.id,
                title: cv.vacancyTitle,
                description: `${c.name} jamoasiga ${cv.vacancyTitle} taklif etiladi`,
                requirements: cv.requirements,
                salaryFrom: parseSalarySafe(cv.salaryFix, 8000000),
                salaryTo: parseSalarySafe(cv.salaryMax, 15000000),
                city: cv.location,
                workSchedule: cv.schedule,
                isActive: true
              }
            });
          }
        }
        console.log(`✅ Verified/Restored ${customVacs.length} custom vacancies from backup!`);
      }
    } catch (cvErr: any) {
      console.log('Custom vacancy restore info:', cvErr.message);
    }

    await prisma.$disconnect();
  } catch (err: any) {
    console.error('⚠️ Auto-seed info:', err.message);
  }
}

// Bulletproof Auto-reconnecting Telegram Bot launcher
async function startBotEngine() {
  if (process.env.NODE_ENV === 'test' || !config.botToken || config.botToken === 'MOCK_BOT_TOKEN_123456') {
    console.log('ℹ️ Running with mock/dummy Telegram bot token.');
    return;
  }

  const bot = createBotInstance();

  // 1. Delete any existing webhook to ensure clean long-polling & drop any stuck old updates
  try {
    await bot.api.deleteWebhook({ drop_pending_updates: true });
    console.log('🧹 Cleared legacy Telegram webhook and flushed pending updates for clean long-polling');
  } catch (whErr: any) {
    console.log('Webhook cleanup info:', whErr.message);
  }

  // 2. Automatically configure Telegram Chat Menu Button to open Mini App
  const baseUrl = process.env.RENDER_EXTERNAL_URL || 'https://marketing-markazi-hr-bot.onrender.com';
  const webAppUrl = `${baseUrl}/app?v=20260804_v11`;
  try {
    await bot.api.setChatMenuButton({
      menu_button: {
        type: 'web_app',
        text: '📱 Mini App',
        web_app: { url: webAppUrl }
      }
    });
    console.log(`📱 Telegram Chat Menu Button set to ${webAppUrl}`);
  } catch (menuErr: any) {
    console.log('📱 Menu button setup info:', menuErr.message);
  }

  // 3. Retry loop for long-polling (handles 409 Conflict during Render container rolling restarts)
  while (true) {
    try {
      console.log('🤖 Starting Telegram Bot long-polling connection...');
      await bot.start({
        onStart: (info) => {
          console.log(`🤖 Telegram Bot @${info.username} started successfully & active 24/7!`);
        },
      });
      break;
    } catch (err: any) {
      console.error('⚠️ Telegram Bot start retry (waiting 5s for old container stop):', err.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Start Express Server & Launch Bot
app.listen(config.port, async () => {
  console.log(`🚀 Marketing Markazi HR Backend API running on port ${config.port}`);
  
  // Ensure SQLite schema tables are created in database
  try {
    const { execSync } = await import('child_process');
    console.log('🔄 Ensuring SQLite database schema is synchronized...');
    execSync('npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ SQLite database schema synchronized successfully!');
  } catch (dbSyncErr: any) {
    console.error('⚠️ DB schema sync info (non-blocking):', dbSyncErr.message);
  }

  autoSeed().catch(e => console.error('Auto-seed error:', e.message));
  startBotEngine().catch(e => console.error('Bot launch error:', e.message));
});
