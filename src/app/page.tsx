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
  Check,
  X,
  ChevronDown,
  Layers,
  Heart,
  FileText,
  BellRing,
  Award,
  Shield,
  HelpCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq((prev) => (prev === index ? null : index));
  };

  const handleCopyShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.origin);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const faqs = [
    {
      q: "Apakah StudyAir benar-benar 100% gratis?",
      a: "Ya! StudyAir dibuat murni untuk membantu pelajar Indonesia. Tidak ada biaya langganan, tidak ada fitur berbayar (paywall), dan tidak ada iklan sama sekali.",
    },
    {
      q: "Apakah aplikasi ini bisa digunakan tanpa koneksi internet (offline)?",
      a: "Bisa! Seluruh data jadwal pelajaran, tugas harian, dan naga streak disimpan secara lokal di perangkat Anda (menggunakan database SQLite aman di HP dan LocalStorage di browser). Anda tetap bisa menyusun dan melihat jadwal walau sedang tidak ada kuota.",
    },
    {
      q: "Apakah saya harus mendaftar akun atau memasukkan email?",
      a: "Tidak perlu. Anda tidak perlu login, tidak perlu password, dan tidak perlu menyerahkan data pribadi apa pun. Begitu membuka aplikasi di web atau Android, Anda langsung dapat menggunakannya.",
    },
    {
      q: "Apa perbedaan membuka di Web (/app) dengan mengunduh APK Android?",
      a: "Keduanya menjalankan fitur StudyAir v2 yang sama lengkapnya. Versi Web (/app) sangat praktis karena bisa dibuka langsung di browser HP apa pun (iPhone, Android) atau laptop. Versi APK Android adalah aplikasi native mandiri yang terpasang langsung di menu HP Anda dengan performa maksimal dan akses notifikasi.",
    },
    {
      q: "Bagaimana cara kerja maskot Naga Streak dan Auto-Freeze?",
      a: "Setiap kali Anda menyelesaikan tugas atau sesi fokus belajar, api naga streak Anda bertambah dan naga akan berevolusi (Telur → Bayi → Remaja → Naga Dewasa). Jika di hari sekolah Anda berhalangan belajar (misalnya karena sakit atau lelah), sistem akan otomatis mengaktifkan Streak Freeze agar rantai streak belajar Anda tidak pernah hangus.",
    },
    {
      q: "Apakah jadwal 10 JP sekolah saya bisa diatur berbeda untuk hari Jumat?",
      a: "Bisa! StudyAir dirancang khusus untuk sekolah di Indonesia. Jam kepulangan lebih awal di hari Jumat atau jam istirahat/ishoma dapat disesuaikan dengan mudah melalui menu 'Jam Pelajaran' atau wizard 'Susun Manual'.",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-background selection:bg-primary/20 transition-colors">
      {/* ─── Hero Section ─── */}
      <section className="relative border-b border-border/80 bg-gradient-to-b from-background via-background/95 to-muted/20 pt-12 pb-16 sm:pt-16 sm:pb-24 overflow-hidden">
        {/* Ambient subtle glow background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Release Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>StudyAir v2.0.1 • Aplikasi Resmi Pelajar SMP & SMA</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.15]">
                Jadwal Belajar Rapi. <br />
                <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-primary to-indigo-400">
                  Tugas Selesai Tanpa Begadang.
                </span>
              </h1>

              {/* Sub-headline */}
              <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                Asisten jadwal belajar pintar untuk siswa SMP & SMA Indonesia. Masukkan tugasmu, ketuk <strong>&ldquo;Buat Jadwal&rdquo;</strong>, dan StudyAir secara otomatis menyusun waktu belajar optimal di sela jam sekolahmu — lengkap dengan maskot naga streak, sinkronisasi 10 jam pelajaran, dan kalkulator nilai rapor Kurikulum Merdeka.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                <Link href="/app">
                  <Button
                    size="lg"
                    className="gap-2.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base rounded-2xl px-7 py-6 font-bold shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Smartphone className="h-5 w-5" />
                    <span>Coba di Browser (Layar Penuh)</span>
                  </Button>
                </Link>

                <Link href="/download">
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2.5 text-sm sm:text-base rounded-2xl px-6 py-6 border-border/80 hover:bg-muted/40 font-semibold cursor-pointer transition-all"
                  >
                    <Download className="h-5 w-5 text-emerald-400" />
                    <span>Unduh APK v2.0.1 (86 MB)</span>
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
                  <span>100% Gratis & Bebas Iklan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Standar Kurikulum Merdeka</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Tersimpan Aman & Offline Ready</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Smartphone Mockup Stage */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative mx-auto w-full max-w-[390px]">
                {/* Outer Glow Halo */}
                <div className="absolute -inset-1.5 rounded-[48px] bg-gradient-to-tr from-primary/30 via-indigo-500/20 to-emerald-500/20 blur-xl opacity-75 animate-pulse" />

                {/* Smartphone Device Frame */}
                <div className="relative rounded-[44px] border-[5px] border-slate-700/80 bg-slate-950 shadow-2xl overflow-hidden aspect-[9/19] flex flex-col">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 h-5 w-24 bg-black rounded-full flex items-center justify-end pr-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-900 border border-slate-700/60" />
                  </div>

                  {/* Header Bar inside Phone Frame */}
                  <div className="bg-slate-900/95 border-b border-slate-800 px-4 pt-7 pb-2.5 flex items-center justify-between text-xs text-slate-300 z-20">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">StudyAir Live Web</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <Link
                      href="/app"
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>Buka Layar Penuh</span>
                      <Maximize2 className="h-3 w-3" />
                    </Link>
                  </div>

                  {/* Embedded Iframe */}
                  <div className="relative flex-1 bg-[#090d16]">
                    {!iframeLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-xs text-muted-foreground bg-[#090d16] z-10">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Memuat Aplikasi StudyAir...</span>
                      </div>
                    )}
                    <iframe
                      src="/app"
                      title="StudyAir Web Application"
                      onLoad={() => setIframeLoaded(true)}
                      className="w-full h-full border-none"
                      allow="autoplay; clipboard-write; web-share"
                    />
                  </div>

                  {/* Phone Bottom Home Bar */}
                  <div className="bg-slate-900/90 py-1.5 flex justify-center z-20">
                    <div className="h-1 w-28 bg-slate-600/60 rounded-full" />
                  </div>
                </div>

                {/* Sub-caption below phone frame */}
                <div className="mt-3 text-center flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  <span>📱 Klik dan coba langsung fiturnya di atas</span>
                  <span>•</span>
                  <button
                    onClick={handleCopyShare}
                    className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Salin Tautan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Problem vs Solution Comparison ─── */}
      <section className="py-16 sm:py-24 border-b border-border/80 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">
              Realitas Siswa Indonesia
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Kenapa Belajar Terasa Berat Sebelum Pakai StudyAir?
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Jadwal sekolah dari pagi sampai sore dengan 10 jam pelajaran seringkali membuat waktu setelah pulang terasa habis begitu saja.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {/* Tanpa StudyAir */}
            <Card className="border-rose-500/20 bg-rose-500/5 shadow-sm">
              <CardContent className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                    <X className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-foreground">
                      Sebelum Pakai StudyAir
                    </h4>
                    <p className="text-xs text-rose-400">Stres, Sering Lupa, & Begadang</p>
                  </div>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-muted-foreground">
                  <li className="flex items-start gap-2.5">
                    <X className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Jadwal sekolah dicatat di kertas yang mudah hilang atau tertimbun di chat grup WhatsApp.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <X className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Tugas baru dikerjakan jam 11 malam karena panik tenggat waktu besok pagi.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <X className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Tas sekolah berat karena semua buku cetak dibawa akibat lupa mengecek jadwal seragam dan buku.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <X className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Nilai rapor semester tidak terencana, panik menjelang seleksi masuk PTN (SNBP).</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Dengan StudyAir */}
            <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-md">
              <CardContent className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-foreground">
                      Dengan StudyAir v2
                    </h4>
                    <p className="text-xs text-emerald-400">Tenang, Teratur, & Berprestasi</p>
                  </div>
                </div>

                <ul className="space-y-3.5 text-xs sm:text-sm text-foreground">
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Jadwal 10 JP otomatis tersinkron di HP dengan jam istirahat dan kepulangan hari Jumat.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Ketuk <strong>&ldquo;Buat Jadwal&rdquo;</strong> dalam 10 detik: tugas dipecah rapi di waktu luang sore hari.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Checklist tas besok otomatis menampilkan buku yang harus dibawa sesuai jadwal pelajaran.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Maskot naga streak menjaga motivasi belajar harian dengan proteksi Auto-Freeze jika lelah.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── The 4 Pillars Showcase ─── */}
      <section id="fitur" className="py-16 sm:py-24 border-b border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">
              Fitur Lengkap StudyAir v2
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Dirancang Khusus Sesuai Ritme Pelajar Indonesia
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Bukan sekadar to-do list biasa. Ini adalah sistem penjadwalan terintegrasi yang menghormati waktu istirahat dan jam sekolahmu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pillar 1 */}
            <Card className="border-border/80 bg-card/60 hover:border-primary/40 transition-all shadow-sm">
              <CardContent className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Zap className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-foreground">
                  1. Algoritma Buat Jadwal 10 Detik
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cukup tambahkan tugas, atur estimasi waktu (misal 30 menit), dan ketuk <strong>&ldquo;Buat Jadwal&rdquo;</strong>. Algoritma deterministik kami menyusun blok belajar di waktu luang tanpa menabrak jam sekolah. Jika terlewat, blok belajar otomatis dijadwal ulang tanpa menghakimi.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span>AI Mengekstrak, Kode Memutuskan</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            {/* Pillar 2 */}
            <Card className="border-border/80 bg-card/60 hover:border-blue-400/40 transition-all shadow-sm">
              <CardContent className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-foreground">
                  2. Jadwal 10 JP & Susun Manual
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Mendukung hingga 10 jam pelajaran penuh, istirahat ganda, dan kepulangan pendek hari Jumat. Dilengkapi fitur modal <strong>Jam Pelajaran</strong> langsung di tab Jadwal dan wizard <strong>Susun Manual</strong> untuk menata mapel mingguan dalam sekejap.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-blue-400">
                  <span>Sinkronisasi Penuh di Seluruh Tab</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            {/* Pillar 3 */}
            <Card className="border-border/80 bg-card/60 hover:border-amber-400/40 transition-all shadow-sm">
              <CardContent className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <Flame className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-foreground">
                  3. Naga Streak & Proteksi Smart Freeze
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bangun konsistensi belajar bersama maskot naga interaktif yang berevolusi melalui 4 tahap (Telur, Bayi, Remaja, Dewasa). Sakit atau ada kendala di hari sekolah? <strong>Streak Freeze</strong> otomatis melindungi rantai hari belajarmu agar tidak reset.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <span>Audio Taktil & 7 Tema Tampilan</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>

            {/* Pillar 4 */}
            <Card className="border-border/80 bg-card/60 hover:border-indigo-400/40 transition-all shadow-sm">
              <CardContent className="p-8 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-foreground">
                  4. Kalkulator Nilai Rapor & Target SNBP
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hitung rata-rata nilai semester dengan skala Kurikulum Merdeka (0-100) dan bobot SKS. Pantau kemajuan mata pelajaran prioritas untuk memperbesar peluang lolos Seleksi Nasional Berdasarkan Prestasi (SNBP) dan UTBK.
                </p>
                <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <span>Persiapan Menuju PTN Impian</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Student Personas / Real Scenarios ─── */}
      <section className="py-16 sm:py-24 border-b border-border/80 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">
              Dibuat Untuk Siapa?
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Cocok Untuk Semua Jenjang Pelajar
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Persona 1 */}
            <Card className="border-border/80 bg-card/60 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                SMA
              </div>
              <h4 className="text-base font-bold text-foreground">
                Pejuang SNBP & UTBK (Kelas 10-12)
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Menjaga tren nilai rapor agar stabil naik di setiap semester, menyusun blok latihan soal mandiri tanpa terganggu tugas harian sekolah.
              </p>
            </Card>

            {/* Persona 2 */}
            <Card className="border-border/80 bg-card/60 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                SMP
              </div>
              <h4 className="text-base font-bold text-foreground">
                Fase Adaptasi & Mapel Baru (Kelas 7-9)
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Transisi dari SD ke SMP yang memiliki 11+ mata pelajaran berbeda. Checklist seragam dan buku esok hari membuat persiapan sekolah bebas panik.
              </p>
            </Card>

            {/* Persona 3 */}
            <Card className="border-border/80 bg-card/60 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">
                Ekskul
              </div>
              <h4 className="text-base font-bold text-foreground">
                Siswa Aktif OSIS, Paskibra & Olahraga
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Punya agenda latihan sore atau rapat organisasi yang padat? StudyAir otomatis menyelipkan sesi belajar pendek 25 menit yang efisien.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Interactive FAQ Accordion ─── */}
      <section className="py-16 sm:py-24 border-b border-border/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">
              Tanya Jawab (FAQ)
            </h2>
            <h3 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Pertanyaan yang Sering Diajukan
            </h3>
            <p className="text-sm text-muted-foreground">
              Semua hal yang perlu kamu ketahui tentang privasi, fitur, dan akses StudyAir.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-border/80 bg-card/40 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ml-4 ${
                        isOpen ? "rotate-180 text-primary" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Bottom Pre-Footer CTA ─── */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-background to-primary/10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Award className="h-3.5 w-3.5" />
            <span>Mulai Jadwal Belajarmu Hari Ini</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Bebaskan Diri dari Stres Jadwal Sekolah
          </h2>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Tidak ada lagi tugas tertinggal atau buku salah bawa. Buka langsung di browser atau pasang APK standalone di Android-mu sekarang.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link href="/app">
              <Button
                size="lg"
                className="gap-2.5 bg-primary text-primary-foreground hover:bg-primary/90 text-sm sm:text-base rounded-2xl px-8 py-6 font-bold shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Smartphone className="h-5 w-5" />
                <span>Buka Aplikasi Web Sekarang</span>
              </Button>
            </Link>

            <Link href="/download">
              <Button
                size="lg"
                variant="outline"
                className="gap-2.5 text-sm sm:text-base rounded-2xl px-7 py-6 border-border/80 hover:bg-muted/40 font-semibold cursor-pointer transition-all"
              >
                <Download className="h-5 w-5 text-emerald-400" />
                <span>Unduh APK v2.0.1</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
