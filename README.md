# Marketing Markazi HR Bot System 🚀

Full-stack production-ready Telegram HR Candidate Recruitment, Video Introduction, Automated Scoring, amoCRM Integration, and Next.js Management System.

---

## 🌟 System Overview & Features

- **Telegram HR Bot (grammY + TypeScript)**:
  - Uzbek (Latin) i18n localization with extensible Russian structure.
  - Interactive multi-step form (20 standard questions) with `Orqaga` (Back) and `Bekor qilish` (Cancel) support.
  - Paginated company navigation (30+ companies, ~6 per page) with company name search & recommendation quiz.
  - Video introduction upload handling (supports round videos & video files up to 90s).
  - Application preview & edit sections before final submission.
  - Candidate status checker (`/status` command & menu button).
  - Draft application persistence & 24h reminder queue.
- **amoCRM Integration Service**:
  - Deal title format: `[Kompaniya] — [Vakansiya] — [Nomzod F.I.O.]`
  - Automatic lead creation in pipeline `"HR — Nomzodlar"`, status `"Yangi anketa"`.
  - Phone deduplication: existing contact detection & `"Takroriy nomzod"` flag.
  - Detailed survey summary note & secure video attachment link.
  - BullMQ retry queue (up to 5 attempts) preventing data loss.
- **Automated Candidate Scoring & AI Summary**:
  - 0–100 automated scoring algorithm based on candidate answers & vacancy criteria.
  - HR bullet-point AI summary generator (key strengths, experience, interview readiness).
- **Next.js 14 Admin Panel**:
  - Modern glassmorphism dark mode dashboard with real-time statistics.
  - Company & Vacancy management (CRUD, video toggle).
  - Candidate review table with detail modal, video player, filtering & Excel export (`.xlsx`).
- **Telegram HR Group Notifications**:
  - Instant notification sent to company HR Telegram group upon candidate submission.
- **amoCRM Status Webhooks**:
  - Auto-notifies candidates on Telegram when recruitment stage changes (Interview invite, Offline location, Rejection, Hire).

---

## 🏗 Directory Structure

```
Marketing Markazi HR bot/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── config/
│       ├── locales/
│       │   └── uz.json
│       ├── bot/
│       │   ├── bot.ts
│       │   └── handlers/
│       ├── services/
│       │   ├── amocrm.service.ts
│       │   ├── scoring.service.ts
│       │   ├── ai-summary.service.ts
│       │   └── storage.service.ts
│       ├── queues/
│       │   ├── amocrm.queue.ts
│       │   └── notification.queue.ts
│       ├── api/routes/
│       └── index.ts
└── admin-panel/
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile
    └── src/
        ├── app/
        │   ├── page.tsx
        │   ├── applications/page.tsx
        │   ├── companies/page.tsx
        │   └── vacancies/page.tsx
        └── components/
```

---

## ⚡ Quick Start (Local Setup)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure DATABASE_URL and BOT_TOKEN in .env

# Generate Prisma Client & Run Seeding
npm run prisma:generate
npm run prisma:seed

# Development Server
npm run dev
```

### 2. Admin Panel Setup
```bash
cd admin-panel
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Admin Panel.

---

## 🐳 Docker Deployment

```bash
docker-compose up --build -d
```

---

## 📜 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/companies` | List all client companies |
| `POST` | `/api/companies` | Create new company |
| `GET` | `/api/vacancies` | List active vacancies |
| `GET` | `/api/applications` | Candidate applications list with filters |
| `GET` | `/api/applications/export/excel` | Export all applications to Excel (`.xlsx`) |
| `GET` | `/api/stats/overview` | Dashboard analytics metrics |
| `POST` | `/api/amocrm/webhook` | amoCRM stage change webhook listener |
