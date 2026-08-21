"use client";

import { useState, useMemo } from "react";
import { useFormState } from "react-dom";
import { Save, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createUserAction } from "../actions";

interface Props {
  defaultRole: "Manager" | "Staff" | "Pimpinan" | "Superadmin";
  tenants: { id: number; name: string; appName: string }[];
  unitsByTenant: Record<number, { id: number; name: string }[]>;
}

export default function UserForm({ defaultRole, tenants, unitsByTenant }: Props) {
  const [role, setRole] = useState(defaultRole);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [state, formAction, isPending] = useFormState(createUserAction, { ok: false });

  const availableUnits = useMemo(() => {
    if (!tenantId) return [];
    return unitsByTenant[tenantId] || [];
  }, [tenantId, unitsByTenant]);

  const showUnitSelector = role === "Manager" || role === "Staff";

  const errorFor = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          className={cn(
            "rounded-xl-custom px-4 py-3 text-sm font-medium flex items-center gap-2",
            state.ok
              ? "bg-income/10 text-income border border-income/30"
              : "bg-error-container border border-error text-on-error-container"
          )}
        >
          {state.ok ? null : <AlertCircle className="w-4 h-4" />}
          {state.message}
        </div>
      )}

      {/* Info Akun */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-6 space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Informasi Akun</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Nama *
            </label>
            <input
              type="text"
              name="name"
              required
              disabled={isPending}
              placeholder="Nama lengkap"
              className={inputClass}
            />
            {errorFor("name") && (
              <p className="text-error mt-1 font-caption">{errorFor("name")}</p>
            )}
          </div>
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Email *
            </label>
            <input
              type="email"
              name="email"
              required
              disabled={isPending}
              placeholder="user@example.com"
              className={inputClass}
            />
            {errorFor("email") && (
              <p className="text-error mt-1 font-caption">{errorFor("email")}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
            Password *
          </label>
          <input
            type="password"
            name="password"
            required
            disabled={isPending}
            placeholder="Minimal 8 karakter"
            className={inputClass}
          />
          {errorFor("password") && (
            <p className="text-error mt-1 font-caption">{errorFor("password")}</p>
          )}
          <p className="font-caption text-caption text-on-surface-variant mt-1">
            User dapat mengganti password setelah login pertama
          </p>
        </div>

        <div>
          <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
            Role *
          </label>
          <select
            name="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as Props["defaultRole"])}
            disabled={isPending}
            className={inputClass}
          >
            <option value="Pimpinan">Pimpinan (tenant-wide)</option>
            <option value="Manager">Manager (per unit)</option>
            <option value="Staff">Staff (per unit)</option>
          </select>
          {errorFor("role") && (
            <p className="text-error mt-1 font-caption">{errorFor("role")}</p>
          )}
        </div>
      </div>

      {/* Penugasan */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-6 space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Penugasan</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Tenant *
            </label>
            <select
              name="tenantId"
              required
              value={tenantId ?? ""}
              onChange={(e) => setTenantId(e.target.value ? Number(e.target.value) : null)}
              disabled={isPending}
              className={inputClass}
            >
              <option value="" disabled>
                Pilih Tenant
              </option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.appName || t.name}
                </option>
              ))}
            </select>
            {errorFor("tenantId") && (
              <p className="text-error mt-1 font-caption">{errorFor("tenantId")}</p>
            )}
          </div>

          {showUnitSelector && (
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Unit *
              </label>
              <select
                name="unitId"
                required={showUnitSelector}
                disabled={isPending || !tenantId}
                className={cn(
                  inputClass,
                  !tenantId && "bg-surface-container-high cursor-not-allowed"
                )}
              >
                <option value="" disabled>
                  {!tenantId ? "Pilih tenant dulu" : "Pilih Unit"}
                </option>
                {availableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              {errorFor("unitId") && (
                <p className="text-error mt-1 font-caption">{errorFor("unitId")}</p>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked
            disabled={isPending}
            className="rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span className="font-caption text-on-surface-variant">User Aktif</span>
        </label>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-outline-variant">
        <a
          href={
            role === "Pimpinan"
              ? "/superadmin/pimpinan"
              : role === "Manager"
              ? "/superadmin/managers"
              : "/superadmin/staff"
          }
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-medium text-sm"
        >
          <X className="w-4 h-4" />
          Batal
        </a>
        <button
          type="submit"
          disabled={isPending || !tenantId || (showUnitSelector && availableUnits.length === 0)}
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl-custom font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          Buat User
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 disabled:cursor-not-allowed disabled:opacity-50";
