import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { ConfidenceRating, Subject } from "../types";
import { HapticFeedback } from "../lib/haptics";
import { t } from "../lib/i18n";
import { activateKeepAwake, deactivateKeepAwake } from "../lib/keepAwake";

interface FocusScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack?: () => void;
  };
  route?: {
    params?: {
      blockId?: string;
      taskId?: string;
    };
  };
}

const DURATION_PRESETS = [15, 25, 45, 60];

export function FocusScreen({ navigation, route }: FocusScreenProps) {
  const {
    activeFocusBlock,
    studyBlocks,
    tasks,
    updateStudyBlock,
    toggleTaskCompletion,
    completeFocusSession,
    logIndependentFocusSession,
    subjects,
    streakState,
  } = useMobileStudyStore();

  const passedBlockId = route?.params?.blockId;
  const passedTaskId = route?.params?.taskId;
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const currentStudyBlock = useMemo(() => {
    if (passedBlockId) {
      return studyBlocks.find((b) => b.id === passedBlockId) || null;
    }
    if (passedTaskId) {
      return (
        studyBlocks.find(
          (b) => b.taskId === passedTaskId && b.status !== "COMPLETED" && b.status !== "SKIPPED"
        ) || null
      );
    }
    return (
      studyBlocks.find(
        (b) => b.date === todayStr && b.status !== "COMPLETED" && b.status !== "SKIPPED"
      ) || null
    );
  }, [passedBlockId, passedTaskId, studyBlocks, todayStr]);

  const targetTask = useMemo(() => {
    if (passedTaskId) {
      return tasks.find((t) => t.id === passedTaskId) || null;
    }
    if (!currentStudyBlock) return null;
    return tasks.find((t) => t.id === currentStudyBlock.taskId) || null;
  }, [passedTaskId, currentStudyBlock, tasks]);

  const [selectedPreset, setSelectedPreset] = useState<number>(25);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    targetTask?.subjectId || (subjects.length > 0 ? subjects[0].id : "general")
  );

  const initialDuration = currentStudyBlock
    ? currentStudyBlock.durationMinutes
    : activeFocusBlock
    ? activeFocusBlock.study_unit.estimated_minutes
    : selectedPreset;

  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [ratingModalVisible, setRatingModalVisible] = useState<boolean>(false);
  const [taskCompletionPromptVisible, setTaskCompletionPromptVisible] = useState<boolean>(false);
  const targetEndTimeRef = useRef<number | null>(null);

  const triggerFinishHaptics = () => {
    HapticFeedback.success();
    setTimeout(() => HapticFeedback.success(), 300);
  };

  // Sync timer if activeFocusBlock changes
  useEffect(() => {
    if (activeFocusBlock) {
      setIsRunning(false);
      targetEndTimeRef.current = null;
      const mins = activeFocusBlock.study_unit.estimated_minutes;
      setSelectedPreset(mins);
      setSecondsRemaining(mins * 60);
    }
  }, [activeFocusBlock?.id]);

  // Background and Screen-lock resilient timer sync via AppState
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState === "active" && isRunning && targetEndTimeRef.current) {
        const now = Date.now();
        const diffSec = Math.max(0, Math.round((targetEndTimeRef.current - now) / 1000));
        setSecondsRemaining(diffSec);
        if (diffSec === 0) {
          setIsRunning(false);
          targetEndTimeRef.current = null;
          triggerFinishHaptics();
          setRatingModalVisible(true);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isRunning]);

  // Interval ticker using target timestamp
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        if (targetEndTimeRef.current) {
          const diffSec = Math.max(0, Math.round((targetEndTimeRef.current - Date.now()) / 1000));
          setSecondsRemaining(diffSec);
          if (diffSec === 0) {
            setIsRunning(false);
            targetEndTimeRef.current = null;
            triggerFinishHaptics();
            setRatingModalVisible(true);
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
    }
    return () => {
      deactivateKeepAwake();
    };
  }, [isRunning]);

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;

  const currentDurationTotal = (activeFocusBlock
    ? activeFocusBlock.study_unit.estimated_minutes
    : selectedPreset) * 60;

  const handleSelectPreset = (minutes: number) => {
    if (isRunning) return;
    HapticFeedback.light();
    setSelectedPreset(minutes);
    setSecondsRemaining(minutes * 60);
  };

  const handleRating = (rating: ConfidenceRating) => {
    HapticFeedback.success();
    const elapsedMins = Math.max(
      1,
      Math.round((currentDurationTotal - secondsRemaining) / 60)
    );

    if (currentStudyBlock) {
      updateStudyBlock(currentStudyBlock.id, {
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
      });
    }

    if (activeFocusBlock) {
      completeFocusSession(activeFocusBlock.id, elapsedMins, rating);
    } else {
      logIndependentFocusSession(currentSubject?.id || selectedSubjectId, elapsedMins, rating);
    }
    setRatingModalVisible(false);

    if (targetTask && targetTask.status !== "COMPLETED") {
      setTaskCompletionPromptVisible(true);
    } else {
      navigation.navigate("Today");
    }
  };

  const handleConfirmTaskCompletion = (completed: boolean) => {
    if (completed && targetTask) {
      toggleTaskCompletion(targetTask.id);
    }
    setTaskCompletionPromptVisible(false);
    navigation.navigate("Today");
  };

  const toggleTimer = () => {
    HapticFeedback.light();
    if (!isRunning) {
      targetEndTimeRef.current = Date.now() + secondsRemaining * 1000;
      setIsRunning(true);
    } else {
      targetEndTimeRef.current = null;
      setIsRunning(false);
    }
  };

  const handleFinishEarly = () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setRatingModalVisible(true);
  };

  const currentSubject: Subject | undefined = currentStudyBlock
    ? subjects.find((s) => s.id === currentStudyBlock.subjectId)
    : targetTask
    ? subjects.find((s) => s.id === targetTask.subjectId)
    : activeFocusBlock
    ? activeFocusBlock.subject
    : subjects.find((s) => s.id === selectedSubjectId);

  const subjectTitle = currentSubject
    ? currentSubject.name || currentSubject.title
    : "Fokus Belajar";
  const subjectColor = currentSubject
    ? currentSubject.color || currentSubject.color_hex || colors.primary
    : colors.primary;

  const unitTitle = targetTask
    ? targetTask.title
    : activeFocusBlock?.study_unit.title || "Fokus Mendalam & Latihan Soal";

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ─── Minimalist Header ─── */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            HapticFeedback.light();
            if (navigation.goBack) navigation.goBack();
            else navigation.navigate("Today");
          }}
          hitSlop={touchTarget.min / 4}
          accessibilityLabel="Kembali"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isRunning ? (t("zen_mode_running") || "Sesi Fokus Berjalan") : "Ruang Fokus"}
          </Text>
        </View>

        <View style={styles.streakBadge}>
          <Ionicons name="flame" size={16} color={colors.amber} />
          <Text style={styles.streakBadgeText}>{streakState?.currentStreak || 0}d</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ─── Active Task Pill ─── */}
        <View style={styles.targetCard}>
          <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.subjectText}>{subjectTitle}</Text>
            <Text style={styles.unitText} numberOfLines={2}>
              {unitTitle}
            </Text>
          </View>
          <View style={styles.modeBadge}>
            <Ionicons name="sparkles" size={13} color={colors.accent} />
            <Text style={styles.modeBadgeText}>Zen Mode</Text>
          </View>
        </View>

        {/* ─── In Idle Mode: Subject & Duration Pickers ─── */}
        {!isRunning && (
          <>
            {/* Subject selector if independent */}
            {!activeFocusBlock && !currentStudyBlock && (
              <View style={styles.selectorSection}>
                <Text style={styles.sectionLabel}>MATA PELAJARAN</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.subjectChipsRow}
                >
                  <Pressable
                    style={[
                      styles.subjectChip,
                      selectedSubjectId === "general" && styles.subjectChipActive,
                    ]}
                    onPress={() => setSelectedSubjectId("general")}
                  >
                    <Text
                      style={[
                        styles.subjectChipText,
                        selectedSubjectId === "general" && styles.subjectChipTextActive,
                      ]}
                    >
                      Fokus Mandiri
                    </Text>
                  </Pressable>
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectId === sub.id;
                    const dotColor = sub.color || sub.color_hex || colors.primary;
                    return (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.subjectChip,
                          isSelected && {
                            borderColor: dotColor,
                            backgroundColor: `${dotColor}25`,
                          },
                        ]}
                        onPress={() => setSelectedSubjectId(sub.id)}
                      >
                        <View style={[styles.chipDot, { backgroundColor: dotColor }]} />
                        <Text
                          style={[
                            styles.subjectChipText,
                            isSelected && { color: colors.text, fontWeight: "700" },
                          ]}
                        >
                          {sub.title || sub.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Duration Presets */}
            <View style={styles.durationSection}>
              <Text style={styles.sectionLabel}>DURASI FOKUS</Text>
              <View style={styles.durationPillsRow}>
                {DURATION_PRESETS.map((minsPreset) => {
                  const isSelected =
                    (activeFocusBlock
                      ? activeFocusBlock.study_unit.estimated_minutes
                      : selectedPreset) === minsPreset;
                  return (
                    <Pressable
                      key={minsPreset}
                      style={[
                        styles.durationPill,
                        isSelected && styles.durationPillActive,
                      ]}
                      onPress={() => handleSelectPreset(minsPreset)}
                    >
                      <Text
                        style={[
                          styles.durationPillText,
                          isSelected && styles.durationPillTextActive,
                        ]}
                      >
                        {minsPreset}m
                      </Text>
                      {minsPreset === 25 && (
                        <Text style={styles.pomodoroBadge}>Pomodoro</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* ─── Zen Minimalist Circular Timer Visual ─── */}
        <View style={styles.timerContainer}>
          <View style={[styles.timerCircleOuter, isRunning && styles.timerCircleOuterRunning]}>
            <View style={styles.timerCircleInner}>
              <Text style={styles.timerDigits}>{timeFormatted}</Text>
              <Text style={styles.timerStatus}>
                {isRunning ? "SEDANG FOKUS" : "SIAP DIMULAI"}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Zen Controls Row ─── */}
        <View style={styles.controlsRow}>
          {/* Reset / Ulangi */}
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              HapticFeedback.light();
              setIsRunning(false);
              setSecondsRemaining(
                (activeFocusBlock
                  ? activeFocusBlock.study_unit.estimated_minutes
                  : selectedPreset) * 60
              );
            }}
          >
            <Ionicons
              name="refresh"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </Pressable>

          {/* Primary Play / Pause Button */}
          <Pressable
            style={[
              styles.primaryButton,
              isRunning ? styles.primaryButtonRunning : styles.primaryButtonIdle,
            ]}
            onPress={toggleTimer}
          >
            <Ionicons
              name={isRunning ? "pause" : "play"}
              size={22}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.primaryButtonText}>
              {isRunning ? (t("pauseFocus") || "Jeda") : (t("startFocus") || "Mulai Fokus")}
            </Text>
          </Pressable>

          {/* Finish Early Button */}
          <Pressable style={styles.secondaryButton} onPress={handleFinishEarly}>
            <Ionicons
              name="checkmark-done"
              size={18}
              color={colors.emerald}
            />
            <Text style={[styles.secondaryButtonText, { color: colors.emerald }]}>
              {t("completeFocus") || "Selesai"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ─── Post-Session Confidence Rating Modal ─── */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.trophyIconBadge}>
              <Ionicons name="trophy" size={32} color={colors.amber} />
            </View>
            <Text style={styles.modalTitle}>Sesi Fokus Berhasil! 🎉</Text>
            <Text style={styles.modalSubtitle}>
              Bagaimana pemahamanmu terhadap materi tugas ini?
            </Text>

            <View style={styles.ratingsList}>
              <Pressable
                style={[styles.ratingItem, { borderColor: colors.emerald }]}
                onPress={() => handleRating(4)}
              >
                <View style={[styles.ratingIconCircle, { backgroundColor: `${colors.emerald}20` }]}>
                  <Ionicons name="sparkles" size={18} color={colors.emerald} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ratingLabel}>Sangat Paham & Lancar</Text>
                  <Text style={styles.ratingDesc}>Materi tuntas, siap untuk materi baru.</Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.ratingItem, { borderColor: colors.primary }]}
                onPress={() => handleRating(3)}
              >
                <View style={[styles.ratingIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="book-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ratingLabel}>Cukup Mengerti</Text>
                  <Text style={styles.ratingDesc}>Perlu sedikit review dan latihan soal.</Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.ratingItem, { borderColor: colors.rose }]}
                onPress={() => handleRating(1)}
              >
                <View style={[styles.ratingIconCircle, { backgroundColor: `${colors.rose}20` }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.rose} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ratingLabel}>Masih Sulit</Text>
                  <Text style={styles.ratingDesc}>Jadwalkan review ulang dalam waktu dekat.</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Task Completion Confirm Prompt ─── */}
      <Modal
        visible={taskCompletionPromptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => handleConfirmTaskCompletion(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkbox-outline" size={36} color={colors.primary} style={{ alignSelf: "center", marginBottom: spacing.xs }} />
            <Text style={styles.modalTitle}>Tugas Sudah Selesai?</Text>
            <Text style={styles.modalSubtitle}>
              Apakah kamu sudah menuntaskan "{targetTask?.title}" sepenuhnya?
            </Text>

            <View style={styles.confirmPromptButtons}>
              <Pressable
                style={styles.cancelPromptBtn}
                onPress={() => handleConfirmTaskCompletion(false)}
              >
                <Text style={styles.cancelPromptBtnText}>Belum, Lanjut Nanti</Text>
              </Pressable>
              <Pressable
                style={styles.confirmPromptBtn}
                onPress={() => handleConfirmTaskCompletion(true)}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.confirmPromptBtnText}>Ya, Tandai Selesai</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  streakBadgeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.amber,
  },
  scrollContent: {
    paddingHorizontal: tidySpacing.screen,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  targetCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  subjectDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  subjectText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  unitText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  modeBadgeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  selectorSection: {
    width: "100%",
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  subjectChipsRow: {
    gap: spacing.xs,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  subjectChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subjectChipText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  subjectChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  durationSection: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  durationPillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  durationPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  durationPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationPillText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  durationPillTextActive: {
    color: "#FFFFFF",
  },
  pomodoroBadge: {
    fontSize: 9,
    color: "#FFFFFF",
    fontWeight: typography.fontWeights.bold,
    marginTop: 2,
  },
  // Circular Timer
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.xl,
  },
  timerCircleOuter: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.surface,
    borderWidth: 6,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  timerCircleOuterRunning: {
    borderColor: colors.accent,
  },
  timerCircleInner: {
    alignItems: "center",
  },
  timerDigits: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: 1,
  },
  timerStatus: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    marginTop: 6,
    letterSpacing: 1,
  },
  // Controls
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  primaryButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: radius.full,
  },
  primaryButtonIdle: {
    backgroundColor: colors.primary,
  },
  primaryButtonRunning: {
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 14,
    borderRadius: radius.full,
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  // Modal Rating
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  trophyIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  ratingsList: {
    gap: spacing.sm,
  },
  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  ratingIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingLabel: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  ratingDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confirmPromptButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelPromptBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
  },
  cancelPromptBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  confirmPromptBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  confirmPromptBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
});
