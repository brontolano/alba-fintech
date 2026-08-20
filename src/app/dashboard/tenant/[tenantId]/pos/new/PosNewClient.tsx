"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Wallet, Save, ArrowLeft, Search } from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  sellPrice: number;
  unitOfMeasure: string;
  stock: number;
  imageUrl: string | null;
}

interface CartItem extends Product {
  quantity: number;
}

interface PosNewClientProps {
  tenantId: string;
  initialProducts: Product[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function PosNewClient({ tenantId, initialProducts }: PosNewClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [paymentMethod, setPaymentMethod] = useState<string>("Tunai");
  const [customerName, setCustomerName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const filteredProducts = products.filter((p) =>
    p.stock > 0 && p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const newQty = Math.max(1, Math.min(i.stock, i.quantity + delta));
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const getSubtotal = (item: CartItem) => item.sellPrice * item.quantity;
  const getTotal = () => items.reduce((sum, i) => sum + getSubtotal(i), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("Tambah minimal 1 item");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append(
      "items",
      JSON.stringify(
        items.map((i) => ({
          inventoryId: i.id,
          quantity: i.quantity,
          priceAtSale: i.sellPrice,
        }))
      )
    );
    formData.append("paymentMethod", paymentMethod);
    formData.append("customerName", customerName);
    formData.append("notes", notes);

    try {
      const res = await fetch(`/api/tenant/${tenantId}/pos`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        router.push(`/dashboard/tenant/${tenantId}/pos`);
      } else {
        const err = await res.json();
        alert(err.error || "Gagal membuat penjualan");
      }
    } catch {
      alert("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant">
        <div className="flex items-center justify-between px-4 h-14">
          <Link
            href={`/dashboard/tenant/${tenantId}/pos`}
            className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
          >
            <ArrowLeft className="w-5 h-5" />
         </Link>
          <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Penjualan Baru</h1>
          <div className="w-10" />
       </div>
     </header>

      <main className="flex-1 p-4 space-y-4 overflow-auto pb-32">
        <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
         </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <p className="col-span-full text-center text-on-surface-variant py-4">
                Tidak ada produk ditemukan
             </p>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-xl-custom p-3 text-left touch-target active:bg-surface-container-low transition-colors"
                >
                  <div className="font-body text-body text-on-surface">{p.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono-num text-sm text-primary">{formatCurrency(p.sellPrice)}</span>
                    <span className="font-caption text-caption text-on-surface-variant">
                      Stok: {p.stock}
                   </span>
                 </div>
               </button>
              ))
            )}
         </div>
       </div>

        <div className="bg-surface-container-lowest rounded-xl-custom shadow-sm border border-outline-variant">
          <div className="p-4 border-b border-outline-variant flex items-center justify-between">
            <h2 className="font-h3 text-h3 text-on-surface">Keranjang ({items.length})</h2>
            <p className="font-mono-num text-lg font-bold text-primary">{formatCurrency(getTotal())}</p>
         </div>

          {items.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-on-surface-variant/30" />
              <p>Keranjang kosong. Tambah produk dari daftar di atas</p>
           </div>
          ) : (
            <>
              <div className="divide-y divide-outline-variant">
                {items.map((item) => (
                  <div key={item.id} className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-surface-container-high rounded-xl-custom flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingCart className="w-6 h-6 text-on-surface-variant" />
                      )}
                   </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-body text-on-surface truncate">{item.name}</p>
                      <p className="font-caption text-caption text-on-surface-variant font-mono-num">
                        {formatCurrency(item.sellPrice)} / {item.unitOfMeasure}
                     </p>
                   </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-2 bg-surface-container-high rounded-xl-custom touch-target"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                     </button>
                      <span className="font-mono-num text-lg font-bold text-on-surface w-10 text-center">
                        {item.quantity}
                     </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 bg-primary text-on-primary rounded-xl-custom touch-target"
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus className="w-4 h-4" />
                     </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 bg-error/10 text-error rounded-xl-custom touch-target"
                      >
                        <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 </div>
                ))}
             </div>

              <div className="p-4 border-t border-outline-variant space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body text-body text-on-surface">Total</span>
                  <span className="font-mono-num text-2xl font-bold text-primary">
                    {formatCurrency(getTotal())}
                 </span>
               </div>

                <div>
                  <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Metode Pembayaran
                 </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Tunai")}
                      className={`flex-1 py-2.5 rounded-xl-custom font-medium touch-target ${
                        paymentMethod === "Tunai"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-on-surface border border-outline-variant"
                      }`}
                    >
                      <Wallet className="w-4 h-4 mr-1 inline" /> Tunai
                   </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("Transfer")}
                      className={`flex-1 py-2.5 rounded-xl-custom font-medium touch-target ${
                        paymentMethod === "Transfer"
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-high text-on-surface border border-outline-variant"
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mr-1 inline" /> Transfer
                   </button>
                 </div>
               </div>

                <div>
                  <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Nama Pelanggan (opsional)
                 </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama pelanggan"
                    className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                  />
               </div>

                <div>
                  <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Catatan (opsional)
                 </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Catatan tambahan..."
                    className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
                  />
               </div>
             </div>
            </>
          )}
       </div>
     </main>

      <div className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant p-4 safe-area-bottom">
        <form id="pos-form" onSubmit={handleSubmit}>
          <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
            <Link
              href={`/dashboard/tenant/${tenantId}/pos`}
              className="flex-1 px-4 py-3 text-on-surface-variant hover:text-on-surface font-medium text-sm touch-target text-center"
            >
              Batal
           </Link>
            <button
              type="submit"
              disabled={items.length === 0 || loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-on-primary px-6 py-3 rounded-xl-custom font-medium flex items-center justify-center gap-2 touch-target transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Bayar {formatCurrency(getTotal())}
           </button>
         </div>
       </form>
     </div>
   </div>
  );
}
