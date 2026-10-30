/**
 * StudyAir Mobile — Exam Engine (Single Source of Truth)
 * 
 * Provides unified, timezone-safe calendar day calculations for subject exams
 * and multi-day exam periods (UAS, PTS, etc.).
 * 
 * Rules:
 * - Local calendar dates (not hours or raw millisecond division).
 * - Nearest date on or after today is next exam.
 * - If today falls inside an exam period: "Sedang ujian".
 * - Past exams are marked "Selesai" and NEVER appear in upcoming list.
 * - Labels: "Hari ini", "Besok", "N hari lagi" (never "h" or ISO strings).
 * - If no upcoming exams: "Belum ada tanggal ujian - Atur".
 */

import { format } from "date-fns";
import { Subject, StudyUnit, ExamEvent, Task } from "../types";
import { parseLocalMidnight, formatLocaleDate } from "./dateUtils";

export interface ExamItem {
  id: string;
  title: string;
  subject?: Subject;
  event?: ExamEvent;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  daysLeft: number;
  label: string;      // "Sedang ujian", "Hari ini", "Besok", "31 hari lagi", "Selesai"
  isOngoing: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  isPassed: boolean;
  doneTopics: number;
  totalTopics: number;
  progressPercent: number;
}

export interface GetExamStateOptions {
  subjects?: Subject[];
  studyUnits?: StudyUnit[];
  examEvents?: ExamEvent[];
  today?: Date | string;
}

export interface ExamStateResult {
  nextExam: ExamItem | null;
  upcomingExams: ExamItem[];
  pastExams: ExamItem[];
  allExams: ExamItem[];
  summaryLabel: string;
  hasExams: boolean;
  totalUpcoming: number;
  overallDoneTopics: number;
  overallTotalTopics: number;
  overallProgressPercent: number;
}

/**
 * Calculates unified exam state across the application.
 */
export function getExamState(options: GetExamStateOptions = {}): ExamStateResult {
  const subjects = options.subjects || [];
  const studyUnits = options.studyUnits || [];
  const examEvents = options.examEvents || [];

  const baseTodayMidnight = parseLocalMidnight(options.today || new Date());
  const todayTime = baseTodayMidnight.getTime();

  const allCandidateItems: ExamItem[] = [];

  // 1. Process Subject-specific exam dates
  for (const sub of subjects) {
    const rawDate = sub.examDate || sub.exam_date;
    if (!rawDate || typeof rawDate !== "string" || !rawDate.trim()) {
      continue;
    }
    const cleanDate = rawDate.trim();
    const startMidnight = parseLocalMidnight(cleanDate);
    const startTime = startMidnight.getTime();

    // Subject topics progress
    const subUnits = studyUnits.filter((u) => u.subject_id === sub.id);
    const doneTopics = subUnits.filter((u) => u.is_completed).length;
    const totalTopics = subUnits.length;
    const progressPercent = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

    const diffDays = Math.round((startTime - todayTime) / 86400000);
    const isToday = diffDays === 0;
    const isTomorrow = diffDays === 1;
    const isPassed = diffDays < 0;
    const isOngoing = false; // Single-day subject exams use 'Hari ini'

    let label: string;
    if (isPassed) {
      label = "Selesai";
    } else if (isToday) {
      label = "Hari ini";
    } else if (isTomorrow) {
      label = "Besok";
    } else {
      label = `${diffDays} hari lagi`;
    }

    allCandidateItems.push({
      id: `subj-exam-${sub.id}`,
      title: sub.title || sub.name || "Ujian",
      subject: sub,
      startDate: cleanDate,
      daysLeft: isPassed ? diffDays : Math.max(0, diffDays),
      label,
      isOngoing,
      isToday,
      isTomorrow,
      isPassed,
      doneTopics,
      totalTopics,
      progressPercent,
    });
  }

  // 2. Process Multi-day Exam Events (e.g. UAS, PTS)
  for (const event of examEvents) {
    if (!event || !event.startDate) continue;
    const cleanStart = event.startDate.trim();
    const cleanEnd = (event.endDate || event.startDate).trim();

    const startMidnight = parseLocalMidnight(cleanStart);
    const endMidnight = parseLocalMidnight(cleanEnd);

    const startTime = startMidnight.getTime();
    const endTime = endMidnight.getTime();

    const diffToStart = Math.round((startTime - todayTime) / 86400000);
    const isOngoing = todayTime >= startTime && todayTime <= endTime;
    const isPassed = todayTime > endTime;
    const isToday = !isOngoing && diffToStart === 0;
    const isTomorrow = !isOngoing && diffToStart === 1;

    let label: string;
    if (isOngoing) {
      label = "Sedang ujian";
    } else if (isPassed) {
      label = "Selesai";
    } else if (isToday) {
      label = "Hari ini";
    } else if (isTomorrow) {
      label = "Besok";
    } else {
      label = `${diffToStart} hari lagi`;
    }

    allCandidateItems.push({
      id: event.id || `event-exam-${cleanStart}-${event.name}`,
      title: event.name,
      event,
      startDate: cleanStart,
      endDate: cleanEnd,
      daysLeft: isOngoing ? 0 : isPassed ? diffToStart : Math.max(0, diffToStart),
      label,
      isOngoing,
      isToday,
      isTomorrow,
      isPassed,
      doneTopics: 0,
      totalTopics: 0,
      progressPercent: 0,
    });
  }

  // 3. Partition into Upcoming vs Past
  const upcomingExams: ExamItem[] = [];
  const pastExams: ExamItem[] = [];

  for (const item of allCandidateItems) {
    if (item.isPassed) {
      pastExams.push(item);
    } else {
      upcomingExams.push(item);
    }
  }

  // 4. Sort Upcoming: nearest date first (ongoing 0 first, then nearest future date), then alphabetical
  upcomingExams.sort((a, b) => {
    if (a.isOngoing && !b.isOngoing) return -1;
    if (!a.isOngoing && b.isOngoing) return 1;
    if (a.daysLeft !== b.daysLeft) {
      return a.daysLeft - b.daysLeft;
    }
    return a.title.localeCompare(b.title);
  });

  // Past exams sorted newest-past first
  pastExams.sort((a, b) => b.daysLeft - a.daysLeft);

  const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;

  // 5. Generate Summary Label
  let summaryLabel: string;
  if (!nextExam) {
    summaryLabel = "Belum ada tanggal ujian - Atur";
  } else if (nextExam.isOngoing) {
    summaryLabel = `Sedang ujian: ${nextExam.title}`;
  } else {
    summaryLabel = `Ujian berikutnya: ${nextExam.title} - ${nextExam.label}`;
  }

  // Overall topics progress
  let overallDoneTopics = 0;
  let overallTotalTopics = 0;
  for (const exam of upcomingExams) {
    overallDoneTopics += exam.doneTopics;
    overallTotalTopics += exam.totalTopics;
  }
  const overallProgressPercent =
    overallTotalTopics > 0 ? Math.round((overallDoneTopics / overallTotalTopics) * 100) : 0;

  return {
    nextExam,
    upcomingExams,
    pastExams,
    allExams: allCandidateItems,
    summaryLabel,
    hasExams: allCandidateItems.length > 0,
    totalUpcoming: upcomingExams.length,
    overallDoneTopics,
    overallTotalTopics,
    overallProgressPercent,
  };
}

/**
 * Generates structured exam review and practice tasks leading to an exam date.
 */
export function createExamStudyPlan({
  exam,
  subjectId,
  todayStr = format(new Date(), "yyyy-MM-dd"),
}: {
  exam: ExamItem | ExamEvent | { name?: string; title?: string; startDate?: string; date?: string; examDate?: string };
  subjectId: string;
  todayStr?: string;
}): Task[] {
  const examDate = (exam as any).startDate || (exam as any).date || (exam as any).examDate || todayStr;
  const examTitle = (exam as any).title || (exam as any).name || "Ujian";

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

