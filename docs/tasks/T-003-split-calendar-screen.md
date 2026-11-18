# T-003: Extract CalendarScreen Sub-Components (93KB → ~5 Files)

**Status**: `todo`
**Branch**: `task/T-003`
**Depends on**: none
**Estimated effort**: ~1h

---

## Goal
Split the 2660-line, 93KB `CalendarScreen.tsx` monolith into a parent orchestrator plus 4 extracted view components, without changing any visible behavior.

## Why
At 93KB, `CalendarScreen.tsx` is the second-largest file in the codebase. It contains 3 distinct view renderers (Agenda, Timeline, Month), a month-picker modal, a week strip, and 2 domain modals — all interleaved with 1400+ lines of `StyleSheet` definitions. This makes it extremely slow for the builder to navigate and risky to edit (any change risks breaking an unrelated view). Splitting it makes each view independently editable and testable.

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/screens/CalendarScreen.tsx` (2660 lines) | Extract 4 sub-components. Reduce to ~600 lines of orchestration + shared state. |
| `mobile/src/components/calendar/AgendaView.tsx` | **NEW** — Extract the `viewMode === "agenda"` block (~L583–L880) and its styles. |
| `mobile/src/components/calendar/TimelineView.tsx` | **NEW** — Extract the `viewMode === "timeline"` block (~L880–L1200) and its styles. Contains `HOUR_HEIGHT`, timeline layout memos, gap detection, dual card rendering. |
| `mobile/src/components/calendar/MonthView.tsx` | **NEW** — Extract the `viewMode === "month"` block (~L1200–L1370) and its styles. Contains 7-column grid, streak dots. |
| `mobile/src/components/calendar/MonthPickerModal.tsx` | **NEW** — Extract the month picker modal (~L1377–L1460) and its styles. |
| `mobile/src/components/calendar/DaysOffModal.tsx` | Read only — already extracted. Do not touch. |
| `mobile/src/components/calendar/ClassOverrideModal.tsx` | Read only — already extracted. Do not touch. |

## Steps

1. **Read** `CalendarScreen.tsx` fully. Map the exact line ranges for:
   - Shared state and hooks (top of component) — stays in `CalendarScreen.tsx`
   - Segmented control bar — stays in `CalendarScreen.tsx`
   - Week strip — stays in `CalendarScreen.tsx` (shared by Agenda and Timeline)
   - Agenda view JSX and its styles
   - Timeline view JSX, its memo hooks (`timelineItemsWithLayout`, `timelineGaps`, `timelineRange`), and its styles
   - Month view JSX and its styles
   - Month picker modal and its styles

2. **Create** `mobile/src/components/calendar/AgendaView.tsx`:
   - Move the agenda JSX block into a `AgendaView` component.
   - Props: pass the data it needs (schedule items, tasks, exams, subjects, selected date, callbacks for tapping items). Define a clear `AgendaViewProps` interface.
   - Move only the `agenda*` styles into this file.
   - The parent passes data down; this component does zero store access.

3. **Create** `mobile/src/components/calendar/TimelineView.tsx`:
   - Move the timeline JSX block, `HOUR_HEIGHT`, `timelineRange`, `timelineItemsWithLayout`, `timelineGaps` memos, and `timelineScrollRef`.
   - Props: schedule items, selected date, subjects, daysOff info, callbacks.
   - Move only the `timeline*` styles into this file.

4. **Create** `mobile/src/components/calendar/MonthView.tsx`:
   - Move the month grid JSX block and `monthGridDays` memo.
   - Props: selected date, month data, task dots, exam dots, holiday dots, streak data, callbacks.
   - Move only the `month*` styles into this file.

5. **Create** `mobile/src/components/calendar/MonthPickerModal.tsx`:
   - Move the `<Modal>` block for month picking.
   - Props: `visible`, `currentMonth`, `onSelectMonth`, `onClose`.
   - Move only the `monthPicker*` styles.

6. **Update** `CalendarScreen.tsx`:
   - Import the 4 new components.
   - Replace the inline JSX blocks with `<AgendaView ... />`, `<TimelineView ... />`, `<MonthView ... />`, `<MonthPickerModal ... />`.
   - Keep: all `useState` hooks, store access (`useMobileStudyStore`), segmented control, week strip, DaysOff/ClassOverride modals.
   - The parent should be under ~600 lines.

7. **Verify**: `npx tsc --noEmit` passes. Run day-schedule test suite as smoke test.

## Acceptance Criteria

- [ ] `CalendarScreen.tsx` is under 700 lines.
- [ ] 4 new files exist in `mobile/src/components/calendar/`: `AgendaView.tsx`, `TimelineView.tsx`, `MonthView.tsx`, `MonthPickerModal.tsx`.
- [ ] Each new file has a typed `Props` interface — no `any`.
- [ ] **Zero visual or behavioral changes** — the calendar looks and acts identically in all 3 views.
- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `node test_day_schedule_suite.mjs` passes (8/8).
- [ ] No new imports added to `CalendarScreen.tsx` beyond the 4 new components.
- [ ] No store access (`useMobileStudyStore`) in the 4 extracted components — data flows via props only.

## Tests

No new test file. This is a pure refactor — existing tests must still pass.

| Case | Input | Expected Output |
| :--- | :--- | :--- |
| TypeScript compile | `npx tsc --noEmit` | Exit code 0 |
| Day schedule suite | `node test_day_schedule_suite.mjs` | 8/8 passed |
| Visual regression | Open each of the 3 calendar views on web | Identical rendering to before |

```bash
cd mobile
npx tsc --noEmit
node test_day_schedule_suite.mjs
```

## Do NOT Touch

- `mobile/src/components/calendar/DaysOffModal.tsx` — already extracted, leave it.
- `mobile/src/components/calendar/ClassOverrideModal.tsx` — already extracted, leave it.
- `mobile/src/lib/daySchedule.ts` — logic layer, no changes needed.
- `mobile/src/lib/examEngine.ts` — logic layer, no changes needed.
- Any other screen files.
- `docs/Plan.md` — the reviewer updates it.

## Edge Cases

- **Timeline scroll position**: The `useEffect` that scrolls to the current time uses `timelineScrollRef`. After extraction, the ref lives inside `TimelineView`. Verify auto-scroll still works on initial render.
- **Month picker callback**: The month picker sets `selectedDate` in the parent. After extraction, verify the callback chain works (picker → parent state → all views re-render).
- **StyleSheet references**: Some styles may be shared between views (e.g., a `classCard` style used in both Agenda and Timeline). If so, create a small `calendarShared.ts` file for shared styles, or duplicate the style in each file (prefer duplication for <5 shared styles to avoid import complexity).
- **Memoized hooks**: `timelineItemsWithLayout` and `timelineGaps` depend on `selectedDateItems` computed in the parent. Either pass the computed items as props, or move the memo into `TimelineView` and pass the raw data. Prefer the former (pass computed data) to keep child components simple.

## Phone Checklist

- [ ] Agenda view: classes, breaks, exams, tasks all render correctly.
- [ ] Timeline view: cards positioned at correct times, dual layout (short/tall) works, gaps show dividers.
- [ ] Month view: 7-column grid renders, dots appear on correct days, tapping a day navigates.
- [ ] Month picker: opens, shows 12 months, selecting one changes the view.
- [ ] Segmented control: switching between views is instant, no flicker.
- [ ] Week strip: swipe left/right changes week, selected day highlighted.

## Report Format
After completing the task, create `docs/tasks/T-003.report.md` with:
1. Files changed (with line counts before/after)
2. Acceptance criteria — pass/fail for each
3. Test results — paste full output
4. Props interfaces for each new component (paste the type definitions)
5. Anything not completed and why

## Start Command
```
Read docs/Executor-Rules.md, then read this packet top to bottom before writing any code.
```
