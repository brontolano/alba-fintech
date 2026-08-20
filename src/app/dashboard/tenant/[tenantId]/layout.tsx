import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Building2, LogOut, Bell, Menu, User, Settings, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "beranda", label: "Beranda", icon: Building2 },
  { href: "transaksi", label: "Transaksi", icon: "💰" },
  { href: "persetujuan", label: "Persetujuan", icon: "✅" },
  { href: "laporan", label: "Laporan", icon: "📊" },
  { href: "rekonsiliasi", label: "Rekonsiliasi", icon: "🔄" },
];

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}

export const dynamic = "force-dynamic";

export default async function TenantDashboardLayout({
  children,
  params,
}: TenantLayoutProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { tenantId } = await params;
  const tenantIdNum = parseInt(tenantId);

  const user = session.user;
  const role = user.role as string;

  // Validate tenant access
  if (role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantIdNum },
    select: { id: true, name: true, appName: true, primaryColor: true },
  });

  if (!tenant) {
    redirect("/dashboard/tenant-selector");
  }

  // Determine which nav items to show based on role
  const getRoleNavItems = () => {
    const baseItems = [
      { href: "beranda", label: "Beranda", icon: Building2 },
    ];

    if (role === "Pimpinan") {
      return [
        ...baseItems,
        { href: "transaksi", label: "Transaksi", icon: "💰" },
        { href: "persetujuan", label: "Persetujuan", icon: "✅" },
        { href: "laporan", label: "Laporan", icon: "📊" },
        { href: "rekonsiliasi", label: "Rekonsiliasi", icon: "🔄" },
      ];
    }

    if (role === "Manager") {
      return [
        ...baseItems,
        { href: "transaksi", label: "Transaksi", icon: "💰" },
        { href: "persetujuan", label: "Persetujuan", icon: "✅" },
        { href: "rekonsiliasi", label: "Rekonsiliasi", icon: "🔄" },
      ];
    }

    // Staff
    return [
      ...baseItems,
      { href: "transaksi", label: "Transaksi", icon: "💰" },
      { href: "persetujuan", label: "Status", icon: "📋" },
    ];
  };

  const roleNavItems = getRoleNavItems();

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant">
        <div className="flex items-center justify-between px-space-4 h-14">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/tenant/${tenantId}/beranda`}
              className="flex items-center gap-2"
            >
              <Building2 className="w-6 h-6 text-primary" />
              <span className="font-semibold text-primary hidden sm:block">
                {tenant.appName || tenant.name}
              </span>
            </Link>
            <span className="hidden sm:block text-on-surface-variant">|</span>
            <span className="text-xs font-medium px-2 py-0.5 bg-income/10 text-income rounded-xl-custom">
              {role === "Superadmin"
                ? "Superadmin"
                : role === "Pimpinan"
                ? "Pimpinan"
                : role === "Manager"
                ? "Manager"
                : "Staff"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Link
              href={`/dashboard/tenant/${tenantId}/notifikasi`}
              className="relative p-2 rounded-lg hover:bg-surface-container-low transition-colors touch-target"
            >
              <Bell className="w-5 h-5 text-on-surface-variant" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-error text-on-error text-xs font-medium rounded-full flex items-center justify-center">
                3
              </span>
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container-low transition-colors touch-target"
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
                  {user.name?.charAt(0) || "U"}
                </div>
                <span className="hidden sm:block text-sm font-medium text-on-surface">
                  {user.name}
                </span>
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl-custom shadow-lg border border-outline-variant py-1 hidden group-hover:block">
                <div className="px-space-4 py-2 border-b border-outline-variant">
                  <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider">
                    Login sebagai
                  </p>
                  <p className="font-body text-body text-on-surface">{user.name}</p>
                  <p className="font-caption text-caption text-on-surface-variant">{user.email}</p>
                </div>
                <Link
                  href={`/dashboard/tenant/${tenantId}/profil`}
                  className="flex items-center gap-2 px-space-4 py-2 font-body text-body text-on-surface hover:bg-surface-container-low rounded-none"
                >
                  <User className="w-5 h-5" />
                  Profil
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-space-4 py-2 font-body text-body text-on-surface hover:bg-surface-container-low rounded-none"
                >
                  <Settings className="w-5 h-5" />
                  Pengaturan
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await (await import("@/lib/auth")).signOut({ callbackUrl: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-2 w-full px-space-4 py-2 font-body text-body text-error hover:bg-error-container rounded-none"
                  >
                    <LogOut className="w-5 h-5" />
                    Keluar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-4 pb-24 px-space-4 sm:pb-4 max-w-container-max mx-auto">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) - Material Design 3 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant z-50 md:hidden safe-area-bottom">
        <div className="grid grid-cols-5 max-w-container-max mx-auto">
          {roleNavItems.map((item) => (
            <Link
              key={item.href}
              href={`/dashboard/tenant/${tenantId}/${item.href}`}
              className="flex flex-col items-center justify-center py-2 px-1 text-on-surface-variant active:text-primary transition-colors touch-target"
            >
              {typeof item.icon === "string" ? (
                <span className="text-xl mb-1">{item.icon}</span>
              ) : (
                <item.icon className="w-6 h-6 mb-1" />
              )}
              <span className="font-caption text-caption">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}