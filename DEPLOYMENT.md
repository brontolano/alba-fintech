# Deployment Notes — ALBA Finance

Catatan teknis deployment ke Hostinger hPanel Node.js.

## Prasyarat

- Hostinger hPanel dengan Node.js support (Node 20+)
- MySQL database created via hPanel → Databases → MySQL
- Domain/subdomain pointing ke application folder
- GitHub repo: `github.com/hamdansumedang/alba-fintech`

## Step 1: Import Database

1. Login hPanel → **Databases** → **phpMyAdmin**
2. Pilih database (`u826712707_alba`)
3. Import secara berurutan:
   - `prisma/migrations/20260815000000_mysql_initial_schema.sql`
   - `prisma/migrations/20260817000000_add_unit_table.sql`

## Step 2: Set Environment Variables

hPanel → **Node.js** → **Environment Variables**:

```env
DATABASE_URL=mysql://u826712707_alba:PASSWORD@127.0.0.1:3306/u826712707_alba
NEXTAUTH_URL=https://alba.brontolano.com
NEXTAUTH_SECRET=GENERATE_VIA_openssl_rand_base64_32
LLM_API_URL=https://openrouter.ai/api/v1/chat/completions
LLM_API_KEY=sk-or-v1-XXXXXXXX
LLM_MODEL=meta-llama/llama-3.1-8b-instruct:free
NODE_ENV=production
```

> ⚠️ `NEXTAUTH_SECRET` wajib random base64 32 byte.
> Generate: `openssl rand -base64 32`
> **JANGAN** pakai string pendek/lemah.

## Step 3: Setup Node.js App

| Setting | Value |
|---------|-------|
| Application Root | `alba-fintech` |
| Node.js Version | 20 |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |

## Step 4: Deploy via Git

1. Push code ke `main` branch di GitHub
2. hPanel → Node.js App → **Deploy from Git**
3. Connect repo: `github.com/hamdansumedang/alba-fintech`
4. Branch: `main`
5. Auto-deploy: ON → setiap push ke `main` akan trigger build+deploy

## Step 5: Restart & Verify

1. Klik **Restart** di hPanel Node.js App
2. Buka `https://alba.brontolano.com/login`
3. Login: `admin@brontolano.com` / `bismillah`
4. Pastikan redirect ke `/dashboard/superadmin`

## Troubleshooting

### Build gagal: `prisma generate` EPERM
Hentikan semua process `node.exe` di hPanel → retry.

### Database connection refused
- Pastikan `DATABASE_URL` pakai `127.0.0.1` (bukan `localhost`)
- Cek password database di hPanel → Databases → MySQL

### NEXTAUTH_SECRET error
- Pastikan value random base64 32 byte
- Jangan pakai string pendek atau kata-kata

### AI Assistant tidak respond
- `LLM_API_KEY` kosong → fallback ke rule-based response
- Isi dengan OpenRouter API key untuk LLM penuh

### Middleware deprecation warning
Next.js 16 mengganti `middleware.ts` → `proxy.ts`. Tidak breaking, masih berfungsi.
Migrate dengan: `npx @next/codemod@canary middleware-to-proxy .`
