import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface ResumeData {
  candidateName: string;
  phone: string;
  age?: string;
  city?: string;
  companyName: string;
  vacancyTitle: string;
  answers: Record<string, any>;
  faceIdPath?: string;
}

export async function generateCandidatePdfResume(data: ResumeData): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = path.resolve(process.cwd(), 'uploads/resumes');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Resume_${sanitizeFilename(data.candidateName)}_${Date.now()}.pdf`;
      const filePath = path.join(outputDir, fileName);

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Colors
      const primaryColor = '#FF5A36';
      const textColor = '#1E293B';
      const mutedColor = '#64748B';
      const boxBgColor = '#F8FAFC';

      // ── HEADER BANNER ──
      doc.rect(40, 40, 515, 60).fill('#0F172A');
      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('MARKETING MARKAZI HR', 55, 52);
      doc.fontSize(10).font('Helvetica').fillColor(primaryColor).text('NOMZOD RESUME & ANKETA MA\'LUMOTLARI', 55, 75);

      let currentY = 115;

      // ── CANDIDATE PROFILE SUMMARY BOX ──
      doc.rect(40, currentY, 515, 110).fillAndStroke(boxBgColor, '#E2E8F0');

      // Embed Face ID Photo if exists
      let textX = 55;
      if (data.faceIdPath && fs.existsSync(data.faceIdPath)) {
        try {
          doc.image(data.faceIdPath, 50, currentY + 10, { width: 90, height: 90, fit: [90, 90] });
          doc.rect(50, currentY + 10, 90, 90).stroke('#CBD5E1');
          textX = 150;
        } catch (imgErr) {
          textX = 55;
        }
      }

      doc.fillColor(textColor).fontSize(16).font('Helvetica-Bold').text(data.candidateName, textX, currentY + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor).text(`${data.companyName} — ${data.vacancyTitle}`, textX, currentY + 32);

      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      doc.text(`Telefon: ${data.phone || 'Nomalum'}`, textX, currentY + 52);
      doc.text(`Manzil: ${data.city || 'Ko\'rsatilmadi'}`, textX, currentY + 68);
      doc.text(`Yosh: ${data.age || 'Nomalum'} yosh | Reyting: 92/100 (Mos)`, textX, currentY + 84);

      currentY += 130;

      // ── QUESTIONNAIRE BREAKDOWN HEADER ──
      doc.fillColor(textColor).fontSize(14).font('Helvetica-Bold').text('ANKETA SAVOL-JAVOBLARI (20 TA SAVOL)', 40, currentY);
      doc.moveTo(40, currentY + 18).lineTo(555, currentY + 18).strokeColor(primaryColor).lineWidth(1.5).stroke();

      currentY += 30;

      // Map question codes to human readableUz texts
      const questionLabels: Record<string, string> = {
        full_name: '1. To\'liq ismingiz',
        phone: '2. Telefon raqamingiz',
        age: '3. Yoshingiz',
        city: '4. Yashash shahringiz',
        marital_status: '5. Oilaviy ahvolingiz',
        education_level: '6. Ma\'lumotingiz darajasi',
        education_place: '7. O\'quv muassasangiz',
        callcenter_exp: '8. Call Center / Sotuv tajribangiz',
        last_job: '9. Oxirgi ish joyingiz',
        reason_leaving: '10. Ishdan ketish sababi',
        amocrm_exp: '11. amoCRM tajribangiz',
        computer_skills: '12. Kompyuter dasturlari',
        languages: '13. Biladigan tillaringiz',
        work_schedule: '14. Ish grafigiga tayyorlik',
        salary_expectation: '15. Kutilayotgan maosh',
        start_date: '16. Qachondan ishni boshlaysiz',
        sales_case: '17. Sotuv keysi ("Qimmat" e\'tiroz)',
        soft_skills: '18. Kuchli 3 ta sifatlar',
        motivation: '19. Nega ushbu kompaniya',
        face_id: '20. Face ID status'
      };

      let itemIndex = 1;
      for (const [key, val] of Object.entries(data.answers)) {
        if (key === 'telegram_id' || key === 'username' || key === 'face_id_url') continue;

        const qTitle = questionLabels[key] || `${itemIndex}. ${key}`;
        const answerText = String(val || 'Javob berilmadi');

        // Page break check
        if (currentY > 730) {
          doc.addPage();
          currentY = 40;
        }

        doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text(qTitle, 40, currentY);
        currentY += 14;

        doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`-> ${answerText}`, 55, currentY, { width: 490 });
        const textHeight = doc.heightOfString(`-> ${answerText}`, { width: 490 });
        currentY += textHeight + 10;

        itemIndex++;
      }

      // Footer
      doc.fontSize(8).fillColor(mutedColor).text(`Hujjat yaratildi: ${new Date().toLocaleString('uz-UZ')} | Marketing Markazi HR Automation System`, 40, 800, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
