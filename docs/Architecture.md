# StudyAir — Architecture Reference

> Auto-maintained by the planner. Builders: read, don't edit. Report discoveries in your task report.

Last updated: 2026-10-28

---

## 1. Project Layout

```
StudyFly/
├── docs/                         # Obsidian vault — plans, bugs, decisions, prompts, tasks
│   ├── Plan.md
│   ├── Bugs.md
│   ├── Decisions.md
│   ├── Architecture.md           # ← this file
│   ├── Testing.md
│   ├── Executor-Rules.md
│   ├── Prompts/                  # Historical prompt scripts
│   └── tasks/                    # Task packets T-001, T-002 …
├── mobile/
│   ├── App.tsx                   # Root — tab navigator, screen routing, onboarding gate
│   ├── src/
│   │   ├── theme.ts              # Design tokens, 7-theme engine, colors Proxy, applyTheme()
│   │   ├── types.ts              # All TypeScript interfaces (Subject, Task, TimetableEntry, etc.)
│   │   ├── store.tsx             # React Context + state management, all CRUD, AsyncStorage/SQLite bridge
│   │   ├── gemini.ts             # Gemini API client (Mode A: user key, Mode B: proxy)
│   │   ├── mockData.ts           # Minimal mock data
│   │   ├── screens/              # 10 screen components
│   │   ├── components/           # UI components organized by domain
│   │   ├── lib/                  # Pure logic modules (no React)
│   │   ├── engine/               # Study engine (cognitive load, deadlines, SM-2, streak calc)
│   │   ├── services/             # Side-effect services (AI, notifications, secure store, wizard store)
│   │   └── config/               # Feature flags, constants
│   ├── test_*.mjs                # Node.js test suites
│   ├── dist-test/                # Compiled test output
│   └── test_samples/             # AI test images/messages with ground-truth JSON
└── AGENTS.md                     # Workspace agent rules
```

## 2. Screens & Navigation

`App.tsx` uses a manual tab navigator (no React Navigation). State: `activeTab: TabScreen`.

| Tab # | Label | Screen | File |
| :--- | :--- | :--- | :--- |
| 1 | Tugas | HomeScreen | `screens/HomeScreen.tsx` |
| 2 | Jadwal | CalendarScreen | `screens/CalendarScreen.tsx` |
| 3 | (FAB) | QuickActionSheet | `components/QuickActionSheet.tsx` |
| 4 | Fokus | FocusScreen | `screens/FocusScreen.tsx` |
| 5 | Kemajuan | DashboardScreen | `screens/DashboardScreen.tsx` |

Non-tab screens navigated via `setActiveTab()`: Settings, Streak, Subjects (SyllabusScreen), TimetableWizard, AIScanner.

## 3. Key Source-of-Truth Functions

| Function | File | Purpose |
| :--- | :--- | :--- |
| `getDayItems()` | `lib/daySchedule.ts` | Returns ordered schedule for a day (classes, breaks, events). Used by HomeScreen, Calendar, Pelajaran, notifications. |
| `getExamState()` | `lib/examEngine.ts` | Unified exam countdown, multi-day handling, topic readiness. |
| `calculateNextClassDeadline()` | `engine/deadlineEngine.ts` | Next meeting of a subject from timetable. Double periods on one day = 1 meeting. |
| `calculateStudyStreak()` | `lib/studyStreakEngine.ts` | Streak derivation from tasks & focus logs, free day rules, anti-cheat filters. |
| `classifyTimetableKind()` | `lib/timetableParser.ts` | Deterministic break/event classifier for timetable entries. |
| `calculateDaysLeft()` | `lib/dateUtils.ts` | Calendar-midnight countdown. |

## 4. Data Layer

- **SQLite** (native) via `lib/storage.ts` — all tables use `INSERT OR REPLACE INTO`.
- **Web fallback** via `lib/storage.web.ts` (localStorage shim).
- **State management**: `store.tsx` — React Context wrapping SQLite reads into state arrays. All CRUD goes through store actions.
- **Wizard state**: `services/timetableWizardStore.ts` — isolated Zustand-like store for the 5-step import wizard.

### SQLite Tables
`subjects`, `period_times`, `timetable_entries`, `days_off`, `overrides`, `tasks`, `study_units`, `scheduled_blocks`, `focus_logs`, `review_history`, `daily_stats`, `app_settings`.

## 5. Theme System

- 7 themes in `theme.ts` — `THEMES` map keyed by `AppTheme`.
- `colors` is a JS `Proxy` that reads the active theme dynamically.
- Web: `applyTheme()` sets CSS custom properties on `:root`.
- Native: components read `colors.*` directly.
- **Rule**: Never use raw hex. Always `colors.primary`, `colors.surface`, etc.

## 6. i18n

- `lib/i18n.ts` — dictionary-based, keyed translation function `t()`.
- Default language: Indonesian (`id`).
- **Rule**: All user-facing strings must go through `t()` or be defined in `i18n.ts`.

## 7. Components — Common Building Blocks

All in `components/common/`:
`ScreenHeader`, `SectionHeader`, `Card`, `ListRow`, `PrimaryButton`, `SecondaryButton`, `TextButton`, `Chip`, `StatusPill`, `BottomSheet`, `EmptyState`, `Snackbar`.

Design system constraints:
- 1 primary action per screen, max 2 header icons
- 4 text sizes (title, section, body, caption)
- 3 vertical spacings (8, 16, 24 dp)
- 4dp subject color stripes
- 3D tactile Duolingo-style bevels (2px border, 4dp bottom)

## 8. Test Infrastructure

- Node.js test runners: `mobile/test_*.mjs`
- Compile step: `npx tsc <src files> --outDir dist-test --target es2022 --module commonjs --moduleResolution node --skipLibCheck`
- No Jest, no Vitest — plain `assert` + manual test harness.
- AI test samples: `mobile/test_samples/` with ground-truth JSON.

## 9. v2 Product Direction (2026-10-29)

StudyAir is now a **task schedule maker**. The timetable is an input (busy time), not the main feature. See `docs/Plan.md` for the full brief.

**Core loop**: Tambah tugas (with estimate) → Buat jadwal → Preview → Follow "Rencana hari ini" → Mark done → Missed blocks rescheduled.

**New types defined** (specified in `docs/tasks/P2-data-model.md`):
- `Task.estimatedMinutes?: number` — added to existing Task interface (default 30)
- `StudyBlock` — scheduled study session tied to a Task, with start/end time and status (`SCHEDULED` | `IN_PROGRESS` | `COMPLETED` | `MISSED` | `SKIPPED`)
- `BusyBlock` — derived from timetable classes, breaks, and personal time (`source: 'timetable' | 'custom' | 'calendar'`)
- `SchedulePrefs` — study window (default 15:00–21:00), maxBlockMinutes (45), minBreakMinutes (15), priority weights

**Scheduling engine** (implemented in `mobile/src/engine/schedulerEngine.ts`):
- `buildSchedule(options: { tasks, busyBlocks, prefs, referenceDate, daysAhead? }): ScheduleResult`
- **Inputs**:
  - `tasks: Task[]` — list of student tasks with `estimatedMinutes`, `givenDate`, `deadlineDate`, `status`.
  - `busyBlocks: BusyBlock[]` — busy intervals from timetable (`extractBusyBlocksFromTimetable`), breaks, or custom events.
  - `prefs: SchedulePrefs` — `studyWindowStart`, `studyWindowEnd`, `maxBlockMinutes`, `minBreakMinutes`, `daysOff`, `priorityWeights`.
  - `referenceDate: string` — starting anchor date (YYYY-MM-DD, typically today).
  - `daysAhead?: number` — planning horizon (default 14 days, dynamically extended to furthest task deadline).
- **Outputs**: `ScheduleResult` containing:
  - `blocks: StudyBlock[]` — concrete, non-overlapping study blocks with `id`, `taskId`, `subjectId`, `date`, `startTime`, `endTime`, `durationMinutes`, `status: "SCHEDULED"`.
  - `unallocated: UnallocatedTask[]` — tasks that could not fit before deadline with reason (`"DEADLINE_TOO_SOON"`, `"SCHEDULE_FULL"`, `"ALREADY_PAST_DEADLINE"`), needed vs allocated minutes.
  - `stats`: total tasks, fully scheduled, partially scheduled, unallocated count, total study minutes, total free minutes.
- **Slot-Finding Algorithm (`findFreeSlots`)**:
  1. Clamps study window to `[00:00, 23:59]`. If crossing midnight (e.g. 20:00–01:00), clamps end to `23:59` (1439 min).
  2. Filters days designated in `prefs.daysOff` (names, Indonesian day names, or dates) -> returns 0 free slots.
  3. Clamps each busy block on the date to the study window.
  4. Merges overlapping or contiguous busy intervals in $O(B \log B)$.
  5. Inverts merged busy intervals within `[studyWindowStart, studyWindowEnd]` to compute free `TimeSlot[]`.
- **Task Prioritization & Allocation Algorithm**:
  1. Filter out `COMPLETED` tasks.
  2. Sort active tasks:
     - Primary: `deadlineDate` ascending (earliest deadline first).
     - Tie-breaker 1: if `prefs.priorityWeights.hardFirst` is true, sort by `estimatedMinutes` descending.
     - Tie-breaker 2: `givenDate` ascending.
     - Tie-breaker 3: deterministic `id` ascending.
  3. Divide each task's duration into discrete chunks bounded by `maxBlockMinutes` (e.g. 90m -> [45, 45]) with minimum 15m remainder.
  4. First-fit search across valid dates `[max(givenDate, referenceDate), deadlineDate]`:
     - When placing a block, deduct chunk duration + `prefs.minBreakMinutes` buffer from the slot.
     - If remaining slot time is insufficient, remove or truncate slot.
  5. If chunks cannot be scheduled before `deadlineDate`, record remaining minutes in `unallocated`.
- **Invariants Guaranteed**:
  - Invariant A: `block.startTime < block.endTime` and `durationMinutes == endTime - startTime`.
  - Invariant B: No two study blocks on the same day overlap.
  - Invariant C: No study block overlaps any school or busy block.
  - Invariant D: `task.givenDate <= block.date <= task.deadlineDate`.
  - Invariant E: Min break buffers respected between contiguous blocks.
- **Time Complexity**:
  - Slot computation: $O(D \cdot B \log B)$ where $D$ is days in horizon and $B$ is busy blocks per day.
  - Task sorting: $O(T \log T)$ where $T$ is active tasks.
  - Chunk placement: $O(T \cdot C \cdot D \cdot S)$ where $C$ is chunks per task, and $S$ is average slots per day.
  - Overall time complexity is approximately $O(D \cdot B \log B + T \log T + T \cdot D)$.
  - **Empirical Benchmark**: 50 tasks across 14 days completes in **~0.3ms** on modern hardware (< 50ms requirement).


**Navigation change** (P10):
- Current 4 tabs (Tugas/Jadwal/Fokus/Kemajuan) → 3 tabs (Rencana/Tugas/Kalender) + center "+"
- DashboardScreen, FocusScreen, StreakScreen become sub-views or Pengaturan sections
- SyllabusScreen moves to Pengaturan > Jadwal sekolah

**What stays as-is**: SQLite storage, theme engine, i18n, shared components, AI scanner, timetable wizard, streak engine, notification service, all existing test suites.

## 10. Open Items

| Item | Status | Notes |
| :--- | :--- | :--- |
| Bug 5: AI scan speed on cellular | `unverified` | Local benchmarks pass; needs real device testing. |
| Android 14+ exact alarm permissions | `fixed (code)` | Fallback implemented, needs physical device verification. |
| `console.log` in prod | 2 files | `aiService.ts`, `AIScannerScreen.tsx` — 8 debug logs to guard with `__DEV__`. Folded into P0. |
| Phase 12 onboarding | `superseded` | Onboarding will be rebuilt for v2 core loop. |

## 11. File Size Warnings

These files are large and should be split during their respective v2 packets:
- `TimetableWizardScreen.tsx` — 97 KB (address in P10 when it moves to Pengaturan)
- `CalendarScreen.tsx` — 93 KB (address in P8 rebuild)
- `SettingsScreen.tsx` — 65 KB (address in P10 Pengaturan regrouping)
- `QuickActionSheet.tsx` — 55 KB (address in P4/P10 "+" menu rebuild)
- `SyllabusScreen.tsx` — 49 KB (address in P10 move to Pengaturan)
- `store.tsx` — 44 KB (address in P2 when adding new models)

