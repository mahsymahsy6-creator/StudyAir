import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, addDays, parseISO } from "date-fns";
import { colors, typography, radius, touchTarget, tidySpacing, spacing } from "../../theme";
import { BottomSheet } from "../common/BottomSheet";
import { useMobileStudyStore } from "../../store";
import { Task, TaskType, DeadlineMode } from "../../types";
import { t } from "../../lib/i18n";
import { calculateNextClassDeadline } from "../../engine/deadlineEngine";
import { parseIndonesianDateHint } from "../../engine/dateHintParser";

export interface AddTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  onTaskAdded?: (task: Task) => void;
  initialSubjectId?: string;
  initialDeadline?: string;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90] as const;

export function AddTaskSheet({
  visible,
  onClose,
  onTaskAdded,
  initialSubjectId,
  initialDeadline,
}: AddTaskSheetProps) {
  const { subjects, timetableEntries, daysOff, overrides, addTask } = useMobileStudyStore();

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTitleError, setTaskTitleError] = useState("");
  const [taskSubjectId, setTaskSubjectId] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("homework");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationText, setCustomDurationText] = useState("30");
  const [deadlineMode, setDeadlineMode] = useState<"next_class" | "in_2_classes" | "custom">("next_class");
  const [customDeadline, setCustomDeadline] = useState(
    initialDeadline || format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [taskNotes, setTaskNotes] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Initialize defaults on open
  useEffect(() => {
    if (visible) {
      setTaskTitle("");
      setTaskTitleError("");
      setTaskSubjectId(initialSubjectId || subjects[0]?.id || "general");
      setTaskType("homework");
      setEstimatedMinutes(30);
      setIsCustomDuration(false);
      setCustomDurationText("30");
      setDeadlineMode(initialDeadline ? "custom" : "next_class");
      setCustomDeadline(initialDeadline || format(addDays(new Date(), 1), "yyyy-MM-dd"));
      setTaskNotes("");
      setShowMoreOptions(false);
    }
  }, [visible, initialSubjectId, initialDeadline, subjects]);

  const activeSubjectId = taskSubjectId || subjects[0]?.id || "general";

  // Pre-calculate smart next-class deadlines
  const nextClass1 = useMemo(() => {
    return calculateNextClassDeadline(activeSubjectId, todayStr, timetableEntries, {
      daysOff,
      overrides,
      afterNClasses: 1,
    });
  }, [activeSubjectId, todayStr, timetableEntries, daysOff, overrides]);

  const nextClass2 = useMemo(() => {
    return calculateNextClassDeadline(activeSubjectId, todayStr, timetableEntries, {
      daysOff,
      overrides,
      afterNClasses: 2,
    });
  }, [activeSubjectId, todayStr, timetableEntries, daysOff, overrides]);

  // Detected date hint from title
  const detectedDateHint = useMemo(() => {
    return parseIndonesianDateHint(taskTitle, todayStr);
  }, [taskTitle, todayStr]);

  // Effective deadline string
  const effectiveDeadline = useMemo(() => {
    if (deadlineMode === "next_class") {
      return nextClass1.found && nextClass1.deadlineDate
        ? nextClass1.deadlineDate
        : format(addDays(new Date(), 1), "yyyy-MM-dd");
    }
    if (deadlineMode === "in_2_classes") {
      return nextClass2.found && nextClass2.deadlineDate
        ? nextClass2.deadlineDate
        : format(addDays(new Date(), 7), "yyyy-MM-dd");
    }
    return customDeadline;
  }, [deadlineMode, nextClass1, nextClass2, customDeadline]);

  // Handle Preset Duration selection
  const handleSelectPreset = (mins: number) => {
    setEstimatedMinutes(mins);
    setIsCustomDuration(false);
    setCustomDurationText(String(mins));
  };

  // Handle Custom Duration input
  const handleCustomDurationChange = (text: string) => {
    setCustomDurationText(text);
    const parsed = parseInt(text.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      setEstimatedMinutes(Math.max(5, Math.min(360, parsed)));
    }
  };

  const handleStepCustomDuration = (delta: number) => {
    setEstimatedMinutes((prev) => {
      const next = Math.max(5, Math.min(360, prev + delta));
      setCustomDurationText(String(next));
      return next;
    });
  };

  // Handle Save
  const handleSave = () => {
    const trimmedTitle = taskTitle.trim();
    if (!trimmedTitle) {
      setTaskTitleError(t("errorTitleRequired"));
      return;
    }

    let finalDeadlineMode: DeadlineMode = "custom";
    if (deadlineMode === "next_class") finalDeadlineMode = "nextClass";
    else if (deadlineMode === "in_2_classes") finalDeadlineMode = "afterNClasses";

    const newTask = addTask({
      title: trimmedTitle,
      subjectId: activeSubjectId,
      type: taskType,
      givenDate: todayStr,
      deadlineDate: effectiveDeadline,
      deadlineMode: finalDeadlineMode,
      estimatedMinutes: Math.max(5, Math.min(360, estimatedMinutes)),
      notes: taskNotes.trim() || undefined,
    });

    onTaskAdded?.(newTask);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("tambah_tugas_title")}
      subtitle={t("quickAddTaskSub")}
      primaryButtonLabel={t("simpan_tugas")}
      onPrimaryButtonPress={handleSave}
    >
      <View style={styles.contentContainer}>
        {/* ─── 1. Title Input (Autofocused for <10s entry) ─── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("taskTitle")}</Text>
          <TextInput
            style={[
              styles.textInput,
              taskTitleError ? styles.inputErrorBorder : null,
            ]}
            placeholder="Contoh: PR Matematika Hal 45 No 1-10"
            placeholderTextColor={colors.textMuted}
            value={taskTitle}
            onChangeText={(val) => {
              setTaskTitle(val);
              if (taskTitleError) setTaskTitleError("");
            }}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            autoFocus
          />
          {taskTitleError ? (
            <Text style={styles.inputErrorText}>{taskTitleError}</Text>
          ) : null}

          {/* NLP Date Hint Pill */}
          {detectedDateHint && (
            <Pressable
              style={styles.hintChip}
              onPress={() => {
                setDeadlineMode("custom");
                setCustomDeadline(detectedDateHint.suggestedDate);
              }}
            >
              <Ionicons name="sparkles" size={14} color={colors.amber} style={{ marginRight: 6 }} />
              <Text style={styles.hintChipText}>
                {t("terdeteksi_tanggal", { date: detectedDateHint.label })}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ─── 2. Subject Selector ─── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("pilih_mapel")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {subjects.length === 0 ? (
              <View style={[styles.subjectChip, styles.subjectChipActive]}>
                <View style={[styles.subjectDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.subjectChipText, styles.subjectChipTextActive]}>
                  Umum
                </Text>
              </View>
            ) : (
              subjects.map((sub) => {
                const isSelected = activeSubjectId === sub.id;
                const subColor = sub.color || sub.color_hex || colors.primary;
                return (
                  <Pressable
                    key={sub.id}
                    style={[
                      styles.subjectChip,
                      isSelected && {
                        backgroundColor: colors.surfaceHover,
                        borderColor: subColor,
                      },
                    ]}
                    onPress={() => setTaskSubjectId(sub.id)}
                  >
                    <View style={[styles.subjectDot, { backgroundColor: subColor }]} />
                    <Text
                      style={[
                        styles.subjectChipText,
                        isSelected && { color: colors.text, fontWeight: "700" },
                      ]}
                    >
                      {sub.name || sub.title}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* ─── 3. Duration Estimate (Core v2 feature) ─── */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>{t("estimasi_waktu")}</Text>
            <Text style={styles.durationBadge}>
              {estimatedMinutes} {t("menit_singkat")}
            </Text>
          </View>
          <Text style={styles.inputHelperText}>{t("estimasi_durasi_hint")}</Text>

          <View style={styles.presetRow}>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = !isCustomDuration && estimatedMinutes === preset;
              return (
                <Pressable
                  key={preset}
                  style={[
                    styles.presetChip,
                    isSelected && styles.presetChipActive,
                  ]}
                  onPress={() => handleSelectPreset(preset)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      isSelected && styles.presetChipTextActive,
                    ]}
                  >
                    {preset}m
                  </Text>
                </Pressable>
              );
            })}

            <Pressable
              style={[
                styles.presetChip,
                isCustomDuration && styles.presetChipActive,
              ]}
              onPress={() => setIsCustomDuration(true)}
            >
              <Text
                style={[
                  styles.presetChipText,
                  isCustomDuration && styles.presetChipTextActive,
                ]}
              >
                {t("kustom")}
              </Text>
            </Pressable>
          </View>

          {/* Custom Duration Stepper */}
          {isCustomDuration && (
            <View style={styles.customDurationContainer}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() => handleStepCustomDuration(-15)}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>

              <View style={styles.customInputWrapper}>
                <TextInput
                  style={styles.customDurationInput}
                  keyboardType="numeric"
                  value={customDurationText}
                  onChangeText={handleCustomDurationChange}
                  maxLength={3}
                />
                <Text style={styles.customDurationUnit}>{t("menit")}</Text>
              </View>

              <Pressable
                style={styles.stepperBtn}
                onPress={() => handleStepCustomDuration(15)}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
          )}
        </View>

        {/* ─── 4. Deadline Selector (Next Class Engine) ─── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("deadline_mode")}</Text>
          <View style={styles.segmentedRow}>
            {/* Option 1: Next Class */}
            <Pressable
              style={[
                styles.segmentedBtn,
                deadlineMode === "next_class" && styles.segmentedBtnActive,
              ]}
              onPress={() => setDeadlineMode("next_class")}
            >
              <Ionicons
                name="school-outline"
                size={16}
                color={deadlineMode === "next_class" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentedBtnText,
                  deadlineMode === "next_class" && styles.segmentedBtnTextActive,
                ]}
              >
                {t("kelas_depan")}
              </Text>
              <Text style={styles.segmentedBtnSub}>
                {nextClass1.found && nextClass1.deadlineDate
                  ? format(parseISO(nextClass1.deadlineDate), "d MMM")
                  : t("tomorrow")}
              </Text>
            </Pressable>

            {/* Option 2: In 2 Classes */}
            <Pressable
              style={[
                styles.segmentedBtn,
                deadlineMode === "in_2_classes" && styles.segmentedBtnActive,
              ]}
              onPress={() => setDeadlineMode("in_2_classes")}
            >
              <Ionicons
                name="repeat-outline"
                size={16}
                color={deadlineMode === "in_2_classes" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentedBtnText,
                  deadlineMode === "in_2_classes" && styles.segmentedBtnTextActive,
                ]}
              >
                {t("dua_pertemuan")}
              </Text>
              <Text style={styles.segmentedBtnSub}>
                {nextClass2.found && nextClass2.deadlineDate
                  ? format(parseISO(nextClass2.deadlineDate), "d MMM")
                  : "+7 hari"}
              </Text>
            </Pressable>

            {/* Option 3: Custom Date */}
            <Pressable
              style={[
                styles.segmentedBtn,
                deadlineMode === "custom" && styles.segmentedBtnActive,
              ]}
              onPress={() => setDeadlineMode("custom")}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={deadlineMode === "custom" ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentedBtnText,
                  deadlineMode === "custom" && styles.segmentedBtnTextActive,
                ]}
              >
                {t("kustom")}
              </Text>
              <Text style={styles.segmentedBtnSub}>
                {customDeadline ? format(parseISO(customDeadline), "d MMM") : "Pilih"}
              </Text>
            </Pressable>
          </View>

          {/* Quick Date Pills when Custom Date is Active */}
          {deadlineMode === "custom" && (
            <View style={styles.customDateWrapper}>
              <View style={styles.quickDateRow}>
                <Pressable
                  style={styles.quickDatePill}
                  onPress={() => setCustomDeadline(format(addDays(new Date(), 1), "yyyy-MM-dd"))}
                >
                  <Text style={styles.quickDatePillText}>Besok (+1d)</Text>
                </Pressable>
                <Pressable
                  style={styles.quickDatePill}
                  onPress={() => setCustomDeadline(format(addDays(new Date(), 2), "yyyy-MM-dd"))}
                >
                  <Text style={styles.quickDatePillText}>Lusa (+2d)</Text>
                </Pressable>
                <Pressable
                  style={styles.quickDatePill}
                  onPress={() => setCustomDeadline(format(addDays(new Date(), 7), "yyyy-MM-dd"))}
                >
                  <Text style={styles.quickDatePillText}>+1 Minggu</Text>
                </Pressable>
              </View>

              <TextInput
                style={[styles.textInput, { marginTop: spacing.xs }]}
                value={customDeadline}
                onChangeText={setCustomDeadline}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}
        </View>

        {/* ─── 5. Task Type Selector ─── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("tipe_tugas")}</Text>
          <View style={styles.typeSegmentedRow}>
            {(["homework", "quiz", "project"] as TaskType[]).map((type) => {
              const isSelected = taskType === type;
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.typeBtn,
                    isSelected && styles.typeBtnActive,
                  ]}
                  onPress={() => setTaskType(type)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      isSelected && styles.typeBtnTextActive,
                    ]}
                  >
                    {t(type as any)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── 6. Expandable "Opsi Lainnya" (Tidy rule: 1 level of detail) ─── */}
        <Pressable
          style={styles.moreOptionsHeader}
          onPress={() => setShowMoreOptions((prev) => !prev)}
        >
          <Text style={styles.moreOptionsHeaderText}>{t("opsi_lainnya")}</Text>
          <Ionicons
            name={showMoreOptions ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>

        {showMoreOptions && (
          <View style={styles.moreOptionsContent}>
            <Text style={styles.inputLabel}>{t("notes")}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={taskNotes}
              onChangeText={setTaskNotes}
              placeholder="Tambahkan catatan detail tugas..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingBottom: tidySpacing.large,
  },
  inputGroup: {
    marginBottom: tidySpacing.medium,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontWeight: typography.fontWeights.semibold,
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  durationBadge: {
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  inputHelperText: {
    fontWeight: typography.fontWeights.normal,
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: typography.fontSizes.body,
    minHeight: touchTarget.min,
  },
  inputErrorBorder: {
    borderColor: colors.danger,
  },
  inputErrorText: {
    fontWeight: typography.fontWeights.medium,
    fontSize: typography.fontSizes.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  textArea: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  hintChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.amberLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  hintChipText: {
    fontWeight: typography.fontWeights.medium,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    flex: 1,
  },
  chipsScroll: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  subjectChipActive: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.primary,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  subjectChipText: {
    fontWeight: typography.fontWeights.medium,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  subjectChipTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  presetRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  presetChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontWeight: typography.fontWeights.semibold,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  customDurationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  customInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  customDurationInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.fontSizes.body,
    fontWeight: "700",
    textAlign: "center",
  },
  customDurationUnit: {
    fontWeight: typography.fontWeights.medium,
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segmentedBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
  },
  segmentedBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  segmentedBtnText: {
    fontWeight: typography.fontWeights.semibold,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  segmentedBtnTextActive: {
    color: colors.primary,
  },
  segmentedBtnSub: {
    fontWeight: typography.fontWeights.normal,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  customDateWrapper: {
    marginTop: spacing.sm,
  },
  quickDateRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  quickDatePill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
  },
  quickDatePillText: {
    fontWeight: typography.fontWeights.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  typeSegmentedRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  typeBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeBtnText: {
    fontWeight: typography.fontWeights.semibold,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.primary,
  },
  moreOptionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: spacing.xs,
  },
  moreOptionsHeaderText: {
    fontWeight: typography.fontWeights.semibold,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  moreOptionsContent: {
    marginTop: spacing.xs,
  },
});
