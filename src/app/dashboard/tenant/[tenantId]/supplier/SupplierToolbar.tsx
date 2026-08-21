"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface Props {
  units: { id: number; name: string }[];
  defaultUnit: string;
  defaultSearch: string;
  showUnitFilter: boolean;
}

export function SupplierToolbar({ units, defaultUnit, defaultSearch, showUnitFilter }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(defaultSearch || sp.get("q") || "");
  const [unit, setUnit] = useState(defaultUnit || sp.get("unit") || "all");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (unit && unit !== "all") params.set("unit", unit);
      router.replace(`/supplier?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [search, unit, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-[280px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="search"
          placeholder="Cari nama, contact, telepon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
        />
     </div>
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
   </div>
  );
}
