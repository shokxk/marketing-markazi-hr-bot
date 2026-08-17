// Telegram WebApp Initialization
const tg = window.Telegram?.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
  } catch (e) {
    console.warn('Telegram WebApp init warning:', e);
  }
}

// Global JS error safeguard to prevent WebView crash
window.onerror = function(msg, url, line) {
  console.error('WebApp runtime error:', msg, 'at line', line);
  if (tg?.ready) tg.ready();
  return true;
};

// Global State
let vacancies = [];
let currentVacancy = null;
let currentStepIndex = 0;
let candidateAnswers = {};

// 21 Rigorous Selection Questions (Otbor Savollari)
const standardQuestions = [
  { id: '1', code: 'full_name', text: '1. Sizning to\'liq ismingiz (F.I.Sh.)?', type: 'TEXT', placeholder: 'Masalan: Malika Raximova' },
  { id: '2', code: 'phone', text: '2. Bog\'lanish uchun asosiy telefon raqamingiz?', type: 'PHONE', placeholder: '+998 88 555 55 88' },
  { id: '3', code: 'extra_phone', text: '3. Qo\'shimcha (zaxira) telefon raqamingiz? (Ixtiyoriy)', type: 'TEXT', placeholder: '+998 90 123 45 67 (yoki bo\'sh qoldiring)' },
  { id: '4', code: 'age', text: '4. Yoshingiz yoki tug\'ilgan yilingiz? (Masalan: 24 yoki 2002)', type: 'TEXT', placeholder: 'Masalan: 24 yoki 2002' },
  { id: '5', code: 'city', text: '5. Yashash shahringizni tanlang?', type: 'CHOICE', options: ['Quva', 'Farg\'ona', 'Toshkent', 'Andijon', 'Namangan', 'Samarqand', 'Buxoro', 'Boshqa shahar'] },
  { id: '6', code: 'marital_status', text: '6. Oilaviy ahvolingiz?', type: 'CHOICE', options: ['Turmush qurmagan', 'Turmush qurgan (farzandli)', 'Farqi yo\'q'] },
  { id: '7', code: 'education_level', text: '7. Ma\'lumotingiz darajasi?', type: 'CHOICE', options: ['Oliy (Bakalavr/Magistr)', 'O\'rta maxsus (Kollej/Litsey)', 'O\'rta maktab'] },
  { id: '8', code: 'education_place', text: '8. Qaysi o\'quv muassasasini tamomlagansiz?', type: 'TEXT', placeholder: 'Masalan: FarDU yoki Farg\'ona Kolleji' },
  { id: '9', code: 'callcenter_exp', text: '9. Call Center yoki Sotuv sohasida tajribangiz bormi?', type: 'CHOICE', options: ['Ha, 6-12 oy tajribam bor', 'Ha, 1 yildan ortiq tajribam bor', 'Yo\'q, lekin tez o\'rganaman'] },
  { id: '10', code: 'last_job', text: '10. Oxirgi ish joyingiz va lavozimingiz?', type: 'TEXT', placeholder: 'Masalan: ООО "Super-Trade" — Call Center menejer' },
  { id: '11', code: 'reason_leaving', text: '11. Oxirgi ish joyingizdan ketish sababi?', type: 'TEXT', placeholder: 'Qisqacha sababini kiriting...' },
  { id: '12', code: 'amocrm_exp', text: '12. amoCRM va kompyuter dasturlari bilan ishlaganmisiz?', type: 'CHOICE', options: ['Ha, amoCRM bilan mukammal ishlayman', 'Kompyuterni bilaman, amoCRM o\'rganaman', 'Yo\'q, yangi o\'rganaman'] },
  { id: '13', code: 'computer_skills', text: '13. Qaysi kompyuter dasturlarini bilasiz? (Bir nechtasini tanlang 👇)', type: 'MULTI_SELECT', options: ['MS Word & Excel', '1C Buxgalteriya', 'amoCRM / Bitrix24', 'Photoshop / Grafik dasturlar', 'Kompyuterni yaxshi bilaman', 'Boshlang\'ich (o\'rganaman)'] },
  { id: '14', code: 'languages', text: '14. Qaysi tillarda ravon muloqot qilasiz? (Bir nechtasini tanlang 👇)', type: 'MULTI_SELECT', options: ['O\'zbek tili (Ona tili)', 'Rus tili (Erkin)', 'Rus tili (O\'rtacha)', 'Ingliz tili (Erkin)', 'Ingliz tili (Boshlang\'ich)', 'Tojik tili / Boshqa'] },
  { id: '15', code: 'work_schedule', text: '15. 6/1 grafik va 07:00-17:00 / 08:00-18:00 smenalarga tayyormisiz?', type: 'CHOICE', options: ['Ha, to\'liq tayyorman', 'Grafik bo\'yicha savollarim bor'] },
  { id: '16', code: 'salary_expectation', text: '16. Kutilayotgan oylik maosh (4 mln fiks + KPI bonus)?', type: 'TEXT', placeholder: 'Masalan: 5,000,000 UZS' },
  { id: '17', code: 'start_date', text: '17. Qachondan ishni boshlashingiz mumkin?', type: 'TEXT', placeholder: 'Masalan: Ertaga yoki 3 kundan keyin' },
  { id: '18', code: 'sales_case', text: '18. E\'tirozlar bilan ishlash: Mijoz "Qimmat" desa nima degan bo\'lardingiz?', type: 'TEXT', placeholder: 'Qisqacha javobingiz...' },
  { id: '19', code: 'soft_skills', text: '19. O\'zingizdagi eng kuchli 3 ta sifatni ko\'rsating', type: 'TEXT', placeholder: 'Masalan: Intizom, Muloqot, Stressga chidamlilik' },
  { id: '20', code: 'motivation', text: '20. Nega aynan bizning jamoada ishlamoqchisiz?', type: 'TEXT', placeholder: 'Sababini yozing...' },
  { id: '21', code: 'face_id', text: '21. 📸 Face ID / Foto tasdiqlash: O\'zingizning aniq tushgan suratingizni yuboring', type: 'FACE_ID' }
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

function filterVacancies(filter) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');

  if (filter === 'all') {
    renderVacancies(vacancies);
  } else {
    const filtered = vacancies.filter(v =>
      (v.city || '').toLowerCase().includes(filter.toLowerCase()) ||
      (v.title || '').toLowerCase().includes(filter.toLowerCase()) ||
      (v.company || '').toLowerCase().includes(filter.toLowerCase())
    );
    renderVacancies(filtered);
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
  } else if (q.type === 'MULTI_SELECT') {
    let currentArr = [];
    if (typeof candidateAnswers[q.code] === 'string') {
      currentArr = candidateAnswers[q.code].split(', ').filter(Boolean);
    } else if (Array.isArray(candidateAnswers[q.code])) {
      currentArr = candidateAnswers[q.code];
    }

    wrapper.innerHTML = `
      <div class="multi-options">
        ${q.options.map((opt, idx) => {
          const isSelected = currentArr.includes(opt);
          return `
            <button type="button" class="multi-btn ${isSelected ? 'selected' : ''}" data-idx="${idx}">
              <span>${opt}</span>
              <span>${isSelected ? '✅' : '◻️'}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;

    wrapper.querySelectorAll('.multi-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(btn.getAttribute('data-idx'));
        const opt = q.options[idx];
        if (currentArr.includes(opt)) {
          currentArr = currentArr.filter(item => item !== opt);
        } else {
          currentArr.push(opt);
        }
        candidateAnswers[q.code] = currentArr.join(', ');
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        renderCurrentQuestion();
      });
    });
  } else if (q.type === 'FACE_ID') {
    const photoUrl = candidateAnswers['face_id_url'] || '';
    wrapper.innerHTML = `
      <div style="text-align:center; padding:10px 0;">
        <input type="file" id="faceCameraInput" accept="image/*" capture="user" style="display:none;" onchange="handleFaceIdFileSelect(event)">
        
        ${photoUrl ? `
          <div style="margin-bottom:16px;">
            <img src="${photoUrl}" style="width:130px; height:130px; border-radius:50%; object-fit:cover; border:3px solid var(--primary); box-shadow:0 8px 24px rgba(255,90,54,0.3); margin:0 auto; display:block;">
            <div style="margin-top:10px; font-size:14px; font-weight:800; color:#22C55E;">✅ Face ID Surat Saqlandi</div>
          </div>
          <button type="button" class="btn-secondary" style="width:100%; padding:12px; margin-bottom:8px;" onclick="document.getElementById('faceCameraInput').click()">
            📸 Qayta rasmga tushish
          </button>
        ` : `
          <div style="margin-bottom:16px;">
            <div style="width:100px; height:100px; border-radius:50%; background:rgba(255,90,54,0.12); border:2px dashed var(--primary); display:flex; align-items:center; justify-content:center; margin:0 auto; font-size:42px;">📷</div>
            <div style="margin-top:12px; font-size:13px; color:var(--text-muted); font-weight:600;">Yuzingiz tushgan o'z rasmigizni oling (Face ID)</div>
          </div>
          <button type="button" class="btn-primary" style="width:100%; padding:14px; font-size:15px;" onclick="document.getElementById('faceCameraInput').click()">
            📸 Rasmga Tushish (Face ID)
          </button>
        `}
      </div>
    `;
  } else {
    const val = candidateAnswers[q.code] || '';
    wrapper.innerHTML = `
      <input type="text" 
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
  if (btnNext) btnNext.textContent = currentStepIndex === standardQuestions.length - 1 ? 'Topshirish (Roziman) 🚀' : 'Keyingisi →';
}

async function handleFaceIdFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const btnNext = document.getElementById('btnNext');
  if (btnNext) {
    btnNext.disabled = true;
    btnNext.textContent = 'Yuklanmoqda...';
  }

  const formData = new FormData();
  formData.append('photo', file);

  try {
    const res = await fetch('/api/webapp/upload-face-id', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      candidateAnswers['face_id'] = 'Foto yuklandi';
      candidateAnswers['face_id_url'] = data.url;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      renderCurrentQuestion();
    }
  } catch (err) {
    alert('Rasm yuklashda xatolik yuz berdi. Qayta urinib ko\'ring.');
  }

  if (btnNext) {
    btnNext.disabled = false;
    btnNext.textContent = currentStepIndex === standardQuestions.length - 1 ? 'Topshirish (Roziman) 🚀' : 'Keyingisi →';
  }
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
  if (q.type !== 'CHOICE' && q.type !== 'FACE_ID' && q.type !== 'MULTI_SELECT') {
    const input = document.getElementById('wizardInput');
    if (input) candidateAnswers[q.code] = input.value;
  }

  // Smart age or birth year calculation
  if (q.code === 'age') {
    const raw = String(candidateAnswers['age'] || '').trim();
    const currentYear = new Date().getFullYear();
    const yearMatch = raw.match(/(19\d\d|20\d\d)/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 1950 && year <= currentYear - 10) {
        const calculatedAge = currentYear - year;
        candidateAnswers['age'] = `${calculatedAge} yosh (${year}-yil)`;
      }
    } else {
      const ageMatch = raw.match(/^(\d{2})\b/);
      if (ageMatch) {
        const ageVal = parseInt(ageMatch[1], 10);
        if (ageVal >= 14 && ageVal <= 75) {
          const year = currentYear - ageVal;
          candidateAnswers['age'] = `${ageVal} yosh (~${year}-yil)`;
        }
      }
    }
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

  container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><div style="font-size:32px; margin-bottom:8px;">⏳</div><p>Yuklanmoqda...</p></div>`;

  try {
    const userId = tg?.initDataUnsafe?.user?.id;
    const url = userId ? `/api/webapp/my-applications?userId=${userId}` : '/api/webapp/my-applications';
    const res = await fetch(url);
    const data = await res.json();
    const apps = data.applications || [];

    if (!apps.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px;">
          <div style="font-size:48px; margin-bottom:12px;">📋</div>
          <h3 style="font-weight:800; margin-bottom:8px;">Arizalar yo'q</h3>
          <p style="font-size:13px; color:var(--text-muted);">Hozircha ariza topshirmadingiz. Vakansiyalar bo'limidan boshlang!</p>
        </div>
      `;
      return;
    }

    const statusMap = {
      'NEW':       { label: 'Yangi',     color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' },
      'SUBMITTED': { label: 'Ko\'rilmoqda', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
      'INVITED':   { label: '✅ Taklif!', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
      'REJECTED':  { label: 'Rad etildi', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    };

    container.innerHTML = apps.map(app => {
      const st = statusMap[app.status] || statusMap['SUBMITTED'];
      return `
        <div class="vacancy-card" style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <span style="font-weight:800; font-size:15px;">${app.vacancyTitle || 'Call Center Sotuv Menejeri'}</span>
            <span class="tag-pill" style="background:${st.bg}; color:${st.color}; border:none;">${st.label}</span>
          </div>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">🏢 ${app.companyName || 'Flourenza'}</p>
          <p style="font-size:11px; color:var(--text-muted);">📅 ${app.createdAt ? new Date(app.createdAt).toLocaleDateString('uz-UZ') : 'Bugun'}</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:48px; margin-bottom:12px;">📋</div>
        <h3 style="font-weight:800; margin-bottom:8px;">Arizalar yo'q</h3>
        <p style="font-size:13px; color:var(--text-muted);">Hozircha ariza topshirmadingiz.</p>
      </div>
    `;
  }
}

// ── Animated Tab Switching ──
function switchTab(tab, btn) {
  const sections = ['vacanciesSection', 'supportSection'];
  const current = sections.find(s => {
    const el = document.getElementById(s);
    return el && !el.classList.contains('hidden');
  });

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
  const map = { vacancies: 'vacanciesSection', support: 'supportSection' };
  const el = document.getElementById(map[tab]);
  if (!el) return;
  el.classList.remove('hidden');
  el.style.animation = 'slideIn 0.25s ease forwards';
}

function scrollToVacancies() {
  const sec = document.getElementById('vacanciesSection');
  if (sec) sec.scrollIntoView({ behavior: 'smooth' });
}
