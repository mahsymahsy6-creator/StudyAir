import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluate3DayStreakFreezeAward,
  evaluateDailyLuckyFreezeDrop,
  autoProtectMissedYesterday,
  calculateStreak,
  deriveStudyDay,
  MAX_STREAK_FREEZES,
} from "../studyStreakEngine";
import { Task, TimetableEntry } from "../../types";

const STANDARD_TIMETABLE: TimetableEntry[] = [
  { id: "e-1", weekday: 1, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-2", weekday: 2, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-3", weekday: 3, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-4", weekday: 4, periodNumber: 1, subjectId: "sub-1", kind: "class" },
  { id: "e-5", weekday: 5, periodNumber: 1, subjectId: "sub-1", kind: "class" },
];

test("evaluate3DayStreakFreezeAward awards 1 freeze every 3 consecutive days capped at MAX", () => {
  // Streak 2: Not yet 3 days
  const r1 = evaluate3DayStreakFreezeAward(2, 0, 0);
  assert.equal(r1.shouldAward, false);
  assert.equal(r1.newFreezeCount, 0);

  // Streak 3: Hits 3 days in a row!
  const r2 = evaluate3DayStreakFreezeAward(3, 0, 0);
  assert.equal(r2.shouldAward, true);
  assert.equal(r2.newAwardedStreak, 1);
  assert.equal(r2.newFreezeCount, 1);

  // Streak 4: Already awarded for milestone 1 (3 days)
  const r3 = evaluate3DayStreakFreezeAward(4, 1, 1);
  assert.equal(r3.shouldAward, false);
  assert.equal(r3.newFreezeCount, 1);

  // Streak 6: Hits second 3-day interval (6 days in a row)
  const r4 = evaluate3DayStreakFreezeAward(6, 1, 1);
  assert.equal(r4.shouldAward, true);
  assert.equal(r4.newAwardedStreak, 2);
  assert.equal(r4.newFreezeCount, 2);

  // Streak 9: Hits third interval, but already at max 2 freezes
  const r5 = evaluate3DayStreakFreezeAward(9, 2, 2);
  assert.equal(r5.shouldAward, true);
  assert.equal(r5.newFreezeCount, MAX_STREAK_FREEZES, "Freeze count must cap at MAX_STREAK_FREEZES (2)");
});

test("evaluateDailyLuckyFreezeDrop awards freeze with chance upon completing a day", () => {
  // Not studied today
  const r1 = evaluateDailyLuckyFreezeDrop(false, "", "2026-11-16", 0, () => 0.1);
  assert.equal(r1.won, false);

  // Already rolled today
  const r2 = evaluateDailyLuckyFreezeDrop(true, "2026-11-16", "2026-11-16", 0, () => 0.1);
  assert.equal(r2.won, false);

  // Lucky roll (< 0.35)
  const r3 = evaluateDailyLuckyFreezeDrop(true, "", "2026-11-16", 0, () => 0.2);
  assert.equal(r3.won, true);
  assert.equal(r3.newFreezeCount, 1);
  assert.equal(r3.newCheckDate, "2026-11-16");

  // Unlucky roll (>= 0.35)
  const r4 = evaluateDailyLuckyFreezeDrop(true, "", "2026-11-16", 0, () => 0.5);
  assert.equal(r4.won, false);
  assert.equal(r4.newFreezeCount, 0);

  // Lucky roll, but inventory full (2/2)
  const r5 = evaluateDailyLuckyFreezeDrop(true, "", "2026-11-16", MAX_STREAK_FREEZES, () => 0.1);
  assert.equal(r5.won, false, "Must not award when inventory is already at maximum capacity");
  assert.equal(r5.newFreezeCount, MAX_STREAK_FREEZES);
});

test("autoProtectMissedYesterday consumes 1 freeze to save missed school day", () => {
  // Yesterday was a missed school day with 1 freeze available
  const r1 = autoProtectMissedYesterday({
    yesterdayStr: "2026-11-13",
    yesterdayRequired: true,
    yesterdayStudied: false,
    frozenDates: [],
    freezeCount: 1,
  });
  assert.equal(r1.consumed, true);
  assert.equal(r1.newFreezeCount, 0);
  assert.deepEqual(r1.newFrozenDates, ["2026-11-13"]);

  // Yesterday was studied: no freeze needed
  const r2 = autoProtectMissedYesterday({
    yesterdayStr: "2026-11-13",
    yesterdayRequired: true,
    yesterdayStudied: true,
    frozenDates: [],
    freezeCount: 1,
  });
  assert.equal(r2.consumed, false);
  assert.equal(r2.newFreezeCount, 1);

  // Yesterday was a free day (weekend): no freeze consumed
  const r3 = autoProtectMissedYesterday({
    yesterdayStr: "2026-11-15",
    yesterdayRequired: false,
    yesterdayStudied: false,
    frozenDates: [],
    freezeCount: 1,
  });
  assert.equal(r3.consumed, false);
  assert.equal(r3.newFreezeCount, 1);

  // Yesterday was missed, but user has 0 freezes
  const r4 = autoProtectMissedYesterday({
    yesterdayStr: "2026-11-13",
    yesterdayRequired: true,
    yesterdayStudied: false,
    frozenDates: [],
    freezeCount: 0,
  });
  assert.equal(r4.consumed, false);
});

test("calculateStreak preserves streak across a frozen missed school day", () => {
  const BASE_TODAY = "2026-10-26"; // Senin
  // Studied Thursday (2026-10-22). Missed Friday (2026-10-23, required).
  const tasks: Task[] = [
    {
      id: "t-thu",
      subjectId: "sub-1",
      status: "COMPLETED",
      createdAt: "2026-10-21T00:00:00Z",
      completedAt: "2026-10-22T10:00:00Z",
    },
  ];

  // WITHOUT freeze: streak is broken to 0
  const brokenState = calculateStreak({
    today: BASE_TODAY,
    tasks,
    timetableEntries: STANDARD_TIMETABLE,
    streakFrozenDates: [],
  });
  assert.equal(brokenState.currentStreak, 0, "Without freeze, missed Friday breaks streak");

  // WITH freeze on Friday (2026-10-23): streak is saved!
  const savedState = calculateStreak({
    today: BASE_TODAY,
    tasks,
    timetableEntries: STANDARD_TIMETABLE,
    streakFrozenDates: ["2026-10-23"],
  });
  assert.equal(savedState.currentStreak, 1, "With freeze, streak across Friday remains intact!");
  assert.equal(savedState.isAtRisk, true, "Monday is not yet studied, so streak is at risk until studied");

  // If today Monday (2026-10-26) is also frozen, isAtRisk becomes false
  const protectedTodayState = calculateStreak({
    today: BASE_TODAY,
    tasks,
    timetableEntries: STANDARD_TIMETABLE,
    streakFrozenDates: ["2026-10-23", "2026-10-26"],
  });
  assert.equal(protectedTodayState.isAtRisk, false, "When today is frozen, streak is not at risk");

  // Verify deriveStudyDay and recentWeekDays mark frozen days
  const friStudyDay = deriveStudyDay("2026-10-23", { streakFrozenDates: ["2026-10-23"] });
  assert.equal(friStudyDay.isFrozen, true, "deriveStudyDay must mark frozen date as isFrozen: true");

  const monDay = protectedTodayState.recentWeekDays.find((d) => d.date === "2026-10-26");
  assert.equal(monDay?.isFrozen, true, "Monday must be marked as isFrozen in recentWeekDays");
});
