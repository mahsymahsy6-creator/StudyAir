/**
 * StudyAir Mobile — Timetable Day View Component (Step 2, 3, 4 Polish)
 * 
 * Features:
 * - Single source of truth via getDayItems:
 *   Every header count matches rendered rows exactly ("6 pelajaran - 10 JP - 07:00-14:30").
 * - Empty state appears ONLY when getDayItems returns zero items.
 * - Merged consecutive classes, expandable to show atomic periods.
 * - Breaks shown as thin gray dividers.
 * - Conflicts shown with red styling, "Konflik Jam" badge, and Keep/Delete actions.
 * - Orphans shown as "Mapel hilang" with a "Pilih mapel" relink action.
 * - "Rapikan otomatis" banner when conflicts or duplicates exist.
 * - Debug assertion verifies header count equals rendered rows.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  PanResponder,
  Animated,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, tidySpacing } from "../../theme";
import { t, getLanguage } from "../../lib/i18n";
import { HapticFeedback } from "../../lib/haptics";
import { Subject, TimetableEntry, PeriodTime } from "../../types";
import { BottomSheet } from "../common/BottomSheet";
import { StatusPill } from "../common/StatusPill";
import { SecondaryButton } from "../common/SecondaryButton";
import {
  getTodayWeekday,
  WEEKDAYS,
} from "../../lib/timetableGrouping";
import {
  getDayItems,
  DayScheduleItem,
  DayScheduleSummary,
  assertDayHeaderCountMatches,
} from "../../lib/daySchedule";

interface TimetableDayViewProps {
  entries: TimetableEntry[];
  subjects: Subject[];
  periodTimes: PeriodTime[];
  initialDay?: number;
  navigationNonce?: number;
  onAddClass: (day: number) => void;
  onEditClass: (entry: TimetableEntry) => void;
  onCopyDay: (fromDay: number) => void;
  onRelinkOrphan?: (entryId: string, newSubjectId: string) => void;
  onDeleteEntry?: (id: string) => void;
  onRapikanDuplicates?: () => void;
}

export function TimetableDayView({
  entries,
  subjects,
  periodTimes,
  initialDay,
  navigationNonce,
  onAddClass,
  onEditClass,
  onCopyDay,
  onRelinkOrphan,
  onDeleteEntry,
  onRapikanDuplicates,
}: TimetableDayViewProps) {
  const todayWeekday = getTodayWeekday();

  // Available weekdays: Monday (1) to Saturday (6). If Sunday has entries, include Sunday (7).
  const availableDays = useMemo(() => {
    const hasSunday = entries.some((e) => e.weekday === 7);
    const maxDay = hasSunday ? 7 : 6;
    return WEEKDAYS.filter((w) => w.day <= maxDay);
  }, [entries]);

  // Selected day state (defaults to today if within available days, else day 1)
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    if (initialDay && availableDays.some((w) => w.day === initialDay)) return initialDay;
    const isTodayAvailable = availableDays.some((w) => w.day === todayWeekday);
    return isTodayAvailable ? todayWeekday : 1;
  });

  // Sync selectedDay whenever initialDay or navigationNonce changes from outside
  useEffect(() => {
    if (initialDay && availableDays.some((w) => w.day === initialDay)) {
      setSelectedDay(initialDay);
    }
  }, [initialDay, navigationNonce, availableDays]);

  // Week A/B pattern filter state
  const [activeWeekPattern, setActiveWeekPattern] = useState<"all" | "A" | "B">("all");

  // Expanded merged class blocks state (id -> boolean)
  const [expandedBlockIds, setExpandedBlockIds] = useState<Record<string, boolean>>({});

  // Orphan subject picker modal state
  const [relinkModalTarget, setRelinkModalTarget] = useState<DayScheduleItem | null>(null);

  // Selected class for detail sheet
  const [selectedDetailItem, setSelectedDetailItem] = useState<DayScheduleItem | null>(null);

  // Animation for smooth day transition
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const triggerDayChange = (newDay: number) => {
    if (newDay === selectedDay) return;
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setSelectedDay(newDay);
  };

  // ─── Single Source of Truth for Current Day ───
  const currentLang = getLanguage();
  const daySchedule: DayScheduleSummary = useMemo(() => {
    return getDayItems(selectedDay, {
      timetableEntries: entries,
      subjects,
      periodTimes,
      activeWeekPattern,
      language: currentLang,
    });
  }, [selectedDay, entries, subjects, periodTimes, activeWeekPattern, currentLang]);

  // Check if any entries in dataset have A/B week pattern
  const hasWeekPatternAB = useMemo(() => {
    return entries.some((e) => e.weekPattern === "A" || e.weekPattern === "B");
  }, [entries]);

  // Precompute class counts per available day for day tabs
  const dayTabCounts = useMemo(() => {
    const countsMap = new Map<number, number>();
    for (const w of availableDays) {
      const summary = getDayItems(w.day, {
        timetableEntries: entries,
        subjects,
        periodTimes,
        activeWeekPattern,
        language: currentLang,
      });
      countsMap.set(w.day, summary.classCount);
    }
    return countsMap;
  }, [availableDays, entries, subjects, periodTimes, activeWeekPattern, currentLang]);

  const currentMeta = WEEKDAYS.find((w) => w.day === selectedDay);
  const currentDayName = currentMeta ? (currentLang === "en" ? currentMeta.nameEn : currentMeta.nameId) : (currentLang === "en" ? "Monday" : "Senin");

  // ─── Debug Assertion (Step 2 requirement) ───
  useEffect(() => {
    assertDayHeaderCountMatches(
      daySchedule.classCount,
      daySchedule.classBlocks.length,
      `[Pelajaran Per Hari: ${currentDayName}]`
    );
  }, [daySchedule.classCount, daySchedule.classBlocks.length, currentDayName]);

  const toggleExpand = (id: string) => {
    setExpandedBlockIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleKeepConflictEntry = (keepEntry: TimetableEntry, allConflicts?: TimetableEntry[]) => {
    if (!allConflicts || !onDeleteEntry) return;
    for (const other of allConflicts) {
      if (other.id !== keepEntry.id) {
        onDeleteEntry(other.id);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Horizontal Day Tabs (Sen to Sab) ─── */}
      <View style={styles.dayTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsScroll}
        >
          {availableDays.map((w) => {
            const isSelected = w.day === selectedDay;
            const isToday = w.day === todayWeekday;
            const classesCount = dayTabCounts.get(w.day) || 0;

            return (
              <Pressable
                key={w.day}
                style={[styles.dayTabItem, isSelected && styles.dayTabItemActive]}
                onPress={() => {
                  HapticFeedback.light();
                  triggerDayChange(w.day);
                }}
                hitSlop={8}
              >
                <View style={styles.dayTabLabelRow}>
                  <Text style={[styles.dayTabLabel, isSelected && styles.dayTabLabelActive]}>
                    {currentLang === "en" ? w.shortEn : w.shortId}
                  </Text>
                  {isToday && <View style={styles.todayDot} />}
                </View>

                <Text style={[styles.dayTabClassCount, isSelected && styles.dayTabClassCountActive]}>
                  {classesCount > 0 ? `${classesCount}` : "-"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── WeekPattern A/B Toggle (if A/B exists) ─── */}
      {hasWeekPatternAB && (
        <View style={styles.abToggleRow}>
          <Text style={styles.abToggleLabel}>Pekan:</Text>
          <View style={styles.abToggleGroup}>
            <Pressable
              style={[styles.abToggleBtn, activeWeekPattern === "all" && styles.abToggleBtnActive]}
              onPress={() => setActiveWeekPattern("all")}
            >
              <Text
                style={[
                  styles.abToggleText,
                  activeWeekPattern === "all" && styles.abToggleTextActive,
                ]}
              >
                Semua
              </Text>
            </Pressable>
            <Pressable
              style={[styles.abToggleBtn, activeWeekPattern === "A" && styles.abToggleBtnActive]}
              onPress={() => setActiveWeekPattern("A")}
            >
              <Text
                style={[
                  styles.abToggleText,
                  activeWeekPattern === "A" && styles.abToggleTextActive,
                ]}
              >
                Pekan A
              </Text>
            </Pressable>
            <Pressable
              style={[styles.abToggleBtn, activeWeekPattern === "B" && styles.abToggleBtnActive]}
              onPress={() => setActiveWeekPattern("B")}
            >
              <Text
                style={[
                  styles.abToggleText,
                  activeWeekPattern === "B" && styles.abToggleTextActive,
                ]}
              >
                Pekan B
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ─── Main Animated Day Content ─── */}
      <Animated.View style={[styles.dayContentArea, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.dayScroll}
          contentContainerStyle={styles.dayScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Day Header: "6 pelajaran - 10 JP - 07:00-14:30" */}
          <View style={styles.dayHeaderCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.dayHeaderTitleRow}>
                <Text style={styles.dayHeaderTitle}>{currentDayName}</Text>
                {selectedDay === todayWeekday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayBadgeText}>{t("today")}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.dayHeaderSubtitle}>
                {daySchedule.headerSummary}
              </Text>
            </View>

            {/* Single Copy Day Action in Header */}
            {daySchedule.items.length > 0 && (
              <Pressable
                style={styles.copyDayHeaderBtn}
                onPress={() => onCopyDay(selectedDay)}
                hitSlop={8}
              >
                <Ionicons name="copy-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.copyDayHeaderBtnText}>{t("copyDay")}</Text>
              </Pressable>
            )}
          </View>

          {/* ─── Conflict / Duplicate Banner with "Rapikan otomatis" ─── */}
          {daySchedule.conflicts.length > 0 && (
            <View style={styles.conflictBanner}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <Ionicons name="alert-circle" size={18} color={colors.rose} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.conflictBannerTitle}>
                    Ada {daySchedule.conflicts.length} konflik/duplikat jam pelajaran
                  </Text>
                  <Text style={styles.conflictBannerDesc}>
                    Beberapa mapel terjadwal di jam yang sama.
                  </Text>
                </View>
              </View>
              {onRapikanDuplicates && (
                <Pressable style={styles.rapikanBtn} onPress={onRapikanDuplicates} hitSlop={6}>
                  <Text style={styles.rapikanBtnText}>Rapikan otomatis</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ─── Entries List or Friendly Empty State (ONLY when items.length === 0) ─── */}
          {daySchedule.empty ? (
            <View style={styles.emptyDayContainer}>
              <View style={styles.emptyDayIconBox}>
                <Ionicons name="sunny-outline" size={38} color={colors.accent} />
              </View>
              <Text style={styles.emptyDayTitle}>
                {t("emptyDayTitle", { day: currentDayName })}
              </Text>
              <Text style={styles.emptyDayDesc}>
                {t("emptyDayDesc")}
              </Text>
              <Pressable
                style={styles.emptyAddClassBtn}
                onPress={() => onAddClass(selectedDay)}
              >
                <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyAddClassBtnText}>Tambah Kelas</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {daySchedule.items.map((item) => {
                // ─── Divider Row for Breaks (Thin gray divider) ───
                if (item.type === "break") {
                  return (
                    <Pressable
                      key={item.id}
                      style={styles.dividerRow}
                      onPress={() => {
                        if (item.rawEntry) onEditClass(item.rawEntry);
                      }}
                      hitSlop={6}
                    >
                      <View style={styles.dividerIconBox}>
                        <Ionicons name="cafe-outline" size={13} color={colors.textMuted} />
                      </View>
                      <Text style={styles.dividerText} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.timeRangeStr ? (
                        <Text style={styles.dividerTime}>{item.timeRangeStr}</Text>
                      ) : null}
                      {item.rawEntry && (
                        <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                      )}
                    </Pressable>
                  );
                }

                // ─── Event Row (e.g. Literasi, Upacara) ───
                if (item.type === "event") {
                  return (
                    <Pressable
                      key={item.id}
                      style={styles.eventRowCard}
                      onPress={() => {
                        if (item.rawEntry) onEditClass(item.rawEntry);
                      }}
                    >
                      <View style={[styles.classColorStripe, { backgroundColor: item.color }]} />
                      <View style={styles.eventIconBox}>
                        <Ionicons name="flag-outline" size={15} color="#06B6D4" />
                      </View>
                      <View style={{ flex: 1, paddingLeft: spacing.sm }}>
                        <Text style={styles.eventTitleText}>{item.title}</Text>
                        <Text style={styles.eventTimeText}>{item.timeRangeStr}</Text>
                      </View>
                      {item.rawEntry && (
                        <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  );
                }

                // ─── Standard Merged Class Row: Compact single line (subject, time, room) ───
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.compactClassRow,
                      item.hasConflict && styles.conflictCard,
                      item.isOrphan && styles.orphanCard,
                    ]}
                    onPress={() => {
                      HapticFeedback.light();
                      setSelectedDetailItem(item);
                    }}
                  >
                    {/* 4dp color stripe */}
                    <View style={[styles.classColorStripe, { backgroundColor: item.color }]} />

                    {/* Compact period badge (e.g. Jam 1 or Jam 1-2) */}
                    <View style={styles.periodBadge}>
                      <Text style={styles.periodBadgeText}>
                        {item.compactPeriodLabel.replace(/^J(\d)/, "Jam $1")}
                      </Text>
                    </View>

                    {/* Main class info: single compact line */}
                    <View style={styles.compactClassInfo}>
                      <Text style={styles.compactClassTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.compactClassMeta} numberOfLines={1}>
                        {item.timeRangeStr}{item.room ? ` • R.${item.room}` : ""}
                      </Text>
                    </View>

                    {item.hasConflict && (
                      <StatusPill label="Konflik" variant="red" />
                    )}
                    {item.isOrphan && (
                      <StatusPill label="Hilang" variant="amber" />
                    )}

                    <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                  </Pressable>
                );
              })}

              {/* ─── Bottom Add Class Action (Single prominent button) ─── */}
              <View style={styles.bottomActionsRow}>
                <Pressable
                  style={styles.bottomAddClassBtn}
                  onPress={() => onAddClass(selectedDay)}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.bottomAddClassBtnText}>Tambah Kelas</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* ─── Class Detail BottomSheet (Phase 4 Tidy Pass) ─── */}
      {selectedDetailItem && (
        <BottomSheet
          visible={!!selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          title={selectedDetailItem.title}
          subtitle={`${currentDayName} • ${selectedDetailItem.periodLabel}`}
          primaryButtonLabel="Edit Kelas"
          onPrimaryButtonPress={() => {
            const raw = selectedDetailItem.rawEntry;
            setSelectedDetailItem(null);
            if (raw) onEditClass(raw);
          }}
        >
          <View style={styles.detailSheetContent}>
            <View style={styles.detailItemRow}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailItemLabel}>Waktu:</Text>
              <Text style={styles.detailItemValue}>
                {selectedDetailItem.timeRangeStr} ({selectedDetailItem.durationMins} mnt)
              </Text>
            </View>

            <View style={styles.detailItemRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailItemLabel}>Ruangan:</Text>
              <Text style={styles.detailItemValue}>
                {selectedDetailItem.room || "Belum diatur"}
              </Text>
            </View>

            <View style={styles.detailItemRow}>
              <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.detailItemLabel}>Guru:</Text>
              <Text style={styles.detailItemValue}>
                {selectedDetailItem.teacher || "Belum diatur"}
              </Text>
            </View>

            {selectedDetailItem.isOrphan && onRelinkOrphan && (
              <Pressable
                style={styles.relinkSheetBtn}
                onPress={() => {
                  const item = selectedDetailItem;
                  setSelectedDetailItem(null);
                  setRelinkModalTarget(item);
                }}
              >
                <Ionicons name="link-outline" size={16} color={colors.primary} />
                <Text style={styles.relinkSheetBtnText}>Pilih Mapel untuk Kelas Ini</Text>
              </Pressable>
            )}

            {onDeleteEntry && selectedDetailItem.rawEntry && (
              <View style={{ marginTop: tidySpacing.medium }}>
                <SecondaryButton
                  label="Hapus Kelas"
                  onPress={() => {
                    const rawId = selectedDetailItem.rawEntry?.id;
                    setSelectedDetailItem(null);
                    if (rawId) onDeleteEntry(rawId);
                  }}
                />
              </View>
            )}
          </View>
        </BottomSheet>
      )}

      {/* ─── Relink Orphan Modal ─── */}
      {relinkModalTarget && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setRelinkModalTarget(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.relinkModalCard}>
              <View style={styles.relinkModalHeader}>
                <Text style={styles.relinkModalTitle}>Tautkan Mapel</Text>
                <Pressable onPress={() => setRelinkModalTarget(null)} hitSlop={8}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={styles.relinkModalDesc}>
                Pilih mata pelajaran untuk jadwal "{relinkModalTarget.title}":
              </Text>
              <ScrollView style={{ maxHeight: 280, marginVertical: spacing.md }}>
                {subjects.map((sub) => (
                  <Pressable
                    key={sub.id}
                    style={styles.relinkSubjItem}
                    onPress={() => {
                      if (onRelinkOrphan && relinkModalTarget.rawEntry) {
                        onRelinkOrphan(relinkModalTarget.rawEntry.id, sub.id);
                      }
                      setRelinkModalTarget(null);
                    }}
                  >
                    <View
                      style={[
                        styles.relinkSubjDot,
                        { backgroundColor: sub.color || sub.color_hex || colors.primary },
                      ]}
                    />
                    <Text style={styles.relinkSubjText}>{sub.name || sub.title}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dayTabsContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayTabsScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dayTabItem: {
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    minWidth: 54,
  },
  dayTabItemActive: {
    backgroundColor: colors.primary,
  },
  dayTabLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayTabLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  dayTabLabelActive: {
    color: "#ffffff",
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent,
    marginLeft: 3,
  },
  dayTabClassCount: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    marginTop: 2,
  },
  dayTabClassCountActive: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  abToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  abToggleLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  abToggleGroup: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  abToggleBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  abToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  abToggleText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  abToggleTextActive: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  dayContentArea: {
    flex: 1,
  },
  dayScroll: {
    flex: 1,
  },
  dayScrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  dayHeaderCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayHeaderTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  todayBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  dayHeaderSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  copyDayHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },
  copyDayHeaderBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  conflictBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  conflictBannerTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.rose,
  },
  conflictBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rapikanBtn: {
    backgroundColor: colors.rose,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  rapikanBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  emptyDayContainer: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyDayIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyDayTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyDayDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  emptyAddClassBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  emptyAddClassBtnText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  entriesList: {
    gap: spacing.sm,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  dividerIconBox: {
    marginRight: spacing.sm,
  },
  dividerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  dividerTime: {
    fontSize: 10,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  eventRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.25)",
    borderRadius: radius.md,
    padding: spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  eventIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  eventTitleText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  eventTimeText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  compactClassRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    position: "relative",
    overflow: "hidden",
  },
  compactClassInfo: {
    flex: 1,
    marginLeft: 4,
    marginRight: spacing.sm,
  },
  compactClassTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  compactClassMeta: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  detailSheetContent: {
    gap: tidySpacing.small,
    paddingVertical: tidySpacing.small,
  },
  detailItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailItemLabel: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    width: 80,
  },
  detailItemValue: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  relinkSheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(58, 134, 255, 0.1)",
    borderRadius: radius.sm,
    marginTop: tidySpacing.small,
  },
  relinkSheetBtnText: {
    fontSize: typography.fontSizes.body,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  classRowCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  conflictCard: {
    borderColor: colors.rose,
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  orphanCard: {
    borderColor: "#94A3B8",
    borderStyle: "dashed",
  },
  classCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  classColorStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  periodBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  classMainInfo: {
    flex: 1,
  },
  classTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  classTitleText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  orphanBadge: {
    backgroundColor: "#64748B",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  orphanBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
  },
  conflictBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.rose,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  conflictBadgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
  },
  classMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: spacing.md,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItemText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  cardHeaderControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  expandChevronBtn: {
    padding: 4,
  },
  orphanActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  orphanActionText: {
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
  },
  relinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relinkBtnText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "bold",
  },
  conflictActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(239, 68, 68, 0.2)",
  },
  conflictActionNotice: {
    fontSize: 10,
    color: colors.rose,
    fontWeight: "600",
  },
  conflictActionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  keepConflictBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  keepConflictBtnText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  deleteConflictBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteConflictBtnText: {
    color: colors.rose,
    fontSize: 10,
    fontWeight: "bold",
  },
  expandedPeriodsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    gap: 4,
  },
  expandedPeriodsTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  expandedPeriodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  expandedPeriodBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  expandedPeriodBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.textMuted,
  },
  expandedPeriodLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  expandedPeriodMeta: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  bottomActionsRow: {
    marginTop: spacing.md,
  },
  bottomAddClassBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  bottomAddClassBtnText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  relinkModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.border,
  },
  relinkModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  relinkModalTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: "bold",
    color: colors.text,
  },
  relinkModalDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  relinkSubjItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  relinkSubjDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  relinkSubjText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "600",
    color: colors.text,
  },
});
