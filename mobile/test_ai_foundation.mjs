/**
 * Automated Test Runner for Phase 4: AI Foundation Layer & Deterministic Parsers
 * Runs standalone with standard Node.js: `node test_ai_foundation.mjs`
 */

import assert from "node:assert/strict";
import { format, addDays, getDay } from "date-fns";

// ─── 1. Indonesian Subject Catalog Verification ───
const INDONESIAN_SUBJECT_CATALOG = [
  {
    canonicalName: "Matematika",
    defaultColor: "#3A86FF",
    aliases: ["mtk", "mat", "math", "matematika", "kalkulus", "aljabar"],
    defaultBringItems: ["Buku Paket", "Buku Kotak-kotak", "Penggaris", "Busur"],
  },
  {
    canonicalName: "Bahasa Indonesia",
    defaultColor: "#EF4444",
    aliases: ["b.indo", "bind", "b indo", "bahasa indonesia", "indo", "bin"],
    defaultBringItems: ["Kamus KBBI", "Buku Catatan"],
  },
  {
    canonicalName: "Bahasa Inggris",
    defaultColor: "#8B5CF6",
    aliases: ["b.ing", "bing", "b ing", "bahasa inggris", "english", "eng"],
    defaultBringItems: ["Kamus Inggris", "Modul Latihan"],
  },
  {
    canonicalName: "Ilmu Pengetahuan Alam (IPA)",
    defaultColor: "#10B981",
    aliases: ["ipa", "sains", "science"],
    defaultBringItems: ["Buku Paket", "Jas Lab"],
  },
  {
    canonicalName: "Fisika",
    defaultColor: "#06B6D4",
    aliases: ["fis", "fisika", "physics"],
    defaultBringItems: ["Kalkulator Ilmiah", "Buku Catatan Rumus"],
  },
  {
    canonicalName: "Kimia",
    defaultColor: "#F59E0B",
    aliases: ["kim", "kimia", "chemistry"],
    defaultBringItems: ["Tabel Periodik", "Jas Lab"],
  },
  {
    canonicalName: "Biologi",
    defaultColor: "#84CC16",
    aliases: ["bio", "biologi", "biology"],
    defaultBringItems: ["Buku Gambar", "Pensil Warna"],
  },
  {
    canonicalName: "Ilmu Pengetahuan Sosial (IPS)",
    defaultColor: "#F97316",
    aliases: ["ips", "sosial", "social"],
    defaultBringItems: ["Atlas", "Buku Paket"],
  },
  {
    canonicalName: "Pendidikan Jasmani & Kesehatan (PJOK)",
    defaultColor: "#EC4899",
    aliases: ["pjok", "penjas", "penjaskes", "olahraga", "or", "sport"],
    defaultBringItems: ["Seragam Olahraga", "Sepatu Kets", "Air Minum"],
  },
  {
    canonicalName: "Pendidikan Agama Islam (PAI)",
    defaultColor: "#059669",
    aliases: ["pai", "agama", "agama islam", "pendidikan agama"],
    defaultBringItems: ["Al-Qur'an / Juz Amma", "Buku Catatan"],
  },
  {
    canonicalName: "Pancasila & Kewarganegaraan (PPKn)",
    defaultColor: "#DC2626",
    aliases: ["ppkn", "pkn", "kewarganegaraan", "pancasila"],
    defaultBringItems: ["UUD 1945", "Buku Paket"],
  },
  {
    canonicalName: "Seni Budaya & Keterampilan (SBK)",
    defaultColor: "#D946EF",
    aliases: ["sbk", "seni budaya", "kesenian", "seni rupa", "seni musik", "prakarya"],
    defaultBringItems: ["Buku Gambar A3", "Cat Air / Pensil Warna"],
  },
  {
    canonicalName: "Informatika / TIK",
    defaultColor: "#3B82F6",
    aliases: ["tik", "informatika", "komputer", "it", "cs"],
    defaultBringItems: ["Laptop / Flashdisk", "Buku Logika"],
  },
  {
    canonicalName: "Bimbingan & Konseling (BK)",
    defaultColor: "#64748B",
    aliases: ["bk", "bimbingan konseling", "bp"],
    defaultBringItems: ["Buku Konseling"],
  },
];

function resolveIndonesianSubject(rawInput) {
  const clean = (rawInput || "").trim().toLowerCase();
  if (!clean) {
    return { canonicalName: "Mata Pelajaran", defaultColor: "#3A86FF", aliases: [] };
  }
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    if (entry.canonicalName.toLowerCase() === clean || entry.aliases.includes(clean)) {
      return entry;
    }
  }
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    for (const alias of entry.aliases) {
      const pattern = new RegExp(`\\b${alias}\\b`, "i");
      if (pattern.test(clean)) return entry;
    }
  }
  return {
    canonicalName: rawInput.trim(),
    defaultColor: "#3A86FF",
    aliases: [clean],
  };
}

function normalizeWeekday(raw) {
  if (typeof raw === "number" && raw >= 1 && raw <= 7) return raw;
  const s = String(raw).trim().toLowerCase();
  if (s.includes("senin") || s.includes("mon")) return 1;
  if (s.includes("selasa") || s.includes("tue")) return 2;
  if (s.includes("rabu") || s.includes("wed")) return 3;
  if (s.includes("kamis") || s.includes("thu")) return 4;
  if (s.includes("jumat") || s.includes("jum'at") || s.includes("fri")) return 5;
  if (s.includes("sabtu") || s.includes("sat")) return 6;
  if (s.includes("minggu") || s.includes("sun")) return 7;
  return 1;
}

function resolveDeadlineDate(rawDeadline, referenceDate = new Date()) {
  if (!rawDeadline || !rawDeadline.trim()) {
    return format(addDays(referenceDate, 1), "yyyy-MM-dd");
  }
  const s = rawDeadline.trim().toLowerCase();
  const dateMatch = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (dateMatch) {
    return `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
  }
  if (s.includes("hari ini") || s.includes("today")) {
    return format(referenceDate, "yyyy-MM-dd");
  }
  if (s.includes("besok") || s.includes("tomorrow")) {
    return format(addDays(referenceDate, 1), "yyyy-MM-dd");
  }
  if (s.includes("lusa")) {
    return format(addDays(referenceDate, 2), "yyyy-MM-dd");
  }
  const targetDay = normalizeWeekday(s);
  const currentDay = getDay(referenceDate) === 0 ? 7 : getDay(referenceDate);
  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;
  return format(addDays(referenceDate, diff), "yyyy-MM-dd");
}

// ─── Test Suite Execution ───
console.log("🧪 Running AI Foundation & Deterministic Parser Tests...\n");

// Test 1: Indonesian Subject Normalization
console.log("  Testing Indonesian Subject Catalog & Abbreviations:");
const testCases = [
  { input: "MTK", expected: "Matematika" },
  { input: "b.indo", expected: "Bahasa Indonesia" },
  { input: "B.Ing", expected: "Bahasa Inggris" },
  { input: "PJOK", expected: "Pendidikan Jasmani & Kesehatan (PJOK)" },
  { input: "PAI", expected: "Pendidikan Agama Islam (PAI)" },
  { input: "PPKn", expected: "Pancasila & Kewarganegaraan (PPKn)" },
  { input: "BK", expected: "Bimbingan & Konseling (BK)" },
  { input: "SBK", expected: "Seni Budaya & Keterampilan (SBK)" },
  { input: "TIK", expected: "Informatika / TIK" },
  { input: "Fisika", expected: "Fisika" },
];

for (const tc of testCases) {
  const res = resolveIndonesianSubject(tc.input);
  assert.equal(res.canonicalName, tc.expected, `Failed mapping ${tc.input} -> ${tc.expected}`);
  console.log(`    ✔ ${tc.input.padEnd(10)} -> ${res.canonicalName}`);
}

// Test 2: Weekday Normalization
console.log("\n  Testing Weekday Normalization (1..7):");
const days = [
  { input: "Senin", expected: 1 },
  { input: "Selasa", expected: 2 },
  { input: "Rabu", expected: 3 },
  { input: "Kamis", expected: 4 },
  { input: "Jum'at", expected: 5 },
  { input: "Sabtu", expected: 6 },
  { input: "Minggu", expected: 7 },
  { input: "Monday", expected: 1 },
];
for (const d of days) {
  const w = normalizeWeekday(d.input);
  assert.equal(w, d.expected, `Failed mapping weekday ${d.input}`);
  console.log(`    ✔ ${d.input.padEnd(10)} -> Weekday ${w}`);
}

// Test 3: Deterministic Deadlines (AI Rule: Zero date invention)
console.log("\n  Testing Deterministic Deadlines (Zero date fabrication):");
const fixedRef = new Date("2026-10-23T08:00:00Z"); // Friday
assert.equal(resolveDeadlineDate("hari ini", fixedRef), "2026-10-23");
assert.equal(resolveDeadlineDate("besok", fixedRef), "2026-10-24");
assert.equal(resolveDeadlineDate("lusa", fixedRef), "2026-10-25");
assert.equal(resolveDeadlineDate("2026-11-05", fixedRef), "2026-11-05");
assert.equal(resolveDeadlineDate(undefined, fixedRef), "2026-10-24"); // Defaults to tomorrow, NOT arbitrary 3 weeks
console.log("    ✔ 'hari ini' -> 2026-10-23");
console.log("    ✔ 'besok'    -> 2026-10-24");
console.log("    ✔ 'lusa'     -> 2026-10-25");
console.log("    ✔ undefined  -> 2026-10-24 (strictly tomorrow, 0 arbitrary dates)");

console.log("\n✅ All 23 Automated Deterministic Parsing Tests PASSED successfully!\n");
