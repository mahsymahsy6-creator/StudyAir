# T-002: Onboarding Flow QA & Polish — Complete Phase 12

**Status**: `todo`
**Branch**: `task/T-002`
**Depends on**: none
**Estimated effort**: ~1h

---

## Goal
Audit and polish the 3-step onboarding flow in `OnboardingModal.tsx` so a brand-new user can complete setup without confusion, all strings are in Indonesian, the UI passes tactile Duolingo standards, and Phase 12 can be marked `done`.

## Why
Phase 12 is the last phase before release. The onboarding modal exists and tests pass, but the flow has not been QA'd for string completeness, theme compliance, edge cases (empty subjects, skip paths, back navigation), or accessibility at 360dp/130%.

## Context

| File | What to do |
| :--- | :--- |
| `mobile/src/components/onboarding/OnboardingModal.tsx` (1047 lines) | Audit all 3 steps: Welcome & Subject Setup, Timetable Setup, Create First Task. Fix any issues found below. |
| `mobile/src/lib/i18n.ts` | Add any missing Indonesian onboarding strings. |
| `mobile/src/theme.ts` | Reference only — verify onboarding uses `colors.*` tokens, not hardcoded hex. |
| `mobile/src/store.tsx` | Reference only — verify `hasCompletedOnboarding` flag is set correctly on finish. |
| `mobile/App.tsx` | Reference only — verify onboarding gate logic (show modal when `!hasCompletedOnboarding`). |

## Steps

1. **Read** `OnboardingModal.tsx` top to bottom. List every user-facing string. Check each one:
   - Is it in Indonesian? (No English except brand name "StudyAir")
   - Does it use `t()` from `i18n.ts`, or is it hardcoded? Hardcoded Indonesian is acceptable here if the onboarding is self-contained, but note it.
   - Is there any English placeholder text remaining ("e.g.", "placeholder", "Type here")?

2. **Verify theme compliance**: Search the file for raw hex values (`#` followed by 3-8 hex chars). Every color must come from `colors.*`. The only exception is the `PresetSubjectItem.color` data array (those are subject colors, not UI chrome).

3. **Verify step navigation**:
   - Step 1 → Step 2: "Lanjut" button. What happens if zero subjects are selected? It should still allow proceeding (subjects can be added later).
   - Step 2 → Step 3: After choosing timetable method. What if user taps "Lewati" (skip)? Verify it moves to step 3.
   - Step 3 → Finish: "Selesai" or "Mulai belajar". Verify `hasCompletedOnboarding = true` is persisted.
   - Back navigation: Can the user go back from step 2 to step 1? From step 3 to step 2?

4. **Fix issues found** (likely):
   - Replace any English strings with Indonesian equivalents.
   - Replace any hardcoded hex colors (UI chrome, not subject data) with `colors.*` tokens.
   - Ensure "Lewati" (skip) paths work at every step.
   - Ensure buttons have minimum 48dp touch targets.
   - Ensure step indicator dots or progress bar reflects current step.

5. **Test at 360dp width and 130% font scale**:
   - No text truncation on subject chips.
   - Buttons are fully visible and not overlapping.
   - ScrollView works if content overflows.

6. **Run existing release test**:
   ```bash
   cd mobile
   node test_phase12_release.mjs
   ```

## Acceptance Criteria

- [ ] Zero English user-facing strings in the onboarding flow (except "StudyAir" brand name).
- [ ] Zero hardcoded hex colors in UI chrome (subject data colors in the preset array are exempt).
- [ ] User can complete the full 3-step flow: select jenjang → select subjects → choose timetable method → create first task → land on HomeScreen.
- [ ] User can skip any step and still complete onboarding.
- [ ] User can navigate back to previous steps.
- [ ] `hasCompletedOnboarding` is `true` in `appSettings` after completion.
- [ ] `test_phase12_release.mjs` passes.
- [ ] No text truncation at 360dp width / 130% font scale.

## Tests

No new test file. Run the existing release test and perform manual QA.

| Case | Input | Expected Output |
| :--- | :--- | :--- |
| Full happy path | Select SMA, pick 3 subjects, skip timetable, skip task, finish | Lands on HomeScreen, `hasCompletedOnboarding: true` |
| Skip everything | Skip step 1, skip step 2, skip step 3 | Lands on HomeScreen, `hasCompletedOnboarding: true` |
| Back navigation | Go to step 2, press back | Returns to step 1 with selections preserved |
| Zero subjects | Deselect all subjects, proceed | Proceeds without error |

```bash
cd mobile
node test_phase12_release.mjs
```

## Do NOT Touch

- `store.tsx` logic (read only).
- `App.tsx` navigation logic (read only).
- Any screen files outside of onboarding.
- `docs/Plan.md` — the reviewer updates it.

## Edge Cases

- **Jenjang change**: If user selects SMA then switches to SMP, the preset subject list should update. Verify selected subjects from the previous jenjang are cleared.
- **Very long subject names**: "Pendidikan Agama & Budi Pekerti (PAI)" — verify chip doesn't truncate at 360dp.
- **Theme interaction**: Onboarding should respect the current theme (default navy). Verify it doesn't assume dark mode hardcoded.

## Phone Checklist

- [ ] Modal covers full screen on 360dp width device.
- [ ] Step indicator (dots or progress bar) visible at top.
- [ ] All buttons ≥ 48dp touch target.
- [ ] Subject chips wrap correctly, no horizontal overflow.
- [ ] Keyboard doesn't cover input fields in step 3 (task creation).
- [ ] "Lewati" (skip) button visible and tappable on every step.

## Report Format
After completing the task, create `docs/tasks/T-002.report.md` with:
1. Files changed (with line counts)
2. Acceptance criteria — pass/fail for each
3. Test results — paste full output
4. Screenshots (if UI changed)
5. List of all strings that were in English and are now Indonesian
6. Anything not completed and why

## Start Command
```
Read docs/Executor-Rules.md, then read this packet top to bottom before writing any code.
```
