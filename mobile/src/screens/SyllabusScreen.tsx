/**
 * StudyAir Mobile — Subjects & Timetable Screen (Phase 5 Step 2)
 * 
 * Includes:
 * 1. Segmented Control: "By day" (default) | "By subject"
 * 2. "By day": Horizontal day tabs (Sen to Sab), today's tab has dot, swipe left/right,
 *    day header ("Senin - 8 classes - 07:00-15:30"), class rows with color stripes,
 *    divider rows for breaks/events, tap to edit, "Add class", "Copy this day to...",
 *    and friendly empty state.
 * 3. "By subject": A card per subject with day chips (Sen, Rab, Kam) in subject's color,
 *    "4 sessions/week" badge, and expandable topics / study unit manager.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { CognitiveLoad, StudyUnit, TimetableEntry, TimetableEntryKind, WeekPattern, Subject } from "../types";
import { t } from "../lib/i18n";
import { TimetableDayView } from "../components/timetable/TimetableDayView";
import { TimetableSubjectView } from "../components/timetable/TimetableSubjectView";
import { SubjectDetailModal } from "../components/subjects/SubjectDetailModal";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { BottomSheet } from "../components/common/BottomSheet";
import { ListRow } from "../components/common/ListRow";
import { WEEKDAYS, getEntryEffectiveTime } from "../lib/timetableGrouping";

interface SyllabusScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
  initialDay?: number;
  initialViewMode?: "byDay" | "bySubject";
  navigationNonce?: number;
}

export function SyllabusScreen({
  navigation,
  initialDay,
  initialViewMode,
  navigationNonce,
}: SyllabusScreenProps) {
  const {
    subjects,
    studyUnits,
    periodTimes,
    timetableEntries,
    tasks,
    daysOff,
    overrides,
    toggleTaskCompletion,
    updateSubject,
    addTask,
    addSubject,
    deleteSubject,
    addStudyUnit,
    deleteStudyUnit,
    toggleStudyUnitCompletion,
    startStudySessionForUnit,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    relinkOrphanEntry,
    rapikanDuplicates,
  } = useMobileStudyStore();

  // Top Segmented Control: "byDay" (default) vs "bySubject"
  const [viewMode, setViewMode] = useState<"byDay" | "bySubject">(initialViewMode || "byDay");
  const [activeDay, setActiveDay] = useState<number | undefined>(initialDay);

  useEffect(() => {
    if (initialDay !== undefined) {
      setActiveDay(initialDay);
      setViewMode("byDay");
    }
  }, [initialDay, navigationNonce]);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [deepDiveModalVisible, setDeepDiveModalVisible] = useState(false);
  const [deepDiveSubject, setDeepDiveSubject] = useState<Subject | null>(null);
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  // ─── Modal States: Subject Creation ───
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState("");
  const [newSubjectExamDate, setNewSubjectExamDate] = useState("2026-11-30");
  const [newSubjectTeacher, setNewSubjectTeacher] = useState("");
  const [newSubjectRoom, setNewSubjectRoom] = useState("");
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [examDateError, setExamDateError] = useState<string | null>(null);

  // ─── Modal States: Topic / Study Unit Creation ───
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [newUnitMins, setNewUnitMins] = useState("60");
  const [newUnitLoad, setNewUnitLoad] = useState<CognitiveLoad>("MEDIUM");
  const [unitTitleError, setUnitTitleError] = useState<string | null>(null);
  const [unitMinsError, setUnitMinsError] = useState<string | null>(null);

  // ─── Modal States: Class / Break / Event (Add / Edit) ───
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryKind, setEntryKind] = useState<TimetableEntryKind>("class");
  const [entryDay, setEntryDay] = useState<number>(1);
  const [entryPeriod, setEntryPeriod] = useState<number>(1);
  const [entrySubjectId, setEntrySubjectId] = useState<string>("");
  const [entryCustomLabel, setEntryCustomLabel] = useState<string>("");
  const [entryStartTime, setEntryStartTime] = useState<string>("");
  const [entryEndTime, setEntryEndTime] = useState<string>("");
  const [entryRoom, setEntryRoom] = useState<string>("");
  const [entryTeacher, setEntryTeacher] = useState<string>("");
  const [entryWeekPattern, setEntryWeekPattern] = useState<WeekPattern>("every");

  // ─── Modal States: Copy Day ───
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copyFromDay, setCopyFromDay] = useState<number>(1);
  const [copyToDay, setCopyToDay] = useState<number>(2);

  const effectiveSubjectId =
    selectedSubjectId && subjects.some((s) => s.id === selectedSubjectId)
      ? selectedSubjectId
      : subjects[0]?.id || "";

  const currentSubject = subjects.find((s) => s.id === effectiveSubjectId);
  const currentUnits = studyUnits.filter((u) => u.subject_id === effectiveSubjectId);

  // ─── Study Launch ───
  const handleStartStudy = (unit: StudyUnit) => {
    startStudySessionForUnit(unit.id);
    navigation.navigate("Focus");
  };

  // ─── Subject Creation ───
  const handleCreateSubject = () => {
    let hasError = false;
    if (!newSubjectTitle.trim()) {
      setSubjectError(t("errorTitleRequired"));
      hasError = true;
    } else {
      setSubjectError(null);
    }

    if (!newSubjectExamDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(newSubjectExamDate.trim())) {
      setExamDateError(t("errorDateRequired"));
      hasError = true;
    } else {
      setExamDateError(null);
    }

    if (hasError) return;

    const colorPalette = ["#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#f59e0b", "#06b6d4"];
    const chosenColor = colorPalette[subjects.length % colorPalette.length];

    const created = addSubject({
      title: newSubjectTitle.trim(),
      name: newSubjectTitle.trim(),
      exam_date: newSubjectExamDate.trim(),
      examDate: newSubjectExamDate.trim(),
      color_hex: chosenColor,
      color: chosenColor,
      teacher: newSubjectTeacher.trim() || undefined,
      room: newSubjectRoom.trim() || undefined,
    });

    setSelectedSubjectId(created.id);
    setNewSubjectTitle("");
    setNewSubjectTeacher("");
    setNewSubjectRoom("");
    setSubjectError(null);
    setExamDateError(null);
    setSubjectModalVisible(false);
  };

  // ─── Topic Creation ───
  const handleCreateUnit = () => {
    let hasError = false;
    if (!newUnitTitle.trim()) {
      setUnitTitleError(t("errorTitleRequired"));
      hasError = true;
    } else {
      setUnitTitleError(null);
    }

    const mins = parseInt(newUnitMins, 10);
    if (isNaN(mins) || mins <= 0) {
      setUnitMinsError(t("errorDurationPositive"));
      hasError = true;
    } else {
      setUnitMinsError(null);
    }

    if (!effectiveSubjectId) {
      Alert.alert("Select Subject", t("errorSubjectRequired"));
      hasError = true;
    }

    if (hasError) return;

    addStudyUnit({
      subject_id: effectiveSubjectId,
      title: newUnitTitle.trim(),
      estimated_minutes: mins,
      cognitive_load: newUnitLoad,
    });

    setNewUnitTitle("");
    setUnitTitleError(null);
    setUnitMinsError(null);
    setUnitModalVisible(false);
  };

  // ─── Timetable Class Add / Edit Handlers ───
  const handleOpenAddClass = (day: number) => {
    setEditingEntryId(null);
    setEntryKind("class");
    setEntryDay(day);

    // Calculate next period number for this day
    const dayClasses = timetableEntries.filter((e) => e.weekday === day && e.periodNumber > 0);
    const nextPeriod = dayClasses.length > 0 ? Math.max(...dayClasses.map((e) => e.periodNumber)) + 1 : 1;
    setEntryPeriod(Math.min(nextPeriod, 10));

    // Prefill subject
    const defaultSub = subjects[0]?.id || "";
    setEntrySubjectId(defaultSub);
    setEntryCustomLabel("");

    // Prefill times from periodTimes if available
    const pt = periodTimes.find((p) => p.periodNumber === nextPeriod);
    setEntryStartTime(pt ? pt.start : "07:00");
    setEntryEndTime(pt ? pt.end : "07:45");

    setEntryRoom("");
    setEntryTeacher("");
    setEntryWeekPattern("every");
    setClassModalVisible(true);
  };

  const handleOpenEditClass = (entry: TimetableEntry) => {
    setEditingEntryId(entry.id);
    setEntryKind(entry.kind || "class");
    setEntryDay(entry.weekday);
    setEntryPeriod(entry.periodNumber);
    setEntrySubjectId(entry.subjectId || "");
    setEntryCustomLabel(entry.customLabel || "");
    setEntryStartTime(entry.startTime || "");
    setEntryEndTime(entry.endTime || "");
    setEntryRoom(entry.room || "");
    setEntryTeacher(entry.teacher || "");
    setEntryWeekPattern(entry.weekPattern || "every");
    setClassModalVisible(true);
  };

  const handleSaveClass = () => {
    if (entryKind === "class" && !entrySubjectId && subjects.length > 0) {
      Alert.alert("Subject Required", "Please pick a subject for this class.");
      return;
    }

    if (editingEntryId) {
      updateTimetableEntry(editingEntryId, {
        weekday: entryDay,
        periodNumber: entryPeriod,
        subjectId: entrySubjectId,
        kind: entryKind,
        customLabel: entryCustomLabel.trim() || undefined,
        startTime: entryStartTime.trim() || undefined,
        endTime: entryEndTime.trim() || undefined,
        room: entryRoom.trim() || undefined,
        teacher: entryTeacher.trim() || undefined,
        weekPattern: entryWeekPattern,
      });
    } else {
      addTimetableEntry({
        weekday: entryDay,
        periodNumber: entryPeriod,
        subjectId: entrySubjectId,
        kind: entryKind,
        customLabel: entryCustomLabel.trim() || undefined,
        startTime: entryStartTime.trim() || undefined,
        endTime: entryEndTime.trim() || undefined,
        room: entryRoom.trim() || undefined,
        teacher: entryTeacher.trim() || undefined,
        weekPattern: entryWeekPattern,
      });
    }

    setClassModalVisible(false);
  };

  const handleDeleteClass = () => {
    if (!editingEntryId) return;
    Alert.alert("Delete Entry", "Remove this class from your timetable?", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          deleteTimetableEntry(editingEntryId);
          setClassModalVisible(false);
        },
      },
    ]);
  };

  // ─── Copy Day Handlers ───
  const handleOpenCopyDay = (fromDay: number) => {
    setCopyFromDay(fromDay);
    // Suggest the next available day
    const nextDay = fromDay >= 6 ? 1 : fromDay + 1;
    setCopyToDay(nextDay);
    setCopyModalVisible(true);
  };

  const handleExecuteCopyDay = () => {
    const sourceEntries = timetableEntries.filter((e) => e.weekday === copyFromDay);
    if (sourceEntries.length === 0) {
      Alert.alert("Nothing to Copy", "There are no classes on this day to copy.");
      setCopyModalVisible(false);
      return;
    }

    const targetMeta = WEEKDAYS.find((w) => w.day === copyToDay);
    const targetName = targetMeta ? targetMeta.nameId : `Day ${copyToDay}`;

    // Copy entries over to the target day
    for (const src of sourceEntries) {
      addTimetableEntry({
        subjectId: src.subjectId,
        weekday: copyToDay,
        periodNumber: src.periodNumber,
        weekPattern: src.weekPattern,
        kind: src.kind,
        customLabel: src.customLabel,
        startTime: src.startTime,
        endTime: src.endTime,
        room: src.room,
        teacher: src.teacher,
      });
    }

    setCopyModalVisible(false);
    Alert.alert("Copied!", t("copySuccess", { day: targetName }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Top Header with ONE Add Button ─── */}
        <ScreenHeader
          title="Pelajaran"
          actions={[
            {
              icon: "add",
              onPress: () => setAddMenuVisible(true),
              accessibilityLabel: "Tambah Pelajaran atau Jadwal",
            },
          ]}
        />

        {/* ─── Segmented Control: "Per hari" (default) | "Per mapel" ─── */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentedControl}>
            <Pressable
              style={[styles.segmentBtn, viewMode === "byDay" && styles.segmentBtnActive]}
              onPress={() => setViewMode("byDay")}
              hitSlop={4}
            >
              <Ionicons
                name="calendar"
                size={14}
                color={viewMode === "byDay" ? "#ffffff" : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, viewMode === "byDay" && styles.segmentTextActive]}>
                Per hari
              </Text>
            </Pressable>

            <Pressable
              style={[styles.segmentBtn, viewMode === "bySubject" && styles.segmentBtnActive]}
              onPress={() => setViewMode("bySubject")}
              hitSlop={4}
            >
              <Ionicons
                name="book"
                size={14}
                color={viewMode === "bySubject" ? "#ffffff" : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.segmentText, viewMode === "bySubject" && styles.segmentTextActive]}>
                Per mapel
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* VIEW 1: BY DAY (Interactive Timetable by Weekday)          */}
        {/* ═════════════════════════════════════════════════════════ */}
        {viewMode === "byDay" && (
          <TimetableDayView
            entries={timetableEntries}
            subjects={subjects}
            periodTimes={periodTimes}
            initialDay={activeDay}
            navigationNonce={navigationNonce}
            onAddClass={handleOpenAddClass}
            onEditClass={handleOpenEditClass}
            onCopyDay={handleOpenCopyDay}
            onRelinkOrphan={relinkOrphanEntry}
            onDeleteEntry={deleteTimetableEntry}
            onRapikanDuplicates={() => {
              const count = rapikanDuplicates();
              Alert.alert("Rapikan Berhasil", `${count} entri duplikat telah dibersihkan.`);
            }}
          />
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* VIEW 2: BY SUBJECT (Full-height Vertical Subject Cards)    */}
        {/* ═════════════════════════════════════════════════════════ */}
        {viewMode === "bySubject" && (
          <View style={{ flex: 1 }}>
            <TimetableSubjectView
              subjects={subjects}
              timetableEntries={timetableEntries}
              studyUnits={studyUnits}
              selectedSubjectId={effectiveSubjectId}
              onSelectSubject={(id) => {
                setSelectedSubjectId(id);
                const sub = subjects.find((s) => s.id === id);
                if (sub) {
                  setDeepDiveSubject(sub);
                  setDeepDiveModalVisible(true);
                }
              }}
              onAddSubject={() => setSubjectModalVisible(true)}
              onDeepDiveSubject={(sub) => {
                setDeepDiveSubject(sub);
                setDeepDiveModalVisible(true);
              }}
            />
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 1: ADD / EDIT CLASS OR BREAK / EVENT                 */}
        {/* ═════════════════════════════════════════════════════════ */}
        <Modal
          visible={classModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setClassModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>
                  {editingEntryId ? t("editClass") : t("addClass")}
                </Text>
                {editingEntryId && (
                  <Pressable onPress={handleDeleteClass} hitSlop={8}>
                    <Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>
                      {t("delete")}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Kind Selector: Class | Break | Event */}
              <View style={styles.kindSelectorRow}>
                {(["class", "break", "event"] as TimetableEntryKind[]).map((k) => (
                  <Pressable
                    key={k}
                    style={[styles.kindBtn, entryKind === k && styles.kindBtnActive]}
                    onPress={() => setEntryKind(k)}
                  >
                    <Text style={[styles.kindBtnText, entryKind === k && styles.kindBtnTextActive]}>
                      {k === "class" ? "Class" : k === "break" ? "Break" : "Event"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Day Selector */}
              <Text style={styles.modalLabel}>Day of Week</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {WEEKDAYS.map((w) => (
                    <Pressable
                      key={w.day}
                      style={[styles.daySelectChip, entryDay === w.day && styles.daySelectChipActive]}
                      onPress={() => setEntryDay(w.day)}
                    >
                      <Text style={[styles.daySelectChipText, entryDay === w.day && styles.daySelectChipTextActive]}>
                        {w.shortId}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Subject Selection (for Class) or Custom Label (for Break/Event) */}
              {entryKind === "class" ? (
                <>
                  <Text style={styles.modalLabel}>Subject</Text>
                  {subjects.length === 0 ? (
                    <Text style={{ color: colors.warning, fontSize: 12, marginBottom: spacing.sm }}>
                      No subjects available. Please create a course first.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {subjects.map((s) => (
                          <Pressable
                            key={s.id}
                            style={[
                              styles.subjSelectChip,
                              entrySubjectId === s.id && styles.subjSelectChipActive,
                              { borderColor: s.color || s.color_hex },
                            ]}
                            onPress={() => setEntrySubjectId(s.id)}
                          >
                            <Text
                              style={[
                                styles.subjSelectChipText,
                                entrySubjectId === s.id && styles.subjSelectChipTextActive,
                              ]}
                            >
                              {s.title || s.name}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.modalLabel}>
                    {entryKind === "break" ? "Break Name" : "Event Title"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={entryKind === "break" ? "e.g. Istirahat 1" : "e.g. Upacara Bendera"}
                    placeholderTextColor={colors.textMuted}
                    value={entryCustomLabel}
                    onChangeText={setEntryCustomLabel}
                  />
                </>
              )}

              {/* Period Number and Times */}
              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
                {entryKind === "class" && (
                  <View style={{ width: 80 }}>
                    <Text style={styles.modalLabel}>Period #</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={String(entryPeriod)}
                      onChangeText={(val) => setEntryPeriod(parseInt(val, 10) || 1)}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Start Time (HH:mm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="07:00"
                    placeholderTextColor={colors.textMuted}
                    value={entryStartTime}
                    onChangeText={setEntryStartTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>End Time (HH:mm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="07:45"
                    placeholderTextColor={colors.textMuted}
                    value={entryEndTime}
                    onChangeText={setEntryEndTime}
                  />
                </View>
              </View>

              {/* Room and Teacher */}
              {entryKind === "class" && (
                <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Room</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. R. 201"
                      placeholderTextColor={colors.textMuted}
                      value={entryRoom}
                      onChangeText={setEntryRoom}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalLabel}>Teacher</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Pak Budi"
                      placeholderTextColor={colors.textMuted}
                      value={entryTeacher}
                      onChangeText={setEntryTeacher}
                    />
                  </View>
                </View>
              )}

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setClassModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveClass}>
                  <Text style={styles.saveBtnText}>{t("save")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 2: COPY DAY TO ANOTHER DAY                          */}
        {/* ═════════════════════════════════════════════════════════ */}
        <Modal
          visible={copyModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCopyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("copyDayTitle")}</Text>
              <Text style={styles.modalSubtitle}>
                Copy all classes from {WEEKDAYS.find((w) => w.day === copyFromDay)?.nameId} to:
              </Text>

              <Text style={styles.modalLabel}>{t("selectTargetDay")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: spacing.md }}>
                {WEEKDAYS.filter((w) => w.day !== copyFromDay).map((w) => (
                  <Pressable
                    key={w.day}
                    style={[styles.targetDayChip, copyToDay === w.day && styles.targetDayChipActive]}
                    onPress={() => setCopyToDay(w.day)}
                  >
                    <Text
                      style={[
                        styles.targetDayChipText,
                        copyToDay === w.day && styles.targetDayChipTextActive,
                      ]}
                    >
                      {w.nameId}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setCopyModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleExecuteCopyDay}>
                  <Text style={styles.saveBtnText}>Copy Schedule</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 3: ADD SUBJECT                                      */}
        {/* ═════════════════════════════════════════════════════════ */}
        <Modal
          visible={subjectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSubjectModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Course</Text>
              <Text style={styles.modalLabel}>Subject / Course Title</Text>
              <TextInput
                style={[styles.input, !!subjectError && styles.inputError]}
                placeholder="e.g. Matematika Lanjutan"
                placeholderTextColor={colors.textMuted}
                value={newSubjectTitle}
                onChangeText={(text) => {
                  setNewSubjectTitle(text);
                  if (subjectError) setSubjectError(null);
                }}
              />
              {subjectError && <Text style={styles.inlineErrorText}>{subjectError}</Text>}

              <View style={{ flexDirection: "row", gap: spacing.sm, marginVertical: spacing.xs }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Teacher</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ibu Dewi"
                    placeholderTextColor={colors.textMuted}
                    value={newSubjectTeacher}
                    onChangeText={setNewSubjectTeacher}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalLabel}>Room</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Lab Kimia"
                    placeholderTextColor={colors.textMuted}
                    value={newSubjectRoom}
                    onChangeText={setNewSubjectRoom}
                  />
                </View>
              </View>

              <Text style={styles.modalLabel}>Target Exam Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, !!examDateError && styles.inputError]}
                placeholder="2026-11-30"
                placeholderTextColor={colors.textMuted}
                value={newSubjectExamDate}
                onChangeText={(text) => {
                  setNewSubjectExamDate(text);
                  if (examDateError) setExamDateError(null);
                }}
              />
              {examDateError && <Text style={styles.inlineErrorText}>{examDateError}</Text>}

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setSubjectError(null);
                    setExamDateError(null);
                    setSubjectModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleCreateSubject}>
                  <Text style={styles.saveBtnText}>{t("createSubject")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* MODAL 4: ADD STUDY UNIT (TOPIC)                           */}
        {/* ═════════════════════════════════════════════════════════ */}
        <Modal
          visible={unitModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setUnitModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Study Topic</Text>
              <Text style={styles.modalLabel}>Topic Title</Text>
              <TextInput
                style={[styles.input, !!unitTitleError && styles.inputError]}
                placeholder="e.g. Integral & Turunan"
                placeholderTextColor={colors.textMuted}
                value={newUnitTitle}
                onChangeText={(text) => {
                  setNewUnitTitle(text);
                  if (unitTitleError) setUnitTitleError(null);
                }}
              />
              {unitTitleError && <Text style={styles.inlineErrorText}>{unitTitleError}</Text>}

              <Text style={styles.modalLabel}>Estimated Duration (Minutes)</Text>
              <TextInput
                style={[styles.input, !!unitMinsError && styles.inputError]}
                placeholder="60"
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
                value={newUnitMins}
                onChangeText={(text) => {
                  setNewUnitMins(text);
                  if (unitMinsError) setUnitMinsError(null);
                }}
              />
              {unitMinsError && <Text style={styles.inlineErrorText}>{unitMinsError}</Text>}

              <Text style={styles.modalLabel}>Cognitive Load</Text>
              <View style={styles.loadSelector}>
                {(["LOW", "MEDIUM", "HIGH"] as CognitiveLoad[]).map((load) => (
                  <Pressable
                    key={load}
                    style={[
                      styles.loadSelectButton,
                      newUnitLoad === load && styles.loadSelectButtonActive,
                    ]}
                    onPress={() => setNewUnitLoad(load)}
                  >
                    <Text
                      style={[
                        styles.loadSelectText,
                        newUnitLoad === load && styles.loadSelectTextActive,
                      ]}
                    >
                      {load}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    setUnitTitleError(null);
                    setUnitMinsError(null);
                    setUnitModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>{t("cancel")}</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleCreateUnit}>
                  <Text style={styles.saveBtnText}>Add Topic</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Per-Subject Deep Dive Modal (Phase 11) ─── */}
        <SubjectDetailModal
          visible={deepDiveModalVisible}
          subject={deepDiveSubject || currentSubject || null}
          tasks={tasks}
          studyUnits={studyUnits}
          timetableEntries={timetableEntries}
          periodTimes={periodTimes}
          daysOff={daysOff}
          overrides={overrides}
          onClose={() => {
            setDeepDiveModalVisible(false);
            setDeepDiveSubject(null);
          }}
          onToggleTask={toggleTaskCompletion}
          onAddTaskForSubject={(subjectId) => {
            setDeepDiveModalVisible(false);
            navigation.navigate("Home");
          }}
          onUpdateSubject={updateSubject}
          onDeleteSubject={(subjectId) => {
            deleteSubject(subjectId);
            if (subjects.length > 1) {
              const remaining = subjects.filter((s) => s.id !== subjectId);
              setSelectedSubjectId(remaining[0]?.id || "");
            }
          }}
          onToggleStudyUnit={toggleStudyUnitCompletion}
          onDeleteStudyUnit={deleteStudyUnit}
          onAddStudyUnit={(subjectId) => {
            setSelectedSubjectId(subjectId);
            setUnitModalVisible(true);
          }}
          onStartStudyUnit={handleStartStudy}
        />

        {/* ─── Add Menu BottomSheet (One primary header action) ─── */}
        <BottomSheet
          visible={addMenuVisible}
          onClose={() => setAddMenuVisible(false)}
          title="Tambah Pelajaran & Jadwal"
          primaryButtonLabel="Tutup"
          onPrimaryButtonPress={() => setAddMenuVisible(false)}
        >
          <View style={{ gap: tidySpacing.small, paddingVertical: tidySpacing.small }}>
            <ListRow
              leftIcon="book-outline"
              title="Mapel Baru"
              subtitle="Buat mata pelajaran baru"
              onPress={() => {
                setAddMenuVisible(false);
                setSubjectModalVisible(true);
              }}
            />
            <ListRow
              leftIcon="calendar-outline"
              title="Impor Jadwal"
              subtitle="Impor jadwal sekolah lewat foto atau teks"
              onPress={() => {
                setAddMenuVisible(false);
                navigation.navigate("TimetableWizard");
              }}
            />
            <ListRow
              leftIcon="add-circle-outline"
              title="Tambah Kelas"
              subtitle="Jadwalkan kelas pada hari yang aktif"
              onPress={() => {
                setAddMenuVisible(false);
                handleOpenAddClass(activeDay || 1);
              }}
            />
          </View>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  headerActionCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  importTimetableButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 38,
  },
  importTimetableButtonText: {
    color: colors.accent,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  addSubjectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 38,
  },
  addSubjectButtonText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  segmentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.sm,
    minHeight: 44,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  unitsScroll: {
    flex: 1,
  },
  unitsContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  subjectOverviewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  subjectOverviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  subjectOverviewTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subjectOverviewExam: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteSubjectText: {
    fontSize: typography.fontSizes.xs,
    color: colors.danger,
    fontWeight: typography.fontWeights.medium,
  },
  overviewActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  deepDiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.35)",
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.min,
  },
  deepDiveBtnText: {
    color: colors.accent,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  studyNextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.min,
  },
  studyNextBtnText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
  addUnitDashedButton: {
    flexDirection: "row",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    minHeight: touchTarget.min,
  },
  addUnitDashedText: {
    color: colors.primary,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  unitsSectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  emptyUnitsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyUnitsText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.xs,
    textAlign: "center",
    lineHeight: 18,
  },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: touchTarget.min,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  unitRowContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  unitRowTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  unitRowTitleDone: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  unitRowMeta: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  loadTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginRight: spacing.sm,
  },
  loadTagHigh: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  loadTagMedium: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  loadTagLow: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  loadTagText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  deleteUnitBtn: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 420,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  kindSelectorRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 3,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  kindBtnActive: {
    backgroundColor: colors.primary,
  },
  kindBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  kindBtnTextActive: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  daySelectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daySelectChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  daySelectChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  daySelectChipTextActive: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  subjSelectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
  },
  subjSelectChipActive: {
    backgroundColor: colors.surfaceHover,
  },
  subjSelectChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  subjSelectChipTextActive: {
    fontWeight: typography.fontWeights.bold,
  },
  targetDayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  targetDayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  targetDayChipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  targetDayChipTextActive: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    minHeight: 44,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inlineErrorText: {
    color: colors.danger,
    fontSize: typography.fontSizes.xs,
    marginTop: 3,
  },
  loadSelector: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  loadSelectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
  },
  loadSelectButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  loadSelectText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  loadSelectTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget.min,
  },
  cancelBtnText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minHeight: touchTarget.min,
  },
  saveBtnText: {
    fontSize: typography.fontSizes.sm,
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
});
