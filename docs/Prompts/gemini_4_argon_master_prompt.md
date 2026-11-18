# Gemini 4 Argon Master Prompt: Student Task Schedule Maker (UI-First)

> **Prompt Target**: Google Gemini 4 Argon (`gemini-4-argon`) / Google Antigravity / Google AI Studio  
> **Target Capabilities**: 1,048,576 Context Window, High Reasoning Budget, Long Autonomous Decodes  
> **Architecture Approach**: **UI-First** (Screens, Design System & Interactive Mock State first, then Pure Scheduler Engine & Local Storage)  
> **Tech Stack**: React Native (Expo SDK 52+, TypeScript, SQLite `expo-sqlite`, React Native Animated / Reanimated, Lucide Icons)

---

```markdown
# MISSION BRIEF: BUILD "STUDYAIR" — THE ZERO-FRICTION TASK SCHEDULE MAKER FOR STUDENTS

You are an elite Mobile Systems Architect, UI/UX Designer, and Principal React Native Engineer. You are tasked with creating **StudyAir**, a lightning-fast, tactile, local-first mobile study companion for students.

---

## 1. PRODUCT THESIS & CORE VALUE PROPOSITION

Most student planners fail because timetables are treated as the main feature, or task lists are passive checklists with no concrete time allocation. 
**StudyAir inverts this model**:
1. **The school timetable is an INPUT (busy time)**, not the destination.
2. **StudyAir is a deterministic Task Schedule Maker**: Students enter tasks with an estimated study duration and deadline. The app algorithmically builds a non-overlapping plan of focused study blocks in the free gaps between school classes.
3. **The 3-Second Rule**: When a student opens the app, they must know **what to study right now** within 3 seconds.
4. **The 10-Second Task Capture**: Adding a task (with duration estimate and deadline) must take under 10 seconds.
5. **AI Suggests, Code Decides**: AI is used strictly for smart parsing (reading WhatsApp task announcements or homework photos); all scheduling, calendar dates, and timetable calculations are 100% deterministic code.

### The Core Loop:
```
Add Task (<10s with duration estimate)
   → Tap "Buat Jadwal"
   → Deterministic Scheduler builds blocks in free gaps around classes
   → Interactive Diff Preview & 1-Tap Apply
   → Follow "Rencana Hari Ini" (Hero NEXT Block Card)
   → 1-Tap Launch 25m/45m Pomodoro Focus Timer
   → Mark Complete (or Missed blocks get auto-rescheduled)
```

---

## 2. DEVELOPMENT METHODOLOGY: STRICTLY UI-FIRST

You must construct the entire application in **two explicit phases**:

### PHASE 1: UI-FIRST & TACTILE INTERACTION FOUNDATION
Build the complete visual application first. Do NOT start with databases or backend boilerplate. Create:
1. **Design Token System (`theme.ts`)**: 7 calibrated themes (Navy Slate, Emerald, Amethyst, Sunset, Sakura, AMOLED Pitch Black, Daylight Paper). Tactile Duolingo-inspired 3D touch feedback (subtle bevel borders, 2dp spring press) combined with O3 Space calm minimalism.
2. **Reusable UI Component Library**: `ScreenHeader`, `Card`, `ListRow`, `StatusPill`, `Chip`, `BottomSheet`, `PrimaryButton`, `SecondaryButton`, `CircularCheckbox`.
3. **Full Navigation Shell (`App.tsx`)**: Symmetrical bottom navigation:
   - Tab 1: **Rencana** (Home — 3-Second Rule Hero NEXT block card, today's schedule strip, study blocks, collapsed Besok, scheduler banner).
   - Tab 2: **Tugas** (4 partitioned groups: *Terjadwal*, *Belum Dijadwalkan*, *Tidak Muat*, *Selesai* with live count pills and 1-tap focus triggers).
   - Center FAB: **(+) Quick Action Sheet** (Manual Task, AI Photo Scan, AI Text Paste).
   - Tab 3: **Kalender** (Chronological Agenda view: solid outlines for school classes, dashed outlines for study blocks).
   - Screen 4: **Fokus** (Zen Pomodoro ambient timer with task link, target end-time synchronization, and comprehension confidence rating).
4. **Interactive Sheets & Modals**:
   - `AddTaskSheet`: 1-tap duration presets (`15m`, `30m`, `45m`, `60m`, `90m`), smart next-class deadline chips, subject picker.
   - `CreateScheduleSheet`: Study window slider (`15:00 - 21:00`), max block duration, live diff preview (added blocks vs unallocated tasks), and 1-tap undo.
   - `TaskDetailSheet`: Notes, duration quick-adjust, delete, and focus launcher.
5. **Rich Mock State**: Populate with realistic student schedule, classes, homework tasks, and study blocks so the app is 100% interactable immediately.

### PHASE 2: PURE ENGINES, DATA LAYER & LOCAL PERSISTENCE
Once the UI is fully functional and interactive:
1. **Deterministic Scheduling Engine (`schedulerEngine.ts`)**: Pure mathematical function placing study blocks into free slots around classes and breaks without overlapping.
2. **Local SQLite Persistence (`storage.ts` & `store.tsx`)**: Resilient `INSERT OR REPLACE INTO` schema, sequential coalesced write queue, and reactive React Context store.
3. **Focus Timer Background Synchronization**: Timestamp-based countdown (`targetEndTime`) resilient to phone lock and app backgrounding.
4. **Indonesian Localization Dictionary (`i18n.ts`)**: Standardized Indonesian copy and date formatting (no raw ISO strings).

---

## 3. DATA ARCHITECTURE & TYPE DEFINITIONS

Use these exact TypeScript interfaces:

```typescript
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskCategory = 'PR' | 'KUIS' | 'PROYEK' | 'ULANGAN' | 'LAINNYA';

export interface Task {
  id: string;
  title: string;
  subjectId: string;
  category: TaskCategory;
  givenDate: string;        // YYYY-MM-DD
  deadlineDate: string;     // YYYY-MM-DD
  estimatedMinutes: number; // Default: 30, Range: 5 to 360
  notes?: string;
  status: TaskStatus;
  completedAt?: string;     // ISO timestamp
  createdAt: string;
}

export type StudyBlockStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'SKIPPED';

export interface StudyBlock {
  id: string;
  taskId: string;
  subjectId: string;
  date: string;             // YYYY-MM-DD
  startTime: string;        // HH:mm (e.g. "16:00")
  endTime: string;          // HH:mm (e.g. "16:45")
  durationMinutes: number;
  status: StudyBlockStatus;
  rescheduledFrom?: string; // Previous StudyBlock ID if moved
}

export interface BusyBlock {
  id: string;
  date: string;             // YYYY-MM-DD
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
  title: string;
  source: 'timetable' | 'custom' | 'break';
}

export interface SchedulePrefs {
  studyWindowStart: string; // Default: "15:00"
  studyWindowEnd: string;   // Default: "21:00"
  maxBlockMinutes: number;  // Default: 45
  minBreakMinutes: number;  // Default: 15
  daysOff: string[];        // e.g. ["Sunday", "Saturday"]
  priorityWeights: {
    deadlineUrgency: number;
    hardFirst: boolean;
  };
}

export interface UnallocatedTask {
  task: Task;
  reason: 'DEADLINE_TOO_SOON' | 'SCHEDULE_FULL' | 'ALREADY_PAST_DEADLINE';
  neededMinutes: number;
  allocatedMinutes: number;
}

export interface ScheduleResult {
  blocks: StudyBlock[];
  unallocated: UnallocatedTask[];
  stats: {
    totalTasks: number;
    fullyScheduled: number;
    partiallyScheduled: number;
    unallocatedCount: number;
    totalStudyMinutes: number;
    totalFreeMinutes: number;
  };
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;            // Hex color code (used as 4dp stripe/dot)
  teacherName?: string;
}

export interface TimetableEntry {
  id: string;
  dayOfWeek: number;        // 1 = Monday ... 7 = Sunday
  periodNumber: number;
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
  subjectId: string;
  room?: string;
  kind: 'class' | 'break' | 'event';
}
```

---

## 4. DETERMINISTIC SCHEDULING ALGORITHM SPECIFICATION

Implement `buildSchedule(options)` in `src/engine/schedulerEngine.ts`:

### Mathematical Guarantees & Invariants:
- **Invariant A (Slot Integrity)**: For every `block`, `startTime < endTime` and `durationMinutes == endTime - startTime`.
- **Invariant B (No Study Overlaps)**: No two study blocks on the same date overlap in time.
- **Invariant C (No School/Busy Overlaps)**: No study block overlaps with any school class, break, or custom busy block.
- **Invariant D (Deadline Respect)**: For every scheduled block, `task.givenDate <= block.date <= task.deadlineDate`.
- **Invariant E (Break Buffer)**: A minimum buffer of `prefs.minBreakMinutes` is maintained between consecutive study blocks.

### The Pure Algorithm:
1. **Free Slot Computation (`findFreeSlots`)**:
   - For each date in the planning horizon (`referenceDate` to furthest `deadlineDate`, min 14 days):
   - Clamp study window to `[prefs.studyWindowStart, prefs.studyWindowEnd]`.
   - If the date is in `prefs.daysOff`, yield 0 free slots.
   - Filter `busyBlocks` for that date, clamp them to the study window, and merge overlapping intervals in $O(B \log B)$.
   - Invert the merged busy intervals against `[studyWindowStart, studyWindowEnd]` to produce non-overlapping `TimeSlot[]` free intervals.
2. **Task Prioritization & Chunking**:
   - Filter active pending tasks (`status !== 'COMPLETED'`).
   - Sort active tasks:
     - Primary: `deadlineDate` ASC (earliest deadline first).
     - Secondary: if `prefs.priorityWeights.hardFirst` is true, `estimatedMinutes` DESC.
     - Tertiary: `givenDate` ASC.
   - Divide each task's `estimatedMinutes` into discrete study chunks bounded by `prefs.maxBlockMinutes` (e.g. 90m $\rightarrow$ [45m, 45m], 70m $\rightarrow$ [45m, 25m] with 15m minimum remainder).
3. **Greedy Allocation**:
   - For each chunk of a task, iterate across eligible calendar dates `[max(task.givenDate, referenceDate), task.deadlineDate]`.
   - Perform a First-Fit placement in available `TimeSlot`s.
   - When placing a block of length $L$, deduct $L + \text{minBreakMinutes}$ from that slot.
   - If a task cannot fit all chunks before its deadline, record remaining minutes in `unallocated` with reason `'SCHEDULE_FULL'` or `'DEADLINE_TOO_SOON'`.
4. **Performance Benchmark**: Must schedule 50 tasks across 14 days in $< 50\text{ms}$ on mobile CPU.

---

## 5. UI/UX DESIGN SYSTEM & SCREENS BREAKDOWN

### Design Principles:
- **Calm, Focused, Tactile**: Dark surfaces (`#0C1322` background, `#18223B` cards), crisp 1px borders with subtle 3D bottom bevels (`borderBottomWidth: 3`), and punchy semantic accents (Electric Blue `#1CB0F6`, Emerald `#58CC02`, Amber `#FF9600`, Purple `#CE82FF`).
- **One Primary Action Per Screen**: Max 2 header action icons. Max 3 vertical sections above the fold.
- **Strict Spacings**: 8dp, 16dp, 24dp. Screen padding strictly 16dp.
- **Subject Color Rule**: 4dp vertical stripe or circular indicator dot. Never flood the whole background with subject colors.

### Screen 1: Rencana (Home / Schedule Command Center)
1. **Header**: Streak Flame capsule (`🔥 5 Hari`), Greeting, Settings gear icon.
2. **Hero NEXT Block Card (3-Second Rule)**:
   - If a study block is scheduled today: Large hero card showing Subject dot, Task Title, Time (`16:00 - 16:45`), and high-contrast tactile button: **`[ ▶ Mulai Fokus (45m) ]`**.
   - If no block is active: Ambient card with today's total study minutes and next upcoming task.
3. **Jadwal Kelas Hari Ini Strip**: Horizontal chip scroll showing today's school periods (`07:30 Mat`, `09:00 Fisika`, `10:15 Istirahat`).
4. **Rencana Belajar Hari Ini**: List of today's scheduled blocks with checkable checkboxes and 1-tap focus launcher.
5. **Smart Scheduler Banner**: If unscheduled tasks exist, display an interactive purple banner: **`[ ✨ Buat Jadwal Otomatis (N Tugas) ]`** opening the `CreateScheduleSheet`.
6. **Collapsed "Besok"**: 1-line expandable summary of tomorrow's classes and homework due.

### Screen 2: Tugas (Task Hub)
1. **Segmented Filter Pills**: `[ Semua (12) ]` `[ Terjadwal (8) ]` `[ Belum (3) ]` `[ Selesai (1) ]`.
2. **Grouped Task Cards**:
   - Group 1: **Belum Dijadwalkan (Unscheduled)** with amber alert dot and direct "Jadwalkan" action.
   - Group 2: **Tidak Muat (Overloaded)** with red badge showing tasks needing earlier start or extended window.
   - Group 3: **Terjadwal (Scheduled)** with subject dot, deadline pill, scheduled time badge, and **`[ ▶ Fokus ]`** launcher.
   - Group 4: **Selesai (Completed)** with strikethrough and completion date.
3. **Add Task Button**: Persistent tactile bottom button or elevated FAB.

### Screen 3: Kalender (Daily Agenda)
1. **Segmented Selector**: `[ Agenda (Default) ]` `[ Mingguan ]`.
2. **Chronological Day Groups**: `Hari Ini`, `Besok`, and upcoming dates.
3. **Distinct Block Styling**:
   - School classes render as **solid** cards with subject accent stripe.
   - Study blocks render as **dashed** border cards with purple study icon and **`[ ▶ Fokus ]`** launcher.
   - Breaks (Istirahat/Ishoma) render as subtle muted bands with coffee icon.

### Screen 4: Fokus (Pomodoro & Study Execution)
1. **Full-Screen Ambient Timer**: Large clean `25:00` or `45:00` display.
2. **Linked Task Card**: Subject dot, task name, and target end time (`Selesai pukul 16:45`).
3. **Controls**: Tactile 3D Play/Pause, +5m extension, and Finish Early button.
4. **Post-Session Confidence Modal**: Asks student: `Sangat Paham 😃`, `Cukup Mengerti 🙂`, `Masih Sulit 😕`, directly logging streak points and marking the StudyBlock `COMPLETED`.
5. **Background Resilience**: Calculate remaining time via `targetEndTime - Date.now()` inside `AppState` listener so the timer never drifts or freezes when screen turns off.

### Modals & Sheets:
1. **`AddTaskSheet`**:
   - Input: Title, Subject picker chips.
   - Estimated Duration: 1-tap chips (`15m`, `30m`, `45m`, `60m`, `90m`).
   - Deadline Picker: 1-tap presets (`Hari Ini`, `Besok`, `3 Hari`, `Pertemuan Mapel Berikutnya`).
   - Time to complete: Under 10 seconds.
2. **`CreateScheduleSheet`**:
   - Configure study window (`15:00 - 21:00`), max block duration.
   - Preview proposed study blocks vs unallocated tasks.
   - 1-tap **`[ Terapkan Jadwal ]`** with undo toast.

---

## 6. PRODUCTION RESILIENCY & LESSONS LEARNED

Adhere to these strict architectural safeguards:
1. **SQLite Error 19 (`SQLITE_CONSTRAINT`) Prevention**:
   - Always use `INSERT OR REPLACE INTO` for all tables.
   - Provide safe fallback values for all schema columns (e.g. empty strings for breaks without subject IDs).
   - Generate unique compound IDs (`${date}-${subjectId}-${startTime}`).
2. **Concurrent Write Collisions**:
   - Implement a sequential coalescing queue pattern in `storage.ts` to fold rapid consecutive saves into serialized transactions.
   - Add a 150ms debounce before committing global state to disk.
3. **Infinite Re-render Prevention**:
   - Wrap all parent-child progress and state update callbacks in `useCallback`.
   - Guard external notifications and progress changes with `useRef` change detection.
4. **Cross-Platform Theme Evaluation**:
   - Wrap theme colors in a dynamic getter or Proxy so switching between Dark/Light/AMOLED cascades instantaneously with zero layout flash.
5. **Pure Code Dates**:
   - Do not trust LLMs to calculate dates or calendar midnights. All deadlines and countdowns must use deterministic math (`parseLocalMidnight()`).

---

## 7. EXECUTION PROTOCOL FOR GEMINI 4 ARGON

Begin generating the codebase right now in this exact order:

```
[STEP 1] Design Tokens & Theme Engine (src/theme.ts)
[STEP 2] Common UI Component Library (src/components/common/*)
[STEP 3] Navigation Shell & Mock State (App.tsx, src/mockData.ts)
[STEP 4] Screen 1: Rencana / HomeScreen (src/screens/HomeScreen.tsx)
[STEP 5] Screen 2: Tugas / TasksScreen (src/screens/TasksScreen.tsx)
[STEP 6] Screen 3: Kalender / CalendarScreen (src/screens/CalendarScreen.tsx)
[STEP 7] Screen 4: Fokus / FocusScreen (src/screens/FocusScreen.tsx)
[STEP 8] Sheets: AddTaskSheet & CreateScheduleSheet (src/components/sheets/*)
[STEP 9] Pure Deterministic Scheduler Engine (src/engine/schedulerEngine.ts)
[STEP 10] SQLite Storage Layer & Store Context (src/lib/storage.ts, src/store.tsx)
[STEP 11] Localization Dictionary & Date Utilities (src/lib/i18n.ts, src/lib/dateUtils.ts)
```

Ensure every component is clean, TypeScript strict, tactile, and immediately interactive. Now, begin with **STEP 1**!
```
