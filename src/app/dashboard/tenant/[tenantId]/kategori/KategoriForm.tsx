"use client";

import { useState, useRef, useEffect } from "react";
import { useFormState } from "react-dom";
import { Plus, Edit3, X, AlertCircle, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "./actions";

interface KategoriFormProps {
  mode: "create" | "edit";
  tenantId: number;
  units: { id: number; name: string }[];
  category?: {
    id: number;
    name: string;
    type: string;
    unitId: number | null;
  };
}

export function KategoriForm({ mode, tenantId, units, category }: KategoriFormProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"Debit" | "Kredit">(
    (category?.type as "Debit" | "Kredit") || "Debit"
  );
  const [name, setName] = useState(category?.name || "");
  const [unitId, setUnitId] = useState<string>(category?.unitId?.toString() || "");
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  const action = mode === "create"
    ? (fd: FormData) => createCategoryAction(tenantId, fd)
    : (fd: FormData) => updateCategoryAction(tenantId, fd);

  const [state, formAction, isPending] = useFormState(action, { ok: false });

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setName("");
      setUnitId("");
    }
  }, [state.ok]);

  const errorFor = (field: string) => state.errors?.[field]?.[0];

  const handleDelete = async () => {
    if (!category) return;
    if (!confirm(`Hapus kategori "${category.name}"?`)) return;
    setDeleting(true);
    const result = await deleteCategoryAction(tenantId, category.id);
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
          Kategori Baru
       </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl-custom hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface touch-target"
          aria-label="Edit"
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
              {mode === "create" ? "Kategori Baru" : "Edit Kategori"}
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

          {mode === "edit" && category && (
            <input type="hidden" name="id" value={category.id} />
          )}

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Tipe *
           </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("Debit")}
                className={cn(
                  "py-2.5 rounded-xl-custom font-medium text-sm touch-target",
                  type === "Debit"
                    ? "bg-income text-on-income"
                    : "bg-surface-container-high text-on-surface border border-outline-variant"
                )}
              >
                Pemasukan
             </button>
              <button
                type="button"
                onClick={() => setType("Kredit")}
                className={cn(
                  "py-2.5 rounded-xl-custom font-medium text-sm touch-target",
                  type === "Kredit"
                    ? "bg-expense text-on-expense"
                    : "bg-surface-container-high text-on-surface border border-outline-variant"
                )}
              >
                Pengeluaran
             </button>
           </div>
            <input type="hidden" name="type" value={type} />
         </div>

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Nama Kategori *
           </label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              placeholder="Contoh: SPP, Kebutuhan Dapur"
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            />
            {errorFor("name") && (
              <p className="text-error mt-1 font-caption text-sm">{errorFor("name")}</p>
            )}
         </div>

          <div>
            <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
              Unit (opsional)
           </label>
            <select
              name="unitId"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              disabled={isPending}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
            >
              <option value="">Semua Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
               </option>
              ))}
           </select>
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              Kosongkan jika kategori bersama untuk semua unit
           </p>
         </div>

          <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
            {mode === "edit" && category ? (
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
