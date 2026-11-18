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
import { formatLocaleDate } from "../../lib/dateUtils";
import { calculateNextClassDeadline } from "../../engine/deadlineEngine";
import { parseIndonesianDateHint } from "../../engine/dateHintParser";
import { suggestTaskDuration } from "../../services/aiService";
import { buildSchedule, extractBusyBlocksFromTimetable } from "../../engine/schedulerEngine";
import { DeadlinePickerStrip } from "./DeadlinePickerStrip";

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
  const {
    subjects,
    tasks,
    timetableEntries,
    periodTimes,
    daysOff,
    overrides,
    schedulePrefs,
    addTask,
    addSubject,
    applySchedule,
  } = useMobileStudyStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTitleError, setTaskTitleError] = useState("");
  const [taskSubjectId, setTaskSubjectId] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("homework");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationText, setCustomDurationText] = useState("30");
  const [deadlineMode, setDeadlineMode] = useState<"next_class" | "in_2_classes" | "custom">("next_class");
  const [hasManualDeadlineSelection, setHasManualDeadlineSelection] = useState(false);
  const [customDeadline, setCustomDeadline] = useState(
    initialDeadline || format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [autoScheduleBlock, setAutoScheduleBlock] = useState(true);
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
      setHasManualDeadlineSelection(Boolean(initialDeadline));
      setCustomDeadline(initialDeadline || format(addDays(new Date(), 1), "yyyy-MM-dd"));
      setAutoScheduleBlock(true);
      setTaskNotes("");
      setShowMoreOptions(false);
    }
  }, [visible, initialSubjectId, initialDeadline, subjects]);

  const activeSubjectId = taskSubjectId || subjects[0]?.id || "general";
  const activeSubjectObj = useMemo(
    () => subjects.find((s) => s.id === activeSubjectId),
    [subjects, activeSubjectId]
  );
  const activeSubjectColor =
    activeSubjectObj?.color || activeSubjectObj?.color_hex || colors.primary;

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

  // Detected date hint from title or notes
  const detectedDateHint = useMemo(() => {
    return parseIndonesianDateHint(taskTitle, todayStr) || parseIndonesianDateHint(taskNotes, todayStr);
  }, [taskTitle, taskNotes, todayStr]);

  // Suggested duration from title & task type
  const suggestedDuration = useMemo(() => {
    return suggestTaskDuration(taskTitle, taskType);
  }, [taskTitle, taskType]);

  // Effective deadline string (auto-applies NLP date hint unless user manually picked a deadline mode)
  const effectiveDeadline = useMemo(() => {
    if (!hasManualDeadlineSelection && detectedDateHint?.suggestedDate) {
      return detectedDateHint.suggestedDate;
    }
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
  }, [hasManualDeadlineSelection, detectedDateHint, deadlineMode, nextClass1, nextClass2, customDeadline]);

  const resolvedModeForStrip: DeadlineMode = useMemo(() => {
    if (!hasManualDeadlineSelection && detectedDateHint?.suggestedDate) {
      return "custom";
    }
    if (deadlineMode === "next_class") return "nextClass";
    if (deadlineMode === "in_2_classes") return "afterNClasses";
    return "custom";
  }, [hasManualDeadlineSelection, detectedDateHint, deadlineMode]);

  // Live preview of where the study block will be placed when auto-scheduled
  const previewBlockInfo = useMemo(() => {
    if (!visible) return null;
    try {
      const horizonEndStr = format(addDays(parseISO(todayStr), 14), "yyyy-MM-dd");
      const busyBlocks = extractBusyBlocksFromTimetable({
        timetableEntries,
        periodTimes,
        daysOff,
        overrides,
        startDate: todayStr,
        endDate: horizonEndStr,
      });
      const draftTask: Task = {
        id: "__draft_preview__",
        title: taskTitle.trim() || "Tugas Baru",
        subjectId: activeSubjectId,
        type: taskType,
        status: "PENDING",
        givenDate: todayStr,
        deadlineDate: effectiveDeadline,
        deadlineMode: resolvedModeForStrip,
        estimatedMinutes: Math.max(5, Math.min(360, estimatedMinutes)),
      };
      const pendingExisting = tasks.filter((t) => t.status === "PENDING");
      const res = buildSchedule({
        tasks: [...pendingExisting, draftTask],
        busyBlocks,
        prefs: schedulePrefs,
        referenceDate: todayStr,
      });
      const myBlocks = res.blocks.filter((b) => b.taskId === "__draft_preview__");
      if (myBlocks.length > 0) {
        const first = myBlocks[0];
        const dateLabel =
          first.date === todayStr
            ? "Hari Ini"
            : first.date === format(addDays(parseISO(todayStr), 1), "yyyy-MM-dd")
            ? "Besok"
            : formatLocaleDate(parseISO(first.date), "EEE, d MMM");
        return {
          fits: true,
          label: `${dateLabel} • ${first.startTime}–${first.endTime}`,
          count: myBlocks.length,
        };
      }
      return {
        fits: false,
        label: "Jadwal sebelum tenggat padat — coba undur tenggat +1 hari",
        count: 0,
      };
    } catch {
      return null;
    }
  }, [
    visible,
    todayStr,
    timetableEntries,
    periodTimes,
    daysOff,
    overrides,
    taskTitle,
    activeSubjectId,
    taskType,
    effectiveDeadline,
    resolvedModeForStrip,
    estimatedMinutes,
    tasks,
    schedulePrefs,
  ]);

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

    const newTask = addTask({
      title: trimmedTitle,
      subjectId: activeSubjectId,
      type: taskType,
      givenDate: todayStr,
      deadlineDate: effectiveDeadline,
      deadlineMode: resolvedModeForStrip,
      estimatedMinutes: Math.max(5, Math.min(360, estimatedMinutes)),
      notes: taskNotes.trim() || undefined,
    });

    if (autoScheduleBlock) {
      try {
        const horizonEndStr = format(addDays(parseISO(todayStr), 14), "yyyy-MM-dd");
        const busyBlocks = extractBusyBlocksFromTimetable({
          timetableEntries,
          periodTimes,
          daysOff,
          overrides,
          startDate: todayStr,
          endDate: horizonEndStr,
        });
        const pendingAll = [
          ...tasks.filter((t) => t.status === "PENDING" && t.id !== newTask.id),
          newTask,
        ];
        const scheduledRes = buildSchedule({
          tasks: pendingAll,
          busyBlocks,
          prefs: schedulePrefs,
          referenceDate: todayStr,
        });
        if (scheduledRes.blocks.length > 0) {
          applySchedule(scheduledRes.blocks);
        }
      } catch {
        // Ignore auto-schedule error
      }
    }

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
                setHasManualDeadlineSelection(true);
                setDeadlineMode("custom");
                setCustomDeadline(detectedDateHint.suggestedDate);
              }}
            >
              <Ionicons name="sparkles" size={14} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.hintChipText}>
                {t("terdeteksi_tanggal", { date: detectedDateHint.label })} (Otomatis aktif)
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
            <Pressable
              style={[
                styles.subjectChip,
                {
                  borderColor: colors.primary,
                  borderStyle: "dashed",
                },
              ]}
              onPress={() => {
                setIsAddingSubject((v) => !v);
              }}
            >
              <Ionicons name="add" size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.subjectChipText, { color: colors.primary, fontWeight: "700" }]}>
                Mapel Baru
              </Text>
            </Pressable>
          </ScrollView>

          {isAddingSubject && (
            <View style={styles.inlineAddSubjectRow}>
              <TextInput
                style={styles.inlineAddSubjectInput}
                placeholder="Nama mata pelajaran baru..."
                placeholderTextColor={colors.textMuted}
                value={newSubjectName}
                onChangeText={setNewSubjectName}
                autoFocus
              />
              <Pressable
                style={styles.inlineAddSubjectSaveBtn}
                onPress={() => {
                  if (newSubjectName.trim()) {
                    const fallbackColors = [
                      "#3A86FF",
                      "#8B5CF6",
                      "#10B981",
                      "#F59E0B",
                      "#EF4444",
                      "#06B6D4",
                      "#EC4899",
                      "#14B8A6",
                    ];
                    const created = addSubject({
                      name: newSubjectName.trim(),
                      color: fallbackColors[subjects.length % fallbackColors.length],
                    });
                    setTaskSubjectId(created.id);
                    setNewSubjectName("");
                    setIsAddingSubject(false);
                  }
                }}
              >
                <Text style={styles.inlineAddSubjectSaveText}>Simpan</Text>
              </Pressable>
              <Pressable
                style={styles.inlineAddSubjectCancelBtn}
                onPress={() => {
                  setIsAddingSubject(false);
                  setNewSubjectName("");
                }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
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

          {taskTitle.trim().length > 3 && estimatedMinutes !== suggestedDuration && (
            <Pressable
              style={styles.aiDurationChip}
              onPress={() => handleSelectPreset(suggestedDuration)}
            >
              <Ionicons name="sparkles" size={13} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={styles.aiDurationChipText}>
                Saran AI: {suggestedDuration} menit (Terapkan)
              </Text>
            </Pressable>
          )}

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

        {/* ─── 4. Visual Deadline & Next-Class Calendar Strip ─── */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t("deadline_mode")}</Text>
          <DeadlinePickerStrip
            todayStr={todayStr}
            subjectId={activeSubjectId}
            subjectColor={activeSubjectColor}
            selectedDate={effectiveDeadline}
            selectedMode={resolvedModeForStrip}
            timetableEntries={timetableEntries}
            daysOff={daysOff}
            overrides={overrides}
            onSelectDeadline={(dateStr, mode) => {
              setHasManualDeadlineSelection(true);
              setCustomDeadline(dateStr);
              if (mode === "nextClass") {
                setDeadlineMode("next_class");
              } else if (mode === "afterNClasses") {
                setDeadlineMode("in_2_classes");
              } else {
                setDeadlineMode("custom");
              }
            }}
          />

          {/* Auto-Schedule Study Block Toggle + Live Slot Preview */}
          <Pressable
            style={[
              styles.autoScheduleCard,
              autoScheduleBlock && styles.autoScheduleCardActive,
            ]}
            onPress={() => setAutoScheduleBlock((prev) => !prev)}
          >
            <View
              style={[
                styles.autoScheduleCheck,
                autoScheduleBlock && styles.autoScheduleCheckActive,
              ]}
            >
              {autoScheduleBlock && (
                <Ionicons name="checkmark" size={14} color={colors.textInverse} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
                <Text style={styles.autoScheduleTitle}>
                  Jadwalkan blok belajar otomatis
                </Text>
              </View>
              <Text style={styles.autoScheduleSub}>
                {autoScheduleBlock && previewBlockInfo
                  ? previewBlockInfo.fits
                    ? `Rencana belajar: ${previewBlockInfo.label} (${estimatedMinutes} mnt)`
                    : previewBlockInfo.label
                  : "Simpan tanpa menyusun blok belajar otomatis"}
              </Text>
            </View>
          </Pressable>
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
    backgroundColor: colors.accentLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  hintChipText: {
    fontWeight: typography.fontWeights.medium,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    flex: 1,
  },
  aiDurationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent,
    borderBottomWidth: 2,
    borderBottomColor: colors.accentBottom,
    alignSelf: "flex-start",
  },
  aiDurationChipText: {
    fontWeight: typography.fontWeights.bold,
    fontSize: typography.fontSizes.caption,
    color: colors.accent,
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
  autoScheduleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  autoScheduleCardActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  autoScheduleCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  autoScheduleCheckActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  autoScheduleTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  autoScheduleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
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
  inlineAddSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  inlineAddSubjectInput: {
    flex: 1,
    height: 38,
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
  },
  inlineAddSubjectSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineAddSubjectSaveText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  inlineAddSubjectCancelBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
