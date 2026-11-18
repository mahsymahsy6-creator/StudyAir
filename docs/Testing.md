# StudyAir - Testing Guide

## Automated Tests

The mobile test suite is built with Node.js test runners using compiled TypeScript modules in `mobile/dist-test/`.

| Test File | Coverage |
| :--- | :--- |
| `mobile/test_day_schedule_suite.mjs` | **Step 6 Day Schedule Test Suite**: Normal day consecutive merge, duplicates & overlaps (`hasConflict: true`), orphan entries (`Mapel hilang`), breaks (explicit + gaps >= 15 min), A/B pattern filtering, Sunday support, empty day handling, and header count vs rendered rows assertion. |
| `mobile/test_v1_polish_suite.mjs` | **V1 Polish Test Suite**: `calculateDaysLeft()` local midnight calculation, `formatLocaleDate()` Indonesian locale names, `formatStudyMinutes()` display formatting, period labeling & consecutive merging, and `i18n.ts` Indonesian dictionary completeness. |
| `mobile/test_phase5_timetable.mjs` | **Timetable Import Engine**: Deterministic text/CSV timetable parser, confidence scoring, and conflict resolution ("Merge" vs "Replace"). |
| `mobile/test_phase8_overrides.mjs` | **Days Off & Overrides**: Day off creation/deletion, class cancellation, subject swapping, additional classes, and effective schedule calculations. |
| `mobile/test_phase9_settings.mjs` | **Settings & Bell Times**: Bell schedule overlap validation, period gap detection, subject alias management, and data export/import. |
| `mobile/test_phase10_unit.mjs` | **Cognitive Engine & Streak**: Cognitive load balancing, study streak calculations, and priority queue ordering. |
| `mobile/test_phase11_extras.mjs` | **V1.1 Extras**: Tomorrow's bag checklist items, exam countdown calculations, and study unit tracking. |
| `mobile/test_phase12_release.mjs` | **Release Verification**: Feature flag configuration, environment variables, and store initialization defaults. |
| `mobile/test_add_from_text.mjs` | **Text Cleaner**: WhatsApp timestamp (`[24/10/26 13.05] Nama:`) and phone number stripping prior to AI task extraction. |
| `mobile/scripts/validate_test_samples.mjs` | **Dataset Validator**: Validates image formats, schemas, and ground-truth `.json` answer files across all sample folders. |

---

## AI Test Samples

Test samples are stored in `mobile/test_samples/` to evaluate AI extraction accuracy and benchmark performance against ground-truth labels:

```
mobile/test_samples/
├── timetables/
│   ├── timetable_01_weekly.png
│   ├── timetable_01_weekly.json
│   ├── timetable_02_class_blocks.png
│   ├── timetable_02_class_blocks.json
│   ├── timetable_03_grid.png
│   ├── timetable_03_grid.json
│   ├── holdout/
│   │   ├── timetable_holdout_01.png / .json
│   │   └── timetable_holdout_02.png / .json
│   └── synthetic/ (20 varied school timetable formats, resolutions & distortions)
├── whiteboards/
│   ├── whiteboard_01_homework.png
│   ├── whiteboard_01_homework.json
│   ├── whiteboard_02_math_exercises.png
│   ├── whiteboard_02_math_exercises.json
│   ├── whiteboard_03_biology_assignment.png
│   ├── whiteboard_03_biology_assignment.json
│   └── holdout/
│       ├── whiteboard_holdout_01.png / .json
│       └── whiteboard_holdout_02.png / .json
└── messages/
    ├── message_01_pr_matematika.txt / .json
    ├── message_02_group_announcement.txt / .json
    ├── message_03_biologi_proyek.txt / .json
    ├── holdout/
    │   └── message_holdout_01.txt / .json
    └── synthetic/ (10 WhatsApp message variants with timestamps, sender tags & emojis)
```

---

## Manual Phone Checklist

<!-- Empty for now - to be filled during release testing -->

---

## How to Run Tests

All test commands should be executed from the `mobile/` directory:

### 1. Compile Test Modules
```bash
cd mobile
npx tsc src/lib/daySchedule.ts src/lib/timetableGrouping.ts src/lib/periodUtils.ts src/lib/dataRepair.ts src/types.ts --outDir dist-test --target es2022 --module commonjs --moduleResolution node --skipLibCheck --ignoreConfig --ignoreDeprecations 6.0
```

### 2. Run Automated Test Suites
```bash
# Day Schedule & Single Source of Truth suite (8/8)
node test_day_schedule_suite.mjs

# V1 Polish & i18n suite (15/15)
node test_v1_polish_suite.mjs

# WhatsApp text cleaner test
node test_add_from_text.mjs

# Timetable parser test
node test_phase5_timetable.mjs

# Days off & overrides test
node test_phase8_overrides.mjs

# Settings & bell times test
node test_phase9_settings.mjs

# Release readiness test
node test_phase12_release.mjs
```

### 3. Run Static Type Checking
```bash
npx tsc --noEmit
```

### 4. Validate AI Datasets
```bash
node scripts/validate_test_samples.mjs
```

### 5. Start Mobile App Dev Server
```bash
# Start Metro / Expo bundler
npx expo start

# Start Web preview directly
npm run web
```
