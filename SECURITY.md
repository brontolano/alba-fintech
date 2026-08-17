# Security Policy

## Supported Versions

Hanya versi terbaru di branch `main` yang mendapat security update.

| Version | Supported |
|---------|-----------|
| main    | ✅        |

## Reporting a Vulnerability

Jika menemukan kerentanan keamanan, **JANGAN** buka public issue.

Kirim email ke: **security@brontolano.com** (atau buka private GitHub Security Advisory).

Kami akan:
1. Konfirmasi penerimaan dalam 24 jam
2. Investigasi dalam 72 jam
3. Rilis patch jika valid (target < 7 hari)

## Security Best Practices untuk Contributor

- Jangan commit secret/token/API key ke repo
- Gunakan `.env.example` sebagai template, bukan file nyata
- Selalu validasi & sanitasi input di API routes
- Gunakan Prisma parameterized queries (bukan raw SQL)
- RBAC wajib di middleware & API (lihat `src/middleware.ts`, `src/lib/guards.ts`)
- Password hash: bcryptjs (cost 12)
- Session: NextAuth JWT + secure cookies

## Scope

- Authentication & Authorization (NextAuth v4)
- Database (MySQL via Prisma)
- API Routes (`/api/*`)
- Client-side secrets (hanya NEXT_PUBLIC_* yang expose ke browser)

## Out of Scope

- Infrastructure security (Hostinger hPanel, MySQL server)
- Third-party services (OpenRouter, email provider)
- Browser/OS vulnerabilities