export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-emerald-400">ALBA Finance</h1>
        <p className="text-slate-300 text-sm">
          Sistem Manajemen Keuangan Multi-Unit & Retail Pesantren Al Basyariyyah
        </p>
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 text-xs font-mono-num text-left space-y-1">
          <div>Status: <span className="text-emerald-400">Ready for Deployment</span></div>
          <div>Target: <span className="text-sky-400">https://alba.brontolano.com</span></div>
          <div>Hosting: <span className="text-amber-400">Hostinger Node.js + MySQL</span></div>
        </div>
      </div>
    </main>
  );
}
