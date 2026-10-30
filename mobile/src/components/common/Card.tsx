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
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: tidySpacing.medium,
    position: "relative",
  },
  cardDashed: {
    backgroundColor: colors.blockSurface,
    borderStyle: "dashed",
    borderColor: colors.blockBorder,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
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

