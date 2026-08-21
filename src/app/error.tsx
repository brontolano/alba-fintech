"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
        <p className="text-xs text-slate-500 mb-6">
          Halaman tidak dapat dimuat. Silakan coba kembali.
        </p>
        <button
          onClick={() => reset()}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
        >
          Muat Ulang
        </button>
      </div>
    </div>
  );
}