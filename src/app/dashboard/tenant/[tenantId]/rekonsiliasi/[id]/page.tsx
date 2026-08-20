import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Check, X, Eye, Wallet, Calendar, Clock, Building2, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RekonsiliasiDetailPageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export const dynamic = "force-dynamic";

function formatCurrency(amount: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

export default async function RekonsiliasiDetailPage({ params }: RekonsiliasiDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId, id } = await params;
  const tenantIdNum = parseInt(tenantId);
  const recId = parseInt(id);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const rec = await prisma.reconciliation.findUnique({
    where: { id: recId },
    include: {
      unit: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!rec || rec.tenantId !== tenantIdNum) {
    redirect(`/dashboard/tenant/${tenantId}/rekonsiliasi`);
  }

  const isPending = rec.status === "Pending";
  const diff = Number(rec.difference);
  const diffClass = diff > 0 ? "text-income" : diff < 0 ? "text-expense" : "text-primary";
  const diffIcon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;

  async function handleAction(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user) redirect("/login");

    const currentUser = session.user;
    const action = formData.get("action") as string;
    const notes = formData.get("notes") as string;

    if (!["validate", "approve", "reject"].includes(action)) {
      return { error: "Action tidak valid" };
    }

    if (action === "validate") {
      // Manager/Pimpinan can validate
      await prisma.reconciliation.update({
        where: { id: recId },
        data: {
          status: "Validated",
          notes: notes || rec.notes,
        },
      });
    } else if (action === "approve") {
      // Only Pimpinan can approve
      if (currentUser.role !== "Pimpinan") {
        return { error: "Hanya Pimpinan yang bisa approve" };
      }
      await prisma.reconciliation.update({
        where: { id: recId },
        data: {
          status: "Approved",
          notes: notes || rec.notes,
        },
      });
    } else if (action === "reject") {
      await prisma.reconciliation.update({
        where: { id: recId },
        data: {
          status: "Rejected",
          notes: notes || "Ditolak tanpa alasan",
        },
      });
    }

    redirect(`/dashboard/tenant/${tenantId}/rekonsiliasi`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/rekonsiliasi`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Detail Rekonsiliasi</h1>
        <div className="w-10" />
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-center">
        <span className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl-custom font-medium",
          rec.status === "Approved" ? "bg-income/10 text-income" :
          rec.status === "Validated" ? "bg-primary/10 text-primary" :
          rec.status === "Rejected" ? "bg-expense/10 text-expense" :
          "bg-warning/10 text-warning")}>
          {rec.status === "Pending" && <AlertTriangle className="w-4 h-4" />}
          {rec.status}
        </span>
      </div>

      {/* Main Info */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-on-primary font-bold", rec.unit.type === "Retail" ? "bg-income" : "bg-primary")}>
            {rec.unit.name.charAt(0)}
          </div>
          <div>
            <p className="font-body text-body text-on-surface">{rec.unit.name}</p>
            <p className="font-caption text-caption text-on-surface-variant capitalize">{rec.unit.type.toLowerCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="bg-surface-container-low rounded-xl-custom p-3">
            <p className="font-caption text-caption text-on-surface-variant">Saldo Fisik</p>
            <p className="font-mono-num text-lg font-bold text-on-surface mt-1">{formatCurrency(rec.physicalCash)}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl-custom p-3">
            <p className="font-caption text-caption text-on-surface-variant">Saldo Digital</p>
            <p className="font-mono-num text-lg font-bold text-on-surface mt-1">{formatCurrency(rec.digitalBalance)}</p>
          </div>
          <div className={cn("bg-surface-container-low rounded-xl-custom p-3", diff !== 0 ? "border-l-4" : "", diff > 0 ? "border-income" : diff < 0 ? "border-expense" : "")}>
            <div className="flex items-center justify-between">
              <p className="font-caption text-caption text-on-surface-variant">Selisih</p>
              <diffIcon className={cn("w-4 h-4", diffClass)} />
            </div>
            <p className={cn("font-mono-num text-lg font-bold mt-1", diffClass)}>
              {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Tanggal Stor</p>
            <p className="font-body text-body text-on-surface mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {format(new Date(rec.reconciliationDate), "dd MMMM yyyy", { locale: id })}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Dibuat</p>
            <p className="font-body text-body text-on-surface mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {format(new Date(rec.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Petugas</p>
            <p className="font-body text-body text-on-surface mt-1 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {rec.user.name}
            </p>
          </div>
        </div>

        {rec.notes && (
          <div className="pt-4 border-t border-outline-variant">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Catatan</p>
            <p className="font-body text-body text-on-surface mt-1">{rec.notes}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {isPending && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl-custom p-5 space-y-4">
          <p className="font-body text-body text-warning font-medium">
            Aksi: Validasi & Persetujuan
          </p>
          <form action={handleAction} className="space-y-4">
            <input type="hidden" name="action" />
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Catatan Validasi (opsional)</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={rec.notes || ""}
                placeholder="Catatan validasi..."
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                name="action"
                value="validate"
                className="bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-semibold touch-target transition-colors"
              >
                <Check className="w-4 h-4 mr-2 inline" />
                Validasi
              </button>
              <button
                type="submit"
                name="action"
                value="approve"
                className="bg-income hover:bg-income/90 text-on-income py-3 rounded-xl-custom font-semibold touch-target transition-colors"
              >
                <Check className="w-4 h-4 mr-2 inline" />
                Approve
              </button>
            </div>
            <button
              type="submit"
              name="action"
              value="reject"
              className="w-full bg-expense hover:bg-expense/90 text-on-expense py-3 rounded-xl-custom font-semibold touch-target transition-colors"
            >
              <X className="w-4 h-4 mr-2 inline" />
              Tolak
            </button>
          </form>
        </div>
      )}

      {!isPending && (
        <div className="bg-surface-container-low rounded-xl-custom p-5 text-center">
          <p className="font-body text-body text-on-surface-variant">
            Rekonsiliasi ini sudah {rec.status === "Approved" ? "disetujui" : rec.status === "Validated" ? "tervalidasi" : "ditolak"}.
          </p>
        </div>
      )}
    </div>
  );
}