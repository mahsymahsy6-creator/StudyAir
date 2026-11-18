import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    {
      name: "StudyAir",
      version: "2.0.1",
      versionCode: 4,
      releaseDate: "2026-11-18",
      apkFilename: "StudyAir-v2.0.1.apk",
      apkSizeMB: "86.2",
      minAndroidSdk: 26,
      downloadUrl:
        "https://github.com/mahsymahsy6-creator/StudyAir/releases/download/v2.0.1/StudyAir-v2.0.1.apk",
      portalUrl: "/download",
      githubReleaseUrl:
        "https://github.com/mahsymahsy6-creator/StudyAir/releases/tag/v2.0.1",
      changelog: [
        "Sinkronisasi Jam Pelajaran dua arah antara Pengaturan, Jadwal, dan Susun Manual",
        "Akses langsung modal Jam Pelajaran (Bell Times) pada layar Jadwal (Tab 2)",
        "Perbaikan navigasi tombol Batal pada Wizard Impor Jadwal",
        "Sistem Perlindungan Streak Freeze (reward 3 hari, lucky drop 35% & auto-protect)",
        "Audio umpan balik klik taktil dua lapis di semua tombol dan tab",
      ],
    },
    { status: 200, headers: CORS_HEADERS }
  );
}
