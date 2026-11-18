/**
 * StudyAir Mobile — ExamDetailSheet
 * Modal showing exam details, topic mastery checklist, 1-tap AI study plan generator, and focus timer launcher.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "../common/BottomSheet";
import { PrimaryButton } from "../common/PrimaryButton";
import { SecondaryButton } from "../common/SecondaryButton";
import { colors, spacing, radius, typography } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { ExamItem } from "../../lib/examEngine";
import { formatLocaleDate } from "../../lib/dateUtils";
import { t } from "../../lib/i18n";

interface ExamDetailSheetProps {
  exam: ExamItem | null;
  visible: boolean;
  onClose: () => void;
  onNavigateToFocus?: (subjectId?: string) => void;
  onPlanCreated?: () => void;
}

export function ExamDetailSheet({
  exam,
  visible,
  onClose,
  onNavigateToFocus,
  onPlanCreated,
}: ExamDetailSheetProps) {
  const {
    studyUnits,
    toggleStudyUnitCompletion,
    addStudyUnit,
    generateExamPlan,
    updateSubject,
    deleteExamEvent,
  } = useMobileStudyStore();

  const [newTopicText, setNewTopicText] = useState("");
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  if (!exam) return null;

  const subject = exam.subject;
  const subUnits = subject
    ? studyUnits.filter((u) => u.subject_id === subject.id)
    : [];

  const doneCount = subUnits.filter((u) => u.is_completed).length;
  const totalCount = subUnits.length;
  const progressPercent =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleToggleTopic = (unitId: string) => {
    toggleStudyUnitCompletion(unitId);
  };

  const handleAddNewTopic = () => {
    if (!newTopicText.trim() || !subject) return;
    addStudyUnit({
      subject_id: subject.id,
      title: newTopicText.trim(),
      estimated_minutes: 30,
      cognitive_load: "MEDIUM",
    });
    setNewTopicText("");
    setShowAddTopic(false);
  };

  const handleCreatePlan = () => {
    try {
      const generated = generateExamPlan(exam, subject?.id || "general");
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 3000);
      if (onPlanCreated) onPlanCreated();
    } catch (err) {
      console.warn("[ExamDetailSheet] Failed to generate plan:", err);
    }
  };

  const handleStartFocus = () => {
    onClose();
    if (onNavigateToFocus) {
      onNavigateToFocus(subject?.id);
    }
  };

  const handleDeleteExam = () => {
    if (subject) {
      updateSubject(subject.id, { examDate: "", exam_date: "" });
    } else if (exam.id) {
      deleteExamEvent(exam.id);
    }
    onClose();
  };

  const color = subject?.color || colors.primary;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={exam.title}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Header Hero Banner */}
        <View style={[styles.heroCard, { borderLeftColor: color }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroInfo}>
              <View style={styles.badgeRow}>
                {subject && (
                  <View style={[styles.subjectTag, { backgroundColor: `${color}18` }]}>
                    <View style={[styles.subjectDot, { backgroundColor: color }]} />
                    <Text style={[styles.subjectTagText, { color }]}>
                      {subject.name || subject.title}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.countdownBadge,
                    exam.isPassed
                      ? styles.badgePassed
                      : exam.isToday || exam.isOngoing
                      ? styles.badgeToday
                      : styles.badgeUpcoming,
                  ]}
                >
                  <Text
                    style={[
                      styles.countdownText,
                      exam.isPassed
                        ? styles.textPassed
                        : exam.isToday || exam.isOngoing
                        ? styles.textToday
                        : styles.textUpcoming,
                    ]}
                  >
                    {exam.label}
                  </Text>
                </View>
              </View>

              <Text style={styles.examDateLabel}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />{" "}
                {formatLocaleDate(exam.startDate)}
                {exam.endDate && exam.endDate !== exam.startDate
                  ? ` - ${formatLocaleDate(exam.endDate)}`
                  : ""}
              </Text>
            </View>
          </View>

          {/* Topic Progress Bar if Subject */}
          {totalCount > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {t("topik_dikuasai") || "Topik Dikuasai"}
                </Text>
                <Text style={styles.progressCount}>
                  {doneCount} / {totalCount} ({progressPercent}%)
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent === 100 ? colors.emerald : color,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* Success Banner */}
        {successBanner && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={18} color={colors.emerald} style={{ marginRight: 6 }} />
            <Text style={styles.successText}>
              {t("rencana_dibuat_sukses") || "Rencana belajar berhasil dibuat di Tugas!"}
            </Text>
          </View>
        )}

        {/* Primary Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={styles.purpleActionBtn}
            onPress={handleCreatePlan}
            accessibilityLabel="Buat Rencana Belajar"
          >
            <Ionicons name="sparkles" size={16} color="#A855F7" style={{ marginRight: 6 }} />
            <Text style={styles.purpleActionText}>
              {t("buat_rencana_ujian") || "Buat Rencana Belajar"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.focusActionBtn}
            onPress={handleStartFocus}
            accessibilityLabel="Mulai Belajar"
          >
            <Ionicons name="play" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.focusActionText}>
              {t("mulai_belajar_ujian") || "Mulai Fokus"}
            </Text>
          </Pressable>
        </View>

        {/* Topics & Revision Units Section */}
        {subject && (
          <View style={styles.sectionBox}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("kisi_kisi_topik") || "Kisi-kisi & Materi"} ({subUnits.length})
              </Text>
              <Pressable
                style={styles.addTopicLink}
                onPress={() => setShowAddTopic(!showAddTopic)}
              >
                <Ionicons
                  name={showAddTopic ? "close" : "add"}
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.addTopicText}>
                  {showAddTopic ? t("cancel") : t("tambah_topik_baru") || "+ Materi"}
                </Text>
              </Pressable>
            </View>

            {/* Quick Add Topic Input */}
            {showAddTopic && (
              <View style={styles.addTopicInputRow}>
                <TextInput
                  style={styles.topicInput}
                  placeholder="Nama bab / subtopik materi..."
                  placeholderTextColor={colors.textSecondary}
                  value={newTopicText}
                  onChangeText={setNewTopicText}
                  autoFocus
                />
                <Pressable
                  style={[
                    styles.saveTopicBtn,
                    !newTopicText.trim() && styles.btnDisabled,
                  ]}
                  onPress={handleAddNewTopic}
                  disabled={!newTopicText.trim()}
                >
                  <Ionicons name="checkmark" size={18} color={colors.textInverse} />
                </Pressable>
              </View>
            )}

            {/* Topics List */}
            {subUnits.length === 0 ? (
              <View style={styles.emptyTopics}>
                <Text style={styles.emptyTopicsText}>
                  Belum ada topik materi. Tambahkan bab atau kisi-kisi untuk melacak kesiapanmu!
                </Text>
              </View>
            ) : (
              subUnits.map((unit) => {
                const isDone = unit.is_completed;
                return (
                  <Pressable
                    key={unit.id}
                    style={[styles.topicRow, isDone && styles.topicRowDone]}
                    onPress={() => handleToggleTopic(unit.id)}
                  >
                    <View
                      style={[
                        styles.topicCheckbox,
                        isDone && styles.topicCheckboxDone,
                      ]}
                    >
                      {isDone && (
                        <Ionicons name="checkmark" size={14} color={colors.textInverse} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.topicTitle,
                        isDone && styles.topicTitleDone,
                      ]}
                    >
                      {unit.title}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* Delete Exam Action */}
        <View style={styles.footerRow}>
          <Pressable style={styles.deleteBtn} onPress={handleDeleteExam}>
            <Ionicons name="trash-outline" size={16} color={colors.rose} style={{ marginRight: 6 }} />
            <Text style={styles.deleteText}>
              {t("hapus_ulangan") || "Hapus Jadwal Ulangan"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  subjectTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  subjectTagText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  badgeUpcoming: {
    backgroundColor: colors.primaryLight,
  },
  badgeToday: {
    backgroundColor: colors.amberLight,
  },
  badgePassed: {
    backgroundColor: colors.surfaceHover,
  },
  countdownText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
  },
  textUpcoming: {
    color: colors.primary,
  },
  textToday: {
    color: colors.amber,
  },
  textPassed: {
    color: colors.textSecondary,
  },
  examDateLabel: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  progressCount: {
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.emeraldLight,
    borderWidth: 1,
    borderColor: colors.emerald,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: typography.fontSizes.body,
    color: colors.emerald,
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.lg,
  },
  purpleActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.35)",
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  purpleActionText: {
    fontSize: typography.fontSizes.body,
    color: "#C084FC",
    fontWeight: "700",
  },
  focusActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  focusActionText: {
    fontSize: typography.fontSizes.body,
    color: colors.primary,
    fontWeight: "700",
  },
  sectionBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: "700",
    color: colors.text,
  },
  addTopicLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  addTopicText: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: "700",
  },
  addTopicInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  topicInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  saveTopicBtn: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  emptyTopics: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  emptyTopicsText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topicRowDone: {
    opacity: 0.65,
  },
  topicCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: colors.background,
  },
  topicCheckboxDone: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  topicTitle: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
    flex: 1,
  },
  topicTitleDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  footerRow: {
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  deleteText: {
    fontSize: typography.fontSizes.caption,
    color: colors.rose,
    fontWeight: "600",
  },
});
