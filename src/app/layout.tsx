import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyAir — Jadwal Belajar Pintar Pelajar SMP & SMA",
  description:
    "Aplikasi penjadwal belajar otomatis untuk pelajar Indonesia. Sinkronisasi jadwal 10 JP, naga streak pelindung kebiasaan belajar, dan kalkulator nilai rapor Kurikulum Merdeka.",
  keywords: [
    "StudyAir",
    "Jadwal Belajar",
    "Kurikulum Merdeka",
    "Pelajar Indonesia",
    "Jadwal Sekolah 10 JP",
    "Streak Belajar",
    "Kalkulator Rapor",
    "Aplikasi Pelajar SMP SMA",
  ],
  authors: [{ name: "StudyAir Team" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudyAir",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/studyair-icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#090d16",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col pb-[max(4rem,env(safe-area-inset-bottom,4rem))] md:pb-0">
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              }
            >
              {children}
            </Suspense>
          </main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
