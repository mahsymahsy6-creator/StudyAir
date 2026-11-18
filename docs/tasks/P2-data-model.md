# P2: Data Model — Task Estimates, StudyBlock, BusyBlock, SchedulePrefs, and Migrations

**Status**: `todo`
**Branch**: `task/P2`
**Depends on**: P0
**Estimated effort**: ~1.5h

---

## Goal
Extend the data layer for the v2 schedule maker: add `estimatedMinutes` to `Task`, define `StudyBlock`, `BusyBlock`, and `SchedulePrefs` interfaces, implement SQLite table definitions and migrations with fallback in `storage.ts` and `storage.web.ts`, and wire them into `store.tsx`.

## Why
Product Brief v2 pivots StudyAir into a task schedule maker. The scheduling engine (P3) and "Buat jadwal" UI (P5) require:
1. Every task to know how many minutes it takes (`estimatedMinutes`).
2. Generated study sessions to exist as discrete `StudyBlock` entities with start/end time and completion status.
3. Fixed student commitments (school timetable, extracurriculars) to be represented as `BusyBlock` intervals.
4. User study preferences (study window e.g. 15:00–21:00, max block duration, break length) to be persisted in `SchedulePrefs`.

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/types.ts` | Add `estimatedMinutes?: number` to `Task`. Define `StudyBlock`, `StudyBlockStatus`, `BusyBlock`, `BusyBlockSource`, `SchedulePrefs`, `DEFAULT_SCHEDULE_PREFS`. Add `studyBlocks` and `schedulePrefs` to `DatabaseState`. |
| `mobile/src/lib/storage.ts` | 1. Add `estimated_minutes INTEGER DEFAULT 30` migration to `tasks` table via `ensureColumnExists`.<br>2. Add `CREATE TABLE IF NOT EXISTS study_blocks (...)`.<br>3. Add `schedule_prefs` column to `app_settings` (or dedicated key).<br>4. Add CRUD / persistence helpers: `saveStudyBlocks()`, `getStudyBlocks()`, `saveSchedulePrefs()`, `getSchedulePrefs()`. |
| `mobile/src/lib/storage.web.ts` | Update Web/AsyncStorage mirror with the new fields and tables so web dev & tests don't break. |
| `mobile/src/store.tsx` | Add `studyBlocks: StudyBlock[]`, `schedulePrefs: SchedulePrefs` to `StoreState`. Add actions: `setStudyBlocks`, `addStudyBlock`, `updateStudyBlock`, `toggleBlockCompletion`, `updateSchedulePrefs`. Ensure `addTask` accepts `estimatedMinutes`. |
| `mobile/test_p2_data_model.mjs` | **NEW** — Unit and migration test suite verifying schema migrations, defaults, CRUD in store, and backwards compatibility. |

---

## Steps

### Step 1: Update `mobile/src/types.ts`

1. In `Task` interface:
```typescript
export interface Task {
  id: string;
  subjectId: string;
  title: string;
  notes?: string;
  type: TaskType;
  givenDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  deadlineMode: DeadlineMode;
  estimatedMinutes?: number; // v2: duration estimate in minutes (default 30)
  status: TaskStatus;
  completedAt?: string; // ISO
  createdAt?: string; // ISO
  photoUri?: string;
}
```

2. Add new v2 scheduling types:
```typescript
// ─── 4b. v2 Scheduling Models ───
export type StudyBlockStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "SKIPPED";

export interface StudyBlock {
  id: string;
  taskId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: StudyBlockStatus;
  completedAt?: string; // ISO timestamp
  createdAt?: string; // ISO timestamp
}

export type BusyBlockSource = "timetable" | "custom" | "calendar";

export interface BusyBlock {
  id: string;
  source: BusyBlockSource;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface SchedulePrefs {
  studyWindowStart: string; // "HH:mm", default "15:00"
  studyWindowEnd: string;   // "HH:mm", default "21:00"
  maxBlockMinutes: number;  // default 45
  minBreakMinutes: number;  // default 15
  daysOff: string[];        // days without study blocks (e.g. ["Sunday"] or "YYYY-MM-DD")
  priorityWeights: {
    urgentFirst: boolean;   // prioritize closer deadline
    hardFirst: boolean;     // prioritize high cognitive load / hard subjects
  };
}

export const DEFAULT_SCHEDULE_PREFS: SchedulePrefs = {
  studyWindowStart: "15:00",
  studyWindowEnd: "21:00",
  maxBlockMinutes: 45,
  minBreakMinutes: 15,
  daysOff: [],
  priorityWeights: {
    urgentFirst: true,
    hardFirst: false,
  },
};
```

3. Update `DatabaseState` interface in `types.ts` and `storage.ts` to include:
```typescript
studyBlocks?: StudyBlock[];
schedulePrefs?: SchedulePrefs;
```

---

### Step 2: Implement SQLite Migrations and Helpers in `mobile/src/lib/storage.ts`

1. In `initDatabase()`:
   - Call `await ensureColumnExists(db, "tasks", "estimated_minutes", "INTEGER DEFAULT 30");`
   - Create `study_blocks` table:
   ```sql
   CREATE TABLE IF NOT EXISTS study_blocks (
     id TEXT PRIMARY KEY,
     task_id TEXT NOT NULL,
     subject_id TEXT NOT NULL,
     date TEXT NOT NULL,
     start_time TEXT NOT NULL,
     end_time TEXT NOT NULL,
     duration_minutes INTEGER NOT NULL,
     status TEXT NOT NULL DEFAULT 'SCHEDULED',
     completed_at TEXT,
     created_at TEXT DEFAULT (datetime('now'))
   );
   ```
   - Ensure `schedule_prefs` column exists in `app_settings` (or stored as a JSON string column in `app_settings`).

2. Add persistence functions:
   - `saveStudyBlocks(blocks: StudyBlock[]): Promise<void>`
   - `getStudyBlocks(): Promise<StudyBlock[]>`
   - `saveSchedulePrefs(prefs: SchedulePrefs): Promise<void>`
   - `getSchedulePrefs(): Promise<SchedulePrefs>`
   - Ensure `loadAllData()` and `saveAllData()` include `studyBlocks` and `schedulePrefs`.

---

### Step 3: Update `mobile/src/lib/storage.web.ts`
Mirror all new interfaces and storage functions in `storage.web.ts` using `AsyncStorage` so browser preview and testing environments continue to run without crashing.

---

### Step 4: Wire into `mobile/src/store.tsx`

1. Add `studyBlocks: StudyBlock[]` (default `[]`) and `schedulePrefs: SchedulePrefs` (default `DEFAULT_SCHEDULE_PREFS`) to `StoreState`.
2. Update `addTask`:
   - Accept `estimatedMinutes?: number` with fallback to `30`.
3. Add store actions:
   - `setStudyBlocks: (blocks: StudyBlock[]) => void`
   - `addStudyBlock: (block: Omit<StudyBlock, "id" | "status" | "createdAt">) => StudyBlock`
   - `updateStudyBlock: (id: string, patch: Partial<StudyBlock>) => void`
   - `deleteStudyBlock: (id: string) => void`
   - `toggleBlockCompletion: (id: string) => void` (sets status to 'COMPLETED' with `completedAt`, or reverts to 'SCHEDULED')
   - `updateSchedulePrefs: (patch: Partial<SchedulePrefs>) => void`
4. In store initialization (`loadData`), load `studyBlocks` and `schedulePrefs` from storage.

---

### Step 5: Create Test Suite `mobile/test_p2_data_model.mjs`
Write a comprehensive test suite using Node.js `assert`:
1. **Migration test**: Insert a task without `estimated_minutes`, verify it reads back with default `30`.
2. **StudyBlock CRUD**: Create, read, update status, complete, delete.
3. **SchedulePrefs**: Read defaults, update partial prefs (e.g. change window to 16:00–22:00), verify persistence.
4. **Task backward compatibility**: Existing v1 mock data or tasks with no `estimatedMinutes` continue to function without throwing.

---

## Acceptance Criteria

- [ ] `Task` interface contains `estimatedMinutes?: number`.
- [ ] `StudyBlock`, `StudyBlockStatus`, `BusyBlock`, `SchedulePrefs`, `DEFAULT_SCHEDULE_PREFS` exported from `mobile/src/types.ts`.
- [ ] SQLite migration runs cleanly via `ensureColumnExists` for `tasks.estimated_minutes`.
- [ ] `study_blocks` table is created on database initialization.
- [ ] `storage.ts` and `storage.web.ts` both support reading/writing `studyBlocks` and `schedulePrefs`.
- [ ] `store.tsx` exposes `studyBlocks`, `schedulePrefs`, `setStudyBlocks`, `toggleBlockCompletion`, `updateSchedulePrefs`.
- [ ] `addTask({ ..., estimatedMinutes: 45 })` retains `estimatedMinutes`.
- [ ] `node test_p2_data_model.mjs` passes 100% of tests.
- [ ] TypeScript compilation (`npx tsc --noEmit`) passes with zero errors.

---

## Tests

| Case | Input | Expected Output |
| :--- | :--- | :--- |
| Default estimate on task | `addTask({ title: 'PR', subjectId: 's1', ... })` without estimate | `task.estimatedMinutes === 30` |
| Custom estimate on task | `addTask({ ..., estimatedMinutes: 60 })` | `task.estimatedMinutes === 60` |
| StudyBlock lifecycle | Add block -> toggle complete | Status transitions `SCHEDULED` -> `COMPLETED`, `completedAt` populated |
| SchedulePrefs defaults | Load without saved prefs | Returns `DEFAULT_SCHEDULE_PREFS` (15:00–21:00, 45m block, 15m break) |
| Prefs partial update | `updateSchedulePrefs({ maxBlockMinutes: 30 })` | `maxBlockMinutes === 30`, other fields preserved |

```bash
# Compile types and dependencies
cd mobile
npx tsc src/types.ts src/lib/storage.ts src/lib/storage.web.ts --outDir dist-test --target es2022 --module commonjs --moduleResolution node --skipLibCheck --esModuleInterop

# Run the test suite
node test_p2_data_model.mjs
```

---

## Do NOT Touch
- Do not modify existing UI screens (`CalendarScreen.tsx`, `HomeScreen.tsx`, `FocusScreen.tsx`, `DashboardScreen.tsx`).
- Do not remove legacy `StudyUnit` or `ScheduledBlock` models (internal focus engine depends on them until P10).
- Do not break existing mock data in `mockData.ts`.
- Do not change `Subject`, `TimetableEntry`, `DayOff`, `Override` structures.

---

## Edge Cases
- **Legacy tasks loaded from DB**: Must not produce `undefined` or `NaN` in math operations — default to `30` if missing.
- **Malformed prefs JSON**: If SQLite or AsyncStorage has corrupt `schedule_prefs`, fall back gracefully to `DEFAULT_SCHEDULE_PREFS`.
- **Negative or zero estimate**: `estimatedMinutes` must be clamped to `>= 5` and `<= 360` minutes in store actions.

---

## Phone Checklist
- [ ] N/A — pure data model and storage packet (no UI changes).

---

## Report Format
After completing the task, create `docs/tasks/P2.report.md` with:
1. Files changed (with line counts)
2. Acceptance criteria — pass/fail for each
3. Test output from `test_p2_data_model.mjs`
4. Verification of `npx tsc --noEmit`
5. Anything not completed and why

---

## Start Command
```
Read docs/Executor-Rules.md, then read docs/tasks/P2-data-model.md top to bottom before writing any code.
```
