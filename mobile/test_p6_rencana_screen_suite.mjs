import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { t } = require("./dist-test/lib/i18n.js");

console.log("==================================================");
console.log("    STUDYAIR P6 RENCANA SCREEN TEST SUITE");
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

// ─── Pure Helpers mirroring HomeScreen.tsx ───

function deriveTodayBlocks(studyBlocks, todayStr) {
  return studyBlocks
    .filter((b) => b.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function deriveNextBlock(todayBlocks) {
  return todayBlocks.find((b) => b.status !== "COMPLETED") || null;
}

function deriveRemainingTodayBlocks(todayBlocks, nextBlock) {
  if (!nextBlock) return todayBlocks.filter((b) => b.status === "COMPLETED");
  return todayBlocks.filter((b) => b.id !== nextBlock.id);
}

function deriveUnscheduledTasksCount(tasks, studyBlocks) {
  const scheduledTaskIds = new Set(studyBlocks.map((b) => b.taskId));
  return tasks.filter((t) => t.status === "PENDING" && !scheduledTaskIds.has(t.id)).length;
}

// ─── 1. NEXT Block Derivation (The 3-Second Rule) ───
console.log("[1] NEXT Block Derivation");

const sampleTodayBlocks = [
  { id: "b1", taskId: "t1", date: "2026-10-30", startTime: "15:00", endTime: "15:45", durationMinutes: 45, status: "COMPLETED" },
  { id: "b2", taskId: "t2", date: "2026-10-30", startTime: "16:00", endTime: "16:45", durationMinutes: 45, status: "SCHEDULED" },
  { id: "b3", taskId: "t3", date: "2026-10-30", startTime: "17:00", endTime: "17:30", durationMinutes: 30, status: "SCHEDULED" },
];

test("selects earliest non-completed block as NEXT block", () => {
  const todayBlocks = deriveTodayBlocks(sampleTodayBlocks, "2026-10-30");
  const next = deriveNextBlock(todayBlocks);

  assert.ok(next);
  assert.strictEqual(next.id, "b2");
  assert.strictEqual(next.startTime, "16:00");
});

test("returns null when all today's blocks are completed", () => {
  const allCompleted = sampleTodayBlocks.map((b) => ({ ...b, status: "COMPLETED" }));
  const todayBlocks = deriveTodayBlocks(allCompleted, "2026-10-30");
  const next = deriveNextBlock(todayBlocks);

  assert.strictEqual(next, null);
});

test("returns null when zero blocks are scheduled for today", () => {
  const todayBlocks = deriveTodayBlocks([], "2026-10-30");
  const next = deriveNextBlock(todayBlocks);

  assert.strictEqual(next, null);
});

// ─── 2. Remaining Today Blocks List ───
console.log("\n[2] Remaining Today Blocks");

test("excludes NEXT block from remaining blocks list", () => {
  const todayBlocks = deriveTodayBlocks(sampleTodayBlocks, "2026-10-30");
  const next = deriveNextBlock(todayBlocks);
  const remaining = deriveRemainingTodayBlocks(todayBlocks, next);

  assert.strictEqual(remaining.length, 2);
  assert.ok(!remaining.some((b) => b.id === next.id));
  assert.strictEqual(remaining[0].id, "b1"); // completed block
  assert.strictEqual(remaining[1].id, "b3"); // later scheduled block
});

// ─── 3. Unscheduled Tasks Calculation ───
console.log("\n[3] Unscheduled Tasks Calculation");

const sampleTasks = [
  { id: "t1", title: "PR Math", status: "PENDING" },
  { id: "t2", title: "PR Physics", status: "PENDING" },
  { id: "t3", title: "PR English", status: "PENDING" },
  { id: "t4", title: "PR History", status: "PENDING" },
  { id: "t5", title: "PR Biology", status: "COMPLETED" },
];

test("counts pending tasks without any study blocks", () => {
  // Blocks only cover t1 and t2
  const blocks = [
    { id: "b1", taskId: "t1" },
    { id: "b2", taskId: "t2" },
  ];

  const unscheduled = deriveUnscheduledTasksCount(sampleTasks, blocks);
  // t3 and t4 are pending and unscheduled -> 2
  assert.strictEqual(unscheduled, 2);
});

test("returns 0 when all pending tasks are scheduled", () => {
  const blocks = [
    { id: "b1", taskId: "t1" },
    { id: "b2", taskId: "t2" },
    { id: "b3", taskId: "t3" },
    { id: "b4", taskId: "t4" },
  ];

  const unscheduled = deriveUnscheduledTasksCount(sampleTasks, blocks);
  assert.strictEqual(unscheduled, 0);
});

test("ignores completed tasks even if not in study blocks", () => {
  const pendingOnly = sampleTasks.slice(0, 2);
  const blocks = [{ id: "b1", taskId: "t1" }, { id: "b2", taskId: "t2" }];
  const unscheduled = deriveUnscheduledTasksCount(pendingOnly, blocks);
  assert.strictEqual(unscheduled, 0);
});

// ─── 4. Tomorrow Summary Formatting ───
console.log("\n[4] Tomorrow Summary Formatting");

test("formats collapsed Besok summary string correctly", () => {
  const classesCount = 4;
  const blocksCount = 2;

  const summary = t("besok_summary", {
    classes: classesCount,
    blocks: blocksCount,
  });

  assert.strictEqual(summary, "Besok: 4 kelas • 2 blok belajar");
});

// ─── Final Summary ───
console.log("\n==================================================");
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
