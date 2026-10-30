import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, radius, touchTarget, tidySpacing } from "../../theme";
import { PrimaryButton } from "./PrimaryButton";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  primaryButtonLabel?: string;
  onPrimaryButtonPress?: () => void;
  primaryButtonDisabled?: boolean;
  primaryButtonLoading?: boolean;
  primaryButtonVariant?: "primary" | "ai" | "danger";
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  primaryButtonLabel,
  onPrimaryButtonPress,
  primaryButtonDisabled = false,
  primaryButtonLoading = false,
  primaryButtonVariant = "primary",
}: BottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={{ width: 24 }} />
            <View style={styles.titleColumn}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={touchTarget.min / 4}
              style={styles.closeBtn}
              accessibilityLabel="Tutup"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Sheet Body */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Single Bottom Primary Button */}
          {primaryButtonLabel && onPrimaryButtonPress && (
            <View style={styles.footer}>
              <PrimaryButton
                label={primaryButtonLabel}
                onPress={onPrimaryButtonPress}
                disabled={primaryButtonDisabled}
                loading={primaryButtonLoading}
                variant={primaryButtonVariant}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: tidySpacing.small,
    paddingBottom: tidySpacing.small,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tidySpacing.screen,
    paddingBottom: tidySpacing.small,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleColumn: {
    alignItems: "center",
    flex: 1,
  },
  title: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    paddingHorizontal: tidySpacing.screen,
  },
  bodyContent: {
    paddingVertical: tidySpacing.medium,
    paddingBottom: tidySpacing.large,
  },
  footer: {
    padding: tidySpacing.screen,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

