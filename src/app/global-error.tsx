"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans text-slate-900">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Terjadi Kesalahan Sistem</h2>
          <p className="text-sm text-slate-600 mb-6">
            Aplikasi mengalami kendala fatal. Silakan coba muat ulang.
          </p>
          <button
            onClick={() => reset()}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}