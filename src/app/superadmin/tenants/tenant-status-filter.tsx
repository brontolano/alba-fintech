"use client";

import { useSearchParams, useRouter } from "next/navigation";

export function TenantStatusFilter({
  defaultValue = "all",
}: { defaultValue?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("status") || defaultValue;
  const q = sp.get("q") || "";

  const options = [
    { value: "all", label: "Semua Tenant" },
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Non-aktif" },
  ];

  function onChange(next: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (next && next !== "all") params.set("status", next);
    router.replace(`/superadmin/tenants?${params.toString()}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 border border-outline-variant rounded-xl-custom bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
