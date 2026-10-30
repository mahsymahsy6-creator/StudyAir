import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, tidySpacing, radius } from "../../theme";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  dotColor?: string;
  stripeColor?: string;
  statusBadge?: React.ReactNode;
  rightText?: string;
  showChevron?: boolean;
  onPress?: () => void;
  strikethrough?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftIconColor?: string;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  dotColor,
  stripeColor,
  statusBadge,
  rightText,
  showChevron = true,
  onPress,
  strikethrough = false,
  leftIcon,
  leftIconColor,
}: ListRowProps) {
  const content = (
    <View
      style={[
        styles.row,
        stripeColor && { borderLeftWidth: 4, borderLeftColor: stripeColor },
      ]}
    >
      <View style={styles.leftCluster}>
        {leading ? (
          <View style={styles.leadingContainer}>{leading}</View>
        ) : (
          <>
            {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
            {leftIcon && (
              <Ionicons
                name={leftIcon}
                size={18}
                color={leftIconColor || colors.textSecondary}
                style={{ marginRight: tidySpacing.small }}
              />
            )}
          </>
        )}
        <View style={styles.textColumn}>
          <Text
            style={[styles.title, strikethrough && styles.strikethrough]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightCluster}>
        {statusBadge}
        {rightText && <Text style={styles.rightText}>{rightText}</Text>}
        {trailing ? (
          typeof trailing === "string" ? (
            <Text style={styles.rightText}>{trailing}</Text>
          ) : (
            trailing
          )
        ) : null}
        {showChevron && (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: touchTarget.min,
    justifyContent: "center",
    marginVertical: tidySpacing.small / 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: tidySpacing.small,
    minHeight: touchTarget.min,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginHorizontal: tidySpacing.screen,
    marginVertical: tidySpacing.small / 2,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  leftCluster: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: tidySpacing.small,
  },
  leadingContainer: {
    marginRight: tidySpacing.small,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: tidySpacing.small,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: tidySpacing.small,
  },
  rightText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semibold,
  },
});

