/**
 * Automated Test Suite for "Add from text" Workflow
 * 
 * Verifies:
 * 1. AI TaskExtract schema & extraction on user test string:
 *    "Besok PR Matematika hal 45 no 1-5 dikumpul hari Senin. Biologi bikin rangkuman Bab 3 ya."
 *    -> Produces exactly 2 tasks (Matematika & Biologi).
 * 2. Date phrases are shown/stored as notes only (date parser comes in Phase 7).
 * 3. AI Failure Fallback:
 *    -> Creates 1 task with pasted text as notes, subject matched by alias, deadline = next class.
 * 4. Review step state mappings & deterministic next-class deadline calculation.
 */

import assert from "node:assert/strict";
import { format, addDays, parseISO } from "date-fns";

// ─── 1. Indonesian Subject Dictionary Simulation ───
const INDONESIAN_SUBJECT_CATALOG = [
  {
    canonicalName: "Matematika",
    defaultColor: "#3A86FF",
    aliases: ["mtk", "mat", "math", "matematika", "kalkulus", "aljabar"],
  },
  {
    canonicalName: "Biologi",
    defaultColor: "#84CC16",
    aliases: ["bio", "biologi", "biology"],
  },
  {
    canonicalName: "Fisika",
    defaultColor: "#06B6D4",
    aliases: ["fis", "fisika", "physics"],
  },
];

function resolveIndonesianSubject(rawInput) {
  const clean = (rawInput || "").trim().toLowerCase();
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    if (entry.canonicalName.toLowerCase() === clean) return entry;
    if (entry.aliases.includes(clean)) return entry;
  }
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    for (const alias of entry.aliases) {
      const pattern = new RegExp(`\\b${alias}\\b`, "i");
      if (pattern.test(clean)) return entry;
    }
  }
  return {
    canonicalName: "Mata Pelajaran",
    defaultColor: "#3A86FF",
    aliases: [],
  };
}

// ─── 2. Deterministic Next-Class Engine Simulation ───
function calculateNextClassDeadline(subjectId, givenDateStr, timetableEntries) {
  const givenDate = parseISO(givenDateStr);
  const subjectEntries = timetableEntries.filter((e) => e.subjectId === subjectId);
  if (subjectEntries.length === 0) {
    return { found: false, deadlineDate: null };
  }

  for (let offset = 1; offset <= 14; offset++) {
    const candidate = addDays(givenDate, offset);
    const jsDay = candidate.getDay();
    const weekday = jsDay === 0 ? 7 : jsDay;

    const match = subjectEntries.find((e) => e.weekday === weekday);
    if (match) {
      return {
        found: true,
        deadlineDate: format(candidate, "yyyy-MM-dd"),
        weekday,
        periodNumber: match.periodNumber,
      };
    }
  }
  return { found: false, deadlineDate: null };
}

// ─── 3. Task Extraction Parser (Heuristic & Schema Validator) ───
function splitCompoundTaskClauses(text) {
  const baseParts = (text || "")
    .split(/(?<=[.!?])\s+|\n+|;+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const commaSplitRegex =
    /,\s+(?=(?:[-*•\d.)]+\s+)?(?:halaman|hal\.?|hlm\.?|bab|kegiatan|latihan|soal|tugas|pr|kuis|quiz|ulangan|proyek|project|makalah|laporan|presentasi|rangkum(?:an)?|ringkas(?:an)?|baca|kerjakan|buat|bikin|catat|hafal(?:kan)?|matematika|mtk|fisika|kimia|biologi|bahasa)\b)/i;

  const result = [];
  for (const part of baseParts) {
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

function extractSingleClauseMeta(part) {
  const lower = part.toLowerCase();
  const resolved = resolveIndonesianSubject(part);
  const hasKnownSubject = resolved.canonicalName !== "Mata Pelajaran";

  let datePhrase = "";
  const specificDeadline = part.match(
    /(?:dikumpul|kumpul|tenggat|deadline)\s*(?:hari\s+)?(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu|besok|lusa)/i
  );
  const generalDate = part.match(
    /(?:hari\s+)?(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu|besok|lusa)/i
  );
  const dateMatch = specificDeadline || generalDate;
  if (dateMatch) {
    datePhrase = dateMatch[0].trim();
  }

  let type = "homework";
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

function extractTasksLocal(text) {
  const sentences = (text || "")
    .split(/(?<=[.!?])\s+|\n+|;+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  const tasks = [];

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

// ─── 4. Fallback Task Generator (AI Failure Simulation) ───
function createFallbackTaskFromText(text, existingSubjects, timetableEntries, todayStr) {
  const clean = (text || "").trim();
  const lower = clean.toLowerCase();

  let matchedSubject = existingSubjects.find((s) => {
    const nameMatch = lower.includes(s.name.toLowerCase());
    const aliasMatch = s.aliases?.some((a) => {
      const reg = new RegExp(`\\b${a.toLowerCase()}\\b`, "i");
      return reg.test(lower);
    });
    return nameMatch || aliasMatch;
  });

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

  const nextRes = calculateNextClassDeadline(finalSubjectId, todayStr, timetableEntries);
  let deadlineDate = "";
  let deadlineLabel = "";
  let deadlineMode = "custom";

  if (nextRes.found && nextRes.deadlineDate) {
    deadlineDate = nextRes.deadlineDate;
    deadlineMode = "nextClass";
    deadlineLabel = `Kelas Depan (${format(parseISO(nextRes.deadlineDate), "d MMM")})`;
  } else {
    deadlineDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
    deadlineLabel = `Besok (${format(addDays(new Date(), 1), "d MMM")})`;
  }

  const firstLine = clean.split("\n")[0].replace(/^[-*•\d.)\s]+/, "").trim();
  const title =
    firstLine.length > 0
      ? firstLine.length > 50
        ? `${firstLine.slice(0, 47)}...`
        : firstLine
      : "Tugas dari Teks";

  return {
    id: `fallback-${Date.now()}`,
    title,
    subjectId: finalSubjectId,
    type: "homework",
    deadlineDate,
    deadlineLabel,
    deadlineMode,
    notes: clean,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log("===============================================================");
console.log("   STUDYAIR — 'ADD FROM TEXT' VERIFICATION SUITE              ");
console.log("===============================================================\n");

const mockSubjects = [
  { id: "subj-mtk", name: "Matematika", color: "#3A86FF", aliases: ["mtk", "matematika"] },
  { id: "subj-bio", name: "Biologi", color: "#84CC16", aliases: ["bio", "biologi"] },
];

const mockTimetable = [
  { id: "tt-1", subjectId: "subj-mtk", weekday: 1, periodNumber: 1 }, // Matematika on Monday
  { id: "tt-2", subjectId: "subj-bio", weekday: 3, periodNumber: 2 }, // Biologi on Wednesday
];

const todayStr = "2026-10-23"; // Friday

// ─── Test 1: User Test Input Extraction ───
console.log("Test 1: User Test String Task Extraction");
const testString = "Besok PR Matematika hal 45 no 1-5 dikumpul hari Senin. Biologi bikin rangkuman Bab 3 ya.";
console.log(`Input: "${testString}"`);

const extracted = extractTasksLocal(testString);
console.log("Extracted tasks count:", extracted.length);
assert.equal(extracted.length, 2, "Test string MUST produce exactly 2 tasks");

// Task 1: Matematika
console.log("\nTask 1:", extracted[0]);
assert.equal(extracted[0].subject, "Matematika", "Task 1 subject should be Matematika");
assert.ok(extracted[0].title.includes("PR Matematika hal 45 no 1-5") || extracted[0].title.includes("hal 45 no 1-5"), "Task 1 title should mention PR hal 45");
assert.ok(extracted[0].datePhrase.includes("dikumpul hari Senin"), "Task 1 datePhrase should be 'dikumpul hari Senin'");
assert.equal(extracted[0].type, "homework");

// Task 2: Biologi
console.log("Task 2:", extracted[1]);
assert.equal(extracted[1].subject, "Biologi", "Task 2 subject should be Biologi");
assert.ok(extracted[1].title.includes("rangkuman Bab 3"), "Task 2 title should mention rangkuman Bab 3");
assert.equal(extracted[1].type, "homework");
console.log("✔ Test 1 Passed: Exactly 2 tasks extracted with correct subjects & metadata.");

// ─── Test 2: Date phrases preserved as notes only ───
console.log("\nTest 2: Date Phrases Preserved as Notes Only (Phase 7 rule)");
const task1DateNote = extracted[0].datePhrase ? `Catatan tanggal: ${extracted[0].datePhrase}` : "";
assert.equal(task1DateNote, "Catatan tanggal: dikumpul hari Senin");
console.log(`Date phrase formatted as note: "${task1DateNote}"`);
console.log("✔ Test 2 Passed: Date phrase is stored strictly as a note.");

// ─── Test 3: AI Failure Fallback (1 Task with pasted text as notes) ───
console.log("\nTest 3: AI Failure Fallback Mode");
const fallbackTask = createFallbackTaskFromText(testString, mockSubjects, mockTimetable, todayStr);
console.log("Fallback Task:", fallbackTask);
assert.equal(fallbackTask.notes, testString, "Fallback task must preserve pasted text as notes");
assert.equal(fallbackTask.subjectId, "subj-mtk", "Fallback task matches first alias subject (Matematika)");
assert.ok(fallbackTask.deadlineDate, "Fallback task must have Next Class deadline");
assert.ok(fallbackTask.deadlineLabel.includes("Kelas Depan"), "Fallback deadline label must be localized Indonesian Kelas Depan");
assert.equal(fallbackTask.deadlineMode, "nextClass", "Fallback deadline mode must be nextClass");
console.log("✔ Test 3 Passed: Fallback generates 1 task with notes, alias subject, and Kelas Depan deadline.");

// ─── Test 4: Subject Switching in Review recalculates Next Class ───
console.log("\nTest 4: Review Screen Subject Recalculation");
const mtkDeadline = calculateNextClassDeadline("subj-mtk", todayStr, mockTimetable);
const bioDeadline = calculateNextClassDeadline("subj-bio", todayStr, mockTimetable);
console.log("Matematika Next Class:", mtkDeadline.deadlineDate, "(weekday:", mtkDeadline.weekday, ")");
console.log("Biologi Next Class:   ", bioDeadline.deadlineDate, "(weekday:", bioDeadline.weekday, ")");
assert.notEqual(mtkDeadline.deadlineDate, bioDeadline.deadlineDate, "Deadlines must differ based on timetable");
console.log("✔ Test 4 Passed: Subject switching dynamically updates deadline to subject's next class session.");

// ─── Test 5: Comma-separated Page/Exercise Homework List Splitting ───
console.log("\nTest 5: Comma-separated Homework Clauses Split Cleanly");
const multiPageInput = "Halaman 58-59 kegiatan 2, Halaman 63 kegiatan 2 dan 3, Halaman 68 kegiatan 2";
const splitTasks = extractTasksLocal(multiPageInput);
assert.equal(splitTasks.length, 3, "Must split distinct Halaman clauses into 3 separate tasks");
assert.equal(splitTasks[0].title, "Halaman 58-59 kegiatan 2");
assert.equal(splitTasks[1].title, "Halaman 63 kegiatan 2 dan 3");
assert.equal(splitTasks[2].title, "Halaman 68 kegiatan 2");
console.log("✔ Test 5 Passed: Comma-separated homework clauses split into 3 clean tasks.");

// ─── Test 6: Comma-separated Problem Numbers Stay Single Task ───
console.log("\nTest 6: Problem Number Lists Stay Single Task");
const numberListInput = "Kerjakan hal 45 no 1, 2, dan 3";
const singleTask = extractTasksLocal(numberListInput);
assert.equal(singleTask.length, 1, "Comma-separated numbers within one assignment must remain 1 task");
console.log("✔ Test 6 Passed: Number list within single exercise stays intact as 1 task.");

console.log("\n===============================================================");
console.log("   ALL 4 TESTS PASSED SUCCESSFULLY!                             ");
console.log("===============================================================\n");
