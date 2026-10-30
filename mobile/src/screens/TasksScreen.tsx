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
import { SectionHeader } from "../components/common/SectionHeader";
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

  const [createScheduleVisible, setCreateScheduleVisible] = useState(false);
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

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
        return <StatusPill variant="red" label={t("deadline_hari_ini")} />;
      }
      if (diff === 1) {
        return <StatusPill variant="amber" label={t("deadline_besok")} />;
      }
      if (diff <= 3) {
        return <StatusPill variant="blue" label={t("deadline_hari_lagi", { days: diff })} />;
      }
      return <StatusPill variant="gray" label={formatLocaleDate(deadline, "d MMM")} />;
    } catch {
      return <StatusPill variant="gray" label={deadlineStr} />;
    }
  };

  const renderTaskRow = (task: Task, extraBadge?: React.ReactNode, isCompleted = false) => {
    const sub = subjectsMap.get(task.subjectId);
    const subColor = sub?.color || sub?.color_hex || colors.primary;

    return (
      <Card
        key={task.id}
        style={[styles.taskCard, isCompleted && styles.completedCard]}
        accentColor={isCompleted ? colors.borderLight : subColor}
      >
        <View style={styles.taskCardContent}>
          <Pressable
            style={styles.checkboxTouch}
            onPress={() => handleToggle(task.id)}
            hitSlop={touchTarget.min / 4}
            accessibilityLabel={`Tandai selesai ${task.title}`}
          >
            <View style={[styles.checkbox, isCompleted && styles.checkboxActive]}>
              {isCompleted && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
            </View>
          </Pressable>

          <View style={styles.taskInfoColumn}>
            <View style={styles.taskHeaderRow}>
              <View style={[styles.subjectDot, { backgroundColor: subColor }]} />
              <Text style={styles.subjectNameText} numberOfLines={1}>
                {sub?.name || "Umum"}
              </Text>
            </View>

            <Text
              style={[styles.taskTitleText, isCompleted && styles.completedTitleText]}
              numberOfLines={2}
            >
              {task.title}
            </Text>

            <View style={styles.taskMetaRow}>
              {renderDeadlineBadge(task.deadlineDate)}
              {extraBadge}
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
        title={t("tugas_title")}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Unscheduled or Unallocated Banner ─── */}
        {needsSchedule && (
          <Banner
            icon="calendar-outline"
            text={
              unallocated.length > 0
                ? t("peringatan_tidak_muat")
                : t("banner_tugas_belum_dijadwalkan", { count: unscheduled.length })
            }
            buttonText={t("buat_jadwal_sekarang")}
            variant={unallocated.length > 0 ? "warning" : "action"}
            onPress={() => setCreateScheduleVisible(true)}
            style={styles.banner}
          />
        )}

        {/* ─── Zero Tasks Empty State ─── */}
        {tasks.length === 0 && (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="checkbox-outline"
              message={t("tidak_ada_tugas_kosong")}
              subMessage={t("tidak_ada_tugas_desc")}
            />
            <View style={styles.emptyButtonWrapper}>
              <PrimaryButton
                label={t("tambah_tugas_sekarang")}
                onPress={() => setAddTaskVisible(true)}
              />
            </View>
          </View>
        )}

        {/* ─── 1. Group: Terjadwal ─── */}
        {scheduled.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t("group_terjadwal")}
              badge={scheduled.length}
            />
            {scheduled.map((task) => {
              const nextBlock = getNextBlockForTask(task.id, studyBlocks, todayStr);
              const blockTimeStr = formatNextBlockTime(nextBlock, todayStr);

              return renderTaskRow(
                task,
                blockTimeStr ? (
                  <View style={styles.blockBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={styles.blockBadgeText}>{blockTimeStr}</Text>
                  </View>
                ) : null
              );
            })}
          </View>
        )}

        {/* ─── 2. Group: Belum Dijadwalkan ─── */}
        {unscheduled.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t("group_belum_dijadwalkan")}
              badge={unscheduled.length}
            />
            {unscheduled.map((task) =>
              renderTaskRow(
                task,
                <View style={styles.durationBadge}>
                  <Text style={styles.durationBadgeText}>
                    {task.estimatedMinutes || 45} {t("menit_singkat")}
                  </Text>
                </View>
              )
            )}
          </View>
        )}

        {/* ─── 3. Group: Tidak Muat ─── */}
        {unallocated.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t("group_tidak_muat")}
              badge={unallocated.length}
            />
            {unallocated.map((task) =>
              renderTaskRow(
                task,
                <StatusPill variant="red" label="Waktu kurang" />
              )
            )}
          </View>
        )}

        {/* ─── 4. Group: Selesai ─── */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={t("group_selesai")}
              badge={completed.length}
              actionText={
                completed.length > 2
                  ? showCompleted
                    ? "Sembunyikan"
                    : "Lihat Semua"
                  : undefined
              }
              onActionPress={() => setShowCompleted(!showCompleted)}
            />
            {(showCompleted || completed.length <= 2 ? completed : completed.slice(0, 2)).map(
              (task) => renderTaskRow(task, null, true)
            )}
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
        message={t("tugas_dihapus")}
        actionLabel={t("urungkan")}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
  },
  banner: {
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  emptyContainer: {
    paddingTop: spacing.lg,
    alignItems: "center",
  },
  emptyButtonWrapper: {
    marginTop: spacing.md,
    width: "100%",
    maxWidth: 280,
  },
  taskCard: {
    marginBottom: spacing.sm,
  },
  completedCard: {
    opacity: 0.65,
  },
  taskCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxTouch: {
    paddingRight: spacing.sm,
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taskInfoColumn: {
    flex: 1,
  },
  taskHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
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
  taskTitleText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: 6,
  },
  completedTitleText: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  blockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    gap: 4,
  },
  blockBadgeText: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  durationBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  durationBadgeText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
});
