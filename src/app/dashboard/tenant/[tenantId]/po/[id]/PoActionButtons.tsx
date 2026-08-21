"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

interface Props {
  tenantId: number;
  poId: number;
  status: string;
  canReceive: boolean;
  canCancel: boolean;
}

export function PoActionButtons({ tenantId, poId, status, canReceive, canCancel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReceive = async () => {
    if (!confirm("Terima PO ini? Stok akan ditambahkan otomatis.")) return;
    setError(null);
    try {
      const { receivePoAction } = await import("../actions");
      const result = await receivePoAction(tenantId, poId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message || "Gagal menerima PO");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Alasan pembatalan?") || "";
    if (reason === null) return;
    setError(null);
    try {
      const { cancelPoAction } = await import("../actions");
      const result = await cancelPoAction(tenantId, poId, reason);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.message || "Gagal membatalkan PO");
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-error-container border border-error rounded-xl-custom px-4 py-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
      </div>
      )}

      <div className="flex items-center gap-2 sticky bottom-0 bg-surface-container-lowest -mx-4 px-4 py-3 border-t border-outline-variant">
        {canReceive && (
          <button
            type="button"
            onClick={handleReceive}
            disabled={pending}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-income hover:bg-income/90 text-on-income px-4 py-3 rounded-xl-custom font-medium text-sm touch-target disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Terima Barang
        </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 bg-error-container hover:bg-error/10 text-error px-4 py-3 rounded-xl-custom font-medium text-sm touch-target disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Batalkan
        </button>
        )}
    </div>
  </div>
  );
}