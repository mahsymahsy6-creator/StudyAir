/**
 * StudyAir Mobile — Phase 15 Next Exams Screen Suite
 * Tests exam state derivation, multi-day exam event ingestion, study plan creation, and topic mastery.
 */

import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getExamState } = require("./dist-test/lib/examEngine.js");

export function createExamStudyPlan({
  exam,
  subjectId,
  todayStr = "2026-10-30",
}) {
  const examDate = exam.startDate || exam.date || exam.examDate || todayStr;
  const examTitle = exam.title || exam.name || "Ujian";

  return [
    {
      id: `task-exam-rev-${Date.now()}-1`,
      subjectId: subjectId || "general",
      title: `Review Kisi-kisi ${examTitle}`,
      type: "homework",
      givenDate: todayStr,
      deadlineDate: examDate,
      deadlineMode: "custom",
      estimatedMinutes: 45,
      status: "PENDING",
    },
    {
      id: `task-exam-prac-${Date.now()}-2`,
      subjectId: subjectId || "general",
      title: `Latihan Soal & Pembahasan ${examTitle}`,
      type: "homework",
      givenDate: todayStr,
      deadlineDate: examDate,
      deadlineMode: "custom",
      estimatedMinutes: 60,
      status: "PENDING",
    },
  ];
}

console.log("=== PHASE 15: NEXT EXAMS / ULANGAN SELANJUTNYA SUITE ===");

const todayStr = "2026-10-30";

const mockSubjects = [
  {
    id: "sub-mtk",
    name: "Matematika",
    title: "Matematika",
    color: "#1CB0F6",
    examDate: "2026-11-05", // 6 days away
    exam_date: "2026-11-05",
  },
  {
    id: "sub-fis",
    name: "Fisika",
    title: "Fisika",
    color: "#58CC02",
    examDate: "2026-10-25", // 5 days past
    exam_date: "2026-10-25",
  },
  {
    id: "sub-bio",
    name: "Biologi",
    title: "Biologi",
    color: "#FF9600",
    examDate: "2026-11-12", // 13 days away
    exam_date: "2026-11-12",
  },
];

const mockStudyUnits = [
  { id: "u-1", subject_id: "sub-mtk", title: "Trigonometri", is_completed: true },
  { id: "u-2", subject_id: "sub-mtk", title: "Integral", is_completed: false },
  { id: "u-3", subject_id: "sub-bio", title: "Genetika", is_completed: false },
];

const mockExamEvents = [
  {
    id: "event-pts",
    name: "Penilaian Tengah Semester (PTS)",
    startDate: "2026-11-15",
    endDate: "2026-11-20",
  },
  {
    id: "event-pas-past",
    name: "PTS Ganjil Lalu",
    startDate: "2026-09-10",
    endDate: "2026-09-15",
  },
];

// Test 1: Nearest upcoming exam is selected as nextExam
{
  const state = getExamState({
    subjects: mockSubjects,
    studyUnits: mockStudyUnits,
    examEvents: mockExamEvents,
    today: todayStr,
  });

  assert.ok(state.nextExam, "Should have a nextExam");
  assert.strictEqual(state.nextExam.title, "Matematika", "Next exam should be Matematika on 2026-11-05");
  assert.strictEqual(state.nextExam.daysLeft, 6, "Days left should be 6");
  assert.strictEqual(state.nextExam.label, "6 hari lagi");
  console.log("✓ Test 1 Passed: Nearest upcoming exam correctly selected as nextExam (Matematika, 6 hari lagi)");
}

// Test 2: Multi-factor upcoming vs past partition
{
  const state = getExamState({
    subjects: mockSubjects,
    studyUnits: mockStudyUnits,
    examEvents: mockExamEvents,
    today: todayStr,
  });

  // Upcoming: Matematika (Nov 5), Biologi (Nov 12), PTS (Nov 15)
  assert.strictEqual(state.upcomingExams.length, 3, "Should have 3 upcoming exams");
  assert.strictEqual(state.upcomingExams[0].title, "Matematika");
  assert.strictEqual(state.upcomingExams[1].title, "Biologi");
  assert.strictEqual(state.upcomingExams[2].title, "Penilaian Tengah Semester (PTS)");

  // Past: Fisika (Oct 25), PTS Ganjil Lalu (Sep 10-15)
  assert.strictEqual(state.pastExams.length, 2, "Should have 2 past exams");
  assert.ok(state.pastExams.some((e) => e.title === "Fisika"));
  assert.ok(state.pastExams.some((e) => e.title === "PTS Ganjil Lalu"));
  console.log("✓ Test 2 Passed: Partition into upcoming (3) and past (2) exams matches dates");
}

// Test 3: Topic mastery progress calculation
{
  const state = getExamState({
    subjects: mockSubjects,
    studyUnits: mockStudyUnits,
    examEvents: mockExamEvents,
    today: todayStr,
  });

  const mtkExam = state.upcomingExams.find((e) => e.title === "Matematika");
  assert.ok(mtkExam, "Matematika exam should exist");
  assert.strictEqual(mtkExam.totalTopics, 2, "MTK has 2 units");
  assert.strictEqual(mtkExam.doneTopics, 1, "MTK has 1 completed unit");
  assert.strictEqual(mtkExam.progressPercent, 50, "MTK mastery should be 50%");
  console.log("✓ Test 3 Passed: Topic mastery progress is correctly calculated (1/2 = 50%)");
}

// Test 4: AI study plan generation for an exam
{
  const state = getExamState({
    subjects: mockSubjects,
    studyUnits: mockStudyUnits,
    examEvents: mockExamEvents,
    today: todayStr,
  });

  const mtkExam = state.nextExam;
  const planTasks = createExamStudyPlan({
    exam: mtkExam,
    subjectId: "sub-mtk",
    todayStr,
  });

  assert.strictEqual(planTasks.length, 2, "Should generate 2 exam tasks");
  assert.ok(planTasks[0].title.includes("Review Kisi-kisi Matematika"));
  assert.strictEqual(planTasks[0].deadlineDate, "2026-11-05");
  assert.strictEqual(planTasks[0].estimatedMinutes, 45);
  assert.ok(planTasks[1].title.includes("Latihan Soal & Pembahasan Matematika"));
  assert.strictEqual(planTasks[1].deadlineDate, "2026-11-05");
  assert.strictEqual(planTasks[1].estimatedMinutes, 60);
  console.log("✓ Test 4 Passed: createExamStudyPlan generates review (45m) and practice (60m) tasks with exam deadline");
}

// Test 5: Multi-day exam event ongoing status
{
  const ongoingEvent = {
    id: "event-pas-ongoing",
    name: "UAS Semester 1",
    startDate: "2026-10-28",
    endDate: "2026-11-02",
  };

  const state = getExamState({
    subjects: [],
    studyUnits: [],
    examEvents: [ongoingEvent],
    today: todayStr,
  });

  assert.strictEqual(state.upcomingExams.length, 1);
  assert.strictEqual(state.upcomingExams[0].isOngoing, true);
  assert.strictEqual(state.upcomingExams[0].label, "Sedang ujian");
  assert.ok(state.summaryLabel.includes("Sedang ujian: UAS Semester 1"));
  console.log("✓ Test 5 Passed: Multi-day ongoing event displays 'Sedang ujian' and tops upcoming list");
}

// Test 6: Empty state handling
{
  const state = getExamState({
    subjects: [],
    studyUnits: [],
    examEvents: [],
    today: todayStr,
  });

  assert.strictEqual(state.hasExams, false);
  assert.strictEqual(state.nextExam, null);
  assert.strictEqual(state.upcomingExams.length, 0);
  assert.strictEqual(state.pastExams.length, 0);
  assert.strictEqual(state.summaryLabel, "Belum ada tanggal ujian - Atur");
  console.log("✓ Test 6 Passed: Empty state handled gracefully with fallback summary");
}

// Test 7: Exam tomorrow indicator
{
  const tomorrowSub = {
    id: "sub-kim",
    name: "Kimia",
    title: "Kimia",
    examDate: "2026-10-31", // tomorrow
  };

  const state = getExamState({
    subjects: [tomorrowSub],
    today: todayStr,
  });

  assert.strictEqual(state.nextExam.isTomorrow, true);
  assert.strictEqual(state.nextExam.label, "Besok");
  console.log("✓ Test 7 Passed: Exam scheduled tomorrow displays 'Besok'");
}

// Test 8: Exam today indicator
{
  const todaySub = {
    id: "sub-sej",
    name: "Sejarah",
    title: "Sejarah",
    examDate: "2026-10-30", // today
  };

  const state = getExamState({
    subjects: [todaySub],
    today: todayStr,
  });

  assert.strictEqual(state.nextExam.isToday, true);
  assert.strictEqual(state.nextExam.label, "Hari ini");
  console.log("✓ Test 8 Passed: Exam scheduled today displays 'Hari ini'");
}

console.log("==================================================");
console.log("ALL 8 PHASE 15 TESTS PASSED CLEANLY! ✓");
