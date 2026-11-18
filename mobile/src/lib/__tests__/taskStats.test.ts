import test from "node:test";
import assert from "node:assert/strict";
import { computeTaskDoneStats, buildHeatmapWeeks, heatLevel, averageTaskScore } from "../taskStats";
import type { Grade, Task } from "../../types";

const task = (id: string, completedAt?: string, status: Task["status"] = "COMPLETED"): Task => ({
  id,
  subjectId: "s1",
  title: id,
  type: "homework",
  givenDate: "2026-10-01",
  deadlineDate: "2026-11-30",
  deadlineMode: "custom",
  status,
  completedAt,
});

// Wednesday 4 Nov 2026, local time
const now = new Date(2026, 10, 4, 15, 0);
const local = (y: number, m: number, d: number, h = 10) => new Date(y, m, d, h).toISOString();

test("counts tasks done today, this week (from Monday) and this month", () => {
  const stats = computeTaskDoneStats(
    [
      task("today", local(2026, 10, 4)),
      task("monday", local(2026, 10, 2)),
      task("sunday-last-week", local(2026, 10, 1)),
      task("october", local(2026, 9, 31)),
      task("pending", undefined, "PENDING"),
      task("bad-date", "not-a-date"),
    ],
    now
  );
  assert.equal(stats.today, 1);
  assert.equal(stats.week, 2);
  assert.equal(stats.month, 3);
  assert.equal(stats.dailyCounts["2026-10-31"], 1);
  assert.equal(Object.keys(stats.dailyCounts).length, 4);
});

test("heatmap grid ends with the current week and hides future days", () => {
  const grid = buildHeatmapWeeks(3, now);
  assert.equal(grid.length, 3);
  assert.equal(grid[0][0], "2026-10-19"); // Monday two weeks back
  assert.equal(grid[2][0], "2026-11-02"); // this Monday
  assert.equal(grid[2][2], "2026-11-04"); // today
  assert.equal(grid[2][3], null); // tomorrow
});

test("heat level caps at 4", () => {
  assert.deepEqual([0, 1, 3, 4, 9].map(heatLevel), [0, 1, 3, 4, 4]);
});

test("average task score uses only assignment grades on a 0-100 scale", () => {
  const g = (score: number, maxScore: number, category: Grade["category"]): Grade => ({
    id: `${score}-${category}`, subjectId: "s1", title: "x", score, maxScore, weight: 1, category, date: "2026-11-01",
  });
  assert.equal(averageTaskScore([]), null);
  assert.equal(averageTaskScore([g(90, 100, "exam")]), null);
  assert.equal(averageTaskScore([g(80, 100, "assignment"), g(45, 50, "assignment"), g(10, 100, "exam")]), 85);
});
