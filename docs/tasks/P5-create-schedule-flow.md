# P5: "Buat Jadwal" Flow — Preview, Diff, Apply, and Undo

**Status**: `todo`
**Branch**: `task/P5`
**Depends on**: P3, P4
**Estimated effort**: ~1.5h

---

## Goal
Implement the end-to-end "Buat jadwal" user flow (`CreateScheduleSheet.tsx`) which feeds active tasks, timetable busy blocks, and student preferences into the deterministic scheduling engine (`buildSchedule()`), previews the generated study plan with stats and unallocated task warnings, applies the blocks to store and persistence, and offers 1-tap undo capability.

## Why
Product Brief v2 pivots StudyAir into a task schedule maker. The core loop is:
`Tambah tugas (with estimate) → Buat jadwal → Preview and accept → Follow Rencana hari ini`

Having added tasks with estimates (P4) and created the deterministic scheduling engine (P3), students need an intuitive, transparent interface to generate their study schedule. This flow must:
1. Run `buildSchedule()` in milliseconds on demand.
2. Present a clear preview: total blocks created, study hours, days spanned, and any tasks that could not fit before their deadline.
3. Show diff information (e.g. replacing prior schedule blocks).
4. Persist applied blocks to SQLite and state with a safety net (1-tap undo).

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/store.tsx` | Add `applySchedule(newBlocks: StudyBlock[])` and `undoLastSchedule(): boolean` actions with `lastScheduleBackup` in state and storage. |
| `mobile/src/components/schedule/CreateScheduleSheet.tsx` | **NEW** — Modular bottom sheet displaying schedule preview, statistics cards, unallocated task warnings, diff summary, and primary "Terapkan Jadwal" CTA. |
| `mobile/src/lib/i18n.ts` | Add translation keys for schedule creation, summary stats, diff messages, and undo notifications. |
| `mobile/test_p5_create_schedule_suite.mjs` | **NEW** — Unit test suite verifying schedule computation in sheet, store apply, diff calculation, and undo restoration. |
| `docs/tasks/P5.report.md` | **NEW** — Task report documenting execution and test outputs. |

---

## Steps

### Step 1: Add i18n Strings in `mobile/src/lib/i18n.ts`
Add translation keys:
- `buat_jadwal_title`: "Buat Jadwal Belajar" / "Generate Study Schedule"
- `buat_jadwal_sub`: "Susun blok belajar otomatis di sela jadwal sekolah" / "Automatically schedule study blocks around school classes"
- `ringkasan_jadwal`: "Ringkasan Jadwal" / "Schedule Summary"
- `total_blok`: "Total Blok" / "Total Blocks"
- `total_durasi`: "Total Durasi" / "Total Duration"
- `tugas_terjadwal`: "Tugas Terjadwal" / "Tasks Scheduled"
- `peringatan_tidak_muat`: "Beberapa tugas tidak muat sebelum tenggat" / "Some tasks do not fit before their deadline"
- `terapkan_jadwal`: "Terapkan Jadwal" / "Apply Schedule"
- `jadwal_diterapkan`: "Jadwal belajar berhasil diterapkan" / "Study schedule applied successfully"
- `urungkan`: "Urungkan" / "Undo"
- `jadwal_diurungkan`: "Penerapan jadwal dibatalkan" / "Schedule application reverted"
- `diff_ganti_blok`: "Akan mengganti {old} blok sebelumnya dengan {new} blok baru" / "Will replace {old} existing blocks with {new} new blocks"

---

### Step 2: Add Schedule Actions to `mobile/src/store.tsx`
1. Add `lastScheduleBackup: StudyBlock[] | null` to state.
2. Add `applySchedule(newBlocks: StudyBlock[])`:
   - Backs up current `studyBlocks` into `lastScheduleBackup`.
   - Saves `newBlocks` using `saveStudyBlocks()` and updates state.
3. Add `undoLastSchedule()`:
   - If `lastScheduleBackup` exists, restores previous blocks and clears backup.
   - Returns boolean indicating success.

---

### Step 3: Implement `mobile/src/components/schedule/CreateScheduleSheet.tsx`
1. Computes candidate schedule via `buildSchedule()` using:
   - `tasks.filter(t => t.status === "PENDING")`
   - `extractBusyBlocksFromTimetable(timetableEntries, { daysOff, overrides })`
   - `schedulePrefs`
   - `referenceDate: todayStr`
2. **Preview Content**:
   - Header with title and subtitle.
   - 3 stat cards: Total Blocks, Study Hours, Tasks Covered.
   - If `unallocated.length > 0`: Warning banner listing unallocated tasks and reasons.
   - Diff row: Shows difference between current blocks count and new blocks count.
3. **Primary CTA**:
   - "Terapkan Jadwal" button.
   - When tapped: calls `applySchedule()`, dismisses sheet, triggers onApplied callback.

---

### Step 4: Write `mobile/test_p5_create_schedule_suite.mjs`
1. Test schedule generation with mock tasks and timetable entries.
2. Test apply schedule action in store (replaces blocks and stores backup).
3. Test undo schedule action (restores previous state).
4. Test unallocated tasks reporting and reason formatting.
5. Test diff computation logic (added, removed, net change).

---

### Step 5: Verification & Regressions
Run:
```bash
cd mobile
npx tsc --noEmit
node test_p5_create_schedule_suite.mjs
node test_p4_add_task_suite.mjs
node test_scheduler_engine_suite.mjs
node test_p2_data_model.mjs
node test_characterization_v2_baseline.mjs
```

---

## Acceptance Criteria
- [ ] `CreateScheduleSheet.tsx` computes schedule on demand using pure `buildSchedule()`.
- [ ] Preview renders stats: total blocks, total minutes/hours, fully scheduled tasks count.
- [ ] Unallocated tasks are clearly flagged with reasons (deadline too soon / schedule full).
- [ ] Diff between existing study blocks and candidate study blocks is displayed.
- [ ] "Terapkan Jadwal" commits blocks to store and persistence.
- [ ] 1-tap undo restores previous schedule.
- [ ] `test_p5_create_schedule_suite.mjs` passes 100%.
- [ ] Zero TypeScript errors with `tsc --noEmit`.
- [ ] Zero regressions across existing test suites.
