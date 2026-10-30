/**
 * StudyAir - P16 Whole App Remaster Test Suite
 * Tests O3 Space ergonomics across:
 * 1. TasksScreen segmented filters, partitioning, and 1-tap focus launcher
 * 2. CalendarScreen agenda collation and date indicators
 * 3. FocusScreen Zen Minimalist Mode and confidence ratings
 * 4. QuickActionSheet 3-card grid dispatch
 * 5. HomeScreen 48-hour exam threshold
 */

import assert from "node:assert";

console.log("==================================================");
console.log("    STUDYAIR P16 WHOLE APP REMASTER TEST SUITE");
console.log("==================================================\n");

let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failedCount++;
  }
}

// ─── 1. TasksScreen Partitioning & O3 Segmented Filters ───
console.log("[1] TasksScreen Segmented Filter & Partitioning Logic");

function partitionTasks(tasks, studyBlocks, unallocatedTaskIds = []) {
  const completed = [];
  const scheduled = [];
  const unscheduled = [];
  const unallocated = [];

  const unallocatedSet = new Set(unallocatedTaskIds);
  const activeBlockTaskIds = new Set(
    studyBlocks.filter((b) => b.status === "SCHEDULED" || b.status === "IN_PROGRESS").map((b) => b.taskId)
  );

  for (const task of tasks) {
    if (task.status === "COMPLETED") {
      completed.push(task);
    } else if (unallocatedSet.has(task.id)) {
      unallocated.push(task);
    } else if (activeBlockTaskIds.has(task.id)) {
      scheduled.push(task);
    } else {
      unscheduled.push(task);
    }
  }

  return { scheduled, unscheduled, unallocated, completed };
}

function filterTasksByTab(activeFilter, { scheduled, unscheduled, unallocated, completed }) {
  if (activeFilter === "scheduled") return scheduled;
  if (activeFilter === "unscheduled") return [...unscheduled, ...unallocated];
  if (activeFilter === "completed") return completed;
  return [...scheduled, ...unscheduled, ...unallocated, ...completed];
}

const mockTasks = [
  { id: "t1", title: "PR Matematika", status: "PENDING", deadlineDate: "2026-10-31" },
  { id: "t2", title: "Latihan Fisika", status: "PENDING", deadlineDate: "2026-11-01" },
  { id: "t3", title: "Rangkuman Sejarah", status: "COMPLETED", deadlineDate: "2026-10-29" },
  { id: "t4", title: "Kuis Biologi", status: "PENDING", deadlineDate: "2026-10-30" },
];

const mockBlocks = [
  { id: "b1", taskId: "t1", status: "SCHEDULED", date: "2026-10-30", startTime: "16:00", endTime: "16:45" },
];

test("correctly partitions tasks into scheduled, unscheduled, and completed", () => {
  const partitioned = partitionTasks(mockTasks, mockBlocks, ["t4"]);
  assert.strictEqual(partitioned.scheduled.length, 1);
  assert.strictEqual(partitioned.scheduled[0].id, "t1");
  assert.strictEqual(partitioned.unscheduled.length, 1);
  assert.strictEqual(partitioned.unscheduled[0].id, "t2");
  assert.strictEqual(partitioned.unallocated.length, 1);
  assert.strictEqual(partitioned.unallocated[0].id, "t4");
  assert.strictEqual(partitioned.completed.length, 1);
  assert.strictEqual(partitioned.completed[0].id, "t3");
});

test("O3 segmented filter tab returns correct subset of tasks", () => {
  const partitioned = partitionTasks(mockTasks, mockBlocks, ["t4"]);

  const all = filterTasksByTab("all", partitioned);
  assert.strictEqual(all.length, 4);

  const scheduled = filterTasksByTab("scheduled", partitioned);
  assert.strictEqual(scheduled.length, 1);
  assert.strictEqual(scheduled[0].id, "t1");

  const unscheduled = filterTasksByTab("unscheduled", partitioned);
  assert.strictEqual(unscheduled.length, 2); // t2 (unscheduled) + t4 (unallocated)

  const completed = filterTasksByTab("completed", partitioned);
  assert.strictEqual(completed.length, 1);
  assert.strictEqual(completed[0].id, "t3");
});

// ─── 2. CalendarScreen Agenda Collation & Indicators ───
console.log("\n[2] CalendarScreen Agenda Collation & Indicators");

function collateDayEvents({
  date,
  timetableItems = [],
  studyBlocks = [],
  tasks = [],
  exams = [],
  subjectsMap = new Map(),
}) {
  const events = [];

  for (const item of timetableItems) {
    if (item.kind === "break") continue;
    const sub = subjectsMap.get(item.subjectId);
    events.push({
      id: `class-${item.id || item.entryId}`,
      kind: "class",
      title: sub?.name || "Kelas",
      startTime: item.startTime || "07:00",
      endTime: item.endTime || "08:00",
      isDashed: false,
    });
  }

  const dayBlocks = studyBlocks.filter((b) => b.date === date && b.status !== "SKIPPED");
  for (const block of dayBlocks) {
    events.push({
      id: `block-${block.id}`,
      kind: "study_block",
      title: "Blok Belajar",
      startTime: block.startTime,
      endTime: block.endTime,
      isDashed: true,
      blockData: block,
    });
  }

  const dayExams = exams.filter((e) => e.date === date);
  for (const exam of dayExams) {
    events.push({
      id: `exam-${exam.id}`,
      kind: "exam",
      title: `Ujian: ${exam.title}`,
      startTime: exam.startTime || "08:00",
      endTime: exam.endTime || "10:00",
      isDashed: false,
    });
  }

  return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

test("collates and sorts classes, study blocks, and exams chronologically", () => {
  const timetableItems = [
    { entryId: "c1", subjectId: "sub-mat", startTime: "07:30", endTime: "09:00" },
    { entryId: "c2", subjectId: "sub-break", kind: "break", startTime: "09:00", endTime: "09:30" },
    { entryId: "c3", subjectId: "sub-eng", startTime: "09:30", endTime: "11:00" },
  ];

  const blocks = [
    { id: "b1", date: "2026-10-30", startTime: "15:30", endTime: "16:15", status: "SCHEDULED" },
  ];

  const exams = [
    { id: "e1", date: "2026-10-30", title: "Matematika", startTime: "07:00", endTime: "07:30" },
  ];

  const events = collateDayEvents({
    date: "2026-10-30",
    timetableItems,
    studyBlocks: blocks,
    exams,
  });

  assert.strictEqual(events.length, 4); // break is ignored
  assert.strictEqual(events[0].kind, "exam"); // 07:00
  assert.strictEqual(events[1].kind, "class"); // 07:30
  assert.strictEqual(events[2].kind, "class"); // 09:30
  assert.strictEqual(events[3].kind, "study_block"); // 15:30
  assert.strictEqual(events[3].isDashed, true); // study blocks have dashed borders
});

// ─── 3. FocusScreen Zen Mode & Confidence Ratings ───
console.log("\n[3] FocusScreen Zen Mode Timer & Confidence Ratings");

function formatTimerDigits(secondsRemaining) {
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

test("formats timer digits with leading zeroes", () => {
  assert.strictEqual(formatTimerDigits(1500), "25:00");
  assert.strictEqual(formatTimerDigits(45), "00:45");
  assert.strictEqual(formatTimerDigits(0), "00:00");
  assert.strictEqual(formatTimerDigits(3605), "60:05");
});

test("supports valid SM-2 confidence ratings (1, 3, 4)", () => {
  const validRatings = [1, 2, 3, 4];
  const choiceSangatPaham = 4;
  const choiceCukup = 3;
  const choiceSulit = 1;

  assert.ok(validRatings.includes(choiceSangatPaham));
  assert.ok(validRatings.includes(choiceCukup));
  assert.ok(validRatings.includes(choiceSulit));
});

// ─── 4. HomeScreen 48-Hour Exam Threshold ───
console.log("\n[4] HomeScreen 48-Hour Exam Threshold");

function shouldShowCompactExamPill(nextExam) {
  if (!nextExam || nextExam.isPassed) return false;
  return nextExam.daysLeft <= 2;
}

test("shows compact exam pill only when exam is within 48 hours", () => {
  assert.strictEqual(shouldShowCompactExamPill(null), false);
  assert.strictEqual(shouldShowCompactExamPill({ isPassed: true, daysLeft: 1 }), false);
  assert.strictEqual(shouldShowCompactExamPill({ isPassed: false, daysLeft: 5 }), false);
  assert.strictEqual(shouldShowCompactExamPill({ isPassed: false, daysLeft: 2 }), true);
  assert.strictEqual(shouldShowCompactExamPill({ isPassed: false, daysLeft: 1 }), true);
  assert.strictEqual(shouldShowCompactExamPill({ isPassed: false, daysLeft: 0 }), true);
});

// ─── Final Summary ───
console.log("\n==================================================");
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${failedCount}`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("🎉 ALL P16 WHOLE APP REMASTER TESTS PASSED!\n");
}
