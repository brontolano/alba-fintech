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
  Bell,
  User,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICON_MAP;
}

const ICON_MAP = {
  Home: Home,
  ArrowLeftRight: ArrowLeftRight,
  CheckCircle: CheckCircle,
  BarChart3: BarChart3,
  RefreshCw: RefreshCw,
  ShoppingCart: ShoppingCart,
  Package: Package,
  Bell: Bell,
  User: User,
  FileText: FileText,
} as const;

interface Props {
  items: NavItem[];
  basePath: string;
}

export function MobileBottomNav({ items, basePath }: Props) {
  const pathname = usePathname();

  if (!items.length) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-outline-variant safe-bottom z-50">
      <div className="max-w-container-max mx-auto">
        <div className="flex items-center justify-around h-16">
          {items.map((item) => {
            const isActive = pathname === `${basePath}/${item.href}` || pathname === `${basePath}/${item.href}/`;
            const Icon = ICON_MAP[item.icon];
            return (
              <Link
                key={item.href}
                href={`${basePath}/${item.href}`}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-14 text-xs font-medium transition-colors touch-target",
                  isActive
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 mb-0.5",
                    isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
                  )}
                />
                <span className="mt-0.5 leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}