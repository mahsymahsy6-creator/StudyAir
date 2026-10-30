import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  LayoutAnimation,
} from "react-native";
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
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
import { PrimaryButton } from "../components/common/PrimaryButton";
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
      id: `class-${item.id}`,
      kind: "class",
      title: sub?.name || item.customLabel || "Kelas",
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

const WEEKDAY_NAMES_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const ALL_DAY_HOURS = Array.from({ length: 16 }).map((_, i) => i + 7); // 07:00 to 22:00
const HOUR_HEIGHT = 68;

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
    timetableEntries,
    periodTimes,
    daysOff,
    overrides,
    streakState,
    getEffectiveScheduleForDate,
    toggleBlockCompletion,
  } = useMobileStudyStore();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("agenda");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Modals
  const [createScheduleVisible, setCreateScheduleVisible] = useState(false);
  const [daysOffModalVisible, setDaysOffModalVisible] = useState(false);
  const [overrideModalVisible, setOverrideModalVisible] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<ClassOverrideTarget | null>(null);

  const selectedDateStr = useMemo(() => format(selectedDate, "yyyy-MM-dd"), [selectedDate]);

  const subjectsMap = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const sub of subjects) {
      map.set(sub.id, sub);
    }
    return map;
  }, [subjects]);

  // Timetable items for selected date
  const effectiveSchedule = useMemo(() => {
    return getEffectiveScheduleForDate(selectedDate);
  }, [getEffectiveScheduleForDate, selectedDate]);

  // Unified day events
  const dayEvents = useMemo(() => {
    return collateDayEvents({
      date: selectedDateStr,
      timetableItems: effectiveSchedule.items,
      studyBlocks,
      tasks,
      subjectsMap,
    });
  }, [selectedDateStr, effectiveSchedule.items, studyBlocks, tasks, subjectsMap]);

  // Week days for Agenda week strip
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  // Month days for Bulan view
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const handleSelectDate = (date: Date) => {
    HapticFeedback.light();
    setSelectedDate(date);
  };

  const handleToggleBlock = (blockId: string) => {
    HapticFeedback.taskToggle();
    toggleBlockCompletion(blockId);
  };

  const handleStartFocus = (block: StudyBlock) => {
    HapticFeedback.light();
    navigation?.navigate("Focus", { blockId: block.id, taskId: block.taskId });
  };

  const handleViewModeChange = (mode: CalendarViewMode) => {
    HapticFeedback.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setViewMode(mode);
  };

  // Convert time "HH:mm" to pixels from 07:00
  const timeToPixelOffset = (timeStr: string) => {
    const [hh, mm] = timeStr.split(":").map(Number);
    const totalMinutes = (hh - 7) * 60 + mm;
    return (totalMinutes / 60) * HOUR_HEIGHT;
  };

  const calculateDurationPixels = (startTime: string, endTime: string) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diffMin = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(36, (diffMin / 60) * HOUR_HEIGHT);
  };

  return (
    <View style={styles.container}>
      {/* ─── Header ─── */}
      <ScreenHeader
        title={t("studyCalendarTitle")}
        streakText={streakState.currentStreak > 0 ? `${streakState.currentStreak} hari` : undefined}
        onBack={onBack}
        actions={[
          {
            icon: "options-outline",
            onPress: () => setDaysOffModalVisible(true),
            accessibilityLabel: "Atur Hari Libur",
          },
        ]}
      />

      {/* ─── View Mode Switcher (Agenda | Garis Waktu | Bulan) ─── */}
      <View style={styles.modeSwitcherContainer}>
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segmentBtn, viewMode === "agenda" && styles.segmentBtnActive]}
            onPress={() => handleViewModeChange("agenda")}
            hitSlop={touchTarget.min / 4}
          >
            <Text style={[styles.segmentText, viewMode === "agenda" && styles.segmentTextActive]}>
              {t("view_agenda")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, viewMode === "timeline" && styles.segmentBtnActive]}
            onPress={() => handleViewModeChange("timeline")}
            hitSlop={touchTarget.min / 4}
          >
            <Text style={[styles.segmentText, viewMode === "timeline" && styles.segmentTextActive]}>
              {t("view_garis_waktu")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, viewMode === "month" && styles.segmentBtnActive]}
            onPress={() => handleViewModeChange("month")}
            hitSlop={touchTarget.min / 4}
          >
            <Text style={[styles.segmentText, viewMode === "month" && styles.segmentTextActive]}>
              {t("view_bulan")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ─── 1 & 2. Week Strip (Shared for Agenda & Timeline Views) ─── */}
      {(viewMode === "agenda" || viewMode === "timeline") && (
        <View style={styles.weekStripContainer}>
          <View style={styles.weekNavRow}>
            <Pressable
              onPress={() => setSelectedDate(subWeeks(selectedDate, 1))}
              hitSlop={touchTarget.min / 4}
              style={styles.weekNavArrow}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>

            <Text style={styles.weekNavTitle}>
              {formatLocaleDate(weekDays[0], "d MMM")} – {formatLocaleDate(weekDays[6], "d MMM yyyy")}
            </Text>

            <Pressable
              onPress={() => setSelectedDate(addWeeks(selectedDate, 1))}
              hitSlop={touchTarget.min / 4}
              style={styles.weekNavArrow}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.weekDaysRow}>
            {weekDays.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const dayStr = format(day, "yyyy-MM-dd");
              const indicators = deriveDayIndicators({
                date: dayStr,
                studyBlocks,
                tasks,
              });

              return (
                <Pressable
                  key={idx}
                  style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                  onPress={() => handleSelectDate(day)}
                >
                  <Text style={[styles.dayChipName, isSelected && styles.dayChipTextSelected]}>
                    {WEEKDAY_NAMES_ID[idx]}
                  </Text>
                  <Text style={[styles.dayChipNumber, isSelected && styles.dayChipTextSelected]}>
                    {format(day, "d")}
                  </Text>
                  <View style={styles.dotRow}>
                    {indicators.hasStudyBlock && <View style={[styles.indicatorDot, { backgroundColor: colors.primary }]} />}
                    {indicators.hasDeadline && <View style={[styles.indicatorDot, { backgroundColor: colors.rose }]} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* ─── 1. AGENDA VIEW ─── */}
      {viewMode === "agenda" && (
        <View style={styles.contentFlex}>
          {/* Agenda Event List */}
          <ScrollView
            style={styles.agendaScrollView}
            contentContainerStyle={styles.agendaScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {effectiveSchedule.isDayOff && (
              <View style={styles.dayOffBanner}>
                <Ionicons name="sunny-outline" size={18} color={colors.amber} />
                <Text style={styles.dayOffBannerText}>
                  Hari Libur: {effectiveSchedule.dayOffReason || "Libur Sekolah"}
                </Text>
              </View>
            )}

            {dayEvents.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
                <EmptyState
                  icon="calendar-outline"
                  message={t("tidak_ada_jadwal_hari_ini")}
                  subMessage="Ketuk Susun Jadwal untuk menyusun blok belajar"
                />
                <View style={{ marginTop: spacing.md, width: "100%", maxWidth: 280 }}>
                  <PrimaryButton
                    label={t("susun_jadwal_hari_ini") || "Susun Jadwal Hari Ini"}
                    onPress={() => setCreateScheduleVisible(true)}
                  />
                </View>
              </View>
            ) : (
              dayEvents.map((event) => {
                const isBlock = event.kind === "study_block";
                const isDone = event.blockData?.status === "COMPLETED";

                return (
                  <Card
                    key={event.id}
                    variant={event.isDashed ? "dashed" : "solid"}
                    accentColor={event.color}
                    style={[styles.agendaCard, isDone && styles.completedBlockCard]}
                  >
                    <View style={styles.agendaCardRow}>
                      <View style={styles.timeColumn}>
                        <Text style={styles.startTimeText}>{event.startTime}</Text>
                        <Text style={styles.endTimeText}>{event.endTime}</Text>
                      </View>

                      <View style={styles.agendaInfoColumn}>
                        <View style={styles.agendaTagRow}>
                          <StatusPill
                            variant={isBlock ? "blue" : event.kind === "class" ? "green" : "red"}
                            label={
                              isBlock
                                ? t("blok_belajar")
                                : event.kind === "class"
                                ? t("kelas_sekolah")
                                : t("tenggat_tugas")
                            }
                          />
                        </View>

                        <Text style={[styles.agendaTitle, isDone && styles.completedText]} numberOfLines={2}>
                          {event.title}
                        </Text>
                        <Text style={styles.agendaSubtitle} numberOfLines={1}>
                          {event.subtitle}
                        </Text>
                      </View>

                      {isBlock && event.blockData && (
                        <View style={styles.blockActionColumn}>
                          <Pressable
                            style={[styles.blockCheckBtn, isDone && styles.blockCheckBtnActive]}
                            onPress={() => handleToggleBlock(event.blockData!.id)}
                            hitSlop={touchTarget.min / 4}
                          >
                            <Ionicons
                              name={isDone ? "checkmark" : "checkmark-outline"}
                              size={18}
                              color={isDone ? colors.textInverse : colors.primary}
                            />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* ─── 2. TIMELINE VIEW (Garis Waktu) ─── */}
      {viewMode === "timeline" && (
        <ScrollView style={styles.timelineScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.timelineContainer}>
            {/* Time labels column */}
            <View style={styles.timelineHoursColumn}>
              {ALL_DAY_HOURS.map((hour) => (
                <View key={hour} style={[styles.hourRow, { height: HOUR_HEIGHT }]}>
                  <Text style={styles.hourLabel}>
                    {hour < 10 ? `0${hour}:00` : `${hour}:00`}
                  </Text>
                </View>
              ))}
            </View>

            {/* Grid & Positioned Cards column */}
            <View style={styles.timelineGridColumn}>
              {ALL_DAY_HOURS.map((hour) => (
                <View key={hour} style={[styles.gridHourRow, { height: HOUR_HEIGHT }]} />
              ))}

              {/* Render Positioned Event Cards */}
              {dayEvents
                .filter((e) => e.startTime >= "07:00" && e.startTime <= "22:00")
                .map((event) => {
                  const top = timeToPixelOffset(event.startTime);
                  const height = calculateDurationPixels(event.startTime, event.endTime);

                  return (
                    <View
                      key={event.id}
                      style={[
                        styles.positionedCard,
                        {
                          top,
                          height,
                          borderLeftColor: event.color,
                          backgroundColor: event.isDashed ? colors.blockSurface : colors.surface,
                          borderStyle: event.isDashed ? "dashed" : "solid",
                          borderColor: event.isDashed ? colors.blockBorder : colors.borderLight,
                        },
                      ]}
                    >
                      <Text style={styles.positionedTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.positionedTime} numberOfLines={1}>
                        {event.startTime} - {event.endTime}
                      </Text>
                    </View>
                  );
                })}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ─── 3. MONTH VIEW (Bulan) ─── */}
      {viewMode === "month" && (
        <ScrollView style={styles.monthScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.monthNavRow}>
            <Pressable
              onPress={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              hitSlop={touchTarget.min / 4}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.monthNavTitle}>
              {formatLocaleDate(calendarMonth, "MMMM yyyy")}
            </Text>
            <Pressable
              onPress={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              hitSlop={touchTarget.min / 4}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={styles.monthDaysHeaderRow}>
            {WEEKDAY_NAMES_ID.map((name, i) => (
              <Text key={i} style={styles.monthDayHeaderLabel}>
                {name}
              </Text>
            ))}
          </View>

          {/* Month grid */}
          <View style={styles.monthGrid}>
            {monthDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate);
              const inCurrentMonth = isSameMonth(day, calendarMonth);
              const isToday = isSameDay(day, new Date());
              const dayStr = format(day, "yyyy-MM-dd");
              const indicators = deriveDayIndicators({
                date: dayStr,
                studyBlocks,
                tasks,
              });

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.monthCell,
                    isSelected && styles.monthCellSelected,
                    !inCurrentMonth && styles.monthCellFaded,
                  ]}
                  onPress={() => handleSelectDate(day)}
                >
                  <Text
                    style={[
                      styles.monthCellText,
                      isToday && styles.monthCellToday,
                      isSelected && styles.monthCellTextSelected,
                    ]}
                  >
                    {format(day, "d")}
                  </Text>
                  <View style={styles.monthDotRow}>
                    {indicators.hasStudyBlock && (
                      <View style={[styles.indicatorDot, { backgroundColor: colors.primary }]} />
                    )}
                    {indicators.hasDeadline && (
                      <View style={[styles.indicatorDot, { backgroundColor: colors.rose }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Selected Date Summary below month grid */}
          <View style={styles.monthDetailContainer}>
            <Text style={styles.monthDetailDateHeader}>
              {formatLocaleDate(selectedDate, "EEEE, d MMMM yyyy")}
            </Text>
            {dayEvents.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                message={t("tidak_ada_jadwal_hari_ini")}
                compact
              />
            ) : (
              dayEvents.map((event) => (
                <Card
                  key={event.id}
                  variant={event.isDashed ? "dashed" : "solid"}
                  accentColor={event.color}
                  style={styles.monthDetailCard}
                >
                  <View style={styles.agendaCardRow}>
                    <View style={styles.timeColumn}>
                      <Text style={styles.startTimeText}>{event.startTime}</Text>
                    </View>
                    <View style={styles.agendaInfoColumn}>
                      <Text style={styles.agendaTitle} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={styles.agendaSubtitle} numberOfLines={1}>
                        {event.subtitle}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* ─── Days Off Modal ─── */}
      <DaysOffModal
        visible={daysOffModalVisible}
        onClose={() => setDaysOffModalVisible(false)}
      />

      {/* ─── Class Override Modal ─── */}
      <ClassOverrideModal
        visible={overrideModalVisible}
        target={overrideTarget}
        onClose={() => {
          setOverrideModalVisible(false);
          setOverrideTarget(null);
        }}
      />

      {/* ─── Create Schedule Sheet ─── */}
      <CreateScheduleSheet
        visible={createScheduleVisible}
        onClose={() => setCreateScheduleVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentFlex: {
    flex: 1,
  },
  modeSwitcherContainer: {
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: radius.xs,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },

  // Week strip
  weekStripContainer: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  weekNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  weekNavArrow: {
    padding: spacing.xs,
  },
  weekNavTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayChip: {
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    minWidth: 42,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
  },
  dayChipName: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
    marginBottom: 2,
  },
  dayChipNumber: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dayChipTextSelected: {
    color: colors.textInverse,
  },
  dotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 3,
    height: 4,
  },
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Agenda view
  agendaScrollView: {
    flex: 1,
  },
  agendaScrollContent: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  dayOffBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.amberLight,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.amber,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  dayOffBannerText: {
    fontSize: typography.fontSizes.body,
    color: colors.amber,
    fontWeight: typography.fontWeights.medium,
  },
  agendaCard: {
    marginBottom: spacing.sm,
  },
  completedBlockCard: {
    opacity: 0.6,
  },
  agendaCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeColumn: {
    width: 60,
    paddingRight: spacing.xs,
  },
  startTimeText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  endTimeText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  agendaInfoColumn: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  agendaTagRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  agendaTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  completedText: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  agendaSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  blockActionColumn: {
    paddingLeft: spacing.xs,
  },
  blockCheckBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  blockCheckBtnActive: {
    backgroundColor: colors.primary,
  },

  // Timeline view
  timelineScrollView: {
    flex: 1,
  },
  timelineContainer: {
    flexDirection: "row",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  timelineHoursColumn: {
    width: 54,
    alignItems: "center",
  },
  hourRow: {
    justifyContent: "flex-start",
  },
  hourLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  timelineGridColumn: {
    flex: 1,
    position: "relative",
    borderLeftWidth: 1,
    borderLeftColor: colors.borderLight,
    paddingRight: tidySpacing.screen,
  },
  gridHourRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  positionedCard: {
    position: "absolute",
    left: 4,
    right: tidySpacing.screen,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: 4,
    borderWidth: 1,
    justifyContent: "center",
  },
  positionedTitle: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  positionedTime: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Month view
  monthScrollView: {
    flex: 1,
    paddingHorizontal: tidySpacing.screen,
  },
  monthNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  monthNavTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  monthDaysHeaderRow: {
    flexDirection: "row",
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  monthDayHeaderLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: spacing.xs,
  },
  monthCell: {
    width: "14.28%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  monthCellSelected: {
    backgroundColor: colors.primary,
  },
  monthCellFaded: {
    opacity: 0.35,
  },
  monthCellText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  monthCellTextSelected: {
    color: colors.textInverse,
    fontWeight: typography.fontWeights.bold,
  },
  monthCellToday: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  monthDotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
    height: 4,
  },
  monthDetailContainer: {
    marginTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  monthDetailDateHeader: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  monthDetailCard: {
    marginBottom: spacing.xs,
  },
});
