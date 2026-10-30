# P4: Add-Task Flow — Fast Duration Estimates, Subject, and Smart Deadlines Under 10 Seconds

**Status**: `todo`
**Branch**: `task/P4`
**Depends on**: P1, P2
**Estimated effort**: ~1.5h

---

## Goal
Build a dedicated, streamlined add-task flow (`AddTaskSheet.tsx`) enabling students to capture tasks with title, subject, duration estimate (quick presets: 15m, 30m, 45m, 60m, 90m + custom), and deadline (smart next-class, 2-classes, quick dates, custom) in under 10 seconds. Integrate this into `QuickActionSheet.tsx` replacing inline legacy code, while preserving backwards compatibility and adhering to tidy design rules and Indonesian translations.

## Why
Product Brief v2 pivots StudyAir into a task schedule maker. The core loop begins with:
`Tambah tugas (with estimate) → Buat jadwal → Preview and accept → Follow Rencana hari ini`

The success metric states: **a student can add a task in under 10 seconds**.
To achieve this:
1. Every task requires a duration estimate (`estimatedMinutes`, default 30 min) so the scheduling engine (P3) can allocate discrete study blocks.
2. The UI must provide instant one-tap preset chips (15m, 30m, 45m, 60m, 90m) rather than tedious manual typing.
3. The deadline engine must pre-calculate the next class meeting from the timetable so the student does not have to check their calendar.
4. The title input must autofocus, and sensible defaults (first subject, next class deadline, 30 min estimate, homework type) must allow task creation in as few as 2 taps (Type title → Tap "Simpan").

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/components/tasks/AddTaskSheet.tsx` | **NEW** — Modular, accessible bottom sheet for adding a task with title, subject, time estimate chips (15m/30m/45m/60m/90m/kustom), smart deadline selector, and task type. Built using `BottomSheet`, `Chip`, `PrimaryButton`, and theme tokens. |
| `mobile/src/components/QuickActionSheet.tsx` | Replace the monolithic inline Add Task modal (lines 525–790) with `<AddTaskSheet />`, dramatically cleaning up state and reducing file complexity. |
| `mobile/src/lib/i18n.ts` | Ensure all keys for duration estimates, helper text, and deadline modes exist in Indonesian and English dictionaries. |
| `mobile/src/store.tsx` | Verify `addTask` correctly receives and persists `estimatedMinutes` (clamped between 5 and 360 min, default 30 min). |
| `mobile/test_p4_add_task_suite.mjs` | **NEW** — Automated test suite verifying task creation with estimates, fallback clamping, next-class deadline resolution, and under-10s data flow. |
| `docs/tasks/P4.report.md` | **NEW** — Execution report documenting changes, criteria verification, and test outputs. |

---

## Steps

### Step 1: Update Translations in `mobile/src/lib/i18n.ts`
Ensure the following keys are available:
- `estimasi_durasi_hint`: "Durasi ini digunakan untuk menyusun jadwal otomatis" / "This duration is used to build automatic schedule blocks"
- `menit_singkat`: "mnt" / "min"
- `kustom`: "Kustom" / "Custom"
- `kelas_depan`: "Kelas Depan" / "Next Class"
- `dua_pertemuan`: "2 Pertemuan" / "2 Classes"
- `durasi_kustom`: "Durasi kustom (menit)" / "Custom duration (minutes)"
- `opsi_lainnya`: "Opsi lainnya" / "Other options"

---

### Step 2: Implement `mobile/src/components/tasks/AddTaskSheet.tsx`
Create a clean, focused component using `BottomSheet` from `components/common/`:
1. **Header**: "Tambah Tugas" with close button and primary save action.
2. **Title Input**:
   - `autoFocus={true}`
   - Clear placeholder (e.g. "Contoh: PR Matematika hal 45")
   - Inline validation message if submitted empty
   - Date hint chip: If NLP detector finds a date (e.g., "besok"), render a 1-tap pill to apply deadline.
3. **Subject Selector**:
   - Horizontal scrolling row of chips with 4dp colored dots/stripes.
   - Defaults to the active or first available subject.
4. **Duration Estimate (`estimatedMinutes`)**:
   - Section label: `Estimasi Waktu Belajar`
   - Preset chips: `15m`, `30m`, `45m`, `60m`, `90m`
   - Active chip highlighted with `colors.primary`.
   - "Kustom" option revealing numeric input (clamped 5–360 min).
   - Micro-caption explaining its purpose for automatic scheduling.
   - Default value: `30` min.
5. **Deadline Selector**:
   - 3-segmented buttons:
     - `Kelas Depan` (shows formatted date e.g. "Sen, 3 Nov" calculated via `calculateNextClassDeadline`)
     - `2 Pertemuan` (shows formatted date)
     - `Kustom` (shows selected date or "Pilih")
   - When `Kustom` is selected, display quick pills ("Besok", "Lusa", "+1 Minggu") and date input `YYYY-MM-DD`.
6. **Task Type Selector**:
   - Segmented buttons for `PR` (`homework`), `Kuis` (`quiz`), `Proyek` (`project`). Defaults to `PR`.
7. **Expandable "Opsi Lainnya"**:
   - Collapsed by default (tidy rule: 1 level of detail by default).
   - Contains optional `Catatan` (`notes`) text area.
8. **Primary CTA**:
   - `PrimaryButton` labeled `Simpan Tugas` (`save`) at bottom of sheet.
   - Supports keyboard `onSubmitEditing` from title field if user wants rapid save.

---

### Step 3: Integrate with `QuickActionSheet.tsx`
1. Import and render `<AddTaskSheet />` when `activeModal === "addTask"`.
2. Remove redundant inline state and >250 lines of duplicate styles from `QuickActionSheet.tsx`.
3. Ensure tapping "Tambah tugas" in `QuickActionSheet` opens `AddTaskSheet` seamlessly.

---

### Step 4: Write `mobile/test_p4_add_task_suite.mjs`
Write unit test cases verifying:
1. `addTask` with preset duration (15, 30, 45, 60, 90) sets `estimatedMinutes`.
2. `addTask` without `estimatedMinutes` defaults to `30`.
3. Out-of-bounds duration estimates are clamped to `[5, 360]`.
4. Smart deadline engine resolves correct next-class meeting date from timetable entries.
5. NLP date hint parser detects dates in Indonesian titles ("besok", "lusa", "senin depan").
6. Mock user flow simulates title entry + 1-tap save in under 5ms execution time.

---

### Step 5: Verification & Full Regression Pass
Run:
```bash
cd mobile
npx tsc --noEmit
node test_p4_add_task_suite.mjs
node test_p2_data_model.mjs
node test_scheduler_engine_suite.mjs
node test_characterization_v2_baseline.mjs
```

---

## Acceptance Criteria
- [ ] Dedicated `AddTaskSheet.tsx` component created using shared `BottomSheet`, `Chip`, and `PrimaryButton`.
- [ ] Task duration estimate presets (`15m`, `30m`, `45m`, `60m`, `90m`) plus custom input exist and work.
- [ ] Default duration estimate is 30 minutes.
- [ ] Smart next-class deadline resolves meeting date using `calculateNextClassDeadline`.
- [ ] Title input autofocuses immediately upon opening the sheet.
- [ ] Rapid task creation takes under 10 seconds (autofocus + defaults allow saving in 2 taps).
- [ ] Zero raw hex colors (uses theme proxy tokens).
- [ ] All user-facing strings in `i18n.ts`.
- [ ] `QuickActionSheet.tsx` delegates to `AddTaskSheet.tsx`, removing duplicate code.
- [ ] `test_p4_add_task_suite.mjs` passes 100%.
- [ ] `tsc --noEmit` clean with zero errors.
- [ ] Zero regressions across existing test suites.

---

## Edge Cases
- **No subjects configured**: Gracefully fall back to subjectId `"general"` or show "Pelajaran Umum".
- **Subject has no timetable meetings**: "Kelas Depan" fallback date is tomorrow (+1 day).
- **Custom duration input**: If student types `0` or negative, clamps to `5`. If student types `999`, clamps to `360`.
- **Keyboard overlap**: Handled via `KeyboardAvoidingView` inside `BottomSheet`.
- **Screen width 360dp**: Chips wrap or scroll horizontally without clipping or overflowing screen margins.

---

## Phone Checklist (360dp width, 130% font scale)
- [ ] Title input, chips, and buttons fit cleanly within 360dp width.
- [ ] Touch targets are at least 48dp tall for easy tapping on mobile.
- [ ] Preset estimate chips (`15m`, `30m`, etc.) have distinct selected state.
- [ ] Text labels remain readable and do not overlap at 130% font scale.

---

## Report Format
Create `docs/tasks/P4.report.md` detailing:
1. Files created / changed.
2. Acceptance criteria pass/fail status.
3. Test suite execution logs.
4. Verification against under-10s requirement.
