# T-001: Remove Debug console.log from Production Files

**Status**: `todo`
**Branch**: `task/T-001`
**Depends on**: none
**Estimated effort**: ~30m

---

## Goal
Replace all `console.log` calls in production source files with `__DEV__`-guarded logging so release builds contain zero debug noise.

## Why
8 unguarded `console.log` statements ship to production. They leak internal timing data and service names to the device console, violate release hygiene, and slow down the JS bridge on low-end Android phones.

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/services/aiService.ts` (L136, L142, L191, L244, L294) | 5× `console.log` — wrap each in `if (__DEV__)` or replace with a no-op in prod. |
| `mobile/src/screens/AIScannerScreen.tsx` (L247, L250, L302) | 3× `console.log` — same treatment. |

`console.warn` and `console.error` in other files are legitimate error handling — do NOT touch them.

## Steps

1. In `mobile/src/services/aiService.ts`, find each of the 5 `console.log(...)` calls. Wrap each one with `if (__DEV__) { console.log(...); }`.
2. In `mobile/src/screens/AIScannerScreen.tsx`, find each of the 3 `console.log(...)` calls. Wrap each one with `if (__DEV__) { console.log(...); }`.
3. Run `npx tsc --noEmit` from `mobile/` to verify no type errors.
4. Search the entire `mobile/src/` tree for any remaining bare `console.log` (not wrapped in `__DEV__`). Report findings.
5. Run the existing test suites to confirm nothing breaks.

## Acceptance Criteria

- [ ] Zero bare `console.log` calls in `mobile/src/` — every one is inside an `if (__DEV__)` block.
- [ ] `console.warn` and `console.error` calls remain unchanged.
- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] All existing test suites still pass (run the day-schedule suite as a smoke test).

## Tests

No new test file needed. Run existing suites as regression check.

| Case | Input | Expected Output |
| :--- | :--- | :--- |
| Grep for bare `console.log` | `grep -rn "console\.log" mobile/src/ --include="*.ts" --include="*.tsx" \| grep -v "__DEV__"` | Zero matching lines |
| TypeScript compile | `npx tsc --noEmit` | Exit code 0 |

```bash
cd mobile
npx tsc --noEmit
node test_day_schedule_suite.mjs
```

## Do NOT Touch

- Any `console.warn` or `console.error` calls anywhere.
- Any test files (`mobile/test_*.mjs`).
- Any logic, imports, or exports in the modified files.
- `docs/Plan.md` — the reviewer updates it.

## Edge Cases

- `__DEV__` is globally defined by React Native / Metro bundler. Do NOT import it or declare it. If TypeScript complains, add `declare const __DEV__: boolean;` at the top of each file — but only if needed (check if it already type-checks first).

## Phone Checklist

- [ ] App launches without crash on web (`npm run web`).
- [ ] AI Scanner screen loads and camera button responds.
- [ ] No log output visible in production-mode console (check with `npx expo start --no-dev`).

## Report Format
After completing the task, create `docs/tasks/T-001.report.md` with:
1. Files changed (with line counts)
2. Acceptance criteria — pass/fail for each
3. Test results — paste full output
4. Anything not completed and why

## Start Command
```
Read docs/Executor-Rules.md, then read this packet top to bottom before writing any code.
```
