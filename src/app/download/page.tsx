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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  const [qrLoaded, setQrLoaded] = useState(true);
  const [versionState, setVersionState] = useState<VersionState>({
    version: "2.0.1",
    versionCode: 4,
    apkFilename: "StudyAir-v2.0.1.apk",
    apkSizeMB: "86.2",
    lanIp: "192.168.1.7",
    checkedAt: null,
    online: true,
  });

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
    setTimeout(() => setDownloading(false), 2000);
  };

  const lanDownloadUrl = `http://${versionState.lanIp}:8080/download`;

  const handleCopyLink = async () => {
    try {
      const urlToCopy =
        typeof window !== "undefined"
          ? `${window.location.origin}/StudyAir-v2.0.1.apk`
          : lanDownloadUrl;
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background selection:bg-primary/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* ─── Hero Download Banner ─── */}
        <div className="text-center space-y-4">
          {/* Brand Icon */}
          <div className="flex justify-center pb-2">
            <img
              src="/studyair-icon.svg"
              alt="StudyAir App Icon"
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl shadow-2xl border border-primary/25 shadow-primary/25 transition-transform hover:scale-105 duration-300"
            />
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
            Unduh & Update <span className="text-primary">StudyAir</span> Android
          </h1>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Paket instalasi mandiri (Standalone APK) untuk pelajar SMP & SMA Indonesia. Jadwal sekolah otomatis rapi, tugas selesai tepat waktu, dan maskot naga selalu terjaga.
          </p>

          {/* Primary Download & Update Check Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/StudyAir-v2.0.1.apk"
              download="StudyAir-v2.0.1.apk"
              onClick={handleDownloadClick}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto gap-3 bg-primary text-primary-foreground hover:bg-primary/90 text-base rounded-2xl px-8 py-6 font-bold shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Download className="h-5 w-5" />
                <span>
                  {downloading
                    ? "Mengunduh APK..."
                    : `Unduh APK v${versionState.version} (${versionState.apkSizeMB} MB)`}
                </span>
              </Button>
            </a>

            <Button
              size="lg"
              variant="outline"
              onClick={runVersionCheck}
              disabled={checking}
              className="w-full sm:w-auto gap-2 text-sm rounded-2xl px-5 py-6 border-border hover:bg-muted/30 font-semibold cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 text-primary ${checking ? "animate-spin" : ""}`}
              />
              <span>{checking ? "Memeriksa..." : "Periksa Pembaruan"}</span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              onClick={handleCopyLink}
              className="w-full sm:w-auto gap-2 text-sm rounded-2xl px-5 py-6 border-border hover:bg-muted/30 font-semibold cursor-pointer"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{copied ? "Tautan Disalin ✓" : "Salin Link"}</span>
            </Button>
          </div>

          {/* Metadata Specs */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Android 8.0+ (Min SDK 26)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Ukuran: {versionState.apkSizeMB} MB • Standalone App (Bukan Expo Go)
            </span>
            <span>•</span>
            <span className="font-mono text-muted-foreground">
              {versionState.apkFilename}
            </span>
          </div>
        </div>

        {/* ─── Wi-Fi QR Code & Update Card ─── */}
        <Card className="bg-card/60 border-border/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
            {qrLoaded && (
              <div className="bg-white p-3.5 rounded-2xl shadow-lg shrink-0 border border-border/40">
                <img
                  src="http://localhost:8080/qr.svg"
                  alt="QR Code Unduh StudyAir APK"
                  className="h-36 w-36"
                  onError={() => setQrLoaded(false)}
                />
              </div>
            )}

            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary">
                <QrCode className="h-4 w-4" />
                <span>Unduh & Update Instan via Wi-Fi Lokal</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Pindai QR atau Buka Tautan di Ponsel Android
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sudah punya versi lama di HP? Cukup unduh dan pasang{" "}
                <strong className="text-foreground">{versionState.apkFilename}</strong>{" "}
                langsung di atas aplikasi lama tanpa perlu <em>uninstall</em>. Seluruh jadwal pelajaran, daftar tugas, nilai rapor, dan progres pet naga Anda tetap aman tersimpan.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <code className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs font-mono text-primary">
                  {lanDownloadUrl}
                </code>
                <Link href="/trailer">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 text-primary fill-primary" />
                    <span>Tonton Trailer 9:16</span>
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Installation & Update Guide (3 Simple Steps) ─── */}
        <div className="space-y-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-center text-foreground">
            Cara Pasang & Update di Smartphone Android
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/60 border-border/80 backdrop-blur-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base">
                  1
                </div>
                <h3 className="font-bold text-foreground">1. Unduh Paket APK</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Ketuk tombol <strong>Unduh APK v{versionState.version}</strong> di atas atau pindai QR Code untuk mengunduh berkas resmi ke folder <em>Downloads</em>.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/80 backdrop-blur-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base">
                  2
                </div>
                <h3 className="font-bold text-foreground">2. Pasang / Timpa Versi Lama</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Buka file <code>{versionState.apkFilename}</code> lalu pilih <strong>Install / Update</strong>. Data lokal Anda akan otomatis dimigrasikan ke skema v2.0.1.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border/80 backdrop-blur-sm">
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-base">
                  3
                </div>
                <h3 className="font-bold text-foreground">3. Cek di Pengaturan</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Buka menu <strong>Pengaturan</strong> di dalam aplikasi kapan saja untuk memeriksa pembaruan berikutnya atau mengunduh ulang paket APK.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── What's New in v2.0.1 ─── */}
        <Card className="bg-card/40 border-border overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-border/60 pb-4">
              <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Yang Baru di StudyAir v{versionState.version}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Rilis Resmi v2.0.1 • Sinkronisasi Jam Pelajaran, Akses Bell Times & Streak Freeze
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Sinkronisasi Jam Pelajaran Terpadu</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pengaturan jam belajar sekolah terhubung dua arah ke tab Jadwal dan Susun Manual tanpa kehilangan data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Akses Modal Bell Times di Jadwal</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pill jam pelajaran interaktif dan tombol jam di header Jadwal untuk atur durasi jam masuk, istirahat, dan pulang.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                  <Flame className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Sistem Perlindungan Streak Freeze</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Auto-protect streak saat terlewat, reward pembeku tiap 3 hari berturut-turut, dan drop harian 35%.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Navigasi Mantap & Audio Taktil</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Perbaikan tombol Batal pada Wizard Impor Jadwal serta umpan balik audio klik taktil responsif di setiap aksi.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Web Version Quick Links ─── */}
        <div className="text-center pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            Ingin langsung mencoba StudyAir di browser tanpa instalasi?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="http://localhost:8081" target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2 text-xs font-semibold cursor-pointer">
                <span>Buka Aplikasi Mobile Web (:8081)</span>
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
              </Button>
            </a>
            <Link href="/calendar">
              <Button variant="ghost" className="gap-2 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer">
                <span>Buka Desktop Web Calendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
