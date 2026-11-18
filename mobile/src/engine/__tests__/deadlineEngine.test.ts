import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateNextClassDeadline,
  getWeekPatternForDate,
  recalculateDynamicTaskDeadlines,
} from "../deadlineEngine.ts";
import { parseIndonesianDateHint } from "../dateHintParser.ts";
import type { TimetableEntry, DayOff, Override } from "../../types.ts";

const mockTimetable: TimetableEntry[] = [
  // Math meets on Monday (P1) and Thursday (P2)
  {
    id: "tt-1",
    subjectId: "sub-math",
    weekday: 1, // Monday
    periodNumber: 1,
    weekPattern: "every",
  },
  {
    id: "tt-2",
    subjectId: "sub-math",
    weekday: 4, // Thursday
    periodNumber: 2,
    weekPattern: "every",
  },
  // English meets only on Friday (P3)
  {
    id: "tt-3",
    subjectId: "sub-english",
    weekday: 5, // Friday
    periodNumber: 3,
    weekPattern: "every",
  },
  // Chemistry meets on Tuesday, Week A only
  {
    id: "tt-4",
    subjectId: "sub-chem",
    weekday: 2, // Tuesday
    periodNumber: 1,
    weekPattern: "A",
  },
  // Physics meets on Tuesday, Week B only
  {
    id: "tt-5",
    subjectId: "sub-phys",
    weekday: 2, // Tuesday
    periodNumber: 1,
    weekPattern: "B",
  },
];

test("1. Basic next-class deadline calculation", () => {
  // Given on Monday (2026-10-19): Next Math class is Thursday (2026-10-22)
  const result = calculateNextClassDeadline("sub-math", "2026-10-19", mockTimetable);
  assert.equal(result.found, true);
  assert.equal(result.deadlineDate, "2026-10-22");
  assert.equal(result.weekday, 4); // Thursday
  assert.equal(result.periodNumber, 2);
});

test("2. Wrap-around to following week", () => {
  // Given on Friday (2026-10-23): Next Math class is following Monday (2026-10-26)
  const result = calculateNextClassDeadline("sub-math", "2026-10-23", mockTimetable);
  assert.equal(result.found, true);
  assert.equal(result.deadlineDate, "2026-10-26");
  assert.equal(result.weekday, 1); // Monday
});

test("3. DayOff / Holiday calendar exception", () => {
  // Given on Monday (2026-10-19), but Thursday (2026-10-22) is a National Holiday
  const daysOff: DayOff[] = [{ date: "2026-10-22", reason: "Hari Santri Nasional" }];
  const result = calculateNextClassDeadline("sub-math", "2026-10-19", mockTimetable, { daysOff });
  
  // Should skip Thursday and find following Monday (2026-10-26)
  assert.equal(result.found, true);
  assert.equal(result.deadlineDate, "2026-10-26");
  assert.equal(result.weekday, 1);
});

test("4. One-time schedule overrides (cancelled & added)", () => {
  // Cancel the Monday Oct 26 class
  const overrides: Override[] = [
    {
      date: "2026-10-26",
      entryId: "tt-1",
      type: "cancelled",
    },
  ];
  // Given Friday Oct 23, Monday Oct 26 is cancelled -> next Math is Thursday Oct 29
  const res1 = calculateNextClassDeadline("sub-math", "2026-10-23", mockTimetable, { overrides });
  assert.equal(res1.deadlineDate, "2026-10-29");

  // An added replacement session on Wednesday Oct 28
  const addedOverrides: Override[] = [
    {
      date: "2026-10-28",
      entryId: "custom-add",
      type: "added",
      newSubjectId: "sub-math",
    },
  ];
  // Given Monday Oct 26: next regular is Thursday Oct 29, but added session on Wednesday Oct 28
  const res2 = calculateNextClassDeadline("sub-math", "2026-10-26", mockTimetable, { overrides: addedOverrides });
  assert.equal(res2.deadlineDate, "2026-10-28");
});

test("5. Multi-class offset ('afterNClasses')", () => {
  // Given on Monday Oct 19: Math has classes on Thu Oct 22 (1st) and Mon Oct 26 (2nd)
  const result = calculateNextClassDeadline("sub-math", "2026-10-19", mockTimetable, { afterNClasses: 2 });
  assert.equal(result.found, true);
  assert.equal(result.deadlineDate, "2026-10-26");
  assert.equal(result.classNumber, 2);
});

test("6. Week A / B alternating schedule resolution", () => {
  // Reference anchor: 2026-10-19 is Week A Monday
  const refDate = "2026-10-19";
  // Tuesday 2026-10-20 is Week A -> Chemistry meets
  const chemRes = calculateNextClassDeadline("sub-chem", "2026-10-19", mockTimetable, {
    weekPatternReferenceDate: refDate,
  });
  assert.equal(chemRes.found, true);
  assert.equal(chemRes.deadlineDate, "2026-10-20");

  // Physics meets on Week B -> Should skip 2026-10-20 and find next week Tuesday 2026-10-27
  const physRes = calculateNextClassDeadline("sub-phys", "2026-10-19", mockTimetable, {
    weekPatternReferenceDate: refDate,
  });
  assert.equal(physRes.found, true);
  assert.equal(physRes.deadlineDate, "2026-10-27");
});

test("7. Fallback when no session within 60 days", () => {
  // Ghost subject not in timetable
  const result = calculateNextClassDeadline("sub-ghost", "2026-10-19", mockTimetable);
  assert.equal(result.found, false);
  assert.equal(result.reason, "NO_TIMETABLE_FOR_SUBJECT");
});

test("8. Indonesian Date Hint NLP Parser", () => {
  const ref = new Date("2026-10-23T08:00:00"); // Friday Oct 23, 2026

  // Besok -> 2026-10-24
  const hint1 = parseIndonesianDateHint("PR Matematika kumpul besok ya", ref);
  assert.ok(hint1);
  assert.equal(hint1?.suggestedDate, "2026-10-24");

  // Lusa -> 2026-10-25
  const hint2 = parseIndonesianDateHint("Tugas Biologi lusa", ref);
  assert.ok(hint2);
  assert.equal(hint2?.suggestedDate, "2026-10-25");

  // Minggu depan -> 2026-10-30 (+7 days)
  const hint3 = parseIndonesianDateHint("Presentasi kelompok minggu depan", ref);
  assert.ok(hint3);
  assert.equal(hint3?.suggestedDate, "2026-10-30");

  // Senin depan -> 2026-11-02 (next week's Monday)
  const hint4 = parseIndonesianDateHint("Kuis kimia senin depan", ref);
  assert.ok(hint4);
  assert.equal(hint4?.suggestedDate, "2026-11-02");

  // Hari rabu -> upcoming Wednesday 2026-10-28
  const hint5 = parseIndonesianDateHint("Ujian hari rabu", ref);
  assert.ok(hint5);
  assert.equal(hint5?.suggestedDate, "2026-10-28");

  // Tanggal eksplisit -> 2026-10-28
  const hint6 = parseIndonesianDateHint("Deadline tgl 28 oktober 2026", ref);
  assert.ok(hint6);
  assert.equal(hint6?.suggestedDate, "2026-10-28");

  // Plain text without date -> null
  const hint7 = parseIndonesianDateHint("Kerjakan halaman 42 latihan 3", ref);
  assert.equal(hint7, null);
});
