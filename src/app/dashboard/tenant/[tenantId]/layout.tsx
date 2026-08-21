import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

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

  if (role !== "Superadmin" && user.tenantId !== tenantIdNum) {
    redirect("/dashboard/tenant-selector");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantIdNum },
    select: { id: true, name: true, appName: true, primaryColor: true, secondaryColor: true },
  });

  if (!tenant) redirect("/dashboard/tenant-selector");

  // Determine unit type for current user
  let unitType: "Sederhana" | "Retail" = "Sederhana";
  let retailEnabled = false;

  if (user.unitId) {
    const unit = await prisma.unit.findUnique({
      where: { id: user.unitId },
      select: { type: true, retailEnabled: true },
    });
    if (unit) {
      unitType = unit.type as "Sederhana" | "Retail";
      retailEnabled = unit.retailEnabled;
    }
  }

  // Pimpinan sees all units — check if ANY unit is retail
  if (role === "Pimpinan") {
    const retailUnits = await prisma.unit.count({
      where: { tenantId: tenantIdNum, type: "Retail" },
    });
    retailEnabled = retailUnits > 0;
  }

  // Build nav items based on role + unit type
  const navItems = getNavItems(role, retailEnabled);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-safe">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest border-b border-outline-variant">
        <div className="flex items-center justify-between px-4 h-14 max-w-container-max mx-auto">
          <Link
            href={`/dashboard/tenant/${tenantId}/beranda`}
            className="flex items-center gap-2 touch-target"
          >
            <div
              className="w-8 h-8 rounded-xl-custom flex items-center justify-center text-on-primary font-bold text-sm"
              style={{ backgroundColor: tenant.primaryColor }}
            >
              {tenant.appName.charAt(0)}
            </div>
            <span
              className="font-semibold hidden sm:block"
              style={{ color: tenant.primaryColor }}
            >
              {tenant.appName}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/tenant/${tenantId}/notifikasi`}
              className="relative p-2 rounded-xl-custom hover:bg-surface-container-low transition-colors touch-target"
            >
              <svg className="w-5 h-5 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </Link>

            <Link
              href={`/dashboard/tenant/${tenantId}/profil`}
              className="flex items-center gap-2 p-1.5 rounded-xl-custom hover:bg-surface-container-low transition-colors touch-target"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
                {user.name?.charAt(0) || "U"}
              </div>
              <span className="hidden sm:block font-medium text-sm text-on-surface">
                {user.name}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-4 pb-24 px-4 max-w-container-max mx-auto w-full">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav
        items={navItems}
        basePath={`/dashboard/tenant/${tenantId}`}
      />
    </div>
  );
}

// ─── Nav Items Builder ─────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name
}

function getNavItems(role: string, retailEnabled: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "beranda", label: "Beranda", icon: "Home" },
    { href: "transaksi", label: "Transaksi", icon: "ArrowLeftRight" },
  ];

  if (role === "Pimpinan") {
    items.push({ href: "persetujuan", label: "Persetujuan", icon: "CheckCircle" });
    items.push({ href: "laporan", label: "Laporan", icon: "BarChart3" });
    items.push({ href: "rekonsiliasi", label: "Rekon", icon: "RefreshCw" });
  } else if (role === "Manager") {
    items.push({ href: "persetujuan", label: "Persetujuan", icon: "CheckCircle" });
    if (retailEnabled) {
      items.push({ href: "pos", label: "POS", icon: "ShoppingCart" });
      items.push({ href: "inventory", label: "Stok", icon: "Package" });
    }
  } else {
    // Staff
    if (retailEnabled) {
      items.push({ href: "pos", label: "Kasir", icon: "ShoppingCart" });
      items.push({ href: "inventory", label: "Stok", icon: "Package" });
    }
  }

  return items;
}
