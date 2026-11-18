/**
 * StudyAir Mobile — Timetable By Day Grouping Engine
 * 
 * Provides deterministic day grouping, chronological sorting of classes, breaks, and events,
 * Mon-Fri vs Mon-Sat schedule detection, A/B week pattern filtering, and day summary metrics.
 * 
 * Specification:
 * - Groups TimetableEntry records by weekday (1 = Senin/Mon ... 7 = Minggu/Sun, Monday first).
 * - Sorts each day by period number and start time; breaks and events (kind = break/event)
 *   are placed chronologically by time within the day.
 * - Localized day names follow app language (id: Senin..Minggu, en: Monday..Sunday).
 * - Shows only days with entries, plus any days added manually.
 * - Automatically detects Mon-Fri (5-day) vs Mon-Sat (6-day) schedule from data.
 * - Detects presence of weekPattern "A" or "B" to control A/B toggle visibility.
 */

import { TimetableEntry, PeriodTime, TimetableEntryKind, WeekPattern } from "../types";
import { getLanguage, Language } from "./i18n";

export interface WeekdayMetaItem {
  day: number; // 1 = Monday, ..., 7 = Sunday
  nameId: string;
  nameEn: string;
  shortId: string;
  shortEn: string;
}

export const WEEKDAYS: WeekdayMetaItem[] = [
  { day: 1, nameId: "Senin", nameEn: "Monday", shortId: "Sen", shortEn: "Mon" },
  { day: 2, nameId: "Selasa", nameEn: "Tuesday", shortId: "Sel", shortEn: "Tue" },
  { day: 3, nameId: "Rabu", nameEn: "Wednesday", shortId: "Rab", shortEn: "Wed" },
  { day: 4, nameId: "Kamis", nameEn: "Thursday", shortId: "Kam", shortEn: "Thu" },
  { day: 5, nameId: "Jumat", nameEn: "Friday", shortId: "Jum", shortEn: "Fri" },
  { day: 6, nameId: "Sabtu", nameEn: "Saturday", shortId: "Sab", shortEn: "Sat" },
  { day: 7, nameId: "Minggu", nameEn: "Sunday", shortId: "Min", shortEn: "Sun" },
];

export interface DayTimetableGroup {
  day: number; // 1 = Monday ... 7 = Sunday
  dayName: string; // "Senin" | "Monday"
  dayShort: string; // "Sen" | "Mon"
  isToday: boolean;
  entries: TimetableEntry[];
  classCount: number; // Excludes breaks and events
  breakCount: number;
  eventCount: number;
  timeRange: { start: string; end: string } | null;
  headerSummary: string; // e.g. "Senin • 8 classes • 07:00 - 15:30"
}

export type SchoolWeekType = "mon-fri" | "mon-sat" | "mon-sun" | "empty";

export interface GroupedTimetableResult {
  days: DayTimetableGroup[];
  hasWeekPatternAB: boolean;
  detectedSchoolWeek: SchoolWeekType;
  totalClasses: number;
  totalBreaks: number;
  totalEvents: number;
}

export interface GroupTimetableOptions {
  periodTimes?: PeriodTime[];
  activeWeekPattern?: "A" | "B" | "all";
  manualDays?: number[];
  language?: Language;
  todayDay?: number; // 1 = Monday ... 7 = Sunday (defaults to current system day)
}

/**
 * Parses "HH:mm" time string into total minutes from midnight.
 */
export function timeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Formats total minutes from midnight into "HH:mm".
 */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Returns today's weekday index (1 = Monday ... 7 = Sunday).
 */
export function getTodayWeekday(): number {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  return day === 0 ? 7 : day;
}

/**
 * Resolves effective start and end time for an entry, either from its own
 * explicit times or mapped via periodTimes lookup.
 */
export function getEntryEffectiveTime(
  entry: TimetableEntry,
  periodTimesMap: Map<number, PeriodTime>
): { start: string; end: string; startMins: number; endMins: number } | null {
  if (entry.startTime) {
    const sMins = timeToMinutes(entry.startTime);
    if (sMins !== null) {
      const eMins = timeToMinutes(entry.endTime) ?? sMins + 45;
      return {
        start: entry.startTime,
        end: entry.endTime || minutesToTime(eMins),
        startMins: sMins,
        endMins: eMins,
      };
    }
  }

  if (entry.periodNumber > 0 && periodTimesMap.has(entry.periodNumber)) {
    const pt = periodTimesMap.get(entry.periodNumber)!;
    const sMins = timeToMinutes(pt.start);
    const eMins = timeToMinutes(pt.end);
    if (sMins !== null && eMins !== null) {
      return {
        start: pt.start,
        end: pt.end,
        startMins: sMins,
        endMins: eMins,
      };
    }
  }

  // Fallback: estimate time based on period number if positive
  if (entry.periodNumber > 0) {
    const fallbackStart = 7 * 60 + (entry.periodNumber - 1) * 45;
    const fallbackEnd = fallbackStart + 45;
    return {
      start: minutesToTime(fallbackStart),
      end: minutesToTime(fallbackEnd),
      startMins: fallbackStart,
      endMins: fallbackEnd,
    };
  }

  return null;
}

/**
 * Deterministic comparator for day entries:
 * 1. Placed chronologically by start time.
 * 2. If start times are identical or unavailable, ordered by periodNumber.
 * 3. Events occurring at the start of a period come before classes; breaks come after or between periods.
 */
export function compareDayEntries(
  a: TimetableEntry,
  b: TimetableEntry,
  periodTimesMap: Map<number, PeriodTime>
): number {
  const timeA = getEntryEffectiveTime(a, periodTimesMap);
  const timeB = getEntryEffectiveTime(b, periodTimesMap);

  // If both have resolved start times, compare times primarily
  if (timeA && timeB) {
    if (timeA.startMins !== timeB.startMins) {
      return timeA.startMins - timeB.startMins;
    }

    // Identical start time: sort event first, then class, then break
    const kindWeight = (k?: TimetableEntryKind) => {
      if (k === "event") return 1;
      if (k === "class" || !k) return 2;
      if (k === "break") return 3;
      return 2;
    };

    const weightDiff = kindWeight(a.kind) - kindWeight(b.kind);
    if (weightDiff !== 0) return weightDiff;

    if (a.periodNumber !== b.periodNumber) {
      return a.periodNumber - b.periodNumber;
    }

    return a.id.localeCompare(b.id);
  }

  // If only one has a start time and the other has a periodNumber
  if (a.periodNumber !== b.periodNumber) {
    return a.periodNumber - b.periodNumber;
  }

  if (timeA && !timeB) return -1;
  if (!timeA && timeB) return 1;

  return a.id.localeCompare(b.id);
}

/**
 * Detects Mon-Fri (5-day) vs Mon-Sat (6-day) vs Mon-Sun from timetable entries.
 */
export function detectSchoolWeek(entries: TimetableEntry[]): SchoolWeekType {
  if (entries.length === 0) return "empty";
  const days = new Set(entries.map((e) => e.weekday));

  if (days.has(7)) return "mon-sun";
  if (days.has(6)) return "mon-sat";
  if ([1, 2, 3, 4, 5].some((d) => days.has(d))) return "mon-fri";

  return "empty";
}

/**
 * Detects if any entries have an A/B week pattern.
 */
export function checkHasWeekPatternAB(entries: TimetableEntry[]): boolean {
  return entries.some((e) => e.weekPattern === "A" || e.weekPattern === "B");
}

/**
 * Formats the day header summary string according to language and metrics:
 * e.g. "Senin • 8 kelas • 07:00 - 15:30" (id)
 * e.g. "Monday • 8 classes • 07:00 - 15:30" (en)
 * Breaks are explicitly NOT counted as classes.
 */
export function formatDayHeaderSummary(
  dayName: string,
  classCount: number,
  timeRange: { start: string; end: string } | null,
  lang: Language = "en"
): string {
  const classWord =
    lang === "id"
      ? `${classCount} kelas`
      : classCount === 1
      ? "1 class"
      : `${classCount} classes`;

  if (!timeRange) {
    return `${dayName} • ${classWord}`;
  }

  return `${dayName} • ${classWord} • ${timeRange.start} - ${timeRange.end}`;
}

/**
 * Primary grouping function:
 * Groups TimetableEntry records by weekday, sorts each day by period number & start time,
 * places breaks and events by time, detects Mon-Fri vs Mon-Sat, checks A/B week patterns,
 * and shows only days with entries plus manual days.
 */
export function groupTimetableByDay(
  entries: TimetableEntry[],
  options: GroupTimetableOptions = {}
): GroupedTimetableResult {
  const lang: Language = options.language || getLanguage() || "en";
  const todayDay = options.todayDay ?? getTodayWeekday();

  // Create fast period times lookup
  const periodTimesMap = new Map<number, PeriodTime>();
  if (options.periodTimes) {
    for (const pt of options.periodTimes) {
      periodTimesMap.set(pt.periodNumber, pt);
    }
  }

  const hasAB = checkHasWeekPatternAB(entries);
  const detectedWeek = detectSchoolWeek(entries);

  // Filter by active week pattern if requested
  let filteredEntries = entries;
  if (options.activeWeekPattern === "A") {
    filteredEntries = entries.filter((e) => e.weekPattern === "every" || e.weekPattern === "A");
  } else if (options.activeWeekPattern === "B") {
    filteredEntries = entries.filter((e) => e.weekPattern === "every" || e.weekPattern === "B");
  }

  // Determine active days: days with entries + manually added days
  const activeDaysSet = new Set<number>();
  for (const entry of filteredEntries) {
    if (entry.weekday >= 1 && entry.weekday <= 7) {
      activeDaysSet.add(entry.weekday);
    }
  }

  if (options.manualDays) {
    for (const manualDay of options.manualDays) {
      if (manualDay >= 1 && manualDay <= 7) {
        activeDaysSet.add(manualDay);
      }
    }
  }

  // Sort active days Monday-first (1..7)
  const sortedDays = Array.from(activeDaysSet).sort((a, b) => a - b);

  let totalClasses = 0;
  let totalBreaks = 0;
  let totalEvents = 0;

  const dayGroups: DayTimetableGroup[] = sortedDays.map((dayNum) => {
    const meta = WEEKDAYS.find((w) => w.day === dayNum)!;
    const dayName = lang === "id" ? meta.nameId : meta.nameEn;
    const dayShort = lang === "id" ? meta.shortId : meta.shortEn;
    const isToday = dayNum === todayDay;

    // Filter and sort entries for this specific day
    const dayEntries = filteredEntries
      .filter((e) => e.weekday === dayNum)
      .sort((a, b) => compareDayEntries(a, b, periodTimesMap));

    // Calculate metrics
    let classCount = 0;
    let breakCount = 0;
    let eventCount = 0;

    let earliestStartMins = Infinity;
    let earliestStartStr = "";
    let latestEndMins = -Infinity;
    let latestEndStr = "";

    for (const entry of dayEntries) {
      if (entry.kind === "break") {
        breakCount++;
      } else if (entry.kind === "event") {
        eventCount++;
      } else {
        classCount++;
      }

      const effTime = getEntryEffectiveTime(entry, periodTimesMap);
      if (effTime) {
        if (effTime.startMins < earliestStartMins) {
          earliestStartMins = effTime.startMins;
          earliestStartStr = effTime.start;
        }
        if (effTime.endMins > latestEndMins) {
          latestEndMins = effTime.endMins;
          latestEndStr = effTime.end;
        }
      }
    }

    totalClasses += classCount;
    totalBreaks += breakCount;
    totalEvents += eventCount;

    const timeRange =
      earliestStartMins !== Infinity && latestEndMins !== -Infinity
        ? { start: earliestStartStr, end: latestEndStr }
        : null;

    const headerSummary = formatDayHeaderSummary(dayName, classCount, timeRange, lang);

    return {
      day: dayNum,
      dayName,
      dayShort,
      isToday,
      entries: dayEntries,
      classCount,
      breakCount,
      eventCount,
      timeRange,
      headerSummary,
    };
  });

  return {
    days: dayGroups,
    hasWeekPatternAB: hasAB,
    detectedSchoolWeek: detectedWeek,
    totalClasses,
    totalBreaks,
    totalEvents,
  };
}
