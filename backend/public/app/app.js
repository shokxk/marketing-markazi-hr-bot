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
  { id: '4', code: 'city', text: '4. Yashash shahringizni tanlang?', type: 'CHOICE', options: ['Quva', 'Farg\'ona', 'Toshkent', 'Andijon', 'Namangan', 'Samarqand', 'Buxoro', 'Boshqa shahar'] },
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
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    if (userNameEl) userNameEl.textContent = user.first_name || 'Nomzod';
    if (userAvatarEl) userAvatarEl.textContent = user.first_name ? user.first_name[0] : '👤';
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
  if (!grid) return;

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

  grid.innerHTML = list.map((v, i) => `
    <div class="vacancy-card" style="animation: slideUp 0.35s ease ${i * 0.07}s both;">
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
  const logoEl = document.getElementById('detailCompanyLogo');
  const titleEl = document.getElementById('detailVacancyTitle');
  const compEl = document.getElementById('detailCompanyName');
  const bodyEl = document.getElementById('detailBodyText');

  if (logoEl) logoEl.src = currentVacancy.logoUrl || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=300&q=80';
  if (titleEl) titleEl.textContent = currentVacancy.title;
  if (compEl) compEl.textContent = currentVacancy.company;
  if (bodyEl) bodyEl.textContent = currentVacancy.description || 'Batafsil ma\'lumotlar...';
  
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.remove('hidden');
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('hidden');
}

function startApplicationFromDetail() {
  closeDetailModal();
  if (currentVacancy) openApplicationWizard(currentVacancy.id);
}

function openApplicationWizard(vacancyId) {
  currentVacancy = vacancies.find(v => v.id === vacancyId) || vacancies[0];
  currentStepIndex = 0;
  const titleEl = document.getElementById('modalVacancyTitle');
  if (titleEl) titleEl.textContent = `${currentVacancy.company} — ${currentVacancy.title}`;
  const modal = document.getElementById('appModal');
  if (modal) modal.classList.remove('hidden');
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const q = standardQuestions[currentStepIndex];
  const percent = Math.round(((currentStepIndex + 1) / standardQuestions.length) * 100);

  const fill = document.getElementById('progressBarFill');
  const step = document.getElementById('progressStep');
  const perc = document.getElementById('progressPercent');
  const qText = document.getElementById('questionText');

  if (fill) fill.style.width = `${percent}%`;
  if (step) step.textContent = `Bosqich ${currentStepIndex + 1}/${standardQuestions.length}`;
  if (perc) perc.textContent = `${percent}%`;
  if (qText) qText.textContent = q.text;

  const wrapper = document.getElementById('questionInputWrapper');
  if (!wrapper) return;

  if (q.type === 'CHOICE') {
    wrapper.innerHTML = `
      <div class="choice-options">
        ${q.options.map((opt, idx) => `
          <button type="button" class="choice-btn ${candidateAnswers[q.code] === opt ? 'selected' : ''}" data-code="${q.code}" data-idx="${idx}">${opt}</button>
        `).join('')}
      </div>
    `;
    wrapper.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const code = btn.getAttribute('data-code');
        const idx = parseInt(btn.getAttribute('data-idx'));
        candidateAnswers[code] = q.options[idx];
        wrapper.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        setTimeout(() => {
          if (currentStepIndex < standardQuestions.length - 1) {
            currentStepIndex++;
            renderCurrentQuestion();
          } else {
            submitApplication();
          }
        }, 180);
      });
    });
  } else {
    const val = candidateAnswers[q.code] || '';
    wrapper.innerHTML = `
      <input type="${q.type === 'NUMBER' ? 'number' : 'text'}" 
             id="wizardInput" 
             class="custom-input" 
             value="${val}" 
             placeholder="${q.placeholder}">
    `;
    const input = document.getElementById('wizardInput');
    if (input) {
      input.addEventListener('input', (e) => {
        candidateAnswers[q.code] = e.target.value;
      });
      setTimeout(() => input.focus(), 100);
    }
  }

  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  if (btnPrev) btnPrev.disabled = currentStepIndex === 0;
  if (btnNext) btnNext.textContent = currentStepIndex === standardQuestions.length - 1 ? 'Topshirish 🚀' : 'Keyingisi →';
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
  if (q.type !== 'CHOICE') {
    const input = document.getElementById('wizardInput');
    if (input) candidateAnswers[q.code] = input.value;
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
  const btnNext = document.getElementById('btnNext');
  if (btnNext) {
    btnNext.disabled = true;
    btnNext.textContent = 'Yuborilmoqda...';
  }

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
    const successModal = document.getElementById('successModal');
    if (successModal) successModal.classList.remove('hidden');
    fetchMyApplications();
  } catch (err) {
    closeModal();
    const successModal = document.getElementById('successModal');
    if (successModal) successModal.classList.remove('hidden');
  }
}

function closeModal() {
  const modal = document.getElementById('appModal');
  if (modal) modal.classList.add('hidden');
}

function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) modal.classList.add('hidden');
}

async function fetchMyApplications() {
  const container = document.getElementById('applicationsList');
  if (!container) return;
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

// ── Animated Tab Switching ──
function switchTab(tab, btn) {
  const sections = ['vacanciesSection', 'applicationsSection', 'supportSection'];
  const current = sections.find(s => {
    const el = document.getElementById(s);
    return el && !el.classList.contains('hidden');
  });

  // Update nav
  document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (current) {
    const currentEl = document.getElementById(current);
    currentEl.style.animation = 'slideOut 0.2s ease forwards';
    setTimeout(() => {
      currentEl.classList.add('hidden');
      currentEl.style.animation = '';
      showSection(tab);
    }, 180);
  } else {
    showSection(tab);
  }
}

function showSection(tab) {
  const map = { vacancies: 'vacanciesSection', applications: 'applicationsSection', support: 'supportSection' };
  const el = document.getElementById(map[tab]);
  if (!el) return;
  el.classList.remove('hidden');
  el.style.animation = 'slideIn 0.25s ease forwards';
  if (tab === 'applications') fetchMyApplications();
}

function scrollToVacancies() {
  const sec = document.getElementById('vacanciesSection');
  if (sec) sec.scrollIntoView({ behavior: 'smooth' });
}
