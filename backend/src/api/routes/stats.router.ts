import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/overview', async (req, res) => {
  try {
    const totalApplications = await prisma.application.count();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayApplications = await prisma.application.count({
      where: { createdAt: { gte: startOfToday } },
    });

    const submittedCount = await prisma.application.count({
      where: { status: { not: 'DRAFT' } },
    });

    const videoCount = await prisma.application.count({
      where: { videoUrl: { not: null } },
    });

    const highScorersCount = await prisma.application.count({
      where: { score: { gte: 80 } },
    });

    const companyBreakdown = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { applications: true } },
      },
      take: 10,
    });

    res.json({
      totalApplications,
      todayApplications,
      completionRate: totalApplications > 0 ? Math.round((submittedCount / totalApplications) * 100) : 0,
      videoSubmissionRate: submittedCount > 0 ? Math.round((videoCount / submittedCount) * 100) : 0,
      highScorersCount,
      companyBreakdown: companyBreakdown.map((c) => ({
        id: c.id,
        name: c.name,
        count: c._count.applications,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
