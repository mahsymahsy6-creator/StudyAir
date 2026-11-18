import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, differenceInCalendarDays, startOfDay, addDays } from "date-fns";
import { colors, typography, touchTarget, radius, spacing } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { Task, StudyBlock, Subject, DeadlineMode } from "../../types";
import { t } from "../../lib/i18n";
import { HapticFeedback } from "../../lib/haptics";
import { formatLocaleDate } from "../../lib/dateUtils";
import { calculateNextClassDeadline } from "../../engine/deadlineEngine";
import { BottomSheet } from "../common/BottomSheet";
import { StatusPill } from "../common/StatusPill";
import { PrimaryButton } from "../common/PrimaryButton";
import { DeadlinePickerStrip } from "../tasks/DeadlinePickerStrip";

// ─── Pure Helpers for Today's Tasks (Tested & Exported) ───

export function deriveTodayTasks({
  tasks,
  studyBlocks = [],
  todayStr,
}: {
  tasks: Task[];
  studyBlocks?: StudyBlock[];
  todayStr: string;
}): Task[] {
  const scheduledTaskIdsToday = new Set(
    studyBlocks
      .filter((b) => b.date === todayStr && b.status !== "SKIPPED")
      .map((b) => b.taskId)
  );

  // 1. Filter tasks that belong to today
  const matching = tasks.filter((t) => {
    // A. Completed today
    if (t.status === "COMPLETED") {
      const completedDay = t.completedAt ? t.completedAt.slice(0, 10) : "";
      return completedDay === todayStr || (!completedDay && t.deadlineDate === todayStr);
    }

    // B. Pending: due today, scheduled today, or overdue
    const isDueToday = t.deadlineDate === todayStr;
    const isScheduledToday = scheduledTaskIdsToday.has(t.id);
    const isOverdue = t.deadlineDate < todayStr;

    return isDueToday || isScheduledToday || isOverdue;
  });

  // If no tasks match the strict today criteria, fallback to top pending upcoming tasks (up to 3)
  if (matching.length === 0) {
    return tasks
      .filter((t) => t.status !== "COMPLETED")
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))
      .slice(0, 3);
  }

  // Sort: Overdue first, then due today, then pending by deadline, completed at the end
  return matching.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "PENDING" ? -1 : 1;
    }
    const aOverdue = a.deadlineDate < todayStr ? 1 : 0;
    const bOverdue = b.deadlineDate < todayStr ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;

    const aDueToday = a.deadlineDate === todayStr ? 1 : 0;
    const bDueToday = b.deadlineDate === todayStr ? 1 : 0;
    if (aDueToday !== bDueToday) return bDueToday - aDueToday;

    return a.deadlineDate.localeCompare(b.deadlineDate);
  });
}

export function calculateTodayTasksProgress(todayTasks: Task[]): {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
} {
  const total = todayTasks.length;
  if (total === 0) return { total: 0, completed: 0, pending: 0, percentage: 0 };
  const completed = todayTasks.filter((t) => t.status === "COMPLETED").length;
  const pending = total - completed;
  const percentage = Math.round((completed / total) * 100);
  return { total, completed, pending, percentage };
}

export type FilterSegment = "all" | "pending" | "completed";

export interface TodayTasksSectionProps {
  onStartFocus: (task: Task, block?: StudyBlock | null) => void;
  onOpenAllTasks: () => void;
  onOpenAddTask: (initialDeadline?: string) => void;
}

export function TodayTasksSection({
  onStartFocus,
  onOpenAllTasks,
  onOpenAddTask,
}: TodayTasksSectionProps) {
  const {
    tasks,
    studyBlocks,
    subjects,
    timetableEntries,
    daysOff,
    overrides,
    toggleTaskCompletion,
    updateTask,
    deleteTask,
  } = useMobileStudyStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayDate = useMemo(() => parseISO(todayStr), [todayStr]);

  // Filter segment tab
  const [filterMode, setFilterMode] = useState<FilterSegment>("all");

  // Selected task detail sheet
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Subject dictionary map
  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const s of subjects) {
      map.set(s.id, s);
    }
    return map;
  }, [subjects]);

  // Today study block map by taskId
  const todayBlocksByTaskId = useMemo(() => {
    const map = new Map<string, StudyBlock>();
    for (const b of studyBlocks) {
      if (b.date === todayStr && b.status !== "SKIPPED") {
        map.set(b.taskId, b);
      }
    }
    return map;
  }, [studyBlocks, todayStr]);

  // Derived today tasks
  const todayTasks = useMemo(() => {
    return deriveTodayTasks({ tasks, studyBlocks, todayStr });
  }, [tasks, studyBlocks, todayStr]);

  // Progress metrics
  const progress = useMemo(() => {
    return calculateTodayTasksProgress(todayTasks);
  }, [todayTasks]);

  // Filtered tasks by segment
  const displayedTasks = useMemo(() => {
    if (filterMode === "pending") {
      return todayTasks.filter((t) => t.status !== "COMPLETED");
    }
    if (filterMode === "completed") {
      return todayTasks.filter((t) => t.status === "COMPLETED");
    }
    return todayTasks;
  }, [todayTasks, filterMode]);

  const handleToggle = (taskId: string) => {
    HapticFeedback.taskToggle();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleTaskCompletion(taskId);
  };

  const handleQuickEstimate = (taskId: string, mins: number) => {
    HapticFeedback.light();
    updateTask(taskId, { estimatedMinutes: mins });
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, estimatedMinutes: mins });
    }
  };

  const handleQuickDeadline = (
    task: Task,
    mode: "today" | "tomorrow" | "lusa" | "nextClass" | "minus1" | "plus1"
  ) => {
    HapticFeedback.light();
    let nextDate = task.deadlineDate || todayStr;
    let nextMode = task.deadlineMode || "custom";

    if (mode === "today") {
      nextDate = todayStr;
      nextMode = "custom";
    } else if (mode === "tomorrow") {
      nextDate = format(addDays(parseISO(todayStr), 1), "yyyy-MM-dd");
      nextMode = "custom";
    } else if (mode === "lusa") {
      nextDate = format(addDays(parseISO(todayStr), 2), "yyyy-MM-dd");
      nextMode = "custom";
    } else if (mode === "nextClass") {
      const res = calculateNextClassDeadline(task.subjectId, todayStr, timetableEntries, {
        daysOff,
        overrides,
        afterNClasses: 1,
      });
      nextDate =
        res.found && res.deadlineDate
          ? res.deadlineDate
          : format(addDays(parseISO(todayStr), 1), "yyyy-MM-dd");
      nextMode = "nextClass";
    } else if (mode === "minus1" || mode === "plus1") {
      try {
        const base = parseISO(task.deadlineDate || todayStr);
        nextDate = format(addDays(base, mode === "plus1" ? 1 : -1), "yyyy-MM-dd");
      } catch {
        nextDate = todayStr;
      }
      nextMode = "custom";
    }

    updateTask(task.id, { deadlineDate: nextDate, deadlineMode: nextMode });
    if (selectedTask && selectedTask.id === task.id) {
      setSelectedTask({ ...selectedTask, deadlineDate: nextDate, deadlineMode: nextMode });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    HapticFeedback.warning();
    deleteTask(taskId);
    setSelectedTask(null);
  };

  const renderDeadlineBadge = (deadlineStr: string, deadlineMode?: DeadlineMode) => {
    try {
      const deadline = startOfDay(parseISO(deadlineStr));
      const diff = differenceInCalendarDays(deadline, startOfDay(todayDate));
      const shortDate = formatLocaleDate(deadline, "d MMM");
      const classPrefix = deadlineMode === "nextClass" ? "🏫 " : "";

      if (diff < 0) {
        return (
          <StatusPill
            variant="red"
            label={`⚠️ ${t("deadline_terlambat", { days: Math.abs(diff) })} • ${shortDate}`}
          />
        );
      }
      if (diff === 0) {
        return <StatusPill variant="amber" label={`🔥 ${t("deadline_hari_ini") || "Hari Ini"}`} />;
      }
      if (diff === 1) {
        return (
          <StatusPill
            variant="amber"
            label={`${classPrefix}${t("deadline_besok") || "Besok"} • ${shortDate}`}
          />
        );
      }
      return <StatusPill variant="gray" label={`${classPrefix}${shortDate} (${diff}h)`} />;
    } catch {
      return <StatusPill variant="gray" label={deadlineStr} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── 1. Section Header & See All ─── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.sectionTitle}>{t("tugas_pr_hari_ini") || "Tugas & PR Hari Ini"}</Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgeText}>{progress.total}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            {t("tasks_completed_sub", { completed: progress.completed, total: progress.total })}
          </Text>
        </View>
        <Pressable
          style={styles.seeAllBtn}
          onPress={onOpenAllTasks}
          hitSlop={touchTarget.min / 4}
          accessibilityLabel={t("filter_semua")}
        >
          <Text style={styles.seeAllText}>{t("filter_semua") || "Semua"}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>

      {/* ─── 2. Task Cards List ─── */}
      {displayedTasks.length > 0 ? (
        displayedTasks.map((task) => {
          const sub = subjectsMap.get(task.subjectId);
          const subColor = sub?.color || sub?.color_hex || colors.primary;
          const isDone = task.status === "COMPLETED";
          const scheduledBlock = todayBlocksByTaskId.get(task.id);

          return (
            <Pressable
              key={task.id}
              style={[styles.taskCard, isDone && styles.taskCardDone]}
              onPress={() => setSelectedTask(task)}
              onLongPress={() => setSelectedTask(task)}
              delayLongPress={400}
            >
              <View style={styles.taskCardContent}>
                {/* 1-Tap Checkbox */}
                <Pressable
                  style={styles.checkboxTouch}
                  onPress={() => handleToggle(task.id)}
                  hitSlop={touchTarget.min / 4}
                  accessibilityLabel={`Tandai ${isDone ? "belum selesai" : "selesai"} ${task.title}`}
                >
                  <View style={[styles.checkbox, isDone && styles.checkboxActive]}>
                    {isDone && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={colors.textInverse}
                      />
                    )}
                  </View>
                </Pressable>

                {/* Task Details Info */}
                <View style={styles.taskInfoContainer}>
                  {/* Subject & Due Date Header Row */}
                  <View style={styles.taskMetaTopRow}>
                    <View style={styles.subjectGroup}>
                      <View style={[styles.subjectDot, { backgroundColor: subColor }]} />
                      <Text style={styles.subjectNameText} numberOfLines={1}>
                        {sub?.name || "Umum"} • {t(task.type as any) || "PR"}
                      </Text>
                    </View>
                    <View style={styles.taskMetaRight}>
                      {isDone ? (
                        <StatusPill variant="green" label={t("selesai") || "Selesai"} />
                      ) : (
                        renderDeadlineBadge(task.deadlineDate, task.deadlineMode)
                      )}
                      <Pressable
                        style={styles.taskMenuBtn}
                        onPress={() => setSelectedTask(task)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t("opsi_lainnya") || "Opsi tugas"}
                      >
                        <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Task Title */}
                  <Text
                    style={[styles.taskTitleText, isDone && styles.taskTitleTextDone]}
                    numberOfLines={2}
                  >
                    {task.title}
                  </Text>

                  {/* Optional Notes Preview */}
                  {task.notes && !isDone ? (
                    <Text style={styles.taskNotesPreview} numberOfLines={1}>
                      {task.notes}
                    </Text>
                  ) : null}

                  {/* Metadata Chips & Quick Focus Action Row */}
                  <View style={styles.taskBottomRow}>
                    <View style={styles.taskPillsRow}>
                      {task.estimatedMinutes ? (
                        <View style={styles.durationChip}>
                          <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                          <Text style={styles.durationChipText}>{task.estimatedMinutes} {t("menit_singkat") || "mnt"}</Text>
                        </View>
                      ) : null}

                      {scheduledBlock && !isDone ? (
                        <View style={styles.scheduledPill}>
                          <Ionicons name="calendar" size={11} color={colors.primary} />
                          <Text style={styles.scheduledPillText}>
                            {scheduledBlock.startTime}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Subtle Focus Action */}
                    {!isDone && (
                      <Pressable
                        style={styles.directFocusBtnSubtle}
                        onPress={() => onStartFocus(task, scheduledBlock)}
                        hitSlop={touchTarget.min / 4}
                        accessibilityLabel={`Mulai fokus untuk ${task.title}`}
                      >
                        <Ionicons name="play-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                        <Text style={styles.directFocusTextSubtle}>{t("fokus_tugas") || "Fokus"}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })
      ) : (
        /* Empty State */
        <View style={styles.emptyCard}>
          <Ionicons
            name={filterMode === "completed" ? "time-outline" : "checkmark-done-circle-outline"}
            size={36}
            color={colors.emerald}
            style={{ marginBottom: spacing.xs }}
          />
          <Text style={styles.emptyTitle}>
            {filterMode === "completed"
              ? "Belum ada tugas selesai hari ini."
              : filterMode === "pending"
              ? "Semua tugas hari ini sudah beres! 🎉"
              : "Belum ada tugas untuk hari ini."}
          </Text>
          <Text style={styles.emptySub}>
            {filterMode === "completed"
              ? "Selesaikan tugas di atas untuk mengisi progres harianmu."
              : "Santai sejenak atau catat PR baru menggunakan tombol di bawah."}
          </Text>
          <View style={{ marginTop: spacing.md, width: "100%", maxWidth: 220 }}>
            <PrimaryButton
              label={t("tambah_pr_hari_ini") || "Tambah Tugas Hari Ini"}
              icon="add"
              onPress={() => onOpenAddTask(todayStr)}
            />
          </View>
        </View>
      )}

      {/* ─── 3. Task Quick Detail & Edit Sheet ─── */}
      <BottomSheet
        visible={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title || ""}
      >
        {selectedTask && (
          <View>
            <Text style={styles.modalSubjectSub}>
              {subjectsMap.get(selectedTask.subjectId)?.name || "Umum"}
            </Text>
            {selectedTask.notes ? (
              <View style={styles.modalNotesBox}>
                <Text style={styles.modalNotesText}>{selectedTask.notes}</Text>
              </View>
            ) : null}

            {/* Deadline Presets & 14-Day Calendar Strip */}
            <Text style={styles.modalSectionLabel}>Tenggat Waktu (Deadline)</Text>
            <View style={{ marginBottom: spacing.md }}>
              <DeadlinePickerStrip
                selectedDate={selectedTask.deadlineDate || todayStr}
                deadlineMode={selectedTask.deadlineMode || "custom"}
                subjectId={selectedTask.subjectId}
                subjectName={subjectsMap.get(selectedTask.subjectId)?.name}
                subjectColor={subjectsMap.get(selectedTask.subjectId)?.color}
                timetableEntries={timetableEntries}
                daysOff={daysOff}
                overrides={overrides}
                todayStr={todayStr}
                compact
                onSelectDeadline={(dateStr, mode) => {
                  updateTask(selectedTask.id, { deadlineDate: dateStr, deadlineMode: mode });
                  setSelectedTask({ ...selectedTask, deadlineDate: dateStr, deadlineMode: mode });
                }}
              />
            </View>

            {/* Duration Presets Quick Change */}
            <Text style={styles.modalSectionLabel}>{t("ubah_durasi") || "Ubah Estimasi"}</Text>
            <View style={styles.durationPresetsRow}>
              {[15, 30, 45, 60, 90].map((mins) => {
                const isSelected = (selectedTask.estimatedMinutes || 30) === mins;
                return (
                  <Pressable
                    key={mins}
                    style={[
                      styles.presetChip,
                      isSelected && styles.presetChipActive,
                    ]}
                    onPress={() => handleQuickEstimate(selectedTask.id, mins)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isSelected && styles.presetChipTextActive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              {selectedTask.status !== "COMPLETED" && (
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Mulai Fokus Tugas Ini"
                    icon="play"
                    onPress={() => {
                      const block = todayBlocksByTaskId.get(selectedTask.id);
                      setSelectedTask(null);
                      onStartFocus(selectedTask, block);
                    }}
                  />
                </View>
              )}
              <Pressable
                style={styles.modalDeleteBtn}
                onPress={() => handleDeleteTask(selectedTask.id)}
                hitSlop={touchTarget.min / 4}
                accessibilityLabel="Hapus tugas"
              >
                <Ionicons name="trash-outline" size={20} color={colors.rose} />
              </Pressable>
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm + 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  badgePill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    marginRight: 2,
  },
  // Plain divided rows: the parent hero Card already provides the box.
  taskCard: {
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  lateText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.danger,
  },
  taskCardDone: {
    opacity: 0.65,
  },
  taskCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxTouch: {
    marginRight: spacing.sm + 2,
    paddingTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  taskInfoContainer: {
    flex: 1,
  },
  taskMetaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  subjectGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  subjectNameText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  taskMetaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  taskMenuBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitleText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 4,
  },
  taskTitleTextDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  taskNotesPreview: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  taskBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
    gap: spacing.xs,
  },
  taskPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  durationChipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  scheduledPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  scheduledPillText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  directFocusBtnSubtle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  directFocusTextSubtle: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  modalSubjectSub: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  modalNotesBox: {
    backgroundColor: colors.surfaceHover,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  modalNotesText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  durationPresetsRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  presetChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  modalActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  modalDeleteBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHover,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
