/**
 * StudyAir - P11 Streak & Exam Study Plan Test Suite
 * Tests StudyBlock counting in streak engine and exam study plan generator.
 */

import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildSchedule } = require("./dist-test/engine/schedulerEngine.js");

// Pure logic for exam study plan generation
export function createExamStudyPlan({ exam, subjectId, todayStr = "2026-10-30" }) {
  const examDate = exam.startDate || exam.date || exam.examDate;
  const subjectName = exam.subjectName || exam.name || "Ujian";

  // Create 2 focused study tasks leading to the exam
  const tasks = [
    {
      id: `task-exam-rev-${Date.now()}-1`,
      subjectId: subjectId || "exam-sub",
      title: `Review Kisi-kisi ${subjectName}`,
      type: "homework",
      givenDate: todayStr,
      deadlineDate: examDate,
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
    {
      id: `task-exam-prac-${Date.now()}-2`,
      subjectId: subjectId || "exam-sub",
      title: `Latihan Soal & Pembahasan ${subjectName}`,
      type: "homework",
      givenDate: todayStr,
      deadlineDate: examDate,
      deadlineMode: "custom",
      estimatedMinutes: 60,
      status: "PENDING",
    },
  ];

  return tasks;
}

// Logic for study day calculation including StudyBlock completion
export function checkStudyDayEarned({
  tasksCompleted = 0,
  focusMinutes = 0,
  minFocusMinutes = 15,
  blocksCompleted = 0,
}) {
  return tasksCompleted >= 1 || focusMinutes >= minFocusMinutes || blocksCompleted >= 1;
}

console.log("==================================================");
console.log("    STUDYAIR P11 STREAK & EXAM PLAN TEST SUITE");
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

console.log("\n[1] Streak Calibration for Study Blocks");

it("earns the study day when at least 1 study block is completed", () => {
  const earned = checkStudyDayEarned({ blocksCompleted: 1, focusMinutes: 0, tasksCompleted: 0 });
  assert.strictEqual(earned, true);
});

it("does not earn study day when 0 blocks, 0 tasks, and insufficient focus minutes", () => {
  const earned = checkStudyDayEarned({ blocksCompleted: 0, focusMinutes: 5, minFocusMinutes: 15, tasksCompleted: 0 });
  assert.strictEqual(earned, false);
});

console.log("\n[2] Exam Study Plan Generation");

it("generates review and practice tasks leading to the exam deadline", () => {
  const exam = { name: "PTS Matematika", startDate: "2026-11-05" };
  const tasks = createExamStudyPlan({ exam, subjectId: "s-mat", todayStr: "2026-10-30" });

  assert.strictEqual(tasks.length, 2);
  assert.strictEqual(tasks[0].subjectId, "s-mat");
  assert.strictEqual(tasks[0].deadlineDate, "2026-11-05");
  assert.strictEqual(tasks[0].estimatedMinutes, 45);

  assert.strictEqual(tasks[1].subjectId, "s-mat");
  assert.strictEqual(tasks[1].deadlineDate, "2026-11-05");
  assert.strictEqual(tasks[1].estimatedMinutes, 60);

  // Test that buildSchedule can immediately schedule these exam prep tasks
  const scheduleResult = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs: {
      studyWindowStart: "15:00",
      studyWindowEnd: "21:00",
      maxBlockMinutes: 60,
      minBreakMinutes: 15,
      daysOff: [],
      priorityWeights: { urgentFirst: true, hardFirst: false },
    },
    referenceDate: "2026-10-30",
  });

  assert.strictEqual(scheduleResult.blocks.length, 2);
  assert.strictEqual(scheduleResult.unallocated.length, 0);
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
