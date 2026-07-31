import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;
    const where: any = {};
    if (companyId) where.companyId = String(companyId);

    const vacancies = await prisma.vacancy.findMany({
      where,
      include: { company: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(vacancies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { companyId, title, description, requirements, salaryFrom, salaryTo, city, workSchedule, videoRequired } = req.body;
    const vacancy = await prisma.vacancy.create({
      data: {
        companyId,
        title,
        description,
        requirements,
        salaryFrom: salaryFrom ? parseInt(salaryFrom, 10) : null,
        salaryTo: salaryTo ? parseInt(salaryTo, 10) : null,
        city,
        workSchedule,
        videoRequired: videoRequired ?? true,
        isActive: true,
      },
    });
    res.status(201).json(vacancy);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, requirements, salaryFrom, salaryTo, city, workSchedule, videoRequired, isActive } = req.body;
    const vacancy = await prisma.vacancy.update({
      where: { id },
      data: {
        title,
        description,
        requirements,
        salaryFrom: salaryFrom ? parseInt(salaryFrom, 10) : undefined,
        salaryTo: salaryTo ? parseInt(salaryTo, 10) : undefined,
        city,
        workSchedule,
        videoRequired,
        isActive,
      },
    });
    res.json(vacancy);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
