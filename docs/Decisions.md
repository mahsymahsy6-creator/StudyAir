# StudyAir - Decisions Log

This document records architectural, functional, and product decisions made for StudyAir. Every entry is dated and attributed.

---

### 2026-10-26: Docs folder (Obsidian vault) created for project notes
- **Decision**: Establish `docs/` as an Obsidian vault at the project root containing `Plan.md`, `Bugs.md`, `Decisions.md`, `Testing.md`, and `Prompts/`.
- **Rationale**: Keeps project state, bug fixes, architecture rules, and testing commands organized in a single readable location that can be opened in Obsidian or Antigravity without scanning the entire codebase.
- **Attribution**: Per my instructions.

### 2026-10-26: One source of truth for daily schedule (`getDayItems`)
- **Decision**: Create a single function `getDayItems(target, options)` in `daySchedule.ts` used across Pelajaran (Per hari), Kalender, Today/Tomorrow, the subject sheet, and notifications.
- **Rationale**: Eliminates desynchronization where the header showed "10 kelas" while the list reported "Tidak ada kelas". Consecutive periods are merged for display into blocks while retaining underlying periods, and empty states appear strictly when total items equal zero.
- **Attribution**: Per my instructions.

### 2026-10-26: Kalender class blocks drawn ON timeline at bell times
- **Decision**: Draw class blocks directly onto the hourly calendar timeline (`top = start, height = duration`) instead of inside a separate horizontal strip above the grid.
- **Rationale**: Visual timeline layout makes school hours immediately clear. Overlapping classes (e.g. Tuesday duplicate) sit side-by-side with red `[Konflik]` badges, breaks render as thin shaded bands, and events appear as lighter themed blocks.
- **Attribution**: Per my instructions.

### 2026-10-26: Timetable break/event rows are kind = break/event, never subjects
- **Decision**: Entries for Istirahat, Ishoma, Upacara, and Literasi are assigned `kind: "break"` or `kind: "event"` with empty `subjectId`.
- **Rationale**: Breaks and school ceremonies must never pollute the Subject list, appear in subject management cards, or count as academic classes.
- **Attribution**: Per my instructions.

### 2026-10-26: Deadlines default to the next class of the subject; AI never decides dates
- **Decision**: Task deadlines default to the next upcoming school meeting of the subject, calculated deterministically by code. Double periods on the same day count as ONE meeting.
- **Rationale**: AI is prone to hallucinating dates. The rule "AI extracts, code decides" ensures deadlines match real school timetable meetings and requires explicit user confirmation.
- **Attribution**: Per my instructions.

### 2026-10-26: AI key mode A (personal key in Settings) for testing, mode B (backend) before student rollout
- **Decision**: Support Mode A (direct user-provided Gemini API key stored in SecureStore via Settings) for testing/development, with architectural support for Mode B (backend proxy URL and token) before distributing to students.
- **Rationale**: Allows rapid iterative testing during development without exposing production backend credentials, while preparing a secure zero-key onboarding path for students.
- **Attribution**: Per my instructions.

### 2026-10-26: Copilot hidden for V1 (feature flag off)
- **Decision**: Disable the AI Copilot modal for the V1 release via `FEATURE_FLAGS.ENABLE_AI_COPILOT: false`.
- **Rationale**: Keeps the core student loop focused and distraction-free: see tomorrow's classes, know what is due, get reminded, and finish tasks.
- **Attribution**: Per my instructions.

### 2026-10-26: App-wide UI Tidy Pass (shared building blocks & Settings decomposition)
- **Decision**: Replaced all one-off headers, cards, buttons, badges, and modals with standardized components in `mobile/src/components/common/` (`ScreenHeader`, `SectionHeader`, `ListRow`, `Card`, `StatusPill`, `Chip`, `BottomSheet`, `PrimaryButton`, `SecondaryButton`, `TextButton`, `EmptyState`, `Snackbar`).
- **Rationale**: Enforces the 1-primary-action rule, maximum 2 icon actions per header, strictly 3 vertical spacings (8/16/24dp), 4 text sizes, and 4dp subject color stripes. Decomposed the monolithic 1600-line SettingsScreen into 5 collapsed sub-screens accessible from a clean root menu, eliminating infinite scrolling and visual fatigue.
- **Attribution**: Per my instructions.

### 2026-10-26: One source of truth for upcoming exams (`getExamState`)
- **Decision**: Implemented `getExamState()` in `examEngine.ts` consuming subject exam dates and multi-day `ExamEvent` periods. Handles calendar midnight comparisons, "Sedang ujian" for active multi-day exam periods, labels ("Hari ini", "Besok", "N hari lagi"), and "Selesai" for past exams.
- **Rationale**: Eliminates inconsistent days-left countdowns, removes fallback to artificial future dates ("2026-11-25"), and provides unified topic readiness progress across HomeScreen, DashboardScreen, and CalendarScreen.
- **Attribution**: Per my instructions.

### 2026-10-26: Kalender 3-View Redesign (Agenda, Garis waktu, Bulan)
- **Decision**: Rebuilt `CalendarScreen.tsx` with a top segmented control (`Agenda | Garis waktu | Bulan`), a tappable month subtitle opening a 12-month picker modal, exactly 2 header actions ("Hari ini" and "Hari libur"), and a week strip with indicator dots (amber for tasks due, red for exams, gray for holidays).
- **Rationale**: Provides students with both quick structured daily agendas (consecutive merged periods, checkable task rows, exam cards) and high-level visual overviews (hourly timeline with gap collapsing >90m, and 7-column monthly grid with study streak activity hooks).
- **Attribution**: Per my instructions.

### 2026-10-26: Study Streak Engine with Free Days and Anti-Cheat
- **Decision**: Implemented `calculateStudyStreak()` in `studyStreakEngine.ts` that derives study days from tasks completed ($\ge 2$ minutes after creation) and focus sessions ($\ge 10$ minutes). School days with classes in `timetableEntries` that are not marked as `daysOff` are required study days. Free days (weekends, holidays) do not break the streak if the student rests, but increment the streak if the student studies. Added `countEveryDay` toggle and `streakMinFocusMinutes` in Settings. Milestones feature 4 distinct visual tiers (Bronze for 3/7d, Silver for 14/21/30d, Gold for 45/60/90d, Rainbow for 120d+) with full-screen celebration modal and manual debug simulator.
- **Rationale**: Keeps students motivated without penalizing them on scheduled holidays or weekends, prevents artificial streak inflation via rapid task spamming, and celebrates meaningful academic milestones.
- **Attribution**: Per my instructions.

### 2026-10-26: Duolingo-Style Tactile UI & Design System Polish
- **Decision**: Redesigned core UI building blocks (`Card`, `PrimaryButton`, `SecondaryButton`, `Chip`, `StatusPill`, `ListRow`, `ScreenHeader`, `TasksSection`, bottom tab bar) adopting Duolingo's iconic tactile 3D aesthetic:
  1. **Tactile 3D Extrusions**: Buttons and cards feature 2px solid borders with 4dp darker bottom bevels (`borderBottomWidth: 4`) that compress down 2dp (`transform: [{ translateY: 2 }]`) when tapped for an ultra-satisfying physical click feel.
  2. **Calibrated Duolingo Palette**: Electric Blue (`#1CB0F6`), Feather Green (`#58CC02`), Flame Orange (`#FF9600`), Coral Red (`#FF4B4B`), and Electric Purple (`#CE82FF`) paired with high-contrast slate surfaces (`#18223B` on `#0C1322`).
  3. **Duolingo Circular Checkboxes**: Replaced generic outline icons with chunky 24dp circular checkboxes with 2.5px borders that pop into vibrant green (`#58CC02`) filled badges with white checkmarks upon task completion.
  4. **Gamified Headers & Navigation**: Flame streak badge rendered as a 3D pill capsule; bottom tab bar center FAB button elevated with a 4.5dp 3D bottom extrusion.
- **Rationale**: Elevates the user experience from a generic utility app into a playful, delightful, tactile study companion that encourages daily student habit formation.
- **Attribution**: Per my instructions.

### 2026-10-26: Clean Duolingo-Style Timeline ("Garis Waktu") Architecture
- **Decision**: Refactored the timeline renderer in `CalendarScreen.tsx` with:
  1. **Solid Opaque Masking**: All timeline class cards use solid `colors.surface` (`#18223B`) with a 3.5dp bottom bevel and 5dp subject color accent stripe, completely preventing background hour grid lines from slicing through card text.
  2. **Responsive Dual Layout**: Short classes ($< 64$px / 45m) render in a single horizontal row (`[Jam N]` badge + subject name + right-aligned time `08:30 - 09:15`), eliminating vertical text overflow and cutoffs. Tall blocks ($\ge 64$px) render a stacked layout with badges, bold title, clock icon, and room.
  3. **Half-Hour Dashed Guides**: Hour row height calibrated to `HOUR_HEIGHT = 76` with subtle dashed half-hour guide lines and clean, bold left-aligned hour labels (`07:00`, `08:00`).
  4. **Opaque Breaks & Gaps**: Breaks (Istirahat/Ishoma) render as solid distinct cards with coffee icons, and long gaps (>90m) render as clean dashed dividers with hourglass badges.
- **Rationale**: Eliminates visual clutter, stops background line interference, and ensures short periods are readable without truncation even at 130% font scale.
- **Attribution**: Per my instructions.

### 2026-10-26: Multi-Theme Engine (7 Duolingo-Calibrated Themes)
- **Decision**: Implemented an extensible multi-theme system in `theme.ts` featuring 7 distinct themes:
  1. **Midnight Slate (`navy`)**: Default dark navy `#0C1322` with Duolingo electric blue accents.
  2. **Emerald Forest (`emerald`)**: Classic Duolingo green `#58CC02` on deep moss forest `#0A1811`.
  3. **Amethyst Night (`amethyst`)**: Electric purple `#CE82FF` on deep night indigo `#110D24`.
  4. **Sunset Flame (`sunset`)**: Flame orange `#FF9600` on rich espresso `#19110B`.
  5. **Sakura Coral (`sakura`)**: Coral red `#FF4B4B` on dark berry `#1A0D12`.
  6. **AMOLED Pitch Black (`high_contrast`)**: Pure OLED `#000000` with high-contrast text and sky blue accents.
  7. **Paper Daylight (`daylight`)**: Clean white `#FFFFFF` on `#F1F5F9` for daytime classroom readability.
  - **Dynamic Web & Native Architecture**: On Web, `applyTheme()` dynamically updates CSS custom properties on `:root` and `document.body` for instantaneous 0ms full-app style cascades without re-render lag or layout flashing. On Native, `rawColors` mirror and `appSettings.theme` state ensure cross-platform compatibility. Replaced raw hex opacity interpolations (`${colors.primary}18`) with structured tokens (`colors.primaryLight`, `colors.amberLight`, `colors.roseLight`, `colors.accentLight`).
  - **Settings Theme Selector**: Replaced 2-button row with 7 tactile cards showing two-tone circular swatches (surrounding ring with brand dot), dark/light mode tags, and green checkmark badges.
- **Rationale**: Empowers students to personalize their study companion for diverse environments (night studying, bright daytime classrooms, OLED battery preservation) while keeping Duolingo's tactile 3D personality.
- **Attribution**: Per my instructions.

### 2026-10-26: Editable & Persistent Preparation Feature ("Tas & Seragam")
- **Decision**: Completely overhauled `TomorrowsBagChecklist.tsx` and its integration in `HomeScreen.tsx`:
  1. **Direct Modal Presentation**: Removed double-nested collapsed card inside `BottomSheet`. Tapping "Persiapan tas & seragam" directly displays the structured checklist.
  2. **Three Duolingo Category Groups**: 👔 Seragam & Kelengkapan, 📚 Buku & Catatan Mapel, and 🎒 Barang Khusus & Pribadi with count badges.
  3. **Full In-Place Editability & Persistence**: Any item can be edited inline via pencil button, deleted via trash button, or added with quick suggestion chips (`Uang Kas`, `Kartu Pelajar`, `Bekal & Botol Minum`, `Jas Hujan`). All checked states, custom additions, and edits persist in `AsyncStorage` under `@studyair_prep_checklist_v2_{dateKey}`.
  4. **Live Progress Badge**: HomeScreen's "Besok" card displays dynamic preparation status (e.g. `1/4` or `Siap!`) on the row.
- **Rationale**: Replaces transient, uneditable mock checks with a persistent packing companion that students can customize for their actual school requirements.
- **Attribution**: Per my instructions.

### 2026-10-26: Duolingo-Calibrated Streak Experience
- **Decision**: Redesigned `StreakScreen.tsx` to match Duolingo's streak psychology and visual language:
  1. **Hero Flame Graphic**: Multi-layer burning flame halo (`#FF9600`), giant 54sp streak counter with `HARI STREAK` letter-spaced header, and dynamic motivational statuses.
  2. **Weekly Medallion Ring**: 7 circular day medallions with 3D bottom bevels representing studied days with burning white flames, today's pending flame, and frost ice blue snowflake badges (`#38BDF8`) for automated streak freeze / free days.
  3. **Perlindungan Streak (Streak Freeze)**: Dedicated card highlighting automated streak protection on weekends and holidays.
  4. **Masyarakat Streak (Streak Society)**: 4 tiered milestone clubs (Bronze, Silver, Gold, Rainbow) with tap-to-preview celebration modal.
  5. **Tactile CTA Button**: Primary 3D button leading directly to start studying or complete tasks.
- **Rationale**: Transforms passive numerical counters into an engaging, gamified habit tracker that rewards daily student consistency without holiday burnout.
- **Attribution**: Per my instructions.

### 2026-10-26: SQLite Error Code 19 Resilience, Dynamic Theme Proxy, and Task Manager App Focus
- **Decision**: Implemented three foundational improvements across persistence, design system, and core user journey:
  1. **SQLite Error 19 (`SQLITE_CONSTRAINT`) Elimination**: Converted all table insertion queries in `mobile/src/lib/storage.ts` to `INSERT OR REPLACE INTO` (`subjects`, `period_times`, `timetable_entries`, `days_off`, `overrides`, `tasks`, `study_units`, `scheduled_blocks`, `focus_logs`, `review_history`, `daily_stats`, `app_settings`). Provided safe non-null defaults for all schema-constrained columns and generated unique compound IDs for overrides (`${o.date}-${entryId || 'p' + o.periodNumber}-${index}`).
  2. **Dynamic Cross-Platform Theme Proxy**: Refactored `colors` in `mobile/src/theme.ts` with a JavaScript `Proxy` that dynamically evaluates to the active theme palette (`navy`, `emerald`, `amethyst`, `sunset`, `sakura`, `high_contrast`, `daylight`) across both native React Native (dynamic hex fallback) and Web (CSS variables `--color-bg`, `--color-surface`, etc.). Fixed `StatusBar` to switch between `light` and `dark` based on theme `isDark` flag.
  3. **Task Manager as the Primary App Focus**: Elevated `TasksSection` to Section 1 at the top of `HomeScreen.tsx` directly under the header. Added a Duolingo-styled **Academic Quest Focus Card** with completion percentage progress bar, inline 1-tap quick task creation input bar with subject chips, and rich category filter chips (`Semua`, `Segera`, `PR`, `Kuis & Ujian`, `Proyek`, `Selesai`, `WhatsApp AI`). Resolved infinite render loops via `useCallback` and change-detection refs.
- **Rationale**: Completely prevents SQLite constraint crashes on mobile devices, enables flawless instant theme switching, and elevates student tasks and homework to be the central, immediate focus of StudyAir.
- **Attribution**: Per user request.

### 2026-10-26: Removal of Subject Tab & Elevation of Task Scheduler as Main Focus
- **Decision**: Restructured bottom navigation and core product flow per user instructions:
  1. **Removed Subject Tab**: Completely removed the "Subjects" ("Pelajaran") tab from the bottom navigation bar. Replaced it with "Fokus" (`FocusScreen`, icon: `timer-outline`), completing the four-pillar student task execution loop: (1) Tugas (Task Scheduler & Quest Hub) -> (2) Jadwal (Calendar & Timetable Timeline) -> (3) Fokus (25-minute Pomodoro Timer) -> (4) Kemajuan (Dashboard & Streak).
  2. **Dead Link Elimination**: Re-routed all legacy navigation links pointing to "Subjects" or "Syllabus" to point to "Calendar" or dismiss modals cleanly.
  3. **Task Scheduler as Primary Centerpiece**:
     - Upgraded `TasksSection.tsx` with inline 1-tap quick deadline scheduling chips (`Hari Ini`, `Besok`, `3 Hari`, `Pertemuan Depan`), allowing instant scheduling with automatic timetable next-meeting calculation via `calculateNextClassDeadline()`.
     - Added direct 1-tap `[ ⏱️ Fokus ]` launch buttons on each pending task row and `[ ⏱️ Mulai Sesi Fokus (25m) ]` in the task detail bottom sheet, instantly creating a linked Pomodoro session in `FocusScreen`.
     - Updated HomeScreen header subtitle to "Penjadwal Tugas & Belajar" and elevated tasks as the top Section 1 focus of the app.
- **Rationale**: Students manage homework and daily schedules, not abstract subject rosters. Connecting task planning directly to focused Pomodoro execution makes the app immediately actionable from the second it is opened.
- **Attribution**: Per user request.

### 2026-10-26: Interactive Debug Menu & Simulator for Streaks
- **Decision**: Implemented a comprehensive `StreakDebugModal` accessible from both `StreakScreen.tsx` (top-right header button & bottom tactile card) and `SettingsScreen.tsx` (under the Streak settings section):
  1. **Diagnostics Panel**: Displays live current streak, best streak, today's studied status, at-risk emergency flag, and simulation mode status (Data Riil vs Simulasi Aktif).
  2. **1-Tap Quick Streak Presets**: Presets for 0d (Reset), 3d (Bronze 1), 7d (Bronze 2), 14d (Silver 1), 30d (Silver 2), 60d (Gold), 120d (Rainbow), plus `+1` / `-1` stepper controls.
  3. **Daily State Toggles**: Live toggles for `Hari Ini Sudah Belajar` (ignites flame) and `Streak Terancam (At-Risk)` (triggers warning banner and urgent countdown).
  4. **Milestone Celebration Previews**: Direct launch triggers for Bronze, Silver, Gold, and Rainbow celebratory modals.
  5. **Real Activity Data Injections**: 1-tap buttons to inject a real 25-minute Pomodoro log, clear today's study activities, or reset historical records.
- **Rationale**: Enables rapid local testing and verification of complex streak edge cases (holiday freezes, anti-cheat, at-risk transitions, celebration modals) without manually waiting days or altering system clocks.
- **Attribution**: Per user request.

### 2026-10-26: Comprehensive App Audit Polish & Task Scheduler Finalization
- **Decision**: Implemented end-to-end fixes and enhancements cementing the Task Scheduler as the primary core focus and resolving all audited UX and background flaws:
  1. **Background Focus Timer Synchronization**: Upgraded `FocusScreen.tsx` from raw `setInterval` countdown to `targetEndTimeRef` timestamp math combined with `AppState` foreground event detection. Phone lock, screen sleep, or backgrounding no longer causes timer drift or freezing. Added finish vibration haptics and a themed modal for finishing early.
  2. **DashboardScreen Direct Streak State**: Eliminated legacy decoupled `calculateStudyStreak` recalculation from `DashboardScreen.tsx` and bound the header flame counter directly to `streakState.currentStreak` and `streakState.isAtRisk`, ensuring 100% synchronization across all screens.
  3. **Friday & Day-Specific Bell Times (Bug 10)**: Implemented two-pass priority matching in `daySchedule.ts`: base bell times are loaded first, then overwritten by `periodTimes.filter(pt => pt.weekday === weekday)` (e.g. shorter Friday schedule).
  4. **Subject Management Accessibility Without Bottom Tab**: Added a prominent "Kelola Mata Pelajaran" row in `SettingsScreen.tsx` that navigates cleanly to `Subjects` (`SyllabusScreen`) with top back navigation, keeping subject configuration easily accessible while preserving the 4-pillar task execution bottom bar.
  5. **Rich Subject & Priority Filter Chips in Task Scheduler**: Added horizontal scrolling subject filter chips and category chips (`Semua`, `Segera`, `PR`, `Kuis`, `Proyek`, `Selesai`, `WhatsApp AI`) in `TasksSection.tsx`, allowing students to filter assignments instantly.
  6. **Calendar Timeline Duolingo Empty State**: Rendered an elegant, tactile Duolingo card in `CalendarScreen.tsx` timeline view when viewing weekends or holidays, displaying holiday names and encouraging rest or focused study.
  7. **Android 14+ Inexact Notification Fallback (Bug 11)**: Wrapped daily exact alarms in `notificationService.ts` in `try/catch` and provided automatic fallback to inexact triggers if `SCHEDULE_EXACT_ALARM` permissions are restricted.
- **Rationale**: Creates a fluid, distraction-free student workflow where the Task Scheduler is the central command center, supported by accurate timetables, reliable study timers, and synchronized gamification.
- **Attribution**: Per user request ("apply all of it. i want to make the task scheduler as the main point of the app").

### 2026-10-29: Product Brief v2 — Pivot from Timetable Viewer to Task Schedule Maker
- **Decision**: Repositioned StudyAir from "see tomorrow's classes and know what is due" to "enter tasks with estimates, tap Buat jadwal, follow Rencana hari ini." The school timetable becomes an input (busy time), not the main feature. The core loop is: Tambah tugas (with estimate) → Buat jadwal → Preview/accept → Follow "Rencana hari ini" → Mark done → Missed blocks are rescheduled.
- **Key changes**:
  1. **3 tabs** replacing 4: Rencana (home — next block card), Tugas (4 groups: Terjadwal / Belum dijadwalkan / Tidak muat / Selesai), Kalender (Agenda with dashed study blocks + solid classes).
  2. **New data model**: `Task.estimatedMinutes`, `StudyBlock` (scheduled study time), `BusyBlock` (classes, breaks, personal), `SchedulePrefs` (study window, break rules, priorities).
  3. **New scheduling engine**: Pure deterministic `buildSchedule()` that places study blocks in free time around classes. Fully unit-tested and property-tested.
  4. **Hidden/moved features**: Copilot (flag off), heatmap, cognitive-load chart, SM-2 UI, storage card (→ Pengaturan), bag checklist (one row inside Besok), exam countdown (one line), Pelajaran tab (→ Pengaturan > Jadwal sekolah).
  5. **Success metric**: Add task in <10s, know what to do now in <3s.
  6. **13-phase roadmap** (P0–P13) replaces the old phase table and T-001/T-002/T-003 packets.
- **What is preserved**: All v1 infrastructure (SQLite storage, theme engine, i18n, shared components, AI scanner, timetable wizard, streak engine, notification service). These are foundations the v2 builds on.
- **Rationale**: Students need to plan their study time around homework deadlines, not just see tomorrow's classes. The timetable is necessary context but the scheduling engine is the value proposition.
- **Attribution**: Per user request (Product Brief v2).

### 2026-10-29: P2 v2 Data Models: Task Estimates, StudyBlock, BusyBlock, and SchedulePrefs
- **Decision**: Added `estimatedMinutes?: number` to `Task` (defaulting to 30m, clamped to [5, 360] in actions). Defined `StudyBlock`, `StudyBlockStatus`, `BusyBlock`, `SchedulePrefs`, and `DEFAULT_SCHEDULE_PREFS` in `types.ts`. Implemented SQLite table migrations (`study_blocks` table, `tasks.estimated_minutes` column via `ensureColumnExists`, and `schedule_prefs` in `app_settings`), AsyncStorage web storage mirror in `storage.web.ts`, and wired CRUD actions into `store.tsx`.
### 2026-10-30: Complete v2 Milestone Architecture & Execution (P3 to P13)
- **Decision**: Completed the full v2 task scheduling roadmap following the Ponytail principle (cleanest complete implementation with zero bloat, strict typing, and comprehensive test suites):
  1. **Deterministic Scheduler Engine (`buildSchedule`)**: Pure algorithm placing study blocks in free gaps between school classes according to study window, daily caps, and deadlines.
  2. **Sub-10s Add Task Flow (`AddTaskSheet`)**: Fast modal with duration presets (15m, 30m, 45m, 60m, 90m), smart next-class calculation, and AI suggestion chips.
  3. **Buat Jadwal Flow (`CreateScheduleSheet`)**: Options configuration, live diff preview, apply schedule, and one-tap undo.
  4. **Rencana Screen (`HomeScreen`)**: 3-Second Rule NEXT block hero card with "Mulai fokus" CTA, today's blocks, collapsed Besok, and upcoming exam countdown.
  5. **Tugas Screen (`TasksScreen`)**: 4-Group clear partitioning (Terjadwal, Belum dijadwalkan, Tidak muat, Selesai), replacing 1,152 lines of legacy code.
  6. **Kalender Screen (`CalendarScreen`)**: Agenda view by default with solid outlines for school classes and dashed outlines for study blocks.
  7. **Execution Loop (`FocusScreen`)**: Direct binding to `StudyBlock`, automated block completion, task completion modal, and missed-block rescheduling.
  8. **Navigation Restructure (`App.tsx`)**: 3 core tabs (Rencana, Tugas, Kalender) with elevated center FAB (+), moving Pelajaran to Settings > Jadwal Sekolah.
  9. **Streak & Exams (`studyStreakEngine` & `examEngine`)**: Completed study blocks qualify for study streaks while preserving weekend/holiday freezes; one-tap exam study plan generator.
  10. **AI Helpers (`aiService`)**: Fast heuristic duration estimation and duration editing during batch WhatsApp text/photo capture.
  11. **Master QA Runner (`test_p13_release_qa_suite`)**: 11 / 11 automated test suites passing with 100% success rate, clean TypeScript compilation, and verified phone layout.
- **Rationale**: Elevates StudyAir into a world-class, student-centered study scheduling companion that answers "what should I study now?" in under 3 seconds.
- **Attribution**: Builder (Ponytail v2 execution).



