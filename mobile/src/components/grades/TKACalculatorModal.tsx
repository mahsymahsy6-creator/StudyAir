/**
 * StudyAir Mobile — Kalkulator Nilai TKA (Tes Kemampuan Akademik) Modal
 * 
 * Flexible calculator supporting:
 * 1. UTBK Saintek (Matematika IPA, Fisika, Kimia, Biologi - skala 0-1000)
 * 2. UTBK Soshum (Sosiologi, Sejarah, Geografi, Ekonomi - skala 0-1000)
 * 3. Seleksi Masuk SMA Unggulan (MAN IC, Taruna Nusantara, Labschool - skala 0-100)
 * 4. Kustom (Bebas atur nama subtes, bobot, dan skor)
 * 
 * Features:
 * - Real-time weighted average calculation
 * - Target passing grade comparison with color status
 * - Subtest diagnostics (Strongest vs Weakest requiring drill)
 * - Tactile Duolingo 3D button aesthetic with SoundFX & Haptics
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, typography, touchTarget, spacing, tidySpacing } from "../../theme";
import { TKAPresetType, TKASubtest } from "../../types";
import { getTKAPreset, calculateTKAResult } from "../../lib/gradeEngine";
import { HapticFeedback } from "../../lib/haptics";
import { soundFX } from "../../lib/sound";

interface TKACalculatorModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_TABS: { type: TKAPresetType; label: string; icon: string }[] = [
  { type: "utbk_saintek", label: "Saintek (UTBK)", icon: "flask-outline" },
  { type: "utbk_soshum", label: "Soshum (UTBK)", icon: "book-outline" },
  { type: "sma_unggulan", label: "SMA Unggulan", icon: "school-outline" },
  { type: "custom", label: "Kustom", icon: "construct-outline" },
];

export function TKACalculatorModal({ visible, onClose }: TKACalculatorModalProps) {
  const [activePreset, setActivePreset] = useState<TKAPresetType>("utbk_saintek");
  const [subtests, setSubtests] = useState<TKASubtest[]>([]);
  const [targetScore, setTargetScore] = useState<number>(650);

  // Initialize or reset preset data
  useEffect(() => {
    if (visible) {
      const config = getTKAPreset(activePreset);
      setSubtests(config.subtests);
      setTargetScore(config.defaultTarget);
    }
  }, [visible, activePreset]);

  // Real-time calculation
  const result = useMemo(() => {
    return calculateTKAResult(activePreset, subtests, targetScore);
  }, [activePreset, subtests, targetScore]);

  const handleSelectPreset = (type: TKAPresetType) => {
    HapticFeedback.light();
    soundFX.playClick();
    setActivePreset(type);
  };

  const handleUpdateSubtestScore = (id: string, textScore: string) => {
    const val = parseFloat(textScore);
    const sanitized = isNaN(val) ? 0 : val;
    setSubtests((prev) =>
      prev.map((s) => (s.id === id ? { ...s, score: sanitized } : s))
    );
  };

  const handleAdjustSubtestScore = (id: string, delta: number) => {
    HapticFeedback.light();
    setSubtests((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newScore = Math.max(0, Math.min(s.maxScore, s.score + delta));
        return { ...s, score: newScore };
      })
    );
  };

  const handleAdjustTarget = (delta: number) => {
    HapticFeedback.light();
    setTargetScore((prev) => Math.max(0, prev + delta));
  };

  const handleAddCustomSubtest = () => {
    HapticFeedback.light();
    soundFX.playClick();
    const newId = `sub_${Date.now()}`;
    setSubtests((prev) => [
      ...prev,
      {
        id: newId,
        name: `Subtes ${prev.length + 1}`,
        score: 75,
        maxScore: 100,
        weight: 1,
      },
    ]);
  };

  const handleDeleteCustomSubtest = (id: string) => {
    HapticFeedback.light();
    setSubtests((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateCustomSubtestName = (id: string, name: string) => {
    setSubtests((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
  };

  const handleClose = () => {
    HapticFeedback.light();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={handleClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="calculator" size={18} color={colors.accent} />
                </View>
                <Text style={styles.headerTitle}>Kalkulator Nilai TKA</Text>
              </View>
              <Text style={styles.headerSub}>
                Tes Kemampuan Akademik UTBK & Seleksi Sekolah
              </Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={touchTarget.min / 4}
              accessibilityLabel="Tutup"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Preset Segmented Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {PRESET_TABS.map((tab) => {
              const isSelected = activePreset === tab.type;
              return (
                <Pressable
                  key={tab.type}
                  style={[styles.tabChip, isSelected && styles.tabChipActive]}
                  onPress={() => handleSelectPreset(tab.type)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={15}
                    color={isSelected ? "#FFFFFF" : colors.textSecondary}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* ─── 1. Real-Time Result Banner ─── */}
            <View
              style={[
                styles.resultCard,
                {
                  borderColor: result.isPassed ? colors.emerald : colors.amber,
                },
              ]}
            >
              <View style={styles.resultHeaderRow}>
                <View>
                  <Text style={styles.resultLabel}>RATA-RATA NILAI TKA</Text>
                  <View style={styles.resultScoreRow}>
                    <Text style={styles.resultScoreText}>
                      {result.averageScore.toFixed(1)}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: result.isPassed
                            ? `${colors.emerald}20`
                            : `${colors.amber}20`,
                        },
                      ]}
                    >
                      <Ionicons
                        name={result.isPassed ? "checkmark-circle" : "alert-circle"}
                        size={14}
                        color={result.isPassed ? colors.emerald : colors.amber}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: result.isPassed ? colors.emerald : colors.amber,
                          },
                        ]}
                      >
                        {result.isPassed ? "Target Tercapai" : "Di Bawah Target"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Target Score Box */}
                <View style={styles.targetDisplayBox}>
                  <Text style={styles.targetDisplayLabel}>PASSING GRADE</Text>
                  <Text style={styles.targetDisplayValue}>{targetScore}</Text>
                  <Text
                    style={[
                      styles.targetDeltaText,
                      {
                        color: result.diffFromTarget >= 0 ? colors.emerald : colors.danger,
                      },
                    ]}
                  >
                    {result.diffFromTarget >= 0
                      ? `+${result.diffFromTarget}`
                      : `${result.diffFromTarget}`}
                  </Text>
                </View>
              </View>

              {/* Recommendation Callout */}
              <View style={styles.recommendationBox}>
                <Ionicons name="sparkles" size={15} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={styles.recommendationText}>{result.recommendation}</Text>
              </View>

              {/* Subtest Highlights (Strongest vs Weakest) */}
              <View style={styles.subtestHighlightsRow}>
                {result.strongestSubtest && (
                  <View style={styles.highlightPill}>
                    <Ionicons name="trophy" size={12} color={colors.emerald} style={{ marginRight: 4 }} />
                    <Text style={styles.highlightPillText} numberOfLines={1}>
                      Terkuat: {result.strongestSubtest.name} ({result.strongestSubtest.score})
                    </Text>
                  </View>
                )}
                {result.weakestSubtest && (
                  <View style={[styles.highlightPill, { backgroundColor: `${colors.danger}15` }]}>
                    <Ionicons name="barbell-outline" size={12} color={colors.danger} style={{ marginRight: 4 }} />
                    <Text
                      style={[styles.highlightPillText, { color: colors.danger }]}
                      numberOfLines={1}
                    >
                      Drill: {result.weakestSubtest.name} ({result.weakestSubtest.score})
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ─── 2. Target Passing Grade Stepper ─── */}
            <View style={styles.targetStepperRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepperLabel}>Target Passing Grade Jurusan</Text>
                <Text style={styles.stepperSub}>
                  Atur ambang skor yang ingin kamu capai
                </Text>
              </View>
              <View style={styles.stepperControls}>
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => handleAdjustTarget(activePreset.startsWith("utbk") ? -25 : -5)}
                  hitSlop={touchTarget.min / 4}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </Pressable>
                <TextInput
                  style={styles.targetInput}
                  keyboardType="numeric"
                  value={String(targetScore)}
                  onChangeText={(val) => {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) setTargetScore(parsed);
                  }}
                />
                <Pressable
                  style={styles.stepperBtn}
                  onPress={() => handleAdjustTarget(activePreset.startsWith("utbk") ? 25 : 5)}
                  hitSlop={touchTarget.min / 4}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>

            {/* ─── 3. Subtests List ─── */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Nilai Per Subtes</Text>
              <Text style={styles.sectionCountText}>{subtests.length} Subtes</Text>
            </View>

            {subtests.map((sub, idx) => {
              const deltaSmall = activePreset.startsWith("utbk") ? 25 : 5;
              const deltaLarge = activePreset.startsWith("utbk") ? 50 : 10;

              return (
                <View key={sub.id} style={styles.subtestCard}>
                  <View style={styles.subtestHeaderRow}>
                    {activePreset === "custom" ? (
                      <TextInput
                        style={styles.subtestNameInput}
                        value={sub.name}
                        onChangeText={(txt) => handleUpdateCustomSubtestName(sub.id, txt)}
                        placeholder="Nama Subtes"
                        placeholderTextColor={colors.textMuted}
                      />
                    ) : (
                      <View style={{ flex: 1 }}>
                        <Text style={styles.subtestNameText}>{sub.name}</Text>
                        <Text style={styles.subtestWeightText}>
                          Bobot: {sub.weight}x • Maks {sub.maxScore}
                        </Text>
                      </View>
                    )}

                    {activePreset === "custom" && subtests.length > 1 && (
                      <Pressable
                        style={styles.subtestDeleteBtn}
                        onPress={() => handleDeleteCustomSubtest(sub.id)}
                        hitSlop={touchTarget.min / 4}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    )}
                  </View>

                  {/* Score Input & Quick Steppers */}
                  <View style={styles.subtestControlRow}>
                    <TextInput
                      style={styles.subtestScoreInput}
                      keyboardType="numeric"
                      value={String(sub.score)}
                      onChangeText={(txt) => handleUpdateSubtestScore(sub.id, txt)}
                      maxLength={4}
                    />

                    {/* Quick increment chips */}
                    <View style={styles.quickChipsRow}>
                      <Pressable
                        style={styles.quickChip}
                        onPress={() => handleAdjustSubtestScore(sub.id, -deltaSmall)}
                      >
                        <Text style={styles.quickChipText}>-{deltaSmall}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.quickChip}
                        onPress={() => handleAdjustSubtestScore(sub.id, deltaSmall)}
                      >
                        <Text style={styles.quickChipText}>+{deltaSmall}</Text>
                      </Pressable>
                      <Pressable
                        style={styles.quickChip}
                        onPress={() => handleAdjustSubtestScore(sub.id, deltaLarge)}
                      >
                        <Text style={styles.quickChipText}>+{deltaLarge}</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Progress bar towards maxScore */}
                  <View style={styles.subtestProgressTrack}>
                    <View
                      style={[
                        styles.subtestProgressFill,
                        {
                          width: `${Math.min(100, (sub.score / sub.maxScore) * 100)}%`,
                          backgroundColor:
                            sub.score >= targetScore ? colors.emerald : colors.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}

            {/* Add Custom Subtest Button */}
            {activePreset === "custom" && (
              <Pressable style={styles.addCustomBtn} onPress={handleAddCustomSubtest}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.addCustomBtnText}>+ Tambah Subtes Baru</Text>
              </Pressable>
            )}

            <View style={{ height: spacing.xl }} />
          </ScrollView>

          {/* Bottom Close / Save Action */}
          <View style={styles.footerContainer}>
            <Pressable style={styles.doneBtn} onPress={handleClose}>
              <Text style={styles.doneBtnText}>Selesai & Tutup</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.75)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingTop: 12,
    maxHeight: "90%",
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tidySpacing.screen,
    marginBottom: spacing.sm,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  headerSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
    marginLeft: 36,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
  },
  tabsScroll: {
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: spacing.xs,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: typography.fontWeights.bold,
  },
  bodyScroll: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.md,
  },
  // Result Banner
  resultCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.cardLarge,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  resultScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  resultScoreText: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.text,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  targetDisplayBox: {
    alignItems: "flex-end",
  },
  targetDisplayLabel: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  targetDisplayValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  targetDeltaText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
  },
  recommendationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.08)",
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    lineHeight: 16,
  },
  subtestHighlightsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  highlightPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.emerald}15`,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  highlightPillText: {
    fontSize: 11,
    color: colors.emerald,
    fontWeight: typography.fontWeights.medium,
  },
  // Target Stepper
  targetStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  stepperLabel: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  stepperSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  targetInput: {
    width: 60,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    textAlign: "center",
    color: colors.text,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    paddingVertical: 0,
  },
  // Section Header
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Subtest Card
  subtestCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  subtestHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  subtestNameText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtestWeightText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  subtestNameInput: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  subtestDeleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: `${colors.danger}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  subtestControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  subtestScoreInput: {
    width: 72,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    textAlign: "center",
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 0,
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  subtestProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    marginTop: 8,
    overflow: "hidden",
  },
  subtestProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: radius.md,
    marginTop: 4,
    gap: 6,
  },
  addCustomBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  footerContainer: {
    paddingHorizontal: tidySpacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  doneBtn: {
    height: touchTarget.min,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: "#1D4ED8",
  },
  doneBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
});
