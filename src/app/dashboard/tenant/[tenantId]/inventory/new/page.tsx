import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Save, Camera, Image, Plus, Tag } from "lucide-react";

interface InventoryNewPageProps {
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

export default async function InventoryNewPage({ params }: InventoryNewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  async function handleSubmit(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user) redirect("/login");

    const currentUser = session.user;

    const name = formData.get("name") as string;
    const sku = formData.get("sku") as string || null;
    const category = formData.get("category") as string || null;
    const unitOfMeasure = formData.get("unitOfMeasure") as string;
    const buyPrice = formData.get("buyPrice") ? parseFloat(formData.get("buyPrice") as string) : null;
    const sellPrice = parseFloat(formData.get("sellPrice") as string);
    const stock = parseInt(formData.get("stock") as string) || 0;
    const minStock = parseInt(formData.get("minStock") as string) || 0;
    const unitId = currentUser.unitId || parseInt(formData.get("unitId") as string);

    if (!name || !unitOfMeasure || isNaN(sellPrice) || !unitId) {
      return { error: "Field wajib diisi" };
    }

    await prisma.inventoryItem.create({
      data: {
        tenantId: tenantIdNum,
        unitId,
        name,
        sku,
        category,
        unitOfMeasure,
        buyPrice,
        sellPrice,
        stock,
        minStock,
        createdById: Number(currentUser.id),
      },
    });

    redirect(`/dashboard/tenant/${tenantId}/inventory`);
  }

  // Fetch units for dropdown
  const units = await prisma.unit.findMany({
    where: { tenantId: tenantIdNum, retailEnabled: true },
    select: { id: true, name: true },
  });

  const unitsOfMeasure = ["pcs", "dus", "kg", "botol", "liter", "meter", "set", "pack"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/tenant/${tenantId}/inventory`}
          className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors touch-target"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Barang Baru</h1>
        <div className="w-10" />
      </div>

      <form action={handleSubmit} className="space-y-5">
        <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-5">
          <h2 className="font-h3 text-h3 text-on-surface">Informasi Barang</h2>

          <div className="space-y-4">
            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Nama Barang *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Nasi Goreng"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              />
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">SKU / Kode Barang</label>
              <input
                type="text"
                name="sku"
                placeholder="Auto-generate jika kosong"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              />
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Kategori</label>
              <input
                type="text"
                name="category"
                placeholder="Contoh: Makanan, Minuman, Perlengkapan"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Satuan *</label>
                <select
                  name="unitOfMeasure"
                  required
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                >
                  {unitsOfMeasure.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Unit *</label>
                <select
                  name="unitId"
                  required
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                >
                  <option value="">Pilih Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Harga Beli</label>
                <input
                  type="number"
                  name="buyPrice"
                  min="0"
                  step="100"
                  placeholder="0"
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num"
                />
              </div>

              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Harga Jual *</label>
                <input
                  type="number"
                  name="sellPrice"
                  required
                  min="1"
                  step="100"
                  placeholder="0"
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Stok Awal</label>
                <input
                  type="number"
                  name="stock"
                  min="0"
                  step="1"
                  defaultValue="0"
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num"
                />
              </div>

              <div>
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Stok Minimum</label>
                <input
                  type="number"
                  name="minStock"
                  min="0"
                  step="1"
                  defaultValue="5"
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Foto Barang</label>
              <div className="border-2 border-dashed border-outline-variant rounded-xl-custom p-6">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="flex items-center gap-4">
                    <button type="button" className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl-custom font-medium touch-target">
                      <Camera className="w-4 h-4" />
                      Ambil Foto
                    </button>
                    <button type="button" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-xl-custom font-medium text-on-surface hover:bg-surface-container-low transition-colors touch-target">
                      <Image className="w-4 h-4" />
                      Pilih dari Galeri
                    </button>
                  </div>
                  <input type="file" name="photo" accept="image/*" capture="environment" className="hidden" id="photo-upload" />
                  <p className="font-caption text-caption text-on-surface-variant text-center">
                    Format: JPG/PNG, Maks 2MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
          <Link
            href={`/dashboard/tenant/${tenantId}/inventory`}
            className="px-4 py-2.5 text-on-surface-variant hover:text-on-surface font-medium text-sm touch-target"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-xl-custom font-medium flex items-center gap-2 touch-target transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Barang
          </button>
        </div>
      </form>
    </div>
  );
}