import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, radius, tidySpacing } from "../../theme";

export interface EmptyStateProps {
  message: string;
  subMessage?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean; // If true, renders as one slim line
}

export function EmptyState({
  message,
  subMessage,
  icon = "calendar-outline",
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <View style={styles.compactBox}>
        <Ionicons name={icon} size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
        <Text style={styles.compactText} numberOfLines={1}>
          {message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Ionicons name={icon} size={32} color={colors.textMuted} />
      <Text style={styles.title}>{message}</Text>
      {subMessage && <Text style={styles.subtitle}>{subMessage}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  compactBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: tidySpacing.small,
    marginHorizontal: tidySpacing.screen,
    marginVertical: tidySpacing.small / 2,
  },
  compactText: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    flex: 1,
  },
  box: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tidySpacing.large,
    paddingHorizontal: tidySpacing.screen,
    marginHorizontal: tidySpacing.screen,
    marginVertical: tidySpacing.small,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginTop: tidySpacing.small,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
});

