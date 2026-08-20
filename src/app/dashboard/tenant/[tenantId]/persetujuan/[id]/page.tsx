import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Check, X, Eye, Download, AlertTriangle, Clock, FileText, Building2, User, DollarSign, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersetujuanDetailPageProps {
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

export default async function PersetujuanDetailPage({ params }: PersetujuanDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId, id } = await params;
  const tenantIdNum = parseInt(tenantId);
  const txId = parseInt(id);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Fetch transaction with approvals
  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    include: {
      unit: true,
      user: { select: { name: true, email: true } },
      approvals: {
        include: { approver: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tx || tx.tenantId !== tenantIdNum) {
    redirect(`/dashboard/tenant/${tenantId}/persetujuan`);
  }

  // Check if user can approve
  const canApprove = user.role === "Pimpinan" || (user.role === "Manager" && user.unitId === tx.unitId);

  async function handleAction(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user) redirect("/login");

    const currentUser = session.user;
    const action = formData.get("action") as string;
    const notes = formData.get("notes") as string;

    if (!["approve", "reject"].includes(action)) {
      return { error: "Action tidak valid" };
    }

    if (action === "approve") {
      // Check approval level
      const isManagerLevel = tx.status === "Submitted";
      const isPimpinanLevel = tx.status === "Pending";

      if (isManagerLevel && currentUser.role !== "Manager" && currentUser.role !== "Pimpinan") {
        return { error: "Hanya Manager yang bisa review level ini" };
      }
      if (isPimpinanLevel && currentUser.role !== "Pimpinan") {
        return { error: "Hanya Pimpinan yang bisa approve final" };
      }

      await prisma.$transaction(async (txn) => {
        // Update transaction status
        const newStatus = isManagerLevel ? "Pending" : "Approved";
        const approvedBy = isManagerLevel ? null : Number(currentUser.id);
        const approvedAt = isManagerLevel ? null : new Date();

        await txn.transaction.update({
          where: { id: txId },
          data: {
            status: newStatus,
            approvedById: approvedBy,
            approvedAt,
          },
        });

        // Create approval record
        await txn.approval.create({
          data: {
            transactionId: txId,
            approverId: Number(currentUser.id),
            level: isManagerLevel ? "Manager" : "Pimpinan",
            status: "Approved",
            notes: notes || null,
          },
        });

        // If final approval, update unit balance
        if (newStatus === "Approved") {
          const amount = Number(tx.amount);
          const balanceChange = tx.type === "Debit" ? amount : -amount;

          await txn.unit.update({
            where: { id: tx.unitId },
            data: { balance: { increment: balanceChange } },
          });
        }
      });
    } else {
      // Reject
      await prisma.$transaction(async (txn) => {
        await txn.transaction.update({
          where: { id: txId },
          data: { status: "Rejected" },
        });

        await txn.approval.create({
          data: {
            transactionId: txId,
            approverId: Number(currentUser.id),
            level: tx.status === "Submitted" ? "Manager" : "Pimpinan",
            status: "Rejected",
            notes: notes || "Ditolak tanpa alasan",
          },
        });
      });
    }

    redirect(`/dashboard/tenant/${tenantId}/persetujuan`);
  }

  const isPending = tx.status === "Submitted" || tx.status === "Pending";
  const isManagerLevel = tx.status === "Submitted";
  const currentLevelLabel = isManagerLevel ? "Review Manager" : "Persetujuan Pimpinan";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/persetujuan`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Detail Persetujuan</h1>
        <div className="w-10" />
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-center">
        <span className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-xl-custom font-medium",
          tx.status === "Approved" ? "bg-income/10 text-income" :
          tx.status === "Rejected" ? "bg-expense/10 text-expense" :
          tx.status === "Draft" ? "bg-surface-container-high text-on-surface-variant" :
          "bg-warning/10 text-warning")}>
          {tx.status === "Submitted" && <AlertTriangle className="w-4 h-4" />}
          {tx.status === "Pending" && <Clock className="w-4 h-4" />}
          {currentLevelLabel}
        </span>
      </div>

      {/* Transaction Info */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Jenis</p>
            <p className={cn("font-mono-num text-lg font-semibold", tx.type === "Debit" ? "text-income" : "text-expense")}>
              {tx.type}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Metode</p>
            <p className="font-body text-body text-on-surface">{tx.method}</p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Kategori</p>
            <p className="font-body text-body text-on-surface">{tx.category}</p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Nominal</p>
            <p className={cn("font-mono-num text-lg font-semibold", tx.type === "Debit" ? "text-income" : "text-expense")}>
              {formatCurrency(Number(tx.amount))}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Tanggal Transaksi</p>
            <p className="font-body text-body text-on-surface">{format(new Date(tx.transactionDate), "dd MMMM yyyy", { locale: id })}</p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Unit</p>
            <p className="font-body text-body text-on-surface flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              {tx.unit.name} ({tx.unit.type})
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Keterangan</p>
            <p className="font-body text-body text-on-surface">{tx.description || "-"}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Pengaju</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
              {tx.user.name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="font-body text-body text-on-surface">{tx.user.name}</p>
              <p className="font-caption text-caption text-on-surface-variant">{tx.user.email}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Dibuat</p>
          <p className="font-body text-body text-on-surface mt-1">{format(new Date(tx.createdAt), "dd MMMM yyyy HH:mm", { locale: id })}</p>
        </div>

        {/* Photo */}
        {tx.photoUrl && (
          <div className="pt-4 border-t border-outline-variant">
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Foto Bukti</p>
            <div className="mt-2">
              <img
                src={tx.photoUrl}
                alt="Bukti transaksi"
                className="max-w-full h-auto rounded-xl-custom border border-outline-variant"
              />
            </div>
          </div>
        )}
      </div>

      {/* Approval History */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant">
        <h2 className="font-h3 text-h3 text-on-surface mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Riwayat Persetujuan
        </h2>
        <div className="space-y-3">
          {tx.approvals.length === 0 ? (
            <p className="font-body text-body text-on-surface-variant text-center py-4">Belum ada riwayat persetujuan</p>
          ) : (
            tx.approvals.map((approval, index) => (
              <div key={approval.id} className="bg-surface-container-low rounded-xl-custom p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-body text-on-surface">{approval.approver.name}</p>
                        <span className={cn("inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-caption",
                          approval.status === "Approved" ? "bg-income/10 text-income" : "bg-expense/10 text-expense")}>
                          {approval.status}
                        </span>
                      </div>
                      <p className="font-caption text-caption text-on-surface-variant">
                        {approval.level} · {format(new Date(approval.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                      </p>
                    </div>
                  </div>
                </div>
                {approval.notes && (
                  <div className="mt-3 p-3 bg-surface-container-high rounded-xl-custom">
                    <p className="font-caption text-caption text-on-surface-variant">Catatan: {approval.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isPending && canApprove && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl-custom p-5 space-y-4">
          <p className="font-body text-body text-warning font-medium">
            Aksi: {currentLevelLabel}
          </p>
          <form action={handleAction} className="space-y-4">
            <input type="hidden" name="action" />
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Catatan (opsional)</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Alasan approve/reject..."
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                name="action"
                value="approve"
                className="flex-1 bg-income hover:bg-income/90 text-on-income py-3 rounded-xl-custom font-semibold touch-target transition-colors"
              >
                <Check className="w-4 h-4 mr-2 inline" />
                Setujui
              </button>
              <button
                type="submit"
                name="action"
                value="reject"
                className="flex-1 bg-expense hover:bg-expense/90 text-on-expense py-3 rounded-xl-custom font-semibold touch-target transition-colors"
              >
                <X className="w-4 h-4 mr-2 inline" />
                Tolak
              </button>
            </div>
          </form>
        </div>
      )}

      {!isPending && (
        <div className="bg-surface-container-low rounded-xl-custom p-5 text-center">
          <p className="font-body text-body text-on-surface-variant">
            Transaksi ini sudah {tx.status === "Approved" ? "disetujui" : "ditolak"}.
          </p>
        </div>
      )}

      {!canApprove && isPending && (
        <div className="bg-surface-container-low rounded-xl-custom p-5 text-center">
          <p className="font-body text-body text-on-surface-variant">
            Anda tidak memiliki hak akses untuk {currentLevelLabel.toLowerCase()} transaksi ini.
          </p>
        </div>
      )}
    </div>
  );
}