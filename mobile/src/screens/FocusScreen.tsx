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
import { colors, spacing, radius, typography } from "../theme";
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
  } = useMobileStudyStore();

  const passedBlockId = route?.params?.blockId;
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const currentStudyBlock = useMemo(() => {
    if (passedBlockId) {
      return studyBlocks.find((b) => b.id === passedBlockId) || null;
    }
    return (
      studyBlocks.find(
        (b) => b.date === todayStr && b.status !== "COMPLETED" && b.status !== "SKIPPED"
      ) || null
    );
  }, [passedBlockId, studyBlocks, todayStr]);

  const targetTask = useMemo(() => {
    if (!currentStudyBlock) return null;
    return tasks.find((t) => t.id === currentStudyBlock.taskId) || null;
  }, [currentStudyBlock, tasks]);

  const [selectedPreset, setSelectedPreset] = useState<number>(25);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects.length > 0 ? subjects[0].id : "general"
  );

  const initialDuration = currentStudyBlock
    ? currentStudyBlock.durationMinutes
    : activeFocusBlock
    ? activeFocusBlock.study_unit.estimated_minutes
    : selectedPreset;

  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialDuration * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [ratingModalVisible, setRatingModalVisible] = useState<boolean>(false);
  const [finishEarlyModalVisible, setFinishEarlyModalVisible] = useState<boolean>(false);
  const [taskCompletionPromptVisible, setTaskCompletionPromptVisible] = useState<boolean>(false);
  const targetEndTimeRef = React.useRef<number | null>(null);

  const triggerFinishHaptics = () => {
    HapticFeedback.success();
    setTimeout(() => HapticFeedback.success(), 300);
    setTimeout(() => HapticFeedback.success(), 600);
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
    if (isRunning) return; // don't change mid-session
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
    setFinishEarlyModalVisible(true);
  };

  const currentSubject: Subject | undefined = currentStudyBlock
    ? subjects.find((s) => s.id === currentStudyBlock.subjectId)
    : activeFocusBlock
    ? activeFocusBlock.subject
    : subjects.find((s) => s.id === selectedSubjectId);

  const subjectTitle = currentSubject
    ? currentSubject.name || currentSubject.title
    : "Fokus Mandiri";
  const subjectColor = currentSubject
    ? currentSubject.color || currentSubject.color_hex || colors.primary
    : colors.primary;

  const unitTitle = targetTask
    ? targetTask.title
    : activeFocusBlock?.study_unit.title || "Deep Focus & Active Recall";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ─── Active Target Card ─── */}
        <View style={styles.targetCard}>
          <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.subjectText}>{subjectTitle}</Text>
            <Text style={styles.unitText} numberOfLines={2}>
              {unitTitle}
            </Text>
          </View>
        </View>

        {/* ─── Subject Selector (If Independent) ─── */}
        {!activeFocusBlock && (
          <View style={styles.selectorSection}>
            <Text style={styles.sectionLabel}>PILIH MATA PELAJARAN</Text>
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
                onPress={() => !isRunning && setSelectedSubjectId("general")}
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
                        backgroundColor: `${dotColor}20`,
                      },
                    ]}
                    onPress={() => !isRunning && setSelectedSubjectId(sub.id)}
                  >
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: dotColor },
                      ]}
                    />
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

        {/* ─── Duration Presets (Pills) ─── */}
        <View style={styles.durationSection}>
          <Text style={styles.sectionLabel}>DURASI WAKTU</Text>
          <View style={styles.durationPillsRow}>
            {DURATION_PRESETS.map((minsPreset) => {
              const isSelected =
                (activeFocusBlock
                  ? activeFocusBlock.study_unit.estimated_minutes
                  : selectedPreset) === minsPreset;
              return (
                <Pressable
                  key={minsPreset}
                  disabled={isRunning || !!activeFocusBlock}
                  style={[
                    styles.durationPill,
                    isSelected && styles.durationPillActive,
                    (isRunning || !!activeFocusBlock) && { opacity: 0.8 },
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

        {/* ─── Circular Timer Visual ─── */}
        <View style={styles.timerCircleOuter}>
          <View style={styles.timerCircleInner}>
            <Text style={styles.timerDigits}>{timeFormatted}</Text>
            <Text style={styles.timerStatus}>
              {isRunning ? "SEDANG FOKUS" : "JEDA / SIAP"}
            </Text>
          </View>
        </View>

        {/* ─── Controls ─── */}
        <View style={styles.controlsRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
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
              size={15}
              color={colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.secondaryButtonText}>{t("repeatTimer") || "Ulangi"}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              isRunning && styles.primaryButtonRunning,
            ]}
            onPress={toggleTimer}
          >
            <Ionicons
              name={isRunning ? "pause" : "play"}
              size={18}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.primaryButtonText}>
              {isRunning ? (t("pauseFocus") || "Jeda") : (t("startFocus") || "Mulai fokus")}
            </Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleFinishEarly}>
            <Ionicons
              name="checkmark"
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.secondaryButtonText}>{t("completeFocus") || "Selesai"}</Text>
          </Pressable>
        </View>

        {/* ─── Post-Session SM-2 Confidence Rating Modal ─── */}
        <Modal
          visible={ratingModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRatingModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <Ionicons
                  name="trophy-outline"
                  size={46}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.modalTitle}>Session Completed!</Text>
              <Text style={styles.modalSubtitle}>
                Rate your mastery or recall confidence to update your spaced
                repetition schedule and study log:
              </Text>

              <View style={styles.ratingsList}>
                <Pressable
                  style={[styles.ratingItem, { borderColor: colors.danger }]}
                  onPress={() => handleRating(1)}
                >
                  <Text style={[styles.ratingNumber, { color: colors.danger }]}>
                    1
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ratingLabel}>Again</Text>
                    <Text style={styles.ratingDesc}>
                      Blackout or high difficulty; review soon
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.ratingItem, { borderColor: colors.amber }]}
                  onPress={() => handleRating(2)}
                >
                  <Text style={[styles.ratingNumber, { color: colors.amber }]}>
                    2
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ratingLabel}>Hard</Text>
                    <Text style={styles.ratingDesc}>
                      Struggled with parts of the material
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.ratingItem, { borderColor: colors.primary }]}
                  onPress={() => handleRating(3)}
                >
                  <Text style={[styles.ratingNumber, { color: colors.primary }]}>
                    3
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ratingLabel}>Good</Text>
                    <Text style={styles.ratingDesc}>
                      Solid recall with moderate effort
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[styles.ratingItem, { borderColor: colors.success }]}
                  onPress={() => handleRating(4)}
                >
                  <Text style={[styles.ratingNumber, { color: colors.success }]}>
                    4
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ratingLabel}>Easy</Text>
                    <Text style={styles.ratingDesc}>
                      Mastered topic; expand review interval
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Themed Finish Early Confirmation Modal ─── */}
        <Modal
          visible={finishEarlyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFinishEarlyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="timer" size={44} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Selesaikan Sesi Belajar?</Text>
              <Text style={styles.modalSubtitle}>
                Waktu fokus yang sudah berjalan akan tetap tercatat dan dihitung ke statistik streak harianmu.
              </Text>

              <Pressable
                style={[styles.primaryButton, { width: "100%", marginTop: 16 }]}
                onPress={() => {
                  setFinishEarlyModalVisible(false);
                  setRatingModalVisible(true);
                }}
              >
                <Text style={styles.primaryButtonText}>Simpan & Nilai Pemahaman</Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryButton, { width: "100%", marginTop: 8 }]}
                onPress={() => {
                  setFinishEarlyModalVisible(false);
                  targetEndTimeRef.current = Date.now() + secondsRemaining * 1000;
                  setIsRunning(true);
                }}
              >
                <Text style={styles.secondaryButtonText}>Lanjutkan Fokus</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ─── Task Completion Prompt Modal ─── */}
        <Modal
          visible={taskCompletionPromptVisible}
          transparent
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <Ionicons name="checkmark-circle" size={44} color={colors.emerald} />
              </View>
              <Text style={styles.modalTitle}>Blok Belajar Selesai! 🎉</Text>
              <Text style={styles.modalSubtitle}>
                {t("apakah_tugas_selesai", { task: targetTask?.title || "Tugas" })}
              </Text>

              <Pressable
                style={[styles.primaryButton, { width: "100%", marginTop: 16, backgroundColor: colors.emerald, borderColor: colors.emeraldBottom }]}
                onPress={() => handleConfirmTaskCompletion(true)}
              >
                <Text style={styles.primaryButtonText}>{t("tandai_tugas_selesai")}</Text>
              </Pressable>

              <Pressable
                style={[styles.secondaryButton, { width: "100%", marginTop: 8 }]}
                onPress={() => handleConfirmTaskCompletion(false)}
              >
                <Text style={styles.secondaryButtonText}>{t("masih_ada_sisa")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    justifyContent: "space-between",
    minHeight: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  backButton: {
    fontSize: typography.fontSizes.sm,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  headerTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  subjectDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  subjectText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  unitText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginTop: 2,
  },
  selectorSection: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subjectChipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  subjectChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subjectChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  subjectChipTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  durationSection: {
    marginTop: spacing.md,
  },
  durationPillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  durationPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  durationPillActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(59, 130, 246, 0.18)",
  },
  durationPillText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  durationPillTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  pomodoroBadge: {
    fontSize: 8,
    color: colors.primary,
    marginTop: 2,
    fontWeight: "700",
  },
  timerCircleOuter: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 4,
    borderColor: "rgba(59, 130, 246, 0.35)",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(17, 23, 38, 0.7)",
    marginVertical: spacing.lg,
  },
  timerCircleInner: {
    alignItems: "center",
  },
  timerDigits: {
    fontSize: 48,
    fontWeight: typography.fontWeights.heavy,
    color: colors.text,
    fontFamily: "monospace",
    letterSpacing: 2,
  },
  timerStatus: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginTop: 6,
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  primaryButtonRunning: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 18,
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
  },
  ratingNumber: {
    fontSize: typography.fontSizes.lg,
    fontWeight: "800",
    color: colors.text,
    width: 30,
  },
  ratingLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  ratingDesc: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
