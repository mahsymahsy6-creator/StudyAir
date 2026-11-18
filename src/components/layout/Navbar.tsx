"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  BookOpen,
  BarChart3,
  Sparkles,
  Download,
  Smartphone,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ThemeToggle } from "./ThemeToggle";

const GeminiApiKeyModal = dynamic(
  () =>
    import("@/components/ai/GeminiApiKeyModal").then(
      (m) => m.GeminiApiKeyModal
    ),
  { ssr: false }
);

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/app", label: "Aplikasi Web", icon: Smartphone },
  { href: "/download", label: "Unduh APK v2.0.1", icon: Download },
  { href: "/trailer", label: "Trailer 9:16", icon: Play },
  { href: "/calendar", label: "Desktop Calendar", icon: CalendarDays },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-8">
        {/* ─── Brand Logo ─── */}
        <Link
          href="/"
          className="mr-8 flex items-center gap-2.5 transition-opacity hover:opacity-90 group"
        >
          <img
            src="/studyair-icon.svg"
            alt="StudyAir Logo"
            className="h-8 w-8 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-150"
          />
          <span className="text-base font-bold tracking-tight text-foreground">
            Study<span className="text-primary font-black">Air</span>
          </span>
        </Link>

        {/* ─── Nav Links (Segmented Pill) ─── */}
        <nav className="flex items-center gap-1 rounded-xl p-1 bg-muted/40 border border-border">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 min-h-[36px]",
                  isActive
                    ? "bg-background text-foreground font-semibold border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ─── Right Controls ─── */}
        <div className="ml-auto flex items-center gap-2">
          <Link href="/app">
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-xl px-3 bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Buka Web App</span>
            </Button>
          </Link>

          {/* Active Gemini Status Pill */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGeminiModalOpen(true)}
            className="h-8 gap-2 rounded-xl px-2.5 text-xs border-border hover:bg-muted text-foreground transition-all duration-150"
            title="Gemini AI Settings"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-xs hidden sm:inline">AI Active</span>
          </Button>

          <ThemeToggle />
        </div>
      </div>

      <GeminiApiKeyModal
        open={geminiModalOpen}
        onClose={() => setGeminiModalOpen(false)}
      />
    </header>
  );
}
