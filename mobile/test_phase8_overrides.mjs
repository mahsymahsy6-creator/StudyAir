/**
 * Automated Verification Suite for Phase 8: Days Off & Schedule Overrides
 * 
 * Verifies:
 * 1. Single DayOff handling & schedule exception.
 * 2. Date-Range DayOff creation (multi-day holidays/exam weeks).
 * 3. Single-class Cancellation Override ("cancelled").
 * 4. Single-class Swap Override ("swapped").
 * 5. Single-class Added Override ("added").
 * 6. Dynamic task deadline recalculation with DayOff and Overrides.
 * 7. Next school day resolution after a holiday/weekend.
 */

import assert from "node:assert/strict";

// Mock Data
const mockSubjects = [
  { id: "sub-mtk", title: "Matematika", color: "#3A86FF" },
  { id: "sub-bio", title: "Biologi", color: "#10B981" },
  { id: "sub-fis", title: "Fisika", color: "#8B5CF6" },
  { id: "sub-ing", title: "Bahasa Inggris", color: "#F59E0B" },
];

const mockPeriodTimes = [
  { periodNumber: 1, start: "07:00", end: "07:45" },
  { periodNumber: 2, start: "07:45", end: "08:30" },
  { periodNumber: 3, start: "08:45", end: "09:30" },
];

// Weekly Timetable:
// Monday (1): Period 1 = Matematika, Period 2 = Biologi
// Thursday (4): Period 1 = Matematika, Period 2 = Fisika
const mockTimetable = [
  { id: "tt-mon-1", subjectId: "sub-mtk", weekday: 1, periodNumber: 1, weekPattern: "every" },
  { id: "tt-mon-2", subjectId: "sub-bio", weekday: 1, periodNumber: 2, weekPattern: "every" },
  { id: "tt-thu-1", subjectId: "sub-mtk", weekday: 4, periodNumber: 1, weekPattern: "every" },
  { id: "tt-thu-2", subjectId: "sub-fis", weekday: 4, periodNumber: 2, weekPattern: "every" },
];

// Helper: Pure implementation matching store.getEffectiveScheduleForDate
function getEffectiveSchedule(dateStr, daysOff = [], overrides = [], timetable = mockTimetable, subjects = mockSubjects) {
  const dayOffMatch = daysOff.find((d) => d.date === dateStr);
  if (dayOffMatch) {
    return {
      date: dateStr,
      isDayOff: true,
      dayOffReason: dayOffMatch.reason,
      items: [],
    };
  }

  // Calculate day of week from YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const jsDay = d.getDay();
  const weekday = jsDay === 0 ? 7 : jsDay;

  const regularEntries = timetable.filter((e) => e.weekday === weekday && e.kind !== "break");
  const dateOverrides = overrides.filter((o) => o.date === dateStr);
  const items = [];

  for (const entry of regularEntries) {
    const override = dateOverrides.find((o) => o.entryId === entry.id);
    const sub = subjects.find((s) => s.id === entry.subjectId);
    const periodTime = mockPeriodTimes.find((p) => p.periodNumber === entry.periodNumber);

    if (override?.type === "cancelled") {
      items.push({
        id: entry.id,
        entryId: entry.id,
        periodNumber: entry.periodNumber,
        startTime: periodTime?.start,
        endTime: periodTime?.end,
        subjectId: entry.subjectId,
        subject: sub,
        isOverride: true,
        overrideType: "cancelled",
        customLabel: override.customLabel,
      });
    } else if (override?.type === "swapped" && override.newSubjectId) {
      const swappedSub = subjects.find((s) => s.id === override.newSubjectId);
      items.push({
        id: entry.id,
        entryId: entry.id,
        periodNumber: override.periodNumber || entry.periodNumber,
        startTime: periodTime?.start,
        endTime: periodTime?.end,
        subjectId: override.newSubjectId,
        subject: swappedSub,
        isOverride: true,
        overrideType: "swapped",
        originalSubjectId: entry.subjectId,
        originalSubject: sub,
        customLabel: override.customLabel,
      });
    } else {
      items.push({
        id: entry.id,
        entryId: entry.id,
        periodNumber: entry.periodNumber,
        startTime: periodTime?.start,
        endTime: periodTime?.end,
        subjectId: entry.subjectId,
        subject: sub,
        isOverride: false,
      });
    }
  }

  const addedOverrides = dateOverrides.filter((o) => o.type === "added");
  for (const add of addedOverrides) {
    const sub = add.newSubjectId ? subjects.find((s) => s.id === add.newSubjectId) : undefined;
    const periodNumber = add.periodNumber || 1;
    const periodTime = mockPeriodTimes.find((p) => p.periodNumber === periodNumber);

    items.push({
      id: add.entryId || `added-${dateStr}-${periodNumber}`,
      entryId: add.entryId,
      periodNumber,
      startTime: periodTime?.start,
      endTime: periodTime?.end,
      subjectId: add.newSubjectId || "",
      subject: sub,
      isOverride: true,
      overrideType: "added",
      customLabel: add.customLabel,
    });
  }

  items.sort((a, b) => a.periodNumber - b.periodNumber);

  return {
    date: dateStr,
    isDayOff: false,
    items,
  };
}

// Next Class Deadline Pure Logic
function calculateNextClass(subjectId, givenDateStr, timetable, { daysOff = [], overrides = [] } = {}) {
  const [gy, gm, gd] = givenDateStr.split("-").map(Number);
  const start = new Date(gy, gm - 1, gd);

  for (let offset = 1; offset <= 60; offset++) {
    const checkDate = new Date(start);
    checkDate.setDate(checkDate.getDate() + offset);

    const year = checkDate.getFullYear();
    const month = String(checkDate.getMonth() + 1).padStart(2, "0");
    const day = String(checkDate.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    // Skip DayOff
    if (daysOff.some((d) => d.date === dateStr)) {
      continue;
    }

    const jsDay = checkDate.getDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    const dateOverrides = overrides.filter((o) => o.date === dateStr);

    // Check added overrides
    const addedMatch = dateOverrides.find((o) => o.type === "added" && o.newSubjectId === subjectId);
    if (addedMatch) {
      return { found: true, deadlineDate: dateStr, weekday };
    }

    const dayEntries = timetable.filter((e) => e.weekday === weekday && e.kind !== "break");
    for (const entry of dayEntries) {
      const isCancelled = dateOverrides.some((o) => o.entryId === entry.id && o.type === "cancelled");
      if (isCancelled) continue;

      const swapMatch = dateOverrides.find((o) => o.entryId === entry.id && o.type === "swapped");
      const effectiveSubId = swapMatch ? swapMatch.newSubjectId : entry.subjectId;

      if (effectiveSubId === subjectId) {
        return { found: true, deadlineDate: dateStr, weekday };
      }
    }
  }

  return { found: false };
}

console.log("===============================================================");
console.log("   STUDYAIR — PHASE 8 DAYS OFF & OVERRIDES VERIFICATION SUITE   ");
console.log("===============================================================\n");

// TEST 1: Single DayOff Exception
console.log("Test 1: Single DayOff Exception");
const daysOffTest1 = [{ date: "2026-10-26", reason: "Hari Santri Nasional" }];
const scheduleMon = getEffectiveSchedule("2026-10-26", daysOffTest1);
assert.equal(scheduleMon.isDayOff, true);
assert.equal(scheduleMon.dayOffReason, "Hari Santri Nasional");
assert.equal(scheduleMon.items.length, 0);
console.log("✔ Test 1 Passed: Single DayOff correctly marks day as off with reason.\n");

// TEST 2: Date-Range DayOff Creation
console.log("Test 2: Date-Range DayOff Creation (Ujian Akhir Semester)");
function generateDateRange(startStr, endStr, reason) {
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  const list = [];
  const curr = new Date(start);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, "0");
    const d = String(curr.getDate()).padStart(2, "0");
    list.push({ date: `${y}-${m}-${d}`, reason });
    curr.setDate(curr.getDate() + 1);
  }
  return list;
}

const examRange = generateDateRange("2026-12-14", "2026-12-18", "Ujian Semester (PAS)");
assert.equal(examRange.length, 5);
assert.equal(examRange[0].date, "2026-12-14");
assert.equal(examRange[4].date, "2026-12-18");
assert.equal(examRange.every((d) => d.reason === "Ujian Semester (PAS)"), true);
console.log(`✔ Test 2 Passed: Date range successfully generated ${examRange.length} consecutive holiday dates.\n`);

// TEST 3: Single-Class Cancellation Override ("cancelled")
console.log("Test 3: Single-Class Cancellation Override");
// Monday 2026-10-26 has Matematika (tt-mon-1) and Biologi (tt-mon-2).
// Cancel Matematika session only:
const cancelOverride = [{ date: "2026-10-26", entryId: "tt-mon-1", type: "cancelled" }];
const scheduleCancelled = getEffectiveSchedule("2026-10-26", [], cancelOverride);
assert.equal(scheduleCancelled.isDayOff, false);
assert.equal(scheduleCancelled.items.length, 2);

const mtkItem = scheduleCancelled.items.find((i) => i.id === "tt-mon-1");
const bioItem = scheduleCancelled.items.find((i) => i.id === "tt-mon-2");
assert.equal(mtkItem.isOverride, true);
assert.equal(mtkItem.overrideType, "cancelled");
assert.equal(bioItem.isOverride, false);

// Deadline for Matematika given on Friday 2026-10-23:
// Regular next class would be Monday 2026-10-26.
// Because Monday is cancelled, it MUST automatically advance to Thursday 2026-10-29!
const deadlineCancelled = calculateNextClass("sub-mtk", "2026-10-23", mockTimetable, {
  overrides: cancelOverride,
});
assert.equal(deadlineCancelled.found, true);
assert.equal(deadlineCancelled.deadlineDate, "2026-10-29"); // Thursday!
console.log("✔ Test 3 Passed: Cancelled class reflects in schedule and advances task deadline to next active class (2026-10-29).\n");

// TEST 4: Single-Class Swap Override ("swapped")
console.log("Test 4: Single-Class Swap Override");
// Swap Monday's Period 2 Biologi to Fisika for 2026-10-26:
const swapOverride = [
  { date: "2026-10-26", entryId: "tt-mon-2", type: "swapped", newSubjectId: "sub-fis" },
];
const scheduleSwapped = getEffectiveSchedule("2026-10-26", [], swapOverride);
const swappedItem = scheduleSwapped.items.find((i) => i.entryId === "tt-mon-2");
assert.equal(swappedItem.isOverride, true);
assert.equal(swappedItem.overrideType, "swapped");
assert.equal(swappedItem.subjectId, "sub-fis");
assert.equal(swappedItem.subject.title, "Fisika");
assert.equal(swappedItem.originalSubjectId, "sub-bio");
assert.equal(swappedItem.originalSubject.title, "Biologi");

// A Fisika task given on Friday 2026-10-23:
// Regular next class is Thursday 2026-10-29.
// But with the Monday 2026-10-26 swap, Fisika now meets on Monday!
const deadlineSwapped = calculateNextClass("sub-fis", "2026-10-23", mockTimetable, {
  overrides: swapOverride,
});
assert.equal(deadlineSwapped.found, true);
assert.equal(deadlineSwapped.deadlineDate, "2026-10-26"); // Monday!
console.log("✔ Test 4 Passed: Swapped class renders replacement subject and updates task deadline to swapped date (2026-10-26).\n");

// TEST 5: Single-Class Added Override ("added")
console.log("Test 5: Single-Class Added Override");
// Wednesday 2026-10-28 has no regular classes. Add an extra session for Matematika at Period 3:
const addOverride = [
  {
    date: "2026-10-28",
    entryId: "extra-wed-3",
    type: "added",
    newSubjectId: "sub-mtk",
    periodNumber: 3,
    customLabel: "Jam Tambahan Ujian",
  },
];
const scheduleAdded = getEffectiveSchedule("2026-10-28", [], addOverride);
assert.equal(scheduleAdded.isDayOff, false);
assert.equal(scheduleAdded.items.length, 1);
assert.equal(scheduleAdded.items[0].isOverride, true);
assert.equal(scheduleAdded.items[0].overrideType, "added");
assert.equal(scheduleAdded.items[0].subjectId, "sub-mtk");
assert.equal(scheduleAdded.items[0].periodNumber, 3);
assert.equal(scheduleAdded.items[0].customLabel, "Jam Tambahan Ujian");

// Given Monday 2026-10-26: Regular next Matematika is Thursday 2026-10-29.
// But with added session on Wednesday 2026-10-28, deadline becomes Wednesday!
const deadlineAdded = calculateNextClass("sub-mtk", "2026-10-26", mockTimetable, {
  overrides: addOverride,
});
assert.equal(deadlineAdded.found, true);
assert.equal(deadlineAdded.deadlineDate, "2026-10-28"); // Wednesday!
console.log("✔ Test 5 Passed: Added extra class appears in schedule and pulls forward task deadline to added session (2026-10-28).\n");

// TEST 6: Next School Day Resolution
console.log("Test 6: Next School Day Resolution after Holiday");
// If tomorrow (Sunday 2026-10-25) is off, or Monday 2026-10-26 is a holiday:
const holidayDays = [{ date: "2026-10-26", reason: "Hari Libur Nasional" }];
function findNextSchoolDay(startDateStr, daysOff = [], overrides = []) {
  const [y, m, d] = startDateStr.split("-").map(Number);
  const curr = new Date(y, m - 1, d);
  for (let i = 1; i <= 14; i++) {
    curr.setDate(curr.getDate() + 1);
    const yr = curr.getFullYear();
    const mo = String(curr.getMonth() + 1).padStart(2, "0");
    const da = String(curr.getDate()).padStart(2, "0");
    const testDate = `${yr}-${mo}-${da}`;
    const sch = getEffectiveSchedule(testDate, daysOff, overrides);
    const activeClasses = sch.items.filter((c) => c.overrideType !== "cancelled");
    if (!sch.isDayOff && activeClasses.length > 0) {
      return { date: testDate, classCount: activeClasses.length };
    }
  }
  return null;
}

// Starting from Friday 2026-10-23, Monday 2026-10-26 is a holiday -> next school day with classes is Thursday 2026-10-29:
const nextActive = findNextSchoolDay("2026-10-23", holidayDays);
assert.equal(nextActive.date, "2026-10-29");
assert.equal(nextActive.classCount, 2);
console.log("✔ Test 6 Passed: Automatically finds next active school day skipping holidays and empty weekend days.\n");

console.log("===============================================================");
console.log("   ALL 6 TESTS IN PHASE 8 VERIFICATION SUITE PASSED!           ");
console.log("===============================================================");
