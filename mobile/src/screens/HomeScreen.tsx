import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { format, addDays, parseISO, differenceInCalendarDays, startOfDay } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, tidySpacing, radius, spacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { Subject, Task, StudyBlock } from "../types";
import { t } from "../lib/i18n";
import { HapticFeedback } from "../lib/haptics";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { Card } from "../components/common/Card";
import { PrimaryButton } from "../components/common/PrimaryButton";
import { StatusPill } from "../components/common/StatusPill";
import { Banner } from "../components/common/Banner";
import { Snackbar } from "../components/common/Snackbar";
import { CreateScheduleSheet } from "../components/schedule/CreateScheduleSheet";
import { AddTaskSheet } from "../components/tasks/AddTaskSheet";
import { TodayTasksSection, deriveTodayTasks, calculateTodayTasksProgress } from "../components/home/TodayTasksSection";
import { TomorrowsBagChecklist } from "../components/home/TomorrowsBagChecklist";
import { BottomSheet } from "../components/common/BottomSheet";
import { formatLocaleDate } from "../lib/dateUtils";
import { getExamState } from "../lib/examEngine";
import { TeacherDirectoryModal } from "../components/teachers/TeacherDirectoryModal";
import { soundFX } from "../lib/sound";

export { deriveTodayTasks, calculateTodayTasksProgress };

// ─── Pure Helpers (Preserved & Exported for Characterization & QA) ───

export function deriveTodayBlocks(studyBlocks: StudyBlock[], todayStr: string) {
  return studyBlocks
    .filter((b) => b.date === todayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function deriveNextBlock(todayBlocks: StudyBlock[]) {
  return todayBlocks.find((b) => b.status !== "COMPLETED") || null;
}

export function deriveRemainingTodayBlocks(todayBlocks: StudyBlock[], nextBlock: StudyBlock | null) {
  if (!nextBlock) return todayBlocks.filter((b) => b.status === "COMPLETED");
  return todayBlocks.filter((b) => b.id !== nextBlock.id);
}

export function deriveUnscheduledTasksCount(tasks: Task[], studyBlocks: StudyBlock[]) {
  const scheduledTaskIds = new Set(studyBlocks.map((b) => b.taskId));
  return tasks.filter((t) => t.status === "PENDING" && !scheduledTaskIds.has(t.id)).length;
}

export interface HomeScreenProps {
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
    toggleTaskCompletion,
    streakState,
    getEffectiveScheduleForDate,
    undoLastSchedule,
    generateExamPlan,
  } = useMobileStudyStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayDate = useMemo(() => parseISO(todayStr), [todayStr]);
  const tomorrowDate = useMemo(() => addDays(todayDate, 1), [todayDate]);
  const tomorrowStr = useMemo(() => format(tomorrowDate, "yyyy-MM-dd"), [tomorrowDate]);

  // Modal & Sheet visibility
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [addTaskInitialDeadline, setAddTaskInitialDeadline] = useState<string | undefined>(undefined);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [scheduleDayMode, setScheduleDayMode] = useState<"tomorrow" | "today">("tomorrow");
  const [teacherDirectoryVisible, setTeacherDirectoryVisible] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);

  const toggleScheduleDayMode = (nextMode?: "tomorrow" | "today") => {
    HapticFeedback.light();
    soundFX.playClick();
    setScheduleDayMode((prev) => nextMode || (prev === "tomorrow" ? "today" : "tomorrow"));
  };

  // Subject dictionary map for fast lookups
  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const s of subjects) {
      map.set(s.id, s);
    }
    return map;
  }, [subjects]);

  const [bagSheetVisible, setBagSheetVisible] = useState(false);
  const [bagProgress, setBagProgress] = useState({ completed: 0, total: 0 });
  // Stable + value-checked to avoid the re-render loop from Bug 14.
  const handleBagProgress = useCallback((completed: number, total: number) => {
    setBagProgress((prev) => (prev.completed === completed && prev.total === total ? prev : { completed, total }));
  }, []);

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
    return deriveUnscheduledTasksCount(tasks, studyBlocks);
  }, [tasks, studyBlocks]);

  // 1b. Missed Blocks Calculation
  const missedBlocksCount = useMemo(() => {
    const currentTime = format(new Date(), "HH:mm");
    return studyBlocks.filter((b) => {
      if (b.status !== "SCHEDULED") return false;
      const task = tasksMap.get(b.taskId);
      if (!task || task.status === "COMPLETED") return false;
      return b.date < todayStr || (b.date === todayStr && b.endTime < currentTime);
    }).length;
  }, [studyBlocks, todayStr, tasksMap]);

  // 2. Today's Study Blocks (sorted chronologically)
  const todayBlocks = useMemo(() => {
    return deriveTodayBlocks(studyBlocks, todayStr);
  }, [studyBlocks, todayStr]);

  // 3. NEXT Study Block: earliest pending block today
  const nextBlock = useMemo(() => {
    return deriveNextBlock(todayBlocks);
  }, [todayBlocks]);

  // 4. Remaining Today Blocks
  const remainingTodayBlocks = useMemo(() => {
    return deriveRemainingTodayBlocks(todayBlocks, nextBlock);
  }, [todayBlocks, nextBlock]);

  // 5. Today's School Schedule
  const todaySchedule = useMemo(() => {
    return getEffectiveScheduleForDate(todayDate);
  }, [getEffectiveScheduleForDate, todayDate]);

  // 6. Tomorrow's Classes & Blocks
  const tomorrowSchedule = useMemo(() => {
    return getEffectiveScheduleForDate(tomorrowDate);
  }, [getEffectiveScheduleForDate, tomorrowDate]);

  const tomorrowBlocks = useMemo(() => {
    return studyBlocks.filter((b) => b.date === tomorrowStr);
  }, [studyBlocks, tomorrowStr]);

  // 7. Today's Priority Tasks (Due Today or Earliest Pending)
  const todayPendingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "COMPLETED")
      .sort((a, b) => {
        const aDueToday = a.deadlineDate === todayStr ? 0 : 1;
        const bDueToday = b.deadlineDate === todayStr ? 0 : 1;
        if (aDueToday !== bDueToday) return aDueToday - bDueToday;
        return a.deadlineDate.localeCompare(b.deadlineDate);
      })
      .slice(0, 4);
  }, [tasks, todayStr]);

  // 8. Upcoming Exam Calculation
  const nextExam = useMemo(() => {
    const examState = getExamState({ subjects, today: todayStr });
    return examState.nextExam;
  }, [subjects, todayStr]);

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
  const handleStartFocus = (block?: StudyBlock | null) => {
    if (block) {
      navigation.navigate("Focus", { blockId: block.id, taskId: block.taskId });
    } else {
      navigation.navigate("Focus");
    }
  };

  const handleToggleTask = (taskId: string) => {
    HapticFeedback.taskToggle();
    toggleTaskCompletion(taskId);
  };

  const nextTask = nextBlock ? tasksMap.get(nextBlock.taskId) : null;
  const urgentTask = !nextBlock && todayPendingTasks.length > 0 ? todayPendingTasks[0] : null;
  const heroTask = nextTask || urgentTask;
  const nextSubject = heroTask ? subjectsMap.get(heroTask.subjectId) : null;
  const nextSubjectColor = nextSubject?.color || nextSubject?.color_hex || colors.primary;

  const renderDeadlineBadge = (deadlineStr: string) => {
    try {
      const deadline = startOfDay(parseISO(deadlineStr));
      const diff = differenceInCalendarDays(deadline, startOfDay(todayDate));

      if (diff < 0) {
        return <StatusPill variant="red" label={t("deadline_terlambat", { days: Math.abs(diff) })} />;
      }
      if (diff === 0) {
        return <StatusPill variant="amber" label={t("deadline_hari_ini") || "Hari Ini"} />;
      }
      if (diff === 1) {
        return <StatusPill variant="blue" label={t("deadline_besok") || "Besok"} />;
      }
      return <StatusPill variant="gray" label={formatLocaleDate(deadline, "d MMM")} />;
    } catch {
      return <StatusPill variant="gray" label={deadlineStr} />;
    }
  };

  return (
    <View style={styles.safeArea}>
      {/* ─── 1. Header: Friendly Greeting + Streak Badge + Akses Cepat Akademik (Guru & Pengaturan) ─── */}
      <ScreenHeader
        showLogo
        title={t("tabToday") || "Hari Ini"}
        subtitle={formatLocaleDate(todayDate, "EEEE, d MMMM yyyy")}
        streakText={t("streak_days_badge", { count: streakState?.currentStreak || 0 })}
        isStreakAtRisk={streakState?.isAtRisk}
        onStreakPress={() => navigation.navigate("Streak")}
        actions={[
          {
            icon: "settings-outline",
            accessibilityLabel: t("settings"),
            onPress: () => navigation.navigate("Settings"),
          },
        ]}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. First Hero Card: Tugas (Tasks) ─── */}
        <View style={styles.heroSection}>
          <Card style={styles.heroCard}>
            <TodayTasksSection
              onStartFocus={(task, block) => {
                if (block) {
                  navigation.navigate("Focus", { blockId: block.id, taskId: task.id });
                } else {
                  navigation.navigate("Focus", { taskId: task.id });
                }
              }}
              onOpenAllTasks={() => navigation.navigate("Tasks")}
              onOpenAddTask={(initialDeadline) => {
                setAddTaskInitialDeadline(initialDeadline || todayStr);
                setAddTaskVisible(true);
              }}
            />

            {unscheduledTasksCount > 0 && (
              <View style={{ marginTop: spacing.md }}>
                <Banner
                  icon="sparkles"
                  text={t("banner_tugas_belum_dijadwalkan", { count: unscheduledTasksCount })}
                  buttonText={t("buat_jadwal") || "Buat Jadwal"}
                  variant="ai"
                  onPress={() => setScheduleSheetVisible(true)}
                />
              </View>
            )}
          </Card>
        </View>

        {/* ─── Missed Blocks: one quiet line, tap to reschedule ─── */}
        {missedBlocksCount > 0 && (
          <Pressable
            style={styles.missedRow}
            onPress={() => setScheduleSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t("banner_blok_terlewat", { count: missedBlocksCount })}. ${t("jadwalkan_ulang")}`}
          >
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.missedText} numberOfLines={1}>
              {t("banner_blok_terlewat", { count: missedBlocksCount })}
            </Text>
            <Text style={styles.missedAction}>{t("jadwalkan_ulang")} ›</Text>
          </Pressable>
        )}

        {/* ─── Compact 48-Hour Exam Pill (If Imminent) ─── */}
        {nextExam && !nextExam.isPassed && nextExam.daysLeft <= 2 ? (
          <View style={styles.sectionContainer}>
            <Pressable
              style={styles.compactExamPillRow}
              onPress={() => navigation.navigate("Exams")}
              accessibilityLabel="Lihat jadwal ulangan mendatang"
            >
              <View style={styles.compactExamIconCircle}>
                <Ionicons name="ribbon" size={16} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.compactExamTitle} numberOfLines={1}>
                  {nextExam.title.toLowerCase().startsWith("ujian") || nextExam.title.toLowerCase().startsWith("ulangan")
                    ? nextExam.title
                    : `Ulangan ${nextExam.subject?.name || nextExam.title}`}
                </Text>
                <Text style={styles.compactExamSub}>
                  {nextExam.daysLeft === 0 ? "Hari ini!" : nextExam.daysLeft === 1 ? "Besok!" : "2 hari lagi"} • Buka Ulangan
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
          </View>
        ) : null}

        {/* ─── 2. Second Card: Jadwal Pelajaran Besok / Hari Ini ─── */}
        {(() => {
          const activeSchedule = scheduleDayMode === "tomorrow" ? tomorrowSchedule : todaySchedule;
          const activeDate = scheduleDayMode === "tomorrow" ? tomorrowDate : todayDate;
          const scheduleItems = (activeSchedule?.items || []).filter((item: any) => item.kind !== "break");

          return (
            <View style={styles.sectionContainer}>
              <Card style={styles.besokCard}>
                {/* Card Header + Day Switcher */}
                <View style={styles.besokHeaderRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.besokTitle} numberOfLines={1}>
                      {t("home_schedule_title")}
                    </Text>
                    <Text style={styles.unifiedCardSubtitle} numberOfLines={1}>
                      {formatLocaleDate(activeDate, "EEEE, d MMMM")}
                    </Text>
                  </View>

                  {/* Segmented Pill Toggle (Hari Ini | Besok) */}
                  <View style={styles.segmentedTogglePill}>
                    <Pressable
                      onPress={() => toggleScheduleDayMode("today")}
                      style={[
                        styles.segmentedToggleOption,
                        scheduleDayMode === "today" && styles.segmentedToggleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentedToggleText,
                          scheduleDayMode === "today" && styles.segmentedToggleTextActive,
                        ]}
                      >
                        {t("today")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleScheduleDayMode("tomorrow")}
                      style={[
                        styles.segmentedToggleOption,
                        scheduleDayMode === "tomorrow" && styles.segmentedToggleOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentedToggleText,
                          scheduleDayMode === "tomorrow" && styles.segmentedToggleTextActive,
                        ]}
                      >
                        {t("tomorrow")}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Classes List */}
                <View style={{ marginTop: spacing.sm }}>
                  {activeSchedule?.isDayOff || scheduleItems.length === 0 ? (
                    <Pressable
                      style={styles.quietDaySingleLine}
                      onPress={() => navigation.navigate("Timetable")}
                    >
                      <Ionicons name="sunny-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                      <Text style={styles.quietDayText} numberOfLines={1}>
                        {scheduleDayMode === "tomorrow"
                          ? t("no_school_tomorrow")
                          : t("no_school_today")}
                      </Text>
                      <Text style={styles.quietDayLink}>{t("open_timetable_short")}</Text>
                    </Pressable>
                  ) : (
                    <>
                      {scheduleItems.map((item, idx) => {
                        const subColor = item.subject?.color || item.subject?.color_hex || colors.primary;
                        return (
                          <Pressable
                            key={item.entryId || idx}
                            style={styles.besokItemRow}
                            onPress={() => navigation.navigate("Timetable")}
                          >
                            <View style={[styles.besokStripe, { backgroundColor: subColor }]} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={styles.besokItemTitle} numberOfLines={1}>
                                {item.subject?.title || item.subject?.name || item.customLabel || t("subject")}
                              </Text>
                              {item.room ? (
                                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>
                                  {t("roomLabel")} {item.room}
                                </Text>
                              ) : null}
                            </View>
                            <View style={styles.besokTimePill}>
                              <Text style={styles.besokItemTime}>
                                {item.startTime ? `${item.startTime} - ${item.endTime}` : t("periodLabel", { period: item.periodNumber })}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                      <Pressable
                        onPress={() => navigation.navigate("Timetable")}
                        style={{ alignSelf: "flex-end", paddingTop: spacing.xs }}
                      >
                        <Text style={styles.quietDayLink}>{t("open_full_timetable")}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </Card>
            </View>
          );
        })()}

        {/* ─── 3. Third Card: Perlengkapan Sekolah (Collapsed to 1 Row) ─── */}
        <View style={styles.sectionContainer}>
          <Card style={styles.besokCard}>
            <Pressable
              style={styles.besokHeaderRow}
              onPress={() => setBagSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t("school_equipment_title")}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.besokTitle} numberOfLines={1}>{t("school_equipment_title")}</Text>
                <Text style={styles.unifiedCardSubtitle} numberOfLines={1}>
                  {scheduleDayMode === "tomorrow"
                    ? `${t("prep_tomorrow")} • ${formatLocaleDate(tomorrowDate, "EEEE, d MMM")}`
                    : `${t("prep_today")} • ${formatLocaleDate(todayDate, "EEEE, d MMM")}`}
                </Text>
              </View>
              <View style={styles.bagProgressRow}>
                <Text
                  style={[
                    styles.bagProgressText,
                    {
                      color:
                        bagProgress.total > 0 && bagProgress.completed === bagProgress.total
                          ? colors.emerald
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {bagProgress.completed}/{bagProgress.total} siap
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </View>
            </Pressable>

            {/* Kept mounted while collapsed so the progress counter stays current */}
            <View style={styles.hidden}>
              <TomorrowsBagChecklist
                onProgressChange={handleBagProgress}
                scheduleItems={
                  (scheduleDayMode === "tomorrow" ? tomorrowSchedule?.items : todaySchedule?.items) || []
                }
                targetDateStr={formatLocaleDate(
                  scheduleDayMode === "tomorrow" ? tomorrowDate : todayDate,
                  "EEEE, d MMM"
                )}
                isTomorrow={scheduleDayMode === "tomorrow"}
                onOpenSubjectDetail={() => navigation.navigate("Timetable")}
              />
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* ─── Schedule Sheet, Add Task Sheet & Undo Snackbar ─── */}
      <CreateScheduleSheet
        visible={scheduleSheetVisible}
        onClose={() => setScheduleSheetVisible(false)}
        onScheduleApplied={handleScheduleApplied}
      />

      <AddTaskSheet
        visible={addTaskVisible}
        onClose={() => setAddTaskVisible(false)}
        initialDeadline={addTaskInitialDeadline}
      />

      <Snackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        actionLabel={t("urungkan")}
        onActionPress={handleUndo}
        onDismiss={() => setSnackbarVisible(false)}
        duration={8000}
      />

      <BottomSheet
        visible={bagSheetVisible}
        onClose={() => setBagSheetVisible(false)}
        title={t("school_equipment_title")}
      >
        <TomorrowsBagChecklist
          onProgressChange={handleBagProgress}
          scheduleItems={
            (scheduleDayMode === "tomorrow" ? tomorrowSchedule?.items : todaySchedule?.items) || []
          }
          targetDateStr={formatLocaleDate(
            scheduleDayMode === "tomorrow" ? tomorrowDate : todayDate,
            "EEEE, d MMM"
          )}
          isTomorrow={scheduleDayMode === "tomorrow"}
          onOpenSubjectDetail={() => {
            setBagSheetVisible(false);
            navigation.navigate("Timetable");
          }}
        />
      </BottomSheet>

      <TeacherDirectoryModal
        visible={teacherDirectoryVisible}
        onClose={() => setTeacherDirectoryVisible(false)}
      />
    </View>
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
  hidden: {
    display: "none",
  },
  missedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginHorizontal: tidySpacing.screen,
    marginTop: spacing.sm,
    minHeight: touchTarget.min,
  },
  missedText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  missedAction: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  heroSection: {
    paddingHorizontal: tidySpacing.screen,
    marginTop: spacing.md,
  },
  heroCard: {
    padding: spacing.md + 2,
    borderRadius: radius.cardLarge,
  },
  sectionContainer: {
    marginTop: spacing.md + 4,
    paddingHorizontal: tidySpacing.screen,
  },
  quietDaySingleLine: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  quietDayText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    flex: 1,
  },
  quietDayLink: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  compactExamPillRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.08)",
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  compactExamIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(168, 85, 247, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  compactExamTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  compactExamSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.accent,
    marginTop: 1,
  },
  besokCard: {
    padding: spacing.md + 2,
    borderRadius: radius.cardLarge,
  },
  besokHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  unifiedCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  segmentedTogglePill: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentedToggleOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  segmentedToggleOptionActive: {
    backgroundColor: colors.primary,
  },
  segmentedToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  segmentedToggleTextActive: {
    color: colors.textInverse,
  },
  besokTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  besokItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm + 2,
  },
  besokStripe: {
    width: 4,
    height: 26,
    borderRadius: 2,
  },
  besokItemTitle: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    color: colors.text,
    fontWeight: typography.fontWeights.semibold,
  },
  besokTimePill: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  besokItemTime: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  bagProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bagProgressText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.emerald,
  },
});
