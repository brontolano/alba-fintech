import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Menu, LogOut, User, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const navItems = [
  { href: "/dashboard/beranda", label: "Beranda", icon: "🏠" },
  { href: "/dashboard/transaksi", label: "Transaksi", icon: "💰" },
  { href: "/dashboard/persetujuan", label: "Persetujuan", icon: "✅" },
  { href: "/dashboard/laporan", label: "Laporan", icon: "📊" },
  { href: "/dashboard/rekonsiliasi", label: "Rekonsiliasi", icon: "🔄" },
];

async function handleSignOut() {
  "use server";
  await signOut({ callbackUrl: "/login" });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const role = user.role as string;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/beranda" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center text-white font-bold text-sm">
                ALBA
              </div>
              <span className="font-semibold text-navy hidden sm:block">ALBA Finance</span>
            </Link>
            <span className="hidden sm:block text-slate-400">|</span>
            <span className="text-xs font-medium px-2 py-0.5 bg-emerald/10 text-emerald rounded">
              {role === "Superadmin" ? "🌐 Superadmin" : role === "Pimpinan" ? "👑 Pimpinan" : role === "Manager" ? "📋 Manager" : "👤 Staff"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-slate-100 transition">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose text-white text-xs font-medium rounded-full flex items-center justify-center">
                3
              </span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition"
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-navy/10 rounded-full flex items-center justify-center text-navy font-medium text-sm">
                  {user.name?.charAt(0) || "U"}
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-700">{user.name}</span>
                <Menu className="w-4 h-4 text-slate-500" />
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 hidden group-hover:block">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Login sebagai</p>
                  <p className="font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <Link href="/dashboard/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Settings className="w-4 h-4" />
                  Pengaturan
                </Link>
                <form action={handleSignOut}>
                  <button type="submit" className="flex items-center gap-2 w-full px-4 py-2 text-sm text-rose hover:bg-rose/10">
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-2 px-1 text-slate-500 hover:text-navy active:text-navy transition"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pt-4 pb-20 md:pb-4 px-4">
        {children}
      </main>
    </div>
  );
}