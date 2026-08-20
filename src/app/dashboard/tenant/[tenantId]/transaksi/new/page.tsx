import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Save, Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransaksiNewPageProps {
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

export default async function TransaksiNewPage({ params }: TransaksiNewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
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

  async function handleSubmit(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user) redirect("/login");

    const currentUser = session.user;

    const unitId = parseInt(formData.get("unitId") as string);
    const type = formData.get("type") as string;
    const method = formData.get("method") as string;
    const category = formData.get("category") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const description = formData.get("description") as string;
    const transactionDate = new Date(formData.get("transactionDate") as string);

    // Validate
    if (!unitId || !type || !method || !category || isNaN(amount)) {
      return { error: "Semua field wajib diisi" };
    }

    // Check unit access
    if (currentUser.role !== "Superadmin" && currentUser.unitId !== unitId) {
      return { error: "Tidak memiliki akses ke unit ini" };
    }

    await prisma.transaction.create({
      data: {
        tenantId: tenantIdNum,
        unitId,
        userId: Number(currentUser.id),
        transactionDate,
        type,
        method,
        category,
        amount,
        description: description || null,
        photoUrl: null,
        status: "Draft",
      },
    });

    redirect(`/dashboard/tenant/${tenantId}/transaksi`);
  }

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
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Transaksi Baru</h1>
        <div className="w-10" />
      </div>

      <form action={handleSubmit} className="space-y-5">
        <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-5">
          <h2 className="font-h3 text-h3 text-on-surface">Informasi Transaksi</h2>

          <div className="space-y-4">
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Unit *</label>
              <select
                name="unitId"
                required
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              >
                <option value="">Pilih Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.type})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Jenis *</label>
                <select
                  name="type"
                  required
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                >
                  <option value="">Pilih Jenis</option>
                  <option value="Debit">Pemasukan (Debit)</option>
                  <option value="Kredit">Pengeluaran (Kredit)</option>
                </select>
              </div>

              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Metode *</label>
                <select
                  name="method"
                  required
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                >
                  <option value="">Pilih Metode</option>
                  <option value="Tunai">Tunai</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Kategori *</label>
              <select
                name="category"
                required
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Nominal *</label>
              <input
                type="number"
                name="amount"
                required
                min="1"
                step="100"
                placeholder="0"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num text-lg"
              />
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Tanggal *</label>
              <input
                type="date"
                name="transactionDate"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              />
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Keterangan</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Keterangan tambahan (opsional)"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Foto Bukti</label>
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
                  <input
                    type="file"
                    name="photo"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    id="photo-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          console.log("Photo selected:", file.name);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <p className="font-caption text-caption text-on-surface-variant text-center">
                    Format: JPG/PNG, Maks 5MB. Foto akan dikompres otomatis.
                  </p>
                </div>
              </div>
              <div className="hidden">
                <input type="text" name="photoUrl" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
          <Link
            href={`/dashboard/tenant/${tenantId}/transaksi`}
            className="px-4 py-2.5 text-on-surface-variant hover:text-on-surface font-medium text-sm touch-target"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-xl-custom font-medium flex items-center gap-2 touch-target transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Draft
          </button>
        </div>
      </form>
    </div>
  );
}