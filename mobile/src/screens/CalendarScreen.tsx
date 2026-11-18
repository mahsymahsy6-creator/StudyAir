import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  parseISO,
  subMonths,
  addMonths,
} from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { Task, StudyBlock, Subject } from "../types";
import { formatLocaleDate } from "../lib/dateUtils";
import { t } from "../lib/i18n";
import { HapticFeedback } from "../lib/haptics";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { Card } from "../components/common/Card";
import { StatusPill } from "../components/common/StatusPill";
import { EmptyState } from "../components/common/EmptyState";
import { DaysOffModal } from "../components/calendar/DaysOffModal";
import { ClassOverrideModal, ClassOverrideTarget } from "../components/calendar/ClassOverrideModal";
import { CreateScheduleSheet } from "../components/schedule/CreateScheduleSheet";

export type CalendarViewMode = "agenda" | "timeline" | "month";

export interface UnifiedDayEvent {
  id: string;
  kind: "class" | "study_block" | "deadline" | "exam";
  title: string;
  subtitle: string;
  startTime: string;
  endTime: string;
  color: string;
  isDashed: boolean;
  blockData?: StudyBlock;
}

export function collateDayEvents({
  date,
  timetableItems = [],
  studyBlocks = [],
  tasks = [],
  exams = [],
  subjectsMap = new Map(),
}: {
  date: string;
  timetableItems?: any[];
  studyBlocks?: StudyBlock[];
  tasks?: Task[];
  exams?: any[];
  subjectsMap?: Map<string, Subject>;
}): UnifiedDayEvent[] {
  const events: UnifiedDayEvent[] = [];

  // 1. School Classes (solid)
  for (const item of timetableItems) {
    if (item.kind === "break") continue;
    const sub = subjectsMap.get(item.subjectId);
    events.push({
      id: `class-${item.id || item.entryId || Math.random()}`,
      kind: "class",
      title: sub?.name || sub?.title || item.customLabel || "Kelas",
      subtitle: item.room ? `Ruang ${item.room}` : (item.teacher || "Jadwal Sekolah"),
      startTime: item.startTime || "07:00",
      endTime: item.endTime || "08:00",
      color: sub?.color || sub?.color_hex || colors.primary,
      isDashed: false,
    });
  }

  // 2. Study Blocks (dashed)
  const dayBlocks = studyBlocks.filter(
    (b) => b.date === date && b.status !== "SKIPPED"
  );
  for (const block of dayBlocks) {
    const sub = subjectsMap.get(block.subjectId);
    const task = tasks.find((t) => t.id === block.taskId);
    events.push({
      id: `block-${block.id}`,
      kind: "study_block",
      title: task?.title || "Blok Belajar",
      subtitle: sub?.name ? `Belajar • ${sub.name}` : "Blok Belajar Mandiri",
      startTime: block.startTime,
      endTime: block.endTime,
      color: sub?.color || sub?.color_hex || colors.primary,
      isDashed: true,
      blockData: block,
    });
  }

  // 3. Deadlines (Due on this date)
  const dayTasks = tasks.filter(
    (t) => t.deadlineDate === date && t.status !== "COMPLETED"
  );
  for (const task of dayTasks) {
    const sub = subjectsMap.get(task.subjectId);
    events.push({
      id: `deadline-${task.id}`,
      kind: "deadline",
      title: `Tenggat: ${task.title}`,
      subtitle: sub?.name || "Tugas",
      startTime: "23:59",
      endTime: "23:59",
      color: colors.rose,
      isDashed: false,
    });
  }

  // 4. Exams
  const dayExams = exams.filter((e) => e.date === date);
  for (const exam of dayExams) {
    events.push({
      id: `exam-${exam.id || exam.title}`,
      kind: "exam",
      title: `Ujian: ${exam.title}`,
      subtitle: exam.subjectName || "Ujian Akademik",
      startTime: exam.startTime || "08:00",
      endTime: exam.endTime || "10:00",
      color: colors.accent,
      isDashed: false,
    });
  }

  return events.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function deriveDayIndicators({
  date,
  timetableItems = [],
  studyBlocks = [],
  tasks = [],
  exams = [],
}: {
  date: string;
  timetableItems?: any[];
  studyBlocks?: StudyBlock[];
  tasks?: Task[];
  exams?: any[];
}) {
  const hasClass = timetableItems.some((item) => item.kind !== "break");
  const hasStudyBlock = studyBlocks.some((b) => b.date === date && b.status !== "SKIPPED");
  const hasDeadline = tasks.some((t) => t.deadlineDate === date && t.status !== "COMPLETED");
  const hasExam = exams.some((e) => e.date === date);

  return { hasClass, hasStudyBlock, hasDeadline, hasExam };
}

export interface CalendarScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
  };
  onBack?: () => void;
}

export function CalendarScreen({ navigation, onBack }: CalendarScreenProps) {
  const {
    subjects,
    studyBlocks,
    tasks,
    daysOff,
    overrides,
    timetableEntries,
    periodTimes,
    getEffectiveScheduleForDate,
    streakState,
  } = useMobileStudyStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const today = useMemo(() => parseISO(todayStr), [todayStr]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => parseISO(todayStr));
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(() => parseISO(todayStr));

  // Secondary modals
  const [daysOffModalVisible, setDaysOffModalVisible] = useState(false);
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [scheduleSheetVisible, setScheduleSheetVisible] = useState(false);

  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const sub of subjects) {
      map.set(sub.id, sub);
    }
    return map;
  }, [subjects]);

  // Exams list from subjects
  const allExams = useMemo(() => {
    const list: any[] = [];
    for (const sub of subjects) {
      if (sub.examDate) {
        list.push({
          id: `exam-${sub.id}`,
          date: sub.examDate,
          title: `Ujian ${sub.name}`,
          subjectName: sub.name,
          startTime: "08:00",
          endTime: "10:00",
        });
      }
    }
    return list;
  }, [subjects]);

  // Feed date list: selectedDate minus 1 day through selectedDate plus 13 days (15 days window)
  const agendaDays = useMemo(() => {
    const start = subDays(selectedDate, 1);
    const list: Date[] = [];
    for (let i = 0; i < 14; i++) {
      list.push(addDays(start, i));
    }
    return list;
  }, [selectedDate]);

  // Month days for Date Picker Modal
  const pickerMonthDays = useMemo(() => {
    const monthStart = startOfMonth(pickerMonth);
    const monthEnd = endOfMonth(pickerMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [pickerMonth]);

  const handleStartFocus = (block?: StudyBlock) => {
    if (navigation) {
      if (block) {
        navigation.navigate("Focus", { blockId: block.id, taskId: block.taskId });
      } else {
        navigation.navigate("Focus");
      }
    }
  };

  const isTodaySelected = isSameDay(selectedDate, today);

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        title={t("studyCalendarTitle") || "Kalender"}
        onBack={onBack}
        actions={[
          {
            icon: "ribbon-outline",
            accessibilityLabel: t("settings_exams_title"),
            onPress: () => navigation?.navigate("Exams"),
          },
          {
            icon: "ellipsis-horizontal",
            accessibilityLabel: t("opsi_lainnya"),
            onPress: () => setDaysOffModalVisible(true),
          },
        ]}
      />

      {/* ─── Top Control Strip ─── */}
      <View style={styles.topControlStrip}>
        <View style={styles.topControlLeft}>
          <Ionicons name="calendar" size={16} color={colors.primary} />
          <Text style={styles.currentRangeLabel}>
            {formatLocaleDate(selectedDate, "MMMM yyyy")}
          </Text>
        </View>

        <View style={styles.topControlRight}>
          {/* Jump to Today Button */}
          {!isTodaySelected && (
            <Pressable
              style={styles.todayPillBtn}
              onPress={() => {
                HapticFeedback.light();
                setSelectedDate(today);
              }}
            >
              <Ionicons name="refresh" size={12} color={colors.primary} />
              <Text style={styles.todayPillText}>{t("kembali_ke_hari_ini") || "Hari Ini"}</Text>
            </Pressable>
          )}

          {/* Date Picker Button */}
          <Pressable
            style={styles.datePickerBtn}
            onPress={() => {
              HapticFeedback.light();
              setPickerMonth(selectedDate);
              setDatePickerVisible(true);
            }}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.datePickerBtnText}>{t("pilih_tanggal") || "Pilih Tanggal"}</Text>
          </Pressable>
        </View>
      </View>

      {/* ─── Agenda-Only Minimalist Vertical Feed ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {agendaDays.map((dayDate) => {
          const dateStr = format(dayDate, "yyyy-MM-dd");
          const isCurrentToday = dateStr === todayStr;
          const isSelected = isSameDay(dayDate, selectedDate);
          const daySchedule = getEffectiveScheduleForDate(dayDate);
          const events = collateDayEvents({
            date: dateStr,
            timetableItems: daySchedule.items || [],
            studyBlocks,
            tasks,
            exams: allExams,
            subjectsMap,
          });

          // Header text
          const dayName = isCurrentToday
            ? `${t("today")} • ${formatLocaleDate(dayDate, "EEEE, d MMM")}`
            : dateStr === format(addDays(today, 1), "yyyy-MM-dd")
            ? `${t("tomorrow")} • ${formatLocaleDate(dayDate, "EEEE, d MMM")}`
            : formatLocaleDate(dayDate, "EEEE, d MMMM");

          return (
            <View key={dateStr} style={styles.dayGroupContainer}>
              {/* Day Header Row */}
              <View style={[styles.dayHeaderRow, isCurrentToday && styles.dayHeaderToday]}>
                <View style={styles.dayHeaderTitleGroup}>
                  <Text style={[styles.dayHeaderText, isCurrentToday && styles.dayHeaderTodayText]}>
                    {dayName}
                  </Text>
                  {isCurrentToday && (
                    <View style={styles.todayActiveDot} />
                  )}
                </View>
                <Text style={styles.dayEventCountText}>
                  {events.length > 0 ? `${events.length} agenda` : ""}
                </Text>
              </View>

              {/* Day Content */}
              {daySchedule.isDayOff ? (
                <Card style={styles.dayOffCard}>
                  <View style={styles.dayOffInner}>
                    <Ionicons name="sunny" size={20} color={colors.amber} style={{ marginRight: spacing.sm }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayOffTitle}>Hari Bebas Kelas</Text>
                      <Text style={styles.dayOffSub}>
                        {daySchedule.dayOffReason || "Tidak ada kelas sekolah hari ini. Waktu luang atau belajar mandiri!"}
                      </Text>
                    </View>
                  </View>
                </Card>
              ) : events.length === 0 ? (
                <View style={styles.quietDayRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={styles.quietDayText}>Tidak ada jadwal kelas atau tugas tersimpan.</Text>
                </View>
              ) : (
                <View style={styles.dayEventsList}>
                  {events.map((ev) => {
                    const isStudyBlock = ev.kind === "study_block";
                    const isExam = ev.kind === "exam";
                    const isDeadline = ev.kind === "deadline";

                    return (
                      <Card
                        key={ev.id}
                        style={[
                          styles.eventCard,
                          isStudyBlock && styles.studyBlockCard,
                          isExam && styles.examEventCard,
                          isDeadline && styles.deadlineEventCard,
                        ]}
                        accentColor={ev.color}
                      >
                        <View style={styles.eventCardBody}>
                          {/* Time & Kind badge */}
                          <View style={styles.eventTopRow}>
                            <View style={styles.eventTimeGroup}>
                              <Ionicons
                                name={
                                  isStudyBlock
                                    ? "time-outline"
                                    : isExam
                                    ? "ribbon-outline"
                                    : isDeadline
                                    ? "alert-circle-outline"
                                    : "school-outline"
                                }
                                size={14}
                                color={ev.color}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={[styles.eventTimeText, { color: ev.color }]}>
                                {isDeadline ? "Tenggat Jam 23:59" : `${ev.startTime} - ${ev.endTime}`}
                              </Text>
                            </View>

                            <StatusPill
                              variant={
                                isStudyBlock
                                  ? "purple"
                                  : isExam
                                  ? "amber"
                                  : isDeadline
                                  ? "red"
                                  : "blue"
                              }
                              label={
                                isStudyBlock
                                  ? "Fokus Belajar"
                                  : isExam
                                  ? "Ulangan"
                                  : isDeadline
                                  ? "Deadline"
                                  : "Kelas"
                              }
                            />
                          </View>

                          {/* Event Title & Subtitle */}
                          <Text style={styles.eventTitleText} numberOfLines={2}>
                            {ev.title}
                          </Text>
                          <Text style={styles.eventSubtitleText} numberOfLines={1}>
                            {ev.subtitle}
                          </Text>

                          {/* 1-Tap Mulai Fokus for Study Blocks */}
                          {isStudyBlock && (
                            <View style={styles.eventActionRow}>
                              <Pressable
                                style={styles.startFocusBtn}
                                onPress={() => handleStartFocus(ev.blockData)}
                                accessibilityLabel="Mulai fokus blok ini"
                              >
                                <Ionicons name="play" size={13} color="#FFFFFF" />
                                <Text style={styles.startFocusBtnText}>Mulai Fokus</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      </Card>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ─── Floating Date Picker Modal ─── */}
      {datePickerVisible && (
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalTouchOutside} onPress={() => setDatePickerVisible(false)} />
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Pressable
                onPress={() => setPickerMonth(subMonths(pickerMonth, 1))}
                hitSlop={touchTarget.min / 4}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <Text style={styles.pickerMonthTitle}>
                {formatLocaleDate(pickerMonth, "MMMM yyyy")}
              </Text>
              <Pressable
                onPress={() => setPickerMonth(addMonths(pickerMonth, 1))}
                hitSlop={touchTarget.min / 4}
              >
                <Ionicons name="chevron-forward" size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* Weekday labels */}
            <View style={styles.pickerWeekdayRow}>
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((dayName, idx) => (
                <Text key={idx} style={styles.pickerWeekdayText}>
                  {dayName}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.pickerDaysGrid}>
              {pickerMonthDays.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isDayToday = isSameDay(day, today);
                const dateStr = format(day, "yyyy-MM-dd");
                const daySchedule = getEffectiveScheduleForDate(day);
                const indicators = deriveDayIndicators({
                  date: dateStr,
                  timetableItems: daySchedule.items || [],
                  studyBlocks,
                  tasks,
                  exams: allExams,
                });

                return (
                  <Pressable
                    key={day.toISOString()}
                    style={[
                      styles.pickerDayCell,
                      isSelected && styles.pickerDayCellSelected,
                      isDayToday && !isSelected && styles.pickerDayCellToday,
                    ]}
                    onPress={() => {
                      HapticFeedback.light();
                      setSelectedDate(day);
                      setDatePickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerDayText,
                        isSelected && styles.pickerDayTextSelected,
                        isDayToday && !isSelected && styles.pickerDayTextToday,
                      ]}
                    >
                      {format(day, "d")}
                    </Text>
                    {/* Event dot indicators */}
                    <View style={styles.pickerDotRow}>
                      {indicators.hasClass && <View style={[styles.pickerDot, { backgroundColor: colors.primary }]} />}
                      {indicators.hasStudyBlock && <View style={[styles.pickerDot, { backgroundColor: colors.accent }]} />}
                      {indicators.hasDeadline && <View style={[styles.pickerDot, { backgroundColor: colors.rose }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Close / Cancel Button */}
            <Pressable
              style={styles.pickerCloseBtn}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={styles.pickerCloseBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      )}

      {/* ─── Days Off Modal ─── */}
      <DaysOffModal
        visible={daysOffModalVisible}
        onClose={() => setDaysOffModalVisible(false)}
      />

      {/* ─── Class Override Modal ─── */}
      <ClassOverrideModal
        visible={overrideModalVisible}
        target={null}
        onClose={() => setOverrideModalVisible(false)}
      />

      {/* ─── Create Schedule Sheet ─── */}
      <CreateScheduleSheet
        visible={scheduleSheetVisible}
        onClose={() => setScheduleSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topControlStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  topControlLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentRangeLabel: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  topControlRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  todayPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 4,
  },
  todayPillText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 4,
  },
  datePickerBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.lg,
  },
  dayGroupContainer: {
    gap: spacing.xs,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  dayHeaderToday: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.xs,
  },
  dayHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayHeaderText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  dayHeaderTodayText: {
    color: colors.primary,
  },
  todayActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  dayEventCountText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  dayOffCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayOffInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayOffTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dayOffSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quietDayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
  },
  quietDayText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  dayEventsList: {
    gap: spacing.xs,
  },
  eventCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  studyBlockCard: {
    borderStyle: "dashed",
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  examEventCard: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  deadlineEventCard: {
    backgroundColor: colors.surface,
    borderColor: colors.rose,
  },
  eventCardBody: {
    width: "100%",
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  eventTimeGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventTimeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
  },
  eventTitleText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 2,
  },
  eventSubtitleText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  eventActionRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  startFocusBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 6,
  },
  startFocusBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  // Modal Picker
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalTouchOutside: {
    ...StyleSheet.absoluteFill,
  },
  pickerContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 10,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  pickerMonthTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  pickerWeekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  pickerWeekdayText: {
    width: 38,
    textAlign: "center",
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
  },
  pickerDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  pickerDayCell: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  pickerDayCellSelected: {
    backgroundColor: colors.primary,
  },
  pickerDayCellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  pickerDayText: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  pickerDayTextSelected: {
    color: "#FFFFFF",
    fontWeight: typography.fontWeights.bold,
  },
  pickerDayTextToday: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  pickerDotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 4,
  },
  pickerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pickerCloseBtn: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
  },
  pickerCloseBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
});
