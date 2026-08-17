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

function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return '';
  let str = String(text);

  // 1. Map Uzbek Cyrillic & Russian characters to clean Latin equivalents
  const cyrillicToLatinMap: Record<string, string> = {
    'Ў': "O'", 'ў': "o'",
    'Ғ': "G'", 'ғ': "g'",
    'Қ': 'Q',   'қ': 'q',
    'Ҳ': 'H',   'ҳ': 'h',
    'А': 'A',   'а': 'a',
    'Б': 'B',   'б': 'b',
    'В': 'V',   'в': 'v',
    'Г': 'G',   'г': 'g',
    'Д': 'D',   'д': 'd',
    'Е': 'E',   'е': 'e',
    'Ё': 'Yo',  'ё': 'yo',
    'Ж': 'J',   'ж': 'j',
    'З': 'Z',   'з': 'z',
    'И': 'I',   'и': 'i',
    'Й': 'Y',   'й': 'y',
    'К': 'K',   'к': 'k',
    'Л': 'L',   'л': 'l',
    'М': 'M',   'м': 'm',
    'Н': 'N',   'н': 'n',
    'О': 'O',   'о': 'o',
    'П': 'P',   'п': 'p',
    'Р': 'R',   'р': 'r',
    'С': 'S',   'с': 's',
    'Т': 'T',   'т': 't',
    'У': 'U',   'у': 'u',
    'Ф': 'F',   'ф': 'f',
    'Х': 'X',   'х': 'x',
    'Ц': 'Ts',  'ц': 'ts',
    'Ч': 'Ch',  'ч': 'ch',
    'Ш': 'Sh',  'ш': 'sh',
    'Щ': 'Shch','щ': 'shch',
    'Ъ': "'",   'ъ': "'",
    'Ы': 'I',   'ы': 'i',
    'Ь': '',    'ь': '',
    'Э': 'E',   'э': 'e',
    'Ю': 'Yu',  'ю': 'yu',
    'Я': 'Ya',  'я': 'ya'
  };

  str = str.replace(/[А-Яа-яЁёЎўҒғҚқҲҳ]/g, (char) => cyrillicToLatinMap[char] || char);

  // 2. Replace all Uzbek modifier letters, smart quotes & apostrophes with standard single quote `'`
  str = str.replace(/[\u2018\u2019\u02BB\u02BC\u0060\u00B4\u201B\u02B9`']/g, "'");

  // 3. Replace smart double quotes with standard double quote `"`
  str = str.replace(/[\u201C\u201D\u00AB\u00BB]/g, '"');

  // 4. Replace special dashes, hyphens and bullets with ASCII standard equivalents
  str = str.replace(/[\u2013\u2014\u2212]/g, '-');
  str = str.replace(/\u2026/g, '...');
  str = str.replace(/[\u2022\u00B7]/g, '-');
  str = str.replace(/\u2192/g, '->');

  // 5. Remove any remaining unsupported characters outside ASCII printable range
  str = str.replace(/[^\x20-\x7E\r\n\t]/g, '');

  return str;
}

export async function generateCandidatePdfResume(data: ResumeData): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = path.resolve(process.cwd(), 'uploads/resumes');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const candidateNameClean = sanitizePdfText(data.candidateName);
      const companyNameClean = sanitizePdfText(data.companyName);
      const vacancyTitleClean = sanitizePdfText(data.vacancyTitle);
      const phoneClean = sanitizePdfText(data.phone);
      const cityClean = sanitizePdfText(data.city);
      const ageClean = sanitizePdfText(data.age);

      const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Resume_${sanitizeFilename(candidateNameClean)}_${Date.now()}.pdf`;
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

      doc.fillColor(textColor).fontSize(16).font('Helvetica-Bold').text(candidateNameClean, textX, currentY + 12);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(primaryColor).text(`${companyNameClean} — ${vacancyTitleClean}`, textX, currentY + 32);

      doc.fontSize(10).font('Helvetica').fillColor(textColor);
      doc.text(`Telefon: ${phoneClean || 'Nomalum'}`, textX, currentY + 52);
      doc.text(`Manzil: ${cityClean || 'Ko\'rsatilmadi'}`, textX, currentY + 68);
      doc.text(`Yosh: ${ageClean || 'Nomalum'} yosh | Reyting: 92/100 (Mos)`, textX, currentY + 84);

      currentY += 130;

      // ── QUESTIONNAIRE BREAKDOWN HEADER ──
      doc.fillColor(textColor).fontSize(14).font('Helvetica-Bold').text('ANKETA SAVOL-JAVOBLARI (20 TA SAVOL)', 40, currentY);
      doc.moveTo(40, currentY + 18).lineTo(555, currentY + 18).strokeColor(primaryColor).lineWidth(1.5).stroke();

      currentY += 30;

      // Map question codes to human readable Uz texts
      const questionLabels: Record<string, string> = {
        full_name: '1. To\'liq ismingiz',
        phone: '2. Asosiy telefon raqamingiz',
        extra_phone: '3. Qo\'shimcha telefon raqamingiz',
        age: '4. Yoshingiz / Tug\'ilgan yilingiz',
        city: '5. Yashash shahringiz',
        marital_status: '6. Oilaviy ahvolingiz',
        education_level: '7. Ma\'lumotingiz darajasi',
        education_place: '8. O\'quv muassasangiz',
        callcenter_exp: '9. Call Center / Sotuv tajribangiz',
        last_job: '10. Oxirgi ish joyingiz',
        reason_leaving: '11. Ishdan ketish sababi',
        amocrm_exp: '12. amoCRM tajribangiz',
        computer_skills: '13. Kompyuter dasturlari',
        languages: '14. Biladigan tillaringiz',
        work_schedule: '15. Ish grafigiga tayyorlik',
        salary_expectation: '16. Kutilayotgan maosh',
        start_date: '17. Qachondan ishni boshlaysiz',
        sales_case: '18. Sotuv keysi ("Qimmat" e\'tiroz)',
        soft_skills: '19. Kuchli 3 ta sifatlar',
        motivation: '20. Nega ushbu kompaniya',
        face_id: '21. Face ID status',
        // Telegram Bot Question Codes:
        Q1_FULL_NAME: '1. To\'liq ismingiz',
        Q2_PHONE: '2. Asosiy telefon raqamingiz',
        Q2B_EXTRA_PHONE: '3. Qo\'shimcha telefon raqamingiz',
        Q3_AGE: '4. Yoshingiz / Tug\'ilgan yilingiz',
        Q4_CITY: '5. Yashash shahringiz',
        Q5_MARITAL_STATUS: '6. Oilaviy ahvolingiz',
        Q6_EDUCATION_LEVEL: '7. Ma\'lumotingiz darajasi',
        Q7_EDUCATION_PLACE: '8. O\'quv muassasangiz',
        Q8_CALLCENTER_EXP: '9. Call Center / Sotuv tajribangiz',
        Q9_LAST_JOB: '10. Oxirgi ish joyingiz',
        Q10_REASON_LEAVING: '11. Ishdan ketish sababi',
        Q11_AMOCRM_EXP: '12. amoCRM tajribangiz',
        Q12_COMPUTER_SKILLS: '13. Kompyuter dasturlari',
        Q13_LANGUAGES: '14. Biladigan tillaringiz',
        Q14_WORK_SCHEDULE: '15. Ish grafigiga tayyorlik',
        Q15_SALARY_EXPECTATION: '16. Kutilayotgan maosh',
        Q16_START_DATE: '17. Qachondan ishni boshlaysiz',
        Q17_SALES_CASE: '18. Sotuv keysi ("Qimmat" e\'tiroz)',
        Q18_SOFT_SKILLS: '19. Kuchli 3 ta sifatlar',
        Q19_MOTIVATION: '20. Nega ushbu kompaniya',
        Q20_SELF_INTRO: '21. Face ID / Rasm'
      };

      let itemIndex = 1;
      for (const [key, val] of Object.entries(data.answers)) {
        if (key === 'telegram_id' || key === 'username' || key === 'face_id_url') continue;

        const rawTitle = questionLabels[key] || `${itemIndex}. ${key}`;
        const qTitleClean = sanitizePdfText(rawTitle);
        const rawAnswer = String(val || 'Javob berilmadi');
        const answerTextClean = sanitizePdfText(rawAnswer);

        // Page break check
        if (currentY > 730) {
          doc.addPage();
          currentY = 40;
        }

        doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold').text(qTitleClean, 40, currentY);
        currentY += 14;

        doc.fillColor('#334155').fontSize(10).font('Helvetica').text(`-> ${answerTextClean}`, 55, currentY, { width: 490 });
        const textHeight = doc.heightOfString(`-> ${answerTextClean}`, { width: 490 });
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
