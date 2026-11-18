import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  differenceInDays,
  startOfWeek,
  parseISO,
} from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { t } from "../lib/i18n";
import { calculateDaysLeft, formatLocaleDate } from "../lib/dateUtils";
import { getExamState } from "../lib/examEngine";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { Card } from "../components/common/Card";
import { ListRow } from "../components/common/ListRow";
import { StatusPill } from "../components/common/StatusPill";
import { EmptyState } from "../components/common/EmptyState";

interface DashboardScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const {
    subjects,
    studyUnits,
    blocks,
    focusLogs,
    streakState,
  } = useMobileStudyStore();
  const today = new Date();

  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Metrics
  const totalUnits = studyUnits.length;
  const completedUnits = studyUnits.filter((u) => u.is_completed).length;
  const masteryPct =
    totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const totalActualMinutes = focusLogs.reduce(
    (acc, log) => acc + log.actual_minutes,
    0
  );

  const formatStudyTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} mnt`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}j ${m}m` : `${h} jam`;
  };

  // Weekly Metrics (Start of current week Monday)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const completedThisWeek = useMemo(() => {
    return studyUnits.filter((u) => {
      if (!u.is_completed || !u.completed_at) return false;
      const d = new Date(u.completed_at);
      return d >= weekStart && d <= today;
    }).length;
  }, [studyUnits, weekStart, today]);

  // Unified Exam State
  const examState = useMemo(() => {
    return getExamState({ subjects, studyUnits, today });
  }, [subjects, studyUnits, today]);

  const overdueCount = useMemo(() => {
    return examState.pastExams.length;
  }, [examState.pastExams]);

  const weeklyMinutes = useMemo(() => {
    return focusLogs.reduce((acc, log) => {
      const d = new Date(log.started_at);
      if (d >= weekStart && d <= today) {
        return acc + log.actual_minutes;
      }
      return acc;
    }, 0);
  }, [focusLogs, weekStart, today]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─── */}
        <ScreenHeader
          title="Kemajuan"
          subtitle={formatLocaleDate(today, "MMMM yyyy")}
          streakText={`${streakState.currentStreak}d`}
          isStreakAtRisk={streakState.isAtRisk}
          onStreakPress={() => navigation.navigate("Streak")}
        />

        {/* ─── SECTION 1: One High-Impact Weekly Summary Card ─── */}
        <View style={styles.sectionPad}>
          <Card accentColor={colors.primary} style={styles.weeklyCard}>
            <View style={styles.weeklyHeaderRow}>
              <Text style={styles.weeklyTitle}>Ringkasan Pekan Ini</Text>
              <Text style={styles.weeklySubtitle}>
                {formatLocaleDate(weekStart, "d MMM")} – {formatLocaleDate(today, "d MMM")}
              </Text>
            </View>

            <View style={styles.weeklyMetricsRow}>
              <View style={styles.weeklyMetricBox}>
                <Ionicons name="checkmark-done-circle" size={22} color={colors.emerald} />
                <Text style={styles.weeklyMetricVal}>{completedThisWeek}</Text>
                <Text style={styles.weeklyMetricLabel}>Topik Selesai</Text>
              </View>

              <View style={styles.weeklyMetricDivider} />

              <View style={styles.weeklyMetricBox}>
                <Ionicons
                  name="alert-circle"
                  size={22}
                  color={overdueCount > 0 ? colors.rose : colors.textSecondary}
                />
                <Text style={[styles.weeklyMetricVal, overdueCount > 0 && { color: colors.rose }]}>
                  {overdueCount}
                </Text>
                <Text style={styles.weeklyMetricLabel}>Lewat Tenggat</Text>
              </View>

              <View style={styles.weeklyMetricDivider} />

              <View style={styles.weeklyMetricBox}>
                <Ionicons name="time" size={22} color={colors.primary} />
                <Text style={styles.weeklyMetricVal}>{formatStudyTime(weeklyMinutes)}</Text>
                <Text style={styles.weeklyMetricLabel}>Waktu Belajar</Text>
              </View>
            </View>

            {/* Collapsible details for extra metrics */}
            <Pressable
              style={styles.toggleDetailsBtn}
              onPress={() => setDetailsExpanded((prev) => !prev)}
              hitSlop={touchTarget.min / 4}
            >
              <Text style={styles.toggleDetailsText}>
                {detailsExpanded ? "Sembunyikan rincian" : "Lihat rincian keseluruhan →"}
              </Text>
            </Pressable>

            {detailsExpanded && (
              <View style={styles.expandedDetailsRow}>
                <View style={styles.extraMetric}>
                  <Text style={styles.extraMetricValue}>{masteryPct}%</Text>
                  <Text style={styles.extraMetricLabel}>Penguasaan Materi</Text>
                </View>
                <View style={styles.extraMetric}>
                  <Text style={styles.extraMetricValue}>{formatStudyTime(totalActualMinutes)}</Text>
                  <Text style={styles.extraMetricLabel}>Total Waktu Belajar</Text>
                </View>
                <View style={styles.extraMetric}>
                  <Text style={styles.extraMetricValue}>{completedUnits}/{totalUnits}</Text>
                  <Text style={styles.extraMetricLabel}>Topik Tuntas</Text>
                </View>
              </View>
            )}
          </Card>
        </View>

        {/* ─── SECTION 2: Course Exam Countdowns ─── */}
        <SectionHeader
          title="Target Ujian"
          subtitle="Hitung mundur jadwal ujian semester"
          actionText="Jadwal →"
          onActionPress={() => navigation.navigate("Calendar")}
        />

        <View style={styles.sectionPad}>
          {subjects.length === 0 ? (
            <EmptyState
              compact
              message="Belum ada mata pelajaran. Impor jadwal pelajaran di Pengaturan."
            />
          ) : (
            <View style={{ gap: tidySpacing.small }}>
              {examState.upcomingExams.map((exam) => {
                const dateDisplay = formatLocaleDate(parseISO(exam.startDate), "EEEE, d MMM yyyy");
                const pillVariant =
                  exam.isOngoing || exam.daysLeft <= 7
                    ? "red"
                    : exam.daysLeft <= 14
                    ? "amber"
                    : "blue";

                return (
                  <ListRow
                    key={exam.id}
                    dotColor={exam.subject ? (exam.subject.color_hex || exam.subject.color || colors.primary) : colors.primary}
                    title={exam.title}
                    subtitle={`${exam.doneTopics}/${exam.totalTopics} topik • ${dateDisplay}`}
                    statusBadge={
                      <StatusPill
                        label={exam.label}
                        variant={pillVariant}
                      />
                    }
                    onPress={() => navigation.navigate("Calendar")}
                  />
                );
              })}
              {examState.upcomingExams.length === 0 && (
                <EmptyState
                  compact
                  message="Belum ada tanggal ujian. Atur tanggal ujian di mata pelajaran."
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
  content: {
    paddingBottom: tidySpacing.large * 2,
  },
  sectionPad: {
    paddingHorizontal: tidySpacing.screen,
  },
  weeklyCard: {
    marginHorizontal: 0,
    padding: tidySpacing.medium,
  },
  weeklyHeaderRow: {
    marginBottom: tidySpacing.medium,
  },
  weeklyTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  weeklySubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weeklyMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weeklyMetricBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  weeklyMetricVal: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
  },
  weeklyMetricLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  weeklyMetricDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  toggleDetailsBtn: {
    alignItems: "center",
    marginTop: tidySpacing.medium,
    paddingTop: tidySpacing.small,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toggleDetailsText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  expandedDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: tidySpacing.medium,
    paddingTop: tidySpacing.small,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  extraMetric: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  extraMetricValue: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  extraMetricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
