/**
 * Automated Test Suite for Phase 5: Timetable Import & Period Configuration
 * Runs standalone with Node.js: `node test_phase5_timetable.mjs`
 */

import assert from "node:assert/strict";

const INDONESIAN_SUBJECT_CATALOG = [
  {
    canonicalName: "Matematika",
    defaultColor: "#3A86FF",
    aliases: ["mtk", "mat", "math", "matematika", "kalkulus", "aljabar"],
    defaultBringItems: ["Buku Paket", "Buku Kotak-kotak", "Penggaris", "Busur"],
  },
  {
    canonicalName: "Bahasa Indonesia",
    defaultColor: "#EF4444",
    aliases: ["b.indo", "bind", "b indo", "bahasa indonesia", "indo", "bin"],
    defaultBringItems: ["Kamus KBBI", "Buku Catatan"],
  },
  {
    canonicalName: "Bahasa Inggris",
    defaultColor: "#8B5CF6",
    aliases: ["b.ing", "bing", "b ing", "bahasa inggris", "english", "eng"],
    defaultBringItems: ["Kamus Inggris", "Modul Latihan"],
  },
  {
    canonicalName: "Fisika",
    defaultColor: "#06B6D4",
    aliases: ["fis", "fisika", "physics"],
    defaultBringItems: ["Kalkulator Ilmiah", "Buku Catatan Rumus"],
  },
  {
    canonicalName: "Kimia",
    defaultColor: "#F59E0B",
    aliases: ["kim", "kimia", "chemistry"],
    defaultBringItems: ["Tabel Periodik", "Jas Lab"],
  },
  {
    canonicalName: "Biologi",
    defaultColor: "#84CC16",
    aliases: ["bio", "biologi", "biology"],
    defaultBringItems: ["Buku Gambar", "Pensil Warna"],
  },
];

function resolveIndonesianSubject(rawInput) {
  const clean = (rawInput || "").trim().toLowerCase();
  if (!clean) return { canonicalName: "Mata Pelajaran", defaultColor: "#3A86FF", aliases: [] };
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    if (entry.canonicalName.toLowerCase() === clean || entry.aliases.includes(clean)) return entry;
  }
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    for (const alias of entry.aliases) {
      if (new RegExp(`\\b${alias}\\b`, "i").test(clean)) return entry;
    }
  }
  const titleCased = rawInput.trim().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { canonicalName: titleCased, defaultColor: "#3A86FF", aliases: [clean] };
}

function normalizeWeekday(raw) {
  if (typeof raw === "number") {
    if (raw >= 1 && raw <= 7) return raw;
    if (raw === 0) return 7;
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

function getWeekdayName(day, lang = "id") {
  const names = {
    id: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
    en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  };
  return names[lang]?.[day - 1] || "Senin";
}

function matchSubjectCandidate(rawInput, existingSubjects) {
  const clean = (rawInput || "").trim();
  if (!clean) return { canonicalName: "Unassigned", color: "#94a3b8", isNewSubject: true, confidence: 0 };
  const exact = existingSubjects.find(s => s.name.toLowerCase() === clean.toLowerCase());
  if (exact) return { subjectId: exact.id, canonicalName: exact.name, color: exact.color, isNewSubject: false, confidence: 1.0 };

  const alias = existingSubjects.find(s => s.aliases && s.aliases.some(a => a.toLowerCase() === clean.toLowerCase()));
  if (alias) return { subjectId: alias.id, canonicalName: alias.name, color: alias.color, isNewSubject: false, confidence: 0.9 };

  const dict = resolveIndonesianSubject(clean);
  const matchInDictExisting = existingSubjects.find(s => s.name.toLowerCase() === dict.canonicalName.toLowerCase());
  if (matchInDictExisting) return { subjectId: matchInDictExisting.id, canonicalName: matchInDictExisting.name, color: matchInDictExisting.color, isNewSubject: false, confidence: 0.88 };

  const isCatalogKnown = dict.aliases.length > 1;
  return { canonicalName: dict.canonicalName, color: dict.defaultColor, isNewSubject: true, confidence: isCatalogKnown ? 0.75 : 0.5 };
}

function parseStructuredTextTimetable(text, existingSubjects) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const items = [];
  let currentWeekday = 1;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx];
    const dayHeaderMatch = rawLine.match(/^(=*|\#*)\s*(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:=]*$/i);
    if (dayHeaderMatch) {
      currentWeekday = normalizeWeekday(dayHeaderMatch[2]);
      continue;
    }

    let workingLine = rawLine;
    const dayPrefixMatch = workingLine.match(/^(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    let lineDay = currentWeekday;
    if (dayPrefixMatch) {
      lineDay = normalizeWeekday(dayPrefixMatch[1]);
      workingLine = workingLine.slice(dayPrefixMatch[0].length).trim();
      currentWeekday = lineDay;
    }

    workingLine = workingLine.replace(/^[,:\-\s]+/, "");
    const periodMatch = workingLine.match(/^(?:jam|period|p|ke-?)?\s*(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?/i);
    let startPeriod = 1;
    let endPeriod = 1;
    if (periodMatch) {
      startPeriod = parseInt(periodMatch[1], 10);
      endPeriod = periodMatch[2] ? parseInt(periodMatch[2], 10) : startPeriod;
      workingLine = workingLine.slice(periodMatch[0].length).trim();
    }

    workingLine = workingLine.replace(/^[,:\-\s]+/, "");
    if (!workingLine) continue;

    let room;
    const roomMatch = workingLine.match(/\b(r\.\s*\w+|ruang\s*\w+|lab\s*\w+)\b/i);
    if (roomMatch) {
      room = roomMatch[0].trim();
      workingLine = workingLine.replace(roomMatch[0], "").trim();
    }

    let teacher;
    const teacherMatch = workingLine.match(/\b((?:pak|bu|ibu|bpk|mr\.?|mrs\.?|dra\.?|drs\.?)\s+[A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
    if (teacherMatch) {
      teacher = teacherMatch[0].trim();
      workingLine = workingLine.replace(teacherMatch[0], "").trim();
    }

    const rawSubject = workingLine.replace(/^[,:\-\s]+/, "").replace(/[,:\-\s]+$/, "").trim();
    if (!rawSubject) continue;

    const matched = matchSubjectCandidate(rawSubject, existingSubjects);
    const pStart = Math.min(Math.max(1, startPeriod), 10);
    const pEnd = Math.min(Math.max(pStart, endPeriod), 10);

    for (let p = pStart; p <= pEnd; p++) {
      items.push({
        id: `rev-${Date.now()}-${items.length}`,
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
  return { items };
}

function parseCsvTimetable(csvText, existingSubjects) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const items = [];
  if (lines.length === 0) return { items };

  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";";

  const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, "")));
  const headerRow = rows[0].map(h => h.toLowerCase());

  const dayIndices = [];
  headerRow.forEach((colName, idx) => {
    if (/senin|selasa|rabu|kamis|jumat|sabtu|minggu|mon|tue|wed|thu|fri|sat|sun/.test(colName)) {
      dayIndices.push({ day: normalizeWeekday(colName), colIdx: idx });
    }
  });

  if (dayIndices.length >= 2) {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const periodNum = parseInt((row[0] || String(r)).replace(/\D/g, ""), 10) || r;
      for (const { day, colIdx } of dayIndices) {
        const cellValue = row[colIdx];
        if (!cellValue || cellValue.trim() === "-" || cellValue.trim() === "") continue;
        const matched = matchSubjectCandidate(cellValue, existingSubjects);
        items.push({
          id: `rev-csv-${Date.now()}-${items.length}`,
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
    return { items };
  }

  let dayCol = headerRow.findIndex(h => h.includes("day") || h.includes("hari"));
  let periodCol = headerRow.findIndex(h => h.includes("period") || h.includes("jam"));
  let subjectCol = headerRow.findIndex(h => h.includes("subject") || h.includes("mapel"));
  let roomCol = headerRow.findIndex(h => h.includes("room") || h.includes("ruang"));
  let teacherCol = headerRow.findIndex(h => h.includes("teacher") || h.includes("guru"));

  let startIndex = 1;
  if (dayCol === -1 || subjectCol === -1) {
    dayCol = 0; periodCol = 1; subjectCol = 2; roomCol = 3; teacherCol = 4;
    startIndex = (headerRow[0].includes("hari") || headerRow[0].includes("day")) ? 1 : 0;
  }

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || !row[subjectCol]) continue;
    const day = normalizeWeekday(row[dayCol] || "1");
    const periodNum = parseInt(String(row[periodCol] || "1").replace(/\D/g, ""), 10) || 1;
    const matched = matchSubjectCandidate(row[subjectCol], existingSubjects);
    items.push({
      id: `rev-list-${Date.now()}-${items.length}`,
      day,
      periodNumber: Math.min(Math.max(1, periodNum), 10),
      rawSubject: row[subjectCol],
      subjectId: matched.subjectId,
      matchedSubjectName: matched.canonicalName,
      matchedSubjectColor: matched.color,
      isNewSubject: matched.isNewSubject,
      confidence: matched.confidence,
      room: roomCol !== -1 ? row[roomCol] : undefined,
      teacher: teacherCol !== -1 ? row[teacherCol] : undefined,
    });
  }
  return { items };
}

function mergeTimetableEntries(existing, incoming) {
  const incomingMap = new Map();
  for (const inc of incoming) {
    incomingMap.set(`${inc.weekday}-${inc.periodNumber}-${inc.weekPattern || "every"}`, inc);
  }
  const result = [];
  for (const ex of existing) {
    if (!incomingMap.has(`${ex.weekday}-${ex.periodNumber}-${ex.weekPattern || "every"}`)) {
      result.push(ex);
    }
  }
  for (const inc of incoming) {
    result.push(inc);
  }
  return result.sort((a, b) => (a.weekday !== b.weekday ? a.weekday - b.weekday : a.periodNumber - b.periodNumber));
}

// ─── RUN VERIFICATIONS ───
const MOCK_EXISTING = [
  { id: "subj-mtk", name: "Matematika", color: "#3A86FF", aliases: ["mtk", "math"] },
  { id: "subj-bind", name: "Bahasa Indonesia", color: "#EF4444", aliases: ["b.indo", "bind"] },
];

console.log("=================================================");
console.log("  PHASE 5 AUTOMATED VERIFICATION SUITE");
console.log("=================================================\n");

console.log("[1/5] Testing Weekday Normalization...");
assert.equal(normalizeWeekday("Senin"), 1);
assert.equal(normalizeWeekday("Monday"), 1);
assert.equal(normalizeWeekday("Jum'at"), 5);
assert.equal(normalizeWeekday("Sunday"), 7);
assert.equal(getWeekdayName(1, "id"), "Senin");
assert.equal(getWeekdayName(1, "en"), "Monday");
console.log("  ✓ Weekday normalization: ALL PASSED");

console.log("\n[2/5] Testing Subject Matching & Confidence...");
const m1 = matchSubjectCandidate("Matematika", MOCK_EXISTING);
assert.equal(m1.subjectId, "subj-mtk");
assert.equal(m1.confidence, 1.0);
assert.equal(m1.isNewSubject, false);

const m2 = matchSubjectCandidate("mtk", MOCK_EXISTING);
assert.equal(m2.subjectId, "subj-mtk");
assert.equal(m2.confidence, 0.9);

const m3 = matchSubjectCandidate("Fisika", MOCK_EXISTING);
assert.equal(m3.canonicalName, "Fisika");
assert.equal(m3.isNewSubject, true);
assert.ok(m3.confidence >= 0.7);

const m4 = matchSubjectCandidate("Robotika AI Khusus", MOCK_EXISTING);
assert.equal(m4.isNewSubject, true);
assert.equal(m4.confidence, 0.5);
console.log("  ✓ Subject matching and confidence scoring: ALL PASSED");

console.log("\n[3/5] Testing Structured Text Parser...");
const sampleText = `
=== SENIN ===
1 MTK
2 Fisika R.Lab Pak Joko
Selasa 1-2 Bahasa Indonesia
Rabu Jam 3: Kimia
`;
const textRes = parseStructuredTextTimetable(sampleText, MOCK_EXISTING);
assert.ok(textRes.items.length >= 5);
const p1Mon = textRes.items.find(i => i.day === 1 && i.periodNumber === 1);
assert.equal(p1Mon.matchedSubjectName, "Matematika");
const p2Mon = textRes.items.find(i => i.day === 1 && i.periodNumber === 2);
assert.equal(p2Mon.matchedSubjectName, "Fisika");
assert.ok(p2Mon.room?.includes("Lab"));
assert.ok(p2Mon.teacher?.includes("Pak Joko"));
const p1Tue = textRes.items.find(i => i.day === 2 && i.periodNumber === 1);
const p2Tue = textRes.items.find(i => i.day === 2 && i.periodNumber === 2);
assert.ok(p1Tue && p2Tue);
console.log("  ✓ Structured text timetable parser: ALL PASSED");

console.log("\n[4/5] Testing CSV & Matrix Parser...");
const listCsv = `
Hari,Jam,Mapel,Ruang,Guru
Senin,1,MTK,R.101,Pak Budi
Senin,2,Fisika,Lab Fisika,Bu Dewi
Selasa,1,Bahasa Indonesia,,
`;
const listRes = parseCsvTimetable(listCsv, MOCK_EXISTING);
assert.equal(listRes.items.length, 3);
assert.equal(listRes.items[0].matchedSubjectName, "Matematika");

const matrixCsv = `
Period\tSenin\tSelasa\tRabu\tKamis\tJumat
1\tMTK\tFisika\tKimia\tB.Indo\tAgama
2\tMTK\tFisika\tKimia\tB.Indo\tAgama
`;
const matrixRes = parseCsvTimetable(matrixCsv, MOCK_EXISTING);
assert.equal(matrixRes.items.length, 10);
console.log("  ✓ CSV list & spreadsheet matrix parser: ALL PASSED");

console.log("\n[5/5] Testing Conflict Resolution ('Replace' vs 'Merge')...");
const ex = [
  { id: "tt-1", weekday: 1, periodNumber: 1, subjectId: "subj-mtk", weekPattern: "every" },
  { id: "tt-2", weekday: 1, periodNumber: 2, subjectId: "subj-bind", weekPattern: "every" },
  { id: "tt-3", weekday: 2, periodNumber: 1, subjectId: "subj-mtk", weekPattern: "every" },
];
const inc = [
  { id: "tt-new-1", weekday: 1, periodNumber: 1, subjectId: "subj-fisika", weekPattern: "every" },
  { id: "tt-new-2", weekday: 3, periodNumber: 1, subjectId: "subj-kimia", weekPattern: "every" },
];
const merged = mergeTimetableEntries(ex, inc);
assert.equal(merged.length, 4);
assert.equal(merged.find(e => e.weekday === 1 && e.periodNumber === 1).subjectId, "subj-fisika");
assert.equal(merged.find(e => e.weekday === 1 && e.periodNumber === 2).subjectId, "subj-bind");
assert.equal(merged.find(e => e.weekday === 2 && e.periodNumber === 1).subjectId, "subj-mtk");
assert.equal(merged.find(e => e.weekday === 3 && e.periodNumber === 1).subjectId, "subj-kimia");
console.log("  ✓ Conflict resolution merge algorithm: ALL PASSED");

console.log("\n=================================================");
console.log("  ALL PHASE 5 TESTS PASSED WITH 0 FAILURES!");
console.log("=================================================\n");
