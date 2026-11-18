"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  BookOpen,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BOTTOM_NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/subjects", label: "Syllabus", icon: BookOpen },
  { href: "/dashboard", label: "Analytics", icon: BarChart3 },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 md:hidden pb-safe">
      {BOTTOM_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-all duration-150 min-h-[44px] active:scale-[0.95]",
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150",
                isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
