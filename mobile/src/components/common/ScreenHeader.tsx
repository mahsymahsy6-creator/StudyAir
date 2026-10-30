import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, tidySpacing } from "../../theme";
import { getMascotStage } from "../../lib/studyStreakEngine";

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  badge?: string | number;
  accessibilityLabel: string;
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onSubtitlePress?: () => void;
  streakText?: string;
  isStreakAtRisk?: boolean;
  onStreakPress?: () => void;
  actions?: HeaderAction[]; // Maximum 2 icon actions
  onBack?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  onSubtitlePress,
  streakText,
  isStreakAtRisk = false,
  onStreakPress,
  actions = [],
  onBack,
}: ScreenHeaderProps) {
  const visibleActions = actions.slice(0, 2);

  const flamePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!streakText || isStreakAtRisk) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(flamePulse, {
          toValue: 1.25,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(flamePulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [streakText, isStreakAtRisk]);

  return (
    <View style={styles.container}>
      {onBack && (
        <Pressable
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={touchTarget.min / 4}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      )}
      <View style={styles.titleColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          onSubtitlePress ? (
            <Pressable
              onPress={onSubtitlePress}
              hitSlop={touchTarget.min / 4}
              style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginTop: 2 }}
              accessibilityLabel={`${subtitle}, ubah bulan`}
            >
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.textSecondary} style={{ marginLeft: 3 }} />
            </Pressable>
          ) : (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )
        )}
      </View>

      <View style={styles.actionCluster}>
        {streakText && (() => {
          const numericDays = parseInt(streakText.replace(/\D/g, ""), 10) || 0;
          const mascotEmoji = getMascotStage(numericDays).emoji;

          return onStreakPress ? (
            <Pressable
              style={[styles.streakBadge, isStreakAtRisk && styles.streakBadgeAtRisk]}
              onPress={onStreakPress}
              hitSlop={touchTarget.min / 4}
              accessibilityRole="button"
              accessibilityLabel={`Streak ${streakText}, ${isStreakAtRisk ? "terancam" : "aktif"}, maskot ${mascotEmoji}, ketuk untuk rincian`}
            >
              <Text style={{ fontSize: 12, marginRight: 3 }}>{mascotEmoji}</Text>
              <Animated.View style={{ transform: [{ scale: flamePulse }] }}>
                <Ionicons
                  name={isStreakAtRisk ? "flame-outline" : "flame"}
                  size={14}
                  color={colors.amber}
                  style={{ marginRight: 3 }}
                />
              </Animated.View>
              <Text style={[styles.streakText, isStreakAtRisk && styles.streakTextAtRisk]}>
                {streakText}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.streakBadge, isStreakAtRisk && styles.streakBadgeAtRisk]}>
              <Text style={{ fontSize: 12, marginRight: 3 }}>{mascotEmoji}</Text>
              <Animated.View style={{ transform: [{ scale: flamePulse }] }}>
                <Ionicons
                  name={isStreakAtRisk ? "flame-outline" : "flame"}
                  size={14}
                  color={colors.amber}
                  style={{ marginRight: 3 }}
                />
              </Animated.View>
              <Text style={[styles.streakText, isStreakAtRisk && styles.streakTextAtRisk]}>
                {streakText}
              </Text>
            </View>
          );
        })()}

        {visibleActions.map((action, idx) => (
          <Pressable
            key={idx}
            style={styles.iconBtn}
            onPress={action.onPress}
            hitSlop={touchTarget.min / 4}
            accessibilityLabel={action.accessibilityLabel}
          >
            <Ionicons
              name={action.icon}
              size={20}
              color={action.color || colors.text}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: tidySpacing.small,
  },
  backBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
    marginRight: tidySpacing.small,
  },
  titleColumn: {
    flex: 1,
    marginRight: tidySpacing.small,
  },
  title: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: tidySpacing.small,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.amberLight,
    borderWidth: 2,
    borderColor: "rgba(255, 150, 0, 0.4)",
    borderBottomWidth: 3.5,
    borderBottomColor: colors.amberBottom,
    paddingHorizontal: tidySpacing.small,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  streakBadgeAtRisk: {
    borderColor: colors.amber,
    borderBottomColor: colors.amberBottom,
    backgroundColor: "rgba(255, 150, 0, 0.25)",
  },
  streakText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.heavy,
    color: colors.amber,
  },
  streakTextAtRisk: {
    color: colors.amber,
  },
  iconBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 3.5,
    borderBottomColor: colors.borderBottom,
    alignItems: "center",
    justifyContent: "center",
  },
});

