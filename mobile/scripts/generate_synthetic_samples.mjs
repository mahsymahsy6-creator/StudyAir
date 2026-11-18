/**
 * Synthetic Test Samples Generator (No AI API Calls)
 * 
 * Generates:
 * 1. Pixel-perfect, high-resolution vector SVG timetable tables rendered to PNG with sharp.
 * 2. Realistic camera/photo distortions:
 *    - Rotation (-8 to +8 degrees)
 *    - Gradient lighting / desk shadows
 *    - Subtle camera blur
 *    - Brightness / contrast / gamma variations
 *    - JPEG compression artifacts
 *    - Cropping / camera borders
 * 3. Simultaneous matching .json answer files in the exact format required by the benchmark runner.
 * 4. Fake, made-up subjects, teachers, and rooms only.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMETABLES_DIR = path.resolve(__dirname, "../test_samples/timetables/synthetic");
const MESSAGES_DIR = path.resolve(__dirname, "../test_samples/messages/synthetic");

fs.mkdirSync(TIMETABLES_DIR, { recursive: true });
fs.mkdirSync(MESSAGES_DIR, { recursive: true });

// ─── 1. Made-up Fake Academic Catalog ───
export const FAKE_CATALOG = {
  subjects: [
    { name: "Robotika Maritim", code: "RM", alt: "Robotika Bahari" },
    { name: "Astrobiologi Dasar", code: "ABD", alt: "Astrobiologi" },
    { name: "Etnosains Nusantara", code: "EN", alt: "Etnosains" },
    { name: "Algoritma Terapan", code: "AT", alt: "Algoritma" },
    { name: "Bioinformatika Lingkungan", code: "BL", alt: "Bioinformatika" },
    { name: "Fisika Kuantum Pemula", code: "FKP", alt: "Fisika Kuantum" },
    { name: "Retorika & Debat Global", code: "RDG", alt: "Retorika Debat" },
    { name: "Geopolitik Bahari", code: "GB", alt: "Geopolitik" },
    { name: "Kriptografi Siswa", code: "KS", alt: "Kriptografi" },
    { name: "Desain Ekologi Kota", code: "DEK", alt: "Ekologi Kota" },
    { name: "Mekatronika Lanjut", code: "ML", alt: "Mekatronika" },
    { name: "Sains Data Mikro", code: "SDM", alt: "Sains Data" },
  ],
  teachers: [
    { code: "IS", name: "Dr. Irwan Setiawan, M.Sc." },
    { code: "NH", name: "Dra. Nurul Hidayati" },
    { code: "BW", name: "Bambang Waskito, S.Pd." },
    { code: "SR", name: "Siti Rahmawati, M.Kom." },
    { code: "HK", name: "Hendro Kusumo, Ph.D." },
    { code: "DA", name: "Dewi Anggraini, M.Env." },
    { code: "FP", name: "Farhan Pratama, S.Si." },
    { code: "RC", name: "Rina Cahyani, M.A." },
  ],
  rooms: [
    "R. Lab Cyber 3",
    "R. Teater 201",
    "R. Studio Etnosains",
    "R. Bionika A",
    "R. Kubus 104",
    "R. Selasar 7B",
    "R. Workshop Mekatronik",
  ],
};

function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── 2. Distortion Helper (sharp pipeline) ───
async function applyRealisticDistortions(svgString, options = {}) {
  const {
    width = 1200,
    height = 800,
    rotateDeg = 0,
    blurSigma = 0.5,
    brightness = 0.96,
    contrast = 1.05,
    jpegQuality = 78,
    shadowIntensity = 0.25,
    shadowAngle = "top-left",
  } = options;

  const baseSvgBuffer = Buffer.from(svgString);

  // Gradient shadow overlay for non-uniform desk lighting
  const shadowCoords =
    shadowAngle === "top-left"
      ? { x1: 0, y1: 0, x2: 1, y2: 1 }
      : shadowAngle === "top-right"
      ? { x1: 1, y1: 0, x2: 0, y2: 1 }
      : { x1: 0, y1: 1, x2: 1, y2: 0 };

  const shadowOverlay = Buffer.from(`
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="deskShadow" x1="${shadowCoords.x1}" y1="${shadowCoords.y1}" x2="${shadowCoords.x2}" y2="${shadowCoords.y2}">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.04"/>
          <stop offset="50%" stop-color="#000000" stop-opacity="${shadowIntensity * 0.4}"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="${shadowIntensity}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#deskShadow)"/>
    </svg>
  `);

  // Step 1: Render vector SVG with shadow composite
  const rendered = await sharp(baseSvgBuffer)
    .resize(width, height)
    .composite([{ input: shadowOverlay, blend: "multiply" }])
    .png()
    .toBuffer();

  // Step 2: Apply rotation, blur, gamma/contrast, and realistic compression
  let pipeline = sharp(rendered);

  if (rotateDeg !== 0) {
    pipeline = pipeline.rotate(rotateDeg, { background: "#d4d8e0" });
  }

  if (brightness !== 1 || contrast !== 1) {
    pipeline = pipeline.modulate({ brightness, saturation: 0.95 });
  }

  if (blurSigma > 0) {
    pipeline = pipeline.blur(blurSigma);
  }

  return await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();
}

// ─── 3. Sample 1 Builder: Standard Grid with Break Row & Teacher Legend ───
export function buildSample1() {
  const width = 1200;
  const height = 850;

  const schoolName = "SMA NUSANTARA CENDEKIA";
  const title = "JADWAL PELAJARAN KELAS XI MIPA 3";
  const academicYear = "Tahun Ajaran 2026/2027 — Semester Ganjil";

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  const periods = [
    { num: 1, time: "07:15 - 08:00" },
    { num: 2, time: "08:00 - 08:45" },
    { num: 3, time: "08:45 - 09:30" },
    { num: "BREAK", time: "09:30 - 10:00", label: "ISTIRAHAT PAGI" },
    { num: 4, time: "10:00 - 10:45" },
    { num: 5, time: "10:45 - 11:30" },
    { num: 6, time: "11:30 - 12:15" },
  ];

  // Specific cell allocation for 5 days
  const grid = {
    Senin: {
      1: { subject: "Robotika Maritim", teacherCode: "IS", teacher: "Dr. Irwan Setiawan, M.Sc.", room: "R. Lab Cyber 3" },
      2: { subject: "Robotika Maritim", teacherCode: "IS", teacher: "Dr. Irwan Setiawan, M.Sc.", room: "R. Lab Cyber 3" },
      3: { subject: "Etnosains Nusantara", teacherCode: "BW", teacher: "Bambang Waskito, S.Pd.", room: "R. Studio Etnosains" },
      4: { subject: "Algoritma Terapan", teacherCode: "SR", teacher: "Siti Rahmawati, M.Kom.", room: "R. Kubus 104" },
      5: { subject: "Algoritma Terapan", teacherCode: "SR", teacher: "Siti Rahmawati, M.Kom.", room: "R. Kubus 104" },
      6: { subject: "Retorika & Debat Global", teacherCode: "RC", teacher: "Rina Cahyani, M.A.", room: "R. Teater 201" },
    },
    Selasa: {
      1: { subject: "Astrobiologi Dasar", teacherCode: "NH", teacher: "Dra. Nurul Hidayati", room: "R. Bionika A" },
      2: { subject: "Astrobiologi Dasar", teacherCode: "NH", teacher: "Dra. Nurul Hidayati", room: "R. Bionika A" },
      3: { subject: "Fisika Kuantum Pemula", teacherCode: "HK", teacher: "Hendro Kusumo, Ph.D.", room: "R. Lab Cyber 3" },
      4: { subject: "Fisika Kuantum Pemula", teacherCode: "HK", teacher: "Hendro Kusumo, Ph.D.", room: "R. Lab Cyber 3" },
      5: { subject: "Geopolitik Bahari", teacherCode: "BW", teacher: "Bambang Waskito, S.Pd.", room: "R. Selasar 7B" },
      6: { subject: "Desain Ekologi Kota", teacherCode: "DA", teacher: "Dewi Anggraini, M.Env.", room: "R. Studio Etnosains" },
    },
    Rabu: {
      1: { subject: "Bioinformatika Lingkungan", teacherCode: "DA", teacher: "Dewi Anggraini, M.Env.", room: "R. Bionika A" },
      2: { subject: "Bioinformatika Lingkungan", teacherCode: "DA", teacher: "Dewi Anggraini, M.Env.", room: "R. Bionika A" },
      3: { subject: "Kriptografi Siswa", teacherCode: "FP", teacher: "Farhan Pratama, S.Si.", room: "R. Kubus 104" },
      4: { subject: "Kriptografi Siswa", teacherCode: "FP", teacher: "Farhan Pratama, S.Si.", room: "R. Kubus 104" },
      5: { subject: "Robotika Maritim", teacherCode: "IS", teacher: "Dr. Irwan Setiawan, M.Sc.", room: "R. Lab Cyber 3" },
      6: { subject: "Retorika & Debat Global", teacherCode: "RC", teacher: "Rina Cahyani, M.A.", room: "R. Teater 201" },
    },
    Kamis: {
      1: { subject: "Algoritma Terapan", teacherCode: "SR", teacher: "Siti Rahmawati, M.Kom.", room: "R. Kubus 104" },
      2: { subject: "Algoritma Terapan", teacherCode: "SR", teacher: "Siti Rahmawati, M.Kom.", room: "R. Kubus 104" },
      3: { subject: "Etnosains Nusantara", teacherCode: "BW", teacher: "Bambang Waskito, S.Pd.", room: "R. Studio Etnosains" },
      4: { subject: "Astrobiologi Dasar", teacherCode: "NH", teacher: "Dra. Nurul Hidayati", room: "R. Bionika A" },
      5: { subject: "Mekatronika Lanjut", teacherCode: "IS", teacher: "Dr. Irwan Setiawan, M.Sc.", room: "R. Workshop Mekatronik" },
      6: { subject: "Mekatronika Lanjut", teacherCode: "IS", teacher: "Dr. Irwan Setiawan, M.Sc.", room: "R. Workshop Mekatronik" },
    },
    Jumat: {
      1: { subject: "Fisika Kuantum Pemula", teacherCode: "HK", teacher: "Hendro Kusumo, Ph.D.", room: "R. Lab Cyber 3" },
      2: { subject: "Kriptografi Siswa", teacherCode: "FP", teacher: "Farhan Pratama, S.Si.", room: "R. Kubus 104" },
      3: { subject: "Geopolitik Bahari", teacherCode: "BW", teacher: "Bambang Waskito, S.Pd.", room: "R. Selasar 7B" },
      4: { subject: "Desain Ekologi Kota", teacherCode: "DA", teacher: "Dewi Anggraini, M.Env.", room: "R. Studio Etnosains" },
      5: { subject: "Sains Data Mikro", teacherCode: "SR", teacher: "Siti Rahmawati, M.Kom.", room: "R. Kubus 104" },
      6: { subject: "Sains Data Mikro", teacherCode: "SR", teacher: "Siti Rahmawati, M.Kom.", room: "R. Kubus 104" },
    },
  };

  // Compile JSON answer
  const answerEntries = [];
  for (const day of days) {
    for (let p = 1; p <= 6; p++) {
      const cell = grid[day][p];
      if (cell) {
        answerEntries.push({
          day,
          period: p,
          subject: cell.subject,
          teacher: cell.teacher,
          room: cell.room,
        });
      }
    }
  }

  const jsonAnswer = {
    type: "timetable",
    description: "Jadwal Pelajaran Kelas XI MIPA 3",
    entries: answerEntries,
  };

  // Build SVG XML
  const startX = 50;
  const startY = 120;
  const colW_time = 140;
  const colW_day = (width - startX * 2 - colW_time) / days.length;
  const rowH = 65;

  let svgCells = "";

  // Header row
  svgCells += `
    <rect x="${startX}" y="${startY}" width="${colW_time}" height="50" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="${startX + colW_time / 2}" y="${startY + 30}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">WAKTU</text>
  `;

  days.forEach((day, idx) => {
    const x = startX + colW_time + idx * colW_day;
    svgCells += `
      <rect x="${x}" y="${startY}" width="${colW_day}" height="50" fill="#1e293b" stroke="#334155" stroke-width="1"/>
      <text x="${x + colW_day / 2}" y="${startY + 30}" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#38bdf8" text-anchor="middle">${day.toUpperCase()}</text>
    `;
  });

  let currentY = startY + 50;

  periods.forEach((period) => {
    if (period.num === "BREAK") {
      // Full span break row
      svgCells += `
        <rect x="${startX}" y="${currentY}" width="${width - startX * 2}" height="36" fill="#fef08a" stroke="#ca8a04" stroke-width="1"/>
        <text x="${width / 2}" y="${currentY + 23}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#854d0e" text-anchor="middle">☕ ${period.label} (${period.time})</text>
      `;
      currentY += 36;
    } else {
      // Time column
      svgCells += `
        <rect x="${startX}" y="${currentY}" width="${colW_time}" height="${rowH}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1"/>
        <text x="${startX + colW_time / 2}" y="${currentY + 28}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#334155" text-anchor="middle">Jam ${period.num}</text>
        <text x="${startX + colW_time / 2}" y="${currentY + 48}" font-family="Arial, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">${period.time}</text>
      `;

      // Day columns
      days.forEach((day, idx) => {
        const x = startX + colW_time + idx * colW_day;
        const cell = grid[day][period.num];
        const isAlt = period.num % 2 === 0;
        const bgColor = isAlt ? "#f1f5f9" : "#ffffff";

        svgCells += `
          <rect x="${x}" y="${currentY}" width="${colW_day}" height="${rowH}" fill="${bgColor}" stroke="#cbd5e1" stroke-width="1"/>
        `;

        if (cell) {
          svgCells += `
            <text x="${x + 10}" y="${currentY + 24}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0f172a">${escapeXml(cell.subject)}</text>
            <text x="${x + 10}" y="${currentY + 42}" font-family="Arial, sans-serif" font-size="11" fill="#2563eb">Kode: [${escapeXml(cell.teacherCode)}]</text>
            <text x="${x + colW_day - 10}" y="${currentY + 54}" font-family="Arial, sans-serif" font-size="10" fill="#64748b" text-anchor="end">${escapeXml(cell.room)}</text>
          `;
        }
      });

      currentY += rowH;
    }
  });

  // Teacher Code Legend Table at bottom
  const legendY = currentY + 20;
  const legendBox = `
    <rect x="${startX}" y="${legendY}" width="${width - startX * 2}" height="75" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" rx="4"/>
    <text x="${startX + 15}" y="${legendY + 22}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#475569">KODE GURU &amp; PENGAJAR:</text>
    <text x="${startX + 15}" y="${legendY + 42}" font-family="Arial, sans-serif" font-size="11" fill="#334155">IS: Dr. Irwan Setiawan, M.Sc.  |  NH: Dra. Nurul Hidayati  |  BW: Bambang Waskito, S.Pd.  |  SR: Siti Rahmawati, M.Kom.</text>
    <text x="${startX + 15}" y="${legendY + 62}" font-family="Arial, sans-serif" font-size="11" fill="#334155">HK: Hendro Kusumo, Ph.D.      |  DA: Dewi Anggraini, M.Env. |  FP: Farhan Pratama, S.Si.   |  RC: Rina Cahyani, M.A.</text>
  `;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="paperGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="#fafafa"/>
      <rect width="${width}" height="${height}" fill="url(#paperGrid)"/>

      <!-- Title Header -->
      <text x="${width / 2}" y="45" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="middle">${schoolName}</text>
      <text x="${width / 2}" y="72" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0284c7" text-anchor="middle">${title}</text>
      <text x="${width / 2}" y="95" font-family="Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">${academicYear}</text>

      ${svgCells}
      ${legendBox}
    </svg>
  `;

  return { svg, jsonAnswer, width, height };
}

// ─── 4. Sample 2 Builder: Master Timetable Multi-Class (X-1, X-2, XI IPA 1) ───
export function buildSample2() {
  const width = 1200;
  const height = 900;

  const schoolName = "SMP TELADAN BANGSA";
  const title = "JADWAL INDUK DISTRIBUSI KELAS (X-1, X-2, XI IPA 1)";
  const subtitle = "* Jawaban diekstrak khusus untuk target: KELAS X-1";

  const targetClass = "X-1";
  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

  // Multi-class allocation
  const scheduleData = [
    // Senin
    { day: "Senin", period: 1, time: "07:30 - 08:15", "X-1": { subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab 3" }, "X-2": { subject: "Algoritma Terapan", teacher: "Siti Rahmawati", room: "Lab Komp" }, "XI IPA 1": { subject: "Fisika Kuantum", teacher: "Hendro Kusumo", room: "R. 301" } },
    { day: "Senin", period: 2, time: "08:15 - 09:00", "X-1": { subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab 3" }, "X-2": { subject: "Algoritma Terapan", teacher: "Siti Rahmawati", room: "Lab Komp" }, "XI IPA 1": { subject: "Fisika Kuantum", teacher: "Hendro Kusumo", room: "R. 301" } },
    { day: "Senin", period: 3, time: "09:00 - 09:45", "X-1": { subject: "Astrobiologi Dasar", teacher: "Dra. Nurul Hidayati", room: "R. 101" }, "X-2": { subject: "Etnosains Nusantara", teacher: "Bambang Waskito", room: "R. 102" }, "XI IPA 1": { subject: "Bioinformatika", teacher: "Dewi Anggraini", room: "R. 301" } },
    { day: "Senin", period: "BREAK", time: "09:45 - 10:15", label: "ISTIRAHAT" },
    { day: "Senin", period: 4, time: "10:15 - 11:00", "X-1": { subject: "Retorika & Debat Global", teacher: "Rina Cahyani", room: "Teater" }, "X-2": { subject: "Astrobiologi Dasar", teacher: "Dra. Nurul Hidayati", room: "R. 102" }, "XI IPA 1": { subject: "Geopolitik Bahari", teacher: "Bambang Waskito", room: "R. 301" } },
    { day: "Senin", period: 5, time: "11:00 - 11:45", "X-1": { subject: "Kriptografi Siswa", teacher: "Farhan Pratama", room: "R. 101" }, "X-2": { subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab 3" }, "XI IPA 1": { subject: "Sains Data Mikro", teacher: "Siti Rahmawati", room: "Lab Komp" } },

    // Selasa
    { day: "Selasa", period: 1, time: "07:30 - 08:15", "X-1": { subject: "Etnosains Nusantara", teacher: "Bambang Waskito", room: "R. 101" }, "X-2": { subject: "Fisika Kuantum", teacher: "Hendro Kusumo", room: "R. 102" }, "XI IPA 1": { subject: "Mekatronika Lanjut", teacher: "Dr. Irwan Setiawan", room: "Workshop" } },
    { day: "Selasa", period: 2, time: "08:15 - 09:00", "X-1": { subject: "Etnosains Nusantara", teacher: "Bambang Waskito", room: "R. 101" }, "X-2": { subject: "Fisika Kuantum", teacher: "Hendro Kusumo", room: "R. 102" }, "XI IPA 1": { subject: "Mekatronika Lanjut", teacher: "Dr. Irwan Setiawan", room: "Workshop" } },
    { day: "Selasa", period: 3, time: "09:00 - 09:45", "X-1": { subject: "Algoritma Terapan", teacher: "Siti Rahmawati", room: "Lab Komp" }, "X-2": { subject: "Desain Ekologi Kota", teacher: "Dewi Anggraini", room: "R. 102" }, "XI IPA 1": { subject: "Astrobiologi Dasar", teacher: "Dra. Nurul Hidayati", room: "R. 301" } },
    { day: "Selasa", period: "BREAK", time: "09:45 - 10:15", label: "ISTIRAHAT" },
    { day: "Selasa", period: 4, time: "10:15 - 11:00", "X-1": { subject: "Desain Ekologi Kota", teacher: "Dewi Anggraini", room: "R. 101" }, "X-2": { subject: "Kriptografi Siswa", teacher: "Farhan Pratama", room: "Lab Komp" }, "XI IPA 1": { subject: "Retorika & Debat Global", teacher: "Rina Cahyani", room: "Teater" } },
    { day: "Selasa", period: 5, time: "11:00 - 11:45", "X-1": { subject: "Geopolitik Bahari", teacher: "Bambang Waskito", room: "R. 101" }, "X-2": { subject: "Bioinformatika", teacher: "Dewi Anggraini", room: "R. 102" }, "XI IPA 1": { subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab 3" } },

    // Rabu
    { day: "Rabu", period: 1, time: "07:30 - 08:15", "X-1": { subject: "Bioinformatika Lingkungan", teacher: "Dewi Anggraini", room: "R. 101" }, "X-2": { subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab 3" }, "XI IPA 1": { subject: "Algoritma Terapan", teacher: "Siti Rahmawati", room: "Lab Komp" } },
    { day: "Rabu", period: 2, time: "08:15 - 09:00", "X-1": { subject: "Bioinformatika Lingkungan", teacher: "Dewi Anggraini", room: "R. 101" }, "X-2": { subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab 3" }, "XI IPA 1": { subject: "Algoritma Terapan", teacher: "Siti Rahmawati", room: "Lab Komp" } },
    { day: "Rabu", period: 3, time: "09:00 - 09:45", "X-1": { subject: "Fisika Kuantum Pemula", teacher: "Hendro Kusumo", room: "R. 101" }, "X-2": { subject: "Geopolitik Bahari", teacher: "Bambang Waskito", room: "R. 102" }, "XI IPA 1": { subject: "Kriptografi Siswa", teacher: "Farhan Pratama", room: "R. 301" } },
    { day: "Rabu", period: "BREAK", time: "09:45 - 10:15", label: "ISTIRAHAT" },
    { day: "Rabu", period: 4, time: "10:15 - 11:00", "X-1": { subject: "Mekatronika Lanjut", teacher: "Dr. Irwan Setiawan", room: "Workshop" }, "X-2": { subject: "Sains Data Mikro", teacher: "Siti Rahmawati", room: "Lab Komp" }, "XI IPA 1": { subject: "Desain Ekologi Kota", teacher: "Dewi Anggraini", room: "R. 301" } },
    { day: "Rabu", period: 5, time: "11:00 - 11:45", "X-1": { subject: "Sains Data Mikro", teacher: "Siti Rahmawati", room: "Lab Komp" }, "X-2": { subject: "Retorika & Debat Global", teacher: "Rina Cahyani", room: "Teater" }, "XI IPA 1": { subject: "Etnosains Nusantara", teacher: "Bambang Waskito", room: "R. 301" } },
  ];

  // Ground truth extraction for target class X-1
  const answerEntries = [];
  scheduleData.forEach((row) => {
    if (row.period !== "BREAK" && row[targetClass]) {
      answerEntries.push({
        day: row.day,
        period: row.period,
        subject: row[targetClass].subject,
        teacher: row[targetClass].teacher,
        room: row[targetClass].room,
      });
    }
  });

  const jsonAnswer = {
    type: "timetable",
    targetClass: "X-1",
    description: "Jadwal Induk Hasil Ekstraksi Kelas X-1",
    entries: answerEntries,
  };

  // Build SVG XML
  const startX = 40;
  const startY = 120;
  const colW_day = 90;
  const colW_period = 60;
  const colW_time = 110;
  const remainingW = width - startX * 2 - colW_day - colW_period - colW_time;
  const colW_class = remainingW / 3;
  const rowH = 40;

  let svgTable = `
    <!-- Header columns -->
    <rect x="${startX}" y="${startY}" width="${colW_day}" height="45" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day / 2}" y="${startY + 28}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">HARI</text>

    <rect x="${startX + colW_day}" y="${startY}" width="${colW_period}" height="45" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day + colW_period / 2}" y="${startY + 28}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">JAM</text>

    <rect x="${startX + colW_day + colW_period}" y="${startY}" width="${colW_time}" height="45" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day + colW_period + colW_time / 2}" y="${startY + 28}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">WAKTU</text>

    <rect x="${startX + colW_day + colW_period + colW_time}" y="${startY}" width="${colW_class}" height="45" fill="#0369a1" stroke="#334155"/>
    <text x="${startX + colW_day + colW_period + colW_time + colW_class / 2}" y="${startY + 28}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">KELAS X-1 ★</text>

    <rect x="${startX + colW_day + colW_period + colW_time + colW_class}" y="${startY}" width="${colW_class}" height="45" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day + colW_period + colW_time + colW_class * 1.5}" y="${startY + 28}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#cbd5e1" text-anchor="middle">KELAS X-2</text>

    <rect x="${startX + colW_day + colW_period + colW_time + colW_class * 2}" y="${startY}" width="${colW_class}" height="45" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day + colW_period + colW_time + colW_class * 2.5}" y="${startY + 28}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#cbd5e1" text-anchor="middle">KELAS XI IPA 1</text>
  `;

  let currY = startY + 45;

  scheduleData.forEach((row, rIdx) => {
    if (row.period === "BREAK") {
      svgTable += `
        <rect x="${startX}" y="${currY}" width="${width - startX * 2}" height="32" fill="#fef9c3" stroke="#eab308" stroke-width="1"/>
        <text x="${width / 2}" y="${currY + 21}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#a16207" text-anchor="middle">--- ${row.label} (${row.time}) ---</text>
      `;
      currY += 32;
    } else {
      const isEven = rIdx % 2 === 0;
      const bg = isEven ? "#ffffff" : "#f8fafc";

      svgTable += `
        <rect x="${startX}" y="${currY}" width="${colW_day}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day / 2}" y="${currY + 25}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle">${row.day}</text>

        <rect x="${startX + colW_day}" y="${currY}" width="${colW_period}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day + colW_period / 2}" y="${currY + 25}" font-family="Arial, sans-serif" font-size="12" fill="#475569" text-anchor="middle">${row.period}</text>

        <rect x="${startX + colW_day + colW_period}" y="${currY}" width="${colW_time}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day + colW_period + colW_time / 2}" y="${currY + 25}" font-family="Arial, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">${row.time}</text>

        <!-- Target Class X-1 Column (highlighted subtly) -->
        <rect x="${startX + colW_day + colW_period + colW_time}" y="${currY}" width="${colW_class}" height="${rowH}" fill="#f0f9ff" stroke="#38bdf8" stroke-width="1.2"/>
        <text x="${startX + colW_day + colW_period + colW_time + 10}" y="${currY + 18}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#0369a1">${escapeXml(row["X-1"]?.subject || "-")}</text>
        <text x="${startX + colW_day + colW_period + colW_time + 10}" y="${currY + 33}" font-family="Arial, sans-serif" font-size="10" fill="#64748b">${escapeXml(row["X-1"]?.teacher || "")} • ${escapeXml(row["X-1"]?.room || "")}</text>

        <!-- Class X-2 -->
        <rect x="${startX + colW_day + colW_period + colW_time + colW_class}" y="${currY}" width="${colW_class}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day + colW_period + colW_time + colW_class + 10}" y="${currY + 18}" font-family="Arial, sans-serif" font-size="11" fill="#1e293b">${escapeXml(row["X-2"]?.subject || "-")}</text>
        <text x="${startX + colW_day + colW_period + colW_time + colW_class + 10}" y="${currY + 33}" font-family="Arial, sans-serif" font-size="10" fill="#64748b">${escapeXml(row["X-2"]?.teacher || "")}</text>

        <!-- Class XI IPA 1 -->
        <rect x="${startX + colW_day + colW_period + colW_time + colW_class * 2}" y="${currY}" width="${colW_class}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day + colW_period + colW_time + colW_class * 2 + 10}" y="${currY + 18}" font-family="Arial, sans-serif" font-size="11" fill="#1e293b">${escapeXml(row["XI IPA 1"]?.subject || "-")}</text>
        <text x="${startX + colW_day + colW_period + colW_time + colW_class * 2 + 10}" y="${currY + 33}" font-family="Arial, sans-serif" font-size="10" fill="#64748b">${escapeXml(row["XI IPA 1"]?.teacher || "")}</text>
      `;
      currY += rowH;
    }
  });

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f1f5f9"/>

      <!-- Header Banner -->
      <rect x="0" y="0" width="${width}" height="100" fill="#0f172a"/>
      <text x="${width / 2}" y="38" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${schoolName}</text>
      <text x="${width / 2}" y="65" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#38bdf8" text-anchor="middle">${title}</text>
      <text x="${width / 2}" y="88" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">${subtitle}</text>

      ${svgTable}
    </svg>
  `;

  return { svg, jsonAnswer, width, height };
}

// ─── 5. Sample 3 Builder: Horizontal Schedule (Days as rows, Mon-Sat, Merged Blocks) ───
export function buildSample3() {
  const width = 1250;
  const height = 750;

  const schoolName = "AKADEMI SAINS DIRGANTARA NUSANTARA";
  const title = "JADWAL PELAJARAN MINGGUAN (SENIN - SABTU)";

  const days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const periods = [1, 2, 3, 4, 5, 6];

  // Allocation with multi-period block merged cells
  const daySchedules = {
    Senin: [
      { period: 1, span: 2, subject: "Bioinformatika Lingkungan", teacher: "Dewi Anggraini", room: "Lab Bio" },
      { period: 2, span: 0 }, // covered by span 2
      { period: 3, span: 1, subject: "Algoritma Terapan", teacher: "Siti Rahmawati", room: "R. 201" },
      { period: 4, span: 1, subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab Robotik" },
      { period: 5, span: 2, subject: "Kriptografi Siswa", teacher: "Farhan Pratama", room: "Lab Komp" },
      { period: 6, span: 0 },
    ],
    Selasa: [
      { period: 1, span: 1, subject: "Astrobiologi Dasar", teacher: "Dra. Nurul Hidayati", room: "R. 102" },
      { period: 2, span: 1, subject: "Etnosains Nusantara", teacher: "Bambang Waskito", room: "R. 102" },
      { period: 3, span: 2, subject: "Fisika Kuantum Pemula", teacher: "Hendro Kusumo", room: "Lab Fisika" },
      { period: 4, span: 0 },
      { period: 5, span: 1, subject: "Geopolitik Bahari", teacher: "Bambang Waskito", room: "R. 102" },
      { period: 6, span: 1, subject: "Retorika & Debat Global", teacher: "Rina Cahyani", room: "Teater" },
    ],
    Rabu: [
      { period: 1, span: 2, subject: "Mekatronika Lanjut", teacher: "Dr. Irwan Setiawan", room: "Workshop" },
      { period: 2, span: 0 },
      { period: 3, span: 1, subject: "Desain Ekologi Kota", teacher: "Dewi Anggraini", room: "Studio" },
      { period: 4, span: 1, subject: "Sains Data Mikro", teacher: "Siti Rahmawati", room: "Lab Komp" },
      { period: 5, span: 2, subject: "Algoritma Terapan", teacher: "Siti Rahmawati", room: "Lab Komp" },
      { period: 6, span: 0 },
    ],
    Kamis: [
      { period: 1, span: 1, subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab Robotik" },
      { period: 2, span: 2, subject: "Bioinformatika Lingkungan", teacher: "Dewi Anggraini", room: "Lab Bio" },
      { period: 3, span: 0 },
      { period: 4, span: 1, subject: "Astrobiologi Dasar", teacher: "Dra. Nurul Hidayati", room: "R. 102" },
      { period: 5, span: 1, subject: "Kriptografi Siswa", teacher: "Farhan Pratama", room: "Lab Komp" },
      { period: 6, span: 1, subject: "Fisika Kuantum Pemula", teacher: "Hendro Kusumo", room: "Lab Fisika" },
    ],
    Jumat: [
      { period: 1, span: 2, subject: "Etnosains Nusantara", teacher: "Bambang Waskito", room: "R. 102" },
      { period: 2, span: 0 },
      { period: 3, span: 1, subject: "Retorika & Debat Global", teacher: "Rina Cahyani", room: "Teater" },
      { period: 4, span: 1, subject: "Geopolitik Bahari", teacher: "Bambang Waskito", room: "R. 102" },
      { period: 5, span: 1, subject: "Desain Ekologi Kota", teacher: "Dewi Anggraini", room: "Studio" },
      { period: 6, span: 1, subject: "Sains Data Mikro", teacher: "Siti Rahmawati", room: "Lab Komp" },
    ],
    Sabtu: [
      { period: 1, span: 2, subject: "Mekatronika Lanjut", teacher: "Dr. Irwan Setiawan", room: "Workshop" },
      { period: 2, span: 0 },
      { period: 3, span: 2, subject: "Kriptografi Siswa", teacher: "Farhan Pratama", room: "Lab Komp" },
      { period: 4, span: 0 },
      { period: 5, span: 1, subject: "Astrobiologi Dasar", teacher: "Dra. Nurul Hidayati", room: "R. 102" },
      { period: 6, span: 1, subject: "Robotika Maritim", teacher: "Dr. Irwan Setiawan", room: "Lab Robotik" },
    ],
  };

  // Compile JSON answer
  const answerEntries = [];
  days.forEach((day) => {
    const list = daySchedules[day];
    list.forEach((block) => {
      if (block.span > 0) {
        for (let p = 0; p < block.span; p++) {
          answerEntries.push({
            day,
            period: block.period + p,
            subject: block.subject,
            teacher: block.teacher,
            room: block.room,
          });
        }
      }
    });
  });

  const jsonAnswer = {
    type: "timetable",
    description: "Jadwal Mingguan Senin-Sabtu dengan Blok Jam Bergabung",
    entries: answerEntries,
  };

  // Build SVG XML
  const startX = 40;
  const startY = 110;
  const colW_day = 110;
  const periodW = (width - startX * 2 - colW_day) / 6;
  const rowH = 75;

  let svgTable = `
    <!-- Header columns -->
    <rect x="${startX}" y="${startY}" width="${colW_day}" height="45" fill="#1e1b4b" stroke="#312e81"/>
    <text x="${startX + colW_day / 2}" y="${startY + 28}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#c7d2fe" text-anchor="middle">HARI</text>
  `;

  periods.forEach((p, idx) => {
    const x = startX + colW_day + idx * periodW;
    svgTable += `
      <rect x="${x}" y="${startY}" width="${periodW}" height="45" fill="#1e1b4b" stroke="#312e81"/>
      <text x="${x + periodW / 2}" y="${startY + 22}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">JAM KE-${p}</text>
      <text x="${x + periodW / 2}" y="${startY + 38}" font-family="Arial, sans-serif" font-size="10" fill="#a5b4fc" text-anchor="middle">45 Menit</text>
    `;
  });

  let currY = startY + 45;

  days.forEach((day, dIdx) => {
    const isEven = dIdx % 2 === 0;
    const bgDay = isEven ? "#312e81" : "#1e1b4b";

    svgTable += `
      <rect x="${startX}" y="${currY}" width="${colW_day}" height="${rowH}" fill="${bgDay}" stroke="#4338ca"/>
      <text x="${startX + colW_day / 2}" y="${currY + 43}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">${day}</text>
    `;

    const blocks = daySchedules[day];
    blocks.forEach((block) => {
      if (block.span > 0) {
        const x = startX + colW_day + (block.period - 1) * periodW;
        const w = block.span * periodW;
        const isMerged = block.span > 1;
        const cellBg = isMerged ? "#e0e7ff" : (block.period % 2 === 0 ? "#f8fafc" : "#ffffff");
        const borderCol = isMerged ? "#6366f1" : "#cbd5e1";

        svgTable += `
          <rect x="${x}" y="${currY}" width="${w}" height="${rowH}" fill="${cellBg}" stroke="${borderCol}" stroke-width="${isMerged ? 1.5 : 1}"/>
          <text x="${x + w / 2}" y="${currY + 28}" font-family="Arial, sans-serif" font-size="${isMerged ? 13 : 11}" font-weight="bold" fill="#1e1b4b" text-anchor="middle">${escapeXml(block.subject)}</text>
          <text x="${x + w / 2}" y="${currY + 46}" font-family="Arial, sans-serif" font-size="11" fill="#4338ca" text-anchor="middle">${escapeXml(block.teacher)}</text>
          <text x="${x + w / 2}" y="${currY + 62}" font-family="Arial, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">${escapeXml(block.room)} ${isMerged ? "• (2 Jam Pelajaran)" : ""}</text>
        `;
      }
    });

    currY += rowH;
  });

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f8fafc"/>

      <!-- Header Banner -->
      <rect x="0" y="0" width="${width}" height="90" fill="#1e1b4b"/>
      <text x="${width / 2}" y="38" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${schoolName}</text>
      <text x="${width / 2}" y="68" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#818cf8" text-anchor="middle">${title}</text>

      ${svgTable}
    </svg>
  `;

  return { svg, jsonAnswer, width, height };
}

// ─── 6. Execution Runner ───
async function runGenerator() {
  console.log("==================================================");
  console.log("  Generating 3 Preview Synthetic Timetables...    ");
  console.log("==================================================\n");

  // Sample 1: Standard Grid with Break Row & Legend (rotated 2.5 deg, subtle blur, low shadow)
  const s1 = buildSample1();
  const s1Buffer = await applyRealisticDistortions(s1.svg, {
    width: s1.width,
    height: s1.height,
    rotateDeg: 2.2,
    blurSigma: 0.5,
    brightness: 0.97,
    contrast: 1.04,
    jpegQuality: 78,
    shadowIntensity: 0.2,
    shadowAngle: "top-left",
  });
  const s1ImgPath = path.join(TIMETABLES_DIR, "synthetic_timetable_01_grid_standard.png");
  const s1JsonPath = path.join(TIMETABLES_DIR, "synthetic_timetable_01_grid_standard.json");
  fs.writeFileSync(s1ImgPath, s1Buffer);
  fs.writeFileSync(s1JsonPath, JSON.stringify(s1.jsonAnswer, null, 2), "utf8");
  console.log(`✓ Sample 1 generated:`);
  console.log(`  - Image: ${path.relative(path.resolve(__dirname, ".."), s1ImgPath)} (${(s1Buffer.length / 1024).toFixed(1)} KB)`);
  console.log(`  - Answer: ${path.relative(path.resolve(__dirname, ".."), s1JsonPath)} (${s1.jsonAnswer.entries.length} entries)`);

  // Sample 2: Master Multi-Class Grid (rotated -3.2 deg, vignette shadow)
  const s2 = buildSample2();
  const s2Buffer = await applyRealisticDistortions(s2.svg, {
    width: s2.width,
    height: s2.height,
    rotateDeg: -3.2,
    blurSigma: 0.6,
    brightness: 0.95,
    contrast: 1.06,
    jpegQuality: 75,
    shadowIntensity: 0.28,
    shadowAngle: "top-right",
  });
  const s2ImgPath = path.join(TIMETABLES_DIR, "synthetic_timetable_02_master_multiclass.png");
  const s2JsonPath = path.join(TIMETABLES_DIR, "synthetic_timetable_02_master_multiclass.json");
  fs.writeFileSync(s2ImgPath, s2Buffer);
  fs.writeFileSync(s2JsonPath, JSON.stringify(s2.jsonAnswer, null, 2), "utf8");
  console.log(`\n✓ Sample 2 generated:`);
  console.log(`  - Image: ${path.relative(path.resolve(__dirname, ".."), s2ImgPath)} (${(s2Buffer.length / 1024).toFixed(1)} KB)`);
  console.log(`  - Answer: ${path.relative(path.resolve(__dirname, ".."), s2JsonPath)} (${s2.jsonAnswer.entries.length} entries for class ${s2.jsonAnswer.targetClass})`);

  // Sample 3: Inverted / Horizontal Mon-Sat Grid with merged blocks (rotated 5.5 deg, overhead shadow)
  const s3 = buildSample3();
  const s3Buffer = await applyRealisticDistortions(s3.svg, {
    width: s3.width,
    height: s3.height,
    rotateDeg: 5.5,
    blurSigma: 0.7,
    brightness: 0.93,
    contrast: 1.08,
    jpegQuality: 74,
    shadowIntensity: 0.32,
    shadowAngle: "bottom-left",
  });
  const s3ImgPath = path.join(TIMETABLES_DIR, "synthetic_timetable_03_horizontal_distorted.png");
  const s3JsonPath = path.join(TIMETABLES_DIR, "synthetic_timetable_03_horizontal_distorted.json");
  fs.writeFileSync(s3ImgPath, s3Buffer);
  fs.writeFileSync(s3JsonPath, JSON.stringify(s3.jsonAnswer, null, 2), "utf8");
  console.log(`\n✓ Sample 3 generated:`);
  console.log(`  - Image: ${path.relative(path.resolve(__dirname, ".."), s3ImgPath)} (${(s3Buffer.length / 1024).toFixed(1)} KB)`);
  console.log(`  - Answer: ${path.relative(path.resolve(__dirname, ".."), s3JsonPath)} (${s3.jsonAnswer.entries.length} entries across 6 days)`);

  console.log("\n==================================================");
  console.log("  3 Preview Samples Ready for User Inspection!     ");
  console.log("==================================================");
}

runGenerator().catch((err) => {
  console.error("Generator failed:", err);
  process.exit(1);
});
