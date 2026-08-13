# Analisis Fitur: ALBA Finance vs Standar Produksi

## 1) Matriks Perbandingan Fitur

| Fitur | Standar Produksi | ALBA Finance | Catatan |
|---|---|---|---|
| Multi-role + unit | Wajib | ✅ | Pimpinan / Manager / Staff, multi-unit (Kantor, Kantin, Koperasi) |
| Approval workflow | Wajib | ✅ | Staff → Manager → Pimpinan |
| Transaksi debit/kredit | Wajib | ✅ | + foto bukti |
| Inventori (stok, harga, min-stok) | Wajib | ✅ | + movement + opname |
| POS/Kasir + checkout | Wajib | ✅ | + auto-kurangi stok |
| Laporan + export Excel/PDF | Wajib | ✅ | Ada export, perlu depth |
| Rekonsiliasi antar unit | Wajib | ✅ | Pimpinan only |
| Brand settings | Wajib | ✅ | Nama aplikasi + logo |
| AI assistant | Opsional | ✅ | Rule-based + OpenAI-ready |
| Audit trail lengkap | Wajib | ⚠️ | Hanya createdAt / updatedAt |
| Notifikasi in-app/email | Wajib | ❌ | Belum ada |
| Password reset + 2FA | Wajib | ❌ | Belum ada |
| Supplier + Purchase Order | Wajib | ❌ | Belum ada |
| Return/refund POS + void | Wajib | ❌ | Belum ada |
| Backup/export database | Wajib | ❌ | Belum ada |
| PWA/offline-ready | Wajib | ❌ | Belum ada |
| Shift/cashier session | Standar | ❌ | Belum ada |
| Saved filters + drill-down laporan | Standar | ⚠️ | Partial (filter dasar ada) |
| Scheduled export | Standar | ❌ | Belum ada |
| Batch/expiry tracking | Standar | ❌ | Belum ada |
| Payment gateway | Opsional | ❌ | Belum ada |
| Multi-language/i18n | Opsional | ❌ | Belum ada |
| Session management | Wajib | ❌ | Belum ada |
| Rate limiting login | Wajib | ❌ | Belum ada |

## 2) Daftar Gap + Prioritas

### High
1. Audit trail untuk aksi sensitif (approval, config, stock adjustment, user creation)
2. Notifikasi in-app + email untuk approval, stok kritis, transaksi pending
3. Password reset flow + session management + rate limiting
4. Return/refund di POS + void transaction

### Medium
5. Supplier management + Purchase Order (PO)
6. Laporan lanjutan: saved filters, drill-down, export scheduled
7. Backup/export database untuk Pimpinan
8. Mobile UX polish + PWA manifest + offline queue

### Low
9. Batch/expiry tracking untuk inventori
10. Payment gateway
11. Multi-language/i18n

## 3) Rekomendasi Adaptasi untuk ALBA Finance

### 3.1 Audit Trail
- Tambah model `AuditLog` (actorId, action, entity, entityId, metadata, ip, userAgent, createdAt)
- Tambah helper `logAction()` yang dipanggil di route handler sensitif
- Tambah halaman `/audit-logs` (Pimpinan only)

### 3.2 Notifikasi
- Model `Notification` (userId, title, message, type, read, createdAt)
- Polling ringan setiap 30 detik atau SSE jika perlu
- Badge notifikasi di layout + dropdown list

### 3.3 Auth Security
- Halaman `/forgot-password` + `/reset-password`
- Tabel `Session` atau pakai NextAuth session DB untuk revoke
- Rate limiting login via middleware atau sederhana dengan Redis/upstash (opsional; bisa mulai dengan in-memory)

### 3.4 POS Enhancements
- Tambah kolom `refundOfId` + `void` pada `PosSale`
- Tambah `shiftId` + `openedAt/closedAt` untuk sesi kasir

### 3.5 Supplier + PO
- Model `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`
- `StockMovement` type IN bisa refer ke PO

### 3.6 Laporan Lanjutan
- Simpan preset filter user ke `ReportPreset`
- Drill-down via query param + modal detail
- Scheduled export via cron ringan atau endpoint on-demand

### 3.7 Backup/Export
- Endpoint `GET /api/admin/backup` (Pimpinan only)
- Export SQLite file / JSON dump, untuk Postgres bisa pg_dump

### 3.8 PWA + Offline
- `manifest.json` + service worker dasar (`next-pwa` atau custom)
- Queue transaksi offline di IndexedDB, sync saat online

## 4) Urutan Implementasi

1. Audit trail + `logAction()` helper (fondasi keamanan)
2. Notifikasi in-app (paling berdampak UX)
3. Password reset + session management + rate limiting
4. POS return/void + shift session
5. Supplier + Purchase Order
6. Laporan lanjutan (saved filters + drill-down + scheduled export)
7. Backup/export database
8. PWA + offline queue + polish

---

## Sumber Referensi

1. Odoo Feature List — Accounting, Inventory, POS, Multi-company, Audit. https://www.odoo.com/page/feature-list
2. ERPNext Features — Stock, Buying, Selling, Accounts, Reporting, Multi-branch. https://erpnext.com/features
3. Square POS Features — Offline mode, receipts, inventory sync, team management. https://squareup.com/us/en/payments/pos-features
4. NIST SP 800-53 — Access control, audit and accountability, session management, encryption. https://csrc.nist.gov/publications/detail/sp/800-53/5.1
5. ISO 20022 / XBRL GL — Financial reporting, electronic data export standards. https://www.iso20022.org/
