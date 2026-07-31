import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Bot } from 'grammy';
import { config } from '../../config';

const prisma = new PrismaClient();
const router = Router();

router.post('/webhook', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads) return res.status(200).send('OK');

    const statusMap: Record<string, string> = {
      '1001': 'UNDER_REVIEW',
      '1002': 'INTERVIEW_SCHEDULED',
      '1003': 'OFFLINE_INTERVIEW',
      '1004': 'HIRED',
      '1005': 'REJECTED',
    };

    if (leads.status) {
      for (const leadObj of leads.status) {
        const leadId = String(leadObj.id);
        const statusId = String(leadObj.status_id);

        const application = await prisma.application.findFirst({
          where: { amocrmLeadId: leadId },
          include: { user: true, company: true, vacancy: true },
        });

        if (application) {
          const targetStatus: string = statusMap[statusId] || 'UNDER_REVIEW';

          await prisma.application.update({
            where: { id: application.id },
            data: { status: targetStatus },
          });

          await prisma.statusHistory.create({
            data: {
              applicationId: application.id,
              oldStatus: application.status,
              newStatus: targetStatus,
              changedBy: 'AMOCRM_WEBHOOK',
            },
          });

          // Send Telegram notification if status updated
          if (config.botToken) {
            try {
              const bot = new Bot(config.botToken);
              const telegramUserId = Number(application.user.telegramUserId);
              await bot.api.sendMessage(
                telegramUserId,
                `🔔 <b>Ariza holati yangilandi!</b>\n\n` +
                  `🏢 Kompaniya: <b>${application.company.name}</b>\n` +
                  `💼 Vakansiya: <b>${application.vacancy.title}</b>\n` +
                  `📊 Yangi holat: <b>${targetStatus}</b>`,
                { parse_mode: 'HTML' }
              );
            } catch (err: any) {
              console.error('Failed to send status update message to candidate:', err.message);
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error handling amoCRM webhook:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
