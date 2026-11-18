# StudyAir - Plan

StudyAir is an offline-first school timetable and task management app tailored for Indonesian middle and high school students. The core product loop is straightforward and reliable: see tomorrow's classes and required belongings, know exactly what assignments are due, receive timely local notifications without intrusive distractions, and finish academic tasks on time.

## Working Rules
1. **Work phase by phase**: Complete each phase thoroughly before moving forward.
2. **Phase completion protocol**: After each phase, summarize changes, execute all automated tests, provide a manual phone checklist, and stop to await explicit confirmation.
3. **Do not break working features**: Preserve existing functionality, backwards-compatible models, and established UX patterns.
4. **AI extracts, code decides**: All dates, calendar midnights, deadline calculations, and "next class" intervals are deterministically calculated by code. AI output is strictly treated as suggestions and requires user confirmation before saving to storage.
5. **No personal data or secrets**: Never write API keys, access tokens, or student/teacher personal information into any notes or committed files.

## Phase Status Table

| Phase | Name | Status | Notes / Evidence |
| :--- | :--- | :--- | :--- |
| **0** | **Audit** | `done` | Test samples directory established; baseline models and initial schemas documented. |
| **1** | **Fixes and simplification** | `done` | Cleaned web baseline, removed unused proxy files, pruned dead dependencies. |
| **2** | **Data foundation** | `done` | Core storage engine implemented in `store.tsx` and `storage.ts` using AsyncStorage with pre-repair backups. |
| **3** | **Navigation and design system** | `done` | 4-tab bottom navigation (Hari Ini, Kalender, Pelajaran, Kemajuan) + action cluster; design tokens in `theme.ts`. |
| **4** | **AI foundation** | `done` | Gemini API client with fallback schema, prompt templates, and `test_ai_foundation.mjs` test runner. |
| **5** | **Timetable import & repair** | `done` | 5-step wizard (Camera/Photo/Text/Paste), break/event classification, and `test_phase5_timetable.mjs`. |
| **6** | **Today with Tomorrow dropdowns** | `done` | `HomeScreen.tsx` features Jadwal Hari Ini and collapsible Besok card with next school day fallback. |
| **7** | **Tasks (given date & deadline, AI capture)** | `done` | `TasksSection`, task creation with deterministic next-class calculation, and `test_add_from_text.mjs`. |
| **8** | **Days off and one-time changes** | `done` | `DaysOffModal`, `ClassOverrideModal` (cancelled, swapped, added), and `test_phase8_overrides.mjs`. |
| **9** | **Reminders and Settings** | `done` | `SettingsScreen.tsx` with bell times editor, notifications sync, subject alias manager, and `test_phase9_settings.mjs`. |
| **10** | **AI quality pass** | `done` | `mobile/test_samples/` (timetables, whiteboards, messages with holdout and synthetic datasets), `test_phase10_unit.mjs`. |
| **11** | **V1.1 extras** | `done` | `TomorrowsBagChecklist`, `ExamCountdownCard`, `TimetableSubjectView` (Per mapel), Focus timer, `test_phase11_extras.mjs`. |
| **12** | **Onboarding, polish, release** | `in progress` | Onboarding screens present; `test_phase12_release.mjs` passing; final polish and QA in progress. |
| **-** | **UI Fix Pass 1** | `done` | Indonesian translations, local calendar midnight calculations (`calculateDaysLeft`), period labels ("Jam 1"), `test_v1_polish_suite.mjs` (15/15 passed). |
| **-** | **UI Fix Pass 2** | `done` | Bell times quick setup & break rules, import summary & diff, Buat Mapel sheet, Tambah Tugas meeting-based deadlines, Tambah dari Teks cleaner. |
| **-** | **Timetable display bug fix** | `done` | Single source of truth `getDayItems()` in `daySchedule.ts`, Kalender bell-time timeline positioning, side-by-side conflict handling, `test_day_schedule_suite.mjs` (8/8 passed). |

## Next Up
<!-- Fill in next steps here -->
