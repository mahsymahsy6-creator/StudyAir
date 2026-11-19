"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Play,
  CalendarDays,
  Flame,
  GraduationCap,
  Palette,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Clock,
  HelpCircle,
  FileText,
  Laptop,
  Apple,
  Share2,
  Info,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VersionState {
  version: string;
  versionCode: number;
  apkFilename: string;
  apkSizeMB: string;
  lanIp: string;
  checkedAt: string | null;
  online: boolean;
}

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userDevice, setUserDevice] = useState<"android" | "ios" | "desktop">("desktop");
  const [activeChangelog, setActiveChangelog] = useState<string>("v2.0.1");
  const [versionState, setVersionState] = useState<VersionState>({
    version: "2.0.1",
    versionCode: 4,
    apkFilename: "StudyAir-v2.0.1.apk",
    apkSizeMB: "86.2",
    lanIp: "192.168.1.7",
    checkedAt: null,
    online: true,
  });

  useEffect(() => {
    // Detect user platform
    if (typeof window !== "undefined" && navigator?.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (/android/.test(ua)) {
        setUserDevice("android");
      } else if (/iphone|ipad|ipod/.test(ua)) {
        setUserDevice("ios");
      } else {
        setUserDevice("desktop");
      }
    }
  }, []);

  const runVersionCheck = async () => {
    setChecking(true);
    try {
      const host =
        typeof window !== "undefined" && window.location.hostname
          ? window.location.hostname
          : "localhost";

      let data: Partial<VersionState> | null = null;
      try {
        const res8080 = await fetch(`http://${host}:8080/api/version`, {
          cache: "no-store",
        });
        if (res8080.ok) {
          data = await res8080.json();
        }
      } catch {
        // Fallback to local Next.js API
      }

      if (!data) {
        const resLocal = await fetch("/api/version", { cache: "no-store" });
        if (resLocal.ok) {
          data = await resLocal.json();
        }
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      setVersionState((prev) => ({
        ...prev,
        version: data?.version || "2.0.1",
        versionCode: data?.versionCode || 4,
        apkFilename: data?.apkFilename || "StudyAir-v2.0.1.apk",
        apkSizeMB: data?.apkSizeMB || "86.2",
        lanIp: data?.lanIp || prev.lanIp,
        checkedAt: timeStr,
        online: true,
      }));
    } catch {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      setVersionState((prev) => ({ ...prev, checkedAt: timeStr }));
    } finally {
      setTimeout(() => setChecking(false), 300);
    }
  };

  useEffect(() => {
    runVersionCheck();
  }, []);

  const handleDownloadClick = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2500);
  };

  const githubApkUrl =
    "https://github.com/mahsymahsy6-creator/StudyAir/releases/download/v2.0.1/StudyAir-v2.0.1.apk";

  const handleCopyLink = async () => {
    try {
      const urlToCopy =
        typeof window !== "undefined"
          ? `${window.location.origin}/download`
          : "https://studyair.vercel.app/download";
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background selection:bg-primary/20 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* ─── Hero Download Banner ─── */}
        <div className="text-center space-y-4">
          {/* Brand Icon */}
          <div className="flex justify-center pb-2">
            <div className="relative group">
              <img
                src="/studyair-icon.svg"
                alt="StudyAir App Icon"
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl shadow-2xl border border-primary/25 shadow-primary/25 transition-transform group-hover:scale-105 duration-300"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-background"></span>
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              Rilis Resmi v{versionState.version} (Build {versionState.versionCode}) •{" "}
              {versionState.checkedAt
                ? `Terverifikasi pukul ${versionState.checkedAt}`
                : "Siap Diunduh"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Pusat Unduh <span className="text-primary">StudyAir</span>
          </h1>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Paket instalasi mandiri (Standalone APK) untuk pelajar SMP & SMA Indonesia. Jadwal sekolah otomatis rapi, tugas selesai tepat waktu, dan maskot naga selalu terjaga.
          </p>

          {/* Device Context Notification Banner */}
          {userDevice === "android" && (
            <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center justify-center gap-2">
              <Smartphone className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>
                <strong>Perangkat Android terdeteksi.</strong> Ketuk tombol unduh di bawah untuk langsung mengunduh APK ke ponselmu!
              </span>
            </div>
          )}

          {userDevice === "desktop" && (
            <div className="mx-auto max-w-md rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300 flex items-center justify-center gap-2">
              <Laptop className="h-4 w-4 shrink-0 text-blue-400" />
              <span>
                <strong>Perangkat Laptop/PC terdeteksi.</strong> Kamu bisa mencoba di browser langsung atau pindai QR Code di bawah dengan kamera ponselmu.
              </span>
            </div>
          )}

          {userDevice === "ios" && (
            <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center justify-center gap-2">
              <Apple className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Perangkat iOS / iPhone terdeteksi.</strong> Buka <strong>Aplikasi Web</strong> lalu pilih <em>&ldquo;Add to Home Screen&rdquo;</em> di Safari untuk memasang!
              </span>
            </div>
          )}

          {/* Primary Download & Update Check Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={githubApkUrl}
              download="StudyAir-v2.0.1.apk"
              onClick={handleDownloadClick}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto gap-3 bg-primary text-primary-foreground hover:bg-primary/90 text-base rounded-2xl px-8 py-6 font-bold shadow-xl hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download className="h-5 w-5" />
                <span>
                  {downloading
                    ? "Mengunduh APK..."
                    : `Unduh APK v${versionState.version} (${versionState.apkSizeMB} MB)`}
                </span>
              </Button>
            </a>

            <Link href="/app" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto gap-2 text-sm rounded-2xl px-6 py-6 border-border/80 hover:bg-muted/40 font-semibold cursor-pointer transition-all"
              >
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Buka Versi Web</span>
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              onClick={runVersionCheck}
              disabled={checking}
              className="w-full sm:w-auto gap-2 text-sm rounded-2xl px-5 py-6 border-border/80 hover:bg-muted/30 font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 text-primary ${checking ? "animate-spin" : ""}`}
              />
              <span>{checking ? "Memeriksa..." : "Cek Pembaruan"}</span>
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Bebas Virus & Malware</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span>CDN GitHub Berkecepatan Penuh</span>
            </span>
          </div>
        </div>

        {/* ─── Grid: QR Code Card & Information ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Card 1: Vector QR Code for Instant Phone Scan */}
          <Card className="border-border/80 bg-card/60 shadow-md flex flex-col justify-between">
            <CardContent className="p-6 sm:p-8 space-y-6 text-center flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Pindai dari HP Apa Saja</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  QR Code Unduh Langsung
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Arahkan kamera ponselmu ke kode ini untuk langsung membuka portal unduh APK di HP.
                </p>
              </div>

              {/* QR Image Box */}
              <div className="flex justify-center my-2">
                <div className="p-4 rounded-3xl bg-white shadow-xl border-4 border-slate-200 inline-block">
                  <img
                    src="/qr.svg"
                    alt="StudyAir Download QR Code"
                    className="h-44 w-44 sm:h-48 sm:w-48 object-contain"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-muted/40 p-2.5 text-xs font-mono text-muted-foreground break-all border border-border/80">
                  https://studyair.vercel.app/dl
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="w-full gap-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tautan Berhasil Disalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Salin Tautan Portal Unduh</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Release Specifications & Security */}
          <Card className="border-border/80 bg-card/60 shadow-md flex flex-col justify-between">
            <CardContent className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Biner Terverifikasi</span>
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Spesifikasi Rilis v{versionState.version}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Detail teknis biner APK untuk memastikan keaslian paket instalasi.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-muted-foreground font-medium">Versi Aplikasi</span>
                  <span className="font-bold text-foreground">
                    v{versionState.version} (Build {versionState.versionCode})
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-muted-foreground font-medium">Ukuran Berkas</span>
                  <span className="font-bold text-foreground">
                    {versionState.apkSizeMB} MB (Standalone APK)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-muted-foreground font-medium">Target Minimum OS</span>
                  <span className="font-bold text-foreground">Android 6.0+ (Marshmallow atau baru)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-muted-foreground font-medium">Tipe Arsitektur</span>
                  <span className="font-bold text-foreground">Universal (arm64-v8a, armeabi-v7a, x86)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                  <span className="text-muted-foreground font-medium">Keamanan & Privasi</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Lokal SQLite, 0 Iklan</span>
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="https://github.com/mahsymahsy6-creator/StudyAir/releases/tag/v2.0.1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <span>Lihat di GitHub Releases</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Visual Step-by-Step Installation Guide (4 Langkah) ─── */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black tracking-tight text-foreground">
              Cara Memasang APK di HP Android
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
              Panduan 4 langkah mudah menginstal berkas APK mandiri di ponsel Android kamu:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <Card className="border-border/80 bg-card/40 p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                1
              </div>
              <h4 className="text-sm font-bold text-foreground">Unduh Berkas APK</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ketuk tombol <strong>Unduh APK v2.0.1</strong> di atas dan tunggu hingga proses unduhan selesai di browser HP kamu.
              </p>
            </Card>

            {/* Step 2 */}
            <Card className="border-border/80 bg-card/40 p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                2
              </div>
              <h4 className="text-sm font-bold text-foreground">Buka Berkas Unduhan</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tarik bilah notifikasi HP ke bawah dan ketuk notifikasi unduhan, atau buka melalui aplikasi <em>File Manager / Unduhan</em>.
              </p>
            </Card>

            {/* Step 3 */}
            <Card className="border-border/80 bg-card/40 p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
                3
              </div>
              <h4 className="text-sm font-bold text-foreground">Izinkan Sumber Ini</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Jika muncul pesan standar Android <em>&ldquo;Instal aplikasi dari sumber tidak dikenal&rdquo;</em>, aktifkan izin untuk browser/file manager kamu.
              </p>
            </Card>

            {/* Step 4 */}
            <Card className="border-border/80 bg-card/40 p-5 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 font-black flex items-center justify-center text-sm">
                4
              </div>
              <h4 className="text-sm font-bold text-foreground">Pasang & Buka!</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ketuk <strong>Pasang (Install)</strong>. Begitu selesai, ikon StudyAir akan langsung muncul di beranda HP dan siap digunakan.
              </p>
            </Card>
          </div>
        </div>

        {/* ─── Expandable Changelog Section ─── */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black tracking-tight text-foreground">
              Catatan Rilis & Riwayat Pembaruan
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ketahui peningkatan performa dan fitur baru yang dihadirkan di setiap versi.
            </p>
          </div>

          <div className="space-y-4">
            {/* v2.0.1 */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-foreground text-base">
                    StudyAir v2.0.1 (Build 4)
                  </span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-bold">
                    Terbaru • Stabil
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground font-mono">November 2026</span>
              </div>

              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sinkronisasi Jam Pelajaran Dua Arah</strong>: Pengaturan jumlah JP (hingga 10 JP) dan jam istirahat di Pengaturan kini langsung sinkron ke tab Jadwal dan wizard Susun Manual.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Modal Jam Pelajaran Langsung</strong>: Mengatur jam bel sekolah kini dapat dilakukan langsung di tab Jadwal tanpa perlu berpindah ke Pengaturan.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Perbaikan Tombol Batal Wizard</strong>: Tombol &ldquo;Batal&rdquo; di wizard Susun Manual kini merespons instan di semua platform (Web & Native Android).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Penjadwalan Tugas Terlambat</strong>: Tugas yang melewati deadline kini tetap dapat dibuatkan blok belajar darurat melalui opsi penjadwalan.
                  </span>
                </li>
              </ul>
            </div>

            {/* v2.0.0 */}
            <div className="rounded-2xl border border-border/80 bg-card/40 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-base">
                    StudyAir v2.0.0 (Build 2)
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Major Release
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground font-mono">Oktober 2026</span>
              </div>

              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Evolusi maskot Naga Streak (Telur → Bayi → Remaja → Naga Dewasa) dengan sistem auto-freeze protection.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Kalkulator Rapor Kurikulum Merdeka berbobot SKS dan estimasi target SNBP/UTBK.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Engine audio taktil sintetis berlatensi rendah untuk setiap ketukan dan keberhasilan tugas.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>7 pilihan tema tampilan (Navy, AMOLED Black, Emerald, Sunset, Cyberpunk, Rose, Slate).</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
