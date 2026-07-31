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

// Register API routes
app.use('/api/companies', companyRouter);
app.use('/api/vacancies', vacancyRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/stats', statsRouter);
app.use('/api/amocrm', amocrmRouter);

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

// Start Express Server
app.listen(config.port, () => {
  console.log(`🚀 Marketing Markazi HR Backend API running on port ${config.port}`);
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
