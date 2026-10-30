import React from "react";
import { Text, StyleSheet, Pressable, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, radius, tidySpacing } from "../../theme";

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
      onPress={onPress}
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
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderBottom,
    backgroundColor: colors.surfaceSubtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tidySpacing.medium,
  },
  pressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
    backgroundColor: colors.surfaceHover,
  },
  disabled: {
    opacity: 0.5,
    borderBottomWidth: 2,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.3,
  },
});

