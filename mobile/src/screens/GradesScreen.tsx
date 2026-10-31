/**
 * StudyAir Mobile — School Planner Grades & GPA Screen (Tab 4)
 * 
 * Comprehensive academic performance tracker:
 * 1. Cumulative Report Card Average & 4.0 GPA Scale
 * 2. Subject Cards with weighted averages, letter grades, and target progress bars
 * 3. Expandable assessment breakdown with edit/delete actions
 * 4. Interactive "What-If" Target Simulator Calculator
 * 5. Quick Add Grade Sheet & Teacher Directory Modal integration
 * 6. Duolingo tactile 3D styling and theme compliance
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
import {
  calculateSubjectGrade,
  calculateOverallGPA,
  calculateNeededScoreForTarget,
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

  // Modals state
  const [addGradeVisible, setAddGradeVisible] = useState(false);
  const [selectedSubjectIdForAdd, setSelectedSubjectIdForAdd] = useState<string | undefined>();
  const [gradeToEdit, setGradeToEdit] = useState<Grade | null>(null);
  const [teacherDirectoryVisible, setTeacherDirectoryVisible] = useState(false);

  // Simulator modal state
  const [simulatorVisible, setSimulatorVisible] = useState(false);
  const [simSubjectId, setSimSubjectId] = useState<string>("");
  const [simTargetScore, setSimTargetScore] = useState<string>("85");
  const [simWeight, setSimWeight] = useState<number>(1);

  // Overall GPA calculation
  const overallSummary = useMemo(() => {
    return calculateOverallGPA(subjects, grades);
  }, [subjects, grades]);

  // Subject grade summaries map
  const subjectSummaries = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateSubjectGrade>>();
    subjects.forEach((s) => {
      const target = s.targetGrade != null ? s.targetGrade : 80;
      map.set(s.id, calculateSubjectGrade(grades, s.id, target));
    });
    return map;
  }, [subjects, grades]);

  const toggleExpandSubject = (subjectId: string) => {
    HapticFeedback.light();
    setExpandedSubjectIds((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
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
    setSimTargetScore(String(sub?.targetGrade || 85));
    setSimWeight(1);
    setSimulatorVisible(true);
  };

  // Simulator calculation result
  const simulationResult = useMemo(() => {
    if (!simSubjectId) return null;
    const target = parseFloat(simTargetScore) || 85;
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
            : "Pelacak Nilai Akademik"
        }
        actions={[
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
        {/* ─── 1. Cumulative Report Card Hero Banner ─── */}
        <Card style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={styles.heroLabel}>RATA-RATA NILAI RAPOR</Text>
              <View style={styles.heroScoreRow}>
                <Text style={styles.heroScoreText}>
                  {overallSummary.cumulativeAverage > 0
                    ? overallSummary.cumulativeAverage.toFixed(1)
                    : "0.0"}
                </Text>
                <View style={styles.heroGradePill}>
                  <Text style={styles.heroGradePillText}>
                    {overallSummary.letterGrade}
                  </Text>
                </View>
              </View>
              <Text style={styles.gpaScaleText}>
                Skala 4.0:{" "}
                <Text style={{ fontWeight: "800", color: colors.text }}>
                  {overallSummary.gpaScale4.toFixed(2)}
                </Text>{" "}
                • {overallSummary.totalAssessments} Penilaian
              </Text>
            </View>

            {/* What-If Simulator Action Button */}
            <Pressable
              style={styles.simulatorCtaBtn}
              onPress={() => handleOpenSimulator()}
              hitSlop={touchTarget.min / 4}
              accessibilityLabel="Buka Simulator Nilai"
            >
              <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
              <Text style={styles.simulatorCtaText}>Simulator</Text>
            </Pressable>
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
              <Text style={styles.statBoxLabel}>MAPEL DINILAI</Text>
              <Text style={styles.statBoxValue}>
                {overallSummary.gradedSubjectsCount} / {overallSummary.totalSubjectsCount}
              </Text>
              <Text style={[styles.statBoxScore, { color: colors.primary }]}>Mapel</Text>
            </View>
          </View>
        </Card>

        {/* ─── 2. Subject Grade Cards List ─── */}
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
            const target = sub.targetGrade != null ? sub.targetGrade : 80;

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

                {/* Target Progress Bar */}
                <View style={styles.targetProgressContainer}>
                  <View style={styles.targetLabelRow}>
                    <Text style={styles.targetLabelText}>
                      Target KKM: <Text style={{ fontWeight: "700", color: colors.text }}>{target}</Text>
                    </Text>
                    {hasGrades && (
                      <Text
                        style={[
                          styles.diffLabelText,
                          { color: isAboveTarget ? colors.emerald : colors.danger },
                        ]}
                      >
                        {summary.diffFromTarget > 0 ? `+${summary.diffFromTarget}` : summary.diffFromTarget} dari target
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
                        <Text style={styles.noAssessmentsText}>
                          Belum ada tugas atau ulangan yang dicatat untuk mata pelajaran ini.
                        </Text>
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
              Hitung berapa nilai yang harus kamu peroleh pada ulangan berikutnya agar mencapai target rata-rata akhir.
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
                const subCol = s.color || s.color_hex || colors.primary;
                return (
                  <Pressable
                    key={s.id}
                    style={[
                      styles.simSubChip,
                      isSelected && {
                        borderColor: subCol,
                        backgroundColor: `${subCol}20`,
                      },
                    ]}
                    onPress={() => {
                      HapticFeedback.light();
                      setSimSubjectId(s.id);
                    }}
                  >
                    <View style={[styles.simColorDot, { backgroundColor: subCol }]} />
                    <Text
                      style={[
                        styles.simSubChipText,
                        isSelected && { color: subCol, fontWeight: "700" },
                      ]}
                    >
                      {s.title || s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Target Score Input */}
            <Text style={styles.simInputLabel}>Target Nilai Rata-rata yang Diinginkan</Text>
            <TextInput
              style={styles.simInput}
              keyboardType="numeric"
              value={simTargetScore}
              onChangeText={setSimTargetScore}
              placeholder="Contoh: 85"
              placeholderTextColor={colors.textMuted}
            />

            {/* Next Test Weight */}
            <Text style={styles.simInputLabel}>Bobot Ulangan Berikutnya</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[
                { label: "1x (Normal)", val: 1 },
                { label: "2x (Utama / PTS)", val: 2 },
                { label: "3x (Final / PAS)", val: 3 },
              ].map((w) => (
                <Pressable
                  key={w.val}
                  style={[
                    styles.simWeightChip,
                    simWeight === w.val && styles.simWeightChipSelected,
                  ]}
                  onPress={() => {
                    HapticFeedback.light();
                    setSimWeight(w.val);
                  }}
                >
                  <Text
                    style={[
                      styles.simWeightText,
                      simWeight === w.val && styles.simWeightTextSelected,
                    ]}
                  >
                    {w.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Simulation Result Box */}
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
    fontSize: typography.fontSizes.body,
    fontWeight: "800",
    color: colors.primary,
  },
  gpaScaleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  simulatorCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderBottomWidth: 3,
    borderBottomColor: "#1D4ED8",
  },
  simulatorCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
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
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  statBoxValue: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  statBoxScore: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  subjectCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: colors.borderLight,
  },
  subjectCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  subjectStripe: {
    width: 5,
    height: 42,
    borderRadius: radius.full,
    marginRight: 10,
  },
  subjectInfoCol: {
    flex: 1,
  },
  subjectTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subjectRoomBadge: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
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
    fontSize: 18,
    fontWeight: "800",
  },
  letterBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  letterBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  gradeCountText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noGradeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  targetProgressContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  targetLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    borderRadius: 3,
    backgroundColor: colors.surfaceSubtle,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  expandedAssessmentsBox: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  assessmentsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  assessmentsHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  addAssessmentInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  addAssessmentInlineText: {
    fontSize: 11,
    fontWeight: "700",
  },
  gradeItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  gradeCategoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  gradeItemInfoCol: {
    flex: 1,
  },
  gradeItemTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
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
    flexDirection: "row",
    alignItems: "baseline",
    marginRight: 8,
  },
  gradeItemScoreText: {
    fontSize: 16,
    fontWeight: "800",
  },
  gradeItemMaxText: {
    fontSize: 11,
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
    textAlign: "center",
  },
  simSubjectInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}12`,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  simSubjectInlineText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  simOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  simCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
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
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.md,
  },
  simInputLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  simSubChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  simColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  simSubChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  simInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  simWeightChip: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  simWeightChipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  simWeightText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  simWeightTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  simResultBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  simResultHeading: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  simNeededScoreRow: {
    marginVertical: 4,
  },
  simNeededScoreNum: {
    fontSize: 24,
    fontWeight: "900",
  },
  simResultMessage: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 16,
  },
  simDoneBtn: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  simDoneBtnText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
  },
});
