import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { colors, typography, radius, tidySpacing } from "../../theme";

export type StatusVariant = "amber" | "green" | "red" | "gray" | "blue" | "purple" | "ai";

export interface StatusPillProps {
  label: string;
  variant?: StatusVariant;
  style?: StyleProp<ViewStyle>;
}

export function StatusPill({ label, variant = "gray", style }: StatusPillProps) {
  const getTheme = () => {
    switch (variant) {
      case "purple":
      case "ai":
        return {
          bg: colors.accentLight,
          text: colors.accent,
          border: colors.accent,
          borderBottom: colors.accentBottom,
        };
      case "amber":
        return {
          bg: colors.amberLight,
          text: colors.amber,
          border: colors.amber,
          borderBottom: colors.amberBottom,
        };
      case "green":
        return {
          bg: colors.emeraldLight,
          text: colors.emerald,
          border: colors.emerald,
          borderBottom: colors.emeraldBottom,
        };
      case "red":
        return {
          bg: colors.roseLight,
          text: colors.rose,
          border: colors.rose,
          borderBottom: colors.roseBottom,
        };
      case "blue":
        return {
          bg: colors.primaryLight,
          text: colors.primary,
          border: colors.primary,
          borderBottom: colors.primaryBottom,
        };
      case "gray":
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          border: colors.border,
          borderBottom: colors.borderBottom,
        };
    }
  };

  const theme = getTheme();

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
          borderBottomColor: theme.borderBottom,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: tidySpacing.small,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderBottomWidth: 2.5,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.heavy,
    letterSpacing: 0.3,
  },
});

