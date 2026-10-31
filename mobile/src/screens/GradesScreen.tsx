/**
 * StudyAir Mobile — School Planner Grades & GPA Screen (Tab 4)
 * 
 * Comprehensive Indonesian academic performance tracker:
 * 1. Indonesian Report Card Standard (Skala 0-100 & Predikat Kurikulum Merdeka)
 * 2. KKM / KKTP Completion Monitor ("X dari Y Mapel Tuntas")
 * 3. Analisis Kelayakan SNBP (Eligibilitas Kuota & Mapel Pendukung Prodi Tujuan)
 * 4. Kalkulator Nilai TKA (UTBK Saintek/Soshum & SMA Unggulan)
 * 5. Interactive "What-If" Target Simulator
 * 6. Quick Add Grade Sheet & Teacher Directory Modal integration
 * 7. Duolingo tactile 3D styling and theme compliance
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, typography, touchTarget, spacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { Grade, Subject } from "../types";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { Card } from "../components/common/Card";
import { AddGradeSheet } from "../components/grades/AddGradeSheet";
import { TeacherDirectoryModal } from "../components/teachers/TeacherDirectoryModal";
import { TKACalculatorModal } from "../components/grades/TKACalculatorModal";
import {
  calculateSubjectGrade,
  calculateOverallGPA,
  calculateNeededScoreForTarget,
  calculateSNBPSupportingAverage,
  formatGradeCategory,
  getGradeCategoryIcon,
} from "../lib/gradeEngine";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";

interface GradesScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
}

export function GradesScreen({ navigation }: GradesScreenProps) {
  const { subjects, grades, addGrade, updateGrade, deleteGrade, setSubjectTargetGrade } =
    useMobileStudyStore();

  // Expanded subject cards state (subjectId -> boolean)
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Record<string, boolean>>({});

  // Active view mode: "rapor" (standard report card) vs "snbp" (SNBP admission analysis)
  const [activeTabMode, setActiveTabMode] = useState<"rapor" | "snbp">("rapor");

  // Selected supporting subjects for SNBP (up to 2 subjects)
  const [snbpSupportingSubjectIds, setSnbpSupportingSubjectIds] = useState<string[]>([]);

  // Modals state
  const [addGradeVisible, setAddGradeVisible] = useState(false);
  const [selectedSubjectIdForAdd, setSelectedSubjectIdForAdd] = useState<string | undefined>();
  const [gradeToEdit, setGradeToEdit] = useState<Grade | null>(null);
  const [teacherDirectoryVisible, setTeacherDirectoryVisible] = useState(false);
  const [tkaModalVisible, setTkaModalVisible] = useState(false);

  // Simulator modal state
  const [simulatorVisible, setSimulatorVisible] = useState(false);
  const [simSubjectId, setSimSubjectId] = useState<string>("");
  const [simTargetScore, setSimTargetScore] = useState<string>("85");
  const [simWeight, setSimWeight] = useState<number>(1);

  // Overall GPA & Indonesian Report calculation
  const overallSummary = useMemo(() => {
    return calculateOverallGPA(subjects, grades);
  }, [subjects, grades]);

  // Subject grade summaries map
  const subjectSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateSubjectGrade>>();
    subjects.forEach((s) => {
      const target = s.targetGrade != null ? s.targetGrade : 75;
      map.set(s.id, calculateSubjectGrade(grades, s.id, target));
    });
    return map;
  }, [subjects, grades]);

  // SNBP Supporting Subjects average
  const snbpSupportingAverage = useMemo(() => {
    return calculateSNBPSupportingAverage(subjects, grades, snbpSupportingSubjectIds);
  }, [subjects, grades, snbpSupportingSubjectIds]);

  const toggleExpandSubject = (subjectId: string) => {
    HapticFeedback.light();
    setExpandedSubjectIds((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const toggleSupportingSubject = (subjectId: string) => {
    HapticFeedback.light();
    setSnbpSupportingSubjectIds((prev) => {
      if (prev.includes(subjectId)) {
        return prev.filter((id) => id !== subjectId);
      }
      if (prev.length >= 2) {
        // limit to 2 supporting subjects per SNBP rules, replace oldest
        return [prev[1], subjectId];
      }
      return [...prev, subjectId];
    });
  };

  const handleOpenAddGrade = (subjectId?: string) => {
    HapticFeedback.light();
    soundFX.playClick();
    setGradeToEdit(null);
    setSelectedSubjectIdForAdd(subjectId);
    setAddGradeVisible(true);
  };

  const handleOpenEditGrade = (g: Grade) => {
    HapticFeedback.light();
    soundFX.playClick();
    setGradeToEdit(g);
    setSelectedSubjectIdForAdd(g.subjectId);
    setAddGradeVisible(true);
  };

  const handleDeleteGrade = (g: Grade) => {
    Alert.alert(
      "Hapus Catatan Nilai",
      `Apakah Anda yakin ingin menghapus catatan nilai "${g.title}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            HapticFeedback.heavy();
            soundFX.playClick();
            await deleteGrade(g.id);
          },
        },
      ]
    );
  };

  const handleOpenSimulator = (initialSubId?: string) => {
    HapticFeedback.light();
    soundFX.playClick();
    const defaultSubId =
      initialSubId || (subjects.length > 0 ? subjects[0].id : "");
    setSimSubjectId(defaultSubId);
    const sub = subjects.find((s) => s.id === defaultSubId);
    setSimTargetScore(String(sub?.targetGrade || 80));
    setSimWeight(1);
    setSimulatorVisible(true);
  };

  // Simulator calculation result
  const simulationResult = useMemo(() => {
    if (!simSubjectId) return null;
    const target = parseFloat(simTargetScore) || 80;
    return calculateNeededScoreForTarget(grades, simSubjectId, target, simWeight);
  }, [grades, simSubjectId, simTargetScore, simWeight]);

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        title="Nilai & Rapor"
        subtitle={
          overallSummary.gradedSubjectsCount > 0
            ? `Rata-rata: ${overallSummary.cumulativeAverage} (${overallSummary.letterGrade}) • ${overallSummary.totalAssessments} Penilaian`
            : "Pelacak Nilai Akademik Standar Indonesia"
        }
        actions={[
          {
            icon: "calculator-outline",
            accessibilityLabel: "Kalkulator Nilai TKA",
            onPress: () => {
              HapticFeedback.light();
              soundFX.playClick();
              setTkaModalVisible(true);
            },
          },
          {
            icon: "people-outline",
            accessibilityLabel: "Daftar Guru",
            onPress: () => {
              HapticFeedback.light();
              soundFX.playClick();
              setTeacherDirectoryVisible(true);
            },
          },
          {
            icon: "add",
            accessibilityLabel: "Catat Nilai Baru",
            onPress: () => handleOpenAddGrade(),
          },
        ]}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Cumulative Report Card Hero Banner (Standar Indonesia) ─── */}
        <Card style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>RATA-RATA RAPOR INDONESIA</Text>
              <View style={styles.heroScoreRow}>
                <Text style={styles.heroScoreText}>
                  {overallSummary.cumulativeAverage > 0
                    ? overallSummary.cumulativeAverage.toFixed(1)
                    : "0.0"}
                </Text>
                <View style={styles.heroGradePill}>
                  <Text style={styles.heroGradePillText}>
                    Predikat {overallSummary.letterGrade}
                  </Text>
                </View>
              </View>

              {/* Ketuntasan KKM indicator */}
              <View style={styles.kkmSummaryRow}>
                <Ionicons
                  name={
                    overallSummary.incompleteKKMCount === 0 && overallSummary.gradedSubjectsCount > 0
                      ? "checkmark-circle"
                      : "alert-circle"
                  }
                  size={14}
                  color={
                    overallSummary.incompleteKKMCount === 0 && overallSummary.gradedSubjectsCount > 0
                      ? colors.emerald
                      : colors.amber
                  }
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.kkmSummaryText}>
                  {overallSummary.gradedSubjectsCount > 0
                    ? `${overallSummary.completedKKMCount} dari ${overallSummary.gradedSubjectsCount} Mapel Tuntas KKM (${overallSummary.kkmCompletionRate}%)`
                    : "Belum ada nilai KKM"}
                </Text>
              </View>
            </View>

            {/* Quick Action Buttons in Hero Banner */}
            <View style={styles.heroActionsCol}>
              <Pressable
                style={styles.tkaCtaBtn}
                onPress={() => {
                  HapticFeedback.light();
                  soundFX.playClick();
                  setTkaModalVisible(true);
                }}
                hitSlop={touchTarget.min / 4}
                accessibilityLabel="Kalkulator TKA"
              >
                <Ionicons name="calculator" size={15} color="#FFFFFF" />
                <Text style={styles.tkaCtaText}>Nilai TKA</Text>
              </Pressable>

              <Pressable
                style={styles.simulatorCtaBtn}
                onPress={() => handleOpenSimulator()}
                hitSlop={touchTarget.min / 4}
                accessibilityLabel="Buka Simulator Nilai"
              >
                <Ionicons name="speedometer-outline" size={15} color="#FFFFFF" />
                <Text style={styles.simulatorCtaText}>Simulator</Text>
              </Pressable>
            </View>
          </View>

          {/* Performance Motivation Message */}
          <View style={styles.performanceRow}>
            <Ionicons name="sparkles" size={14} color={colors.amber} style={{ marginRight: 6 }} />
            <Text style={styles.performanceText}>
              {overallSummary.performanceDescription}
            </Text>
          </View>

          {/* Quick Highlight Stats Strip */}
          <View style={styles.statsStrip}>
            {overallSummary.highestSubject && (
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>TERTINGGI</Text>
                <Text style={styles.statBoxValue} numberOfLines={1}>
                  {overallSummary.highestSubject.subjectName}
                </Text>
                <Text style={[styles.statBoxScore, { color: colors.emerald }]}>
                  {overallSummary.highestSubject.average.toFixed(1)}
                </Text>
              </View>
            )}

            {overallSummary.lowestSubject && overallSummary.gradedSubjectsCount > 1 && (
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>PERLU PENGUATAN</Text>
                <Text style={styles.statBoxValue} numberOfLines={1}>
                  {overallSummary.lowestSubject.subjectName}
                </Text>
                <Text style={[styles.statBoxScore, { color: colors.amber }]}>
                  {overallSummary.lowestSubject.average.toFixed(1)}
                </Text>
              </View>
            )}

            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>KETUNTASAN KKM</Text>
              <Text style={styles.statBoxValue}>
                {overallSummary.completedKKMCount} / {overallSummary.gradedSubjectsCount}
              </Text>
              <Text style={[styles.statBoxScore, { color: colors.primary }]}>
                {overallSummary.kkmCompletionRate}% Tuntas
              </Text>
            </View>
          </View>
        </Card>

        {/* ─── Mode Switcher: Rapor & KKM vs Analisis SNBP ─── */}
        <View style={styles.viewModeSwitcher}>
          <Pressable
            style={[
              styles.viewModeTab,
              activeTabMode === "rapor" && styles.viewModeTabActive,
            ]}
            onPress={() => {
              HapticFeedback.light();
              soundFX.playClick();
              setActiveTabMode("rapor");
            }}
          >
            <Ionicons
              name="book-outline"
              size={15}
              color={activeTabMode === "rapor" ? "#FFFFFF" : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.viewModeTabText,
                activeTabMode === "rapor" && styles.viewModeTabTextActive,
              ]}
            >
              Rapor & KKM
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.viewModeTab,
              activeTabMode === "snbp" && styles.viewModeTabActive,
            ]}
            onPress={() => {
              HapticFeedback.light();
              soundFX.playClick();
              setActiveTabMode("snbp");
            }}
          >
            <Ionicons
              name="school-outline"
              size={15}
              color={activeTabMode === "snbp" ? "#FFFFFF" : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.viewModeTabText,
                activeTabMode === "snbp" && styles.viewModeTabTextActive,
              ]}
            >
              Analisis SNBP
            </Text>
          </Pressable>
        </View>

        {/* ─── Mode 2: Analisis SNBP View ─── */}
        {activeTabMode === "snbp" && (
          <View style={styles.snbpContainer}>
            <Card style={styles.snbpCard}>
              <View style={styles.snbpHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.snbpTitle}>Proyeksi Kelayakan SNBP</Text>
                  <Text style={styles.snbpSub}>
                    Seleksi Nasional Berdasarkan Prestasi Rapor Semester 1–5
                  </Text>
                </View>
                <View
                  style={[
                    styles.snbpTierPill,
                    {
                      backgroundColor:
                        overallSummary.snbpSummary.eligibleTier === "high"
                          ? `${colors.emerald}20`
                          : overallSummary.snbpSummary.eligibleTier === "medium"
                          ? `${colors.amber}20`
                          : `${colors.danger}20`,
                    },
                  ]}
                >
                  <Ionicons
                    name="ribbon"
                    size={14}
                    color={
                      overallSummary.snbpSummary.eligibleTier === "high"
                        ? colors.emerald
                        : overallSummary.snbpSummary.eligibleTier === "medium"
                        ? colors.amber
                        : colors.danger
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.snbpTierText,
                      {
                        color:
                          overallSummary.snbpSummary.eligibleTier === "high"
                            ? colors.emerald
                            : overallSummary.snbpSummary.eligibleTier === "medium"
                            ? colors.amber
                            : colors.danger,
                      },
                    ]}
                  >
                    {overallSummary.snbpSummary.tierBadgeText}
                  </Text>
                </View>
              </View>

              <Text style={styles.snbpDescText}>
                {overallSummary.snbpSummary.eligibleDescription}
              </Text>

              {/* Supporting Subjects Selector (Mapel Pendukung Prodi) */}
              <View style={styles.snbpSupportingSection}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                  <Ionicons name="sparkles" size={14} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={styles.snbpSupportingLabel}>
                    Mapel Pendukung Prodi Tujuan (Kepmendikbud)
                  </Text>
                </View>
                <Text style={styles.snbpSupportingSub}>
                  Pilih maksimal 2 mapel relevan dengan prodi impian (e.g. Kedokteran: Bio & Kimia; Teknik: Mat & Fisika)
                </Text>

                <View style={styles.snbpSupportingChipsRow}>
                  {subjects.map((sub) => {
                    const isSelected = snbpSupportingSubjectIds.includes(sub.id);
                    return (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.snbpSubjectChip,
                          isSelected && styles.snbpSubjectChipActive,
                        ]}
                        onPress={() => toggleSupportingSubject(sub.id)}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={12}
                            color={colors.primary}
                            style={{ marginRight: 4 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.snbpSubjectChipText,
                            isSelected && styles.snbpSubjectChipTextActive,
                          ]}
                        >
                          {sub.title || sub.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {snbpSupportingSubjectIds.length > 0 ? (
                  <View style={styles.snbpAverageResultBox}>
                    <Text style={styles.snbpAverageLabel}>
                      Rata-rata {snbpSupportingSubjectIds.length} Mapel Pendukung:
                    </Text>
                    <Text style={styles.snbpAverageScore}>
                      {snbpSupportingAverage.toFixed(1)} / 100
                    </Text>
                  </View>
                ) : (
                  <View style={styles.snbpEmptyHintBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.snbpEmptyHintText}>
                      Ketuk 1 atau 2 mata pelajaran di atas untuk menghitung rata-rata mapel pendukung prodi impian.
                    </Text>
                  </View>
                )}
              </View>

              {/* SNBP Strategy Guidance */}
              <View style={styles.snbpGuidanceList}>
                <Text style={styles.snbpGuidanceTitle}>Strategi Masuk PTN Jalur SNBP:</Text>
                <Text style={styles.snbpGuidanceItem}>
                  • Kuota pendaftaran SNBP dihitung dari akreditasi sekolah (Akreditasi A: 40% terbaik).
                </Text>
                <Text style={styles.snbpGuidanceItem}>
                  • Rata-rata seluruh mapel memiliki bobot minimal 50% dalam penilaian nasional.
                </Text>
                <Text style={styles.snbpGuidanceItem}>
                  • Nilai mapel pendukung prodi menjadi penentu utama persaingan jurusan di kampus tujuan.
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* ─── Mode 1: Rapor & KKM Subject Grade Cards List ─── */}
        {activeTabMode === "rapor" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Nilai Per Mata Pelajaran</Text>
              <Text style={styles.sectionBadge}>{subjects.length} Mapel</Text>
            </View>

            {subjects.length > 0 ? (
              subjects.map((sub) => {
                const summary = subjectSummaries.get(sub.id);
                const subColor = sub.color || sub.color_hex || colors.primary;
                const isExpanded = !!expandedSubjectIds[sub.id];
                const subGrades = grades.filter((g) => g.subjectId === sub.id);

                const hasGrades = summary && summary.gradeCount > 0;
                const avg = summary ? summary.average : 0;
                const target = sub.targetGrade != null ? sub.targetGrade : 75;

                // Target progress percentage: (avg / target) * 100 capped at 100%
                const targetProgress = target > 0 ? Math.min(100, (avg / target) * 100) : 0;
                const isAboveTarget = avg >= target;

                return (
                  <Card key={sub.id} style={styles.subjectCard}>
                    {/* Header Row: Color Stripe + Subject Title + Average Score + Expand Chevron */}
                    <Pressable
                      style={styles.subjectCardHeader}
                      onPress={() => toggleExpandSubject(sub.id)}
                      hitSlop={touchTarget.min / 4}
                    >
                      <View style={[styles.subjectStripe, { backgroundColor: subColor }]} />

                      <View style={styles.subjectInfoCol}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Text style={styles.subjectTitle} numberOfLines={1}>
                            {sub.title || sub.name}
                          </Text>
                          {sub.room && (
                            <Text style={styles.subjectRoomBadge}>
                              {sub.room}
                            </Text>
                          )}
                        </View>

                        {sub.teacher && (
                          <Text style={styles.subjectTeacherText}>
                            Guru: {sub.teacher}
                          </Text>
                        )}
                      </View>

                      {/* Average & Grade Badge */}
                      <View style={styles.subjectScoreCol}>
                        {hasGrades ? (
                          <>
                            <View style={styles.scoreWithLetter}>
                              <Text style={[styles.subjectAverageScore, { color: subColor }]}>
                                {avg.toFixed(1)}
                              </Text>
                              <View
                                style={[
                                  styles.letterBadge,
                                  { backgroundColor: `${subColor}20` },
                                ]}
                              >
                                <Text style={[styles.letterBadgeText, { color: subColor }]}>
                                  {summary.letterGrade}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.gradeCountText}>
                              {summary.gradeCount} Penilaian
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.noGradeLabel}>Belum ada nilai</Text>
                        )}
                      </View>

                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={colors.textSecondary}
                        style={{ marginLeft: 8 }}
                      />
                    </Pressable>

                    {/* Target KKM Progress Bar */}
                    <View style={styles.targetProgressContainer}>
                      <View style={styles.targetLabelRow}>
                        <Text style={styles.targetLabelText}>
                          KKM: <Text style={{ fontWeight: "700", color: colors.text }}>{target}</Text>
                          {hasGrades && (
                            <Text style={{ color: isAboveTarget ? colors.emerald : colors.danger, fontWeight: "700" }}>
                              {" "}• {summary.kkmStatusText}
                            </Text>
                          )}
                        </Text>
                        {hasGrades && (
                          <Text
                            style={[
                              styles.diffLabelText,
                              { color: isAboveTarget ? colors.emerald : colors.danger },
                            ]}
                          >
                            {summary.diffFromTarget > 0 ? `+${summary.diffFromTarget}` : summary.diffFromTarget} dari KKM
                          </Text>
                        )}
                      </View>

                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${targetProgress}%`,
                              backgroundColor: isAboveTarget ? colors.emerald : subColor,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* ─── Expanded Individual Assessments Breakdown ─── */}
                    {isExpanded && (
                      <View style={styles.expandedAssessmentsBox}>
                        <View style={styles.assessmentsHeaderRow}>
                          <Text style={styles.assessmentsHeaderText}>Riwayat Penilaian</Text>
                          <Pressable
                            style={styles.addAssessmentInlineBtn}
                            onPress={() => handleOpenAddGrade(sub.id)}
                          >
                            <Ionicons name="add" size={14} color={subColor} style={{ marginRight: 2 }} />
                            <Text style={[styles.addAssessmentInlineText, { color: subColor }]}>
                              + Nilai Baru
                            </Text>
                          </Pressable>
                        </View>

                        {subGrades.length > 0 ? (
                          subGrades.map((g) => {
                            return (
                              <View key={g.id} style={styles.gradeItemRow}>
                                <View
                                  style={[
                                    styles.gradeCategoryIconBox,
                                    { backgroundColor: `${subColor}15` },
                                  ]}
                                >
                                  <Ionicons
                                    name={getGradeCategoryIcon(g.category) as any}
                                    size={16}
                                    color={subColor}
                                  />
                                </View>

                                <View style={styles.gradeItemInfoCol}>
                                  <Text style={styles.gradeItemTitle}>{g.title}</Text>
                                  <View style={styles.gradeItemMetaRow}>
                                    <Text style={styles.gradeCategoryTag}>
                                      {formatGradeCategory(g.category)}
                                    </Text>
                                    <Text style={styles.gradeItemDate}>{g.date}</Text>
                                    {g.weight !== 1 && (
                                      <Text style={styles.gradeWeightTag}>
                                        Bobot: {g.weight}x
                                      </Text>
                                    )}
                                  </View>
                                </View>

                                {/* Score Display */}
                                <View style={styles.gradeItemScoreCol}>
                                  <Text style={[styles.gradeItemScoreText, { color: subColor }]}>
                                    {g.score}
                                  </Text>
                                  <Text style={styles.gradeItemMaxText}>/{g.maxScore}</Text>
                                </View>

                                {/* Actions */}
                                <Pressable
                                  style={styles.gradeActionBtn}
                                  onPress={() => handleOpenEditGrade(g)}
                                  hitSlop={touchTarget.min / 4}
                                >
                                  <Ionicons name="pencil" size={15} color={colors.textSecondary} />
                                </Pressable>
                                <Pressable
                                  style={styles.gradeActionBtn}
                                  onPress={() => handleDeleteGrade(g)}
                                  hitSlop={touchTarget.min / 4}
                                >
                                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                                </Pressable>
                              </View>
                            );
                          })
                        ) : (
                          <View style={styles.noAssessmentsBox}>
                            <Ionicons
                              name="document-text-outline"
                              size={22}
                              color={colors.textSecondary}
                              style={{ marginBottom: 4 }}
                            />
                            <Text style={styles.noAssessmentsText}>
                              Belum ada tugas atau ulangan yang dicatat untuk mata pelajaran ini.
                            </Text>
                            <Pressable
                              style={[styles.addFirstGradeBtn, { borderColor: subColor }]}
                              onPress={() => handleOpenAddGrade(sub.id)}
                            >
                              <Ionicons name="add-circle-outline" size={15} color={subColor} style={{ marginRight: 4 }} />
                              <Text style={[styles.addFirstGradeText, { color: subColor }]}>
                                + Catat Nilai Sekarang
                              </Text>
                            </Pressable>
                          </View>
                        )}

                        {/* Quick Simulator CTA for this subject */}
                        <Pressable
                          style={styles.simSubjectInlineBtn}
                          onPress={() => handleOpenSimulator(sub.id)}
                        >
                          <Ionicons name="calculator-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.simSubjectInlineText}>
                            Hitung target nilai ujian {sub.title || sub.name} berikutnya
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </Card>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="school-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Belum Ada Mata Pelajaran</Text>
                <Text style={styles.emptySub}>
                  Impor jadwal sekolah atau tambahkan mata pelajaran di menu Jadwal untuk mulai mencatat nilai.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── Add / Edit Grade Bottom Sheet ─── */}
      <AddGradeSheet
        visible={addGradeVisible}
        subjects={subjects}
        initialSubjectId={selectedSubjectIdForAdd}
        gradeToEdit={gradeToEdit}
        onClose={() => setAddGradeVisible(false)}
        onSave={async (data) => {
          if (gradeToEdit) {
            await updateGrade(gradeToEdit.id, data);
          } else {
            await addGrade(data);
          }
        }}
      />

      {/* ─── Teacher Directory Modal ─── */}
      <TeacherDirectoryModal
        visible={teacherDirectoryVisible}
        onClose={() => setTeacherDirectoryVisible(false)}
      />

      {/* ─── Target Simulator Modal ("What-If" Calculator) ─── */}
      <Modal
        visible={simulatorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSimulatorVisible(false)}
      >
        <View style={styles.simOverlay}>
          <View style={styles.simCard}>
            <View style={styles.simHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calculator" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.simTitle}>Simulator Target Nilai</Text>
              </View>
              <Pressable
                onPress={() => setSimulatorVisible(false)}
                hitSlop={touchTarget.min / 4}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.simDescription}>
              Hitung berapa nilai yang harus kamu peroleh pada ulangan berikutnya agar mencapai target rata-rata akhir KKM.
            </Text>

            {/* Select Subject */}
            <Text style={styles.simInputLabel}>Pilih Mata Pelajaran</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, marginBottom: 12 }}
            >
              {subjects.map((s) => {
                const isSelected = s.id === simSubjectId;
                const subColor = s.color || s.color_hex || colors.primary;
                return (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.simSubjectChip,
                      isSelected && { backgroundColor: subColor, borderColor: subColor },
                    ]}
                    onPress={() => {
                      HapticFeedback.light();
                      setSimSubjectId(s.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.simSubjectChipText,
                        isSelected && { color: "#FFFFFF", fontWeight: "700" },
                      ]}
                    >
                      {s.title || s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Target Score Input */}
            <Text style={styles.simInputLabel}>Target Rata-Rata yang Diinginkan</Text>
            <TextInput
              style={styles.simTextInput}
              keyboardType="numeric"
              value={simTargetScore}
              onChangeText={setSimTargetScore}
              placeholder="e.g. 85"
              placeholderTextColor={colors.textMuted}
            />

            {/* Weight Picker */}
            <Text style={styles.simInputLabel}>Bobot Ulangan Berikutnya</Text>
            <View style={styles.simWeightRow}>
              {[1, 2, 3].map((w) => {
                const isSel = simWeight === w;
                return (
                  <Pressable
                    key={w}
                    style={[styles.simWeightChip, isSel && styles.simWeightChipActive]}
                    onPress={() => {
                      HapticFeedback.light();
                      setSimWeight(w);
                    }}
                  >
                    <Text
                      style={[
                        styles.simWeightChipText,
                        isSel && styles.simWeightChipTextActive,
                      ]}
                    >
                      {w}x Bobot
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Calculation Result */}
            {simulationResult && (
              <View
                style={[
                  styles.simResultBox,
                  {
                    borderColor: simulationResult.isFeasible
                      ? colors.emerald
                      : colors.danger,
                  },
                ]}
              >
                <Text style={styles.simResultHeading}>HASIL PERHITUNGAN TARGET</Text>
                <View style={styles.simNeededScoreRow}>
                  <Text
                    style={[
                      styles.simNeededScoreNum,
                      {
                        color: simulationResult.isFeasible
                          ? colors.emerald
                          : colors.danger,
                      },
                    ]}
                  >
                    {simulationResult.alreadyMet
                      ? "Target Aman!"
                      : `Minimal ${simulationResult.neededScore}`}
                  </Text>
                </View>
                <Text style={styles.simResultMessage}>{simulationResult.message}</Text>
              </View>
            )}

            <Pressable
              style={styles.simDoneBtn}
              onPress={() => setSimulatorVisible(false)}
            >
              <Text style={styles.simDoneBtnText}>Selesai</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ─── TKA Calculator Modal ─── */}
      <TKACalculatorModal
        visible={tkaModalVisible}
        onClose={() => setTkaModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 90,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1.5,
    borderColor: `${colors.primary}50`,
    padding: spacing.lg,
    borderBottomWidth: 4,
    borderBottomColor: colors.primary,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  heroScoreText: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: 0.5,
  },
  heroGradePill: {
    backgroundColor: `${colors.primary}25`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  heroGradePillText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "800",
    color: colors.primary,
  },
  kkmSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  kkmSummaryText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  heroActionsCol: {
    gap: 6,
    alignItems: "flex-end",
  },
  tkaCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderBottomWidth: 3,
    borderBottomColor: "#7C3AED",
  },
  tkaCtaText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },
  simulatorCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderBottomWidth: 3,
    borderBottomColor: "#1D4ED8",
  },
  simulatorCtaText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },
  performanceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 8,
    marginTop: spacing.md,
  },
  performanceText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  statsStrip: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: 6,
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statBoxValue: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  statBoxScore: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 1,
  },
  // Mode Switcher
  viewModeSwitcher: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  viewModeTabActive: {
    backgroundColor: colors.primary,
  },
  viewModeTabText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  viewModeTabTextActive: {
    color: "#FFFFFF",
    fontWeight: typography.fontWeights.bold,
  },
  // SNBP Styles
  snbpContainer: {
    gap: spacing.md,
  },
  snbpCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.md,
  },
  snbpHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  snbpTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  snbpSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  snbpTierPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  snbpTierText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  snbpDescText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  snbpSupportingSection: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  snbpSupportingLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textTransform: "uppercase",
  },
  snbpSupportingSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  snbpSupportingChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  snbpSubjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  snbpSubjectChipActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}18`,
  },
  snbpSubjectChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  snbpSubjectChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  snbpAverageResultBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  snbpAverageLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  snbpAverageScore: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },
  snbpEmptyHintBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(206, 130, 255, 0.08)",
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(206, 130, 255, 0.2)",
  },
  snbpEmptyHintText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  snbpGuidanceList: {
    backgroundColor: "rgba(58, 134, 255, 0.06)",
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: 4,
  },
  snbpGuidanceTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginBottom: 2,
  },
  snbpGuidanceItem: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  // Section Header
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionBadge: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  // Subject Cards
  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 0,
    overflow: "hidden",
  },
  subjectCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  subjectStripe: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  subjectInfoCol: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    flexShrink: 1,
  },
  subjectRoomBadge: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  subjectTeacherText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subjectScoreCol: {
    alignItems: "flex-end",
  },
  scoreWithLetter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  subjectAverageScore: {
    fontSize: 20,
    fontWeight: "800",
  },
  letterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  letterBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  gradeCountText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  noGradeLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  targetProgressContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  targetLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  targetLabelText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  diffLabelText: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  // Expanded Assessments
  expandedAssessmentsBox: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    gap: spacing.sm,
  },
  assessmentsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  assessmentsHeaderText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addAssessmentInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  addAssessmentInlineText: {
    fontSize: 12,
    fontWeight: "700",
  },
  gradeItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  gradeCategoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeItemInfoCol: {
    flex: 1,
  },
  gradeItemTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
    color: colors.text,
  },
  gradeItemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  gradeCategoryTag: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  gradeItemDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  gradeWeightTag: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "600",
  },
  gradeItemScoreCol: {
    alignItems: "flex-end",
  },
  gradeItemScoreText: {
    fontSize: 16,
    fontWeight: "800",
  },
  gradeItemMaxText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  gradeActionBtn: {
    padding: 6,
  },
  noAssessmentsBox: {
    paddingVertical: 12,
    alignItems: "center",
  },
  noAssessmentsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
    textAlign: "center",
  },
  addFirstGradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  addFirstGradeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  simSubjectInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  simSubjectInlineText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  // Simulator Modal
  simOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  simCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  simHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  simTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  simDescription: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  simInputLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  simSubjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  simSubjectChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  simTextInput: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  simWeightRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.md,
  },
  simWeightChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
  },
  simWeightChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  simWeightChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  simWeightChipTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  simResultBox: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  simResultHeading: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  simNeededScoreRow: {
    marginVertical: 4,
  },
  simNeededScoreNum: {
    fontSize: 24,
    fontWeight: "900",
  },
  simResultMessage: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  simDoneBtn: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "#1D4ED8",
  },
  simDoneBtnText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.body,
    fontWeight: "700",
  },
});
