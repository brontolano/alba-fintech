import { Prisma } from "@prisma/client";

// ============== Formatters ==============

export function formatCurrencyIDR(value: number | string | Prisma.Decimal | null | undefined): string {
  if (value === null || value === undefined) return "Rp 0";
  const num = typeof value === "object" && "toNumber" in value ? value.toNumber() : Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDateID(date: Date | string, opts?: { withTime?: boolean }): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
  if (!opts?.withTime) return dateStr;
  const timeStr = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${dateStr}, ${timeStr}`;
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  return formatDateID(d);
}

// ============== Hex Color Validation ==============

export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// ============== Pagination Helper ==============

export function parsePage(searchParams: { page?: string | string[] }): number {
  const raw = Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page;
  const n = parseInt(raw || "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export const PAGE_SIZE = 20;

// ============== Superadmin Helpers ==============

export const SUPERADMIN_MODULES = [
  { value: "transactions", label: "Transaksi & Buku Besar", description: "Pencatatan debit/kredit dan approval bertingkat" },
  { value: "reconciliation", label: "Rekonsiliasi", description: "Matching saldo fisik vs digital" },
  { value: "inventory", label: "Inventori", description: "Stok, opname, mutasi barang" },
  { value: "retail", label: "POS & Kasir", description: "Penjualan retail + shift kasir" },
  { value: "ai", label: "AI Assistant", description: "Asisten AI untuk pengurus" },
] as const;

export type ModuleValue = (typeof SUPERADMIN_MODULES)[number]["value"];
