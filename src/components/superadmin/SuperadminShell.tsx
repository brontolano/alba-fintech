"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Warehouse,
  UserCheck,
  Users,
  Shield,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/superadmin/tenants", label: "Tenant", icon: Building2 },
  { href: "/superadmin/units", label: "Unit", icon: Warehouse },
  { href: "/superadmin/managers", label: "Manager", icon: UserCheck },
  { href: "/superadmin/staff", label: "Staff", icon: Users },
  { href: "/superadmin/pimpinan", label: "Pimpinan", icon: Shield },
];

function IconBox({
  icon: Icon,
  active,
  collapsed,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
}) {
  if (collapsed) return <Icon className={cn("w-5 h-5", active ? "text-on-primary-container" : "text-on-surface-variant")} />;
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-xl-custom flex items-center justify-center transition-colors",
        active
          ? "bg-primary-container text-on-primary-container"
          : "bg-surface-container-high text-on-surface-variant"
      )}
    >
      <Icon className={cn("w-5 h-5")} />
    </div>
  );
}

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <nav className="flex-1 py-3 px-2 overflow-y-auto">
      {navItems.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 my-0.5 rounded-xl-custom text-sm font-medium transition-all duration-200 group relative",
              active
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              collapsed && "justify-center"
            )}
            title={collapsed ? item.label : undefined}
          >
            <IconBox icon={item.icon} active={active} collapsed={collapsed} />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="bg-error text-on-error text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

interface SuperadminShellProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  children: React.ReactNode;
}

export function SuperadminShell({ user, children }: SuperadminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div
      className={cn(
        "h-full flex flex-col bg-surface-container-lowest border-r border-outline-variant transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-outline-variant">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 bg-primary rounded-xl-custom flex items-center justify-center text-on-primary font-bold text-sm flex-shrink-0">
              ALBA
            </div>
            <div className="min-w-0">
              <p className="font-h3 text-h3 text-on-surface leading-none">ALBA Finance Control</p>
              <p className="font-caption text-caption text-on-surface-variant mt-0.5 truncate">Super Admin</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 mx-auto bg-primary rounded-xl-custom flex items-center justify-center text-on-primary font-bold text-sm">
            ALBA
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-xl-custom text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <SidebarNav collapsed={collapsed} />

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 my-0.5 mx-2 mb-4 rounded-xl-custom font-medium text-sm transition-all duration-200 text-error hover:bg-error-container/50",
          collapsed && "justify-center"
        )}
      >
        <LogOut className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>Keluar</span>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-container-low flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block sticky top-0 h-screen flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-scrim/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-surface-container-lowest border-b border-outline-variant">
          <div className="h-16 flex items-center justify-between px-4 md:px-6 gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl-custom text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="font-h2 text-h2 text-on-surface"></h1>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="relative p-2 rounded-xl-custom text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
              </button>

              <div className="flex items-center gap-3 pl-3 ml-1 border-l border-outline-variant">
                <div className="w-9 h-9 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-medium text-sm">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="hidden lg:block min-w-0">
                  <p className="font-body text-body text-on-surface truncate max-w-[160px]">
                    {user.name || "Super Admin"}
                  </p>
                  <p className="font-caption text-caption text-on-surface-variant mt-0.5 truncate max-w-[160px]">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
