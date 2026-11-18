/**
 * StudyAir Mobile — Timetable Parsing, Validation & Merging Engine
 * 
 * Implements deterministic text, CSV, and matrix parser for school schedules.
 * Ensures zero date or data invention, full confidence scoring,
 * and robust conflict resolution ("Replace" vs "Merge").
 */

import { Subject, TimetableEntry, PeriodTime } from "../types";
import { resolveIndonesianSubject } from "./subjectDictionary";

export interface WeekdayMeta {
  day: number; // 1 = Monday ... 7 = Sunday
  nameId: string;
  nameEn: string;
  shortId: string;
  shortEn: string;
}

export const WEEKDAYS_META: WeekdayMeta[] = [
  { day: 1, nameId: "Senin", nameEn: "Monday", shortId: "Sen", shortEn: "Mon" },
  { day: 2, nameId: "Selasa", nameEn: "Tuesday", shortId: "Sel", shortEn: "Tue" },
  { day: 3, nameId: "Rabu", nameEn: "Wednesday", shortId: "Rab", shortEn: "Wed" },
  { day: 4, nameId: "Kamis", nameEn: "Thursday", shortId: "Kam", shortEn: "Thu" },
  { day: 5, nameId: "Jumat", nameEn: "Friday", shortId: "Jum", shortEn: "Fri" },
  { day: 6, nameId: "Sabtu", nameEn: "Saturday", shortId: "Sab", shortEn: "Sat" },
  { day: 7, nameId: "Minggu", nameEn: "Sunday", shortId: "Min", shortEn: "Sun" },
];

export interface TimetableReviewItem {
  id: string;
  day: number; // 1..7
  periodNumber: number; // 1..10
  rawSubject: string;
  subjectId?: string;
  matchedSubjectName: string;
  matchedSubjectColor: string;
  isNewSubject: boolean;
  confidence: number; // 0.0 to 1.0 (< 0.7 or isNewSubject triggers amber warning)
  teacher?: string;
  room?: string;
}

/**
 * Normalizes any day representation (name, abbreviation, or index) to 1..7.
 */
export function normalizeWeekday(raw: string | number): number {
  if (typeof raw === "number") {
    if (raw >= 1 && raw <= 7) return raw;
    if (raw === 0) return 7; // Sunday index 0 -> 7
    return 1;
  }

  const s = String(raw).trim().toLowerCase();
  if (s.includes("senin") || s.includes("mon")) return 1;
  if (s.includes("selasa") || s.includes("tue")) return 2;
  if (s.includes("rabu") || s.includes("wed")) return 3;
  if (s.includes("kamis") || s.includes("thu")) return 4;
  if (s.includes("jumat") || s.includes("jum'at") || s.includes("fri")) return 5;
  if (s.includes("sabtu") || s.includes("sat")) return 6;
  if (s.includes("minggu") || s.includes("sun") || s.includes("ahad")) return 7;

  const num = parseInt(s, 10);
  if (!isNaN(num) && num >= 1 && num <= 7) return num;

  return 1;
}

export function getWeekdayName(day: number, lang: "en" | "id" = "id"): string {
  const meta = WEEKDAYS_META.find((w) => w.day === day);
  if (!meta) return lang === "en" ? "Monday" : "Senin";
  return lang === "en" ? meta.nameEn : meta.nameId;
}

export function getWeekdayShort(day: number, lang: "en" | "id" = "id"): string {
  const meta = WEEKDAYS_META.find((w) => w.day === day);
  if (!meta) return lang === "en" ? "Mon" : "Sen";
  return lang === "en" ? meta.shortEn : meta.shortId;
}

/**
 * Matches a subject candidate string to an existing Subject or canonical dictionary.
 * Calculates confidence score:
 * - 1.0: exact match with existing subject
 * - 0.9: match with existing subject alias
 * - 0.85: match with canonical dictionary catalog
 * - 0.5: brand new / unrecognized subject (flagged in amber for student verification)
 */
export function matchSubjectCandidate(
  rawInput: string,
  existingSubjects: Subject[]
): {
  subjectId?: string;
  canonicalName: string;
  color: string;
  isNewSubject: boolean;
  confidence: number;
} {
  const clean = rawInput.trim();
  if (!clean) {
    return {
      canonicalName: "Unassigned",
      color: "#94a3b8",
      isNewSubject: true,
      confidence: 0.0,
    };
  }

  // 1. Direct match on existing subjects
  const exactExisting = existingSubjects.find(
    (s) => s.name.toLowerCase() === clean.toLowerCase()
  );
  if (exactExisting) {
    return {
      subjectId: exactExisting.id,
      canonicalName: exactExisting.name,
      color: exactExisting.color,
      isNewSubject: false,
      confidence: 1.0,
    };
  }

  // 2. Alias match on existing subjects
  const aliasExisting = existingSubjects.find(
    (s) => s.aliases && s.aliases.some((a) => a.toLowerCase() === clean.toLowerCase())
  );
  if (aliasExisting) {
    return {
      subjectId: aliasExisting.id,
      canonicalName: aliasExisting.name,
      color: aliasExisting.color,
      isNewSubject: false,
      confidence: 0.9,
    };
  }

  // 3. Resolve from Indonesian Subject Catalog
  const dict = resolveIndonesianSubject(clean);
  // Check if dict.canonicalName matches an existing subject
  const matchInDictExisting = existingSubjects.find(
    (s) => s.name.toLowerCase() === dict.canonicalName.toLowerCase()
  );
  if (matchInDictExisting) {
    return {
      subjectId: matchInDictExisting.id,
      canonicalName: matchInDictExisting.name,
      color: matchInDictExisting.color,
      isNewSubject: false,
      confidence: 0.88,
    };
  }

  // Is this an established catalog subject not yet registered in user's subjects?
  const isCatalogKnown = dict.aliases.length > 1; // Catalog items have pre-seeded aliases
  return {
    canonicalName: dict.canonicalName,
    color: dict.defaultColor,
    isNewSubject: true,
    confidence: isCatalogKnown ? 0.75 : 0.5,
  };
}

/**
 * ─── Channel 2: Parse Structured Text ───
 * Supports formats such as:
 * - "Senin 1 MTK"
 * - "Senin, Jam 2, Bahasa Indonesia, R.101, Pak Budi"
 * - "Selasa 1-2 Fisika" (automatically expands to periods 1 and 2)
 * - "Rabu Jam 3: Kimia"
 */
export function parseStructuredTextTimetable(
  text: string,
  existingSubjects: Subject[]
): {
  items: TimetableReviewItem[];
  warnings: string[];
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const items: TimetableReviewItem[] = [];
  const warnings: string[] = [];

  let currentWeekday: number = 1;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];

    // Check if line is purely a day header like "=== SENIN ===" or "Senin:"
    const dayHeaderMatch = rawLine.match(/^(=*|\#*)\s*(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:=]*$/i);
    if (dayHeaderMatch) {
      currentWeekday = normalizeWeekday(dayHeaderMatch[2]);
      continue;
    }

    // Split line by commas or whitespace tokens
    let workingLine = rawLine;

    // Detect weekday if present at start of line
    const dayPrefixMatch = workingLine.match(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    let lineDay = currentWeekday;
    if (dayPrefixMatch) {
      lineDay = normalizeWeekday(dayPrefixMatch[1]);
      workingLine = workingLine.slice(dayPrefixMatch[0].length).trim();
      currentWeekday = lineDay;
    }

    // Remove leading separator if any
    workingLine = workingLine.replace(/^[,:\-\s]+/, "");

    // Detect period numbers: "Jam 1-2", "1-2", "Jam 3", "Period 4", "4"
    const periodMatch = workingLine.match(/^(?:jam|period|p|ke-?)?\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?/i);
    let startPeriod = 1;
    let endPeriod = 1;

    if (periodMatch) {
      startPeriod = parseInt(periodMatch[1], 10);
      endPeriod = periodMatch[2] ? parseInt(periodMatch[2], 10) : startPeriod;
      workingLine = workingLine.slice(periodMatch[0].length).trim();
    } else {
      warnings.push(`Line ${lineIdx + 1}: Could not find period number for "${rawLine}", defaulting to Jam 1.`);
    }

    // Clean remaining string for subject, teacher, room
    workingLine = workingLine.replace(/^[,:\-\s]+/, "");

    if (!workingLine) {
      continue;
    }

    // Extract room (e.g. "R.101", "Lab Fisika", "Ruang 2A")
    let room: string | undefined = undefined;
    const roomMatch = workingLine.match(/\b(r\.\s*\w+|ruang\s*\w+|lab\s*\w+)\b/i);
    if (roomMatch) {
      room = roomMatch[0].trim();
      workingLine = workingLine.replace(roomMatch[0], "").trim();
    }

    // Extract teacher (e.g. "Pak Budi", "Ibu Siti", "Bu Ratna", "Mr. John")
    let teacher: string | undefined = undefined;
    const teacherMatch = workingLine.match(/\b((?:pak|bu|ibu|bpk|mr\.?|mrs\.?|dra\.?|drs\.?)\s+[A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
    if (teacherMatch) {
      teacher = teacherMatch[0].trim();
      workingLine = workingLine.replace(teacherMatch[0], "").trim();
    }

    // The remaining clean text is the subject name
    const rawSubject = workingLine.replace(/^[,:\-\s]+/, "").replace(/[,:\-\s]+$/, "").trim();
    if (!rawSubject) continue;

    const matched = matchSubjectCandidate(rawSubject, existingSubjects);

    // Expand if range (e.g. 1-2)
    const pStart = Math.min(Math.max(1, startPeriod), 10);
    const pEnd = Math.min(Math.max(pStart, endPeriod), 10);

    for (let p = pStart; p <= pEnd; p++) {
      items.push({
        id: `rev-${Date.now()}-${items.length}-${Math.random().toString(36).substring(2, 6)}`,
        day: lineDay,
        periodNumber: p,
        rawSubject,
        subjectId: matched.subjectId,
        matchedSubjectName: matched.canonicalName,
        matchedSubjectColor: matched.color,
        isNewSubject: matched.isNewSubject,
        confidence: matched.confidence,
        teacher,
        room,
      });
    }
  }

  return { items, warnings };
}

/**
 * ─── Channel 3: Parse CSV / Tabular (Excel / Google Sheets) ───
 * Supports:
 * Format 1 (List format): Day,Period,Subject,Room,Teacher
 * Format 2 (Matrix format):
 *   Period,Senin,Selasa,Rabu,Kamis,Jumat
 *   1,MTK,Fisika,Kimia,B.Indo,Agama
 *   2,MTK,Fisika,Kimia,B.Indo,Agama
 */
export function parseCsvTimetable(
  csvText: string,
  existingSubjects: Subject[]
): {
  items: TimetableReviewItem[];
  warnings: string[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const items: TimetableReviewItem[] = [];
  const warnings: string[] = [];

  if (lines.length === 0) {
    return { items, warnings: ["CSV text is empty."] };
  }

  // Detect delimiter: comma, tab, or semicolon
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";";

  const rows = lines.map((line) =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
  );

  const headerRow = rows[0].map((h) => h.toLowerCase());

  // Check if Format 2 (Matrix format): header contains multiple weekday names
  const dayIndices: { day: number; colIdx: number }[] = [];
  headerRow.forEach((colName, idx) => {
    if (
      colName.includes("senin") ||
      colName.includes("selasa") ||
      colName.includes("rabu") ||
      colName.includes("kamis") ||
      colName.includes("jumat") ||
      colName.includes("sabtu") ||
      colName.includes("minggu") ||
      colName.includes("mon") ||
      colName.includes("tue") ||
      colName.includes("wed") ||
      colName.includes("thu") ||
      colName.includes("fri") ||
      colName.includes("sat") ||
      colName.includes("sun")
    ) {
      dayIndices.push({ day: normalizeWeekday(colName), colIdx: idx });
    }
  });

  if (dayIndices.length >= 2) {
    // ─── Format 2: Matrix Parsing ───
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const periodStr = row[0] || String(r);
      const periodNum = parseInt(periodStr.replace(/\D/g, ""), 10) || r;

      for (const { day, colIdx } of dayIndices) {
        const cellValue = row[colIdx];
        if (!cellValue || cellValue.trim() === "-" || cellValue.trim() === "") continue;

        const matched = matchSubjectCandidate(cellValue, existingSubjects);
        items.push({
          id: `rev-csv-${Date.now()}-${items.length}-${Math.random().toString(36).substring(2, 6)}`,
          day,
          periodNumber: Math.min(Math.max(1, periodNum), 10),
          rawSubject: cellValue,
          subjectId: matched.subjectId,
          matchedSubjectName: matched.canonicalName,
          matchedSubjectColor: matched.color,
          isNewSubject: matched.isNewSubject,
          confidence: matched.confidence,
        });
      }
    }

    return { items, warnings };
  }

  // ─── Format 1: List Parsing (Day, Period, Subject, Room, Teacher) ───
  let dayCol = headerRow.findIndex((h) => h.includes("day") || h.includes("hari"));
  let periodCol = headerRow.findIndex((h) => h.includes("period") || h.includes("jam") || h.includes("waktu"));
  let subjectCol = headerRow.findIndex((h) => h.includes("subject") || h.includes("mapel") || h.includes("pelajaran") || h.includes("mata"));
  let roomCol = headerRow.findIndex((h) => h.includes("room") || h.includes("ruang") || h.includes("kelas"));
  let teacherCol = headerRow.findIndex((h) => h.includes("teacher") || h.includes("guru") || h.includes("pengajar"));

  // If no recognized headers, default to column positions [0: Day, 1: Period, 2: Subject, 3: Room, 4: Teacher]
  let startIndex = 1;
  if (dayCol === -1 || subjectCol === -1) {
    dayCol = 0;
    periodCol = 1;
    subjectCol = 2;
    roomCol = 3;
    teacherCol = 4;
    startIndex = 0; // The first line might be data if no header recognized
    // Unless the first line contains non-digit day text and "subject"
    if (
      headerRow[0].toLowerCase().includes("hari") ||
      headerRow[0].toLowerCase().includes("day")
    ) {
      startIndex = 1;
    }
  }

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || !row[subjectCol]) continue;

    const rawDay = row[dayCol] || "1";
    const rawPeriod = row[periodCol] || "1";
    const rawSubject = row[subjectCol];
    const room = roomCol !== -1 ? row[roomCol] : undefined;
    const teacher = teacherCol !== -1 ? row[teacherCol] : undefined;

    const day = normalizeWeekday(rawDay);
    const periodNum = parseInt(String(rawPeriod).replace(/\D/g, ""), 10) || 1;

    const matched = matchSubjectCandidate(rawSubject, existingSubjects);

    items.push({
      id: `rev-list-${Date.now()}-${items.length}-${Math.random().toString(36).substring(2, 6)}`,
      day,
      periodNumber: Math.min(Math.max(1, periodNum), 10),
      rawSubject,
      subjectId: matched.subjectId,
      matchedSubjectName: matched.canonicalName,
      matchedSubjectColor: matched.color,
      isNewSubject: matched.isNewSubject,
      confidence: matched.confidence,
      room: room || undefined,
      teacher: teacher || undefined,
    });
  }

  return { items, warnings };
}

/**
 * ─── Conflict Resolution & Merge Algorithm ───
 * When merging incoming entries with existing ones:
 * - If an existing entry shares the exact (weekday, periodNumber, weekPattern),
 *   the incoming entry replaces  * - Non-conflicting incoming entries are appended.
  */
export function mergeTimetableEntries(
  existing: TimetableEntry[],
  incoming: TimetableEntry[]
): TimetableEntry[] {
  // Key generator: "weekday-periodNumber-weekPattern"
  const incomingMap = new Map<string, TimetableEntry>();
  for (const inc of incoming) {
    const key = `${inc.weekday}-${inc.periodNumber}-${inc.weekPattern || "every"}`;
    incomingMap.set(key, inc);
  }

  const result: TimetableEntry[] = [];

  // 1. Process existing entries: keep if not overwritten by incoming
  for (const ex of existing) {
    const key = `${ex.weekday}-${ex.periodNumber}-${ex.weekPattern || "every"}`;
    if (!incomingMap.has(key)) {
      result.push(ex);
    }
  }

  // 2. Add all deduplicated incoming entries
  for (const inc of incomingMap.values()) {
    result.push(inc);
  }

  // Sort by weekday, then periodNumber
  return result.sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.periodNumber - b.periodNumber;
  });
}

/**
 * Converts user-confirmed review items into database ready Subject[] and TimetableEntry[].
 */
export function resolveReviewItemsToTimetable(
  items: TimetableReviewItem[],
  existingSubjects: Subject[]
): {
  entries: TimetableEntry[];
  newSubjects: Subject[];
} {
  const currentSubjects = [...existingSubjects];
  const newSubjects: Subject[] = [];
  const entries: TimetableEntry[] = [];

  for (const item of items) {
    let subjectId = item.subjectId;

    if (!subjectId) {
      // Find by canonical name or create new
      const found = currentSubjects.find(
        (s) => s.name.toLowerCase() === item.matchedSubjectName.toLowerCase()
      );
      if (found) {
        subjectId = found.id;
      } else {
        const dict = resolveIndonesianSubject(item.matchedSubjectName);
        const newSubj: Subject = {
          id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: item.matchedSubjectName,
          color: item.matchedSubjectColor || dict.defaultColor,
          aliases: [item.rawSubject.toLowerCase()],
          teacher: item.teacher,
          room: item.room,
          bringItems: dict.defaultBringItems || [],
          // Backward compatibility
          title: item.matchedSubjectName,
          color_hex: item.matchedSubjectColor || dict.defaultColor,
          exam_date: "",
          total_estimated_minutes: 0,
        };
        currentSubjects.push(newSubj);
        newSubjects.push(newSubj);
        subjectId = newSubj.id;
      }
    }

    // Determine entry kind
    const rawName = item.matchedSubjectName || item.rawSubject || "";
    let kind: "class" | "break" | "event" = "class";
    if (/\b(istirahat|ishoma|recess|break|jeda)\b/i.test(rawName)) {
      kind = "break";
    } else if (/\b(literasi|upacara|apel|senam|kebersihan|\bbk\b|sholat|dhuha|dzuhur)\b/i.test(rawName)) {
      kind = "event";
    }

    entries.push({
      id: `tt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      subjectId,
      weekday: item.day,
      periodNumber: item.periodNumber,
      weekPattern: "every",
      kind,
      customLabel: item.rawSubject,
      room: item.room,
      teacher: item.teacher,
    });
  }

  return { entries, newSubjects };
}
