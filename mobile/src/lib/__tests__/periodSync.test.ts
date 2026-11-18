import test from "node:test";
import assert from "node:assert";
import { PeriodTime, Task } from "../../types";
import { buildSchedule } from "../../engine/schedulerEngine";

const DEFAULT_PERIODS: PeriodTime[] = [
  { periodNumber: 1, start: "07:00", end: "07:45" },
  { periodNumber: 2, start: "07:45", end: "08:30" },
  { periodNumber: 3, start: "08:30", end: "09:15" },
  { periodNumber: 4, start: "09:30", end: "10:15" },
  { periodNumber: 5, start: "10:15", end: "11:00" },
  { periodNumber: 6, start: "11:00", end: "11:45" },
  { periodNumber: 7, start: "12:30", end: "13:15" },
  { periodNumber: 8, start: "13:15", end: "14:00" },
];

// Helper replicating two-pass grid period resolution
function resolveManualGridPeriods(
  times: PeriodTime[],
  selectedGridDay: number
): PeriodTime[] {
  if (!times || times.length === 0) return DEFAULT_PERIODS;
  const defaultPeriods = times.filter((p) => !p.weekday || p.weekday === 0);
  const daySpecific = times.filter((p) => p.weekday === selectedGridDay);

  const periodMap = new Map<number, PeriodTime>();
  for (const p of defaultPeriods) {
    periodMap.set(p.periodNumber, p);
  }
  for (const p of daySpecific) {
    periodMap.set(p.periodNumber, p);
  }
  return Array.from(periodMap.values()).sort((a, b) => a.periodNumber - b.periodNumber);
}

test("resolveManualGridPeriods resolves all 10 periods configured in settings", () => {
  const tenPeriods: PeriodTime[] = [
    { periodNumber: 1, start: "07:00", end: "07:45" },
    { periodNumber: 2, start: "07:45", end: "08:30" },
    { periodNumber: 3, start: "08:30", end: "09:15" },
    { periodNumber: 4, start: "09:15", end: "10:00" },
    { periodNumber: 5, start: "10:30", end: "11:15" },
    { periodNumber: 6, start: "11:15", end: "12:00" },
    { periodNumber: 7, start: "12:30", end: "13:15" },
    { periodNumber: 8, start: "13:15", end: "14:00" },
    { periodNumber: 9, start: "14:00", end: "14:45" },
    { periodNumber: 10, start: "14:45", end: "15:30" },
  ];

  const resolvedSenin = resolveManualGridPeriods(tenPeriods, 1);
  assert.strictEqual(resolvedSenin.length, 10);
  assert.strictEqual(resolvedSenin[8].periodNumber, 9);
  assert.strictEqual(resolvedSenin[9].periodNumber, 10);
  assert.strictEqual(resolvedSenin[9].start, "14:45");
  assert.strictEqual(resolvedSenin[9].end, "15:30");
});

test("resolveManualGridPeriods respects day-specific override bell times without dropping base count", () => {
  const baseTen: PeriodTime[] = Array.from({ length: 10 }, (_, i) => ({
    periodNumber: i + 1,
    start: `0${i + 7}:00`,
    end: `0${i + 7}:45`,
  }));

  // Friday override: Jam 1 starts at 07:15
  const fridayOverride: PeriodTime = {
    periodNumber: 1,
    start: "07:15",
    end: "08:00",
    weekday: 5,
  };

  const resolvedFriday = resolveManualGridPeriods([...baseTen, fridayOverride], 5);
  assert.strictEqual(resolvedFriday.length, 10);
  assert.strictEqual(resolvedFriday[0].start, "07:15");
  assert.strictEqual(resolvedFriday[9].periodNumber, 10);
});

test("buildSchedule with allowOverdue: true schedules overdue tasks instead of rejecting them", () => {
  const overdueTask: Task = {
    id: "task-overdue-1",
    title: "Tugas Matematika Bab 7",
    subjectId: "sub-1",
    deadlineDate: "2026-10-26", // past deadline compared to 2026-11-17
    estimatedMinutes: 30,
    status: "pending",
  };

  // Without allowOverdue: rejected as ALREADY_PAST_DEADLINE
  const strictResult = buildSchedule({
    tasks: [overdueTask],
    busyBlocks: [],
    prefs: {
      dailyStudyMinutes: 120,
      weekdayStudyWindows: [{ start: "16:00", end: "18:00" }],
      weekendStudyWindows: [{ start: "09:00", end: "12:00" }],
    },
    referenceDate: "2026-11-17",
    allowOverdue: false,
  });
  assert.strictEqual(strictResult.blocks.length, 0);
  assert.strictEqual(strictResult.unallocated.length, 1);
  assert.strictEqual(strictResult.unallocated[0].reason, "ALREADY_PAST_DEADLINE");

  // With allowOverdue: true (used by CreateScheduleSheet)
  const rescheduleResult = buildSchedule({
    tasks: [overdueTask],
    busyBlocks: [],
    prefs: {
      dailyStudyMinutes: 120,
      weekdayStudyWindows: [{ start: "16:00", end: "18:00" }],
      weekendStudyWindows: [{ start: "09:00", end: "12:00" }],
    },
    referenceDate: "2026-11-17",
    allowOverdue: true,
  });
  assert.strictEqual(rescheduleResult.blocks.length, 1);
  assert.strictEqual(rescheduleResult.blocks[0].taskId, "task-overdue-1");
  assert.strictEqual(rescheduleResult.blocks[0].date, "2026-11-17");
});
