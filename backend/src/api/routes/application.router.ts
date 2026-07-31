import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();
const router = Router();

router.get('/', async (req, res) => {
  try {
    const { companyId, vacancyId, status, search, limit = '20', page = '1' } = req.query;
    const take = parseInt(limit as string, 10);
    const skip = (parseInt(page as string, 10) - 1) * take;

    const where: any = {};
    if (companyId) where.companyId = companyId as string;
    if (vacancyId) where.vacancyId = vacancyId as string;
    if (status) where.status = status as string;

    if (search) {
      where.OR = [
        { applicationNumber: { contains: search as string } },
        { user: { fullName: { contains: search as string } } },
        { user: { phone: { contains: search as string } } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          company: true,
          vacancy: true,
          answers: { include: { question: true } },
        },
      }),
      prisma.application.count({ where }),
    ]);

    const formatted = applications.map((app) => ({
      ...app,
      user: {
        ...app.user,
        telegramUserId: app.user.telegramUserId.toString(),
      },
    }));

    return res.json({
      data: formatted,
      pagination: {
        total,
        page: parseInt(page as string, 10),
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/export/excel', async (req, res) => {
  try {
    const applications = await prisma.application.findMany({
      include: {
        user: true,
        company: true,
        vacancy: true,
        answers: { include: { question: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = applications.map((app) => {
      const answerMap: Record<string, string> = {};
      app.answers.forEach((ans) => {
        answerMap[ans.question.code] = ans.answerText || '';
      });

      return {
        'Ariza №': app.applicationNumber,
        Kompaniya: app.company.name,
        Vakansiya: app.vacancy.title,
        Nomzod: answerMap['Q1_FULL_NAME'] || app.user.fullName || '',
        Telefon: answerMap['Q4_PHONE'] || app.user.phone || '',
        'Tug\'ilgan yil': answerMap['Q2_BIRTH_YEAR'] || '',
        Hudud: answerMap['Q6_REGION'] || '',
        'Ta\'lim': answerMap['Q8_EDUCATION_LEVEL'] || '',
        'Umumiy tajriba': answerMap['Q10_TOTAL_EXPERIENCE'] || '',
        'Sotuv tajribasi': answerMap['Q13_SALES_EXPERIENCE'] || '',
        'CRM tajribasi': answerMap['Q14_CRM_EXPERIENCE'] || '',
        'Oylik umidi': answerMap['Q18_EXPECTED_SALARY'] || '',
        Reyting: app.score,
        Holat: app.status,
        'amoCRM Lead ID': app.amocrmLeadId || '',
        Sana: app.createdAt.toISOString().split('T')[0],
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Candidates');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="candidates_export.xlsx"');
    return res.send(buffer);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
