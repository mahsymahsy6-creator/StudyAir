/**
 * StudyAir - P12 AI Helpers Test Suite
 * Tests duration suggestion heuristics, batch task duration assignment, and review editing.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pure heuristic logic matching aiService.suggestTaskDuration
function suggestTaskDuration(title, type = "homework") {
  const lower = (title || "").toLowerCase();

  if (
    lower.includes("makalah") ||
    lower.includes("proyek") ||
    lower.includes("project") ||
    lower.includes("presentasi") ||
    lower.includes("laporan") ||
    type === "project"
  ) {
    return 60;
  }

  if (
    lower.includes("bab") ||
    lower.includes("soal") ||
    lower.includes("latihan") ||
    lower.includes("kuis") ||
    lower.includes("ulangan") ||
    lower.includes("quiz") ||
    type === "quiz"
  ) {
    return 45;
  }

  if (
    lower.includes("baca") ||
    lower.includes("catat") ||
    lower.includes("hafalkan") ||
    lower.includes("review") ||
    lower.includes("rangkum")
  ) {
    return 25;
  }

  return 30;
}

console.log("==================================================");
console.log("       STUDYAIR P12 AI HELPERS TEST SUITE");
console.log("==================================================");

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n[1] AI Duration Suggestion Heuristics");

it("suggests 60m for long projects, presentations, and makalah", () => {
  assert.strictEqual(suggestTaskDuration("Makalah Sejarah Perang Diponegoro"), 60);
  assert.strictEqual(suggestTaskDuration("Proyek Biologi Ekosistem"), 60);
  assert.strictEqual(suggestTaskDuration("Persiapan Presentasi Bahasa Inggris"), 60);
  assert.strictEqual(suggestTaskDuration("Tugas Bebas", "project"), 60);
});

it("suggests 45m for problem sets, quizzes, and practice exercises", () => {
  assert.strictEqual(suggestTaskDuration("Kerjakan 10 soal Latihan Matematika"), 45);
  assert.strictEqual(suggestTaskDuration("Review Bab 4 Termodinamika"), 45);
  assert.strictEqual(suggestTaskDuration("Persiapan Kuis Fisika"), 45);
  assert.strictEqual(suggestTaskDuration("Evaluasi Mandiri", "quiz"), 45);
});

it("suggests 25m for reading, notes, and memorization", () => {
  assert.strictEqual(suggestTaskDuration("Baca halaman 40-50 Geografi"), 25);
  assert.strictEqual(suggestTaskDuration("Catat ringkasan Sosiologi"), 25);
  assert.strictEqual(suggestTaskDuration("Hafalkan 10 kosakata baru"), 25);
});

it("suggests 30m default for generic homework", () => {
  assert.strictEqual(suggestTaskDuration("PR Bahasa Indonesia"), 30);
  assert.strictEqual(suggestTaskDuration("Tugas Harian Kimia"), 30);
});

console.log("\n[2] Batch Task Duration Enrichment & Overrides");

it("assigns suggested duration to extracted tasks", () => {
  const extractedRaw = [
    { title: "Kerjakan soal Latihan 2.1", type: "homework" },
    { title: "Makalah Kelompok PPKN", type: "project" },
  ];

  const enriched = extractedRaw.map((item, idx) => ({
    id: `task-${idx}`,
    title: item.title,
    type: item.type,
    estimatedMinutes: suggestTaskDuration(item.title, item.type),
  }));

  assert.strictEqual(enriched[0].estimatedMinutes, 45);
  assert.strictEqual(enriched[1].estimatedMinutes, 60);
});

it("supports overriding duration in review screen", () => {
  const batch = [
    { id: "b-1", title: "Soal MTK", estimatedMinutes: 45 },
  ];

  // User selects 30m instead
  const updated = batch.map((item) =>
    item.id === "b-1" ? { ...item, estimatedMinutes: 30 } : item
  );

  assert.strictEqual(updated[0].estimatedMinutes, 30);
});

console.log("\n[3] QuickActionSheet & AIService Tinjau Tugas Integration");

it("QuickActionSheet uses localized Tinjau Tugas copy, DeadlinePickerStrip, type pills, and responsive width", () => {
  const quickActionContent = fs.readFileSync(
    path.join(__dirname, "src/components/QuickActionSheet.tsx"),
    "utf-8"
  );
  const aiServiceContent = fs.readFileSync(
    path.join(__dirname, "src/services/aiService.ts"),
    "utf-8"
  );

  assert(!quickActionContent.includes("Save All "), "QuickActionSheet must not render English 'Save All N Tasks'");
  assert(!quickActionContent.includes("Next Class ("), "QuickActionSheet must not render English 'Next Class (...)'");
  assert(!aiServiceContent.includes("Next Class ("), "aiService fallback must not render English 'Next Class (...)'");
  assert(quickActionContent.includes("DeadlinePickerStrip"), "QuickActionSheet review card must integrate DeadlinePickerStrip");
  assert(quickActionContent.includes("TASK_TYPE_OPTIONS"), "QuickActionSheet must support editable Indonesian task type pills");
  assert(quickActionContent.includes("maxWidth: 560"), "QuickActionSheet sheetContainer must constrain desktop/web width cleanly");
  assert(aiServiceContent.includes("export function splitCompoundTaskClauses"), "aiService must export splitCompoundTaskClauses");
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
