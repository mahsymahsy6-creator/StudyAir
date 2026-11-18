import React from "react";
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { colors, typography, touchTarget, radius, tidySpacing } from "../../theme";
import { soundFX } from "../../lib/sound";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  count?: number | string;
  dotColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  count,
  dotColor,
  style,
}: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        soundFX.playClick();
        onPress();
      }}
      hitSlop={touchTarget.min / 4}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      {dotColor && <Text style={[styles.dot, { color: dotColor }]}>• </Text>}
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
      {count !== undefined && (
        <Text style={[styles.count, selected && styles.countSelected]}>
          {" "}({count})
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 38,
    paddingHorizontal: tidySpacing.medium,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 3.5,
    borderBottomColor: colors.borderBottom,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: tidySpacing.small,
    marginBottom: tidySpacing.small,
  },
  chipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderBottomColor: colors.primaryBottom,
  },
  pressed: {
    transform: [{ translateY: 1.5 }],
    borderBottomWidth: 2,
  },
  dot: {
    fontSize: 16,
    lineHeight: 16,
  },
  label: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.text,
    fontWeight: typography.fontWeights.heavy,
  },
  count: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  countSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.heavy,
  },
});

