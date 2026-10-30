import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Share,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { StreakMilestone, STREAK_MILESTONES, MilestoneTier, StudyDay } from "../lib/studyStreakEngine";
import { StreakCelebrationModal } from "../components/streak/StreakCelebrationModal";
import { StreakDebugModal } from "../components/streak/StreakDebugModal";
import { AnimatedFlame } from "../components/streak/AnimatedFlame";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";
import { formatLocaleDate } from "../lib/dateUtils";

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
  const [secretClueMilestone, setSecretClueMilestone] = useState<StreakMilestone | null>(null);
  const [debugModalVisible, setDebugModalVisible] = useState(false);
  const [inspectedDay, setInspectedDay] = useState<StudyDay | null>(null);

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
    const isUnlocked = currentStreak >= milestone.days;
    if (isUnlocked) {
      soundFX.playClick();
      HapticFeedback.light();
      setPreviewMilestone(milestone);
    } else {
      soundFX.playMysteryClue();
      HapticFeedback.mysteryClue();
      setSecretClueMilestone(milestone);
    }
  };

  const handleContinueStudy = () => {
    soundFX.playClick();
    HapticFeedback.success();
    navigation.navigate("Today");
  };

  const handleShareStreak = async () => {
    soundFX.playClick();
    HapticFeedback.light();
    try {
      await Share.share({
        message: `🔥 Streak belajarku sudah mencapai ${currentStreak} hari di StudyAir! Konsistensi harian semakin membara. #StudyAir #StudyStreak`,
        title: `Streak Belajar ${currentStreak} Hari`,
      });
    } catch {
      // Ignore dismiss
    }
  };

  const handleSelectDay = (day: StudyDay) => {
    soundFX.playClick();
    HapticFeedback.light();
    if (inspectedDay?.date === day.date) {
      setInspectedDay(null);
    } else {
      setInspectedDay(day);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader
        title="Streak Belajar"
        subtitle="Konsistensi Harian ala Duolingo"
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: "share-social-outline",
            accessibilityLabel: "Bagikan Streak",
            onPress: handleShareStreak,
          },
          {
            icon: "construct-outline",
            accessibilityLabel: "Menu Debug Streak",
            onPress: () => setDebugModalVisible(true),
          },
        ]}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── 1. Duolingo Flame Hero Stage ─── */}
        <View style={styles.heroStageCard}>
          {/* Animated Glowing Flame with Breathing Spring & Floating Embers */}
          <View style={styles.flameHeroWrapper}>
            <AnimatedFlame
              size={84}
              isLit={todayStudied || currentStreak > 0}
              isAtRisk={isAtRisk}
            />
          </View>

          {/* Huge Duolingo Streak Number with 3D Drop-Shadow */}
          <Text style={styles.heroStreakNumber}>{currentStreak}</Text>
          <Text style={styles.heroStreakCaps}>HARI STREAK</Text>

          {/* Dynamic Motivational Tagline */}
          <Text style={styles.heroStreakSub}>
            {todayStudied
              ? "🔥 Kamu sedang membara! Streak belajarmu terus berkobar hari ini."
              : isAtRisk
              ? "⚠️ Jangan biarkan apimu padam! Selesaikan 1 tugas atau sesi fokus sebelum 23:59."
              : todayStudyDay?.isFreeDay
              ? "❄️ Hari ini hari libur. Streakmu otomatis terlindungi!"
              : "Ayo selesaikan sesi belajar hari ini untuk menyalakan apimu!"}
          </Text>

          {/* At-Risk Emergency Banner */}
          {isAtRisk && (
            <View style={styles.atRiskBanner}>
              <Ionicons name="alert-circle" size={18} color="#FF7A00" style={{ marginRight: 8 }} />
              <Text style={styles.atRiskBannerText}>
                Streak terancam padam! Belajar minimal 15 menit atau tuntaskan 1 tugas sebelum tengah malam.
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

        {/* ─── 2. Duolingo Streak Freeze Equipped Slots (Perlindungan Streak) ─── */}
        <View style={styles.freezeSectionCard}>
          <View style={styles.freezeHeaderRow}>
            <View style={styles.freezeIconBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.freezeSectionTitle}>Perlindungan Streak (Streak Freeze)</Text>
              <Text style={styles.freezeSectionSub}>Otomatis aktif melindungi streakmu di akhir pekan & libur</Text>
            </View>
          </View>

          {/* Two Equipped Frost Slots */}
          <View style={styles.freezeSlotsRow}>
            <View style={styles.freezeSlotCard}>
              <View style={styles.freezeCrystalCircle}>
                <Ionicons name="snow" size={22} color="#38BDF8" />
              </View>
              <Text style={styles.freezeSlotTitle}>Akhir Pekan</Text>
              <View style={styles.freezeStatusPill}>
                <Text style={styles.freezeStatusPillText}>DILINDUNGI</Text>
              </View>
            </View>

            <View style={styles.freezeSlotCard}>
              <View style={styles.freezeCrystalCircle}>
                <Ionicons name="snow" size={22} color="#38BDF8" />
              </View>
              <Text style={styles.freezeSlotTitle}>Hari Libur</Text>
              <View style={styles.freezeStatusPill}>
                <Text style={styles.freezeStatusPillText}>DILINDUNGI</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── 3. Interactive Duolingo Weekly Calendar Streak Chain ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="calendar" size={16} color={colors.amber} />
            </View>
            <Text style={styles.sectionTitle}>Rantai Streak Minggu Ini</Text>
            <Text style={styles.sectionMetaTag}>7 HARI</Text>
          </View>

          <View style={styles.weekGrid}>
            {recentWeekDays.map((day, idx) => {
              const dayIndex = idx; // 0=Sen ... 6=Min
              const isToday = idx === (new Date().getDay() + 6) % 7;
              const isSelected = inspectedDay?.date === day.date;

              return (
                <Pressable
                  key={day.date}
                  style={[styles.weekDayCol, isSelected && styles.weekDayColSelected]}
                  onPress={() => handleSelectDay(day)}
                  hitSlop={touchTarget.min / 4}
                >
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
                </Pressable>
              );
            })}
          </View>

          {/* Inspected Day Popover Card */}
          {inspectedDay && (
            <View style={styles.dayDetailCard}>
              <View style={styles.dayDetailHeader}>
                <Ionicons
                  name={inspectedDay.hasStudied ? "flame" : inspectedDay.isFreeDay ? "snow" : "time-outline"}
                  size={16}
                  color={inspectedDay.hasStudied ? "#FF9600" : inspectedDay.isFreeDay ? "#38BDF8" : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.dayDetailTitle}>
                  {inspectedDay.date} • {inspectedDay.hasStudied ? "Belajar Aktif" : inspectedDay.isFreeDay ? "Hari Libur" : "Belum Selesai"}
                </Text>
              </View>
              <Text style={styles.dayDetailStats}>
                ⏱️ {inspectedDay.minutes} menit fokus • 📝 {inspectedDay.tasksCompleted} tugas diselesaikan
              </Text>
            </View>
          )}

          {/* Clean Legend Chips */}
          <View style={styles.weekLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.amber }]} />
              <Text style={styles.legendLabel}>Belajar</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#38BDF8" }]} />
              <Text style={styles.legendLabel}>Libur Dilindungi</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.borderLight }]} />
              <Text style={styles.legendLabel}>Belum</Text>
            </View>
          </View>
        </View>

        {/* ─── 4. Next Milestone Quest ─── */}
        {nextMilestone && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Target Gelar Berikutnya</Text>
              <View style={styles.milestonePill}>
                <Text style={styles.milestonePillText}>{nextMilestone.days} Hari</Text>
              </View>
            </View>

            <View style={styles.milestoneBody}>
              <View style={styles.mysteryTeaserRow}>
                <Ionicons name="lock-closed" size={18} color={getTierColor(nextMilestone.tier)} style={{ marginRight: 6 }} />
                <Text style={styles.milestoneTitle}>
                  {nextMilestone.days} Hari • Gelar Rahasia
                </Text>
              </View>
              <Text style={styles.milestoneDesc}>
                Gelar misterius tingkat {getTierName(nextMilestone.tier)} menantimu! Pertahankan streak selama {daysToNextMilestone} hari lagi untuk memecahkan segelnya.
              </Text>

              {/* Duolingo Chunky Progress Bar with Gloss Highlight */}
              <View style={styles.progressBarWrapper}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(milestoneProgressPercent, 5)}%`,
                    },
                  ]}
                >
                  <View style={styles.progressGlossHighlight} />
                </View>
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

        {/* ─── 5. Duolingo Milestone Society Badges (Masyarakat Streak) ─── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="ribbon" size={16} color={colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Masyarakat Streak (Streak Society)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Gelar yang belum diraih dirahasiakan! Ketuk lencana untuk melihat petunjuk atau pratinjau perayaan.
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
                    !isUnlocked && styles.badgeCardLockedSecret,
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
                    {isUnlocked ? m.title : "??? Rahasia"}
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
                      {isUnlocked ? "TERBUKA" : "RAHASIA 🔒"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── 6. Duolingo 3D Action Buttons ─── */}
        <View style={styles.ctaContainer}>
          {/* Chunky 3D Continue Button */}
          <Pressable
            style={styles.duoPrimaryBtn}
            onPress={handleContinueStudy}
          >
            <Ionicons name="flame" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.duoPrimaryBtnText}>
              {todayStudied ? "Lanjutkan Belajar Hari Ini" : "Mulai Belajar & Nyalakan Api 🔥"}
            </Text>
          </Pressable>

          {/* Social Share Button */}
          <Pressable
            style={styles.duoShareBtn}
            onPress={handleShareStreak}
          >
            <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={styles.duoShareBtnText}>Bagikan Pencapaian Streak</Text>
          </Pressable>

          {/* Debug Menu */}
          <Pressable
            style={styles.debugTriggerBtn}
            onPress={() => setDebugModalVisible(true)}
            hitSlop={touchTarget.min / 4}
          >
            <Ionicons name="construct" size={14} color="#FF9600" style={{ marginRight: 6 }} />
            <Text style={styles.debugTriggerText}>Buka Menu Debug & Simulator Streak</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ─── Celebration Modal Preview ─── */}
      <StreakCelebrationModal
        visible={previewMilestone !== null}
        milestone={previewMilestone}
        currentStreak={previewMilestone ? previewMilestone.days : currentStreak}
        isSecretRevealed={true}
        onClose={() => setPreviewMilestone(null)}
      />

      {/* ─── Mystery Milestone Clue Modal ─── */}
      <Modal
        visible={secretClueMilestone !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSecretClueMilestone(null)}
      >
        <View style={styles.mysteryOverlay}>
          <View
            style={[
              styles.mysteryCard,
              { borderColor: `${getTierColor(secretClueMilestone?.tier || "bronze")}60` },
            ]}
          >
            <View
              style={[
                styles.mysteryGlowCircle,
                { backgroundColor: `${getTierColor(secretClueMilestone?.tier || "bronze")}20` },
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={36}
                color={getTierColor(secretClueMilestone?.tier || "bronze")}
              />
            </View>

            <View
              style={[
                styles.mysteryTagBadge,
                { backgroundColor: `${getTierColor(secretClueMilestone?.tier || "bronze")}25` },
              ]}
            >
              <Text
                style={[
                  styles.mysteryTagText,
                  { color: getTierColor(secretClueMilestone?.tier || "bronze") },
                ]}
              >
                MILESTONE {secretClueMilestone?.days} HARI
              </Text>
            </View>

            <Text style={styles.mysteryCardTitle}>Gelar Rahasia Terkunci</Text>
            <Text style={styles.mysteryCardDesc}>
              Nama, lambang ikon, dan kisah gelar ini masih dirahasiakan!
            </Text>

            <View style={styles.mysteryClueBox}>
              <Ionicons
                name="key"
                size={16}
                color={getTierColor(secretClueMilestone?.tier || "bronze")}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <Text style={styles.mysteryClueText}>
                Tingkat:{" "}
                <Text
                  style={{
                    fontWeight: "bold",
                    color: getTierColor(secretClueMilestone?.tier || "bronze"),
                  }}
                >
                  {getTierName(secretClueMilestone?.tier || "bronze")}
                </Text>
                {"\n"}
                Pertahankan apimu{" "}
                <Text style={{ fontWeight: "bold", color: colors.text }}>
                  {Math.max(0, (secretClueMilestone?.days || 0) - currentStreak)} hari
                </Text>{" "}
                lagi untuk membuka dan merayakan gelar ini!
              </Text>
            </View>

            <Pressable
              style={[
                styles.mysteryBtn,
                {
                  backgroundColor: getTierColor(secretClueMilestone?.tier || "bronze"),
                  borderBottomColor: getTierShadowColor(secretClueMilestone?.tier || "bronze"),
                },
              ]}
              onPress={() => {
                soundFX.playClick();
                HapticFeedback.light();
                setSecretClueMilestone(null);
              }}
              hitSlop={touchTarget.min / 4}
            >
              <Text style={styles.mysteryBtnText}>Siap Berjuang! 🔥</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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

function getTierName(tier: MilestoneTier): string {
  switch (tier) {
    case "rainbow":
      return "Legendaris Pelangi";
    case "gold":
      return "Emas Murni";
    case "silver":
      return "Perak Berkilau";
    case "bronze":
    default:
      return "Perunggu Api";
  }
}

function getTierShadowColor(tier: MilestoneTier): string {
  switch (tier) {
    case "rainbow":
      return "#7C3AED";
    case "gold":
      return "#B45309";
    case "silver":
      return "#0284C7";
    case "bronze":
    default:
      return "#D97706";
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
    borderColor: colors.borderLight,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderBottom,
    padding: spacing.lg,
    alignItems: "center",
  },
  flameHeroWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  heroStreakNumber: {
    fontSize: 64,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 68,
  },
  heroStreakCaps: {
    fontSize: typography.fontSizes.body,
    fontWeight: "800",
    color: colors.amber,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  heroStreakSub: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 2,
    maxWidth: 290,
  },
  atRiskBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 122, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 122, 0, 0.35)",
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  atRiskBannerText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    lineHeight: 18,
  },
  bestStreakCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  bestStreakText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  bestStreakNumber: {
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  // Freeze Section
  freezeSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  freezeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  freezeIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  freezeSectionTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  freezeSectionSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  freezeSlotsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  freezeSlotCard: {
    flex: 1,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
  },
  freezeCrystalCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  freezeSlotTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  freezeStatusPill: {
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  freezeStatusPillText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    color: "#0284C7",
    letterSpacing: 0.5,
  },
  // Week Card
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionMetaTag: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: spacing.sm,
  },
  weekDayCol: {
    alignItems: "center",
    padding: 2,
    borderRadius: radius.sm,
  },
  weekDayColSelected: {
    backgroundColor: colors.surfaceSubtle,
  },
  weekDayName: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    marginBottom: 6,
  },
  weekDayNameToday: {
    color: colors.primary,
  },
  weekMedallion: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  weekMedallionStudied: {
    backgroundColor: colors.amber,
    borderColor: colors.amberBottom,
  },
  weekMedallionFree: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "#38BDF8",
  },
  weekMedallionTodayPending: {
    borderColor: colors.amber,
    borderStyle: "dashed",
  },
  weekMedallionMissed: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
  },
  weekMedallionEmptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderLight,
  },
  dayDetailCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  dayDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  dayDetailTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dayDetailStats: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  weekLegendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Milestones
  milestonePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  milestonePillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  milestoneBody: {
    marginTop: spacing.xs,
  },
  milestoneTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  milestoneDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  progressBarWrapper: {
    height: 14,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 7,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 7,
    position: "relative",
  },
  progressGlossHighlight: {
    position: "absolute",
    top: 1,
    left: 4,
    right: 4,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 2,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressLabelLeft: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  progressLabelRight: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  // Badges Grid
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  badgeCard: {
    width: "48%",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    alignItems: "center",
  },
  badgeCardUnlocked: {
    backgroundColor: colors.surface,
    borderColor: colors.borderLight,
  },
  badgeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  badgeIconBoxLocked: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderLight,
  },
  badgeDaysNumber: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 2,
  },
  badgeTitleText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badgeTitleTextLocked: {
    color: colors.textMuted,
  },
  badgeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 6,
  },
  badgeStatusPillLocked: {
    backgroundColor: colors.surfaceSubtle,
  },
  badgeStatusText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.5,
  },
  // CTA
  ctaContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  duoPrimaryBtn: {
    height: 54,
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    borderBottomWidth: 4,
    borderBottomColor: colors.amberBottom,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  duoPrimaryBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  duoShareBtn: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  duoShareBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  debugTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  debugTriggerText: {
    fontSize: typography.fontSizes.caption,
    color: colors.amber,
    fontWeight: typography.fontWeights.semibold,
  },
  // Mystery Secret Styles
  badgeCardLockedSecret: {
    borderStyle: "dashed",
    borderColor: colors.borderLight,
    opacity: 0.9,
  },
  mysteryTeaserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  mysteryOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  mysteryCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 2,
    padding: spacing.xl,
    alignItems: "center",
    position: "relative",
  },
  mysteryGlowCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  mysteryTagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  mysteryTagText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  mysteryCardTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  mysteryCardDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  mysteryClueBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mysteryClueText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  mysteryBtn: {
    width: "100%",
    height: 50,
    borderRadius: radius.md,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  mysteryBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
});
