"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  Download,
  Smartphone,
  Play,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

const GeminiApiKeyModal = dynamic(
  () =>
    import("@/components/ai/GeminiApiKeyModal").then(
      (m) => m.GeminiApiKeyModal
    ),
  { ssr: false }
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }> | null;
  badge?: string;
  highlight?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: null },
  { href: "/app", label: "Aplikasi Web", icon: Smartphone, highlight: "Coba di Browser" },
  { href: "/#fitur", label: "Fitur Unggulan", icon: Layers },
  { href: "/download", label: "Unduh APK", icon: Download, badge: "v2.0.1" },
  { href: "/trailer", label: "Trailer 9:16", icon: Play },
];

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70 transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ─── Brand Logo ─── */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] group"
          >
            <div className="relative">
              <img
                src="/studyair-icon.svg"
                alt="StudyAir Logo"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-md border border-primary/20 group-hover:border-primary/40 transition-colors"
              />
              <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  Study<span className="text-primary font-black">Air</span>
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                  v2.0.1
                </span>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground -mt-0.5 hidden md:inline">
                Jadwal Belajar Pintar
              </span>
            </div>
          </Link>

          {/* ─── Nav Links (Desktop Segmented Bar) ─── */}
          <nav className="hidden lg:flex items-center gap-1 rounded-2xl p-1 bg-muted/30 border border-border/80">
            {NAV_ITEMS.map(({ href, label, icon: Icon, badge, highlight }) => {
              const isActive =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 min-h-[32px]",
                    isActive
                      ? "bg-background text-foreground shadow-xs border border-border/80 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  )}
                >
                  {Icon && (
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  )}
                  <span>{label}</span>
                  {badge && (
                    <span className="ml-1 rounded-md bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                      {badge}
                    </span>
                  )}
                  {highlight && (
                    <span className="ml-1 rounded-md bg-primary/15 px-1.5 py-0.2 text-[9px] font-bold text-primary border border-primary/25">
                      {highlight}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ─── Right Controls ─── */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* GitHub Repo Link */}
          <a
            href="https://github.com/mahsymahsy6-creator/StudyAir"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 text-xs font-medium transition-all"
            title="GitHub Repository"
          >
            <GithubMark className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">GitHub</span>
          </a>

          {/* Active Gemini Status Pill */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGeminiModalOpen(true)}
            className="h-8 gap-1.5 rounded-xl px-2.5 text-xs border-border/80 hover:bg-muted/50 text-foreground transition-all cursor-pointer"
            title="Pengaturan Gemini AI"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-xs hidden md:inline">AI Siap</span>
          </Button>

          <ThemeToggle />

          {/* Primary CTA: Buka Web App */}
          <Link href="/app">
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-xl px-3.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs shadow-md hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Buka Web App</span>
            </Button>
          </Link>
        </div>
      </div>

      <GeminiApiKeyModal
        open={geminiModalOpen}
        onClose={() => setGeminiModalOpen(false)}
      />
    </header>
  );
}
