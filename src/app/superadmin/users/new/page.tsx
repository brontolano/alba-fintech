import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Save, User, Mail, Lock, Shield, Users, Warehouse, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewUserPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  const urlParams = await searchParams;
  const defaultRole = (urlParams.role as string) || "Manager";

  const tenancy = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true, appName: true, units: { select: { id: true, name: true, type: true, retailEnabled: true } } },
  });

  async function handleSubmit(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;
    const tenantId = formData.get("tenantId") as string;
    const unitId = formData.get("unitId") as string || null;
    const isActive = formData.get("isActive") === "on";

    const bcrypt = await import("bcryptjs");

    const passwordHash = await bcrypt.hash(password || "password123", 10);

    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        tenantId: tenantId ? parseInt(tenantId) : null,
        unitId: unitId ? parseInt(unitId) : null,
        isActive,
      },
    });

    // Redirect based on role
    if (role === "Pimpinan") {
      redirect("/superadmin/pimpinan");
    } else if (role === "Manager") {
      redirect("/superadmin/managers");
    } else if (role === "Staff") {
      redirect("/superadmin/staff");
    } else {
      redirect("/superadmin");
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Akun Baru</h1>
          <p className="text-sm text-slate-500 mt-1">Buat akun pengguna baru</p>
        </div>
        <Link href="/superadmin/managers" className="text-slate-500 hover:text-slate-700">
          ✕
        </Link>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h3 className="font-medium text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Informasi Akun
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap *</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password *</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              defaultValue="password123"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Password minimal 8 karakter. Default: password123</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
            <select
              name="role"
              required
              defaultValue={defaultRole}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
            >
              <option value="Pimpinan">Pimpinan (akses seluruh unit tenant)</option>
              <option value="Manager">Manager Unit (PIC unit)</option>
              <option value="Staff">Staff Unit (petugas input/kasir)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tenant *</label>
            <select
              name="tenantId"
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
            >
              <option value="">Pilih Tenant</option>
              {tenancy.map((t) => (
                <option key={t.id} value={t.id}>{t.appName || t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
            <select
              name="unitId"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy/20 text-sm"
            >
              <option value="">Tidak ada (untuk Pimpinan)</option>
              {tenancy.flatMap((t) =>
                t.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {t.appName}: {u.name} ({u.type})
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-slate-500 mt-1">Wajib pilih unit untuk Manager/Staff. Kosongkan untuk Pimpinan.</p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={true}
              className="rounded border-slate-300 text-navy focus:ring-navy"
            />
            <span className="text-sm font-medium text-slate-700">Akun Aktif</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href="/superadmin/managers"
            className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium text-sm"
          >
            Batal
          </Link>
          <button
            type="submit"
            className="bg-navy hover:bg-navy/90 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            Buat Akun
          </button>
        </div>
      </form>
    </div>
  );
}