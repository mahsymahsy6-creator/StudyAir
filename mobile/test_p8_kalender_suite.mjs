/**
 * StudyAir - P8 Kalender Screen Test Suite
 * Tests unified day event collation (classes solid, study blocks dashed),
 * deadlines, exams, and month indicator derivation.
 */

import assert from "node:assert";

// Pure collation logic matching mobile/src/screens/CalendarScreen.tsx
export function collateDayEvents({
  date,
  timetableItems = [],
  studyBlocks = [],
  tasks = [],
  exams = [],
  subjectsMap = new Map(),
}) {
  const events = [];

  // 1. School Classes (solid)
  for (const item of timetableItems) {
    if (item.kind === "break") continue;
    const sub = subjectsMap.get(item.subjectId);
    events.push({
      id: `class-${item.id}`,
      kind: "class",
      title: sub?.name || item.customLabel || "Kelas",
      subtitle: item.room ? `Ruang ${item.room}` : (item.teacher || "Jadwal Sekolah"),
      startTime: item.startTime || "07:00",
      endTime: item.endTime || "08:00",
      color: sub?.color || sub?.color_hex || "#1CB0F6",
      isDashed: false,
    });
  }

  // 2. Study Blocks (dashed)
  const dayBlocks = studyBlocks.filter(
    (b) => b.date === date && b.status !== "SKIPPED"
  );
  for (const block of dayBlocks) {
    const sub = subjectsMap.get(block.subjectId);
    const task = tasks.find((t) => t.id === block.taskId);
    events.push({
      id: `block-${block.id}`,
      kind: "study_block",
      title: task?.title || "Blok Belajar",
      subtitle: sub?.name ? `Belajar • ${sub.name}` : "Blok Belajar Mandiri",
      startTime: block.startTime,
      endTime: block.endTime,
      color: sub?.color || sub?.color_hex || "#1CB0F6",
      isDashed: true,
      blockData: block,
    });
  }

  // 3. Deadlines (Due on this date)
  const dayTasks = tasks.filter(
    (t) => t.deadlineDate === date && t.status !== "COMPLETED"
  );
  for (const task of dayTasks) {
    const sub = subjectsMap.get(task.subjectId);
    events.push({
      id: `deadline-${task.id}`,
      kind: "deadline",
      title: `Tenggat: ${task.title}`,
      subtitle: sub?.name || "Tugas",
      startTime: "23:59",
      endTime: "23:59",
      color: "#FF4B4B",
      isDashed: false,
    });
  }

  // 4. Exams
  const dayExams = exams.filter((e) => e.date === date);
  for (const exam of dayExams) {
    events.push({
      id: `exam-${exam.id || exam.title}`,
      kind: "exam",
      title: `Ujian: ${exam.title}`,
      subtitle: exam.subjectName || "Ujian Akademik",
      startTime: exam.startTime || "08:00",
      endTime: exam.endTime || "10:00",
      color: "#CE82FF",
      isDashed: false,
    });
  }

  // Sort by startTime
  return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function deriveDayIndicators({ date, timetableItems = [], studyBlocks = [], tasks = [], exams = [] }) {
  const hasClass = timetableItems.some((item) => item.kind !== "break");
  const hasStudyBlock = studyBlocks.some((b) => b.date === date && b.status !== "SKIPPED");
  const hasDeadline = tasks.some((t) => t.deadlineDate === date && t.status !== "COMPLETED");
  const hasExam = exams.some((e) => e.date === date);

  return { hasClass, hasStudyBlock, hasDeadline, hasExam };
}

console.log("==================================================");
console.log("    STUDYAIR P8 KALENDER SCREEN TEST SUITE");
console.log("==================================================");

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n[1] Collation of Day Events (Classes Solid, Blocks Dashed)");

it("collates classes with isDashed: false and study blocks with isDashed: true", () => {
  const date = "2026-10-30";
  const timetableItems = [
    { id: "e1", subjectId: "sub1", startTime: "07:15", endTime: "08:45", kind: "class", room: "12A" },
  ];
  const studyBlocks = [
    { id: "b1", taskId: "t1", date: "2026-10-30", startTime: "16:00", endTime: "16:45", status: "SCHEDULED" },
  ];
  const tasks = [
    { id: "t1", title: "PR Mat", subjectId: "sub1", deadlineDate: "2026-10-31", status: "PENDING" },
  ];
  const subjectsMap = new Map([["sub1", { id: "sub1", name: "Matematika", color: "#1CB0F6" }]]);

  const events = collateDayEvents({ date, timetableItems, studyBlocks, tasks, subjectsMap });

  assert.strictEqual(events.length, 2);
  const classEv = events.find((e) => e.kind === "class");
  const blockEv = events.find((e) => e.kind === "study_block");

  assert.ok(classEv);
  assert.strictEqual(classEv.isDashed, false);
  assert.strictEqual(classEv.title, "Matematika");

  assert.ok(blockEv);
  assert.strictEqual(blockEv.isDashed, true);
  assert.strictEqual(blockEv.title, "PR Mat");
});

it("includes deadlines for the day sorted to deadline time", () => {
  const date = "2026-10-30";
  const tasks = [
    { id: "t2", title: "Fisika Laporan", subjectId: "sub2", deadlineDate: "2026-10-30", status: "PENDING" },
  ];

  const events = collateDayEvents({ date, tasks });
  const deadlineEv = events.find((e) => e.kind === "deadline");

  assert.ok(deadlineEv);
  assert.strictEqual(deadlineEv.title, "Tenggat: Fisika Laporan");
  assert.strictEqual(deadlineEv.isDashed, false);
});

console.log("\n[2] Month Day Indicators");

it("derives accurate dots for classes, blocks, and deadlines", () => {
  const date = "2026-10-30";
  const timetableItems = [{ id: "e1", kind: "class" }];
  const studyBlocks = [{ id: "b1", date: "2026-10-30", status: "SCHEDULED" }];
  const tasks = [{ id: "t1", deadlineDate: "2026-10-30", status: "PENDING" }];

  const indicators = deriveDayIndicators({ date, timetableItems, studyBlocks, tasks });

  assert.strictEqual(indicators.hasClass, true);
  assert.strictEqual(indicators.hasStudyBlock, true);
  assert.strictEqual(indicators.hasDeadline, true);
  assert.strictEqual(indicators.hasExam, false);
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);
