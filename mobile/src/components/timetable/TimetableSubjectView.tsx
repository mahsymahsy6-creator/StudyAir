/**
 * StudyAir Mobile — Timetable Subject View Component
 * 
 * Features:
 * - Full-height vertical list of subject cards.
 * - Day chips (Sen, Rab, Kam) in the subject's color showing all days this subject meets.
 * - Sessions per week badge ("4 sesi/minggu").
 * - Target exam date & topic progress.
 * - Tap to open subject detail sheet (chevron indicator).
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget } from "../../theme";
import { Subject, TimetableEntry, StudyUnit } from "../../types";
import { WEEKDAYS } from "../../lib/timetableGrouping";
import { calculateDaysLeft, formatLocaleDate } from "../../lib/dateUtils";

interface TimetableSubjectViewProps {
  subjects: Subject[];
  timetableEntries: TimetableEntry[];
  studyUnits: StudyUnit[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  onAddSubject: () => void;
  onEditSubject?: (subject: Subject) => void;
  onDeepDiveSubject?: (subject: Subject) => void;
}

export function TimetableSubjectView({
  subjects,
  timetableEntries,
  studyUnits,
  selectedSubjectId,
  onSelectSubject,
  onAddSubject,
  onDeepDiveSubject,
}: TimetableSubjectViewProps) {
  // Synthesize subjects for orphaned entries
  const orphanCards: Subject[] = React.useMemo(() => {
    const existingIds = new Set(subjects.map((s) => s.id));
    const missingEntries = timetableEntries.filter(
      (e) => e.kind !== "break" && e.kind !== "event" && (!e.subjectId || !existingIds.has(e.subjectId))
    );
    if (missingEntries.length === 0) return [];

    const groupedBySubject = new Map<string, TimetableEntry[]>();
    for (const entry of missingEntries) {
      const key = entry.subjectId || entry.customLabel || "orphan";
      const arr = groupedBySubject.get(key) || [];
      arr.push(entry);
      groupedBySubject.set(key, arr);
    }

    return Array.from(groupedBySubject.entries()).map(([key, list]) => {
      const lead = list[0];
      const name = lead.customLabel || (lead.subjectId ? `Mapel ${lead.subjectId}` : "Mapel hilang");
      return {
        id: lead.subjectId || `orphan-${lead.id}`,
        name: `${name} (Hilang)`,
        title: `${name} (Hilang)`,
        color: "#94A3B8",
        color_hex: "#94A3B8",
        aliases: [],
        teacher: lead.teacher,
        room: lead.room,
        bringItems: [],
        exam_date: "",
        examDate: "",
      };
    });
  }, [subjects, timetableEntries]);

  const allSubjects = React.useMemo(() => {
    return [...subjects, ...orphanCards];
  }, [subjects, orphanCards]);

  const handlePressCard = (sub: Subject) => {
    onSelectSubject(sub.id);
    if (onDeepDiveSubject) {
      onDeepDiveSubject(sub);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {allSubjects.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="book-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Mata Pelajaran</Text>
          <Text style={styles.emptyDesc}>
            Tambahkan mata pelajaran untuk mengatur topik dan jadwal mingguan.
          </Text>
          <Pressable style={styles.emptyAddBtn} onPress={onAddSubject}>
            <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyAddBtnText}>Tambah Mapel</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {allSubjects.map((sub) => {
            const isSelected = sub.id === selectedSubjectId;
            const subColor = sub.color || sub.color_hex || colors.primary;

            // Find all entries for this subject in the timetable
            const subEntries = timetableEntries.filter(
              (e) => (e.subjectId === sub.id || (!sub.id.startsWith("sub-") && e.customLabel === sub.name)) && e.kind !== "break"
            );
            const sessionsCount = subEntries.length;

            // Unique weekdays this subject meets on (sorted Monday first)
            const meetingDays = Array.from(new Set(subEntries.map((e) => e.weekday))).sort(
              (a, b) => a - b
            );

            // Units completion stats
            const subUnits = studyUnits.filter((u) => u.subject_id === sub.id);
            const completedCount = subUnits.filter((u) => u.is_completed).length;

            // Exam info
            const examDateStr = sub.examDate || sub.exam_date;
            let examBadgeText: string | null = null;
            if (examDateStr) {
              const res = calculateDaysLeft(examDateStr, new Date());
              examBadgeText = `Ujian: ${formatLocaleDate(examDateStr, "d MMM")} • ${res.label}`;
            }

            return (
              <Pressable
                key={sub.id}
                style={[
                  styles.subjectCard,
                  isSelected && styles.subjectCardSelected,
                  { borderLeftColor: subColor },
                ]}
                onPress={() => handlePressCard(sub)}
              >
                {/* Header Row: Title & Sessions per week */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.subjectTitle} numberOfLines={2}>
                      {sub.title || sub.name}
                    </Text>
                    {sub.teacher || sub.room ? (
                      <Text style={styles.teacherRoomText} numberOfLines={1}>
                        {[sub.teacher ? `Guru: ${sub.teacher}` : null, sub.room].filter(Boolean).join(" • ")}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={styles.sessionsBadge}>
                      <Ionicons name="calendar-outline" size={11} color={colors.accent} style={{ marginRight: 3 }} />
                      <Text style={styles.sessionsBadgeText}>
                        {sessionsCount} sesi/minggu
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </View>
                </View>

                {/* Day Chips in Subject Color: [Sen] [Rab] [Kam] */}
                <View style={styles.dayChipsRow}>
                  {meetingDays.length === 0 ? (
                    <View style={styles.noScheduleChip}>
                      <Text style={styles.noScheduleChipText}>Belum ada jadwal</Text>
                    </View>
                  ) : (
                    meetingDays.map((dayNum) => {
                      const meta = WEEKDAYS.find((w) => w.day === dayNum);
                      const dayLabel = meta ? meta.shortId : `D${dayNum}`;

                      return (
                        <View
                          key={dayNum}
                          style={[
                            styles.dayChip,
                            {
                              backgroundColor: `${subColor}22`,
                              borderColor: `${subColor}66`,
                            },
                          ]}
                        >
                          <Text style={[styles.dayChipText, { color: subColor }]}>
                            {dayLabel}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Footer Row: Exam Date & Topics completion */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.topicsProgress}>
                    <Ionicons name="layers-outline" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                    <Text style={styles.topicsProgressText}>
                      {completedCount}/{subUnits.length} topik
                    </Text>
                  </View>

                  {examBadgeText && (
                    <View style={styles.examDateTag}>
                      <Ionicons name="alarm-outline" size={12} color={colors.amber} style={{ marginRight: 3 }} />
                      <Text style={styles.examDateTagText}>
                        {examBadgeText}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl * 2,
  },
  cardsList: {
    gap: spacing.md,
  },
  subjectCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: touchTarget.min,
  },
  subjectCardSelected: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.borderLight,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  subjectTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  teacherRoomText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.25)",
    flexShrink: 0,
  },
  sessionsBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.accent,
  },
  dayChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: spacing.sm,
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
  },
  noScheduleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noScheduleChipText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 6,
  },
  topicsProgress: {
    flexDirection: "row",
    alignItems: "center",
  },
  topicsProgressText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  examDateTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  examDateTagText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.semibold,
    color: colors.amber,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyAddBtnText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },
});
