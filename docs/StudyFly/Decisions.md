# StudyAir - Decisions Log

This document records architectural, functional, and product decisions made for StudyAir. Every entry is dated and attributed.

---

### 2026-10-26: Docs folder (Obsidian vault) created for project notes
- **Decision**: Establish `docs/` as an Obsidian vault at the project root containing `Plan.md`, `Bugs.md`, `Decisions.md`, `Testing.md`, and `Prompts/`.
- **Rationale**: Keeps project state, bug fixes, architecture rules, and testing commands organized in a single readable location that can be opened in Obsidian or Antigravity without scanning the entire codebase.
- **Attribution**: Per my instructions.

### 2026-10-26: One source of truth for daily schedule (`getDayItems`)
- **Decision**: Create a single function `getDayItems(target, options)` in `daySchedule.ts` used across Pelajaran (Per hari), Kalender, Today/Tomorrow, the subject sheet, and notifications.
- **Rationale**: Eliminates desynchronization where the header showed "10 kelas" while the list reported "Tidak ada kelas". Consecutive periods are merged for display into blocks while retaining underlying periods, and empty states appear strictly when total items equal zero.
- **Attribution**: Per my instructions.

### 2026-10-26: Kalender class blocks drawn ON timeline at bell times
- **Decision**: Draw class blocks directly onto the hourly calendar timeline (`top = start, height = duration`) instead of inside a separate horizontal strip above the grid.
- **Rationale**: Visual timeline layout makes school hours immediately clear. Overlapping classes (e.g. Tuesday duplicate) sit side-by-side with red `[Konflik]` badges, breaks render as thin shaded bands, and events appear as lighter themed blocks.
- **Attribution**: Per my instructions.

### 2026-10-26: Timetable break/event rows are kind = break/event, never subjects
- **Decision**: Entries for Istirahat, Ishoma, Upacara, and Literasi are assigned `kind: "break"` or `kind: "event"` with empty `subjectId`.
- **Rationale**: Breaks and school ceremonies must never pollute the Subject list, appear in subject management cards, or count as academic classes.
- **Attribution**: Per my instructions.

### 2026-10-26: Deadlines default to the next class of the subject; AI never decides dates
- **Decision**: Task deadlines default to the next upcoming school meeting of the subject, calculated deterministically by code. Double periods on the same day count as ONE meeting.
- **Rationale**: AI is prone to hallucinating dates. The rule "AI extracts, code decides" ensures deadlines match real school timetable meetings and requires explicit user confirmation.
- **Attribution**: Per my instructions.

### 2026-10-26: AI key mode A (personal key in Settings) for testing, mode B (backend) before student rollout
- **Decision**: Support Mode A (direct user-provided Gemini API key stored in SecureStore via Settings) for testing/development, with architectural support for Mode B (backend proxy URL and token) before distributing to students.
- **Rationale**: Allows rapid iterative testing during development without exposing production backend credentials, while preparing a secure zero-key onboarding path for students.
- **Attribution**: Per my instructions.

### 2026-10-26: Copilot hidden for V1 (feature flag off)
- **Decision**: Disable the AI Copilot modal for the V1 release via `FEATURE_FLAGS.ENABLE_AI_COPILOT: false`.
- **Rationale**: Keeps the core student loop focused and distraction-free: see tomorrow's classes, know what is due, get reminded, and finish tasks.
- **Attribution**: Per my instructions.
