"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import {
  Plus,
  Edit3,
  X,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
} from "./actions";

interface SupplierFormProps {
  mode: "create" | "edit";
  tenantId: number;
  units: { id: number; name: string }[];
  supplier?: {
    id: number;
    name: string;
    contact: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
}

export function SupplierForm({ mode, tenantId, units, supplier }: SupplierFormProps) {
  const [open, setOpen] = useState(false);
  const [unitId, setUnitId] = useState<string>(
    units[0]?.id.toString() || ""
  );
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  const action =
    mode === "create"
      ? (fd: FormData) =>
          createSupplierAction(tenantId, parseInt(unitId), fd)
      : (fd: FormData) => updateSupplierAction(tenantId, supplier!.id, fd);

  const [state, formAction, isPending] = useFormState(action, { ok: false });

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  const errorFor = (field: string) => state.errors?.[field]?.[0];

  const handleDelete = async () => {
    if (!supplier) return;
    if (!confirm(`Hapus supplier "${supplier.name}"?`)) return;
    setDeleting(true);
    const result = await deleteSupplierAction(tenantId, supplier.id);
    setDeleting(false);
    if (result.ok) setOpen(false);
    else alert(result.message);
  };

  return (
    <>
      {mode === "create" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl-custom font-medium text-sm flex items-center gap-2 touch-target"
        >
          <Plus className="w-4 h-4" />
          Supplier Baru
      </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-xl-custom hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface"
          aria-label="Edit supplier"
        >
          <Edit3 className="w-4 h-4" />
      </button>
      )}

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="rounded-xl-custom border border-outline-variant bg-surface-container-lowest p-0 max-w-md w-full backdrop:bg-scrim/40"
      >
        <form action={formAction} className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-h3 text-h3 text-on-surface">
              {mode === "create" ? "Supplier Baru" : "Edit Supplier"}
          </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-surface-container-low rounded-xl-custom"
            >
              <X className="w-5 h-5" />
          </button>
        </div>

          {state.message && !state.ok && (
            <div className="bg-error-container border border-error rounded-xl-custom px-3 py-2 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {state.message}
          </div>
          )}

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Nama Supplier *
          </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={supplier?.name}
              disabled={isPending}
              placeholder="Contoh: Toko Sembako Makmur"
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
            {errorFor("name") && (
              <p className="text-error mt-1 font-caption text-sm">{errorFor("name")}</p>
            )}
        </div>

          {mode === "create" && (
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Unit *
            </label>
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                disabled={isPending}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                </option>
                ))}
            </select>
          </div>
          )}

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Contact Person
          </label>
            <input
              type="text"
              name="contact"
              defaultValue={supplier?.contact || ""}
              disabled={isPending}
              placeholder="Nama PIC"
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
        </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Telepon
            </label>
              <input
                type="tel"
                name="phone"
                defaultValue={supplier?.phone || ""}
                disabled={isPending}
                placeholder="08123456789"
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              />
          </div>
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Email
            </label>
              <input
                type="email"
                name="email"
                defaultValue={supplier?.email || ""}
                disabled={isPending}
                placeholder="supplier@example.com"
                className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              />
              {errorFor("email") && (
                <p className="text-error mt-1 font-caption text-sm">{errorFor("email")}</p>
              )}
          </div>
        </div>

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Alamat
          </label>
            <textarea
              name="address"
              defaultValue={supplier?.address || ""}
              disabled={isPending}
              rows={2}
              placeholder="Alamat lengkap"
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
            />
        </div>

          <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
            {mode === "edit" && supplier ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || isPending}
                className="inline-flex items-center gap-1 text-expense font-medium text-sm touch-target disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Hapus
            </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-on-surface-variant font-medium text-sm touch-target"
              >
                Batal
            </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-5 py-2 rounded-xl-custom font-medium text-sm touch-target disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan
            </button>
          </div>
        </div>
      </form>
    </dialog>
    </>
  );
}
