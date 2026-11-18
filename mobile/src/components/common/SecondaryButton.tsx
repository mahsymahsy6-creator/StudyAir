import React from "react";
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, radius, tidySpacing } from "../../theme";
import { soundFX } from "../../lib/sound";

export interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function SecondaryButton({
  label,
  onPress,
  icon,
  disabled = false,
  style,
  labelStyle,
}: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={() => {
        soundFX.playClick();
        onPress();
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={18}
          color={colors.textSecondary}
          style={{ marginRight: tidySpacing.small }}
        />
      )}
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: touchTarget.min,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tidySpacing.medium,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: colors.surfaceHover,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.3,
  },
});

