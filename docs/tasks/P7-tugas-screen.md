# P7: Tugas Screen — 4 Groups (Terjadwal / Belum dijadwalkan / Tidak muat / Selesai)

**Status**: `in_progress`
**Branch**: `task/P7`
**Depends on**: P5
**Estimated effort**: ~1.5h

---

## Goal
Transform the Tugas view into the clean, 4-group v2 structure:
1. **Terjadwal** (Active tasks with scheduled study blocks)
2. **Belum dijadwalkan** (Active tasks awaiting scheduling)
3. **Tidak muat** (Tasks that could not fit in the schedule, with reason)
4. **Selesai** (Completed tasks)

Each row displays subject dot, task title, deadline, and next block time or duration estimate. If unallocated or unscheduled tasks exist, a clear "Buat jadwal" button is provided.

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/screens/TasksScreen.tsx` | **NEW** — Screen implementing 4 groups, subject dot, deadline + block time, and "Buat jadwal" action sheet. |
| `mobile/src/components/tasks/TasksSection.tsx` | Refactor to delegate to `TasksScreen` / clean modular interface without redundant v1 quest cards. |
| `mobile/src/lib/i18n.ts` | Add Indonesian strings for 4 task groups, next block labels, and empty states. |
| `mobile/test_p7_tugas_screen_suite.mjs` | **NEW** — Unit tests for task partitioning into 4 groups and next-block derivation. |
| `docs/tasks/P7.report.md` | **NEW** — Execution report. |

---

## Tidy Rules Compliance
- One primary action per screen: "Buat jadwal" when unscheduled tasks exist, or "+" for new task.
- 4 groups: Terjadwal, Belum dijadwalkan, Tidak muat, Selesai.
- Row layout: 8dp subject dot, title, deadline text, next block time / duration chip, right-hand completion checkbox.
- Amber/Red status pill for "Tidak muat".
- Zero hardcoded colors; use `colors` proxy from `theme.ts`.
- All text localized via `mobile/src/lib/i18n.ts`.

---

## Acceptance Criteria
- [ ] Tasks are partitioned deterministically into: Terjadwal, Belum dijadwalkan, Tidak muat, Selesai.
- [ ] Scheduled tasks display the next upcoming block date & time.
- [ ] Unscheduled tasks display duration estimate (e.g. 45m).
- [ ] Unallocated tasks display warning status pill ("Tidak muat").
- [ ] Tapping "Buat jadwal" opens `CreateScheduleSheet`.
- [ ] Tapping checkbox marks task completed or restores it.
- [ ] All automated unit tests pass.
- [ ] `npx tsc --noEmit` clean.
