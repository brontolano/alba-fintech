# Task Plan — ALBA-APPS Rebuild

**Project:** ALBA Finance — Sistem Manajemen Keuangan Multi-Unit Pesantren & Organisasi
**Target Deploy:** Hostinger Node.js App + MySQL, Domain `https://alba.brontolano.com`
**Status:** Phase 1 — UI & Role-Based Pages
**Created:** 2026-08-19

---

## PRD Summary (Ringkasan Kebutuhan)

### Vision
Aplikasi web mobile-first (PWA) untuk digitalkan pencatatan keuangan pesantren/organisasi multi-unit (Kantor, Kantin, Koperasi) dengan workflow approval, POS retail, inventori, rekonsiliasi, dan laporan real-time.

### Core Requirements
| Area | Detail |
|------|--------|
| **Akses** | Web browser (mobile-first PWA), offline 7 hari, auto-sync |
| **Roles** | Superadmin (global), Pimpinan (tenant-wide), Manager (unit), Staff (unit) |
| **Units** | Sederhana (Kantor: kas/admin) + Retail (Kantin/Koperasi: inventori + POS) |
| **Transaksi** | Debit/Kredit, Tunai/Transfer, Kategori, Foto bukti (<500KB), Running balance |
| **Workflow** | Draft → Submitted → Manager Review → Pimpinan Approve/Reject |
| **Rekonsiliasi** | Stor harian fisik vs digital, validasi Pimpinan, deteksi selisih |
| **Retail** | Inventori (SKU, harga, min-stok), POS kasir, shift, return/void |
| **Laporan** | Harian/bulanan per unit, grafik tren, export Excel/PDF |
| **AI/WA** | LLM query read-only, WhatsApp command `!alba` via n8n+WAHA (Post-MVP) |

### Tech Stack (Locked)
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x (strict) |
| Database | MySQL (prod) / SQLite (dev) | Prisma ORM |
| Auth | NextAuth v5 | Credentials + JWT |
| UI | Tailwind CSS v4 + shadcn/ui | Latest |
| Charts | Recharts | Latest |
| Export | xlsx + jsPDF-autotable | Latest |
| PWA | next-pwa (Workbox) | Latest |
| Image Compress | browser-image-compression | Latest |
| Validation | Zod | Latest |
| Testing | Vitest + React Testing Library + Playwright | Latest |

### Design System
- **Primary:** Navy `#1E3A5F`
- **Income:** Emerald `#10B981`
- **Expense:** Rose `#EF4444`
- **Warning:** Amber `#F59E0B`
- **Typography:** Inter (body), JetBrains Mono (nominal — `tabular-nums`)
- **Style:** Soft UI Evolution — card-based, subtle shadows, dimensional layering
- **Navigation:** Bottom Nav 5 tabs (Beranda, Transaksi, Persetujuan, Laporan, Rekonsiliasi)

---

## Work Rules (Aturan Kerja)

1. **Stdlib/Native First** — Gunakan fitur browser/Node/Next.js bawaan sebelum library baru
2. **Shortest Diff** — Perubahan minimal, hapus kode tidak perlu, hindari abstraksi premature
3. **TypeScript Strict** — `noAny: true`, `strictNullChecks: true`, Zod di trust boundary
4. **Single Source of Truth** — Schema Prisma = source of truth untuk types (generate `prisma generate`)
5. **Server-First** — Logic bisnis di Server Components/Route Handlers, Client Components hanya UI
6. **RBAC Everywhere** — Middleware + Server-side check di setiap action mutasi
7. **Audit Trail** — Semua aksi sensitif (create/update/delete/approve/reject) wajib `logAction()`
8. **Offline-Ready** — Semua form input queue ke IndexedDB jika offline, sync saat online
9. **Mobile-First** — Breakpoint `sm: 640px`, `md: 768px`, `lg: 1024px`; test di device real
10. **No Secrets in Code** — Semua credential di `.env`, validasi startup dengan Zod
11. **One Runnable Check** — Setiap fitur non-trivial punya 1 test/assert yang bisa dijalankan
12. **Deploy-Ready Config** — `output: 'standalone'`, `images.unoptimized: true`, port dari `process.env.PORT`

---

## Phase Breakdown (Todo List)

### Phase 0: Foundation & Setup (Week 1) ✅
- [x] 0.1 Init Next.js 15 + TypeScript strict di `Alba-WebApps`
- [x] 0.2 Install deps: Prisma, NextAuth v5, Tailwind v4, shadcn/ui, Zod, Vitest, Playwright
- [x] 0.3 Config: ESLint (flat), Prettier, Husky, lint-staged, `next.config.ts` (standalone)
- [x] 0.4 Copy Prisma schema dari projek lama → adjust untuk MySQL/SQLite dual
- [x] 0.5 `.env.example` + Zod env validation (`src/lib/env.ts`)
- [x] 0.6 Git init + GitHub repo + GitHub Actions CI (lint, typecheck, test, build)
- [x] 0.7 Design tokens: `tailwind.config.ts`, `globals.css` (CSS variables untuk theme)

### Phase 1: Core Infrastructure & Auth (Week 1-2) ✅
- [x] 1.1 Prisma Client singleton + middleware (soft delete, audit auto-log)
- [x] 1.2 NextAuth v5: Credentials provider, JWT callbacks, role/unit scoping
- [x] 1.3 Middleware (`middleware.ts`): RBAC guard per route, rate limit login
- [x] 1.4 shadcn/ui components: Button, Input, Select, Dialog, Table, Toast, Badge, Avatar, Dropdown, Tabs, Sheet
- [x] 1.5 Layout: `RootLayout` + `DashboardLayout` (TopAppBar + BottomNav per role)
- [x] 1.6 Route groups: Multi-tenant structure with `/dashboard/tenant/[tenantId]`

### Phase 1.5: UI Pages — Login & Role-Based Views (IN PROGRESS)
- [x] 1.5.1 **Fix Login Page** — Responsive, clean design, demo accounts, Material Design 3
- [x] 1.5.2 **Superadmin Pages (Desktop View)**
  - [x] CRUD Tenant: Brand info, logo, colors, subdomain, activeModules
  - [x] CRUD Pimpinan accounts (per tenant)
  - [x] CRUD Manager + Unit + Unit Type (Sederhana/Retail) + Module activation
  - [x] CRUD Staff accounts linked to units
  - [x] Superadmin Dashboard: All tenants overview, stats
- [~] 1.5.3 **Pimpinan Pages (Mobile View)**
  - [x] Dashboard (Beranda): Saldo gabungan 3 unit, stat cards, unit balances, recent transactions, quick actions
  - [x] Transaksi: List dengan filter, search, pagination, detail, create new
  - [x] Persetujuan: List + Detail dengan approve/reject
  - [x] Rekonsiliasi: List + Detail + New dengan validasi stor
  - [ ] Laporan: Grafik + export
  - [ ] Profil: Detail, change password, logout
- [ ] 1.5.4 **Manager Pages (Mobile View)**
  - [ ] Dashboard: Unit-specific, stok kritis (retail), transaksi hari ini
  - [ ] Transaksi: Input & daftar (filter)
  - [ ] Persetujuan: Review & forward ke Pimpinan
  - [ ] Rekonsiliasi: Input stor harian
  - [ ] Inventory (Retail only): CRUD items, stock movement, opname
  - [ ] POS (Retail only): Kasir grid, checkout, shift
  - [ ] Profil
- [ ] 1.5.5 **Staff Pages (Mobile View)**
  - [ ] Dashboard: Quick input transaksi, status dokumen
  - [ ] Transaksi: Input form (POS-style), foto bukti
  - [ ] Inventory (Retail only): Stock opname, lihat stok
  - [ ] POS (Retail only): Kasir interface
  - [ ] Profil
- [ ] 1.5.6 **Profile Page (All Roles)** — Detail, Change Password, Logout
- [ ] 1.5.7 **Notifications Page (All Roles)** — List with read/unread, types

### Phase 2: Transaksi & Buku Besar (Week 2-3)
- [ ] 2.1 API: `/api/transactions` (GET list + filter, POST create Draft, PATCH update, DELETE draft)
- [ ] 2.2 API: `/api/transactions/[id]/submit` (Draft → Submitted)
- [ ] 2.3 API: `/api/units/[id]/balance` (running balance real-time)
- [ ] 2.4 Form Transaksi (Client): Tanggal, Unit, Jenis, Metode, Kategori, Nominal, Keterangan, Foto (compress)
- [ ] 2.5 Daftar Transaksi (Server): Table + filter tanggal/unit/kategori/metode/status, pagination
- [ ] 2.6 Running balance: trigger Prisma `$transaction` saat approve → update `Unit.balance`
- [ ] 2.7 Upload foto: local `public/uploads` (dev) / Cloudinary (prod) — helper `src/lib/upload.ts`

### Phase 3: Approval Workflow (Week 3-4)
- [ ] 3.1 API: `/api/approvals` (GET pending per role, PATCH forward/approve/reject)
- [ ] 3.2 Halaman Persetujuan Manager: Review detail → Forward ke Pimpinan
- [ ] 3.3 Halaman Persetujuan Pimpinan: Approve/Reject + catatan → update saldo unit
- [ ] 3.4 AuditLog: helper `logAction()` + Prisma middleware auto-log pada model sensitif
- [ ] 3.5 Notification: Model + API + polling 30s + badge di TopAppBar + dropdown list

### Phase 4: Rekonsiliasi & Stor (Week 4)
- [ ] 4.1 API: `/api/reconciliations` (CRUD + validasi Pimpinan)
- [ ] 4.2 Form Stor: Physical cash input, digital balance auto-fetch, difference auto-calc
- [ ] 4.3 Halaman Rekonsiliasi Pimpinan: Daftar stor pending → Validasi/Approve
- [ ] 4.4 Status flow: Pending → Validated → Approved

### Phase 5: Retail Module — Inventori & POS (Week 5-6)
- [ ] 5.1 Inventory CRUD: SKU unique, harga beli/jual, satuan, minStock, foto
- [ ] 5.2 Stock Movement: IN (restock/PO) / OUT (penjualan/pakai) + Stock Opname
- [ ] 5.3 Low-stock badge: computed field `stock <= minStock` → badge di Dashboard
- [ ] 5.4 POS Kasir: Grid produk (touch-friendly), search/barcode, keranjang, hitung kembalian
- [ ] 5.5 POS Checkout: Create `PosSale` + `PosSaleItem` + `StockMovement OUT` + `Transaction Debit` (atomic)
- [ ] 5.6 Shift Kasir: Buka (opening cash) / Tutup (closing cash, difference, note)
- [ ] 5.7 Return/Refund: `PosSale.status = Refunded`, `refundOfId`, `StockMovement IN`, `Transaction Kredit`
- [ ] 5.8 Void: `PosSale.status = Void`, rollback stok + transaksi

### Phase 6: Supplier & Purchase Order (Week 6-7)
- [ ] 6.1 Supplier CRUD
- [ ] 6.2 Purchase Order: Pending → Received → Cancelled
- [ ] 6.3 PO Received: Atomic `StockMovement IN` + `Transaction Kredit` (pembelian stok)

### Phase 7: Laporan & Ekspor (Week 7-8)
- [ ] 7.1 API: `/api/reports` (daily/monthly per unit: income, expense, balance, top categories)
- [ ] 7.2 Charts: Recharts bar/line (pemasukan vs pengeluaran per unit, tren bulanan)
- [ ] 7.3 Export Excel: `xlsx` workbook multi-sheet (summary + detail)
- [ ] 7.4 Export PDF: `jsPDF-autotable` laporan formal dengan header/footer
- [ ] 7.5 Saved filters (ReportPreset) + drill-down modal detail transaksi

### Phase 8: Admin & Security (Week 8-9)
- [ ] 8.1 Tenant Settings: Nama, logo, warna, subdomain, activeModules
- [ ] 8.2 User Management: CRUD, assign role/unit, activate/deactivate, reset password
- [ ] 8.3 Password Reset: Forgot/Reset flow (email token, expiry 1 jam)
- [ ] 8.4 Session Management: List active sessions, revoke
- [ ] 8.5 Backup Endpoint: `GET /api/admin/backup` (Pimpinan only) → JSON dump / SQLite file
- [ ] 8.6 Audit Logs Viewer: Filter actor/action/entity/date, pagination (Pimpinan only)

### Phase 9: AI Assistant & WhatsApp (Week 9-10) — Post-MVP
- [ ] 9.1 LLM Service: Server-only client, read-only SELECT wrapper, audit log query
- [ ] 9.2 Chat UI: Conversation history, context-aware (tenant/unit/role)
- [ ] 9.3 n8n + WAHA webhook: `/api/webhook/whatsapp` (HMAC verify)
- [ ] 9.4 Command Parser: `!alba input <unit> <nominal> <ket>` → draft transaksi
- [ ] 9.5 Auto-report: Cron job harian/mingguan → LLM generate summary → WAHA broadcast

### Phase 10: PWA & Production Hardening (Week 10-11)
- [ ] 10.1 `next-pwa`: manifest.json, service worker, offline fallback
- [ ] 10.2 Offline Queue: Dexie/IndexedDB → queue mutations, background sync
- [ ] 10.3 Performance: Bundle analyzer, dynamic imports, image optimization
- [ ] 10.4 Security: CSP headers, API rate limit, Zod validation all inputs, HMAC webhook
- [ ] 10.5 Load Test: 50 concurrent, 100 tx/min, response <3s
- [ ] 10.6 Deploy Hostinger: Dockerfile, `.htaccess`, env vars, `prisma db push`, seed

### Phase 11: Documentation & Handover
- [ ] 11.1 README: Setup, env, scripts, architecture, deploy guide
- [ ] 11.2 API Docs: OpenAPI dari route handlers (Swagger UI)
- [ ] 11.3 User Guide per Role: Staff, Manager, Pimpinan (screenshots + langkah)
- [ ] 11.4 Runbook: Backup, restore, scaling, incident response, rollback

---

## Current Sprint Focus
**Phase 1.5: UI Pages — Login & Role-Based Views**

### Next Immediate Tasks (In Order)
1. **Pimpinan: Laporan page** — Grafik + export
2. **Pimpinan: Profil page** — Detail, change password, logout
3. **Notifications page** — List with read/unread, types
4. **Manager & Staff pages**

---

## Completed Phases
### Phase 0: Foundation & Setup ✅
- [x] 0.1 Init Next.js 15 + TypeScript
- [x] 0.2 Install deps (Prisma, Zod, Next, Tailwind, React, Lucide, Recharts, xlsx, jspdf, bcryptjs, browser-image-compression)
- [x] 0.3 Config: ESLint, `next.config.ts` (standalone), tsconfig
- [x] 0.4 Prisma schema (multi-tenant MySQL)
- [x] 0.5 Env validation (Zod)
- [x] 0.6 Git init + initial commit
- [x] 0.7 Globals.css (Inter + JetBrains Mono fonts)

### Phase 1.1: Core Infrastructure (partial) ✅
- [x] 1.1 Prisma Client singleton (`src/lib/db.ts`)
- [x] 1.3 Middleware skeleton (`src/middleware.ts`)
- [x] Core libs: `enums.ts`, `audit.ts`, `api-response.ts`, `utils.ts`

### Phase 1.2-1.6: Auth + Multi-Tenant Dashboard Structure ✅
- [x] NextAuth v5 dengan Credentials provider + JWT strategy
- [x] Prisma adapter + bcryptjs untuk password hashing
- [x] SQLite dev database (`file:./dev.db`) + `prisma.config.ts`
- [x] Seed data: 1 Tenant, 3 Units (Kantor, Kantin, Koperasi), 8 Users (Superadmin, Pimpinan, 3 Managers, 3 Staff), 16 Categories, 8 Inventory items
- [x] Multi-tenant routing: `/dashboard/tenant-selector` (Superadmin), `/dashboard/tenant/[tenantId]/beranda|transaksi|persetujuan|laporan|rekonsiliasi`
- [x] Dashboard layout dengan TopAppBar + BottomNav (5 menu)
- [x] Role-based redirect di `/dashboard/page.tsx`

### Phase 1.5.1: Fix Login Page (Responsive) ✅
- [x] Login page responsive dengan Material Design 3 colors
- [x] Password toggle visibility
- [x] Demo accounts click-to-fill
- [x] Error handling dengan shake animation
- [x] Google OAuth button placeholder
- [x] Background gradient decorations

### Phase 1.5.2: Superadmin Pages (Desktop View) ✅
- [x] Superadmin layout: Sidebar desktop + bottom nav mobile
- [x] Superadmin dashboard: Stat cards + tenant list
- [x] Tenants CRUD: List + edit/new page dengan form lengkap (info dasar, tema warna, module aktif, logo)
- [x] Units page: List unit per tenant
- [x] Managers/Staff/Pimpinan list pages
- [x] User creation/edit page (all roles)
- [x] API: `/api/superadmin/tenants`, `/api/superadmin/users`
- [x] Build sukses (`npx next build`)

### Phase 1.5.3: Tenant Dashboard Layout (Mobile-First Material Design 3) ✅
- [x] Updated `globals.css` dengan Material Design 3 color tokens (CSS variables)
- [x] Role-based bottom navigation (5 items untuk Pimpinan, 4 untuk Manager, 3 untuk Staff)
- [x] TopAppBar dengan tenant info, role badge, notifikasi, user menu
- [x] Safe area bottom support
- [x] Dynamic nav items per role
- [x] Build sukses

### Phase 1.5.3: Pimpinan Dashboard (Beranda) ✅
- [x] Total saldo card (prominent primary color)
- [x] Stat cards grid (pemasukan, pengeluaran, selisih, unit aktif)
- [x] Unit balances list (clickable, color-coded by type)
- [x] Quick actions grid (4 actions)
- [x] Recent transactions list (clickable rows, status badges)
- [x] Warning banners untuk pending approvals & low stock

### Phase 1.5.3: Pimpinan Transaksi Page ✅
- [x] Transaksi list dengan filter (unit, jenis, status, search)
- [x] Pagination-ready (take 50)
- [x] Create new transaksi page (form lengkap: unit, jenis, metode, kategori, nominal, tanggal, keterangan, foto)
- [x] Detail view placeholder
- [x] Export button placeholder

### Phase 1.5.3: Pimpinan Persetujuan Page ✅
- [x] Persetujuan list dengan filter (status, unit, search)
- [x] Stat cards (menunggu review, diajukan)
- [x] Approval cards dengan approve/reject actions
- [x] Detail page dengan riwayat persetujuan lengkap
- [x] Atomic transaction approval dengan update saldo unit

### Phase 1.5.3: Pimpinan Rekonsiliasi Page ✅
- [x] Rekonsiliasi list dengan filter (status, unit, search)
- [x] Stat cards (pending, tervalidasi, disetujui, total selisih)
- [x] Rekonsiliasi cards dengan detail fisik vs digital
- [x] Detail page dengan aksi validasi/approve/reject
- [x] New page dengan preview selisih fisik vs digital

---

## Legend
- `[ ]` = Belum dimulai
- `[~]` = In progress
- `[x]` = Selesai & verified
- `[!]` = Blocked / butuh keputusan

> **Recovery:** Buka file ini → cari `[~]` atau `[!]` terakhir → lanjutkan. `progress.md` berisi log sesi detail.