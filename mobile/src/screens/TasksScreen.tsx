import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { parseISO, differenceInCalendarDays, startOfDay, format, addDays } from "date-fns";
import { colors, typography, spacing, radius, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { Task, StudyBlock, Subject } from "../types";
import { t } from "../lib/i18n";
import { HapticFeedback } from "../lib/haptics";
import { formatLocaleDate } from "../lib/dateUtils";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { Card } from "../components/common/Card";
import { StatusPill } from "../components/common/StatusPill";
import { Banner } from "../components/common/Banner";
import { EmptyState } from "../components/common/EmptyState";
import { PrimaryButton } from "../components/common/PrimaryButton";
import { Snackbar } from "../components/common/Snackbar";
import { CreateScheduleSheet } from "../components/schedule/CreateScheduleSheet";
import { AddTaskSheet } from "../components/tasks/AddTaskSheet";
import { buildSchedule, extractBusyBlocksFromTimetable } from "../engine/schedulerEngine";

export interface PartitionedTasks {
  scheduled: Task[];
  unscheduled: Task[];
  unallocated: Task[];
  completed: Task[];
}

export function partitionTasks(
  tasks: Task[],
  studyBlocks: StudyBlock[],
  unallocatedTaskIds: string[] = []
): PartitionedTasks {
  const completed: Task[] = [];
  const scheduled: Task[] = [];
  const unscheduled: Task[] = [];
  const unallocated: Task[] = [];

  const unallocatedSet = new Set(unallocatedTaskIds);
  const activeBlockTaskIds = new Set(
    studyBlocks.filter((b) => b.status === "SCHEDULED" || b.status === "IN_PROGRESS").map((b) => b.taskId)
  );

  for (const task of tasks) {
    if (task.status === "COMPLETED") {
      completed.push(task);
    } else if (unallocatedSet.has(task.id)) {
      unallocated.push(task);
    } else if (activeBlockTaskIds.has(task.id)) {
      scheduled.push(task);
    } else {
      unscheduled.push(task);
    }
  }

  return { scheduled, unscheduled, unallocated, completed };
}

export function getNextBlockForTask(
  taskId: string,
  studyBlocks: StudyBlock[],
  currentDateStr: string = format(new Date(), "yyyy-MM-dd")
): StudyBlock | null {
  const blocksForTask = studyBlocks
    .filter(
      (b) =>
        b.taskId === taskId &&
        (b.status === "SCHEDULED" || b.status === "IN_PROGRESS") &&
        b.date >= currentDateStr
    )
    .sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return a.startTime.localeCompare(b.startTime);
    });

  return blocksForTask[0] || null;
}

export function formatNextBlockTime(
  block: StudyBlock | null,
  currentDateStr: string = format(new Date(), "yyyy-MM-dd")
): string | null {
  if (!block) return null;
  if (block.date === currentDateStr) {
    return `Hari ini ${block.startTime}`;
  }
  try {
    const diff = differenceInCalendarDays(parseISO(block.date), parseISO(currentDateStr));
    if (diff === 1) {
      return `Besok ${block.startTime}`;
    }
    const formatted = formatLocaleDate(parseISO(block.date), "d MMM");
    return `${formatted} ${block.startTime}`;
  } catch {
    return `${block.date} ${block.startTime}`;
  }
}

export type TaskFilterTab = "all" | "scheduled" | "unscheduled" | "completed";

export interface TasksScreenProps {
  onBack?: () => void;
  onOpenSettings?: () => void;
  onStartFocusForTask?: (task: Task) => void;
}

export function TasksScreen({ onBack, onOpenSettings, onStartFocusForTask }: TasksScreenProps) {
  const {
    tasks,
    studyBlocks,
    subjects,
    timetableEntries,
    periodTimes,
    daysOff,
    overrides,
    schedulePrefs,
    toggleTaskCompletion,
    deleteTask,
    addTask,
    streakState,
  } = useMobileStudyStore();

  const [activeFilter, setActiveFilter] = useState<TaskFilterTab>("all");
  const [createScheduleVisible, setCreateScheduleVisible] = useState(false);
  const [addTaskVisible, setAddTaskVisible] = useState(false);

  // Undo deletion state
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const undoTimerRef = useRef<any>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const sub of subjects) {
      map.set(sub.id, sub);
    }
    return map;
  }, [subjects]);

  // Extract busy blocks for unallocated check
  const busyBlocks = useMemo(() => {
    const horizonEnd = addDays(today, 14);
    const horizonEndStr = format(horizonEnd, "yyyy-MM-dd");
    return extractBusyBlocksFromTimetable({
      timetableEntries,
      periodTimes,
      daysOff,
      overrides,
      startDate: todayStr,
      endDate: horizonEndStr,
    });
  }, [timetableEntries, periodTimes, daysOff, overrides, todayStr, today]);

  const schedulePreview = useMemo(() => {
    const pendingTasks = tasks.filter((t) => t.status !== "COMPLETED");
    if (pendingTasks.length === 0) return null;
    return buildSchedule({
      tasks: pendingTasks,
      busyBlocks,
      prefs: schedulePrefs,
      referenceDate: todayStr,
    });
  }, [tasks, busyBlocks, schedulePrefs, todayStr]);

  const unallocatedIds = useMemo(() => {
    if (!schedulePreview?.unallocated) return [];
    return schedulePreview.unallocated.map((u: { taskId: string }) => u.taskId);
  }, [schedulePreview]);

  const { scheduled, unscheduled, unallocated, completed } = useMemo(() => {
    return partitionTasks(tasks, studyBlocks, unallocatedIds);
  }, [tasks, studyBlocks, unallocatedIds]);

  const needsSchedule = unscheduled.length > 0 || unallocated.length > 0;

  const handleToggle = (id: string) => {
    HapticFeedback.taskToggle();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleTaskCompletion(id);
  };

  const handleDeleteWithUndo = (task: Task) => {
    HapticFeedback.light();
    setLastDeletedTask(task);
    deleteTask(task.id);
    setUndoVisible(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoVisible(false);
      setLastDeletedTask(null);
    }, 5000);
  };

  const handleUndoDelete = () => {
    HapticFeedback.success();
    if (lastDeletedTask) {
      addTask(lastDeletedTask);
      setLastDeletedTask(null);
      setUndoVisible(false);
    }
  };

  const renderDeadlineBadge = (deadlineStr: string) => {
    try {
      const deadline = startOfDay(parseISO(deadlineStr));
      const diff = differenceInCalendarDays(deadline, today);

      if (diff < 0) {
        return <StatusPill variant="red" label={t("deadline_terlambat", { days: Math.abs(diff) })} />;
      }
      if (diff === 0) {
        return <StatusPill variant="red" label={t("deadline_hari_ini") || "Hari Ini"} />;
      }
      if (diff === 1) {
        return <StatusPill variant="amber" label={t("deadline_besok") || "Besok"} />;
      }
      if (diff <= 3) {
        return <StatusPill variant="blue" label={t("deadline_hari_lagi", { days: diff })} />;
      }
      return <StatusPill variant="gray" label={formatLocaleDate(deadline, "d MMM")} />;
    } catch {
      return <StatusPill variant="gray" label={deadlineStr} />;
    }
  };

  // Filtered tasks based on activeFilter
  const displayTasks = useMemo(() => {
    if (activeFilter === "scheduled") return scheduled;
    if (activeFilter === "unscheduled") return [...unscheduled, ...unallocated];
    if (activeFilter === "completed") return completed;
    // "all": pending first (scheduled + unscheduled + unallocated), then completed
    return [...scheduled, ...unscheduled, ...unallocated, ...completed];
  }, [activeFilter, scheduled, unscheduled, unallocated, completed]);

  const renderTaskCard = (task: Task) => {
    const isCompleted = task.status === "COMPLETED";
    const sub = subjectsMap.get(task.subjectId);
    const subColor = sub?.color || sub?.color_hex || colors.primary;
    const nextBlock = getNextBlockForTask(task.id, studyBlocks, todayStr);
    const blockTimeStr = formatNextBlockTime(nextBlock, todayStr);
    const isUnallocated = unallocatedIds.includes(task.id);

    return (
      <Card
        key={task.id}
        style={[styles.taskCard, isCompleted && styles.completedCard]}
        accentColor={isCompleted ? colors.borderLight : subColor}
      >
        <View style={styles.taskCardBody}>
          <View style={styles.taskTopRow}>
            {/* Completion Checkbox */}
            <Pressable
              style={styles.checkboxTouch}
              onPress={() => handleToggle(task.id)}
              hitSlop={touchTarget.min / 4}
              accessibilityLabel={`Tandai selesai ${task.title}`}
            >
              <View style={[styles.checkbox, isCompleted && styles.checkboxActive]}>
                {isCompleted && <Ionicons name="checkmark" size={15} color={colors.textInverse} />}
              </View>
            </Pressable>

            {/* Subject and Deadline */}
            <View style={styles.subjectRow}>
              <View style={[styles.subjectDot, { backgroundColor: subColor }]} />
              <Text style={styles.subjectNameText} numberOfLines={1}>
                {sub?.name || sub?.title || "Umum"}
              </Text>
            </View>

            <View style={styles.topRightPills}>
              {isCompleted ? (
                <StatusPill variant="green" label={t("tab_selesai") || "Selesai"} />
              ) : (
                renderDeadlineBadge(task.deadlineDate)
              )}
            </View>
          </View>

          {/* Task Title */}
          <Text
            style={[styles.taskTitleText, isCompleted && styles.completedTitleText]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          {/* Notes if any */}
          {task.notes ? (
            <Text style={styles.taskNotesText} numberOfLines={1}>
              {task.notes}
            </Text>
          ) : null}

          {/* Bottom Action Footer */}
          <View style={styles.taskFooterRow}>
            <View style={styles.taskFooterLeft}>
              {blockTimeStr ? (
                <View style={styles.blockBadge}>
                  <Ionicons name="time-outline" size={13} color={colors.primary} />
                  <Text style={styles.blockBadgeText}>{blockTimeStr}</Text>
                </View>
              ) : isUnallocated ? (
                <StatusPill variant="red" label="Jadwal Penuh" />
              ) : (
                <View style={styles.durationBadge}>
                  <Ionicons name="hourglass-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.durationBadgeText}>
                    {task.estimatedMinutes || 30} mnt
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.taskFooterRight}>
              {/* 1-Tap Mulai Fokus Launcher */}
              {!isCompleted && onStartFocusForTask && (
                <Pressable
                  style={styles.focusActionBtn}
                  onPress={() => onStartFocusForTask(task)}
                  hitSlop={touchTarget.min / 4}
                  accessibilityLabel="Mulai fokus tugas ini"
                >
                  <Ionicons name="play" size={13} color={colors.primary} />
                  <Text style={styles.focusActionText}>Mulai Fokus</Text>
                </Pressable>
              )}

              {/* Delete button */}
              <Pressable
                style={styles.deleteBtn}
                onPress={() => handleDeleteWithUndo(task)}
                hitSlop={touchTarget.min / 4}
                accessibilityLabel="Hapus tugas"
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        title={t("tabTasks") || "Tugas"}
        streakText={streakState.currentStreak > 0 ? `${streakState.currentStreak} hari` : undefined}
        onBack={onBack}
        actions={[
          {
            icon: "add",
            onPress: () => setAddTaskVisible(true),
            accessibilityLabel: "Tambah Tugas Baru",
          },
        ]}
      />

      {/* ─── O3 Space Segmented Filter Pills ─── */}
      <View style={styles.filterPillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}
        >
          {/* Semua */}
          <Pressable
            style={[styles.filterPill, activeFilter === "all" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              setActiveFilter("all");
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === "all" && styles.filterPillTextActive]}>
              {t("tab_semua") || "Semua"}
            </Text>
            <View style={[styles.filterPillBadge, activeFilter === "all" && styles.filterPillBadgeActive]}>
              <Text style={[styles.filterPillBadgeText, activeFilter === "all" && styles.filterPillBadgeTextActive]}>
                {tasks.length}
              </Text>
            </View>
          </Pressable>

          {/* Terjadwal */}
          <Pressable
            style={[styles.filterPill, activeFilter === "scheduled" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              setActiveFilter("scheduled");
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === "scheduled" && styles.filterPillTextActive]}>
              {t("tab_terjadwal") || "Terjadwal"}
            </Text>
            <View style={[styles.filterPillBadge, activeFilter === "scheduled" && styles.filterPillBadgeActive]}>
              <Text style={[styles.filterPillBadgeText, activeFilter === "scheduled" && styles.filterPillBadgeTextActive]}>
                {scheduled.length}
              </Text>
            </View>
          </Pressable>

          {/* Belum Dijadwalkan */}
          <Pressable
            style={[styles.filterPill, activeFilter === "unscheduled" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              setActiveFilter("unscheduled");
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === "unscheduled" && styles.filterPillTextActive]}>
              {t("tab_belum_dijadwalkan") || "Belum Dijadwalkan"}
            </Text>
            <View style={[styles.filterPillBadge, activeFilter === "unscheduled" && styles.filterPillBadgeActive]}>
              <Text style={[styles.filterPillBadgeText, activeFilter === "unscheduled" && styles.filterPillBadgeTextActive]}>
                {unscheduled.length + unallocated.length}
              </Text>
            </View>
          </Pressable>

          {/* Selesai */}
          <Pressable
            style={[styles.filterPill, activeFilter === "completed" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              setActiveFilter("completed");
            }}
          >
            <Text style={[styles.filterPillText, activeFilter === "completed" && styles.filterPillTextActive]}>
              {t("tab_selesai") || "Selesai"}
            </Text>
            <View style={[styles.filterPillBadge, activeFilter === "completed" && styles.filterPillBadgeActive]}>
              <Text style={[styles.filterPillBadgeText, activeFilter === "completed" && styles.filterPillBadgeTextActive]}>
                {completed.length}
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Smart AI Scheduler Action Banner ─── */}
        {needsSchedule && activeFilter !== "completed" && (
          <View style={styles.bannerContainer}>
            <Banner
              icon="sparkles"
              text={
                unallocated.length > 0
                  ? "Beberapa tugas tidak muat dalam waktu luang belajarmu."
                  : `Ada ${unscheduled.length} tugas yang belum dialokasikan ke jadwal.`
              }
              buttonText={t("susun_jadwal_sekarang") || "✨ Susun Jadwal"}
              variant="action"
              onPress={() => setCreateScheduleVisible(true)}
              style={styles.banner}
            />
          </View>
        )}

        {/* ─── Zero Tasks Empty State ─── */}
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="checkbox-outline"
              message={t("tidak_ada_tugas_kosong") || "Belum ada tugas"}
              subMessage={t("tidak_ada_tugas_desc") || "Catat PR atau tugas sekolahmu agar belajarmu lebih terencana."}
            />
            <View style={styles.emptyButtonWrapper}>
              <PrimaryButton
                label={t("tambah_tugas_sekarang") || "Tambah Tugas Baru"}
                icon="add"
                onPress={() => setAddTaskVisible(true)}
              />
            </View>
          </View>
        ) : displayTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="checkmark-done-circle-outline"
              message={
                activeFilter === "unscheduled"
                  ? (t("semua_tugas_terjadwal") || "Semua tugas sudah terjadwal rapi!")
                  : activeFilter === "completed"
                  ? "Belum ada tugas yang diselesaikan"
                  : "Tidak ada tugas dalam kategori ini"
              }
              subMessage="Pilih kategori filter lain atau tambah tugas baru."
            />
          </View>
        ) : (
          <View style={styles.taskListContainer}>
            {displayTasks.map((task) => renderTaskCard(task))}
          </View>
        )}
      </ScrollView>

      {/* ─── Bottom Sheets ─── */}
      <CreateScheduleSheet
        visible={createScheduleVisible}
        onClose={() => setCreateScheduleVisible(false)}
      />

      <AddTaskSheet
        visible={addTaskVisible}
        onClose={() => setAddTaskVisible(false)}
      />

      {/* ─── Undo Deletion Snackbar ─── */}
      <Snackbar
        visible={undoVisible}
        message={t("tugas_dihapus") || "Tugas dihapus"}
        actionLabel={t("urungkan") || "Urungkan"}
        onActionPress={handleUndoDelete}
        onDismiss={() => setUndoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Filter pills
  filterPillsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
  },
  filterPillsScroll: {
    paddingHorizontal: tidySpacing.screen,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textInverse,
    fontWeight: typography.fontWeights.bold,
  },
  filterPillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  filterPillBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  filterPillBadgeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  filterPillBadgeTextActive: {
    color: colors.textInverse,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  bannerContainer: {
    marginBottom: spacing.md,
  },
  banner: {
    marginBottom: 0,
  },
  taskListContainer: {
    gap: spacing.sm,
  },
  taskCard: {
    marginBottom: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  completedCard: {
    opacity: 0.65,
    backgroundColor: colors.surfaceSubtle,
  },
  taskCardBody: {
    width: "100%",
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  checkboxTouch: {
    paddingRight: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subjectNameText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  topRightPills: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskTitleText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
    marginLeft: 30, // align with subject row
  },
  completedTitleText: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  taskNotesText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginLeft: 30,
    marginBottom: 6,
  },
  taskFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    marginLeft: 30,
  },
  taskFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  taskFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  blockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 4,
  },
  blockBadgeText: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 4,
  },
  durationBadgeText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  focusActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    gap: 4,
  },
  focusActionText: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  deleteBtn: {
    padding: 6,
  },
  emptyContainer: {
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  emptyButtonWrapper: {
    marginTop: spacing.md,
    width: "100%",
    maxWidth: 240,
  },
});
