# Changelog

Semua perubahan penting pada project ini akan didokumentasikan di sini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/),
dan project ini adhere ke [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Added
- Halaman Superadmin (`/dashboard/superadmin`) — full CRUD Unit + User + grouping Manager → Staff
- API `/api/units` (GET, POST) + `/api/units/[id]` (PATCH, DELETE)
- API `/api/users/[id]` (PATCH, DELETE)
- Model `Unit` di Prisma schema + migration SQL patch
- File standar GitHub: LICENSE, CONTRIBUTING, SECURITY
- `.env.example` template
- `.gitignore` lengkap (IDE, OS, env, build cache, AI tooling pribadi)
- README modern dengan badge + section lengkap

### Changed
- Redirect Superadmin di `/dashboard/page.tsx` (sebelumnya hanya Manager/Staff)
- README.md ditulis ulang total

### Removed
- Tooling pribadi dari tracked: `.agents/`, `.claude/`, `.windsurf/`, `skills-lock.json`, `CLAUDE.md`, `AGENTS.md`, `components.json`
- Cache build: `.next/`, `tsconfig.tsbuildinfo`

## [0.1.0] - 2026-08-17

### Added
- Dashboard Multi-Role (Superadmin, Pimpinan, Manager, Staff)
- Modul Transaksi + Approval workflow
- Modul Reconciliation (setoran fisik vs sistem)
- Modul Retail: POS, Inventory, Purchase Orders
- AI Assistant chating (OpenRouter compatible, dengan fallback rule-based)
- Audit Logs
- PWA ready (@ducanh2912/next-pwa)
- Auth NextAuth.js v4 + bcryptjs
- Database MySQL via Prisma v5.22.0

### Tech Stack
- Next.js 16.3.0 (App Router, Turbopack)
- React 19.2.8
- Tailwind CSS v4
- Prisma ORM v5.22.0 + MySQL
- NextAuth v4.24.15
- bcryptjs v3.0.3
- @ducanh2912/next-pwa v10.2.9
- Lucide React (icons)
- Recharts (charts)

[Unreleased]: https://github.com/hamdansumedang/alba-fintech/compare/main...HEAD
[0.1.0]: https://github.com/hamdansumedang/alba-fintech/releases/tag/v0.1.0
