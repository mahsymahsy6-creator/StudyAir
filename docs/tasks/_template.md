# T-###: [One-Line Goal]

**Status**: `todo` | `in-progress` | `review` | `pass` | `fix`
**Branch**: `task/T-###`
**Depends on**: T-??? (or "none")
**Estimated effort**: ~Xh

---

## Goal
One sentence describing the single observable outcome of this packet.

## Why
One sentence explaining the user-facing or architectural reason this matters.

## Context
Exact file paths and function/type names the builder will read and change. Found via search, not guessing.

| File | What to do |
| :--- | :--- |
| `mobile/src/...` | … |

## Steps
Numbered, imperative steps. Each step produces a testable intermediate result.

1. …
2. …
3. …

## Acceptance Criteria
Observable, testable statements. A reviewer can check each one independently.

- [ ] …
- [ ] …

## Tests
Concrete test cases with inputs and expected outputs, plus the exact commands to run them.

| Case | Input | Expected Output |
| :--- | :--- | :--- |
| … | … | … |

```bash
# Compile & run
cd mobile
npx tsc <files> --outDir dist-test --target es2022 --module commonjs --moduleResolution node --skipLibCheck
node <test_file>.mjs
```

## Do NOT Touch
Files, features, or behaviors the builder must leave unchanged.

- …

## Edge Cases
Specific scenarios the implementation must handle correctly.

- …

## Phone Checklist
Manual checks to perform on a 360dp-width device at 130% font scale.

- [ ] …

## Report Format
After completing the task, create `docs/tasks/T-###.report.md` with:
1. Files changed (with line counts)
2. Acceptance criteria — pass/fail for each
3. Test results — paste full output
4. Screenshots (if UI changed)
5. Anything not completed and why

## Start Command
```
Read docs/Executor-Rules.md, then read this packet top to bottom before writing any code.
```
