import React from "react";
import { View, Text, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, tidySpacing, radius, touchTarget } from "../../theme";

export interface BannerProps {
  icon?: keyof typeof Ionicons.glyphMap;
  text: string;
  buttonText: string;
  onPress: () => void;
  variant?: "info" | "warning" | "action";
  style?: StyleProp<ViewStyle>;
}

export function Banner({
  icon = "information-circle-outline",
  text,
  buttonText,
  onPress,
  variant = "action",
  style,
}: BannerProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          bg: colors.amberLight,
          border: colors.amber,
          iconColor: colors.amber,
          btnBg: colors.amber,
          btnBottom: colors.amberBottom,
          btnTextColor: colors.textInverse,
        };
      case "info":
        return {
          bg: colors.surfaceSubtle,
          border: colors.borderLight,
          iconColor: colors.textSecondary,
          btnBg: colors.surfaceHover,
          btnBottom: colors.borderBottom,
          btnTextColor: colors.text,
        };
      case "action":
      default:
        return {
          bg: colors.primaryLight,
          border: colors.primary,
          iconColor: colors.primary,
          btnBg: colors.primary,
          btnBottom: colors.primaryBottom,
          btnTextColor: colors.textInverse,
        };
    }
  };

  const vStyle = getVariantStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: vStyle.bg,
          borderColor: vStyle.border,
        },
        style,
      ]}
    >
      <View style={styles.left}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={vStyle.iconColor}
            style={styles.icon}
          />
        )}
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
      </View>
      <Pressable
        onPress={onPress}
        hitSlop={touchTarget.min / 4}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: vStyle.btnBg,
            borderBottomColor: vStyle.btnBottom,
          },
          pressed && styles.buttonPressed,
        ]}
      >
        <Text style={[styles.buttonText, { color: vStyle.btnTextColor }]}>
          {buttonText}
        </Text>
      </Pressable>
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
    borderWidth: 1.5,
    borderRadius: radius.card,
    marginHorizontal: tidySpacing.screen,
    marginVertical: tidySpacing.small,
    minHeight: touchTarget.min,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: tidySpacing.small,
  },
  icon: {
    marginRight: tidySpacing.small,
  },
  text: {
    fontSize: typography.sizes.body,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
    flex: 1,
  },
  button: {
    height: 36,
    paddingHorizontal: tidySpacing.medium,
    borderRadius: radius.sm,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    transform: [{ translateY: 1.5 }],
    borderBottomWidth: 1.5,
  },
  buttonText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.fontWeights.heavy,
  },
});
