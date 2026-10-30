# P12: AI Helpers (Duration Estimate, Text/Photo Capture, Review Screen)

**Status**: `done`
**Branch**: `task/P12`
**Depends on**: P4
**Estimated effort**: ~1.5h

---

## Goal
Provide intelligent task duration estimation and enrich text/photo capture review screens so all extracted tasks have valid duration estimates ready for immediate scheduling.

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/services/aiService.ts` | Add `suggestTaskDuration(title, type)` pure heuristic helper. |
| `mobile/src/components/tasks/AddTaskSheet.tsx` | Show AI duration recommendation chip when title suggests an optimal duration. |
| `mobile/src/components/QuickActionSheet.tsx` | Enrich `ParsedBatchTask` with `estimatedMinutes`, duration pill selectors in review cards, and persist `estimatedMinutes` on save. |
| `mobile/test_p12_ai_helpers_suite.mjs` | **NEW** — Unit test suite verifying AI duration suggestions, batch task enrichment, and duration overrides. |
| `docs/tasks/P12.report.md` | **NEW** — Execution report. |

---

## Acceptance Criteria
- [x] `suggestTaskDuration` returns intelligent defaults (15m, 30m, 45m, 60m, 90m) based on title keywords and task type.
- [x] `AddTaskSheet` displays an AI suggested duration pill that sets the duration when tapped.
- [x] Text & photo capture batch tasks include `estimatedMinutes` and allow adjusting them in the review screen.
- [x] Saving batch tasks commits valid `estimatedMinutes` to `Task` entities.
- [x] All automated unit tests pass.
- [x] `npx tsc --noEmit` clean.
