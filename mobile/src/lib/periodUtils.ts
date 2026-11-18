/**
 * StudyAir Mobile — Period & Consecutive Merge Utilities
 * 
 * Unifies school period labels:
 * - Long: "Jam 1"
 * - Compact: "J1"
 * - Range: "Jam 1-2" (compact: "J1-2")
 * 
 * Provides presentation-layer merging of consecutive periods with the same subject,
 * room, and teacher. Stored timetable entries remain atomic and unmodified.
 */

import { PeriodTime } from "../types";

/**
 * Standard period label.
 * Replaces legacy "P1", "Jam ke-1", etc.
 */
export function formatPeriodLabel(periodNumber: number, style: boolean | "compact" | "long" = false): string {
  const isCompact = style === true || style === "compact";
  if (isCompact) {
    return `J${periodNumber}`;
  }
  return `Jam ${periodNumber}`;
}

/**
 * Standard period range label.
 */
export function formatPeriodRange(startPeriod: number, endPeriod: number, style: boolean | "compact" | "long" = false): string {
  const isCompact = style === true || style === "compact";
  if (startPeriod === endPeriod) {
    return formatPeriodLabel(startPeriod, isCompact);
  }
  if (isCompact) {
    return `J${startPeriod}-${endPeriod}`;
  }
  return `Jam ${startPeriod}-${endPeriod}`;
}

export interface MergedPeriodBlock<T> {
  id: string;
  startPeriod: number;
  endPeriod: number;
  periodLabel: string;
  compactPeriodLabel: string;
  periodLabelLong: string;
  periodLabelCompact: string;
  startTime: string;
  endTime: string;
  timeRangeStr: string;
  timeRange: string;
  subjectId: string;
  room?: string;
  teacher?: string;
  items: T[];
  leadItem: T;
}

/**
 * Merges consecutive periods of the same subject, room, and teacher for presentation display.
 */
export function mergeConsecutivePeriods<
  T extends {
    periodNumber: number;
    subjectId?: string;
    room?: string;
    teacher?: string;
    startTime?: string;
    endTime?: string;
    id?: string;
  }
>(
  entries: T[],
  periodTimesMap?: Map<number, PeriodTime>
): MergedPeriodBlock<T>[] {
  if (!entries || entries.length === 0) return [];

  // Sort by period number ascending
  const sorted = [...entries].sort((a, b) => a.periodNumber - b.periodNumber);
  const result: MergedPeriodBlock<T>[] = [];

  let currentGroup: T[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const isConsecutive = curr.periodNumber === prev.periodNumber + 1;
    const sameSubject = (curr.subjectId || "") === (prev.subjectId || "");
    const sameRoom = (curr.room || "") === (prev.room || "");
    const sameTeacher = (curr.teacher || "") === (prev.teacher || "");

    if (isConsecutive && sameSubject && sameRoom && sameTeacher) {
      currentGroup.push(curr);
    } else {
      // Finalize current group
      result.push(createMergedBlock(currentGroup, periodTimesMap));
      currentGroup = [curr];
    }
  }

  if (currentGroup.length > 0) {
    result.push(createMergedBlock(currentGroup, periodTimesMap));
  }

  return result;
}

function createMergedBlock<
  T extends {
    periodNumber: number;
    subjectId?: string;
    room?: string;
    teacher?: string;
    startTime?: string;
    endTime?: string;
    id?: string;
  }
>(
  group: T[],
  periodTimesMap?: Map<number, PeriodTime>
): MergedPeriodBlock<T> {
  const lead = group[0];
  const tail = group[group.length - 1];

  const startPeriod = lead.periodNumber;
  const endPeriod = tail.periodNumber;

  let startTime = lead.startTime || "";
  let endTime = tail.endTime || "";

  if (periodTimesMap) {
    const startPt = periodTimesMap.get(startPeriod);
    const endPt = periodTimesMap.get(endPeriod);
    if (startPt) startTime = startPt.start;
    if (endPt) endTime = endPt.end;
  }

  const timeRangeWithSpaces = startTime && endTime ? `${startTime} - ${endTime}` : "";
  const timeRangeCompact = startTime && endTime ? `${startTime}-${endTime}` : "";

  return {
    id: lead.id ? `merged-${lead.id}` : `merged-p${startPeriod}-p${endPeriod}`,
    startPeriod,
    endPeriod,
    periodLabel: formatPeriodRange(startPeriod, endPeriod, false),
    compactPeriodLabel: formatPeriodRange(startPeriod, endPeriod, true),
    periodLabelLong: formatPeriodRange(startPeriod, endPeriod, false),
    periodLabelCompact: formatPeriodRange(startPeriod, endPeriod, true),
    startTime,
    endTime,
    timeRangeStr: timeRangeWithSpaces,
    timeRange: timeRangeCompact,
    subjectId: lead.subjectId || "",
    room: lead.room,
    teacher: lead.teacher,
    items: group,
    leadItem: lead,
  };
}

// ─────────────────────────────────────────────────────────────
// BELL SCHEDULE MATH, GENERATION & VALIDATION UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Converts a "HH:mm" time string into minutes from midnight (0..1439).
 * Returns -1 if the format is invalid.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== "string") return -1;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return -1;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

/**
 * Converts minutes from midnight into a zero-padded "HH:mm" time string.
 */
export function minutesToTime(minutes: number): string {
  const norm = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculates the duration in minutes between start and end time.
 * Returns -1 if times are invalid or if end <= start.
 */
export function calculatePeriodDuration(start: string, end: string): number {
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(end);
  if (startMins < 0 || endMins < 0 || endMins <= startMins) return -1;
  return endMins - startMins;
}

export interface QuickBellSetupOptions {
  startTime?: string;      // default "07:00"
  periodDuration?: number; // default 45 minutes
  numPeriods?: number;     // default 8 periods
  break1After?: number;    // default 3 (break after Period 3)
  break1Duration?: number; // default 15 minutes
  break2After?: number;    // default 6 (break after Period 6, Ishoma)
  break2Duration?: number; // default 45 minutes
}

/**
 * Generates an array of PeriodTime objects based on start time,
 * uniform period duration, and standard break rules.
 */
export function generateQuickSetupBellTimes(options: QuickBellSetupOptions = {}): PeriodTime[] {
  const {
    startTime = "07:00",
    periodDuration = 45,
    numPeriods = 8,
    break1After = 3,
    break1Duration = 15,
    break2After = 6,
    break2Duration = 45,
  } = options;

  let currentMins = timeToMinutes(startTime);
  if (currentMins < 0) currentMins = 7 * 60; // 07:00 fallback

  const result: PeriodTime[] = [];

  for (let p = 1; p <= numPeriods; p++) {
    const startStr = minutesToTime(currentMins);
    currentMins += periodDuration;
    const endStr = minutesToTime(currentMins);

    result.push({
      periodNumber: p,
      start: startStr,
      end: endStr,
    });

    // Insert Break 1 (e.g. Istirahat 1 after Jam 3)
    if (break1After > 0 && p === break1After && break1Duration > 0) {
      currentMins += break1Duration;
    }

    // Insert Break 2 (e.g. Ishoma after Jam 6)
    if (break2After > 0 && p === break2After && break2Duration > 0) {
      currentMins += break2Duration;
    }
  }

  return result;
}

export interface PeriodFieldError {
  startError?: string;
  endError?: string;
  generalError?: string;
}

export interface BellValidationResult {
  isValid: boolean;
  errors: Record<number, PeriodFieldError>;
  errorCount: number;
}

/**
 * Validates a bell schedule:
 * 1. Valid HH:mm format.
 * 2. End time is strictly after start time.
 * 3. No overlaps: Period N cannot start before Period N-1 ends.
 */
export function validateBellSchedule(periods: PeriodTime[]): BellValidationResult {
  const errors: Record<number, PeriodFieldError> = {};
  let errorCount = 0;

  for (let i = 0; i < periods.length; i++) {
    const curr = periods[i];
    const pNum = curr.periodNumber;
    const startMins = timeToMinutes(curr.start);
    const endMins = timeToMinutes(curr.end);

    const fieldError: PeriodFieldError = {};

    // 1. Format check
    if (startMins < 0) {
      fieldError.startError = "Format jam mulai tidak valid (JJ:MM)";
    }
    if (endMins < 0) {
      fieldError.endError = "Format jam selesai tidak valid (JJ:MM)";
    }

    // 2. End after start check
    if (startMins >= 0 && endMins >= 0) {
      if (endMins <= startMins) {
        fieldError.endError = "Jam selesai harus setelah jam mulai";
      }
    }

    // 3. Overlap check with previous period
    if (i > 0 && startMins >= 0) {
      const prev = periods[i - 1];
      const prevEndMins = timeToMinutes(prev.end);
      if (prevEndMins >= 0 && startMins < prevEndMins) {
        fieldError.startError = `Jam ${pNum} bertabrakan dengan Jam ${prev.periodNumber} (selesai ${prev.end})`;
      }
    }

    if (fieldError.startError || fieldError.endError || fieldError.generalError) {
      errors[pNum] = fieldError;
      errorCount++;
    }
  }

  return {
    isValid: errorCount === 0,
    errors,
    errorCount,
  };
}

export interface PeriodGap {
  afterPeriodNumber: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  label: string;
}

/**
 * Detects gaps between consecutive periods to display as thin break rows
 * (e.g. "Istirahat - 15 mnt" or "Ishoma - 45 mnt").
 */
export function detectPeriodGaps(
  periods: PeriodTime[],
  breakEntries?: Array<{ label?: string; startTime?: string; endTime?: string; periodNumber?: number }>
): PeriodGap[] {
  const gaps: PeriodGap[] = [];

  for (let i = 0; i < periods.length - 1; i++) {
    const curr = periods[i];
    const next = periods[i + 1];

    const currEndMins = timeToMinutes(curr.end);
    const nextStartMins = timeToMinutes(next.start);

    if (currEndMins > 0 && nextStartMins > currEndMins) {
      const duration = nextStartMins - currEndMins;
      const startTime = curr.end;
      const endTime = next.start;

      // Check if custom break entry matches
      const customBreak = breakEntries?.find(
        (b) =>
          b.periodNumber === curr.periodNumber ||
          (b.startTime === startTime && b.endTime === endTime)
      );

      let label: string;
      if (customBreak?.label) {
        label = `${customBreak.label} - ${duration} mnt`;
      } else if (duration >= 35 || currEndMins >= 11 * 60 + 30) {
        label = `Ishoma - ${duration} mnt`;
      } else {
        label = `Istirahat - ${duration} mnt`;
      }

      gaps.push({
        afterPeriodNumber: curr.periodNumber,
        startTime,
        endTime,
        durationMinutes: duration,
        label,
      });
    }
  }

  return gaps;
}

