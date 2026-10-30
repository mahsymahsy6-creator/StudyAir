import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { format, addDays, parseISO } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, tidySpacing, radius, spacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { Subject, Task, StudyBlock } from "../types";
import { t } from "../lib/i18n";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { Card } from "../components/common/Card";
import { ListRow } from "../components/common/ListRow";
import { PrimaryButton } from "../components/common/PrimaryButton";
import { StatusPill } from "../components/common/StatusPill";
import { Banner } from "../components/common/Banner";
import { Snackbar } from "../components/common/Snackbar";
import { CreateScheduleSheet } from "../components/schedule/CreateScheduleSheet";

interface HomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
  onOpenAddTask?: () => void;
  onOpenBatchCapture?: () => void;
}

export function HomeScreen({ navigation, onOpenAddTask }: HomeScreenProps) {
  const {
    tasks,
    subjects,
    studyBlocks,
    toggleBlockCompletion,
    streakState,
    getEffectiveScheduleForDate,
    undoLastSchedule,
  } = useMobileStudyStore();

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const tomorrowDate = useMemo(() => addDays(new Date(), 1), []);
  const tomorrowStr = useMemo(() => format(tomorrowDate, "yyyy-MM-dd"), [tomorrowDate]);

  // Modal & Sheet visibility
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [besokExpanded, setBesokExpanded] = useState(false);

  // Subject dictionary map for fast lookups
  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const s of subjects) {
      map.set(s.id, s);
    }
    return map;
  }, [subjects]);

  // Tasks dictionary map for fast lookups
  const tasksMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const t of tasks) {
      map.set(t.id, t);
    }
    return map;
  }, [tasks]);

  // 1. Unscheduled Tasks Calculation
  const unscheduledTasksCount = useMemo(() => {
    const scheduledTaskIds = new Set(studyBlocks.map((b) => b.taskId));
    return tasks.filter((t) => t.status === "PENDING" && !scheduledTaskIds.has(t.id)).length;
  }, [tasks, studyBlocks]);

  // 2. Today's Study Blocks (sorted chronologically)
  const todayBlocks = useMemo(() => {
    return studyBlocks
      .filter((b) => b.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [studyBlocks, todayStr]);

  // 3. NEXT Study Block: earliest pending block today
  const nextBlock = useMemo(() => {
    return todayBlocks.find((b) => b.status !== "COMPLETED") || null;
  }, [todayBlocks]);

  // 4. Remaining Today Blocks (all pending blocks after the next block)
  const remainingTodayBlocks = useMemo(() => {
    if (!nextBlock) return todayBlocks.filter((b) => b.status === "COMPLETED");
    return todayBlocks.filter((b) => b.id !== nextBlock.id);
  }, [todayBlocks, nextBlock]);

  // 5. Tomorrow's Classes & Blocks
  const tomorrowSchedule = useMemo(() => {
    return getEffectiveScheduleForDate(tomorrowDate);
  }, [getEffectiveScheduleForDate, tomorrowDate]);

  const tomorrowBlocks = useMemo(() => {
    return studyBlocks.filter((b) => b.date === tomorrowStr);
  }, [studyBlocks, tomorrowStr]);

  // Handle schedule applied
  const handleScheduleApplied = ({ newBlocksCount }: { newBlocksCount: number }) => {
    setSnackbarMessage(t("jadwal_diterapkan"));
    setSnackbarVisible(true);
  };

  // Handle undo action
  const handleUndo = () => {
    const success = undoLastSchedule();
    if (success) {
      setSnackbarMessage(t("jadwal_diurungkan"));
      setSnackbarVisible(true);
    }
  };

  // Handle Start Focus
  const handleStartFocus = (block: StudyBlock) => {
    navigation.navigate("Focus", { blockId: block.id, taskId: block.taskId });
  };

  const nextTask = nextBlock ? tasksMap.get(nextBlock.taskId) : null;
  const nextSubject = nextBlock ? subjectsMap.get(nextBlock.subjectId) : null;
  const nextSubjectColor = nextSubject?.color || nextSubject?.color_hex || colors.primary;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* ─── 1. Header: Streak Pill + Settings Icon ─── */}
      <ScreenHeader
        title={t("rencana_title")}
        streakText={`${streakState?.currentStreak || 0} hari`}
        onStreakPress={() => navigation.navigate("Streak")}
        actions={[
          {
            icon: "settings-outline",
            accessibilityLabel: "Pengaturan",
            onPress: () => navigation.navigate("Settings"),
          },
        ]}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 2. Unscheduled Banner (Prompts "Buat jadwal") ─── */}
        {unscheduledTasksCount > 0 && (
          <View style={styles.bannerContainer}>
            <Banner
              text={t("banner_tugas_belum_dijadwalkan", { count: unscheduledTasksCount })}
              buttonText={t("buat_rencana_belajar")}
              onPress={() => setScheduleSheetVisible(true)}
              variant="warning"
              icon="calendar-outline"
            />
          </View>
        )}

        {/* ─── 3. NEXT Block Hero Card (The 3-Second Rule) ─── */}
        <View style={styles.heroSection}>
          <Text style={styles.sectionTitle}>{t("blok_selanjutnya")}</Text>

          {nextBlock && nextTask ? (
            <Card style={styles.heroCard} onPress={() => handleStartFocus(nextBlock)}>
              {/* 4dp Left Subject Stripe */}
              <View style={[styles.heroColorStripe, { backgroundColor: nextSubjectColor }]} />

              <View style={styles.heroBody}>
                {/* Time & Duration Header */}
                <View style={styles.heroMetaRow}>
                  <View style={styles.heroTimeBadge}>
                    <Ionicons name="time-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.heroTimeText}>
                      {nextBlock.startTime} - {nextBlock.endTime}
                    </Text>
                  </View>
                  <StatusPill variant="amber" label={`${nextBlock.durationMinutes} ${t("menit")}`} />
                </View>

                {/* Subject & Task Title */}
                <Text style={styles.heroSubjectName}>
                  {nextSubject?.name || nextSubject?.title || "Pelajaran"}
                </Text>
                <Text style={styles.heroTaskTitle} numberOfLines={2}>
                  {nextTask.title}
                </Text>

                {nextTask.notes ? (
                  <Text style={styles.heroNotes} numberOfLines={1}>
                    {nextTask.notes}
                  </Text>
                ) : null}

                {/* Primary Action Button: Mulai fokus */}
                <View style={styles.heroActionRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={t("mulai_fokus")}
                      icon="play"
                      onPress={() => handleStartFocus(nextBlock)}
                    />
                  </View>

                  {/* Completion Toggle */}
                  <Pressable
                    style={styles.heroCheckBtn}
                    onPress={() => toggleBlockCompletion(nextBlock.id)}
                    hitSlop={touchTarget.min / 4}
                  >
                    <Ionicons name="checkmark-circle-outline" size={32} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            </Card>
          ) : todayBlocks.length > 0 && todayBlocks.every((b) => b.status === "COMPLETED") ? (
            <Card style={styles.allDoneCard}>
              <Ionicons name="checkmark-done-circle" size={44} color={colors.emerald} />
              <Text style={styles.allDoneTitle}>{t("semua_blok_selesai")}</Text>
              <Text style={styles.allDoneSub}>
                Kamu telah menyelesaikan semua {todayBlocks.length} blok belajar hari ini.
              </Text>
            </Card>
          ) : (
            <Card style={styles.emptyTodayCard} onPress={() => setScheduleSheetVisible(true)}>
              <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyTodayTitle}>{t("tidak_ada_blok_hari_ini")}</Text>
              <Text style={styles.emptyTodaySub}>
                Ketuk untuk membuat jadwal belajar otomatis dari tugas-tugasmu.
              </Text>
              <View style={{ marginTop: spacing.md, width: "100%" }}>
                <PrimaryButton
                  label={t("buat_rencana_belajar")}
                  onPress={() => setScheduleSheetVisible(true)}
                />
              </View>
            </Card>
          )}
        </View>

        {/* ─── 4. Today's Remaining Blocks ─── */}
        {remainingTodayBlocks.length > 0 && (
          <View style={styles.sectionContainer}>
            <SectionHeader title={t("sisa_blok_hari_ini")} />
            {remainingTodayBlocks.map((block) => {
              const task = tasksMap.get(block.taskId);
              const subject = subjectsMap.get(block.subjectId);
              const color = subject?.color || subject?.color_hex || colors.primary;
              const isCompleted = block.status === "COMPLETED";

              return (
                <ListRow
                  key={block.id}
                  title={task?.title || "Belajar Mandiri"}
                  subtitle={`${subject?.name || "Pelajaran"} • ${block.startTime} - ${block.endTime} (${block.durationMinutes}m)`}
                  leading={
                    <View style={[styles.blockDot, { backgroundColor: isCompleted ? colors.textMuted : color }]} />
                  }
                  trailing={
                    <Pressable
                      onPress={() => toggleBlockCompletion(block.id)}
                      hitSlop={touchTarget.min / 4}
                    >
                      <Ionicons
                        name={isCompleted ? "checkbox" : "square-outline"}
                        size={22}
                        color={isCompleted ? colors.emerald : colors.textSecondary}
                      />
                    </Pressable>
                  }
                  onPress={() => handleStartFocus(block)}
                />
              );
            })}
          </View>
        )}

        {/* ─── 5. Collapsed "Besok" Section ─── */}
        <View style={styles.sectionContainer}>
          <Card
            style={styles.besokCard}
            onPress={() => setBesokExpanded((prev) => !prev)}
          >
            <View style={styles.besokHeaderRow}>
              <View style={styles.besokHeaderLeft}>
                <Ionicons name="calendar" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <Text style={styles.besokTitle}>
                  {t("besok_summary", {
                    classes: tomorrowSchedule?.items?.length || 0,
                    blocks: tomorrowBlocks.length,
                  })}
                </Text>
              </View>
              <Ionicons
                name={besokExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textSecondary}
              />
            </View>

            {besokExpanded && (
              <View style={styles.besokExpandedContent}>
                {/* Tomorrow's School Classes */}
                <Text style={styles.besokSubHeader}>{t("jadwal_sekolah")}</Text>
                {tomorrowSchedule.items.length === 0 ? (
                  <Text style={styles.besokEmptyText}>Tidak ada kelas sekolah besok.</Text>
                ) : (
                  tomorrowSchedule.items.map((item, idx) => (
                    <View key={item.entryId || idx} style={styles.besokItemRow}>
                      <View
                        style={[
                          styles.besokDot,
                          { backgroundColor: item.subject?.color || item.subject?.color_hex || colors.primary },
                        ]}
                      />
                      <Text style={styles.besokItemTitle} numberOfLines={1}>
                        {item.subject?.title || item.customLabel || "Pelajaran"}
                      </Text>
                      <Text style={styles.besokItemTime}>
                        {item.startTime ? `${item.startTime} - ${item.endTime}` : `Jam ${item.periodNumber}`}
                      </Text>
                    </View>
                  ))
                )}

                {/* Tomorrow's Study Blocks */}
                <Text style={[styles.besokSubHeader, { marginTop: spacing.md }]}>Blok Belajar Besok</Text>
                {tomorrowBlocks.length === 0 ? (
                  <Text style={styles.besokEmptyText}>Belum ada blok belajar yang dijadwalkan besok.</Text>
                ) : (
                  tomorrowBlocks.map((b) => {
                    const task = tasksMap.get(b.taskId);
                    return (
                      <View key={b.id} style={styles.besokItemRow}>
                        <View style={[styles.besokDot, { backgroundColor: colors.primary }]} />
                        <Text style={styles.besokItemTitle} numberOfLines={1}>
                          {task?.title || "Tugas Belajar"}
                        </Text>
                        <Text style={styles.besokItemTime}>
                          {b.startTime} - {b.endTime}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      {/* ─── 6. Schedule Sheet & Undo Snackbar ─── */}
      <CreateScheduleSheet
        visible={scheduleSheetVisible}
        onClose={() => setScheduleSheetVisible(false)}
        onScheduleApplied={handleScheduleApplied}
      />

      <Snackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        actionLabel={t("urungkan")}
        onActionPress={handleUndo}
        onDismiss={() => setSnackbarVisible(false)}
        duration={8000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: tidySpacing.large * 2,
  },
  bannerContainer: {
    marginTop: spacing.sm,
  },
  heroSection: {
    paddingHorizontal: tidySpacing.screen,
    marginTop: tidySpacing.medium,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  heroCard: {
    position: "relative",
    padding: 0,
    overflow: "hidden",
    flexDirection: "row",
    minHeight: 160,
  },
  heroColorStripe: {
    width: 6,
    height: "100%",
  },
  heroBody: {
    flex: 1,
    padding: tidySpacing.screen,
  },
  heroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  heroTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroTimeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  heroSubjectName: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroTaskTitle: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  heroNotes: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  heroCheckBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
  },
  allDoneCard: {
    alignItems: "center",
    paddingVertical: tidySpacing.large,
  },
  allDoneTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  allDoneSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptyTodayCard: {
    alignItems: "center",
    paddingVertical: tidySpacing.large,
  },
  emptyTodayTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  emptyTodaySub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  sectionContainer: {
    marginTop: tidySpacing.large,
    paddingHorizontal: tidySpacing.screen,
  },
  blockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  besokCard: {
    padding: spacing.md,
  },
  besokHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  besokHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  besokTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  besokExpandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  besokSubHeader: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  besokItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  besokDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  besokItemTitle: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  besokItemTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  besokEmptyText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    fontStyle: "italic",
    paddingVertical: 2,
  },
});
