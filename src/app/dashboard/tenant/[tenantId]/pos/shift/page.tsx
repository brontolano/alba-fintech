import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { ShoppingCart, DollarSign, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PosShiftPageProps {
  params: Promise<{ tenantId: string }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default async function PosShiftPage({ params }: PosShiftPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);
  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Only Manager/Staff can access shift
  if (user.role === "Pimpinan") {
    redirect(`/dashboard/tenant/${tenantId}/pos`);
  }

  const unitId = user.unitId;

  // Get current open shift
  const openShift = await prisma.cashierShift.findFirst({
    where: { tenantId: tenantIdNum, unitId: unitId || undefined, status: "Open" },
    orderBy: { openedAt: "desc" },
    include: {
      sales: {
        include: { items: { include: { inventory: true } } },
      },
      openedByUser: { select: { name: true } },
      closedByUser: { select: { name: true } },
    },
  });

  // Get shift history
  const shifts = await prisma.cashierShift.findMany({
    where: { tenantId: tenantIdNum, unitId: unitId || undefined },
    orderBy: { openedAt: "desc" },
    take: 20,
    include: {
      sales: { select: { totalAmount: true, paymentMethod: true, status: true } },
      openedByUser: { select: { name: true } },
      closedByUser: { select: { name: true } },
    },
  });

  async function openShiftAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const openingCash = parseFloat(formData.get("openingCash") as string);
    if (isNaN(openingCash) || openingCash < 0) {
      return { error: "Kas awal tidak valid" };
    }

    const existing = await prisma.cashierShift.findFirst({
      where: { tenantId: tenantIdNum, unitId: user.unitId || undefined, status: "Open" },
    });
    if (existing) {
      return { error: "Masih ada shift yang terbuka" };
    }

    await prisma.cashierShift.create({
      data: {
        tenantId: tenantIdNum,
        unitId: user.unitId!,
        openedBy: Number(session.user.id),
        openingCash,
        status: "Open",
      },
    });

    redirect(`/dashboard/tenant/${tenantId}/pos/shift`);
  }

  async function closeShiftAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const shiftId = parseInt(formData.get("shiftId") as string);
    const closingCash = parseFloat(formData.get("closingCash") as string);
    const notes = (formData.get("notes") as string) || "";

    if (isNaN(closingCash) || closingCash < 0) {
      return { error: "Kas akhir tidak valid" };
    }

    const shift = await prisma.cashierShift.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          where: { status: "Completed" },
          select: { totalAmount: true, paymentMethod: true },
        },
      },
    });

    if (!shift || shift.status !== "Open") {
      return { error: "Shift tidak ditemukan atau sudah tertutup" };
    }

    const cashSales = shift.sales
      .filter((s) => s.paymentMethod === "Tunai")
      .reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const expectedCash = Number(shift.openingCash) + cashSales;
    const cashDifference = closingCash - expectedCash;

    await prisma.cashierShift.update({
      where: { id: shiftId },
      data: {
        closingCash,
        cashDifference,
        notes: notes || null,
        status: "Closed",
        closedBy: Number(session.user.id),
        closedAt: new Date(),
      },
    });

    redirect(`/dashboard/tenant/${tenantId}/pos/shift`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/pos`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
       </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Shift Kasir</h1>
        <div className="w-10" />
     </div>

      {openShift ? (
        <div className="space-y-5">
          <div className="bg-primary/10 border border-primary/30 rounded-xl-custom p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/20 rounded-xl-custom">
                  <ShoppingCart className="w-6 h-6 text-primary" />
               </div>
                <div>
                  <p className="font-body text-body text-primary font-medium">Shift Sedang Buka</p>
                  <p className="font-caption text-caption text-primary/80">
                    Dibuka: {format(new Date(openShift.openedAt), "dd MMM yyyy HH:mm", { locale: id })} oleh {openShift.openedByUser?.name || "-"}
                 </p>
               </div>
             </div>
              <span className="inline-flex px-3 py-1 bg-primary text-on-primary rounded-xl-custom font-medium text-sm">AKTIF</span>
           </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-lowest rounded-xl-custom p-4 border border-outline-variant">
                <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Kas Awal</p>
                <p className="font-mono-num text-2xl font-bold text-primary mt-1">{formatCurrency(Number(openShift.openingCash))}</p>
             </div>
              <div className="bg-surface-container-lowest rounded-xl-custom p-4 border border-outline-variant">
                <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Penjualan Tunai</p>
                <p className="font-mono-num text-2xl font-bold text-on-surface mt-1">
                  {formatCurrency(
                    openShift.sales
                      .filter((s) => s.paymentMethod === "Tunai" && s.status === "Completed")
                      .reduce((sum, s) => sum + Number(s.totalAmount), 0)
                  )}
               </p>
             </div>
           </div>

            <form action={closeShiftAction} className="space-y-4">
              <input type="hidden" name="shiftId" value={openShift.id} />
              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Kas Akhir (Fisik) *</label>
                <input
                  type="number"
                  name="closingCash"
                  required
                  min="0"
                  step="100"
                  placeholder="Masukkan kas fisik yang dihitung"
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num text-lg"
                />
             </div>
              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Catatan</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Catatan penutupan shift (selisih, alasan, dll)"
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
                />
             </div>
              <button
                type="submit"
                className="w-full bg-income hover:bg-income/90 text-on-income py-3 rounded-xl-custom font-semibold touch-target transition-colors"
              >
                <DollarSign className="w-4 h-4 mr-2 inline" />
                Tutup Shift
             </button>
           </form>
         </div>

          {openShift.sales.filter((s) => s.status === "Completed").length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl-custom p-4 shadow-sm border border-outline-variant">
              <h3 className="font-h3 text-h3 text-on-surface mb-4">Penjualan Shift Ini</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                      <th className="p-2">Waktu</th>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2">Bayar</th>
                   </tr>
                 </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {openShift.sales
                      .filter((s) => s.status === "Completed")
                      .slice(0, 10)
                      .map((sale) => (
                        <tr key={sale.id} className="hover:bg-surface-container-low/50">
                          <td className="p-2 font-caption text-caption text-on-surface-variant">
                            {format(new Date(sale.createdAt), "HH:mm", { locale: id })}
                         </td>
                          <td className="p-2 font-body text-body text-on-surface truncate">
                            {sale.items.map((i) => `${i.inventory.name}x${i.quantity}`).join(", ")}
                         </td>
                          <td className="p-2 text-right font-mono-num font-medium text-on-surface">
                            {formatCurrency(Number(sale.totalAmount))}
                         </td>
                          <td className="p-2 font-caption text-capitalize text-on-surface-variant">
                            {sale.paymentMethod}
                         </td>
                       </tr>
                      ))}
                 </tbody>
               </table>
             </div>
           </div>
          )}
       </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl-custom p-8 shadow-sm border border-outline-variant text-center">
          <ShoppingCart className="w-16 h-16 text-on-surface-variant/30 mx-auto mb-4" />
          <h2 className="font-h2 text-h2 text-on-surface mb-2">Belum Ada Shift Aktif</h2>
          <p className="font-body text-body text-on-surface-variant mb-6">Buka shift kasir baru untuk memulai penjualan hari ini</p>
          <form action={openShiftAction} className="max-w-md mx-auto space-y-4">
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Kas Awal (Fisik) *</label>
              <input
                type="number"
                name="openingCash"
                required
                min="0"
                step="100"
                placeholder="0"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num text-lg"
              />
           </div>
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-semibold touch-target transition-colors"
            >
              <ShoppingCart className="w-4 h-4 mr-2 inline" />
              Buka Shift Baru
           </button>
         </form>
       </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl-custom shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant">
          <h2 className="font-h3 text-h3 text-on-surface">Riwayat Shift</h2>
       </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                <th className="p-4">Tanggal</th>
                <th className="p-4">Buka</th>
                <th className="p-4">Tutup</th>
                <th className="p-4">Kas Awal</th>
                <th className="p-4">Kas Akhir</th>
                <th className="p-4">Selisih</th>
                <th className="p-4">Omzet</th>
                <th className="p-4">Status</th>
             </tr>
           </thead>
            <tbody className="divide-y divide-outline-variant">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-on-surface-variant">Belum ada riwayat shift</td>
               </tr>
              ) : (
                shifts.map((shift) => {
                  const diff = shift.cashDifference !== null && shift.cashDifference !== undefined ? Number(shift.cashDifference) : null;
                  const diffColor = diff === null ? "" : diff > 0 ? "text-income" : diff < 0 ? "text-expense" : "";
                  const omzet = shift.sales
                    .filter((s) => s.status === "Completed")
                    .reduce((sum, s) => sum + Number(s.totalAmount), 0);
                  return (
                    <tr key={shift.id} className="hover:bg-surface-container-low/50">
                      <td className="p-4 font-caption text-caption text-on-surface-variant">
                        {format(new Date(shift.openedAt), "dd MMM yyyy", { locale: id })}
                     </td>
                      <td className="p-4 font-caption text-caption text-on-surface">
                        {format(new Date(shift.openedAt), "HH:mm", { locale: id })}
                     </td>
                      <td className="p-4 font-caption text-caption text-on-surface">
                        {shift.closedAt ? format(new Date(shift.closedAt), "HH:mm", { locale: id }) : "-"}
                     </td>
                      <td className="p-4 font-mono-num text-on-surface">{formatCurrency(Number(shift.openingCash))}</td>
                      <td className="p-4 font-mono-num text-on-surface">{shift.closingCash ? formatCurrency(Number(shift.closingCash)) : "-"}</td>
                      <td className={cn("p-4 font-mono-num", diffColor)}>
                        {diff !== null
                          ? (diff >= 0 ? "+" : "") + formatCurrency(diff)
                          : "-"}
                     </td>
                      <td className="p-4 font-mono-num text-on-surface">{formatCurrency(omzet)}</td>
                      <td className="p-4">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-capitalize",
                          shift.status === "Closed" ? "bg-income/10 text-income" : "bg-warning/10 text-warning")}>
                          {shift.status}
                       </span>
                     </td>
                   </tr>
                  );
                })
              )}
           </tbody>
         </table>
       </div>
     </div>
   </div>
  );
}
