import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyAir — Adaptive Study Scheduler",
  description:
    "Smart study scheduling with spaced repetition, time-blocking calendar, and focus sessions. Master your syllabus before exam day.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StudyAir",
  },
  icons: {
    icon: "/studyair-icon.svg",
    apple: "/studyair-icon.svg",
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
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col pb-16 md:pb-0">
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
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
