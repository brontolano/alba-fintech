<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Project: ALBA Finance — Sistem Keuangan Pesantren

**Stack:** Next.js 16 (App Router) + TypeScript + Prisma 7 + NextAuth v5 + Tailwind CSS v4 + Material Design 3
**Database:** SQLite (dev) / MySQL (prod)
**Deploy:** Hostinger Node.js App (standalone output)
**Domain:** `https://alba.brontolano.com`

---

## Key Architectural Decisions

### Multi-Tenant Structure
- **Tenant** = root entity (Pesantren/Organisasi)
- **Superadmin** (tenantId=null) manages all tenants
- **Units** per tenant: Kantor (Sederhana), Kantin (Retail), Koperasi (Retail)
- **Active Modules** per tenant: comma-separated string

### Role & Unit Scoping
| Role | Scope | Unit Assignment |
|------|-------|-----------------|
| Superadmin | Global (all tenants) | None |
| Pimpinan | Tenant-wide | None (sees all units) |
| Manager | Unit-specific | Required (1 unit) |
| Staff | Unit-specific | Required (1 unit) |

### Transaction Status Flow
```
Draft → Submitted → Pending (Manager) → Pending (Pimpinan) → Approved/Rejected
```

---

## Routing Structure

```
/login                          → Login page
/dashboard                      → Role-based redirect
/dashboard/tenant-selector      → Superadmin tenant picker
/dashboard/tenant/[tenantId]/   → Tenant dashboard (protected)
  /beranda                      → Dashboard per role
  /transaksi                    → Transaction list + filters
  /transaksi/new                → Create transaction (Draft)
  /transaksi/[id]               → Transaction detail
  /persetujuan                  → Approval list (Manager/Pimpinan)
  /persetujuan/[id]             → Approval detail + actions
  /rekonsiliasi                 → Reconciliation list
  /rekonsiliasi/new             → Create reconciliation
  /rekonsiliasi/[id]            → Reconciliation detail + actions
  /laporan                      → Reports (placeholder)
  /profil                       → Profile (placeholder)
  /notifikasi                   → Notifications (placeholder)

/superadmin                     → Superadmin dashboard
/superadmin/tenants             → Tenant CRUD
/superadmin/tenants/[id]        → Tenant edit
/superadmin/tenants/new         → Tenant create
/superadmin/managers            → Manager list
/superadmin/staff               → Staff list
/superadmin/pimpinan            → Pimpinan list
/superadmin/units               → Unit list
/superadmin/users/[id]          → User edit (all roles)
/superadmin/users/new           → User create (all roles)
```

---

## Current Status (2026-08-19)

### ✅ Completed
- NextAuth v5 + Credentials + JWT + Prisma Adapter
- SQLite dev database + Prisma 7 with `@prisma/adapter-better-sqlite3`
- Seed data: 1 Tenant, 3 Units, 8 Users, 16 Categories, 8 Inventory items
- Login page (Material Design 3, demo accounts, password toggle)
- Superadmin pages: Dashboard, Tenants CRUD, Users CRUD, Units list
- Tenant Dashboard Layout: TopAppBar, BottomNav (role-based), Safe area
- Pimpinan Beranda: Total saldo, stats, unit balances, recent transactions, quick actions
- Pimpinan Transaksi: List + filters, Create new, Detail placeholder
- Pimpinan Persetujuan: List + Detail with approve/reject (atomic balance update)
- Pimpinan Rekonsiliasi: List + Detail + New with preview
- Material Design 3 color system (CSS variables in globals.css)
- Role-based BottomNav: Pimpinan=5, Manager=4, Staff=3 items

### 🚧 In Progress
- Pimpinan Laporan page (charts + export)
- Pimpinan Profil page (detail, change password, logout)

### 📋 Next
- Notifications page (all roles)
- Manager mobile views
- Staff mobile views
- API layer (transaction CRUD, approval, reconciliation)

---

## Key Files Reference

### Auth & DB
- `src/lib/auth.ts` — NextAuth v5 config (Credentials, JWT, Prisma Adapter)
- `src/lib/auth-utils.ts` — Server utilities (getCurrentUser, requireRole, etc.)
- `src/lib/db.ts` — Prisma singleton with BetterSQLite3 adapter
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/app/(dashboard)/layout.tsx` — Tenant dashboard layout (TopAppBar + BottomNav)
- `src/app/login/page.tsx` — Login page (MD3 style)

### Superadmin
- `src/app/superadmin/layout.tsx` — Sidebar + TopBar layout
- `src/app/superadmin/page.tsx` — Dashboard with stats
- `src/app/superadmin/tenants/page.tsx` — Tenant list
- `src/app/superadmin/tenants/[id]/page.tsx` — Tenant edit/new
- `src/app/superadmin/managers/page.tsx` — Manager list
- `src/app/superadmin/staff/page.tsx` — Staff list
- `src/app/superadmin/users/[userId]/page.tsx` — User edit
- `src/app/superadmin/users/new/page.tsx` — User create

### Tenant Pages (Pimpinan)
- `src/app/dashboard/tenant/[tenantId]/beranda/page.tsx` — Dashboard
- `src/app/dashboard/tenant/[tenantId]/transaksi/page.tsx` — Transaction list
- `src/app/dashboard/tenant/[tenantId]/transaksi/new/page.tsx` — Create transaction
- `src/app/dashboard/tenant/[tenantId]/persetujuan/page.tsx` — Approval list
- `src/app/dashboard/tenant/[tenantId]/persetujuan/[id]/page.tsx` — Approval detail + actions
- `src/app/dashboard/tenant/[tenantId]/rekonsiliasi/page.tsx` — Reconciliation list
- `src/app/dashboard/tenant/[tenantId]/rekonsiliasi/[id]/page.tsx` — Reconciliation detail + actions
- `src/app/dashboard/tenant/[tenantId]/rekonsiliasi/new/page.tsx` — Create reconciliation

### APIs
- `src/app/api/superadmin/tenants/route.ts` — Tenant CRUD
- `src/app/api/superadmin/tenants/[id]/route.ts` — Tenant detail CRUD
- `src/app/api/superadmin/users/route.ts` — User CRUD
- `src/app/api/superadmin/users/[userId]/route.ts` — User detail CRUD

### Core Libs
- `src/lib/enums.ts` — Type-safe enums (roles, statuses, types)
- `src/lib/audit.ts` — `logAction()` helper
- `src/lib/api-response.ts` — Error handler
- `src/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `src/lib/env.ts` — Zod env validation

---

## Build & Dev Commands

```bash
# Development
npm run dev

# Build (standalone for Hostinger)
npm run build

# Database
npm run db:push      # Push schema to database
npm run db:seed      # Seed development data

# Prisma
npx prisma generate  # Generate client
npx prisma studio    # Open Prisma Studio
```

---

## Material Design 3 Color Tokens (CSS Variables)

```css
:root {
  --color-primary: #022448;
  --color-primary-container: #1e3a5f;
  --color-secondary: #16677a;
  --color-secondary-container: #a2e7fd;
  --color-tertiary: #341f00;
  --color-tertiary-container: #503300;
  --color-background: #faf9fc;
  --color-surface: #faf9fc;
  --color-surface-container-low: #f4f3f7;
  --color-surface-container-high: #e9e7eb;
  --color-on-surface: #1a1c1e;
  --color-on-surface-variant: #43474e;
  --color-outline: #74777f;
  --color-outline-variant: #c4c6cf;
  --color-error: #ba1a1a;
  --color-income: #10b981;
  --color-expense: #ef4444;
  --color-warning: #f59e0b;
}
```

---

## Common Patterns

### Server Component with Auth
```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page({ params }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // ...
}
```

### Server Action with FormData
```tsx
async function handleSubmit(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  // process formData...
  redirect("/target-page");
}
```

### Role-Based Access Check
```tsx
const { user } = await auth();
if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
  redirect("/dashboard/tenant-selector");
}
```

---

## Pending Tasks (Priority Order)

1. **Pimpinan Laporan page** — Recharts bar/line + Excel/PDF export
2. **Pimpinan Profil page** — User detail, change password, logout
3. **Notifications page** — List, read/unread, types, badge
4. **Manager mobile views** — Dashboard, Transaksi, Persetujuan, Inventory, POS
5. **Staff mobile views** — Dashboard, Transaksi, POS, Inventory
6. **API layer** — Transaction CRUD, Approval actions, Reconciliation CRUD
7. **Manager/Staff Approval pages** — Review & forward
8. **Inventory & POS pages** — CRUD, Stock movement, POS kasir
9. **Supplier & PO pages** — CRUD, PO workflow
10. **Reports API + Export** — Excel/PDF with charts

---

## Debugging Tips

### Build Errors
- "Expected '</', got 'string literal'" → Check for unescaped braces in className template literals
- "Module not found" → Check import paths, install missing deps
- Prisma "Driver adapter required" → Ensure adapter passed to PrismaClient

### Auth Issues
- Session not persisting → Check JWT callback, session strategy
- Redirect loops → Check middleware.ts, role-based redirects

### Database
- "Datasource.url required" → Set DATABASE_URL in prisma.config.ts or env
- SQLite lock → Single connection, use adapter properly

---

## Agent Instructions

When working on this project:
1. **Read planning files first** — `task_plan.md`, `progress.md`, `findings.md`
2. **Follow Material Design 3** — Use CSS variables, MD3 components
3. **Server-first** — Logic in Server Components/Actions, Client only for UI
4. **TypeScript strict** — No `any`, Zod validation at boundaries
5. **RBAC everywhere** — Check role + unit access on every mutation
6. **Mobile-first** — Bottom nav, touch targets 44px, safe areas
7. **Atomic transactions** — Prisma `$transaction` for multi-table updates
7. **Audit trail** — Call `logAction()` on sensitive operations
8. **Update planning files** — Mark tasks complete, log progress

---

## AGENTS.md Notes

This file contains project-specific context for AI agents. The following skills are available:
- `code-review` — For reviewing diffs/PRs
- `code-polisher` — For refactoring with tests
- `artifacts-builder` — For HTML artifacts
- `ui-ux-pro-max` — For UI/UX design decisions (use `--design-system`)

For UI/UX decisions, always run the design system generator first:
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system -p "ALBA Finance"
```