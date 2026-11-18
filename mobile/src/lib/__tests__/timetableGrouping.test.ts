/**
 * Unit Tests for Timetable Grouping Logic (Step 1)
 * 
 * Verifies:
 * 1. Sorting by period number.
 * 2. Breaks and events placed chronologically by time within the day (breaks not counted as classes).
 * 3. Empty days handling and manual day addition.
 * 4. Sunday (weekday 7, week starts on Monday, language-aware naming).
 * 5. A/B week pattern detection and filtering.
 * 6. Automatic detection of Mon-Fri vs Mon-Sat vs Mon-Sun schedules.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  groupTimetableByDay,
  detectSchoolWeek,
  checkHasWeekPatternAB,
  timeToMinutes,
  minutesToTime,
} from "../timetableGrouping";
import { TimetableEntry, PeriodTime } from "../../types";

const mockPeriodTimes: PeriodTime[] = [
  { periodNumber: 1, start: "07:00", end: "07:45" },
  { periodNumber: 2, start: "07:45", end: "08:30" },
  { periodNumber: 3, start: "08:30", end: "09:15" },
  { periodNumber: 4, start: "09:45", end: "10:30" },
  { periodNumber: 5, start: "10:30", end: "11:15" },
  { periodNumber: 6, start: "11:15", end: "12:00" },
  { periodNumber: 7, start: "12:45", end: "13:30" },
  { periodNumber: 8, start: "13:30", end: "14:15" },
];

test("1. Sorting by period number within a day", () => {
  const entries: TimetableEntry[] = [
    { id: "e4", subjectId: "hist", weekday: 1, periodNumber: 4, weekPattern: "every" },
    { id: "e1", subjectId: "math", weekday: 1, periodNumber: 1, weekPattern: "every" },
    { id: "e3", subjectId: "eng", weekday: 1, periodNumber: 3, weekPattern: "every" },
    { id: "e2", subjectId: "phys", weekday: 1, periodNumber: 2, weekPattern: "every" },
  ];

  const result = groupTimetableByDay(entries, { periodTimes: mockPeriodTimes });

  assert.equal(result.days.length, 1);
  const monday = result.days[0];
  assert.equal(monday.day, 1);
  assert.equal(monday.dayName, "Senin"); // default id
  assert.equal(monday.classCount, 4);
  assert.equal(monday.breakCount, 0);
  assert.equal(monday.eventCount, 0);

  // Verify sorted order of period numbers: 1, 2, 3, 4
  const periods = monday.entries.map((e) => e.periodNumber);
  assert.deepEqual(periods, [1, 2, 3, 4]);
  assert.equal(monday.entries[0].id, "e1");
  assert.equal(monday.entries[1].id, "e2");
  assert.equal(monday.entries[2].id, "e3");
  assert.equal(monday.entries[3].id, "e4");
});

test("2. Breaks and events are placed chronologically by time within the day", () => {
  const entries: TimetableEntry[] = [
    // Class period 1
    { id: "c1", subjectId: "math", weekday: 1, periodNumber: 1, weekPattern: "every" },
    // Class period 2
    { id: "c2", subjectId: "phys", weekday: 1, periodNumber: 2, weekPattern: "every" },
    // Class period 3
    { id: "c3", subjectId: "bio", weekday: 1, periodNumber: 3, weekPattern: "every" },
    // Morning flag ceremony (event at 06:45)
    {
      id: "ev1",
      subjectId: "",
      weekday: 1,
      periodNumber: 0,
      weekPattern: "every",
      kind: "event",
      customLabel: "Upacara Bendera",
      startTime: "06:45",
      endTime: "07:00",
    },
    // Mid-morning break (break at 09:15 - between Period 3 and Period 4)
    {
      id: "br1",
      subjectId: "",
      weekday: 1,
      periodNumber: 0,
      weekPattern: "every",
      kind: "break",
      customLabel: "Istirahat 1",
      startTime: "09:15",
      endTime: "09:45",
    },
    // Class period 4
    { id: "c4", subjectId: "chem", weekday: 1, periodNumber: 4, weekPattern: "every" },
    // Lunch / Dzuhur prayer break at 12:00
    {
      id: "br2",
      subjectId: "",
      weekday: 1,
      periodNumber: 0,
      weekPattern: "every",
      kind: "break",
      customLabel: "Istirahat Siang & Sholat Dzuhur",
      startTime: "12:00",
      endTime: "12:45",
    },
    // Class period 7
    { id: "c7", subjectId: "geo", weekday: 1, periodNumber: 7, weekPattern: "every" },
  ];

  const result = groupTimetableByDay(entries, {
    periodTimes: mockPeriodTimes,
    language: "id",
  });

  assert.equal(result.days.length, 1);
  const monday = result.days[0];

  // Breaks and events must NOT count towards classCount
  assert.equal(monday.classCount, 5, "Breaks and events must not be counted in classCount");
  assert.equal(monday.breakCount, 2, "Should identify 2 break rows");
  assert.equal(monday.eventCount, 1, "Should identify 1 event row");

  // Verify chronological arrangement:
  // 1. ev1 (06:45 event)
  // 2. c1  (07:00 P1)
  // 3. c2  (07:45 P2)
  // 4. c3  (08:30 P3)
  // 5. br1 (09:15 break)
  // 6. c4  (09:45 P4)
  // 7. br2 (12:00 break)
  // 8. c7  (12:45 P7)
  const orderedIds = monday.entries.map((e) => e.id);
  assert.deepEqual(orderedIds, ["ev1", "c1", "c2", "c3", "br1", "c4", "br2", "c7"]);

  // Header summary verification
  assert.equal(monday.timeRange?.start, "06:45");
  assert.equal(monday.timeRange?.end, "13:30");
  assert.equal(monday.headerSummary, "Senin • 5 kelas • 06:45 - 13:30");
});

test("3. Empty days handling and manual day addition", () => {
  // Case A: completely empty
  const emptyResult = groupTimetableByDay([]);
  assert.equal(emptyResult.days.length, 0);
  assert.equal(emptyResult.detectedSchoolWeek, "empty");
  assert.equal(emptyResult.hasWeekPatternAB, false);

  // Case B: Only Monday and Wednesday have entries
  const entries: TimetableEntry[] = [
    { id: "e1", subjectId: "m1", weekday: 1, periodNumber: 1, weekPattern: "every" },
    { id: "e2", subjectId: "m2", weekday: 3, periodNumber: 2, weekPattern: "every" },
  ];

  const resultB = groupTimetableByDay(entries);
  assert.deepEqual(
    resultB.days.map((d) => d.day),
    [1, 3]
  );
  assert.equal(resultB.days.find((d) => d.day === 2), undefined); // Tuesday omitted

  // Case C: Manual day added (e.g. Tuesday = 2 and Friday = 5)
  const resultC = groupTimetableByDay(entries, { manualDays: [2, 5] });
  assert.deepEqual(
    resultC.days.map((d) => d.day),
    [1, 2, 3, 5]
  );
  const tuesday = resultC.days.find((d) => d.day === 2)!;
  assert.equal(tuesday.entries.length, 0);
  assert.equal(tuesday.classCount, 0);
  assert.equal(tuesday.headerSummary, "Selasa • 0 kelas");
});

test("4. Sunday entry handling (weekday 7, Monday-first ordering, localized naming)", () => {
  const entries: TimetableEntry[] = [
    { id: "sun1", subjectId: "club", weekday: 7, periodNumber: 1, weekPattern: "every" },
    { id: "mon1", subjectId: "math", weekday: 1, periodNumber: 1, weekPattern: "every" },
  ];

  // Test English localization
  const resEn = groupTimetableByDay(entries, { language: "en" });
  assert.equal(resEn.days.length, 2);
  assert.equal(resEn.days[0].day, 1);
  assert.equal(resEn.days[0].dayName, "Monday");
  assert.equal(resEn.days[1].day, 7);
  assert.equal(resEn.days[1].dayName, "Sunday");
  assert.equal(resEn.days[1].dayShort, "Sun");
  assert.equal(resEn.detectedSchoolWeek, "mon-sun");

  // Test Indonesian localization
  const resId = groupTimetableByDay(entries, { language: "id" });
  assert.equal(resId.days[1].dayName, "Minggu");
  assert.equal(resId.days[1].dayShort, "Min");
});

test("5. A/B week pattern detection and filtering", () => {
  const entries: TimetableEntry[] = [
    { id: "all1", subjectId: "math", weekday: 1, periodNumber: 1, weekPattern: "every" },
    { id: "a1", subjectId: "physLab", weekday: 1, periodNumber: 2, weekPattern: "A" },
    { id: "b1", subjectId: "chemLab", weekday: 1, periodNumber: 2, weekPattern: "B" },
  ];

  // Verification of pattern presence
  assert.equal(checkHasWeekPatternAB(entries), true);

  // Group without filter (all entries)
  const resAll = groupTimetableByDay(entries, { activeWeekPattern: "all" });
  assert.equal(resAll.hasWeekPatternAB, true);
  assert.equal(resAll.days[0].entries.length, 3);

  // Filter for Week A: should include 'every' + 'A' (exclude 'B')
  const resA = groupTimetableByDay(entries, { activeWeekPattern: "A" });
  const idsA = resA.days[0].entries.map((e) => e.id);
  assert.deepEqual(idsA, ["all1", "a1"]);

  // Filter for Week B: should include 'every' + 'B' (exclude 'A')
  const resB = groupTimetableByDay(entries, { activeWeekPattern: "B" });
  const idsB = resB.days[0].entries.map((e) => e.id);
  assert.deepEqual(idsB, ["all1", "b1"]);

  // Negative case: standard timetable with only 'every'
  const regularEntries: TimetableEntry[] = [
    { id: "r1", subjectId: "math", weekday: 1, periodNumber: 1, weekPattern: "every" },
    { id: "r2", subjectId: "eng", weekday: 2, periodNumber: 1, weekPattern: "every" },
  ];
  assert.equal(checkHasWeekPatternAB(regularEntries), false);
  const resRegular = groupTimetableByDay(regularEntries);
  assert.equal(resRegular.hasWeekPatternAB, false);
});

test("6. Automatic detection of Mon-Fri vs Mon-Sat schedules", () => {
  // 5-day week (Mon-Fri)
  const monFriEntries: TimetableEntry[] = [
    { id: "d1", subjectId: "math", weekday: 1, periodNumber: 1, weekPattern: "every" },
    { id: "d5", subjectId: "pe", weekday: 5, periodNumber: 1, weekPattern: "every" },
  ];
  assert.equal(detectSchoolWeek(monFriEntries), "mon-fri");

  // 6-day week (Mon-Sat, common in Indonesian SMP/SMA)
  const monSatEntries: TimetableEntry[] = [
    ...monFriEntries,
    { id: "d6", subjectId: "art", weekday: 6, periodNumber: 1, weekPattern: "every" },
  ];
  assert.equal(detectSchoolWeek(monSatEntries), "mon-sat");
});
