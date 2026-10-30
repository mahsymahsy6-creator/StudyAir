import React from "react";
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle, TextStyle } from "react-native";
import { colors, typography, touchTarget, tidySpacing } from "../../theme";

export interface TextButtonProps {
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function TextButton({
  label,
  onPress,
  color = colors.primary,
  disabled = false,
  style,
  labelStyle,
}: TextButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={touchTarget.min / 4}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color }, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: tidySpacing.small,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
  },
});

