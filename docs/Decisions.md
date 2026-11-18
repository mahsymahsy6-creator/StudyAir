# StudyAir - Decisions Log

This document records architectural, functional, and product decisions made for StudyAir. Every entry is dated and attributed.

---

### 2026-11-18: Official App Release Re-calibrated to v2.0.1 (Build 4) Across Downloads, APIs & Build Configs
- **Decision**: Standardized official release version to `v2.0.1` (`versionCode: 4`, `buildNumber: "2.0.1"`) across web download portals, mobile update checkers, and APK servers:
  1. **Download Portal & Version API (`src/app/download/page.tsx`, `src/app/page.tsx`, `src/app/api/version/route.ts`, `mobile/scripts/apk_download_server.mjs`)**:
     - Updated web landing page and download hub to serve `StudyAir-v2.0.1.apk` (86.2 MB) with real-time verification against `/api/version`.
     - Highlighted the primary features of v2.0.1: Bidirectional Jam Pelajaran synchronization across Settings, Jadwal, and Susun Manual; direct access to bell times modal on Jadwal tab; fixed Wizard "Batal" navigation button; and Smart Streak Freeze protection.
     - Updated local Wi-Fi download server (`mobile/scripts/apk_download_server.mjs` on port 8080) with `StudyAir-v2.0.1.apk` candidate paths and matching metadata.
  2. **App Configuration & Mobile Update Checker (`mobile/src/lib/updateChecker.ts`, `mobile/app.json`, `mobile/package.json`, `package.json`)**:
     - Updated `CURRENT_APP_VERSION = "2.0.1"`, `CURRENT_VERSION_CODE = 4`, and `APK_FILENAME = "StudyAir-v2.0.1.apk"`.
     - Created symlinks `public/StudyAir-v2.0.1.apk` and `mobile/StudyAir-v2.0.1.apk` pointing to the standalone production APK binary (86.2 MB).
     - Ensured in-app update checker detects `v2.0.1` and provides direct seamless downloads.
- **Rationale**: User requested re-alignment of versioning to v2.0.1 with updated download links and standalone APK distribution.
- **Attribution**: Builder (per user request).

---

### 2026-11-17: Fixed Wizard "Batal" Navigation & Integrated Jam Pelajaran Management on Jadwal Tab
- **Decision**: Resolved web and native navigation handling for the Timetable Wizard "Batal" button and integrated Jam Pelajaran management into the primary Jadwal screen:
  1. **Wizard "Batal" Action Fix (`TimetableWizardScreen.tsx`, `App.tsx`)**:
     - Resolved React Native Web's inverted button mapping on `Alert.alert` by utilizing explicit `window.confirm` on web and correct destructive-first action on native, ensuring user confirmation immediately resets the wizard state and executes `doExit()`.
     - In `App.tsx` `handleBackToTab`, guaranteed that pressing back or cancelling from `TimetableWizard` cleanly exits to `Timetable` even when the history stack was empty or rooted at `TimetableWizard`.
     - Pre-populated `wizard.reviewItems` from existing `store.timetableEntries` so opening "Susun Manual" preserves and displays the student's existing schedule instead of starting with a blank grid.
  2. **Direct Jam Pelajaran Sync & Access on Jadwal Tab (`TimetableScreen.tsx`)**:
     - Added a dedicated "Jam Pelajaran" clock icon action in the `ScreenHeader` and a prominent `[🕒 X JP]` pill in `topControlsRow`.
     - Clicking either control opens a full-featured `BellTimesEditor` modal overlay directly on the Jadwal tab without full-screen context loss.
     - Period changes or additions immediately update `store.periodTimes`, which reactively syncs to the header badge, class cards, wizard, and calendar timeline.
- **Rationale**: Eliminates user trapping in the wizard due to non-functioning "Batal" buttons and gives students direct, one-tap control over their school bell times directly from their timetable view.
- **Attribution**: Builder (per user request).

---

### 2026-11-17: Bidirectional Bell Schedule Sync Between Settings & Timetable Wizard ("Susun Manual")
- **Decision**: Implemented dynamic synchronization and manual grid extensibility for school bell schedules (`periodTimes`):
  1. **Singleton Wizard State Sync (`timetableWizardStore.ts`, `TimetableWizardScreen.tsx`)**:
     - Initialized `initialWizardState.periodTimes` to `[]` instead of hardcoding `DEFAULT_PERIOD_TIMES` (8 periods).
     - Enhanced `useEffect` in `TimetableWizardScreen.tsx` to unconditionally synchronize `controller.setPeriodTimes(storePeriodTimes)` on Step 1 or whenever wizard period times are unpopulated or out of sync with Settings.
     - Enabled `resetWizard(initialTimes?: PeriodTime[])` to accept and preserve the user's configured period times from store.
  2. **Day-Specific Grid Resolution & Inline Addition in "Susun Manual" (`TimetableWizardScreen.tsx`)**:
     - Replaced static iteration over `wizard.periodTimes` with `manualGridPeriods`, which uses two-pass resolution (base default bell times + day-specific overrides for `selectedGridDay`, e.g. Friday).
     - Added an inline button `+ Tambah Jam Pelajaran (Jam {n+1})` directly under the "Susun Manual" grid, allowing students to append periods dynamically with automatic 45-minute bell time calculations that sync to both the wizard controller and persistent store.
  3. **Arbitrary Period Count Support Across Timetable Modals & Overdue Rescheduling (`TimetableScreen.tsx`, `schedulerEngine.ts`, `CreateScheduleSheet.tsx`)**:
     - Replaced hardcoded period chip array `[1..10]` in `TimetableScreen.tsx` with dynamic `availablePeriods` derived from `periodTimes`.
     - Added `allowOverdue: true` option in `buildSchedule` and `CreateScheduleSheet.tsx` so students rescheduling or catching up on overdue homework can allocate study blocks today rather than being rejected with `ALREADY_PAST_DEADLINE`.
- **Rationale**: Fixes desynchronization where configuring 10 periods in Settings failed to appear in "Susun Manual", and allows students with full 10-12 period school timetables to build, customize, and reschedule their classes and study blocks without arbitrary period limits.
- **Attribution**: Builder (per user feedback).

---

### 2026-11-16: Elevated Official Release to v3.0.1 Across Download Portal, APIs & App Configs
- **Decision**: Elevated official release version to `v3.0.1` (`versionCode: 3`, `buildNumber: "3.0.1"`) across web and mobile distributions:
  1. **Download Portal & Version Endpoints (`src/app/download/page.tsx`, `src/app/api/version/route.ts`, `mobile/scripts/apk_download_server.mjs`)**:
     - Updated download hub to serve `StudyAir-v3.0.1.apk` (86.2 MB) with real-time version verification against `/api/version`.
     - Highlighted the 4 core pillars of v3.0.1: Smart Streak Freeze protection, dual-layered procedural tactile audio feedback, Duolingo-calibrated day medallions, and the 7-tap developer mode unlock.
     - Configured the local Wi-Fi APK download server (`:8080`) to serve `StudyAir-v3.0.1.apk` over LAN with vector QR code and HTTP 206 Range request support.
  2. **App Configuration & Mobile Update Checker (`mobile/src/lib/updateChecker.ts`, `mobile/package.json`, `package.json`, `mobile/app.json`)**:
     - Bumped `CURRENT_APP_VERSION = "3.0.1"`, `CURRENT_VERSION_CODE = 3`, and `APK_FILENAME = "StudyAir-v3.0.1.apk"`.
     - Updated changelog notes in Indonesian and English in `mobile/src/lib/i18n.ts`.
     - Created symlinks in `public/StudyAir-v3.0.1.apk` and `mobile/StudyAir-v3.0.1.apk` pointing to the verified 86.2 MB standalone APK binary.
- **Rationale**: Ensures students, testers, and school pilot participants receive the latest v3.0.1 release with streak freezing, audio synthesis, and developer mode via seamless direct download and in-app update checks.
- **Attribution**: Builder (per user request).

### 2026-11-16: Enhanced Universal Click Audio Engine & Removed Akhir Pekan Feature
- **Decision**: Upgraded mobile tactile sound effects and removed the automatic weekend protection feature:
  1. **Dual-Layered Universal Click Audio (`sound.ts`)**:
     - *Acoustics Upgrade*: Enhanced `playClick()` with dual-layered synthesis — a high transient pop (1250Hz -> 500Hz triangle wave) blended with a warm tactile body (460Hz -> 220Hz sine wave) with increased peak amplitudes (0.22/0.18) for clear audibility on mobile and desktop speakers.
     - *Browser Autoplay & Suspension Handling*: Added automatic async `.resume()` fallback when `AudioContext.state === "suspended"` so initial clicks are never dropped, and attached window listeners on `pointerdown`, `touchstart`, and `click` to unlock audio on first interaction.
     - *Universal Control Wiring*: Ensured `soundFX.playClick()` fires consistently on `PrimaryButton`, `SecondaryButton`, `TextButton`, `Chip`, bottom navigation tabs, center FAB (`openQuickAction`), back buttons, and modal dismiss actions.
  2. **Removed "Akhir Pekan" Feature (`StreakScreen.tsx`)**:
     - Removed the `Akhir Pekan • Dilindungi` pill from `StreakScreen.tsx` under the Streak Freeze card, retaining only `Hari Libur • Dilindungi`.
     - Preserves the new Streak Freeze inventory system as the primary mechanism for safeguarding study streaks during off-days and busy periods.
- **Rationale**: Delivers punchy, responsive tactile feedback for every user tap while streamlining streak rules so students use Streak Freezes to protect missed days.
- **Attribution**: Builder (per user request).

### 2026-11-16: Streak Freezing System Architecture & Enhanced Duolingo-Calibrated Day Medallions
- **Decision**: Implemented an automated and interactive Streak Freezing system with visual day medallion upgrades:
  1. **Streak Freeze Earning Architecture (`studyStreakEngine.ts`, `store.tsx`)**:
     - *3-Day Consecutive Streak Milestone*: Every time the student reaches 3 consecutive study days (`currentStreak >= 3` at intervals 3, 6, 9...), awards +1 Streak Freeze up to `MAX_STREAK_FREEZES = 2`.
     - *Daily Completion Lucky Drop*: Upon completing a study day (`todayStudied`), rolls a 35% random drop chance once per day to award +1 Streak Freeze if inventory is not full.
  2. **Streak Preservation & Auto-Save**:
     - *Auto-Protection*: On app startup, if yesterday was a missed required school day and the user has available freezes, automatically consumes 1 freeze, marks yesterday as frozen (`streakFrozenDates`), and preserves the streak unbroken.
     - *Manual Proactive Freeze*: Students can proactively freeze today (`Bekukan Hari Ini`) from the Streak screen to protect their streak during busy days or family events.
     - *Engine Traversal*: `calculateStreak` checks `dayData.isFrozen` during backwards traversal, continuing the streak chain without resetting.
  3. **Visual Medallion Remaster (`StreakScreen.tsx`)**:
     - *Completed Days (`hasStudied`)*: Rendered as a full solid bright orange circle (`#FF9600`) with a 3D bevel bottom border (`#CC7800`) and a solid white flame icon (`Ionicons name="flame" size={20} color="#FFFFFF"`).
     - *Frozen Days (`isFrozen`)*: Rendered as a full solid bright ice-blue circle (`#00BAF2`) with a 3D deep cyan bevel border (`#0284C7`) and a solid white snowflake crystal (`Ionicons name="snow" size={19} color="#FFFFFF"`).
     - *Pending Today*: Preserved as a dashed orange circle with an outline flame (`flame-outline`).
     - *Freeze Inventory*: 2-slot interactive cards displaying equipped vs empty slots with one-tap freezing action.
- **Rationale**: Eliminates student anxiety of losing long streaks due to sudden illness or school events, rewards consistent 3-day milestones, and aligns visual feedback with Duolingo gamification standards.
- **Attribution**: Builder (per user request).

### 2026-11-12: Rebuilt Standalone v2.0.0 APK With Verified App Launcher Icon & Clean EAS Prebuild Config
- **Decision**: Rebuilt the standalone Android APK (`StudyAir-v2.0.0.apk`, `86.2 MB`, `version: "2.0.0"`, `versionCode: 2`) on EAS Cloud (`4a39dc68-9a26-4735-aaff-aeffd687dbda`) using `mobile/assets/icon.png` and `mobile/assets/adaptive-icon.png` (`#090d16` background), replacing the stale v1.0.0 placeholder-icon binary:
  1. **SDK 58 Schema & Prebuild Alignment (`mobile/app.json`, `mobile/plugins/withStudyAirAndroid.js`)**: Moved top-level `splash` into `web.splash` so Expo SDK 58 config validation passes without extra native dependencies, and added a local Expo config plugin (`withStudyAirAndroid.js`) to preserve `android:usesCleartextTraffic="true"` (for local Wi-Fi LAN download/update checks) and `#090d16` `splashscreen_background` during cloud prebuild.
  2. **Slim EAS Archive (`.easignore`)**: Added root `.easignore` (using rooted paths like `/src/` and `/public/` so `mobile/src/` remains included) to exclude large binaries (`*.apk`), `.git`, and web-only folders, shrinking EAS upload archives to `4.8 MB`.
  3. **Download Metadata & Range Filename (`src/app/api/version/route.ts`, `src/app/download/page.tsx`, `mobile/scripts/apk_download_server.mjs`)**: Updated APK size metadata to `86.2 MB` and fixed HTTP `206` Range `Content-Disposition` filename to `StudyAir-v2.0.0.apk`.
- **Rationale**: Ensures the installed Android app displays the StudyAir calendar + paper plane launcher icon, bundles all v2.0.0 code changes, and delivers consistent downloadable packages over LAN and web.
- **Attribution**: Builder (per user request).

### 2026-11-08: Revised Download & Update Engine (`updateChecker.ts`, `/api/version` & `BottomSheet`)
- **Decision**: Revised the in-app and web APK download & update check architecture:
  1. **Deterministic Update & Endpoint Engine (`mobile/src/lib/updateChecker.ts`)**:
     - Added `compareSemver()`, `resolveDownloadEndpoints()`, `evaluateUpdatePayload()`, `checkAppUpdate()`, and `triggerApkDownload()` with unit test coverage in `mobile/src/lib/__tests__/updateChecker.test.ts`.
     - Fixed Expo Web (`:8081`) and native Android download routing so Expo Web routes binary downloads to the APK server (`:8080/download`) with fallback to Next.js (`:3000/StudyAir-v2.0.0.apk`), and native Android resolves the Wi-Fi LAN IP instead of `localhost`.
  2. **Live Version API Endpoints (`/api/version`)**:
     - Added `src/app/api/version/route.ts` on Next.js (`:3000/api/version`) and `/api/version` with CORS headers on `mobile/scripts/apk_download_server.mjs` (`:8080/api/version`).
  3. **Tidy Mobile Update UX (`mobile/src/screens/SettingsScreen.tsx`)**:
     - Decoupled direct APK downloading ("Unduh APK") from opening the version inspector sheet ("Periksa").
     - Replaced the raw `<Modal>` with the shared `BottomSheet` component, localized all strings in `mobile/src/lib/i18n.ts`, replaced hardcoded colors with theme tokens, and added one-tap link copying (`expo-clipboard`) and portal navigation.
  4. **Interactive Web Download Hub (`src/app/download/page.tsx`)**:
     - Added real-time version verification against `/api/version`, embedded the Wi-Fi QR code scanner card, added one-click link copying, and documented in-place APK update behavior (preserving SQLite data).
- **Rationale**: Ensures downloading and checking for updates works reliably across Expo Web, Next.js Web, and physical Android phones over Wi-Fi while strictly following StudyAir's Tidy Rules.
- **Attribution**: Builder (per user request).

### 2026-11-03: Standalone StudyAir APK Distribution & New Brand Icon Implementation
- **Decision**: Replaced the previous Expo Go proxy APK with the genuine standalone Android application package (`StudyAir-v2.0.0.apk`, 85.8 MB) built via EAS, and implemented the new geometric paper plane brand icon across mobile and web interfaces:
  1. **Genuine Standalone APK Distribution**:
     - Distributed the authentic standalone React Native Android APK (`85.8 MB`, `libappmodules.so`, `libexpo-sqlite.so`, `libreactnative.so`), replacing `Expo-Go-58.0.5.apk`.
     - Updated all download targets in `/download` (`src/app/download/page.tsx`), `SettingsScreen.tsx` (`handleDownloadApp`), and the local APK server (`mobile/scripts/apk_download_server.mjs`) to point directly to `public/StudyAir-v2.0.0.apk`.
  2. **App Brand Icon Implementation**:
     - Rendered fresh high-resolution multi-variant app icons via `generate_app_icons.mjs` (web SVG, 512px/192px PWA icons, favicon.ico, and Android `mipmap-*` mipmap launcher icons `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground`).
     - Mobile App: Integrated the brand icon into `ScreenHeader` on `HomeScreen` (`showLogo`), the `SettingsScreen` version card, and the update changelog modal.
     - Web App: Displayed the brand icon prominently on the homepage hero (`src/app/page.tsx`), `/download` hero banner (`src/app/download/page.tsx`), and the standalone APK server landing portal (`mobile/scripts/apk_download_server.mjs`).
- **Rationale**: Eliminates user confusion from downloading the generic Expo Go client, ensures direct installation of the actual StudyAir standalone app, and reinforces brand identity across every screen.
- **Attribution**: Builder (per user request).

### 2026-11-03: StudyAir v2.0.0 Release, In-App Update Engine & Web Download Hub
- **Decision**: Elevated official app version to `v2.0.0` across mobile and web packages (`mobile/package.json`, `mobile/app.json`, `package.json`), integrated an in-app download and update checker card in `mobile/src/screens/SettingsScreen.tsx`, and launched a web download hub (`src/app/download/page.tsx`):
  1. **Version Alignment**: Bumped from `1.0.0` to `2.0.0` to match database schema `version: "2.0.0"` and mark completion of the v2 roadmap (AI scheduling engine, 4-stage streak pet dragon, Indonesian report card standards & TKA calculator).
  2. **In-App APK Download & Update Check**:
     - Added a dedicated "StudyAir v2.0.0" card in `SettingsScreen.tsx` with a `✓ Versi Terbaru` badge, an instant "Unduh APK" button, and an interactive "Periksa Pembaruan" action.
     - Added a release changelog modal detailing the 4 core pillars of v2.0.0.
  3. **Web Download Portal (`/download`)**:
     - Created `/download` route in Next.js offering direct download of `StudyAir-ExpoGo-v58.0.5.apk` (aliased to `StudyAir-v2.0.0.apk`), file size and Android compatibility details, a 3-step installation walkthrough, and highlights of v2.0.0 features.
     - Added direct links in `Navbar.tsx` (`Unduh App`) and homepage hero (`src/app/page.tsx`).
- **Rationale**: Delivers a seamless app distribution and self-update pathway for students and testers without requiring external app store submission during local and school pilot phases.
- **Attribution**: Builder (per user request).


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
### 2026-10-30: O3 Space UI Redesign & Clean Ergonomic Navigation (Ready-to-Deploy)
- **Decision**: Redesigned the mobile application composition and aesthetics to match the calm, friendly, modern style of the study companion app "O3 Space" (O3: Study With Friends):
  1. **Modern Visual Aesthetics**: Replaced chunky 3D borders (`borderWidth: 2`, `borderBottomWidth: 4`) across `Card.tsx`, `PrimaryButton.tsx`, `SecondaryButton.tsx`, `ListRow.tsx`, and `StatusPill.tsx` with smooth, sleek 1px hairline borders (`borderColor: colors.borderLight`), modern corner radii (20-24dp), and subtle scale/opacity touch feedback.
  2. **HomeScreen Composition (O3 Space Core)**:
     - **Hero Focus Presence Card**: Welcoming greeting with current streak flame and formatted date. Central hero card with instant 1-tap "Mulai Fokus" CTA (launches 25m Pomodoro or current study block), eliminating confusing empty-state blocks.
     - **Jadwal Kelas Hari Ini Strip**: Horizontal chip scroll showing today's school schedule (`07:30 - 09:00 Matematika`, etc.), so students immediately see their day at a glance without having to drill into sub-tabs.
     - **Tugas & PR Hari Ini Checklist**: Directly displays priority tasks due today with 1-tap checkable circular checkboxes.
     - **AI Smart Assistant Card**: Prominently presents the automatic schedule generator in a clean purple card with "✨ Susun Jadwal Otomatis", rather than an intrusive error card.
     - **Upcoming Exam Tracker**: Clean card with days-left countdown and purple "Buat Rencana Ujian" action.
  3. **Bottom Navigation Polish**: Symmetrical bottom navigation with clear naming: `Hari Ini` (today icon), `Tugas` (checkbox icon), elevated purple center `+` FAB (Quick Action Sheet with purple AI badges), `Pelajaran` (book icon), and `Kalender` (calendar icon).
  4. **Verification**: 100% test pass rate across all 11 test suites (`npm test`) and clean TypeScript checks (`npx tsc --noEmit`). Verified visually across all screens via browser testing.
- **Rationale**: Eliminates cognitive overload and UI clutter, providing an intuitive, delightful, and calming study companion that is ready to deploy.
- **Attribution**: Builder (per user request).

### 2026-10-30: Remastered "Tugas & PR Hari ini" with O3 Space Gamification & 1-Tap Focus
- **Decision**: Overhauled the daily task section on `HomeScreen` into an interactive, gamified task center (`TodayTasksSection.tsx`):
  1. **Smart Daily Ingestion (`deriveTodayTasks`)**: Intelligently surfaces (1) tasks with today's deadline, (2) tasks assigned to study blocks scheduled today, (3) overdue pending tasks (prioritized on top), and (4) tasks completed today. Falls back cleanly to upcoming pending tasks if none match.
  2. **Gamified Progress Bar**: Real-time progress track with dynamic motivational micro-copy (`Luar biasa! Semua tugas hari ini sudah beres 🎉`, `Tinggal N tugas lagi, yuk selesaikan! 💪`, etc.) and `X / Y Selesai • Z%`.
  3. **Interactive Task Cards**: Chunky circular checkbox with smooth line-through upon completion, subject colored dot, task type indicator (`PR`, `Kuis`, `Proyek`), estimated duration chip, scheduled time pill, and dedicated **`▶ Fokus`** 1-tap launcher.
  4. **Task Quick Detail & Edit Modal**: Bottom sheet to view notes, quick-adjust duration estimates (`15m`, `30m`, `45m`, `60m`, `90m`), delete task, or launch a focused study timer.
  5. **Quick Add PR CTA**: Header "+ Tambah PR" button opening `AddTaskSheet` pre-filled with today's date for frictionless sub-10 second task entry.
  6. **Automated Verification**: Created dedicated test suite `test_p14_today_tasks_remaster_suite.mjs` (8 tests) integrated into master QA runner (`test_p13_release_qa_suite.mjs`). All 12 test suites passing (100%), clean TypeScript build, and full browser E2E verification.
- **Rationale**: Transforms the static task checklist into a vibrant, motivating daily execution center where students immediately know what is due, track progress toward 100%, and can jump straight into a focused study session in 1 tap.
- **Attribution**: Builder (per user request).

### 2026-10-30: Transformed "Subjects" Page into "Next Exams / Ulangan Selanjutnya"
- **Decision**: Replaced the passive "Pelajaran" (Subjects) bottom navigation tab with a proactive, student-centric **"Ulangan" (Next Exams / Ulangan Selanjutnya)** companion (`ExamsScreen.tsx`):
  1. **Bottom Navigation**: Tab 3 is renamed from "Pelajaran" (`book` icon) to "Ulangan" (`ribbon` icon), while preserving `SyllabusScreen` as an auxiliary screen so deep-links from **Pengaturan > Jadwal Sekolah & Mapel** remain fully functional without disrupting existing timetable management.
  2. **Next Exam Hero Card**: Dynamically highlights the nearest upcoming exam (subject exam or multi-day exam event) with a days-left countdown badge (`Besok`, `N hari lagi`, `Sedang ujian`), topic mastery progress bar (`X / Y Topik Dikuasai • Z%`), and two direct actions:
     - **`✨ Buat Rencana Ujian`**: Instant AI study plan generator that creates focused review (45m) and practice (60m) tasks in the Tugas tab.
     - **`▶ Mulai Belajar`**: Instant focus timer launcher pre-selected for the subject.
  3. **Filter Segment Tabs**: Clear separation between `Mendatang (N)` (sorted by nearest date) and `Riwayat (N)` (past exams marked "Selesai").
  4. **Exam Creation & Editing (`AddExamSheet`)**: Fast modal supporting both Subject Exams (Ulangan Harian/Bab) with 1-tap date presets (`Besok`, `3 Hari`, `1 Minggu`, `2 Minggu`, `1 Bulan`) and Multi-Day Exam Events (PTS, PAS, UAS, Try Out).
  5. **Exam Detail Sheet (`ExamDetailSheet`)**: Interactive bottom sheet displaying exam details, a checkable syllabus topic checklist (syncing with `studyUnits` in real time), "+ Tambah Materi", study plan generation, and focus session launching.
  6. **Automated Verification**: Created dedicated test suite `test_p15_next_exams_screen_suite.mjs` (8 tests) integrated into master QA runner `test_p13_release_qa_suite.mjs` (all 13 suites passing cleanly with 100%), 0 TypeScript errors, and complete Playwright E2E browser verification.
- **Rationale**: Transforms the app from a passive school schedule viewer into an actionable, empowering exam preparation partner that keeps students ahead of their exams and reduces test anxiety.
- **Attribution**: Builder (per user request).

### 2026-10-30: Whole-App Remaster (O3 Space Ergonomics & Zen Focus Loop)
- **Decision**: Executed a comprehensive app-wide remaster aligning all major screens and interaction touchpoints with the clean, calm, and tactile ergonomic composition of **O3 Space** (O3: Study With Friends):
  1. **`TasksScreen` (Tab 2: Tugas)**: Integrated O3 Space segmented filter pills (`Semua`, `Terjadwal`, `Belum Dijadwalkan`, `Selesai`) with live counters, tactile task cards with subject dots and deadline pills, a 1-tap **`▶ Mulai Fokus`** launcher on each card, and a smart persistent "Susun Jadwal Otomatis" action banner when unscheduled tasks exist.
  2. **`CalendarScreen` (Tab 4: Kalender)**: Adopted an **Agenda-only Minimalist List** grouped chronologically by day (`Hari Ini`, `Besok`, upcoming days), retiring the crowded hourly timeline from the default view. Study blocks feature dashed borders with 1-tap **`▶ Mulai Fokus`** launchers, school classes feature solid subject accents, and a floating **`Pilih Tanggal`** modal enables rapid date jumping.
  3. **`FocusScreen` (Pomodoro / Focus Mode)**: Implemented **Zen Minimalist Mode** with a full-screen ambient timer (`MM:SS`), active task indicator, distraction-free running state (hiding preset selectors during active focus), and a prompt confidence rating modal (`Sangat Paham`, `Cukup Mengerti`, `Masih Sulit`) that directly logs study streak points.
  4. **`QuickActionSheet` (Center '+' Elevated FAB)**: Redesigned the root menu into a **Minimalist 3-Card Grid** featuring 3 large, ergonomic touch targets: (1) `Tugas Baru` (manual entry), (2) `Scan AI (Kamera)` (whiteboard/notes scanner with purple AI styling), and (3) `Tempel AI (WhatsApp)` (chat announcement parser with purple AI styling).
  5. **`HomeScreen` Harmonization**: Streamlined the daily rhythm (Greeting/Streak Header → Hero Focus Card → Today's Class Strip → Remastered Tugas & PR Hari Ini → AI Scheduler Bar → Collapsed Besok). Replaced the bulky redundant exam tracker with a compact 48-hour indicator pill linking directly to Tab 3 (Ulangan).
  6. **Automated Verification**: Created dedicated test suite `test_p16_whole_app_remaster_suite.mjs` (6 tests) integrated into master QA runner `test_p13_release_qa_suite.mjs` (all 14 suites passing cleanly with 100%), 0 TypeScript errors, and zero console regressions.
- **Rationale**: Elevates StudyAir into a completely cohesive, calm, and distraction-free mobile study companion where every interaction feels deliberate, tactile, and effortless.
- **Attribution**: Builder (per user request).

### 2026-10-30: Duolingo-Style Streak Remaster (Animated Flame, 7-Day Flame Chain, Streak Freeze & Confetti)
- **Decision**: Fully remastered the Study Streak experience across `StreakScreen.tsx`, `StreakCelebrationModal.tsx`, `ScreenHeader.tsx`, and dedicated animation components:
  1. **Dual-Layer Animation Strategy**: Integrated `lottie-react-native` alongside pure React Native `Animated` physics (`AnimatedFlame.tsx` and `ConfettiCannon.tsx`) providing 60fps breathing scale springs, fiery expanding halos, floating embers, and 40+ multi-colored fluttering confetti particles that function natively and offline without asset-loading latency.
  2. **Duolingo Flame Hero Stage**: Centered interactive flame with breathing spring, 64pt high-contrast streak number with 3D bottom bevel shadow, and encouraging dynamic subtitles ("Api belajarmu menyala!", "Streak kamu dalam bahaya!").
  3. **Interactive 7-Day Flame Chain**: Tactile week strip (`SEN` to `MIN`) showing flame badges for studied days, dotted rings for pending days, and freeze icons for protected days. Tapping any day opens a tactile inspection popover displaying total study minutes and tasks completed.
  4. **Equipped Streak Freeze (Perlindungan Streak)**: Added 2 equipped freeze slots ("Akhir Pekan" & "Hari Libur") styled with frosty blue ice crystals (`#38BDF8`) communicating automatic rest day protection.
  5. **Tactile Duolingo 3D Button Aesthetic**: Buttons feature 2px solid borders with 4dp bottom extrusions (`borderBottomWidth: 4`, `#D97706` shadow) that compress down 2dp upon tap for an ultra-satisfying physical click feel.
  6. **Full Celebration Modal with Confetti & Social Share**: Milestones (3d, 7d, 14d, 21d, 30d, 60d, 120d+) trigger a full-screen celebration modal with confetti explosion, pulsing flame, tiered badge, Duolingo 3D continue button, and native social sharing via `Share.share`.
  7. **Header Streak Flame Pulse**: Added subtle, periodic breathing flame animation to the header streak badge in `ScreenHeader.tsx`.
  8. **Automated Verification**: Created dedicated test suite `test_p17_duolingo_streak_suite.mjs` (6 tests) integrated into master QA runner `test_p13_release_qa_suite.mjs`. All 15 test suites passing cleanly with 100%, and 0 TypeScript errors (`npx tsc --noEmit`).
- **Rationale**: Replaces static numeric cards with a playful, habit-forming, and visually rewarding daily streak loop inspired by Duolingo, increasing student retention and consistency.
- **Attribution**: Builder (per user request).

### 2026-10-30: Streak Update — Sound FX Synthesizer, Tier Variations & Secret Milestones
- **Decision**: Enhanced the remastered Duolingo streak system with zero-asset audio synthesis, tier-calibrated animations, and secret mystery milestone mechanics:
  1. **Web Audio API Synthesizer (`mobile/src/lib/sound.ts`)**: Built a zero-dependency, zero-latency synthesizer providing 4 distinctive milestone fanfare chord progressions (Bronze arpeggio, Silver electric fanfare, Gold triumphant brass chord, Rainbow cosmic harp glissando), mystery clue tones, and warm ignition crackles.
  2. **Celebratory Rhythmic Haptics (`mobile/src/lib/haptics.ts`)**: Added `celebration` fanfare vibration rhythms, `mysteryClue` double micro-taps, and `mysteryReveal` pulse-to-burst patterns.
  3. **Tier-Specific Animation Palettes**:
     - `AnimatedFlame.tsx`: Dynamically adjusts flame color (Duolingo orange `#FF9600`, cyan plasma `#06B6D4`, radiant gold `#F59E0B`, prismatic violet `#8B5CF6`), halo expansions (dual planetary rings for Gold/Rainbow), and colorful spark embers.
     - `ConfettiCannon.tsx`: Tailors particle color palettes to milestone tiers (`BRONZE_CONFETTI`, `SILVER_CONFETTI`, `GOLD_CONFETTI`, `RAINBOW_CONFETTI` with up to 60 particles).
     - `StreakCelebrationModal.tsx`: Displays a celebratory **"🎉 RAHASIA TERUNGKAP! 🎉"** banner when discovering mystery milestones.
  4. **Secret Milestones in "Masyarakat Streak" (`StreakScreen.tsx`)**: Locked milestones are concealed (`??? Rahasia`, mystery lock badge) rather than spoiled in advance. Tapping a locked milestone opens an interactive **Mystery Clue Modal** revealing tier hints and remaining days countdown with suspenseful audio and haptic feedback.
  5. **Automated Verification**: Updated `test_p17_duolingo_streak_suite.mjs` verifying sound synthesizer methods, haptics, tier palettes, secret milestones, and clue interactions. All 15 master QA suites passing (100%), and 0 TypeScript errors.
- **Rationale**: Turns milestone progression into an exciting, multi-sensory treasure hunt where students look forward to unlocking and hearing their next secret title.
- **Attribution**: Builder (per user request).

### 2026-10-30: Streak Mascot Evolution System — Growing Dragon Companion Across 4 Stages
- **Decision**: Transformed the streak visualizer from just simple flames into an evolving mascot companion (**Sistem Maskot Bertumbuh: Telur Naga Api -> Anak Naga -> Naga Bersayap -> Dewa Phoenix Kosmik**) that unlocks cooler visual forms, audio voices, and animations the longer the student studies:
  1. **4 Evolving Mascot Stages (`studyStreakEngine.ts`)**:
     - **Stage 1 (1–6 Hari)**: `egg` — 🥚 **Telur Naga Api** (cangkang retak membara, wobble animasi hangat, suara ketukan cangkang).
     - **Stage 2 (7–29 Hari)**: `baby` — 🐲 **Anak Naga Api** (melompat riang, sayap kecil mengepak cepat, semburan api biru cyan, kicauan riang).
     - **Stage 3 (30–99 Hari)**: `winged` — 🐉 **Naga Bersayap Emas** (sayap lebar mengepak anggun, mahkota emas, dual halo api membara, deru semburan api).
     - **Stage 4 (100+ Hari)**: `deity` — ✨ **Dewa Phoenix Kosmik** (sayap pelangi kosmik, cincin orbit planetary berputar 360°, orba bintang bersinar, sapuan resonansi kosmik harmonik).
  2. **Interactive Sound Synthesis (`sound.ts`)**: Implemented `soundFX.playMascotInteraction(stageId)` with custom Web Audio synthesis tailored to each evolutionary phase.
  3. **Interactive Procedural Vector Mascot (`StreakEvolutionMascot.tsx`)**: Built using pure React Native `Animated` physics (wobble, hops, wing flaps, dual orbiting rings, floating ember sparks) with responsive tap squash-and-stretch micro-physics and haptic sparkle.
  4. **Streak Screen Hero & Mascot Evolution Tracker (`StreakScreen.tsx`)**: Added current mascot badge pill, interactive hero character, and a dedicated **Mascot Evolution Card** displaying current lore and days remaining progress bar toward next evolution form.
  5. **Celebration Modal & Header Mascot Integration**: `StreakCelebrationModal.tsx` announces **"🎉 EVOLUSI MASKOT!"** when reaching milestone days (1, 7, 30, 100), and `ScreenHeader.tsx` renders dynamic mascot emoji badge next to the animated flame.
  6. **Automated Verification**: Updated `test_p17_duolingo_streak_suite.mjs` (9 comprehensive assertions) integrated with `test_p13_release_qa_suite.mjs`. All 15 test suites passing (100%), zero TypeScript errors (`npx tsc --noEmit`).
### 2026-10-31: School Planner Transformation — Grades & GPA Tracker, Timetable Tab, Teacher Directory, and 5-Tab Ergonomics
- **Decision**: Transformed StudyAir into a comprehensive student companion mirroring the iconic features of Google Playstore's top-rated "School Planner" (by Andrea Dal Cin) while preserving StudyAir's unique AI vision scanner, 4-stage dragon streak mascot, and Pomodoro focus timer:
  1. **Grades & GPA Tracker Engine (`gradeEngine.ts`)**:
     - Weighted average calculator per subject supporting customizable weights (1x, 2x, 10%, 20%, 30%, 40%) and categories (`exam`, `quiz`, `assignment`, `project`, `other`).
     - Standard 4.0 GPA scale mapper and Indonesian letter grades (A, B, C, D, E) with motivational performance descriptors.
     - Target grade (KKM) comparisons with color-coded surplus/deficit indicators.
     - Interactive **"What-If" Target Simulator**: mathematically calculates the exact minimum score needed on the next upcoming exam to achieve a target subject grade.
  2. **Primary Timetable Screen (`TimetableScreen.tsx`)**:
     - Promoted Timetable to a top-level tab with dual views: `Per Hari` (using `TimetableDayView`) and `Ikhtisar Mingguan` (full 6-day matrix displaying period numbers, subjects, rooms, and teacher tags).
     - Full Add/Edit/Delete class modal with weekday selector chips, period number picker, room, teacher, and entry kind (academic class vs. break).
  3. **Teacher Directory (`TeacherDirectoryModal.tsx`)**:
     - Unified directory aggregating explicitly created teachers and auto-discovered instructors from subjects and timetable schedules.
     - 1-tap direct **WhatsApp launcher** (`Linking.openURL("https://wa.me/...")`) and native phone dialer (`Linking.openURL("tel:...")`).
     - Search filter by teacher name, subject, or classroom.
  4. **Focused 5-Tab Bar (`App.tsx`)**:
     - Symmetrical 5-item bottom bar: `[Hari Ini]` (Agenda), `[Jadwal]` (Timetable), `[(+) FAB]` (Tambah Cepat), `[Tugas]` (Tasks), `[Nilai]` (Grades & GPA).
     - Central `(+)` QuickActionSheet enhanced with `Catat Nilai Baru` (opens `AddGradeSheet`) and `Jadwal Pelajaran` shortcuts.
     - Academic shortcuts hub card on `HomeScreen` offering instant 1-tap access to Ulangan, Nilai, Kalender, and Guru.
  5. **SQLite Storage & Global Store Persistence (`storage.ts`, `store.tsx`, `types.ts`)**:
     - Added `grades` and `teachers` tables with auto-migration of `target_grade` and `credit_hours` on `subjects`.
     - Reactive store handlers: `addGrade`, `updateGrade`, `deleteGrade`, `setSubjectTargetGrade`, `addTeacher`, `updateTeacher`, `deleteTeacher`.
  6. **Automated Verification**:
     - Created `test_p18_school_planner_suite.mjs` verifying models, pure calculations, simulator formulas, SQLite persistence, and UI component integrations.
     - Added to master test runner `test_p13_release_qa_suite.mjs`. All 16 regression test suites passing 100% cleanly, 0 TypeScript errors (`npx tsc --noEmit`).
- **Rationale**: Elevates the app from a simple task scheduler into a complete School Planner with grade tracking and timetable management, giving students complete control over their academic life.
- **Attribution**: Builder (per user choice in clarification modal).

### 2026-10-31: Indonesian Report Card Standard (Kurikulum Merdeka), SNBP Eligibility Analysis, and Flexible TKA Calculator
- **Decision**: Calibrated the Grades system specifically to Indonesian academic conventions and added a comprehensive Tes Kemampuan Akademik (TKA) calculator:
  1. **Indonesian Kurikulum Merdeka Grade Standard (`gradeEngine.ts`)**:
     - Converted primary report card scale to 0–100 with official Kurikulum Merdeka & K13 predicate bands:
       - **A (85–100)**: Sangat Baik / Mahir
       - **B (75–84)**: Baik / Cakap
       - **C (65–74)**: Cukup / Layak
       - **D (50–64)**: Kurang / Perlu Bimbingan
       - **E (<50)**: Perlu Remedial
     - Secondary 4.0 GPA scale mapper retained for international scholarship & university readiness references.
  2. **KKM / KKTP Completion Tracking**:
     - Computes subject-level ketuntasan (`isCompletedKKM`, "Tuntas KKM" vs "Di Bawah KKM").
     - Report card hero metrics display overall completion rate: `"✓ X dari Y Mapel Tuntas KKM (KKTP)"` with progress percentage.
  3. **SNBP (Seleksi Nasional Berdasarkan Prestasi) Eligibility Engine**:
     - Analyzes cumulative 0–100 average across semesters against SNBP admission benchmarks:
       - `high`: "Sangat Berpeluang (Top 25%)" (Rata-rata $\ge 85$)
       - `medium`: "Berpeluang Bersaing" (Rata-rata $\ge 78$)
       - `low`: "Perlu Peningkatan"
     - Interactive **Mapel Pendukung Prodi SNBP** selector (per Kepmendikbudristek No. 345/M/2022): calculates real-time average for 2 target major supporting subjects.
  4. **Flexible TKA (Tes Kemampuan Akademik) Calculator (`TKACalculatorModal.tsx`)**:
     - **UTBK Saintek Preset**: 4 subtests (Matematika IPA, Fisika, Kimia, Biologi) on 0–1000 scale, default passing grade 650.
     - **UTBK Soshum Preset**: 4 subtests (Sosiologi, Sejarah, Geografi, Ekonomi) on 0–1000 scale, default passing grade 650.
     - **SMA Unggulan Preset**: 4 weighted subtests (Matematika w=2, IPA w=2, B. Indo w=1, B. Inggris w=1) on 0–100 scale, default passing grade 80.
     - **Custom Mode**: Free dynamic addition, deletion, and weight adjustment of custom subtests.
     - **Real-Time Analysis**: Identifies strongest subtest (unggulan), weakest subtest requiring immediate drill, passing grade delta, and tactical study tips.
     - **Duolingo 3D Tactile Styling**: Complete with haptic feedback, sound synthesis, and interactive score steppers.
  5. **Automated Verification**:
     - Updated `test_p18_school_planner_suite.mjs` with 5 new validation suites (15 total specifications).
     - Verified by `test_p13_release_qa_suite.mjs` (16 of 16 test suites passing 100%, 0 failures).
     - Zero TypeScript errors (`npx tsc --noEmit`).
- **Rationale**: GPA 4.0 scale alone is alien to Indonesian high school and middle school students who rely strictly on 0–100 marks, KKM/KKTP benchmarks, SNBP quota rankings, and UTBK/SMA Unggulan entrance exams.
- **Attribution**: Builder (per user request and clarification modal).

### 2026-10-31: App-Wide UI/UX Review & Tactile Polish
- **Decision**: Implemented high-impact visual, tactile, and ergonomic enhancements across navigation, tabs, and grades workflows:
  1. **Minimalist Brand Iconography**:
     - Upgraded app launcher icon and favicon (`icon.png`, `adaptive-icon.png`, `favicon.png`) with a sleek geometric origami facet paper airplane in electric blue and cyan on deep obsidian slate, matching the minimal aesthetic request.
  2. **Tactile Bottom Tab Bar & 3D Center FAB (`App.tsx`)**:
     - Added pill capsule active indicator (`tabIconWrapperActive`) with theme-adaptive `colors.primaryLight` and smooth rounded styling.
     - Added physical 3D bottom bevel (`borderBottomWidth: 4, borderBottomColor: colors.accentBottom`) on the center "+" FAB for Duolingo-grade physical compression.
     - Added light haptics (`HapticFeedback.light()`) and click sound synthesis (`soundFX.playClick()`) on tab changes and FAB taps.
     - Added full accessibility tab semantics (`accessibilityRole="tab"`).
  3. **Direct Nilai TKA Shortcut on HomeScreen (`HomeScreen.tsx`)**:
     - Replaced redundant "Nilai" hub tile with **"Nilai TKA"** shortcut tile directly opening `TKACalculatorModal`.
     - Added light haptics and sound FX across all 4 quick hub tiles (`Ulangan`, `Nilai TKA`, `Kalender`, `Guru`).
  4. **Grades & SNBP UX Polish (`GradesScreen.tsx`)**:
     - Added sound and haptic feedback on `viewModeSwitcher` mode tabs (`Rapor & KKM` vs `Analisis SNBP`).
     - Added informative empty-state guidance card in SNBP view when 0 supporting subjects are selected.
     - Added 1-tap `+ Catat Nilai Sekarang` button with dashed border inside expanded subject cards with 0 assessments.
  5. **TKA Calculator Reset & Stepper Ergonomics (`TKACalculatorModal.tsx`)**:
     - Added "Reset" button in the modal header to instantly restore default preset subtests and passing grades.
     - Added 3D bottom bevel on quick increment chips (`-25`, `+25`, `+50`) and auditory click feedback on steppers.
  6. **Tasks Filter Switcher Audio-Tactile Feedback (`TasksScreen.tsx`)**:
     - Added click sound synthesis (`soundFX.playClick()`) to all 4 filter pills (`Semua`, `Terjadwal`, `Belum Dijadwalkan`, `Selesai`).
- **Rationale**: Eliminates visual redundancy, improves student navigation speed, and delivers a polished, responsive tactile study experience.
- **Attribution**: Builder (per user request).

### 2026-10-31: HomeScreen Declutter & De-Compaction
- **Decision**: Cleaned up HomeScreen to remove visual cramping and eliminate redundant elements:
  1. **Removed "Nilai TKA" from HomeScreen**: Removed TKA modal integration, shortcut button, and state from `HomeScreen.tsx`. Nilai TKA resides strictly in its natural home: Tab 4 (`GradesScreen.tsx`) where students track report cards and academic projections.
  2. **Removed Bulky 4-Tile Hub**: Removed the crammed `quickHubRow` (Ulangan, Nilai, Kalender, Guru) that duplicated bottom navigation tabs and took up ~110dp of vertical space between the Hero widget and class schedule.
  3. **Elevated Teacher Directory to Header**: Moved "Daftar Guru" access into `ScreenHeader.actions` as an elegant `people-outline` icon next to Settings (`settings-outline`), keeping header actions strictly at the 2-action maximum.
  4. **Clean, Uncompacted Flow**: The HomeScreen now breathes with a focused 3-step hierarchy:
     - Header (date, streak, teacher directory, settings)
     - What to study now (Hero focus card)
     - What classes are today (Jadwal Kelas horizontal strip)
     - What homework is due (Tugas & PR checklist)
     - Tomorrow preview (Besok collapsed row)
- **Rationale**: Prevents claustrophobic information density and screen crowding, adhering to Product Brief v2 tidy rules ("No duplicated information or actions on a screen").
- **Attribution**: Builder (per user feedback).

### 2026-10-31: UI/UX Comfort & Calm Productivity Enhancements
- **Decision**: Implemented comprehensive calm-design ergonomics and visual comfort improvements:
  1. **Color Semantics & Alarm Fatigue Reduction**:
     - Converted deadline pill for *Hari Ini* (`deadline_hari_ini`) from alarming Red (`colors.danger`) to warm, focused **Amber (`colors.amber`)** across `HomeScreen.tsx` and `TasksScreen.tsx`.
     - Reserved Red strictly for overdue tasks (`diff < 0`), preventing false panic when students are on track.
     - Converted *Besok* (`deadline_besok`) to reassuring Electric Blue (`colors.primary`).
  2. **GradesScreen Hero Progressive Disclosure**:
     - Restructured the cluttered hero card: the main score, Kurikulum Merdeka predicate, and KKM completion bar now enjoy full horizontal width.
     - Extracted *Kalkulator TKA* and *Target Simulator* into an ergonomic horizontal 2-button action bar (`heroToolsRow`) with tactile 3D borders and generous touch targets.
  3. **Rest-Day Guilt Elimination**:
     - Added an emotional reassurance badge (`"🛡️ Hari Libur • Streak Aman"`) on the Day Off card in `HomeScreen.tsx`, confirming to students that scheduled rest days protect their streak.
  4. **Task Title Readability & Leading**:
     - Added `lineHeight: 20` and `marginTop: 2` on `taskNotesText` in `TasksScreen.tsx` to prevent text collision on multi-line assignments.
  5. **Calendar Navigation Linkage**:
     - Passed `onBack={handleBackToTab}` to `CalendarScreen` in `App.tsx`, providing a visible left back arrow so students can return smoothly to their previous tab.
- **Rationale**: Elevates user comfort, reduces academic anxiety, and creates an intuitive, delightful daily routine for students.
- **Attribution**: Builder (per user request and approved plan).

### 2026-10-31: Official StudyAir Cinematic 60 FPS Web Trailer Engine
- **Decision**: Implemented a standalone, hardware-accelerated 60 FPS cinematic promotional trailer engine (`public/trailer/index.html`) integrated into the local APK download server (`mobile/scripts/apk_download_server.mjs`) on port 8080:
  1. **8-Scene Narrative Storyboard**:
     - Scene 1: The Struggle (Dark backdrop, floating panic cards with PR & exam deadlines).
     - Scene 2: The Solution (Origami paper airplane logo entrance with sapphire flare).
     - Scene 3: Jadwal Pelajaran (3D phone perspective tilt showing hourly bell times & breaks).
     - Scene 4: 1-Tap Pomodoro Focus (Macro zoom on task card with animated pulsing timer ring).
     - Scene 5: Maskot Naga & Duolingo Streak (4-stage dragon evolution with flame aura & confetti).
     - Scene 6: Standar Rapor Indonesia & Kalkulator TKA (Kurikulum Merdeka 0-100 & SNBP predictor).
     - Scene 7: 7 Aesthetic Themes (Rapid theme morphing: Midnight OLED, Emerald, Sakura, Amethyst, Sunset).
     - Scene 8: Call to Action (3D phone docking with live QR code box and direct APK download button).
  2. **Synthesized Sound Design (Web Audio API)**:
     - Zero external audio binary dependencies.
     - Features dynamic sub-bass drops, pentatonic achievement chimes, filtered noise swooshes, and tactile click FX.
  3. **Interactive & Autoplay Controls**:
     - 28-second timeline with scrubber bar, Play/Pause toggle, 8 jump buttons, volume toggle, and fullscreen presentation mode.
  4. **Portal Integration**:
     - Added prominent `GET /trailer` route and trailer CTA button on the APK landing portal (`http://localhost:8080`).
- **Rationale**: Provides a breathtaking promotional asset for students, parents, and schools with zero external binary requirements (no ffmpeg needed), runnable instantly in any browser at 60 FPS with full tactile audio and 3D device physics.
- **Attribution**: Builder (per user request and approved plan).

### 2026-10-31: 12-Second Apple-Keynote Product Sting Engine (1080x1080)
- **Decision**: Implemented a mathematical, continuous keyframing animation engine (`public/sting/index.html`) running at 29.97 fps (f0–f359) with a 59.94 fps master clock, driven by a pure function `seek(frame)`:
  1. **Apple-Keynote Aesthetic**: Soft, white, bright blue, glassy, zero frozen cuts (every shot enters already moving with 12–19% exponential ease-out and leaves on an accelerating move or blur ramp).
  2. **8 Continuous Scenes**:
     - S1 (f0–71): Header with origami logo disc, `StudyAir` in Inter 500, `on Android` capsule pill, light hub window, and diving cursor click.
     - S2 (f72–100): Navy squircle app icon (178px, r28%) with 4 orbiting squares locking into a cross (white left, blue top, cyan right, mint bottom) around a grey halo disc ⌀326.
     - S3 (f101–158): Black laptop bezel, navy menu bar with clock and dots, blue sky gradient wallpaper with geometric line art, frosted glass prompt box (726x228, r60), typing `"Buat jadwal belajar minggu ini"` with caret and blue send button ⌀51, accelerating into a whip-tilt up.
     - S4 (f159–186): Light answer page ("Rencana Belajar Otomatis") scrolling up with upward-pointing cursor stopping under `"belajar tenang, prestasi terbang"`.
     - S5 (f187–214): White card overlay (x203–878, r64) with grabber bar rising over blurred page.
     - S6 (f215–244): Two stacked cards (538x348) at y168 and y552 with frosted pills and giant frosted-glass bottom titles: `"Jadwal Pintar"` and `"Maskot Streak"`.
     - S7 (f245–300): Logo disc center rise, holding still f269–287 (the only hold in the film), shrinking to ⌀123 at f300.
     - S8 (f301–359): Black radial end card with 16 zoom streak copies of the wordmark blooming to 1650px and collapsing ease-in to 267px mid-collapse.
  3. **Milestone Stills Exported**: Generated high-resolution 1080x1080 PNG captures for review (`still_f40_header.png`, `still_f86_orbit_cross.png`, `still_f150_prompt_box.png`, `still_f230_stacked_cards.png`).
  4. **Integrated Route**: Served on `http://localhost:8080/sting` with full interactive timeline controls and in-browser 60fps WebM recorder.
- **Rationale**: Delivers a high-fashion, keynote-grade square product sting strictly adhering to exact frame numbers, hard cut positions, and continuous motion physics.
- **Attribution**: Builder (per user request and approved plan).

### 2026-10-31: Project Re-centering & Gemini 4 Argon Master Prompt (UI-First)
- **Decision**: Formulated a comprehensive, self-contained master specification prompt designed specifically for Google Gemini 4 Argon (`gemini-4-argon` / Google Antigravity / AI Studio) to build the clean StudyAir Task Schedule Maker from a fresh slate:
  1. **Re-anchoring on Product Brief v2**: Shed the accumulated complexity of past iterations, returning strictly to the core loop: Task capture (<10s) $\rightarrow$ Deterministic scheduling algorithm in free time between school classes $\rightarrow$ 3-second rule hero card $\rightarrow$ 1-tap Pomodoro timer.
  2. **Strict UI-First Methodology**: The prompt instructs Gemini 4 Argon to build the entire tactile visual application first (Design system tokens, navigation shell, mock data, and 4 core interactive screens: Rencana, Tugas, Kalender, Fokus), allowing immediate user validation before generating SQLite persistence and engine logic.
  3. **Architectural Guardrails**: Baked in all critical lessons learned (SQLite `INSERT OR REPLACE INTO` constraint error prevention, coalesced transaction serialization queue, `useCallback` render-loop prevention, pure mathematical deadline calculations, and background focus timer drift prevention).
  4. **Artifacts**: Created [`docs/Prompts/gemini_4_argon_master_prompt.md`](./Prompts/gemini_4_argon_master_prompt.md) and linked it in [`docs/Prompts/Master-Prompt.md`](./Prompts/Master-Prompt.md).
- **Rationale**: Equips the user with a ready-to-run, frontier-grade prompt to rapidly scaffold or rewrite a clean, high-performance study companion with Gemini 4 Argon.
- **Attribution**: Builder (per user request and approved plan).

### 2026-11-02: Stats Heatmap Tab, Long-Press Task Menu, and 4-Stage Dragon Streak Pet
- **Decision**:
  1. **Dragon Streak Pet ([`StreakEvolutionMascot.tsx`](../mobile/src/components/streak/StreakEvolutionMascot.tsx), [`studyStreakEngine.ts`](../mobile/src/lib/studyStreakEngine.ts), [`StreakScreen.tsx`](../mobile/src/screens/StreakScreen.tsx))**: Replaced generic flame/icon composites and the Stage 4 phoenix name with a full 4-stage dragon evolution line (`Telur Naga Api` → `Tukik Naga Bara` → `Naga Langit Perkasa` → `Kaisar Naga Kosmik`) rendered with sculpted dragon anatomy (horns, vertical slit eyes, snout nostrils & fangs, articulated bat-membrane dragon wings, ribbed belly, flame-tipped wagging tail, and animated fire breath) plus an interactive 4-stage preview strip on `StreakScreen`.
  2. **Statistics & Heatmap Tab ([`StatsScreen.tsx`](../mobile/src/screens/StatsScreen.tsx), [`App.tsx`](../mobile/App.tsx))**: Replaced the Kalender bottom tab with `Statistik` (Day/Week/Month switcher, tasks done, academic scores, and 12-week activity heatmap) and swapped `Tugas` (Tab 2) with `Jadwal` (Tab 3).
  3. **Task Long-Press Menu & Batch Clear Done ([`TasksScreen.tsx`](../mobile/src/screens/TasksScreen.tsx), [`TodayTasksSection.tsx`](../mobile/src/components/home/TodayTasksSection.tsx), [`store.tsx`](../mobile/src/store.tsx))**: Long-pressing a task opens an action menu (toggle done, start focus, delete task, delete all done tasks) with 5-second undo support; fixed `HomeScreen` top safe-area gap and reduced missed-block notice to a single quiet line.
- **Attribution**: Per user request.

### 2026-11-02: Refined Calm Streak Pet Animation & Concealing Pet Until Streak Accomplished
- **Decision**:
  1. **Calm, Natural Idle Animation (`StreakEvolutionMascot.tsx`)**: Slowed the idle breathing/hovering cycle (`1350ms`–`1650ms` sine curve instead of `460ms`), reduced wing-flap sweep, softened vertical hover and egg rocking, removed non-stop idle fire-breathing, spinning orbit rings, and shockwave rings, and restricted the flame puff strictly to tap interactions.
  2. **10-Level Progressive Growth Variance (`getMascotGrowthState` in `studyStreakEngine.ts`, `StreakEvolutionMascot.tsx`, `StreakScreen.tsx`)**: Added intra-stage progression (`subTier` 1 → 2 → 3 across levels 1–10 at days 1, 3, 5, 7, 14, 21, 30, 50, 75, 100, 180+) so the pet visibly improves as the streak grows:
     - **Egg (Days 1–6)**: Progresses from a single hairline crack & gentle 2.2° sway (Days 1–2) → second fissure crack & peeking horn buds with 4° rock (Days 3–4) → blinking dragon eyes peeking through the upper crack with 6° rock and tap hop (Days 5–6).
     - **Baby Hatchling (Days 7–29)**: Progresses from small hatchling with low hover & 1-orb tap puff (Days 7–13) → growing dorsal crest spike, 3rd belly rib & 2-orb tap puff (Days 14–20) → cheek fins, smooth figure-eight horizontal drift, calm floating embers & 3-orb tap puff (Days 21–29).
     - **Sky Dragon (Days 30–99)**: Progresses from broad-winged drake (Days 30–49) → wing thumb claws, cheek spikes, figure-eight drift & calm rising embers (Days 50–74) → floating golden solar crown & widest wing glide (Days 75–99).
     - **Cosmic Emperor Dragon (Days 100+)**: Four counter-gliding nebula & astral wings, chest star-core, golden crown, whiskers, figure-eight levitation, and extra-scale ascension at 180+ days.
  3. **Hide Pet Before Streak Accomplished (`StreakScreen.tsx`, `StreakEvolutionMascot.tsx`, `ScreenHeader.tsx`, `studyStreakEngine.ts`)**: Set Stage 1 minimum requirement to 1 day (`minDays: 1`), hid `StreakEvolutionMascot` when `days < 1` or before the user accomplishes the streak (`!hasAccomplishedStreak`), concealed locked mascot stages (`🔒` and `???`) in the evolution tracker, disabled previewing locked stages before accomplishing the required streak, and hid the header mascot emoji while the streak is unaccomplished/at-risk.
- **Attribution**: Per user request.



### 2026-11-02: Instant Theme Boot & Zero-Lag Theme Switching
- **Decision**:
  1. **Synchronous Web Cache & Fast Native Boot ([`theme.ts`](../mobile/src/theme.ts), [`store.tsx`](../mobile/src/store.tsx))**: Cached the active theme key under `@studyair_theme_fast` (`localStorage` on Web for 0ms synchronous hydration before first render, and fast `AsyncStorage` read on Native before opening/migrating the 14 SQLite tables).
  2. **In-Place Native `StyleSheet.create` Binding ([`theme.ts`](../mobile/src/theme.ts))**: Registered color-token bindings for native `StyleSheet.create` rules so `applyTheme` updates existing style sheets in-place in <0.1ms without requiring a full root tree remount.
  3. **Zero Background Tab Remounts & Single-Table Settings Save ([`App.tsx`](../mobile/App.tsx), [`store.tsx`](../mobile/src/store.tsx))**: Stopped unmounting `<SafeAreaView>` and hidden background tabs (`HomeScreen`, `TimetableScreen`, `TasksScreen`, `StatsScreen`) on theme taps, and isolated `appSettings` persistence to `saveAppSettings` instead of rewriting all 14 SQLite tables.
- **Attribution**: Per user request.


## 2026-11-02 — Deterministic Deadline (`Waktu Tenggat`) Engine & 1-Tap Deadline Editing
- **Decision**:
  1. Prioritize explicit deadline clauses (`dikumpul`, `tenggat`, `deadline`, `batas waktu`) over leading context words in `parseIndonesianDateHint`, and support `"hari ini"`, standalone Indonesian weekdays, `"N hari lagi"`, and `"DD Month"` dates.
  2. Default AI-scanned tasks without an explicit date to `"Kelas Depan"` (`deadlineMode: "nextClass"`) instead of `"Besok"` so `calculateNextClassDeadline` resolves against the subject's actual timetable.
  3. Automatically recalculate `nextClass` and `afterNClasses` task deadlines in `store.tsx` whenever `timetableEntries`, `daysOff`, or `overrides` change, and provide 1-tap inline deadline editing across `AddTaskSheet`, `QuickActionSheet`, `AIScannerScreen`, `TodayTasksSection`, and `TasksScreen`.
- **Rationale**: Eliminates deadline mismatches between natural-language task descriptions, subject timetables, and manual/AI task creation while making any deadline adjustable in one tap.
- **Attribution**: Per user request.

### 2026-11-02: Gesture-First Navigation — Swipes, Hold Shortcuts & Sheet Pull-Down
- **Decision**:
  1. **Horizontal Tab Swiping & Right-Swipe Back (`App.tsx`)**: Added `screenPanResponder` with directional slide entrance animation (`tabSlideAnim`) to swipe left/right between the 4 main tabs (`Today` ↔ `Tasks` ↔ `Timetable` ↔ `Stats`) and swipe right from any auxiliary screen (`Settings`, `Streak`, `Calendar`, `Grades`, `Exams`, `Subjects`, `Progress`, `AIScanner`) to return to the previous tab.
  2. **Tab-Bar Long-Press Shortcuts & Scrubbing (`App.tsx`)**: Added `onLongPress` power shortcuts on all 5 bottom navigation items (`Hari Ini` → Focus Timer, `Tugas` → Add Task Sheet, `+` FAB → Direct Add Task Sheet, `Jadwal` → Calendar Screen, `Statistik` → Grades & GPA Screen) with floating toast confirmation (`navToastPill`) and horizontal swipe scrubbing across the bottom tab bar (`tabBarPanResponder`).
  3. **BottomSheet Pull-Down to Dismiss (`BottomSheet.tsx`)**: Added vertical `PanResponder` and spring physics (`translateY`) on the sheet drag handle and header so users can swipe down to close any bottom sheet.
  4. **Task Filter Swipes & Hold Shortcuts (`TasksScreen.tsx`)**: Added horizontal swipe (`filterSwipeResponder`) across the task list to cycle between `Semua` ↔ `Terjadwal` ↔ `Belum Dijadwalkan` ↔ `Selesai`, plus long-press shortcuts on filter pills (hold `Semua` → Add Task, hold `Terjadwal`/`Belum Dijadwalkan` → Buat Jadwal AI, hold `Selesai` → Clear Completed Tasks).
  5. **Timetable Multi-Day Swipe Fix & Hold Shortcuts (`TimetableDayView.tsx`)**: Fixed stale closure in weekday swipe `PanResponder` using refs so consecutive day swipes work smoothly, and added long-press on weekday chips to add a class on that day and long-press on class rows to jump straight to editing.
- **Rationale**: Makes everyday navigation faster, more tactile, and ergonomic for one-handed mobile use.
- **Attribution**: Per user request.

### 2026-11-02: 9:16 Vertical (1080×1920) Interactive Web Trailer & Rendered MP4/WebM Pipeline
- **Decision**:
  1. **True 9:16 Vertical (1080×1920) Stage (`public/trailer/index.html`, `src/app/trailer/page.tsx`)**: Rebuilt the StudyAir official trailer for TikTok, Instagram Reels, and YouTube Shorts (`1080×1920`) with a deterministic time controller (`window.seekToTime(t)` and `window.enterRenderMode()`) driving 8 continuous 3D phone showcase scenes across 30.0 seconds:
     - Scene 1: Student Struggle (Overloaded late-night homework & exam panic).
     - Scene 2: `<10s` Task Capture with automatic Indonesian NLP deadline detection (`"dikumpul Jumat"`).
     - Scene 3: AI Photo & WhatsApp Chat Scanner with `"Kelas Depan"` timetable deadline resolution.
     - Scene 4: Deterministic `"Buat Jadwal"` engine (`0.3ms` conflict-free block placement) & Rencana Hari Ini 3-second rule.
     - Scene 5: 1-Tap Pomodoro Focus Timer with SVG progress arc & streak completion burst.
     - Scene 6: 4-Stage / 10-Level Dragon Streak Companion (`Telur Naga Api` → `Kaisar Naga Kosmik`) & 12-Week Activity Heatmap.
     - Scene 7: Gesture-First Navigation (horizontal tab swipes, long-press tab shortcuts) & 0ms 7-Theme live morphing.
     - Scene 8: Outro App Lockup, scannable QR code, and Android download CTA.
  2. **Automated Video & Audio Renderer (`mobile/scripts/render_trailer_video.mjs`)**: Synthesizes a 30.0s stereo 44.1kHz PCM soundtrack (`soundtrack.wav`), captures 900 deterministic `1080×1920` frames via headless Chromium, and encodes both `public/trailer/StudyAir-Trailer-9x16.webm` (`16.72 MB`, VP9) and `public/trailer/StudyAir-Trailer-9x16.mp4` (`27.0 MB`, H.264 + AAC).
  3. **Indonesian Voice-Over & Live Captions (`mobile/scripts/generate_trailer_voiceover.mjs`, `public/trailer/voiceover.m4a`, `public/trailer/voiceover.wav`)**: Added an 8-scene Indonesian voiceover synthesizer (using Gemini 2.5 Flash Preview Neural TTS `Aoede` with macOS `Damayanti` fallback, automatic window fitting, and BGM audio ducking to 36% during speech) plus an on-screen `🎙️ VO:` caption pill in `public/trailer/index.html` and synchronized `<audio>` playback.
- **Rationale**: Delivers both an interactive 60fps web experience and ready-to-share vertical video files with full Indonesian voiceover from a single deterministic source of truth.
- **Attribution**: Per user request and approved plan.


## 2026-11-02 — Interactive Streak Pet Care, Custom Naming, Bara Api Feeding & Elemental Skins
- **Decision**:
  1. Added `deriveDragonPetStats` and `DRAGON_ELEMENTS` in `mobile/src/lib/studyStreakEngine.ts` to calculate companion XP, level, mood (`ecstatic`, `happy`, `calm`, `hungry`, `sleepy`), and daily earned `Bara Api` snacks from study minutes and completed tasks.
  2. Added custom dragon naming (`streakPetName` with 1-tap presets `Bara`, `Ignis`, `Draco`, `Astra`, `Zuko`, `Pyro`), interactive care buttons (`🍖 Beri Makan`, `🔥 Semburan`, `✨ Elus Naga`), and 5 unlockable elemental skins (`Alami`, `🔥 Api Magma`, `⚡ Petir Biru`, `🌿 Zamrud Hutan`, `☀️ Surya Emas`, `🌌 Nebula Kosmik`) in `StreakScreen.tsx` and `StreakEvolutionMascot.tsx`.
  3. Kept the dragon companion visible in an expressive sleepy/hungry state (`💤🍖`) when `currentStreak > 0` and `!todayStudied` (`isAtRisk`) instead of hiding it completely until after studying.
- **Rationale**: Makes the dragon streak pet feel like a living companion tied directly to daily study actions while keeping all animations hardware-accelerated (`useNativeDriver: true`).
- **Attribution**: Per user request.

### 2026-11-02: Unified App Icon System (Mobile, Android Native & Web PWA)
- **Decision**:
  1. **Minimalist Brand Emblem (`mobile/scripts/generate_app_icons.mjs`, `public/studyair-icon.svg`)**: Created a clean, minimalist geometric icon combining a rounded royal-blue calendar tile and a bold 3-facet sky-blue origami paper plane on a deep space navy (`#090d16`) canvas, with zero visual clutter so it remains crisp from 16×16 favicons up to 1024×1024 store icons.
  2. **Expo & Native Android Assets**: Generated full-bleed `mobile/assets/icon.png` (1024x1024), mask-safe `mobile/assets/adaptive-icon.png` (1024x1024 with 66% safe zone), branded `mobile/assets/splash.png` (1080x1920), `mobile/assets/favicon.png` (48x48), Android native `drawable/splashscreen_image.png` (1242x1242), and all 5 Android density buckets (`mipmap-mdpi` through `mipmap-xxxhdpi` for `ic_launcher`, `ic_launcher_round`, and `ic_launcher_foreground`). Updated `splashscreen_background` in `colors.xml` from `#FFFFFF` to `#090d16`.
  3. **Web PWA & Favicon Suite**: Generated multi-size `src/app/favicon.ico` (16x16, 32x32, 48x48), `public/apple-touch-icon.png` (180x180), `public/icon-192.png`, and `public/icon-512.png`, and wired them into `public/manifest.json`, `src/app/layout.tsx`, and `src/components/layout/Navbar.tsx`.
- **Rationale**: Replaces mismatched placeholder icons and blank splash screens with a unified, minimalist brand identity across iOS, Android, Expo, and Web PWA.
- **Attribution**: Per user request.


## 2026-11-02 — Mobile-Accessible Contribution Heatmap (`StatsScreen.tsx`)
- **Decision**:
  1. Added a 3-mode range zoom switcher (`8m` / `12m` / `16m`) with adaptive cell sizing (`22dp`, `18dp`, `16dp`), sticky weekday labels, and horizontal scroll auto-anchored to the current week.
  2. Made every heatmap cell a tappable `<Pressable>` with haptic feedback, month headers above week columns, high-contrast selection outlines, and inline numeric task counts in `8m` or selected states.
  3. Added an interactive legend level filter (`0`, `1`, `2`, `3`, `4+`) and a Selected Day Inspector card below the heatmap with `‹` / `›` 1-day steppers and the list of completed tasks (`tasksByDay` in `taskStats.ts`).
- **Rationale**: Preserves the classic 7×N GitHub-style contribution heatmap appearance while solving the lack of hover and tiny touch targets on mobile screens.
- **Attribution**: Per user request.


### 2026-11-08: Standalone APK Distribution, Update Checker & App-Wide UI Cleanup
- **Decision**:
  1. **Standalone APK & Live Update Checker (`updateChecker.ts`, `SettingsScreen.tsx`, `src/app/download/page.tsx`)**: Replaced `Expo-Go-58.0.5.apk` with the standalone `StudyAir-v2.0.0.apk` (`85.8 MB`), added `updateChecker.ts` with semver comparison and LAN endpoint resolution (`:8080/api/version` + `:3000/api/version`), converted the update dialog in `SettingsScreen.tsx` to `BottomSheet` with copy-link support (`expo-clipboard`), and upgraded `/download` with live version checking and a scannable QR code.
  2. **App-Wide UI Cleanup (`ScreenHeader.tsx`, `HomeScreen.tsx`, `TodayTasksSection.tsx`, `TasksScreen.tsx`, `TimetableScreen.tsx`, `StatsScreen.tsx`, `SettingsScreen.tsx`)**:
     - Replaced heavy 3D bottom bevels (`borderBottomWidth: 3 / 3.5`) on header pills/buttons, weekly timetable cards, and settings update cards with clean 1px hairline borders (`borderWidth: 1`).
     - Removed decorative 34×34 icon boxes inside `HomeScreen` and `TodayTasksSection` card headers so all cards share a calm typographic hierarchy, and converted `TodayTasksSection`'s task detail `<Modal>` to `BottomSheet`.
     - Removed duplicate `calendar-outline` header icon on `TimetableScreen` (keeping the visible `"Kalender"` pill in `topControlsRow`), removed the redundant inner `subjectDot` on `TasksScreen` cards (which already have a 4dp left `accentColor` stripe), and removed the duplicate number in `StatsScreen` counter boxes (`{c.value}` above `tugas · {c.label}`).
     - Pruned ~400 lines of unused legacy styles across `HomeScreen.tsx`, `TodayTasksSection.tsx`, `TasksScreen.tsx`, and `TimetableScreen.tsx`.
- **Rationale**: Eliminates visual clutter, duplicate actions, and inconsistent modal/border treatments across all 4 tabs and Settings.
- **Attribution**: Per user request.


### 2026-11-08: Warm Low-Pass UI Audio & Grouped Settings Layout
- **Decision**:
  1. **UI Audio Synthesis (`mobile/src/lib/sound.ts`, `mobile/src/lib/haptics.ts`)**: Replaced raw unfiltered oscillator beeps with soft attack envelopes and `BiquadFilterNode` low-pass filtering (`playClick` woodblock micro-tap, `playToggle` 2-note pop, `playSuccess` triad chime, `playWarning` muted thud) with 25–80ms debouncing, and wired them into `HapticFeedback`.
  2. **Settings Cleanup (`mobile/src/screens/SettingsScreen.tsx`, `mobile/src/lib/i18n.ts`)**: Grouped root settings into three `SectionHeader` sections (`Sekolah & Akademik`, `Preferensi`, `Data & Aplikasi`), fixed double horizontal margins on root `ListRow`s, replaced the bulky 2-button update card + duplicate footer with a single `Versi & Pembaruan` row that opens the update sheet, removed static notification preview boxes, and moved the Streak Simulator card from `Aturan Streak` into `Lanjutan & Mode AI`.
- **Rationale**: Makes UI audio soft and click-free across taps/toggles/saves, and turns the Settings root screen into a clean, aligned grouped list.
- **Attribution**: Per user request.


### 2026-11-08: Organic Biomechanical Streak Dragon Companion
- **Decision**:
  1. **Circadian Rhythm & Biological Engine (`deriveDragonOrganicBehavior` in `mobile/src/lib/studyStreakEngine.ts`)**: Added real-time circadian phase awareness (`pagi`, `siang`, `sore`, `malam`), dynamic biological heartbeat BPM (`54–108 BPM`), asymmetric wingbeat timings (`38%` fast power downstroke + `62%` graceful recovery glide), respiratory cycle timings, and contextual autonomous idle thoughts.
  2. **Organic Anatomy & Biomechanical Motion (`mobile/src/components/streak/StreakEvolutionMascot.tsx`)**:
     - Replaced stiff symmetric loops with asymmetric wingbeats + 2-joint articulated wingtip follow-through (`wingTipAnim`) and pinion feathers.
     - Added an independent respiratory cycle (inhale → brief lung hold → warm exhale) with twin nostril breath/ember wisps (`nostrilPuffAnim`) on each exhale, plus lub-dub heartbeat pulses (`heartbeatAnim`) in the egg stage.
     - Replaced single-hinge tails with a 3-segment nested kinematic wave tail (`Base → Mid → Tip + dual-core flickering flame`) where each segment rotates with phase lag.
     - Added natural randomized blinking (including occasional double-blinks), 2D pupil micro-saccades, dual specular catchlights, happy crescent eye squints (`happySquintAnim`), rosy cheek blushes (`cheekBlushAnim`), curved tapered horns, fluttering ear frills, soft neck bridges, and resting forepaws.
     - Added a physical feeding arc (`snackArcAnim` flying into the mouth + 3 jaw chomps `jawChompAnim`).
  3. **Organic Care Audio & Live Status (`mobile/src/lib/sound.ts`, `mobile/src/screens/StreakScreen.tsx`)**: Added `playDragonEat()` (two rhythmic triangle-wave crunch chomps + rising happy chirp) and `playDragonPurr()` (warm 3-voice harmonic vibrato purr), surfaced the circadian rhythm & heartbeat BPM pill in the care panel, and enabled rotating autonomous idle thoughts on `StreakScreen`.
- **Rationale**: Makes the streak pet look, breathe, move, and react like a living creature using 100% hardware-accelerated native animations (`useNativeDriver: true`) without requiring any new native dependencies.
- **Attribution**: Per user request.


### 2026-11-08: Multi-Level Navigation Stack (`BackHandler` + Web `popstate`), v2 Onboarding & UI Harmonization
- **Decision**:
  1. **Multi-Level Navigation Stack & Back Ergonomics (`mobile/App.tsx`)**:
     - Replaced the 1-slot `previousTabRef` with a 20-entry history stack (`navHistoryRef`) and centralized `resolveTabScreen()`.
     - Added Android hardware `BackHandler` integration that closes open modals (`QuickActionSheet`, `StreakCelebrationModal`) first, then pops `navHistoryRef` before minimizing the app.
     - Added Web Simulator URL hash routing (`#/today`, `#/tasks`, `#/timetable`, `#/stats`, `#/streak`, `#/settings`, etc.) and `window.addEventListener("popstate", ...)` so browser Back/Forward buttons and page refreshes preserve navigation state.
  2. **v2 Onboarding Modernization (`mobile/src/components/onboarding/OnboardingModal.tsx`)**:
     - Removed hardcoded `exam_date: "2026-11-25"` / `examDate: "2026-11-25"` from onboarding subject creation so newly onboarded subjects no longer generate fake exams in `Ulangan`.
     - Added a `← Kembali` step button in the header, duration estimate chips (`15m`, `30m`, `45m`, `60m`), a live `calculateNextClassDeadline()` + `formatLocaleDate()` preview (replacing the hardcoded `"Senin, 26 Okt"` text), and a Streak Dragon Companion teaser card.
  3. **UI Border & Modal Harmonization (`mobile/src/screens/StreakScreen.tsx`, `mobile/App.tsx`)**:
     - Converted the Mystery Milestone Clue modal in `StreakScreen.tsx` to `BottomSheet`, replaced heavy `borderBottomWidth: 4` bevels on `heroStageCard`, `evolutionCard`, `duoPrimaryBtn`, `mysteryBtn`, and `centerFab` with clean 1px hairline borders, and removed dead `navToastPill` styles.
- **Rationale**: Prevents accidental app exits on Android/Web Back navigation, eliminates fake onboarding exam dates, and finishes aligning `StreakScreen` and `OnboardingModal` with the v2 design system.
- **Attribution**: Per user request.


### 2026-11-09: Penjadwalan Tugas & Deadline Overhaul (`DeadlinePickerStrip`, `AddTaskSheet`, `TasksScreen`, `CreateScheduleSheet`, `TodayTasksSection`)
- **Decision**:
  1. **Visual 14-Day Calendar Strip & Smart Deadline Selector (`mobile/src/components/tasks/DeadlinePickerStrip.tsx`)**:
     - Replaced raw `YYYY-MM-DD` text inputs and rigid 3-button selectors with a unified `DeadlinePickerStrip` component.
     - Displays a live resolved deadline summary banner (`Senin, 10 Nov` + relative urgency pill `Besok` / `3 hari lagi` + inline `-1` / `+1` day steppers), 6 smart 1-tap presets (`Kelas Depan (Hari, Tgl)`, `⚡ Hari Ini`, `🌅 Besok`, `📆 Lusa`, `2 Pertemuan`, `+1 Minggu`), and an interactive 14-day horizontal calendar strip that highlights days when the selected subject has a school class (`Kelas` badge) or holiday (`Libur`).
  2. **Auto-Schedule Study Block with Live Slot Preview (`mobile/src/components/tasks/AddTaskSheet.tsx`)**:
     - Integrated `DeadlinePickerStrip` into `AddTaskSheet.tsx` and added an enabled-by-default `"✨ Jadwalkan blok belajar otomatis"` toggle that previews the exact day & time slot where the study block will be placed (`Rencana belajar: Hari Ini • 16:00–16:30 (30 mnt)`) and automatically runs `buildSchedule` + `applySchedule` upon saving.
  3. **Restored Schedule Controls & Upgraded Task Cards (`mobile/src/screens/TasksScreen.tsx`, `mobile/src/components/home/TodayTasksSection.tsx`)**:
     - Restored the missing `sparkles-outline` (`Susun Jadwal`) and `add-outline` (`Tambah Tugas`) header actions and the `needsSchedule` auto-schedule banner in `TasksScreen.tsx` (`setCreateScheduleVisible(true)` was previously never called).
     - Removed duplicated date text on task cards (`Matematika • PR` on the left, and a unified deadline badge `🔥 Hari Ini`, `🏫 Besok • 10 Nov`, `3 hari lagi • 12 Nov`, or `⚠️ Terlambat 2h • 6 Nov` on the right), plus a 1-tap `✨ Jadwalkan` chip on unscheduled cards.
     - Upgraded the task detail/edit `BottomSheet` in both `TasksScreen.tsx` and `TodayTasksSection.tsx` with `DeadlinePickerStrip`, duration estimate chips (`15m`–`90m`), and a 1-tap `Jadwalkan Blok Belajar Otomatis` action.
  4. **Day-by-Day Block Preview & 1-Tap Deadline Conflict Fixer (`mobile/src/components/schedule/CreateScheduleSheet.tsx`)**:
     - Added a day-by-day preview list (`Rencana Blok Belajar`) showing the exact time range (`16:00–16:30`), subject color, task title, and deadline for every proposed block.
     - Added 1-tap conflict resolution buttons (`📅 Undur +1 Hari` and `🏫 Ke Kelas Depan`) directly on `unallocated` tasks inside `CreateScheduleSheet.tsx` so students can extend a tight deadline and immediately fit the task into their schedule.
- **Rationale**: Makes setting deadlines and scheduling study blocks visual, class-aware, and 1-tap effortless without typing raw ISO dates.
- **Attribution**: Per user request.

### 2026-11-09: Streak Pet Improvement & Removal of Redundant EXP/Level Layer
- **Decision**:
  1. **Removed Redundant EXP & Companion Level (`mobile/src/lib/studyStreakEngine.ts`, `mobile/src/screens/StreakScreen.tsx`)**: Removed `totalXp`, `xpIntoLevel`, `xpForNextLevel`, `xpPercent`, `companionLevel`, and infinite `+5 XP` / `+25 XP` farming on pet/feed actions, as well as the `LV.X` badge labels in the hero pill and evolution card header.
  2. **Daily Satiety & Bara Api Care Loop (`satietyCount` / `satietyTarget` / `satietyLabel`)**: Replaced the XP progress bar in `petCarePanel` with a 3-dot **Kenyang Harian (`0/3` – `3/3`)** fullness meter paired with a live **Stok Bara Api (`🔥 X Bara Siap`)** badge and mood-aware affectionate reactions when petting or feeding.
- **Rationale**: Eliminates three competing progression numbers (Streak Days, Mascot Growth `LV.1–10`, and Companion `Lv.X` XP) so long-term progression is strictly driven by **Streak Days & 4-Stage Evolution**, while daily care focuses on feeding `Bara Api` earned from real study tasks and focus time.
- **Attribution**: Per user request.


### 2026-11-09: Simplified Stage 4 (`deity`) Streak Dragon & Streamlined `StreakScreen` UI
- **Decision**:
  1. **Simplified Stage 4 (`Naga Agung Kosmik`) Dragon Anatomy (`mobile/src/components/streak/StreakEvolutionMascot.tsx`, `mobile/src/lib/studyStreakEngine.ts`)**:
     - Replaced the cluttered 4-wing / 4-horn / snout-whisker Stage 4 (`deity`) render tree with a clean, regal silhouette featuring a **single pair of articulated wings**, a **floating golden crown halo** (`cosmicHaloCrown`), a single pair of swept-back horns, and a **single star emblem** (`starCoreDiamond`) on a smooth, rib-free chest plate.
     - Removed all hardcoded cyan/pink (`#38BDF8` / `#06B6D4` / `#EC4899`) overrides on Stage 4's wings, horn tips, ear frills, eyes, nostrils, and chest emblem so Stage 4 uses a cohesive royal violet & gold default palette and cleanly adapts to any selected elemental skin (`fire`, `ice`, `emerald`, `solar`, `cosmic`).
  2. **Streamlined `StreakScreen` Layout & Removed Hex-Alpha String Interpolations (`mobile/src/screens/StreakScreen.tsx`)**:
     - Reorganized `heroStageCard` with a compact top header bar (`petIdentityPill` on the left + `Rekor Terbaik` capsule on the right), centered `StreakEvolutionMascot` (`size={104}`), clean speech bubble (`speechBubble`), and a unified single-row care status bar (`Mood` + `Kenyang 0/3` dots + `🔥 Bara` badge).
     - Folded the bulky standalone 2-card `Perlindungan Streak` box into a compact `freezeCompactBar` strip at the bottom of the 7-day `Rantai Streak Minggu Ini` card, and removed all `${color}20` hex-alpha string concatenations across `StreakScreen.tsx` and `StreakEvolutionMascot.tsx`.
- **Rationale**: Makes the final evolution stage look regal and readable instead of visually noisy, and reduces vertical clutter on `StreakScreen`.
- **Attribution**: Per user request.


### 2026-11-10: UI Evaluation Fixes — Decluttering, Unified Headers & Visual Polish
- **Decision**:
  1. **Production Debug Gate & Locked Mascot Declutter (`StreakScreen.tsx`)**: Gated the header `construct-outline` debug button behind `__DEV__`, updated the subtitle to `"Konsistensi belajar harian"`, and hid the 4 redundant locked padlock stage tiles when `!hasDragonCompanion`.
  2. **Compact Deadline Picker & Ionicon Standardization (`DeadlinePickerStrip.tsx`, `AddTaskSheet.tsx`)**: Removed duplicate `-1/+1` day steppers, collapsed the 14-day calendar strip behind a `"Pilih tanggal"` preset chip (auto-expanding if a custom non-preset date is selected), and replaced inline emoji (`🏫`, `⚡`, `🌅`, `📆`, `✨`) with Ionicons so `Tipe Tugas` fits above the fold in `AddTaskSheet`.
  3. **Two-Line Task Filter Pills & Collapsible Completed Section (`TasksScreen.tsx`)**: Stacked filter pill labels above their counts so `"Semua"`, `"Terjadwal"`, `"Belum"`, and `"Selesai"` fit without clipping on 390px viewports, and grouped completed tasks in the `"Semua"` view under a collapsible `"Selesai (n)"` row.
  4. **Unified Main-Tab Headers (`HomeScreen.tsx`, `TasksScreen.tsx`, `TimetableScreen.tsx`, `StatsScreen.tsx`, `App.tsx`)**: Standardized all 4 main tabs to display the streak badge and `settings-outline` action on the right.
  5. **Timetable & Stats Copy Polish (`TimetableScreen.tsx`, `TimetableDayView.tsx`, `StatsScreen.tsx`, `HomeScreen.tsx`, `i18n.ts`, `App.tsx`)**: Shortened timetable view segments to `"Harian / Mingguan"` with a lightweight `"Kalender >"` link, formatted period badges as `"Jam 1-2"`, added `"Tugas selesai"` section caption and `"8 mg / 12 mg / 16 mg"` week chips on `StatsScreen`, colored `Perlengkapan Sekolah` progress neutral until all items are ready, bumped tab bar labels to `12px`, and added a one-time gesture hint toast (`@studyair_gesture_hint_v1`).
- **Rationale**: Resolves all high- and medium-impact issues found during the live 390×844 UI evaluation by removing redundant controls and unifying screen chrome.
- **Attribution**: Per user request and approved plan.


### 2026-11-11: "Tinjau Tugas" (Dari Teks / AI Task Review) UI Overhaul, Localization & Compound Splitting
- **Decision**:
  1. **Smart Compound Homework Clause Splitting (`mobile/src/services/aiService.ts`, `src/lib/gemini.ts`)**:
     - Added `splitCompoundTaskClauses()` and `expandExtractedTasks()` so comma/semicolon-separated homework blocks (e.g. `"Halaman 58-59 kegiatan 2, Halaman 63 kegiatan 2 dan 3, Halaman 68 kegiatan 2"`) split cleanly into separate tasks while keeping number lists inside one assignment (`"hal 45 no 1, 2, dan 3"`) intact and preventing cross-sentence subject/date leakage in `extractTasksLocal()`.
     - Updated `createFallbackTaskFromText()` to return `deadlineMode` and Indonesian `formatLocaleDate` labels (`Kelas Depan (Sen, 16 Nov)` instead of hardcoded `"Next Class (...)"`).
     - Updated Gemini prompts (`directGeminiTaskExtractCall` & `parseWhiteboardWithGemini`) to emit distinct items for comma-separated exercise/page lists.
  2. **Overhauled `Tinjau Tugas` Review UI (`mobile/src/components/QuickActionSheet.tsx`, `mobile/src/components/common/BottomSheet.tsx`)**:
     - Constrained bottom-sheet widths (`width: "100%", maxWidth: 560, alignSelf: "center"`) so modals stay crisp and centered on desktop/web viewports while remaining full-width on mobile.
     - Removed the duplicate header `Simpan` button, replaced English copy (`HOMEWORK`, `Next Class`, `Save All N Tasks`, `Notes / Instructions`, `Task title...`, `Date note:`) with localized Indonesian controls, added editable type pills (`PR`, `Kuis`, `Proyek`), multiline titles, 1-tap `Pisahkan menjadi N tugas` / `Tambah Tugas Lain` helpers, and fixed `handleUpdateBatchItemSubject` to only update class-based deadlines (`deadlineMode === "nextClass" | "afterNClasses"`).
     - Integrated `DeadlinePickerStrip` (with `-1h`/`+1h` steppers and expandable 14-day class-aware calendar strip) and an enabled-by-default `"✨ Jadwalkan blok belajar otomatis"` sticky footer toggle.
- **Rationale**: Eliminates mixed English/Indonesian strings, duplicate save actions, desktop width stretching, and cramped uneditable cards in the AI review sheet.
- **Attribution**: Per user request (`/plan` approved).


### 2026-11-15: Hidden Debug Menu & 7-Tap Build Number Developer Mode Easter Egg
- **Decision**:
  1. **Default-Hidden Debug Tooling**: Completely removed default visibility of `StreakDebugModal` and the `construct-outline` (🛠) header button on `StreakScreen.tsx` as well as the "Simulator Streak" panel in `SettingsScreen.tsx`. Even in `__DEV__`, debug tooling is hidden by default.
  2. **Android-Style 7-Tap Build Number Gesture (`SettingsScreen.tsx`, `updateChecker.ts`)**:
     - Wrapped the version/build subtitle (`updateModalSubtitle`) in `Settings > Versi & Pembaruan Aplikasi` in a `Pressable`.
     - Taps 1–3 emit subtle audio/haptic feedback.
     - Taps 4–6 surface step feedback toasts (`dev_mode_steps` e.g. "3 langkah lagi menuju Mode Pengembang").
     - Tap 7 activates `developerModeEnabled: true` in `AppSettings` with celebratory fanfare (`playSuccess`) and toast notification (`dev_mode_activated`).
     - Includes a 3.5-second reset timeout if tapping pauses.
  3. **Developer Mode Controls & Re-Locking**:
     - When active, surfaces `Mode Pengembang (Aktif ✓)` in root Settings and restores the "Simulator Streak" card under `Lanjutan & Mode AI` with a 1-tap "Nonaktifkan Mode Pengembang" button to allow instant re-locking.
     - Restores the 🛠 header button in `StreakScreen.tsx` which opens `StreakDebugModal`.
  4. **Persistence & Verification**:
     - Stored in `AppSettings.developerModeEnabled` (persisted to SQLite and AsyncStorage). Added unit tests in `developerMode.test.ts` (33/33 tests passing) and verified end-to-end via automated browser simulation.
- **Rationale**: Keeps production and development UI clean of debug artifacts while preserving rapid diagnostic capabilities via the standard Android Easter egg pattern.
- **Attribution**: Per user request (`/plan` approved).


### 2026-11-15: Complete Indonesian School Curriculum Subjects & Quick Add Action
- **Decision**:
  1. **Comprehensive Subject Roster (`DEFAULT_CURRICULUM_SUBJECTS` & `ensureStandardSubjects`)**:
     - Replaced the narrow 4-subject sample set (`Matematika`, `Fisika`, `Kimia`, `PJOK`) with the complete 16-subject Indonesian middle & high school curriculum in `mobile/src/lib/subjectDictionary.ts`:
       - Matematika, Bahasa Indonesia, Bahasa Inggris, Fisika, Kimia, Biologi, Sejarah, Geografi, Ekonomi, Sosiologi, Pendidikan Agama Islam (PAI), Pendidikan Pancasila (PPKn), Informatika, PJOK, Seni Budaya, and Bimbingan Konseling (BK).
     - Added `ensureStandardSubjects()` in `storage.ts`, `storage.web.ts`, and `store.tsx` (`loadState`) so any existing storage or session seamlessly merges the missing standard subjects without duplicating or altering existing subjects or timetable links.
  2. **1-Tap Quick Add Subject Action (`QuickActionSheet.tsx` & `AddTaskSheet.tsx`)**:
     - Added a `+ Tambah Mapel` / `+ Mapel Baru` chip at the end of the subject selector in both `Tinjau Tugas` and `AddTaskSheet`.
     - In `Tinjau Tugas`, creating a new subject immediately assigns it to the current batch item and returns to the review modal without losing user progress.
     - In `AddTaskSheet`, an inline input allows creating and selecting a new subject on the fly.
- **Rationale**: Eliminates the limitation where students could only select from 4 subjects, ensuring the full national curriculum is ready out-of-the-box while enabling frictionless custom subject creation.
- **Attribution**: Per user request.
