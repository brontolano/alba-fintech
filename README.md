# ALBA Keuangan

Aplikasi manajemen keuangan multi-unit (Kantor, Kantin, Koperasi) dengan approval workflow, inventori & POS retail, serta asisten AI.

## Fitur Utama

### Peran & Akses
- **Pimpinan** — Dashboard eksekutif lintas unit, approve final, brand settings, manajemen user
- **Manager** — Dashboard unit, review & approve transaksi staff, akses inventori/POS jika retail aktif
- **Staff** — Input transaksi, lihat status approval, akses Kasir & Inventori via shortcut dashboard

### Modul
- **Transaksi** — Pencatatan debit/kredit dengan kategori, unit, bukti
- **Persetujuan** — Alur: Staff → Manager → Pimpinan (multi-level approval)
- **Laporan** — Filter per unit/periode, export Excel/PDF
- **Rekonsiliasi** — Pencocokan antar unit
- **Inventori** — CRUD produk, harga beli/jual, stok, min-stok alert, kategori, gambar
- **POS / Kasir** — Penjualan cepat, keranjang, checkout, otomatis kurangi stok
- **Stock Movement** — Stok masuk/keluar manual
- **Stock Opname** — Perhitungan fisik vs sistem
- **Asisten AI** — Chat rule-based + LLM-ready (OpenAI), akses cepat di dashboard
- **Brand Settings** — Pimpinan ubah nama aplikasi & logo

### Retail Module Gate
- `canUseRetail(role, unit, enabled)` — 3-arg helper, hanya tampil di dashboard shortcut jika true
- Bottom nav tetap 5 item fixed (Beranda, Transaksi, Persetujuan, Laporan, Rekonsiliasi)

## Tech Stack
- Next.js 14 (App Router, Server Components)
- Prisma ORM + PostgreSQL
- NextAuth.js (credentials + role)
- Tailwind CSS
- TypeScript
- Lucide React icons

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Push schema / run migrations
npx prisma db push --accept-data-loss
# atau: npx prisma migrate deploy

# 4. Seed data (SystemConfig + Category)
npx tsx prisma/seed.ts

# 5. Run dev server
npm run dev
```

## Environment Variables

Buat file `.env`:

```env
DATABASE_URL="postgresql://user:pass@host:5432/db"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."  # optional, untuk AI Assistant LLM mode
```

## Project Structure

```
src/
├── app/
│   ├── api/              # API routes (REST)
│   ├── dashboard/        # Dashboard per role
│   ├── inventory/        # Inventori page
│   ├── pos/              # POS/Kasir page
│   ├── ai/assistant/     # AI Assistant page + API
│   ├── profile/          # Profile + Brand settings
│   ├── transactions/     # Transaksi CRUD
│   ├── approvals/        # Approval queue
│   ├── reports/          # Laporan
│   ├── reconciliations/  # Rekonsiliasi
│   └── users/            # Manajemen user (Pimpinan/Manager)
├── components/
│   ├── BottomNav.tsx     # 5-item fixed bottom navigation
│   ├── RetailShortcuts.tsx # Kasir & Inventori shortcut cards
│   ├── BrandProvider.tsx # React Context untuk brand config
│   └── BrandedLayout.tsx # Global header + bottom nav wrapper
├── lib/
│   ├── enums.ts          # Role, Unit, canUseRetail helper
│   ├── prisma.ts         # Prisma singleton
│   └── image-compress.ts # Client-side image compress
└── middleware.ts         # Auth guard
```

## Database Models (Prisma)
- `User` — role, unit, unitType, retailModuleEnabled
- `Transaction` — type, category, amount, status, approval chain
- `InventoryItem` — buyPrice, sellPrice, stock, minStock, unit, image
- `StockMovement` — IN/OUT, quantity, note
- `StockOpname` — counted vs system variance
- `SystemConfig` — appName, appLogo
- `Category` — transaksi & inventori categories

## Deployment Notes
- `npm run build` → 31 routes, TypeScript clean, 0 lint errors
- DB: `npx prisma migrate deploy` di production
- Set `NEXTAUTH_URL` ke domain production
- `OPENAI_API_KEY` opsional; tanpa itu AI pakai rule-based fallback

## License
MIT
