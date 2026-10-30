import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography, touchTarget } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { STREAK_MILESTONES, StreakMilestone } from "../../lib/studyStreakEngine";

interface StreakDebugModalProps {
  visible: boolean;
  onClose: () => void;
}

export function StreakDebugModal({ visible, onClose }: StreakDebugModalProps) {
  const {
    streakState,
    triggerCelebration,
    resetStreak,
    streakDebugOverride,
    setStreakDebugOverride,
    simulateStreakDays,
    addMockStudyToday,
    clearTodayStudySessions,
  } = useMobileStudyStore();

  const { currentStreak, bestStreak, isAtRisk, todayStudied } = streakState;
  const isOverrideActive = streakDebugOverride !== null;

  const handleSetQuickDays = (days: number) => {
    simulateStreakDays(days);
  };

  const handleStepStreak = (delta: number) => {
    const newStreak = Math.max(0, currentStreak + delta);
    setStreakDebugOverride({
      currentStreak: newStreak,
      bestStreak: Math.max(bestStreak, newStreak),
    });
  };

  const handleToggleTodayStudied = (val: boolean) => {
    setStreakDebugOverride({
      todayStudied: val,
      isAtRisk: !val && currentStreak > 0,
    });
  };

  const handleToggleAtRisk = (val: boolean) => {
    setStreakDebugOverride({
      isAtRisk: val,
      todayStudied: !val,
    });
  };

  const handleClearOverride = () => {
    setStreakDebugOverride(null);
  };

  const handleTestCelebration = (milestone: StreakMilestone) => {
    onClose();
    setTimeout(() => {
      triggerCelebration(milestone);
    }, 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.dragHandle} />
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCluster}>
              <View style={styles.debugIconBadge}>
                <Ionicons name="construct" size={18} color="#FF9600" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Debug & Simulator Streak</Text>
                <Text style={styles.sheetSubtitle}>Uji coba perilaku streak, milestone & kondisi belajar</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={touchTarget.min / 4}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* ─── 1. Live Diagnostic Card ─── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionLabel}>STATUS DIAGNOSTIK</Text>
                <View
                  style={[
                    styles.modeBadge,
                    isOverrideActive ? styles.modeBadgeSimulated : styles.modeBadgeReal,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeBadgeText,
                      isOverrideActive ? styles.modeBadgeTextSimulated : styles.modeBadgeTextReal,
                    ]}
                  >
                    {isOverrideActive ? "Simulasi Aktif" : "Data Riil"}
                  </Text>
                </View>
              </View>

              <View style={styles.statGrid}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Streak Saat Ini</Text>
                  <View style={styles.statValueRow}>
                    <Ionicons name="flame" size={20} color="#FF9600" style={{ marginRight: 4 }} />
                    <Text style={styles.statValueBold}>{currentStreak}d</Text>
                  </View>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Rekor Terbaik</Text>
                  <View style={styles.statValueRow}>
                    <Ionicons name="trophy" size={18} color="#FFC800" style={{ marginRight: 4 }} />
                    <Text style={styles.statValueBold}>{bestStreak}d</Text>
                  </View>
                </View>
              </View>

              <View style={styles.statusPillsRow}>
                <View
                  style={[
                    styles.statusPill,
                    todayStudied ? styles.statusPillGreen : styles.statusPillGray,
                  ]}
                >
                  <Ionicons
                    name={todayStudied ? "checkmark-circle" : "ellipse-outline"}
                    size={14}
                    color={todayStudied ? colors.emerald : colors.textMuted}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      todayStudied ? styles.statusPillTextGreen : styles.statusPillTextGray,
                    ]}
                  >
                    {todayStudied ? "Hari Ini Belajar" : "Belum Belajar"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    isAtRisk ? styles.statusPillRed : styles.statusPillGreen,
                  ]}
                >
                  <Ionicons
                    name={isAtRisk ? "alert-circle" : "shield-checkmark"}
                    size={14}
                    color={isAtRisk ? colors.rose : colors.emerald}
                    style={{ marginRight: 5 }}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      isAtRisk ? styles.statusPillTextRed : styles.statusPillTextGreen,
                    ]}
                  >
                    {isAtRisk ? "Streak Terancam!" : "Streak Aman"}
                  </Text>
                </View>
              </View>

              {isOverrideActive && (
                <Pressable style={styles.clearOverrideBtn} onPress={handleClearOverride}>
                  <Ionicons name="arrow-undo" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.clearOverrideBtnText}>Kembalikan ke Perhitungan Riil</Text>
                </Pressable>
              )}
            </View>

            {/* ─── 2. Quick Streak Days Presets ─── */}
            <View style={styles.card}>
              <Text style={styles.cardSectionLabel}>SIMULASI HARI STREAK</Text>
              <Text style={styles.cardDesc}>
                Pilih jumlah hari berturut-turut untuk menghasilkan riwayat belajar otomatis.
              </Text>

              <View style={styles.presetChipsWrap}>
                {[
                  { days: 0, label: "0 Hari (Reset)", icon: "refresh" },
                  { days: 3, label: "3d 🥉", icon: "flame" },
                  { days: 7, label: "7d 🥉", icon: "flame" },
                  { days: 14, label: "14d 🥈", icon: "flash" },
                  { days: 30, label: "30d 🥈", icon: "trophy" },
                  { days: 60, label: "60d 🥇", icon: "medal" },
                  { days: 120, label: "120d 🌈", icon: "infinite" },
                ].map((item) => (
                  <Pressable
                    key={item.days}
                    style={[
                      styles.presetChip,
                      currentStreak === item.days && styles.presetChipActive,
                    ]}
                    onPress={() => handleSetQuickDays(item.days)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        currentStreak === item.days && styles.presetChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Stepper Buttons */}
              <View style={styles.stepperRow}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => handleStepStreak(-1)}
                  hitSlop={touchTarget.min / 4}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                  <Text style={styles.stepBtnText}>-1 Hari</Text>
                </Pressable>

                <View style={styles.stepDisplay}>
                  <Text style={styles.stepDisplayText}>{currentStreak} Hari</Text>
                </View>

                <Pressable
                  style={styles.stepBtn}
                  onPress={() => handleStepStreak(1)}
                  hitSlop={touchTarget.min / 4}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                  <Text style={styles.stepBtnText}>+1 Hari</Text>
                </Pressable>
              </View>
            </View>

            {/* ─── 3. Today State Overrides ─── */}
            <View style={styles.card}>
              <Text style={styles.cardSectionLabel}>KONDISI HARI INI</Text>
              
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Hari Ini Sudah Belajar</Text>
                  <Text style={styles.toggleSub}>Nyalakan api streak hari ini secara langsung</Text>
                </View>
                <Switch
                  value={todayStudied}
                  onValueChange={handleToggleTodayStudied}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Streak Terancam (At-Risk)</Text>
                  <Text style={styles.toggleSub}>Uji tampilan banner darurat & peringatan sebelum 23:59</Text>
                </View>
                <Switch
                  value={isAtRisk}
                  onValueChange={handleToggleAtRisk}
                  trackColor={{ false: colors.border, true: colors.rose }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* ─── 4. Test Milestone Celebrations ─── */}
            <View style={styles.card}>
              <Text style={styles.cardSectionLabel}>UJI PERAYAAN MILESTONE</Text>
              <Text style={styles.cardDesc}>
                Ketuk lencana untuk membuka modal animasi perayaan layar penuh.
              </Text>

              <View style={styles.milestoneGrid}>
                {STREAK_MILESTONES.slice(0, 6).map((m) => {
                  const isRainbow = m.tier === "rainbow";
                  const isGold = m.tier === "gold";
                  const isSilver = m.tier === "silver";
                  const badgeColor = isRainbow ? "#8B5CF6" : isGold ? "#F59E0B" : isSilver ? "#06B6D4" : "#EA580C";

                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.milestoneCard, { borderColor: `${badgeColor}50` }]}
                      onPress={() => handleTestCelebration(m)}
                    >
                      <View style={[styles.milestoneBadgeCircle, { backgroundColor: `${badgeColor}20` }]}>
                        <Ionicons name={m.iconName as any} size={22} color={badgeColor} />
                      </View>
                      <Text style={styles.milestoneDaysText}>{m.days} Hari</Text>
                      <Text style={styles.milestoneTitleText} numberOfLines={1}>
                        {m.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ─── 5. Real Activity Injections ─── */}
            <View style={styles.card}>
              <Text style={styles.cardSectionLabel}>AKSI DATA AKTIVITAS NYATA</Text>
              <Text style={styles.cardDesc}>
                Suntikkan catatan sesi fokus atau tugas nyata langsung ke database SQLite.
              </Text>

              <Pressable
                style={styles.actionBtn}
                onPress={() => addMockStudyToday(25)}
              >
                <Ionicons name="timer-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>+ Catat Sesi Fokus 25 Menit Hari Ini</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, styles.actionBtnSecondary, { marginTop: 8 }]}
                onPress={clearTodayStudySessions}
              >
                <Ionicons name="trash-outline" size={17} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnSecondaryText}>Hapus Aktivitas Belajar Hari Ini</Text>
              </Pressable>

              <Pressable
                style={[styles.actionBtn, styles.actionBtnDanger, { marginTop: 8 }]}
                onPress={resetStreak}
              >
                <Ionicons name="refresh" size={17} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Reset Seluruh Riwayat Streak ke 0</Text>
              </Pressable>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingTop: 10,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: colors.borderLight,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitleCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  debugIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 150, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FF9600",
  },
  sheetTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 3.5,
    borderBottomColor: colors.borderBottom,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modeBadgeReal: {
    backgroundColor: "rgba(88, 204, 2, 0.15)",
  },
  modeBadgeSimulated: {
    backgroundColor: "rgba(255, 150, 0, 0.15)",
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modeBadgeTextReal: {
    color: colors.emerald,
  },
  modeBadgeTextSimulated: {
    color: "#FF9600",
  },
  statGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statValueBold: {
    fontSize: 18,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
  },
  statusPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xs,
  },
  statusPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  statusPillGreen: {
    backgroundColor: "rgba(88, 204, 2, 0.12)",
    borderColor: colors.emerald,
  },
  statusPillRed: {
    backgroundColor: "rgba(255, 75, 75, 0.12)",
    borderColor: colors.rose,
  },
  statusPillGray: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusPillTextGreen: {
    color: colors.emerald,
  },
  statusPillTextRed: {
    color: colors.rose,
  },
  statusPillTextGray: {
    color: colors.textMuted,
  },
  clearOverrideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  clearOverrideBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.primary,
  },
  presetChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: spacing.xs,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderBottomWidth: 3,
    borderBottomColor: colors.borderBottom,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderBottomColor: colors.primaryBottom,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.sm,
  },
  stepBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderBottomWidth: 2.5,
    borderBottomColor: colors.borderBottom,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginLeft: 4,
  },
  stepDisplay: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  stepDisplayText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleLabel: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  toggleSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: 10,
  },
  milestoneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  milestoneCard: {
    width: "31%",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderBottomColor: colors.borderBottom,
  },
  milestoneBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  milestoneDaysText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.text,
  },
  milestoneTitleText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryBottom,
  },
  actionBtnSecondary: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderBottomColor: colors.borderBottom,
  },
  actionBtnDanger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    borderBottomColor: colors.dangerBottom,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: typography.fontWeights.heavy,
    color: "#ffffff",
  },
  actionBtnSecondaryText: {
    fontSize: 12.5,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
  },
});
