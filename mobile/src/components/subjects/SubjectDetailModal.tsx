/**
 * StudyAir Mobile — Per-Subject Deep Dive Modal (Phase 11 & Step 4 Polish)
 * 
 * Provides a dedicated 360° deep dive for any subject:
 * 1. Drag handle at the top.
 * 2. Header with subject details, delete subject menu with confirmation.
 * 3. Next Scheduled Class: countdown & period time.
 * 4. Target Exam: "Ujian: 25 Nov 2026 • 31 hari lagi".
 * 5. Weekly Schedule Breakdown: consecutive merged periods ("Jam 1-2 • 07:00-08:30").
 * 6. Topics: localized Topik, Tambah topik, Belajar sekarang, no "Order #1".
 * 7. Active Tasks & PR for this subject.
 * 8. Routine Bring Items (Barang Bawaan).
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget } from "../../theme";
import { Subject, Task, TimetableEntry, PeriodTime, DayOff, Override, StudyUnit } from "../../types";
import { calculateNextClassDeadline } from "../../engine/deadlineEngine";
import { calculateDaysLeft, formatLocaleDate } from "../../lib/dateUtils";
import { getExamState } from "../../lib/examEngine";
import { mergeConsecutivePeriods } from "../../lib/periodUtils";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

interface SubjectDetailModalProps {
  visible: boolean;
  subject: Subject | null;
  tasks: Task[];
  studyUnits?: StudyUnit[];
  timetableEntries: TimetableEntry[];
  periodTimes: PeriodTime[];
  daysOff?: DayOff[];
  overrides?: Override[];
  onClose: () => void;
  onToggleTask: (taskId: string) => void;
  onAddTaskForSubject: (subjectId: string) => void;
  onUpdateSubject: (subjectId: string, updates: Partial<Subject>) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onToggleStudyUnit?: (unitId: string) => void;
  onDeleteStudyUnit?: (unitId: string) => void;
  onAddStudyUnit?: (subjectId: string) => void;
  onStartStudyUnit?: (unit: StudyUnit) => void;
}

export function SubjectDetailModal({
  visible,
  subject,
  tasks,
  studyUnits = [],
  timetableEntries,
  periodTimes,
  daysOff = [],
  overrides = [],
  onClose,
  onToggleTask,
  onAddTaskForSubject,
  onUpdateSubject,
  onDeleteSubject,
  onToggleStudyUnit,
  onDeleteStudyUnit,
  onAddStudyUnit,
  onStartStudyUnit,
}: SubjectDetailModalProps) {
  if (!subject) return null;

  const subColor = subject.color || subject.color_hex || colors.primary;
  const subTitle = subject.title || subject.name;

  // ─── 1. Next Scheduled Class Resolution ───
  const nextClass = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const res = calculateNextClassDeadline(subject.id, todayStr, timetableEntries, {
      daysOff,
      overrides,
    });
    if (res.found && res.deadlineDate) {
      const targetDate = parseISO(res.deadlineDate);
      const daysDiff = differenceInCalendarDays(targetDate, new Date());
      const pTime = periodTimes.find((p) => p.periodNumber === res.periodNumber);
      return {
        dateStr: formatLocaleDate(targetDate, "EEEE, d MMM"),
        daysDiff,
        period: res.periodNumber,
        time: pTime ? `${pTime.start} - ${pTime.end}` : `Jam ${res.periodNumber}`,
      };
    }
    return null;
  }, [subject.id, timetableEntries, periodTimes, daysOff, overrides]);

  // ─── 2. Weekly Timetable Sessions (Consecutive Merged) ───
  const subjectSessions = useMemo(() => {
    const DAY_NAMES = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    const entries = timetableEntries.filter((e) => e.subjectId === subject.id && e.kind !== "break");

    const byDayMap = new Map<number, TimetableEntry[]>();
    for (const e of entries) {
      const arr = byDayMap.get(e.weekday) || [];
      arr.push(e);
      byDayMap.set(e.weekday, arr);
    }

    const periodTimesMap = new Map<number, PeriodTime>();
    for (const pt of periodTimes) {
      periodTimesMap.set(pt.periodNumber, pt);
    }

    const mergedList: {
      id: string;
      dayName: string;
      weekday: number;
      periodLabel: string;
      timeStr: string;
      room?: string;
    }[] = [];

    const sortedDays = Array.from(byDayMap.keys()).sort((a, b) => a - b);
    for (const d of sortedDays) {
      const dayEntries = byDayMap.get(d) || [];
      const merged = mergeConsecutivePeriods(dayEntries, periodTimesMap);
      for (const m of merged) {
        mergedList.push({
          id: m.id,
          dayName: DAY_NAMES[d] || `Hari ${d}`,
          weekday: d,
          periodLabel: m.periodLabel,
          timeStr: m.timeRangeStr,
          room: m.room || subject.room,
        });
      }
    }
    return mergedList;
  }, [subject, timetableEntries, periodTimes]);

  // ─── 3. Tasks Specifically for this Subject ───
  const subjectTasks = useMemo(() => {
    return tasks.filter((t) => t.subjectId === subject.id || (t as any).subject_id === subject.id);
  }, [tasks, subject.id]);

  const pendingTasks = subjectTasks.filter((t) => t.status !== "COMPLETED" && !(t as any).is_completed);
  const completedTasks = subjectTasks.filter((t) => t.status === "COMPLETED" || (t as any).is_completed);

  // ─── 4. Exam Countdown ("Ujian: 25 Nov 2026 • 31 hari lagi") ───
  const examInfo = useMemo(() => {
    if (!subject) return null;
    const res = getExamState({ subjects: [subject], studyUnits, today: new Date() });
    if (!res.nextExam && res.pastExams.length === 0) return null;
    const examItem = res.nextExam || res.pastExams[0];
    const dateDisplay = formatLocaleDate(examItem.startDate, "d MMM yyyy");
    return {
      dateStr: dateDisplay,
      daysLeft: examItem.daysLeft,
      label: examItem.label,
      displayText: `Ujian: ${dateDisplay} • ${examItem.label}`,
      isPassed: examItem.isPassed,
      isToday: examItem.isToday,
      isOngoing: examItem.isOngoing,
    };
  }, [subject, studyUnits]);

  // ─── Bring Items Inline Editing ───
  const [newBringItem, setNewBringItem] = useState("");
  const [isAddingBringItem, setIsAddingBringItem] = useState(false);

  const handleAddBringItem = () => {
    const clean = newBringItem.trim();
    if (!clean) return;
    const current = subject.bringItems || [];
    if (!current.includes(clean)) {
      onUpdateSubject(subject.id, { bringItems: [...current, clean] });
    }
    setNewBringItem("");
    setIsAddingBringItem(false);
  };

  const handleRemoveBringItem = (itemToRemove: string) => {
    const current = subject.bringItems || [];
    onUpdateSubject(subject.id, {
      bringItems: current.filter((item) => item !== itemToRemove),
    });
  };

  const currentUnits = studyUnits.filter((u) => u.subject_id === subject.id);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={[styles.headerColorBar, { backgroundColor: subColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {subTitle}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {subject.teacher ? `${subject.teacher} • ` : ""}
                  {subject.room || "Ruang Kelas"}
                </Text>
              </View>
            </View>

            {/* Menu: Hapus Mata Pelajaran with Confirmation */}
            {onDeleteSubject && (
              <Pressable
                style={styles.actionIconBtn}
                onPress={() => {
                  Alert.alert(
                    "Hapus Mata Pelajaran",
                    `Apakah kamu yakin ingin menghapus "${subTitle}"? Semua jadwal dan topik pelajaran ini akan ikut terhapus.`,
                    [
                      { text: "Batal", style: "cancel" },
                      {
                        text: "Hapus",
                        style: "destructive",
                        onPress: () => {
                          onClose();
                          onDeleteSubject(subject.id);
                        },
                      },
                    ]
                  );
                }}
                hitSlop={8}
                accessibilityLabel="Hapus Mapel"
              >
                <Ionicons name="trash-outline" size={19} color={colors.rose} />
              </Pressable>
            )}

            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Tutup">
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* ─── Target Exam Banner ("Ujian: 25 Nov 2026 • 31 hari lagi") ─── */}
            {examInfo && (
              <View style={styles.examBannerCard}>
                <View style={styles.examBannerIcon}>
                  <Ionicons name="calendar-outline" size={20} color={colors.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.examBannerTitle}>{examInfo.displayText}</Text>
                  <Text style={styles.examBannerSubtitle}>Persiapan Evaluasi & Ujian Akhir</Text>
                </View>
                <View style={[styles.examBadge, examInfo.isPassed && { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.examBadgeText, examInfo.isPassed && { color: colors.textSecondary }]}>
                    {examInfo.label}
                  </Text>
                </View>
              </View>
            )}

            {/* ─── Next Class Card ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="time-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Kelas Berikutnya</Text>
              </View>
              {nextClass ? (
                <View style={styles.nextClassBox}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextClassDate}>{nextClass.dateStr}</Text>
                    <Text style={styles.nextClassTime}>
                      Jam {nextClass.period} ({nextClass.time})
                    </Text>
                  </View>
                  <View style={styles.daysBadge}>
                    <Text style={styles.daysBadgeText}>
                      {nextClass.daysDiff === 0
                        ? "Hari Ini"
                        : nextClass.daysDiff === 1
                        ? "Besok"
                        : `${nextClass.daysDiff} hari lagi`}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyNote}>Tidak ada jadwal kelas dalam 60 hari ke depan.</Text>
              )}
            </View>

            {/* ─── Topics / Study Units (Localized & No Order #) ─── */}
            <View style={styles.sectionCard}>
              <View style={[styles.sectionHeaderRow, { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="layers-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>
                    Topik ({currentUnits.length})
                  </Text>
                </View>
                {onAddStudyUnit && (
                  <Pressable
                    style={styles.addTopicHeaderBtn}
                    onPress={() => onAddStudyUnit(subject.id)}
                    hitSlop={6}
                  >
                    <Ionicons name="add" size={15} color={colors.primary} style={{ marginRight: 2 }} />
                    <Text style={styles.addTopicHeaderBtnText}>Tambah topik</Text>
                  </Pressable>
                )}
              </View>

              {currentUnits.length === 0 ? (
                <Text style={styles.emptyNote}>Belum ada topik untuk mata pelajaran ini.</Text>
              ) : (
                <View style={styles.topicsList}>
                  {currentUnits.some((u) => !u.is_completed) && onStartStudyUnit && (
                    <Pressable
                      style={styles.studyNowBannerBtn}
                      onPress={() => {
                        const nextUnit = currentUnits.find((u) => !u.is_completed);
                        if (nextUnit) {
                          onClose();
                          onStartStudyUnit(nextUnit);
                        }
                      }}
                    >
                      <Ionicons name="play" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.studyNowBannerBtnText}>Belajar sekarang</Text>
                    </Pressable>
                  )}

                  {currentUnits.map((u) => (
                    <View key={u.id} style={styles.topicRowItem}>
                      <Pressable
                        style={[styles.topicCheckbox, u.is_completed && styles.topicCheckboxDone]}
                        onPress={() => onToggleStudyUnit?.(u.id)}
                      >
                        {u.is_completed && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                      </Pressable>
                      <Pressable
                        style={{ flex: 1 }}
                        onPress={() => {
                          if (onStartStudyUnit) {
                            onClose();
                            onStartStudyUnit(u);
                          }
                        }}
                      >
                        <Text style={[styles.topicTitleText, u.is_completed && styles.topicTitleTextDone]}>
                          {u.title}
                        </Text>
                        <Text style={styles.topicMetaText}>
                          {u.estimated_minutes}m • {u.cognitive_load}
                        </Text>
                      </Pressable>
                      {onDeleteStudyUnit && (
                        <Pressable
                          hitSlop={8}
                          onPress={() => onDeleteStudyUnit(u.id)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ─── Weekly Schedule Sessions (Consecutive merged) ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="grid-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>
                  Jadwal Mingguan ({subjectSessions.length} sesi)
                </Text>
              </View>

              {subjectSessions.length === 0 ? (
                <Text style={styles.emptyNote}>Belum ada jam pelajaran di jadwal mingguan.</Text>
              ) : (
                <View style={styles.sessionsList}>
                  {subjectSessions.map((session) => (
                    <View key={session.id} style={styles.sessionRow}>
                      <View style={[styles.dayPill, { backgroundColor: `${subColor}22` }]}>
                        <Text style={[styles.dayPillText, { color: subColor }]}>
                          {session.dayName}
                        </Text>
                      </View>
                      <Text style={styles.sessionTimeText}>
                        {session.periodLabel} • {session.timeStr}
                      </Text>
                      {session.room ? (
                        <Text style={styles.sessionRoomText}>{session.room}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ─── Active Tasks for this Subject ─── */}
            <View style={styles.sectionCard}>
              <View style={[styles.sectionHeaderRow, { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="checkbox-outline" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.sectionTitle}>
                    Tugas & PR Aktif ({pendingTasks.length})
                  </Text>
                </View>
                <Pressable
                  style={styles.quickAddTaskBtn}
                  onPress={() => {
                    onClose();
                    onAddTaskForSubject(subject.id);
                  }}
                >
                  <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 2 }} />
                  <Text style={styles.quickAddTaskText}>Tambah</Text>
                </Pressable>
              </View>

              {pendingTasks.length === 0 ? (
                <Text style={styles.emptyNote}>Semua tugas pelajaran ini sudah selesai! 🎉</Text>
              ) : (
                <View style={styles.tasksList}>
                  {pendingTasks.map((t) => (
                    <Pressable
                      key={t.id}
                      style={styles.taskItemRow}
                      onPress={() => onToggleTask(t.id)}
                    >
                      <View style={styles.taskCheckbox}>
                        {t.status === "COMPLETED" && (
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.taskTitleText}>{t.title}</Text>
                        <Text style={styles.taskDeadlineText}>
                          Tenggat: {t.deadlineDate ? formatLocaleDate(t.deadlineDate, "d MMM") : ((t as any).due_date ? formatLocaleDate((t as any).due_date, "d MMM") : "Tidak ada tanggal")}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Completed Tasks section */}
              {completedTasks.length > 0 && (
                <View style={styles.completedSubSection}>
                  <Text style={styles.completedHeader}>
                    Riwayat Selesai ({completedTasks.length})
                  </Text>
                  {completedTasks.map((t) => (
                    <Pressable
                      key={t.id}
                      style={styles.taskItemRow}
                      onPress={() => onToggleTask(t.id)}
                    >
                      <View style={[styles.taskCheckbox, styles.taskCheckboxDone]}>
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      </View>
                      <Text style={[styles.taskTitleText, styles.taskTitleDone]}>
                        {t.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* ─── Bring Items (Barang Bawaan Rutin) ─── */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="bag-outline" size={18} color={colors.emerald} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Barang Bawaan Rutin</Text>
              </View>

              <View style={styles.bringChipsContainer}>
                {(subject.bringItems || []).map((item, idx) => (
                  <View key={idx} style={styles.bringChip}>
                    <Text style={styles.bringChipText}>{item}</Text>
                    <Pressable
                      style={styles.removeChipBtn}
                      onPress={() => handleRemoveBringItem(item)}
                      hitSlop={6}
                    >
                      <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ))}

                {isAddingBringItem ? (
                  <View style={styles.addBringRow}>
                    <TextInput
                      style={styles.bringInput}
                      placeholder="Nama barang..."
                      placeholderTextColor={colors.textSecondary}
                      value={newBringItem}
                      onChangeText={setNewBringItem}
                      autoFocus
                      onSubmitEditing={handleAddBringItem}
                    />
                    <Pressable style={styles.saveBringBtn} onPress={handleAddBringItem}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </Pressable>
                    <Pressable
                      style={styles.cancelBringBtn}
                      onPress={() => setIsAddingBringItem(false)}
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.addBringChip}
                    onPress={() => setIsAddingBringItem(true)}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.addBringChipText}>Tambah Barang</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "92%",
    minHeight: "75%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  headerColorBar: {
    width: 5,
    height: 38,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionIconBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtn: {
    width: touchTarget.min,
    height: touchTarget.min,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  examBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  examBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  examBannerTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  examBannerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  examBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  examBadgeText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.amber,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  addTopicHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addTopicHeaderBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  topicsList: {
    gap: spacing.xs,
  },
  studyNowBannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 7,
    marginBottom: spacing.xs,
  },
  studyNowBannerBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  topicRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  topicCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  topicCheckboxDone: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  topicTitleText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  topicTitleTextDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  topicMetaText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nextClassBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  nextClassDate: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  nextClassTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daysBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  daysBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginVertical: 4,
  },
  bringChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bringChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bringChipText: {
    fontSize: 12,
    color: colors.text,
    marginRight: 4,
  },
  removeChipBtn: {
    padding: 2,
  },
  addBringChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  addBringChipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  addBringRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  bringInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: colors.text,
    width: 130,
    marginRight: 4,
  },
  saveBringBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: 6,
    marginRight: 4,
  },
  cancelBringBtn: {
    padding: 6,
  },
  sessionsList: {
    gap: 6,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  dayPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sessionTimeText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  sessionRoomText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  quickAddTaskBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  quickAddTaskText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
  },
  tasksList: {
    gap: 6,
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  taskCheckboxDone: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  taskTitleText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  taskDeadlineText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  completedSubSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
