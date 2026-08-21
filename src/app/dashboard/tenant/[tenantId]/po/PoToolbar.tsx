"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface Props {
  units: { id: number; name: string }[];
  suppliers: { id: number; name: string }[];
  defaultUnit: string;
  defaultSupplier: string;
  defaultStatus: string;
  defaultSearch: string;
  showUnitFilter: boolean;
}

export function PoToolbar({
  units,
  suppliers,
  defaultUnit,
  defaultSupplier,
  defaultStatus,
  defaultSearch,
  showUnitFilter,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(defaultSearch || sp.get("q") || "");
  const [unit, setUnit] = useState(defaultUnit || sp.get("unit") || "all");
  const [supplier, setSupplier] = useState(defaultSupplier || sp.get("supplier") || "all");
  const [status, setStatus] = useState(defaultStatus || sp.get("status") || "all");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (unit && unit !== "all") params.set("unit", unit);
      if (supplier && supplier !== "all") params.set("supplier", supplier);
      if (status && status !== "all") params.set("status", status);
      router.replace(`/po?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [search, unit, supplier, status, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-[280px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="search"
          placeholder="Cari supplier, catatan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
        />
     </div>
      <div className="flex flex-wrap items-center gap-2">
        {showUnitFilter && (
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="px-3 py-2 border border-outline-variant rounded-xl-custom bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Semua Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
             </option>
            ))}
         </select>
        )}
        <select
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          className="px-3 py-2 border border-outline-variant rounded-xl-custom bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Semua Supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
           </option>
          ))}
       </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-outline-variant rounded-xl-custom bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Semua Status</option>
          <option value="Pending">Menunggu</option>
          <option value="Sent">Dikirim</option>
          <option value="Received">Diterima</option>
          <option value="Cancelled">Dibatalkan</option>
       </select>
     </div>
   </div>
  );
}