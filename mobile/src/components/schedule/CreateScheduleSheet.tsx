import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, addDays, differenceInCalendarDays } from "date-fns";
import { colors, typography, radius, touchTarget, tidySpacing, spacing } from "../../theme";
import { BottomSheet } from "../common/BottomSheet";
import { useMobileStudyStore } from "../../store";
import { t } from "../../lib/i18n";
import { formatLocaleDate } from "../../lib/dateUtils";
import { HapticFeedback } from "../../lib/haptics";
import { calculateNextClassDeadline } from "../../engine/deadlineEngine";
import {
  buildSchedule,
  extractBusyBlocksFromTimetable,
} from "../../engine/schedulerEngine";

export interface CreateScheduleSheetProps {
  visible: boolean;
  onClose: () => void;
  onScheduleApplied?: (result: { newBlocksCount: number; oldBlocksCount: number }) => void;
}

export function CreateScheduleSheet({
  visible,
  onClose,
  onScheduleApplied,
}: CreateScheduleSheetProps) {
  const {
    tasks,
    subjects,
    timetableEntries,
    periodTimes,
    daysOff,
    overrides,
    schedulePrefs,
    studyBlocks,
    applySchedule,
    updateTask,
  } = useMobileStudyStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const horizonEndStr = format(addDays(new Date(), 14), "yyyy-MM-dd");

  // Filter active pending tasks
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "PENDING");
  }, [tasks]);

  // Compute busy blocks from timetable
  const busyBlocks = useMemo(() => {
    if (!visible) return [];
    return extractBusyBlocksFromTimetable({
      timetableEntries,
      periodTimes,
      daysOff,
      overrides,
      startDate: todayStr,
      endDate: horizonEndStr,
    });
  }, [visible, timetableEntries, periodTimes, daysOff, overrides, todayStr, horizonEndStr]);

  // Run deterministic scheduling engine
  const scheduleResult = useMemo(() => {
    if (!visible || pendingTasks.length === 0) {
      return null;
    }
    return buildSchedule({
      tasks: pendingTasks,
      busyBlocks,
      prefs: schedulePrefs,
      referenceDate: todayStr,
      allowOverdue: true,
    });
  }, [visible, pendingTasks, busyBlocks, schedulePrefs, todayStr]);

  // Group generated blocks by date for clear day-by-day preview
  const groupedBlocks = useMemo(() => {
    if (!scheduleResult?.blocks || scheduleResult.blocks.length === 0) return [];
    const map = new Map<string, typeof scheduleResult.blocks>();
    for (const blk of scheduleResult.blocks) {
      const list = map.get(blk.date) || [];
      list.push(blk);
      map.set(blk.date, list);
    }
    return Array.from(map.entries()).map(([date, blocks]) => {
      let dayLabel = date;
      try {
        const diff = differenceInCalendarDays(parseISO(date), parseISO(todayStr));
        const full = formatLocaleDate(parseISO(date), "EEEE, d MMM");
        if (diff === 0) dayLabel = `Hari Ini • ${full}`;
        else if (diff === 1) dayLabel = `Besok • ${full}`;
        else dayLabel = full;
      } catch {
        dayLabel = date;
      }
      return { date, dayLabel, blocks };
    });
  }, [scheduleResult, todayStr]);

  const handleExtendUnallocatedDeadline = (taskId: string, mode: "plus1" | "nextClass") => {
    const targetTask = tasks.find((tk) => tk.id === taskId);
    if (!targetTask) return;
    HapticFeedback.light();
    const baseStr =
      targetTask.deadlineDate && targetTask.deadlineDate >= todayStr
        ? targetTask.deadlineDate
        : todayStr;

    if (mode === "plus1") {
      try {
        const nextDate = format(addDays(parseISO(baseStr), 1), "yyyy-MM-dd");
        updateTask(taskId, { deadlineDate: nextDate, deadlineMode: "custom" });
      } catch {
        const nextDate = format(addDays(parseISO(todayStr), 1), "yyyy-MM-dd");
        updateTask(taskId, { deadlineDate: nextDate, deadlineMode: "custom" });
      }
    } else {
      const res = calculateNextClassDeadline(targetTask.subjectId, baseStr, timetableEntries, {
        daysOff,
        overrides,
        afterNClasses: 1,
      });
      const nextDate =
        res.found && res.deadlineDate
          ? res.deadlineDate
          : format(addDays(parseISO(baseStr), 2), "yyyy-MM-dd");
      updateTask(taskId, { deadlineDate: nextDate, deadlineMode: "nextClass" });
    }
  };

  // Handle Apply
  const handleApply = () => {
    if (!scheduleResult) return;
    const oldBlocksCount = studyBlocks.length;
    const newBlocksCount = scheduleResult.blocks.length;

    applySchedule(scheduleResult.blocks);
    onScheduleApplied?.({ newBlocksCount, oldBlocksCount });
    onClose();
  };

  const hours = scheduleResult ? Math.floor(scheduleResult.stats.totalStudyMinutes / 60) : 0;
  const minutes = scheduleResult ? scheduleResult.stats.totalStudyMinutes % 60 : 0;
  const timeFormatted = hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m`;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("buat_jadwal_title")}
      subtitle={t("buat_jadwal_sub")}
      primaryButtonLabel={scheduleResult && scheduleResult.blocks.length > 0 ? t("terapkan_jadwal") : undefined}
      onPrimaryButtonPress={handleApply}
    >
      <View style={styles.container}>
        {pendingTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.emerald} />
            <Text style={styles.emptyTitle}>{t("tidak_ada_tugas_pending")}</Text>
            <Text style={styles.emptySub}>
              Semua tugas telah selesai atau belum ada tugas yang ditambahkan.
            </Text>
          </View>
        ) : scheduleResult ? (
          <>
            {/* ─── 1. Stat Cards Row ─── */}
            <Text style={styles.sectionLabel}>{t("ringkasan_jadwal")}</Text>
            <View style={styles.statsRow}>
              {/* Stat 1: Total Blocks */}
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={18} color={colors.primary} style={styles.statIcon} />
                <Text style={styles.statValue}>{scheduleResult.blocks.length}</Text>
                <Text style={styles.statLabel}>{t("total_blok")}</Text>
              </View>

              {/* Stat 2: Total Study Time */}
              <View style={styles.statCard}>
                <Ionicons name="time" size={18} color={colors.amber} style={styles.statIcon} />
                <Text style={styles.statValue}>{timeFormatted}</Text>
                <Text style={styles.statLabel}>{t("total_durasi")}</Text>
              </View>

              {/* Stat 3: Tasks Covered */}
              <View style={styles.statCard}>
                <Ionicons name="checkbox" size={18} color={colors.emerald} style={styles.statIcon} />
                <Text style={styles.statValue}>
                  {scheduleResult.stats.fullyScheduledCount}/{scheduleResult.stats.totalTasks}
                </Text>
                <Text style={styles.statLabel}>{t("tugas_terjadwal")}</Text>
              </View>
            </View>

            {/* ─── 2. Diff Notice (Replacing Existing Schedule) ─── */}
            <View style={styles.diffCard}>
              <Ionicons name="swap-horizontal" size={16} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={styles.diffText}>
                {t("diff_ganti_blok", {
                  old: studyBlocks.length,
                  new: scheduleResult.blocks.length,
                })}
              </Text>
            </View>

            {/* ─── 3. Unallocated Tasks Warning + 1-Tap Deadline Fixer (if any) ─── */}
            {scheduleResult.unallocated.length > 0 && (
              <View style={styles.warningContainer}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning-outline" size={18} color={colors.warning} style={{ marginRight: 6 }} />
                  <Text style={styles.warningTitle}>{t("peringatan_tidak_muat")}</Text>
                </View>
                <Text style={styles.warningSubtitle}>
                  {scheduleResult.unallocated.length} tugas tidak muat sebelum batas tenggat. Ketuk tombol di bawah untuk menyesuaikan tenggat agar langsung masuk jadwal:
                </Text>

                {scheduleResult.unallocated.map((u) => {
                  const formattedDue = (() => {
                    try {
                      return formatLocaleDate(parseISO(u.deadlineDate), "EEE, d MMM");
                    } catch {
                      return u.deadlineDate;
                    }
                  })();
                  return (
                    <View key={u.taskId} style={styles.unallocatedRow}>
                      <View style={styles.unallocatedTopRow}>
                        <View style={styles.unallocatedDot} />
                        <View style={styles.unallocatedInfo}>
                          <Text style={styles.unallocatedTaskTitle} numberOfLines={1}>
                            {u.taskTitle}
                          </Text>
                          <Text style={styles.unallocatedReason}>
                            Tenggat: {formattedDue} •{" "}
                            {u.reason === "DEADLINE_TOO_SOON"
                              ? "Tenggat terlalu dekat"
                              : u.reason === "ALREADY_PAST_DEADLINE"
                              ? "Tenggat sudah lewat"
                              : "Slot waktu belajar penuh"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.unallocatedActionsRow}>
                        <Pressable
                          style={styles.unallocatedFixBtn}
                          onPress={() => handleExtendUnallocatedDeadline(u.taskId, "plus1")}
                        >
                          <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                          <Text style={styles.unallocatedFixBtnText}>Undur +1 Hari</Text>
                        </Pressable>
                        <Pressable
                          style={styles.unallocatedFixBtn}
                          onPress={() => handleExtendUnallocatedDeadline(u.taskId, "nextClass")}
                        >
                          <Ionicons name="school-outline" size={12} color={colors.primary} />
                          <Text style={styles.unallocatedFixBtnText}>Ke Kelas Depan</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ─── 4. Day-by-Day Proposed Study Blocks Preview ─── */}
            {groupedBlocks.length > 0 && (
              <View style={styles.previewSection}>
                <Text style={styles.sectionLabel}>Rencana Blok Belajar ({scheduleResult.blocks.length} sesi)</Text>
                {groupedBlocks.map((group) => (
                  <View key={group.date} style={styles.dayGroupCard}>
                    <View style={styles.dayGroupHeader}>
                      <Ionicons name="calendar-clear-outline" size={14} color={colors.primary} />
                      <Text style={styles.dayGroupTitle}>{group.dayLabel}</Text>
                    </View>
                    {group.blocks.map((blk) => {
                      const taskObj = tasks.find((tk) => tk.id === blk.taskId);
                      const subObj = subjects.find((s) => s.id === blk.subjectId);
                      const subColor = subObj?.color || colors.primary;
                      const dueShort = (() => {
                        if (!taskObj?.deadlineDate) return "";
                        try {
                          return formatLocaleDate(parseISO(taskObj.deadlineDate), "d MMM");
                        } catch {
                          return taskObj.deadlineDate;
                        }
                      })();
                      return (
                        <View key={blk.id} style={styles.blockPreviewRow}>
                          <View style={[styles.blockTimePill, { borderColor: subColor }]}>
                            <Text style={styles.blockTimeText}>
                              {blk.startTime}–{blk.endTime}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.blockTaskTitle} numberOfLines={1}>
                              {taskObj?.title || "Sesi Belajar"}
                            </Text>
                            <Text style={styles.blockTaskMeta} numberOfLines={1}>
                              {subObj?.name || "Umum"} • {blk.durationMinutes} mnt
                              {dueShort ? ` • Tenggat ${dueShort}` : ""}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: tidySpacing.large,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: tidySpacing.medium,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  statIcon: {
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textMuted,
    textAlign: "center",
  },
  diffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: tidySpacing.medium,
  },
  diffText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
    flex: 1,
  },
  warningContainer: {
    backgroundColor: colors.amberLight,
    borderWidth: 1,
    borderColor: colors.amber,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: tidySpacing.medium,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  warningTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.warning,
  },
  warningSubtitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.normal,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  unallocatedRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 150, 0, 0.2)",
  },
  unallocatedTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  unallocatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
    marginRight: spacing.sm,
  },
  unallocatedInfo: {
    flex: 1,
  },
  unallocatedTaskTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  unallocatedReason: {
    fontSize: 10,
    fontWeight: typography.fontWeights.normal,
    color: colors.textMuted,
  },
  unallocatedActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginLeft: 14,
  },
  unallocatedFixBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 4,
  },
  unallocatedFixBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  previewSection: {
    marginTop: spacing.xs,
  },
  dayGroupCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dayGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  dayGroupTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  blockPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  blockTimePill: {
    backgroundColor: colors.surfaceSubtle,
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  blockTimeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  blockTaskTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  blockTaskMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: tidySpacing.large,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.normal,
    color: colors.textMuted,
    textAlign: "center",
  },
});
