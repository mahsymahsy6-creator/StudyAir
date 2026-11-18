# UI Fix Pass 2 Prompt

UI FIX PASS 2 (timetable wizard steps 4-5, Buat Mapel, Tambah Tugas, Tambah dari Teks)
Where this conflicts with UI FIX PASS 1, this pass wins for these screens. Layout, text, and the named logic fixes only. After each step: run the app at 360dp width, list changed files, then STOP and wait for "next".

STEP 1 - Wizard step 4: bell times (one shared editor, also used in Settings > Jam Belajar)
- Labels: "Jam 1" (not "Jam ke-1"). Buttons: "Lanjut ke ringkasan" and "Kembalikan jam standar".
- Quick setup card at the top: start time, period length (default 45 min), and break rules: "Istirahat 1 setelah jam 3 (15 mnt)", "Istirahat 2 / Ishoma setelah jam 6 (45 mnt)". "Terapkan" fills all rows, which stay editable afterwards.
- Rows: 48dp time fields that open a time picker, with the duration at the end of each row ("45 mnt"). Gaps between periods show as thin gray rows ("Istirahat - 15 mnt"), display only. If the imported timetable already has break entries (kind = break), use their labels and times. Breaks are never counted as classes or subjects.
- Add and remove a period. Only show periods up to the highest period used by the imported timetable, with "Tampilkan jam lain" for the rest.
- Validation (code): end after start, no overlaps, next start not before the previous end. Invalid fields turn red with a message, and the button is disabled until fixed.
- Optional, do this last: a "Jam berbeda di hari tertentu" toggle for schools with a shorter Friday. PeriodTime gets an optional weekday (null = default), and display, "now/next class", reminders, and the calendar use the weekday-specific times when present. If this looks risky, skip it and tell me.

STEP 2 - Wizard step 5: confirm and save
- Replace "9 jam pelajaran dijadwalkan" and "9 data baru" with a real summary: "9 sesi kelas - 3 hari - 4 mapel", plus a collapsible list per day (Senin: MTK - MTK - PJOK) so I can see what will be saved.
- If no schedule exists yet, show no choice, only the summary and "Simpan jadwal".
- If a schedule exists: show "Jadwal lama: 6 sesi -> Jadwal baru: 9 sesi" and a diff "Baru 6 - Diubah 2 - Sama 1 - Hilang 0". Diff key = (weekday, period): same key with a different subject = changed; same key and same subject = same; an old key missing from the import = removed (only in Replace mode).
- Default to "Gabungkan" (non-destructive). "Ganti semua jadwal lama" uses a neutral radio color (not red until selected) and the line "Tugas tidak ikut terhapus". Choosing it asks for confirmation on Save.
- Before any save over an existing schedule: automatic backup. After saving: go to Pelajaran > Per hari on the first school day, with a snackbar "Jadwal disimpan - Urungkan" (restores the backup, 10 seconds).
- Existing tasks stay. Tasks in "kelas berikutnya" mode get their deadlines recalculated, and a notice says how many changed.

STEP 3 - "Buat Mapel" sheet
- Header pattern for ALL sheets (also Steps 4 and 5): drag handle, centered title, X on the right. No back arrow unless the sheet was opened from Quick Actions (then back returns there). NO "Simpan" at the top. One primary button at the bottom ("Simpan mapel"), disabled until the name is filled.
- Title "Mapel baru". Placeholders in Indonesian: "mis. Matematika, Fisika, B. Inggris" (no "e.g.").
- Name field: suggestions as I type, from the default subject list and aliases ("mat" -> Matematika, Matematika Peminatan). Detect duplicates (case-insensitive, ignoring spaces and punctuation) and show "Mapel ini sudah ada" with a link to open it.
- Add optional "Singkatan" (mis. MTK, B.Ing), saved as aliases, and an optional "Tanggal ujian" with a date picker.
- Colors: 12 swatches. Preselect the least-used color (not always blue), give each swatch an accessibility name, and show the selected check clearly.
- "Barang bawaan": chips with a text field (comma or Enter adds a chip) and tappable suggestions (Buku paket, Buku tulis, Penggaris, Kalkulator, Pensil 2B, Baju olahraga). Remove "pisahkan koma".
- After saving: snackbar "Mapel dibuat - Tambah ke jadwal" (opens the Add class sheet).
- Replace the default webview focus ring on inputs with the themed style: 1.5dp blue border and soft glow, no white outline.

STEP 4 - "Tambah Tugas" sheet
- Title "Tugas baru". Placeholders in Indonesian ("mis. MTK hal 45 no 1-10", "Catatan tambahan (opsional)"). Remove the duplicate top "Simpan"; the bottom button is "Simpan tugas".
- Mapel: show ALL subjects as wrapping chips (2 rows max), or if there are more than 8, a "Pilih mapel" row that opens a searchable list. No clipped chips ("Matematika P..."). Do not silently preselect a subject: preselect only the subject of the current or next class, and make it clearly visible. The Save button is disabled until a subject and a title exist.
- Suggestions from the title (code, not AI): if the title contains a subject name or alias (MTK, B.Indo), show a tappable chip "Mapel: Matematika?". If it contains a date word the date parser understands (besok, lusa, Senin), show "Tenggat: Senin, 26 Okt?". Suggestions never change the form until tapped.
- "Diberikan: Min, 25 Okt" line (today, tap to change).
- Tenggat options in Indonesian with weekday dates: "Kelas berikutnya - Sen, 26 Okt", "2 kelas lagi - Sen, 2 Nov", "Pilih tanggal" (shows that text until a date is chosen). Dates come from the next-class function and count MEETINGS (days), not periods: a double period (Jam 1-2 on one day) is ONE meeting. If the subject has no upcoming class, disable the first two options and show "Mapel ini belum ada di jadwal".
- Fix the related label: a subject whose Jam 1-2 are on one day shows "1 pertemuan/minggu - 2 JP", not "2 sesi/minggu" (Pelajaran cards and the subject sheet).
- Keep the sheet scrollable above the keyboard so the notes field and the button stay reachable.

STEP 5 - "Tambah dari teks" sheet
- Title "Tambah dari teks", label "PESAN ATAU CATATAN", buttons "Tempel dari clipboard" and "Ekstrak tugas" (purple, AI). Placeholder fully in Indonesian. Hint under the box: "Bisa tempel beberapa pesan sekaligus. Nomor telepon dan nama pengirim dihapus otomatis sebelum dikirim ke AI."
- Before sending, code removes phone numbers and WhatsApp prefixes like "[24/10/26 13.05] Nama:" and keeps only the message text. The AI test runner uses the same cleaner function.
- "Ekstrak tugas" is disabled while the box is empty. An empty clipboard shows a toast "Clipboard kosong". While extracting: progress with a cancel button and a 20-second timeout. On failure, KEEP the pasted text, show a friendly message, and offer "Buat 1 tugas manual dari teks ini".
- The text box and buttons stay above the keyboard.
- The AI privacy notice appears once, the first time (what is sent, and that texts and photos aren't stored).
- Results go to the review screen: per task the subject, title, Diberikan = today, Tenggat = next class (editable), and the raw date phrase as a note. Nothing is saved until I confirm.

STEP 6 - Tests and QA
- Unit tests (no AI calls): bell-time generation and overlap validation, the merge diff counts, next-class options (meetings vs periods, no upcoming class), the pasted-text cleaner (WhatsApp prefix and phone number), and duplicate-subject detection.
- Check at 130% font and 360dp width: no clipped chips or buttons, tap targets at least 48dp, no English left on these 5 screens.
- Report the files changed and anything not verified.
