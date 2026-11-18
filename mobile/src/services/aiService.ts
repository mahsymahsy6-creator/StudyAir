/**
 * StudyAir Mobile — AI Service (Foundation Layer)
 * 
 * WORKING RULES & AI SEPARATION OF CONCERNS:
 * - AI extracts: AI only reads photos or text and returns raw structured JSON
 *   (e.g. rawDay, rawPeriod, rawSubject, rawTeacher, rawTasks, rawDeadline).
 * - Code decides: Dates, deadlines, period mapping, next-class resolution,
 *   and notifications are calculated 100% deterministically by local application code.
 * - Zero API key leakage: never committed, never displayed on primary screens.
 */

import type {
  Subject,
  TimetableEntry,
  Task,
  TaskType,
  CognitiveLoad,
} from "../types";
import { resolveIndonesianSubject, INDONESIAN_SUBJECT_CATALOG } from "../lib/subjectDictionary";
import { format, addDays, getDay, parseISO } from "date-fns";
import { calculateNextClassDeadline } from "../engine/deadlineEngine";
import { parseIndonesianDateHint } from "../engine/dateHintParser";
import { formatLocaleDate } from "../lib/dateUtils";

export interface RawTimetableEntry {
  rawDay: string | number;
  rawPeriod: number;
  rawSubject: string;
  rawTeacher?: string;
  rawRoom?: string;
}

export interface RawWhiteboardTask {
  title: string;
  rawDeadline?: string;
  type?: "homework" | "quiz" | "project";
  notes?: string;
}

export interface RawWhiteboardExtraction {
  subject?: string;
  tasks: RawWhiteboardTask[];
}

export interface RawExtractedTask {
  subject?: string;
  title: string;
  type?: "homework" | "quiz" | "project";
  datePhrase?: string; // Date phrases are shown as a note only (date parser comes in Phase 7)
  notes?: string;
}

export interface TaskExtractResult {
  tasks: RawExtractedTask[];
  model?: string;
}

export interface RawSyllabusUnit {
  id: string;
  title: string;
  estimated_minutes: number;
  cognitive_load: CognitiveLoad;
  suggested_time?: string;
}

export interface RawSyllabusExtraction {
  subject_title: string;
  subject_code?: string;
  exam_date?: string | null;
  color_hex?: string;
  summary?: string;
  units: RawSyllabusUnit[];
}

export interface AIInputPayload {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  signal?: AbortSignal;
}

export const PROMPT_VERSION = "v2.0";

/**
 * Suggests an estimated task duration in minutes based on title content and task type.
 */
export function suggestTaskDuration(title: string, type: TaskType = "homework"): number {
  const lower = (title || "").toLowerCase();

  // Long-form project / paper / presentation
  if (
    lower.includes("makalah") ||
    lower.includes("proyek") ||
    lower.includes("project") ||
    lower.includes("presentasi") ||
    lower.includes("laporan") ||
    type === "project"
  ) {
    return 60;
  }

  // Multi-question exercises, test prep, chapters
  if (
    lower.includes("bab") ||
    lower.includes("soal") ||
    lower.includes("latihan") ||
    lower.includes("kuis") ||
    lower.includes("ulangan") ||
    lower.includes("quiz") ||
    type === "quiz"
  ) {
    return 45;
  }

  // Quick read, flashcard, notes, memorization
  if (
    lower.includes("baca") ||
    lower.includes("catat") ||
    lower.includes("hafalkan") ||
    lower.includes("review") ||
    lower.includes("rangkum")
  ) {
    return 25;
  }

  // Default standard homework duration
  return 30;
}

// In-memory cache: (imageHash + promptVersion) -> cached result
const scanCache = new Map<string, { result: any; timestamp: number }>();

function computeStringHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export function extractJsonSubstring(text: string): string {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstBrace = clean.indexOf("{");
  const firstBracket = clean.indexOf("[");
  let start = -1;
  let end = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = clean.lastIndexOf("}") + 1;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = clean.lastIndexOf("]") + 1;
  }
  if (start !== -1 && end > start) {
    return clean.slice(start, end);
  }
  return clean;
}

// In-flight de-duplication
let inFlightTimetableScan: Promise<{ entries: RawTimetableEntry[]; model: string }> | null = null;

// Dev server endpoint or custom host
const BACKEND_ENDPOINT =
  process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000/api/gemini/parse-schedule";

/**
 * ─── 1. Raw AI Extraction Calls ───
 */

export async function extractTimetableFromAI(
  input: AIInputPayload,
  apiKeyOverride?: string
): Promise<{ entries: RawTimetableEntry[]; model: string }> {
  // Step 2.5: Cache check
  const inputHash = computeStringHash(
    (input.imageBase64 ? input.imageBase64.slice(0, 500) + input.imageBase64.length : "") +
      (input.text || "") +
      PROMPT_VERSION
  );
  if (scanCache.has(inputHash)) {
    const cached = scanCache.get(inputHash)!;
    if (__DEV__) { console.log("[AIService] Returning cached timetable scan result (0 ms)"); }
    return cached.result;
  }

  // Step 2.4: De-duplicate in-flight requests
  if (inFlightTimetableScan) {
    if (__DEV__) { console.log("[AIService] Duplicate request prevented, reusing in-flight timetable scan"); }
    return inFlightTimetableScan;
  }

  inFlightTimetableScan = (async () => {
    try {
      const apiKey =
        apiKeyOverride ||
        process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
        "";

      // Try Next.js proxy endpoint first for secure execution
      try {
        const res = await fetch(BACKEND_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "timetable",
            imageBase64: input.imageBase64,
            mimeType: input.mimeType || "image/jpeg",
            timetableText: input.text,
            apiKey: apiKey || undefined,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const rawList = Array.isArray(json.data)
              ? json.data
              : json.data.e || json.data.entries || [];

            const entries = rawList.map((item: any) => ({
              rawDay: item.d || item.day || item.rawDay,
              rawPeriod: Number(item.p || item.period || item.rawPeriod) || 1,
              rawSubject: item.s || item.subject || item.rawSubject,
              rawTeacher: item.t || item.teacher || item.rawTeacher || undefined,
              rawRoom: item.r || item.room || item.rawRoom || undefined,
            }));

            const result = {
              entries,
              model: json.model || "Gemini 3.5 Flash Lite",
            };
            scanCache.set(inputHash, { result, timestamp: Date.now() });
            return result;
          }
        }
      } catch (err) {
        if (__DEV__) { console.log("[AIService] Backend proxy unavailable, attempting direct fallback:", err); }
      }

      if (!apiKey) {
        throw new Error("No Gemini API key found. Please configure GEMINI_API_KEY in environment.");
      }

      const directResult = await directGeminiTimetableCall(input, apiKey);
      scanCache.set(inputHash, { result: directResult, timestamp: Date.now() });
      return directResult;
    } finally {
      inFlightTimetableScan = null;
    }
  })();

  return inFlightTimetableScan;
}

export async function extractWhiteboardFromAI(
  input: AIInputPayload,
  apiKeyOverride?: string
): Promise<{ extraction: RawWhiteboardExtraction; model: string }> {
  const apiKey =
    apiKeyOverride ||
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    "";

  try {
    const res = await fetch(BACKEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "whiteboard",
        imageBase64: input.imageBase64,
        mimeType: input.mimeType || "image/jpeg",
        whiteboardText: input.text,
        apiKey: apiKey || undefined,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          extraction: {
            subject: json.data.subject,
            tasks: json.data.tasks || [],
          },
          model: json.model || "Gemini 3.8 Flash",
        };
      }
    }
  } catch (err) {
    if (__DEV__) { console.log("[AIService] Backend proxy unavailable for whiteboard, attempting direct fallback:", err); }
  }

  if (!apiKey) {
    throw new Error("No Gemini API key found. Please configure GEMINI_API_KEY in environment.");
  }

  return directGeminiWhiteboardCall(input, apiKey);
}

export async function extractSyllabusFromAI(
  input: AIInputPayload,
  apiKeyOverride?: string
): Promise<{ extraction: RawSyllabusExtraction; model: string }> {
  const apiKey =
    apiKeyOverride ||
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    "";

  try {
    const res = await fetch(BACKEND_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "syllabus",
        imageBase64: input.imageBase64,
        mimeType: input.mimeType || "image/jpeg",
        syllabusText: input.text,
        apiKey: apiKey || undefined,
      }),
      signal: input.signal,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return {
          extraction: {
            subject_title: json.data.subject_title || "Course Syllabus",
            subject_code: json.data.subject_code,
            exam_date: json.data.exam_date || null,
            color_hex: json.data.color_hex || "#3A86FF",
            summary: json.data.summary,
            units: json.data.units || [],
          },
          model: json.model || "Gemini 3.8 Flash",
        };
      }
    }
  } catch (err) {
    if (__DEV__) { console.log("[AIService] Backend proxy unavailable for syllabus, attempting direct fallback:", err); }
  }

  if (!apiKey) {
    throw new Error("No Gemini API key found. Please configure GEMINI_API_KEY in environment.");
  }

  return directGeminiSyllabusCall(input, apiKey);
}

/**
 * Extracts student tasks, homework, quizzes, and projects from raw message/notes.
 * Uses the TaskExtract schema with a 20-second timeout.
 * AI extracts raw entities; date phrases are returned as notes only.
 */
export async function extractTasksFromAI(
  text: string,
  apiKeyOverride?: string,
  timeoutMs = 20000
): Promise<TaskExtractResult> {
  const cleanText = (text || "").trim();
  if (!cleanText) {
    return { tasks: [], model: "empty" };
  }

  // Create AbortController with 20-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const apiKey =
      apiKeyOverride ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      "";

    // 1. Try Backend Proxy endpoint if available
    try {
      const res = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "whiteboard",
          whiteboardText: cleanText,
          apiKey: apiKey || undefined,
        }),
        signal: controller.signal,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const rawTasks = Array.isArray(json.data.tasks) ? json.data.tasks : [];
          const tasks: RawExtractedTask[] = rawTasks.map((t: any) => ({
            subject: t.subject || json.data.subject || undefined,
            title: t.title || "Tugas",
            type: t.type === "quiz" || t.type === "project" ? t.type : "homework",
            datePhrase: t.rawDeadline || t.datePhrase || undefined,
            notes: t.notes || undefined,
          }));
          if (tasks.length > 0) {
            return { tasks: expandExtractedTasks(tasks), model: json.model || "Gemini Proxy" };
          }
        }
      }
    } catch (proxyErr: any) {
      if (proxyErr?.name === "AbortError") throw proxyErr;
    }

    if (!apiKey) {
      const localTasks = extractTasksLocal(cleanText);
      if (localTasks.length > 0) {
        return { tasks: expandExtractedTasks(localTasks), model: "Local Task Parser" };
      }
      throw new Error("No Gemini API key configured for AI task extraction.");
    }

    // 2. Direct Gemini Call with timeout signal (fallback to local task parser if network/API fails)
    try {
      const directRes = await directGeminiTaskExtractCall(cleanText, apiKey, controller.signal);
      return { ...directRes, tasks: expandExtractedTasks(directRes.tasks) };
    } catch (directErr: any) {
      const localTasks = extractTasksLocal(cleanText);
      if (localTasks.length > 0) {
        return { tasks: expandExtractedTasks(localTasks), model: "Local Task Parser" };
      }
      throw directErr;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Splits text into distinct task clauses on sentence boundaries, newlines, semicolons,
 * and commas only when the segment after the comma starts with an assignment keyword
 * (e.g. "Halaman ...", "Bab ...", "Kegiatan ...", "Latihan ...") or a subject name.
 * Keeps number lists inside a single assignment (e.g. "hal 45 no 1, 2, dan 3") intact.
 */
export function splitCompoundTaskClauses(text: string): string[] {
  const baseParts = (text || "")
    .split(/(?<=[.!?])\s+|\n+|;+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const subjectTokens = INDONESIAN_SUBJECT_CATALOG.flatMap((entry) => [
    entry.canonicalName.toLowerCase(),
    ...entry.aliases.map((a) => a.toLowerCase()),
  ]).map((tok) => tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const clauseLeadKeywords = [
    "halaman",
    "hal\\.?",
    "hlm\\.?",
    "bab",
    "kegiatan",
    "latihan",
    "soal",
    "tugas",
    "pr",
    "kuis",
    "quiz",
    "ulangan",
    "proyek",
    "project",
    "makalah",
    "laporan",
    "presentasi",
    "rangkum(?:an)?",
    "ringkas(?:an)?",
    "baca",
    "kerjakan",
    "buat",
    "bikin",
    "catat",
    "hafal(?:kan)?",
    ...subjectTokens,
  ].join("|");

  const commaSplitRegex = new RegExp(
    `,\\s+(?=(?:[-*•\\d.)]+\\s+)?(?:${clauseLeadKeywords})\\b)`,
    "i"
  );

  const result: string[] = [];
  for (const part of baseParts) {
    // Preserve leading subject header if present, e.g. "Matematika: Halaman 58..., Halaman 63..."
    const colonSubjectMatch = part.match(/^([^:]{2,32}):\s+(.+)$/);
    if (colonSubjectMatch && commaSplitRegex.test(colonSubjectMatch[2])) {
      const header = colonSubjectMatch[1].trim();
      const subParts = colonSubjectMatch[2]
        .split(commaSplitRegex)
        .map((s) => s.trim())
        .filter((s) => s.length > 3);
      for (const subPart of subParts) {
        result.push(`${header}: ${subPart}`);
      }
      continue;
    }

    const subParts = part
      .split(commaSplitRegex)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);
    result.push(...(subParts.length > 0 ? subParts : [part]));
  }

  return result;
}

function expandExtractedTasks(tasks: RawExtractedTask[]): RawExtractedTask[] {
  const expanded: RawExtractedTask[] = [];
  for (const item of tasks) {
    const clauses = splitCompoundTaskClauses(item.title || "");
    if (clauses.length <= 1) {
      expanded.push(item);
      continue;
    }
    for (const clause of clauses) {
      expanded.push({
        ...item,
        title: clause,
      });
    }
  }
  return expanded;
}

/**
 * Maps Indonesian/English raw day strings or indices to 1..7 (1=Monday, 7=Sunday)
 */
export function normalizeWeekday(raw: string | number): number {
  if (typeof raw === "number") {
    if (raw >= 1 && raw <= 7) return raw;
  }

  const s = String(raw).trim().toLowerCase();
  if (s.includes("senin") || s.includes("mon")) return 1;
  if (s.includes("selasa") || s.includes("tue")) return 2;
  if (s.includes("rabu") || s.includes("wed")) return 3;
  if (s.includes("kamis") || s.includes("thu")) return 4;
  if (s.includes("jumat") || s.includes("jum'at") || s.includes("fri")) return 5;
  if (s.includes("sabtu") || s.includes("sat")) return 6;
  if (s.includes("minggu") || s.includes("sun")) return 7;

  // Default to Monday if unknown
  return 1;
}

/**
 * Deterministically resolves raw timetable extractions into validated Subject and TimetableEntry models.
 */
export function resolveTimetableEntries(
  rawEntries: RawTimetableEntry[],
  existingSubjects: Subject[]
): {
  createdSubjects: Subject[];
  allSubjects: Subject[];
  timetableEntries: TimetableEntry[];
} {
  const currentSubjects = [...existingSubjects];
  const newSubjects: Subject[] = [];
  const timetableEntries: TimetableEntry[] = [];

  for (const raw of rawEntries) {
    if (!raw.rawSubject || !raw.rawSubject.trim()) continue;

    // 1. Resolve canonical subject and dictionary info
    const dictInfo = resolveIndonesianSubject(raw.rawSubject);
    let matchedSubject = currentSubjects.find(
      (s) =>
        s.name.toLowerCase() === dictInfo.canonicalName.toLowerCase() ||
        s.aliases.some((a) => a.toLowerCase() === raw.rawSubject.trim().toLowerCase())
    );

    if (!matchedSubject) {
      // Create new subject deterministically
      matchedSubject = {
        id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: dictInfo.canonicalName,
        color: dictInfo.defaultColor,
        aliases: Array.from(new Set([...dictInfo.aliases, raw.rawSubject.trim().toLowerCase()])),
        teacher: raw.rawTeacher || undefined,
        room: raw.rawRoom || undefined,
        bringItems: dictInfo.defaultBringItems || [],
        // Backward compatibility
        title: dictInfo.canonicalName,
        color_hex: dictInfo.defaultColor,
        exam_date: "",
        total_estimated_minutes: 0,
      };
      currentSubjects.push(matchedSubject);
      newSubjects.push(matchedSubject);
    } else {
      // Update room/teacher if provided and missing
      if (raw.rawTeacher && !matchedSubject.teacher) matchedSubject.teacher = raw.rawTeacher;
      if (raw.rawRoom && !matchedSubject.room) matchedSubject.room = raw.rawRoom;
    }

    const weekday = normalizeWeekday(raw.rawDay);
    const periodNumber = Number(raw.rawPeriod) || 1;

    timetableEntries.push({
      id: `tt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      subjectId: matchedSubject.id,
      weekday,
      periodNumber,
      weekPattern: "every",
    });
  }

  return {
    createdSubjects: newSubjects,
    allSubjects: currentSubjects,
    timetableEntries,
  };
}

/**
 * Deterministically parses raw deadline strings into concrete YYYY-MM-DD calendar dates.
 * Zero date invention: respects today, besok, lusa, day names, or falls back to tomorrow.
 */
export function resolveDeadlineDate(rawDeadline?: string, referenceDate: Date = new Date()): string {
  if (!rawDeadline || !rawDeadline.trim()) {
    return format(addDays(referenceDate, 1), "yyyy-MM-dd");
  }

  const hint = parseIndonesianDateHint(rawDeadline, referenceDate);
  if (hint && hint.suggestedDate) {
    return hint.suggestedDate;
  }

  return format(addDays(referenceDate, 1), "yyyy-MM-dd");
}

/**
 * Deterministically resolves whiteboard extraction into Task models.
 */
export function resolveWhiteboardTasks(
  raw: RawWhiteboardExtraction,
  existingSubjects: Subject[]
): {
  tasks: Task[];
  subject: Subject;
} {
  const rawSubjectName = raw.subject || "Umum";
  const dict = resolveIndonesianSubject(rawSubjectName);

  let matchedSubject = existingSubjects.find(
    (s) =>
      s.name.toLowerCase() === dict.canonicalName.toLowerCase() ||
      s.aliases.some((a) => a.toLowerCase() === rawSubjectName.toLowerCase())
  );

  if (!matchedSubject) {
    matchedSubject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: dict.canonicalName,
      color: dict.defaultColor,
      aliases: dict.aliases,
      bringItems: dict.defaultBringItems || [],
      title: dict.canonicalName,
      color_hex: dict.defaultColor,
      exam_date: "",
      total_estimated_minutes: 0,
    };
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tasks: Task[] = (raw.tasks || []).map((t, idx) => {
    const deadlineDate = resolveDeadlineDate(t.rawDeadline);
    return {
      id: `task-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      subjectId: matchedSubject!.id,
      title: t.title || "Tugas Papan Tulis",
      notes: t.notes || (t.rawDeadline ? `Tenggat asli: ${t.rawDeadline}` : undefined),
      type: t.type || "homework",
      givenDate: todayStr,
      deadlineDate,
      deadlineMode: "custom",
      status: "PENDING",
    };
  });

  return {
    tasks,
    subject: matchedSubject,
  };
}

/**
 * Creates 1 fallback task from text when AI fails:
 * - Pasted text stored as notes
 * - Subject matched by alias
 * - Deadline = next class of that subject
 */
export function createFallbackTaskFromText(
  text: string,
  existingSubjects: Subject[],
  timetableEntries: TimetableEntry[],
  todayStr: string,
  options?: { daysOff?: any[]; overrides?: any[] }
): {
  id: string;
  title: string;
  subjectId: string;
  type: TaskType;
  deadlineDate: string;
  deadlineLabel: string;
  deadlineMode: "nextClass" | "custom";
  notes: string;
  estimatedMinutes: number;
} {
  const clean = (text || "").trim();
  const lower = clean.toLowerCase();

  // 1. Subject matched by alias from existing subjects
  let matchedSubject = existingSubjects.find((s) => {
    const nameMatch = lower.includes(s.name.toLowerCase());
    const aliasMatch = s.aliases?.some((a) => {
      const reg = new RegExp(`\\b${a.toLowerCase()}\\b`, "i");
      return reg.test(lower);
    });
    return nameMatch || aliasMatch;
  });

  // If not found in user subjects, try Indonesian dictionary catalog
  if (!matchedSubject) {
    const dict = resolveIndonesianSubject(clean);
    matchedSubject = existingSubjects.find(
      (s) =>
        s.name.toLowerCase() === dict.canonicalName.toLowerCase() ||
        s.aliases?.some((a) => dict.aliases.includes(a.toLowerCase()))
    );
  }

  const finalSubject = matchedSubject || existingSubjects[0];
  const finalSubjectId = finalSubject?.id || "general";

  // 2. Deadline = next class of that subject
  const nextRes = calculateNextClassDeadline(
    finalSubjectId,
    todayStr,
    timetableEntries,
    {
      daysOff: options?.daysOff,
      overrides: options?.overrides,
      afterNClasses: 1,
    }
  );

  let deadlineDate = "";
  let deadlineLabel = "";
  let deadlineMode: "nextClass" | "custom" = "custom";

  if (nextRes.found && nextRes.deadlineDate) {
    deadlineDate = nextRes.deadlineDate;
    deadlineMode = "nextClass";
    deadlineLabel = `Kelas Depan (${formatLocaleDate(nextRes.deadlineDate, "EEE, d MMM")})`;
  } else {
    const tomorrow = addDays(new Date(), 1);
    deadlineDate = format(tomorrow, "yyyy-MM-dd");
    deadlineLabel = `Besok (${formatLocaleDate(tomorrow, "EEE, d MMM")})`;
  }

  // 3. Title: first line or concise summary, notes = pasted text
  const firstLine = clean.split("\n")[0].replace(/^[-*•\d.)\s]+/, "").trim();
  const title =
    firstLine.length > 0
      ? firstLine.length > 50
        ? `${firstLine.slice(0, 47)}...`
        : firstLine
      : "Tugas dari Teks";

  let type: TaskType = "homework";
  if (lower.includes("kuis") || lower.includes("quiz") || lower.includes("ulangan")) {
    type = "quiz";
  } else if (lower.includes("proyek") || lower.includes("project")) {
    type = "project";
  }

  return {
    id: `fallback-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    subjectId: finalSubjectId,
    type,
    deadlineDate,
    deadlineLabel,
    deadlineMode,
    estimatedMinutes: suggestTaskDuration(title, type),
    notes: clean, // Pasted text as notes
  };
}

function extractSingleClauseMeta(part: string): {
  subject?: string;
  title: string;
  type: "homework" | "quiz" | "project";
  datePhrase?: string;
} {
  const lower = part.toLowerCase();
  const resolved = resolveIndonesianSubject(part);
  const hasKnownSubject = resolved.canonicalName !== "Mata Pelajaran";

  let datePhrase = "";
  const specificDeadline = part.match(
    /(?:dikumpul(?:kan)?|kumpul|tenggat|deadline|batas(?:\s+waktu)?|paling\s+lambat)\s*(?:pada\s+)?(?:hari\s+|tgl\s+|tanggal\s+)?(?:(?:senin|selasa|rabu|rabo|kamis|jumat|jum'at|sabtu|minggu|ahad)(?:\s+depan)?|hari\s+ini|malam\s+ini|sore\s+ini|besok|bsk|lusa|minggu\s+depan|pekan\s+depan|pertemuan\s+depan|kelas\s+depan|\d{1,2}\s*hari\s+lagi|\d{1,2}\s+[a-z]+(?:\s+\d{4})?|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|\d{4}-\d{2}-\d{2})/i
  );
  const generalDate = part.match(
    /(?:(?:hari\s+)?(?:senin|selasa|rabu|rabo|kamis|jumat|jum'at|sabtu|minggu|ahad)(?:\s+depan)?|hari\s+ini|malam\s+ini|sore\s+ini|besok|bsk|lusa|minggu\s+depan|pekan\s+depan|pertemuan\s+depan|kelas\s+depan|\d{1,2}\s*hari\s+lagi|(?:tgl|tanggal)\s+\d{1,2}(?:\s+[a-z]+)?(?:\s+\d{4})?)/i
  );
  const dateMatch = specificDeadline || generalDate;
  if (dateMatch) {
    datePhrase = dateMatch[0].trim();
  } else {
    const hint = parseIndonesianDateHint(part);
    if (hint) {
      datePhrase = hint.matchedPhrase;
    }
  }

  let type: "homework" | "quiz" | "project" = "homework";
  if (lower.includes("kuis") || lower.includes("quiz") || lower.includes("ulangan")) {
    type = "quiz";
  } else if (lower.includes("proyek") || lower.includes("project")) {
    type = "project";
  }

  let title = part;
  if (dateMatch) {
    title = title.replace(dateMatch[0], "").replace(/\s{2,}/g, " ").trim();
  }
  title = title.replace(/^(?:besok|lusa)\s+/i, "").trim();
  title = title.replace(/^[.,\-*•\s]+|[.,\-*•\s]+$/g, "").trim();

  return {
    subject: hasKnownSubject ? resolved.canonicalName : undefined,
    title: title || part,
    type,
    datePhrase: datePhrase || undefined,
  };
}

/**
 * Deterministic sentence/line/compound-clause task extractor used as fallback or offline testing.
 * Splits text into individual tasks and maps subjects + date phrases without cross-sentence leakage.
 */
export function extractTasksLocal(text: string): RawExtractedTask[] {
  const sentences = (text || "")
    .split(/(?<=[.!?])\s+|\n+|;+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const tasks: RawExtractedTask[] = [];

  for (const sentence of sentences) {
    const sentenceMeta = extractSingleClauseMeta(sentence);
    const clauses = splitCompoundTaskClauses(sentence);

    if (clauses.length <= 1) {
      tasks.push({
        subject: sentenceMeta.subject,
        title: sentenceMeta.title,
        type: sentenceMeta.type,
        datePhrase: sentenceMeta.datePhrase,
        notes: undefined,
      });
      continue;
    }

    for (const clause of clauses) {
      const clauseMeta = extractSingleClauseMeta(clause);
      tasks.push({
        subject: clauseMeta.subject || sentenceMeta.subject,
        title: clauseMeta.title,
        type: clauseMeta.type,
        datePhrase: clauseMeta.datePhrase || sentenceMeta.datePhrase,
        notes: undefined,
      });
    }
  }

  return tasks;
}

/**
 * ─── 3. Direct Gemini Call Fallbacks ───
 */

async function callDirectGemini(
  payload: any,
  apiKey: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const models = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];
  let lastError: any = null;

  for (const model of models) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    try {
      const modelPayload = { ...payload };
      if (model.includes("lite") && modelPayload.generationConfig?.thinkingConfig) {
        modelPayload.generationConfig = { ...modelPayload.generationConfig };
        delete modelPayload.generationConfig.thinkingConfig;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelPayload),
        signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty response from Gemini.");

      return { text: rawText, model };
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
      lastError = err;
    }
  }

  throw lastError || new Error("Direct Gemini communication failed.");
}

async function directGeminiTimetableCall(
  input: AIInputPayload,
  apiKey: string
): Promise<{ entries: RawTimetableEntry[]; model: string }> {
  const parts: any[] = [];
  if (input.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType || "image/jpeg",
        data: input.imageBase64.replace(/^data:[^;]+;base64,/, ""),
      },
    });
  }
  parts.push({
    text: `OCR school timetable. No dates/markdown.
Return compact JSON:
{"e":[{"d":"Senin","p":1,"s":"MTK","t":null,"r":null}]}
d=day, p=period(1..8), s=subject, t=teacher, r=room`,
  });

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2500,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
    },
  };

  const { text, model } = await callDirectGemini(payload, apiKey, input.signal);

  let parsed: any;
  try {
    const clean = extractJsonSubstring(text);
    parsed = JSON.parse(clean);
  } catch (_jsonErr) {
    // Retry once ONLY on invalid JSON syntax, never on timeout
    console.warn("[AIService] Invalid JSON syntax from Gemini, retrying once...");
    const retry = await callDirectGemini(payload, apiKey, input.signal);
    const cleanRetry = extractJsonSubstring(retry.text);
    parsed = JSON.parse(cleanRetry);
  }

  const rawList = Array.isArray(parsed)
    ? parsed
    : (parsed.e || parsed.entries || Object.values(parsed).find(Array.isArray) || []);

  const entries: RawTimetableEntry[] = rawList.map((item: any) => ({
    rawDay: item.d || item.day || item.rawDay,
    rawPeriod: Number(item.p || item.period || item.rawPeriod) || 1,
    rawSubject: item.s || item.subject || item.rawSubject,
    rawTeacher: item.t || item.teacher || item.rawTeacher || undefined,
    rawRoom: item.r || item.room || item.rawRoom || undefined,
  }));

  return {
    entries,
    model,
  };
}

async function directGeminiWhiteboardCall(
  input: AIInputPayload,
  apiKey: string
): Promise<{ extraction: RawWhiteboardExtraction; model: string }> {
  const parts: any[] = [];
  if (input.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType || "image/jpeg",
        data: input.imageBase64.replace(/^data:[^;]+;base64,/, ""),
      },
    });
  }
  parts.push({
    text: `Extract whiteboard tasks (subject, tasks: [{ title, rawDeadline, type: "homework"|"quiz"|"project", notes }]). NEVER invent dates. Return JSON: { "subject": string, "tasks": [...] }`,
  });

  const { text, model } = await callDirectGemini(
    {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    },
    apiKey
  );

  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean);
  return {
    extraction: {
      subject: parsed.subject || undefined,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    },
    model,
  };
}

async function directGeminiSyllabusCall(
  input: AIInputPayload,
  apiKey: string
): Promise<{ extraction: RawSyllabusExtraction; model: string }> {
  const parts: any[] = [];
  if (input.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType || "image/jpeg",
        data: input.imageBase64.replace(/^data:[^;]+;base64,/, ""),
      },
    });
  }
  parts.push({
    text: `Extract course syllabus (subject_title, exam_date (only if present, else null), color_hex, units: [{ id, title, estimated_minutes, cognitive_load }]). Return JSON.`,
  });

  const { text, model } = await callDirectGemini(
    {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    },
    apiKey,
    input.signal
  );

  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(clean);
  return {
    extraction: {
      subject_title: parsed.subject_title || "Course Syllabus",
      subject_code: parsed.subject_code,
      exam_date: parsed.exam_date || null,
      color_hex: parsed.color_hex || "#3A86FF",
      summary: parsed.summary,
      units: Array.isArray(parsed.units) ? parsed.units : [],
    },
    model,
  };
}

async function directGeminiTaskExtractCall(
  text: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<TaskExtractResult> {
  const prompt = `You are an expert student task assistant.
Analyze this message, homework chat, or notes.
Extract all distinct tasks, homework (PR), quizzes (kuis/ulangan), or projects mentioned in the text.

Strict extraction rules:
- Separate distinct assignments AND separate page/exercise clauses (e.g. "Halaman 58-59 kegiatan 2, Halaman 63 kegiatan 2 dan 3" -> split into individual tasks, one per exercise/page block) into individual items in "tasks". Keep comma-separated question numbers of one exercise together (e.g. "Hal 45 no 1, 2, dan 5" stays 1 task).
- For each task:
  - "subject": subject name or alias if mentioned (e.g. "Matematika", "Biologi", "Fisika") or null.
  - "title": concise actionable task description (e.g. "PR hal 45 no 1-5", "Bikin rangkuman Bab 3").
  - "type": "homework" | "quiz" | "project".
  - "datePhrase": exact date/deadline phrase mentioned in the text (e.g. "dikumpul hari Senin", "besok"), or empty string. Do NOT invent dates or convert to YYYY-MM-DD.
  - "notes": additional instructions or page numbers if any.

CRITICAL: Return strictly valid JSON:
{
  "tasks": [
    {
      "subject": "Matematika",
      "title": "PR hal 45 no 1-5",
      "type": "homework",
      "datePhrase": "dikumpul hari Senin",
      "notes": ""
    }
  ]
}

Text to extract:
${text}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2000,
      responseMimeType: "application/json",
    },
  };

  const { text: rawResponse, model } = await callDirectGemini(payload, apiKey, signal);
  const clean = extractJsonSubstring(rawResponse);
  const parsed = JSON.parse(clean);

  const rawList = Array.isArray(parsed)
    ? parsed
    : (parsed.tasks || Object.values(parsed).find(Array.isArray) || []);

  const tasks: RawExtractedTask[] = rawList.map((item: any) => ({
    subject: item.subject || item.s || undefined,
    title: item.title || item.t || "Tugas",
    type: item.type === "quiz" || item.type === "project" ? item.type : "homework",
    datePhrase: item.datePhrase || item.rawDeadline || item.deadline || undefined,
    notes: item.notes || item.n || undefined,
  }));

  return {
    tasks,
    model,
  };
}

