"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ArrowLeftRight,
  CheckCircle,
  BarChart3,
  RefreshCw,
  ShoppingCart,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface MobileBottomNavProps {
  items: NavItem[];
  basePath: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  ArrowLeftRight,
  CheckCircle,
  BarChart3,
  RefreshCw,
  ShoppingCart,
  Package,
};

export function MobileBottomNav({ items, basePath }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant z-50 md:hidden safe-area-bottom">
      <div
        className={cn(
          "grid max-w-container-max mx-auto",
          items.length === 3 && "grid-cols-3",
          items.length === 4 && "grid-cols-4",
          items.length === 5 && "grid-cols-5"
        )}
      >
        {items.map((item) => {
          const fullPath = `${basePath}/${item.href}`;
          const isActive =
            pathname === fullPath || pathname.startsWith(fullPath + "/");
          const Icon = iconMap[item.icon] || Home;

          return (
            <Link
              key={item.href}
              href={fullPath}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 transition-colors touch-target min-h-[56px]",
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center transition-all duration-200",
                  isActive ? "w-16 h-8 rounded-xl-custom bg-primary-container" : "w-8 h-8"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all",
                    isActive && "text-on-primary-container"
                  )}
                />
             </div>
              <span
                className={cn(
                  "font-caption text-caption mt-0.5 truncate max-w-full",
                  isActive && "font-medium"
                )}
              >
                {item.label}
             </span>
           </Link>
          );
        })}
     </div>
   </nav>
  );
}
