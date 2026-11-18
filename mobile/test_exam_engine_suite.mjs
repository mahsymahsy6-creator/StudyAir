/**
 * Unit Test Suite for getExamState()
 * 
 * Tests:
 * 1. Exam today
 * 2. Exam tomorrow
 * 3. Past exam (marked 'Selesai', never upcoming)
 * 4. Date inside an exam period ('Sedang ujian')
 * 5. Two exams on the same day (sorted alphabetically)
 * 6. None set ('Belum ada tanggal ujian - Atur')
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getExamState } = require("./dist-test/lib/examEngine.js");

console.log("==================================================");
console.log("   STUDYAIR EXAM ENGINE TEST SUITE");
console.log("==================================================");

const BASE_TODAY = "2026-10-26"; // Senin, 26 Okt 2026

// 1. Exam today
{
  const subjects = [
    { id: "sub-1", name: "Fisika", title: "Fisika", color: "#3A86FF", color_hex: "#3A86FF", examDate: "2026-10-26", exam_date: "2026-10-26", aliases: [], bringItems: [] },
  ];
  const state = getExamState({ subjects, today: BASE_TODAY });
  assert.ok(state.nextExam !== null, "Should have next exam");
  assert.equal(state.nextExam.title, "Fisika");
  assert.equal(state.nextExam.isToday, true);
  assert.equal(state.nextExam.daysLeft, 0);
  assert.equal(state.nextExam.label, "Hari ini");
  assert.equal(state.summaryLabel, "Ujian berikutnya: Fisika - Hari ini");
  console.log("  ✓ 1. Exam today: correctly returns 'Hari ini' and 0 days left");
}

// 2. Exam tomorrow
{
  const subjects = [
    { id: "sub-2", name: "Kimia", title: "Kimia", color: "#EF4444", color_hex: "#EF4444", examDate: "2026-10-27", exam_date: "2026-10-27", aliases: [], bringItems: [] },
  ];
  const state = getExamState({ subjects, today: BASE_TODAY });
  assert.ok(state.nextExam !== null, "Should have next exam");
  assert.equal(state.nextExam.title, "Kimia");
  assert.equal(state.nextExam.isTomorrow, true);
  assert.equal(state.nextExam.daysLeft, 1);
  assert.equal(state.nextExam.label, "Besok");
  assert.equal(state.summaryLabel, "Ujian berikutnya: Kimia - Besok");
  console.log("  ✓ 2. Exam tomorrow: correctly returns 'Besok' and 1 day left");
}

// 3. Past exam (marked 'Selesai', never upcoming)
{
  const subjects = [
    { id: "sub-past", name: "Sejarah", title: "Sejarah", color: "#F59E0B", color_hex: "#F59E0B", examDate: "2026-10-20", exam_date: "2026-10-20", aliases: [], bringItems: [] },
    { id: "sub-next", name: "Biologi", title: "Biologi", color: "#10B981", color_hex: "#10B981", examDate: "2026-11-05", exam_date: "2026-11-05", aliases: [], bringItems: [] },
  ];
  const state = getExamState({ subjects, today: BASE_TODAY });
  assert.equal(state.upcomingExams.length, 1, "Only future exam should be upcoming");
  assert.equal(state.nextExam.title, "Biologi");
  assert.equal(state.pastExams.length, 1);
  assert.equal(state.pastExams[0].title, "Sejarah");
  assert.equal(state.pastExams[0].label, "Selesai");
  assert.equal(state.pastExams[0].isPassed, true);
  console.log("  ✓ 3. Past exam: marked 'Selesai' and never appears in upcoming list");
}

// 4. Date inside an exam period ('Sedang ujian')
{
  const examEvents = [
    { id: "ev-pts", name: "Penilaian Tengah Semester (PTS)", startDate: "2026-10-25", endDate: "2026-10-30" },
  ];
  const state = getExamState({ examEvents, today: BASE_TODAY });
  assert.ok(state.nextExam !== null);
  assert.equal(state.nextExam.isOngoing, true);
  assert.equal(state.nextExam.label, "Sedang ujian");
  assert.equal(state.summaryLabel, "Sedang ujian: Penilaian Tengah Semester (PTS)");
  console.log("  ✓ 4. Date inside exam period: returns 'Sedang ujian' and ongoing state");
}

// 5. Two exams on the same day
{
  const subjects = [
    { id: "sub-sosiologi", name: "Sosiologi", title: "Sosiologi", color: "#3A86FF", color_hex: "#3A86FF", examDate: "2026-11-10", exam_date: "2026-11-10", aliases: [], bringItems: [] },
    { id: "sub-antropologi", name: "Antropologi", title: "Antropologi", color: "#A855F7", color_hex: "#A855F7", examDate: "2026-11-10", exam_date: "2026-11-10", aliases: [], bringItems: [] },
  ];
  const state = getExamState({ subjects, today: BASE_TODAY });
  assert.equal(state.upcomingExams.length, 2);
  assert.equal(state.upcomingExams[0].daysLeft, 15);
  assert.equal(state.upcomingExams[1].daysLeft, 15);
  // Alphabetical sort tie-break
  assert.equal(state.upcomingExams[0].title, "Antropologi");
  assert.equal(state.upcomingExams[1].title, "Sosiologi");
  assert.equal(state.nextExam.title, "Antropologi");
  console.log("  ✓ 5. Two exams on same day: correctly handled and sorted alphabetically");
}

// 6. None set
{
  const subjects = [
    { id: "sub-empty", name: "Matematika", title: "Matematika", color: "#3A86FF", color_hex: "#3A86FF", aliases: [], bringItems: [] },
  ];
  const state = getExamState({ subjects, today: BASE_TODAY });
  assert.equal(state.nextExam, null);
  assert.equal(state.upcomingExams.length, 0);
  assert.equal(state.summaryLabel, "Belum ada tanggal ujian - Atur");
  console.log("  ✓ 6. None set: returns null nextExam and 'Belum ada tanggal ujian - Atur'");
}

// 7. Topics progress calculation
{
  const subjects = [
    { id: "sub-math", name: "Matematika", title: "Matematika", color: "#3A86FF", color_hex: "#3A86FF", examDate: "2026-11-25", exam_date: "2026-11-25", aliases: [], bringItems: [] },
  ];
  const studyUnits = [
    { id: "u-1", subject_id: "sub-math", title: "Bab 1", is_completed: true, estimated_minutes: 30, cognitive_load: "LOW", sort_order: 1, completed_at: null },
    { id: "u-2", subject_id: "sub-math", title: "Bab 2", is_completed: true, estimated_minutes: 30, cognitive_load: "LOW", sort_order: 2, completed_at: null },
    { id: "u-3", subject_id: "sub-math", title: "Bab 3", is_completed: false, estimated_minutes: 30, cognitive_load: "LOW", sort_order: 3, completed_at: null },
  ];
  const state = getExamState({ subjects, studyUnits, today: BASE_TODAY });
  assert.equal(state.nextExam.doneTopics, 2);
  assert.equal(state.nextExam.totalTopics, 3);
  assert.equal(state.nextExam.progressPercent, 67);
  console.log("  ✓ 7. Topics progress: correctly computes done / total topics and percentage");
}

console.log("==================================================");
console.log("   ALL 7 EXAM ENGINE TESTS PASSED");
console.log("==================================================");
