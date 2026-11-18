# Executor Rules — StudyAir Builder

Read this file **before every task**. Violations cause a REJECT review.

---

## 1. Read First, Code Second
1. Read `docs/Plan.md` and `docs/Bugs.md` before touching code.
2. Read the assigned `docs/tasks/T-###.md` packet **top to bottom**.
3. Read every file listed in the packet's "Context" table.
4. Do NOT read files not listed in the packet unless you hit a blocker. If you must, record them in your report.

## 2. Branch Discipline
- Create branch `task/T-###` from `main` before your first edit.
- Commit with message format: `T-###: <short description>`.
- Do NOT merge into main. Leave it for review.

## 3. Project Rules (apply to EVERY packet)
| Rule | Meaning |
| :--- | :--- |
| **AI extracts, code decides** | All dates, midnights, deadlines, and "next class" intervals are calculated deterministically by code. AI output is a suggestion requiring user confirmation. |
| **One source of truth** | `getDayItems()` for daily schedule, `getExamState()` for exams, `calculateNextClassDeadline()` for next-class. Do NOT duplicate logic. |
| **Indonesian strings** | All user-facing text comes from `mobile/src/lib/i18n.ts`. No hardcoded English or Indonesian in component files. |
| **Theme tokens** | All colors come from `mobile/src/theme.ts` via the `colors` proxy. No hardcoded hex values. |
| **No secrets** | Never write API keys, tokens, or personal data into code, comments, notes, or logs. |
| **Behavior-preserving** | Do not change existing behavior unless the packet explicitly says to. |

## 4. Coding Standards
- **Max 8 files** changed per packet.
- **TypeScript strict** — no `any` unless the packet says otherwise.
- **No `console.log`** in production code. Use only in test files.
- **Imports**: named imports, no barrel re-exports except `components/common/index.ts`.
- **Styles**: use `StyleSheet.create`, reference `colors`, `spacing`, `radius`, `typography` from theme.
- **Tests first**: if the packet contains logic (not just layout), write or update the test file before implementing.

## 5. After Completing Work
1. Run every test command listed in the packet's "Tests" section. Paste full output.
2. Walk through the "Phone Checklist" at 360dp width and 130% font scale.
3. Walk through every item in "Acceptance Criteria" — mark pass or fail.
4. Create `docs/tasks/T-###.report.md` following the "Report Format" section.
5. Update `docs/Bugs.md` if you found new bugs.
6. Do NOT update `docs/Plan.md` — the reviewer does that.

## 6. When You're Stuck
- If a step is ambiguous, pick the simplest interpretation, implement it, and note the ambiguity in your report.
- If a step requires touching files in "Do NOT Touch", STOP and note the conflict in your report. Do not proceed.
- If tests fail after 2 honest attempts, report what you tried and STOP. Do not hack around it.

## 7. File Opening Budget
- Open at most **10 source files** per task session.
- Use `grep` to find references rather than scanning entire directories.
- Record any architectural discoveries in your report so the planner can add them to `docs/Architecture.md`.
