/**
 * StudyAir Mobile — Task statistics for the Statistik tab.
 * Pure functions: counts of finished tasks, heatmap grid, and task grade average.
 */

import { addDays, format, isValid, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { Grade, Task } from "../types";

export interface TaskDoneStats {
  today: number;
  week: number; // since Monday
  month: number; // since the 1st
  dailyCounts: Record<string, number>; // "YYYY-MM-DD" (local) -> tasks finished that day
  tasksByDay: Record<string, Task[]>; // "YYYY-MM-DD" (local) -> tasks finished that day
}

export function computeTaskDoneStats(tasks: Task[], now: Date = new Date()): TaskDoneStats {
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStr = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStr = format(startOfMonth(now), "yyyy-MM-dd");
  const dailyCounts: Record<string, number> = {};
  const tasksByDay: Record<string, Task[]> = {};
  let today = 0;
  let week = 0;
  let month = 0;

  for (const task of tasks) {
    if (task.status !== "COMPLETED" || !task.completedAt) continue;
    const doneAt = parseISO(task.completedAt);
    if (!isValid(doneAt)) continue;
    const day = format(doneAt, "yyyy-MM-dd"); // local calendar day
    if (day > todayStr) continue;
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    if (!tasksByDay[day]) tasksByDay[day] = [];
    tasksByDay[day].push(task);
    if (day === todayStr) today++;
    if (day >= weekStr) week++;
    if (day >= monthStr) month++;
  }

  return { today, week, month, dailyCounts, tasksByDay };
}

/**
 * Columns of weeks (Mon..Sun), oldest first, ending with the current week.
 * Days after `now` are null so the grid stops at today.
 */
export function buildHeatmapWeeks(weeks: number, now: Date = new Date()): (string | null)[][] {
  const todayStr = format(now, "yyyy-MM-dd");
  const firstMonday = addDays(startOfWeek(now, { weekStartsOn: 1 }), -7 * (weeks - 1));
  const grid: (string | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = format(addDays(firstMonday, w * 7 + d), "yyyy-MM-dd");
      column.push(day > todayStr ? null : day);
    }
    grid.push(column);
  }
  return grid;
}

/** 0 = nothing, 1..4 = more tasks finished that day. */
export function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count >= 4) return 4;
  return count as 1 | 2 | 3;
}

/** Average of assignment ("tugas") grades on a 0-100 scale, or null when there are none. */
export function averageTaskScore(grades: Grade[]): number | null {
  const scored = grades.filter((g) => g.category === "assignment" && g.maxScore > 0);
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0);
  return Math.round((total / scored.length) * 10) / 10;
}
