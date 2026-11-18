/**
 * StudyAir Mobile — Single Source of Truth for Daily Schedule Items (Step 2)
 * 
 * Unifies schedule calculation across:
 * - Pelajaran Per hari (TimetableDayView)
 * - Kalender (CalendarScreen)
 * - Today / Tomorrow (HomeScreen)
 * - Subject Sheet (SubjectDetailModal)
 * - Reminders & Notifications
 * 
 * Guarantees:
 * 1. Returns ordered items: class blocks (consecutive periods merged with original periods inside),
 *    breaks, and events.
 * 2. Every header count comes from this output: "6 pelajaran - 10 JP - 07:00-14:30".
 * 3. The empty state appears ONLY when this function returns zero items.
 * 4. Automatic orphan detection ("Mapel hilang") and duplicate/conflict detection.
 * 5. Debug assertion helper to verify header count === rendered rows.
 */

import { format, parseISO } from "date-fns";
import {
  Subject,
  TimetableEntry,
  PeriodTime,
  Override,
  DayOff,
  WeekPattern,
  TimetableEntryKind,
  OverrideType,
} from "../types";
import {
  WEEKDAYS,
  timeToMinutes,
  minutesToTime,
  getEntryEffectiveTime,
} from "./timetableGrouping";
import { formatPeriodRange } from "./periodUtils";

export interface DayScheduleItem {
  id: string;
  type: "class" | "break" | "event";
  title: string;
  subject?: Subject;
  subjectId?: string;
  isOrphan?: boolean;
  startPeriod: number;
  endPeriod: number;
  periodCount: number; // JP (Jam Pelajaran)
  periodLabel: string; // e.g. "Jam 1-2"
  compactPeriodLabel: string; // e.g. "J1-2"
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "08:30"
  startMins: number;
  endMins: number;
  durationMins: number;
  timeRangeStr: string; // e.g. "07:00 - 08:30"
  room?: string;
  teacher?: string;
  color: string;
  hasConflict?: boolean;
  conflictEntries?: TimetableEntry[];
  periods: TimetableEntry[];
  rawEntry?: TimetableEntry;
  isOverride?: boolean;
  overrideType?: OverrideType;
  originalSubjectName?: string;
}

export interface DayScheduleSummary {
  weekday: number; // 1 = Monday ... 7 = Sunday
  dateStr?: string; // "YYYY-MM-DD" if date-based
  dayName: string; // "Senin", "Selasa", etc.
  dayShort: string; // "Sen", "Sel", etc.
  isToday: boolean;
  isDayOff: boolean;
  dayOffReason?: string;
  items: DayScheduleItem[]; // Ordered chronologically
  classBlocks: DayScheduleItem[]; // type === "class"
  breaks: DayScheduleItem[]; // type === "break"
  events: DayScheduleItem[]; // type === "event"
  classCount: number; // Number of distinct merged class blocks (e.g. 6)
  jpCount: number; // Total period count (e.g. 10 JP)
  breakCount: number;
  eventCount: number;
  timeRange: { start: string; end: string } | null;
  headerSummary: string; // "6 pelajaran - 10 JP - 07:00-14:30"
  empty: boolean;
  orphans: DayScheduleItem[];
  conflicts: DayScheduleItem[];
}

export interface GetDayItemsOptions {
  timetableEntries: TimetableEntry[];
  subjects: Subject[];
  periodTimes: PeriodTime[];
  overrides?: Override[];
  daysOff?: DayOff[];
  activeWeekPattern?: "A" | "B" | "all";
  language?: "id" | "en";
}

/**
 * Classifies a raw name or customLabel into "class", "break", or "event".
 * Ambiguous names like "Literasi" default to "event".
 */
export function classifyTimetableKind(
  kind?: TimetableEntryKind,
  rawName?: string,
  customLabel?: string
): "class" | "break" | "event" {
  if (kind === "break") return "break";
  if (kind === "event") return "event";

  const text = (customLabel || rawName || "").toLowerCase().trim();
  if (!text) return "class";

  const breakRegex = /\b(istirahat|ishoma|recess|break|jeda|snack|makan siang|tidur siang)\b/i;
  if (breakRegex.test(text)) return "break";

  const eventRegex = /\b(literasi|upacara|apel|senam|kebersihan|bimbingan konseling|\bbk\b|wali kelas|sholat|dhuha|dzuhur|kultum|assembly|ceremony|tadarus|doa bersama)\b/i;
  if (eventRegex.test(text)) return "event";

  return "class";
}

/**
 * Primary single source of truth function for day schedule items.
 */
export function getDayItems(
  target: number | Date | string,
  options: GetDayItemsOptions
): DayScheduleSummary {
  const {
    timetableEntries = [],
    subjects = [],
    periodTimes = [],
    overrides = [],
    daysOff = [],
    activeWeekPattern = "all",
    language = "id",
  } = options;

  // 1. Resolve target date and weekday
  let targetDateStr: string | undefined = undefined;
  let weekday: number = 1;

  if (typeof target === "number") {
    weekday = Math.min(Math.max(1, target), 7);
  } else {
    const dateObj = typeof target === "string" ? parseISO(target) : target;
    targetDateStr = format(dateObj, "yyyy-MM-dd");
    const jsDay = dateObj.getDay();
    weekday = jsDay === 0 ? 7 : jsDay;
  }

  const meta = WEEKDAYS.find((w) => w.day === weekday) || WEEKDAYS[0];
  const dayName = language === "id" ? meta.nameId : meta.nameEn;
  const dayShort = language === "id" ? meta.shortId : meta.shortEn;

  // Check today
  const todayDay = new Date().getDay();
  const currentWeekday = todayDay === 0 ? 7 : todayDay;
  const isToday = weekday === currentWeekday;

  // Check Day Off
  let isDayOff = false;
  let dayOffReason: string | undefined = undefined;
  if (targetDateStr) {
    const dOff = daysOff.find((d) => d.date === targetDateStr);
    if (dOff) {
      isDayOff = true;
      dayOffReason = dOff.reason;
    }
  }

  // Fast maps
  const subjectsMap = new Map<string, Subject>();
  for (const s of subjects) {
    subjectsMap.set(s.id, s);
  }

  // Two-pass priority map: default bell times first, then override with weekday-specific bell times (e.g. Friday)
  const periodTimesMap = new Map<number, PeriodTime>();
  for (const pt of periodTimes) {
    if (pt.weekday === null || pt.weekday === undefined) {
      periodTimesMap.set(pt.periodNumber, pt);
    }
  }
  for (const pt of periodTimes) {
    if (pt.weekday === weekday) {
      periodTimesMap.set(pt.periodNumber, pt);
    }
  }

  // If day off, return empty items with day off reason
  if (isDayOff) {
    return {
      weekday,
      dateStr: targetDateStr,
      dayName,
      dayShort,
      isToday,
      isDayOff: true,
      dayOffReason,
      items: [],
      classBlocks: [],
      breaks: [],
      events: [],
      classCount: 0,
      jpCount: 0,
      breakCount: 0,
      eventCount: 0,
      timeRange: null,
      headerSummary: `${dayName} - Libur: ${dayOffReason}`,
      empty: true,
      orphans: [],
      conflicts: [],
    };
  }

  // 2. Filter entries for this weekday & weekPattern
  let dayEntries = timetableEntries.filter((e) => e.weekday === weekday);

  if (activeWeekPattern !== "all") {
    dayEntries = dayEntries.filter(
      (e) => e.weekPattern === "every" || e.weekPattern === activeWeekPattern
    );
  }

  // 3. Apply Date Overrides if target is date-based
  const activeEntries: Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }> = [];
  const dateOverrides = targetDateStr ? overrides.filter((o) => o.date === targetDateStr) : [];

  for (const entry of dayEntries) {
    const ov = dateOverrides.find((o) => o.entryId === entry.id);
    if (ov?.type === "cancelled") {
      continue; // Skip cancelled entries
    } else if (ov?.type === "swapped" && ov.newSubjectId) {
      activeEntries.push({
        ...entry,
        subjectId: ov.newSubjectId,
        periodNumber: ov.periodNumber || entry.periodNumber,
        customLabel: ov.customLabel || entry.customLabel,
        isOverride: true,
        overrideType: "swapped",
      });
    } else {
      activeEntries.push(entry);
    }
  }

  // Add added overrides
  if (targetDateStr) {
    const addedOverrides = dateOverrides.filter((o) => o.type === "added");
    for (const add of addedOverrides) {
      activeEntries.push({
        id: add.entryId || `added-${targetDateStr}-${add.periodNumber || 1}`,
        subjectId: add.newSubjectId || "",
        weekday,
        periodNumber: add.periodNumber || 1,
        weekPattern: "every",
        kind: "class",
        customLabel: add.customLabel,
        isOverride: true,
        overrideType: "added",
      });
    }
  }

  // 4. Categorize entries: class, break, event
  const rawClassEntries: Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }> = [];
  const rawBreaks: Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }> = [];
  const rawEvents: Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }> = [];

  for (const entry of activeEntries) {
    const subj = subjectsMap.get(entry.subjectId);
    const resolvedKind = classifyTimetableKind(
      entry.kind,
      subj?.name || subj?.title,
      entry.customLabel
    );

    if (resolvedKind === "break") {
      rawBreaks.push(entry);
    } else if (resolvedKind === "event") {
      rawEvents.push(entry);
    } else {
      rawClassEntries.push(entry);
    }
  }

  // 5. Detect conflicts (same periodNumber among classes)
  const periodCountMap = new Map<number, Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }>>();
  for (const ce of rawClassEntries) {
    const arr = periodCountMap.get(ce.periodNumber) || [];
    arr.push(ce);
    periodCountMap.set(ce.periodNumber, arr);
  }

  const conflictingPeriods = new Set<number>();
  for (const [pNum, list] of periodCountMap.entries()) {
    if (list.length > 1) {
      conflictingPeriods.add(pNum);
    }
  }

  // Separate non-conflicting entries for merging, keep conflicting entries standalone
  const nonConflicting = rawClassEntries.filter((e) => !conflictingPeriods.has(e.periodNumber));
  const conflicting = rawClassEntries.filter((e) => conflictingPeriods.has(e.periodNumber));

  // Sort non-conflicting by period number
  nonConflicting.sort((a, b) => a.periodNumber - b.periodNumber);

  // Merge consecutive periods of same subject, room, teacher
  const mergedClassGroups: Array<Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }>> = [];
  if (nonConflicting.length > 0) {
    let currentGroup: Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }> = [nonConflicting[0]];

    for (let i = 1; i < nonConflicting.length; i++) {
      const prev = nonConflicting[i - 1];
      const curr = nonConflicting[i];

      const isConsecutive = curr.periodNumber === prev.periodNumber + 1;
      const sameSubject = (curr.subjectId || "") === (prev.subjectId || "");
      const sameRoom = (curr.room || "") === (prev.room || "");
      const sameTeacher = (curr.teacher || "") === (prev.teacher || "");

      if (isConsecutive && sameSubject && sameRoom && sameTeacher) {
        currentGroup.push(curr);
      } else {
        mergedClassGroups.push(currentGroup);
        currentGroup = [curr];
      }
    }
    if (currentGroup.length > 0) {
      mergedClassGroups.push(currentGroup);
    }
  }

  const items: DayScheduleItem[] = [];
  const orphanItems: DayScheduleItem[] = [];
  const conflictItems: DayScheduleItem[] = [];

  // Helper to convert entry/group into DayScheduleItem
  const buildClassItem = (
    group: Array<TimetableEntry & { isOverride?: boolean; overrideType?: OverrideType }>,
    hasConflict: boolean = false,
    allConflictsForPeriod?: TimetableEntry[]
  ): DayScheduleItem => {
    const lead = group[0];
    const tail = group[group.length - 1];
    const startP = lead.periodNumber;
    const endP = tail.periodNumber;
    const pCount = endP - startP + 1;

    const matchedSubject = subjectsMap.get(lead.subjectId);
    const isOrphan = !matchedSubject && lead.kind !== "break" && lead.kind !== "event";

    const title = isOrphan
      ? lead.customLabel || "Mapel hilang"
      : lead.customLabel || matchedSubject?.title || matchedSubject?.name || "Mata Pelajaran";

    const color = isOrphan
      ? "#94A3B8"
      : matchedSubject?.color || matchedSubject?.color_hex || "#3A86FF";

    const room = lead.room || matchedSubject?.room;
    const teacher = lead.teacher || matchedSubject?.teacher;

    // Time calculation
    const effLeadTime = getEntryEffectiveTime(lead, periodTimesMap);
    const effTailTime = getEntryEffectiveTime(tail, periodTimesMap);

    const sMins = effLeadTime?.startMins ?? startP * 60;
    const eMins = effTailTime?.endMins ?? (endP + 1) * 60;
    const startTime = effLeadTime?.start ?? minutesToTime(sMins);
    const endTime = effTailTime?.end ?? minutesToTime(eMins);
    const timeRangeStr = `${startTime} - ${endTime}`;

    const item: DayScheduleItem = {
      id: hasConflict ? `conflict-${lead.id}` : group.length > 1 ? `merged-${lead.id}-${tail.id}` : lead.id,
      type: "class",
      title,
      subject: matchedSubject,
      subjectId: lead.subjectId,
      isOrphan,
      startPeriod: startP,
      endPeriod: endP,
      periodCount: pCount,
      periodLabel: formatPeriodRange(startP, endP, false),
      compactPeriodLabel: formatPeriodRange(startP, endP, true),
      startTime,
      endTime,
      startMins: sMins,
      endMins: eMins,
      durationMins: Math.max(1, eMins - sMins),
      timeRangeStr,
      room,
      teacher,
      color,
      hasConflict,
      conflictEntries: allConflictsForPeriod,
      periods: group,
      rawEntry: lead,
      isOverride: (lead as any).isOverride,
      overrideType: (lead as any).overrideType,
      originalSubjectName: (lead as any).originalSubject?.title,
    };

    if (isOrphan) orphanItems.push(item);
    if (hasConflict) conflictItems.push(item);

    return item;
  };

  // Add merged classes
  for (const group of mergedClassGroups) {
    items.push(buildClassItem(group, false));
  }

  // Add conflicting classes individually with conflict flag
  for (const cEntry of conflicting) {
    const allForP = conflicting.filter((e) => e.periodNumber === cEntry.periodNumber);
    items.push(buildClassItem([cEntry], true, allForP));
  }

  // 6. Add explicit breaks
  for (const b of rawBreaks) {
    const timeInfo = getEntryEffectiveTime(b, periodTimesMap);
    const sMins = timeInfo?.startMins ?? b.periodNumber * 60;
    const eMins = timeInfo?.endMins ?? sMins + 30;
    const startTime = timeInfo?.start ?? minutesToTime(sMins);
    const endTime = timeInfo?.end ?? minutesToTime(eMins);

    items.push({
      id: b.id,
      type: "break",
      title: b.customLabel || "Istirahat",
      startPeriod: b.periodNumber,
      endPeriod: b.periodNumber,
      periodCount: 0,
      periodLabel: `Istirahat`,
      compactPeriodLabel: `Break`,
      startTime,
      endTime,
      startMins: sMins,
      endMins: eMins,
      durationMins: Math.max(1, eMins - sMins),
      timeRangeStr: `${startTime} - ${endTime}`,
      color: "#94A3B8",
      periods: [b],
      rawEntry: b,
      isOverride: b.isOverride,
      overrideType: b.overrideType,
    });
  }

  // 7. Add explicit events (e.g. Literasi, Upacara)
  for (const ev of rawEvents) {
    const timeInfo = getEntryEffectiveTime(ev, periodTimesMap);
    const sMins = timeInfo?.startMins ?? ev.periodNumber * 60;
    const eMins = timeInfo?.endMins ?? sMins + 30;
    const startTime = timeInfo?.start ?? minutesToTime(sMins);
    const endTime = timeInfo?.end ?? minutesToTime(eMins);

    items.push({
      id: ev.id,
      type: "event",
      title: ev.customLabel || "Literasi / Kegiatan",
      startPeriod: ev.periodNumber,
      endPeriod: ev.periodNumber,
      periodCount: 0,
      periodLabel: ev.customLabel || "Kegiatan",
      compactPeriodLabel: "Kegiatan",
      startTime,
      endTime,
      startMins: sMins,
      endMins: eMins,
      durationMins: Math.max(1, eMins - sMins),
      timeRangeStr: `${startTime} - ${endTime}`,
      color: "#06B6D4",
      periods: [ev],
      rawEntry: ev,
      isOverride: ev.isOverride,
      overrideType: ev.overrideType,
    });
  }

  // 8. Sort chronologically by startMins, then startPeriod
  items.sort((a, b) => {
    if (a.startMins !== b.startMins) return a.startMins - b.startMins;
    if (a.startPeriod !== b.startPeriod) return a.startPeriod - b.startPeriod;
    return a.id.localeCompare(b.id);
  });

  // 9. Detect bell time gaps between items (>= 15 mins not covered by an explicit break)
  const fullItemsWithGaps: DayScheduleItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    if (i > 0) {
      const prev = items[i - 1];
      const gapMins = current.startMins - prev.endMins;
      if (gapMins >= 15) {
        const gapStart = minutesToTime(prev.endMins);
        const gapEnd = minutesToTime(current.startMins);
        const isIshoma = prev.endMins >= 11 * 60 + 30 && current.startMins <= 13 * 60 + 30;
        const gapTitle = isIshoma ? "Ishoma" : "Istirahat";
        fullItemsWithGaps.push({
          id: `gap-${prev.id}-${current.id}`,
          type: "break",
          title: gapTitle,
          startPeriod: prev.endPeriod,
          endPeriod: current.startPeriod,
          periodCount: 0,
          periodLabel: gapTitle,
          compactPeriodLabel: gapTitle,
          startTime: gapStart,
          endTime: gapEnd,
          startMins: prev.endMins,
          endMins: current.startMins,
          durationMins: current.startMins - prev.endMins,
          timeRangeStr: `${gapStart} - ${gapEnd}`,
          color: "#94A3B8",
          periods: [],
        });
      }
    }
    fullItemsWithGaps.push(current);
  }

  // 10. Summary Metrics
  const classBlocks = fullItemsWithGaps.filter((it) => it.type === "class");
  const breaks = fullItemsWithGaps.filter((it) => it.type === "break");
  const events = fullItemsWithGaps.filter((it) => it.type === "event");

  const classCount = classBlocks.length;
  const jpCount = classBlocks.reduce((acc, b) => acc + (b.periodCount || 1), 0);
  const breakCount = breaks.length;
  const eventCount = events.length;

  let timeRange: { start: string; end: string } | null = null;
  if (fullItemsWithGaps.length > 0) {
    const earliest = fullItemsWithGaps[0].startTime;
    const latest = fullItemsWithGaps[fullItemsWithGaps.length - 1].endTime;
    timeRange = { start: earliest, end: latest };
  }

  // Header format: "6 pelajaran - 10 JP - 07:00-14:30"
  const headerParts = [
    `${classCount} pelajaran`,
    `${jpCount} JP`,
  ];
  if (timeRange) {
    headerParts.push(`${timeRange.start}-${timeRange.end}`);
  }
  const headerSummary = headerParts.join(" - ");

  return {
    weekday,
    dateStr: targetDateStr,
    dayName,
    dayShort,
    isToday,
    isDayOff: false,
    items: fullItemsWithGaps,
    classBlocks,
    breaks,
    events,
    classCount,
    jpCount,
    breakCount,
    eventCount,
    timeRange,
    headerSummary,
    empty: fullItemsWithGaps.length === 0,
    orphans: orphanItems,
    conflicts: conflictItems,
  };
}

/**
 * Debug assertion: logs an error if the header count differs from the rendered rows.
 */
export function assertDayHeaderCountMatches(
  headerCount: number,
  renderedCount: number,
  context: string = ""
): void {
  if (headerCount !== renderedCount) {
    console.error(
      `[Timetable Assertion Failed] ${context} Header count (${headerCount}) does not match rendered rows (${renderedCount})!`
    );
  }
}
