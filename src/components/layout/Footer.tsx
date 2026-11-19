"use client";

import Link from "next/link";
import {
  Smartphone,
  Download,
  Play,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowUp,
  Layers,
  GraduationCap,
  Flame,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function Footer() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full border-t border-border/80 bg-background/95 text-foreground transition-colors selection:bg-primary/20">
      {/* ─── Main Footer Content ─── */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Brand Info & Mission (Col 1-4) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <img
                src="/studyair-icon.svg"
                alt="StudyAir Logo"
                className="h-9 w-9 rounded-xl shadow-md border border-primary/20 group-hover:scale-105 transition-transform"
              />
              <span className="text-xl font-black tracking-tight text-foreground">
                Study<span className="text-primary font-black">Air</span>
              </span>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Asisten jadwal belajar cerdas untuk pelajar SMP dan SMA di Indonesia. Menyusun waktu belajar optimal di sela jam sekolah padat tanpa stres dan tanpa begadang.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                <span>Rilis v2.0.1 Aktif</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary border border-primary/20">
                <ShieldCheck className="h-3 w-3" />
                <span>100% Gratis & Tanpa Iklan</span>
              </span>
            </div>
          </div>

          {/* Quick Links: Akses Aplikasi (Col 5-6) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Akses & Platform
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 hover:text-primary transition-colors font-medium"
                >
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                  <span>Aplikasi Web (Layar Penuh)</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/download"
                  className="inline-flex items-center gap-2 hover:text-primary transition-colors font-medium"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Unduh APK Standalone (86 MB)</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/trailer"
                  className="inline-flex items-center gap-2 hover:text-primary transition-colors font-medium"
                >
                  <Play className="h-3.5 w-3.5 text-amber-400" />
                  <span>Trailer 9:16 Vertikal</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dl"
                  className="inline-flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <span>Shortlink Unduh & QR Code</span>
                </Link>
              </li>
              <li>
                <a
                  href="/api/version"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs hover:text-foreground text-muted-foreground/80"
                >
                  <span>Endpoint Status Pembaruan</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Feature Highlights (Col 7-9) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Fitur Unggulan v2
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Buat Jadwal Otomatis 10 Detik</span>
              </li>
              <li className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-blue-400" />
                <span>Jadwal 10 JP & Susun Manual</span>
              </li>
              <li className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span>Naga Streak & Auto-Freeze Shield</span>
              </li>
              <li className="flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-400" />
                <span>Nilai Rapor & Target SNBP/TKA</span>
              </li>
              <li className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-violet-400" />
                <span>Audio Taktil & 7 Tema Warna</span>
              </li>
            </ul>
          </div>

          {/* Open Source & Community (Col 10-12) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Ekosistem
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="https://github.com/mahsymahsy6-creator/StudyAir"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
                >
                  <GithubMark className="h-3.5 w-3.5" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/mahsymahsy6-creator/StudyAir/releases/tag/v2.0.1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <span>Rilis Resmi v2.0.1</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <span className="text-xs text-muted-foreground">
                  Hosting: Vercel Free Tier
                </span>
              </li>
              <li>
                <span className="text-xs text-muted-foreground">
                  Standar: Kurikulum Merdeka
                </span>
              </li>
            </ul>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={scrollToTop}
                className="gap-1.5 text-xs rounded-xl border-border/80 hover:bg-muted/40 cursor-pointer"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Kembali ke Atas</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Bottom Sub-footer ─── */}
        <div className="mt-12 border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 text-center sm:text-left">
            <span>© 2026 StudyAir. Dibuat dengan</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 inline mx-0.5" />
            <span>untuk seluruh pelajar Indonesia.</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/app" className="hover:text-foreground transition-colors">
              Buka Web App
            </Link>
            <span>•</span>
            <Link href="/download" className="hover:text-foreground transition-colors">
              Unduh APK v2.0.1
            </Link>
            <span>•</span>
            <a
              href="https://github.com/mahsymahsy6-creator/StudyAir"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Lisensi Open Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
