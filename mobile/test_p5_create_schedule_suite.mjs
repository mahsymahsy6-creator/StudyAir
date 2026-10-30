import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { buildSchedule, extractBusyBlocksFromTimetable } = require("./dist-test/engine/schedulerEngine.js");
const { DEFAULT_SCHEDULE_PREFS } = require("./dist-test/types.js");
const { t } = require("./dist-test/lib/i18n.js");

console.log("==================================================");
console.log("   STUDYAIR P5 BUAT JADWAL FLOW TEST SUITE");
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

// ─── Mock Store Harness for Schedule Apply & Undo ───
class MockScheduleStore {
  constructor(initialBlocks = []) {
    this.studyBlocks = [...initialBlocks];
    this.lastScheduleBackup = null;
  }

  applySchedule(newBlocks) {
    this.lastScheduleBackup = [...this.studyBlocks];
    this.studyBlocks = [...newBlocks];
  }

  undoLastSchedule() {
    if (!this.lastScheduleBackup) return false;
    this.studyBlocks = [...this.lastScheduleBackup];
    this.lastScheduleBackup = null;
    return true;
  }
}

// ─── 1. Schedule Generation ───
console.log("[1] Schedule Generation via Engine");

const sampleTasks = [
  {
    id: "task-1",
    title: "PR Matematika Hal 45",
    subjectId: "sub-math",
    type: "homework",
    givenDate: "2026-10-30",
    deadlineDate: "2026-11-02",
    deadlineMode: "nextClass",
    estimatedMinutes: 45,
    status: "PENDING",
  },
  {
    id: "task-2",
    title: "Kuis Fisika Bab 3",
    subjectId: "sub-phys",
    type: "quiz",
    givenDate: "2026-10-30",
    deadlineDate: "2026-11-03",
    deadlineMode: "custom",
    estimatedMinutes: 60,
    status: "PENDING",
  },
];

test("buildSchedule generates discrete study blocks for pending tasks", () => {
  const result = buildSchedule({
    tasks: sampleTasks,
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-30",
  });

  assert.ok(result);
  assert.ok(result.blocks.length >= 2, "Expected at least 2 study blocks");
  assert.strictEqual(result.stats.totalTasks, 2);
  assert.strictEqual(result.stats.fullyScheduledCount, 2);
  assert.strictEqual(result.unallocated.length, 0);

  // Every block has duration <= maxBlockMinutes
  for (const b of result.blocks) {
    assert.ok(b.durationMinutes <= DEFAULT_SCHEDULE_PREFS.maxBlockMinutes);
    assert.strictEqual(b.status, "SCHEDULED");
  }
});

test("returns empty blocks when no pending tasks are present", () => {
  const result = buildSchedule({
    tasks: [],
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-30",
  });

  assert.strictEqual(result.blocks.length, 0);
  assert.strictEqual(result.stats.totalTasks, 0);
});

// ─── 2. Apply Schedule Action & Backup ───
console.log("\n[2] Apply Schedule State Transition");

test("applySchedule sets new blocks and retains backup for undo", () => {
  const store = new MockScheduleStore([
    { id: "old-1", taskId: "t0", date: "2026-10-29", startTime: "16:00", endTime: "16:45", status: "COMPLETED" },
  ]);

  const candidateBlocks = [
    { id: "b1", taskId: "task-1", date: "2026-10-30", startTime: "15:00", endTime: "15:45", status: "SCHEDULED" },
    { id: "b2", taskId: "task-2", date: "2026-10-30", startTime: "16:00", endTime: "16:45", status: "SCHEDULED" },
  ];

  store.applySchedule(candidateBlocks);

  assert.strictEqual(store.studyBlocks.length, 2);
  assert.strictEqual(store.studyBlocks[0].id, "b1");
  assert.strictEqual(store.studyBlocks[1].id, "b2");

  assert.ok(store.lastScheduleBackup);
  assert.strictEqual(store.lastScheduleBackup.length, 1);
  assert.strictEqual(store.lastScheduleBackup[0].id, "old-1");
});

// ─── 3. Undo Last Schedule ───
console.log("\n[3] Undo Schedule Restoration");

test("undoLastSchedule restores previous study blocks and clears backup", () => {
  const store = new MockScheduleStore([
    { id: "prev-1", taskId: "t0", date: "2026-10-28", startTime: "15:00", endTime: "15:30", status: "COMPLETED" },
  ]);

  const newBlocks = [
    { id: "new-1", taskId: "task-1", date: "2026-10-30", startTime: "15:00", endTime: "15:45", status: "SCHEDULED" },
  ];

  store.applySchedule(newBlocks);
  assert.strictEqual(store.studyBlocks[0].id, "new-1");

  // Perform Undo
  const success = store.undoLastSchedule();
  assert.strictEqual(success, true);
  assert.strictEqual(store.studyBlocks.length, 1);
  assert.strictEqual(store.studyBlocks[0].id, "prev-1");
  assert.strictEqual(store.lastScheduleBackup, null);
});

test("undoLastSchedule returns false when no backup exists", () => {
  const store = new MockScheduleStore();
  const success = store.undoLastSchedule();
  assert.strictEqual(success, false);
});

// ─── 4. Diff Calculation ───
console.log("\n[4] Diff Calculation (Old vs New Blocks)");

test("computes accurate diff message for replacing blocks", () => {
  const oldBlocksCount = 3;
  const newBlocksCount = 7;

  const msg = t("diff_ganti_blok", {
    old: oldBlocksCount,
    new: newBlocksCount,
  });

  assert.strictEqual(msg, "Akan mengganti 3 blok sebelumnya dengan 7 blok baru");
});

// ─── 5. Unallocated Task Reporting ───
console.log("\n[5] Unallocated Tasks Reporting");

test("flags unallocated task when deadline is too tight for duration", () => {
  const impossibleTask = {
    id: "task-impossible",
    title: "Tugas Makalah 50 Halaman",
    subjectId: "sub-indo",
    type: "homework",
    givenDate: "2026-10-30",
    deadlineDate: "2026-10-30", // Due today
    deadlineMode: "custom",
    estimatedMinutes: 360, // 6 hours
    status: "PENDING",
  };

  // Busy all evening: 15:00 to 20:30
  const busy = [
    {
      id: "busy-1",
      date: "2026-10-30",
      startTime: "15:00",
      endTime: "20:30",
      label: "Bimbel & Les",
      source: "custom",
    },
  ];

  const result = buildSchedule({
    tasks: [impossibleTask],
    busyBlocks: busy,
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-30",
  });

  assert.ok(result.unallocated.length > 0);
  const unalloc = result.unallocated[0];
  assert.strictEqual(unalloc.taskId, "task-impossible");
  assert.ok(["SCHEDULE_FULL", "DEADLINE_TOO_SOON"].includes(unalloc.reason));
  assert.ok(unalloc.neededMinutes > unalloc.allocatedMinutes);
});

// ─── Final Summary ───
console.log("\n==================================================");
console.log(`RESULTS: ${passedCount} passed, ${failedCount} failed`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
}
