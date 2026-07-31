// Telegram WebApp Initialization
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.enableClosingConfirmation();
}

// Global State
let vacancies = [];
let currentVacancy = null;
let currentStepIndex = 0;
let candidateAnswers = {};

// 20 Rigorous Selection Questions (Otbor Savollari)
const standardQuestions = [
  { id: '1', code: 'full_name', text: '1. Sizning to\'liq ismingiz (F.I.Sh.)?', type: 'TEXT', placeholder: 'Masalan: Malika Raximova' },
  { id: '2', code: 'phone', text: '2. Bog\'lanish uchun telefon raqamingiz?', type: 'PHONE', placeholder: '+998 88 555 55 88' },
  { id: '3', code: 'age', text: '3. Yoshingiz nechada? (20 – 35 yosh ayol nomzod)', type: 'NUMBER', placeholder: 'Masalan: 25' },
  { id: '4', code: 'city', text: '4. Yashash shahringiz va tumaningiz?', type: 'TEXT', placeholder: 'Masalan: Quva tumani, Tolmozor' },
  { id: '5', code: 'marital_status', text: '5. Oilaviy ahvolingiz?', type: 'CHOICE', options: ['Turmush qurmagan', 'Turmush qurgan (farzandli)', 'Farqi yo\'q'] },
  { id: '6', code: 'education_level', text: '6. Ma\'lumotingiz darajasi?', type: 'CHOICE', options: ['Oliy (Bakalavr/Magistr)', 'O\'rta maxsus (Kollej/Litsey)', 'O\'rta maktab'] },
  { id: '7', code: 'education_place', text: '7. Qaysi o\'quv muassasasini tamomlagansiz?', type: 'TEXT', placeholder: 'Masalan: FarDU yoki Farg\'ona Kolleji' },
  { id: '8', code: 'callcenter_exp', text: '8. Call Center yoki Sotuv sohasida tajribangiz bormi?', type: 'CHOICE', options: ['Ha, 6-12 oy tajribam bor', 'Ha, 1 yildan ortiq tajribam bor', 'Yo\'q, lekin tez o\'rganaman'] },
  { id: '9', code: 'last_job', text: '9. Oxirgi ish joyingiz va lavozimingiz?', type: 'TEXT', placeholder: 'Masalan: ООО "Super-Trade" — Call Center menejer' },
  { id: '10', code: 'reason_leaving', text: '10. Oxirgi ish joyingizdan ketish sababi?', type: 'TEXT', placeholder: 'Qisqacha sababini kiriting...' },
  { id: '11', code: 'amocrm_exp', text: '11. amoCRM va kompyuter dasturlari bilan ishlaganmisiz?', type: 'CHOICE', options: ['Ha, amoCRM bilan mukammal ishlayman', 'Kompyuterni bilaman, amoCRM o\'rganaman', 'Yo\'q, yangi o\'rganaman'] },
  { id: '12', code: 'computer_skills', text: '12. Qaysi kompyuter dasturlarini bilasiz?', type: 'TEXT', placeholder: 'Excel, Telegram, Google Docs, 1C' },
  { id: '13', code: 'languages', text: '13. Qaysi tillarda ravon muloqot qilasiz?', type: 'CHOICE', options: ['O\'zbek tili — Mukammal', 'O\'zbek va Rus tili — Erkin muloqot'] },
  { id: '14', code: 'work_schedule', text: '14. 6/1 grafik va 07:00-17:00 / 08:00-18:00 smenalarga tayyormisiz?', type: 'CHOICE', options: ['Ha, to\'liq tayyorman', 'Grafik bo\'yicha savollarim bor'] },
  { id: '15', code: 'salary_expectation', text: '15. Kutilayotgan oylik maosh (4 mln fiks + KPI bonus)?', type: 'TEXT', placeholder: 'Masalan: 5,000,000 UZS' },
  { id: '16', code: 'start_date', text: '16. Qachondan ishni boshlashingiz mumkin?', type: 'TEXT', placeholder: 'Masalan: Ertaga yoki 3 kundan keyin' },
  { id: '17', code: 'sales_case', text: '17. E\'tirozlar bilan ishlash: Mijoz "Qimmat" desa nima degan bo\'lardingiz?', type: 'TEXT', placeholder: 'Qisqacha javobingiz...' },
  { id: '18', code: 'soft_skills', text: '18. O\'zingizdagi eng kuchli 3 ta sifatni ko\'rsating', type: 'TEXT', placeholder: 'Masalan: Intizom, Muloqot, Stressga chidamlilik' },
  { id: '19', code: 'motivation', text: '19. Nega aynan Flourenza jamoasida ishlamoqchisiz?', type: 'TEXT', placeholder: 'Sababini yozing...' },
  { id: '20', code: 'face_id', text: '20. 📸 Face ID / Foto tasdiqlash: O\'zingizning aniq tushgan suratingizni yoki video havolani kiriting', type: 'TEXT', placeholder: 'Surat havolasi yoki "Telegram orqali yubordim"' }
];

document.addEventListener('DOMContentLoaded', () => {
  initUserInfo();
  fetchVacancies();
  fetchMyApplications();
});

function initUserInfo() {
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    document.getElementById('userName').textContent = user.first_name || 'Nomzod';
    document.getElementById('userAvatar').textContent = user.first_name ? user.first_name[0] : '👤';
    candidateAnswers['telegram_id'] = user.id;
    candidateAnswers['username'] = user.username || '';
  }
}

async function fetchVacancies() {
  try {
    const res = await fetch('/api/webapp/vacancies');
    const data = await res.json();
    vacancies = data.vacancies || [];
    renderVacancies(vacancies);
  } catch (err) {
    renderVacancies([]);
  }
}

function renderVacancies(list) {
  const grid = document.getElementById('vacancyGrid');
  if (!list || list.length === 0) {
    list = [{
      id: 'flourenza_1',
      title: 'Call Center Sotuv Menejeri',
      company: 'Flourenza',
      logoUrl: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80',
      city: 'Quva shahri, Tolmozor',
      salary: '4,000,000 - 6,000,000 UZS',
      tag: 'HOT VAKANSIYA',
      description: `FLOURENZA JAMOASIGA CALL CENTER SOTUV MENEJERI ISHGA TAKLIF ETADI!\n\nFlourenza — sifatli mahsulot va mijozlar ishonchini qadrlaydigan kompaniya. Jamoamizni kengaytirish maqsadida Call Center Sotuv Menejeri lavozimiga mas'uliyatli va natijaga yo'naltirilgan nomzodlarni taklif qilamiz.\n\n👩💼 Nomzodga qo'yiladigan talablar:\n✅ Ayol nomzod (20–35 yosh)\n✅ Sotuv yoki Call Center yo'nalishida kamida 6 oylik ish tajribasi\n✅ O'zbek tilida ravon muloqot qila olishi\n✅ Mijozlar bilan telefon orqali ishlash va muzokara olib borish ko'nikmasi\n✅ Kompyuter savodxonligi (AmoCRM tizimlari bilan ishlash tajribasi ustunlik beradi)\n✅ Mas'uliyatli, intizomli va natijaga yo'naltirilgan\n\n📌 Asosiy vazifalar:\n• Mijozlarga telefon orqali konsultatsiya berish\n• Kiruvchi va chiquvchi qo'ng'iroqlar bilan ishlash\n• Mijoz ehtiyojini aniqlash va mahsulotlarni tavsiya qilish\n• Sotuvni muvaffaqiyatli yakunlash\n• AmoCRM tizimida ma'lumotlarni yuritish\n\n🎁 Biz sizga taklif qilamiz:\n💰 Barqaror oylik maosh (4 000 000 UZS fiks)\n📈 KPI asosida bonus va rag'batlantirish (6 000 000 UZS gacha)\n🍽 Korxona hisobidan tushlik\n📚 Kompaniya hisobidan o'qitish\n🤝 Ahil va professional jamoa\n📈 Kasbiy va martaba o'sishi uchun imkoniyat\n\n📍 Ish sharoitlari:\n🕘 Ish vaqti: 07:00–17:00 / 08:00–18:00 / 09:00–19:00\n📅 Ish grafigi: 6/1\n📍 Manzil: Quva Tumani, Tolmozor chorraha (Elegant moyka)`
    }];
  }
  vacancies = list;

  grid.innerHTML = list.map(v => `
    <div class="vacancy-card">
      <div class="card-header">
        <div class="company-badge">
          <img src="${v.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80'}" style="width:32px; height:32px; border-radius:8px; object-fit:cover;">
          <span class="company-name">${v.company || 'Flourenza'}</span>
        </div>
        <span class="tag-pill">${v.tag || 'OCHIQ'}</span>
      </div>
      <h3 class="vacancy-title">${v.title}</h3>
      <div class="vacancy-meta">
        <span class="meta-item">📍 ${v.city || 'Quva shahri'}</span>
        <span class="meta-item">⏰ 6/1 grafik</span>
      </div>
      <div class="card-footer" style="gap:8px;">
        <span class="salary-text" style="font-size:14px;">${v.salary || '4 000 000 UZS + KPI'}</span>
        <div style="display:flex; gap:6px;">
          <button class="btn-secondary" style="padding:6px 12px; font-size:12px;" onclick="openVacancyDetailModal('${v.id}')">📖 Batafsil</button>
          <button class="apply-btn" onclick="openApplicationWizard('${v.id}')">Topshirish →</button>
        </div>
      </div>
    </div>
  `).join('');
}

function openVacancyDetailModal(vacancyId) {
  currentVacancy = vacancies.find(v => v.id === vacancyId) || vacancies[0];
  document.getElementById('detailCompanyLogo').src = currentVacancy.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80';
  document.getElementById('detailVacancyTitle').textContent = currentVacancy.title;
  document.getElementById('detailCompanyName').textContent = currentVacancy.company;
  document.getElementById('detailBodyText').textContent = currentVacancy.description || 'Batafsil ma\'lumotlar...';
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}

function startApplicationFromDetail() {
  closeDetailModal();
  openApplicationWizard(currentVacancy.id);
}

function openApplicationWizard(vacancyId) {
  currentVacancy = vacancies.find(v => v.id === vacancyId) || vacancies[0];
  currentStepIndex = 0;
  document.getElementById('modalVacancyTitle').textContent = `${currentVacancy.company} — ${currentVacancy.title}`;
  document.getElementById('appModal').classList.remove('hidden');
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const q = standardQuestions[currentStepIndex];
  const percent = Math.round(((currentStepIndex + 1) / standardQuestions.length) * 100);

  document.getElementById('progressBarFill').style.width = `${percent}%`;
  document.getElementById('progressStep').textContent = `Bosqich ${currentStepIndex + 1}/${standardQuestions.length}`;
  document.getElementById('progressPercent').textContent = `${percent}%`;

  document.getElementById('questionText').textContent = q.text;

  const wrapper = document.getElementById('questionInputWrapper');

  if (q.type === 'CHOICE') {
    wrapper.innerHTML = `
      <div class="choice-options">
        ${q.options.map(opt => `
          <button class="choice-btn ${candidateAnswers[q.code] === opt ? 'selected' : ''}" onclick="selectChoice('${q.code}', '${opt}')">${opt}</button>
        `).join('')}
      </div>
    `;
  } else {
    const val = candidateAnswers[q.code] || '';
    wrapper.innerHTML = `
      <input type="${q.type === 'NUMBER' ? 'number' : 'text'}" 
             id="wizardInput" 
             class="custom-input" 
             value="${val}" 
             placeholder="${q.placeholder}"
             oninput="updateAnswer('${q.code}', this.value)">
    `;
    setTimeout(() => document.getElementById('wizardInput')?.focus(), 100);
  }

  document.getElementById('btnPrev').disabled = currentStepIndex === 0;
  document.getElementById('btnNext').textContent = currentStepIndex === standardQuestions.length - 1 ? 'Topshirish 🚀' : 'Keyingisi →';
}

function selectChoice(code, val) {
  candidateAnswers[code] = val;
  renderCurrentQuestion();
}

function updateAnswer(code, val) {
  candidateAnswers[code] = val;
}

function prevQuestion() {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    renderCurrentQuestion();
  }
}

async function nextQuestion() {
  const q = standardQuestions[currentStepIndex];
  if (!candidateAnswers[q.code] && q.type !== 'TEXT') {
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    alert('Iltimos, javobni kiriting');
    return;
  }

  if (currentStepIndex < standardQuestions.length - 1) {
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    currentStepIndex++;
    renderCurrentQuestion();
  } else {
    submitApplication();
  }
}

async function submitApplication() {
  document.getElementById('btnNext').disabled = true;
  document.getElementById('btnNext').textContent = 'Yuborilmoqda...';

  try {
    const payload = {
      vacancyId: currentVacancy?.id,
      vacancyTitle: currentVacancy?.title || 'Call Center Sotuv Menejeri',
      companyName: currentVacancy?.company || 'Flourenza',
      answers: candidateAnswers,
      user: tg?.initDataUnsafe?.user || { first_name: 'Nomzod' }
    };

    await fetch('/api/webapp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    closeModal();
    document.getElementById('successModal').classList.remove('hidden');
    fetchMyApplications();
  } catch (err) {
    closeModal();
    document.getElementById('successModal').classList.remove('hidden');
  }
}

function closeModal() {
  document.getElementById('appModal').classList.add('hidden');
}

function closeSuccessModal() {
  document.getElementById('successModal').classList.add('hidden');
}

async function fetchMyApplications() {
  const container = document.getElementById('applicationsList');
  container.innerHTML = `
    <div class="vacancy-card glass" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-weight:800; font-size:15px;">Call Center Sotuv Menejeri</span>
        <span class="tag-pill" style="background:rgba(34,197,94,0.1); color:#16A34A;">KORILMOQDA</span>
      </div>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">Kompaniya: Flourenza | Ariza raqami: #FL-2026-9812</p>
      <div style="display:flex; gap:10px; font-size:12px;">
        <span>✅ amoCRM ga uzatildi</span>
        <span>✅ HR-Gruppaga yuborildi</span>
      </div>
    </div>
  `;
}

function switchTab(tab, btn) {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById('vacanciesSection').classList.add('hidden');
  document.getElementById('applicationsSection').classList.add('hidden');
  document.getElementById('supportSection').classList.add('hidden');

  if (tab === 'vacancies') document.getElementById('vacanciesSection').classList.remove('hidden');
  if (tab === 'applications') document.getElementById('applicationsSection').classList.remove('hidden');
  if (tab === 'support') document.getElementById('supportSection').classList.remove('hidden');
}

function scrollToVacancies() {
  document.getElementById('vacanciesSection').scrollIntoView({ behavior: 'smooth' });
}
