# P10: Navigation Restructure — 3 Tabs (Rencana, Tugas, Kalender) + Center "+", Pengaturan Regrouping

**Status**: `in_progress`
**Branch**: `task/P10`
**Depends on**: P6, P7, P8
**Estimated effort**: ~1.5h

---

## Goal
Restructure the application navigation and tab bar to match Product Brief v2:
1. **3 Primary Tabs + Center "+"**:
   - Tab 1: **Rencana** (Home / today's NEXT block hero card & study blocks)
   - Tab 2: **Tugas** (4-group task organizer: Terjadwal, Belum dijadwalkan, Tidak muat, Selesai)
   - Center "+": Elevated action button (Tugas baru, Dari foto, Dari teks)
   - Tab 3: **Kalender** (Agenda by default, Garis waktu, Bulan)
2. **Move/Hide list**:
   - Move Pelajaran into Pengaturan > Jadwal sekolah.
   - Progress & SM-2 UI hidden from primary navigation.
   - Settings accessed cleanly via header gear icon.
3. Conforms strictly to tidy rules: minimal distraction, crystal-clear mental model, Indonesian strings via `i18n.ts`.

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/App.tsx` | Restructure tab bar to 3 tabs: Rencana, Tugas, Kalender + Center "+". Update route handling. |
| `mobile/src/screens/SettingsScreen.tsx` | Regroup settings sections: Jadwal sekolah, Mapel, Waktu belajar, Pengingat, Streak, Data & Cadangan. |
| `mobile/src/lib/i18n.ts` | Add tab labels and settings group titles if missing. |
| `mobile/test_p10_navigation_suite.mjs` | **NEW** — Unit tests for route transitions, active tab validation, and settings section mapping. |
| `docs/tasks/P10.report.md` | **NEW** — Execution report. |

---

## Acceptance Criteria
- [ ] Bottom tab bar displays: Rencana, Tugas, Center "+", Kalender.
- [ ] Tapping Rencana displays `HomeScreen`.
- [ ] Tapping Tugas displays `TasksScreen`.
- [ ] Tapping Kalender displays `CalendarScreen`.
- [ ] Tapping Center "+" opens `QuickActionSheet`.
- [ ] All automated unit tests pass.
- [ ] `npx tsc --noEmit` clean.
