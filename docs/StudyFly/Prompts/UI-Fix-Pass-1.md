# UI Fix Pass 1 Prompt (Tidy Pass)

TIDY PASS (layout, hierarchy, and consistency only; no feature removed, nothing deleted. Extra items move behind a tap.)
After each step: run the app at 360dp width and 130% font, list changed files, then STOP and wait for "next".

TIDY RULES (apply to every screen)
- One primary action per screen. Max 2 icon actions in a header. Max 3 sections visible without scrolling.
- Show one level of detail. Everything else goes into an expandable row, a bottom sheet, or a detail screen.
- Fewer boxes: use spacing and section titles instead of a border around everything. Cards only for things I can tap.
- Subject color appears only as a 4dp stripe or a small dot, never as large fills.
- Only 4 text sizes (title, section, body, caption). Only 3 vertical spacings (8, 16, 24). Same screen padding (16dp) everywhere.
- One accent color (blue). Amber, red, and green are for status only. Purple only for AI.
- Same component for the same job: one header, one sheet style, one primary and one secondary button, one chip, one empty state.
- Remove duplicates: the same information or the same action shown twice on a screen.

STEP 1 - Inventory (no code changes)
- Search the project for hardcoded colors, font sizes, paddings, radii, and one-off button, card, and header styles. List the duplicates and which shared component should replace each.
- For each of the 5 tabs and each sheet, list every element above the fold. Mark what is primary, what can collapse, and what is duplicated. Then STOP.

STEP 2 - Shared building blocks
- Move all values into the theme file. Build ONE ScreenHeader, SectionHeader, Card, ListRow, PrimaryButton, SecondaryButton, TextButton, Chip, StatusPill, BottomSheet (handle, title, X, one bottom button), EmptyState, Snackbar.
- Replace the one-off styles in all screens with these. Look must not change except for consistency.

STEP 3 - Hari Ini
- Order: slim header (date plus streak), Now/Next class, "Besok" accordion, "Tugas" list. That is all that shows by default.
- Stats row, bag checklist, and exam info move behind a tap: the bag checklist becomes one row inside the Besok section ("Tas & seragam - 3/8", tap to open), exams become one compact line ("Ujian berikutnya: Matematika - 31 hari lagi") that opens the exam list.
- Header "Hari Ini" has the date and one icon (settings). No other buttons. The empty "today" state is one slim line.
- Task rows: subject dot, title, and one status pill. Given date, notes, and delete move into the task detail or a swipe.
- Limit lists: Besok shows up to 4 classes with "Lihat semua", Tugas shows up to 5 with "Lihat semua".

STEP 4 - Pelajaran and Kalender
- Pelajaran: header with the title and ONE button ("+" with a menu: Mapel baru, Impor jadwal). Segmented control, day tabs, then the day list. Break rows thin and gray.
- Class rows: subject, time, and room on one compact line each. Teacher, bring items, and the edit action go in the detail sheet.
- Kalender: title plus month, one icon for Hari Libur, and "+" opens the sheet. Remove the extra strip above the timeline. Timeline blocks show only subject and time.

STEP 5 - Kemajuan, Settings, and sheets
- Kemajuan: one weekly summary card, then the exam list. Everything else is hidden or moved to Settings.
- Settings: grouped sections (Tampilan, Pengingat, Jam pelajaran, Data & Cadangan, Lanjutan), each collapsed to a one-line row that opens its own screen. No long scrolling page.
- All sheets use the BottomSheet component: handle, centered title, X, one primary button at the bottom. Forms show required fields first and optional ones under "Opsi lainnya".

STEP 6 - Quality check
- Look for: elements touching the edge, text cut off, anything under 48dp, two primary buttons on one screen, mixed spacing, mixed language.
- Compare each screen before and after (screenshots) and report how many elements were removed above the fold. List anything that still looks crowded.
