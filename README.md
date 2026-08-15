# ALBA Finance — Next.js 16 + MySQL

Next.js 16 App Router project, Prisma ORM, NextAuth.js. Database: **MySQL (Hostinger)**. Role `Superadmin` memiliki akses setara `Pimpinan`.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript 5
- Prisma ORM (provider: `mysql`)
- NextAuth.js (credentials)
- bcryptjs
- MySQL (Hostinger `u826712707_alba`)

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Environment

Salin `.env.production` ke `.env` (untuk dev) atau isi variabel berikut di Hostinger:

```env
DATABASE_URL=mysql://u826712707_alba:***@localhost:3306/u826712707_alba
NEXTAUTH_URL=https://alba.brontolano.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

### 3. Database

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

Atau import manual via phpMyAdmin:
```bash
mysql -u u826712707_alba -p u826712707_alba < prisma/migrations/20260815000000_mysql_initial_schema.sql
```

### 4. Dev

```bash
npm run dev
```

## Deploy Hostinger

1. **hPanel → Environment Variables** → set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
2. **hPanel → Node.js App** → startup: `npm start`, App root: folder project
3. **SSH / build script**:
   ```bash
   npm install
   npm run build
   npx prisma generate
   npx prisma migrate deploy
   ```

## Default Superadmin

```
Email:    admin@brontolano
Password: bismillah
Role:     Superadmin (akses sama Pimpinan + semua unit)
```

## Role & Access

| Role        | Scope |
|-------------|-------|
| Superadmin  | Semua fitur, semua unit, config brand, backup, audit logs |
| Pimpinan    | Semua fitur, semua unit, config brand, audit logs |
| Manager     | Unit sendiri, transaksi, approval, inventory, PO, POS, shift |
| Staff       | Unit sendiri, transaksi, inventory, POS |

Guard di `src/lib/guards.ts`:
- `ensureUnitAccess(session, unit)` — cek role `Pimpinan`/`Superadmin` bypass unit
- `requireUnit(session, unit)` — middleware-level check

## Project Structure

```
src/
  app/
    api/                      REST API routes
      admin/backup/           Backup DB (Superadmin only)
      ai/assistant/           AI assistant
      approvals/              Approval workflow
      audit-logs/             Audit trail (Superadmin only)
      auth/[...nextauth]/     NextAuth credentials
      config/                 Brand config (Superadmin/Pimpinan)
      dashboard/              Dashboard stats
      inventory/              Inventory CRUD
      inventory/movements/    Stock IN/OUT (Superadmin/Pimpinan/Manager)
      inventory/opname/       Stock opname (Superadmin/Pimpinan/Manager)
      notifications/          Notification list
      pos/                    POS sales + refund
      pos/[id]/refund/        POS refund
      profile/                Profile + brand (Pimpinan)
      purchase-orders/        PO CRUD
      reconciliations/        Cash reconciliation
      reports/                Financial reports
      shifts/                 Cashier shift open/close
      shifts/[id]/            Shift detail
      suppliers/              Supplier CRUD
      transactions/           Transaction CRUD + approve
      transactions/[id]/approve/
      users/                  User management (Superadmin/Pimpinan)
    ai/assistant/             AI chat page
    approvals/                Approval UI
    audit-logs/               Audit log viewer
    dashboard/                Main dashboard
    dashboard/manager/        Manager dashboard
    dashboard/staff/          Staff dashboard
    inventory/                Inventory page
    login/                    Login page
    pos/                      POS page
    profile/                  Profile + brand settings
    purchase-orders/          PO page
    reconciliations/          Reconciliation page
    reports/                  Reports page
    suppliers/                Suppliers page
    transactions/             Transactions page
    transactions/new/         New transaction
    users/                    Users page
  components/
    BottomNav.tsx             Mobile nav
    BrandedLayout.tsx         Layout dengan brand config
    BrandProvider.tsx         Brand context
    NotificationBell.tsx      Notif dropdown
    Providers.tsx             Session + theme
    RetailShortcuts.tsx       Retail quick actions
    ui/                       Shadcn UI components
  lib/
    audit.ts                  Audit log helper
    enums.ts                  Unit/Role enums + guards
    guards.ts                 Unit/Role access control
    image-compress.ts         Client image compression
    offline/                  Offline queue (IndexedDB)
    prisma.ts                 Prisma singleton
    utils.ts                  Helpers
prisma/
  schema.prisma               MySQL datasource + models
  seed.ts                     Superadmin + categories seed
  migrations/
    20260815000000_mysql_initial_schema.sql  -- Full MySQL import + superadmin seed
```

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | `provider = "mysql"`, all models |
| `prisma/seed.ts` | Creates Superadmin `admin@brontolano` / `bismillah` |
| `src/lib/guards.ts` | Role/unit access (Superadmin = Pimpinan) |
| `src/lib/enums.ts` | Unit/Role constants |
| `.env.production` | Production env template for Hostinger |

## API Role Guards (Superadmin = Pimpinan)

- `GET/POST /api/admin/backup` — Superadmin only
- `GET /api/audit-logs` — Superadmin only
- `GET/PUT /api/config` — Pimpinan/Superadmin
- `GET/POST /api/inventory/movements` — Pimpinan/Superadmin/Manager
- `GET/POST /api/inventory/opname` — Pimpinan/Superadmin/Manager
- `POST /api/users` — Pimpinan/Superadmin

## Scripts

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production
npm run lint         # ESLint (0 errors)
npx prisma generate  # Generate client
npx prisma migrate deploy  # Apply migrations
npx prisma db seed   # Seed superadmin + categories
```

## Database

- **Host**: `localhost:3306` (Hostinger internal)
- **Database**: `u826712707_alba`
- **User**: `u826712707_alba`
- **phpMyAdmin**: `https://auth-db594.hstgr.io/index.php?db=u826712707_alba`
- **Charset**: `utf8mb4` / `utf8mb4_unicode_ci`
- **Engine**: `InnoDB`

## Notes

- Offline-first: `src/lib/offline/` queue mutations when offline, replay on reconnect
- Image compression: `src/lib/image-compress.ts` (client-side before upload)
- Brand config: `SystemConfig` table + `/api/config` + `BrandProvider` context
- PWA: `@ducanh2912/next-pwa` configured