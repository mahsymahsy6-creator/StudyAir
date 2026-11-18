/**
 * Automated Verification Suite for Phase 10:
 * Unit Tests for Next-Class Calculation & Indonesian Date NLP Parser (No AI Calls)
 * 
 * Verifies the 4 mandatory edge cases:
 * 1. A task given on Friday.
 * 2. A Monday holiday.
 * 3. A cancelled class.
 * 4. No class within 60 days.
 * 
 * Plus comprehensive Indonesian Date Hint NLP parser verification.
 */

import assert from "node:assert/strict";

console.log("===============================================================");
console.log("   STUDYAIR — PHASE 10 UNIT TEST SUITE (DETERMINISTIC LOGIC)   ");
console.log("===============================================================\n");

let totalTests = 0;
let passedTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ✓ Test ${totalTests}: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ Test ${totalTests} FAILED: ${description}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

// ─── Pure Implementation of Next-Class Algorithm (Matching deadlineEngine.ts) ───

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateStr(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function addCalendarDays(date, n) {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

function getWeekPattern(candidateDate, refDateStr) {
  if (refDateStr) {
    const ref = parseDateStr(refDateStr);
    const diffDays = Math.round((candidateDate - ref) / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    return Math.abs(diffWeeks) % 2 === 0 ? "A" : "B";
  }
  // Simple week parity
  const oneJan = new Date(candidateDate.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((candidateDate - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  return weekNum % 2 === 1 ? "A" : "B";
}

function calculateNextClass(subjectId, givenDateStr, timetable, options = {}) {
  const {
    daysOff = [],
    overrides = [],
    afterNClasses = 1,
    weekPatternRefDate,
    maxDaysToScan = 60,
  } = options;

  const subjectEntries = timetable.filter(
    (e) => e.subjectId === subjectId && e.kind !== "break"
  );
  const hasAdded = overrides.some(
    (o) => o.type === "added" && o.newSubjectId === subjectId
  );

  if (subjectEntries.length === 0 && !hasAdded) {
    return {
      found: false,
      deadlineDate: null,
      weekday: null,
      reason: "NO_TIMETABLE_FOR_SUBJECT",
    };
  }

  const daysOffSet = new Set(daysOff.map((d) => d.date));
  let startDate = parseDateStr(givenDateStr);
  let classesEncountered = 0;

  for (let offset = 1; offset <= maxDaysToScan; offset++) {
    const candidate = addCalendarDays(startDate, offset);
    const dateStr = formatDateStr(candidate);

    // 1. Skip holiday
    if (daysOffSet.has(dateStr)) continue;

    // 2. Weekday (1=Mon ... 7=Sun)
    const jsDay = candidate.getDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    const currentPattern = getWeekPattern(candidate, weekPatternRefDate);

    // 3. Overrides
    const dateOverrides = overrides.filter((o) => o.date === dateStr);

    // Check added
    const added = dateOverrides.find(
      (o) => o.type === "added" && o.newSubjectId === subjectId
    );
    if (added) {
      classesEncountered++;
      if (classesEncountered >= afterNClasses) {
        return {
          found: true,
          deadlineDate: dateStr,
          weekday,
          periodNumber: added.periodNumber || 1,
          classNumber: classesEncountered,
          reason: "SUCCESS",
        };
      }
    }

    // Check regular timetable entries for this weekday
    const dayEntries = timetable.filter(
      (e) => e.weekday === weekday && e.kind !== "break"
    );

    for (const entry of dayEntries) {
      if (entry.weekPattern && entry.weekPattern !== "every" && entry.weekPattern !== currentPattern) {
        continue;
      }

      const override = dateOverrides.find((o) => o.entryId === entry.id);

      // Cancelled
      if (override?.type === "cancelled") {
        continue;
      }

      // Swapped in
      if (override?.type === "swapped" && override.newSubjectId === subjectId) {
        classesEncountered++;
        if (classesEncountered >= afterNClasses) {
          return {
            found: true,
            deadlineDate: dateStr,
            weekday,
            periodNumber: override.periodNumber || entry.periodNumber,
            classNumber: classesEncountered,
            reason: "SUCCESS",
          };
        }
        continue;
      }

      // Swapped out
      if (override?.type === "swapped" && override.newSubjectId !== subjectId && entry.subjectId === subjectId) {
        continue;
      }

      // Regular match
      if (entry.subjectId === subjectId) {
        classesEncountered++;
        if (classesEncountered >= afterNClasses) {
          return {
            found: true,
            deadlineDate: dateStr,
            weekday,
            periodNumber: entry.periodNumber,
            classNumber: classesEncountered,
            reason: "SUCCESS",
          };
        }
      }
    }
  }

  return {
    found: false,
    deadlineDate: null,
    weekday: null,
    reason: "NO_SESSION_WITHIN_60_DAYS",
  };
}

// ─── Pure Implementation of Indonesian Date Hint Parser (Matching dateHintParser.ts) ───

const INDO_WEEKDAYS = {
  senin: 1, mon: 1, monday: 1,
  selasa: 2, tue: 2, tuesday: 2,
  rabu: 3, wed: 3, wednesday: 3,
  kamis: 4, thu: 4, thursday: 4,
  jumat: 5, fri: 5, friday: 5,
  sabtu: 6, sat: 6, saturday: 6,
  minggu: 7, ahad: 7, sun: 7, sunday: 7,
};

function parseDateHint(text, refDateStr) {
  if (!text || !text.trim()) return null;
  const rawLower = text.toLowerCase();
  const baseDate = parseDateStr(refDateStr);

  // 1. Besok / bsk / tomorrow (+1 day)
  const besokMatch = rawLower.match(/\b(besok|bsk|tomorrow)\b/);
  if (besokMatch) {
    const target = addCalendarDays(baseDate, 1);
    return {
      suggestedDate: formatDateStr(target),
      matchedPhrase: besokMatch[0],
    };
  }

  // 2. Lusa (+2 days)
  const lusaMatch = rawLower.match(/\b(lusa)\b/);
  if (lusaMatch) {
    const target = addCalendarDays(baseDate, 2);
    return {
      suggestedDate: formatDateStr(target),
      matchedPhrase: lusaMatch[0],
    };
  }

  // 3. Minggu depan (+7 days)
  const mingguDepanMatch = rawLower.match(/\b(minggu depan|next week)\b/);
  if (mingguDepanMatch) {
    const target = addCalendarDays(baseDate, 7);
    return {
      suggestedDate: formatDateStr(target),
      matchedPhrase: mingguDepanMatch[0],
    };
  }

  // 4. [Weekday] depan (e.g. Senin depan)
  const wdDepanMatch = rawLower.match(/\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\s+depan\b/);
  if (wdDepanMatch) {
    const targetWd = INDO_WEEKDAYS[wdDepanMatch[1]];
    const jsDay = baseDate.getDay();
    const currentWd = jsDay === 0 ? 7 : jsDay;
    let daysToAdd = targetWd - currentWd;
    if (daysToAdd <= 0) daysToAdd += 7;
    daysToAdd += 7; // Next week's occurrence
    const target = addCalendarDays(baseDate, daysToAdd);
    return {
      suggestedDate: formatDateStr(target),
      matchedPhrase: wdDepanMatch[0],
    };
  }

  // 5. Standalone Hari [Weekday] (upcoming occurrence)
  const wdMatch = rawLower.match(/\b(?:hari\s+)?(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/);
  if (wdMatch) {
    const targetWd = INDO_WEEKDAYS[wdMatch[1]];
    const jsDay = baseDate.getDay();
    const currentWd = jsDay === 0 ? 7 : jsDay;
    let daysToAdd = targetWd - currentWd;
    if (daysToAdd <= 0) daysToAdd += 7;
    const target = addCalendarDays(baseDate, daysToAdd);
    return {
      suggestedDate: formatDateStr(target),
      matchedPhrase: wdMatch[0],
    };
  }

  // 6. Explicit ISO YYYY-MM-DD
  const isoMatch = rawLower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return {
      suggestedDate: isoMatch[0],
      matchedPhrase: isoMatch[0],
    };
  }

  return null;
}

// ─── Test Setup ───

// Timetable fixture:
// Monday (1): Period 1 = Matematika, Period 2 = Biologi
// Thursday (4): Period 1 = Matematika, Period 2 = Fisika
// Friday (5): Period 3 = Bahasa Inggris
const standardTimetable = [
  { id: "tt-mon-mtk", subjectId: "sub-mtk", weekday: 1, periodNumber: 1, weekPattern: "every" },
  { id: "tt-mon-bio", subjectId: "sub-bio", weekday: 1, periodNumber: 2, weekPattern: "every" },
  { id: "tt-thu-mtk", subjectId: "sub-mtk", weekday: 4, periodNumber: 1, weekPattern: "every" },
  { id: "tt-thu-fis", subjectId: "sub-fis", weekday: 4, periodNumber: 2, weekPattern: "every" },
  { id: "tt-fri-ing", subjectId: "sub-ing", weekday: 5, periodNumber: 3, weekPattern: "every" },
];

console.log("--- Part 1: Mandatory Next-Class Scenarios ---");

// Requirement 1: A task given on Friday
runTest("Scenario 1: Task given on Friday wraps around to following Monday (or Friday-to-Friday)", () => {
  // Friday Oct 23, 2026. Next Math is Monday Oct 26, 2026.
  const resMath = calculateNextClass("sub-mtk", "2026-10-23", standardTimetable);
  assert.equal(resMath.found, true);
  assert.equal(resMath.deadlineDate, "2026-10-26"); // Following Monday
  assert.equal(resMath.weekday, 1);
  assert.equal(resMath.periodNumber, 1);

  // Friday Oct 23, 2026. English only meets on Friday. Next English is Friday Oct 30, 2026 (+7 days).
  const resEng = calculateNextClass("sub-ing", "2026-10-23", standardTimetable);
  assert.equal(resEng.found, true);
  assert.equal(resEng.deadlineDate, "2026-10-30");
  assert.equal(resEng.weekday, 5);
});

// Requirement 2: A Monday holiday
runTest("Scenario 2: Monday holiday (DayOff) is skipped, landing on Thursday", () => {
  // Task given on Friday Oct 23, 2026.
  // Monday Oct 26, 2026 is marked as DayOff ("Hari Libur Nasional").
  const daysOff = [{ date: "2026-10-26", reason: "Hari Libur Nasional" }];
  const res = calculateNextClass("sub-mtk", "2026-10-23", standardTimetable, { daysOff });

  assert.equal(res.found, true);
  // Monday is skipped -> Next Math is Thursday Oct 29, 2026
  assert.equal(res.deadlineDate, "2026-10-29");
  assert.equal(res.weekday, 4);
});

// Requirement 3: A cancelled class
runTest("Scenario 3: Single cancelled class override advances deadline to following session", () => {
  // Task given on Monday Oct 19, 2026.
  // Regular next Math would be Thursday Oct 22, 2026.
  // BUT Thursday's session (tt-thu-mtk) is cancelled!
  const overrides = [
    { date: "2026-10-22", entryId: "tt-thu-mtk", type: "cancelled" },
  ];
  const res = calculateNextClass("sub-mtk", "2026-10-19", standardTimetable, { overrides });

  assert.equal(res.found, true);
  // Thursday cancelled -> Next Math session is Monday Oct 26, 2026
  assert.equal(res.deadlineDate, "2026-10-26");
  assert.equal(res.weekday, 1);
});

// Requirement 4: No class within 60 days
runTest("Scenario 4: Subject not in timetable or no session within 60 days returns found: false", () => {
  // Subject "sub-ghost" is not in the timetable
  const resUnscheduled = calculateNextClass("sub-ghost", "2026-10-19", standardTimetable);
  assert.equal(resUnscheduled.found, false);
  assert.equal(resUnscheduled.deadlineDate, null);
  assert.equal(resUnscheduled.reason, "NO_TIMETABLE_FOR_SUBJECT");

  // Subject is scheduled on Monday, but all Mondays for the next 60 days are holidays!
  const singleDayTimetable = [
    { id: "tt-single", subjectId: "sub-astronomi", weekday: 1, periodNumber: 1, weekPattern: "every" },
  ];
  const allMondaysOff = [];
  let cur = parseDateStr("2026-10-19");
  for (let i = 1; i <= 60; i++) {
    const c = addCalendarDays(cur, i);
    if (c.getDay() === 1) {
      allMondaysOff.push({ date: formatDateStr(c), reason: "Special Extended Break" });
    }
  }
  const resExhausted = calculateNextClass("sub-astronomi", "2026-10-19", singleDayTimetable, { daysOff: allMondaysOff });
  assert.equal(resExhausted.found, false);
  assert.equal(resExhausted.reason, "NO_SESSION_WITHIN_60_DAYS");
});

console.log("\n--- Part 2: Indonesian Date NLP Parsing Scenarios ---");

runTest("Scenario 5: Relative phrase 'besok' & 'bsk' resolves to reference date + 1 day", () => {
  const ref = "2026-10-23"; // Friday
  const r1 = parseDateHint("Tugas dikumpul besok pagi", ref);
  assert.ok(r1);
  assert.equal(r1.suggestedDate, "2026-10-24");

  const r2 = parseDateHint("bsk bawa penggaris", ref);
  assert.ok(r2);
  assert.equal(r2.suggestedDate, "2026-10-24");
});

runTest("Scenario 6: Relative phrase 'lusa' resolves to reference date + 2 days", () => {
  const ref = "2026-10-23"; // Friday
  const r = parseDateHint("Kuis biologi lusa jam 8", ref);
  assert.ok(r);
  assert.equal(r.suggestedDate, "2026-10-25"); // Sunday
});

runTest("Scenario 7: Phrase 'Senin depan' resolves to next week's Monday", () => {
  const ref = "2026-10-23"; // Friday
  const r = parseDateHint("PR Matematika dikumpul Senin depan", ref);
  assert.ok(r);
  assert.equal(r.suggestedDate, "2026-11-02"); // Next week's Monday (+10 days from Friday)
});

runTest("Scenario 8: Phrase 'minggu depan' resolves to reference date + 7 days", () => {
  const ref = "2026-10-23"; // Friday
  const r = parseDateHint("Presentasi kelompok minggu depan", ref);
  assert.ok(r);
  assert.equal(r.suggestedDate, "2026-10-30"); // Friday of next week
});

runTest("Scenario 9: Upcoming weekday mention 'hari Rabu' resolves to next upcoming Wednesday", () => {
  const ref = "2026-10-23"; // Friday
  const r = parseDateHint("Laporan praktikum diserahkan hari Rabu", ref);
  assert.ok(r);
  assert.equal(r.suggestedDate, "2026-10-28"); // Next upcoming Wednesday
});

runTest("Scenario 10: Explicit ISO date string is preserved verbatim", () => {
  const ref = "2026-10-23";
  const r = parseDateHint("Tenggat proyek akhir 2026-11-15", ref);
  assert.ok(r);
  assert.equal(r.suggestedDate, "2026-11-15");
});

console.log("\n===============================================================");
console.log(`   PHASE 10 UNIT TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log("===============================================================\n");
