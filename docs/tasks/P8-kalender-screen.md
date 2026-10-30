# P8: Kalender with Blocks — Agenda (Dashed Outlines for Blocks, Solid for Classes), Garis Waktu, Bulan

**Status**: `in_progress`
**Branch**: `task/P8`
**Depends on**: P5
**Estimated effort**: ~1.5h

---

## Goal
Rebuild `CalendarScreen.tsx` so that:
1. **Agenda is the default view**: Lists school classes (solid cards) and study blocks (dashed cards), along with deadlines and exams.
2. **Garis Waktu (Timeline)**: Renders the hourly vertical grid showing solid class cards and dashed study block cards.
3. **Bulan (Month grid)**: Shows the monthly calendar with status dots (classes, blocks, deadlines) and shows the selected day's agenda beneath the grid.
4. Conforms to tidy rules: one clean header, view mode segmented switcher (Agenda | Garis Waktu | Bulan), cards with 4dp subject color stripes, dashed outline for study blocks, Indonesian strings via `i18n.ts`.

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/screens/CalendarScreen.tsx` | Rebuild calendar screen: Agenda (default), Garis Waktu (timeline), and Bulan (month grid). Solid cards for classes, dashed for study blocks. |
| `mobile/src/lib/i18n.ts` | Add translation keys for calendar view modes and labels if missing. |
| `mobile/test_p8_kalender_suite.mjs` | **NEW** — Unit tests for unified day events collation and month indicator derivation. |
| `docs/tasks/P8.report.md` | **NEW** — Execution report. |

---

## Tidy Rules Compliance
- One primary action: Add / override class or view selector.
- Cards only for tappable items.
- Classes: solid cards with 4dp subject stripe.
- Study blocks: dashed border (`variant="dashed"`) with 4dp subject stripe.
- Indonesian text from `i18n.ts`, no ISO dates.
- Zero hardcoded hex colors, use `colors` proxy.

---

## Acceptance Criteria
- [ ] Agenda view renders by default with date selector strip.
- [ ] Classes render with solid border; study blocks render with dashed border.
- [ ] Deadlines and exams for the selected date are visible in the day's agenda.
- [ ] View mode switch between Agenda, Garis Waktu, and Bulan works smoothly.
- [ ] All automated unit tests pass.
- [ ] `npx tsc --noEmit` clean.
