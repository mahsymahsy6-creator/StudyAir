import React, { useEffect } from "react";
import { View, Text, StyleSheet, Modal, Pressable, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, typography, touchTarget, spacing } from "../../theme";
import { StreakMilestone, getMascotStage } from "../../lib/studyStreakEngine";
import { StreakEvolutionMascot } from "./StreakEvolutionMascot";
import { ConfettiCannon } from "./ConfettiCannon";
import { HapticFeedback } from "../../lib/haptics";
import { soundFX } from "../../lib/sound";

interface StreakCelebrationModalProps {
  visible: boolean;
  milestone: StreakMilestone | null;
  currentStreak: number;
  isSecretRevealed?: boolean;
  onClose: () => void;
}

export function StreakCelebrationModal({
  visible,
  milestone,
  currentStreak,
  isSecretRevealed = true,
  onClose,
}: StreakCelebrationModalProps) {
  useEffect(() => {
    if (visible && milestone) {
      HapticFeedback.celebration();
      soundFX.playStreakMilestone(milestone.tier);
    }
  }, [visible, milestone]);

  if (!milestone) return null;

  const mascotStage = getMascotStage(currentStreak);
  const isMascotEvolutionDay =
    currentStreak === 1 || currentStreak === 7 || currentStreak === 30 || currentStreak === 100;

  const isRainbow = milestone.tier === "rainbow";
  const isGold = milestone.tier === "gold";
  const isSilver = milestone.tier === "silver";

  const tierColor = isRainbow
    ? "#8B5CF6"
    : isGold
    ? "#F59E0B"
    : isSilver
    ? "#06B6D4"
    : "#EA580C";

  const tierBottomColor = isRainbow
    ? "#6D28D9"
    : isGold
    ? "#D97706"
    : isSilver
    ? "#0891B2"
    : "#C2410C";

  const tierLabel = isRainbow
    ? "Pencapaian Legendaris"
    : isGold
    ? "Pencapaian Emas"
    : isSilver
    ? "Pencapaian Perak"
    : "Pencapaian Perunggu";

  const handleShare = async () => {
    HapticFeedback.light();
    soundFX.playClick();
    try {
      await Share.share({
        message: `🔥 Saya baru saja mencapai streak belajar ${currentStreak} hari di StudyAir! Maskot naga api saya berevolusi menjadi ${mascotStage.name} ${mascotStage.emoji}! #StudyAir #StudyStreak`,
        title: `Pencapaian Streak ${currentStreak} Hari di StudyAir`,
      });
    } catch {
      // Ignore dismiss
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Full-Screen Confetti Cannon Burst with Tier Palette */}
        <ConfettiCannon active={visible} count={48} tier={milestone.tier} />

        <View style={[styles.card, { borderColor: `${tierColor}60` }]}>
          {/* Confetti / Aura decorative circles */}
          <View style={[styles.auraCircle, { backgroundColor: `${tierColor}15` }]} />

          {/* Secret / Evolution Banner */}
          {isMascotEvolutionDay ? (
            <View style={[styles.revealedBanner, { backgroundColor: tierColor }]}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.revealedBannerText}>EVOLUSI MASKOT! {mascotStage.emoji}</Text>
            </View>
          ) : isSecretRevealed ? (
            <View style={[styles.revealedBanner, { backgroundColor: tierColor }]}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.revealedBannerText}>RAHASIA TERUNGKAP!</Text>
            </View>
          ) : null}

          {/* Tier Pill */}
          <View style={[styles.tierPill, { backgroundColor: `${tierColor}20` }]}>
            <Text style={[styles.tierPillText, { color: tierColor }]}>{tierLabel}</Text>
          </View>

          {/* Animated Mascot Centerpiece with Tier Aura */}
          <View style={styles.flameCenterWrapper}>
            <StreakEvolutionMascot size="compact" days={currentStreak} interactive={true} />
          </View>

          {/* Milestone Number & Title */}
          <Text style={styles.streakCountText}>{currentStreak} HARI STREAK!</Text>
          <Text style={styles.milestoneTitle}>{milestone.title}</Text>
          <Text style={styles.milestoneDescription}>{milestone.description}</Text>

          {/* Evolution Lore Card if Mascot Evolved */}
          {isMascotEvolutionDay && (
            <View style={[styles.mascotEvolutionBox, { borderColor: `${tierColor}40` }]}>
              <Text style={styles.mascotEvolutionTitle}>
                {mascotStage.emoji} {mascotStage.name}
              </Text>
              <Text style={styles.mascotEvolutionDesc}>{mascotStage.lore}</Text>
            </View>
          )}

          {/* Congratulatory Motivation */}
          <View style={styles.quoteBox}>
            <Ionicons name="sparkles" size={14} color={tierColor} style={{ marginRight: 6 }} />
            <Text style={styles.quoteText}>
              Dedikasi dan konsistensimu sungguh luar biasa. Ketuk maskot untuk mendengar suaranya!
            </Text>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionButtonsCol}>
            {/* 3D Duolingo Primary Continue Button */}
            <Pressable
              style={[
                styles.continueButton,
                { backgroundColor: tierColor, borderBottomColor: tierBottomColor },
              ]}
              onPress={() => {
                HapticFeedback.success();
                soundFX.playClick();
                onClose();
              }}
              hitSlop={touchTarget.min / 4}
              accessibilityRole="button"
              accessibilityLabel="Lanjutkan Belajar"
            >
              <Text style={styles.continueButtonText}>Lanjutkan Belajar 🔥</Text>
            </Pressable>

            {/* Share Milestone Button */}
            <Pressable
              style={styles.shareButton}
              onPress={handleShare}
              hitSlop={touchTarget.min / 4}
              accessibilityRole="button"
              accessibilityLabel="Bagikan Pencapaian"
            >
              <Ionicons name="share-social-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.shareButtonText}>Bagikan Pencapaian</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 2,
    padding: spacing.xl,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  auraCircle: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -60,
  },
  revealedBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  revealedBannerText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  tierPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  tierPillText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  flameCenterWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.xs,
  },
  streakCountText: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  milestoneTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 4,
  },
  milestoneDescription: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  mascotEvolutionBox: {
    width: "100%",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  mascotEvolutionTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  mascotEvolutionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 15,
  },
  quoteBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  quoteText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionButtonsCol: {
    width: "100%",
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  continueButton: {
    width: "100%",
    height: 52,
    borderRadius: radius.md,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  shareButton: {
    width: "100%",
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
});
