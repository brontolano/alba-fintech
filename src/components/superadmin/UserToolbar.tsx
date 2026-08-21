"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  roleFilter: "Manager" | "Staff" | "Pimpinan";
  defaultSearch?: string;
  defaultStatus?: "all" | "active" | "inactive";
}

const ROLE_LABELS: Record<string, string> = {
  Manager: "Manager Unit",
  Staff: "Staff Unit",
  Pimpinan: "Pimpinan",
};

export function SuperadminUserToolbar({
  roleFilter,
  defaultSearch = "",
  defaultStatus = "all",
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [search, setSearch] = useState(defaultSearch || sp.get("q") || "");
  const [status, setStatus] = useState<"all" | "active" | "inactive">(
    (sp.get("status") as "all" | "active" | "inactive") || defaultStatus
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (status && status !== "all") params.set("status", status);
      router.replace(`/superadmin/${roleFilter.toLowerCase()}s?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  }, [search, status, roleFilter, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-[280px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="search"
          placeholder={`Cari ${ROLE_LABELS[roleFilter].toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | "active" | "inactive")}
          className="px-3 py-2 border border-outline-variant rounded-xl-custom bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Non-aktif</option>
        </select>
      </div>
    </div>
  );
}