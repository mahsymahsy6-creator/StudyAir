import React from "react";
import { View, StyleSheet, Pressable, StyleProp, ViewStyle } from "react-native";
import { colors, radius, tidySpacing, touchTarget } from "../../theme";

export type CardVariant = "solid" | "dashed";

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accentColor?: string; // Rendered strictly as a 4dp left stripe
  dotColor?: string;    // Rendered strictly as a small dot
  disabled?: boolean;
  variant?: CardVariant;
}

export function Card({
  children,
  onPress,
  style,
  accentColor,
  dotColor,
  disabled = false,
  variant = "solid",
}: CardProps) {
  const isDashed = variant === "dashed";

  const content = (
    <View
      style={[
        styles.card,
        isDashed && styles.cardDashed,
        accentColor && { borderLeftWidth: 4, borderLeftColor: accentColor },
        style,
      ]}
    >
      {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      {children}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressableWrapper,
          pressed && styles.pressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pressableWrapper: {
    marginHorizontal: tidySpacing.screen,
    marginVertical: tidySpacing.small,
    minHeight: touchTarget.min,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderBottom,
    padding: tidySpacing.medium,
    position: "relative",
  },
  cardDashed: {
    backgroundColor: colors.blockSurface,
    borderStyle: "dashed",
    borderColor: colors.blockBorder,
    borderWidth: 2,
    borderBottomWidth: 2,
    borderBottomColor: colors.blockBorder,
  },
  pressed: {
    transform: [{ translateY: 2 }],
    opacity: 0.95,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: tidySpacing.medium,
    right: tidySpacing.medium,
  },
});

