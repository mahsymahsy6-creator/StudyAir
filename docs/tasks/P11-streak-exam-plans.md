# P11: Streak Calibration & Exam Study Plans

**Status**: `done`
**Branch**: `task/P11`
**Depends on**: P9
**Estimated effort**: ~1.5h

---

## Goal
1. **Streak engine calibration**:
   - `deriveStudyDay` counts completed `StudyBlock`s towards streak qualification (`blocksCompleted >= 1` earns the day).
   - Preserves free days (weekends and designated holidays without classes).
2. **"Buat rencana belajar" for upcoming exams**:
   - For any upcoming exam, generates focused review and practice tasks with duration estimates leading to the exam deadline.
   - Schedulable immediately via deterministic scheduling engine `buildSchedule()`.

---

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/lib/studyStreakEngine.ts` | Update `deriveStudyDay` and `calculateStudyStreak` to accept and count completed `StudyBlock`s. |
| `mobile/src/lib/examEngine.ts` | Add `createExamStudyPlan()` generating review and practice tasks for an exam. |
| `mobile/src/store.tsx` | Wire `studyBlocks` into `streakState` calculation and add `generateExamPlan(examId)`. |
| `mobile/test_p11_streak_exams_suite.mjs` | **NEW** — Unit tests for study block streak qualification and exam study plan generator. |
| `docs/tasks/P11.report.md` | **NEW** — Execution report. |

---

## Acceptance Criteria
- [x] Finishing a study block counts towards earning the day in the streak engine.
- [x] Free days / holidays continue to protect the student's streak without punishment.
- [x] Tapping "Buat rencana belajar" generates exam preparation tasks and schedules them before the exam.
- [x] All automated unit tests pass.
- [x] `npx tsc --noEmit` clean.
