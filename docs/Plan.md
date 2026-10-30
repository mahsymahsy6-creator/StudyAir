# StudyAir - Plan

## Product Brief v2 (2026-10-29)

StudyAir is a **task schedule maker** for Indonesian middle and high school students. Students enter tasks with a deadline and an estimated study time. The app builds a plan of study blocks in the free time around classes. The school timetable is an INPUT, not the main feature.

**Success test**: a student can add a task in under 10 seconds, tap "Buat jadwal", and when opening the app knows what to do now within 3 seconds.

### Core Loop
```
Tambah tugas (with estimate)
  → Buat jadwal
  → Preview and accept
  → Follow "Rencana hari ini"
  → Mark done
  → Missed blocks are rescheduled
```

AI suggests (duration estimates, reading text and photos), code decides (the scheduler is deterministic and fully tested). Nothing from AI is saved without confirmation.

### Screens & Minimal UI

**Tabs**: Rencana | Tugas | Kalender, with a center "+" (Tugas baru, Dari foto, Dari teks).

**Header**: streak chip + settings icon. **Pengaturan**: Jadwal sekolah, Mapel, Waktu belajar, Pengingat, Streak, Data & Cadangan, Lanjutan.

1. **Rencana (home)**: header → NEXT block as one large card with "Mulai fokus" → today's remaining blocks → "Besok" collapsed to one line. If tasks are unscheduled: one banner with "Buat jadwal" button. Nothing else above the fold.
2. **Tugas**: grouped Terjadwal / Belum dijadwalkan / Tidak muat / Selesai. Each row: subject dot, title, deadline, next block time. "Buat jadwal" button when needed.
3. **Kalender**: Agenda by default (classes, blocks, deadlines, exams). Garis waktu and Bulan as secondary views. Blocks are dashed outlines; classes are solid.
4. **Sheets**: same BottomSheet component, required fields first, optional under "Opsi lainnya".

**Hidden or Moved**: Copilot (flag off), heatmap, cognitive-load chart, SM-2 UI, storage/backup card (→ Pengaturan), bag/uniform checklist (one row inside Besok), exam countdown (one line + "Buat rencana belajar"), Pelajaran tab (→ Pengaturan > Jadwal sekolah).

### Tidy Rules (every packet)
- One primary action per screen. Max 2 icon actions in a header. Max 3 sections above the fold.
- One level of detail by default; everything else into an expandable row or sheet.
- Cards only for tappable things. Subject color as 4dp stripe or dot. One accent color (blue); amber/red/green for status; purple for AI.
- 4 text sizes, 3 spacing steps (8, 16, 24), 16dp screen padding, one shared component per job.
- No duplicated information or actions on a screen. All text Indonesian from `i18n.ts`; local date formats; no ISO dates.

### Not Now
Cloud sync, social features, new analytics, Copilot chat, share-timetable (revisit after pilot).

---

## Working Rules
1. **Work phase by phase**: Complete each phase thoroughly before moving forward.
2. **Phase completion protocol**: After each phase, summarize changes, execute all automated tests, provide a manual phone checklist, and stop to await explicit confirmation.
3. **Do not break working features**: Preserve existing functionality, backwards-compatible models, and established UX patterns.
4. **AI extracts, code decides**: All dates, calendar midnights, deadline calculations, and "next class" intervals are deterministically calculated by code. AI output is strictly treated as suggestions and requires user confirmation before saving to storage.
5. **No personal data or secrets**: Never write API keys, access tokens, or student/teacher personal information into any notes or committed files.

---

## Legacy Phase Status (v1 — superseded by v2 roadmap)

> These phases built the codebase that v2 builds on. They are complete and not re-executed. Kept for historical reference.

| Phase | Name | Status |
| :--- | :--- | :--- |
| 0 | Audit | `done` |
| 1 | Fixes and simplification | `done` |
| 2 | Data foundation | `done` |
| 3 | Navigation and design system | `done` |
| 4 | AI foundation | `done` |
| 5 | Timetable import & repair | `done` |
| 6 | Today with Tomorrow dropdowns | `done` |
| 7 | Tasks (given date & deadline, AI capture) | `done` |
| 8 | Days off and one-time changes | `done` |
| 9 | Reminders and Settings | `done` |
| 10 | AI quality pass | `done` |
| 11 | V1.1 extras | `done` |
| 12 | Onboarding, polish, release | `superseded` |
| - | UI Fix Pass 1 | `done` |
| - | UI Fix Pass 2 | `done` |
| - | Timetable display bug fix | `done` |
| - | UI Tidy Pass | `done` |
| - | Next Exam Fix | `done` |
| - | Kalender Redesign | `done` |
| - | Study Streak | `done` |
| - | Duolingo-style UI Polish | `done` |
| - | Garis Waktu Timeline Fix | `done` |
| - | Multi-Theme Engine (7 Themes) | `done` |
| - | Preparation Feature Redesign & Editing | `done` |
| - | Duolingo-Calibrated Streak Screen | `done` |
| - | Error 19, Themes Proxy & Task Focus | `done` |
| - | Subject Tab Removal & Task Scheduler Focus | `done` |
| - | Streak Debug Menu & Simulator | `done` |
| - | App Audit Polish & Task Scheduler Finalization | `done` |

### Superseded Packets (v1)

| Packet | Goal | Status |
| :--- | :--- | :--- |
| T-001 | Remove debug console.log | `superseded` — folded into P0 |
| T-002 | Onboarding polish | `superseded` — onboarding will be rebuilt for v2 loop |
| T-003 | Split CalendarScreen | `superseded` — CalendarScreen rebuilt in P8 |

---

## v2 Roadmap — Task Packet Plan

Packets are ordered by dependency. Each packet is in `docs/tasks/P##-name.md`.

| Packet | Goal | Depends On | Status |
| :--- | :--- | :--- | :--- |
| **P0** | Safety net: backup branch, run all baseline tests, write characterization tests for core logic, clean debug logs | none | `done` |
| **P1** | Design foundation: audit shared components against tidy rules, add missing tokens, ensure 12 common components are correct | P0 | `done` |
| **P2** | Data model: add `estimatedMinutes` to Task, define `StudyBlock` / `BusyBlock` / `SchedulePrefs`, write migrations | P0 | `done` |
| **P3** | Scheduling engine: pure-function `buildSchedule()` with unit tests, property tests, and a debug simulation screen | P2 | `done` |
| **P4** | Add-task flow with time estimates, subject, and deadline — under 10 seconds | P1, P2 | `done` |
| **P5** | "Buat jadwal" flow: options sheet, preview, diff, edit, apply, undo | P3, P4 | `done` |
| **P6** | Rencana screen: NEXT block card + today's blocks + Besok + unscheduled banner | P5 | `done` |
| **P7** | Tugas screen: 4 groups (Terjadwal / Belum dijadwalkan / Tidak muat / Selesai) | P5 | `done` |
| **P8** | Kalender with blocks: Agenda (dashed outlines for blocks, solid for classes), Garis waktu, Bulan | P5 | `done` |
| **P9** | Execution loop: focus timer tied to blocks, missed-block rescheduling, notifications | P6 | `done` |
| **P10** | Navigation restructure: 3 tabs (Rencana, Tugas, Kalender) + center "+", Pengaturan regrouping, hide/move list | P6, P7, P8 | `done` |
| **P11** | Streak (counts finished blocks) and "Buat rencana belajar" from exams | P9 | `done` |
| **P12** | AI helpers: duration estimate, text/photo capture, review screen | P4 | `done` |
| **P13** | Cleanup, QA on real phones, pilot with 5-10 students | all | `done` |

```mermaid
graph LR
    P0 --> P1
    P0 --> P2
    P2 --> P3
    P1 --> P4
    P2 --> P4
    P3 --> P5
    P4 --> P5
    P5 --> P6
    P5 --> P7
    P5 --> P8
    P6 --> P9
    P6 --> P10
    P7 --> P10
    P8 --> P10
    P9 --> P11
    P4 --> P12
    P10 --> P13
    P11 --> P13
    P12 --> P13
```

## Status
All 14 task packets (P0 through P13) completed and verified with 100% passing automated test suites, clean TypeScript check, and strict adherence to tidy rules and architecture.


