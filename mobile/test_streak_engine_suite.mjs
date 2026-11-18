/**
 * Comprehensive Unit Test Suite for Study Streak Engine
 * 
 * Verifies:
 * 1. Focus session anti-cheat (< 10 min disqualified)
 * 2. Focus session >= 10 min counted, >= 15 min earns day
 * 3. Task anti-cheat (< 2 min between creation and completion disqualified)
 * 4. Normal task completion earns day
 * 5. Free day rule: weekends without classes do NOT break streak
 * 6. Free day rule: holidays (daysOff) do NOT break streak
 * 7. Missed required school day breaks streak to 0
 * 8. Today not yet studied sets isAtRisk = true with past streak intact
 * 9. Fallback rule: empty timetable makes all days required
 * 10. Setting rule: countEveryDay = true requires all days
 * 11. Milestones: active milestone, next milestone, and progress percentage
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  deriveStudyDay,
  calculateStreak,
  isTaskAntiCheatDisqualified,
  STREAK_MILESTONES,
} = require("./dist-test/lib/studyStreakEngine.js");

console.log("==================================================");
console.log("   STUDYAIR STUDY STREAK ENGINE TEST SUITE");
console.log("==================================================");

const BASE_TODAY = "2026-10-26"; // Senin, 26 Okt 2026

// Standard timetable: Mon to Fri has classes (weekday 1 to 5), Sat/Sun empty (weekday 6 and 7)
const STANDARD_TIMETABLE = [
  { id: "e-1", weekday: 1, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-2", weekday: 2, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-3", weekday: 3, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-4", weekday: 4, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-5", weekday: 5, periodNumber: 1, subjectId: "sub-1", kind: "class" },
];

// 1. Focus session anti-cheat: < 10 mins disqualified
{
  const focusLogs = [
    {
      id: "f-1",
      scheduled_block_id: "b-1",
      user_id: "u-1",
      planned_minutes: 25,
      actual_minutes: 8, // < 10 min -> disqualified!
      timer_mode: "POMODORO",
      pomodoro_count: 0,
      started_at: "2026-10-26T08:00:00Z",
      ended_at: "2026-10-26T08:08:00Z",
    },
  ];
  const day = deriveStudyDay(BASE_TODAY, { focusLogs, timetableEntries: STANDARD_TIMETABLE });
  assert.equal(day.minutes, 0, "Focus < 10 mins must yield 0 counted minutes");
  assert.equal(day.hasStudied, false, "Should not earn day with 8 min focus");
  console.log("  ✓ 1. Focus session anti-cheat: < 10 mins disqualified");
}

// 2. Focus session >= 10 min counted, >= 15 min earns day
{
  const focusLogs = [
    {
      id: "f-2",
      scheduled_block_id: "b-2",
      user_id: "u-1",
      planned_minutes: 25,
      actual_minutes: 20, // >= 15 min -> earns day!
      timer_mode: "POMODORO",
      pomodoro_count: 1,
      started_at: "2026-10-26T09:00:00Z",
      ended_at: "2026-10-26T09:20:00Z",
    },
  ];
  const day = deriveStudyDay(BASE_TODAY, { focusLogs, timetableEntries: STANDARD_TIMETABLE });
  assert.equal(day.minutes, 20);
  assert.equal(day.hasStudied, true, "Focus >= 15 mins earns the day");
  console.log("  ✓ 2. Focus session >= 15 mins properly earns study day");
}

// 3. Task anti-cheat: completed < 2 mins after creation disqualified
{
  const fastTask = {
    id: "task-1",
    subjectId: "sub-1",
    title: "Cheat Task",
    type: "homework",
    givenDate: "2026-10-26",
    deadlineDate: "2026-10-26",
    deadlineMode: "custom",
    status: "COMPLETED",
    createdAt: "2026-10-26T10:00:00Z",
    completedAt: "2026-10-26T10:01:00Z", // 60 seconds later!
  };
  assert.equal(isTaskAntiCheatDisqualified(fastTask), true, "Task completed in 60s must be disqualified");

  const day = deriveStudyDay(BASE_TODAY, { tasks: [fastTask], timetableEntries: STANDARD_TIMETABLE });
  assert.equal(day.tasksCompleted, 0, "Disqualified task must not count in tasksCompleted");
  assert.equal(day.hasStudied, false, "Disqualified task must not earn study day");
  console.log("  ✓ 3. Task anti-cheat: completed in < 2 mins disqualified");
}

// 4. Normal task completion earns day
{
  const normalTask = {
    id: "task-2",
    subjectId: "sub-1",
    title: "Real Homework",
    type: "homework",
    givenDate: "2026-10-25",
    deadlineDate: "2026-10-26",
    deadlineMode: "custom",
    status: "COMPLETED",
    createdAt: "2026-10-25T14:00:00Z",
    completedAt: "2026-10-26T08:30:00Z", // ~18 hours later
  };
  assert.equal(isTaskAntiCheatDisqualified(normalTask), false);

  const day = deriveStudyDay(BASE_TODAY, { tasks: [normalTask], timetableEntries: STANDARD_TIMETABLE });
  assert.equal(day.tasksCompleted, 1);
  assert.equal(day.hasStudied, true);
  console.log("  ✓ 4. Normal task completion earns study day");
}

// 5. Free day rule: weekend without classes does NOT break streak
{
  // Setup: Studied Friday (2026-10-23).
  // Saturday (2026-10-24) & Sunday (2026-10-25) had NO classes and NO study.
  // Today is Monday (2026-10-26) and student studied today!
  const tasks = [
    {
      id: "t-fri",
      subjectId: "sub-1",
      title: "Friday task",
      status: "COMPLETED",
      createdAt: "2026-10-22T10:00:00Z",
      completedAt: "2026-10-23T15:00:00Z",
    },
    {
      id: "t-mon",
      subjectId: "sub-1",
      title: "Monday task",
      status: "COMPLETED",
      createdAt: "2026-10-25T10:00:00Z",
      completedAt: "2026-10-26T10:00:00Z",
    },
  ];
  const state = calculateStreak({
    today: BASE_TODAY,
    tasks,
    timetableEntries: STANDARD_TIMETABLE,
  });

  // Friday = 1 day, Sat = free, Sun = free, Mon = 1 day -> total streak = 2!
  assert.equal(state.currentStreak, 2, "Streak across weekend should be 2, not broken");
  assert.equal(state.todayStudied, true);
  assert.equal(state.isAtRisk, false);
  console.log("  ✓ 5. Free day rule: weekend without classes does NOT break streak");
}

// 6. Free day rule: holiday (daysOff) does NOT break streak
{
  // Setup: Studied Tuesday (2026-10-20), Wednesday (2026-10-21).
  // Thursday (2026-10-22) is marked as DayOff (Holiday) and student didn't study.
  // Studied Friday (2026-10-23) and Monday (2026-10-26).
  const daysOff = [{ id: "do-1", date: "2026-10-22", reason: "Hari Libur Nasional" }];
  const tasks = [
    { id: "t-tue", subjectId: "s", status: "COMPLETED", createdAt: "2026-10-19T00:00:00Z", completedAt: "2026-10-20T10:00:00Z" },
    { id: "t-wed", subjectId: "s", status: "COMPLETED", createdAt: "2026-10-19T00:00:00Z", completedAt: "2026-10-21T10:00:00Z" },
    { id: "t-fri", subjectId: "s", status: "COMPLETED", createdAt: "2026-10-19T00:00:00Z", completedAt: "2026-10-23T10:00:00Z" },
    { id: "t-mon", subjectId: "s", status: "COMPLETED", createdAt: "2026-10-19T00:00:00Z", completedAt: "2026-10-26T10:00:00Z" },
  ];
  const state = calculateStreak({
    today: BASE_TODAY,
    tasks,
    daysOff,
    timetableEntries: STANDARD_TIMETABLE,
  });
  // Tue (1) + Wed (2) + Thu (free) + Fri (3) + Sat/Sun (free) + Mon (4) = 4!
  assert.equal(state.currentStreak, 4, "Streak across holiday & weekend should be 4");
  console.log("  ✓ 6. Free day rule: holiday (daysOff) does NOT break streak");
}

// 7. Missed required school day breaks streak to 0
{
  // Setup: Studied Thursday (2026-10-22). Missed Friday (2026-10-23) which is required school day.
  // Today Monday not yet studied.
  const tasks = [
    { id: "t-thu", subjectId: "s", status: "COMPLETED", createdAt: "2026-10-21T00:00:00Z", completedAt: "2026-10-22T10:00:00Z" },
  ];
  const state = calculateStreak({
    today: BASE_TODAY,
    tasks,
    timetableEntries: STANDARD_TIMETABLE,
  });
  assert.equal(state.currentStreak, 0, "Missed Friday broke the streak");
  assert.equal(state.isAtRisk, false, "Streak already lost on Friday");
  console.log("  ✓ 7. Missed required school day breaks streak to 0");
}

// 8. Today not yet studied sets isAtRisk = true with past streak intact
{
  // Setup: Studied Friday (2026-10-23). Sat/Sun free. Monday today: NOT studied yet.
  const tasks = [
    { id: "t-fri", subjectId: "s", status: "COMPLETED", createdAt: "2026-10-22T00:00:00Z", completedAt: "2026-10-23T10:00:00Z" },
  ];
  const state = calculateStreak({
    today: BASE_TODAY,
    tasks,
    timetableEntries: STANDARD_TIMETABLE,
  });
  assert.equal(state.currentStreak, 1, "Past streak of 1 remains intact during Monday");
  assert.equal(state.todayStudied, false);
  assert.equal(state.isAtRisk, true, "Flame must be at-risk (terancam) until student studies");
  console.log("  ✓ 8. Today not yet studied sets isAtRisk = true while retaining streak");
}

// 9. Fallback rule: empty timetable makes all days required
{
  // Today is Sunday 2026-10-25. No timetable imported.
  const day = deriveStudyDay("2026-10-25", { timetableEntries: [] });
  assert.equal(day.isRequiredDay, true, "Empty timetable fallback must require all days");
  console.log("  ✓ 9. Fallback rule: empty timetable makes all days required");
}

// 10. Setting rule: countEveryDay = true requires weekends
{
  // Saturday 2026-10-24 with timetable present
  const day = deriveStudyDay("2026-10-24", {
    timetableEntries: STANDARD_TIMETABLE,
    countEveryDay: true,
  });
  assert.equal(day.isRequiredDay, true, "countEveryDay = true forces Saturday to be required");
  console.log("  ✓ 10. Setting rule: countEveryDay = true requires weekends");
}

// 11. Milestones: active milestone, next milestone, and progress percentage
{
  // Setup: 5-day streak
  const tasks = [];
  for (let d = 0; d < 5; d++) {
    // 5 days up to today
    const dt = new Date(2026, 9, 26 - d);
    const dtStr = dt.toISOString().slice(0, 10);
    tasks.push({
      id: `t-${d}`,
      subjectId: "s",
      status: "COMPLETED",
      createdAt: `${dtStr}T06:00:00Z`,
      completedAt: `${dtStr}T10:00:00Z`,
    });
  }
  const state = calculateStreak({
    today: BASE_TODAY,
    tasks,
    countEveryDay: true,
  });
  assert.equal(state.currentStreak, 5);
  assert.equal(state.activeMilestone.days, 3);
  assert.equal(state.activeMilestone.title, "Percikan Pertama");
  assert.equal(state.nextMilestone.days, 7);
  assert.equal(state.nextMilestone.title, "Api Membara");
  assert.equal(state.daysToNextMilestone, 2); // 7 - 5 = 2
  // Progress from 3 to 7: (5 - 3) / (7 - 3) = 2 / 4 = 50%
  assert.equal(state.milestoneProgressPercent, 50);
  console.log("  ✓ 11. Milestones: active (3d), next (7d, 2 days left), and 50% progress");
}

// 12. Streak Simulator & Debug Overrides
{
  const simulateStreakLogs = (targetDays, anchorDate) => {
    const logs = [];
    const base = new Date(anchorDate);
    for (let i = 0; i < targetDays; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      logs.push({
        id: `log-${i}`,
        scheduled_block_id: `b-${i}`,
        user_id: "u1",
        planned_minutes: 25,
        actual_minutes: 25,
        timer_mode: "POMODORO",
        pomodoro_count: 1,
        started_at: d.toISOString(),
        ended_at: d.toISOString(),
      });
    }
    return logs;
  };

  // Test 14-day simulation
  const simLogs14 = simulateStreakLogs(14, BASE_TODAY);
  const state14 = calculateStreak({
    today: BASE_TODAY,
    focusLogs: simLogs14,
    countEveryDay: true,
  });
  assert.equal(state14.currentStreak, 14, "Simulated 14 days should yield 14 currentStreak");
  assert.equal(state14.activeMilestone.days, 14);
  assert.equal(state14.activeMilestone.tier, "silver");

  // Test debug state override merging
  const debugOverride = { currentStreak: 60, isAtRisk: true, todayStudied: false };
  const overriddenState = { ...state14, ...debugOverride };
  assert.equal(overriddenState.currentStreak, 60);
  assert.equal(overriddenState.isAtRisk, true);
  assert.equal(overriddenState.todayStudied, false);

  console.log("  ✓ 12. Streak Simulator: 14d logs yield 14-day streak and debug overrides merge properly");
}

console.log("==================================================");
console.log("   ALL 12 STREAK ENGINE & DEBUG TESTS PASSED");
console.log("==================================================");

