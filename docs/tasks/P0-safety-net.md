# P0: Safety Net — Backup, Baseline Tests, Characterization Tests, Debug Log Cleanup

**Status**: `todo`
**Branch**: `task/P0`
**Depends on**: none
**Estimated effort**: ~1.5h

---

## Goal
Create a known-good baseline before the v2 rebuild: backup branch, run every existing test, write characterization tests for the 4 core logic modules the scheduling engine will depend on, and clean debug logs from production files.

## Why
The v2 pivot rewires navigation, adds a scheduling engine, and changes the data model. Before any of that, we need proof that the foundational logic (day schedule, deadlines, exams, streaks) works correctly. The characterization tests lock in current behavior so future packets can refactor confidently. Debug logs are cleaned now because every future packet inherits from this branch.

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/lib/daySchedule.ts` | Read only — `getDayItems()` is the source of truth for daily schedule. Write characterization tests. |
| `mobile/src/engine/deadlineEngine.ts` | Read only — `calculateNextClassDeadline()`. Write characterization tests. |
| `mobile/src/lib/examEngine.ts` | Read only — `getExamState()`. Write characterization tests. |
| `mobile/src/lib/studyStreakEngine.ts` | Read only — `calculateStudyStreak()`. Write characterization tests. |
| `mobile/src/services/aiService.ts` (L136, L142, L191, L244, L294) | 5× `console.log` — wrap in `if (__DEV__)`. |
| `mobile/src/screens/AIScannerScreen.tsx` (L247, L250, L302) | 3× `console.log` — wrap in `if (__DEV__)`. |
| `mobile/test_*.mjs` (19 files) | Run all. Record pass/fail counts. |
| `mobile/test_characterization_v2_baseline.mjs` | **NEW** — characterization test suite. |

## Steps

### Step 1: Create backup branch
```bash
cd mobile && cd ..
git checkout -b v1-backup-before-v2
git push origin v1-backup-before-v2 2>/dev/null || true
git checkout main
git checkout -b task/P0
```

### Step 2: Run all 19 existing test suites
Run each test file and record the result. Some suites require compilation first:
```bash
cd mobile
npx tsc src/lib/daySchedule.ts src/lib/timetableGrouping.ts src/lib/periodUtils.ts src/lib/dataRepair.ts src/lib/dateUtils.ts src/lib/examEngine.ts src/lib/studyStreakEngine.ts src/engine/deadlineEngine.ts src/engine/cognitive-load.ts src/engine/dateHintParser.ts src/engine/sm2.ts src/engine/streak.ts src/types.ts --outDir dist-test --target es2022 --module commonjs --moduleResolution node --skipLibCheck --esModuleInterop
```

Then run each suite. Record output in the report. The suites that need a Gemini key (AI tests) should be noted as "skipped — requires API key" if they fail for that reason.

Priority suites (must pass):
- `node test_day_schedule_suite.mjs`
- `node test_v1_polish_suite.mjs`
- `node test_exam_engine_suite.mjs`
- `node test_streak_engine_suite.mjs`
- `node test_phase5_timetable.mjs`
- `node test_phase8_overrides.mjs`
- `node test_phase9_settings.mjs`
- `node test_phase12_release.mjs`
- `node test_add_from_text.mjs`
- `node test_sqlite_theme_task_suite.mjs`

### Step 3: Write characterization test suite
Create `mobile/test_characterization_v2_baseline.mjs`. This file locks in the current behavior of the 4 modules the scheduling engine depends on. Each test calls the real function with concrete inputs and asserts the exact output.

**3a. `getDayItems()` characterization** (from `dist-test/daySchedule.js`):
- Test: Monday with 3 consecutive Matematika entries (periods 1-3) → merged into 1 block with `periodRange: "1-3"`.
- Test: Day with a break entry (kind="break") → break appears in output, not counted as class.
- Test: Empty day (no entries for weekday 7) → returns empty array.
- Test: Day with `hasConflict: true` on overlapping entries → conflict flag is set.
- Test: Day off → returns empty (or flagged, depending on implementation — characterize the actual behavior).

**3b. `calculateNextClassDeadline()` characterization** (from `dist-test/deadlineEngine.js`):
- Test: Given today = Wednesday, subject has class on Thursday → deadline = Thursday.
- Test: Given today = Friday, subject has class on Monday → deadline = next Monday.
- Test: Subject has no classes → returns `{ found: false, reason: "NO_TIMETABLE_FOR_SUBJECT" }`.
- Test: Next class falls on a day off → skips to the following occurrence.
- Test: `afterNClasses: 2` → skips 1 class, returns the 2nd.

**3c. `getExamState()` characterization** (from `dist-test/examEngine.js`):
- Test: Exam tomorrow → label "Besok".
- Test: Exam today → label "Hari ini".
- Test: Exam in 15 days → label "15 hari lagi".
- Test: Past exam → label "Selesai".
- Test: Multi-day exam in progress → label "Sedang ujian".

**3d. `calculateStudyStreak()` characterization** (from `dist-test/studyStreakEngine.js`):
- Test: 3 consecutive study days → streak = 3.
- Test: Weekend with no study, Monday studied → streak continues (free day rule).
- Test: School day with no study → streak breaks.
- Test: Task completed in <2 minutes → filtered out (anti-cheat).
- Test: Focus log <10 minutes → filtered out (anti-cheat).

Use the same test harness pattern as the existing suites (plain `assert`, manual runner, pass/fail counter).

### Step 4: Clean debug logs
In `mobile/src/services/aiService.ts`, wrap all 5 `console.log(...)` calls:
```typescript
if (__DEV__) { console.log(...); }
```

In `mobile/src/screens/AIScannerScreen.tsx`, wrap all 3 `console.log(...)` calls:
```typescript
if (__DEV__) { console.log(...); }
```

Do NOT touch `console.warn` or `console.error` anywhere.

### Step 5: Verify
```bash
cd mobile
npx tsc --noEmit
node test_characterization_v2_baseline.mjs
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" | grep -v "__DEV__"
```

## Acceptance Criteria

- [ ] Branch `v1-backup-before-v2` exists and contains the full v1 codebase.
- [ ] All 10 priority test suites pass. Results recorded in the report.
- [ ] `test_characterization_v2_baseline.mjs` exists with at least 15 test cases across 4 modules.
- [ ] All characterization tests pass — they lock in current behavior, so by definition they must pass.
- [ ] Zero bare `console.log` in `mobile/src/` (every one is inside `if (__DEV__)`).
- [ ] `console.warn` and `console.error` calls remain unchanged.
- [ ] `npx tsc --noEmit` passes with zero errors.

## Tests

| Case | Input | Expected Output |
| :--- | :--- | :--- |
| Bare console.log grep | `grep -rn "console\.log" mobile/src/ --include="*.ts" --include="*.tsx" \| grep -v "__DEV__"` | Zero matching lines |
| TypeScript compile | `cd mobile && npx tsc --noEmit` | Exit code 0 |
| Characterization suite | `cd mobile && node test_characterization_v2_baseline.mjs` | All tests pass |
| Day schedule suite | `cd mobile && node test_day_schedule_suite.mjs` | 8/8 pass |
| Exam engine suite | `cd mobile && node test_exam_engine_suite.mjs` | All pass |
| Streak engine suite | `cd mobile && node test_streak_engine_suite.mjs` | All pass |

```bash
cd mobile
npx tsc --noEmit
node test_characterization_v2_baseline.mjs
node test_day_schedule_suite.mjs
node test_exam_engine_suite.mjs
node test_streak_engine_suite.mjs
node test_v1_polish_suite.mjs
```

## Do NOT Touch

- Any logic in `daySchedule.ts`, `deadlineEngine.ts`, `examEngine.ts`, `studyStreakEngine.ts` — these are read-only for characterization.
- Any screen component logic or layout.
- `docs/Plan.md` — the reviewer updates it.
- Any `console.warn` or `console.error` calls.

## Edge Cases

- `__DEV__` is globally defined by Metro bundler. If TypeScript complains, add `declare const __DEV__: boolean;` at the top of the file. Check if it already type-checks before adding.
- Some test suites may require a Gemini API key (`test_ai_foundation.mjs`, `test_step2_*.mjs`, `test_step3_*.mjs`, `test_step4_*.mjs`). If they fail due to missing key, mark them as "skipped — requires API key" in the report. They are not priority suites.
- The compilation step may fail if some source files import React Native modules. Use `--skipLibCheck` and if needed, mock the missing modules. Document any compilation workarounds.

## Phone Checklist

- [ ] App starts without crash on web (`npm run web`).
- [ ] App starts without crash on Expo Go (`npx expo start`).

## Report Format
After completing the task, create `docs/tasks/P0.report.md` with:
1. Branch created: `v1-backup-before-v2` — yes/no
2. All 19 test suite results in a table (suite name, pass count, fail count, skipped reason)
3. Characterization test results — full output
4. Files changed (with line counts)
5. Acceptance criteria — pass/fail for each
6. Compilation workarounds (if any)
7. Anything not completed and why

## Start Command
```
Read docs/Executor-Rules.md, then read this packet top to bottom before writing any code.
```
