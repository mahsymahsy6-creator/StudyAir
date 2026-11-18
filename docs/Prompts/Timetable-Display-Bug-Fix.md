# Timetable Display Bug Fix Prompt

BUG FIX: TIMETABLE NOT SHOWING CORRECTLY (Pelajaran list empty, Kalender classes not on the timeline)
Symptoms:
- Pelajaran > Per hari > Senin: the header says "10 kelas - 07:00-14:30" and the day tabs show counts, but the list says "Tidak ada kelas di hari Senin".
- Kalender: classes appear only in a strip above the timeline, the timeline is empty, "J1 Literasi" and "J1-2 Fisika" overlap on Tuesday, and the strip says "11 Pelajaran" while Pelajaran says 10.
Do not change the import flow or the visuals until Step 2.

STEP 1 - Diagnose only, no code changes
- Add a debug dump of the saved data: TimetableEntry counts per weekday with the RAW weekday values, periodNumber, subjectId, kind, and weekPattern; the full Subject list; orphan entries (subjectId matches no Subject); and entries sharing the same weekday + period (duplicates or overlaps).
- List every place that reads the timetable (Pelajaran Per hari, Per mapel, Kalender, Today/Tomorrow, subject sheet, reminders) with the function or query each one uses. Report the weekday conventions (Mon=1 or Sun=0, number vs string vs date), the weekPattern filter, and whether the merge-consecutive-periods code is used.
- Explain, with evidence (file and line), why the Senin header counts 10 but the list is empty, and why Kalender shows a strip instead of timeline blocks.
- Check the git history and tell me which change first broke it (UI Fix Pass 1 or 2, or the wizard's save/merge).
- Report and STOP.

STEP 2 - One source of truth
- Create one function getDayItems(weekday or date) that returns the ordered items for a day: class blocks (consecutive periods of the same subject, room, and teacher merged for display, with the original periods inside), breaks, and events. Use it in Pelajaran Per hari, Kalender, Today/Tomorrow, the subject sheet, and reminders.
- Every header count comes from this function's output so the number and the list can never disagree. Header format: "6 pelajaran - 10 JP - 07:00-14:30".
- The empty state appears only when this function returns zero items.
- Add a debug assertion that logs an error if a header count differs from the rendered rows.

STEP 3 - Data repair (back up first, show me a preview before changing anything)
- Orphan entries: never drop them silently. Show them as "Mapel hilang" with a Pilih mapel action. Offer an automatic relink by name or alias.
- Duplicates and overlaps: list entries with the same weekday + period (+ weekPattern). Show them as red conflicts in Pelajaran with Keep this / Delete this actions, and a "Rapikan otomatis" option that removes exact duplicates.
- Literasi and similar names must follow the break/event classifier (event by default). Re-run the classifier on existing entries and show the proposed changes, with a one-tap "Treat as subject" for ambiguous ones.
- Add a uniqueness rule for class entries on (weekday, periodNumber, weekPattern) so the import and the manual editor can't create duplicates again. Fix the merge save so it updates existing entries instead of adding copies.

STEP 4 - Pelajaran
- Per hari shows the class blocks from getDayItems (each expandable to its periods), breaks as thin gray dividers, and conflicts in red. Fix the doubled "+ + Mapel" button.
- Per mapel lists every subject, including the subjects of entries that had been orphaned.

STEP 5 - Kalender
- Draw class blocks ON the timeline at their bell times (top = start time, height = duration), with the subject color and name. Breaks are thin shaded bands, events lighter blocks. Overlapping classes sit side by side with a red conflict badge.
- Timeline range: earliest start minus 30 minutes to latest end plus 30 minutes. Scroll to the first class (or the current time on today).
- Replace the top strip ("Jadwal Sekolah - 11 Pelajaran") with a one-line summary from getDayItems. Keep the "+ Kelas tambahan" action as a button.
- Deadlines appear as markers, days off as a banner, and an empty day shows "Tidak ada kelas".

STEP 6 - Tests
- Unit tests for getDayItems: normal day, duplicates, orphans, breaks, A/B pattern, Sunday, and an empty day. A test that header count equals the number of rendered rows.
- Check the 5 weekdays on Pelajaran and Kalender: the same classes, the same count, and the same order.
- Report the files changed and anything not verified.
