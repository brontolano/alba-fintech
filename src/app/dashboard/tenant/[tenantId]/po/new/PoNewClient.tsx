"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Supplier {
  id: number;
  name: string;
}

interface InventoryItem {
  id: number;
  name: string;
  sellPrice: number;
  unitOfMeasure: string;
  stock: number;
}

interface PoNewClientProps {
  tenantId: string;
  unitId: number;
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
}

interface LineItem {
  inventoryId: number;
  quantity: number;
  unitPrice: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function PoNewClient({
  tenantId,
  unitId,
  suppliers,
  inventoryItems,
}: PoNewClientProps) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState<number>(suppliers[0]?.id || 0);
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredInventory = useMemo(() => {
    if (!search) return inventoryItems;
    return inventoryItems.filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [inventoryItems, search]);

  const subtotal = (i: LineItem) => i.unitPrice * i.quantity;
  const total = items.reduce((sum, i) => sum + subtotal(i), 0);

  const addItem = (inv: InventoryItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.inventoryId === inv.id);
      if (existing) {
        return prev.map((i) =>
          i.inventoryId === inv.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          inventoryId: inv.id,
          quantity: 1,
          unitPrice: Number(inv.sellPrice),
        },
      ];
    });
    setPickerOpen(false);
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.inventoryId !== id));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.inventoryId === id ? { ...i, quantity: qty } : i))
    );
  };

  const updatePrice = (id: number, price: number) => {
    if (price <= 0) return;
    setItems((prev) =>
      prev.map((i) =>
        i.inventoryId === id ? { ...i, unitPrice: price } : i
      )
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.inventoryId !== id));
  };

  const getInventoryName = (id: number) =>
    inventoryItems.find((i) => i.id === id)?.name || "";

  const getUom = (id: number) =>
    inventoryItems.find((i) => i.id === id)?.unitOfMeasure || "pcs";

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError("Tambah minimal 1 item");
      return;
    }
    if (!supplierId) {
      setError("Pilih supplier");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("items", JSON.stringify(items));
      fd.append("orderDate", orderDate);
      fd.append("notes", notes);

      const { createPoAction } = await import("../actions");
      const result = await createPoAction(
        parseInt(tenantId),
        unitId,
        supplierId,
        fd
      );

      if (result.ok) {
        router.push(`/dashboard/tenant/${tenantId}/po`);
      } else {
        setError(result.message || "Gagal membuat PO");
      }
    } catch (e) {
      setError((e as Error).message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/tenant/${tenantId}/po`}
          className="p-2 hover:bg-surface-container-low rounded-xl-custom touch-target"
        >
          <ArrowLeft className="w-5 h-5 text-on-surface" />
       </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1">
          Purchase Order Baru
       </h1>
        <div className="w-9" />
     </div>

      {error && (
        <div className="bg-error-container border border-error rounded-xl-custom px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
       </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Supplier & Date */}
        <div className="bg-surface-container-lowest rounded-xl-custom p-4 border border-outline-variant space-y-3">
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              <Truck className="w-3 h-3 inline mr-1" /> Supplier *
           </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            >
              <option value={0} disabled>
                Pilih supplier...
             </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
               </option>
              ))}
           </select>
            {suppliers.length === 0 && (
              <p className="font-caption text-caption text-warning mt-1">
                Belum ada supplier. Tambahkan di halaman Supplier dulu.
             </p>
            )}
         </div>

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" /> Tanggal Pesan
           </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
         </div>

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Catatan
           </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Catatan tambahan (opsional)"
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
            />
         </div>
       </div>

        {/* Items */}
        <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant overflow-hidden">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="font-h3 text-h3 text-on-surface">Item Pesanan</h2>
              <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                {items.length} item · Total {formatCurrency(total)}
             </p>
           </div>
            <button
              type="button"
              onClick={() => setPickerOpen(!pickerOpen)}
              className="bg-primary hover:bg-primary/90 text-on-primary px-3 py-2 rounded-xl-custom font-medium text-sm flex items-center gap-1 touch-target"
            >
              <Plus className="w-4 h-4" /> Item
           </button>
         </div>

          {pickerOpen && (
            <div className="p-3 border-b border-outline-variant bg-surface-container-low">
              <input
                type="search"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-xl-custom text-sm bg-surface-container-lowest"
              />
              <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {filteredInventory.length === 0 ? (
                  <p className="font-caption text-caption text-on-surface-variant text-center py-3">
                    Tidak ada produk
                 </p>
                ) : (
                  filteredInventory.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => addItem(inv)}
                      className="w-full text-left p-2 hover:bg-surface-container-high rounded-xl-custom flex items-center justify-between gap-2"
                    >
                      <span className="font-body text-body text-on-surface truncate">
                        {inv.name}
                     </span>
                      <span className="font-mono-num text-sm text-on-surface-variant">
                        {formatCurrency(Number(inv.sellPrice))}
                     </span>
                   </button>
                  ))
                )}
             </div>
           </div>
          )}

          {items.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              <Package className="w-12 h-12 mx-auto mb-2 text-on-surface-variant/30" />
              <p>Belum ada item. Klik "Item" untuk tambah</p>
           </div>
          ) : (
            <div className="divide-y divide-outline-variant">
              {items.map((item) => (
                <div key={item.inventoryId} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-body text-on-surface truncate">
                      {getInventoryName(item.inventoryId)}
                   </p>
                    <p className="font-caption text-caption text-on-surface-variant">
                      {formatCurrency(item.unitPrice)} / {getUom(item.inventoryId)}
                   </p>
                 </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQty(item.inventoryId, parseInt(e.target.value) || 0)
                      }
                      className="w-16 px-2 py-1 border border-outline-variant rounded-xl-custom text-sm text-center font-mono-num"
                    />
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) =>
                        updatePrice(item.inventoryId, parseFloat(e.target.value) || 0)
                      }
                      className="w-28 px-2 py-1 border border-outline-variant rounded-xl-custom text-sm font-mono-num"
                      placeholder="Harga"
                    />
                    <span className="font-mono-num text-sm font-bold w-24 text-right text-on-surface">
                      {formatCurrency(subtotal(item))}
                   </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.inventoryId)}
                      className="p-1.5 text-error hover:bg-error-container rounded-xl-custom touch-target"
                      aria-label="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               </div>
              ))}
              <div className="p-3 bg-surface-container-low flex items-center justify-between">
                <span className="font-h3 text-h3 text-on-surface">Total</span>
                <span className="font-mono-num text-2xl font-bold text-primary">
                  {formatCurrency(total)}
               </span>
             </div>
           </div>
          )}
       </div>
     </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-surface-container-lowest -mx-4 px-4 py-3 border-t border-outline-variant">
        <Link
          href={`/dashboard/tenant/${tenantId}/po`}
          className="px-4 py-2.5 text-on-surface-variant font-medium text-sm touch-target"
        >
          Batal
       </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || items.length === 0 || !supplierId}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-xl-custom font-medium text-sm touch-target disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Buat PO
       </button>
     </div>
   </div>
  );
}