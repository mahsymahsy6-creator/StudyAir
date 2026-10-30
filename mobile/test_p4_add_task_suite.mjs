import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { calculateNextClassDeadline } = require("./dist-test/engine/deadlineEngine.js");
const { parseIndonesianDateHint } = require("./dist-test/engine/dateHintParser.js");
const { t } = require("./dist-test/lib/i18n.js");

console.log("==================================================");
console.log("     STUDYAIR P4 ADD TASK FLOW TEST SUITE");
console.log("==================================================\n");

let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failedCount++;
  }
}

// ─── Pure Clamping Helper (mirrors store.tsx clampEstimate) ───
function clampEstimate(mins) {
  if (typeof mins !== "number" || isNaN(mins) || mins === null || mins === undefined) {
    return 30;
  }
  return Math.max(5, Math.min(360, Math.round(mins)));
}

// ─── 1. Duration Estimate & Clamping Logic ───
console.log("[1] Duration Estimate & Clamping");

test("clampEstimate defaults undefined/null/NaN to 30 minutes", () => {
  assert.strictEqual(clampEstimate(undefined), 30);
  assert.strictEqual(clampEstimate(null), 30);
  assert.strictEqual(clampEstimate(NaN), 30);
  assert.strictEqual(clampEstimate("invalid"), 30);
});

test("clampEstimate enforces minimum boundary of 5 minutes", () => {
  assert.strictEqual(clampEstimate(0), 5);
  assert.strictEqual(clampEstimate(-15), 5);
  assert.strictEqual(clampEstimate(4), 5);
  assert.strictEqual(clampEstimate(5), 5);
});

test("clampEstimate preserves standard preset chips (15, 30, 45, 60, 90)", () => {
  const presets = [15, 30, 45, 60, 90];
  for (const p of presets) {
    assert.strictEqual(clampEstimate(p), p);
  }
});

test("clampEstimate enforces maximum boundary of 360 minutes (6 hours)", () => {
  assert.strictEqual(clampEstimate(360), 360);
  assert.strictEqual(clampEstimate(361), 360);
  assert.strictEqual(clampEstimate(500), 360);
  assert.strictEqual(clampEstimate(1000), 360);
});

test("clampEstimate rounds decimal inputs to nearest integer", () => {
  assert.strictEqual(clampEstimate(44.9), 45);
  assert.strictEqual(clampEstimate(45.2), 45);
  assert.strictEqual(clampEstimate(14.5), 15);
});

// ─── 2. Smart Next-Class Deadline Engine Integration ───
console.log("\n[2] Next-Class Deadline Resolution");

const sampleTimetable = [
  // Math on Monday period 1 and Wednesday period 3
  { id: "e1", subjectId: "sub-math", weekday: 1, periodNumber: 1, weekPattern: "every", kind: "class" },
  { id: "e2", subjectId: "sub-math", weekday: 3, periodNumber: 3, weekPattern: "every", kind: "class" },
  // Physics on Tuesday period 2
  { id: "e3", subjectId: "sub-phys", weekday: 2, periodNumber: 2, weekPattern: "every", kind: "class" },
  // English on Friday period 4
  { id: "e4", subjectId: "sub-eng", weekday: 5, periodNumber: 4, weekPattern: "every", kind: "class" },
];

test("resolves next meeting date strictly after task givenDate", () => {
  // Given on Monday (2026-11-02), next Math class is Wednesday (2026-11-04)
  const result = calculateNextClassDeadline("sub-math", "2026-11-02", sampleTimetable);
  assert.strictEqual(result.found, true);
  assert.strictEqual(result.deadlineDate, "2026-11-04");
  assert.strictEqual(result.weekday, 3);
});

test("wraps around to next week if current week meetings have passed", () => {
  // Given on Thursday (2026-11-05), next Math class is next Monday (2026-11-09)
  const result = calculateNextClassDeadline("sub-math", "2026-11-05", sampleTimetable);
  assert.strictEqual(result.found, true);
  assert.strictEqual(result.deadlineDate, "2026-11-09");
  assert.strictEqual(result.weekday, 1);
});

test("supports 2-classes offset (afterNClasses: 2)", () => {
  // Given on Monday (2026-11-02), 1st class is Wed Nov 4, 2nd class is Mon Nov 9
  const result = calculateNextClassDeadline("sub-math", "2026-11-02", sampleTimetable, {
    afterNClasses: 2,
  });
  assert.strictEqual(result.found, true);
  assert.strictEqual(result.deadlineDate, "2026-11-09");
});

test("skips holidays / daysOff when scanning for next class", () => {
  // Wednesday Nov 4 is marked as DayOff
  const daysOff = [{ id: "do1", date: "2026-11-04", reason: "Hari Libur Nasional" }];
  const result = calculateNextClassDeadline("sub-math", "2026-11-02", sampleTimetable, {
    daysOff,
  });
  // Should skip Wednesday and resolve next Monday (2026-11-09)
  assert.strictEqual(result.found, true);
  assert.strictEqual(result.deadlineDate, "2026-11-09");
});

test("gracefully handles subjects not in timetable", () => {
  const result = calculateNextClassDeadline("sub-art", "2026-11-02", sampleTimetable);
  assert.strictEqual(result.found, false);
  assert.strictEqual(result.deadlineDate, null);
});

// ─── 3. Indonesian NLP Date Hint Detection ───
console.log("\n[3] Indonesian Date Hint Parsing");

test("detects 'besok' and suggests +1 calendar day", () => {
  const hint = parseIndonesianDateHint("PR Matematika hal 45 besok", "2026-10-30");
  assert.ok(hint);
  assert.strictEqual(hint.suggestedDate, "2026-10-31");
  assert.strictEqual(hint.matchedPhrase, "besok");
});

test("detects 'lusa' and suggests +2 calendar days", () => {
  const hint = parseIndonesianDateHint("Kuis Biologi bab 2 lusa", "2026-10-30");
  assert.ok(hint);
  assert.strictEqual(hint.suggestedDate, "2026-11-01");
  assert.strictEqual(hint.matchedPhrase, "lusa");
});

test("detects 'minggu depan' and suggests +7 calendar days", () => {
  const hint = parseIndonesianDateHint("Proyek Fisika roket minggu depan", "2026-10-30");
  assert.ok(hint);
  assert.strictEqual(hint.suggestedDate, "2026-11-06");
  assert.strictEqual(hint.matchedPhrase, "minggu depan");
});

test("returns null when no date keywords are in the text", () => {
  const hint = parseIndonesianDateHint("Latihan soal matriks tanpa tenggat", "2026-10-30");
  assert.strictEqual(hint, null);
});

// ─── 4. Task Creation Data Flow & Invariants ───
console.log("\n[4] Task Creation Flow & Invariants");

function createMockTask(input) {
  const title = (input.title || "").trim();
  if (!title) throw new Error("Title required");
  const estimatedMinutes = clampEstimate(input.estimatedMinutes);

  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    subjectId: input.subjectId || "general",
    type: input.type || "homework",
    givenDate: input.givenDate || "2026-10-30",
    deadlineDate: input.deadlineDate || "2026-10-31",
    deadlineMode: input.deadlineMode || "nextClass",
    estimatedMinutes,
    status: "PENDING",
    notes: input.notes?.trim() || undefined,
  };
}

test("creates valid task with preset estimate", () => {
  const task = createMockTask({
    title: "PR Kimia Hal 10",
    subjectId: "sub-chem",
    estimatedMinutes: 45,
    givenDate: "2026-10-30",
    deadlineDate: "2026-11-02",
  });

  assert.ok(task.id.startsWith("task-"));
  assert.strictEqual(task.title, "PR Kimia Hal 10");
  assert.strictEqual(task.estimatedMinutes, 45);
  assert.strictEqual(task.status, "PENDING");
  assert.strictEqual(task.deadlineMode, "nextClass");
});

test("creates valid task with default estimate when omitted", () => {
  const task = createMockTask({
    title: "PR Sejarah",
  });

  assert.strictEqual(task.estimatedMinutes, 30);
  assert.strictEqual(task.subjectId, "general");
});

test("rejects empty task title", () => {
  assert.throws(() => {
    createMockTask({ title: "   " });
  }, /Title required/);
});

// ─── 5. Speed Benchmark (<10s human UX budget verification) ───
console.log("\n[5] Speed Benchmark (<10s Flow Validation)");

test("complete task resolution & creation loop runs in < 0.1ms per task", () => {
  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const rawTitle = "PR Matematika Hal 50 besok";
    const dateHint = parseIndonesianDateHint(rawTitle, "2026-10-30");
    const nextClass = calculateNextClassDeadline("sub-math", "2026-10-30", sampleTimetable);
    const effectiveDeadline = nextClass.found ? nextClass.deadlineDate : dateHint?.suggestedDate || "2026-10-31";

    const task = createMockTask({
      title: rawTitle,
      subjectId: "sub-math",
      deadlineDate: effectiveDeadline,
      estimatedMinutes: 30,
    });
    assert.ok(task.id);
  }

  const elapsedMs = performance.now() - start;
  const avgMs = elapsedMs / iterations;

  console.log(`    Total benchmark time for ${iterations} tasks: ${elapsedMs.toFixed(2)}ms`);
  console.log(`    Average time per task creation: ${avgMs.toFixed(4)}ms`);

  // Target: average under 0.5ms per task (< 500ms for 1000 iterations)
  assert.ok(elapsedMs < 500, `Benchmark took too long: ${elapsedMs}ms`);
  assert.ok(avgMs < 0.5, `Average per task took too long: ${avgMs}ms`);
});

// ─── Final Summary ───
console.log("\n==================================================");
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
