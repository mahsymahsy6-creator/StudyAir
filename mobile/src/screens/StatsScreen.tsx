import React, { useMemo, useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { addDays, format, parseISO } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radius, tidySpacing, touchTarget } from "../theme";
import { useMobileStudyStore } from "../store";
import { t } from "../lib/i18n";
import { formatLocaleDate } from "../lib/dateUtils";
import { computeTaskDoneStats, buildHeatmapWeeks, heatLevel, averageTaskScore } from "../lib/taskStats";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { Card } from "../components/common/Card";
import { EmptyState } from "../components/common/EmptyState";
import { TextButton } from "../components/common/TextButton";
import { AddGradeSheet } from "../components/grades/AddGradeSheet";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";

type HeatmapRangeWeeks = 8 | 12 | 16;
const RANGE_OPTIONS: HeatmapRangeWeeks[] = [8, 12, 16];

// Opacity per heat level on top of the primary color (works on native and web, unlike hex-alpha suffixes).
const LEVEL_OPACITY = [1, 0.35, 0.58, 0.8, 1];
const LEVEL_LABELS = ["0", "1", "2", "3", "4+"];

export interface StatsScreenProps {
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export function StatsScreen({ navigation }: StatsScreenProps) {
  const { tasks, grades, subjects, addGrade, streakState } = useMobileStudyStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [rangeWeeks, setRangeWeeks] = useState<HeatmapRangeWeeks>(12);
  // null = no day picked yet, so the day inspector stays hidden
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [highlightedLevel, setHighlightedLevel] = useState<number | null>(null);
  const [addGradeVisible, setAddGradeVisible] = useState(false);
  const heatmapScrollRef = useRef<any>(null);

  // Adaptive cell sizing: 8w = large thumb-friendly 22dp, 12w = 18dp, 16w = 16dp
  const cellSize = rangeWeeks === 8 ? 22 : rangeWeeks === 12 ? 18 : 16;
  const cellGap = rangeWeeks === 8 ? 5 : rangeWeeks === 12 ? 4 : 3.5;

  const stats = useMemo(() => computeTaskDoneStats(tasks), [tasks]);
  const weeks = useMemo(() => buildHeatmapWeeks(rangeWeeks), [rangeWeeks, todayStr]);

  const { heatmapTotal, activeDaysCount, firstDayInGrid } = useMemo(() => {
    let total = 0;
    let activeDays = 0;
    let earliest: string | null = null;
    for (const col of weeks) {
      for (const day of col) {
        if (!day) continue;
        if (!earliest) earliest = day;
        const count = stats.dailyCounts[day] || 0;
        total += count;
        if (count > 0) activeDays++;
      }
    }
    return {
      heatmapTotal: total,
      activeDaysCount: activeDays,
      firstDayInGrid: earliest || todayStr,
    };
  }, [weeks, stats.dailyCounts, todayStr]);

  // Compute month header labels above the week columns where a new month starts
  const monthHeaders = useMemo(() => {
    let lastMonth = "";
    let lastColIdx = -99;
    return weeks.map((col, idx) => {
      const firstValidDay = col.find((d) => d !== null);
      if (!firstValidDay) return "";
      const monthLabel = formatLocaleDate(parseISO(firstValidDay), "MMM");
      if (monthLabel !== lastMonth) {
        if (idx - lastColIdx < 3) {
          return "";
        }
        lastMonth = monthLabel;
        lastColIdx = idx;
        return monthLabel;
      }
      return "";
    });
  }, [weeks]);

  const taskGrades = useMemo(
    () =>
      grades
        .filter((g) => g.category === "assignment" && g.maxScore > 0)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [grades]
  );
  const avgScore = useMemo(() => averageTaskScore(grades), [grades]);
  const subjectName = (id: string) => {
    const sub = subjects.find((s) => s.id === id);
    return { name: sub?.name || sub?.title || "", color: sub?.color || sub?.color_hex || colors.primary };
  };

  const counters = [
    { label: t("stats_today"), value: stats.today },
    { label: t("stats_week"), value: stats.week },
    { label: t("stats_month"), value: stats.month },
  ];

  const selectedDayCount = selectedDay ? stats.dailyCounts[selectedDay] || 0 : 0;
  const selectedDayTasks = selectedDay ? stats.tasksByDay?.[selectedDay] || [] : [];
  const canStepPrev = !!selectedDay && selectedDay > firstDayInGrid;
  const canStepNext = !!selectedDay && selectedDay < todayStr;

  const handleSelectDay = (day: string) => {
    HapticFeedback.light();
    soundFX.playClick();
    setSelectedDay((prev) => (prev === day ? null : day));
  };

  const handleStepDay = (delta: number) => {
    if (!selectedDay) return;
    try {
      const nextDate = format(addDays(parseISO(selectedDay), delta), "yyyy-MM-dd");
      if (nextDate < firstDayInGrid || nextDate > todayStr) return;
      HapticFeedback.light();
      soundFX.playClick();
      setSelectedDay(nextDate);
    } catch {
      // ignore invalid date
    }
  };

  const handleChangeRange = (nextRange: HeatmapRangeWeeks) => {
    HapticFeedback.light();
    soundFX.playClick();
    setRangeWeeks(nextRange);
    setTimeout(() => {
      heatmapScrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
  };

  const handleToggleLevelFilter = (level: number) => {
    HapticFeedback.light();
    soundFX.playClick();
    setHighlightedLevel((prev) => (prev === level ? null : level));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t("tabStats")}
        streakText={t("streak_days_badge", { count: streakState?.currentStreak || 0 })}
        isStreakAtRisk={streakState?.isAtRisk}
        onStreakPress={() => navigation.navigate("Streak")}
        actions={[
          {
            icon: "settings-outline",
            accessibilityLabel: t("settings"),
            onPress: () => {
              HapticFeedback.light();
              navigation.navigate("Settings");
            },
          },
        ]}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── Tasks done: today / week / month ─── */}
        <Text style={styles.counterCaption}>{t("stats_tasks_done_title")}</Text>
        <View style={styles.counterRow}>
          {counters.map((c) => (
            <View key={c.label} style={styles.counterBox}>
              <Text style={styles.counterValue}>{c.value}</Text>
              <Text style={styles.counterLabel} numberOfLines={1}>
                {c.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ─── Mobile-Accessible Contribution Heatmap ─── */}
        <Card style={styles.card}>
          <View style={styles.heatmapHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t("stats_heatmap_title")}</Text>
              <Text style={styles.cardSubtitle}>
                {t("stats_heatmap_total", { count: heatmapTotal, weeks: rangeWeeks })} •{" "}
                {t("stats_active_days", { days: activeDaysCount })}
              </Text>
            </View>

            {/* Range Zoom Selector (8w / 12w / 16w) - only when there is activity */}
            {heatmapTotal > 0 && (
              <View style={styles.rangeSwitchPill}>
                {RANGE_OPTIONS.map((w) => {
                  const active = rangeWeeks === w;
                  return (
                    <Pressable
                      key={w}
                      onPress={() => handleChangeRange(w)}
                      hitSlop={4}
                      style={[styles.rangeOptionBtn, active && styles.rangeOptionBtnActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.rangeOptionText, active && styles.rangeOptionTextActive]}>
                        {t("stats_weeks_chip", { weeks: w })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Sticky Weekday Labels + Horizontally Scrollable Heatmap Matrix */}
          <View style={styles.heatmapGridContainer}>
            {/* Sticky Left Column: Weekday Labels */}
            <View style={[styles.dayLabelsColumn, { gap: cellGap }]}>
              {/* Month header spacer */}
              <View style={styles.monthHeaderSpacer} />
              {weeks[0].map((day, i) => {
                const showLabel = rangeWeeks === 8 || i % 2 === 0 || i === 6;
                return (
                  <View key={i} style={{ height: cellSize, justifyContent: "center" }}>
                    <Text style={styles.dayLabel}>
                      {showLabel && day ? formatLocaleDate(parseISO(day), "EEE") : ""}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Scrollable Week Columns with Month Headers */}
            <ScrollView
              ref={heatmapScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.heatmapScrollContent, { gap: cellGap }]}
              onContentSizeChange={() => {
                heatmapScrollRef.current?.scrollToEnd({ animated: false });
              }}
            >
              {weeks.map((column, w) => (
                <View key={w} style={[styles.heatColumn, { gap: cellGap }]}>
                  {/* Month Header above Column */}
                  <View style={[styles.monthHeaderCell, { width: cellSize }]}>
                    {monthHeaders[w] ? (
                      <Text style={styles.monthHeaderText}>
                        {monthHeaders[w]}
                      </Text>
                    ) : null}
                  </View>

                  {/* 7 Day Cells (Mon..Sun) */}
                  {column.map((day, d) => {
                    if (!day) {
                      return (
                        <View
                          key={d}
                          style={{ width: cellSize, height: cellSize }}
                        />
                      );
                    }
                    const count = stats.dailyCounts[day] || 0;
                    const level = heatLevel(count);
                    const isSelected = selectedDay === day;
                    const isToday = day === todayStr;
                    const isDimmed = highlightedLevel !== null && highlightedLevel !== level;

                    return (
                      <Pressable
                        key={d}
                        onPress={() => handleSelectDay(day)}
                        hitSlop={3}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${formatLocaleDate(parseISO(day), "EEEE, d MMM")}: ${count}`}
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            borderRadius: rangeWeeks === 8 ? 5 : 4,
                          },
                          level === 0
                            ? styles.cellZero
                            : { backgroundColor: colors.primary, opacity: LEVEL_OPACITY[level] },
                          isToday && !isSelected && styles.cellTodayOutline,
                          isSelected && styles.cellSelectedOutline,
                          isDimmed && { opacity: 0.18 },
                        ]}
                      >
                        {/* Show numeric count inside cell in large 8-week mode or when selected */}
                        {(rangeWeeks === 8 || isSelected) && count > 0 && (
                          <Text
                            style={[
                              styles.cellCountText,
                              { fontSize: rangeWeeks === 8 ? 10 : 9 },
                            ]}
                          >
                            {count}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Interactive Intensity Legend (Tap a level to highlight matching days) */}
          <View style={styles.legendRow}>
            <Text style={styles.legendHintText} numberOfLines={1}>
              {t("stats_tap_day_hint")}
            </Text>
            {heatmapTotal > 0 && (
              <View style={styles.legendScaleCluster}>
                <Text style={styles.legendText}>{t("stats_less")}</Text>
                {[0, 1, 2, 3, 4].map((level) => {
                  const isLevelSelected = highlightedLevel === level;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => handleToggleLevelFilter(level)}
                      hitSlop={4}
                      accessibilityRole="button"
                      accessibilityLabel={`Level ${LEVEL_LABELS[level]}`}
                      style={[
                        styles.legendCell,
                        level === 0
                          ? styles.cellZero
                          : { backgroundColor: colors.primary, opacity: LEVEL_OPACITY[level] },
                        isLevelSelected && styles.cellSelectedOutline,
                      ]}
                    >
                      <Text
                        style={[
                          styles.legendCellNumber,
                          level === 0 ? { color: colors.textMuted } : { color: colors.textInverse },
                        ]}
                      >
                        {LEVEL_LABELS[level]}
                      </Text>
                    </Pressable>
                  );
                })}
                <Text style={styles.legendText}>{t("stats_more")}</Text>
              </View>
            )}
          </View>

          {/* ─── Selected Day Inspector (only after a day is tapped) ─── */}
          {selectedDay && (
          <View style={styles.inspectorCard}>
            <View style={styles.inspectorHeaderRow}>
              <Pressable
                onPress={() => handleStepDay(-1)}
                disabled={!canStepPrev}
                hitSlop={6}
                style={[styles.stepDayBtn, !canStepPrev && { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Hari sebelumnya"
              >
                <Ionicons name="chevron-back" size={16} color={colors.text} />
              </Pressable>

              <View style={styles.inspectorTitleCenter}>
                <Text style={styles.inspectorDateTitle} numberOfLines={1}>
                  {formatLocaleDate(parseISO(selectedDay), "EEEE, d MMM yyyy")}
                  {selectedDay === todayStr ? ` • ${t("today")}` : ""}
                </Text>
                <View
                  style={[
                    styles.inspectorCountBadge,
                    selectedDayCount > 0
                      ? { backgroundColor: colors.primaryLight }
                      : { backgroundColor: colors.surface },
                  ]}
                >
                  <Ionicons
                    name={selectedDayCount > 0 ? "checkmark-circle" : "ellipse-outline"}
                    size={13}
                    color={selectedDayCount > 0 ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.inspectorCountText,
                      selectedDayCount > 0 ? { color: colors.primary } : { color: colors.textMuted },
                    ]}
                  >
                    {t("stats_day_tasks_count", { count: selectedDayCount })}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => handleStepDay(1)}
                disabled={!canStepNext}
                hitSlop={6}
                style={[styles.stepDayBtn, !canStepNext && { opacity: 0.35 }]}
                accessibilityRole="button"
                accessibilityLabel="Hari berikutnya"
              >
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </Pressable>
            </View>

            {selectedDayTasks.length > 0 ? (
              <View style={styles.inspectorTasksList}>
                {selectedDayTasks.slice(0, 4).map((task) => {
                  const sub = subjectName(task.subjectId);
                  return (
                    <View key={task.id} style={styles.inspectorTaskRow}>
                      <View style={[styles.dot, { backgroundColor: sub.color }]} />
                      <Text style={styles.inspectorTaskTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      {sub.name ? (
                        <Text style={styles.inspectorTaskSub} numberOfLines={1}>
                          {sub.name}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
                {selectedDayTasks.length > 4 && (
                  <Text style={styles.inspectorMoreText}>
                    +{selectedDayTasks.length - 4} {t("stats_tasks_done")}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.inspectorEmptyText}>{t("stats_no_tasks_on_day")}</Text>
            )}
          </View>
          )}
        </Card>

        {/* ─── Task scores ─── */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>{t("stats_scores_title")}</Text>
          {avgScore === null ? (
            <View style={styles.addGradeEmptyBox}>
              <EmptyState
                compact
                icon="ribbon-outline"
                message={t("stats_scores_empty")}
                subMessage={t("stats_scores_empty_desc")}
              />
              <Pressable
                style={styles.addGradeActionBtn}
                onPress={() => setAddGradeVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t("stats_scores_add")}
              >
                <Ionicons name="add" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.addGradeActionText}>{t("stats_scores_add")}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreValue}>{avgScore}</Text>
                <Text style={styles.cardSubtitle}>{t("stats_scores_avg", { count: taskGrades.length })}</Text>
              </View>
              {taskGrades.slice(0, 5).map((g) => {
                const sub = subjectName(g.subjectId);
                return (
                  <View key={g.id} style={styles.scoreRow}>
                    <View style={[styles.dot, { backgroundColor: sub.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scoreTitle} numberOfLines={1}>{g.title}</Text>
                      <Text style={styles.scoreMeta} numberOfLines={1}>
                        {sub.name} • {formatLocaleDate(parseISO(g.date), "d MMM")}
                      </Text>
                    </View>
                    <Text style={styles.scoreNumber}>{Math.round((g.score / g.maxScore) * 100)}</Text>
                  </View>
                );
              })}
            </>
          )}
        </Card>
      </ScrollView>

      {/* ─── Direct Add Grade Sheet ─── */}
      <AddGradeSheet
        visible={addGradeVisible}
        subjects={subjects}
        initialCategory="assignment"
        onClose={() => setAddGradeVisible(false)}
        onSave={async (data) => {
          await addGrade(data);
          setAddGradeVisible(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  counterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  counterBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  counterValue: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  counterLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  counterCaption: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heatmapHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  rangeSwitchPill: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  rangeOptionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  rangeOptionBtnActive: {
    backgroundColor: colors.primary,
  },
  rangeOptionText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  rangeOptionTextActive: {
    color: colors.textInverse,
  },
  heatmapGridContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.md,
  },
  dayLabelsColumn: {
    marginRight: 6,
  },
  monthHeaderSpacer: {
    height: 16,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
  },
  heatmapScrollContent: {
    flexDirection: "row",
    paddingRight: 4,
  },
  heatColumn: {
    alignItems: "center",
  },
  monthHeaderCell: {
    height: 16,
    justifyContent: "center",
    overflow: "visible",
  },
  monthHeaderText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    // Absolute so the label can spill past its narrow week column instead of truncating.
    position: "absolute",
    left: 0,
    width: 48,
  },
  addGradeEmptyBox: {
    alignItems: "center",
    gap: spacing.sm,
  },
  addGradeActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  addGradeActionText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  cellZero: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cellTodayOutline: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cellSelectedOutline: {
    borderWidth: 2,
    borderColor: colors.text,
  },
  cellCountText: {
    fontWeight: typography.fontWeights.heavy,
    color: colors.textInverse,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  legendHintText: {
    fontSize: 11,
    color: colors.textMuted,
    flexShrink: 1,
  },
  legendScaleCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendCell: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  legendCellNumber: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
  },
  legendText: {
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  inspectorCard: {
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs + 2,
  },
  inspectorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  stepDayBtn: {
    width: Math.max(32, touchTarget.min - 12),
    height: Math.max(32, touchTarget.min - 12),
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  inspectorTitleCenter: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  inspectorDateTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  inspectorCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  inspectorCountText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  inspectorTasksList: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 6,
  },
  inspectorTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inspectorTaskTitle: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  inspectorTaskSub: {
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 100,
  },
  inspectorMoreText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
    marginTop: 2,
  },
  inspectorEmptyText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: 2,
  },
  scoreHeader: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scoreTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  scoreMeta: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  scoreNumber: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
});
