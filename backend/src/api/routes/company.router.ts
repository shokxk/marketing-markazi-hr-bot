import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { vacancies: true, applications: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(companies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, city, address, mapUrl, telegramGroupId } = req.body;
    const company = await prisma.company.create({
      data: { name, description, city, address, mapUrl, telegramGroupId, isActive: true },
    });
    res.status(201).json(company);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, city, address, mapUrl, isActive, telegramGroupId } = req.body;
    const company = await prisma.company.update({
      where: { id },
      data: { name, description, city, address, mapUrl, isActive, telegramGroupId },
    });
    res.json(company);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.company.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
