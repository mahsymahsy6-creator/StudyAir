import React from "react";
import { Text, StyleSheet, Pressable, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, touchTarget, radius, tidySpacing } from "../../theme";

export interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "ai" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  labelStyle,
}: PrimaryButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    if (variant === "ai") return colors.accent;
    if (variant === "danger") return colors.rose;
    return colors.primary;
  };

  const getBottomColor = () => {
    if (disabled) return colors.borderSubtle;
    if (variant === "ai") return colors.accentBottom;
    if (variant === "danger") return colors.roseBottom;
    return colors.primaryBottom;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderBottomColor: getBottomColor(),
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textInverse} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={colors.textInverse}
              style={{ marginRight: tidySpacing.small }}
            />
          )}
          <Text style={[styles.label, labelStyle]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: touchTarget.min,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tidySpacing.medium,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.textInverse,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.3,
  },
});

