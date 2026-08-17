<div align="center">

# 💰 ALBA Finance

**Sistem Manajemen Keuangan Multi-Unit untuk Pesantren & Organisasi**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2d3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479a1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistem Enterprise Finance untuk pencatatan transaksi, approval workflow,
rekonsiliasi setoran, dan retail POS dalam **satu aplikasi terpusat**.
Cocok untuk pesantren, yayasan, koperasi, maupun organisasi multi-unit.

[🌐 Demo](https://alba.brontolano.com) · [📖 Dokumentasi](docs/ALBA_Finance_PRD.md) · [🐛 Lapor Bug](../../issues)

</div>

---

## ✨ Fitur Utama

### 🏦 Modul Inti
| Modul | Deskripsi |
|-------|-----------|
| **📊 Dashboard Multi-Role** | Pimpinan, Manager, Staff, Superadmin — masing-masing punya view berbeda |
| **💸 Transaksi** | Pencatatan debit/kredit real-time dengan saldo berjalan otomatis |
| **✅ Approval Workflow** | Transaksi besar butuh persetujuan Pimpinan sebelum final |
| **🔄 Reconciliation** | Verifikasi setoran fisik vs sistem untuk audit closing |
| **📦 Retail POS** | Kasir shift, manajemen stok kritis, purchase order |
| **🤖 AI Assistant** | Chat bot kontekstual dengan DB context (OpenRouter compatible) |
| **🔍 Audit Logs** | Tracking lengkap aktivitas user untuk keamanan & compliance |
| **📱 PWA Ready** | Installable di mobile/desktop, support offline |

### 🔐 Role & Permission

| Role | Akses |
|------|-------|
| **Superadmin** | Full control: CRUD Unit, User, Grouping Manager → Staff |
| **Pimpinan** | Executive dashboard lintas unit, approval transaksi, laporan |
| **Manager** | Dashboard per-unit, monitoring stok, pengajuan anggaran |
| **Staff** | Input transaksi cepat (POS-style), tracking status dokumen |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| **Framework** | Next.js 16.3.0 (App Router, Turbopack) |
| **UI** | React 19.2.8, Tailwind CSS v4, Shadcn UI primitives |
| **Database** | MySQL 8 via Prisma ORM v5.22.0 |
| **Auth** | NextAuth.js v4.24.15 + bcryptjs |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **PWA** | @ducanh2912/next-pwa v10.2.9 |
| **AI** | OpenRouter (Llama 3.1 8B Instruct free) — fallback rule-based jika API key kosong |
| **PDF/Excel** | jsPDF, jsPDF-AutoTable, xlsx |

---

## 🚀 Quick Start (Development Lokal)

### Prasyarat
- Node.js 20+
- MySQL 8+ (atau MariaDB 10.5+)
- npm / pnpm / yarn

### Instalasi

```bash
# 1. Clone repo
git clone https://github.com/hamdansumedang/alba-fintech.git
cd alba-fintech

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
cp .env.example .env.production
# Edit kedua file: DATABASE_URL, NEXTAUTH_SECRET, LLM_API_KEY

# 4. Setup database lokal
mysql -u root -p
> CREATE DATABASE alba_fintech;
> exit
mysql -u root -p alba_fintech < prisma/migrations/20260815000000_mysql_initial_schema.sql
mysql -u root -p alba_fintech < prisma/migrations/20260817000000_add_unit_table.sql

# 5. Generate Prisma client + seed default users
npm run db:seed

# 6. Jalankan dev server
npm run dev
```

App berjalan di `http://localhost:3000`.

### Default Login

| Email | Password | Role |
|-------|----------|------|
| `admin@brontolano.com` | `bismillah` | Superadmin |

> ⚠️ **Segera ganti password setelah login pertama!**

---

## 📦 Scripts

```bash
npm run dev          # Dev server dengan Turbopack
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint check
npm run db:push      # Push schema ke database (dev only)
npm run db:seed      # Seed default users
npm run db:studio    # Prisma Studio (GUI DB)
```

---

## 🌐 Deploy ke Production (Hostinger hPanel)

### 1. Import Database via phpMyAdmin

Di hPanel → **Databases** → **phpMyAdmin**:

```sql
-- 1. Pilih database u826712707_alba
-- 2. Import SQL berikut secara berurutan:
--    - prisma/migrations/20260815000000_mysql_initial_schema.sql
--    - prisma/migrations/20260817000000_add_unit_table.sql
```

### 2. Set Environment Variables

hPanel → **Node.js App** → **Environment Variables**:

```env
DATABASE_URL=mysql://u826712707_alba:YOUR_PASSWORD@127.0.0.1:3306/u826712707_alba
NEXTAUTH_URL=https://alba.brontolano.com
NEXTAUTH_SECRET=GENERATE_VIA_openssl_rand_base64_32
LLM_API_URL=https://openrouter.ai/api/v1/chat/completions
LLM_API_KEY=sk-or-v1-XXXXXXXXXXXXXXXXXXXXXXXX
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
```

Generate secret dengan:
```bash
openssl rand -base64 32
```

### 3. Setup Node.js App

- **Application Root**: `alba.brontolano.com` (atau folder project)
- **Application Startup File**: `server.js` *(atau biarkan Next.js autodetect)*
- **Node.js Version**: 20
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 4. Restart & Test

Klik **Restart** di hPanel Node.js App, lalu buka `https://alba.brontolano.com/login`.

---

## 📂 Struktur Folder

```
alba-fintech/
├── docs/                          # Dokumentasi
│   ├── ALBA_Finance_PRD.md        # Product Requirements Document
│   ├── GAP_ANALYSIS_FEATURES.md   # Analisis gap per fitur
│   ├── GAP_ANALYSIS_VS_PRD.md     # Analisis gap vs PRD
│   └── IMPLEMENTATION_PLAN.md     # Plan implementasi
│
├── prisma/
│   ├── schema.prisma              # Database schema (Prisma)
│   ├── seed.ts                    # Seed script
│   └── migrations/
│       ├── 20260815000000_mysql_initial_schema.sql
│       └── 20260817000000_add_unit_table.sql
│
├── public/                        # Static assets (icons, manifest, uploads/)
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── api/                   # API routes (REST)
│   │   │   ├── ai/assistant/      # AI chat endpoint
│   │   │   ├── units/             # CRUD Unit (Superadmin)
│   │   │   ├── users/             # CRUD User
│   │   │   ├── transactions/      # Transaksi + approval
│   │   │   └── ...                # 15+ endpoints
│   │   ├── dashboard/             # Role-based dashboards
│   │   │   ├── superadmin/        # Superadmin Command Center
│   │   │   ├── manager/           # Manager dashboard
│   │   │   ├── staff/             # Staff dashboard
│   │   │   └── role-router.tsx    # Role-based redirect
│   │   ├── ai/assistant/          # Halaman AI Assistant
│   │   ├── transactions/          # Halaman transaksi
│   │   ├── inventory/             # Inventory + POS
│   │   ├── approvals/             # Approval queue
│   │   ├── audit-logs/            # Audit log viewer
│   │   ├── login/                 # Login page
│   │   └── users/                 # User management (Superadmin)
│   │
│   ├── components/                # React components reusable
│   │   ├── BottomNav.tsx
│   │   ├── BrandedLayout.tsx
│   │   ├── NotificationBell.tsx
│   │   └── ui/                    # Shadcn UI primitives
│   │
│   ├── lib/                       # Utility & business logic
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── guards.ts              # RBAC helpers
│   │   ├── audit.ts               # Audit log writer
│   │   ├── enums.ts               # Shared enums
│   │   ├── image-compress.ts      # Client-side image compression
│   │   └── offline/               # PWA offline helpers
│   │
│   ├── types/                     # TypeScript type definitions
│   │   └── next-auth.d.ts         # NextAuth session augmentation
│   │
│   └── middleware.ts              # Auth middleware (RBAC route guard)
│
├── .env.example                   # Template environment variables
├── .gitignore                     # Git ignore patterns
├── next.config.ts                 # Next.js config
├── tailwind.config.ts             # Tailwind config (via PostCSS)
├── tsconfig.json                  # TypeScript config
├── package.json                   # Dependencies
│
├── LICENSE                        # MIT License
├── README.md                      # ← You are here
├── CONTRIBUTING.md                # Panduan kontribusi
├── SECURITY.md                    # Security policy
├── CHANGELOG.md                   # Changelog
└── DEPLOYMENT.md                  # Catatan teknis deployment
```

---

## 🤝 Contributing

Lihat [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan lengkap.

```bash
# Workflow singkat:
git checkout -b feat/nama-fitur
# ... code ...
npm run lint && npm run build
git commit -m "feat(scope): deskripsi"
git push origin feat/nama-fitur
# → Buka PR ke main
```

---

## 🔐 Security

Untuk laporan kerentanan keamanan, lihat [SECURITY.md](SECURITY.md) — **JANGAN** buka public issue.

---

## 📝 License

[MIT License](LICENSE) © 2025 ALBA Finance Team

---

## 📞 Kontak & Support

- 🌐 Website: [alba.brontolano.com](https://alba.brontolano.com)
- 🐛 Issues: [GitHub Issues](../../issues)
- 📧 Email: support@brontolano.com

---

<div align="center">

**Dibuat dengan ❤️ untuk transparansi & akuntabilitas keuangan organisasi**

</div>
