/**
 * StudyAir Mobile — School Planner Timetable Screen (Tab 2)
 * 
 * Elevates school schedule to the primary bottom navigation:
 * 1. Segmented Control: "Per Hari" (Daily View) vs "Mingguan" (Weekly Matrix Overview)
 * 2. "Per Hari": Horizontal day tabs (Senin - Sabtu), bell times, room, teacher,
 *    and break dividers via TimetableDayView
 * 3. "Mingguan": Full-week bird's eye matrix view showing all weekdays side-by-side
 * 4. Quick Actions: Add Class modal, Edit Class, Teacher Directory, and Day Off indicators
 * 5. 100% theme consistency and tactile 3D Duolingo buttons
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, typography, touchTarget, spacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { Subject, TimetableEntry, PeriodTime, TimetableEntryKind, WeekPattern } from "../types";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { Card } from "../components/common/Card";
import { TimetableDayView } from "../components/timetable/TimetableDayView";
import { TeacherDirectoryModal } from "../components/teachers/TeacherDirectoryModal";
import { WEEKDAYS, getTodayWeekday } from "../lib/timetableGrouping";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";

interface TimetableScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
  };
  initialDay?: number;
}

export function TimetableScreen({ navigation, initialDay }: TimetableScreenProps) {
  const {
    subjects,
    periodTimes,
    timetableEntries,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    rapikanDuplicates,
  } = useMobileStudyStore();

  const todayWeekday = useMemo(() => getTodayWeekday(), []);

  // View mode: "perHari" (default) or "mingguan"
  const [viewMode, setViewMode] = useState<"perHari" | "mingguan">("perHari");
  const [selectedDay, setSelectedDay] = useState<number>(initialDay || todayWeekday || 1);

  // Modals state
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);
  const [editClassModalVisible, setEditClassModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);

  // Form states for Add/Edit class
  const [formWeekday, setFormWeekday] = useState<number>(1);
  const [formPeriod, setFormPeriod] = useState<number>(1);
  const [formSubjectId, setFormSubjectId] = useState<string>("");
  const [formKind, setFormKind] = useState<TimetableEntryKind>("class");
  const [formCustomLabel, setFormCustomLabel] = useState<string>("");
  const [formRoom, setFormRoom] = useState<string>("");
  const [formTeacher, setFormTeacher] = useState<string>("");

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const handleOpenAddClass = (day?: number) => {
    HapticFeedback.light();
    soundFX.playClick();
    setEditingEntry(null);
    setFormWeekday(day || selectedDay || 1);
    setFormPeriod(1);
    setFormSubjectId(subjects.length > 0 ? subjects[0].id : "");
    setFormKind("class");
    setFormCustomLabel("");
    setFormRoom("");
    setFormTeacher("");
    setEditClassModalVisible(true);
  };

  const handleOpenEditClass = (entry: TimetableEntry) => {
    HapticFeedback.light();
    soundFX.playClick();
    setEditingEntry(entry);
    setFormWeekday(entry.weekday);
    setFormPeriod(entry.periodNumber);
    setFormSubjectId(entry.subjectId || "");
    setFormKind(entry.kind || "class");
    setFormCustomLabel(entry.customLabel || "");
    setFormRoom(entry.room || "");
    setFormTeacher(entry.teacher || "");
    setEditClassModalVisible(true);
  };

  const handleSaveClass = () => {
    if (formKind === "class" && !formSubjectId) {
      Alert.alert("Perhatian", "Pilih mata pelajaran terlebih dahulu.");
      return;
    }

    HapticFeedback.success();
    soundFX.playClick();

    if (editingEntry) {
      updateTimetableEntry(editingEntry.id, {
        weekday: formWeekday,
        periodNumber: formPeriod,
        subjectId: formKind === "class" ? formSubjectId : "",
        kind: formKind,
        customLabel: formCustomLabel.trim() || undefined,
        room: formRoom.trim() || undefined,
        teacher: formTeacher.trim() || undefined,
      });
    } else {
      addTimetableEntry({
        weekday: formWeekday,
        periodNumber: formPeriod,
        subjectId: formKind === "class" ? formSubjectId : "",
        weekPattern: "every",
        kind: formKind,
        customLabel: formCustomLabel.trim() || undefined,
        room: formRoom.trim() || undefined,
        teacher: formTeacher.trim() || undefined,
      });
    }

    setEditClassModalVisible(false);
  };

  const handleDeleteClass = () => {
    if (!editingEntry) return;
    Alert.alert(
      "Hapus Kelas",
      "Apakah Anda yakin ingin menghapus kelas ini dari jadwal?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            HapticFeedback.heavy();
            soundFX.playClick();
            deleteTimetableEntry(editingEntry.id);
            setEditClassModalVisible(false);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* ─── Screen Header ─── */}
      <ScreenHeader
        title="Jadwal Pelajaran"
        subtitle={`${timetableEntries.length} Sesi Terjadwal • ${subjects.length} Mapel`}
        actions={[
          {
            icon: "people-outline",
            accessibilityLabel: "Daftar Guru",
            onPress: () => {
              HapticFeedback.light();
              soundFX.playClick();
              setTeacherModalVisible(true);
            },
          },
          {
            icon: "add",
            accessibilityLabel: "Tambah Kelas",
            onPress: () => handleOpenAddClass(),
          },
        ]}
      />

      {/* ─── Top Segmented Control: Per Hari vs Mingguan ─── */}
      <View style={styles.segmentedContainer}>
        <Pressable
          style={[
            styles.segmentBtn,
            viewMode === "perHari" && styles.segmentBtnActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            setViewMode("perHari");
          }}
        >
          <Ionicons
            name="calendar"
            size={16}
            color={viewMode === "perHari" ? colors.primary : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              viewMode === "perHari" && styles.segmentTextActive,
            ]}
          >
            Per Hari
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.segmentBtn,
            viewMode === "mingguan" && styles.segmentBtnActive,
          ]}
          onPress={() => {
            HapticFeedback.light();
            setViewMode("mingguan");
          }}
        >
          <Ionicons
            name="grid-outline"
            size={16}
            color={viewMode === "mingguan" ? colors.primary : colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentText,
              viewMode === "mingguan" && styles.segmentTextActive,
            ]}
          >
            Ikhtisar Mingguan
          </Text>
        </Pressable>
      </View>

      {/* ─── View 1: Per Hari (Daily Timetable View) ─── */}
      {viewMode === "perHari" ? (
        <View style={styles.dailyViewWrapper}>
          <TimetableDayView
            entries={timetableEntries}
            subjects={subjects}
            periodTimes={periodTimes}
            initialDay={selectedDay}
            onAddClass={handleOpenAddClass}
            onEditClass={handleOpenEditClass}
            onCopyDay={() => {}}
            onRapikanDuplicates={rapikanDuplicates}
          />
        </View>
      ) : (
        /* ─── View 2: Mingguan (Full-Week Matrix Overview) ─── */
        <ScrollView
          style={styles.weeklyScroll}
          contentContainerStyle={styles.weeklyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.weeklyIntroRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.weeklyIntroText}>
              Ikhtisar seluruh jadwal pelajaran sekolah dari Senin sampai Sabtu. Ketuk kelas untuk mengedit.
            </Text>
          </View>

          {WEEKDAYS.slice(0, 6).map((wd) => {
            const dayEntries = timetableEntries
              .filter((e) => e.weekday === wd.day)
              .sort((a, b) => a.periodNumber - b.periodNumber);
            const isToday = wd.day === todayWeekday;

            return (
              <Card key={wd.day} style={styles.weekDayCard}>
                <View style={styles.weekDayHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.weekDayTitle}>{wd.nameId}</Text>
                    {isToday && (
                      <View style={styles.todayPill}>
                        <Text style={styles.todayPillText}>Hari Ini</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.weekDayCountText}>
                    {dayEntries.length} Pelajaran
                  </Text>
                </View>

                {dayEntries.length > 0 ? (
                  <View style={styles.weekDayEntriesWrap}>
                    {dayEntries.map((entry) => {
                      const sub = entry.subjectId ? subjectMap.get(entry.subjectId) : null;
                      const subCol = sub?.color || sub?.color_hex || colors.primary;
                      const periodTime = periodTimes.find(
                        (pt) => pt.periodNumber === entry.periodNumber
                      );
                      const isBreak = entry.kind === "break";

                      if (isBreak) {
                        return (
                          <View key={entry.id} style={styles.weeklyBreakRow}>
                            <Text style={styles.weeklyBreakText}>
                              ☕ {entry.customLabel || "Istirahat"} ({entry.startTime || periodTime?.start || "Jam " + entry.periodNumber})
                            </Text>
                          </View>
                        );
                      }

                      return (
                        <Pressable
                          key={entry.id}
                          style={styles.weeklyClassItem}
                          onPress={() => handleOpenEditClass(entry)}
                        >
                          <View style={[styles.weeklyClassStripe, { backgroundColor: subCol }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.weeklyClassTitle} numberOfLines={1}>
                              {sub?.title || sub?.name || entry.customLabel || "Pelajaran"}
                            </Text>
                            <Text style={styles.weeklyClassSub}>
                              Jam ke-{entry.periodNumber} • {periodTime ? `${periodTime.start} - ${periodTime.end}` : ""}
                              {entry.room ? ` • R. ${entry.room}` : ""}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.weekDayEmptyText}>Tidak ada jadwal kelas.</Text>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* ─── Add / Edit Class Modal ─── */}
      <Modal
        visible={editClassModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditClassModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {editingEntry ? "Edit Kelas Jadwal" : "Tambah Kelas Baru"}
              </Text>
              <Pressable
                onPress={() => setEditClassModalVisible(false)}
                hitSlop={touchTarget.min / 4}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Day Selector */}
              <Text style={styles.formLabel}>Hari</Text>
              <View style={styles.weekdayPillRow}>
                {WEEKDAYS.slice(0, 6).map((wd) => {
                  const isSel = formWeekday === wd.day;
                  return (
                    <Pressable
                      key={wd.day}
                      style={[styles.dayChip, isSel && styles.dayChipSelected]}
                      onPress={() => {
                        HapticFeedback.light();
                        setFormWeekday(wd.day);
                      }}
                    >
                      <Text style={[styles.dayChipText, isSel && styles.dayChipTextSelected]}>
                        {wd.shortId}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Period Number */}
              <Text style={styles.formLabel}>Jam Ke-</Text>
              <View style={styles.periodPillRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pNum) => {
                  const isSel = formPeriod === pNum;
                  return (
                    <Pressable
                      key={pNum}
                      style={[styles.periodChip, isSel && styles.periodChipSelected]}
                      onPress={() => {
                        HapticFeedback.light();
                        setFormPeriod(pNum);
                      }}
                    >
                      <Text style={[styles.periodChipText, isSel && styles.periodChipTextSelected]}>
                        {pNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Kind (Class vs Break) */}
              <Text style={styles.formLabel}>Jenis Entri</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Pelajaran Kelas", val: "class" },
                  { label: "Istirahat / Sholat", val: "break" },
                  { label: "Upacara / Acara", val: "event" },
                ].map((k) => (
                  <Pressable
                    key={k.val}
                    style={[
                      styles.kindChip,
                      formKind === k.val && styles.kindChipSelected,
                    ]}
                    onPress={() => {
                      HapticFeedback.light();
                      setFormKind(k.val as any);
                    }}
                  >
                    <Text
                      style={[
                        styles.kindChipText,
                        formKind === k.val && styles.kindChipTextSelected,
                      ]}
                    >
                      {k.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Subject Selection (if class) */}
              {formKind === "class" ? (
                <>
                  <Text style={styles.formLabel}>Mata Pelajaran</Text>
                  <View style={styles.subjectsSelectWrap}>
                    {subjects.map((sub) => {
                      const isSel = sub.id === formSubjectId;
                      const subCol = sub.color || sub.color_hex || colors.primary;
                      return (
                        <Pressable
                          key={sub.id}
                          style={[
                            styles.subSelectChip,
                            isSel && {
                              borderColor: subCol,
                              backgroundColor: `${subCol}20`,
                            },
                          ]}
                          onPress={() => {
                            HapticFeedback.light();
                            setFormSubjectId(sub.id);
                          }}
                        >
                          <View style={[styles.dot, { backgroundColor: subCol }]} />
                          <Text
                            style={[
                              styles.subSelectText,
                              isSel && { color: subCol, fontWeight: "700" },
                            ]}
                          >
                            {sub.title || sub.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.formLabel}>Label Khusus</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Contoh: Istirahat Siang / Upacara Bendera"
                    placeholderTextColor={colors.textMuted}
                    value={formCustomLabel}
                    onChangeText={setFormCustomLabel}
                  />
                </>
              )}

              {/* Room */}
              <Text style={styles.formLabel}>Ruangan (Opsional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: Lab Komputer / R. 204"
                placeholderTextColor={colors.textMuted}
                value={formRoom}
                onChangeText={setFormRoom}
              />

              {/* Teacher */}
              <Text style={styles.formLabel}>Nama Guru (Opsional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Contoh: Pak Budi Santoso"
                placeholderTextColor={colors.textMuted}
                value={formTeacher}
                onChangeText={setFormTeacher}
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActionsRow}>
              {editingEntry && (
                <Pressable
                  style={styles.deleteEntryBtn}
                  onPress={handleDeleteClass}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              )}
              <Pressable
                style={[styles.saveEntryBtn, { flex: 1 }]}
                onPress={handleSaveClass}
              >
                <Text style={styles.saveEntryBtnText}>Simpan Kelas</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Teacher Directory Modal ─── */}
      <TeacherDirectoryModal
        visible={teacherModalVisible}
        onClose={() => setTeacherModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  dailyViewWrapper: {
    flex: 1,
  },
  weeklyScroll: {
    flex: 1,
  },
  weeklyContent: {
    padding: spacing.md,
    paddingBottom: 90,
    gap: spacing.md,
  },
  weeklyIntroRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  weeklyIntroText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  weekDayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: colors.borderLight,
  },
  weekDayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  weekDayTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  todayPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: 8,
  },
  todayPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  weekDayCountText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  weekDayEntriesWrap: {
    gap: 6,
  },
  weeklyBreakRow: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  weeklyBreakText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  weeklyClassItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  weeklyClassStripe: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  weeklyClassTitle: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  weeklyClassSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  weekDayEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 10,
  },
  weekdayPillRow: {
    flexDirection: "row",
    gap: 6,
  },
  dayChip: {
    flex: 1,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dayChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  periodPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  periodChip: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  periodChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  periodChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  kindChip: {
    flex: 1,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  kindChipSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  kindChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
  },
  kindChipTextSelected: {
    color: colors.primary,
    fontWeight: "800",
  },
  subjectsSelectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  subSelectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  subSelectText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  formInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
  },
  modalActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.lg,
  },
  deleteEntryBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: `${colors.danger}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  saveEntryBtn: {
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  saveEntryBtnText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
  },
});
