/**
 * StudyAir - P9 Execution Loop Test Suite
 * Tests focus timer block binding, missed block detection, and rescheduling.
 */

import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildSchedule } = require("./dist-test/engine/schedulerEngine.js");

// Logic for detecting missed blocks
export function detectMissedBlocks(studyBlocks, currentDateStr = "2026-10-30", currentTimeStr = "17:00") {
  const missed = [];
  const updated = studyBlocks.map((block) => {
    if (block.status !== "SCHEDULED") return block;

    const isPastDate = block.date < currentDateStr;
    const isPastTimeToday = block.date === currentDateStr && block.endTime < currentTimeStr;

    if (isPastDate || isPastTimeToday) {
      const missedBlock = { ...block, status: "MISSED" };
      missed.push(missedBlock);
      return missedBlock;
    }
    return block;
  });

  return { updatedBlocks: updated, missedBlocks: missed };
}

// Logic for rescheduling missed blocks
export function rescheduleMissedBlocks({
  studyBlocks,
  tasks,
  busyBlocks,
  prefs,
  referenceDate = "2026-10-30",
  currentTime = "17:00",
}) {
  const { updatedBlocks, missedBlocks } = detectMissedBlocks(studyBlocks, referenceDate, currentTime);
  if (missedBlocks.length === 0) {
    return { hasChanges: false, updatedBlocks };
  }

  // Get active pending tasks that need replacement blocks
  const missedTaskIds = new Set(missedBlocks.map((b) => b.taskId));
  const pendingTasksToReschedule = tasks.filter((t) => t.status !== "COMPLETED" && missedTaskIds.has(t.id));

  // Build new schedule starting from today
  const newSchedule = buildSchedule({
    tasks: pendingTasksToReschedule,
    busyBlocks,
    prefs,
    referenceDate,
  });

  // Keep non-missed upcoming blocks, remove missed ones, add new ones
  const retainedBlocks = updatedBlocks.filter(
    (b) => b.status === "COMPLETED" || (b.status === "SCHEDULED" && !missedTaskIds.has(b.taskId))
  );

  return {
    hasChanges: true,
    missedCount: missedBlocks.length,
    newBlocks: newSchedule.blocks,
    combinedBlocks: [...retainedBlocks, ...newSchedule.blocks],
  };
}

console.log("==================================================");
console.log("    STUDYAIR P9 EXECUTION LOOP TEST SUITE");
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

console.log("\n[1] Missed Block Detection");

it("marks past study blocks as MISSED and leaves upcoming ones SCHEDULED", () => {
  const blocks = [
    { id: "b1", taskId: "t1", date: "2026-10-29", startTime: "15:00", endTime: "15:45", status: "SCHEDULED" },
    { id: "b2", taskId: "t1", date: "2026-10-30", startTime: "14:00", endTime: "14:45", status: "SCHEDULED" },
    { id: "b3", taskId: "t1", date: "2026-10-30", startTime: "18:00", endTime: "18:45", status: "SCHEDULED" },
    { id: "b4", taskId: "t1", date: "2026-10-30", startTime: "10:00", endTime: "10:45", status: "COMPLETED" },
  ];

  const { updatedBlocks, missedBlocks } = detectMissedBlocks(blocks, "2026-10-30", "17:00");

  assert.strictEqual(missedBlocks.length, 2);
  assert.strictEqual(missedBlocks[0].id, "b1"); // yesterday
  assert.strictEqual(missedBlocks[1].id, "b2"); // earlier today

  const b3 = updatedBlocks.find((b) => b.id === "b3");
  assert.strictEqual(b3.status, "SCHEDULED"); // upcoming today

  const b4 = updatedBlocks.find((b) => b.id === "b4");
  assert.strictEqual(b4.status, "COMPLETED"); // untouched
});

console.log("\n[2] Missed Block Rescheduling");

it("reschedules missed blocks into upcoming available slots", () => {
  const tasks = [
    { id: "t1", title: "PR Mat", subjectId: "s1", deadlineDate: "2026-10-31", estimatedMinutes: 45, status: "PENDING" },
  ];
  const studyBlocks = [
    { id: "b1", taskId: "t1", subjectId: "s1", date: "2026-10-29", startTime: "15:00", endTime: "15:45", status: "SCHEDULED" },
  ];
  const prefs = {
    studyWindowStart: "15:00",
    studyWindowEnd: "21:00",
    maxBlockMinutes: 45,
    minBreakMinutes: 15,
    daysOff: [],
    priorityWeights: { urgentFirst: true, hardFirst: false },
  };

  const res = rescheduleMissedBlocks({
    studyBlocks,
    tasks,
    busyBlocks: [],
    prefs,
    referenceDate: "2026-10-30",
    currentTime: "17:00",
  });

  assert.strictEqual(res.hasChanges, true);
  assert.strictEqual(res.missedCount, 1);
  assert.ok(res.newBlocks.length > 0);
  assert.strictEqual(res.newBlocks[0].taskId, "t1");
  assert.ok(res.newBlocks[0].date >= "2026-10-30");
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
