"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function UnitsToolbar() {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(sp.get("q") || "");
  const [type, setType] = useState(sp.get("type") || "all");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (type && type !== "all") params.set("type", type);
      router.replace(`/superadmin/units?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [search, type, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-[280px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="search"
          placeholder="Cari unit, deskripsi, atau tenant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
        />
     </div>
      <div className="flex items-center gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 border border-outline-variant rounded-xl-custom bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Semua Tipe</option>
          <option value="Sederhana">Sederhana</option>
          <option value="Retail">Retail</option>
       </select>
     </div>
   </div>
  );
}
