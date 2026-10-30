import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  timeToMinutes,
  minutesToTime,
  dateRange,
  extractBusyBlocksFromTimetable,
  findFreeSlots,
  chunkTask,
  buildSchedule,
} = require("./dist-test/engine/schedulerEngine.js");

const { DEFAULT_SCHEDULE_PREFS } = require("./dist-test/types.js");

console.log("==================================================");
console.log("   STUDYAIR P3 SCHEDULING ENGINE TEST SUITE");
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

// ─── 1. Time & Slot Helper Functions ───
console.log("[1] Time & Slot Helpers");

test("timeToMinutes converts valid HH:mm strings", () => {
  assert.strictEqual(timeToMinutes("00:00"), 0);
  assert.strictEqual(timeToMinutes("07:15"), 435);
  assert.strictEqual(timeToMinutes("12:00"), 720);
  assert.strictEqual(timeToMinutes("15:30"), 930);
  assert.strictEqual(timeToMinutes("23:59"), 1439);
});

test("timeToMinutes gracefully handles malformed inputs", () => {
  assert.strictEqual(timeToMinutes(""), 0);
  assert.strictEqual(timeToMinutes(null), 0);
  assert.strictEqual(timeToMinutes(undefined), 0);
  assert.strictEqual(timeToMinutes("invalid"), 0);
  assert.strictEqual(timeToMinutes("25:00"), 1439); // clamped to 1439
  assert.strictEqual(timeToMinutes("-05:00"), 0);
});

test("minutesToTime formats minutes into 24h string", () => {
  assert.strictEqual(minutesToTime(0), "00:00");
  assert.strictEqual(minutesToTime(435), "07:15");
  assert.strictEqual(minutesToTime(720), "12:00");
  assert.strictEqual(minutesToTime(930), "15:30");
  assert.strictEqual(minutesToTime(1439), "23:59");
  assert.strictEqual(minutesToTime(-10), "00:00"); // clamped
});

test("dateRange returns inclusive list of dates", () => {
  const range = dateRange("2026-10-28", "2026-10-31");
  assert.deepStrictEqual(range, [
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
  ]);

  const single = dateRange("2026-10-28", "2026-10-28");
  assert.deepStrictEqual(single, ["2026-10-28"]);

  const inverted = dateRange("2026-10-30", "2026-10-28");
  assert.deepStrictEqual(inverted, []);
});

// ─── 2. Timetable Busy Block Extraction ───
console.log("\n[2] extractBusyBlocksFromTimetable");

test("extracts busy blocks from regular timetable entries", () => {
  const entries = [
    {
      id: "tt-1",
      subjectId: "sub-math",
      weekday: 3, // Wednesday (2026-10-28 is Wednesday)
      periodNumber: 1,
      weekPattern: "every",
      kind: "class",
    },
    {
      id: "tt-2",
      subjectId: "sub-bio",
      weekday: 3,
      periodNumber: 2,
      weekPattern: "every",
      kind: "class",
    },
  ];

  const periodTimes = [
    { periodNumber: 1, start: "07:15", end: "08:00" },
    { periodNumber: 2, start: "08:00", end: "08:45" },
  ];

  const busy = extractBusyBlocksFromTimetable({
    timetableEntries: entries,
    periodTimes,
    daysOff: [],
    overrides: [],
    startDate: "2026-10-28",
    endDate: "2026-10-28",
  });

  assert.strictEqual(busy.length, 2);
  assert.strictEqual(busy[0].source, "timetable");
  assert.strictEqual(busy[0].startTime, "07:15");
  assert.strictEqual(busy[0].endTime, "08:00");
  assert.strictEqual(busy[1].startTime, "08:00");
  assert.strictEqual(busy[1].endTime, "08:45");
});

test("handles school daysOff by marking entire school day as busy", () => {
  const busy = extractBusyBlocksFromTimetable({
    timetableEntries: [],
    periodTimes: [
      { periodNumber: 1, start: "07:00", end: "07:45" },
      { periodNumber: 8, start: "13:15", end: "14:00" },
    ],
    daysOff: [{ date: "2026-10-28", reason: "Hari Guru" }],
    overrides: [],
    startDate: "2026-10-28",
    endDate: "2026-10-28",
  });

  assert.strictEqual(busy.length, 1);
  assert.strictEqual(busy[0].id, "dayoff-2026-10-28");
  assert.strictEqual(busy[0].title, "Hari Guru");
  assert.strictEqual(busy[0].startTime, "07:00");
  assert.strictEqual(busy[0].endTime, "14:00");
});

test("respects timetable overrides (cancelled, swapped, added)", () => {
  const entries = [
    {
      id: "tt-1",
      subjectId: "sub-math",
      weekday: 3,
      periodNumber: 1,
      weekPattern: "every",
    },
    {
      id: "tt-2",
      subjectId: "sub-physics",
      weekday: 3,
      periodNumber: 2,
      weekPattern: "every",
    },
  ];

  const periodTimes = [
    { periodNumber: 1, start: "07:15", end: "08:00" },
    { periodNumber: 2, start: "08:00", end: "08:45" },
    { periodNumber: 3, start: "08:45", end: "09:30" },
  ];

  const overrides = [
    { date: "2026-10-28", entryId: "tt-1", type: "cancelled" },
    {
      date: "2026-10-28",
      entryId: "tt-2",
      type: "swapped",
      newSubjectId: "sub-chem",
      customLabel: "Kimia Pengganti",
    },
    {
      date: "2026-10-28",
      type: "added",
      newSubjectId: "sub-pe",
      periodNumber: 3,
      customLabel: "Olahraga Tambahan",
    },
  ];

  const busy = extractBusyBlocksFromTimetable({
    timetableEntries: entries,
    periodTimes,
    daysOff: [],
    overrides,
    startDate: "2026-10-28",
    endDate: "2026-10-28",
  });

  // tt-1 cancelled, tt-2 swapped to chem, added PE
  assert.strictEqual(busy.length, 2);
  assert.strictEqual(busy[0].title, "Kimia Pengganti");
  assert.strictEqual(busy[0].startTime, "08:00");
  assert.strictEqual(busy[1].title, "Olahraga Tambahan");
  assert.strictEqual(busy[1].startTime, "08:45");
});

test("respects A/B week pattern for alternating schedules", () => {
  // 2026-10-28 is Wednesday, ISO week 44 (even -> week "B")
  const entries = [
    {
      id: "tt-a",
      subjectId: "sub-art",
      weekday: 3,
      periodNumber: 1,
      weekPattern: "A",
    },
    {
      id: "tt-b",
      subjectId: "sub-music",
      weekday: 3,
      periodNumber: 1,
      weekPattern: "B",
    },
  ];

  const periodTimes = [{ periodNumber: 1, start: "07:15", end: "08:00" }];

  const busy = extractBusyBlocksFromTimetable({
    timetableEntries: entries,
    periodTimes,
    daysOff: [],
    overrides: [],
    startDate: "2026-10-28",
    endDate: "2026-10-28",
  });

  assert.strictEqual(busy.length, 1);
  assert.strictEqual(busy[0].title, "sub-music"); // Only week B entry is kept
});

// ─── 3. Free Slot Finder ───
console.log("\n[3] findFreeSlots");

test("returns complete study window when no busy blocks", () => {
  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    studyWindowStart: "15:00",
    studyWindowEnd: "21:00",
  };

  const slots = findFreeSlots("2026-10-28", [], prefs);
  assert.strictEqual(slots.length, 1);
  assert.strictEqual(slots[0].startMinutes, 900); // 15:00
  assert.strictEqual(slots[0].endMinutes, 1260); // 21:00
  assert.strictEqual(slots[0].durationMinutes, 360);
});

test("splits slot around busy block in middle of study window", () => {
  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    studyWindowStart: "15:00",
    studyWindowEnd: "21:00",
  };

  const busy = [
    {
      id: "b-1",
      source: "custom",
      title: "Les Bimbel",
      date: "2026-10-28",
      startTime: "17:00",
      endTime: "18:00",
    },
  ];

  const slots = findFreeSlots("2026-10-28", busy, prefs);
  assert.strictEqual(slots.length, 2);
  assert.strictEqual(slots[0].startMinutes, 900); // 15:00
  assert.strictEqual(slots[0].endMinutes, 1020); // 17:00
  assert.strictEqual(slots[0].durationMinutes, 120);

  assert.strictEqual(slots[1].startMinutes, 1080); // 18:00
  assert.strictEqual(slots[1].endMinutes, 1260); // 21:00
  assert.strictEqual(slots[1].durationMinutes, 180);
});

test("merges overlapping and contiguous busy blocks", () => {
  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    studyWindowStart: "15:00",
    studyWindowEnd: "21:00",
  };

  const busy = [
    { id: "b1", source: "custom", title: "A", date: "2026-10-28", startTime: "16:00", endTime: "17:30" },
    { id: "b2", source: "custom", title: "B", date: "2026-10-28", startTime: "17:00", endTime: "18:00" },
  ];

  const slots = findFreeSlots("2026-10-28", busy, prefs);
  assert.strictEqual(slots.length, 2);
  assert.strictEqual(slots[0].startMinutes, 900); // 15:00 - 16:00
  assert.strictEqual(slots[0].endMinutes, 960);
  assert.strictEqual(slots[1].startMinutes, 1080); // 18:00 - 21:00
  assert.strictEqual(slots[1].endMinutes, 1260);
});

test("handles study window crossing midnight by clamping to 23:59", () => {
  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    studyWindowStart: "20:00",
    studyWindowEnd: "01:00", // crosses midnight
  };

  const slots = findFreeSlots("2026-10-28", [], prefs);
  assert.strictEqual(slots.length, 1);
  assert.strictEqual(slots[0].startMinutes, 1200); // 20:00
  assert.strictEqual(slots[0].endMinutes, 1439); // 23:59
  assert.strictEqual(slots[0].durationMinutes, 239);
});

test("respects prefs.daysOff (e.g. Sunday or specific date)", () => {
  // 2026-11-01 is Sunday
  const prefsSunday = {
    ...DEFAULT_SCHEDULE_PREFS,
    daysOff: ["Sunday"],
  };
  const slotsSun = findFreeSlots("2026-11-01", [], prefsSunday);
  assert.strictEqual(slotsSun.length, 0);

  const prefsDate = {
    ...DEFAULT_SCHEDULE_PREFS,
    daysOff: ["2026-10-28"],
  };
  const slotsDate = findFreeSlots("2026-10-28", [], prefsDate);
  assert.strictEqual(slotsDate.length, 0);
});

// ─── 4. Chunking ───
console.log("\n[4] chunkTask");

test("chunkTask divides durations into maxBlock chunks with min 15m remainder", () => {
  assert.deepStrictEqual(chunkTask(45, 45), [45]);
  assert.deepStrictEqual(chunkTask(90, 45), [45, 45]);
  assert.deepStrictEqual(chunkTask(100, 45), [45, 45, 10]);
  assert.deepStrictEqual(chunkTask(30, 45), [30]);
  // clamps to 15 min minimum
  assert.deepStrictEqual(chunkTask(5, 45), [15]);
  assert.deepStrictEqual(chunkTask(0, 45), [15]);
  assert.deepStrictEqual(chunkTask(-20, 45), [15]);

  // Works with Task object
  assert.deepStrictEqual(chunkTask({ estimatedMinutes: 60 }, 30), [30, 30]);
});

// ─── 5. Core Scheduling Algorithm (Step 3 Requirements 1 to 7) ───
console.log("\n[5] buildSchedule Core Scenarios");

test("Scenario 1: Single Task Placement (45m task in 15:00-21:00 -> 15:00-15:45)", () => {
  const tasks = [
    {
      id: "t-1",
      title: "PR Matematika",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-29",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 1);
  assert.strictEqual(result.blocks[0].taskId, "t-1");
  assert.strictEqual(result.blocks[0].date, "2026-10-28");
  assert.strictEqual(result.blocks[0].startTime, "15:00");
  assert.strictEqual(result.blocks[0].endTime, "15:45");
  assert.strictEqual(result.blocks[0].durationMinutes, 45);
  assert.strictEqual(result.unallocated.length, 0);
  assert.strictEqual(result.stats.fullyScheduledCount, 1);
});

test("Scenario 2: Break Insertion (Two 45m tasks with 15m minBreak -> 15:00-15:45 and 16:00-16:45)", () => {
  const tasks = [
    {
      id: "t-1",
      title: "Tugas 1",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-30",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
    {
      id: "t-2",
      title: "Tugas 2",
      subjectId: "sub-physics",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-30",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    minBreakMinutes: 15,
  };

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 2);
  assert.strictEqual(result.blocks[0].startTime, "15:00");
  assert.strictEqual(result.blocks[0].endTime, "15:45");

  assert.strictEqual(result.blocks[1].startTime, "16:00"); // 15:45 + 15m break
  assert.strictEqual(result.blocks[1].endTime, "16:45");
});

test("Scenario 3: School Timetable Avoidance (No study block overlaps school hours)", () => {
  const tasks = [
    {
      id: "t-1",
      title: "Tugas Pagi",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-28",
      deadlineMode: "custom",
      estimatedMinutes: 60,
      status: "PENDING",
    },
  ];

  const busyBlocks = [
    {
      id: "school-day",
      source: "timetable",
      title: "Sekolah",
      date: "2026-10-28",
      startTime: "07:00",
      endTime: "14:00",
    },
    {
      id: "evening-bimbel",
      source: "custom",
      title: "Bimbel",
      date: "2026-10-28",
      startTime: "15:00",
      endTime: "16:30",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks,
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 2); // 60 min task -> [45, 15] chunks
  // Both blocks must start AFTER 16:30
  assert.ok(result.blocks[0].startTime >= "16:30", "Block 1 must not overlap bimbel");
  assert.ok(result.blocks[1].startTime >= "16:30", "Block 2 must not overlap bimbel");
});

test("Scenario 4: Deadline Respect (Task due on Day 2 never scheduled on Day 3)", () => {
  const tasks = [
    {
      id: "t-urgent",
      title: "Tugas Deadline Besok",
      subjectId: "sub-bio",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-29",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  // Block the entire study window on Day 1 (2026-10-28)
  const busyBlocks = [
    {
      id: "b-all-day1",
      source: "custom",
      title: "Family Event",
      date: "2026-10-28",
      startTime: "15:00",
      endTime: "21:00",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks,
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 1);
  assert.strictEqual(result.blocks[0].date, "2026-10-29", "Must be scheduled on deadline date");
  assert.ok(result.blocks[0].date <= tasks[0].deadlineDate);
});

test("Scenario 5: Urgency Sorting (Task A due tomorrow scheduled before Task B due next week)", () => {
  const tasks = [
    {
      id: "t-later",
      title: "Tugas Pekan Depan",
      subjectId: "sub-art",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-11-04",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
    {
      id: "t-urgent",
      title: "Tugas Besok",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-29",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 2);
  assert.strictEqual(result.blocks[0].taskId, "t-urgent", "Urgent task scheduled first");
  assert.strictEqual(result.blocks[0].startTime, "15:00");
  assert.strictEqual(result.blocks[1].taskId, "t-later");
  assert.strictEqual(result.blocks[1].startTime, "16:00");
});

test("Scenario 6: Task Splitting (90m task with 45m maxBlock -> produces two 45m blocks)", () => {
  const tasks = [
    {
      id: "t-big",
      title: "Proyek Besar",
      subjectId: "sub-chem",
      type: "Proyek",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-29",
      deadlineMode: "custom",
      estimatedMinutes: 90,
      status: "PENDING",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 2);
  assert.strictEqual(result.blocks[0].durationMinutes, 45);
  assert.strictEqual(result.blocks[1].durationMinutes, 45);
  assert.strictEqual(result.blocks[0].startTime, "15:00");
  assert.strictEqual(result.blocks[0].endTime, "15:45");
  assert.strictEqual(result.blocks[1].startTime, "16:00");
  assert.strictEqual(result.blocks[1].endTime, "16:45");
});

test("Scenario 7: Overloaded Schedule (10h homework with 2h free -> 2h scheduled, remainder unallocated)", () => {
  // Study window: 15:00 to 17:00 (120 min free)
  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    studyWindowStart: "15:00",
    studyWindowEnd: "17:00",
    maxBlockMinutes: 45,
    minBreakMinutes: 15,
  };

  const tasks = [
    {
      id: "t-huge",
      title: "Marathon Assignment",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-28", // Due today
      deadlineMode: "custom",
      estimatedMinutes: 600, // 10 hours
      status: "PENDING",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs,
    referenceDate: "2026-10-28",
  });

  // In 15:00-17:00 (120 mins):
  // Block 1: 15:00-15:45 (45 min)
  // Break: 15:45-16:00 (15 min)
  // Block 2: 16:00-16:45 (45 min)
  // Remainder in slot: 16:45-17:00 (15 min) -> fits 15 min chunk
  // Total allocated = 45 + 45 + 15 = 105 min.
  assert.ok(result.blocks.length >= 2);
  assert.strictEqual(result.unallocated.length, 1);
  assert.strictEqual(result.unallocated[0].taskId, "t-huge");
  assert.strictEqual(result.unallocated[0].reason, "SCHEDULE_FULL");
  assert.strictEqual(result.unallocated[0].neededMinutes, 600);
  assert.ok(result.unallocated[0].allocatedMinutes > 0);
  assert.ok(result.unallocated[0].allocatedMinutes < 600);
});

// ─── 6. Edge Cases ───
console.log("\n[6] Edge Cases");

test("ignores already COMPLETED tasks", () => {
  const tasks = [
    {
      id: "t-done",
      title: "Sudah Selesai",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-29",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "COMPLETED",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 0);
  assert.strictEqual(result.unallocated.length, 0);
  assert.strictEqual(result.stats.totalTasks, 0);
});

test("task with givenDate in future is not scheduled before givenDate", () => {
  const tasks = [
    {
      id: "t-future",
      title: "Tugas Diberikan Lusa",
      subjectId: "sub-history",
      type: "PR",
      givenDate: "2026-10-30", // given on day 3
      deadlineDate: "2026-10-31",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 1);
  assert.strictEqual(result.blocks[0].date, "2026-10-30", "Cannot be scheduled on 28 or 29");
});

test("task with deadline in past is marked ALREADY_PAST_DEADLINE", () => {
  const tasks = [
    {
      id: "t-past",
      title: "Tugas Kemarin",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-25",
      deadlineDate: "2026-10-27", // Yesterday relative to 2026-10-28
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 0);
  assert.strictEqual(result.unallocated.length, 1);
  assert.strictEqual(result.unallocated[0].reason, "ALREADY_PAST_DEADLINE");
  assert.strictEqual(result.unallocated[0].allocatedMinutes, 0);
});

test("task due today with zero free time is marked DEADLINE_TOO_SOON", () => {
  const tasks = [
    {
      id: "t-today-full",
      title: "Tugas Hari Ini Tapi Penuh",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-28",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  // Block the entire study window today
  const busyBlocks = [
    {
      id: "b-full",
      source: "custom",
      title: "Penuh",
      date: "2026-10-28",
      startTime: "15:00",
      endTime: "21:00",
    },
  ];

  const result = buildSchedule({
    tasks,
    busyBlocks,
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 0);
  assert.strictEqual(result.unallocated.length, 1);
  assert.strictEqual(result.unallocated[0].reason, "DEADLINE_TOO_SOON");
});

test("all days marked as daysOff reports all tasks as unallocated cleanly without crash", () => {
  const tasks = [
    {
      id: "t-holiday",
      title: "Tugas",
      subjectId: "sub-math",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-30",
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    daysOff: ["2026-10-28", "2026-10-29", "2026-10-30"],
  };

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks.length, 0);
  assert.strictEqual(result.unallocated.length, 1);
  assert.strictEqual(result.stats.unallocatedCount, 1);
});

test("hardFirst priority weight schedules larger task first when deadlines equal", () => {
  const tasks = [
    {
      id: "t-small",
      title: "Tugas Pendek",
      subjectId: "sub-a",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-29",
      deadlineMode: "custom",
      estimatedMinutes: 30,
      status: "PENDING",
    },
    {
      id: "t-large",
      title: "Tugas Berat",
      subjectId: "sub-b",
      type: "PR",
      givenDate: "2026-10-28",
      deadlineDate: "2026-10-29",
      deadlineMode: "custom",
      estimatedMinutes: 90,
      status: "PENDING",
    },
  ];

  const prefs = {
    ...DEFAULT_SCHEDULE_PREFS,
    priorityWeights: {
      urgentFirst: true,
      hardFirst: true,
    },
  };

  const result = buildSchedule({
    tasks,
    busyBlocks: [],
    prefs,
    referenceDate: "2026-10-28",
  });

  assert.strictEqual(result.blocks[0].taskId, "t-large", "Larger task must be scheduled first");
});

function addDaysStr(baseStr, days) {
  const [y, m, d] = baseStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── 7. Invariants Fuzzing Suite (Randomized Property Tests) ───
console.log("\n[7] Invariants Property Fuzzing (10 Randomized Iterations)");

test("Engine invariants hold across randomized tasks and busy blocks", () => {
  const refDate = "2026-10-28";

  for (let iter = 1; iter <= 10; iter++) {
    // Generate 15 randomized tasks
    const testTasks = [];
    for (let i = 0; i < 15; i++) {
      const givenOffset = Math.floor(Math.random() * 3);
      const deadlineOffset = givenOffset + Math.floor(Math.random() * 5);
      const given = addDaysStr(refDate, givenOffset);
      const deadline = addDaysStr(refDate, deadlineOffset);
      const estimate = [15, 30, 45, 60, 90, 120][Math.floor(Math.random() * 6)];

      testTasks.push({
        id: `fuzz-task-${iter}-${i}`,
        title: `Fuzz Task ${i}`,
        subjectId: `sub-${i % 4}`,
        type: "PR",
        givenDate: given,
        deadlineDate: deadline,
        deadlineMode: "custom",
        estimatedMinutes: estimate,
        status: "PENDING",
      });
    }

    // Generate random busy blocks
    const testBusy = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = addDaysStr(refDate, day);
      if (Math.random() > 0.4) {
        testBusy.push({
          id: `fuzz-busy-${iter}-${day}`,
          source: "custom",
          title: "Random Busy",
          date: dateStr,
          startTime: "16:30",
          endTime: "17:30",
        });
      }
    }

    const minBreak = 15;
    const prefs = {
      ...DEFAULT_SCHEDULE_PREFS,
      minBreakMinutes: minBreak,
      maxBlockMinutes: 45,
    };

    const schedule = buildSchedule({
      tasks: testTasks,
      busyBlocks: testBusy,
      prefs,
      referenceDate: refDate,
      daysAhead: 7,
    });

    // Invariant A: block.startTime < block.endTime for all blocks
    for (const b of schedule.blocks) {
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);
      assert.ok(
        start < end,
        `Invariant A Violated: block ${b.id} startTime ${b.startTime} not < endTime ${b.endTime}`
      );
      assert.strictEqual(
        b.durationMinutes,
        end - start,
        `Invariant A Violated: block ${b.id} duration does not match start/end delta`
      );
    }

    // Invariant B: No two study blocks on the same day overlap in time
    const blocksByDay = new Map();
    for (const b of schedule.blocks) {
      const arr = blocksByDay.get(b.date) || [];
      arr.push(b);
      blocksByDay.set(b.date, arr);
    }

    for (const [date, dayBlocks] of blocksByDay.entries()) {
      for (let i = 0; i < dayBlocks.length; i++) {
        for (let j = i + 1; j < dayBlocks.length; j++) {
          const b1Start = timeToMinutes(dayBlocks[i].startTime);
          const b1End = timeToMinutes(dayBlocks[i].endTime);
          const b2Start = timeToMinutes(dayBlocks[j].startTime);
          const b2End = timeToMinutes(dayBlocks[j].endTime);

          const overlap = b1Start < b2End && b2Start < b1End;
          assert.ok(
            !overlap,
            `Invariant B Violated: blocks ${dayBlocks[i].id} and ${dayBlocks[j].id} overlap on ${date}`
          );
        }
      }
    }

    // Invariant C: No block overlaps any busy block on that date
    for (const b of schedule.blocks) {
      const dayBusy = testBusy.filter((bb) => bb.date === b.date);
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);

      for (const busy of dayBusy) {
        const busyStart = timeToMinutes(busy.startTime);
        const busyEnd = timeToMinutes(busy.endTime);
        const overlap = bStart < busyEnd && busyStart < bEnd;
        assert.ok(
          !overlap,
          `Invariant C Violated: block ${b.id} overlaps busy block ${busy.id} on ${b.date}`
        );
      }
    }

    // Invariant D: For every block, block.date <= task.deadlineDate and >= task.givenDate
    const taskMap = new Map(testTasks.map((t) => [t.id, t]));
    for (const b of schedule.blocks) {
      const task = taskMap.get(b.taskId);
      assert.ok(task, `Task not found for block ${b.id}`);
      assert.ok(
        b.date <= task.deadlineDate,
        `Invariant D Violated: block ${b.id} on ${b.date} exceeds deadline ${task.deadlineDate}`
      );
      assert.ok(
        b.date >= task.givenDate,
        `Invariant D Violated: block ${b.id} on ${b.date} is before givenDate ${task.givenDate}`
      );
    }
  }
});

// ─── 8. Performance Benchmark ───
console.log("\n[8] Performance Benchmark (< 50ms requirement)");

test("Completes 50 tasks across 14 days in < 50ms", () => {
  const refDate = "2026-10-28";
  const benchmarkTasks = [];

  for (let i = 0; i < 50; i++) {
    const givenDayOffset = i % 5;
    const deadlineDayOffset = givenDayOffset + 3 + (i % 8);
    const givenDay = addDaysStr(refDate, givenDayOffset);
    const deadlineDay = addDaysStr(refDate, deadlineDayOffset);

    benchmarkTasks.push({
      id: `bench-task-${i}`,
      title: `Benchmark Task ${i}`,
      subjectId: `sub-${i % 8}`,
      type: i % 2 === 0 ? "PR" : "Tugas",
      givenDate: givenDay,
      deadlineDate: deadlineDay,
      deadlineMode: "custom",
      estimatedMinutes: 30 + (i % 4) * 15,
      status: "PENDING",
    });
  }

  const benchmarkBusy = [];
  for (let d = 0; d < 14; d++) {
    const dayStr = addDaysStr(refDate, d);
    benchmarkBusy.push({
      id: `bench-school-${d}`,
      source: "timetable",
      title: "Sekolah",
      date: dayStr,
      startTime: "07:00",
      endTime: "14:00",
    });
    if (d % 3 === 0) {
      benchmarkBusy.push({
        id: `bench-extra-${d}`,
        source: "custom",
        title: "Bimbel / Ekstra",
        date: dayStr,
        startTime: "16:00",
        endTime: "17:00",
      });
    }
  }

  const startTime = performance.now();
  const scheduleResult = buildSchedule({
    tasks: benchmarkTasks,
    busyBlocks: benchmarkBusy,
    prefs: DEFAULT_SCHEDULE_PREFS,
    referenceDate: refDate,
    daysAhead: 14,
  });
  const durationMs = performance.now() - startTime;

  console.log(`    -> Execution time: ${durationMs.toFixed(2)}ms`);
  console.log(`    -> Blocks scheduled: ${scheduleResult.blocks.length}`);
  console.log(`    -> Unallocated count: ${scheduleResult.unallocated.length}`);
  console.log(`    -> Fully scheduled tasks: ${scheduleResult.stats.fullyScheduledCount} / ${scheduleResult.stats.totalTasks}`);

  assert.ok(
    durationMs < 50,
    `Benchmark failed: execution took ${durationMs.toFixed(2)}ms (must be < 50ms)`
  );
  assert.ok(scheduleResult.blocks.length > 0, "Schedule must have allocated blocks");
});

// ─── Summary ───
console.log("\n==================================================");
console.log(`SUMMARY: ${passedCount} passed, ${failedCount} failed`);
console.log("==================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
