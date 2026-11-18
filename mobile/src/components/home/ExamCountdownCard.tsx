/**
 * StudyAir Mobile — Exam Countdown & Study Milestone Card (Phase 11)
 * 
 * Features:
 * 1. Nearest upcoming exam countdown badge ("⏳ 12 hari lagi").
 * 2. Visual progress towards exam preparedness.
 * 3. Interactive milestone checklist (e.g. Read chapters, solve exercises, mock test).
 * 4. Modal to customize exam title, exam date, and study milestones.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../../theme";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { Subject } from "../../types";
import { HapticFeedback } from "../../lib/haptics";

import { calculateDaysLeft, formatLocaleDate } from "../../lib/dateUtils";

export interface ExamMilestone {
  id: string;
  title: string;
  completed: boolean;
}

interface ExamCountdownCardProps {
  subjects: Subject[];
  onOpenSubjectsTab?: () => void;
}

export function ExamCountdownCard({
  subjects,
  onOpenSubjectsTab,
}: ExamCountdownCardProps) {
  // Default general exam configuration
  const [examTitle, setExamTitle] = useState("Ujian Akhir Semester (UAS)");
  const [examDateStr, setExamDateStr] = useState("2026-11-25");
  const [milestones, setMilestones] = useState<ExamMilestone[]>([
    { id: "m-1", title: "Rangkuman materi Bab 1 - 4", completed: true },
    { id: "m-2", title: "Latihan bank soal & kisi-kisi", completed: false },
    { id: "m-3", title: "Diskusi & review kelompok", completed: false },
    { id: "m-4", title: "Simulasi tryout mandiri", completed: false },
  ]);

  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [tempTitle, setTempTitle] = useState(examTitle);
  const [tempDate, setTempDate] = useState(examDateStr);
  const [newMilestoneText, setNewMilestoneText] = useState("");

  // Countdown computation using unified calculateDaysLeft
  const countdown = useMemo(() => {
    try {
      const res = calculateDaysLeft(examDateStr);
      const target = parseISO(examDateStr);
      return {
        formattedDate: formatLocaleDate(target, "d MMMM yyyy"),
        shortDate: formatLocaleDate(target, "d MMM yyyy"),
        daysLeft: res.days,
        isPassed: res.isPassed,
        isToday: res.isToday,
      };
    } catch {
      return {
        formattedDate: examDateStr,
        shortDate: examDateStr,
        daysLeft: 0,
        isPassed: false,
        isToday: false,
      };
    }
  }, [examDateStr]);

  const completedMilestones = milestones.filter((m) => m.completed).length;
  const progressPercent = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  const toggleMilestone = (id: string) => {
    HapticFeedback.taskToggle();
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, completed: !m.completed } : m))
    );
  };

  const handleSaveEdit = () => {
    HapticFeedback.light();
    if (tempTitle.trim()) setExamTitle(tempTitle.trim());
    if (tempDate.trim()) setExamDateStr(tempDate.trim());
    setEditModalVisible(false);
  };

  const handleAddMilestone = () => {
    const clean = newMilestoneText.trim();
    if (!clean) return;
    HapticFeedback.light();
    setMilestones((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, title: clean, completed: false },
    ]);
    setNewMilestoneText("");
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <Pressable
      style={styles.card}
      onPress={() => setMilestoneModalVisible(true)}
    >
      {/* ─── Header ─── */}
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="timer" size={20} color={colors.amber} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {examTitle}
          </Text>
          <Text style={styles.subTitle}>{countdown.formattedDate}</Text>
        </View>
        <Pressable
          style={styles.editBtn}
          onPress={(e) => {
            e.stopPropagation?.();
            setTempTitle(examTitle);
            setTempDate(examDateStr);
            setEditModalVisible(true);
          }}
          hitSlop={8}
        >
          <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* ─── Days Countdown Box (Compact) ─── */}
      <View style={styles.countdownContainer}>
        <View style={styles.countdownBox}>
          <Text style={styles.countdownNumber}>
            {countdown.isPassed ? "0" : countdown.daysLeft}
          </Text>
          <Text style={styles.countdownLabel}>
            {countdown.isPassed
              ? "Ujian Selesai"
              : countdown.isToday
              ? "Hari Ujian!"
              : "HARI LAGI"}
          </Text>
        </View>

        <View style={styles.progressSummaryBox}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Kesiapan Materi</Text>
            <Text style={styles.progressPercentText}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={styles.progressSub}>
              {completedMilestones}/{milestones.length} langkah persiapan
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: typography.fontSizes.xs, color: colors.primary, fontWeight: "600" }}>
                Lihat Target
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </View>
          </View>
        </View>
      </View>

      {/* ─── Modal: Milestone Checklist (Opens on Tap) ─── */}
      <Modal
        visible={milestoneModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMilestoneModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="trophy-outline" size={20} color={colors.amber} />
                <Text style={styles.modalTitle}>Target & Milestone UAS</Text>
              </View>
              <Pressable onPress={() => setMilestoneModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 340, marginVertical: spacing.sm }}>
              {milestones.map((m) => (
                <Pressable
                  key={m.id}
                  style={styles.milestoneRow}
                  onPress={() => toggleMilestone(m.id)}
                >
                  <View
                    style={[
                      styles.milestoneCheckbox,
                      m.completed && styles.milestoneCheckboxDone,
                    ]}
                  >
                    {m.completed && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                  </View>
                  <Text
                    style={[
                      styles.milestoneText,
                      m.completed && styles.milestoneTextDone,
                    ]}
                  >
                    {m.title}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleRemoveMilestone(m.id)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.addMilestoneRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={newMilestoneText}
                onChangeText={setNewMilestoneText}
                placeholder="Tambah langkah persiapan..."
                placeholderTextColor={colors.textSecondary}
              />
              <Pressable
                style={styles.addMilestoneBtn}
                onPress={handleAddMilestone}
              >
                <Ionicons name="add" size={18} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Modal: Edit Exam & Milestones ─── */}
      <Modal
        visible={editModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Atur Target Ujian & Milestone</Text>
              <Pressable onPress={() => setEditModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nama Ujian / Evaluasi:</Text>
              <TextInput
                style={styles.textInput}
                value={tempTitle}
                onChangeText={setTempTitle}
                placeholder="Contoh: UTS Semester Ganjil"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Tanggal Ujian (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.textInput}
                value={tempDate}
                onChangeText={setTempDate}
                placeholder="2026-11-25"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.inputLabel}>Tambah Milestone Baru:</Text>
              <View style={styles.addMilestoneRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                  value={newMilestoneText}
                  onChangeText={setNewMilestoneText}
                  placeholder="Misal: Review Bab 5"
                  placeholderTextColor={colors.textSecondary}
                  onSubmitEditing={handleAddMilestone}
                />
                <Pressable style={styles.addMilestoneBtn} onPress={handleAddMilestone}>
                  <Ionicons name="add" size={18} color="#ffffff" />
                </Pressable>
              </View>

              <View style={styles.modalMilestoneList}>
                {milestones.map((m) => (
                  <View key={m.id} style={styles.modalMilestoneItem}>
                    <Text style={styles.modalMilestoneText} numberOfLines={1}>
                      • {m.title}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveMilestone(m.id)}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>

              <Pressable style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>Simpan Pengaturan Ujian</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.amber + "1A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  subTitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    padding: 6,
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    gap: spacing.md,
  },
  countdownBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    minWidth: 85,
  },
  countdownNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.amber,
  },
  countdownLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.textSecondary,
    marginTop: 1,
  },
  progressSummaryBox: {
    flex: 1,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.full,
    marginVertical: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  progressSub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  milestoneSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  milestoneSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  milestoneCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  milestoneCheckboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  milestoneText: {
    fontSize: 12,
    color: colors.text,
  },
  milestoneTextDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: "700",
    color: colors.text,
  },
  modalBody: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  addMilestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addMilestoneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  modalMilestoneList: {
    maxHeight: 120,
    marginVertical: spacing.xs,
  },
  modalMilestoneItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  modalMilestoneText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },
});
