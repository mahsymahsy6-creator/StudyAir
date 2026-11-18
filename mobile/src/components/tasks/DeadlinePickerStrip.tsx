import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { colors, radius, spacing, typography } from "../../theme";
import { DayOff, DeadlineMode, Override, TimetableEntry } from "../../types";
import { calculateNextClassDeadline } from "../../engine/deadlineEngine";
import { formatLocaleDate } from "../../lib/dateUtils";
import { HapticFeedback } from "../../lib/haptics";

const ID_SHORT_WEEKDAYS = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];

export interface CalendarStripDay {
  dateStr: string;
  dayNumber: string;
  monthShort: string;
  weekdayShort: string;
  isToday: boolean;
  isTomorrow: boolean;
  hasSubjectClass: boolean;
  isHoliday: boolean;
}

export function build14DayStrip({
  todayStr,
  subjectId,
  timetableEntries,
  daysOff = [],
  overrides = [],
  daysCount = 14,
}: {
  todayStr: string;
  subjectId: string;
  timetableEntries: TimetableEntry[];
  daysOff?: DayOff[];
  overrides?: Override[];
  daysCount?: number;
}): CalendarStripDay[] {
  const baseDate = startOfDay(parseISO(todayStr));
  const holidaySet = new Set(daysOff.map((d) => d.date));

  const subjectWeekdays = new Set<number>();
  const subjectEntryIds = new Set<string>();
  for (const entry of timetableEntries) {
    if (entry.subjectId === subjectId && (!entry.kind || entry.kind === "class")) {
      subjectWeekdays.add(entry.weekday);
      subjectEntryIds.add(entry.id);
    }
  }

  const result: CalendarStripDay[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = addDays(baseDate, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const jsDay = d.getDay(); // 0=Sun..6=Sat
    const isoWeekday = jsDay === 0 ? 7 : jsDay;
    const isHoliday = holidaySet.has(dateStr);

    const hasAddedOverride = overrides.some(
      (o) => o.date === dateStr && (o.type === "added" || o.type === "swapped") && o.newSubjectId === subjectId
    );
    const hasCancelledOverride = overrides.some(
      (o) => o.date === dateStr && o.type === "cancelled" && subjectEntryIds.has(o.entryId)
    );

    const hasSubjectClass =
      !isHoliday &&
      !hasCancelledOverride &&
      (subjectWeekdays.has(isoWeekday) || hasAddedOverride);

    result.push({
      dateStr,
      dayNumber: format(d, "d"),
      monthShort: formatLocaleDate(d, "MMM"),
      weekdayShort: ID_SHORT_WEEKDAYS[jsDay],
      isToday: i === 0,
      isTomorrow: i === 1,
      hasSubjectClass,
      isHoliday,
    });
  }

  return result;
}

export function formatDeadlineRelativeInfo(
  deadlineStr: string,
  todayStr: string = format(new Date(), "yyyy-MM-dd")
): {
  fullDateLabel: string;
  shortDateLabel: string;
  relativeLabel: string;
  urgency: "overdue" | "today" | "tomorrow" | "soon" | "normal";
} {
  try {
    const deadline = startOfDay(parseISO(deadlineStr));
    const today = startOfDay(parseISO(todayStr));
    const diff = differenceInCalendarDays(deadline, today);
    const fullDateLabel = formatLocaleDate(deadline, "EEEE, d MMM");
    const shortDateLabel = formatLocaleDate(deadline, "EEE, d MMM");

    if (diff < 0) {
      return {
        fullDateLabel,
        shortDateLabel,
        relativeLabel: `Terlambat ${Math.abs(diff)} hari`,
        urgency: "overdue",
      };
    }
    if (diff === 0) {
      return {
        fullDateLabel,
        shortDateLabel,
        relativeLabel: "Hari Ini",
        urgency: "today",
      };
    }
    if (diff === 1) {
      return {
        fullDateLabel,
        shortDateLabel,
        relativeLabel: "Besok",
        urgency: "tomorrow",
      };
    }
    if (diff === 2) {
      return {
        fullDateLabel,
        shortDateLabel,
        relativeLabel: "Lusa (2 hari lagi)",
        urgency: "soon",
      };
    }
    if (diff <= 5) {
      return {
        fullDateLabel,
        shortDateLabel,
        relativeLabel: `${diff} hari lagi`,
        urgency: "soon",
      };
    }
    return {
      fullDateLabel,
      shortDateLabel,
      relativeLabel: `${diff} hari lagi`,
      urgency: "normal",
    };
  } catch {
    return {
      fullDateLabel: deadlineStr,
      shortDateLabel: deadlineStr,
      relativeLabel: deadlineStr,
      urgency: "normal",
    };
  }
}

export interface DeadlinePickerStripProps {
  todayStr: string;
  subjectId: string;
  subjectName?: string;
  subjectColor?: string;
  selectedDate: string;
  selectedMode?: DeadlineMode;
  deadlineMode?: DeadlineMode;
  compact?: boolean;
  timetableEntries: TimetableEntry[];
  daysOff?: DayOff[];
  overrides?: Override[];
  onSelectDeadline: (dateStr: string, mode: DeadlineMode) => void;
}

export function DeadlinePickerStrip({
  todayStr,
  subjectId,
  subjectColor = colors.primary,
  selectedDate,
  selectedMode: selectedModeProp,
  deadlineMode,
  timetableEntries,
  daysOff = [],
  overrides = [],
  onSelectDeadline,
}: DeadlinePickerStripProps) {
  const selectedMode: DeadlineMode = selectedModeProp || deadlineMode || "custom";
  const nextClass1 = useMemo(
    () =>
      calculateNextClassDeadline(subjectId, todayStr, timetableEntries, {
        daysOff,
        overrides,
        afterNClasses: 1,
      }),
    [subjectId, todayStr, timetableEntries, daysOff, overrides]
  );

  const nextClass2 = useMemo(
    () =>
      calculateNextClassDeadline(subjectId, todayStr, timetableEntries, {
        daysOff,
        overrides,
        afterNClasses: 2,
      }),
    [subjectId, todayStr, timetableEntries, daysOff, overrides]
  );

  const stripDays = useMemo(
    () =>
      build14DayStrip({
        todayStr,
        subjectId,
        timetableEntries,
        daysOff,
        overrides,
        daysCount: 14,
      }),
    [todayStr, subjectId, timetableEntries, daysOff, overrides]
  );

  const relInfo = useMemo(
    () => formatDeadlineRelativeInfo(selectedDate, todayStr),
    [selectedDate, todayStr]
  );

  const selectedStripDay = useMemo(
    () => stripDays.find((d) => d.dateStr === selectedDate),
    [stripDays, selectedDate]
  );

  const tomorrowStr = useMemo(
    () => format(addDays(parseISO(todayStr), 1), "yyyy-MM-dd"),
    [todayStr]
  );
  const lusaStr = useMemo(
    () => format(addDays(parseISO(todayStr), 2), "yyyy-MM-dd"),
    [todayStr]
  );
  const nextWeekStr = useMemo(
    () => format(addDays(parseISO(todayStr), 7), "yyyy-MM-dd"),
    [todayStr]
  );

  const next1Date =
    nextClass1.found && nextClass1.deadlineDate ? nextClass1.deadlineDate : tomorrowStr;
  const next2Date =
    nextClass2.found && nextClass2.deadlineDate ? nextClass2.deadlineDate : nextWeekStr;

  const matchesPreset = useMemo(
    () =>
      [next1Date, todayStr, tomorrowStr, lusaStr, next2Date, nextWeekStr].includes(selectedDate),
    [next1Date, todayStr, tomorrowStr, lusaStr, next2Date, nextWeekStr, selectedDate]
  );

  const [showCalendar, setShowCalendar] = useState(!matchesPreset);

  const urgencyColor =
    relInfo.urgency === "overdue"
      ? colors.danger
      : relInfo.urgency === "today"
      ? colors.amber
      : relInfo.urgency === "tomorrow"
      ? colors.primary
      : colors.emerald;

  return (
    <View style={styles.wrapper}>
      {/* ─── 1. Live Resolved Deadline Summary Banner ─── */}
      <View style={styles.summaryBanner}>
        <View style={[styles.summaryIconBox, { backgroundColor: `${urgencyColor}18` }]}>
          <Ionicons
            name={
              selectedMode === "nextClass" || selectedMode === "afterNClasses"
                ? "school"
                : "calendar"
            }
            size={18}
            color={urgencyColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryDateText}>{relInfo.fullDateLabel}</Text>
            <View style={[styles.relativePill, { backgroundColor: `${urgencyColor}18` }]}>
              <Text style={[styles.relativePillText, { color: urgencyColor }]}>
                {relInfo.relativeLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.summarySubText}>
            {selectedMode === "nextClass" && nextClass1.found
              ? "Otomatis mengikuti jadwal pertemuan kelas berikutnya"
              : selectedMode === "afterNClasses" && nextClass2.found
              ? "Otomatis mengikuti jadwal 2 pertemuan ke depan"
              : selectedStripDay?.hasSubjectClass
              ? "Ada jadwal kelas mata pelajaran ini di hari tersebut"
              : "Tanggal tenggat pengumpulan tugas"}
          </Text>
        </View>
      </View>

      {/* ─── 2. One-Tap Smart Presets Row ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsScroll}
      >
        {/* Pertemuan Depan */}
        <Pressable
          style={[
            styles.presetChip,
            selectedMode === "nextClass" &&
              selectedDate === next1Date &&
              styles.presetChipActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            onSelectDeadline(next1Date, "nextClass");
          }}
        >
          <Ionicons
            name="school-outline"
            size={13}
            color={
              selectedMode === "nextClass" && selectedDate === next1Date
                ? colors.primary
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.presetChipTitle,
              selectedMode === "nextClass" &&
                selectedDate === next1Date &&
                styles.presetChipTitleActive,
            ]}
          >
            Kelas Depan ({formatLocaleDate(parseISO(next1Date), "EEE, d MMM")})
          </Text>
        </Pressable>

        {/* Hari Ini */}
        <Pressable
          style={[
            styles.presetChip,
            selectedDate === todayStr &&
              selectedMode !== "nextClass" &&
              styles.presetChipActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            onSelectDeadline(todayStr, "custom");
          }}
        >
          <Ionicons
            name="flash-outline"
            size={13}
            color={
              selectedDate === todayStr && selectedMode !== "nextClass"
                ? colors.primary
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.presetChipTitle,
              selectedDate === todayStr &&
                selectedMode !== "nextClass" &&
                styles.presetChipTitleActive,
            ]}
          >
            Hari Ini
          </Text>
        </Pressable>

        {/* Besok */}
        <Pressable
          style={[
            styles.presetChip,
            selectedDate === tomorrowStr &&
              selectedMode !== "nextClass" &&
              styles.presetChipActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            onSelectDeadline(tomorrowStr, "custom");
          }}
        >
          <Ionicons
            name="sunny-outline"
            size={13}
            color={
              selectedDate === tomorrowStr && selectedMode !== "nextClass"
                ? colors.primary
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.presetChipTitle,
              selectedDate === tomorrowStr &&
                selectedMode !== "nextClass" &&
                styles.presetChipTitleActive,
            ]}
          >
            Besok
          </Text>
        </Pressable>

        {/* Lusa */}
        <Pressable
          style={[
            styles.presetChip,
            selectedDate === lusaStr &&
              selectedMode !== "nextClass" &&
              styles.presetChipActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            onSelectDeadline(lusaStr, "custom");
          }}
        >
          <Ionicons
            name="calendar-number-outline"
            size={13}
            color={
              selectedDate === lusaStr && selectedMode !== "nextClass"
                ? colors.primary
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.presetChipTitle,
              selectedDate === lusaStr &&
                selectedMode !== "nextClass" &&
                styles.presetChipTitleActive,
            ]}
          >
            Lusa
          </Text>
        </Pressable>

        {/* 2 Pertemuan */}
        <Pressable
          style={[
            styles.presetChip,
            selectedMode === "afterNClasses" &&
              selectedDate === next2Date &&
              styles.presetChipActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            onSelectDeadline(next2Date, "afterNClasses");
          }}
        >
          <Ionicons
            name="repeat-outline"
            size={13}
            color={
              selectedMode === "afterNClasses" && selectedDate === next2Date
                ? colors.primary
                : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.presetChipTitle,
              selectedMode === "afterNClasses" &&
                selectedDate === next2Date &&
                styles.presetChipTitleActive,
            ]}
          >
            2 Pertemuan ({formatLocaleDate(parseISO(next2Date), "d MMM")})
          </Text>
        </Pressable>

        {/* Minggu Depan */}
        <Pressable
          style={[
            styles.presetChip,
            selectedDate === nextWeekStr &&
              selectedMode === "custom" &&
              styles.presetChipActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            onSelectDeadline(nextWeekStr, "custom");
          }}
        >
          <Text
            style={[
              styles.presetChipTitle,
              selectedDate === nextWeekStr &&
                selectedMode === "custom" &&
                styles.presetChipTitleActive,
            ]}
          >
            +1 Minggu
          </Text>
        </Pressable>

        {/* Pilih tanggal toggle */}
        <Pressable
          style={[
            styles.presetChip,
            (showCalendar || !matchesPreset) && styles.presetChipActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            setShowCalendar((prev) => !prev);
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={13}
            color={
              showCalendar || !matchesPreset ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.presetChipTitle,
              (showCalendar || !matchesPreset) && styles.presetChipTitleActive,
            ]}
          >
            Pilih tanggal
          </Text>
        </Pressable>
      </ScrollView>

      {/* ─── 3. Visual 14-Day Calendar Strip with Class-Day Markers ─── */}
      {(showCalendar || !matchesPreset) && (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.calendarStripScroll}
      >
        {stripDays.map((day) => {
          const isSelected = day.dateStr === selectedDate;
          return (
            <Pressable
              key={day.dateStr}
              style={[
                styles.dayCell,
                day.hasSubjectClass && styles.dayCellWithClass,
                isSelected && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primaryLight,
                },
              ]}
              onPress={() => {
                HapticFeedback.light();
                const isNext1 = nextClass1.found && nextClass1.deadlineDate === day.dateStr;
                onSelectDeadline(day.dateStr, isNext1 ? "nextClass" : "custom");
              }}
            >
              <Text
                style={[
                  styles.dayWeekdayText,
                  day.isToday && { color: colors.amber, fontWeight: "800" },
                  isSelected && { color: colors.primary, fontWeight: "800" },
                ]}
              >
                {day.isToday ? "HARI INI" : day.isTomorrow ? "BESOK" : day.weekdayShort}
              </Text>
              <Text
                style={[
                  styles.dayNumberText,
                  isSelected && { color: colors.primary, fontWeight: "800" },
                ]}
              >
                {day.dayNumber}
              </Text>
              <Text style={styles.dayMonthText}>{day.monthShort}</Text>

              {/* Class / Holiday Bottom Marker */}
              {day.hasSubjectClass ? (
                <View
                  style={[
                    styles.classMarkerPill,
                    { backgroundColor: `${subjectColor}22`, borderColor: subjectColor },
                  ]}
                >
                  <View style={[styles.classMarkerDot, { backgroundColor: subjectColor }]} />
                  <Text style={[styles.classMarkerText, { color: colors.text }]}>Kelas</Text>
                </View>
              ) : day.isHoliday ? (
                <Text style={styles.holidayMarkerText}>Libur</Text>
              ) : (
                <View style={styles.emptyMarkerSpacer} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  summaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  summaryDateText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  relativePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  relativePillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  summarySubText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inlineStepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  miniStepBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  presetsScroll: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetChipTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  presetChipTitleActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  calendarStripScroll: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  dayCell: {
    width: 60,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayCellWithClass: {
    borderColor: colors.border,
  },
  dayWeekdayText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  dayMonthText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  classMarkerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  classMarkerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  classMarkerText: {
    fontSize: 8,
    fontWeight: typography.fontWeights.bold,
  },
  holidayMarkerText: {
    fontSize: 8,
    fontWeight: typography.fontWeights.bold,
    color: colors.rose,
  },
  emptyMarkerSpacer: {
    height: 14,
  },
});
