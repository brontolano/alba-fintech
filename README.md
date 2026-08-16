# ALBA Finance

Aplikasi manajemen keuangan multi-unit organisasi (Kantor, Kantin, Koperasi).

## Fitur Utama
- **Dashboard Multi-Role**: Pimpinan, Manager, Staff.
- **Manajemen Transaksi**: Pencatatan debit/kredit dengan approval workflow.
- **Reconciliation**: Verifikasi setoran fisik vs sistem.
- **Retail POS & Inventory**: Kasir shift, manajemen stok, dan purchase orders.
- **AI Assistant**: Chat bot kontekstual (OpenRouter/OpenAI).
- **Audit Logs**: Tracking aktivitas user untuk keamanan.
- **PWA Ready**: Installable di mobile/desktop.

## Tech Stack
- Next.js 16 (App Router)
- Prisma ORM + MySQL
- NextAuth.js
- Tailwind CSS v4 + Shadcn UI

## Panduan Deploy (Hostinger hPanel)

### 1. Database
Import file SQL berikut melalui phpMyAdmin:
`prisma/migrations/20260815000000_mysql_initial_schema.sql`

### 2. Konfigurasi Environment
Set variabel berikut di hPanel Node.js App:
- `DATABASE_URL`: `mysql://user:pass@127.0.0.1:3306/db_name`
- `NEXTAUTH_URL`: `https://alba.brontolano.com`
- `NEXTAUTH_SECRET`: [Gunakan string acak panjang]
- `LLM_API_KEY`: [API Key OpenRouter/OpenAI]

### 3. Jalankan Aplikasi
1. Klik **Restart** di hPanel Node.js App.
2. Login Default: `admin@brontolano.com` / `bismillah`

## Lisensi
Private - ALBA Finance Team
