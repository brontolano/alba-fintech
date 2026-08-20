import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Save, Camera, Upload } from "lucide-react";
import { z } from "zod";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

interface TransaksiEditPageProps {
  params: Promise<{ tenantId: string; id: string }>;
}

export const dynamic = "force-dynamic";

const editSchema = z.object({
  unitId: z.string().min(1, "Unit wajib dipilih"),
  type: z.enum(["Debit", "Kredit"], { error: "Jenis transaksi wajib dipilih" }),
  method: z.enum(["Tunai", "Transfer"], { error: "Metode pembayaran wajib dipilih" }),
  category: z.string().min(1, "Kategori wajib dipilih"),
  amount: z.string().transform(Number).refine((val) => val > 0, { message: "Nominal harus lebih dari 0" }),
  description: z.string().optional(),
  transactionDate: z.string().min(1, "Tanggal wajib diisi"),
});

export default async function TransaksiEditPage({ params }: TransaksiEditPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId, id } = await params;
  const tenantIdNum = parseInt(tenantId);
  const txId = parseInt(id);
  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Fetch transaction
  const tx = await prisma.transaction.findUnique({
    where: { id: txId },
    include: { unit: true },
  });

  if (!tx || tx.tenantId !== tenantIdNum) {
    redirect(`/dashboard/tenant/${tenantId}/transaksi`);
  }

  // Only Draft can be edited
  if (tx.status !== "Draft") {
    redirect(`/dashboard/tenant/${tenantId}/transaksi/${tx.id}`);
  }

  // Check role access
  if (user.role !== "Staff" && user.role !== "Manager" && user.role !== "Pimpinan") {
    redirect(`/dashboard/tenant/${tenantId}/transaksi`);
  }

  // Fetch data for form
  const [units, categories] = await Promise.all([
    prisma.unit.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true },
    }),
    prisma.category.findMany({
      where: { tenantId: tenantIdNum },
      select: { id: true, name: true, type: true },
    }),
  ]);

  // Server Action
  async function handleUpdate(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");

    const currentUser = session.user;
    const tenantId = formData.get("tenantId") as string;
    const txId = Number(formData.get("txId"));

    const validated = editSchema.safeParse({
      unitId: formData.get("unitId"),
      type: formData.get("type"),
      method: formData.get("method"),
      category: formData.get("category"),
      amount: formData.get("amount"),
      description: formData.get("description"),
      transactionDate: formData.get("transactionDate"),
    });

    if (!validated.success) {
      return { error: validated.error.errors[0]?.message || "Validasi gagal" };
    }

    const data = validated.data;

    // Check unit access (Manager/Staff can only edit their unit)
    if (currentUser.role !== "Superadmin" && currentUser.unitId !== Number(data.unitId)) {
      return { error: "Tidak memiliki akses ke unit ini" };
    }

    const existingTx = await prisma.transaction.findUnique({
      where: { id: txId },
    });

    if (!existingTx || existingTx.tenantId !== Number(tenantId)) {
      return { error: "Transaksi tidak ditemukan" };
    }

    if (existingTx.status !== "Draft") {
      return { error: "Hanya draft yang bisa diedit" };
    }

    await prisma.transaction.update({
      where: { id: txId },
      data: {
        unitId: Number(data.unitId),
        type: data.type,
        method: data.method,
        category: data.category,
        amount: Number(data.amount),
        description: data.description || null,
        transactionDate: new Date(data.transactionDate),
      },
    });

    await logAction({
      tenantId: Number(tenantId),
      actorId: Number(currentUser.id),
      action: "update",
      entity: "Transaction",
      entityId: txId,
      metadata: { field: "amount", newValue: data.amount },
    });

    revalidatePath(`/dashboard/tenant/${tenantId}/transaksi`);
    redirect(`/dashboard/tenant/${tenantId}/transaksi/${tx.id}`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/transaksi/${tx.id}`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Edit Transaksi</h1>
        <div className="w-10" />
      </div>

      <form action={handleUpdate} className="space-y-5">
        <input type="hidden" name="tenantId" value={tenantId} />
        <input type="hidden" name="txId" value={tx.id} />

        <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-5">
          <h2 className="font-h3 text-h3 text-on-surface">Informasi Transaksi</h2>

          <div className="space-y-4">
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Unit *
              </label>
              <select
                name="unitId"
                required
                defaultValue={tx.unitId.toString()}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              >
                <option value="">Pilih Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Jenis *
                </label>
                <select
                  name="type"
                  required
                  defaultValue={tx.type}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                >
                  <option value="">Pilih Jenis</option>
                  <option value="Debit">Pemasukan (Debit)</option>
                  <option value="Kredit">Pengeluaran (Kredit)</option>
                </select>
              </div>

              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Metode *
                </label>
                <select
                  name="method"
                  required
                  defaultValue={tx.method}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                >
                  <option value="">Pilih Metode</option>
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Kategori *
              </label>
              <select
                name="category"
                required
                defaultValue={tx.category}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Nominal *
              </label>
              <input
                type="number"
                name="amount"
                required
                min="1"
                step="100"
                defaultValue={Number(tx.amount).toString()}
                placeholder="0"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num text-lg"
              />
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Tanggal *
              </label>
              <input
                type="date"
                name="transactionDate"
                required
                defaultValue={tx.transactionDate.toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              />
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-writer mb-1.5">
                Keterangan
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={tx.description || ""}
                placeholder="Keterangan tambahan (opsional)"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
              />
            </div>

            {/* Photo Upload (read-only info) */}
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">
                Foto Bukti (hanya bisa ditambah di halaman baru)
              </label>
              {tx.photoUrl ? (
                <img
                  src={tx.photoUrl}
                  alt="Bukti transaksi"
                  className="max-w-full h-auto rounded-xl-custom border border-outline-variant"
                />
              ) : (
                <div className="border-2 border-dashed border-outline-variant rounded-xl-custom p-6">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl-custom font-medium touch-target"
                      >
                        <Camera className="w-4 h-4" />
                        Ambil Foto
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-xl-custom font-medium text-on-surface hover:bg-surface-container-low transition-colors touch-target"
                      >
                        <Upload className="w-4 h-4" />
                        Pilih dari Galeri
                      </button>
                    </div>
                    <p className="font-caption text-caption text-on-surface-variant text-center">
                      Format: JPG/PNG, Maks 5MB. Foto akan dikompres otomatis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <Link
            href={`/dashboard/tenant/${tenantId}/transaksi/${tx.id}`}
            className="flex-1 px-4 py-2.5 text-on-surface-variant hover:text-on-surface font-medium text-sm text-center touch-target"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="flex-1 bg-primary hover:bg-primary/90 text-on-primary py-3 rounded-xl-custom font-medium flex items-center justify-center gap-2 touch-target transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}
