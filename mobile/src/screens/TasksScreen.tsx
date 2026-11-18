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
import { Task, StudyBlock, Subject, DeadlineMode } from "../types";
import { t } from "../lib/i18n";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";
import { formatLocaleDate } from "../lib/dateUtils";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { Card } from "../components/common/Card";
import { StatusPill } from "../components/common/StatusPill";
import { Banner } from "../components/common/Banner";
import { EmptyState } from "../components/common/EmptyState";
import { PrimaryButton } from "../components/common/PrimaryButton";
import { Snackbar } from "../components/common/Snackbar";
import { BottomSheet } from "../components/common/BottomSheet";
import { CreateScheduleSheet } from "../components/schedule/CreateScheduleSheet";
import { AddTaskSheet } from "../components/tasks/AddTaskSheet";
import { DeadlinePickerStrip } from "../components/tasks/DeadlinePickerStrip";
import { buildSchedule, extractBusyBlocksFromTimetable } from "../engine/schedulerEngine";
import { calculateNextClassDeadline } from "../engine/deadlineEngine";

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
  onOpenStreak?: () => void;
  onStartFocusForTask?: (task: Task) => void;
}

export function TasksScreen({ onBack, onOpenSettings, onOpenStreak, onStartFocusForTask }: TasksScreenProps) {
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
    updateTask,
    deleteTask,
    deleteCompletedTasks,
    restoreTasks,
    applySchedule,
    streakState,
  } = useMobileStudyStore();

  const [activeFilter, setActiveFilter] = useState<TaskFilterTab>("all");
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [createScheduleVisible, setCreateScheduleVisible] = useState(false);
  const [addTaskVisible, setAddTaskVisible] = useState(false);

  // Long-press menu target
  const [menuTask, setMenuTask] = useState<Task | null>(null);

  // Undo deletion state
  const [lastDeleted, setLastDeleted] = useState<Task[]>([]);
  const [undoVisible, setUndoVisible] = useState(false);
  const undoTimerRef = useRef<any>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const today = useMemo(() => startOfDay(parseISO(todayStr)), [todayStr]);

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

  const showUndo = (removed: Task[]) => {
    if (removed.length === 0) return;
    setLastDeleted(removed);
    setUndoVisible(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoVisible(false);
      setLastDeleted([]);
    }, 5000);
  };

  const handleOpenMenu = (task: Task) => {
    HapticFeedback.heavy();
    setMenuTask(task);
  };

  const handleMenuDeadline = (
    mode: "today" | "tomorrow" | "lusa" | "nextClass" | "minus1" | "plus1"
  ) => {
    if (!menuTask) return;
    HapticFeedback.light();
    let nextDate = menuTask.deadlineDate || todayStr;
    let nextMode = menuTask.deadlineMode || "custom";

    if (mode === "today") {
      nextDate = todayStr;
      nextMode = "custom";
    } else if (mode === "tomorrow") {
      nextDate = format(addDays(today, 1), "yyyy-MM-dd");
      nextMode = "custom";
    } else if (mode === "lusa") {
      nextDate = format(addDays(today, 2), "yyyy-MM-dd");
      nextMode = "custom";
    } else if (mode === "nextClass") {
      const res = calculateNextClassDeadline(menuTask.subjectId, todayStr, timetableEntries, {
        daysOff,
        overrides,
        afterNClasses: 1,
      });
      nextDate =
        res.found && res.deadlineDate
          ? res.deadlineDate
          : format(addDays(today, 1), "yyyy-MM-dd");
      nextMode = "nextClass";
    } else if (mode === "minus1" || mode === "plus1") {
      try {
        const base = parseISO(menuTask.deadlineDate || todayStr);
        nextDate = format(addDays(base, mode === "plus1" ? 1 : -1), "yyyy-MM-dd");
      } catch {
        nextDate = todayStr;
      }
      nextMode = "custom";
    }

    updateTask(menuTask.id, { deadlineDate: nextDate, deadlineMode: nextMode });
    setMenuTask({ ...menuTask, deadlineDate: nextDate, deadlineMode: nextMode });
  };

  const handleMenuToggle = () => {
    if (menuTask) handleToggle(menuTask.id);
    setMenuTask(null);
  };

  const handleMenuFocus = () => {
    if (menuTask && onStartFocusForTask) onStartFocusForTask(menuTask);
    setMenuTask(null);
  };

  const handleMenuDelete = () => {
    if (!menuTask) return;
    HapticFeedback.light();
    deleteTask(menuTask.id);
    showUndo([menuTask]);
    setMenuTask(null);
  };

  const handleMenuDeleteCompleted = () => {
    HapticFeedback.light();
    showUndo(deleteCompletedTasks());
    setMenuTask(null);
  };

  const handleUndoDelete = () => {
    HapticFeedback.success();
    restoreTasks(lastDeleted);
    setLastDeleted([]);
    setUndoVisible(false);
  };

  const renderDeadlineBadge = (
    deadlineStr: string,
    isUnallocated: boolean = false,
    deadlineMode?: DeadlineMode
  ) => {
    try {
      const deadline = startOfDay(parseISO(deadlineStr));
      const diff = differenceInCalendarDays(deadline, today);
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
      if (isUnallocated) {
        return <StatusPill variant="red" label={`⚠️ ${t("tidak_muat") || "Tidak Muat"} • ${shortDate}`} />;
      }
      if (diff === 0) {
        return <StatusPill variant="amber" label={`🔥 ${t("deadline_hari_ini") || "Hari Ini"}`} />;
      }
      if (diff === 1) {
        return (
          <StatusPill
            variant="blue"
            label={`${classPrefix}${t("deadline_besok") || "Besok"} • ${shortDate}`}
          />
        );
      }
      if (diff <= 3) {
        return (
          <StatusPill
            variant="blue"
            label={`${classPrefix}${t("deadline_hari_lagi", { days: diff })} • ${shortDate}`}
          />
        );
      }
      return <StatusPill variant="gray" label={`${classPrefix}${shortDate} (${diff}h)`} />;
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
    const taskTypeLabel = t(task.type as any) || "PR";

    return (
      <Card
        key={task.id}
        style={[styles.taskCard, isCompleted && styles.completedCard]}
        accentColor={isCompleted ? colors.borderLight : subColor}
      >
        <Pressable
          style={styles.taskCardBody}
          onPress={() => handleOpenMenu(task)}
          onLongPress={() => handleOpenMenu(task)}
          delayLongPress={400}
          accessibilityHint={t("task_menu_hint")}
        >
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

            {/* Subject and Task Type */}
            <View style={styles.subjectRow}>
              <Text style={styles.subjectNameText} numberOfLines={1}>
                {sub?.name || sub?.title || "Umum"} • {taskTypeLabel}
              </Text>
            </View>

            <View style={styles.topRightPills}>
              {isCompleted ? (
                <StatusPill variant="green" label={t("tab_selesai") || "Selesai"} />
              ) : (
                renderDeadlineBadge(task.deadlineDate, isUnallocated, task.deadlineMode)
              )}
              <Pressable
                style={styles.taskMenuBtn}
                onPress={() => handleOpenMenu(task)}
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
                  <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                  <Text style={styles.blockBadgeText}>{blockTimeStr}</Text>
                </View>
              ) : (
                <View style={styles.durationBadge}>
                  <Ionicons name="hourglass-outline" size={12} color={colors.textSecondary} />
                  <Text style={styles.durationBadgeText}>
                    {task.estimatedMinutes || 30} {t("menit_singkat") || "mnt"}
                  </Text>
                </View>
              )}

              {!blockTimeStr && !isCompleted && (
                <Pressable
                  style={styles.quickScheduleChip}
                  onPress={() => {
                    HapticFeedback.light();
                    setCreateScheduleVisible(true);
                  }}
                  hitSlop={6}
                >
                  <Ionicons name="sparkles-outline" size={11} color={colors.primary} />
                  <Text style={styles.quickScheduleChipText}>Jadwalkan</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.taskFooterRight}>
              {/* 1-Tap Mulai Fokus Launcher */}
              {!isCompleted && onStartFocusForTask && (
                <Pressable
                  style={styles.focusActionBtn}
                  onPress={() => onStartFocusForTask(task)}
                  hitSlop={touchTarget.min / 4}
                  accessibilityLabel={t("fokus_tugas")}
                >
                  <Ionicons name="play-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.focusActionText}>{t("fokus_tugas") || "Fokus"}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        title={t("tabTasks") || "Tugas"}
        streakText={t("streak_days_badge", { count: streakState?.currentStreak || 0 })}
        isStreakAtRisk={streakState?.isAtRisk}
        onStreakPress={onOpenStreak}
        onBack={onBack}
        actions={[
          {
            icon: "sparkles-outline",
            onPress: () => {
              HapticFeedback.light();
              setCreateScheduleVisible(true);
            },
            badge:
              unscheduled.length + unallocated.length > 0
                ? unscheduled.length + unallocated.length
                : undefined,
            accessibilityLabel: t("buat_jadwal_title") || "Susun Jadwal Belajar",
          },
          ...(onOpenSettings
            ? [
                {
                  icon: "settings-outline" as const,
                  onPress: () => {
                    HapticFeedback.light();
                    onOpenSettings();
                  },
                  accessibilityLabel: t("settings") || "Pengaturan",
                },
              ]
            : []),
        ]}
      />

      {/* ─── O3 Space Segmented Filter Pills ─── */}
      <View style={styles.filterPillsContainer}>
        <View style={styles.filterPillsScroll}>
          {/* Semua */}
          <Pressable
            style={[styles.filterPill, activeFilter === "all" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              soundFX.playClick();
              setActiveFilter("all");
            }}
          >
            <Text numberOfLines={1} style={[styles.filterPillText, activeFilter === "all" && styles.filterPillTextActive]}>
              {t("tab_semua") || "Semua"}
            </Text>
            <Text style={[styles.filterPillBadgeText, activeFilter === "all" && styles.filterPillBadgeTextActive]}>
              {tasks.length}
            </Text>
          </Pressable>

          {/* Terjadwal */}
          <Pressable
            style={[styles.filterPill, activeFilter === "scheduled" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              soundFX.playClick();
              setActiveFilter("scheduled");
            }}
          >
            <Text numberOfLines={1} style={[styles.filterPillText, activeFilter === "scheduled" && styles.filterPillTextActive]}>
              {t("tab_terjadwal") || "Terjadwal"}
            </Text>
            <Text style={[styles.filterPillBadgeText, activeFilter === "scheduled" && styles.filterPillBadgeTextActive]}>
              {scheduled.length}
            </Text>
          </Pressable>

          {/* Belum Dijadwalkan */}
          <Pressable
            style={[styles.filterPill, activeFilter === "unscheduled" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              soundFX.playClick();
              setActiveFilter("unscheduled");
            }}
          >
            <Text numberOfLines={1} style={[styles.filterPillText, activeFilter === "unscheduled" && styles.filterPillTextActive]}>
              {t("tab_belum_dijadwalkan") || "Belum"}
            </Text>
            <Text style={[styles.filterPillBadgeText, activeFilter === "unscheduled" && styles.filterPillBadgeTextActive]}>
              {unscheduled.length + unallocated.length}
            </Text>
          </Pressable>

          {/* Selesai */}
          <Pressable
            style={[styles.filterPill, activeFilter === "completed" && styles.filterPillActive]}
            onPress={() => {
              HapticFeedback.light();
              soundFX.playClick();
              setActiveFilter("completed");
            }}
          >
            <Text numberOfLines={1} style={[styles.filterPillText, activeFilter === "completed" && styles.filterPillTextActive]}>
              {t("tab_selesai") || "Selesai"}
            </Text>
            <Text style={[styles.filterPillBadgeText, activeFilter === "completed" && styles.filterPillBadgeTextActive]}>
              {completed.length}
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Penjadwalan Tugas Banner (Restored & Upgraded) ─── */}
        {tasks.length > 0 && needsSchedule && (
          <View style={styles.scheduleBanner}>
            <View style={styles.scheduleBannerLeft}>
              <View style={styles.scheduleBannerIconWrap}>
                <Ionicons
                  name={unallocated.length > 0 ? "warning-outline" : "sparkles"}
                  size={18}
                  color={unallocated.length > 0 ? colors.warning : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.scheduleBannerTitle}>
                  {unallocated.length > 0
                    ? `${unallocated.length} tugas bentrok dengan tenggat`
                    : `${unscheduled.length} tugas belum punya blok belajar`}
                </Text>
                <Text style={styles.scheduleBannerSub}>
                  {unallocated.length > 0
                    ? "Periksa dan sesuaikan tenggat atau susun ulang jadwal otomatis."
                    : "Susun jadwal otomatis agar semua PR selesai sebelum tenggat."}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.scheduleBannerBtn}
              onPress={() => {
                HapticFeedback.medium();
                setCreateScheduleVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Susun Jadwal Otomatis"
            >
              <Ionicons name="sparkles" size={14} color={colors.textInverse} />
              <Text style={styles.scheduleBannerBtnText}>Susun Jadwal</Text>
            </Pressable>
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
        ) : activeFilter === "all" ? (
          <View style={styles.taskListContainer}>
            {[...scheduled, ...unscheduled, ...unallocated].map((task) => renderTaskCard(task))}
            {completed.length > 0 && (
              <View>
                <Pressable
                  style={styles.completedSectionHeader}
                  onPress={() => {
                    HapticFeedback.light();
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setCompletedExpanded((prev) => !prev);
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={completedExpanded ? "chevron-down" : "chevron-forward"}
                    size={15}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.completedSectionTitle}>
                    {t("tasks_done_section", { count: completed.length })}
                  </Text>
                </Pressable>
                {completedExpanded &&
                  completed.map((task) => renderTaskCard(task))}
              </View>
            )}
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

      {/* ─── Long-Press / Tap Task Detail & Deadline Editor Sheet ─── */}
      <BottomSheet
        visible={menuTask !== null}
        onClose={() => setMenuTask(null)}
        title={menuTask?.title || ""}
        subtitle={menuTask ? subjectsMap.get(menuTask.subjectId)?.name || "Umum" : undefined}
      >
        {menuTask && (
          <View style={styles.menuList}>
            {/* Rich 14-Day Calendar & Smart Presets Deadline Picker */}
            <View style={{ paddingHorizontal: spacing.xs, paddingBottom: spacing.sm }}>
              <Text style={styles.menuSectionLabel}>Tenggat Waktu (Deadline)</Text>
              <DeadlinePickerStrip
                selectedDate={menuTask.deadlineDate || todayStr}
                deadlineMode={menuTask.deadlineMode || "custom"}
                subjectId={menuTask.subjectId}
                subjectName={subjectsMap.get(menuTask.subjectId)?.name}
                subjectColor={subjectsMap.get(menuTask.subjectId)?.color}
                timetableEntries={timetableEntries}
                daysOff={daysOff}
                overrides={overrides}
                todayStr={todayStr}
                compact
                onSelectDeadline={(dateStr, mode) => {
                  updateTask(menuTask.id, { deadlineDate: dateStr, deadlineMode: mode });
                  setMenuTask({ ...menuTask, deadlineDate: dateStr, deadlineMode: mode });
                }}
              />
            </View>

            {/* Duration Presets Editor */}
            <View style={{ paddingHorizontal: spacing.xs, paddingBottom: spacing.sm }}>
              <Text style={styles.menuSectionLabel}>Estimasi Durasi Belajar</Text>
              <View style={styles.durationChipRow}>
                {[15, 30, 45, 60, 90].map((mins) => {
                  const isSelected = (menuTask.estimatedMinutes || 30) === mins;
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => {
                        HapticFeedback.light();
                        updateTask(menuTask.id, { estimatedMinutes: mins });
                        setMenuTask({ ...menuTask, estimatedMinutes: mins });
                      }}
                      style={[
                        styles.durationEditChip,
                        isSelected && styles.durationEditChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationEditChipText,
                          isSelected && styles.durationEditChipTextActive,
                        ]}
                      >
                        {mins} mnt
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 1-Tap Auto-Schedule Study Block for This Task */}
            {menuTask.status !== "COMPLETED" && (
              <Pressable
                style={styles.menuRowHighlight}
                onPress={() => {
                  HapticFeedback.medium();
                  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
                  const result = buildSchedule({
                    tasks: pendingTasks,
                    busyBlocks,
                    prefs: schedulePrefs,
                    referenceDate: todayStr,
                  });
                  if (result.blocks.length > 0) {
                    applySchedule(result.blocks);
                  }
                  setMenuTask(null);
                }}
                accessibilityRole="button"
              >
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={[styles.menuRowText, { color: colors.primary }]}>
                  Jadwalkan Blok Belajar Otomatis
                </Text>
              </Pressable>
            )}

            <Pressable style={styles.menuRow} onPress={handleMenuToggle} accessibilityRole="button">
              <Ionicons
                name={menuTask.status === "COMPLETED" ? "arrow-undo-outline" : "checkmark-circle-outline"}
                size={20}
                color={colors.text}
              />
              <Text style={styles.menuRowText}>
                {menuTask.status === "COMPLETED" ? t("task_menu_mark_undone") : t("task_menu_mark_done")}
              </Text>
            </Pressable>
            {menuTask.status !== "COMPLETED" && onStartFocusForTask && (
              <Pressable style={styles.menuRow} onPress={handleMenuFocus} accessibilityRole="button">
                <Ionicons name="play-outline" size={20} color={colors.text} />
                <Text style={styles.menuRowText}>{t("fokus_tugas")}</Text>
              </Pressable>
            )}
            <Pressable style={styles.menuRow} onPress={handleMenuDelete} accessibilityRole="button">
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.menuRowText, styles.menuRowDanger]}>{t("task_menu_delete")}</Text>
            </Pressable>
            {completed.length > 0 && (
              <Pressable style={styles.menuRow} onPress={handleMenuDeleteCompleted} accessibilityRole="button">
                <Ionicons name="checkmark-done-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuRowText, styles.menuRowDanger]}>
                  {t("task_menu_delete_completed", { count: completed.length })}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </BottomSheet>

      {/* ─── Undo Deletion Snackbar ─── */}
      <Snackbar
        visible={undoVisible}
        message={
          lastDeleted.length > 1
            ? t("tasks_deleted_count", { count: lastDeleted.length })
            : t("tugas_dihapus") || "Tugas dihapus"
        }
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
    flexDirection: "row",
    paddingHorizontal: tidySpacing.screen,
    gap: 6,
  },
  filterPill: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 1,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textInverse,
    fontWeight: typography.fontWeights.bold,
  },
  filterPillBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  filterPillBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  filterPillBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
  },
  filterPillBadgeTextActive: {
    color: colors.textInverse,
  },
  completedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  completedSectionTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
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
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
  },
  subjectNameText: {
    flexShrink: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  topRightPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  taskMenuBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 2,
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
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    gap: 4,
  },
  focusActionText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semibold,
  },
  lateText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.danger,
  },
  menuList: {
    gap: spacing.xs,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  menuRowText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  menuRowDanger: {
    color: colors.danger,
  },
  menuRowHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 4,
  },
  menuSectionLabel: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  durationChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  durationEditChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  durationEditChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  durationEditChipText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  durationEditChipTextActive: {
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  scheduleBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  scheduleBannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scheduleBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleBannerTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  scheduleBannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduleBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    gap: 4,
  },
  scheduleBannerBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textInverse,
  },
  quickScheduleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    gap: 3,
  },
  quickScheduleChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
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
