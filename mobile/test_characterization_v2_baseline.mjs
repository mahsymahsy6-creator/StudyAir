/**
 * StudyAir Mobile — V2 Baseline Characterization Test Suite
 * 
 * Locks in the current behavior of the 4 foundational modules:
 * 1. getDayItems() (from src/lib/daySchedule.ts)
 * 2. calculateNextClassDeadline() (from src/engine/deadlineEngine.ts)
 * 3. getExamState() (from src/lib/examEngine.ts)
 * 4. calculateStreak() & calculateStudyStreak() (from src/lib/studyStreakEngine.ts & src/engine/streak.ts)
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getDayItems } = require("./dist-test/lib/daySchedule.js");
const { calculateNextClassDeadline } = require("./dist-test/engine/deadlineEngine.js");
const { getExamState } = require("./dist-test/lib/examEngine.js");
const {
  calculateStreak,
  deriveStudyDay,
  isTaskAntiCheatDisqualified,
} = require("./dist-test/lib/studyStreakEngine.js");
const { calculateStudyStreak } = require("./dist-test/engine/streak.js");

console.log("==================================================");
console.log("  STUDYAIR V2 BASELINE CHARACTERIZATION SUITE");
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

// Common Fixtures
const mockSubjects = [
  { id: "sub-mtk", name: "Matematika", title: "Matematika", color: "#3B82F6", color_hex: "#3B82F6", aliases: ["MTK"], bringItems: [], exam_date: "" },
  { id: "sub-ipa", name: "IPA", title: "IPA", color: "#10B981", color_hex: "#10B981", aliases: ["IPA"], bringItems: [], exam_date: "" },
  { id: "sub-eng", name: "Bahasa Inggris", title: "Bahasa Inggris", color: "#F59E0B", color_hex: "#F59E0B", aliases: ["BING"], bringItems: [], exam_date: "" },
];

const mockPeriodTimes = [
  { periodNumber: 1, start: "07:00", end: "07:45" },
  { periodNumber: 2, start: "07:45", end: "08:30" },
  { periodNumber: 3, start: "08:30", end: "09:15" },
  { periodNumber: 4, start: "09:30", end: "10:15" },
  { periodNumber: 5, start: "10:15", end: "11:00" },
];

// ============================================================================
// 1. getDayItems() Characterization
// ============================================================================
console.log("\n[1] getDayItems() Characterization");

test("1.1 Consecutive entries for same subject merged into single block", () => {
  const entries = [
    { id: "e1", weekday: 1, periodNumber: 1, subjectId: "sub-mtk", kind: "class", weekPattern: "every" },
    { id: "e2", weekday: 1, periodNumber: 2, subjectId: "sub-mtk", kind: "class", weekPattern: "every" },
    { id: "e3", weekday: 1, periodNumber: 3, subjectId: "sub-mtk", kind: "class", weekPattern: "every" },
  ];

  const res = getDayItems(1, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
  });

  assert.equal(res.classCount, 1, "Should count as 1 merged class block");
  assert.equal(res.jpCount, 3, "Total JP should be 3");
  assert.equal(res.items.length, 1, "Should have 1 rendered item");
  assert.equal(res.items[0].startPeriod, 1);
  assert.equal(res.items[0].endPeriod, 3);
  assert.equal(res.items[0].periodCount, 3);
  assert.equal(res.items[0].periodLabel, "Jam 1-3");
  assert.equal(res.items[0].startTime, "07:00");
  assert.equal(res.items[0].endTime, "09:15");
});

test("1.2 Break entry appears in output and is not counted as class", () => {
  const entries = [
    { id: "b1", weekday: 1, periodNumber: 4, kind: "break", customLabel: "Istirahat Pagi", weekPattern: "every" },
  ];

  const res = getDayItems(1, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
  });

  assert.equal(res.classCount, 0, "Break must not increment classCount");
  assert.equal(res.breakCount, 1, "breakCount should be 1");
  assert.equal(res.breaks.length, 1, "breaks array should contain 1 item");
  assert.equal(res.items.length, 1, "Break appears in ordered items");
  assert.equal(res.items[0].type, "break");
  assert.equal(res.items[0].title, "Istirahat Pagi");
});

test("1.3 Empty day (no entries for weekday 7 / Sunday) returns empty array", () => {
  const entries = [
    { id: "e1", weekday: 1, periodNumber: 1, subjectId: "sub-mtk", kind: "class", weekPattern: "every" },
  ];

  const res = getDayItems(7, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
  });

  assert.equal(res.empty, true, "Empty flag should be true");
  assert.equal(res.classCount, 0);
  assert.equal(res.items.length, 0, "Items list should be empty");
});

test("1.4 Overlapping entries trigger hasConflict flag", () => {
  const entries = [
    { id: "e1", weekday: 2, periodNumber: 1, subjectId: "sub-mtk", kind: "class", weekPattern: "every" },
    { id: "e2", weekday: 2, periodNumber: 1, subjectId: "sub-ipa", kind: "class", weekPattern: "every" },
  ];

  const res = getDayItems(2, {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
  });

  assert.ok(res.conflicts.length > 0, "Conflicts array should contain conflict items");
  assert.ok(res.items.some((i) => i.hasConflict === true), "Conflicted item should have hasConflict = true");
});

test("1.5 Day off returns empty items list with isDayOff and reason", () => {
  const entries = [
    { id: "e1", weekday: 1, periodNumber: 1, subjectId: "sub-mtk", kind: "class", weekPattern: "every" },
  ];
  const daysOff = [{ id: "d1", date: "2026-11-25", reason: "Hari Guru Nasional" }];

  const res = getDayItems("2026-11-25", {
    timetableEntries: entries,
    subjects: mockSubjects,
    periodTimes: mockPeriodTimes,
    daysOff,
  });

  assert.equal(res.isDayOff, true, "isDayOff flag must be true");
  assert.equal(res.dayOffReason, "Hari Guru Nasional");
  assert.equal(res.empty, true);
  assert.equal(res.items.length, 0, "Items should be empty on Day Off");
  assert.ok(res.headerSummary.includes("Libur: Hari Guru Nasional"));
});

// ============================================================================
// 2. calculateNextClassDeadline() Characterization
// ============================================================================
console.log("\n[2] calculateNextClassDeadline() Characterization");

test("2.1 Given today = Wednesday, subject class on Thursday -> deadline = Thursday", () => {
  // Wednesday = 2026-10-28 (weekday 3), Thursday = 2026-10-29 (weekday 4)
  const entries = [
    { id: "e1", weekday: 4, period: 1, subjectId: "sub-mtk", kind: "class" },
  ];

  const res = calculateNextClassDeadline("sub-mtk", "2026-10-28", entries);

  assert.equal(res.found, true);
  assert.equal(res.deadlineDate, "2026-10-29");
  assert.equal(res.weekday, 4);
});

test("2.2 Given today = Friday, subject class on Monday -> deadline = next Monday", () => {
  // Friday = 2026-10-30 (weekday 5), next Monday = 2026-11-02 (weekday 1)
  const entries = [
    { id: "e1", weekday: 1, period: 1, subjectId: "sub-ipa", kind: "class" },
  ];

  const res = calculateNextClassDeadline("sub-ipa", "2026-10-30", entries);

  assert.equal(res.found, true);
  assert.equal(res.deadlineDate, "2026-11-02");
  assert.equal(res.weekday, 1);
});

test("2.3 Subject has no classes in timetable -> returns found: false", () => {
  const entries = [
    { id: "e1", weekday: 1, period: 1, subjectId: "sub-mtk", kind: "class" },
  ];

  const res = calculateNextClassDeadline("sub-nonexistent", "2026-10-28", entries);

  assert.equal(res.found, false);
  assert.equal(res.deadlineDate, null);
  assert.equal(res.reason, "NO_TIMETABLE_FOR_SUBJECT");
});

test("2.4 Next class falling on a DayOff skips to following occurrence", () => {
  // Given Friday 2026-10-30, next class Monday 2026-11-02 is a DayOff.
  // Next session should advance to following Monday 2026-11-09.
  const entries = [
    { id: "e1", weekday: 1, period: 1, subjectId: "sub-mtk", kind: "class" },
  ];
  const daysOff = [{ id: "d1", date: "2026-11-02", reason: "Cuti Bersama" }];

  const res = calculateNextClassDeadline("sub-mtk", "2026-10-30", entries, { daysOff });

  assert.equal(res.found, true);
  assert.equal(res.deadlineDate, "2026-11-09", "Should skip 2026-11-02 and land on 2026-11-09");
  assert.equal(res.weekday, 1);
});

test("2.5 afterNClasses: 2 skips 1 class and returns the 2nd class date", () => {
  // Class on Monday (weekday 1) and Thursday (weekday 4).
  // Given Sunday 2026-10-25: 1st class is Mon 2026-10-26, 2nd class is Thu 2026-10-29.
  const entries = [
    { id: "e1", weekday: 1, period: 1, subjectId: "sub-mtk", kind: "class" },
    { id: "e2", weekday: 4, period: 1, subjectId: "sub-mtk", kind: "class" },
  ];

  const res = calculateNextClassDeadline("sub-mtk", "2026-10-25", entries, { afterNClasses: 2 });

  assert.equal(res.found, true);
  assert.equal(res.deadlineDate, "2026-10-29");
  assert.equal(res.classNumber, 2);
});

// ============================================================================
// 3. getExamState() Characterization
// ============================================================================
console.log("\n[3] getExamState() Characterization");

test("3.1 Exam tomorrow returns label 'Besok' and daysLeft = 1", () => {
  const subjects = [
    { id: "s1", name: "Fisika", title: "Fisika", exam_date: "2026-10-26" },
  ];

  const state = getExamState({
    subjects,
    today: "2026-10-25",
  });

  assert.ok(state.nextExam !== null);
  assert.equal(state.nextExam.label, "Besok");
  assert.equal(state.nextExam.daysLeft, 1);
  assert.equal(state.nextExam.isTomorrow, true);
});

test("3.2 Exam today returns label 'Hari ini' and daysLeft = 0", () => {
  const subjects = [
    { id: "s1", name: "Kimia", title: "Kimia", exam_date: "2026-10-25" },
  ];

  const state = getExamState({
    subjects,
    today: "2026-10-25",
  });

  assert.ok(state.nextExam !== null);
  assert.equal(state.nextExam.label, "Hari ini");
  assert.equal(state.nextExam.daysLeft, 0);
  assert.equal(state.nextExam.isToday, true);
});

test("3.3 Exam in 15 days returns label '15 hari lagi' and daysLeft = 15", () => {
  const subjects = [
    { id: "s1", name: "Biologi", title: "Biologi", exam_date: "2026-11-09" },
  ];

  const state = getExamState({
    subjects,
    today: "2026-10-25",
  });

  assert.ok(state.nextExam !== null);
  assert.equal(state.nextExam.label, "15 hari lagi");
  assert.equal(state.nextExam.daysLeft, 15);
});

test("3.4 Past exam returns label 'Selesai' and is placed in pastExams", () => {
  const subjects = [
    { id: "s1", name: "Sejarah", title: "Sejarah", exam_date: "2026-10-20" },
  ];

  const state = getExamState({
    subjects,
    today: "2026-10-25",
  });

  assert.equal(state.nextExam, null, "Past exam should not be nextExam");
  assert.equal(state.pastExams.length, 1);
  assert.equal(state.pastExams[0].label, "Selesai");
  assert.equal(state.pastExams[0].isPassed, true);
});

test("3.5 Multi-day exam event in progress returns label 'Sedang ujian'", () => {
  const examEvents = [
    {
      id: "ev1",
      title: "Penilaian Tengah Semester (PTS)",
      startDate: "2026-10-24",
      endDate: "2026-10-28",
    },
  ];

  const state = getExamState({
    examEvents,
    today: "2026-10-25",
  });

  assert.ok(state.nextExam !== null);
  assert.equal(state.nextExam.label, "Sedang ujian");
  assert.equal(state.nextExam.isOngoing, true);
});

// ============================================================================
// 4. Streak Engine Characterization
// ============================================================================
console.log("\n[4] Streak Engine Characterization");

test("4.1 3 consecutive study days yields streak = 3", () => {
  // Today = Wed 2026-10-28. Studied on Mon 26, Tue 27, Wed 28.
  const tasks = [
    { id: "t1", status: "COMPLETED", completedAt: "2026-10-26T10:00:00Z", createdAt: "2026-10-26T08:00:00Z" },
    { id: "t2", status: "COMPLETED", completedAt: "2026-10-27T10:00:00Z", createdAt: "2026-10-27T08:00:00Z" },
    { id: "t3", status: "COMPLETED", completedAt: "2026-10-28T10:00:00Z", createdAt: "2026-10-28T08:00:00Z" },
  ];

  const state = calculateStreak({
    today: "2026-10-28",
    tasks,
    countEveryDay: true,
  });

  assert.equal(state.currentStreak, 3);
  assert.equal(state.todayStudied, true);
  assert.equal(state.isAtRisk, false);
});

test("4.2 Weekend with no study does NOT break streak (free day rule)", () => {
  // Friday 2026-10-23 studied, Sat 24 & Sun 25 free (no timetable), Mon 26 studied
  const timetableEntries = [
    { id: "e1", weekday: 1, period: 1, subjectId: "sub-mtk", kind: "class" },
    { id: "e2", weekday: 5, period: 1, subjectId: "sub-mtk", kind: "class" },
  ];
  const tasks = [
    { id: "t1", status: "COMPLETED", completedAt: "2026-10-23T10:00:00Z", createdAt: "2026-10-23T08:00:00Z" },
    { id: "t2", status: "COMPLETED", completedAt: "2026-10-26T10:00:00Z", createdAt: "2026-10-26T08:00:00Z" },
  ];

  const state = calculateStreak({
    today: "2026-10-26",
    tasks,
    timetableEntries,
    countEveryDay: false,
  });

  assert.equal(state.currentStreak, 2, "Streak connects across weekend free days");
});

test("4.3 School day with no study breaks streak to 0", () => {
  // Mon 2026-10-26 has classes and was studied.
  // Tue 2026-10-27 has classes and was MISSED.
  // Today is Wed 2026-10-28, studied today.
  const timetableEntries = [
    { id: "e1", weekday: 1, period: 1, subjectId: "sub-mtk", kind: "class" },
    { id: "e2", weekday: 2, period: 1, subjectId: "sub-mtk", kind: "class" },
    { id: "e3", weekday: 3, period: 1, subjectId: "sub-mtk", kind: "class" },
  ];
  const tasks = [
    { id: "t1", status: "COMPLETED", completedAt: "2026-10-26T10:00:00Z", createdAt: "2026-10-26T08:00:00Z" },
    { id: "t3", status: "COMPLETED", completedAt: "2026-10-28T10:00:00Z", createdAt: "2026-10-28T08:00:00Z" },
  ];

  const state = calculateStreak({
    today: "2026-10-28",
    tasks,
    timetableEntries,
    countEveryDay: false,
  });

  assert.equal(state.currentStreak, 1, "Missed Tuesday resets streak to 1 (only today)");
});

test("4.4 Task completed in <2 minutes is filtered out by anti-cheat", () => {
  const quickTask = {
    id: "task-cheat",
    status: "COMPLETED",
    createdAt: "2026-10-28T10:00:00.000Z",
    completedAt: "2026-10-28T10:01:00.000Z", // 1 minute later
  };

  assert.equal(isTaskAntiCheatDisqualified(quickTask), true, "Should be flagged as anti-cheat");

  const studyDay = deriveStudyDay("2026-10-28", {
    tasks: [quickTask],
    timetableEntries: [{ id: "e1", weekday: 3, period: 1, subjectId: "sub-mtk", kind: "class" }],
  });

  assert.equal(studyDay.tasksCompleted, 0, "Disqualified task must not count");
  assert.equal(studyDay.hasStudied, false, "Day must not be earned");
});

test("4.5 Focus log <10 minutes is filtered out by anti-cheat", () => {
  const shortLog = {
    id: "fl-1",
    started_at: "2026-10-28T09:00:00.000Z",
    actual_minutes: 8, // < 10 mins
  };

  const studyDay = deriveStudyDay("2026-10-28", {
    focusLogs: [shortLog],
  });

  assert.equal(studyDay.minutes, 0, "Focus log under 10 minutes must not count");
  assert.equal(studyDay.hasStudied, false, "Day must not be earned");
});

test("4.6 calculateStudyStreak() timestamp helper calculates streak accurately", () => {
  const timestamps = [
    "2026-10-26T12:00:00Z",
    "2026-10-27T14:00:00Z",
    "2026-10-28T16:00:00Z",
  ];

  const streak = calculateStudyStreak(timestamps, new Date("2026-10-28T20:00:00Z"));
  assert.equal(streak, 3, "Activity across 3 consecutive days equals 3");
});

// ============================================================================
// Summary
// ============================================================================
console.log("\n==================================================");
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log("==================================================");

if (passedTests !== totalTests) {
  process.exit(1);
}
