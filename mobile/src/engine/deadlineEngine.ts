/**
 * StudyAir Mobile — Next-Class Deadline Engine
 * 
 * Deterministic calculation of class session deadlines based on student timetable,
 * taking into account:
 * 1. Strict chronological scan after givenDate (e.g. given today, next class is strictly after today).
 * 2. DayOff holiday calendar exceptions (skips dates marked as DayOff).
 * 3. Schedule overrides (one-time 'cancelled' classes are skipped, 'added' classes are included, 'swapped' respected).
 * 4. weekPattern ('every', 'A', 'B') alternating schedules.
 * 5. Multi-class offset ('afterNClasses', e.g. due in 2 classes instead of 1).
 * 6. Graceful 60-day timeout fallback.
 */

import { format, addDays, parseISO, startOfDay, getISOWeek, differenceInCalendarDays } from "date-fns";
import { TimetableEntry, DayOff, Override, WeekPattern } from "../types";

export interface NextClassDeadlineOptions {
  daysOff?: DayOff[];
  overrides?: Override[];
  afterNClasses?: number; // 1 = next class (default), 2 = 2 classes out, etc.
  weekPatternReferenceDate?: Date | string; // Optional anchor date for A/B week calculation
  maxDaysToScan?: number; // default: 60
}

export interface NextClassResult {
  found: boolean;
  deadlineDate: string | null; // "YYYY-MM-DD"
  weekday: number | null; // 1 = Monday ... 7 = Sunday
  periodNumber?: number;
  classNumber?: number; // 1st, 2nd, etc.
  reason?: "SUCCESS" | "NO_SESSION_WITHIN_60_DAYS" | "NO_TIMETABLE_FOR_SUBJECT";
}

/**
 * Returns the week pattern ("A" or "B") for a given date.
 * If referenceDate is provided, alternates every 7 days from the reference.
 * Otherwise, uses ISO week number (odd = "A", even = "B").
 */
export function getWeekPatternForDate(
  candidateDate: Date,
  referenceDate?: Date | string
): "A" | "B" {
  if (referenceDate) {
    const ref = typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate;
    const daysDiff = differenceInCalendarDays(startOfDay(candidateDate), startOfDay(ref));
    const weeksDiff = Math.floor(daysDiff / 7);
    return Math.abs(weeksDiff) % 2 === 0 ? "A" : "B";
  }
  const isoWeek = getISOWeek(candidateDate);
  return isoWeek % 2 === 1 ? "A" : "B";
}

/**
 * Calculates the exact date of the next (or N-th) class session for a subject.
 * 
 * @param subjectId - Target subject ID
 * @param givenDate - Date when task is assigned (string YYYY-MM-DD or Date)
 * @param timetableEntries - All student timetable entries
 * @param options - Configuration options (days off, overrides, afterNClasses, etc.)
 */
export function calculateNextClassDeadline(
  subjectId: string,
  givenDate: Date | string,
  timetableEntries: TimetableEntry[],
  options: NextClassDeadlineOptions = {}
): NextClassResult {
  const {
    daysOff = [],
    overrides = [],
    afterNClasses = 1,
    weekPatternReferenceDate,
    maxDaysToScan = 60,
  } = options;

  const startDate = typeof givenDate === "string" ? parseISO(givenDate) : givenDate;
  const startNormalized = startOfDay(startDate);

  // Fast check: verify if subject exists in timetable or has added overrides
  const subjectEntries = timetableEntries.filter(
    (e) => e.subjectId === subjectId && e.kind !== "break" && e.kind !== "event"
  );
  const hasAddedOverrides = overrides.some(
    (o) => o.type === "added" && o.newSubjectId === subjectId
  );

  if (subjectEntries.length === 0 && !hasAddedOverrides) {
    return {
      found: false,
      deadlineDate: null,
      weekday: null,
      reason: "NO_TIMETABLE_FOR_SUBJECT",
    };
  }

  // Pre-index days off into a set for O(1) lookup
  const daysOffSet = new Set(daysOff.map((d) => d.date));

  let classesEncountered = 0;

  // Scan strictly AFTER givenDate: from day 1 up to maxDaysToScan (60 days)
  for (let offset = 1; offset <= maxDaysToScan; offset++) {
    const candidateDate = addDays(startNormalized, offset);
    const dateStr = format(candidateDate, "yyyy-MM-dd");

    // 1. Skip if entire day is a DayOff / Holiday
    if (daysOffSet.has(dateStr)) {
      continue;
    }

    // 2. Weekday: 1 = Monday ... 7 = Sunday
    const dayOfWeek = candidateDate.getDay() === 0 ? 7 : candidateDate.getDay();
    const candidatePattern = getWeekPatternForDate(candidateDate, weekPatternReferenceDate);

    // 3. Check for one-time overrides on this specific date
    const dateOverrides = overrides.filter((o) => o.date === dateStr);
    
    // Check if an "added" session was scheduled for this subject on this date
    const addedOverride = dateOverrides.find(
      (o) => o.type === "added" && o.newSubjectId === subjectId
    );

    if (addedOverride) {
      classesEncountered++;
      if (classesEncountered === afterNClasses) {
        return {
          found: true,
          deadlineDate: dateStr,
          weekday: dayOfWeek,
          classNumber: classesEncountered,
          reason: "SUCCESS",
        };
      }
      continue;
    }

    // 4. Check regular timetable entries for this weekday
    const dayEntries = timetableEntries.filter(
      (e) => e.weekday === dayOfWeek && e.kind !== "break" && e.kind !== "event"
    );

    // Look for entries matching this subject (accounting for weekPattern and swaps)
    let sessionFoundOnDay = false;
    let matchedPeriod: number | undefined;

    for (const entry of dayEntries) {
      // Check if entry was cancelled on this date
      const isCancelled = dateOverrides.some(
        (o) => o.entryId === entry.id && o.type === "cancelled"
      );
      if (isCancelled) continue;

      // Check if entry was swapped
      const swapOverride = dateOverrides.find(
        (o) => o.entryId === entry.id && o.type === "swapped"
      );

      // Determine effective subject for this slot
      const effectiveSubjectId = swapOverride ? swapOverride.newSubjectId : entry.subjectId;
      if (effectiveSubjectId !== subjectId) continue;

      // Check week pattern ("every", "A", "B")
      const pattern = entry.weekPattern || "every";
      if (pattern !== "every" && pattern !== candidatePattern) {
        continue;
      }

      // Found an active class session for this subject!
      sessionFoundOnDay = true;
      matchedPeriod = entry.periodNumber;
      break;
    }

    if (sessionFoundOnDay) {
      classesEncountered++;
      if (classesEncountered === afterNClasses) {
        return {
          found: true,
          deadlineDate: dateStr,
          weekday: dayOfWeek,
          periodNumber: matchedPeriod,
          classNumber: classesEncountered,
          reason: "SUCCESS",
        };
      }
    }
  }

  // If 60 days passed with no class found
  return {
    found: false,
    deadlineDate: null,
    weekday: null,
    reason: "NO_SESSION_WITHIN_60_DAYS",
  };
}

/**
 * Re-evaluates deadlines for a list of tasks whose deadlineMode is 'nextClass' or 'afterNClasses'.
 * Returns updated tasks and a count of how many changed.
 */
export function recalculateDynamicTaskDeadlines(
  tasks: Array<{
    id: string;
    subjectId: string;
    givenDate: string;
    deadlineDate: string;
    deadlineMode: "nextClass" | "afterNClasses" | "custom";
    status: string;
  }>,
  timetableEntries: TimetableEntry[],
  options: NextClassDeadlineOptions = {}
): {
  updatedTasks: typeof tasks;
  changedCount: number;
} {
  let changedCount = 0;

  const updatedTasks = tasks.map((task) => {
    // Only pending tasks with dynamic deadline modes are recalculated
    if (task.status === "COMPLETED" || task.deadlineMode === "custom") {
      return task;
    }

    const nClasses = task.deadlineMode === "afterNClasses" ? (options.afterNClasses || 2) : 1;
    const res = calculateNextClassDeadline(task.subjectId, task.givenDate, timetableEntries, {
      ...options,
      afterNClasses: nClasses,
    });

    if (res.found && res.deadlineDate && res.deadlineDate !== task.deadlineDate) {
      changedCount++;
      return {
        ...task,
        deadlineDate: res.deadlineDate,
      };
    }

    return task;
  });

  return { updatedTasks, changedCount };
}
