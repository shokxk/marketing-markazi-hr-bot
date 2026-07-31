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

// Default 10 Uzbek Latin Questions
const standardQuestions = [
  { id: '1', code: 'full_name', text: '1. Sizning to\'liq ismingiz (F.I.Sh.)?', type: 'TEXT', placeholder: 'Masalan: Alisher Vohidov' },
  { id: '2', code: 'phone', text: '2. Telefon raqamingiz?', type: 'PHONE', placeholder: '+998 90 123 45 67' },
  { id: '3', code: 'age', text: '3. Yoshingiz nechada?', type: 'NUMBER', placeholder: 'Masalan: 23' },
  { id: '4', code: 'city', text: '4. Qaysi shahar/tumanda yashaysiz?', type: 'TEXT', placeholder: 'Masalan: Toshkent sh., Chilonzor' },
  { id: '5', code: 'experience', text: '5. Marketing yoki tegishli sohada tajribangiz bormi?', type: 'CHOICE', options: ['Ha, 1 yildan ortiq', 'Ha, 6 oygacha', 'Yo\'q, yangi boshlayman'] },
  { id: '6', code: 'education', text: '6. Ta\'lim darajangiz?', type: 'CHOICE', options: ['Oliy (Bakalavr/Magistr)', 'O\'rta maxsus (Kollej/Litsey)', 'O\'rta maktab'] },
  { id: '7', code: 'skills', text: '7. Qaysi dastur va ko\'nikmalarni bilasiz?', type: 'TEXT', placeholder: 'Masalan: Photoshop, SMM, Target, Copywriting' },
  { id: '8', code: 'salary', text: '8. Kutilayotgan oylik maosh miqdori (UZS)?', type: 'TEXT', placeholder: 'Masalan: 5,000,000 UZS' },
  { id: '9', code: 'why_us', text: '9. Nega aynan bizning jamoada ishlamoqchisiz?', type: 'TEXT', placeholder: 'Qisqacha izohingiz...' },
  { id: '10', code: 'video', text: '10. Vizitka видео xabaringiz yoki o\'zingiz haqingizda video havola?', type: 'TEXT', placeholder: 'Video link yoki "Telegram orqali yuboraman"' }
];

document.addEventListener('DOMContentLoaded', () => {
  initUserInfo();
  fetchVacancies();
});

// Setup User Info from Telegram SDK
function initUserInfo() {
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    document.getElementById('userName').textContent = user.first_name || 'Nomzod';
    document.getElementById('userAvatar').textContent = user.first_name ? user.first_name[0] : '👤';
    candidateAnswers['telegram_id'] = user.id;
    candidateAnswers['username'] = user.username || '';
  }
}

// Fetch vacancies from API
async function fetchVacancies() {
  const grid = document.getElementById('vacancyGrid');
  try {
    const res = await fetch('/api/webapp/vacancies');
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    vacancies = data.vacancies || [];
    renderVacancies(vacancies);
  } catch (err) {
    // Demo Fallback Data
    vacancies = [
      { id: 'v1', title: 'SMM Mutaxassisi', company: 'Marketing Markazi', city: 'Toshkent', salary: '5,000,000 - 9,000,000 UZS', tag: 'TOP VAKANSIYA', icon: '📱' },
      { id: 'v2', title: 'Grafik Dizayner (Senior)', company: 'Digital Pro Studio', city: 'Toshkent', salary: '7,000,000 - 12,000,000 UZS', tag: 'SHOSHILINCH', icon: '🎨' },
      { id: 'v3', title: 'Targetolog (Meta / Google)', company: 'Media Group', city: 'Toshkent', salary: '6,000,000 - 10,000,000 UZS', tag: 'MINI-GRUPPA', icon: '🎯' },
      { id: 'v4', title: 'Kontent Menejer & Copywriter', company: 'Brand Studio', city: 'Samarqand', salary: '4,000,000 - 7,000,000 UZS', tag: 'YANGI', icon: '✍️' }
    ];
    renderVacancies(vacancies);
  }
}

// Render Vacancy Cards
function renderVacancies(list) {
  const grid = document.getElementById('vacancyGrid');
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>Hozircha vakansiyalar yo\'q</p></div>';
    return;
  }

  grid.innerHTML = list.map(v => `
    <div class="vacancy-card">
      <div class="card-header">
        <div class="company-badge">
          <div class="company-logo">${v.icon || '🏢'}</div>
          <span class="company-name">${v.company || 'Marketing Markazi'}</span>
        </div>
        <span class="tag-pill">${v.tag || 'OCHIQ'}</span>
      </div>
      <h3 class="vacancy-title">${v.title}</h3>
      <div class="vacancy-meta">
        <span class="meta-item">📍 ${v.city || 'Toshkent'}</span>
        <span class="meta-item">⏰ To'liq stavka</span>
      </div>
      <div class="card-footer">
        <span class="salary-text">${v.salary || 'Kelishiladi'}</span>
        <button class="apply-btn" onclick="openApplicationWizard('${v.id}')">Topshirish →</button>
      </div>
    </div>
  `).join('');
}

// Filter vacancies by tab
function filterVacancies(category) {
  document.querySelectorAll('.filter-chips .chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');

  if (category === 'all') {
    renderVacancies(vacancies);
  } else {
    const filtered = vacancies.filter(v => 
      v.city.toLowerCase().includes(category.toLowerCase()) || 
      v.title.toLowerCase().includes(category.toLowerCase())
    );
    renderVacancies(filtered);
  }
}

// Open Application Wizard
function openApplicationWizard(vacancyId) {
  currentVacancy = vacancies.find(v => v.id === vacancyId) || vacancies[0];
  currentStepIndex = 0;
  document.getElementById('modalVacancyTitle').textContent = `${currentVacancy.company} — ${currentVacancy.title}`;
  document.getElementById('appModal').classList.remove('hidden');
  renderCurrentQuestion();
}

// Render Wizard Question
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
    // Final Submit
    submitApplication();
  }
}

// Submit Application to Backend API (Syncs with amoCRM + Telegram HR Group)
async function submitApplication() {
  document.getElementById('btnNext').disabled = true;
  document.getElementById('btnNext').textContent = 'Yuborilmoqda...';

  try {
    const payload = {
      vacancyId: currentVacancy?.id,
      vacancyTitle: currentVacancy?.title,
      companyName: currentVacancy?.company,
      answers: candidateAnswers,
      user: tg?.initDataUnsafe?.user || { first_name: 'Nomzod' }
    };

    const res = await fetch('/api/webapp/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    closeModal();
    document.getElementById('successModal').classList.remove('hidden');
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

// Navigation Tabs
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
