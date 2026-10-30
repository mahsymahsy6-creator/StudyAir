import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO, addDays } from "date-fns";
import { colors, typography, radius, touchTarget, tidySpacing, spacing } from "../../theme";
import { BottomSheet } from "../common/BottomSheet";
import { Card } from "../common/Card";
import { useMobileStudyStore } from "../../store";
import { t } from "../../lib/i18n";
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
    timetableEntries,
    periodTimes,
    daysOff,
    overrides,
    schedulePrefs,
    studyBlocks,
    applySchedule,
  } = useMobileStudyStore();

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const horizonEndStr = useMemo(() => format(addDays(new Date(), 14), "yyyy-MM-dd"), []);

  // Filter active pending tasks
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "PENDING");
  }, [tasks]);

  // Compute busy blocks from timetable
  const busyBlocks = useMemo(() => {
    return extractBusyBlocksFromTimetable({
      timetableEntries,
      periodTimes,
      daysOff,
      overrides,
      startDate: todayStr,
      endDate: horizonEndStr,
    });
  }, [timetableEntries, periodTimes, daysOff, overrides, todayStr, horizonEndStr]);

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
    });
  }, [visible, pendingTasks, busyBlocks, schedulePrefs, todayStr]);

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

            {/* ─── 3. Unallocated Tasks Warning (if any) ─── */}
            {scheduleResult.unallocated.length > 0 && (
              <View style={styles.warningContainer}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning-outline" size={18} color={colors.warning} style={{ marginRight: 6 }} />
                  <Text style={styles.warningTitle}>{t("peringatan_tidak_muat")}</Text>
                </View>
                <Text style={styles.warningSubtitle}>
                  {scheduleResult.unallocated.length} tugas tidak muat sebelum batas tenggat karena waktu belajar penuh.
                </Text>

                {scheduleResult.unallocated.map((u) => (
                  <View key={u.taskId} style={styles.unallocatedRow}>
                    <View style={styles.unallocatedDot} />
                    <View style={styles.unallocatedInfo}>
                      <Text style={styles.unallocatedTaskTitle} numberOfLines={1}>
                        {u.taskTitle}
                      </Text>
                      <Text style={styles.unallocatedReason}>
                        Tenggat: {u.deadlineDate} • Alasan:{" "}
                        {u.reason === "DEADLINE_TOO_SOON"
                          ? "Tenggat terlalu dekat"
                          : u.reason === "ALREADY_PAST_DEADLINE"
                          ? "Tenggat sudah lewat"
                          : "Jadwal penuh"}
                      </Text>
                    </View>
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 150, 0, 0.2)",
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
