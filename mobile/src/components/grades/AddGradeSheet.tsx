/**
 * StudyAir Mobile — School Planner Add / Edit Grade Sheet
 * 
 * Bottom sheet modal for recording academic grades with:
 * - Subject picker with subject color badges
 * - Category selector (Tugas, Kuis, Ulangan, Proyek, Lainnya)
 * - Quick title presets (UH 1, UH 2, Tugas 1, Kuis, PTS, PAS)
 * - Score input with quick score chips (70, 75, 80, 85, 90, 95, 100)
 * - Weight presets (1x, 2x, 10%, 20%, 30%, 40%)
 * - Date presets (Hari Ini, Kemarin, 2 Hari Lalu)
 * - Tactile Duolingo 3D submit button
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, subDays } from "date-fns";
import { colors, radius, typography, touchTarget, spacing } from "../../theme";
import { BottomSheet } from "../common/BottomSheet";
import { Grade, GradeCategory, Subject } from "../../types";
import { HapticFeedback } from "../../lib/haptics";
import { soundFX } from "../../lib/sound";
import { formatGradeCategory } from "../../lib/gradeEngine";

interface AddGradeSheetProps {
  visible: boolean;
  subjects: Subject[];
  initialSubjectId?: string;
  initialCategory?: GradeCategory;
  gradeToEdit?: Grade | null;
  onClose: () => void;
  onSave: (data: Omit<Grade, "id" | "createdAt">) => Promise<void>;
}

const TITLE_PRESETS = [
  "Ulangan Harian 1",
  "Ulangan Harian 2",
  "Tugas PR 1",
  "Tugas PR 2",
  "Kuis Bab",
  "Penilaian Tengah Semester (PTS)",
  "Penilaian Akhir Semester (PAS)",
  "Laporan Praktikum",
];

const CATEGORIES: GradeCategory[] = [
  "exam",
  "assignment",
  "quiz",
  "project",
  "other",
];

const SCORE_PRESETS = [70, 75, 80, 85, 90, 95, 100];

const WEIGHT_PRESETS = [
  { label: "1x (Normal)", value: 1 },
  { label: "2x (Utama)", value: 2 },
  { label: "10%", value: 10 },
  { label: "20%", value: 20 },
  { label: "30%", value: 30 },
  { label: "40%", value: 40 },
];

export function AddGradeSheet({
  visible,
  subjects,
  initialSubjectId,
  initialCategory,
  gradeToEdit,
  onClose,
  onSave,
}: AddGradeSheetProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GradeCategory>(initialCategory || "exam");
  const [scoreText, setScoreText] = useState("85");
  const [maxScoreText, setMaxScoreText] = useState("100");
  const [weight, setWeight] = useState<number>(1);
  const [dateStr, setDateStr] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (visible) {
      if (gradeToEdit) {
        setSelectedSubjectId(gradeToEdit.subjectId);
        setTitle(gradeToEdit.title);
        setCategory(gradeToEdit.category);
        setScoreText(String(gradeToEdit.score));
        setMaxScoreText(String(gradeToEdit.maxScore));
        setWeight(gradeToEdit.weight);
        setDateStr(gradeToEdit.date);
        setNotes(gradeToEdit.notes || "");
      } else {
        const defaultSubId =
          initialSubjectId || (subjects.length > 0 ? subjects[0].id : "");
        setSelectedSubjectId(defaultSubId);
        setTitle("");
        setCategory(initialCategory || "exam");
        setScoreText("85");
        setMaxScoreText("100");
        setWeight(1);
        setDateStr(format(new Date(), "yyyy-MM-dd"));
        setNotes("");
      }
    }
  }, [visible, gradeToEdit, initialSubjectId, initialCategory, subjects]);

  const handleSave = async () => {
    if (!selectedSubjectId) {
      Alert.alert("Perhatian", "Pilih mata pelajaran terlebih dahulu.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Perhatian", "Judul penilaian wajib diisi.");
      return;
    }
    const scoreNum = parseFloat(scoreText.replace(",", "."));
    const maxScoreNum = parseFloat(maxScoreText.replace(",", ".")) || 100;

    if (isNaN(scoreNum) || scoreNum < 0) {
      Alert.alert("Perhatian", "Masukkan nilai angka yang valid (0 - 100).");
      return;
    }

    HapticFeedback.success();
    soundFX.playClick();

    await onSave({
      subjectId: selectedSubjectId,
      title: title.trim(),
      category,
      score: scoreNum,
      maxScore: maxScoreNum,
      weight: weight > 0 ? weight : 1,
      date: dateStr,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectColor =
    selectedSubject?.color || selectedSubject?.color_hex || colors.primary;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={gradeToEdit ? "Edit Catatan Nilai" : "Catat Nilai Baru"}
    >
      <ScrollView
        style={styles.sheetScroll}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Subject Selector */}
        <Text style={styles.sectionLabel}>Mata Pelajaran</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectChipsScroll}
        >
          {subjects.map((sub) => {
            const isSelected = sub.id === selectedSubjectId;
            const subCol = sub.color || sub.color_hex || colors.primary;
            return (
              <Pressable
                key={sub.id}
                style={[
                  styles.subjectChip,
                  isSelected && {
                    borderColor: subCol,
                    backgroundColor: `${subCol}20`,
                  },
                ]}
                onPress={() => {
                  HapticFeedback.light();
                  setSelectedSubjectId(sub.id);
                }}
              >
                <View style={[styles.subColorDot, { backgroundColor: subCol }]} />
                <Text
                  style={[
                    styles.subjectChipText,
                    isSelected && { color: subCol, fontWeight: "700" },
                  ]}
                >
                  {sub.title || sub.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 2. Category Selector */}
        <Text style={styles.sectionLabel}>Kategori Penilaian</Text>
        <View style={styles.categoryWrap}>
          {CATEGORIES.map((cat) => {
            const isSelected = cat === category;
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  isSelected && {
                    borderColor: subjectColor,
                    backgroundColor: `${subjectColor}18`,
                  },
                ]}
                onPress={() => {
                  HapticFeedback.light();
                  setCategory(cat);
                }}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && { color: subjectColor, fontWeight: "700" },
                  ]}
                >
                  {formatGradeCategory(cat)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 3. Title & Presets */}
        <Text style={styles.sectionLabel}>Nama / Topik Penilaian</Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Contoh: Ulangan Harian Trigonometri"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {TITLE_PRESETS.map((p, idx) => (
            <Pressable
              key={idx}
              style={styles.presetChip}
              onPress={() => {
                HapticFeedback.light();
                setTitle(p);
              }}
            >
              <Text style={styles.presetChipText}>{p}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* 4. Score Input & Presets */}
        <View style={styles.scoreRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>Nilai Diperoleh</Text>
            <TextInput
              style={[styles.scoreInput, { color: subjectColor }]}
              keyboardType="numeric"
              value={scoreText}
              onChangeText={setScoreText}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.scoreSlash}>/</Text>

          <View style={{ width: 88 }}>
            <Text style={styles.sectionLabel}>Nilai Maks</Text>
            <TextInput
              style={styles.maxScoreInput}
              keyboardType="numeric"
              value={maxScoreText}
              onChangeText={setMaxScoreText}
              placeholder="100"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Score Quick Chips */}
        <View style={styles.scorePresetsRow}>
          {SCORE_PRESETS.map((val) => (
            <Pressable
              key={val}
              style={[
                styles.scorePresetChip,
                scoreText === String(val) && {
                  backgroundColor: subjectColor,
                  borderColor: subjectColor,
                },
              ]}
              onPress={() => {
                HapticFeedback.light();
                setScoreText(String(val));
              }}
            >
              <Text
                style={[
                  styles.scorePresetText,
                  scoreText === String(val) && { color: "#FFFFFF", fontWeight: "700" },
                ]}
              >
                {val}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 5. Weight Input & Presets */}
        <Text style={styles.sectionLabel}>Bobot Penilaian</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {WEIGHT_PRESETS.map((wp, idx) => {
            const isSelected = weight === wp.value;
            return (
              <Pressable
                key={idx}
                style={[
                  styles.presetChip,
                  isSelected && {
                    borderColor: subjectColor,
                    backgroundColor: `${subjectColor}15`,
                  },
                ]}
                onPress={() => {
                  HapticFeedback.light();
                  setWeight(wp.value);
                }}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    isSelected && { color: subjectColor, fontWeight: "700" },
                  ]}
                >
                  {wp.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 6. Date Presets */}
        <Text style={styles.sectionLabel}>Tanggal Penilaian</Text>
        <View style={styles.datePresetsRow}>
          {[
            { label: "Hari Ini", date: format(new Date(), "yyyy-MM-dd") },
            { label: "Kemarin", date: format(subDays(new Date(), 1), "yyyy-MM-dd") },
            { label: "2 Hari Lalu", date: format(subDays(new Date(), 2), "yyyy-MM-dd") },
          ].map((dp, idx) => {
            const isSelected = dateStr === dp.date;
            return (
              <Pressable
                key={idx}
                style={[
                  styles.datePresetChip,
                  isSelected && {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                  },
                ]}
                onPress={() => {
                  HapticFeedback.light();
                  setDateStr(dp.date);
                }}
              >
                <Text
                  style={[
                    styles.datePresetText,
                    isSelected && { color: colors.primary, fontWeight: "700" },
                  ]}
                >
                  {dp.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 7. Notes */}
        <Text style={styles.sectionLabel}>Catatan Guru / Pembahasan (Opsional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Contoh: Perlu latihan soal nomor 4 dan 7 materi eksponen..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {/* 8. Submit 3D Button */}
        <Pressable
          style={[
            styles.submitBtn,
            { backgroundColor: subjectColor, borderBottomColor: `${subjectColor}B0` },
          ]}
          onPress={handleSave}
          hitSlop={touchTarget.min / 4}
        >
          <Text style={styles.submitBtnText}>
            {gradeToEdit ? "Perbarui Catatan Nilai" : "Simpan Catatan Nilai"}
          </Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetScroll: {
    maxHeight: 520,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  subjectChipsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  subColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subjectChipText: {
    fontSize: 12,
    color: colors.text,
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  categoryChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  titleInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  presetsScroll: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scoreInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  scoreSlash: {
    fontSize: 28,
    fontWeight: "300",
    color: colors.textMuted,
    marginTop: 18,
  },
  maxScoreInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
  },
  scorePresetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  scorePresetChip: {
    width: 42,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scorePresetText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  datePresetsRow: {
    flexDirection: "row",
    gap: 8,
  },
  datePresetChip: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  datePresetText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notesInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    height: 60,
    textAlignVertical: "top",
  },
  submitBtn: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: radius.md,
    borderBottomWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
});
