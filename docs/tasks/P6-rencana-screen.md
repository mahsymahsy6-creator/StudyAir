# P6: Rencana Screen — NEXT Block Hero Card, Today's Blocks, Collapsed Besok, and Unscheduled Banner

**Status**: `todo`
**Branch**: `task/P6`
**Depends on**: P5
**Estimated effort**: ~1.5h

---

## Goal
Transform `HomeScreen.tsx` into the minimal v2 "Rencana" screen conforming to the 3-second rule: header with streak chip and settings action, NEXT block hero card with a primary "Mulai fokus" button, today's remaining blocks, collapsed "Besok" single-line expandable row, and an unscheduled tasks banner with "Buat jadwal" trigger.

## Why
Product Brief v2's primary success metric is: **when opening the app, a student knows what to do now within 3 seconds**.
The previous v1 home screen was crowded with a bag checklist, cognitive load warnings, exam countdowns, timetable overrides, and task quest cards.
v2 cleans up the fold completely:
1. One large, unmistakable **NEXT Block Card** showing the subject, task title, time, and a single "Mulai fokus" CTA.
2. If tasks have not been scheduled, a prominent **Banner** prompts "Buat jadwal".
3. Today's remaining blocks list below the hero card.
4. "Besok" is collapsed into a single line.

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/screens/HomeScreen.tsx` | Rebuild to feature Header, Unscheduled Banner, NEXT Block Hero Card, Today's Blocks, and Collapsed Besok. Integrate `CreateScheduleSheet` and `Snackbar`. |
| `mobile/src/lib/i18n.ts` | Ensure all keys for Rencana screen, NEXT block, Besok summary, and unscheduled banner exist. |
| `mobile/test_p6_rencana_screen_suite.mjs` | **NEW** — Unit tests asserting NEXT block derivation, unscheduled tasks filtering, and tomorrow summary resolution. |
| `docs/tasks/P6.report.md` | **NEW** — Execution report. |

---

## Steps

### Step 1: Add i18n Strings in `mobile/src/lib/i18n.ts`
- `rencana_title`: "Rencana" / "Plan"
- `blok_selanjutnya`: "Blok Berikutnya" / "Next Block"
- `tidak_ada_blok_hari_ini`: "Tidak ada blok belajar hari ini" / "No study blocks scheduled for today"
- `semua_blok_selesai`: "Semua blok belajar hari ini selesai!" / "All study blocks for today completed!"
- `sisa_blok_hari_ini`: "Sisa Blok Hari Ini" / "Remaining Blocks Today"
- `banner_tugas_belum_dijadwalkan`: "Ada {count} tugas belum dijadwalkan" / "{count} tasks not scheduled yet"
- `besok_summary`: "Besok: {classes} kelas • {blocks} blok belajar" / "Tomorrow: {classes} classes • {blocks} study blocks"

---

### Step 2: Implement Rencana Screen in `mobile/src/screens/HomeScreen.tsx`
1. **Header**:
   - Title: `t("rencana_title")`
   - Actions: Streak pill (`{streak} hari`) + Settings icon button.
2. **Unscheduled Tasks Banner**:
   - When pending tasks exist with no study blocks scheduled:
     - Render `Banner` with `t("banner_tugas_belum_dijadwalkan", { count })` and "Buat jadwal" action button.
3. **NEXT Block Hero Card**:
   - Derives next active block for today (`status !== "COMPLETED"` and `date === todayStr`).
   - If found: renders card with subject 4dp stripe/color, time (`15:00 - 15:45`), task title, duration badge, and `PrimaryButton` labeled `t("mulai_fokus")`.
   - Completion toggle checkbox on the hero card.
4. **Today's Remaining Blocks**:
   - Lists subsequent study blocks for today.
   - Shows subject dot, title, time range, and status toggle.
5. **Collapsed Besok Row**:
   - Single clean card: `Besok: X kelas • Y blok belajar` with `chevron-down` / `chevron-up`.
   - Expanding reveals tomorrow's classes and tomorrow's study blocks.
6. **Schedule Generation & Undo Integration**:
   - Opening `CreateScheduleSheet` on banner or empty state tap.
   - Shows `Snackbar` on schedule apply with "Urungkan" action.

---

### Step 3: Write `mobile/test_p6_rencana_screen_suite.mjs`
1. Test next block derivation: chronological selection of earliest non-completed block today.
2. Test next block fallback: when today is complete, selects first block tomorrow.
3. Test unscheduled tasks count calculation: tasks without any study blocks.
4. Test tomorrow summary aggregation: count classes and count study blocks for tomorrow.

---

### Step 4: Verification & Regressions
Run:
```bash
cd mobile
npx tsc --noEmit
node test_p6_rencana_screen_suite.mjs
node test_p5_create_schedule_suite.mjs
node test_p4_add_task_suite.mjs
node test_scheduler_engine_suite.mjs
node test_p2_data_model.mjs
node test_characterization_v2_baseline.mjs
```

---

## Acceptance Criteria
- [ ] Header renders title "Rencana", streak pill, and settings gear.
- [ ] NEXT block hero card highlights next upcoming study block with "Mulai fokus" CTA.
- [ ] Tapping "Mulai fokus" launches Focus session for that block.
- [ ] Tapping completion toggle marks study block as completed.
- [ ] Today's remaining blocks rendered in clean list below hero card.
- [ ] Unscheduled tasks banner appears when active tasks lack study blocks.
- [ ] "Besok" is collapsed to one line by default, expandable on tap.
- [ ] Zero raw hex colors (uses theme proxy tokens).
- [ ] `test_p6_rencana_screen_suite.mjs` passes 100%.
- [ ] `tsc --noEmit` clean.
