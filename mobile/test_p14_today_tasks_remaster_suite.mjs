/**
 * StudyAir - P14 Today Tasks Remaster Test Suite
 * Tests task derivation for "Hari Ini", progress metrics, and filtering.
 */

import assert from "node:assert";

// Pure helper logic mirroring mobile/src/components/home/TodayTasksSection.tsx
export function deriveTodayTasks({ tasks, studyBlocks = [], todayStr = "2026-10-30" }) {
  const scheduledTaskIdsToday = new Set(
    studyBlocks
      .filter((b) => b.date === todayStr && b.status !== "SKIPPED")
      .map((b) => b.taskId)
  );

  const matching = tasks.filter((t) => {
    if (t.status === "COMPLETED") {
      const completedDay = t.completedAt ? t.completedAt.slice(0, 10) : "";
      return completedDay === todayStr || (!completedDay && t.deadlineDate === todayStr);
    }

    const isDueToday = t.deadlineDate === todayStr;
    const isScheduledToday = scheduledTaskIdsToday.has(t.id);
    const isOverdue = t.deadlineDate < todayStr;

    return isDueToday || isScheduledToday || isOverdue;
  });

  if (matching.length === 0) {
    return tasks
      .filter((t) => t.status !== "COMPLETED")
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))
      .slice(0, 3);
  }

  return matching.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "PENDING" ? -1 : 1;
    }
    const aOverdue = a.deadlineDate < todayStr ? 1 : 0;
    const bOverdue = b.deadlineDate < todayStr ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;

    const aDueToday = a.deadlineDate === todayStr ? 1 : 0;
    const bDueToday = b.deadlineDate === todayStr ? 1 : 0;
    if (aDueToday !== bDueToday) return bDueToday - aDueToday;

    return a.deadlineDate.localeCompare(b.deadlineDate);
  });
}

export function calculateTodayTasksProgress(todayTasks) {
  const total = todayTasks.length;
  if (total === 0) return { total: 0, completed: 0, pending: 0, percentage: 0 };
  const completed = todayTasks.filter((t) => t.status === "COMPLETED").length;
  const pending = total - completed;
  const percentage = Math.round((completed / total) * 100);
  return { total, completed, pending, percentage };
}

console.log("==================================================");
console.log("  STUDYAIR P14 TODAY TASKS REMASTER TEST SUITE");
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

console.log("\n[1] Task Ingestion for 'Hari Ini'");

it("includes tasks due today", () => {
  const tasks = [
    { id: "t1", title: "PR Math", deadlineDate: "2026-10-30", status: "PENDING" },
    { id: "t2", title: "PR Bio", deadlineDate: "2026-11-05", status: "PENDING" },
  ];
  const result = deriveTodayTasks({ tasks, todayStr: "2026-10-30" });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, "t1");
});

it("includes tasks scheduled today via study blocks even if deadline is later", () => {
  const tasks = [
    { id: "t1", title: "PR Bio", deadlineDate: "2026-11-05", status: "PENDING" },
  ];
  const studyBlocks = [
    { id: "b1", taskId: "t1", date: "2026-10-30", status: "SCHEDULED" },
  ];
  const result = deriveTodayTasks({ tasks, studyBlocks, todayStr: "2026-10-30" });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, "t1");
});

it("includes overdue tasks at the top priority", () => {
  const tasks = [
    { id: "t1", title: "PR Math (Due Today)", deadlineDate: "2026-10-30", status: "PENDING" },
    { id: "t2", title: "PR History (Overdue)", deadlineDate: "2026-10-28", status: "PENDING" },
  ];
  const result = deriveTodayTasks({ tasks, todayStr: "2026-10-30" });
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "t2"); // Overdue is sorted first
  assert.strictEqual(result[1].id, "t1");
});

it("includes tasks completed today for satisfaction/streak review", () => {
  const tasks = [
    { id: "t1", title: "PR Math", deadlineDate: "2026-10-30", status: "COMPLETED", completedAt: "2026-10-30T10:00:00Z" },
    { id: "t2", title: "PR Physics", deadlineDate: "2026-10-30", status: "PENDING" },
  ];
  const result = deriveTodayTasks({ tasks, todayStr: "2026-10-30" });
  assert.strictEqual(result.length, 2);
  // Pending tasks come before completed
  assert.strictEqual(result[0].id, "t2");
  assert.strictEqual(result[1].id, "t1");
});

it("falls back to closest upcoming tasks if no tasks match today strictly", () => {
  const tasks = [
    { id: "t1", title: "PR Later", deadlineDate: "2026-11-04", status: "PENDING" },
    { id: "t2", title: "PR Tomorrow", deadlineDate: "2026-10-31", status: "PENDING" },
  ];
  const result = deriveTodayTasks({ tasks, todayStr: "2026-10-30" });
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].id, "t2"); // Earliest deadline first
});

console.log("\n[2] Progress Metrics Calculation");

it("calculates completion percentages accurately", () => {
  const sample = [
    { id: "t1", status: "COMPLETED" },
    { id: "t2", status: "COMPLETED" },
    { id: "t3", status: "PENDING" },
    { id: "t4", status: "PENDING" },
  ];
  const progress = calculateTodayTasksProgress(sample);
  assert.strictEqual(progress.total, 4);
  assert.strictEqual(progress.completed, 2);
  assert.strictEqual(progress.pending, 2);
  assert.strictEqual(progress.percentage, 50);
});

it("handles 0 tasks gracefully without NaN", () => {
  const progress = calculateTodayTasksProgress([]);
  assert.strictEqual(progress.total, 0);
  assert.strictEqual(progress.percentage, 0);
});

it("reports 100% when all today tasks are completed", () => {
  const sample = [
    { id: "t1", status: "COMPLETED" },
    { id: "t2", status: "COMPLETED" },
  ];
  const progress = calculateTodayTasksProgress(sample);
  assert.strictEqual(progress.percentage, 100);
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
