/**
 * StudyAir Mobile — Class Override Modal
 * 
 * Features:
 * - Cancel a single class session for a specific date ("Tiadakan").
 * - Swap subject for a single class session ("Ganti").
 * - Add an extra / replacement class for a specific date ("Kelas Tambahan").
 * - Restore / remove an existing override back to original timetable.
 * - Single-state rendering (never stacks target card and add form simultaneously).
 * - Full period times list horizontally scrollable with period times.
 * - Complete subject list without clipping.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { Subject, Override } from "../../types";
import { formatPeriodLabel } from "../../lib/periodUtils";
import { formatLocaleDate } from "../../lib/dateUtils";

export interface ClassOverrideTarget {
  date: string; // YYYY-MM-DD
  entryId: string; // TimetableEntry ID or generated
  periodNumber: number;
  subjectTitle: string;
  subjectColor: string;
  timeRangeStr: string;
  currentOverride?: Override;
  originalSubjectTitle?: string;
  isNewAdd?: boolean;
}

interface ClassOverrideModalProps {
  visible: boolean;
  target: ClassOverrideTarget | null;
  onClose: () => void;
}

export function ClassOverrideModal({ visible, target, onClose }: ClassOverrideModalProps) {
  const { subjects, periodTimes, addOverride, deleteOverride } = useMobileStudyStore();

  const [mode, setMode] = useState<"menu" | "swap" | "add">("menu");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  // Sync state whenever target changes
  useEffect(() => {
    if (target) {
      if (target.isNewAdd) {
        setMode("add");
      } else {
        setMode("menu");
      }
      setSelectedPeriod(target.periodNumber || 1);
      setSelectedSubjectId("");
      setCustomNote("");
    }
  }, [target]);

  if (!target) return null;

  const formattedDate = formatLocaleDate(target.date, "EEEE, d MMMM yyyy");

  // Handle Cancel Class
  const handleCancelClass = () => {
    Alert.alert(
      "Tiadakan Kelas",
      `Yakin ingin meniadakan kelas ${target.subjectTitle} (${formatPeriodLabel(target.periodNumber)}) pada ${formattedDate}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tiadakan",
          style: "destructive",
          onPress: () => {
            addOverride({
              date: target.date,
              entryId: target.entryId,
              type: "cancelled",
              periodNumber: target.periodNumber,
              customLabel: customNote.trim() || undefined,
            });
            onClose();
          },
        },
      ]
    );
  };

  // Handle Swap Subject
  const handleConfirmSwap = () => {
    if (!selectedSubjectId) {
      Alert.alert("Pilih Mapel", "Silakan pilih mata pelajaran pengganti.");
      return;
    }

    addOverride({
      date: target.date,
      entryId: target.entryId,
      type: "swapped",
      newSubjectId: selectedSubjectId,
      periodNumber: target.periodNumber,
      customLabel: customNote.trim() || undefined,
    });

    onClose();
  };

  // Handle Add Extra Class
  const handleConfirmAdd = () => {
    if (!selectedSubjectId) {
      Alert.alert("Pilih Mapel", "Silakan pilih mata pelajaran untuk kelas tambahan.");
      return;
    }

    const generatedEntryId = `extra-${target.date}-${selectedPeriod}-${Date.now()}`;

    addOverride({
      date: target.date,
      entryId: generatedEntryId,
      type: "added",
      newSubjectId: selectedSubjectId,
      periodNumber: selectedPeriod,
      customLabel: customNote.trim() || "Kelas Tambahan",
    });

    onClose();
  };

  // Handle Restore / Revert Override
  const handleRestoreSchedule = () => {
    deleteOverride(target.date, target.entryId);
    onClose();
  };

  const isCancelled = target.currentOverride?.type === "cancelled";
  const isSwapped = target.currentOverride?.type === "swapped";
  const isAdded = target.currentOverride?.type === "added";

  // Build periods list with actual start/end times
  const periodsList = periodTimes && periodTimes.length > 0
    ? periodTimes
    : Array.from({ length: 8 }).map((_, i) => ({
        periodNumber: i + 1,
        start: "",
        end: "",
      }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          {/* ─── State 1: Menu View (Only for existing classes, never in Add mode) ─── */}
          {mode === "menu" && !target.isNewAdd && (
            <View>
              {/* Header Info Card */}
              <View style={styles.targetCard}>
                <View style={[styles.colorStripe, { backgroundColor: target.subjectColor }]} />
                <View style={styles.targetInfo}>
                  <View style={styles.targetBadgeRow}>
                    <View style={[styles.periodPill, { backgroundColor: `${target.subjectColor}20` }]}>
                      <Text style={[styles.periodPillText, { color: target.subjectColor }]}>
                        {formatPeriodLabel(target.periodNumber)}
                      </Text>
                    </View>
                    {target.timeRangeStr ? (
                      <Text style={styles.targetTimeText}>{target.timeRangeStr}</Text>
                    ) : null}

                    {isCancelled && (
                      <View style={styles.cancelledBadge}>
                        <Text style={styles.cancelledBadgeText}>Ditiadakan</Text>
                      </View>
                    )}
                    {isSwapped && (
                      <View style={styles.swappedBadge}>
                        <Text style={styles.swappedBadgeText}>Diganti</Text>
                      </View>
                    )}
                    {isAdded && (
                      <View style={styles.addedBadge}>
                        <Text style={styles.addedBadgeText}>Tambahan</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.targetTitle, isCancelled && styles.strikethrough]}>
                    {target.subjectTitle}
                  </Text>
                  {target.originalSubjectTitle && (
                    <Text style={styles.originalSubText}>
                      Asli: {target.originalSubjectTitle}
                    </Text>
                  )}
                  <Text style={styles.targetDateText}>{formattedDate}</Text>
                </View>
              </View>

              <View style={styles.optionsList}>
                {/* Existing Override Options */}
                {isCancelled && (
                  <Pressable style={styles.actionBtnSuccess} onPress={handleRestoreSchedule}>
                    <Ionicons name="refresh-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionBtnText}>Pulihkan Jadwal Semula</Text>
                  </Pressable>
                )}

                {isSwapped && (
                  <View style={{ gap: spacing.sm }}>
                    <Pressable style={styles.actionBtnSecondary} onPress={() => setMode("swap")}>
                      <Ionicons name="swap-horizontal" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.actionBtnText}>Ubah Mapel Pengganti Lain</Text>
                    </Pressable>

                    <Pressable style={styles.actionBtnSuccess} onPress={handleRestoreSchedule}>
                      <Ionicons name="refresh-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.actionBtnText}>Kembalikan ke Mapel Asli</Text>
                    </Pressable>
                  </View>
                )}

                {isAdded && (
                  <Pressable style={styles.actionBtnDanger} onPress={handleRestoreSchedule}>
                    <Ionicons name="trash" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionBtnText}>Hapus Kelas Tambahan Ini</Text>
                  </Pressable>
                )}

                {/* Standard Options (if no override yet) */}
                {!target.currentOverride && (
                  <View style={{ gap: spacing.sm }}>
                    {/* Option 1: Cancel this class */}
                    <Pressable style={styles.actionRow} onPress={handleCancelClass}>
                      <View style={[styles.actionRowIcon, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.rose} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionRowTitle}>Tiadakan Kelas Ini</Text>
                        <Text style={styles.actionRowSub}>
                          Guru izin, jam kosong, atau pulang awal khusus tanggal ini saja.
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>

                    {/* Option 2: Swap subject */}
                    <Pressable style={styles.actionRow} onPress={() => setMode("swap")}>
                      <View style={[styles.actionRowIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                        <Ionicons name="swap-horizontal-outline" size={20} color="#f59e0b" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionRowTitle}>Ganti Mata Pelajaran</Text>
                        <Text style={styles.actionRowSub}>
                          Ganti dengan mapel lain khusus sesi ini (misal: guru bertukar jam).
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ─── State 2: Mode Swap Subject ─── */}
          {mode === "swap" && (
            <View style={styles.subFlowContainer}>
              <View style={styles.subFlowHeader}>
                <Pressable onPress={() => setMode("menu")} hitSlop={8} style={{ padding: 4 }}>
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </Pressable>
                <Text style={styles.subFlowTitle}>Pilih Mata Pelajaran Pengganti</Text>
              </View>

              <ScrollView style={styles.subjectScrollView} contentContainerStyle={{ paddingVertical: 4 }}>
                <View style={styles.subjectsGrid}>
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectId === sub.id;
                    const subColor = sub.color || sub.color_hex || colors.primary;
                    return (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.subjectPickCard,
                          isSelected && styles.subjectPickCardSelected,
                          { borderLeftColor: subColor },
                        ]}
                        onPress={() => setSelectedSubjectId(sub.id)}
                      >
                        <Text style={styles.subjectPickTitle} numberOfLines={1}>
                          {sub.title || sub.name}
                        </Text>
                        {sub.teacher && (
                          <Text style={styles.subjectPickTeacher} numberOfLines={1}>
                            {sub.teacher}
                          </Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customNote}
                  onChangeText={setCustomNote}
                  placeholder="Contoh: Mengganti jam Bu Guru..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Pressable style={styles.actionBtnPrimary} onPress={handleConfirmSwap}>
                <Ionicons name="checkmark" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Simpan Perubahan Mapel</Text>
              </Pressable>
            </View>
          )}

          {/* ─── State 3: Mode Add Extra Class ─── */}
          {mode === "add" && (
            <View style={styles.subFlowContainer}>
              <View style={styles.subFlowHeader}>
                <Pressable
                  onPress={() => {
                    if (target.isNewAdd) {
                      onClose();
                    } else {
                      setMode("menu");
                    }
                  }}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </Pressable>
                <Text style={styles.subFlowTitle}>Tambah Kelas Pengganti / Tambahan</Text>
              </View>

              {/* Period Selector (All Periods with Times, Horizontal Scroll) */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Jam Pelajaran Ke-</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                    {periodsList.map((pt) => {
                      const isSel = selectedPeriod === pt.periodNumber;
                      const timeStr = pt.start && pt.end ? ` (${pt.start} - ${pt.end})` : "";
                      return (
                        <Pressable
                          key={pt.periodNumber}
                          style={[styles.periodPickChip, isSel && styles.periodPickChipSelected]}
                          onPress={() => setSelectedPeriod(pt.periodNumber)}
                        >
                          <Text style={[styles.periodPickText, isSel && styles.periodPickTextSelected]}>
                            {formatPeriodLabel(pt.periodNumber)}{timeStr}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Subject Selector (All Subjects, No Cutoff) */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Pilih Mata Pelajaran</Text>
                <ScrollView style={styles.subjectScrollView} contentContainerStyle={{ paddingVertical: 4 }}>
                  <View style={styles.subjectsGrid}>
                    {subjects.map((sub) => {
                      const isSelected = selectedSubjectId === sub.id;
                      const subColor = sub.color || sub.color_hex || colors.primary;
                      return (
                        <Pressable
                          key={sub.id}
                          style={[
                            styles.subjectPickCard,
                            isSelected && styles.subjectPickCardSelected,
                            { borderLeftColor: subColor },
                          ]}
                          onPress={() => setSelectedSubjectId(sub.id)}
                        >
                          <Text style={styles.subjectPickTitle} numberOfLines={1}>
                            {sub.title || sub.name}
                          </Text>
                          {sub.teacher && (
                            <Text style={styles.subjectPickTeacher} numberOfLines={1}>
                              {sub.teacher}
                            </Text>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={customNote}
                  onChangeText={setCustomNote}
                  placeholder="Contoh: Jam tambahan persiapan ujian..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Pressable style={styles.actionBtnPrimary} onPress={handleConfirmAdd}>
                <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Tambahkan Kelas</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "88%",
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  targetCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  colorStripe: {
    width: 5,
  },
  targetInfo: {
    flex: 1,
    padding: spacing.md,
  },
  targetBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  periodPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  periodPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  targetTimeText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  cancelledBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  cancelledBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.rose,
    fontWeight: "700",
  },
  swappedBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  swappedBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.amber,
    fontWeight: "700",
  },
  addedBadge: {
    backgroundColor: "rgba(58, 134, 255, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  addedBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "700",
  },
  targetTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  originalSubText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  targetDateText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  optionsList: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 52,
  },
  actionRowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actionRowTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
  },
  actionRowSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    minHeight: 48,
    marginTop: spacing.sm,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: radius.md,
    minHeight: 48,
  },
  actionBtnSuccess: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.emerald,
    paddingVertical: 14,
    borderRadius: radius.md,
    minHeight: 48,
  },
  actionBtnDanger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.rose,
    paddingVertical: 14,
    borderRadius: radius.md,
    minHeight: 48,
  },
  actionBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: "#ffffff",
  },
  subFlowContainer: {
    paddingTop: spacing.xs,
  },
  subFlowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  subFlowTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  periodPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 40,
    justifyContent: "center",
  },
  periodPickChipSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.2)",
  },
  periodPickText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  periodPickTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  subjectScrollView: {
    maxHeight: 220,
  },
  subjectsGrid: {
    gap: spacing.xs,
  },
  subjectPickCard: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    padding: spacing.sm,
    minHeight: 48,
    justifyContent: "center",
  },
  subjectPickCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.15)",
  },
  subjectPickTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.text,
  },
  subjectPickTeacher: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.sizes.sm,
    minHeight: 44,
  },
});
