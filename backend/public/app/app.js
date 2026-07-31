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

// Official Questions for Flourenza & Custom Vacancies
const standardQuestions = [
  { id: '1', code: 'full_name', text: '1. Sizning to\'liq ismingiz (F.I.Sh.)?', type: 'TEXT', placeholder: 'Masalan: Malika Raximova' },
  { id: '2', code: 'phone', text: '2. Telefon raqamingiz?', type: 'PHONE', placeholder: '+998 88 555 55 88' },
  { id: '3', code: 'age', text: '3. Yoshingiz nechada? (20 - 35 yosh)', type: 'NUMBER', placeholder: 'Masalan: 25' },
  { id: '4', code: 'city', text: '4. Yashash manzilingiz (Shahar/Tuman)?', type: 'TEXT', placeholder: 'Masalan: Quva tumani, Tolmozor' },
  { id: '5', code: 'experience', text: '5. Sotuv yoki Call Center sohasida tajribangiz bormi?', type: 'CHOICE', options: ['Ha, 6 oydan 1 yilgacha tajribam bor', 'Ha, 1 yildan ortiq', 'Yo\'q, yangi boshlayman'] },
  { id: '6', code: 'amocrm', text: '6. amoCRM va kompyuter bilimlari bilan ishlay olasizmi?', type: 'CHOICE', options: ['Ha, amoCRM tajribam bor', 'Kompyuterni bilaman, amoCRM o\'rganaman', 'Tajribam kam'] },
  { id: '7', code: 'languages', text: '7. O\'zbek tili va boshqa tillarni bilish darajangiz?', type: 'CHOICE', options: ['O\'zbek tili — Mukammal', 'O\'zbek va Rus tili — Muloqot darajasida'] },
  { id: '8', code: 'schedule', text: '8. 6/1 grafiki va 07:00-17:00 smenaga tayyormisiz?', type: 'CHOICE', options: ['Ha, to\'liq tayyorman', 'Grafik bo\'yicha savollarim bor'] },
  { id: '9', code: 'face_id', text: '9. 📸 Face ID / Foto tasdiqlash: O\'zingizning aniq tushgan suratingizni yoki video havolani kiriting', type: 'TEXT', placeholder: 'Surat havolasi yoki "Telegram orqali yubordim"' }
];

document.addEventListener('DOMContentLoaded', () => {
  initUserInfo();
  fetchVacancies();
  fetchMyApplications();
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
    const data = await res.json();
    vacancies = data.vacancies || [];
    renderVacancies(vacancies);
  } catch (err) {
    renderVacancies([]);
  }
}

// Render Vacancy Cards
function renderVacancies(list) {
  const grid = document.getElementById('vacancyGrid');
  if (!list || list.length === 0) {
    grid.innerHTML = `
      <div class="vacancy-card">
        <div class="card-header">
          <div class="company-badge">
            <div class="company-logo">🏢</div>
            <span class="company-name">Flourenza</span>
          </div>
          <span class="tag-pill">HOT VAKANSIYA</span>
        </div>
        <h3 class="vacancy-title">Call Center Sotuv Menejeri</h3>
        <div class="vacancy-meta">
          <span class="meta-item">📍 Quva tumani, Tolmozor</span>
          <span class="meta-item">⏰ Grafik: 6/1</span>
        </div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
          Nomzod: 20–35 yoshli ayol. Oylik: 4 000 000 UZS fiks + KPI bonuslar. Tushlik korxona hisobidan!
        </p>
        <div class="card-footer">
          <span class="salary-text">4 000 000 - 6 000 000 UZS</span>
          <button class="apply-btn" onclick="openApplicationWizard('flourenza_1')">Topshirish →</button>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(v => `
    <div class="vacancy-card">
      <div class="card-header">
        <div class="company-badge">
          <div class="company-logo">${v.icon || '🏢'}</div>
          <span class="company-name">${v.company || 'Flourenza'}</span>
        </div>
        <span class="tag-pill">${v.tag || 'OCHIQ'}</span>
      </div>
      <h3 class="vacancy-title">${v.title}</h3>
      <div class="vacancy-meta">
        <span class="meta-item">📍 ${v.city || 'Quva shahri'}</span>
        <span class="meta-item">⏰ 6/1 grafik</span>
      </div>
      <div class="card-footer">
        <span class="salary-text">${v.salary || '4 000 000 UZS + KPI'}</span>
        <button class="apply-btn" onclick="openApplicationWizard('${v.id}')">Topshirish →</button>
      </div>
    </div>
  `).join('');
}

// Fetch My Applications
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

// Open Application Wizard
function openApplicationWizard(vacancyId) {
  currentVacancy = vacancies.find(v => v.id === vacancyId) || { id: 'v1', title: 'Call Center Sotuv Menejeri', company: 'Flourenza' };
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
      vacancyTitle: currentVacancy?.title || 'Call Center Sotuv Menejeri',
      companyName: currentVacancy?.company || 'Flourenza',
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
