/**
 * StudyAir Mobile — V1 Polish Automated Test Suite
 * 
 * Verifies:
 * 1. calculateDaysLeft() local calendar midnight calculation
 * 2. formatLocaleDate() Indonesian locale day and month names
 * 3. formatStudyMinutes() display for 0m, 25m, 1j 10m
 * 4. formatPeriodLabel(), formatPeriodRange(), and mergeConsecutivePeriods()
 * 5. i18n Indonesian dictionary completeness and default language
 */

import assert from "node:assert";

// Load dateUtils
const {
  calculateDaysLeft,
  parseLocalMidnight,
  formatLocaleDate,
  formatStudyMinutes,
} = await import("./dist-test/lib/dateUtils.js");

// Load periodUtils
const {
  formatPeriodLabel,
  formatPeriodRange,
  mergeConsecutivePeriods,
  generateQuickSetupBellTimes,
  validateBellSchedule,
  detectPeriodGaps,
  calculatePeriodDuration,
} = await import("./dist-test/lib/periodUtils.js");

// Load i18n
const {
  t,
  getLanguage,
  TRANSLATIONS,
} = await import("./dist-test/lib/i18n.js");

console.log("==================================================");
console.log("   STUDYAIR MOBILE V1 POLISH TEST SUITE");
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

// ──────────────────────────────────────────────
// TEST 1: calculateDaysLeft & parseLocalMidnight
// ──────────────────────────────────────────────
console.log("\n[1] Date Utils & Calendar Midnight Calculation");

test("calculateDaysLeft returns 31 for target 2026-11-25 on baseDate 2026-10-25", () => {
  const base = parseLocalMidnight("2026-10-25");
  const res = calculateDaysLeft("2026-11-25", base);
  assert.strictEqual(res.days, 31, `Expected 31 days, got ${res.days}`);
  assert.strictEqual(res.label, "31 hari lagi");
  assert.strictEqual(res.isToday, false);
  assert.strictEqual(res.isTomorrow, false);
  assert.strictEqual(res.isPassed, false);
});

test("calculateDaysLeft returns 0 and 'Hari ini' for same date", () => {
  const base = parseLocalMidnight("2026-10-25");
  const res = calculateDaysLeft("2026-10-25", base);
  assert.strictEqual(res.days, 0);
  assert.strictEqual(res.label, "Hari ini");
  assert.strictEqual(res.isToday, true);
});

test("calculateDaysLeft returns 1 and 'Besok' for next day", () => {
  const base = parseLocalMidnight("2026-10-25");
  const res = calculateDaysLeft("2026-10-26", base);
  assert.strictEqual(res.days, 1);
  assert.strictEqual(res.label, "Besok");
  assert.strictEqual(res.isTomorrow, true);
});

test("calculateDaysLeft returns negative days and 'Sudah lewat' for past date", () => {
  const base = parseLocalMidnight("2026-10-25");
  const res = calculateDaysLeft("2026-10-24", base);
  assert.strictEqual(res.days, -1);
  assert.strictEqual(res.label, "Sudah lewat");
  assert.strictEqual(res.isPassed, true);
});

test("formatLocaleDate formats Indonesian weekdays and months correctly", () => {
  const d1 = formatLocaleDate("2026-10-25", "EEEE, d MMM");
  assert.strictEqual(d1, "Minggu, 25 Okt");

  const d2 = formatLocaleDate("2026-10-26", "EEE, d MMM");
  assert.strictEqual(d2, "Sen, 26 Okt");

  const d3 = formatLocaleDate("2026-11-25", "d MMM yyyy");
  assert.strictEqual(d3, "25 Nov 2026");
});

test("formatStudyMinutes formats zero, minutes, and hours properly", () => {
  assert.strictEqual(formatStudyMinutes(0), "0m");
  assert.strictEqual(formatStudyMinutes(25), "25m");
  assert.strictEqual(formatStudyMinutes(70), "1j 10m");
  assert.strictEqual(formatStudyMinutes(120), "2j 0m");
});

// ──────────────────────────────────────────────
// TEST 2: Period Utils
// ──────────────────────────────────────────────
console.log("\n[2] Period Labeling & Consecutive Merging");

test("formatPeriodLabel generates 'Jam 1' long and 'J1' compact", () => {
  assert.strictEqual(formatPeriodLabel(1, "long"), "Jam 1");
  assert.strictEqual(formatPeriodLabel(1, "compact"), "J1");
  assert.strictEqual(formatPeriodLabel(4, "long"), "Jam 4");
  assert.strictEqual(formatPeriodLabel(4, "compact"), "J4");
});

test("formatPeriodRange generates 'Jam 1-2' long and 'J1-2' compact", () => {
  assert.strictEqual(formatPeriodRange(1, 2, "long"), "Jam 1-2");
  assert.strictEqual(formatPeriodRange(1, 2, "compact"), "J1-2");
  assert.strictEqual(formatPeriodRange(3, 5, "long"), "Jam 3-5");
  assert.strictEqual(formatPeriodRange(3, 5, "compact"), "J3-5");
});

test("mergeConsecutivePeriods merges periods 1 and 2 for same subject on same day", () => {
  const rawEntries = [
    {
      id: "e1",
      weekday: 1,
      periodNumber: 1,
      subjectId: "sub-mtk",
      subjectTitle: "Matematika",
      startTime: "07:00",
      endTime: "07:45",
    },
    {
      id: "e2",
      weekday: 1,
      periodNumber: 2,
      subjectId: "sub-mtk",
      subjectTitle: "Matematika",
      startTime: "07:45",
      endTime: "08:30",
    },
    {
      id: "e3",
      weekday: 1,
      periodNumber: 3,
      subjectId: "sub-pjok",
      subjectTitle: "PJOK",
      startTime: "08:45",
      endTime: "09:30",
    },
  ];

  const merged = mergeConsecutivePeriods(rawEntries);
  assert.strictEqual(merged.length, 2, `Expected 2 merged groups, got ${merged.length}`);

  const mtkGroup = merged[0];
  assert.strictEqual(mtkGroup.startPeriod, 1);
  assert.strictEqual(mtkGroup.endPeriod, 2);
  assert.strictEqual(mtkGroup.periodLabelLong, "Jam 1-2");
  assert.strictEqual(mtkGroup.periodLabelCompact, "J1-2");
  assert.strictEqual(mtkGroup.timeRange, "07:00-08:30");

  const pjokGroup = merged[1];
  assert.strictEqual(pjokGroup.startPeriod, 3);
  assert.strictEqual(pjokGroup.endPeriod, 3);
  assert.strictEqual(pjokGroup.periodLabelLong, "Jam 3");
  assert.strictEqual(pjokGroup.periodLabelCompact, "J3");
  assert.strictEqual(pjokGroup.timeRange, "08:45-09:30");
});

test("generateQuickSetupBellTimes creates 8 periods with 2 break gaps correctly", () => {
  const schedule = generateQuickSetupBellTimes({
    startTime: "07:00",
    periodDuration: 45,
    numPeriods: 8,
    break1After: 3,
    break1Duration: 15,
    break2After: 6,
    break2Duration: 45,
  });

  assert.strictEqual(schedule.length, 8);
  assert.strictEqual(schedule[0].start, "07:00");
  assert.strictEqual(schedule[0].end, "07:45");
  assert.strictEqual(schedule[1].start, "07:45");
  assert.strictEqual(schedule[1].end, "08:30");
  assert.strictEqual(schedule[2].start, "08:30");
  assert.strictEqual(schedule[2].end, "09:15");
  // Break 1: 15 min gap (09:15 -> 09:30)
  assert.strictEqual(schedule[3].start, "09:30");
  assert.strictEqual(schedule[3].end, "10:15");
  assert.strictEqual(schedule[4].start, "10:15");
  assert.strictEqual(schedule[4].end, "11:00");
  assert.strictEqual(schedule[5].start, "11:00");
  assert.strictEqual(schedule[5].end, "11:45");
  // Break 2: 45 min Ishoma gap (11:45 -> 12:30)
  assert.strictEqual(schedule[6].start, "12:30");
  assert.strictEqual(schedule[6].end, "13:15");
  assert.strictEqual(schedule[7].start, "13:15");
  assert.strictEqual(schedule[7].end, "14:00");
});

test("validateBellSchedule catches overlaps, end <= start, and allows valid schedules", () => {
  const valid = [
    { periodNumber: 1, start: "07:00", end: "07:45" },
    { periodNumber: 2, start: "07:45", end: "08:30" },
    { periodNumber: 3, start: "08:30", end: "09:15" },
  ];
  const validRes = validateBellSchedule(valid);
  assert.strictEqual(validRes.isValid, true);
  assert.strictEqual(validRes.errorCount, 0);

  // Test overlapping schedule (P2 starts before P1 ends)
  const overlapping = [
    { periodNumber: 1, start: "07:00", end: "07:45" },
    { periodNumber: 2, start: "07:30", end: "08:15" },
  ];
  const overlapRes = validateBellSchedule(overlapping);
  assert.strictEqual(overlapRes.isValid, false);
  assert.ok(overlapRes.errors[2]?.startError?.includes("bertabrakan"));

  // Test end <= start error
  const inverted = [
    { periodNumber: 1, start: "08:00", end: "07:30" },
  ];
  const invertRes = validateBellSchedule(inverted);
  assert.strictEqual(invertRes.isValid, false);
  assert.ok(invertRes.errors[1]?.endError?.includes("setelah jam mulai"));
});

test("detectPeriodGaps identifies Istirahat and Ishoma gaps between periods", () => {
  const periods = [
    { periodNumber: 1, start: "07:00", end: "07:45" },
    { periodNumber: 2, start: "07:45", end: "08:30" },
    { periodNumber: 3, start: "08:30", end: "09:15" },
    { periodNumber: 4, start: "09:30", end: "10:15" }, // 15m gap
    { periodNumber: 5, start: "10:15", end: "11:00" },
    { periodNumber: 6, start: "11:00", end: "11:45" },
    { periodNumber: 7, start: "12:30", end: "13:15" }, // 45m gap
  ];

  const gaps = detectPeriodGaps(periods);
  assert.strictEqual(gaps.length, 2);
  assert.strictEqual(gaps[0].afterPeriodNumber, 3);
  assert.strictEqual(gaps[0].durationMinutes, 15);
  assert.strictEqual(gaps[0].label, "Istirahat - 15 mnt");

  assert.strictEqual(gaps[1].afterPeriodNumber, 6);
  assert.strictEqual(gaps[1].durationMinutes, 45);
  assert.strictEqual(gaps[1].label, "Ishoma - 45 mnt");
});

// ──────────────────────────────────────────────
// TEST 3: i18n & Indonesian Default Dictionary
// ──────────────────────────────────────────────
console.log("\n[3] i18n Dictionary Integrity & Default Language");

test("Default language is Indonesian ('id')", () => {
  assert.strictEqual(getLanguage(), "id");
});

test("Key visible strings in Indonesian dictionary match requirements", () => {
  assert.strictEqual(t("appTitle"), "StudyAir");
  assert.strictEqual(t("homework"), "PR");
  assert.strictEqual(t("quiz"), "Kuis");
  assert.strictEqual(t("project"), "Proyek");
  assert.strictEqual(t("daysLeft", { count: 31 }), "31 hari lagi");
  assert.strictEqual(t("setBellTimes"), "Atur jam pelajaran");
  assert.strictEqual(t("classesDetectedCount", { count: 9 }), "9 kelas terdeteksi");
  assert.strictEqual(t("addCourseBtn"), "+ Mapel");
  assert.strictEqual(t("importTimetableBtn"), "Impor jadwal");
});

test("Every English key exists in the Indonesian translation dictionary", () => {
  const enKeys = Object.keys(TRANSLATIONS.en);
  const idKeys = new Set(Object.keys(TRANSLATIONS.id));
  const missingInId = enKeys.filter((k) => !idKeys.has(k));

  assert.strictEqual(
    missingInId.length,
    0,
    `Found ${missingInId.length} keys missing in Indonesian: ${missingInId.join(", ")}`
  );
});

console.log("\n==================================================");
console.log(`   TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
console.log("==================================================");

if (passedTests < totalTests) {
  process.exit(1);
}
