/**
 * Synthetic Test Samples Generator — Full Suite (20 Timetables + 10 WhatsApp Messages)
 * 
 * Generates:
 * - 20 Diverse Timetable PNGs with matching .json answer files in test_samples/timetables/synthetic/
 *   - Layout variations: Days as rows vs cols, periods as rows vs cols, break rows/columns,
 *     teacher codes + legend, Mon-Fri & Mon-Sat, long names, and 3 master multi-class timetables.
 *   - Distortions: Rotation (-8° to +8°), shadows, blur, low light, JPEG compression, cropping.
 * - 10 WhatsApp-style Indonesian homework message .txt files with TaskExtract .json answer files
 *   in test_samples/messages/synthetic/
 * - Zero AI API calls: 100% deterministic, vector-rendered with sharp.
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

function escapeXml(unsafe) {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function applyDistortions(svgString, options = {}) {
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
    cropRect = null, // { left, top, width, height }
  } = options;

  const baseSvgBuffer = Buffer.from(svgString);

  const shadowCoords =
    shadowAngle === "top-left"
      ? { x1: 0, y1: 0, x2: 1, y2: 1 }
      : shadowAngle === "top-right"
      ? { x1: 1, y1: 0, x2: 0, y2: 1 }
      : shadowAngle === "bottom-left"
      ? { x1: 0, y1: 1, x2: 1, y2: 0 }
      : { x1: 0.5, y1: 0, x2: 0.5, y2: 1 };

  const shadowOverlay = Buffer.from(`
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="deskShadow" x1="${shadowCoords.x1}" y1="${shadowCoords.y1}" x2="${shadowCoords.x2}" y2="${shadowCoords.y2}">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.03"/>
          <stop offset="60%" stop-color="#000000" stop-opacity="${shadowIntensity * 0.5}"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="${shadowIntensity}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#deskShadow)"/>
    </svg>
  `);

  let img = sharp(baseSvgBuffer).resize(width, height);
  if (shadowIntensity > 0) {
    img = img.composite([{ input: shadowOverlay, blend: "multiply" }]);
  }

  let rendered = await img.png().toBuffer();

  if (cropRect) {
    rendered = await sharp(rendered).extract(cropRect).png().toBuffer();
  }

  let pipeline = sharp(rendered);

  if (rotateDeg !== 0) {
    pipeline = pipeline.rotate(rotateDeg, { background: "#d5dbe4" });
  }

  if (brightness !== 1 || contrast !== 1) {
    pipeline = pipeline.modulate({ brightness, saturation: 0.95 });
  }

  if (blurSigma > 0) {
    pipeline = pipeline.blur(blurSigma);
  }

  return await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();
}

// ─── Fictional Academic Pool ───
const SUBJECTS = [
  "Robotika Maritim",
  "Astrobiologi Dasar",
  "Etnosains Nusantara",
  "Algoritma Terapan",
  "Bioinformatika Lingkungan",
  "Fisika Kuantum Pemula",
  "Retorika & Debat Global",
  "Geopolitik Bahari",
  "Kriptografi Siswa",
  "Desain Ekologi Kota",
  "Mekatronika Lanjut",
  "Sains Data Mikro",
];

const TEACHERS = [
  { code: "IS", name: "Dr. Irwan Setiawan, M.Sc." },
  { code: "NH", name: "Dra. Nurul Hidayati" },
  { code: "BW", name: "Bambang Waskito, S.Pd." },
  { code: "SR", name: "Siti Rahmawati, M.Kom." },
  { code: "HK", name: "Hendro Kusumo, Ph.D." },
  { code: "DA", name: "Dewi Anggraini, M.Env." },
  { code: "FP", name: "Farhan Pratama, S.Si." },
  { code: "RC", name: "Rina Cahyani, M.A." },
];

const ROOMS = [
  "R. Lab Cyber 3",
  "R. Teater 201",
  "R. Studio Etnosains",
  "R. Bionika A",
  "R. Kubus 104",
  "R. Selasar 7B",
  "R. Workshop Mekatronik",
  "R. 101",
  "R. 102",
  "R. 301",
];

// Helper to pick deterministic item from pool
function getSub(idx) { return SUBJECTS[idx % SUBJECTS.length]; }
function getTchr(idx) { return TEACHERS[idx % TEACHERS.length]; }
function getRm(idx) { return ROOMS[idx % ROOMS.length]; }

// ─── Timetable Layout Builders ───

// Builder A: Standard Grid (Days as Columns, Periods as Rows)
function buildStandardGrid(config) {
  const {
    id,
    school,
    title,
    subtitle,
    days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    periodsCount = 6,
    breakAfterPeriod = 3,
    breakLabel = "ISTIRAHAT",
    breakTime = "09:30 - 10:00",
    useTeacherCodes = false,
    theme = "blue",
    seed = 1,
  } = config;

  const width = 1200;
  const rowH = 65;
  const breakH = 34;
  const startX = 50;
  const startY = 120;
  const colW_time = 135;
  const colW_day = (width - startX * 2 - colW_time) / days.length;

  const headerBg = theme === "purple" ? "#312e81" : theme === "emerald" ? "#064e3b" : theme === "slate" ? "#1e293b" : "#0f172a";
  const headerTxt = theme === "purple" ? "#c7d2fe" : theme === "emerald" ? "#6ee7b7" : theme === "slate" ? "#38bdf8" : "#38bdf8";

  const entries = [];
  let currentY = startY;

  // Header row
  let svg = `
    <rect x="${startX}" y="${currentY}" width="${colW_time}" height="48" fill="${headerBg}" stroke="#334155"/>
    <text x="${startX + colW_time / 2}" y="${currentY + 29}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">WAKTU</text>
  `;

  days.forEach((day, idx) => {
    const x = startX + colW_time + idx * colW_day;
    svg += `
      <rect x="${x}" y="${currentY}" width="${colW_day}" height="48" fill="${headerBg}" stroke="#334155"/>
      <text x="${x + colW_day / 2}" y="${currentY + 29}" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${headerTxt}" text-anchor="middle">${day.toUpperCase()}</text>
    `;
  });

  currentY += 48;

  for (let p = 1; p <= periodsCount; p++) {
    // Check if break comes before this period
    if (p === breakAfterPeriod + 1) {
      svg += `
        <rect x="${startX}" y="${currentY}" width="${width - startX * 2}" height="${breakH}" fill="#fef08a" stroke="#ca8a04"/>
        <text x="${width / 2}" y="${currentY + 22}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#854d0e" text-anchor="middle">☕ ${escapeXml(breakLabel)} (${escapeXml(breakTime)})</text>
      `;
      currentY += breakH;
    }

    const startMin = 420 + (p - 1) * 45 + (p > breakAfterPeriod ? 30 : 0);
    const endMin = startMin + 45;
    const timeStr = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")} - ${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;

    // Period label column
    svg += `
      <rect x="${startX}" y="${currentY}" width="${colW_time}" height="${rowH}" fill="#f8fafc" stroke="#cbd5e1"/>
      <text x="${startX + colW_time / 2}" y="${currentY + 27}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="middle">Jam ${p}</text>
      <text x="${startX + colW_time / 2}" y="${currentY + 46}" font-family="Arial, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">${timeStr}</text>
    `;

    days.forEach((day, dIdx) => {
      const cellIdx = seed * 17 + dIdx * 7 + p * 3;
      const subject = getSub(cellIdx);
      const teacher = getTchr(cellIdx);
      const room = getRm(cellIdx);

      entries.push({
        day,
        period: p,
        subject,
        teacher: teacher.name,
        room,
      });

      const x = startX + colW_time + dIdx * colW_day;
      const isAlt = p % 2 === 0;
      const cellBg = isAlt ? "#f1f5f9" : "#ffffff";

      svg += `
        <rect x="${x}" y="${currentY}" width="${colW_day}" height="${rowH}" fill="${cellBg}" stroke="#cbd5e1"/>
        <text x="${x + 8}" y="${currentY + 24}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#0f172a">${escapeXml(subject)}</text>
        <text x="${x + 8}" y="${currentY + 41}" font-family="Arial, sans-serif" font-size="10" fill="#2563eb">${useTeacherCodes ? `[${teacher.code}]` : escapeXml(teacher.name)}</text>
        <text x="${x + colW_day - 8}" y="${currentY + 54}" font-family="Arial, sans-serif" font-size="9" fill="#64748b" text-anchor="end">${escapeXml(room)}</text>
      `;
    });

    currentY += rowH;
  }

  // Teacher legend if using codes
  if (useTeacherCodes) {
    currentY += 15;
    svg += `
      <rect x="${startX}" y="${currentY}" width="${width - startX * 2}" height="65" fill="#f8fafc" stroke="#cbd5e1" rx="4"/>
      <text x="${startX + 12}" y="${currentY + 20}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#475569">KODE PENGAJAR:</text>
      <text x="${startX + 12}" y="${currentY + 38}" font-family="Arial, sans-serif" font-size="10" fill="#334155">IS: Dr. Irwan Setiawan | NH: Dra. Nurul Hidayati | BW: Bambang Waskito, S.Pd. | SR: Siti Rahmawati, M.Kom.</text>
      <text x="${startX + 12}" y="${currentY + 54}" font-family="Arial, sans-serif" font-size="10" fill="#334155">HK: Hendro Kusumo, Ph.D. | DA: Dewi Anggraini, M.Env. | FP: Farhan Pratama, S.Si. | RC: Rina Cahyani, M.A.</text>
    `;
    currentY += 65;
  }

  const finalHeight = currentY + 30;

  const fullSvg = `
    <svg width="${width}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${finalHeight}" fill="#fdfdfd"/>
      <text x="${width / 2}" y="42" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(school)}</text>
      <text x="${width / 2}" y="68" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#0284c7" text-anchor="middle">${escapeXml(title)}</text>
      <text x="${width / 2}" y="90" font-family="Arial, sans-serif" font-size="11" fill="#64748b" text-anchor="middle">${escapeXml(subtitle)}</text>
      ${svg}
    </svg>
  `;

  return {
    svg: fullSvg,
    jsonAnswer: {
      type: "timetable",
      description: title,
      entries,
    },
    width,
    height: finalHeight,
  };
}

// Builder B: Master Timetable Multi-Class
function buildMasterTimetable(config) {
  const {
    id,
    school,
    title,
    classes = ["X-1", "X-2", "XI IPA 1"],
    targetClass = "X-1",
    days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    periodsPerDay = 5,
    seed = 2,
  } = config;

  const width = 1200;
  const startX = 40;
  const startY = 115;
  const colW_day = 85;
  const colW_period = 55;
  const colW_time = 105;
  const colW_class = (width - startX * 2 - colW_day - colW_period - colW_time) / classes.length;
  const rowH = 42;

  let currentY = startY;
  const answerEntries = [];

  let svg = `
    <rect x="${startX}" y="${currentY}" width="${colW_day}" height="42" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">HARI</text>

    <rect x="${startX + colW_day}" y="${currentY}" width="${colW_period}" height="42" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day + colW_period / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">JAM</text>

    <rect x="${startX + colW_day + colW_period}" y="${currentY}" width="${colW_time}" height="42" fill="#0f172a" stroke="#334155"/>
    <text x="${startX + colW_day + colW_period + colW_time / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">WAKTU</text>
  `;

  classes.forEach((cls, idx) => {
    const x = startX + colW_day + colW_period + colW_time + idx * colW_class;
    const isTarget = cls === targetClass;
    svg += `
      <rect x="${x}" y="${currentY}" width="${colW_class}" height="42" fill="${isTarget ? "#0284c7" : "#1e293b"}" stroke="#334155"/>
      <text x="${x + colW_class / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(cls)} ${isTarget ? "★" : ""}</text>
    `;
  });

  currentY += 42;

  days.forEach((day, dIdx) => {
    for (let p = 1; p <= periodsPerDay; p++) {
      if (p === 4) {
        // Break row
        svg += `
          <rect x="${startX}" y="${currentY}" width="${width - startX * 2}" height="30" fill="#fef9c3" stroke="#eab308"/>
          <text x="${width / 2}" y="${currentY + 20}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#a16207" text-anchor="middle">--- ISTIRAHAT &amp; ISHOMA (11:45 - 12:30) ---</text>
        `;
        currentY += 30;
      }

      const isEven = (dIdx * periodsPerDay + p) % 2 === 0;
      const bg = isEven ? "#ffffff" : "#f8fafc";
      const timeStr = `0${6 + p}:30 - 0${7 + p}:15`;

      svg += `
        <rect x="${startX}" y="${currentY}" width="${colW_day}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">${day}</text>

        <rect x="${startX + colW_day}" y="${currentY}" width="${colW_period}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day + colW_period / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="11" fill="#475569" text-anchor="middle">${p}</text>

        <rect x="${startX + colW_day + colW_period}" y="${currentY}" width="${colW_time}" height="${rowH}" fill="${bg}" stroke="#cbd5e1"/>
        <text x="${startX + colW_day + colW_period + colW_time / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">${timeStr}</text>
      `;

      classes.forEach((cls, cIdx) => {
        const x = startX + colW_day + colW_period + colW_time + cIdx * colW_class;
        const cellSeed = seed * 31 + dIdx * 19 + p * 7 + cIdx * 11;
        const subject = getSub(cellSeed);
        const teacher = getTchr(cellSeed);
        const room = getRm(cellSeed);
        const isTarget = cls === targetClass;

        if (isTarget) {
          answerEntries.push({
            day,
            period: p,
            subject,
            teacher: teacher.name,
            room,
          });
        }

        svg += `
          <rect x="${x}" y="${currentY}" width="${colW_class}" height="${rowH}" fill="${isTarget ? "#f0f9ff" : bg}" stroke="${isTarget ? "#38bdf8" : "#cbd5e1"}" stroke-width="${isTarget ? 1.2 : 1}"/>
          <text x="${x + 8}" y="${currentY + 18}" font-family="Arial, sans-serif" font-size="11" font-weight="${isTarget ? "bold" : "normal"}" fill="${isTarget ? "#0369a1" : "#1e293b"}">${escapeXml(subject)}</text>
          <text x="${x + 8}" y="${currentY + 33}" font-family="Arial, sans-serif" font-size="9" fill="#64748b">${escapeXml(teacher.name)} • ${escapeXml(room)}</text>
        `;
      });

      currentY += rowH;
    }
  });

  const finalHeight = currentY + 30;

  const fullSvg = `
    <svg width="${width}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${finalHeight}" fill="#f8fafc"/>
      <rect x="0" y="0" width="${width}" height="95" fill="#0f172a"/>
      <text x="${width / 2}" y="36" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(school)}</text>
      <text x="${width / 2}" y="62" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="middle">${escapeXml(title)}</text>
      <text x="${width / 2}" y="84" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">* Jawaban diekstrak khusus untuk target: ${escapeXml(targetClass)}</text>
      ${svg}
    </svg>
  `;

  return {
    svg: fullSvg,
    jsonAnswer: {
      type: "timetable",
      targetClass,
      description: `${title} (Target: ${targetClass})`,
      entries: answerEntries,
    },
    width,
    height: finalHeight,
  };
}

// Builder C: Horizontal Days as Rows Grid (Mon-Sat, Merged Cells)
function buildHorizontalGrid(config) {
  const {
    id,
    school,
    title,
    days = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
    periodsCount = 6,
    theme = "indigo",
    seed = 3,
  } = config;

  const width = 1200;
  const startX = 40;
  const startY = 110;
  const colW_day = 100;
  const periodW = (width - startX * 2 - colW_day) / periodsCount;
  const rowH = 70;

  const headerBg = theme === "indigo" ? "#1e1b4b" : theme === "teal" ? "#134e4a" : "#1e293b";
  const headerTxt = theme === "indigo" ? "#c7d2fe" : theme === "teal" ? "#99f6e4" : "#cbd5e1";

  const entries = [];
  let currentY = startY;

  // Header
  let svg = `
    <rect x="${startX}" y="${currentY}" width="${colW_day}" height="42" fill="${headerBg}" stroke="#312e81"/>
    <text x="${startX + colW_day / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${headerTxt}" text-anchor="middle">HARI</text>
  `;

  for (let p = 1; p <= periodsCount; p++) {
    const x = startX + colW_day + (p - 1) * periodW;
    svg += `
      <rect x="${x}" y="${currentY}" width="${periodW}" height="42" fill="${headerBg}" stroke="#312e81"/>
      <text x="${x + periodW / 2}" y="${currentY + 26}" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">JAM ${p}</text>
    `;
  }

  currentY += 42;

  days.forEach((day, dIdx) => {
    const isEven = dIdx % 2 === 0;
    const bgDay = isEven ? "#312e81" : "#1e1b4b";

    svg += `
      <rect x="${startX}" y="${currentY}" width="${colW_day}" height="${rowH}" fill="${bgDay}" stroke="#4338ca"/>
      <text x="${startX + colW_day / 2}" y="${currentY + 41}" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">${day}</text>
    `;

    let p = 1;
    while (p <= periodsCount) {
      // Create some merged double periods on Jam 1 or Jam 3
      const isMerged = (p === 1 || p === 3) && p + 1 <= periodsCount;
      const span = isMerged ? 2 : 1;
      const x = startX + colW_day + (p - 1) * periodW;
      const w = span * periodW;

      const cellSeed = seed * 43 + dIdx * 23 + p * 11;
      const subject = getSub(cellSeed);
      const teacher = getTchr(cellSeed);
      const room = getRm(cellSeed);

      for (let s = 0; s < span; s++) {
        entries.push({
          day,
          period: p + s,
          subject,
          teacher: teacher.name,
          room,
        });
      }

      const cellBg = isMerged ? "#e0e7ff" : (p % 2 === 0 ? "#f8fafc" : "#ffffff");
      const borderCol = isMerged ? "#6366f1" : "#cbd5e1";

      svg += `
        <rect x="${x}" y="${currentY}" width="${w}" height="${rowH}" fill="${cellBg}" stroke="${borderCol}" stroke-width="${isMerged ? 1.5 : 1}"/>
        <text x="${x + w / 2}" y="${currentY + 27}" font-family="Arial, sans-serif" font-size="${isMerged ? 12 : 10}" font-weight="bold" fill="#1e1b4b" text-anchor="middle">${escapeXml(subject)}</text>
        <text x="${x + w / 2}" y="${currentY + 44}" font-family="Arial, sans-serif" font-size="10" fill="#4338ca" text-anchor="middle">${escapeXml(teacher.name)}</text>
        <text x="${x + w / 2}" y="${currentY + 59}" font-family="Arial, sans-serif" font-size="9" fill="#64748b" text-anchor="middle">${escapeXml(room)} ${isMerged ? "• (2 Jam)" : ""}</text>
      `;

      p += span;
    }

    currentY += rowH;
  });

  const finalHeight = currentY + 30;

  const fullSvg = `
    <svg width="${width}" height="${finalHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${finalHeight}" fill="#f8fafc"/>
      <rect x="0" y="0" width="${width}" height="85" fill="#1e1b4b"/>
      <text x="${width / 2}" y="36" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(school)}</text>
      <text x="${width / 2}" y="64" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#818cf8" text-anchor="middle">${escapeXml(title)}</text>
      ${svg}
    </svg>
  `;

  return {
    svg: fullSvg,
    jsonAnswer: {
      type: "timetable",
      description: title,
      entries,
    },
    width,
    height: finalHeight,
  };
}

// ─── 20 Timetable Configurations ───
const TIMETABLE_CONFIGS = [
  // 1: Standard Mon-Fri Grid with Break Row & Legend
  {
    filename: "synthetic_timetable_01_grid_standard",
    builder: "standard",
    options: {
      school: "SMA Nusantara Cendekia",
      title: "Jadwal Pelajaran Kelas XI MIPA 3",
      subtitle: "Tahun Ajaran 2026/2027 — Semester Ganjil",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 6,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT PAGI",
      useTeacherCodes: true,
      theme: "slate",
      seed: 101,
    },
    distortion: { rotateDeg: 2.2, blurSigma: 0.5, brightness: 0.97, contrast: 1.04, jpegQuality: 78, shadowIntensity: 0.2, shadowAngle: "top-left" },
  },
  // 2: Master Timetable Multi-Class (X-1, X-2, XI IPA 1)
  {
    filename: "synthetic_timetable_02_master_multiclass",
    builder: "master",
    options: {
      school: "SMP Teladan Bangsa",
      title: "Jadwal Induk Distribusi Kelas (X-1, X-2, XI IPA 1)",
      classes: ["X-1", "X-2", "XI IPA 1"],
      targetClass: "X-1",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsPerDay: 5,
      seed: 102,
    },
    distortion: { rotateDeg: -3.2, blurSigma: 0.6, brightness: 0.95, contrast: 1.06, jpegQuality: 75, shadowIntensity: 0.28, shadowAngle: "top-right" },
  },
  // 3: Horizontal Mon-Sat Grid with Merged Double Periods
  {
    filename: "synthetic_timetable_03_horizontal_distorted",
    builder: "horizontal",
    options: {
      school: "Akademi Sains Dirgantara Nusantara",
      title: "Jadwal Pelajaran Mingguan (Senin - Sabtu)",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      periodsCount: 6,
      theme: "indigo",
      seed: 103,
    },
    distortion: { rotateDeg: 5.5, blurSigma: 0.7, brightness: 0.93, contrast: 1.08, jpegQuality: 74, shadowIntensity: 0.32, shadowAngle: "bottom-left" },
  },
  // 4: Mon-Fri Horizontal Grid (Periods as Columns, Days as Rows)
  {
    filename: "synthetic_timetable_04_horizontal_mon_fri",
    builder: "horizontal",
    options: {
      school: "SMA Bintang Cemerlang",
      title: "Jadwal Mingguan Kelas X-A",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 6,
      theme: "teal",
      seed: 104,
    },
    distortion: { rotateDeg: -4.5, blurSigma: 0.5, brightness: 0.95, contrast: 1.03, jpegQuality: 77, shadowIntensity: 0.22, shadowAngle: "top-left" },
  },
  // 5: Mon-Sat 7-Period Grid with Morning Upacara
  {
    filename: "synthetic_timetable_05_mon_sat_upacara",
    builder: "standard",
    options: {
      school: "SMP Patriot Bangsa",
      title: "Jadwal Reguler Kelas VIII-B",
      subtitle: "Senin s.d. Sabtu (Jam 1: Upacara Bendera)",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      periodsCount: 7,
      breakAfterPeriod: 4,
      breakLabel: "ISHOMA & ISTIRAHAT",
      breakTime: "11:45 - 12:30",
      theme: "blue",
      seed: 105,
    },
    distortion: { rotateDeg: 3.1, blurSigma: 0.6, brightness: 0.96, contrast: 1.05, jpegQuality: 76, shadowIntensity: 0.25, shadowAngle: "top-right" },
  },
  // 6: Mon-Fri Minimalist Slate Theme
  {
    filename: "synthetic_timetable_06_minimalist_slate",
    builder: "standard",
    options: {
      school: "SMA Harapan Global",
      title: "Jadwal Kelas XII MIPA 1",
      subtitle: "Semester Ganjil 2026",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 5,
      breakAfterPeriod: 3,
      breakLabel: "REST BREAK",
      breakTime: "09:45 - 10:15",
      theme: "slate",
      seed: 106,
    },
    distortion: { rotateDeg: -2.0, blurSigma: 0.4, brightness: 0.98, contrast: 1.02, jpegQuality: 80, shadowIntensity: 0.15, shadowAngle: "top-left" },
  },
  // 7: Master Timetable 2 (SMP Bintang: VII-A, VII-B, VIII-A, VIII-B) -> Target: VII-A
  {
    filename: "synthetic_timetable_07_master_smp_bintang",
    builder: "master",
    options: {
      school: "SMP Bintang Nusantara",
      title: "Jadwal Induk Kelas VII-A s.d. VIII-B",
      classes: ["VII-A", "VII-B", "VIII-A", "VIII-B"],
      targetClass: "VII-A",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsPerDay: 5,
      seed: 107,
    },
    distortion: { rotateDeg: 4.8, blurSigma: 0.6, brightness: 0.94, contrast: 1.07, jpegQuality: 74, shadowIntensity: 0.3, shadowAngle: "bottom-left" },
  },
  // 8: Long Descriptive Subject Names
  {
    filename: "synthetic_timetable_08_long_subject_names",
    builder: "standard",
    options: {
      school: "Politeknik Sains & Terapan",
      title: "Jadwal Mata Pelajaran Terpadu",
      subtitle: "Konsentrasi Bioinformatika & Robotika Maritim",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 5,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT MAHASISWA",
      theme: "purple",
      seed: 108,
    },
    distortion: { rotateDeg: -6.8, blurSigma: 0.7, brightness: 0.92, contrast: 1.09, jpegQuality: 72, shadowIntensity: 0.35, shadowAngle: "top-right" },
  },
  // 9: Mon-Sat Compressed 8-Period Grid with 2-Column Legend
  {
    filename: "synthetic_timetable_09_compressed_8_periods",
    builder: "standard",
    options: {
      school: "SMK Cendekia Terpadu",
      title: "Jadwal Praktikum & Teori Kelas X-RPL",
      subtitle: "8 Jam Pelajaran Per Hari",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      periodsCount: 8,
      breakAfterPeriod: 4,
      breakLabel: "ISHOMA SIANG",
      useTeacherCodes: true,
      theme: "emerald",
      seed: 109,
    },
    distortion: { rotateDeg: 1.5, blurSigma: 0.5, brightness: 0.97, contrast: 1.03, jpegQuality: 77, shadowIntensity: 0.18, shadowAngle: "top-left" },
  },
  // 10: Near-Limit Distortion (Rotated 7.8°, Low Light Vignette, Soft Focus)
  {
    filename: "synthetic_timetable_10_heavy_distortion_photo",
    builder: "standard",
    options: {
      school: "SMA Negeri Kusuma Bangsa",
      title: "Jadwal Pelajaran Kelas XI IPS 2",
      subtitle: "Dokumen Cetak Papan Pengumuman",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 6,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT",
      theme: "slate",
      seed: 110,
    },
    distortion: { rotateDeg: 7.8, blurSigma: 0.8, brightness: 0.9, contrast: 1.12, jpegQuality: 68, shadowIntensity: 0.4, shadowAngle: "bottom-left" },
  },
  // 11: Master Timetable 3 (Classes: XI IPS 1, XI IPS 2, XII IPS) -> Target: XI IPS 2
  {
    filename: "synthetic_timetable_11_master_ips_classes",
    builder: "master",
    options: {
      school: "SMA Dirgantara Unggul",
      title: "Jadwal Induk Rumpun IPS (XI IPS 1, XI IPS 2, XII IPS)",
      classes: ["XI IPS 1", "XI IPS 2", "XII IPS"],
      targetClass: "XI IPS 2",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsPerDay: 5,
      seed: 111,
    },
    distortion: { rotateDeg: -5.2, blurSigma: 0.6, brightness: 0.93, contrast: 1.06, jpegQuality: 73, shadowIntensity: 0.28, shadowAngle: "top-right" },
  },
  // 12: Uneven Period Schedule
  {
    filename: "synthetic_timetable_12_uneven_period_times",
    builder: "standard",
    options: {
      school: "SMA Bina Taruna",
      title: "Jadwal Belajar Kelas X MIPA 1",
      subtitle: "Waktu Khusus Jam Pendek",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 6,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT PAGI",
      theme: "blue",
      seed: 112,
    },
    distortion: { rotateDeg: 2.8, blurSigma: 0.5, brightness: 0.96, contrast: 1.04, jpegQuality: 78, shadowIntensity: 0.22, shadowAngle: "top-left" },
  },
  // 13: Mon-Sat Horizontal Double Period Schedule
  {
    filename: "synthetic_timetable_13_horizontal_double_periods",
    builder: "horizontal",
    options: {
      school: "Madrasah Aliyah Cendekia",
      title: "Jadwal Mingguan Blok Ganda",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      periodsCount: 6,
      theme: "teal",
      seed: 113,
    },
    distortion: { rotateDeg: -3.8, blurSigma: 0.6, brightness: 0.95, contrast: 1.05, jpegQuality: 76, shadowIntensity: 0.26, shadowAngle: "top-right" },
  },
  // 14: Mon-Fri Early Friday Dismissal
  {
    filename: "synthetic_timetable_14_early_friday_dismissal",
    builder: "standard",
    options: {
      school: "SMA Islam Terpadu Al-Falah",
      title: "Jadwal Pelajaran Kelas XI-A",
      subtitle: "Jumat: Kepulangan Pukul 11:30",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 5,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT",
      theme: "emerald",
      seed: 114,
    },
    distortion: { rotateDeg: 5.0, blurSigma: 0.6, brightness: 0.94, contrast: 1.07, jpegQuality: 75, shadowIntensity: 0.3, shadowAngle: "bottom-left" },
  },
  // 15: Mon-Fri Grid with Teacher Legend
  {
    filename: "synthetic_timetable_15_teacher_legend_box",
    builder: "standard",
    options: {
      school: "SMA Unggulan Nusantara",
      title: "Jadwal Pelajaran Kelas XII IPA 2",
      subtitle: "Kode Guru Lengkap",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 6,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT",
      useTeacherCodes: true,
      theme: "purple",
      seed: 115,
    },
    distortion: { rotateDeg: -7.2, blurSigma: 0.7, brightness: 0.91, contrast: 1.09, jpegQuality: 71, shadowIntensity: 0.36, shadowAngle: "top-right" },
  },
  // 16: Screenshot-style crop
  {
    filename: "synthetic_timetable_16_screenshot_cropped",
    builder: "standard",
    options: {
      school: "SMA Digital Indonesia",
      title: "Tangkapan Layar Jadwal Kelas X-C",
      subtitle: "Portal Akademik",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 5,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT",
      theme: "blue",
      seed: 116,
    },
    distortion: { rotateDeg: 0, blurSigma: 0, brightness: 1, contrast: 1, jpegQuality: 82, shadowIntensity: 0, cropRect: { left: 40, top: 40, width: 1120, height: 500 } },
  },
  // 17: High-Contrast Monochrome Photocopy
  {
    filename: "synthetic_timetable_17_monochrome_photocopy",
    builder: "standard",
    options: {
      school: "SMA Negeri 1 Nusantara",
      title: "Fotokopi Jadwal Pelajaran Kelas XI IPS 1",
      subtitle: "Salinan Arsip Sekolah",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 6,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT",
      theme: "slate",
      seed: 117,
    },
    distortion: { rotateDeg: 3.5, blurSigma: 0.5, brightness: 0.98, contrast: 1.18, jpegQuality: 69, shadowIntensity: 0.25, shadowAngle: "top-left" },
  },
  // 18: Afternoon Shift Schedule
  {
    filename: "synthetic_timetable_18_afternoon_shift",
    builder: "standard",
    options: {
      school: "SMP Budi Mulia (Sesi Siang)",
      title: "Jadwal Belajar Kelas VII Siang (12:30 - 17:15)",
      subtitle: "Istirahat Ashar Pukul 15:00",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsCount: 5,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT SHOLAT ASHAR",
      breakTime: "15:00 - 15:30",
      theme: "purple",
      seed: 118,
    },
    distortion: { rotateDeg: -4.0, blurSigma: 0.6, brightness: 0.94, contrast: 1.05, jpegQuality: 75, shadowIntensity: 0.28, shadowAngle: "bottom-left" },
  },
  // 19: Mon-Sat Alternate Week Schedule
  {
    filename: "synthetic_timetable_19_alternate_week_ganjil",
    builder: "standard",
    options: {
      school: "SMA Insan Cendekia",
      title: "Jadwal Pelajaran (Minggu Ganjil) Kelas X-B",
      subtitle: "Berlaku untuk Siklus Minggu A",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
      periodsCount: 6,
      breakAfterPeriod: 3,
      breakLabel: "ISTIRAHAT",
      theme: "emerald",
      seed: 119,
    },
    distortion: { rotateDeg: 6.5, blurSigma: 0.7, brightness: 0.92, contrast: 1.08, jpegQuality: 72, shadowIntensity: 0.34, shadowAngle: "top-right" },
  },
  // 20: Master Overview 2-Class Grid (X-3, X-4) -> Target: X-3
  {
    filename: "synthetic_timetable_20_master_two_classes",
    builder: "master",
    options: {
      school: "SMA Pelita Harapan Bangsa",
      title: "Jadwal Distribusi Guru (Kelas X-3 & X-4)",
      classes: ["X-3", "X-4"],
      targetClass: "X-3",
      days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      periodsPerDay: 5,
      seed: 120,
    },
    distortion: { rotateDeg: -2.5, blurSigma: 0.5, brightness: 0.96, contrast: 1.04, jpegQuality: 78, shadowIntensity: 0.2, shadowAngle: "top-left" },
  },
];

// ─── 10 Fake WhatsApp-style Messages (Indonesian) ───
const MESSAGE_CONFIGS = [
  {
    filename: "message_synthetic_01",
    text: "Jangan lupa besok PR Robotika Maritim hal 30 no 1-10 dikumpul ya. Bawa modul praktikum ke Lab Cyber 3.",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Robotika Maritim",
          title: "PR hal 30 no 1-10",
          type: "homework",
          datePhrase: "besok",
          notes: "Bawa modul praktikum ke Lab Cyber 3",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_02",
    text: "Info kelas XI: Hari Senin depan ada kuis Astrobiologi Dasar Bab 2. Terus tugas kelompok Etnosains Nusantara bikin makalah dikumpul hari Kamis ya.",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Astrobiologi Dasar",
          title: "Kuis Bab 2",
          type: "quiz",
          datePhrase: "Hari Senin depan",
          notes: "",
        },
        {
          subject: "Etnosains Nusantara",
          title: "Tugas kelompok bikin makalah",
          type: "homework",
          datePhrase: "hari Kamis",
          notes: "Tugas kelompok",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_03",
    text: "Pengumuman dari Bu Siti: Tugas Algoritma Terapan buat flowchart dikumpul lusa jam 08.00 pagi di meja guru. Jangan telat!",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Algoritma Terapan",
          title: "Tugas buat flowchart",
          type: "homework",
          datePhrase: "lusa",
          notes: "Jam 08.00 pagi di meja guru",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_04",
    text: "Teman-teman kelompok 3, Proyek Desain Ekologi Kota tentang miniatur taman surya dikumpul hari Jumat depan. Hari Rabu kita kumpul di perpustakaan buat finishing.",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Desain Ekologi Kota",
          title: "Proyek miniatur taman surya",
          type: "project",
          datePhrase: "hari Jumat depan",
          notes: "Finishing di perpustakaan hari Rabu",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_05",
    text: "PR Fisika Kuantum Pemula hal 88 nomor 1-5 dikumpul besok lusa. Kalau Kriptografi Siswa kuisnya hari Selasa jam ke-3.",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Fisika Kuantum Pemula",
          title: "PR hal 88 nomor 1-5",
          type: "homework",
          datePhrase: "besok lusa",
          notes: "",
        },
        {
          subject: "Kriptografi Siswa",
          title: "Kuis Kriptografi",
          type: "quiz",
          datePhrase: "hari Selasa",
          notes: "Jam ke-3",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_06",
    text: `Catatan tugas minggu ini:
1. Bioinformatika Lingkungan: resume jurnal dikumpul hari Senin.
2. Geopolitik Bahari: rangkuman bab 4 dikumpul hari Rabu.
3. Retorika & Debat Global: siapkan mosi debat buat hari Jumat.`,
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Bioinformatika Lingkungan",
          title: "Resume jurnal",
          type: "homework",
          datePhrase: "hari Senin",
          notes: "",
        },
        {
          subject: "Geopolitik Bahari",
          title: "Rangkuman bab 4",
          type: "homework",
          datePhrase: "hari Rabu",
          notes: "",
        },
        {
          subject: "Retorika & Debat Global",
          title: "Siapkan mosi debat",
          type: "homework",
          datePhrase: "hari Jumat",
          notes: "",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_07",
    text: "Pemberitahuan: Besok pagi ulangan harian Mekatronika Lanjut materi sensor ultrasonik. Siapkan pensil 2B dan kalkulator ya.",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Mekatronika Lanjut",
          title: "Ulangan harian materi sensor ultrasonik",
          type: "quiz",
          datePhrase: "Besok pagi",
          notes: "Siapkan pensil 2B dan kalkulator",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_08",
    text: "Pengumuman Pak Hendro: Tugas analisis Sains Data Mikro dikumpulkan minggu depan hari Selasa via flashdisk ke ketua kelas.",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Sains Data Mikro",
          title: "Tugas analisis data",
          type: "homework",
          datePhrase: "minggu depan hari Selasa",
          notes: "Via flashdisk ke ketua kelas",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_09",
    text: "Tugas Robotika Maritim rakit sensor dikumpul hari Kamis. Latihan soal Kriptografi Siswa no 1 sampai 15 dikumpul lusa ya teman-teman.",
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Robotika Maritim",
          title: "Tugas rakit sensor",
          type: "homework",
          datePhrase: "hari Kamis",
          notes: "",
        },
        {
          subject: "Kriptografi Siswa",
          title: "Latihan soal no 1 sampai 15",
          type: "homework",
          datePhrase: "lusa",
          notes: "",
        },
      ],
    },
  },
  {
    filename: "message_synthetic_10",
    text: `Reminder tugas kelas:
- Astrobiologi Dasar: Laporan praktikum kultur sel dikumpul besok.
- Etnosains Nusantara: Kliping kearifan lokal dikumpul Senin depan.
- Algoritma Terapan: Tugas koding Python dikumpul hari Rabu.`,
    answer: {
      type: "message",
      tasks: [
        {
          subject: "Astrobiologi Dasar",
          title: "Laporan praktikum kultur sel",
          type: "homework",
          datePhrase: "besok",
          notes: "",
        },
        {
          subject: "Etnosains Nusantara",
          title: "Kliping kearifan lokal",
          type: "homework",
          datePhrase: "Senin depan",
          notes: "",
        },
        {
          subject: "Algoritma Terapan",
          title: "Tugas koding Python",
          type: "homework",
          datePhrase: "hari Rabu",
          notes: "",
        },
      ],
    },
  },
];

// ─── Execution ───
async function run() {
  console.log("==================================================");
  console.log("  Generating 20 Synthetic Timetables + Answers... ");
  console.log("==================================================\n");

  for (let i = 0; i < TIMETABLE_CONFIGS.length; i++) {
    const item = TIMETABLE_CONFIGS[i];
    console.log(`[${i + 1}/20] Building timetable: ${item.filename}...`);

    let buildResult;
    if (item.builder === "standard") {
      buildResult = buildStandardGrid(item.options);
    } else if (item.builder === "master") {
      buildResult = buildMasterTimetable(item.options);
    } else {
      buildResult = buildHorizontalGrid(item.options);
    }

    const imgBuffer = await applyDistortions(buildResult.svg, {
      ...item.distortion,
      width: buildResult.width,
      height: buildResult.height,
    });

    const imgPath = path.join(TIMETABLES_DIR, `${item.filename}.png`);
    const jsonPath = path.join(TIMETABLES_DIR, `${item.filename}.json`);

    fs.writeFileSync(imgPath, imgBuffer);
    fs.writeFileSync(jsonPath, JSON.stringify(buildResult.jsonAnswer, null, 2), "utf8");

    console.log(`  ✓ ${item.filename}.png (${(imgBuffer.length / 1024).toFixed(1)} KB)`);
    console.log(`  ✓ ${item.filename}.json (${buildResult.jsonAnswer.entries.length} entries)`);
  }

  console.log("\n==================================================");
  console.log("  Generating 10 WhatsApp Messages + Answers...    ");
  console.log("==================================================\n");

  for (let i = 0; i < MESSAGE_CONFIGS.length; i++) {
    const item = MESSAGE_CONFIGS[i];
    const txtPath = path.join(MESSAGES_DIR, `${item.filename}.txt`);
    const jsonPath = path.join(MESSAGES_DIR, `${item.filename}.json`);

    fs.writeFileSync(txtPath, item.text, "utf8");
    fs.writeFileSync(jsonPath, JSON.stringify(item.answer, null, 2), "utf8");

    console.log(`[${i + 1}/10] ✓ ${item.filename}.txt & ${item.filename}.json (${item.answer.tasks.length} task(s))`);
  }

  console.log("\n==================================================");
  console.log("  All 20 Timetables & 10 Messages Generated!     ");
  console.log("==================================================");
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
