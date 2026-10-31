import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(todayDate, "yyyy-MM-dd"), [todayDate]);
  const tomorrowDate = useMemo(() => addDays(todayDate, 1), [todayDate]);
  const tomorrowStr = useMemo(() => format(tomorrowDate, "yyyy-MM-dd"), [tomorrowDate]);

  // Modal & Sheet visibility
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);
  const [addTaskVisible, setAddTaskVisible] = useState(false);
  const [addTaskInitialDeadline, setAddTaskInitialDeadline] = useState<string | undefined>(undefined);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [besokExpanded, setBesokExpanded] = useState(false);
  const [teacherDirectoryVisible, setTeacherDirectoryVisible] = useState(false);

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
    return deriveUnscheduledTasksCount(tasks, studyBlocks);
  }, [tasks, studyBlocks]);

  // 1b. Missed Blocks Calculation
  const missedBlocksCount = useMemo(() => {
    const currentTime = format(new Date(), "HH:mm");
    return studyBlocks.filter((b) => {
      if (b.status !== "SCHEDULED") return false;
      return b.date < todayStr || (b.date === todayStr && b.endTime < currentTime);
    }).length;
  }, [studyBlocks, todayStr]);

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
  const nextSubject = nextBlock ? subjectsMap.get(nextBlock.subjectId) : null;
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
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* ─── 1. Header: Friendly Greeting + Streak Badge + Akses Cepat Akademik (Guru & Pengaturan) ─── */}
      <ScreenHeader
        title={t("tabToday") || "Hari Ini"}
        subtitle={formatLocaleDate(todayDate, "EEEE, d MMMM yyyy")}
        streakText={`${streakState?.currentStreak || 0} hari`}
        onStreakPress={() => navigation.navigate("Streak")}
        actions={[
          {
            icon: "people-outline",
            accessibilityLabel: "Daftar Guru",
            onPress: () => {
              HapticFeedback.light();
              soundFX.playClick();
              setTeacherDirectoryVisible(true);
            },
          },
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
        {/* ─── 2. Missed Blocks Alert (Subtle & Non-Intrusive) ─── */}
        {missedBlocksCount > 0 && (
          <View style={styles.bannerContainer}>
            <Banner
              text={t("banner_blok_terlewat", { count: missedBlocksCount })}
              buttonText={t("jadwalkan_ulang")}
              onPress={() => setScheduleSheetVisible(true)}
              variant="warning"
              icon="alert-circle-outline"
            />
          </View>
        )}

        {/* ─── 3. O3 Space Hero Presence Widget (Mulai Fokus) ─── */}
        <View style={styles.heroSection}>
          <Card style={styles.heroCard}>
            <View style={styles.heroHeaderRow}>
              <View style={styles.heroHeaderLeft}>
                <View style={styles.heroIconBadge}>
                  <Ionicons name="sparkles" size={16} color={colors.accent} />
                </View>
                <Text style={styles.heroCardBadgeText}>
                  {nextBlock ? "Sesi Fokus Berikutnya" : "Fokus Belajar Mandiri"}
                </Text>
              </View>
              <StatusPill
                variant="purple"
                label={nextBlock ? `${nextBlock.durationMinutes} menit` : "25m Pomodoro"}
              />
            </View>

            {nextBlock && nextTask ? (
              <View style={styles.heroBody}>
                <View style={styles.heroSubjectRow}>
                  <View style={[styles.heroSubjectDot, { backgroundColor: nextSubjectColor }]} />
                  <Text style={styles.heroSubjectText} numberOfLines={1}>
                    {nextSubject?.name || nextSubject?.title || "Pelajaran"}
                  </Text>
                  <Text style={styles.heroTimeSlotText}>
                    • {nextBlock.startTime} - {nextBlock.endTime}
                  </Text>
                </View>

                <Text style={styles.heroTaskTitle} numberOfLines={2}>
                  {nextTask.title}
                </Text>

                {nextTask.notes ? (
                  <Text style={styles.heroNotes} numberOfLines={1}>
                    {nextTask.notes}
                  </Text>
                ) : null}

                <View style={styles.heroActionRow}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label={t("mulai_fokus") || "Mulai Fokus"}
                      icon="play"
                      onPress={() => handleStartFocus(nextBlock)}
                    />
                  </View>
                  <Pressable
                    style={styles.heroCheckBtn}
                    onPress={() => {
                      HapticFeedback.taskToggle();
                      toggleBlockCompletion(nextBlock.id);
                    }}
                    hitSlop={touchTarget.min / 4}
                    accessibilityLabel="Tandai blok selesai"
                  >
                    <Ionicons name="checkmark-circle-outline" size={32} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ) : todayBlocks.length > 0 && todayBlocks.every((b) => b.status === "COMPLETED") ? (
              <View style={styles.heroBody}>
                <View style={styles.heroDoneRow}>
                  <Ionicons name="checkmark-done-circle" size={32} color={colors.emerald} />
                  <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                    <Text style={styles.heroPromptTitle}>Semua Sesi Selesai!</Text>
                    <Text style={styles.heroPromptSub}>
                      Kamu telah menuntaskan seluruh {todayBlocks.length} blok belajar hari ini.
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: spacing.md }}>
                  <PrimaryButton
                    label="Tambah Sesi Tambahan"
                    icon="play"
                    onPress={() => handleStartFocus(null)}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.heroBody}>
                <Text style={styles.heroPromptTitle}>Siap Belajar Hari Ini?</Text>
                <Text style={styles.heroPromptSub}>
                  Mulai sesi fokus 25 menit Pomodoro untuk menyelesaikan tugasmu dengan tenang dan teratur.
                </Text>
                <View style={{ marginTop: spacing.md }}>
                  <PrimaryButton
                    label={t("mulai_fokus") || "Mulai Fokus Sekarang"}
                    icon="play"
                    onPress={() => handleStartFocus(null)}
                  />
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* ─── 4. Jadwal Kelas Hari Ini (School Classes Strip) ─── */}
        <View style={styles.sectionContainer}>
          <SectionHeader
            title="Jadwal Kelas Hari Ini"
            badge={todaySchedule.items?.length || 0}
            actionText="Buka Jadwal"
            onActionPress={() => navigation.navigate("Timetable")}
          />

          {todaySchedule.isDayOff ? (
            <Card style={styles.dayOffCard}>
              <View style={styles.dayOffRow}>
                <Ionicons name="sunny" size={24} color={colors.amber} style={{ marginRight: spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={styles.dayOffTitle}>Hari Bebas Kelas</Text>
                    <View style={styles.streakSafePill}>
                      <Ionicons name="shield-checkmark" size={12} color={colors.emerald} style={{ marginRight: 3 }} />
                      <Text style={styles.streakSafeText}>Streak Aman</Text>
                    </View>
                  </View>
                  <Text style={styles.dayOffSub}>
                    {todaySchedule.dayOffReason || "Tidak ada kelas sekolah terjadwal hari ini. Nikmati istirahatmu tanpa khawatir streak berkurang!"}
                  </Text>
                </View>
              </View>
            </Card>
          ) : todaySchedule.items && todaySchedule.items.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.classChipsScroll}
            >
              {todaySchedule.items.map((item, idx) => {
                const subColor = item.subject?.color || item.subject?.color_hex || colors.primary;
                return (
                  <Pressable
                    key={item.entryId || idx}
                    style={styles.classChip}
                    onPress={() => navigation.navigate("Timetable")}
                  >
                    <View style={[styles.classChipStripe, { backgroundColor: subColor }]} />
                    <View style={styles.classChipContent}>
                      <Text style={styles.classChipTime}>
                        {item.startTime ? `${item.startTime} - ${item.endTime}` : `Jam ${item.periodNumber}`}
                      </Text>
                      <Text style={styles.classChipTitle} numberOfLines={1}>
                        {item.subject?.title || item.subject?.name || item.customLabel || "Pelajaran"}
                      </Text>
                      {item.room ? (
                        <Text style={styles.classChipRoom} numberOfLines={1}>
                          Ruang {item.room}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Card style={styles.quietDayCard}>
              <Ionicons name="calendar-outline" size={22} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
              <Text style={styles.quietDayText}>
                Tidak ada kelas sekolah hari ini. Waktu luang atau belajar mandiri!
              </Text>
            </Card>
          )}
        </View>

        {/* ─── 5. Tugas & PR Hari Ini (Remastered O3 Space Component) ─── */}
        <View style={styles.sectionContainer}>
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
        </View>

        {/* ─── 6. AI Smart Scheduling Assistant (Purple Accent) ─── */}
        {unscheduledTasksCount > 0 && (
          <View style={styles.sectionContainer}>
            <Card style={styles.aiScheduleCard}>
              <View style={styles.aiCardHeaderRow}>
                <View style={styles.aiIconBadge}>
                  <Ionicons name="sparkles" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.aiCardTitle}>Susun Jadwal Otomatis (AI)</Text>
                  <Text style={styles.aiCardSub}>
                    Ada {unscheduledTasksCount} tugas belum dialokasikan ke kalender belajarmu.
                  </Text>
                </View>
              </View>
              <View style={styles.aiCardActionRow}>
                <PrimaryButton
                  label="✨ Susun Jadwal Otomatis"
                  variant="ai"
                  onPress={() => setScheduleSheetVisible(true)}
                />
              </View>
            </Card>
          </View>
        )}

        {/* ─── 7. Compact 48-Hour Exam Pill (If Imminent) ─── */}
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
                  {nextExam.daysLeft === 0 ? "Hari ini!" : nextExam.daysLeft === 1 ? "Besok!" : "2 hari lagi"} • Buka tab Ulangan
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Pressable>
          </View>
        ) : null}

        {/* ─── 8. Collapsed "Besok" Section (Tomorrow's Preview) ─── */}
        <View style={styles.sectionContainer}>
          <Card
            style={styles.besokCard}
            onPress={() => setBesokExpanded((prev) => !prev)}
          >
            <View style={styles.besokHeaderRow}>
              <View style={styles.besokHeaderLeft}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
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
                        <View style={[styles.besokDot, { backgroundColor: colors.accent }]} />
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

      <TeacherDirectoryModal
        visible={teacherDirectoryVisible}
        onClose={() => setTeacherDirectoryVisible(false)}
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
    paddingHorizontal: tidySpacing.screen,
    marginTop: spacing.sm,
  },
  heroSection: {
    paddingHorizontal: tidySpacing.screen,
    marginTop: spacing.md,
  },
  heroCard: {
    padding: spacing.md + 2,
    borderRadius: radius.cardLarge,
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  heroHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs + 2,
  },
  heroCardBadgeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  heroBody: {
    marginTop: spacing.xs,
  },
  heroSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  heroSubjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  heroSubjectText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTimeSlotText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginLeft: 4,
  },
  heroTaskTitle: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroNotes: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  heroActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  heroCheckBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: touchTarget.min,
    height: touchTarget.min,
  },
  heroPromptTitle: {
    fontSize: 18,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  heroPromptSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  heroDoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: tidySpacing.screen,
  },
  classChipsScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  classChip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    minWidth: 160,
    maxWidth: 220,
  },
  classChipStripe: {
    width: 5,
  },
  classChipContent: {
    padding: spacing.sm,
    flex: 1,
  },
  classChipTime: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  classChipTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  classChipRoom: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  quietDayCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  quietDayText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    flex: 1,
  },
  dayOffCard: {
    padding: spacing.md,
  },
  dayOffRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayOffTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  streakSafePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.emerald}18`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${colors.emerald}40`,
  },
  streakSafeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.emerald,
  },
  dayOffSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  todayTaskCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  todayTaskRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskCheckTouch: {
    marginRight: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckbox: {
    alignItems: "center",
    justifyContent: "center",
  },
  todayTaskInfo: {
    flex: 1,
  },
  taskSubMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  taskSubDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  taskSubName: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  todayTaskTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: 4,
  },
  taskMetaBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  taskDurationText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  allTasksDoneCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  allTasksDoneTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  allTasksDoneSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiScheduleCard: {
    padding: spacing.md,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  aiCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  aiCardSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiCardActionRow: {
    marginTop: spacing.sm + 4,
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
