"use client";

import { useFormState } from "react-dom";
import { Save, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createUnitAction, updateUnitAction } from "./actions";

interface Props {
  mode: "create" | "edit";
  unit: {
    id: number;
    name: string;
    type: "Sederhana" | "Retail";
    retailEnabled: boolean;
    description: string | null;
    tenantId: number;
  } | null;
  tenants: { id: number; name: string; appName: string }[];
}

export default function UnitForm({ mode, unit, tenants }: Props) {
  const action =
    mode === "create"
      ? createUnitAction
      : (fd: FormData) => updateUnitAction(unit!.id, { ok: false }, fd);
  const [state, formAction, isPending] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          className={cn(
            "rounded-xl-custom px-4 py-3 text-sm font-medium",
            state.ok
              ? "bg-income/10 text-income border border-income/30"
              : "bg-error-container border border-error text-on-error-container"
          )}
        >
          {state.message}
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-6 space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Informasi Dasar</h3>

        <div>
          <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
            Nama Unit *
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={unit?.name}
            disabled={isPending}
            className={inputClass}
          />
          {state.errors?.name && (
            <p className="text-error mt-1 font-caption">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Tenant *
            </label>
            <select
              name="tenantId"
              required
              defaultValue={unit?.tenantId || ""}
              disabled={isPending || mode === "edit"}
              className={cn(
                inputClass,
                mode === "edit" && "bg-surface-container-high cursor-not-allowed"
              )}
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
            {state.errors?.tenantId && (
              <p className="text-error mt-1 font-caption">{state.errors.tenantId[0]}</p>
            )}
            {mode === "edit" && (
              <p className="font-caption text-caption text-on-surface-variant mt-1">
                Tenant tidak dapat diubah setelah unit dibuat
              </p>
            )}
          </div>
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Tipe Unit *
            </label>
            <select
              name="type"
              required
              defaultValue={unit?.type || "Sederhana"}
              disabled={isPending}
              className={inputClass}
            >
              <option value="Sederhana">Sederhana (kantor keuangan)</option>
              <option value="Retail">Retail (kantin / koperasi)</option>
            </select>
            {state.errors?.type && (
              <p className="text-error mt-1 font-caption">{state.errors.type[0]}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-witer mb-1.5">
            Deskripsi
          </label>
          <textarea
            name="description"
            rows={3}
            defaultValue={unit?.description || ""}
            disabled={isPending}
            placeholder="Deskripsi unit (opsional)"
            className={cn(inputClass, "resize-y")}
          />
        </div>

        {/* Only show retail toggle for Retail type */}
        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            name="retailEnabled"
            defaultChecked={unit?.retailEnabled ?? false}
            disabled={isPending}
            className="rounded border-outline-variant text-primary focus:ring-primary"
            id="retailEnabled"
          />
          <label htmlFor="retailEnabled" className="flex items-center gap-2 cursor-pointer">
            <span className="font-caption text-on-surface-variant">
              Aktifkan POS & Kasir (Retail)
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-outline-variant">
        <a
          href="/superadmin/units"
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-medium text-sm"
        >
          <X className="w-4 h-4" />
          Batal
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl-custom font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          {mode === "create" ? "Simpan Unit" : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 disabled:cursor-not-allowed disabled:opacity-50";
