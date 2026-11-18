/**
 * StudyAir Mobile — Step 6: Day Schedule Single Source of Truth Test Suite
 * 
 * Verifies getDayItems() implementation:
 * 1. Normal day: 6 classes merged into 4 blocks (two double-period subjects), bell times respected.
 * 2. Duplicates: two entries for same weekday + period return hasConflict = true.
 * 3. Orphan entries: subjectId not in subjects list returned as "Mapel hilang", not silently dropped.
 * 4. Breaks: gaps >= 15 min or kind = "break" returned as type = "break".
 * 5. A/B pattern: weekPattern = "A" excluded when active pattern is "B".
 * 6. Sunday: weekday = 7 works correctly.
 * 7. Empty day: returns empty = true, items = [].
 * 8. Count assertion: test that daySchedule.classCount === rendered row count in all test cases.
 */

import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getDayItems, assertDayHeaderCountMatches } = require("./dist-test/lib/daySchedule.js");

console.log("==================================================");
console.log("   STUDYAIR STEP 6: DAY SCHEDULE TEST SUITE");
console.log("==================================================");

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// Mock Standard Subjects
const mockSubjects = [
  { id: "sub-math", name: "Matematika", title: "Matematika", color: "#3B82F6", color_hex: "#3B82F6", aliases: ["MTK"], bringItems: [], exam_date: "" },
  { id: "sub-eng", name: "Bahasa Inggris", title: "Bahasa Inggris", color: "#10B981", color_hex: "#10B981", aliases: ["BING"], bringItems: [], exam_date: "" },
  { id: "sub-phys", name: "Fisika", title: "Fisika", color: "#8B5CF6", color_hex: "#8B5CF6", aliases: ["FIS"], bringItems: [], exam_date: "" },
  { id: "sub-bio", name: "Biologi", title: "Biologi", color: "#EC4899", color_hex: "#EC4899", aliases: ["BIO"], bringItems: [], exam_date: "" },
];

// Mock Standard Bell Times
const mockPeriodTimes = [
  { periodNumber: 1, start: "07:00", end: "07:45" },
  { periodNumber: 2, start: "07:45", end: "08:30" },
  { periodNumber: 3, start: "08:30", end: "09:15" },
  { periodNumber: 4, start: "09:30", end: "10:15" }, // Notice 15m gap 09:15-09:30
  { periodNumber: 5, start: "10:15", end: "11:00" },
  { periodNumber: 6, start: "11:00", end: "11:45" },
  { periodNumber: 7, start: "12:30", end: "13:15" }, // Notice 45m Ishoma gap
];

// ─────────────────────────────────────────────────────────────
// TEST 1: Normal Day (6 classes merged into 4 blocks)
// ─────────────────────────────────────────────────────────────
test("Normal day: 6 classes merged into 4 blocks with bell times", () => {
  const entries = [
    { id: "e1", weekday: 1, periodNumber: 1, subjectId: "sub-math", weekPattern: "every" },
    { id: "e2", weekday: 1, periodNumber: 2, subjectId: "sub-math", weekPattern: "every" }, // Merged with e1
    { id: "e3", weekday: 1, periodNumber: 3, subjectId: "sub-eng", weekPattern: "every" },
    { id: "e4", weekday: 1, periodNumber: 4, subjectId: "sub-phys", weekPattern: "every" },
    { id: "e5", weekday: 1, periodNumber: 5, subjectId: "sub-phys", weekPattern: "every" }, // Merged with e4
    { id: "e6", weekday: 1, periodNumber: 6, subjectId: "sub-bio", weekPattern: "every" },
  ];

  const schedule = getDayItems(1, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    language: "id",
  });

  assert.strictEqual(schedule.classCount, 4, "Should report 4 classes in classCount");
  assert.strictEqual(schedule.classBlocks.length, 4, "Should have 4 class blocks");
  assert.strictEqual(schedule.jpCount, 6, "Total period count should be 6 JP");
  
  // First block should be Math J1-2 07:00-08:30
  const mathBlock = schedule.classBlocks[0];
  assert.strictEqual(mathBlock.title, "Matematika");
  assert.strictEqual(mathBlock.periodCount, 2);
  assert.strictEqual(mathBlock.compactPeriodLabel, "J1-2");
  assert.strictEqual(mathBlock.startTime, "07:00");
  assert.strictEqual(mathBlock.endTime, "08:30");
  assert.strictEqual(mathBlock.durationMins, 90);

  // Third block should be Physics J4-5 09:30-11:00
  const physBlock = schedule.classBlocks[2];
  assert.strictEqual(physBlock.title, "Fisika");
  assert.strictEqual(physBlock.periodCount, 2);
  assert.strictEqual(physBlock.compactPeriodLabel, "J4-5");
  assert.strictEqual(physBlock.startTime, "09:30");
  assert.strictEqual(physBlock.endTime, "11:00");

  // Header format
  assert.strictEqual(schedule.headerSummary, "4 pelajaran - 6 JP - 07:00-11:45");
});

// ─────────────────────────────────────────────────────────────
// TEST 2: Duplicates & Overlaps
// ─────────────────────────────────────────────────────────────
test("Duplicates: two entries for same weekday + period return hasConflict = true", () => {
  const entries = [
    { id: "dup1", weekday: 2, periodNumber: 1, subjectId: "sub-math", weekPattern: "every" },
    { id: "dup2", weekday: 2, periodNumber: 1, subjectId: "sub-phys", weekPattern: "every" }, // Conflict at J1
    { id: "e2", weekday: 2, periodNumber: 2, subjectId: "sub-eng", weekPattern: "every" },
  ];

  const schedule = getDayItems(2, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    language: "id",
  });

  assert.strictEqual(schedule.conflicts.length, 2, "Should track both conflicting class items");
  const conflictItem1 = schedule.conflicts[0];
  const conflictItem2 = schedule.conflicts[1];
  assert.strictEqual(conflictItem1.hasConflict, true, "First item must have hasConflict = true");
  assert.strictEqual(conflictItem2.hasConflict, true, "Second item must have hasConflict = true");
  assert.strictEqual(conflictItem1.conflictEntries?.length, 2, "Conflict must track all 2 conflicting entries");
});

// ─────────────────────────────────────────────────────────────
// TEST 3: Orphan entries (subjectId not in subjects list)
// ─────────────────────────────────────────────────────────────
test("Orphan entries: subjectId not in subjects list returned as 'Mapel hilang', not dropped", () => {
  const entries = [
    { id: "orph1", weekday: 3, periodNumber: 1, subjectId: "deleted-subject-xyz", weekPattern: "every" },
    { id: "e2", weekday: 3, periodNumber: 2, subjectId: "sub-math", weekPattern: "every" },
  ];

  const schedule = getDayItems(3, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    language: "id",
  });

  assert.strictEqual(schedule.items.length >= 2, true, "Orphan entry must NOT be silently dropped");
  assert.strictEqual(schedule.orphans.length, 1, "Should track 1 orphan item");
  const orphan = schedule.orphans[0];
  assert.strictEqual(orphan.isOrphan, true);
  assert.strictEqual(orphan.title, "Mapel hilang");
  assert.strictEqual(orphan.startPeriod, 1);
});

// ─────────────────────────────────────────────────────────────
// TEST 4: Breaks (Gaps >= 15 min or kind = 'break')
// ─────────────────────────────────────────────────────────────
test("Breaks: gaps >= 15 min or kind = 'break' returned as type = 'break'", () => {
  const entries = [
    { id: "e1", weekday: 4, periodNumber: 3, subjectId: "sub-math", weekPattern: "every" }, // ends 09:15
    { id: "b1", weekday: 4, periodNumber: 99, subjectId: "", kind: "break", customLabel: "Istirahat Pagi", startTime: "09:15", endTime: "09:30", weekPattern: "every" },
    { id: "e2", weekday: 4, periodNumber: 4, subjectId: "sub-eng", weekPattern: "every" }, // starts 09:30, ends 10:15
    { id: "e3", weekday: 4, periodNumber: 7, subjectId: "sub-bio", weekPattern: "every" }, // starts 12:30 (gap 10:15 - 12:30)
  ];

  const schedule = getDayItems(4, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    language: "id",
  });

  const breakItems = schedule.breaks;
  assert.strictEqual(breakItems.length >= 1, true, "Should include breaks");
  
  // Check explicit break
  const explicitBreak = breakItems.find((b) => b.title === "Istirahat Pagi");
  assert.ok(explicitBreak, "Explicit break should be present");
  assert.strictEqual(explicitBreak.type, "break");

  // Check gap break
  const gapIshoma = breakItems.find((b) => b.title === "Ishoma" || b.title === "Istirahat");
  assert.ok(gapIshoma, "Gap break between 10:15 and 12:30 should be detected");
  assert.strictEqual(gapIshoma.type, "break");
});

// ─────────────────────────────────────────────────────────────
// TEST 5: A/B Pattern filtering
// ─────────────────────────────────────────────────────────────
test("A/B pattern: weekPattern = 'A' excluded when active pattern is 'B'", () => {
  const entries = [
    { id: "e-all", weekday: 5, periodNumber: 1, subjectId: "sub-math", weekPattern: "every" },
    { id: "e-a", weekday: 5, periodNumber: 2, subjectId: "sub-phys", weekPattern: "A" },
    { id: "e-b", weekday: 5, periodNumber: 2, subjectId: "sub-bio", weekPattern: "B" },
  ];

  // Requesting active week pattern 'B'
  const scheduleB = getDayItems(5, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    activeWeekPattern: "B",
    language: "id",
  });

  const titlesB = scheduleB.classBlocks.map((c) => c.title);
  assert.ok(titlesB.includes("Matematika"), "Every week entry must be included");
  assert.ok(titlesB.includes("Biologi"), "Pattern B entry must be included when active is B");
  assert.ok(!titlesB.includes("Fisika"), "Pattern A entry must be excluded when active is B");

  // Requesting active week pattern 'A'
  const scheduleA = getDayItems(5, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    activeWeekPattern: "A",
    language: "id",
  });

  const titlesA = scheduleA.classBlocks.map((c) => c.title);
  assert.ok(titlesA.includes("Fisika"), "Pattern A entry must be included when active is A");
  assert.ok(!titlesA.includes("Biologi"), "Pattern B entry must be excluded when active is A");
});

// ─────────────────────────────────────────────────────────────
// TEST 6: Sunday (weekday = 7)
// ─────────────────────────────────────────────────────────────
test("Sunday: weekday = 7 works correctly", () => {
  const entries = [
    { id: "sun1", weekday: 7, periodNumber: 1, subjectId: "sub-math", weekPattern: "every" },
  ];

  const schedule = getDayItems(7, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    language: "id",
  });

  assert.strictEqual(schedule.weekday, 7);
  assert.strictEqual(schedule.dayName, "Minggu");
  assert.strictEqual(schedule.classCount, 1);
  assert.strictEqual(schedule.classBlocks[0].title, "Matematika");
});

// ─────────────────────────────────────────────────────────────
// TEST 7: Empty day (returns empty = true, items = [])
// ─────────────────────────────────────────────────────────────
test("Empty day: returns empty = true, items = []", () => {
  const entries = [
    { id: "e1", weekday: 1, periodNumber: 1, subjectId: "sub-math", weekPattern: "every" },
  ];

  // Check Saturday (weekday = 6) with no entries
  const schedule = getDayItems(6, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    language: "id",
  });

  assert.strictEqual(schedule.empty, true, "Empty must be true");
  assert.strictEqual(schedule.items.length, 0, "items must be empty array");
  assert.strictEqual(schedule.classBlocks.length, 0, "classBlocks must be empty array");
  assert.strictEqual(schedule.classCount, 0, "classCount must be 0");
  assert.strictEqual(schedule.jpCount, 0, "jpCount must be 0");
});

// ─────────────────────────────────────────────────────────────
// TEST 8: Count assertion (daySchedule.classCount === rendered row count)
// ─────────────────────────────────────────────────────────────
test("Count assertion: daySchedule.classCount === rendered row count in all test cases", () => {
  const testWeekdays = [1, 2, 3, 4, 5, 6, 7];
  const entries = [
    { id: "e1", weekday: 1, periodNumber: 1, subjectId: "sub-math", weekPattern: "every" },
    { id: "e2", weekday: 1, periodNumber: 2, subjectId: "sub-math", weekPattern: "every" },
    { id: "e3", weekday: 1, periodNumber: 3, subjectId: "sub-eng", weekPattern: "every" },
    { id: "e4", weekday: 2, periodNumber: 1, subjectId: "sub-phys", weekPattern: "every" },
    { id: "e5", weekday: 2, periodNumber: 1, subjectId: "sub-bio", weekPattern: "every" }, // Conflict
    { id: "e6", weekday: 3, periodNumber: 1, subjectId: "missing-sub", weekPattern: "every" }, // Orphan
    { id: "e7", weekday: 4, periodNumber: 1, subjectId: "sub-eng", weekPattern: "every" },
    { id: "e8", weekday: 5, periodNumber: 1, subjectId: "sub-math", weekPattern: "A" },
    { id: "e9", weekday: 5, periodNumber: 2, subjectId: "sub-bio", weekPattern: "B" },
    { id: "e10", weekday: 7, periodNumber: 1, subjectId: "sub-phys", weekPattern: "every" },
  ];

  for (const w of testWeekdays) {
    const schedule = getDayItems(w, {
      timetableEntries: entries,
      subjects: mockSubjects,
      periodTimes: mockPeriodTimes,
      activeWeekPattern: "B",
      language: "id",
    });

    const renderedRowCount = schedule.classBlocks.length;
    assert.strictEqual(
      schedule.classCount,
      renderedRowCount,
      `Weekday ${w}: classCount (${schedule.classCount}) must equal classBlocks.length (${renderedRowCount})`
    );

    // Call assertion helper function
    assertDayHeaderCountMatches(schedule.classCount, renderedRowCount, `Weekday ${w}`);
  }
});

console.log("==================================================");
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log("==================================================");

if (passedTests !== totalTests) {
  process.exit(1);
}
