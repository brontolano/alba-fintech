"use client";

import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Eye, ArrowRight, DollarSign, CreditCard, Wallet, AlertTriangle, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sale {
  id: number;
  createdAt: Date;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  items: Array<{ inventory: { name: string }; quantity: number; priceAtSale: number; subtotal: number }>;
  shift: { openingCash: number; closingCash: number | null } | null;
}

interface PosClientProps {
  sales: Sale[];
  tenantId: string;
}

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function PosSaleCard({ sale }: { sale: Sale }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <span className="w-3 h-3" />
              {format(new Date(sale.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
            </span>
            <span className="font-caption text-caption text-on-surface-variant flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {sale.paymentMethod}
            </span>
            <span className="inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize bg-income/10 text-income">
              Selesai
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {sale.items.slice(0, 3).map((item, idx) => (
              <span key={idx} className="font-caption text-caption text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-xl-custom">
                {item.inventory.name} × {item.quantity}
              </span>
            ))}
            {sale.items.length > 3 && (
              <span className="font-caption text-caption text-on-surface-variant">+{sale.items.length - 3} lagi</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="font-mono-num text-xl font-bold text-on-surface">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(sale.totalAmount)}</p>
          <span className="inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize bg-income/10 text-income">
            Selesai
          </span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-outline-variant flex flex-col sm:flex-row gap-3">
        <Link
          href={`/dashboard/tenant/${sale.id}/pos/${sale.id}`}
          className="flex-1 sm:w-auto bg-primary hover:bg-primary/90 text-on-primary py-2.5 rounded-xl-custom font-medium text-sm flex items-center justify-center gap-2 touch-target transition-colors"
        >
          <span className="w-4 h-4" />
          Detail
        </Link>
      </div>
    </div>
  );
}

export default function PosClient({ sales, tenantId }: PosClientProps) {
  return (
    <div className="space-y-3">
      {sales.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl-custom p-8 text-center">
          <span className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
          <p className="font-body text-body text-on-surface-variant">Belum ada penjualan</p>
          <Link
            href={`/dashboard/tenant/${tenantId}/pos/new`}
            className="mt-3 inline-flex items-center gap-1 text-primary font-medium text-sm"
          >
            Buat penjualan pertama <span className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        sales.map((sale) => (
          <PosSaleCard key={sale.id} sale={sale} />
        ))
      )}
    </div>
  );
}