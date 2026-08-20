import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TenantSelectorPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;

  if (user.tenantId) {
    redirect("/dashboard/beranda");
  }

  // Superadmin - fetch all tenants
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-navy">ALBA Finance</h1>
            <p className="text-sm text-slate-600 mt-1">Pilih Tenant / Organisasi</p>
          </div>

          <div className="space-y-3">
            {tenants.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                Belum ada tenant. Hubungi administrator.
              </div>
            ) : (
              tenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/dashboard/tenant/${tenant.id}/beranda`}
                  className="block p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-navy/30 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-navy/10 rounded-lg flex items-center justify-center text-navy font-bold text-lg">
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{tenant.appName || tenant.name}</p>
                        <p className="text-xs text-slate-500">{tenant.name}</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Login sebagai: <span className="font-medium">{user.name}</span> ({user.email})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}