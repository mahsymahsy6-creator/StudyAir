/**
 * StudyAir Mobile — ExamsScreen (Next Exams / Ulangan Selanjutnya)
 * Primary exam countdown, preparation hub, topic mastery tracker, and AI study plan generator.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget } from "../theme";
import { useMobileStudyStore } from "../store";
import { getExamState, ExamItem } from "../lib/examEngine";
import { formatLocaleDate } from "../lib/dateUtils";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { AddExamSheet } from "../components/exams/AddExamSheet";
import { ExamDetailSheet } from "../components/exams/ExamDetailSheet";
import { t } from "../lib/i18n";

interface ExamsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack?: () => void;
  };
}

export function ExamsScreen({ navigation }: ExamsScreenProps) {
  const { subjects, studyUnits, examEvents, generateExamPlan } = useMobileStudyStore();

  const [activeFilter, setActiveFilter] = useState<"upcoming" | "past">("upcoming");
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Derive consolidated exam state using single source of truth
  const examState = useMemo(() => {
    return getExamState({
      subjects,
      studyUnits,
      examEvents,
      today: new Date(),
    });
  }, [subjects, studyUnits, examEvents]);

  const { nextExam, upcomingExams, pastExams } = examState;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  const handleHeroCreatePlan = () => {
    if (!nextExam) return;
    try {
      generateExamPlan(nextExam, nextExam.subject?.id || "general");
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (err) {
      console.warn("[ExamsScreen] Failed to create hero plan:", err);
    }
  };

  const handleHeroStartFocus = () => {
    if (nextExam?.subject) {
      navigation.navigate("Focus", { subjectId: nextExam.subject.id });
    } else {
      navigation.navigate("Focus");
    }
  };

  const activeList = activeFilter === "upcoming" ? upcomingExams : pastExams;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* ─── Top Header ─── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            {t("ulangan_selanjutnya") || "Ulangan Selanjutnya"}
          </Text>
          <Text style={styles.headerSub}>
            {upcomingExams.length > 0
              ? `${upcomingExams.length} ulangan menunggumu`
              : "Siap hadapi ujian dengan tenang"}
          </Text>
        </View>

        <Pressable
          style={styles.addBtn}
          onPress={() => setAddSheetVisible(true)}
          accessibilityLabel="Tambah Ulangan"
          hitSlop={8}
        >
          <Ionicons name="add" size={16} color={colors.primary} />
          <Text style={styles.addBtnText}>
            {t("tambah_ulangan") || "+ Tambah"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ─── Toast Feedback ─── */}
        {successToast && (
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={18} color={colors.emerald} style={{ marginRight: 6 }} />
            <Text style={styles.toastText}>
              {t("rencana_dibuat_sukses") || "Rencana belajar berhasil ditambahkan ke Tugas!"}
            </Text>
          </View>
        )}

        {/* ─── Hero Card: Next Exam ─── */}
        {nextExam ? (
          <View style={[styles.heroCard, nextExam.subject && { borderLeftColor: nextExam.subject.color }]}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroLabelRow}>
                <Ionicons name="ribbon" size={16} color={colors.primary} style={{ marginRight: 5 }} />
                <Text style={styles.heroTagText}>ULANGAN TERDEKAT</Text>
              </View>

              <View
                style={[
                  styles.countdownBadge,
                  nextExam.isToday || nextExam.isOngoing
                    ? styles.badgeToday
                    : styles.badgeUpcoming,
                ]}
              >
                <Text
                  style={[
                    styles.countdownBadgeText,
                    nextExam.isToday || nextExam.isOngoing
                      ? styles.badgeTodayText
                      : styles.badgeUpcomingText,
                  ]}
                >
                  {nextExam.label}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{nextExam.title}</Text>
            <Text style={styles.heroDate}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />{" "}
              {formatLocaleDate(nextExam.startDate)}
              {nextExam.endDate && nextExam.endDate !== nextExam.startDate
                ? ` - ${formatLocaleDate(nextExam.endDate)}`
                : ""}
            </Text>

            {/* Topic Mastery Progress */}
            {nextExam.totalTopics > 0 && (
              <View style={styles.heroProgressBox}>
                <View style={styles.heroProgressHeader}>
                  <Text style={styles.heroProgressLabel}>Kesiapan Materi</Text>
                  <Text style={styles.heroProgressCount}>
                    {nextExam.doneTopics} / {nextExam.totalTopics} Topik ({nextExam.progressPercent}%)
                  </Text>
                </View>
                <View style={styles.heroProgressTrack}>
                  <View
                    style={[
                      styles.heroProgressFill,
                      {
                        width: `${nextExam.progressPercent}%`,
                        backgroundColor:
                          nextExam.progressPercent === 100
                            ? colors.emerald
                            : nextExam.subject?.color || colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {/* Hero Quick Actions */}
            <View style={styles.heroActionsRow}>
              <Pressable
                style={styles.heroAiBtn}
                onPress={handleHeroCreatePlan}
                accessibilityLabel="Buat Rencana Belajar"
              >
                <Ionicons name="sparkles" size={15} color="#C084FC" style={{ marginRight: 6 }} />
                <Text style={styles.heroAiBtnText}>
                  {t("buat_rencana_ujian") || "Buat Rencana Belajar"}
                </Text>
              </Pressable>

              <Pressable
                style={styles.heroFocusBtn}
                onPress={handleHeroStartFocus}
                accessibilityLabel="Mulai Belajar"
              >
                <Ionicons name="play" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.heroFocusBtnText}>
                  {t("mulai_belajar_ujian") || "Mulai Fokus"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyHeroCard}>
            <View style={styles.emptyHeroIconBox}>
              <Ionicons name="ribbon-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyHeroTitle}>
              {t("hero_siap_ujian") || "Belum Ada Jadwal Ulangan"}
            </Text>
            <Text style={styles.emptyHeroSub}>
              Jadwalkan tanggal ulangan atau ujian agar StudyAir dapat membantumu menyusun strategi belajar.
            </Text>
            <Pressable
              style={styles.emptyHeroActionBtn}
              onPress={() => setAddSheetVisible(true)}
            >
              <Ionicons name="calendar" size={15} color={colors.textInverse} style={{ marginRight: 6 }} />
              <Text style={styles.emptyHeroActionText}>
                {t("atur_tanggal_ujian") || "Jadwalkan Ulangan"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ─── Filter Segment Tabs ─── */}
        <View style={styles.filterSegmentContainer}>
          <Pressable
            style={[
              styles.filterTab,
              activeFilter === "upcoming" && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter("upcoming")}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === "upcoming" && styles.filterTabTextActive,
              ]}
            >
              {t("filter_mendatang") || "Mendatang"} ({upcomingExams.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterTab,
              activeFilter === "past" && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter("past")}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === "past" && styles.filterTabTextActive,
              ]}
            >
              {t("filter_riwayat") || "Selesai"} ({pastExams.length})
            </Text>
          </Pressable>
        </View>

        {/* ─── Exam Cards List ─── */}
        {activeList.length === 0 ? (
          <View style={styles.emptyListBox}>
            <Ionicons name="calendar-clear-outline" size={36} color={colors.textSecondary} />
            <Text style={styles.emptyListTitle}>
              {activeFilter === "upcoming"
                ? t("belum_ada_ulangan") || "Tidak ada ulangan mendatang"
                : "Belum ada riwayat ulangan"}
            </Text>
            {activeFilter === "upcoming" && (
              <Pressable
                style={styles.emptyListBtn}
                onPress={() => setAddSheetVisible(true)}
              >
                <Text style={styles.emptyListBtnText}>
                  {t("tambah_ulangan") || "+ Tambah Ulangan"}
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          activeList.map((exam) => {
            const subject = exam.subject;
            const color = subject?.color || colors.primary;

            return (
              <Pressable
                key={exam.id}
                style={[styles.examCard, { borderLeftColor: color }]}
                onPress={() => setSelectedExam(exam)}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleInfo}>
                    <View style={styles.cardBadgeRow}>
                      <View style={[styles.cardSubjectTag, { backgroundColor: `${color}16` }]}>
                        <View style={[styles.cardSubjectDot, { backgroundColor: color }]} />
                        <Text style={[styles.cardSubjectText, { color }]}>
                          {subject ? subject.name || subject.title : "Ujian Sekolah"}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.cardCountdownBadge,
                          exam.isPassed
                            ? styles.badgePassed
                            : exam.isToday || exam.isOngoing
                            ? styles.badgeToday
                            : styles.badgeUpcoming,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cardCountdownText,
                            exam.isPassed
                              ? styles.badgePassedText
                              : exam.isToday || exam.isOngoing
                              ? styles.badgeTodayText
                              : styles.badgeUpcomingText,
                          ]}
                        >
                          {exam.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardTitle}>{exam.title}</Text>
                    <Text style={styles.cardDate}>
                      <Ionicons name="time-outline" size={13} color={colors.textSecondary} />{" "}
                      {formatLocaleDate(exam.startDate)}
                      {exam.endDate && exam.endDate !== exam.startDate
                        ? ` - ${formatLocaleDate(exam.endDate)}`
                        : ""}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </View>

                {/* Topic progress snippet if subject has study units */}
                {exam.totalTopics > 0 && (
                  <View style={styles.cardProgressRow}>
                    <View style={styles.cardTrack}>
                      <View
                        style={[
                          styles.cardFill,
                          {
                            width: `${exam.progressPercent}%`,
                            backgroundColor:
                              exam.progressPercent === 100 ? colors.emerald : color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.cardProgressText}>
                      {exam.doneTopics}/{exam.totalTopics} topik
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* ─── Modals ─── */}
      <AddExamSheet
        visible={addSheetVisible}
        onClose={() => setAddSheetVisible(false)}
      />

      <ExamDetailSheet
        exam={selectedExam}
        visible={!!selectedExam}
        onClose={() => setSelectedExam(null)}
        onNavigateToFocus={(subId) => {
          setSelectedExam(null);
          navigation.navigate("Focus", subId ? { subjectId: subId } : undefined);
        }}
        onPlanCreated={() => {
          setSuccessToast(true);
          setTimeout(() => setSuccessToast(false), 3000);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: "800",
    color: colors.text,
  },
  headerSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 4,
  },
  addBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.emerald}18`,
    borderWidth: 1,
    borderColor: colors.emerald,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: spacing.md,
  },
  toastText: {
    fontSize: typography.fontSizes.body,
    color: colors.emerald,
    fontWeight: "600",
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  countdownBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeUpcoming: {
    backgroundColor: colors.primaryLight,
  },
  badgeUpcomingText: {
    color: colors.primary,
  },
  badgeToday: {
    backgroundColor: `${colors.amber}24`,
  },
  badgeTodayText: {
    color: colors.amber,
  },
  badgePassed: {
    backgroundColor: colors.surfaceHover,
  },
  badgePassedText: {
    color: colors.textSecondary,
  },
  heroTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  heroDate: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  heroProgressBox: {
    marginTop: 4,
    marginBottom: spacing.md,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  heroProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  heroProgressLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  heroProgressCount: {
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    fontWeight: "700",
  },
  heroProgressTrack: {
    height: 6,
    backgroundColor: colors.surfaceHover,
    borderRadius: 3,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  heroActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroAiBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.35)",
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  heroAiBtnText: {
    fontSize: typography.fontSizes.body,
    color: "#C084FC",
    fontWeight: "700",
  },
  heroFocusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  heroFocusBtnText: {
    fontSize: typography.fontSizes.body,
    color: colors.primary,
    fontWeight: "700",
  },
  emptyHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  emptyHeroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyHeroTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 4,
  },
  emptyHeroSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  emptyHeroActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  emptyHeroActionText: {
    fontSize: typography.fontSizes.body,
    color: colors.textInverse,
    fontWeight: "700",
  },
  filterSegmentContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 3,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  filterTabActive: {
    backgroundColor: colors.surfaceHover,
  },
  filterTabText: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  emptyListBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emptyListTitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyListBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  emptyListBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
    color: colors.primary,
  },
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  cardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardSubjectTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  cardSubjectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  cardSubjectText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardCountdownBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  cardCountdownText: {
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  cardProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  cardTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surfaceHover,
    borderRadius: 2,
    overflow: "hidden",
  },
  cardFill: {
    height: "100%",
    borderRadius: 2,
  },
  cardProgressText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
