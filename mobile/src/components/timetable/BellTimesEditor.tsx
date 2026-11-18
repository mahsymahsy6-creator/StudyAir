/**
 * StudyAir Mobile — BellTimesEditor Component (UI FIX PASS 2 - STEP 1)
 * 
 * Shared school bell schedule editor used in:
 * 1. Timetable Wizard (Step 4)
 * 2. Settings Screen (Pengaturan Jam Belajar)
 * 
 * Features:
 * - Labels: "Jam 1" (not "Jam ke-1").
 * - Quick setup card at top: start time, period length (default 45 min),
 *   Break 1 after Period 3 (15 min), Break 2/Ishoma after Period 6 (45 min).
 * - "Terapkan" fills all rows, which stay editable.
 * - 48dp touchable time fields opening an interactive time picker modal.
 * - Duration at the end of each row ("45 mnt").
 * - Thin gray display-only rows for gaps between periods ("Istirahat - 15 mnt").
 * - Break entries (kind = break) supported and never counted as classes.
 * - Add/remove period. Progressive disclosure ("Tampilkan jam lain") up to maxUsedPeriod.
 * - Live validation: end after start, no overlaps, next start >= previous end.
 * - Button "Lanjut ke ringkasan" disabled when invalid. "Kembalikan jam standar" reset.
 * - "Jam berbeda di hari Jumat" toggle for schools with shorter Friday schedules.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../../theme";
import { PeriodTime } from "../../types";
import {
  formatPeriodLabel,
  generateQuickSetupBellTimes,
  validateBellSchedule,
  detectPeriodGaps,
  calculatePeriodDuration,
  timeToMinutes,
  minutesToTime,
} from "../../lib/periodUtils";
import { DEFAULT_PERIOD_TIMES } from "../../lib/storage";

export interface BreakEntryLike {
  label?: string;
  startTime?: string;
  endTime?: string;
  periodNumber?: number;
}

export interface BellTimesEditorProps {
  periodTimes: PeriodTime[];
  onChangePeriodTimes: (times: PeriodTime[]) => void;
  maxUsedPeriod?: number;
  breakEntries?: BreakEntryLike[];
  onConfirm?: () => void;
  confirmButtonText?: string; // Default: "Lanjut ke ringkasan"
  mode?: "wizard" | "settings";
}

const COMMON_HOURS = ["06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17"];
const COMMON_MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const PERIOD_DURATION_PRESETS = [35, 40, 45, 50, 60];

export function BellTimesEditor({
  periodTimes,
  onChangePeriodTimes,
  maxUsedPeriod,
  breakEntries,
  onConfirm,
  confirmButtonText = "Lanjut ke ringkasan",
  mode = "wizard",
}: BellTimesEditorProps) {
  // ─── Quick Setup Card State ───
  const [quickStartTime, setQuickStartTime] = useState<string>("07:00");
  const [quickDuration, setQuickDuration] = useState<number>(45);
  const [enableBreak1, setEnableBreak1] = useState<boolean>(true); // Istirahat 1 setelah jam 3 (15 mnt)
  const [enableBreak2, setEnableBreak2] = useState<boolean>(true); // Ishoma setelah jam 6 (45 mnt)
  const [quickSetupExpanded, setQuickSetupExpanded] = useState<boolean>(false);

  // ─── Progressive Disclosure State ───
  // If imported timetable used e.g. up to period 6, show 1..6 first, with toggle for rest
  const effectiveMaxUsed = maxUsedPeriod && maxUsedPeriod > 0 ? maxUsedPeriod : periodTimes.length;
  const hasExtraPeriods = effectiveMaxUsed < periodTimes.length;
  const [showAllPeriods, setShowAllPeriods] = useState<boolean>(!hasExtraPeriods);

  // ─── Friday Different Bell Times (Optional Toggle) ───
  const [enableFridaySchedule, setEnableFridaySchedule] = useState<boolean>(
    periodTimes.some((p) => p.weekday === 5)
  );
  const [activeDayTab, setActiveDayTab] = useState<"default" | "friday">("default");

  // Filter periods by active tab
  const currentPeriods = useMemo(() => {
    if (activeDayTab === "friday") {
      const fridayList = periodTimes.filter((p) => p.weekday === 5);
      if (fridayList.length > 0) return fridayList;
      // If Friday not yet initialized, return default periods cloned
      return periodTimes
        .filter((p) => !p.weekday)
        .map((p) => ({ ...p, weekday: 5 }));
    }
    return periodTimes.filter((p) => !p.weekday);
  }, [periodTimes, activeDayTab]);

  // ─── Interactive Time Picker Modal State ───
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<{
    periodNumber: number;
    field: "start" | "end";
    currentTime: string;
  } | null>(null);
  const [selectedHour, setSelectedHour] = useState<string>("07");
  const [selectedMinute, setSelectedMinute] = useState<string>("00");

  const openTimePicker = (periodNumber: number, field: "start" | "end", currentVal: string) => {
    const parts = (currentVal || "07:00").split(":");
    const h = parts[0] || "07";
    const m = parts[1] || "00";
    setSelectedHour(h.padStart(2, "0"));
    setSelectedMinute(m.padStart(2, "0"));
    setPickerTarget({ periodNumber, field, currentTime: currentVal });
    setPickerVisible(true);
  };

  const handleSavePickedTime = () => {
    if (!pickerTarget) return;
    const newTime = `${selectedHour}:${selectedMinute}`;
    handleTimeChange(pickerTarget.periodNumber, pickerTarget.field, newTime);
    setPickerVisible(false);
    setPickerTarget(null);
  };

  // ─── Time Change Handlers ───
  const handleTimeChange = (periodNumber: number, field: "start" | "end", value: string) => {
    const isFri = activeDayTab === "friday";
    const updated = periodTimes.map((p) => {
      const matchDay = isFri ? p.weekday === 5 : !p.weekday;
      if (p.periodNumber === periodNumber && matchDay) {
        return { ...p, [field]: value };
      }
      return p;
    });

    // If Friday tab and no Friday items existed yet in master list, insert them
    if (isFri && !periodTimes.some((p) => p.weekday === 5)) {
      const fridayClones = periodTimes
        .filter((p) => !p.weekday)
        .map((p) =>
          p.periodNumber === periodNumber
            ? { ...p, weekday: 5, [field]: value }
            : { ...p, weekday: 5 }
        );
      onChangePeriodTimes([...periodTimes.filter((p) => !p.weekday), ...fridayClones]);
    } else {
      onChangePeriodTimes(updated);
    }
  };

  // ─── Quick Setup Apply ───
  const handleApplyQuickSetup = () => {
    const generated = generateQuickSetupBellTimes({
      startTime: quickStartTime,
      periodDuration: quickDuration,
      numPeriods: Math.max(8, currentPeriods.length),
      break1After: enableBreak1 ? 3 : 0,
      break1Duration: 15,
      break2After: enableBreak2 ? 6 : 0,
      break2Duration: 45,
    });

    if (activeDayTab === "friday") {
      const withFri = generated.map((p) => ({ ...p, weekday: 5 }));
      const base = periodTimes.filter((p) => p.weekday !== 5);
      onChangePeriodTimes([...base, ...withFri]);
    } else {
      const fri = periodTimes.filter((p) => p.weekday === 5);
      onChangePeriodTimes([...generated, ...fri]);
    }

    setQuickSetupExpanded(false);
  };

  // ─── Reset Bell Schedule ───
  const handleResetToStandard = () => {
    Alert.alert(
      "Kembalikan Jam Standar",
      "Setel ulang seluruh jam pelajaran ke format standar nasional (07:00 - 14:00)?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Kembalikan",
          style: "destructive",
          onPress: () => {
            onChangePeriodTimes(DEFAULT_PERIOD_TIMES);
            setEnableFridaySchedule(false);
            setActiveDayTab("default");
          },
        },
      ]
    );
  };

  // ─── Add / Remove Period ───
  const handleAddPeriod = () => {
    const isFri = activeDayTab === "friday";
    const relevant = currentPeriods;
    const nextNum = relevant.length > 0 ? Math.max(...relevant.map((p) => p.periodNumber)) + 1 : 1;
    const lastPeriod = relevant[relevant.length - 1];

    let startStr = "14:00";
    let endStr = "14:45";
    if (lastPeriod) {
      const lastEndMins = timeToMinutes(lastPeriod.end);
      if (lastEndMins >= 0) {
        startStr = lastPeriod.end;
        endStr = minutesToTime(lastEndMins + 45);
      }
    }

    const newPeriod: PeriodTime = {
      periodNumber: nextNum,
      start: startStr,
      end: endStr,
      weekday: isFri ? 5 : undefined,
    };

    onChangePeriodTimes([...periodTimes, newPeriod]);
  };

  const handleRemovePeriod = (periodNumber: number) => {
    const isFri = activeDayTab === "friday";
    const filtered = periodTimes.filter((p) => {
      const matchDay = isFri ? p.weekday === 5 : !p.weekday;
      return !(p.periodNumber === periodNumber && matchDay);
    });

    // Re-index remaining relevant periods sequentially
    const relevantRemaining = filtered
      .filter((p) => (isFri ? p.weekday === 5 : !p.weekday))
      .sort((a, b) => a.periodNumber - b.periodNumber);

    const reindexedRelevant = relevantRemaining.map((p, idx) => ({
      ...p,
      periodNumber: idx + 1,
    }));

    const otherPeriods = filtered.filter((p) => (isFri ? p.weekday !== 5 : !!p.weekday));
    onChangePeriodTimes([...otherPeriods, ...reindexedRelevant]);
  };

  // ─── Validation & Gap Detection ───
  const validation = useMemo(() => {
    return validateBellSchedule(currentPeriods);
  }, [currentPeriods]);

  const periodGaps = useMemo(() => {
    return detectPeriodGaps(currentPeriods, breakEntries);
  }, [currentPeriods, breakEntries]);

  // Periods to render based on progressive disclosure
  const visiblePeriods = useMemo(() => {
    if (showAllPeriods || !hasExtraPeriods) {
      return currentPeriods;
    }
    return currentPeriods.filter((p) => p.periodNumber <= effectiveMaxUsed);
  }, [currentPeriods, showAllPeriods, hasExtraPeriods, effectiveMaxUsed]);

  return (
    <View style={styles.container}>
      {/* ─── Top Controls & Quick Setup Card ─── */}
      <View style={styles.quickCard}>
        <Pressable
          style={styles.quickCardHeader}
          onPress={() => setQuickSetupExpanded(!quickSetupExpanded)}
        >
          <View style={styles.quickCardTitleRow}>
            <View style={styles.quickIconBox}>
              <Ionicons name="flash-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickCardTitle}>Pengaturan Cepat Jam Pelajaran</Text>
              <Text style={styles.quickCardSub}>
                Mulai {quickStartTime} • {quickDuration} mnt/jam • 2 istirahat
              </Text>
            </View>
            <Ionicons
              name={quickSetupExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </View>
        </Pressable>

        {quickSetupExpanded && (
          <View style={styles.quickCardBody}>
            {/* Start Time & Duration Presets */}
            <View style={styles.quickRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.quickInputLabel}>JAM MULAI (JAM 1)</Text>
                <TextInput
                  style={styles.quickTextInput}
                  value={quickStartTime}
                  onChangeText={setQuickStartTime}
                  placeholder="07:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.quickInputLabel}>DURASI 1 JAM (JP)</Text>
                <View style={styles.durationPresetRow}>
                  {PERIOD_DURATION_PRESETS.map((dur) => (
                    <Pressable
                      key={dur}
                      style={[
                        styles.durPresetChip,
                        quickDuration === dur && styles.durPresetChipActive,
                      ]}
                      onPress={() => setQuickDuration(dur)}
                    >
                      <Text
                        style={[
                          styles.durPresetChipText,
                          quickDuration === dur && styles.durPresetChipTextActive,
                        ]}
                      >
                        {dur}m
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* Break Rules Toggles */}
            <Text style={[styles.quickInputLabel, { marginTop: spacing.sm }]}>ATURAN JEDA ISTIRAHAT</Text>
            <Pressable
              style={styles.breakToggleRow}
              onPress={() => setEnableBreak1(!enableBreak1)}
            >
              <Ionicons
                name={enableBreak1 ? "checkbox" : "square-outline"}
                size={18}
                color={enableBreak1 ? colors.primary : colors.textMuted}
              />
              <Text style={styles.breakToggleText}>
                Istirahat 1 setelah jam 3 (15 mnt)
              </Text>
            </Pressable>

            <Pressable
              style={styles.breakToggleRow}
              onPress={() => setEnableBreak2(!enableBreak2)}
            >
              <Ionicons
                name={enableBreak2 ? "checkbox" : "square-outline"}
                size={18}
                color={enableBreak2 ? colors.primary : colors.textMuted}
              />
              <Text style={styles.breakToggleText}>
                Istirahat 2 / Ishoma setelah jam 6 (45 mnt)
              </Text>
            </Pressable>

            {/* Terapkan Button */}
            <Pressable style={styles.applyQuickBtn} onPress={handleApplyQuickSetup}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.applyQuickBtnText}>Terapkan Jam ke Semua Baris</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ─── Optional: Friday Schedule Toggle ─── */}
      <View style={styles.fridayToggleCard}>
        <Pressable
          style={styles.fridayRow}
          onPress={() => {
            const next = !enableFridaySchedule;
            setEnableFridaySchedule(next);
            if (!next) setActiveDayTab("default");
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.fridayTitle}>Jam berbeda di hari tertentu</Text>
            <Text style={styles.fridaySub}>
              Aktifkan jika sekolah memiliki jam pulang lebih awal di hari Jumat
            </Text>
          </View>
          <Ionicons
            name={enableFridaySchedule ? "toggle" : "toggle-outline"}
            size={28}
            color={enableFridaySchedule ? colors.primary : colors.textMuted}
          />
        </Pressable>

        {enableFridaySchedule && (
          <View style={styles.dayTabRow}>
            <Pressable
              style={[styles.dayTabChip, activeDayTab === "default" && styles.dayTabChipActive]}
              onPress={() => setActiveDayTab("default")}
            >
              <Text style={[styles.dayTabChipText, activeDayTab === "default" && styles.dayTabChipTextActive]}>
                Senin – Kamis
              </Text>
            </Pressable>
            <Pressable
              style={[styles.dayTabChip, activeDayTab === "friday" && styles.dayTabChipActive]}
              onPress={() => setActiveDayTab("friday")}
            >
              <Text style={[styles.dayTabChipText, activeDayTab === "friday" && styles.dayTabChipTextActive]}>
                Jumat (Khusus)
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ─── Period Rows List ─── */}
      <View style={styles.periodCardContainer}>
        {visiblePeriods.map((period) => {
          const fieldErr = validation.errors[period.periodNumber];
          const hasError = !!(fieldErr?.startError || fieldErr?.endError || fieldErr?.generalError);
          const duration = calculatePeriodDuration(period.start, period.end);
          const durationStr = duration > 0 ? `${duration} mnt` : "-";

          // Find if there is a gap after this period
          const gap = periodGaps.find((g) => g.afterPeriodNumber === period.periodNumber);

          return (
            <React.Fragment key={`${activeDayTab}-${period.periodNumber}`}>
              <View style={[styles.bellRow, hasError && styles.bellRowError]}>
                {/* Period Badge (Strictly "Jam X") */}
                <View style={styles.periodBadge}>
                  <Text style={styles.periodBadgeText}>{formatPeriodLabel(period.periodNumber)}</Text>
                </View>

                {/* 48dp Time Fields Opening Picker */}
                <View style={styles.timeInputsWrapper}>
                  {/* Start Time Field */}
                  <Pressable
                    style={[
                      styles.timeTouchField,
                      fieldErr?.startError && styles.timeTouchFieldError,
                    ]}
                    onPress={() => openTimePicker(period.periodNumber, "start", period.start)}
                    accessibilityLabel={`Jam mulai ${formatPeriodLabel(period.periodNumber)}`}
                  >
                    <Text style={[styles.timeTouchText, fieldErr?.startError && styles.timeTouchTextError]}>
                      {period.start || "--:--"}
                    </Text>
                  </Pressable>

                  <Text style={styles.timeDashSep}>–</Text>

                  {/* End Time Field */}
                  <Pressable
                    style={[
                      styles.timeTouchField,
                      fieldErr?.endError && styles.timeTouchFieldError,
                    ]}
                    onPress={() => openTimePicker(period.periodNumber, "end", period.end)}
                    accessibilityLabel={`Jam selesai ${formatPeriodLabel(period.periodNumber)}`}
                  >
                    <Text style={[styles.timeTouchText, fieldErr?.endError && styles.timeTouchTextError]}>
                      {period.end || "--:--"}
                    </Text>
                  </Pressable>
                </View>

                {/* Duration Badge ("45 mnt") */}
                <View style={[styles.durationBadge, hasError && styles.durationBadgeError]}>
                  <Text style={[styles.durationBadgeText, hasError && styles.durationBadgeTextError]}>
                    {durationStr}
                  </Text>
                </View>

                {/* Delete Period Button */}
                {currentPeriods.length > 1 && (
                  <Pressable
                    style={styles.deletePeriodBtn}
                    onPress={() => handleRemovePeriod(period.periodNumber)}
                    hitSlop={8}
                    accessibilityLabel={`Hapus ${formatPeriodLabel(period.periodNumber)}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {/* Validation Error Message */}
              {hasError && (
                <View style={styles.errorNoticeBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                  <Text style={styles.errorNoticeText}>
                    {fieldErr?.startError || fieldErr?.endError || "Jam tidak valid"}
                  </Text>
                </View>
              )}

              {/* Thin Gray Gap Row ("Istirahat - 15 mnt" / "Ishoma - 45 mnt") */}
              {gap && (
                <View style={styles.gapRow}>
                  <View style={styles.gapLine} />
                  <View style={styles.gapBadge}>
                    <Ionicons name="cafe-outline" size={12} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.gapText}>{gap.label}</Text>
                  </View>
                  <View style={styles.gapLine} />
                </View>
              )}
            </React.Fragment>
          );
        })}

        {/* ─── Progressive Disclosure Button ("Tampilkan jam lain") ─── */}
        {hasExtraPeriods && !showAllPeriods && (
          <Pressable
            style={styles.showMorePeriodsBtn}
            onPress={() => setShowAllPeriods(true)}
          >
            <Ionicons name="chevron-down" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.showMorePeriodsText}>
              Tampilkan jam lain ({currentPeriods.length - effectiveMaxUsed} jam tersisa)
            </Text>
          </Pressable>
        )}
      </View>

      {/* ─── Add Period & Reset Buttons ─── */}
      <View style={styles.actionsFooterRow}>
        <Pressable style={styles.addPeriodBtn} onPress={handleAddPeriod}>
          <Ionicons name="add" size={18} color={colors.primary} style={{ marginRight: 2 }} />
          <Text style={styles.addPeriodBtnText}>Tambah Jam Pelajaran</Text>
        </Pressable>

        <Pressable style={styles.resetStandardBtn} onPress={handleResetToStandard}>
          <Ionicons name="refresh-outline" size={16} color={colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.resetStandardBtnText}>Kembalikan jam standar</Text>
        </Pressable>
      </View>

      {/* ─── Wizard Primary Continue Button (Disabled if Invalid) ─── */}
      {mode === "wizard" && onConfirm && (
        <View style={styles.wizardSubmitContainer}>
          {!validation.isValid && (
            <View style={styles.validationWarningBanner}>
              <Ionicons name="warning-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.validationWarningText}>
                Perbaiki jam yang bertabrakan atau tidak valid sebelum melanjutkan.
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.confirmSummaryBtn,
              !validation.isValid && styles.confirmSummaryBtnDisabled,
            ]}
            onPress={validation.isValid ? onConfirm : undefined}
            accessibilityState={{ disabled: !validation.isValid }}
          >
            <Text style={styles.confirmSummaryBtnText}>{confirmButtonText} →</Text>
          </Pressable>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* 48DP TIME PICKER MODAL (HOUR & MINUTE SELECTOR)          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                Pilih Waktu (
                {pickerTarget?.field === "start" ? "Jam Mulai" : "Jam Selesai"} Jam{" "}
                {pickerTarget?.periodNumber})
              </Text>
              <Pressable
                onPress={() => setPickerVisible(false)}
                hitSlop={12}
                accessibilityLabel="Tutup"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Time Preview Display */}
            <View style={styles.pickerTimeDisplay}>
              <Text style={styles.pickerTimeBigText}>
                {selectedHour}:{selectedMinute}
              </Text>
            </View>

            {/* Hours Selector */}
            <Text style={styles.pickerSectionLabel}>JAM</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerChipsScroll}
            >
              {COMMON_HOURS.map((h) => (
                <Pressable
                  key={h}
                  style={[
                    styles.pickerChip,
                    selectedHour === h && styles.pickerChipSelected,
                  ]}
                  onPress={() => setSelectedHour(h)}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      selectedHour === h && styles.pickerChipTextSelected,
                    ]}
                  >
                    {h}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Minutes Selector */}
            <Text style={[styles.pickerSectionLabel, { marginTop: spacing.md }]}>MENIT</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pickerChipsScroll}
            >
              {COMMON_MINUTES.map((m) => (
                <Pressable
                  key={m}
                  style={[
                    styles.pickerChip,
                    selectedMinute === m && styles.pickerChipSelected,
                  ]}
                  onPress={() => setSelectedMinute(m)}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      selectedMinute === m && styles.pickerChipTextSelected,
                    ]}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.pickerModalActions}>
              <Pressable
                style={styles.pickerCancelBtn}
                onPress={() => setPickerVisible(false)}
              >
                <Text style={styles.pickerCancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={styles.pickerSaveBtn}
                onPress={handleSavePickedTime}
              >
                <Text style={styles.pickerSaveBtnText}>Pilih Waktu</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: spacing.xxl,
  },

  // ─── Quick Setup Card ───
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  quickCardHeader: {
    padding: spacing.md,
  },
  quickCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  quickIconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  quickCardTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  quickCardSub: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  quickCardBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.md,
  },
  quickRow: {
    flexDirection: "column",
    gap: spacing.sm,
  },
  quickInputLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickTextInput: {
    height: 44,
    maxWidth: 160,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  durationPresetRow: {
    flexDirection: "row",
    gap: 4,
  },
  durPresetChip: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  durPresetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  durPresetChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  durPresetChipTextActive: {
    color: colors.primary,
  },
  breakToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  breakToggleText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
  },
  applyQuickBtn: {
    marginTop: spacing.md,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  applyQuickBtnText: {
    color: "#ffffff",
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },

  // ─── Friday Schedule Toggle ───
  fridayToggleCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fridayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fridayTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  fridaySub: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    marginTop: 2,
    paddingRight: spacing.sm,
  },
  dayTabRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  dayTabChip: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  dayTabChipTextActive: {
    color: "#ffffff",
  },

  // ─── Period Card List ───
  periodCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bellRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  bellRowError: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: radius.sm,
    paddingHorizontal: 4,
  },
  periodBadge: {
    minWidth: 58,
    height: 36,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  periodBadgeText: {
    color: colors.text,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  timeInputsWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTouchField: {
    flex: 1,
    height: 48, // Minimum 48dp touch target
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  timeTouchFieldError: {
    borderColor: colors.danger,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  timeTouchText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  timeTouchTextError: {
    color: colors.danger,
  },
  timeDashSep: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  durationBadge: {
    minWidth: 54,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  durationBadgeError: {
    borderColor: colors.danger,
  },
  durationBadgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  durationBadgeTextError: {
    color: colors.danger,
  },
  deletePeriodBtn: {
    width: 36,
    height: 48, // 48dp touch target
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Error Notice ───
  errorNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: radius.xs,
    marginBottom: 6,
  },
  errorNoticeText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },

  // ─── Thin Gray Gap / Break Row ───
  gapRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    paddingHorizontal: spacing.xs,
  },
  gapLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  gapBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  gapText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },

  // ─── Progressive Disclosure Button ───
  showMorePeriodsBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  showMorePeriodsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },

  // ─── Actions Footer Row ───
  actionsFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  addPeriodBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.sm,
  },
  addPeriodBtnText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: "600",
    marginLeft: 4,
  },
  resetStandardBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.sm,
  },
  resetStandardBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },

  // ─── Wizard Primary Continue ───
  wizardSubmitContainer: {
    marginTop: spacing.md,
  },
  validationWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  validationWarningText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: "500",
    flex: 1,
  },
  confirmSummaryBtn: {
    height: 52, // Generous 52dp primary action
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmSummaryBtnDisabled: {
    backgroundColor: colors.surfaceSubtle,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmSummaryBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  // ─── Time Picker Modal ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  pickerModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  pickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  pickerModalTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  pickerTimeDisplay: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pickerTimeBigText: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 2,
  },
  pickerSectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  pickerChipsScroll: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  pickerChip: {
    minWidth: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerChipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  pickerChipTextSelected: {
    color: "#ffffff",
  },
  pickerModalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pickerCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pickerCancelBtnText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
  pickerSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerSaveBtnText: {
    color: "#ffffff",
    fontSize: typography.sizes.md,
    fontWeight: "600",
  },
});
