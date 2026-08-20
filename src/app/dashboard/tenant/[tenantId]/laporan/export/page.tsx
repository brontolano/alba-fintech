import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, FileText, Calendar } from "lucide-react";

interface ExportPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function ExportPage({ params, searchParams }: ExportPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const urlParams = await searchParams;

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const endDate = urlParams.endDate ? new Date(urlParams.endDate as string) : new Date();
  const startDate = urlParams.startDate
    ? new Date(urlParams.startDate as string)
    : new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);

  const [tenant, units, transactions] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantIdNum },
      select: { name: true, appName: true },
    }),
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true, balance: true },
    }),
    prisma.transaction.findMany({
      where: {
        tenantId: tenantIdNum,
        status: "Approved",
        transactionDate: { gte: startDate, lte: endDate },
      },
      select: { type: true, amount: true },
    }),
  ]);

  if (!tenant) redirect("/dashboard/tenant-selector");

  const totalIncome = transactions
    .filter((t) => t.type === "Debit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "Kredit")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBalance = units.reduce((sum, u) => sum + Number(u.balance), 0);

  const baseExportUrl = `/api/dashboard/tenant/${tenantId}/laporan/export?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/laporan`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
       </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Ekspor Laporan</h1>
        <div className="w-10" />
     </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl-custom p-4 flex items-start gap-3">
        <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-caption text-caption text-primary uppercase tracking-wider">Periode Laporan</p>
          <p className="font-body text-body text-on-surface mt-1">
            {startDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} -{" "}
            {endDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
         </p>
       </div>
     </div>

      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-4">
        <h3 className="font-h3 text-h3 text-on-surface">Pratinjau Data</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low rounded-xl-custom p-3">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Total Saldo</p>
            <p className="font-mono-num text-lg font-bold text-primary mt-1">{formatCurrency(totalBalance)}</p>
         </div>
          <div className="bg-surface-container-low rounded-xl-custom p-3">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Pemasukan</p>
            <p className="font-mono-num text-lg font-bold text-income mt-1">{formatCurrency(totalIncome)}</p>
         </div>
          <div className="bg-surface-container-low rounded-xl-custom p-3">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Pengeluaran</p>
            <p className="font-mono-num text-lg font-bold text-expense mt-1">{formatCurrency(totalExpense)}</p>
         </div>
          <div className="bg-surface-container-low rounded-xl-custom p-3">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Transaksi</p>
            <p className="font-mono-num text-lg font-bold text-on-surface mt-1">{transactions.length}</p>
         </div>
       </div>
        <div className="pt-3 border-t border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant">
            Tenant: <span className="font-body text-body text-on-surface">{tenant.appName}</span>
         </p>
       </div>
     </div>

      <div className="space-y-3">
        <h3 className="font-h3 text-h3 text-on-surface">Pilih Format</h3>

        <a
          href={`${baseExportUrl}&format=excel`}
          download
          className="block bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant hover:border-income hover:bg-income/5 transition-colors touch-target"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-income/10 rounded-xl-custom">
              <FileSpreadsheet className="w-7 h-7 text-income" />
           </div>
            <div className="flex-1">
              <h4 className="font-body text-body font-semibold text-on-surface">Excel Spreadsheet (.xlsx)</h4>
              <p className="font-caption text-caption text-on-surface-variant mt-1">
                Multi-sheet workbook: Ringkasan, Per Unit, Detail Transaksi, Kategori
             </p>
              <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                Cocok untuk analisis data & pembukuan lanjutan
             </p>
           </div>
            <svg className="w-5 h-5 text-on-surface-variant shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
           </svg>
         </div>
       </a>

        <a
          href={`${baseExportUrl}&format=pdf`}
          download
          className="block bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant hover:border-error hover:bg-error/5 transition-colors touch-target"
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-error/10 rounded-xl-custom">
              <FileText className="w-7 h-7 text-error" />
           </div>
            <div className="flex-1">
              <h4 className="font-body text-body font-semibold text-on-surface">PDF Document (.pdf)</h4>
              <p className="font-caption text-caption text-on-surface-variant mt-1">
                Laporan formal dengan header, footer & nomor halaman
             </p>
              <p className="font-caption text-caption text-on-surface-variant mt-0.5">
                Cocok untuk arsip, presentasi, dan cetak
             </p>
           </div>
            <svg className="w-5 h-5 text-on-surface-variant shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
           </svg>
         </div>
       </a>
     </div>

      <div className="bg-warning/5 border border-warning/20 rounded-xl-custom p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-warning mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
       </svg>
        <div>
          <p className="font-body text-body text-on-surface font-medium">Informasi Ekspor</p>
          <ul className="font-caption text-caption text-on-surface-variant mt-1 space-y-1 list-disc pl-4">
            <li>Hanya transaksi berstatus <strong>Approved</strong> yang diekspor</li>
            <li>File akan diunduh otomatis ke perangkat Anda</li>
            <li>Aksi ini akan tercatat di Audit Log</li>
         </ul>
       </div>
     </div>
   </div>
  );
}
