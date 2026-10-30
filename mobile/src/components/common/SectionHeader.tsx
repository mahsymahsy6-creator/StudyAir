import React from "react";
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { colors, typography, tidySpacing, touchTarget } from "../../theme";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string | number;
  actionText?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  actionText,
  onActionPress,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleColumn}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {actionText && onActionPress && (
        <Pressable
          onPress={onActionPress}
          hitSlop={touchTarget.min / 4}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>{actionText}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tidySpacing.screen,
    paddingTop: tidySpacing.medium,
    paddingBottom: tidySpacing.small,
  },
  titleColumn: {
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 28,
    justifyContent: "center",
  },
  actionText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
});

