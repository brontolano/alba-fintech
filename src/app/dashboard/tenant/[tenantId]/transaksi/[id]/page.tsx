import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Check,
  X,
  Send,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Building2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

interface TransaksiDetailPageProps {
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

// Server Action: delete transaction (Draft only)
async function deleteTransactionAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentUser = session.user;
  const txId = Number(formData.get("txId"));
  const tenantId = formData.get("tenantId") as string;

  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
  });

  if (!tx || tx.tenantId !== Number(tenantId)) {
    return { error: "Transaksi tidak ditemukan" };
  }

  if (tx.status !== "Draft") {
    return { error: "Hanya draft yang bisa dihapus" };
  }

  await prisma.$transaction(async (txn) => {
    await txn.transaction.delete({ where: { id: txId } });
  });

  await logAction({
    tenantId: tx.tenantId,
    actorId: Number(currentUser.id),
    action: "delete",
    entity: "Transaction",
    entityId: txId,
    metadata: { amount: tx.amount, type: tx.type },
  });

  revalidatePath(`/dashboard/tenant/${tenantId}/transaksi`);
  redirect(`/dashboard/tenant/${tenantId}/transaksi`);
}

// Server Action: submit draft for approval
async function submitForApprovalAction(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentUser = session.user;
  const txId = Number(formData.get("txId"));
  const tenantId = formData.get("tenantId") as string;

  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
  });

  if (!tx || tx.tenantId !== Number(tenantId)) {
    return { error: "Transaksi tidak ditemukan" };
  }

  if (tx.status !== "Draft") {
    return { error: "Hanya draft yang bisa diajukan" };
  }

  await prisma.transaction.update({
    where: { id: txId },
    data: { status: "Submitted" },
  });

  await logAction({
    tenantId: tx.tenantId,
    actorId: Number(currentUser.id),
    action: "submit",
    entity: "Transaction",
    entityId: txId,
    metadata: { amount: tx.amount, type: tx.type },
  });

  // Create notification for approvers
  const approvers = await prisma.user.findMany({
    where: {
      tenantId: Number(tenantId),
      role: { in: ["Manager", "Pimpinan"] },
    },
    select: { id: true },
  });

  for (const approver of approvers) {
    await prisma.notification.create({
      data: {
        tenantId: Number(tenantId),
        userId: approver.id,
        title: "Transaksi Perlu Persetujuan",
        message: `${currentUser.name} mengajukan transaksi ${formatCurrency(Number(tx.amount))} untuk persetujuan`,
        type: "approval",
      },
    });
  }

  revalidatePath(`/dashboard/tenant/${tenantId}/transaksi`);
  redirect(`/dashboard/tenant/${tenantId}/transaksi`);
}

export default async function TransaksiDetailPage({ params }: TransaksiDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId, id } = await params;
  const tenantIdNum = parseInt(tenantId);
  const txId = parseInt(id);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    include: {
      unit: true,
      user: { select: { name: true, email: true } },
      approvals: {
        include: { approver: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!tx || tx.tenantId !== tenantIdNum) {
    redirect(`/dashboard/tenant/${tenantId}/transaksi`);
  }

  const canEdit = tx.status === "Draft" && (user.role === "Staff" || user.role === "Manager" || user.role === "Pimpinan");
  const canSubmit = tx.status === "Draft";
  const canDelete = tx.status === "Draft";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-income/10 text-income";
      case "Rejected":
        return "bg-expense/10 text-expense";
      case "Draft":
        return "bg-surface-container-high text-on-surface-variant";
      case "Submitted":
        return "bg-warning/10 text-warning";
      case "Pending":
        return "bg-warning/10 text-warning";
      default:
        return "bg-surface-container-high text-on-surface-variant";
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/transaksi`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Detail Transaksi</h1>
        <div className="flex items-center gap-2 w-10">
          {canEdit && (
            <Link
              href={`/dashboard/tenant/${tenantId}/transaksi/${tx.id}/edit`}
              className="p-2 text-on-surface-variant hover:text-primary rounded-xl-custom touch-target"
              title="Edit"
            >
              <Edit2 className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl-custom font-medium",
            getStatusColor(tx.status)
          )}
        >
          {tx.status === "Submitted" && <AlertTriangle className="w-4 h-4" />}
          {tx.status === "Pending" && <Clock className="w-4 h-4" />}
          {tx.status === "Approved" && <Check className="w-4 h-4" />}
          {tx.status === "Rejected" && <X className="w-4 h-4" />}
          {tx.status === "Draft" && <FileText className="w-4 h-4" />}
          {tx.status === "Submitted" ? "Diajukan - Review Manager" :
           tx.status === "Pending" ? "Menunggu - Persetujuan Pimpinan" :
           tx.status === "Approved" ? "Disetujui" :
           tx.status === "Rejected" ? "Ditolak" : "Draft"}
        </span>
      </div>

      {/* Transaction Info */}
      <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Jenis</p>
            <p
              className={cn(
                "font-mono-num text-lg font-semibold",
                tx.type === "Debit" ? "text-income" : "text-expense"
              )}
            >
              {tx.type === "Debit" ? "Pemasukan" : "Pengeluaran"}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Metode</p>
            <p className="font-body text-body text-on-surface flex items-center gap-2 mt-1">
              <DollarSign className="w-4 h-4 text-primary" />
              {tx.method}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Kategori</p>
            <p className="font-body text-body text-on-surface flex items-center gap-2 mt-1">
              <Tag className="w-4 h-4 text-secondary" />
              {tx.category}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Nominal</p>
            <p
              className={cn(
                "font-mono-num text-lg font-semibold",
                tx.type === "Debit" ? "text-income" : "text-expense"
              )}
            >
              {formatCurrency(Number(tx.amount))}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Tanggal Transaksi</p>
            <p className="font-body text-body text-on-surface flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-warning" />
              {format(new Date(tx.transactionDate), "dd MMMM yyyy", { locale: id })}
            </p>
          </div>
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Unit</p>
            <p className="font-body text-body text-on-surface flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-primary" />
              {tx.unit.name} ({tx.unit.type})
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Keterangan</p>
          <p className="font-body text-body text-on-surface mt-1">{tx.description || "-"}</p>
        </div>

        {/* Photo */}
        {tx.photoUrl && (
          <div>
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

        {/* Pengaju */}
        <div className="pt-4 border-t border-outline-variant">
          <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Diajukan Oleh</p>
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

        {/* Audit Info */}
        <div className="pt-4 border-t border-outline-variant grid grid-cols-2 gap-4">
          <div>
            <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Dibuat</p>
            <p className="font-body text-body text-on-surface mt-1">
              {format(new Date(tx.createdAt), "dd MMMM yyyy HH:mm", { locale: id })}
            </p>
          </div>
          {tx.approvedAt && (
            <div>
              <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">Disetujui Pada</p>
              <p className="font-body text-body text-on-surface mt-1">
                {format(new Date(tx.approvedAt), "dd MMMM yyyy HH:mm", { locale: id })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Approval History */}
      {tx.approvals.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant">
          <h2 className="font-h3 text-h3 text-on-surface mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Riwayat Persetujuan
          </h2>
          <div className="space-y-3">
            {tx.approvals.map((approval, index) => (
              <div key={approval.id} className="bg-surface-container-low rounded-xl-custom p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-body text-body text-on-surface">{approval.approver.name}</p>
                        <span
                          className={cn(
                            "inline-flex px-2 py-0.5 rounded-xl-custom font-caption text-caption",
                            approval.status === "Approved"
                              ? "bg-income/10 text-income"
                              : "bg-expense/10 text-expense"
                          )}
                        >
                          {approval.status === "Approved" ? "Disetujui" : "Ditolak"}
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
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {canSubmit && (
        <form action={submitForApprovalAction}>
          <input type="hidden" name="txId" value={tx.id} />
          <input type="hidden" name="tenantId" value={tenantId} />
          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-medium flex items-center justify-center gap-2 touch-target transition-colors"
          >
            <Send className="w-5 h-5" />
            Ajukan untuk Persetujuan
          </button>
        </form>
      )}

      {canDelete && (
        <form action={deleteTransactionAction}>
          <input type="hidden" name="txId" value={tx.id} />
          <input type="hidden" name="tenantId" value={tenantId} />
          <button
            type="submit"
            className="w-full bg-error hover:bg-error/90 text-on-error py-3 rounded-xl-custom font-medium flex items-center justify-center gap-2 touch-target transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Hapus Draft
          </button>
        </form>
      )}

      {!canSubmit && !canDelete && (
        <div className="bg-surface-container-low rounded-xl-custom p-5 text-center">
          <p className="font-body text-body text-on-surface-variant">
            Transaksi ini sudah {tx.status === "Approved" ? "disetujui" : tx.status === "Rejected" ? "ditolak" : "diajukan"}.
          </p>
        </div>
      )}
    </div>
  );
}

