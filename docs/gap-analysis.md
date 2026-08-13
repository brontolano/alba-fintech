# Analisis Gap: ALBA Finance vs Standar Aplikasi Keuangan + Retail

## 1. Matriks Fitur Existing vs Standar

| Modul | Standar Produksi | ALBA Finance | Keterangan |
|---|---|---|---|
| Multi-role + unit | Wajib | ✅ | Pimpinan/Manager/Staff, multi-unit |
| Approval workflow | Wajib | ✅ | Staff → Manager → Pimpinan |
| Transaksi debit/kredit | Wajib | ✅ | + bukti foto |
| Inventori (stok, harga) | Wajib | ✅ | + movement + opname |
| POS/Kasir + checkout | Wajib | ✅ | + auto-kurangi stok |
| Laporan + export Excel/PDF | Wajib | ✅ | Ada export, perlu depth |
| Rekonsiliasi antar unit | Wajib | ✅ | Pimpinan only |
| Brand settings | Wajib | ✅ | Nama aplikasi + logo |
| AI assistant |Opsional | ✅ | Rule-based + OpenAI fallback |
| Audit trail | Wajib | ⚠️ | Hanya createdAt/updatedAt |
| Notifikasi push/email | Wajib | ❌ | Belum ada |
| Password reset / 2FA | Wajib | ❌ | Belum ada |
| Supplier + PO | Wajib | ❌ | Belum ada |
| Return/refund POS | Wajib | ❌ | Belum ada |
| Backup/export DB | Wajib | ❌ | Belum ada |
| PWA/offline-ready | Wajib | ❌ | Belum ada |

## 2. Daftar Gap + Prioritas

### High
1. Audit trail untuk aksi sensitif (approval, config, stock adjustment, user creation)
2. Notifikasi in-app + email untuk approval, stok kritis, transaksi pending
3. Password reset flow + session management
4. Return/refund di POS + void transaction

### Medium
5. Supplier management + Purchase Order (PO)
6. Laporan lanjutan: saved filters, drill-down, export scheduled
7. Backup/export database untuk Pimpinan
8. Mobile UX polish + PWA manifest

### Low
9. Batch/expiry tracking untuk inventori
10. Integrasi payment gateway
11. Multi-language/i18n

## 3. Rekomendasi Adaptasi

### 3.1 Audit Trail
- Tambah model `AuditLog` di Prisma: `actorId`, `action`, `entity`, `entityId`, `metadata`, `ip`, `userAgent`, `createdAt`
- Tambah API `POST /api/audit-logs` + helper `logAction()` di server components/route handlers
- Tambah halaman `/audit-logs` (Pimpinan only)

### 3.2 Notifikasi
- Model `Notification`: `userId`, `title`, `message`, `type`, `read`, `createdAt`
- Real-time via polling atau SSE ringan; fallback email via nodemailer jika dibutuhkan
- Badge di TopAppBar + list notifikasi

### 3.3 Auth Security
- `/forgot-password` + `/reset-password` pages + API
- Session management page untuk user login aktif
- Rate limiting pada login

### 3.4 POS Enhancements
- Tambah `refund` dan `void` pada `PosSale`
- Tambah shift/cashier session di `PosSale`

### 3.5 Supplier + PO
- Model `Supplier` + `PurchaseOrder` + `PurchaseOrderItem`
- Hubungkan ke `StockMovement` (IN)

### 3.6 Backup
- Endpoint `GET /api/admin/backup` export SQLite/JSON
- Pimpinan only

## 4. Urutan Implementasi

1. Audit trail + helper logAction (fondasi keamanan)
2. Notifikasi in-app (paling berdampak UX)
3. Password reset + session management
4. POS return/void
5. Supplier + PO
6. Laporan lanjutan
7. Backup export
8. PWA + polish

---
*Catatan: Analisis ini disusun berdasarkan praktik umum ERP/retail SaaS (Odoo, ERPNext, Shopify POS) dan arsitektur aplikasi keuangan multi-user standar. Tanpa akses internet langsung saat ini, referensi spesifik URL tidak terlampir.*
