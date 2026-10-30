import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, differenceInCalendarDays, startOfDay } from "date-fns";
import { colors, typography, touchTarget, tidySpacing, radius, spacing } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { Task, StudyBlock, Subject } from "../../types";
import { t } from "../../lib/i18n";
import { HapticFeedback } from "../../lib/haptics";
import { formatLocaleDate } from "../../lib/dateUtils";
import { Card } from "../common/Card";
import { StatusPill } from "../common/StatusPill";
import { PrimaryButton } from "../common/PrimaryButton";
import { SecondaryButton } from "../common/SecondaryButton";

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
    toggleTaskCompletion,
    updateTask,
    deleteTask,
  } = useMobileStudyStore();

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const todayDate = useMemo(() => new Date(), []);

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

  const handleDeleteTask = (taskId: string) => {
    HapticFeedback.warning();
    deleteTask(taskId);
    setSelectedTask(null);
  };

  const renderDeadlineBadge = (deadlineStr: string) => {
    try {
      const deadline = startOfDay(parseISO(deadlineStr));
      const diff = differenceInCalendarDays(deadline, startOfDay(todayDate));

      if (diff < 0) {
        return <StatusPill variant="red" label={t("deadline_terlambat", { days: Math.abs(diff) })} />;
      }
      if (diff === 0) {
        return <StatusPill variant="red" label={t("deadline_hari_ini") || "Hari Ini"} />;
      }
      if (diff === 1) {
        return <StatusPill variant="amber" label={t("deadline_besok") || "Besok"} />;
      }
      return <StatusPill variant="gray" label={formatLocaleDate(deadline, "d MMM")} />;
    } catch {
      return <StatusPill variant="gray" label={deadlineStr} />;
    }
  };

  const renderTaskTypeBadge = (type: string) => {
    if (type === "quiz") {
      return (
        <View style={styles.taskTypeBadge}>
          <Ionicons name="help-circle-outline" size={11} color={colors.accent} />
          <Text style={[styles.taskTypeText, { color: colors.accent }]}>Kuis</Text>
        </View>
      );
    }
    if (type === "project") {
      return (
        <View style={styles.taskTypeBadge}>
          <Ionicons name="briefcase-outline" size={11} color={colors.amber} />
          <Text style={[styles.taskTypeText, { color: colors.amber }]}>Proyek</Text>
        </View>
      );
    }
    return (
      <View style={styles.taskTypeBadge}>
        <Ionicons name="pencil-outline" size={11} color={colors.primary} />
        <Text style={[styles.taskTypeText, { color: colors.primary }]}>PR</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── 1. Section Header with Badge & Add CTA ─── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.sectionTitle}>{t("tugas_pr_hari_ini") || "Tugas & PR Hari Ini"}</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{progress.total}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.addQuickBtn}
            onPress={() => onOpenAddTask(todayStr)}
            hitSlop={touchTarget.min / 4}
            accessibilityLabel="Tambah tugas untuk hari ini"
          >
            <Ionicons name="add" size={16} color={colors.primary} style={{ marginRight: 2 }} />
            <Text style={styles.addQuickBtnText}>Tambah PR</Text>
          </Pressable>
          <Pressable
            style={styles.seeAllBtn}
            onPress={onOpenAllTasks}
            hitSlop={touchTarget.min / 4}
            accessibilityLabel="Lihat semua tugas"
          >
            <Text style={styles.seeAllText}>Semua</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* ─── 2. Gamified Daily Progress Bar (O3 Space) ─── */}
      {progress.total > 0 && (
        <Card style={styles.progressCard}>
          <View style={styles.progressMetaRow}>
            <Text style={styles.progressLabelText}>
              {t("tugas_selesai_count", {
                completed: progress.completed,
                total: progress.total,
              }) || `${progress.completed} / ${progress.total} Selesai`}
            </Text>
            <Text style={styles.progressPercentText}>{progress.percentage}%</Text>
          </View>

          {/* Progress Bar Track */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress.percentage}%`,
                  backgroundColor:
                    progress.percentage === 100 ? colors.emerald : colors.accent,
                },
              ]}
            />
          </View>

          {/* Dynamic Encouraging Status Micro-Copy */}
          <Text style={styles.progressCaptionText}>
            {progress.percentage === 100
              ? t("progress_semua_tuntas") || "Luar biasa! Semua tugas hari ini sudah beres 🎉"
              : progress.completed > 0
              ? t("progress_sisa_tugas", { count: progress.pending }) ||
                `Tinggal ${progress.pending} tugas lagi untuk hari ini. Semangat! 🔥`
              : t("progress_siap_mulai") || "Ayo mulai cicil tugasmu hari ini! 💪"}
          </Text>
        </Card>
      )}

      {/* ─── 3. Segment Filter Tabs ─── */}
      {progress.total > 0 && (
        <View style={styles.filterSegmentRow}>
          <Pressable
            style={[styles.filterChip, filterMode === "all" && styles.filterChipActive]}
            onPress={() => setFilterMode("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                filterMode === "all" && styles.filterChipTextActive,
              ]}
            >
              {t("filter_semua") || "Semua"} ({progress.total})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, filterMode === "pending" && styles.filterChipActive]}
            onPress={() => setFilterMode("pending")}
          >
            <Text
              style={[
                styles.filterChipText,
                filterMode === "pending" && styles.filterChipTextActive,
              ]}
            >
              {t("filter_tertunda") || "Tertunda"} ({progress.pending})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, filterMode === "completed" && styles.filterChipActive]}
            onPress={() => setFilterMode("completed")}
          >
            <Text
              style={[
                styles.filterChipText,
                filterMode === "completed" && styles.filterChipTextActive,
              ]}
            >
              {t("filter_selesai") || "Selesai"} ({progress.completed})
            </Text>
          </Pressable>
        </View>
      )}

      {/* ─── 4. Task Cards List ─── */}
      {displayedTasks.length > 0 ? (
        displayedTasks.map((task) => {
          const sub = subjectsMap.get(task.subjectId);
          const subColor = sub?.color || sub?.color_hex || colors.primary;
          const isDone = task.status === "COMPLETED";
          const scheduledBlock = todayBlocksByTaskId.get(task.id);

          return (
            <Card
              key={task.id}
              style={[styles.taskCard, isDone && styles.taskCardDone]}
              onPress={() => setSelectedTask(task)}
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
                    <Ionicons
                      name={isDone ? "checkmark" : "square-outline"}
                      size={isDone ? 15 : 18}
                      color={isDone ? colors.textInverse : colors.textSecondary}
                    />
                  </View>
                </Pressable>

                {/* Task Details Info */}
                <View style={styles.taskInfoContainer}>
                  {/* Subject & Type Header Row */}
                  <View style={styles.taskMetaTopRow}>
                    <View style={styles.subjectGroup}>
                      <View style={[styles.subjectDot, { backgroundColor: subColor }]} />
                      <Text style={styles.subjectNameText} numberOfLines={1}>
                        {sub?.name || "Umum"}
                      </Text>
                    </View>
                    {renderTaskTypeBadge(task.type)}
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
                      {isDone ? (
                        <StatusPill variant="green" label={t("selesai") || "Selesai"} />
                      ) : (
                        renderDeadlineBadge(task.deadlineDate)
                      )}

                      {task.estimatedMinutes ? (
                        <View style={styles.durationChip}>
                          <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                          <Text style={styles.durationChipText}>{task.estimatedMinutes}m</Text>
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

                    {/* Direct 1-Tap Focus Launcher Button */}
                    {!isDone && (
                      <Pressable
                        style={styles.directFocusBtn}
                        onPress={() => onStartFocus(task, scheduledBlock)}
                        hitSlop={touchTarget.min / 4}
                        accessibilityLabel={`Mulai fokus untuk ${task.title}`}
                      >
                        <Ionicons name="play" size={12} color={colors.textInverse} style={{ marginRight: 3 }} />
                        <Text style={styles.directFocusText}>{t("fokus_tugas") || "Fokus"}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            </Card>
          );
        })
      ) : (
        /* Empty State */
        <Card style={styles.emptyCard}>
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
        </Card>
      )}

      {/* ─── 5. Task Quick Detail & Edit Modal ─── */}
      {selectedTask && (
        <Modal
          visible={selectedTask !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTask(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedTask(null)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              {/* Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderTitle}>{t("detail_tugas") || "Rincian Tugas"}</Text>
                  <Text style={styles.modalSubjectSub}>
                    {subjectsMap.get(selectedTask.subjectId)?.name || "Umum"}
                  </Text>
                </View>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedTask(null)}
                  hitSlop={touchTarget.min / 4}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Task Title & Notes */}
              <Text style={styles.modalTaskTitle}>{selectedTask.title}</Text>
              {selectedTask.notes ? (
                <View style={styles.modalNotesBox}>
                  <Text style={styles.modalNotesText}>{selectedTask.notes}</Text>
                </View>
              ) : null}

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
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.body + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  badgePill: {
    backgroundColor: colors.surfaceHover,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  addQuickBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginRight: 2,
  },
  progressCard: {
    padding: spacing.sm + 4,
    borderRadius: radius.card,
    marginBottom: spacing.sm,
  },
  progressMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabelText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceHover,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressCaptionText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  filterSegmentRow: {
    flexDirection: "row",
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  taskCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
    borderRadius: radius.card,
  },
  taskCardDone: {
    opacity: 0.65,
  },
  taskCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxTouch: {
    marginRight: spacing.sm,
    paddingTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
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
  },
  subjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  subjectNameText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  taskTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  taskTypeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
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
  directFocusBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  directFocusText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textInverse,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.lg,
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

  // Detail Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  modalHeaderTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalSubjectSub: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: spacing.xs,
  },
  modalTaskTitle: {
    fontSize: 17,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.xs,
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
