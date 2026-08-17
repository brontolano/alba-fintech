# Contributing ke ALBA Finance

Terima kasih sudah tertarik berkontribusi! Dokumen ini menjelaskan standar kontribusi untuk project ini.

## Development Setup

```bash
# 1. Clone repo
git clone https://github.com/hamdansumedang/alba-fintech.git
cd alba-fintech

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
cp .env.example .env.production
# Edit kedua file dengan kredensial lokal kamu

# 4. Setup database lokal (MySQL 8+)
#    - Buat database kosong di MySQL lokal
#    - Jalankan migration SQL:
mysql -u root -p alba_finance < prisma/migrations/20260815000000_mysql_initial_schema.sql
mysql -u root -p alba_fintech < prisma/migrations/20260817000000_add_unit_table.sql

# 5. Generate Prisma client + seed
npm run db:seed

# 6. Run dev server
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`.

## Branch Naming Convention

- `feat/<scope>` — fitur baru (`feat/superadmin-crud`)
- `fix/<scope>` — bug fix (`fix/users-auth-bug`)
- `chore/<scope>` — pemeliharaan (`chore/update-deps`)
- `docs/<scope>` — dokumentasi (`docs/readme-rapi`)
- `refactor/<scope>` — refactor tanpa perubahan perilaku

## Commit Message Convention

Format: `<type>(<scope>): <subject>`

Tipe yang dipakai:
- `feat` — fitur baru
- `fix` — bug fix
- `chore` — task maintenance
- `docs` — dokumentasi
- `refactor` — refactor kode
- `test` — tambah/perbaiki test
- `style` — perubahan formatting
- `perf` — performance improvement

Contoh:
```
feat(superadmin): add unit CRUD page
fix(auth): allow superadmin in users management
docs: rewrite README for clarity
```

## Pull Request

1. Buat branch dari `main`
2. Push branch → buka PR ke `main`
3. Pastikan build lulus: `npm run build`
4. Pastikan tidak ada lint error: `npm run lint`
5. Tunggu review minimal 1 approver

## Coding Standards

- TypeScript strict mode aktif
- 2-space indentation
- Tailwind untuk styling (utility-first)
- Prisma untuk DB access — **JANGAN** pakai raw SQL
- Server Components by default, Client Components hanya saat perlu interaktivitas
- API routes di `/api/*` pakai pattern `route.ts`
- Komentar & dokumentasi dalam Bahasa Indonesia

## Struktur Folder

```
src/
  app/        # Next.js App Router (pages + API)
    api/      # Route handlers (GET/POST/PATCH/DELETE)
    ...       # Halaman sesuai route URL
  components/ # React components reusable
    ui/       # Shadcn UI primitives
  lib/        # Utility/helper (prisma, guards, audit, enums)
  types/      # TypeScript type definitions
  middleware.ts # Next.js middleware (auth/RBAC)
prisma/
  schema.prisma
  seed.ts
  migrations/
public/       # Static assets
docs/         # Dokumentasi (PRD, deployment, dll)
```

## Kontak

Hubungi maintainer melalui GitHub Issues untuk pertanyaan seputar kontribusi.
