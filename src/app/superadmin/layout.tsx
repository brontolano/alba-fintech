import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  Warehouse,
  Settings,
  LogOut,
  Bell,
  Menu,
  Shield,
  UserCheck,
  UserMinus,
} from "lucide-react";

const navItems = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/superadmin/tenants", label: "Tenant", icon: Building2 },
  { href: "/superadmin/units", label: "Unit", icon: Warehouse },
  { href: "/superadmin/managers", label: "Manager", icon: UserCheck },
  { href: "/superadmin/staff", label: "Staff", icon: Users },
  { href: "/superadmin/pimpinan", label: "Pimpinan", icon: Shield },
];

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "Superadmin") redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar (Desktop) */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 overflow-y-auto hidden md:block">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center text-white font-bold">
                ALBA
              </div>
              <div>
                <p className="font-semibold text-slate-900">Super Admin</p>
                <p className="text-xs text-slate-500">Control Panel</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-navy/5 hover:text-navy transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-slate-200">
            <form action={async () => { "use server"; await signOut({ callbackUrl: "/login" }); }}>
              <button type="submit" className="flex items-center gap-3 w-full px-4 py-2.5 text-slate-700 hover:bg-rose/5 hover:text-rose transition-colors rounded-lg">
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-slate-900">
            {navItems.find((i) => i.href === "/superadmin")?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-slate-100 transition">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose rounded-full" />
            </button>
            <div className="w-8 h-8 bg-navy/10 rounded-full flex items-center justify-center text-navy font-medium text-sm">
              {session.user.name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
          <div className="grid grid-cols-5">
            {navItems.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center py-2 text-slate-500 hover:text-navy active:text-navy transition"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-0.5 font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}