/**
 * StudyAir Mobile — Days Off & Holiday Calendar Modal
 * 
 * Features:
 * - Interactive calendar date picker (no raw YYYY-MM-DD input needed).
 * - Mark single dates or date ranges as DayOff with preset/custom reasons.
 * - Indonesian localized dates everywhere (no ISO strings or English weekdays).
 * - Tabbed view: "Tambah Libur" and "Daftar Libur".
 * - Automatic dynamic deadline recalculation feedback.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, isBefore, addDays, addMonths, subMonths } from "date-fns";
import { colors, spacing, radius, typography, touchTarget } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { formatLocaleDate, parseLocalMidnight } from "../../lib/dateUtils";

interface DaysOffModalProps {
  visible: boolean;
  initialDate?: string; // YYYY-MM-DD
  onClose: () => void;
}

const PRESET_REASONS = [
  "Libur Nasional",
  "Ujian Semester (PAS)",
  "Ujian Tengah Semester (PTS)",
  "Libur Akhir Semester",
  "Class Meeting",
  "Hari Guru",
  "Kegiatan Sekolah",
  "Study Tour",
];

const WEEKDAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function DaysOffModal({ visible, initialDate, onClose }: DaysOffModalProps) {
  const { daysOff, addDayOff, addDayOffRange, deleteDayOff } = useMobileStudyStore();

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [activeTab, setActiveTab] = useState<"add" | "list">("add");
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [startDate, setStartDate] = useState(initialDate || todayStr);
  const [endDate, setEndDate] = useState(
    initialDate
      ? format(addDays(parseLocalMidnight(initialDate), 1), "yyyy-MM-dd")
      : format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(
    initialDate ? parseLocalMidnight(initialDate) : new Date()
  );

  const [reason, setReason] = useState("Libur Nasional");
  const [customReason, setCustomReason] = useState("");
  const [formError, setFormError] = useState("");

  const effectiveReason = customReason.trim() ? customReason.trim() : reason;

  // Generate calendar days for the current viewed month
  const calendarDays = useMemo(() => {
    const year = calendarViewMonth.getFullYear();
    const month = calendarViewMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Preceding empty slots
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: 0, dateStr: "", isCurrentMonth: false });
    }

    // Days in month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, dateStr, isCurrentMonth: true });
    }

    return cells;
  }, [calendarViewMonth]);

  const handleSelectDay = (dateStr: string) => {
    setFormError("");
    if (!isRangeMode) {
      setStartDate(dateStr);
    } else {
      // Range mode selection logic
      if (!startDate || dateStr < startDate || (startDate && endDate && startDate !== endDate)) {
        setStartDate(dateStr);
        setEndDate(format(addDays(parseLocalMidnight(dateStr), 1), "yyyy-MM-dd"));
      } else {
        setEndDate(dateStr);
      }
    }
  };

  const handleSaveDayOff = () => {
    setFormError("");

    if (!startDate) {
      setFormError("Pilih tanggal libur terlebih dahulu.");
      return;
    }

    if (isRangeMode) {
      if (!endDate) {
        setFormError("Pilih tanggal akhir rentang libur.");
        return;
      }

      if (isBefore(parseLocalMidnight(endDate), parseLocalMidnight(startDate))) {
        setFormError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
        return;
      }

      const count = addDayOffRange(startDate, endDate, effectiveReason);
      Alert.alert(
        "Hari Libur Ditambahkan",
        `Berhasil menandai ${count} hari sebagai libur (${effectiveReason}). Tenggat tugas otomatis disesuaikan.`
      );
    } else {
      addDayOff({
        date: startDate,
        reason: effectiveReason,
      });
      Alert.alert(
        "Hari Libur Ditambahkan",
        `${formatLocaleDate(startDate, "EEEE, d MMMM yyyy")} ditandai sebagai ${effectiveReason}. Tenggat tugas otomatis disesuaikan.`
      );
    }

    setCustomReason("");
    setActiveTab("list");
  };

  const handleDeleteItem = (date: string, itemReason: string) => {
    const formattedDate = formatLocaleDate(date, "EEEE, d MMMM yyyy");
    Alert.alert(
      "Hapus Hari Libur",
      `Yakin ingin menghapus libur ${itemReason} pada ${formattedDate}? Jadwal pelajaran akan kembali aktif.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            deleteDayOff(date);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.handleBar} />

          {/* ─── Header ─── */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.headerIconContainer}>
                <Ionicons name="calendar" size={18} color={colors.amber} />
              </View>
              <Text style={styles.sheetTitle}>Hari Libur & Kalender</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ─── Tabs: Tambah vs Daftar ─── */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabBtn, activeTab === "add" && styles.tabBtnActive]}
              onPress={() => setActiveTab("add")}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={activeTab === "add" ? colors.primary : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === "add" && styles.tabBtnTextActive]}>
                Tambah Libur
              </Text>
            </Pressable>

            <Pressable
              style={[styles.tabBtn, activeTab === "list" && styles.tabBtnActive]}
              onPress={() => setActiveTab("list")}
            >
              <Ionicons
                name="list"
                size={16}
                color={activeTab === "list" ? colors.primary : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === "list" && styles.tabBtnTextActive]}>
                Daftar Libur ({daysOff.length})
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {activeTab === "add" ? (
              <View>
                {/* Mode Selector: 1 Hari vs Rentang */}
                <View style={styles.modeToggleRow}>
                  <Pressable
                    style={[styles.modeToggleBtn, !isRangeMode && styles.modeToggleBtnActive]}
                    onPress={() => setIsRangeMode(false)}
                  >
                    <Ionicons
                      name="today-outline"
                      size={15}
                      color={!isRangeMode ? "#ffffff" : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.modeToggleText,
                        !isRangeMode && styles.modeToggleTextActive,
                      ]}
                    >
                      1 Hari Saja
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modeToggleBtn, isRangeMode && styles.modeToggleBtnActive]}
                    onPress={() => setIsRangeMode(true)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={isRangeMode ? "#ffffff" : colors.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.modeToggleText,
                        isRangeMode && styles.modeToggleTextActive,
                      ]}
                    >
                      Rentang Tanggal (Ujian/Libur)
                    </Text>
                  </Pressable>
                </View>

                {/* Selected Date Summary Banner */}
                <View style={styles.dateSummaryCard}>
                  <Ionicons name="calendar-sharp" size={18} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={styles.dateSummaryLabel}>
                      {isRangeMode ? "RENTANG TANGGAL TERPILIH" : "TANGGAL LIBUR"}
                    </Text>
                    <Text style={styles.dateSummaryValue}>
                      {!isRangeMode
                        ? formatLocaleDate(startDate, "EEEE, d MMMM yyyy")
                        : `${formatLocaleDate(startDate, "d MMM yyyy")} – ${formatLocaleDate(endDate, "d MMM yyyy")}`}
                    </Text>
                  </View>
                </View>

                {/* Interactive Month Calendar Picker */}
                <View style={styles.calendarCard}>
                  {/* Month Navigation */}
                  <View style={styles.calendarNavRow}>
                    <Pressable
                      style={styles.calendarNavBtn}
                      onPress={() => setCalendarViewMonth((prev) => subMonths(prev, 1))}
                      hitSlop={8}
                    >
                      <Ionicons name="chevron-back" size={18} color={colors.text} />
                    </Pressable>
                    <Text style={styles.calendarNavTitle}>
                      {formatLocaleDate(calendarViewMonth, "MMMM yyyy")}
                    </Text>
                    <Pressable
                      style={styles.calendarNavBtn}
                      onPress={() => setCalendarViewMonth((prev) => addMonths(prev, 1))}
                      hitSlop={8}
                    >
                      <Ionicons name="chevron-forward" size={18} color={colors.text} />
                    </Pressable>
                  </View>

                  {/* Weekday Header */}
                  <View style={styles.weekdaysHeader}>
                    {WEEKDAY_NAMES.map((name, idx) => (
                      <Text
                        key={idx}
                        style={[
                          styles.weekdayHeaderText,
                          idx === 0 && { color: colors.rose },
                        ]}
                      >
                        {name}
                      </Text>
                    ))}
                  </View>

                  {/* Days Grid */}
                  <View style={styles.daysGrid}>
                    {calendarDays.map((cell, idx) => {
                      if (!cell.isCurrentMonth) {
                        return <View key={idx} style={styles.dayCellEmpty} />;
                      }

                      const isStart = cell.dateStr === startDate;
                      const isEnd = isRangeMode && cell.dateStr === endDate;
                      const isInRange =
                        isRangeMode && cell.dateStr > startDate && cell.dateStr < endDate;
                      const isSelected = isStart || isEnd;
                      const isToday = cell.dateStr === todayStr;

                      return (
                        <Pressable
                          key={idx}
                          style={[
                            styles.dayCell,
                            isInRange && styles.dayCellInRange,
                            isSelected && styles.dayCellSelected,
                          ]}
                          onPress={() => handleSelectDay(cell.dateStr)}
                        >
                          <Text
                            style={[
                              styles.dayCellText,
                              isToday && styles.dayCellTextToday,
                              isSelected && styles.dayCellTextSelected,
                              isInRange && styles.dayCellTextInRange,
                            ]}
                          >
                            {cell.day}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Quick Shortcut Pills */}
                  <View style={styles.quickShortcutsRow}>
                    <Pressable
                      style={styles.quickShortcutPill}
                      onPress={() => {
                        setStartDate(todayStr);
                        if (isRangeMode) {
                          setEndDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
                        }
                      }}
                    >
                      <Text style={styles.quickShortcutText}>Hari ini</Text>
                    </Pressable>

                    <Pressable
                      style={styles.quickShortcutPill}
                      onPress={() => {
                        const besok = format(addDays(new Date(), 1), "yyyy-MM-dd");
                        setStartDate(besok);
                        if (isRangeMode) {
                          setEndDate(format(addDays(new Date(), 2), "yyyy-MM-dd"));
                        }
                      }}
                    >
                      <Text style={styles.quickShortcutText}>Besok</Text>
                    </Pressable>

                    <Pressable
                      style={styles.quickShortcutPill}
                      onPress={() => {
                        setStartDate(todayStr);
                        setEndDate(format(addDays(new Date(), 7), "yyyy-MM-dd"));
                        setIsRangeMode(true);
                      }}
                    >
                      <Text style={styles.quickShortcutText}>+1 Minggu Libur</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Preset Reason Chips */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Pilih Alasan Libur</Text>
                  <View style={styles.presetChipsRow}>
                    {PRESET_REASONS.map((p) => {
                      const isSelected = reason === p && !customReason;
                      return (
                        <Pressable
                          key={p}
                          style={[styles.presetChip, isSelected && styles.presetChipSelected]}
                          onPress={() => {
                            setReason(p);
                            setCustomReason("");
                          }}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              isSelected && styles.presetChipTextSelected,
                            ]}
                          >
                            {p}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Custom Reason Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>Atau Tulis Alasan Sendiri</Text>
                  <TextInput
                    style={styles.textInput}
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder="Contoh: HUT Sekolah, Class Meeting, dll."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                {/* Save Button */}
                <Pressable style={styles.saveBtn} onPress={handleSaveDayOff}>
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>
                    Simpan {isRangeMode ? "Rentang Libur" : "Hari Libur"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              /* Tab 2: List of Days Off */
              <View>
                {daysOff.length === 0 ? (
                  <View style={styles.emptyListContainer}>
                    <Ionicons name="calendar-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyListTitle}>Belum ada hari libur terjadwal</Text>
                    <Text style={styles.emptyListSub}>
                      Tandai libur nasional atau pekan ujian agar tugas otomatis melewati hari tersebut.
                    </Text>
                    <Pressable style={styles.emptyActionBtn} onPress={() => setActiveTab("add")}>
                      <Text style={styles.emptyActionText}>+ Tambah Hari Libur</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.listContainer}>
                    {daysOff.map((item) => (
                      <View key={item.date} style={styles.dayOffItemCard}>
                        <View style={styles.dayOffDateBadge}>
                          <Text style={styles.dayOffDateText}>
                            {formatLocaleDate(item.date, "d MMM")}
                          </Text>
                          <Text style={styles.dayOffYearText}>
                            {formatLocaleDate(item.date, "yyyy")}
                          </Text>
                        </View>

                        <View style={styles.dayOffInfo}>
                          <Text style={styles.dayOffReasonText}>{item.reason}</Text>
                          <Text style={styles.dayOffWeekdayText}>
                            {formatLocaleDate(item.date, "EEEE, d MMMM yyyy")}
                          </Text>
                        </View>

                        <Pressable
                          style={styles.deleteDayOffBtn}
                          onPress={() => handleDeleteItem(item.date, item.reason)}
                          hitSlop={8}
                          accessibilityLabel="Hapus Hari Libur"
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.rose} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
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
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: colors.border,
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.amberLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: "700",
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
  },
  tabBtnText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  tabBtnTextActive: {
    color: colors.text,
    fontWeight: "700",
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  modeToggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  modeToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeToggleText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  modeToggleTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  dateSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dateSummaryLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.8,
  },
  dateSummaryValue: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
  },
  calendarCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  calendarNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  calendarNavBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  calendarNavTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  weekdaysHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  weekdayHeaderText: {
    width: "14%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCellEmpty: {
    width: "14.28%",
    height: 38,
  },
  dayCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellInRange: {
    backgroundColor: colors.primaryLight,
    borderRadius: 0,
  },
  dayCellText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  dayCellTextToday: {
    color: colors.primary,
    fontWeight: "800",
  },
  dayCellTextSelected: {
    color: "#ffffff",
    fontWeight: "800",
  },
  dayCellTextInRange: {
    color: colors.primary,
    fontWeight: "700",
  },
  quickShortcutsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickShortcutPill: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quickShortcutText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  presetChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  presetChip: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  presetChipSelected: {
    backgroundColor: colors.amberLight,
    borderColor: colors.amber,
  },
  presetChipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  presetChipTextSelected: {
    color: colors.amber,
    fontWeight: "700",
  },
  errorText: {
    fontSize: typography.fontSizes.xs,
    color: colors.rose,
    marginBottom: spacing.sm,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    minHeight: touchTarget.min,
  },
  saveBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
    color: "#ffffff",
  },
  emptyListContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyListTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  emptyListSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  emptyActionBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  emptyActionText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  listContainer: {
    gap: spacing.sm,
  },
  dayOffItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dayOffDateBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: "center",
    minWidth: 54,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
  },
  dayOffDateText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  dayOffYearText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dayOffInfo: {
    flex: 1,
  },
  dayOffReasonText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  dayOffWeekdayText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  deleteDayOffBtn: {
    padding: spacing.xs,
  },
});
