"use client";

import { useState, useEffect, useMemo } from "react";
import { useFormState } from "react-dom";
import { Save, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUPERADMIN_MODULES } from "@/lib/superadmin";
import { createTenantAction, TenantFormState } from "./actions";
import { useSearchParams, useRouter } from "next/navigation";

interface Props {
  mode: "create" | "edit";
  tenant: {
    id?: number;
    name: string;
    appName: string;
    primaryColor: string;
    secondaryColor: string;
    subdomain: string | null;
    domain: string | null;
    activeModules: string;
    isActive: boolean;
  } | null;
  tenants: { id: number; name: string; appName: string }[];
}

export default function TenantForm({ mode, tenant }: Props) {
  const action =
    mode === "create"
      ? createTenantAction
      : (fd: FormData) =>
          updateTenantAction(tenant!.id!, { ok: false } as TenantFormState, fd);
  const [state, formAction, isPending] = useFormState(action, { ok: false });
  const [showPicker, setShowPicker] = useState<"" | "primary" | "secondary">("");

  const activeModulesList = tenant ? tenant.activeModules.split(",").filter(Boolean) : [];
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

      {/* Basic Info */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-6 space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Informasi Dasar</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Nama Tenant *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={tenant?.name}
              disabled={isPending}
              className={inputClass}
            />
            {errorFor("name") && <p className="text-error mt-1 font-caption">{errorFor("name")}</p>}
          </div>
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Nama Aplikasi *
            </label>
            <input
              type="text"
              name="appName"
              required
              defaultValue={tenant?.appName}
              disabled={isPending}
              className={inputClass}
            />
            {errorFor("appName") && <p className="text-error mt-1 font-caption">{errorFor("appName")}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Subdomain
            </label>
            <input
              type="text"
              name="subdomain"
              disabled={isPending}
              placeholder="contoh: pesantren-123"
              defaultValue={tenant?.subdomain || ""}
              className={inputClass}
            />
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              Akses via subdomain.alba.app
            </p>
          </div>
          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Custom Domain
            </label>
            <input
              type="text"
              name="domain"
              disabled={isPending}
              placeholder="alba.brontolano.com"
              defaultValue={tenant?.domain || ""}
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={tenant?.isActive ?? true}
            disabled={isPending}
            className="rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span className="font-caption text-on-surface-variant">Tenant Aktif</span>
        </label>
      </div>

      {/* Theme Colors */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-6 space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Tema Warna</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField
            label="Warna Primary"
            name="primaryColor"
            default={tenant?.primaryColor || "#1E3A5F"}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
            pickerTarget="primary"
          />
          <ColorField
            label="Warna Secondary"
            name="secondaryColor"
            default={tenant?.secondaryColor || "#10B981"}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
            pickerTarget="secondary"
          />
        </div>
      </div>

      {/* Active Modules */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-6 space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Modul Aktif</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUPERADMIN_MODULES.map((mod) => (
            <label
              key={mod.value}
              className="flex items-start gap-3 p-3 rounded-xl-custom hover:bg-surface-container-low cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                name="activeModules"
                value={mod.value}
                defaultChecked={activeModulesList.includes(mod.value)}
                disabled={isPending}
                className="mt-0.5 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <p className="font-medium text-on-surface">{mod.label}</p>
                <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                  {mod.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-surface-container-lowest rounded-xl-custom border border-outline-variant p-6 space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Logo Tenant</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-surface-container-high rounded-xl border-2 border-dashed border-outline-variant flex items-center justify-center overflow-hidden">
            {tenant?.logo ? (
              <img
                src={tenant.logo}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <svg className="w-6 h-6 text-on-surface-variant/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4h10v16m-5-4h.01M12 8v4l2 2" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-body text-body text-on-surface">
              Upload logo tenant (PNG/SVG, max 2MB)
            </p>
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              Logo akan ditampilkan di header aplikasi setiap tenant
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-outline-variant">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl-custom font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {mode === "create" ? "Simpan Tenant" : "Simpan Perubahan"}
          </button>
        </div>
        <a
          href="/superadmin/tenants"
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-medium text-sm"
        >
          <X className="w-4 h-4" />
          Batal
        </a>
      </div>
    </form>
  );
}

function ColorField({
  label,
  name,
  default: def,
  showPicker,
  setShowPicker,
  pickerTarget,
}: {
  label: string;
  name: string;
  default: string;
  showPicker: string;
  setShowPicker: (v: string) => void;
  pickerTarget: "primary" | "secondary";
}) {
  if (showPicker === pickerTarget) {
    return (
      <div>
        <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            name={name}
            defaultValue={def}
            className="w-12 h-10 rounded-xl-custom border border-outline-variant cursor-pointer p-0.5"
            onChange={() => setShowPicker("")}
          />
          <input
            type="text"
            name={`${name}_text`}
            defaultValue={def}
            placeholder="#000000"
            className={cn(inputClass, "font-mono")}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPicker(pickerTarget)}
          className="w-10 h-10 rounded-xl-custom border border-outline-variant cursor-pointer p-0.5 bg-surface-container-low"
        >
          <span
            className="block w-full h-full rounded-lg-custom border border-outline-variant/30"
            style={{ backgroundColor: def }}
          />
        </button>
        <input
          type="text"
          name={name}
          defaultValue={def}
          placeholder="#000000"
          className={cn(inputClass, "font-mono")}
        />
      </div>
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 disabled:cursor-not-allowed disabled:opacity-50";
