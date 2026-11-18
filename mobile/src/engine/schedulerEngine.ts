/**
 * StudyAir Mobile — Deterministic Scheduling Engine (v2)
 *
 * A pure, side-effect-free scheduling module that turns pending tasks, school
 * timetables, and student busy time into concrete, non-overlapping study blocks.
 *
 * Guarantees (Invariants):
 * 1. No two study blocks overlap in time.
 * 2. No study block overlaps school classes, breaks, or designated busy blocks.
 * 3. No study block is scheduled after the task's deadline date.
 * 4. Tasks with earlier deadlines are scheduled first.
 * 5. Large tasks are split into manageable chunks separated by break buffers.
 * 6. Tasks that cannot fit before their deadline are reported in an unallocated list.
 */

import {
  Task,
  StudyBlock,
  BusyBlock,
  SchedulePrefs,
  TimetableEntry,
  PeriodTime,
  DayOff,
  Override,
  ScheduleResult,
  UnallocatedTask,
} from "../types";
import { parseLocalMidnight } from "../lib/dateUtils";

export interface TimeSlot {
  date: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

/**
 * Converts a "HH:mm" time string into total minutes from midnight (0..1439).
 * Clamps to 0 on invalid or malformed strings.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return Math.max(0, Math.min(1439, hours * 60 + minutes));
}

/**
 * Converts total minutes from midnight into a 24-hour "HH:mm" string.
 */
export function minutesToTime(mins: number): string {
  if (isNaN(mins) || mins < 0) mins = 0;
  const totalMins = Math.floor(mins);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Formats a Date object as a local "YYYY-MM-DD" string.
 */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Adds an integer number of days to a "YYYY-MM-DD" string.
 */
function addDays(dateStr: string, days: number): string {
  const d = parseLocalMidnight(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Returns an inclusive array of "YYYY-MM-DD" strings between startDate and endDate.
 */
export function dateRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [];
  const result: string[] = [];
  const current = parseLocalMidnight(startDate);
  const end = parseLocalMidnight(endDate);

  while (current <= end) {
    result.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return result;
}

/**
 * Computes ISO 8601 week number for a given date.
 */
function getISOWeek(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Returns "A" (odd ISO week) or "B" (even ISO week) for a given date.
 */
function getWeekPattern(d: Date): "A" | "B" {
  return getISOWeek(d) % 2 === 1 ? "A" : "B";
}

/**
 * Extracts student BusyBlocks from the school timetable, overrides, and days off.
 */
export function extractBusyBlocksFromTimetable(options: {
  timetableEntries: TimetableEntry[];
  periodTimes: PeriodTime[];
  daysOff: DayOff[];
  overrides: Override[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}): BusyBlock[] {
  const {
    timetableEntries = [],
    periodTimes = [],
    daysOff = [],
    overrides = [],
    startDate,
    endDate,
  } = options;

  const dates = dateRange(startDate, endDate);
  const busyBlocks: BusyBlock[] = [];

  // Default period times map for fallback
  const defaultPeriodMap = new Map<number, PeriodTime>();
  for (const pt of periodTimes) {
    if (pt.weekday === null || pt.weekday === undefined) {
      defaultPeriodMap.set(pt.periodNumber, pt);
    }
  }

  for (const date of dates) {
    // 1. Check if date is in daysOff
    const dOff = daysOff.find((d) => d.date === date);
    if (dOff) {
      // Find school day range or default 07:00-14:00
      let schoolStart = "07:00";
      let schoolEnd = "14:00";
      if (periodTimes.length > 0) {
        const sorted = [...periodTimes].sort((a, b) => a.periodNumber - b.periodNumber);
        schoolStart = sorted[0].start || "07:00";
        schoolEnd = sorted[sorted.length - 1].end || "14:00";
      }
      busyBlocks.push({
        id: `dayoff-${date}`,
        source: "timetable",
        title: dOff.reason || "Hari Libur",
        date,
        startTime: schoolStart,
        endTime: schoolEnd,
      });
      continue;
    }

    // 2. Resolve weekday (1 = Monday ... 7 = Sunday)
    const dObj = parseLocalMidnight(date);
    const jsDay = dObj.getDay();
    const weekday = jsDay === 0 ? 7 : jsDay;
    const weekPattern = getWeekPattern(dObj);

    // Weekday-specific period times map (e.g. shorter Friday)
    const weekdayPeriodMap = new Map<number, PeriodTime>();
    for (const pt of periodTimes) {
      if (pt.weekday === weekday) {
        weekdayPeriodMap.set(pt.periodNumber, pt);
      }
    }

    // 3. Timetable entries for this weekday (accounting for weekPattern A/B)
    const dayEntries = timetableEntries.filter((e) => {
      if (e.weekday !== weekday) return false;
      if (!e.weekPattern || e.weekPattern === "every") return true;
      return e.weekPattern === weekPattern;
    });
    const dateOverrides = overrides.filter((o) => o.date === date);

    // Apply overrides (cancelled, swapped)
    const activeEntries: Array<TimetableEntry & { customTitle?: string }> = [];
    for (const entry of dayEntries) {
      const ov = dateOverrides.find((o) => o.entryId === entry.id);
      if (ov?.type === "cancelled") {
        continue;
      } else if (ov?.type === "swapped" && ov.newSubjectId) {
        activeEntries.push({
          ...entry,
          subjectId: ov.newSubjectId,
          periodNumber: ov.periodNumber || entry.periodNumber,
          customTitle: ov.customLabel || entry.customLabel,
        });
      } else {
        activeEntries.push(entry);
      }
    }

    // Add 'added' overrides
    const addedOverrides = dateOverrides.filter((o) => o.type === "added");
    for (const add of addedOverrides) {
      activeEntries.push({
        id: add.entryId || `added-${date}-${add.periodNumber || 1}`,
        subjectId: add.newSubjectId || "",
        weekday,
        periodNumber: add.periodNumber || 1,
        weekPattern: "every",
        kind: "class",
        customTitle: add.customLabel,
      });
    }

    // 4. Map active entries to BusyBlocks
    for (let i = 0; i < activeEntries.length; i++) {
      const entry = activeEntries[i];
      const pt = weekdayPeriodMap.get(entry.periodNumber) || defaultPeriodMap.get(entry.periodNumber);

      const startTime = entry.startTime || pt?.start || minutesToTime(420 + (entry.periodNumber - 1) * 45);
      const endTime = entry.endTime || pt?.end || minutesToTime(420 + entry.periodNumber * 45);
      const title = entry.customTitle || entry.customLabel || entry.subjectId || `Jam ${entry.periodNumber}`;

      busyBlocks.push({
        id: `tt-${date}-${entry.periodNumber}-${i}`,
        source: "timetable",
        title,
        date,
        startTime,
        endTime,
      });
    }
  }

  return busyBlocks;
}

/**
 * Computes the available free time slots for a given day inside the user's study window,
 * subtracting all busy intervals and merging overlapping blocks.
 */
export function findFreeSlots(
  date: string,
  busyBlocksForDay: BusyBlock[],
  prefs: SchedulePrefs
): TimeSlot[] {
  // Check if date is designated in prefs.daysOff (e.g. "Sunday" or "2026-10-28")
  if (Array.isArray(prefs.daysOff) && prefs.daysOff.length > 0) {
    const dObj = parseLocalMidnight(date);
    const dayIndex = dObj.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dayNamesEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayNamesId = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const currentDayEn = dayNamesEn[dayIndex].toLowerCase();
    const currentDayId = dayNamesId[dayIndex].toLowerCase();

    const shortEn = currentDayEn.slice(0, 3);
    const shortId = currentDayId.slice(0, 3);
    const isDayOff = prefs.daysOff.some((d) => {
      if (!d) return false;
      const lower = d.trim().toLowerCase();
      return (
        lower === date ||
        lower === currentDayEn ||
        lower === currentDayId ||
        lower === shortEn ||
        lower === shortId ||
        lower === String(dayIndex) ||
        (dayIndex === 0 && lower === "7")
      );
    });

    if (isDayOff) {
      return [];
    }
  }

  let windowStart = timeToMinutes(prefs.studyWindowStart);
  let windowEnd = timeToMinutes(prefs.studyWindowEnd);

  // Midnight crossing clamp: if study window crosses midnight (e.g. 20:00–01:00), clamp end to 23:59
  if (windowEnd <= windowStart) {
    windowEnd = 1439;
  }
  windowStart = Math.max(0, Math.min(1439, windowStart));
  windowEnd = Math.max(windowStart, Math.min(1439, windowEnd));

  if (windowEnd <= windowStart) {
    return [];
  }

  // Filter busy blocks for this date and intersect with the study window
  const busyIntervals: Array<{ start: number; end: number }> = [];
  for (const b of busyBlocksForDay) {
    if (b.date && b.date !== date) continue;
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    const clampedStart = Math.max(windowStart, Math.min(windowEnd, bStart));
    const clampedEnd = Math.max(windowStart, Math.min(windowEnd, bEnd));
    if (clampedEnd > clampedStart) {
      busyIntervals.push({ start: clampedStart, end: clampedEnd });
    }
  }

  // Merge overlapping / contiguous busy intervals
  busyIntervals.sort((a, b) => a.start - b.start);
  const mergedBusy: Array<{ start: number; end: number }> = [];
  for (const b of busyIntervals) {
    if (mergedBusy.length === 0) {
      mergedBusy.push({ ...b });
    } else {
      const last = mergedBusy[mergedBusy.length - 1];
      if (b.start <= last.end) {
        last.end = Math.max(last.end, b.end);
      } else {
        mergedBusy.push({ ...b });
      }
    }
  }

  // Invert merged busy intervals within [windowStart, windowEnd] to get free slots
  const freeSlots: TimeSlot[] = [];
  let current = windowStart;
  for (const b of mergedBusy) {
    if (b.start > current) {
      freeSlots.push({
        date,
        startMinutes: current,
        endMinutes: b.start,
        durationMinutes: b.start - current,
      });
    }
    current = Math.max(current, b.end);
  }
  if (current < windowEnd) {
    freeSlots.push({
      date,
      startMinutes: current,
      endMinutes: windowEnd,
      durationMinutes: windowEnd - current,
    });
  }

  return freeSlots;
}

/**
 * Splits a task's duration into discrete chunks bounded by maxBlockMinutes.
 * Enforces a minimum chunk size of 15 minutes (or remainder).
 */
export function chunkTask(
  taskOrMinutes: Task | number,
  maxBlockMinutes: number = 45
): number[] {
  const rawMinutes = typeof taskOrMinutes === "number"
    ? taskOrMinutes
    : (taskOrMinutes.estimatedMinutes ?? 30);
  const total = Math.max(15, rawMinutes);
  const maxBlock = Math.max(15, maxBlockMinutes);
  const chunks: number[] = [];
  let remaining = total;
  while (remaining > maxBlock) {
    chunks.push(maxBlock);
    remaining -= maxBlock;
  }
  if (remaining > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

/**
 * Pure scheduling engine that places study blocks for pending tasks into
 * available free time slots before task deadlines, respecting break buffers.
 */
export function buildSchedule(options: {
  tasks: Task[];
  busyBlocks: BusyBlock[];
  prefs: SchedulePrefs;
  referenceDate: string; // YYYY-MM-DD
  daysAhead?: number; // default 14
  allowOverdue?: boolean;
}): ScheduleResult {
  const {
    tasks = [],
    busyBlocks = [],
    prefs,
    referenceDate,
    daysAhead = 14,
    allowOverdue = false,
  } = options;

  // 1. Filter out completed tasks and sort active tasks
  const activeTasks = tasks.filter((t) => t.status !== "COMPLETED");

  activeTasks.sort((a, b) => {
    // 1. Deadline date ascending (earliest deadline first)
    if (a.deadlineDate !== b.deadlineDate) {
      return a.deadlineDate.localeCompare(b.deadlineDate);
    }
    // 2. If tied and hardFirst: higher duration estimate first
    if (prefs.priorityWeights?.hardFirst) {
      const estA = a.estimatedMinutes ?? 30;
      const estB = b.estimatedMinutes ?? 30;
      if (estA !== estB) {
        return estB - estA;
      }
    }
    // 3. Given date ascending
    const givenA = a.givenDate || referenceDate;
    const givenB = b.givenDate || referenceDate;
    if (givenA !== givenB) {
      return givenA.localeCompare(givenB);
    }
    // 4. Stable tie-breaker by task ID
    return a.id.localeCompare(b.id);
  });

  // 2. Determine horizon end date
  let horizonEndDate = addDays(referenceDate, Math.max(1, daysAhead) - 1);
  for (const t of activeTasks) {
    if (t.deadlineDate > horizonEndDate) {
      horizonEndDate = t.deadlineDate;
    }
  }

  const allDates = dateRange(referenceDate, horizonEndDate);

  // Group busy blocks by date for O(1) retrieval
  const busyByDate = new Map<string, BusyBlock[]>();
  for (const b of busyBlocks) {
    const arr = busyByDate.get(b.date) || [];
    arr.push(b);
    busyByDate.set(b.date, arr);
  }

  // Calculate initial free slots per day
  const freeSlotsByDate = new Map<string, TimeSlot[]>();
  let totalFreeMinutes = 0;
  for (const date of allDates) {
    const slots = findFreeSlots(date, busyByDate.get(date) || [], prefs);
    freeSlotsByDate.set(date, slots.map((s) => ({ ...s })));
    for (const s of slots) {
      totalFreeMinutes += s.durationMinutes;
    }
  }

  const blocks: StudyBlock[] = [];
  const unallocated: UnallocatedTask[] = [];
  const minBreak = prefs.minBreakMinutes ?? 15;
  const maxBlock = prefs.maxBlockMinutes ?? 45;

  // 3. Allocate study blocks for each prioritized task
  for (const task of activeTasks) {
    const neededMinutes = Math.max(15, task.estimatedMinutes ?? 30);
    let allocatedMinutes = 0;

    // Check if task is already past deadline
    if (task.deadlineDate < referenceDate) {
      if (!allowOverdue) {
        unallocated.push({
          taskId: task.id,
          taskTitle: task.title,
          subjectId: task.subjectId,
          deadlineDate: task.deadlineDate,
          neededMinutes,
          allocatedMinutes: 0,
          reason: "ALREADY_PAST_DEADLINE",
        });
        continue;
      }
    }

    const effectiveDeadline =
      allowOverdue && task.deadlineDate < referenceDate
        ? referenceDate
        : task.deadlineDate;

    const earliestDate =
      task.givenDate && task.givenDate > referenceDate && task.givenDate <= effectiveDeadline
        ? task.givenDate
        : referenceDate;

    if (earliestDate > effectiveDeadline) {
      unallocated.push({
        taskId: task.id,
        taskTitle: task.title,
        subjectId: task.subjectId,
        deadlineDate: task.deadlineDate,
        neededMinutes,
        allocatedMinutes: 0,
        reason: "DEADLINE_TOO_SOON",
      });
      continue;
    }

    const chunks = chunkTask(neededMinutes, maxBlock);
    const validDates = dateRange(earliestDate, effectiveDeadline);

    let blockCounter = 1;
    for (const chunkDuration of chunks) {
      let placed = false;

      for (const d of validDates) {
        const daySlots = freeSlotsByDate.get(d);
        if (!daySlots || daySlots.length === 0) continue;

        for (let sIdx = 0; sIdx < daySlots.length; sIdx++) {
          const slot = daySlots[sIdx];
          if (slot.durationMinutes >= chunkDuration) {
            const startMins = slot.startMinutes;
            const endMins = startMins + chunkDuration;

            const newBlock: StudyBlock = {
              id: `sb-${task.id}-${blockCounter++}`,
              taskId: task.id,
              subjectId: task.subjectId,
              date: d,
              startTime: minutesToTime(startMins),
              endTime: minutesToTime(endMins),
              durationMinutes: chunkDuration,
              status: "SCHEDULED",
              createdAt: new Date().toISOString(),
            };
            blocks.push(newBlock);
            allocatedMinutes += chunkDuration;
            placed = true;

            // Deduct allocated duration + break buffer from slot
            const nextStart = endMins + minBreak;
            if (nextStart < slot.endMinutes) {
              slot.startMinutes = nextStart;
              slot.durationMinutes = slot.endMinutes - nextStart;
            } else {
              daySlots.splice(sIdx, 1);
            }
            break;
          }
        }

        if (placed) break;
      }
    }

    if (allocatedMinutes < neededMinutes) {
      const isToday = task.deadlineDate === referenceDate;
      const reason = allocatedMinutes === 0 && isToday
        ? "DEADLINE_TOO_SOON"
        : "SCHEDULE_FULL";

      unallocated.push({
        taskId: task.id,
        taskTitle: task.title,
        subjectId: task.subjectId,
        deadlineDate: task.deadlineDate,
        neededMinutes,
        allocatedMinutes,
        reason,
      });
    }
  }

  // 4. Compute schedule statistics
  let fullyScheduledCount = 0;
  let partiallyScheduledCount = 0;
  let unallocatedCount = 0;

  for (const task of activeTasks) {
    const unalloc = unallocated.find((u) => u.taskId === task.id);
    if (!unalloc) {
      fullyScheduledCount++;
    } else if (unalloc.allocatedMinutes > 0) {
      partiallyScheduledCount++;
    } else {
      unallocatedCount++;
    }
  }

  const totalStudyMinutes = blocks.reduce((sum, b) => sum + b.durationMinutes, 0);

  return {
    blocks,
    unallocated,
    stats: {
      totalTasks: activeTasks.length,
      fullyScheduledCount,
      partiallyScheduledCount,
      unallocatedCount,
      totalStudyMinutes,
      totalFreeMinutes,
    },
  };
}
