/**
 * StudyAir Mobile — School Planner Grade Engine
 * 
 * Core calculations for:
 * 1. Weighted subject averages & letter grade conversion (Indonesian Kurikulum Merdeka)
 * 2. Cumulative report card GPA & SNBP eligibility analysis
 * 3. KKM / KKTP completion tracking ("X dari Y Mapel Tuntas")
 * 4. Target score simulator ("What-If" calculation for next test)
 * 5. TKA (Tes Kemampuan Akademik) flexible calculator for UTBK & SMA Unggulan
 */

import {
  Grade,
  GradeCategory,
  Subject,
  TKASubtest,
  TKAPresetType,
  TKACalculationResult,
  SNBPSummary,
  SNBPEligibilityTier,
} from "../types";

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
  isCompletedKKM: boolean;
  kkmStatusText: string;
}

export interface OverallGPASummary {
  cumulativeAverage: number; // 0 - 100
  letterGrade: string;
  gpaScale4: number; // 0.0 - 4.0
  totalAssessments: number;
  gradedSubjectsCount: number;
  totalSubjectsCount: number;
  completedKKMCount: number;
  incompleteKKMCount: number;
  kkmCompletionRate: number; // 0 - 100%
  highestSubject: { subjectName: string; average: number; color: string } | null;
  lowestSubject: { subjectName: string; average: number; color: string } | null;
  performanceDescription: string;
  snbpSummary: SNBPSummary;
}

export interface TargetNeededScoreResult {
  targetScore: number;
  neededScore: number;
  isFeasible: boolean; // neededScore <= 100
  alreadyMet: boolean;
  message: string;
}

/**
 * Maps 0-100 score to Indonesian Standard Letter Grade (Kurikulum Merdeka & K13) & 4.0 GPA scale
 * A: 85 - 100 (Sangat Baik / Mahir)
 * B: 75 - 84  (Baik / Cakap)
 * C: 65 - 74  (Cukup / Layak)
 * D: 50 - 64  (Kurang / Perlu Bimbingan)
 * E: < 50     (Perlu Remedial)
 */
export function getLetterGrade(score: number): {
  letter: string;
  gpaPoint: number;
  description: string;
  color: string;
} {
  if (score >= 85) {
    return { letter: "A", gpaPoint: 4.0, description: "Sangat Baik", color: "#10B981" };
  } else if (score >= 75) {
    return { letter: "B", gpaPoint: 3.0, description: "Baik", color: "#3B82F6" };
  } else if (score >= 65) {
    return { letter: "C", gpaPoint: 2.0, description: "Cukup", color: "#F59E0B" };
  } else if (score >= 50) {
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
 * Calculates weighted average, statistics, and KKM completion for a single subject
 */
export function calculateSubjectGrade(
  grades: Grade[],
  subjectId: string,
  targetGrade: number = 75
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
      isCompletedKKM: false,
      kkmStatusText: "Belum Ada Nilai",
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
  const isCompletedKKM = average >= targetGrade;

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
    isCompletedKKM,
    kkmStatusText: isCompletedKKM ? "Tuntas KKM" : "Di Bawah KKM",
  };
}

/**
 * Calculates cumulative report card average (0-100), KKM statistics, and SNBP eligibility
 */
export function calculateOverallGPA(
  subjects: Subject[],
  grades: Grade[]
): OverallGPASummary {
  const emptySNBP: SNBPSummary = {
    overallAverage: 0,
    eligibleTier: "low",
    tierBadgeText: "Perlu Peningkatan",
    eligibleDescription: "Belum ada nilai tercatat untuk analisis SNBP.",
  };

  if (subjects.length === 0) {
    return {
      cumulativeAverage: 0,
      letterGrade: "-",
      gpaScale4: 0,
      totalAssessments: grades.length,
      gradedSubjectsCount: 0,
      totalSubjectsCount: 0,
      completedKKMCount: 0,
      incompleteKKMCount: 0,
      kkmCompletionRate: 0,
      highestSubject: null,
      lowestSubject: null,
      performanceDescription: "Belum ada mata pelajaran terdaftar.",
      snbpSummary: emptySNBP,
    };
  }

  let totalSubjectAverages = 0;
  let totalCredits = 0;
  let gradedSubjectsCount = 0;
  let completedKKMCount = 0;
  let incompleteKKMCount = 0;
  let highest: { subjectName: string; average: number; color: string } | null = null;
  let lowest: { subjectName: string; average: number; color: string } | null = null;

  for (const sub of subjects) {
    const target = sub.targetGrade ?? 75;
    const summary = calculateSubjectGrade(grades, sub.id, target);

    if (summary.gradeCount > 0) {
      gradedSubjectsCount++;
      const credits = sub.creditHours && sub.creditHours > 0 ? sub.creditHours : 2;
      totalSubjectAverages += summary.average * credits;
      totalCredits += credits;

      if (summary.isCompletedKKM) {
        completedKKMCount++;
      } else {
        incompleteKKMCount++;
      }

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

  const kkmCompletionRate =
    gradedSubjectsCount > 0
      ? Math.round((completedKKMCount / gradedSubjectsCount) * 100)
      : 0;

  // SNBP Eligibility Analysis
  let eligibleTier: SNBPEligibilityTier = "low";
  let tierBadgeText = "Perlu Peningkatan";
  let eligibleDescription = "Tingkatkan nilai rapor semester ini untuk peluang kuota eligible SNBP.";

  if (cumulativeAverage >= 85) {
    eligibleTier = "high";
    tierBadgeText = "Sangat Berpeluang (Top 25%)";
    eligibleDescription = "Peluang besar masuk kuota siswa eligible SNBP (Akreditasi A: Top 40% / Top 25%).";
  } else if (cumulativeAverage >= 78) {
    eligibleTier = "medium";
    tierBadgeText = "Berpeluang Bersaing";
    eligibleDescription = "Nilai cukup kompetitif untuk bersaing dalam kuota eligible sekolah.";
  }

  const snbpSummary: SNBPSummary = {
    overallAverage: cumulativeAverage,
    eligibleTier,
    tierBadgeText,
    eligibleDescription,
  };

  let performanceDescription = "Belum ada nilai tercatat";
  if (gradedSubjectsCount > 0) {
    if (cumulativeAverage >= 85) {
      performanceDescription = "Luar biasa! Rata-rata rapor sangat memuaskan dan berpeluang tinggi SNBP.";
    } else if (cumulativeAverage >= 78) {
      performanceDescription = "Pencapaian baik, di atas rata-rata umum sekolah.";
    } else if (cumulativeAverage >= 70) {
      performanceDescription = "Konsistensi belajar sudah bagus, terus tingkatkan ketuntasan KKM.";
    } else {
      performanceDescription = "Fokus belajar pada mapel yang belum tuntas KKM.";
    }
  }

  return {
    cumulativeAverage,
    letterGrade: gradedSubjectsCount > 0 ? gradeInfo.letter : "-",
    gpaScale4,
    totalAssessments: grades.length,
    gradedSubjectsCount,
    totalSubjectsCount: subjects.length,
    completedKKMCount,
    incompleteKKMCount,
    kkmCompletionRate,
    highestSubject: highest,
    lowestSubject: lowest,
    performanceDescription,
    snbpSummary,
  };
}

/**
 * Calculates average of specific SNBP Supporting Subjects (Mapel Pendukung Prodi SNBP)
 */
export function calculateSNBPSupportingAverage(
  subjects: Subject[],
  grades: Grade[],
  supportingSubjectIds: string[]
): number {
  if (supportingSubjectIds.length === 0) return 0;

  let total = 0;
  let count = 0;

  for (const id of supportingSubjectIds) {
    const sub = subjects.find((s) => s.id === id);
    if (!sub) continue;
    const summary = calculateSubjectGrade(grades, id, sub.targetGrade ?? 75);
    if (summary.gradeCount > 0) {
      total += summary.average;
      count++;
    }
  }

  return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
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

// ─── TKA (Tes Kemampuan Akademik) Engine ───

export interface TKAPresetConfig {
  presetType: TKAPresetType;
  title: string;
  subtests: TKASubtest[];
  defaultTarget: number;
  scaleMax: number;
}

/**
 * Returns preset configuration for TKA calculations
 */
export function getTKAPreset(presetType: TKAPresetType): TKAPresetConfig {
  switch (presetType) {
    case "utbk_saintek":
      return {
        presetType: "utbk_saintek",
        title: "TKA UTBK Saintek (Skala 0-1000)",
        defaultTarget: 650,
        scaleMax: 1000,
        subtests: [
          { id: "mat_ipa", name: "Matematika IPA", score: 660, maxScore: 1000, weight: 1 },
          { id: "fisika", name: "Fisika", score: 620, maxScore: 1000, weight: 1 },
          { id: "kimia", name: "Kimia", score: 650, maxScore: 1000, weight: 1 },
          { id: "biologi", name: "Biologi", score: 690, maxScore: 1000, weight: 1 },
        ],
      };
    case "utbk_soshum":
      return {
        presetType: "utbk_soshum",
        title: "TKA UTBK Soshum (Skala 0-1000)",
        defaultTarget: 650,
        scaleMax: 1000,
        subtests: [
          { id: "sosiologi", name: "Sosiologi", score: 670, maxScore: 1000, weight: 1 },
          { id: "sejarah", name: "Sejarah", score: 630, maxScore: 1000, weight: 1 },
          { id: "geografi", name: "Geografi", score: 640, maxScore: 1000, weight: 1 },
          { id: "ekonomi", name: "Ekonomi", score: 680, maxScore: 1000, weight: 1 },
        ],
      };
    case "sma_unggulan":
      return {
        presetType: "sma_unggulan",
        title: "TKA Masuk SMA Unggulan (MAN IC, TN, Labschool)",
        defaultTarget: 80,
        scaleMax: 100,
        subtests: [
          { id: "mat_sma", name: "Matematika", score: 85, maxScore: 100, weight: 2 },
          { id: "ipa_sma", name: "IPA (Fisika-Biologi)", score: 82, maxScore: 100, weight: 2 },
          { id: "indo_sma", name: "Bahasa Indonesia", score: 88, maxScore: 100, weight: 1 },
          { id: "inggris_sma", name: "Bahasa Inggris", score: 84, maxScore: 100, weight: 1 },
        ],
      };
    case "custom":
    default:
      return {
        presetType: "custom",
        title: "TKA Kustom (Bebas Atur Subtes)",
        defaultTarget: 75,
        scaleMax: 100,
        subtests: [
          { id: "sub_1", name: "Subtes 1", score: 80, maxScore: 100, weight: 1 },
          { id: "sub_2", name: "Subtes 2", score: 75, maxScore: 100, weight: 1 },
        ],
      };
  }
}

/**
 * Calculates weighted TKA average, comparison against target passing grade,
 * identifies strongest/weakest subtest, and delivers actionable study drill guidance.
 */
export function calculateTKAResult(
  presetType: TKAPresetType,
  subtests: TKASubtest[],
  targetPassingGrade: number
): TKACalculationResult {
  if (subtests.length === 0) {
    return {
      presetType,
      averageScore: 0,
      totalWeightedScore: 0,
      targetPassingGrade,
      isPassed: false,
      diffFromTarget: -targetPassingGrade,
      strongestSubtest: null,
      weakestSubtest: null,
      recommendation: "Tambahkan subtes untuk menghitung nilai TKA.",
    };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  let strongest: { name: string; score: number } | null = null;
  let weakest: { name: string; score: number } | null = null;
  let highestRatio = -Infinity;
  let lowestRatio = Infinity;

  for (const s of subtests) {
    const w = s.weight > 0 ? s.weight : 1;
    const score = Number(s.score) || 0;
    const max = Number(s.maxScore) > 0 ? Number(s.maxScore) : 100;
    const ratio = score / max;

    totalWeightedScore += score * w;
    totalWeight += w;

    if (ratio > highestRatio) {
      highestRatio = ratio;
      strongest = { name: s.name, score };
    }
    if (ratio < lowestRatio) {
      lowestRatio = ratio;
      weakest = { name: s.name, score };
    }
  }

  const rawAverage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const averageScore = Math.round(rawAverage * 10) / 10;
  const diffFromTarget = Math.round((averageScore - targetPassingGrade) * 10) / 10;
  const isPassed = averageScore >= targetPassingGrade;

  let recommendation = "";
  if (isPassed) {
    const diffText = diffFromTarget > 0 ? `+${diffFromTarget}` : "0";
    recommendation = `Target tercapai (${diffText} poin di atas target). Pertahankan konsistensi pada subtes ${strongest?.name || "unggulan"}.`;
  } else {
    const deficit = Math.abs(diffFromTarget);
    recommendation = `Perlu +${deficit} poin untuk passing grade. Tingkatkan latihan soal pada ${weakest?.name || "subtes terendah"} (${weakest?.score || 0}).`;
  }

  return {
    presetType,
    averageScore,
    totalWeightedScore: Math.round(totalWeightedScore * 10) / 10,
    targetPassingGrade,
    isPassed,
    diffFromTarget,
    strongestSubtest: strongest,
    weakestSubtest: weakest,
    recommendation,
  };
}
