# Findings — ALBA-APPS Rebuild Research

**Source:** Analisis projek lama `alba-fintech` + dokumen PRD/GAP + Hostinger deploy requirements
**Updated:** 2026-08-19 (initial)

---

## 1. Codebase Audit (alba-fintech)

### Tech Stack Existing
| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Next.js | 16.3.0 | App Router, React 19 |
| Database | Prisma + MySQL | 5.22.0 | Multi-tenant schema sudah lengkap |
| Auth | NextAuth.js | 4.24.15 | Credentials + JWT, butuh upgrade v5 |
| UI | Tailwind CSS v4 + shadcn/ui | 4.x / 4.16.2 | Soft UI Evolution theme |
| Icons | Lucide React | 1.30.0 | Konsisten |
| Charts | Recharts | 3.10.1 | Bar/line charts |
| Export | xlsx + jsPDF-autotable | 0.18.5 / 5.0.8 | Excel & PDF |
| PWA | @ducanh2912/next-pwa | 10.2.9 | Belum dikonfigurasi penuh |
| Image Compress | browser-image-compression | 2.0.2 | <500KB target |
| Dates | date-fns | 4.4.0 | |

### What Works (Reusable)
- ✅ Prisma schema: multi-tenant, transactions, approvals, reconciliations, inventory, POS, audit logs, notifications, staff requests, suppliers, PO, shifts
- ✅ Role-based access: Superadmin, Pimpinan, Manager, Staff dengan unit scoping
- ✅ Unit types: Sederhana (Kantor) vs Retail (Kantin/Koperasi) — `retailEnabled` flag
- ✅ Transaction workflow: Draft → Submitted → Pending → Approved/Rejected
- ✅ Approval multi-level: Manager → Pimpinan
- ✅ POS dengan auto-stock deduction + shift kasir
- ✅ Running balance per unit (decimal 18,2)
- ✅ Category management per unit/tenant
- ✅ Photo upload + compression (browser-image-compression)

### What's Missing / Broken (Gap Analysis)
| Area | Gap | Priority |
|------|-----|----------|
| Auth Security | No password reset, no 2FA, no session management, no rate limiting login | High |
| Notifications | Model ada tapi tidak ada UI/real-time (polling/SSE) | High |
| Audit Trail | Model `AuditLog` ada tapi helper `logAction()` tidak dipakai di route handlers | High |
| PWA/Offline | `next-pwa` terinstall tapi tidak dikonfigurasi; no offline queue IndexedDB | High |
| POS Returns | `refundOfId` + `void` status ada di schema tapi UI/logic belum | High |
| Supplier/PO | Schema lengkap tapi tidak ada UI/API | Medium |
| Reports Depth | Export basic ada, tapi no saved filters, drill-down, scheduled export | Medium |
| Backup/Export | No endpoint `/api/admin/backup` | Medium |
| AI/WA Integration | Schema siap (`ai_conversations`, `whatsapp_webhooks`, `transaction_drafts`) tapi zero implementation | Low (Post-MVP) |

### Code Quality Issues
- NextAuth v4 (legacy) — migrasi ke v5 diperlukan
- No Zod validation pada API routes (trust boundary validation missing)
- No centralized error handling / API response wrapper
- Middleware auth basic, butuh RBAC guard yang lebih eksplisit
- TypeScript `any` masih ditemukan di beberapa handler
- No unit/integration tests

---

## 2. Architecture Decisions (from PRD + Hostinger Constraints)

### Multi-Tenant Strategy
- **Tenant** = root entity (Pesantren/Organisasi)
- **Superadmin** (tenantId=null) manages all tenants
- **Units** per tenant: Kantor (Sederhana), Kantin (Retail), Koperasi (Retail)
- **Active Modules** per tenant: `transactions,reconciliation,retail,ai,inventory` (comma-separated)

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
- Draft: Staff bisa edit/hapus
- Submitted: Locked, menunggu Manager
- Pending: Manager review → forward ke Pimpinan
- Approved: Update saldo unit, immutable
- Rejected: Kembali ke Staff dengan catatan

### Running Balance Calculation
- **Approach:** Prisma `$transaction` saat approve → update `Unit.balance`
- **Formula:** `balance = SUM(Debit) - SUM(Kredit)` WHERE status=Approved per unit
- **Concurrency:** Row-level lock via `SELECT ... FOR UPDATE` dalam transaction

### Offline-First (PWA)
- **Target:** 7 hari offline
- **Storage:** IndexedDB (Dexie.js) untuk queue transaksi + foto (base64/compressed)
- **Sync Strategy:** Background Sync API + manual "Sync Now" button
- **Conflict Resolution:** Last-write-wins dengan timestamp server; foto re-upload

### Hostinger Deployment Constraints
| Constraint | Solution |
|------------|----------|
| Node.js App hanya support `output: 'standalone'` | `next.config.ts` → `output: 'standalone'` |
| No Image Optimization server | `images.unoptimized: true` |
| Port dynamic via `process.env.PORT` | `next start -p $PORT` di package.json |
| Shared hosting: No WebSocket | Notifikasi pakai polling 30s (bukan SSE) |
| Memory limit build ~512MB | `NODE_OPTIONS="--max-old-space-size=512" npm run build` |
| `public/` tidak ter-copy ke standalone | `postbuild: "cp -r public .next/standalone/"` |
| MySQL host = `localhost` (same container) | `DATABASE_URL="mysql://user:pass@localhost:3306/dbname"` |

---

## 3. Database Schema Insights (from alba-fintech/prisma/schema.prisma)

### Key Models
- **Tenant** — white-label root, subdomain, custom domain, activeModules
- **User** — role, unitId, tenantId (null=superadmin)
- **Unit** — type: `Sederhana` | `Retail`, retailEnabled boolean, balance decimal
- **Transaction** — status enum, photoUrl, approvedById, approvedAt
- **Approval** — level (Manager/Pimpinan), status, notes
- **Reconciliation** — physicalCash vs digitalBalance, difference auto-calc
- **InventoryItem** — SKU unique, buyPrice/sellPrice, minStock, unitOfMeasure
- **StockMovement** — IN/OUT, linked to InventoryItem
- **StockOpname** — physicalStock vs system, difference
- **PosSale** — status (Completed/Refunded/Void), refundOfId self-ref, shiftId
- **CashierShift** — opening/closing cash, cashDifference
- **Supplier** — contact info
- **PurchaseOrder** — status (Pending/Received/Cancelled), items
- **AuditLog** — actorId, action, entity, entityId, metadata(JSON), ip, userAgent
- **Notification** — userId, type, read, title, message
- **StaffRequest** — title, amount, status (budget request flow)

### Indexes Defined
- Tenant+Unit composite indexes pada transaksi, reconciliation, inventory
- Tenant+Status indexes untuk filtering cepat
- Unique constraints: Tenant+Unit name, Tenant+Category name+type, SKU global

---

## 4. UI/UX Requirements (from PRD + IMPLEMENTATION_PLAN)

### Design System
- **Primary:** Navy `#1E3A5F`
- **Income/Success:** Emerald `#10B981`
- **Expense/Danger:** Rose `#EF4444`
- **Warning/Pending:** Amber `#F59E0B`
- **Typography:** Inter (body), JetBrains Mono (nominal/angka — tabular-nums)
- **Style:** Soft UI Evolution — card-based, subtle shadows, dimensional layering
- **Mobile-first:** Bottom Navigation 5 tabs, responsive breakpoints

### Navigation (Bottom Nav — 5 Menu)
1. **Beranda** — Dashboard per role
2. **Transaksi** — Input + Daftar (filter, search)
3. **Persetujuan** — Approval workflow (Manager/Pimpinan)
4. **Laporan** — Ekspor + Analisis (grafik)
5. **Rekonsiliasi** — Stor & Validasi

### Dashboards per Role
| Role | Key Components |
|------|----------------|
| Pimpinan | Saldo gabungan 3 unit, grafik performa, pending approval count |
| Manager | Stok kritis (retail), pengajuan anggaran, transaksi hari ini |
| Staff | POS-style input cepat, status dokumen (Draft/Submitted/Approved) |

---

## 5. Integration Points (External)

### LLM (AI Assistant) — Post-MVP
- **Endpoint:** OpenAI-compatible custom (`https://9router-dk0n.srv1167690.hstgr.cloud/v1`)
- **Model:** `Hamdan-MAX`
- **Auth:** `LLM_API_KEY` env var
- **Access Pattern:** Server-side only (Next.js API routes), read-only SELECT
- **Security:** No write operations via LLM; audit trail untuk semua query

### WhatsApp (n8n + WAHA) — Post-MVP
- **Platform:** Self-hosted VPS (separate dari Hostinger)
- **Webhook:** `https://webhook.albaapps.id/webhook` (HTTPS)
- **Credentials:** n8n configured dengan LLM endpoint + WAHA connection
- **Workflow:** `workflow-1` (belum lengkap)
- **Target Group:** "Keuangan Al-Basyariyyah" (Pimpinan + 3 Manager)
- **Command Prefix:** `!alba` atau `/alba`
- **Flows:**
  - App → WA: Request → LLM generate → n8n → WAHA → Broadcast
  - WA → App: `!alba input Kantin 250rb jualan snack` → Parse LLM → Draft → Konfirmasi → Approve

### File Storage
- **Dev:** Local filesystem (`public/uploads`)
- **Prod:** Cloudinary (signed upload, auto-compress, transformation) — optional, bisa local dulu

---

## 6. Open Questions / Decisions Needed

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | Rate limiting: Upstash Redis vs in-memory? | Upstash (persistent) / In-memory (simple) | **In-memory dulu** — Hostinger shared hosting tidak support Redis mudah; upgrade nanti |
| 2 | Session store: NextAuth JWT (stateless) vs Database? | JWT / Database (Prisma adapter) | **JWT stateless** — simpler, no DB session table needed |
| 3 | Email provider untuk password reset? | Resend / SendGrid / Nodemailer (SMTP Hostinger) | **Nodemailer + Hostinger SMTP** — free, built-in |
| 4 | Cloudinary untuk foto bukti? | Ya / Tidak (local only) | **Tidak dulu** — local `public/uploads` cukup untuk MVP; Cloudinary nanti |
| 5 | Background Sync API browser support? | Ya (Chrome/Edge) / Tidak (Safari limited) | **Manual "Sync Now" button** sebagai fallback utama |
| 6 | Testing: Vitest + Playwright di CI GitHub Actions? | Ya / Tidak | **Ya** — GitHub Actions free tier cukup untuk unit + e2e smoke test |

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| NextAuth v5 breaking changes | Medium | High | Pin version, test auth flow thoroughly, have fallback to v4 |
| PWA offline sync conflicts | Medium | High | Timestamp-based conflict resolution, manual review for conflicts |
| MySQL enum handling (Prisma strings) | Low | Medium | Enforce via TS unions in `src/lib/enums.ts`, DB constraints via CHECK |
| Multi-tenant data leakage | Low | Critical | RLS via Prisma middleware + middleware.ts RBAC, audit logs |
| Hostinger cold start / memory limit | Medium | Medium | Optimize bundle, `output: standalone`, upgrade plan jika perlu |
| WAHA/n8n webhook downtime | Medium | Medium | Retry queue, dead letter logging, health check endpoint |
| Bundle size (shadcn + recharts + pdf) | Medium | Medium | Dynamic imports, code splitting, analyze with `@next/bundle-analyzer` |

---

## 8. Reusable Assets from Old Project

### Files to Port/Adapt
- `prisma/schema.prisma` → **baseline untuk schema baru** (sudah comprehensive)
- `src/lib/enums.ts` (jika ada) → type-safe enums untuk status, roles, unit types
- `src/components/ui/*` (shadcn components) → **copy seluruhnya**
- `src/app/(dashboard)/transactions/*` → logic transaksi + form
- `src/app/(dashboard)/approvals/*` → approval workflow UI
- `src/app/(dashboard)/reconciliations/*` → stor/validasi UI
- `src/app/(dashboard)/inventory/*` & `pos/*` → retail module
- `src/app/(dashboard)/reports/*` → export logic (xlsx, pdf)
- `src/middleware.ts` → RBAC guard baseline
- `tailwind.config.ts` + `globals.css` → design system tokens
- `prisma/seed.ts` → data seeding untuk dev/test

### Files to Discard/Rewrite
- `src/app/api/auth/[...nextauth]/route.ts` → **rewrite untuk NextAuth v5**
- All API routes without Zod validation → **rewrite dengan validation layer**
- `next.config.ts` (PWA config incomplete) → **reconfigure next-pwa properly**
- Any `any` typed handlers → **strict TypeScript**

---

## 9. Next Steps (Immediate)

1. **Initialize new repo** di `Alba-WebApps` dengan Next.js 15 + TypeScript strict
2. **Copy Prisma schema** dari projek lama, adjust untuk MySQL/SQLite dual
3. **Setup shadcn/ui** dengan theme tokens (Navy/Emerald/Rose/Amber)
4. **Implement NextAuth v5** dengan Credentials + JWT + RBAC middleware
5. **Build Transaction CRUD** sebagai vertical slice pertama (end-to-end)
6. **Configure PWA** (manifest, service worker, offline queue skeleton)

---

> **Update log:** Tambahkan findings baru di sini seiring development. Format: `### YYYY-MM-DD: [Topic]` + bullet points.