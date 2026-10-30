/**
 * StudyAir - P7 Tugas Screen Test Suite
 * Tests 4-group partitioning, next-block derivation, and block time formatting.
 */

import assert from "node:assert";

// Pure logic implementations identical to mobile/src/screens/TasksScreen.tsx
export function partitionTasks(tasks, studyBlocks, unallocatedTaskIds = []) {
  const completed = [];
  const scheduled = [];
  const unscheduled = [];
  const unallocated = [];

  const unallocatedSet = new Set(unallocatedTaskIds);
  const activeBlockTaskIds = new Set(
    studyBlocks.filter((b) => b.status !== "CANCELLED").map((b) => b.taskId)
  );

  for (const task of tasks) {
    if (task.status === "COMPLETED") {
      completed.push(task);
    } else if (unallocatedSet.has(task.id)) {
      unallocated.push(task);
    } else if (activeBlockTaskIds.has(task.id)) {
      scheduled.push(task);
    } else {
      unscheduled.push(task);
    }
  }

  return { scheduled, unscheduled, unallocated, completed };
}

export function getNextBlockForTask(taskId, studyBlocks, currentDateStr = "2026-10-30") {
  const blocksForTask = studyBlocks
    .filter(
      (b) =>
        b.taskId === taskId &&
        b.status !== "CANCELLED" &&
        b.status !== "COMPLETED" &&
        b.date >= currentDateStr
    )
    .sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.startTime.localeCompare(b.startTime);
    });

  return blocksForTask[0] || null;
}

export function formatNextBlockTime(block, currentDateStr = "2026-10-30") {
  if (!block) return null;
  if (block.date === currentDateStr) {
    return `Hari ini ${block.startTime}`;
  }
  // Simple date diff test calculation
  const bDate = new Date(block.date);
  const cDate = new Date(currentDateStr);
  const diffDays = Math.round((bDate - cDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return `Besok ${block.startTime}`;
  }
  return `${block.date} ${block.startTime}`;
}

console.log("==================================================");
console.log("    STUDYAIR P7 TUGAS SCREEN TEST SUITE");
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

console.log("\n[1] 4-Group Partitioning");

it("partitions tasks into scheduled, unscheduled, unallocated, and completed", () => {
  const tasks = [
    { id: "t1", title: "Matematika PR", status: "PENDING" },
    { id: "t2", title: "Fisika Lab", status: "PENDING" },
    { id: "t3", title: "Biologi Laporan", status: "PENDING" },
    { id: "t4", title: "B. Indo Puisi", status: "COMPLETED" },
  ];

  const studyBlocks = [
    { id: "b1", taskId: "t1", date: "2026-10-30", startTime: "16:00", endTime: "16:45", status: "SCHEDULED" },
    { id: "b2", taskId: "t2", date: "2026-10-31", startTime: "15:00", endTime: "15:30", status: "CANCELLED" },
  ];

  const unallocatedTaskIds = ["t2"];

  const res = partitionTasks(tasks, studyBlocks, unallocatedTaskIds);

  assert.strictEqual(res.scheduled.length, 1);
  assert.strictEqual(res.scheduled[0].id, "t1");

  assert.strictEqual(res.unscheduled.length, 1);
  assert.strictEqual(res.unscheduled[0].id, "t3");

  assert.strictEqual(res.unallocated.length, 1);
  assert.strictEqual(res.unallocated[0].id, "t2");

  assert.strictEqual(res.completed.length, 1);
  assert.strictEqual(res.completed[0].id, "t4");
});

it("handles empty tasks list gracefully", () => {
  const res = partitionTasks([], []);
  assert.strictEqual(res.scheduled.length, 0);
  assert.strictEqual(res.unscheduled.length, 0);
  assert.strictEqual(res.unallocated.length, 0);
  assert.strictEqual(res.completed.length, 0);
});

console.log("\n[2] Next Block Derivation for Task");

it("finds the earliest upcoming block for a task", () => {
  const studyBlocks = [
    { id: "b1", taskId: "t1", date: "2026-10-31", startTime: "14:00", endTime: "14:45", status: "SCHEDULED" },
    { id: "b2", taskId: "t1", date: "2026-10-30", startTime: "17:00", endTime: "17:45", status: "SCHEDULED" },
    { id: "b3", taskId: "t1", date: "2026-10-30", startTime: "15:00", endTime: "15:45", status: "COMPLETED" },
  ];

  const nextBlock = getNextBlockForTask("t1", studyBlocks, "2026-10-30");
  assert.ok(nextBlock);
  assert.strictEqual(nextBlock.id, "b2");
  assert.strictEqual(nextBlock.startTime, "17:00");
});

it("returns null if all blocks for task are past or completed", () => {
  const studyBlocks = [
    { id: "b1", taskId: "t1", date: "2026-10-29", startTime: "14:00", endTime: "14:45", status: "SCHEDULED" },
    { id: "b2", taskId: "t1", date: "2026-10-30", startTime: "15:00", endTime: "15:45", status: "COMPLETED" },
  ];

  const nextBlock = getNextBlockForTask("t1", studyBlocks, "2026-10-30");
  assert.strictEqual(nextBlock, null);
});

console.log("\n[3] Block Time Formatting");

it("formats today block time as 'Hari ini HH:MM'", () => {
  const block = { date: "2026-10-30", startTime: "16:00" };
  const formatted = formatNextBlockTime(block, "2026-10-30");
  assert.strictEqual(formatted, "Hari ini 16:00");
});

it("formats tomorrow block time as 'Besok HH:MM'", () => {
  const block = { date: "2026-10-31", startTime: "15:30" };
  const formatted = formatNextBlockTime(block, "2026-10-30");
  assert.strictEqual(formatted, "Besok 15:30");
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
