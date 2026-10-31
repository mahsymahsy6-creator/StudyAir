/**
 * StudyAir Mobile — School Planner Grade Engine
 * 
 * Core calculations for:
 * 1. Weighted subject averages & letter grade conversion
 * 2. Cumulative report card GPA (Indonesian standard 0-100 & 4.0 scale)
 * 3. Target score simulator ("What-If" calculation for next test)
 * 4. Assessment filtering and statistics
 */

import { Grade, GradeCategory, Subject } from "../types";

export interface SubjectGradeSummary {
  subjectId: string;
  average: number; // 0 - 100
  letterGrade: string; // A, B, C, D, E
  gpaPoint: number; // 0.0 - 4.0
  gradeCount: number;
  targetGrade: number; // KKM / Target
  diffFromTarget: number; // average - targetGrade
  status: "NO_GRADES" | "ABOVE_TARGET" | "BELOW_TARGET" | "AT_TARGET";
  highestScore: number;
  lowestScore: number;
}

export interface OverallGPASummary {
  cumulativeAverage: number; // 0 - 100
  letterGrade: string;
  gpaScale4: number; // 0.0 - 4.0
  totalAssessments: number;
  gradedSubjectsCount: number;
  totalSubjectsCount: number;
  highestSubject: { subjectName: string; average: number; color: string } | null;
  lowestSubject: { subjectName: string; average: number; color: string } | null;
  performanceDescription: string;
}

export interface TargetNeededScoreResult {
  targetScore: number;
  neededScore: number;
  isFeasible: boolean; // neededScore <= 100
  alreadyMet: boolean;
  message: string;
}

/**
 * Maps 0-100 score to Indonesian Standard Letter Grade & 4.0 GPA scale
 */
export function getLetterGrade(score: number): {
  letter: string;
  gpaPoint: number;
  description: string;
  color: string;
} {
  if (score >= 90) {
    return { letter: "A", gpaPoint: 4.0, description: "Istimewa", color: "#10B981" };
  } else if (score >= 80) {
    return { letter: "B", gpaPoint: 3.0, description: "Baik", color: "#3B82F6" };
  } else if (score >= 70) {
    return { letter: "C", gpaPoint: 2.0, description: "Cukup", color: "#F59E0B" };
  } else if (score >= 60) {
    return { letter: "D", gpaPoint: 1.0, description: "Kurang", color: "#FB923C" };
  } else {
    return { letter: "E", gpaPoint: 0.0, description: "Perlu Remedial", color: "#EF4444" };
  }
}

/**
 * Indonesian localized category badge labels
 */
export function formatGradeCategory(category: GradeCategory): string {
  switch (category) {
    case "assignment":
      return "Tugas & PR";
    case "quiz":
      return "Kuis";
    case "exam":
      return "Ulangan / Ujian";
    case "project":
      return "Proyek / Praktik";
    default:
      return "Penilaian";
  }
}

/**
 * Category icon name for Ionicons
 */
export function getGradeCategoryIcon(category: GradeCategory): string {
  switch (category) {
    case "assignment":
      return "document-text-outline";
    case "quiz":
      return "help-circle-outline";
    case "exam":
      return "ribbon-outline";
    case "project":
      return "construct-outline";
    default:
      return "bookmark-outline";
  }
}

/**
 * Calculates weighted average and statistics for a single subject
 */
export function calculateSubjectGrade(
  grades: Grade[],
  subjectId: string,
  targetGrade: number = 80
): SubjectGradeSummary {
  const subjectGrades = grades.filter((g) => g.subjectId === subjectId);

  if (subjectGrades.length === 0) {
    return {
      subjectId,
      average: 0,
      letterGrade: "-",
      gpaPoint: 0,
      gradeCount: 0,
      targetGrade,
      diffFromTarget: 0,
      status: "NO_GRADES",
      highestScore: 0,
      lowestScore: 0,
    };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let highest = -Infinity;
  let lowest = Infinity;

  for (const g of subjectGrades) {
    // Normalize score to 100 scale if maxScore is different
    const normalizedScore = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : g.score;
    const w = g.weight > 0 ? g.weight : 1;

    totalWeightedScore += normalizedScore * w;
    totalWeight += w;

    if (normalizedScore > highest) highest = normalizedScore;
    if (normalizedScore < lowest) lowest = normalizedScore;
  }

  const rawAverage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const average = Math.round(rawAverage * 10) / 10;
  const gradeInfo = getLetterGrade(average);
  const diffFromTarget = Math.round((average - targetGrade) * 10) / 10;

  let status: SubjectGradeSummary["status"] = "AT_TARGET";
  if (diffFromTarget > 0) status = "ABOVE_TARGET";
  else if (diffFromTarget < 0) status = "BELOW_TARGET";

  return {
    subjectId,
    average,
    letterGrade: gradeInfo.letter,
    gpaPoint: gradeInfo.gpaPoint,
    gradeCount: subjectGrades.length,
    targetGrade,
    diffFromTarget,
    status,
    highestScore: Math.round(highest * 10) / 10,
    lowestScore: Math.round(lowest * 10) / 10,
  };
}

/**
 * Calculates cumulative report card average and GPA across all subjects
 */
export function calculateOverallGPA(
  subjects: Subject[],
  grades: Grade[]
): OverallGPASummary {
  if (subjects.length === 0) {
    return {
      cumulativeAverage: 0,
      letterGrade: "-",
      gpaScale4: 0,
      totalAssessments: grades.length,
      gradedSubjectsCount: 0,
      totalSubjectsCount: 0,
      highestSubject: null,
      lowestSubject: null,
      performanceDescription: "Belum ada mata pelajaran terdaftar.",
    };
  }

  let totalSubjectAverages = 0;
  let totalCredits = 0;
  let gradedSubjectsCount = 0;
  let highest: { subjectName: string; average: number; color: string } | null = null;
  let lowest: { subjectName: string; average: number; color: string } | null = null;

  for (const sub of subjects) {
    const target = sub.targetGrade ?? 80;
    const summary = calculateSubjectGrade(grades, sub.id, target);

    if (summary.gradeCount > 0) {
      gradedSubjectsCount++;
      const credits = sub.creditHours && sub.creditHours > 0 ? sub.creditHours : 2;
      totalSubjectAverages += summary.average * credits;
      totalCredits += credits;

      const subName = sub.title || sub.name || "Pelajaran";
      const subColor = sub.color || sub.color_hex || "#3B82F6";

      if (!highest || summary.average > highest.average) {
        highest = { subjectName: subName, average: summary.average, color: subColor };
      }
      if (!lowest || summary.average < lowest.average) {
        lowest = { subjectName: subName, average: summary.average, color: subColor };
      }
    }
  }

  const cumulativeAverage =
    totalCredits > 0 ? Math.round((totalSubjectAverages / totalCredits) * 10) / 10 : 0;
  const gradeInfo = getLetterGrade(cumulativeAverage);

  // Convert to 4.0 scale: (cumulativeAverage / 100) * 4
  const gpaScale4 =
    cumulativeAverage > 0 ? Math.round((cumulativeAverage / 25) * 100) / 100 : 0;

  let performanceDescription = "Belum ada nilai tercatat";
  if (gradedSubjectsCount > 0) {
    if (cumulativeAverage >= 88) {
      performanceDescription = "Luar biasa! Pertahankan prestasi gemilang ini.";
    } else if (cumulativeAverage >= 80) {
      performanceDescription = "Pencapaian sangat baik, di atas rata-rata umum.";
    } else if (cumulativeAverage >= 75) {
      performanceDescription = "Konsistensi belajar sudah bagus, terus tingkatkan.";
    } else {
      performanceDescription = "Fokus belajar pada mapel yang butuh penguatan.";
    }
  }

  return {
    cumulativeAverage,
    letterGrade: gradedSubjectsCount > 0 ? gradeInfo.letter : "-",
    gpaScale4,
    totalAssessments: grades.length,
    gradedSubjectsCount,
    totalSubjectsCount: subjects.length,
    highestSubject: highest,
    lowestSubject: lowest,
    performanceDescription,
  };
}

/**
 * Calculates the score required on the next test to reach or maintain a target score.
 * Formula: Needed = (Target * (SumW + W_next) - Sum(Score * W)) / W_next
 */
export function calculateNeededScoreForTarget(
  grades: Grade[],
  subjectId: string,
  targetScore: number,
  nextWeight: number = 1
): TargetNeededScoreResult {
  const subjectGrades = grades.filter((g) => g.subjectId === subjectId);
  const wNext = nextWeight > 0 ? nextWeight : 1;

  if (subjectGrades.length === 0) {
    return {
      targetScore,
      neededScore: targetScore,
      isFeasible: targetScore <= 100,
      alreadyMet: false,
      message: `Raih nilai minimal ${targetScore} pada ulangan pertamamu untuk mencapai target.`,
    };
  }

  let currentWeightedSum = 0;
  let currentTotalWeight = 0;

  for (const g of subjectGrades) {
    const normalizedScore = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : g.score;
    const w = g.weight > 0 ? g.weight : 1;
    currentWeightedSum += normalizedScore * w;
    currentTotalWeight += w;
  }

  const currentAverage = currentWeightedSum / currentTotalWeight;
  const newTotalWeight = currentTotalWeight + wNext;
  const rawNeeded = (targetScore * newTotalWeight - currentWeightedSum) / wNext;
  const neededScore = Math.round(rawNeeded * 10) / 10;

  if (currentAverage >= targetScore && neededScore <= 0) {
    return {
      targetScore,
      neededScore: 0,
      isFeasible: true,
      alreadyMet: true,
      message: `Target ${targetScore} sudah tercapai dengan aman (rata-rata saat ini ${Math.round(currentAverage * 10) / 10}).`,
    };
  }

  if (neededScore > 100) {
    return {
      targetScore,
      neededScore,
      isFeasible: false,
      alreadyMet: false,
      message: `Butuh nilai ${neededScore} (melebihi 100) pada ulangan berikutnya untuk rata-rata ${targetScore}. Butuh beberapa ulangan berturut-turut.`,
    };
  }

  return {
    targetScore,
    neededScore: Math.max(0, neededScore),
    isFeasible: true,
    alreadyMet: false,
    message: `Dapatkan minimal nilai ${Math.max(0, neededScore)} pada penilaian berikutnya agar rata-rata mencapai ${targetScore}.`,
  };
}
