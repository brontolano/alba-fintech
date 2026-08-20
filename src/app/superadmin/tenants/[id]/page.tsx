import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { z } from "zod";
import Link from "next/link";
import { Save, X, Upload } from "lucide-react";
import { logAction } from "@/lib/audit";

const tenantSchema = z.object({
  name: z.string().min(2, "Nama tenant minimal 2 karakter"),
  appName: z.string().min(2, "Nama aplikasi minimal 2 karakter"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Warna tidak valid").default("#1E3A5F"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Warna tidak valid").default("#10B981"),
  subdomain: z.string().optional(),
  domain: z.string().optional(),
  activeModules: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditTenantPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const { id } = await params;
  const isNew = id === "new";
  const tenantIdNum = isNew ? null : parseInt(id);

  const tenant = isNew
    ? null
    : await prisma.tenant.findUnique({ where: { id: tenantIdNum! } });

  if (!isNew && !tenant) redirect("/superadmin/tenants");

  async function handleSubmit(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

    const rawData = {
      name: formData.get("name") as string,
      appName: formData.get("appName") as string,
      primaryColor: (formData.get("primaryColor") as string) || "#1E3A5F",
      secondaryColor: (formData.get("secondaryColor") as string) || "#10B981",
      subdomain: formData.get("subdomain") as string || undefined,
      domain: formData.get("domain") as string || undefined,
      activeModules: formData.getAll("activeModules") as string[],
      isActive: formData.get("isActive") === "on",
    };

    const parsed = tenantSchema.safeParse(rawData);
    if (!parsed.success) {
      return;
    }

    const data = parsed.data;

    if (isNew) {
      const newTenant = await prisma.tenant.create({
        data: {
          ...data,
          activeModules: data.activeModules?.join(",") || "transactions,reconciliation",
        },
      });
      await logAction({
        actorId: Number(session.user.id),
        action: "create",
        entity: "tenant",
        entityId: newTenant.id,
        metadata: { name: data.name, appName: data.appName },
      });
    } else {
      await prisma.tenant.update({
        where: { id: tenantIdNum! },
        data: {
          ...data,
          activeModules: data.activeModules?.join(",") || undefined,
        },
      });
      await logAction({
        actorId: Number(session.user.id),
        action: "update",
        entity: "tenant",
        entityId: tenantIdNum!,
        metadata: data,
      });
    }

    redirect("/superadmin/tenants");
  }

  const modules = [
    { value: "transactions", label: "Transaksi & Buku Besar" },
    { value: "reconciliation", label: "Rekonsiliasi" },
    { value: "inventory", label: "Inventori" },
    { value: "retail", label: "POS & Kasir" },
    { value: "ai", label: "AI Assistant" },
  ];

  const activeModules = tenant?.activeModules.split(",") || ["transactions", "reconciliation"];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isNew ? "Tenant Baru" : `Edit ${tenant?.name}`}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isNew ? "Buat tenant baru" : "Perbarui informasi tenant"}
          </p>
        </div>
        <Link
          href="/superadmin/tenants"
          className="text-slate-500 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </Link>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-medium text-slate-900">Informasi Dasar</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Tenant *</label>
              <input
                type="text"
                name="name"
                required
                defaultValue={tenant?.name || ""}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Aplikasi *</label>
              <input
                type="text"
                name="appName"
                required
                defaultValue={tenant?.appName || "ALBA Finance"}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Subdomain</label>
              <input
                type="text"
                name="subdomain"
                placeholder="contoh: pesantren-123"
                defaultValue={tenant?.subdomain || ""}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Custom Domain</label>
              <input
                type="text"
                name="domain"
                placeholder="alba.brontolano.com"
                defaultValue={tenant?.domain || ""}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={tenant?.isActive ?? true}
                className="rounded border-slate-300 text-navy focus:ring-navy"
              />
              <span className="text-sm font-medium text-slate-700">Tenant Aktif</span>
            </label>
          </div>
        </div>

        {/* Theme Colors */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-medium text-slate-900">Tema Warna</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Warna Primary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="primaryColor"
                  defaultValue={tenant?.primaryColor || "#1E3A5F"}
                  className="w-10 h-10 rounded cursor-pointer border border-slate-200"
                />
                <input
                  type="text"
                  name="primaryColor_text"
                  defaultValue={tenant?.primaryColor || "#1E3A5F"}
                  onChange={(e) => {
                    const input = (e.target as HTMLInputElement);
                    const colorPicker = input.previousElementSibling as HTMLInputElement;
                    if (colorPicker) colorPicker.value = input.value;
                  }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Warna Secondary</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="secondaryColor"
                  defaultValue={tenant?.secondaryColor || "#10B981"}
                  className="w-10 h-10 rounded cursor-pointer border border-slate-200"
                />
                <input
                  type="text"
                  name="secondaryColor_text"
                  defaultValue={tenant?.secondaryColor || "#10B981"}
                  onChange={(e) => {
                    const input = (e.target as HTMLInputElement);
                    const colorPicker = input.previousElementSibling as HTMLInputElement;
                    if (colorPicker) colorPicker.value = input.value;
                  }}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Active Modules */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-medium text-slate-900">Module Aktif</h3>
          <div className="space-y-2">
            {modules.map((mod) => (
              <label key={mod.value} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition">
                <input
                  type="checkbox"
                  name="activeModules"
                  value={mod.value}
                  defaultChecked={activeModules.includes(mod.value)}
                  className="rounded border-slate-300 text-navy focus:ring-navy"
                />
                <span className="text-sm text-slate-700">{mod.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Logo Upload */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-medium text-slate-900">Logo Tenant</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
              <Upload className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Upload logo tenant (PNG/SVG, max 2MB)</p>
              <p className="text-xs text-slate-400 mt-1">Logo akan ditampilkan di header aplikasi</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/superadmin/tenants"
            className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium text-sm"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="bg-navy hover:bg-navy/90 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            {isNew ? "Simpan Tenant" : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
