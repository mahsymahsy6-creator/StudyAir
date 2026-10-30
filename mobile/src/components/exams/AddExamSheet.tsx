/**
 * StudyAir Mobile — AddExamSheet
 * Modal to schedule a new Subject Exam (Ulangan Harian/Bab) or Multi-day Exam Event (PTS/PAS/UAS).
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, addDays } from "date-fns";
import { BottomSheet } from "../common/BottomSheet";
import { PrimaryButton } from "../common/PrimaryButton";
import { SecondaryButton } from "../common/SecondaryButton";
import { colors, spacing, radius, typography } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { Subject } from "../../types";
import { t } from "../../lib/i18n";

interface AddExamSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSubjectId?: string;
}

export function AddExamSheet({
  visible,
  onClose,
  onSuccess,
  initialSubjectId,
}: AddExamSheetProps) {
  const { subjects, updateSubject, addExamEvent, addStudyUnit } = useMobileStudyStore();

  const [mode, setMode] = useState<"subject" | "event">("subject");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || (subjects.length > 0 ? subjects[0].id : "")
  );

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [examDate, setExamDate] = useState<string>(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [topicInput, setTopicInput] = useState<string>("");

  // Event mode states
  const [eventName, setEventName] = useState<string>("");
  const [eventStartDate, setEventStartDate] = useState<string>(
    format(addDays(new Date(), 14), "yyyy-MM-dd")
  );
  const [eventEndDate, setEventEndDate] = useState<string>(
    format(addDays(new Date(), 19), "yyyy-MM-dd")
  );

  const quickPresets = [
    { label: "Besok", days: 1 },
    { label: "3 Hari", days: 3 },
    { label: "1 Minggu", days: 7 },
    { label: "2 Minggu", days: 14 },
    { label: "1 Bulan", days: 30 },
  ];

  const eventPresets = [
    "Penilaian Tengah Semester (PTS)",
    "Penilaian Akhir Semester (PAS)",
    "Ujian Akhir Semester (UAS)",
    "Try Out Ujian Sekolah",
  ];

  const handleSave = () => {
    if (mode === "subject") {
      if (!selectedSubjectId) return;
      const targetSub = subjects.find((s) => s.id === selectedSubjectId);
      if (!targetSub) return;

      const cleanDate = examDate.trim() || todayStr;
      updateSubject(targetSub.id, {
        examDate: cleanDate,
        exam_date: cleanDate,
      });

      if (topicInput.trim()) {
        addStudyUnit({
          subject_id: targetSub.id,
          title: topicInput.trim(),
          estimated_minutes: 30,
          cognitive_load: "MEDIUM",
        });
      }
    } else {
      const cleanName = eventName.trim() || "Ujian Sekolah";
      const cleanStart = eventStartDate.trim() || todayStr;
      const cleanEnd = eventEndDate.trim() || cleanStart;

      addExamEvent({
        name: cleanName,
        startDate: cleanStart,
        endDate: cleanEnd,
      });
    }

    onClose();
    if (onSuccess) onSuccess();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("atur_tanggal_ujian") || "Jadwalkan Ulangan"}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        {/* Mode Toggle Tabs */}
        <View style={styles.segmentContainer}>
          <Pressable
            style={[styles.segmentBtn, mode === "subject" && styles.segmentBtnActive]}
            onPress={() => setMode("subject")}
          >
            <Ionicons
              name="book"
              size={15}
              color={mode === "subject" ? colors.primary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                mode === "subject" && styles.segmentTextActive,
              ]}
            >
              {t("tipe_ulangan_mapel") || "Ulangan Mapel"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.segmentBtn, mode === "event" && styles.segmentBtnActive]}
            onPress={() => setMode("event")}
          >
            <Ionicons
              name="calendar"
              size={15}
              color={mode === "event" ? colors.primary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                mode === "event" && styles.segmentTextActive,
              ]}
            >
              {t("tipe_ulangan_event") || "Periode Ujian"}
            </Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {mode === "subject" ? (
            <View style={styles.formSection}>
              {/* Subject Picker */}
              <Text style={styles.label}>{t("pilih_mapel") || "Pilih Mata Pelajaran"}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectChipRow}
              >
                {subjects.map((sub) => {
                  const isSelected = sub.id === selectedSubjectId;
                  const color = sub.color || colors.primary;
                  return (
                    <Pressable
                      key={sub.id}
                      style={[
                        styles.subjectChip,
                        isSelected && { borderColor: color, backgroundColor: `${color}18` },
                      ]}
                      onPress={() => setSelectedSubjectId(sub.id)}
                    >
                      <View style={[styles.subjectDot, { backgroundColor: color }]} />
                      <Text
                        style={[
                          styles.subjectChipText,
                          isSelected && { color: colors.text, fontWeight: "700" },
                        ]}
                      >
                        {sub.name || sub.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Date Presets */}
              <Text style={styles.label}>{t("tanggal_ujian") || "Tanggal Ujian"} (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={examDate}
                onChangeText={setExamDate}
                placeholder="2026-11-15"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.presetRow}>
                {quickPresets.map((p) => {
                  const targetD = format(addDays(new Date(), p.days), "yyyy-MM-dd");
                  const isMatch = examDate === targetD;
                  return (
                    <Pressable
                      key={p.label}
                      style={[styles.presetChip, isMatch && styles.presetChipActive]}
                      onPress={() => setExamDate(targetD)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isMatch && styles.presetChipTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Optional Topic Input */}
              <Text style={styles.label}>{t("kisi_kisi_topik") || "Kisi-kisi / Materi Utama (Opsional)"}</Text>
              <TextInput
                style={styles.input}
                value={topicInput}
                onChangeText={setTopicInput}
                placeholder="Contoh: Bab 4 Persamaan Kuadrat & Fungsi"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          ) : (
            <View style={styles.formSection}>
              {/* Event Name */}
              <Text style={styles.label}>{t("nama_ujian") || "Nama Periode Ujian"}</Text>
              <TextInput
                style={styles.input}
                value={eventName}
                onChangeText={setEventName}
                placeholder="Contoh: Penilaian Tengah Semester (PTS)"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.presetRowWrap}>
                {eventPresets.map((preset) => {
                  const isMatch = eventName === preset;
                  return (
                    <Pressable
                      key={preset}
                      style={[styles.presetChip, isMatch && styles.presetChipActive]}
                      onPress={() => setEventName(preset)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          isMatch && styles.presetChipTextActive,
                        ]}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Start Date */}
              <Text style={styles.label}>{t("tanggal_mulai") || "Tanggal Mulai"} (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={eventStartDate}
                onChangeText={setEventStartDate}
                placeholder="2026-11-20"
                placeholderTextColor={colors.textSecondary}
              />

              {/* End Date */}
              <Text style={styles.label}>{t("tanggal_selesai") || "Tanggal Selesai"} (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={eventEndDate}
                onChangeText={setEventEndDate}
                placeholder="2026-11-25"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}

          {/* Action Button */}
          <View style={styles.btnRow}>
            <PrimaryButton
              label={t("save") || "Simpan Jadwal"}
              icon="checkmark-circle"
              onPress={handleSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.surfaceHover,
  },
  segmentText: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  formSection: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.body,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.fontSizes.section,
    color: colors.text,
  },
  subjectChipRow: {
    flexDirection: "row",
    paddingVertical: 4,
    gap: 8,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subjectChipText: {
    fontSize: typography.fontSizes.body,
    color: colors.textSecondary,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  presetRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  btnRow: {
    marginTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
