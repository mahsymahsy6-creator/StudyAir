"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Smartphone,
  Download,
  Play,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  GraduationCap,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Zap,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto bg-background selection:bg-primary/20">
      {/* ─── Hero Section ─── */}
      <section className="relative border-b border-border bg-gradient-to-b from-background via-background/95 to-muted/20 pt-12 pb-16 sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Release Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>StudyAir v2.0.1 (Build 4) • Rilis Publik Resmi</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
                Jadwal Belajar Pintar <br />
                <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-primary to-indigo-400">
                  Untuk Pelajar SMP & SMA
                </span>
              </h1>

              {/* Sub-headline */}
              <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Tugas sekolah selesai tepat waktu tanpa begadang. Masukkan tugasmu, ketuk <strong>&ldquo;Buat Jadwal&rdquo;</strong>, dan StudyAir langsung menyusun waktu belajar optimal di sela jam sekolahmu — lengkap dengan maskot naga streak, sinkronisasi 10 jam pelajaran, dan kalkulator nilai rapor.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                <Link href="/app">
                  <Button
                    size="lg"
                    className="gap-2.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base rounded-2xl px-7 py-6 font-bold shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Smartphone className="h-5 w-5" />
                    <span>Buka Aplikasi Web (Layar Penuh)</span>
                  </Button>
                </Link>

                <Link href="/download">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2.5 text-sm sm:text-base rounded-2xl px-6 py-6 border-border hover:bg-muted/40 font-semibold cursor-pointer transition-all"
                  >
                    <Download className="h-5 w-5 text-primary" />
                    <span>Unduh APK v2.0.1</span>
                  </Button>
                </Link>

                <Link href="/trailer">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="gap-2 text-sm sm:text-base rounded-2xl px-5 py-6 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Play className="h-4 w-4 text-primary fill-primary" />
                    <span>Trailer 9:16</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>100% Gratis & Tanpa Iklan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Dukungan Kurikulum Merdeka</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Standalone APK (86.2 MB)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Smartphone Device Mockup */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-[390px] group">
                {/* Outer Glow */}
                <div className="absolute -inset-1 rounded-[52px] bg-gradient-to-tr from-primary/30 to-indigo-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />

                {/* Device Bezel */}
                <div className="relative rounded-[48px] border-[6px] border-slate-800 bg-slate-950 p-2 shadow-2xl overflow-hidden ring-1 ring-slate-700/50">
                  {/* Speaker & Dynamic Island Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 h-5 w-28 bg-slate-900 rounded-full z-20 flex items-center justify-center shadow-inner">
                    <div className="h-2 w-2 rounded-full bg-slate-950 mr-3" />
                    <div className="h-1.5 w-8 rounded-full bg-slate-800" />
                  </div>

                  {/* Device Screen Frame */}
                  <div className="relative w-full h-[680px] sm:h-[720px] rounded-[38px] overflow-hidden bg-[#090d16]">
                    {!iframeLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#090d16] text-muted-foreground z-10">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-xs font-medium">Memuat StudyAir Web...</span>
                      </div>
                    )}
                    <iframe
                      src="/app"
                      title="StudyAir Live Web Application"
                      onLoad={() => setIframeLoaded(true)}
                      className="w-full h-full border-0 select-none"
                    />
                  </div>
                </div>

                {/* Mockup Helper Banner */}
                <div className="mt-3.5 flex items-center justify-between px-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Pratinjau Interaktif Langsung
                  </span>
                  <Link
                    href="/app"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <span>Layar Penuh</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 Core Pillars of StudyAir v2 ─── */}
      <section className="py-16 sm:py-24 bg-card/40 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">
              Fitur Andalan Pelajar
            </h2>
            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Dirancang Khusus untuk Jam Sekolah Indonesia
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Jadwal sekolah bukan beban, melainkan kerangka acuan. StudyAir secara cerdas menempatkan sesi fokus belajar di waktu luangmu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <Card className="rounded-3xl border-border/80 bg-background/60 backdrop-blur-sm p-6 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-0 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                  <Zap className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-foreground">
                  1. Buat Jadwal Otomatis
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Masukkan tugas beserta estimasi menit. Cukup 1 ketukan <strong>&ldquo;Buat Jadwal&rdquo;</strong>, algoritma langsung menyusun blok belajar di waktu luang sebelum deadline.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2 */}
            <Card className="rounded-3xl border-border/80 bg-background/60 backdrop-blur-sm p-6 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-0 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-foreground">
                  2. Jadwal 10 JP & Susun Manual
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Mendukung jadwal sekolah penuh hingga 10+ jam pelajaran, bel istirahat, dan jadwal khusus Jumat. Akses langsung modal Bell Times di tab Jadwal.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3 */}
            <Card className="rounded-3xl border-border/80 bg-background/60 backdrop-blur-sm p-6 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-0 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                  <Flame className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-foreground">
                  3. Naga Streak & Auto-Freeze
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Rawat naga pendamping belajarmu dari telur hingga naga legendaris. Dilengkapi auto-protect pembeku streak saat terlewat agar konsistensi belajarmu tetap terjaga.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4 */}
            <Card className="rounded-3xl border-border/80 bg-background/60 backdrop-blur-sm p-6 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
              <CardContent className="p-0 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-bold text-foreground">
                  4. Nilai Rapor & Kalkulator TKA
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Pantau IP semester, target nilai rapor, dan peluang kelulusan jalur prestasi SNBP serta tes UTBK dengan formula bobot Kurikulum Merdeka.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Ready to Start CTA ─── */}
      <section className="py-16 sm:py-20 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Mulai Belajar Lebih Teratur Sekarang
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Gunakan langsung di browser tanpa perlu instalasi apa pun, atau unduh paket standalone APK untuk ponsel Android Anda.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app">
              <Button
                size="lg"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-sm rounded-2xl px-7 py-6 font-bold shadow-lg cursor-pointer"
              >
                <Smartphone className="h-4 w-4" />
                <span>Buka Aplikasi Web</span>
              </Button>
            </Link>

            <Link href="/download">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-sm rounded-2xl px-6 py-6 border-border hover:bg-muted/30 font-semibold cursor-pointer"
              >
                <Download className="h-4 w-4 text-primary" />
                <span>Unduh Standalone APK v2.0.1</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
