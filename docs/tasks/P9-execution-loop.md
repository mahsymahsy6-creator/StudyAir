# P9: Execution Loop — Focus Timer Tied to Blocks, Missed-Block Rescheduling, Notifications

**Status**: `in_progress`
**Branch**: `task/P9`
**Depends on**: P6
**Estimated effort**: ~1.5h

---

## Goal
Close the execution loop so that:
1. **Focus timer is directly tied to v2 `StudyBlock`s**: Tapping "Mulai fokus" on any block opens `FocusScreen` with that block's duration, task title, and subject color.
2. **Completion cascade**: Completing a focus session marks the `StudyBlock` as `COMPLETED`, adds to study streak statistics, and prompts to mark the associated task completed.
3. **Missed-block rescheduling**: Past study blocks that were not completed are detected as `MISSED` and can be rescheduled into upcoming slots in one tap.
4. **Notifications**: Adds study block reminder notifications (e.g. 10m before block start).

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/screens/FocusScreen.tsx` | Connect directly to v2 `StudyBlock` and `Task`. Support `route?.params` blockId, mark block completed on finish, and offer task completion prompt. |
| `mobile/src/services/notificationService.ts` | Add study block reminder notification scheduling. |
| `mobile/src/screens/HomeScreen.tsx` | Add missed blocks banner / prompt to reschedule. |
| `mobile/test_p9_execution_loop_suite.mjs` | **NEW** — Unit tests for missed block detection and rescheduling. |
| `docs/tasks/P9.report.md` | **NEW** — Execution report. |

---

## Acceptance Criteria
- [ ] Focus timer initializes with `StudyBlock` duration and task title.
- [ ] Completing session marks block `COMPLETED`.
- [ ] Past uncompleted blocks are identified as `MISSED`.
- [ ] Missed blocks can be rescheduled into future slots using deterministic engine.
- [ ] All automated unit tests pass.
- [ ] `npx tsc --noEmit` clean.
