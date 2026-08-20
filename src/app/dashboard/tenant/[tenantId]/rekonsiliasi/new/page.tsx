import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Save, Wallet, Calendar } from "lucide-react";

interface RekonsiliasiNewPageProps {
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

function UnitsData({ units }: { units: Array<{ id: number; balance: number }> }) {
  return (
    <script
      id="units-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(units.map((u) => ({ id: u.id, balance: Number(u.balance) }))),
      }}
    />
  );
}

function PreviewScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const physicalInput = document.getElementById('preview-physical');
            const diffEl = document.getElementById('preview-diff');
            const unitSelect = document.querySelector('select[name="unitId"]');
            const unitsData = JSON.parse(document.getElementById('units-data').textContent);

            if (physicalInput && diffEl && unitSelect) {
              function updateDiff() {
                const physical = parseFloat(physicalInput.value) || 0;
                const selectedUnitId = unitSelect.value;
                const unit = unitsData.find(u => u.id === parseInt(selectedUnitId));
                const digital = unit ? unit.balance : 0;
                const diff = physical - digital;
                diffEl.textContent = (diff >= 0 ? "+" : "") + new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(diff);
                diffEl.className = "font-mono-num text-lg font-bold " + (diff > 0 ? "text-income" : diff < 0 ? "text-expense" : "text-primary");
              }

              physicalInput.addEventListener('input', updateDiff);
              unitSelect.addEventListener('change', updateDiff);
            }
          })();
        `,
      }}
    />
  );
}

export default async function RekonsiliasiNewPage({ params }: RekonsiliasiNewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;

  if (user.role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  // Fetch units with digital balance
  const units = await prisma.unit.findMany({
    where: { tenantId: tenantIdNum },
    select: { id: true, name: true, type: true, balance: true },
  });

  async function handleSubmit(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user) redirect("/login");

    const currentUser = session.user;

    const unitId = parseInt(formData.get("unitId") as string);
    const reconciliationDate = new Date(formData.get("reconciliationDate") as string);
    const physicalCash = parseFloat(formData.get("physicalCash") as string);
    const notes = formData.get("notes") as string;

    if (!unitId || isNaN(physicalCash) || !reconciliationDate) {
      return { error: "Semua field wajib diisi" };
    }

    // Get digital balance
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { balance: true },
    });

    if (!unit) {
      return { error: "Unit tidak ditemukan" };
    }

    const digitalBalance = Number(unit.balance);
    const difference = physicalCash - digitalBalance;

    await prisma.reconciliation.create({
      data: {
        tenantId: tenantIdNum,
        unitId,
        userId: Number(currentUser.id),
        reconciliationDate,
        physicalCash,
        digitalBalance,
        difference,
        notes: notes || null,
        status: "Pending",
      },
    });

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
        <h1 className="font-h2 text-h2 text-on-surface flex-1 text-center">Input Stor Baru</h1>
        <div className="w-10" />
      </div>

      <form action={handleSubmit} className="space-y-5">
        <div className="bg-surface-container-lowest rounded-xl-custom p-5 shadow-sm border border-outline-variant space-y-5">
          <h2 className="font-h3 text-h3 text-on-surface">Informasi Stor</h2>

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
                <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Tanggal Stor *</label>
                <input
                  type="date"
                  name="reconciliationDate"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest"
                />
              </div>
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Saldo Fisik (Kas Tersedia) *</label>
              <input
                type="number"
                name="physicalCash"
                required
                min="0"
                step="100"
                placeholder="0"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest font-mono-num text-lg"
              />
              <p className="font-caption text-caption text-on-surface-variant mt-1">Masukkan jumlah uang kas fisik yang dihitung</p>
            </div>

            <div>
              <label className="block font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1.5">Catatan</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Catatan tambahan (opsional)..."
                className="w-full px-4 py-3 border border-outline-variant rounded-xl-custom text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-container-lowest resize-none"
              />
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl-custom p-4">
          <h3 className="font-h3 text-h3 text-primary mb-3 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Preview Perbandingan
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-surface-container-lowest rounded-xl-custom p-3">
              <p className="font-caption text-caption text-on-surface-variant">Saldo Digital</p>
              <p className="font-mono-num text-lg font-bold text-primary mt-1">
                {units.length > 0 ? formatCurrency(units[0].balance) : "Pilih unit"}
              </p>
            </div>
            <div className="bg-surface-container-lowest rounded-xl-custom p-3">
              <p className="font-caption text-caption text-on-surface-variant">Saldo Fisik</p>
              <input
                type="number"
                id="preview-physical"
                min="0"
                step="100"
                placeholder="0"
                className="w-full bg-transparent border-none text-center font-mono-num text-lg focus:outline-none"
              />
            </div>
            <div className="bg-surface-container-lowest rounded-xl-custom p-3">
              <p className="font-caption text-caption text-on-surface-variant">Selisih</p>
              <p id="preview-diff" className="font-mono-num text-lg font-bold text-primary">Rp0</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
          <Link
            href={`/dashboard/tenant/${tenantId}/rekonsiliasi`}
            className="px-4 py-2.5 text-on-surface-variant hover:text-on-surface font-medium text-sm touch-target"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-xl-custom font-medium flex items-center gap-2 touch-target transition-colors"
          >
            <Save className="w-4 h-4" />
            Simpan Stor
          </button>
        </div>
      </form>

      <UnitsData units={units} />
      <PreviewScript />
    </div>
  );
}