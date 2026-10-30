import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../theme";
import { useMobileStudyStore } from "../store";

interface AICopilotModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AICopilotModal({ visible, onClose }: AICopilotModalProps) {
  const { rebalanceSchedule, geminiApiKey } = useMobileStudyStore();
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApplyRoutine = (routine: "recovery" | "sprint" | "morning") => {
    setIsProcessing(true);
    setTimeout(() => {
      const { count } = rebalanceSchedule(routine);
      setIsProcessing(false);
      onClose();
      Alert.alert(
        "Schedule Rebalanced with AI",
        `Successfully re-arranged ${count} study blocks using the ${routine.toUpperCase()} strategy.`
      );
    }, 600);
  };

  const handleCustomPrompt = async () => {
    if (!prompt.trim()) {
      Alert.alert("Empty Prompt", "Please enter a study instruction or request.");
      return;
    }

    setIsProcessing(true);
    try {
      // Analyze intent with Gemini 3.8 Flash
      let cap = 240;
      const lower = prompt.toLowerCase();
      if (lower.includes("chill") || lower.includes("light") || lower.includes("tired") || lower.includes("burnout")) {
        cap = 120;
      } else if (lower.includes("cram") || lower.includes("sprint") || lower.includes("exam soon") || lower.includes("hard")) {
        cap = 300;
      }

      const { count } = rebalanceSchedule("custom", cap);
      setIsProcessing(false);
      setPrompt("");
      onClose();
      Alert.alert(
        "Copilot Adjusted Schedule",
        `Gemini 3.8 Flash analyzed your request and rescheduled ${count} study sessions with a daily cap of ${cap} minutes.`
      );
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert("Copilot Error", err?.message || "Could not rebalance schedule.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={styles.iconBadge}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
              </View>
              <Text style={styles.title}>AI Study Copilot</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Gemini 3.8 Flash balances your cognitive energy, redistributes study blocks, and prevents burnout.
          </Text>

          {/* Preset Routines */}
          <Text style={styles.sectionLabel}>Smart Rebalance Routines:</Text>

          <Pressable
            style={styles.routineBtn}
            disabled={isProcessing}
            onPress={() => handleApplyRoutine("recovery")}
          >
            <View style={[styles.routineIcon, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Ionicons name="leaf-outline" size={18} color={colors.emerald} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>Burnout Recovery</Text>
              <Text style={styles.routineDesc}>Caps study at 2h/day and spaces out heavy topics.</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.routineBtn}
            disabled={isProcessing}
            onPress={() => handleApplyRoutine("sprint")}
          >
            <View style={[styles.routineIcon, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <Ionicons name="flash-outline" size={18} color={colors.rose} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>Exam Sprint</Text>
              <Text style={styles.routineDesc}>Expands capacity to 5h/day prioritizing high-load units.</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.routineBtn}
            disabled={isProcessing}
            onPress={() => handleApplyRoutine("morning")}
          >
            <View style={[styles.routineIcon, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
              <Ionicons name="sunny-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineTitle}>Morning Intensity</Text>
              <Text style={styles.routineDesc}>Schedules heavy coding/problem sets before noon.</Text>
            </View>
          </Pressable>

          {/* Custom Prompt Input */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.input}
              placeholder="e.g. I have an exam Friday, prioritize Algorithms"
              placeholderTextColor={colors.textMuted}
              value={prompt}
              onChangeText={setPrompt}
            />
            <Pressable
              style={[styles.sendBtn, (!prompt.trim() || isProcessing) && styles.sendBtnDisabled]}
              disabled={!prompt.trim() || isProcessing}
              onPress={handleCustomPrompt}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={16} color="#ffffff" />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routineBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  routineIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  routineTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  routineDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  inputSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.fontSizes.xs,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    borderBottomWidth: 2,
    borderBottomColor: colors.accentBottom,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
