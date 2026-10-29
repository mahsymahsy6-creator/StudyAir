"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/subjects", label: "Syllabus", icon: BookOpen },
  { href: "/dashboard", label: "Analytics", icon: BarChart3 },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-15 max-w-7xl items-center px-4 sm:px-8">
        {/* ─── Brand Logo ─── */}
        <Link
          href="/calendar"
          className="mr-10 flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 shadow-md shadow-primary/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            Study<span className="text-primary font-black">Air</span>
          </span>
        </Link>

        {/* ─── Nav Links (Segmented Pill) ─── */}
        <nav className="flex items-center gap-1 rounded-xl p-1 bg-muted/20 border border-border/30">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm shadow-black/10 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ─── Right Controls ─── */}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
