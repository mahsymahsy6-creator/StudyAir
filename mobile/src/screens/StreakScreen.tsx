import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, touchTarget } from "../theme";
import { useMobileStudyStore } from "../store";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { PrimaryButton } from "../components/common/PrimaryButton";
import { StreakMilestone, STREAK_MILESTONES, MilestoneTier } from "../lib/studyStreakEngine";
import { StreakCelebrationModal } from "../components/streak/StreakCelebrationModal";
import { StreakDebugModal } from "../components/streak/StreakDebugModal";

interface StreakScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

const WEEKDAY_NAMES_SEN_MIN = ["SEN", "SEL", "RAB", "KAM", "JUM", "SAB", "MIN"];

export function StreakScreen({ navigation }: StreakScreenProps) {
  const { streakState, triggerCelebration } = useMobileStudyStore();
  const [previewMilestone, setPreviewMilestone] = useState<StreakMilestone | null>(null);
  const [debugModalVisible, setDebugModalVisible] = useState(false);

  const {
    currentStreak,
    bestStreak,
    isAtRisk,
    todayStudied,
    nextMilestone,
    daysToNextMilestone,
    milestoneProgressPercent,
    recentWeekDays,
    todayStudyDay,
  } = streakState;

  const handleBadgePress = (milestone: StreakMilestone) => {
    setPreviewMilestone(milestone);
  };

  const handleContinueStudy = () => {
    navigation.navigate("Today");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Streak Belajar"
        subtitle="Konsistensi Harian ala Duolingo"
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: "construct-outline",
            onPress: () => setDebugModalVisible(true),
            accessibilityLabel: "Menu Debug Streak",
          },
        ]}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ─── 1. Duolingo Flame Hero Stage ─── */}
        <View style={styles.heroStageCard}>
          {/* Flame Halo Rings */}
          <View
            style={[
              styles.flameHaloOuter,
              todayStudied
                ? styles.flameHaloOuterActive
                : isAtRisk
                ? styles.flameHaloOuterAtRisk
                : styles.flameHaloOuterIdle,
            ]}
          >
            <View
              style={[
                styles.flameCircleInner,
                todayStudied
                  ? styles.flameCircleInnerActive
                  : isAtRisk
                  ? styles.flameCircleInnerAtRisk
                  : styles.flameCircleInnerIdle,
              ]}
            >
              <Ionicons
                name="flame"
                size={58}
                color={todayStudied ? "#FF9600" : isAtRisk ? "#FF9600" : "#64748B"}
              />
            </View>
          </View>

          {/* Huge Duolingo Streak Number */}
          <Text style={styles.heroStreakNumber}>{currentStreak}</Text>
          <Text style={styles.heroStreakCaps}>HARI STREAK</Text>

          {/* Dynamic Motivational Tagline */}
          <Text style={styles.heroStreakSub}>
            {todayStudied
              ? "Kamu sedang membara! Streak belajarmu terus berkobar hari ini."
              : isAtRisk
              ? "Jangan biarkan apimu padam! Selesaikan 1 tugas atau fokus belajar hari ini."
              : todayStudyDay?.isFreeDay
              ? "Hari ini hari libur. Streakmu otomatis terlindungi!"
              : "Selesaikan tugas hari ini untuk mulai menyalakan apimu!"}
          </Text>

          {/* At-Risk Emergency Banner */}
          {isAtRisk && (
            <View style={styles.atRiskBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF9600" style={{ marginRight: 8 }} />
              <Text style={styles.atRiskBannerText}>
                Streak terancam! Belajar minimal 15 menit atau selesaikan 1 tugas sebelum 23:59.
              </Text>
            </View>
          )}

          {/* Record Comparison Capsule */}
          <View style={styles.bestStreakCapsule}>
            <Ionicons name="trophy" size={15} color="#FFC800" style={{ marginRight: 6 }} />
            <Text style={styles.bestStreakText}>
              Rekor Terbaik: <Text style={styles.bestStreakNumber}>{bestStreak} Hari</Text>
            </Text>
          </View>
        </View>

        {/* ─── 2. Duolingo Weekly Calendar Streak Ring ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="calendar" size={16} color={colors.amber} />
            </View>
            <Text style={styles.sectionTitle}>Kalender Minggu Ini</Text>
            <Text style={styles.sectionMetaTag}>7 HARI</Text>
          </View>

          <View style={styles.weekGrid}>
            {recentWeekDays.map((day, idx) => {
              const dayIndex = idx; // 0=Sen ... 6=Min
              const isToday = idx === (new Date().getDay() + 6) % 7;

              return (
                <View key={day.date} style={styles.weekDayCol}>
                  <Text style={[styles.weekDayName, isToday && styles.weekDayNameToday]}>
                    {WEEKDAY_NAMES_SEN_MIN[dayIndex]}
                  </Text>

                  <View
                    style={[
                      styles.weekMedallion,
                      day.hasStudied && styles.weekMedallionStudied,
                      !day.hasStudied && day.isFreeDay && styles.weekMedallionFree,
                      !day.hasStudied && !day.isFreeDay && isToday && styles.weekMedallionTodayPending,
                      !day.hasStudied && !day.isFreeDay && !isToday && styles.weekMedallionMissed,
                    ]}
                  >
                    {day.hasStudied ? (
                      <Ionicons name="flame" size={18} color="#FFFFFF" />
                    ) : day.isFreeDay ? (
                      <Ionicons name="snow" size={16} color="#38BDF8" />
                    ) : isToday ? (
                      <Ionicons name="flame-outline" size={18} color={colors.amber} />
                    ) : (
                      <View style={styles.weekMedallionEmptyDot} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Clean Legend Chips */}
          <View style={styles.weekLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.amber }]} />
              <Text style={styles.legendLabel}>Belajar</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendLabel}>Bebas / Libur</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.borderLight }]} />
              <Text style={styles.legendLabel}>Belum</Text>
            </View>
          </View>
        </View>

        {/* ─── 3. Duolingo Streak Freeze (Perlindungan Streak) ─── */}
        <View style={styles.freezeCard}>
          <View style={styles.freezeIconBox}>
            <Ionicons name="shield-checkmark" size={24} color="#38BDF8" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={styles.freezeTitle}>Perlindungan Streak Otomatis</Text>
              <View style={styles.freezePill}>
                <Text style={styles.freezePillText}>AKTIF</Text>
              </View>
            </View>
            <Text style={styles.freezeDesc}>
              StudyAir otomatis melindungi streakmu di akhir pekan dan tanggal merah agar kamu bisa beristirahat tanpa rasa cemas.
            </Text>
          </View>
        </View>

        {/* ─── 4. Next Milestone Quest ─── */}
        {nextMilestone && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="trophy" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Target Pencapaian Berikutnya</Text>
              <View style={styles.milestonePill}>
                <Text style={styles.milestonePillText}>{nextMilestone.days} Hari</Text>
              </View>
            </View>

            <View style={styles.milestoneBody}>
              <Text style={styles.milestoneTitle}>{nextMilestone.title}</Text>
              <Text style={styles.milestoneDesc}>{nextMilestone.description}</Text>

              {/* Duolingo Chunky Progress Bar */}
              <View style={styles.progressBarWrapper}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(milestoneProgressPercent, 5)}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabelLeft}>
                  {currentStreak}/{nextMilestone.days} Hari ({milestoneProgressPercent}%)
                </Text>
                <Text style={styles.progressLabelRight}>
                  {daysToNextMilestone} hari lagi
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ─── 5. Duolingo Milestone Society Badges ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="ribbon" size={16} color={colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Masyarakat Streak (Streak Society)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Ketuk lencana untuk melihat pratinjau animasi perayaan dan status piala.
          </Text>

          <View style={styles.badgeGrid}>
            {STREAK_MILESTONES.map((m) => {
              const isUnlocked = currentStreak >= m.days;
              const tierColor = getTierColor(m.tier);

              return (
                <Pressable
                  key={m.id}
                  style={[
                    styles.badgeCard,
                    isUnlocked && styles.badgeCardUnlocked,
                  ]}
                  onPress={() => handleBadgePress(m)}
                  hitSlop={touchTarget.min / 4}
                >
                  <View
                    style={[
                      styles.badgeIconBox,
                      isUnlocked
                        ? { backgroundColor: `${tierColor}20`, borderColor: tierColor }
                        : styles.badgeIconBoxLocked,
                    ]}
                  >
                    <Ionicons
                      name={isUnlocked ? (m.iconName as any) : "lock-closed"}
                      size={24}
                      color={isUnlocked ? tierColor : colors.textMuted}
                    />
                  </View>

                  <Text style={styles.badgeDaysNumber}>{m.days} Hari</Text>
                  <Text
                    style={[
                      styles.badgeTitleText,
                      !isUnlocked && styles.badgeTitleTextLocked,
                    ]}
                    numberOfLines={1}
                  >
                    {m.title}
                  </Text>

                  <View
                    style={[
                      styles.badgeStatusPill,
                      isUnlocked
                        ? { backgroundColor: `${tierColor}25` }
                        : styles.badgeStatusPillLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeStatusText,
                        isUnlocked ? { color: tierColor } : { color: colors.textMuted },
                      ]}
                    >
                      {isUnlocked ? "TERBUKA" : "TERKUNCI"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── 6. Action Button & Debug Trigger ─── */}
        <View style={styles.ctaContainer}>
          <PrimaryButton
            label={todayStudied ? "Lihat Jadwal & Tugas Hari Ini" : "🔥 Mulai Belajar & Amankan Streak"}
            onPress={handleContinueStudy}
          />

          <Pressable
            style={styles.debugTriggerBtn}
            onPress={() => setDebugModalVisible(true)}
            hitSlop={touchTarget.min / 4}
          >
            <Ionicons name="construct" size={15} color="#FF9600" style={{ marginRight: 6 }} />
            <Text style={styles.debugTriggerText}>Buka Menu Debug & Simulator Streak</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ─── Celebration Modal Preview ─── */}
      <StreakCelebrationModal
        visible={previewMilestone !== null}
        milestone={previewMilestone}
        currentStreak={previewMilestone ? previewMilestone.days : currentStreak}
        onClose={() => setPreviewMilestone(null)}
      />

      {/* ─── Streak Debug Menu & Simulator ─── */}
      <StreakDebugModal
        visible={debugModalVisible}
        onClose={() => setDebugModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function getTierColor(tier: MilestoneTier): string {
  switch (tier) {
    case "rainbow":
      return "#CE82FF";
    case "gold":
      return "#FFC800";
    case "silver":
      return "#38BDF8";
    case "bronze":
    default:
      return "#FF9600";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 40,
  },
  heroStageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderBottom,
    padding: spacing.lg,
    alignItems: "center",
  },
  flameHaloOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderBottomWidth: 4.5,
    marginBottom: spacing.md,
  },
  flameHaloOuterActive: {
    backgroundColor: "rgba(255, 150, 0, 0.12)",
    borderColor: colors.amber,
    borderBottomColor: colors.amberBottom,
  },
  flameHaloOuterAtRisk: {
    backgroundColor: "rgba(255, 150, 0, 0.18)",
    borderColor: colors.amber,
    borderBottomColor: colors.amberBottom,
  },
  flameHaloOuterIdle: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderBottomColor: colors.borderBottom,
  },
  flameCircleInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  flameCircleInnerActive: {
    backgroundColor: "rgba(255, 150, 0, 0.22)",
  },
  flameCircleInnerAtRisk: {
    backgroundColor: "rgba(255, 150, 0, 0.25)",
  },
  flameCircleInnerIdle: {
    backgroundColor: colors.surfaceHover,
  },
  heroStreakNumber: {
    fontSize: 54,
    fontWeight: "900",
    color: colors.text,
    lineHeight: 58,
    letterSpacing: -1,
  },
  heroStreakCaps: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.amber,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  heroStreakSub: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },
  atRiskBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 150, 0, 0.14)",
    borderWidth: 1.5,
    borderColor: colors.amber,
    borderBottomWidth: 3,
    borderBottomColor: colors.amberBottom,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },
  atRiskBannerText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 18,
  },
  bestStreakCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  bestStreakText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  bestStreakNumber: {
    color: colors.yellow,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderBottom,
    padding: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: 8,
  },
  sectionIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    fontWeight: "800",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  sectionMetaTag: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingHorizontal: 2,
  },
  weekDayCol: {
    alignItems: "center",
    gap: 6,
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  weekDayNameToday: {
    color: colors.amber,
  },
  weekMedallion: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderBottomWidth: 3.5,
    alignItems: "center",
    justifyContent: "center",
  },
  weekMedallionStudied: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
    borderBottomColor: colors.amberBottom,
  },
  weekMedallionFree: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderBottomColor: colors.primaryBottom,
  },
  weekMedallionTodayPending: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.amber,
    borderBottomColor: colors.amberBottom,
  },
  weekMedallionMissed: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderBottomColor: colors.borderBottom,
  },
  weekMedallionEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  weekLegendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  freezeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: colors.primaryBottom,
    padding: spacing.md,
    gap: spacing.md,
  },
  freezeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  freezeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "800",
    color: colors.text,
  },
  freezePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  freezePillText: {
    fontSize: 9,
    fontWeight: "900",
    color: colors.textInverse,
    letterSpacing: 0.5,
  },
  freezeDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  milestonePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  milestonePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  milestoneBody: {
    marginTop: spacing.xs,
  },
  milestoneTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: "800",
    color: colors.text,
  },
  milestoneDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressBarWrapper: {
    height: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.amber,
    borderRadius: radius.full,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLabelLeft: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  progressLabelRight: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.amber,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badgeCard: {
    width: "48%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderBottomWidth: 3.5,
    borderBottomColor: colors.borderBottom,
    padding: spacing.md,
    alignItems: "center",
  },
  badgeCardUnlocked: {
    backgroundColor: colors.surface,
    borderColor: colors.amber,
    borderBottomColor: colors.amberBottom,
  },
  badgeIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  badgeIconBoxLocked: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.border,
  },
  badgeDaysNumber: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "900",
    color: colors.text,
    marginTop: 2,
  },
  badgeTitleText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  badgeTitleTextLocked: {
    color: colors.textMuted,
  },
  badgeStatusPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeStatusPillLocked: {
    backgroundColor: colors.surfaceHover,
  },
  badgeStatusText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ctaContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    gap: 10,
  },
  debugTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.amber,
    borderBottomWidth: 3,
    borderBottomColor: colors.amberBottom,
  },
  debugTriggerText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.text,
  },
});
