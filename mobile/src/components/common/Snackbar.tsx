import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { colors, typography, radius, tidySpacing, touchTarget } from "../../theme";

export interface SnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
  onDismiss: () => void;
  duration?: number; // Default 10000ms (10 seconds)
}

export function Snackbar({
  visible,
  message,
  actionLabel,
  onActionPress,
  onDismiss,
  duration = 10000,
}: SnackbarProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onActionPress && (
        <Pressable
          style={styles.actionBtn}
          onPress={() => {
            onActionPress();
            onDismiss();
          }}
          hitSlop={touchTarget.min / 4}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: tidySpacing.large,
    left: tidySpacing.screen,
    right: tidySpacing.screen,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: tidySpacing.small,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.borderBottom,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  message: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
    flex: 1,
    marginRight: tidySpacing.small,
  },
  actionBtn: {
    paddingVertical: tidySpacing.small / 2,
    paddingHorizontal: tidySpacing.small,
  },
  actionText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
});

