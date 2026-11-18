# P3: Scheduling Engine — Pure Function `buildSchedule()` with Unit and Property Tests

**Status**: `todo`
**Branch**: `task/P3`
**Depends on**: P2
**Estimated effort**: ~2h

---

## Goal
Implement the core deterministic scheduling engine in `mobile/src/engine/schedulerEngine.ts` as a pure, side-effect-free function `buildSchedule()` that turns pending tasks and busy time into concrete study blocks, backed by unit tests and invariant property tests.

## Why
Product Brief v2's central thesis is: "AI suggests, code decides — the scheduler is deterministic and fully tested."
When a student taps "Buat jadwal", this engine computes the study plan in milliseconds without network calls or LLM hallucinations. It guarantees:
1. No two study blocks overlap.
2. No study block overlaps school classes, breaks, or designated busy blocks.
3. No study block is scheduled after the task's deadline date.
4. Tasks with earlier deadlines are scheduled first.
5. Large tasks are split into manageable chunks (e.g. 45 min) separated by breaks.
6. Tasks that cannot fit before their deadline are returned in an `unallocated` list with clear explanations.

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/engine/schedulerEngine.ts` | **NEW** — Pure functions: `buildSchedule()`, `extractBusyBlocksFromTimetable()`, `findFreeSlots()`, `chunkTask()`. |
| `mobile/src/types.ts` | Import `Task`, `StudyBlock`, `BusyBlock`, `SchedulePrefs`, `TimetableEntry`, `PeriodTime`, `DayOff`, `Override`. Export `ScheduleResult`, `UnallocatedTask`. |
| `mobile/test_scheduler_engine_suite.mjs` | **NEW** — 20+ unit tests and randomized property test asserting scheduling invariants. |
| `docs/Architecture.md` | Record engine inputs/outputs, slot-finding algorithm, and time complexity in Section 6. |

---

## Steps

### Step 1: Define Engine Types in `mobile/src/types.ts`
Add the engine result types:
```typescript
export interface UnallocatedTask {
  taskId: string;
  taskTitle: string;
  subjectId: string;
  deadlineDate: string;
  neededMinutes: number;
  allocatedMinutes: number;
  reason: "DEADLINE_TOO_SOON" | "SCHEDULE_FULL" | "ALREADY_PAST_DEADLINE";
}

export interface ScheduleResult {
  blocks: StudyBlock[];
  unallocated: UnallocatedTask[];
  stats: {
    totalTasks: number;
    fullyScheduledCount: number;
    partiallyScheduledCount: number;
    unallocatedCount: number;
    totalStudyMinutes: number;
    totalFreeMinutes: number;
  };
}
```

---

### Step 2: Implement `mobile/src/engine/schedulerEngine.ts`

The module must be completely pure (no imports of React, React Native, or SQLite; only date/time utilities).

#### 1. Time & Slot Helpers
- `timeToMinutes(timeStr: string): number` ("15:30" -> 930)
- `minutesToTime(mins: number): string` (930 -> "15:30")
- `dateRange(startDate: string, endDate: string): string[]` (returns array of YYYY-MM-DD strings)

#### 2. Timetable to BusyBlocks Extractor
```typescript
export function extractBusyBlocksFromTimetable(options: {
  timetableEntries: TimetableEntry[];
  periodTimes: PeriodTime[];
  daysOff: DayOff[];
  overrides: Override[];
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}): BusyBlock[]
```
- For each day in the date range:
  - If date is in `daysOff`, mark whole school day or reason.
  - Find timetable entries for that day of week (accounting for A/B week pattern if active).
  - Map periods to start/end times from `periodTimes`.
  - Apply overrides (cancelled classes are skipped, added/swapped classes are included).
  - Return `BusyBlock[]` with source `'timetable'`.

#### 3. Free Slot Finder
```typescript
export interface TimeSlot {
  date: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export function findFreeSlots(
  date: string,
  busyBlocksForDay: BusyBlock[],
  prefs: SchedulePrefs
): TimeSlot[]
```
- Restrict to the study window: `[timeToMinutes(prefs.studyWindowStart), timeToMinutes(prefs.studyWindowEnd)]`.
- Subtract all `busyBlocks` that fall on `date`.
- Merge contiguous busy blocks and return the sorted available intervals.

#### 4. Task Prioritization & Chunking
- Filter tasks: ignore already `COMPLETED` tasks.
- Sort active tasks:
  1. Deadline date ascending (urgent first).
  2. If tied and `prefs.priorityWeights.hardFirst`, prioritize higher cognitive load or longer estimates.
  3. Given date ascending.
- Chunking:
  - If a task's remaining minutes > `prefs.maxBlockMinutes` (e.g. 90m with max 45m), divide into blocks of `[45, 45]`.
  - Minimum block size: 15 minutes (or remainder).

#### 5. Main `buildSchedule()` Function
```typescript
export function buildSchedule(options: {
  tasks: Task[];
  busyBlocks: BusyBlock[];
  prefs: SchedulePrefs;
  referenceDate: string; // YYYY-MM-DD (usually today)
  daysAhead?: number;    // default 14 days
}): ScheduleResult
```
Algorithm:
1. Scan days from `referenceDate` up to `daysAhead` (or furthest deadline).
2. For each day, compute `freeSlots`.
3. For each prioritized task chunk:
   - Search for the earliest available free slot on or after `task.givenDate` (or `referenceDate`) and on or before `task.deadlineDate`.
   - Ensure the slot duration is sufficient for the chunk.
   - Insert the `StudyBlock` into the schedule.
   - Deduct the used time from the free slot plus `prefs.minBreakMinutes` buffer before the next block.
4. If a chunk cannot be placed before `task.deadlineDate`:
   - Record in `unallocated` with details on missing minutes.
5. Compute and return `ScheduleResult`.

---

### Step 3: Implement Invariant Property Tests in `mobile/test_scheduler_engine_suite.mjs`

Write tests covering:
1. **Single Task Placement**: 45m task in 15:00–21:00 window -> placed at 15:00–15:45.
2. **Break Insertion**: Two 45m tasks with 15m minBreak -> Block 1: 15:00–15:45, Block 2: 16:00–16:45.
3. **School Timetable Avoidance**: BusyBlock 07:00–14:00 -> no blocks scheduled in that interval.
4. **Deadline Respect**: Task due on Day 2 -> never scheduled on Day 3.
5. **Urgency Sorting**: Task A due tomorrow vs Task B due next week -> Task A gets earlier slot.
6. **Task Splitting**: 90m task with 45m maxBlock -> produces two 45m blocks.
7. **Overloaded Schedule (Capacity limit)**: 10 hours of homework with only 2 hours free -> 2 hours scheduled, remainder returned in `unallocated`.
8. **Invariants (Randomized fuzz test)**:
   - Invariant A: `block.startTime < block.endTime` for every block.
   - Invariant B: No two blocks on the same day overlap in time.
   - Invariant C: No block overlaps any `busyBlock`.
   - Invariant D: For every block, `block.date <= task.deadlineDate`.

---

## Acceptance Criteria

- [ ] `mobile/src/engine/schedulerEngine.ts` is pure and exports `buildSchedule()`, `extractBusyBlocksFromTimetable()`, `findFreeSlots()`.
- [ ] No study block overlaps another study block.
- [ ] No study block overlaps a busy block.
- [ ] No study block is placed past its task's deadline date.
- [ ] Unallocated tasks are reported with `neededMinutes` and correct `reason`.
- [ ] Breaks between study blocks are respected according to `prefs.minBreakMinutes`.
- [ ] `node test_scheduler_engine_suite.mjs` passes 100% of unit & property tests.
- [ ] Engine completes 50 tasks across 14 days in < 50ms (benchmark included in test suite).
- [ ] Zero TypeScript errors with `npx tsc --noEmit`.

---

## Tests

```bash
cd mobile

# Compile the engine and dependencies
npx tsc src/types.ts src/engine/schedulerEngine.ts src/lib/dateUtils.ts --outDir dist-test --target es2022 --module commonjs --moduleResolution node --skipLibCheck --esModuleInterop

# Run the test suite
node test_scheduler_engine_suite.mjs
```

---

## Do NOT Touch
- Do not import React, React Native, or SQLite into `schedulerEngine.ts`.
- Do not modify existing `deadlineEngine.ts`, `daySchedule.ts`, or `examEngine.ts`.
- Do not write UI components in this packet (UI is built in P5, P6, P7).

---

## Edge Cases
- **Task given date in the future**: Must not schedule blocks before `task.givenDate`.
- **Task deadline is today**: Must attempt to schedule before end of today's study window; if not enough time remains, mark unallocated.
- **Study window crossing midnight** (e.g. 20:00–01:00): Clamp study window end to `23:59` to keep day boundaries clean.
- **Zero or negative estimate**: Clamp to minimum 15 minutes.
- **All days marked as daysOff**: Correctly reports all tasks as unallocated rather than crashing or infinite looping.

---

## Phone Checklist
- [ ] N/A — pure algorithm and unit test packet.

---

## Report Format
After completing the task, create `docs/tasks/P3.report.md` with:
1. Files created/changed
2. Acceptance criteria checklist
3. Test suite execution results (including benchmark execution time)
4. Key design choices made in slot allocation
5. Anything not completed and why

---

## Start Command
```
Read docs/Executor-Rules.md, then read docs/tasks/P3-scheduling-engine.md top to bottom before writing any code.
```
