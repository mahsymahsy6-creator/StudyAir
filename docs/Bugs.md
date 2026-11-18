# StudyAir - Bugs Log

| Bug | Where | Status | Notes |
| :--- | :--- | :--- | :--- |
| **1. Pelajaran > Per hari header counts classes but list says "Tidak ada kelas"** | `mobile/src/components/timetable/TimetableDayView.tsx`, `mobile/src/lib/timetableGrouping.ts` | `fixed` | Wizard imported entries with `kind: undefined`. Grouping counted them in `else`, but `TimetableDayView` strictly filtered `kind === "class"`. Fixed by normalizing `kind` in `getDayItems` and checking `daySchedule.empty` (`items.length === 0`). |
| **2. Kalender shows classes in strip instead of timeline, overlapping entries, count differs from Pelajaran (11 vs 10)** | `mobile/src/screens/CalendarScreen.tsx` | `fixed` | Classes were rendered in a horizontal `ScrollView` above the grid instead of positioned cards. Overlaps sat on top of each other. Fixed by drawing cards directly on the hourly timeline at bell times (`top = start, height = duration`), side-by-side positioning with red `[Konflik]` badge, and single source of truth `getDayItems()`. |
| **3. Breaks and events (Istirahat, Ishoma, Upacara, Literasi) must not be saved as subjects** | `mobile/src/lib/timetableParser.ts`, `mobile/src/lib/daySchedule.ts` | `fixed` | Added deterministic `classifyTimetableKind()` to classify break/event keywords. Stored as `kind: "break"` or `kind: "event"` with `subjectId: ""` so they never pollute the Subject list. |
| **4. "Paste from WhatsApp" / "Tambah dari teks" did not work** | `mobile/src/components/tasks/AddFromTextModal.tsx`, `mobile/test_add_from_text.mjs` | `fixed` | Fixed by adding regex cleaner stripping WhatsApp timestamps (`[24/10/26 13.05] Nama:`) and phone numbers before extraction, adding empty clipboard validation, and offering manual 1-task fallback on failure. |
| **5. AI scan is too slow (target 10 seconds or less)** | `mobile/src/lib/aiScanner.ts`, `mobile/src/lib/gemini.ts` | `unverified` | Image pre-scaling, JPEG compression, and prompt compacting implemented and benchmarked locally (`test_step4_final_benchmark.mjs`), but real-world mobile network latency on low-bandwidth cellular connections remains unverified without physical device testing. |
| **6. Exam days-left counts differ between screens (30, 31, "30h lagi")** | `mobile/src/lib/dateUtils.ts` | `fixed` | Centralized all countdown logic into `calculateDaysLeft()` using calendar midnight comparison (`parseLocalMidnight()`) rather than raw millisecond subtraction. Verified by `test_v1_polish_suite.mjs`. |
| **7. Mixed English and Indonesian text across screens, and ISO dates** | App-wide (`mobile/src/lib/i18n.ts`, `mobile/src/lib/dateUtils.ts`) | `fixed` | Replaced hardcoded English phrases with Indonesian translations in `i18n.ts`. Standardized date formatting with `formatLocaleDate()` and Indonesian day/month names. |
| **8. "Tambah Kelas Pengganti" subject picker missing PJOK** | `mobile/src/components/calendar/ClassOverrideModal.tsx` | `fixed` | Subject selector was relying on partial filtered list. Updated to consume full `subjects` state from store. |
| **9. Antigravity gets slow when analyzing many files** | Workspace configuration & instructions | `fixed` | Added explicit instruction to limit file opening to ≤ 10 files per task, use targeted grep search and git log over whole-project scans, and documented standard workflow in `AGENTS.md`. |
| **10. Weekday-specific bell times ("Jam berbeda di hari tertentu" e.g. shorter Friday)** | `mobile/src/lib/daySchedule.ts`, `mobile/src/screens/SettingsScreen.tsx` | `fixed` | Implemented two-pass bell times resolution in `daySchedule.ts`: default bell times are indexed first, then overwritten by matching `periodTimes.filter(pt => pt.weekday === weekday)` (e.g. shorter Friday timetable). Verified by `test_day_schedule_suite.mjs`. |
| **11. Background notification scheduling permissions on Android 14+ exact alarms** | `mobile/src/services/notificationService.ts`, `mobile/scripts/patch-expo-notifications.js` | `fixed` | Wrapped exact daily alarm triggers (`DAILY`) in `try/catch` blocks in `notificationService.ts` and provided automatic fallback to inexact interval triggers (`seconds: 3600`) if exact alarm scheduling is restricted on Android 14+ without physical device crashes. |
| **12. "Garis waktu" timeline cards messy, transparent, and text clipping on short periods** | `mobile/src/screens/CalendarScreen.tsx` | `fixed` | Timeline class cards had semi-transparent background allowing horizontal hour grid lines to cut across text, time labels were misaligned, and short periods (<60m) had 3 vertically stacked rows that overflowed their boundaries. Fixed with solid opaque `#18223B` masking, 3D bottom bevel, 5dp color accent stripe, dual layout (compact single-row for short blocks <64px, stacked for tall blocks >=64px), and half-hour dashed guides. |
| **13. SQLite Error code 19 (`SQLITE_CONSTRAINT`) during transaction persistence** | `mobile/src/lib/storage.ts` | `fixed` | Plain `INSERT INTO` queries crashed on duplicate IDs or when `overrides` shared identical date or empty `entryId`, and null values on `NOT NULL` columns (e.g. break entries with empty `subjectId`) violated constraints. Fixed by replacing all inserts with `INSERT OR REPLACE INTO`, guaranteeing safe fallback defaults for all `NOT NULL` columns, generating unique override IDs, and migrating missing `timetable_entries` columns. Verified by `test_sqlite_theme_task_suite.mjs`. |
| **14. Maximum update depth exceeded infinite re-render loop on HomeScreen** | `mobile/src/components/home/TomorrowsBagChecklist.tsx`, `mobile/src/screens/HomeScreen.tsx` | `fixed` | `TomorrowsBagChecklist` called `onProgressChange` unconditionally inside `useEffect` while `HomeScreen` passed an inline arrow callback updating `setPrepProgress`, creating an infinite render loop. Fixed by wrapping the handler in `useCallback` with value-change checking and guarding `onProgressChange` in `TomorrowsBagChecklist` with `useRef` change detection. |
| **15. SQLite concurrent transaction collision (`cannot commit - no transaction is active`)** | `mobile/src/lib/storage.ts`, `mobile/src/store.tsx` | `fixed` | Rapid consecutive renders called `saveStateImmediately` concurrently without serialization, causing `expo-sqlite` `withTransactionAsync` collisions. Fixed by adding a sequential coalescing queue pattern in `storage.ts` that folds overlapping saves into a single subsequent write, and adding a 150ms debounce in `store.tsx`. |
| **16. Jadwal tab on Sunday shows "Hari 7" and "Tidak ada kelas di hari Hari 7"** | `mobile/src/screens/TimetableScreen.tsx`, `mobile/src/components/timetable/TimetableDayView.tsx` | `fixed` | `selectedDay` now defaults to Monday (`1`) when Sunday (`7`) is not in `availableDays`, and day metadata resolves from `WEEKDAYS` (`"Minggu"`) before any fallback. |
| **17. Theme switch only partly applies on native** | `mobile/App.tsx`, `mobile/src/theme.ts` | `fixed` | Called `applyTheme` synchronously in `MainApp` and added `key={appSettings?.theme \|\| "navy"}` on `MainApp`'s root `SafeAreaView` so switching themes remounts the tree with updated colors. |
| **18. Hex-alpha suffix on theme colors breaks on web** | 25 places using `${colors.x}40` | `fixed` | Replaced all 25 `${colors.x}NN` string interpolations across 11 files with semantic theme tokens (`colors.primaryLight`, `colors.emeraldLight`, `colors.amberLight`, `colors.roseLight`, `colors.blockBorder`). |
| **19. Kalender and Ulangan screens unreachable from main navigation** | `mobile/App.tsx`, `mobile/src/screens/SettingsScreen.tsx`, `mobile/src/screens/CalendarScreen.tsx` | `fixed` | Restored `Kalender` as the 4th tab (`Hari Ini \| Jadwal \| + \| Tugas \| Kalender`), moved `Nilai & Rapor` into `Pengaturan`, and added `Jadwal Ulangan` entry points in `Kalender` header and `Pengaturan`. |
| **20. Adding tasks with AI (`AIScannerScreen`) added them to Ulangan instead of Tugas** | `mobile/src/screens/AIScannerScreen.tsx`, `mobile/src/services/aiService.ts`, `mobile/src/components/QuickActionSheet.tsx` | `fixed` | `AIScannerScreen` previously called `addSubject({ exam_date: ... })` and `addStudyUnit(...)` without calling `addTask(...)`, which caused `deriveExamItems` in `examEngine.ts` to list scanned subjects/items as exams in `Ulangan`. Updated `AIScannerScreen` to extract tasks via `extractWhiteboardFromAI` / `extractTasksFromAI`, resolve existing subjects (or create subjects with `examDate: undefined`), save items via `addTask(...)`, and navigate to `Tasks`. |


### Bug #21: Task Deadline Mismatch (`waktu tenggat tidak sesuai`) Across NLP Parser, AI Scanner, and Timetable Updates
- **Symptom**: Deadlines (`waktu tenggat`) for newly created or AI-extracted tasks frequently resolved to the wrong date (e.g., always defaulting to `"Besok"` or Monday regardless of class schedule, matching leading `"Besok"` instead of `"dikumpul hari Jumat"`, ignoring `"hari ini"` / `"dikumpul Kamis"` / `"3 hari lagi"` / `"12 November"`, ignoring auto-detected date hints in manual entry unless the user clicked the hint chip, and failing to recalculate dynamic `nextClass` deadlines when the timetable was edited).
- **Root Cause**:
  1. `AIScannerScreen.tsx` defaulted `suggested_time` to `"Besok"` when no date was extracted, so `parseIndonesianDateHint("Besok")` in `handleConfirmAndSchedule` always ran before and shadowed `calculateNextClassDeadline`.
  2. `parseIndonesianDateHint` in `dateHintParser.ts` evaluated leading `"besok"` before explicit deadline clauses (`dikumpul ...`, `deadline ...`) and required the word `"hari"` before weekday names.
  3. `resolveDeadlineDate` in `aiService.ts` fell back to `normalizeWeekday`, which returned `1` (Monday) for any unrecognized string.
  4. `AddTaskSheet.tsx` displayed a detected date hint chip from the task title/notes without applying it to `effectiveDeadline` unless clicked.
  5. `store.tsx` did not run `recalculateDynamicTaskDeadlines` when `timetableEntries`, `daysOff`, or `overrides` changed.
- **Fix**:
  - Upgraded `parseIndonesianDateHint` (`mobile/src/engine/dateHintParser.ts`) to prioritize explicit deadline clauses (`dikumpul`, `tenggat`, `deadline`, `batas waktu`, `paling lambat`), support `"hari ini"` / `"malam ini"`, standalone weekdays (`"dikumpul Kamis"`), relative offsets (`"3 hari lagi"`), and `"DD Month"` / `"DD-MM-YYYY"`.
  - Delegated `resolveDeadlineDate` and `extractTasksLocal` (`mobile/src/services/aiService.ts`) to `parseIndonesianDateHint`.
  - Changed `AIScannerScreen.tsx` default `suggested_time` to `"Kelas Depan"` so `calculateNextClassDeadline` resolves accurately from the subject's timetable, and added tap-to-cycle deadlines on the review card.
  - Auto-applied detected date hints in `AddTaskSheet.tsx`, added 1-tap deadline pickers in `QuickActionSheet.tsx`, `TodayTasksSection.tsx`, and `TasksScreen.tsx`, and added automatic `recalculateDynamicTaskDeadlines` in `store.tsx` whenever timetable/holidays change.
- **Status**: Resolved ✅

### Bug #22: Headless Video Renderer (`render_trailer_video.mjs`) Hung After Frame 900 on Playwright `ffmpeg-mac`
- **Symptom**: `node mobile/scripts/render_trailer_video.mjs` rendered all 900 frames (`30.0s @ 30fps`) and then hung indefinitely before reaching step `[4/4]`.
- **Root Cause**:
  1. Playwright's bundled `ffmpeg-mac` build does not support `-i -` (`Error opening input file -: Protocol not found`) and requires `-i pipe:0`.
  2. Because `ffmpegProc` exited immediately at frame 0 while `new Promise(r => ffmpegProc.on("close", r))` was only registered *after* the 900-frame capture loop completed, the `"close"` event had already fired and the promise never resolved.
  3. `stderr` was ignored instead of drained, and default VP9 encoding lacked `-deadline realtime -cpu-used 8 -row-mt 1`.
- **Fix**:
  - Updated `mobile/scripts/render_trailer_video.mjs` to pass `-y -i pipe:0 -deadline realtime -cpu-used 8 -row-mt 1`, attach `stderr` draining and `ffmpegExitPromise` immediately upon process spawn, respect `stdin.write` backpressure (`drain`), close `stdin` immediately after frame 900, and check for system `ffmpeg` first with automatic fallback to macOS `AVFoundation` (`swift`) for H.264 + AAC `.mp4` muxing.
- **Status**: Resolved ✅

### Bug #23: Streak debug menu visible in production
- **Symptom**: The Streak screen header shows a 🛠 "Menu Debug Streak" action to all users.
- **Location**: `mobile/src/screens/StreakScreen.tsx` (header `actions`, `construct-outline`).
- **Fix**: Gated behind `appSettings.developerModeEnabled` unlocked strictly via 7-tap build number Easter egg in Settings (`Versi & Pembaruan Aplikasi`).
- **Status**: Resolved ✅

### Bug #24: Tasks filter pill labels clipped on 390px screens
- **Symptom**: "Terjadwal" shows as "Terjad…" and "Belum Dijadwalkan" as "Belum" in `TasksScreen` filter pills.
- **Location**: `mobile/src/screens/TasksScreen.tsx` (filter pills).
- **Fix**: Stacked each pill's label and count vertically (`flexDirection: "column"`) so all 4 filter labels fit cleanly on 390px screens without truncation.
- **Status**: Resolved ✅

### Bug #25: Standalone APK (`StudyAir-v2.0.0.apk`) Shipped Old v1.0.0 Build With Solid Purple Placeholder Icon and Expo Go Range Filename
- **Symptom**: `public/StudyAir-v2.0.0.apk` and `mobile/StudyAir-v2.0.0.apk` contained an earlier v1.0.0 EAS build (`assets/app.config` `version: "1.0.0"`) with solid purple placeholder mipmaps instead of the StudyAir calendar + paper plane launcher icon, and `apk_download_server.mjs` returned `StudyAir-ExpoGo-v58.0.5.apk` in `Content-Disposition` for HTTP `206` Range requests.
- **Root Cause**: The earlier APK artifact predated `mobile/app.json` icon/version configuration, `mobile/app.json` used a deprecated top-level `splash` schema field in SDK 58 without a prebuild plugin for `usesCleartextTraffic` / `#090d16` splash color, and `.easignore` did not exist to keep the EAS upload slim.
- **Fix**:
  - Updated `mobile/app.json` (moved `splash` under `web.splash` to pass SDK 58 schema validation) and added `mobile/plugins/withStudyAirAndroid.js` (`usesCleartextTraffic="true"` and `#090d16` `splashscreen_background`).
  - Added `.easignore` at repo root excluding `.git`, APKs, `public/`, and root Next.js directories while retaining `mobile/src/`, `mobile/assets/`, and `mobile/plugins/`.
  - Rebuilt standalone Android `preview` APK via EAS (`4a39dc68-9a26-4735-aaff-aeffd687dbda`, `86.2 MB`, `version: "2.0.0"`, `versionCode: 2`), verified `ic_launcher` / `ic_launcher_round` / `ic_launcher_foreground` mipmaps inside the APK, and updated `public/StudyAir-v2.0.0.apk`, `mobile/StudyAir-v2.0.0.apk`, `src/app/api/version/route.ts`, `src/app/download/page.tsx`, and `mobile/scripts/apk_download_server.mjs` (`206` Range `Content-Disposition`).
- **Status**: Resolved ✅

### Bug #26: Timetable Wizard "Susun Manual" Desync From Settings Period Times
- **Symptom**: Configuring 10 periods in Settings (`Jam Belajar Sekolah` / `Jam Pelajaran`) failed to show in the Timetable Wizard's "Susun Manual" tab (which remained stuck at 8 periods).
- **Root Cause**: `initialWizardState.periodTimes` in `timetableWizardStore.ts` was hardcoded to `DEFAULT_PERIOD_TIMES` (8 items), and `TimetableWizardScreen.tsx` had a guard `if (wizard.periodTimes.length === 0)` which never triggered because `wizard.periodTimes.length` was always 8. In addition, "Susun Manual" mapped directly over `wizard.periodTimes` instead of resolving day-specific overrides for `selectedGridDay`.
- **Fix**:
  - Initialized `initialWizardState.periodTimes` to `[]` and updated `TimetableWizardScreen.tsx` to unconditionally sync `controller.setPeriodTimes(storePeriodTimes)` on Step 1.
  - Resolved `manualGridPeriods` for `selectedGridDay` using two-pass resolution (base bell times + weekday overrides).
  - Added inline `+ Tambah Jam Pelajaran (Jam {n+1})` button directly in "Susun Manual" syncing bidirectionally with the store.
  - Made period chips in `TimetableScreen.tsx` dynamic and allowed overdue tasks to be scheduled via `allowOverdue: true` in `schedulerEngine.ts` and `CreateScheduleSheet.tsx`.
- **Status**: Resolved ✅

### Bug #27: Timetable Wizard "Batal" Button Unresponsive on Web & Missing Direct Bell Times Control in Jadwal
- **Symptom**: Clicking "Batal" in the Timetable Wizard header failed to exit the screen, and adjusting school period times ("jam pelajaran") required navigating away from the Jadwal screen into Settings.
- **Root Cause**:
  1. `react-native-web` mapped `window.confirm` "OK" to the first button in `Alert.alert`, which was `keepEditing` (a cancel style with no `onPress`), trapping the user in the wizard.
  2. `handleBackToTab` in `App.tsx` did not handle the case where history was rooted at `TimetableWizard`, failing to change tabs.
  3. `TimetableScreen.tsx` lacked an entry point to configure `periodTimes`, forcing users to leave the timetable tab.
- **Fix**:
  - Implemented explicit `window.confirm` with deterministic `doExit()` execution on Web and destructive-first button order on native in `TimetableWizardScreen.tsx`.
  - Updated `App.tsx` `handleBackToTab` to fallback to `Timetable` whenever leaving `TimetableWizard`.
  - Pre-populated `wizard.reviewItems` from `store.timetableEntries` so existing classes appear in "Susun Manual".
  - Added a "Jam Pelajaran" clock icon and `[🕒 X JP]` pill in `TimetableScreen.tsx` that opens `BellTimesEditor` in a modal directly on the Jadwal tab.
- **Status**: Resolved ✅
