# StudyAir Mobile — AI Benchmark Report

- **Run Timestamp**: 2026-10-25T01:51:25.310Z
- **Prompt Version**: `v2.0`
- **Total Samples Tested**: 9 (0 live API calls, 9 cached)
- **API Key Source**: `.env.local`

## Accuracy Summary

| Category / Metric | Tuning Set | Hold-out Set | Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Timetable OCR** | **93.3%** (1 samples) | **0%** (0 samples) | ≥ 90% | ⚠️ ATTENTION |
| **Whiteboards & Messages** | **96.3%** (8 samples) | **0%** (0 samples) | ≥ 85% | ⚠️ ATTENTION |

## Detailed Per-Sample Evaluation

| # | Set | Category | Sample Filename | Score | Target | Details | Cached |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Tuning | timetables | `timetable_01_weekly.png` | **93.3%** ✅ | ≥ 90% | 14/15 matched (AI returned 15) | Yes |
| 2 | Tuning | messages | `message_03_biologi_proyek.txt` | **100%** ✅ | ≥ 85% | Sub: 100%, Tasks: 1/1, Date: 100% | Yes |
| 3 | Tuning (Synthetic) | messages | `message_synthetic_01.txt` | **100%** ✅ | ≥ 85% | Sub: 100%, Tasks: 1/1, Date: 100% | Yes |
| 4 | Tuning (Synthetic) | messages | `message_synthetic_02.txt` | **100%** ✅ | ≥ 85% | Sub: 100%, Tasks: 2/2, Date: 100% | Yes |
| 5 | Tuning (Synthetic) | messages | `message_synthetic_03.txt` | **70%** ❌ | ≥ 85% | Sub: 100%, Tasks: 1/1, Date: 0% | Yes |
| 6 | Tuning (Synthetic) | messages | `message_synthetic_04.txt` | **100%** ✅ | ≥ 85% | Sub: 100%, Tasks: 1/1, Date: 100% | Yes |
| 7 | Tuning (Synthetic) | messages | `message_synthetic_05.txt` | **100%** ✅ | ≥ 85% | Sub: 100%, Tasks: 2/2, Date: 100% | Yes |
| 8 | Tuning (Synthetic) | messages | `message_synthetic_06.txt` | **100%** ✅ | ≥ 85% | Sub: 100%, Tasks: 3/3, Date: 100% | Yes |
| 9 | Tuning (Synthetic) | messages | `message_synthetic_07.txt` | **100%** ✅ | ≥ 85% | Sub: 100%, Tasks: 1/1, Date: 100% | Yes |

## Benchmark Observations & Recommendations
1. **Deterministic Parsing Rule**: AI extractions are purely observational; all deadline calculations, holiday skips, and time allocations remain strictly executed by TypeScript code.
2. **Hold-out Isolation**: 5 hold-out samples remained strictly sequestered for unbiased validation.
3. **Caching**: Future test runs automatically reuse cached JSON representations unless prompt versions increment.