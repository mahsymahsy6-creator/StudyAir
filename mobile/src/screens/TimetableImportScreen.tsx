/**
 * StudyAir Mobile — Timetable Import & Period Configuration Screen (Phase 5)
 * 
 * Supports 4 Import Channels:
 * 1. Photo Scan (fast Gemini AI OCR pipeline with stage progress & cancel)
 * 2. Weekly Grid (interactive 7-day x 8-period matrix)
 * 3. Paste Structured Text (multiline schedule parser)
 * 4. CSV / Sheets (tab-delimited or comma-delimited list & matrix parser)
 * 
 * Shared Interactive Review Table:
 * - Confidence < 0.7 or unmatched subjects flagged in amber
 * - Tap to edit day, period, teacher, room, or pick/create subject
 * - Configure school bell schedule once ("Jam ke-1: 07:00 - 07:45")
 * - Conflict resolution modal ("Replace existing" vs "Merge with current schedule")
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography } from "../theme";
import { useMobileStudyStore } from "../store";
import { t } from "../lib/i18n";
import { Subject, PeriodTime } from "../types";
import { extractTimetableFromAI } from "../services/aiService";
import {
  WEEKDAYS_META,
  TimetableReviewItem,
  getWeekdayShort,
  normalizeWeekday,
  parseStructuredTextTimetable,
  parseCsvTimetable,
  resolveReviewItemsToTimetable,
  matchSubjectCandidate,
} from "../lib/timetableParser";

interface TimetableImportScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

type ChannelTab = "photo" | "grid" | "text" | "csv";

export function TimetableImportScreen({ navigation }: TimetableImportScreenProps) {
  const {
    subjects,
    addSubject,
    periodTimes,
    setPeriodTimes,
    timetableEntries,
    importTimetable,
    geminiApiKey,
  } = useMobileStudyStore();

  const [activeTab, setActiveTab] = useState<ChannelTab>("photo");

  // ─── Shared Review Table State ───
  const [reviewItems, setReviewItems] = useState<TimetableReviewItem[]>([]);
  const [editingItem, setEditingItem] = useState<TimetableReviewItem | null>(null);
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);

  // ─── Bell Schedule Modal State ───
  const [bellModalVisible, setBellModalVisible] = useState(false);
  const [editablePeriods, setEditablePeriods] = useState<PeriodTime[]>(periodTimes);

  // ─── Conflict Resolution Modal State ───
  const [conflictModalVisible, setConflictModalVisible] = useState(false);

  // ─── Channel 1: Photo Scan State ───
  const [scanState, setScanState] = useState<"idle" | "scanning" | "completed">("idle");
  const [scanStage, setScanStage] = useState<"preparing" | "reading" | "checking">("preparing");
  const abortControllerRef = useRef<AbortController | null>(null);
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  // ─── Channel 2: Weekly Grid State ───
  const [selectedGridDay, setSelectedGridDay] = useState<number>(1); // 1 = Senin

  // ─── Channel 3: Paste Text State ───
  const [pastedText, setPastedText] = useState("");

  // ─── Channel 4: CSV Import State ───
  const [csvText, setCsvText] = useState("");

  // ─── Inline Create Subject State ───
  const [createSubjectModalVisible, setCreateSubjectModalVisible] = useState(false);
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjColor, setNewSubjColor] = useState("#3A86FF");
  const [newSubjTeacher, setNewSubjTeacher] = useState("");
  const [newSubjRoom, setNewSubjRoom] = useState("");

  const PALETTE = ["#3A86FF", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

  // Update editable periods when store updates
  useEffect(() => {
    setEditablePeriods(periodTimes);
  }, [periodTimes]);

  // Shimmer animation during AI scanning
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (scanState === "scanning") {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 0.85,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0.35,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    }
    return () => loop?.stop();
  }, [scanState, shimmerAnim]);

  // ─── Channel 1: Photo Scan Actions ───
  const handleLaunchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera Permission", "Camera permission is required to photograph your timetable.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      startAIScan(result.assets[0].base64 || "");
    }
  };

  const handleLaunchGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      startAIScan(result.assets[0].base64 || "");
    }
  };

  const startAIScan = async (base64: string) => {
    setScanState("scanning");
    setScanStage("preparing");
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setTimeout(() => {
      if (scanState === "scanning") setScanStage("reading");
    }, 700);

    setTimeout(() => {
      if (scanState === "scanning") setScanStage("checking");
    }, 2800);

    try {
      const res = await extractTimetableFromAI(
        {
          imageBase64: base64,
          mimeType: "image/jpeg",
          signal: controller.signal,
        },
        geminiApiKey
      );

      // Convert raw entries to review items
      const items: TimetableReviewItem[] = res.entries.map((raw, idx) => {
        const day = normalizeWeekday(raw.rawDay);
        const periodNumber = Math.min(Math.max(1, Number(raw.rawPeriod) || 1), 10);
        const matched = matchSubjectCandidate(raw.rawSubject, subjects);

        return {
          id: `rev-scan-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          day,
          periodNumber,
          rawSubject: raw.rawSubject,
          subjectId: matched.subjectId,
          matchedSubjectName: matched.canonicalName,
          matchedSubjectColor: matched.color,
          isNewSubject: matched.isNewSubject,
          confidence: matched.confidence,
          teacher: raw.rawTeacher,
          room: raw.rawRoom,
        };
      });

      setReviewItems(items);
      setScanState("completed");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setScanState("idle");
        return;
      }
      console.warn("[TimetableScan] Error:", err);
      Alert.alert("Scan Failed", t("scanFailed"));
      setScanState("idle");
    }
  };

  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setScanState("idle");
  };

  // ─── Channel 2: Weekly Grid Helpers ───
  const gridDayItems = useMemo(() => {
    return reviewItems.filter((i) => i.day === selectedGridDay);
  }, [reviewItems, selectedGridDay]);

  const handleOpenGridCell = (periodNum: number) => {
    const existing = gridDayItems.find((i) => i.periodNumber === periodNum);
    if (existing) {
      setEditingItem(existing);
    } else {
      const newItem: TimetableReviewItem = {
        id: `rev-grid-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        day: selectedGridDay,
        periodNumber: periodNum,
        rawSubject: "",
        matchedSubjectName: "",
        matchedSubjectColor: "#3A86FF",
        isNewSubject: false,
        confidence: 1.0,
      };
      setEditingItem(newItem);
    }
    setSubjectPickerVisible(true);
  };

  const handleAssignSubjectToGrid = (subject: Subject) => {
    if (!editingItem) return;

    setReviewItems((prev) => {
      const filtered = prev.filter(
        (i) => !(i.day === editingItem.day && i.periodNumber === editingItem.periodNumber)
      );
      const updated: TimetableReviewItem = {
        ...editingItem,
        subjectId: subject.id,
        rawSubject: subject.name,
        matchedSubjectName: subject.name,
        matchedSubjectColor: subject.color,
        isNewSubject: false,
        confidence: 1.0,
      };
      return [...filtered, updated];
    });

    setSubjectPickerVisible(false);
    setEditingItem(null);
  };

  const handleClearGridSlot = (day: number, periodNum: number) => {
    setReviewItems((prev) =>
      prev.filter((i) => !(i.day === day && i.periodNumber === periodNum))
    );
    setSubjectPickerVisible(false);
    setEditingItem(null);
  };

  // ─── Channel 3: Parse Structured Text ───
  const handleParseText = () => {
    if (!pastedText.trim()) {
      Alert.alert("Input Required", "Please enter or paste your schedule lines first.");
      return;
    }
    const res = parseStructuredTextTimetable(pastedText, subjects);
    if (res.items.length === 0) {
      Alert.alert("No Classes Detected", "Could not parse any classes. Please check the format.");
      return;
    }
    setReviewItems(res.items);
    Alert.alert(
      "Parsing Complete",
      `Detected ${res.items.length} classes! Review and adjust them below.`
    );
  };

  const handleLoadSampleText = () => {
    setPastedText(
      `=== SENIN ===
1 MTK
2 Fisika R.Lab Pak Joko
3 Bahasa Indonesia

=== SELASA ===
1-2 Bahasa Inggris
3 Kimia

=== RABU ===
1 PJOK
2-3 Biologi`
    );
  };

  // ─── Channel 4: Parse CSV ───
  const handleParseCsv = () => {
    if (!csvText.trim()) {
      Alert.alert("Input Required", "Please paste CSV or spreadsheet text first.");
      return;
    }
    const res = parseCsvTimetable(csvText, subjects);
    if (res.items.length === 0) {
      Alert.alert("No Classes Detected", "Could not parse any classes. Check delimiter or headers.");
      return;
    }
    setReviewItems(res.items);
    Alert.alert(
      "CSV Parsed",
      `Extracted ${res.items.length} classes from table! Review below.`
    );
  };

  const handleLoadSampleCsv = () => {
    setCsvText(
      `Period\tSenin\tSelasa\tRabu\tKamis\tJumat
1\tMTK\tFisika\tKimia\tB.Indo\tAgama
2\tMTK\tFisika\tKimia\tB.Indo\tAgama
3\tB.Inggris\tBiologi\tSejarah\tPJOK\tPKn
4\tB.Inggris\tBiologi\tSeni Budaya\tPJOK\tTIK`
    );
  };

  // ─── Review Table Operations ───
  const handleDeleteReviewItem = (id: string) => {
    setReviewItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddNewSlot = () => {
    const newItem: TimetableReviewItem = {
      id: `rev-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day: 1,
      periodNumber: 1,
      rawSubject: subjects[0]?.name || "Matematika",
      subjectId: subjects[0]?.id,
      matchedSubjectName: subjects[0]?.name || "Matematika",
      matchedSubjectColor: subjects[0]?.color || "#3A86FF",
      isNewSubject: false,
      confidence: 1.0,
    };
    setReviewItems((prev) => [...prev, newItem]);
  };

  // ─── Saving & Conflict Resolution ───
  const handleInitiateSave = () => {
    if (reviewItems.length === 0) {
      Alert.alert("Empty Timetable", t("noEntriesYet"));
      return;
    }

    if (timetableEntries.length > 0) {
      setConflictModalVisible(true);
    } else {
      executeSave("replace");
    }
  };

  const executeSave = (mode: "replace" | "merge") => {
    setConflictModalVisible(false);

    // 1. Resolve review items to database entries and create any new subjects
    const { entries, newSubjects } = resolveReviewItemsToTimetable(reviewItems, subjects);

    // 2. Add newly created subjects to store
    for (const newSubj of newSubjects) {
      addSubject({
        name: newSubj.name,
        color: newSubj.color,
        aliases: newSubj.aliases,
        teacher: newSubj.teacher,
        room: newSubj.room,
        bringItems: newSubj.bringItems,
      });
    }

    // 3. Import into store with conflict resolution mode
    importTimetable(entries, mode);

    Alert.alert(
      "Success",
      t("timetableSavedSuccess"),
      [
        {
          text: "OK",
          onPress: () => navigation.navigate("Calendar"),
        },
      ]
    );
  };

  // ─── Bell Schedule Setup Actions ───
  const handleSaveBellSchedule = () => {
    setPeriodTimes(editablePeriods);
    setBellModalVisible(false);
    Alert.alert("Success", t("bellSavedSuccess"));
  };

  const handleResetBellSchedule = () => {
    const standard: PeriodTime[] = [
      { periodNumber: 1, start: "07:00", end: "07:45" },
      { periodNumber: 2, start: "07:45", end: "08:30" },
      { periodNumber: 3, start: "08:30", end: "09:15" },
      { periodNumber: 4, start: "09:30", end: "10:15" },
      { periodNumber: 5, start: "10:15", end: "11:00" },
      { periodNumber: 6, start: "11:00", end: "11:45" },
      { periodNumber: 7, start: "12:30", end: "13:15" },
      { periodNumber: 8, start: "13:15", end: "14:00" },
    ];
    setEditablePeriods(standard);
  };

  // ─── Inline Create Subject ───
  const handleCreateNewSubject = () => {
    if (!newSubjName.trim()) {
      Alert.alert("Validation", t("errorTitleRequired"));
      return;
    }
    const created = addSubject({
      name: newSubjName.trim(),
      color: newSubjColor,
      teacher: newSubjTeacher.trim() || undefined,
      room: newSubjRoom.trim() || undefined,
    });

    if (editingItem) {
      handleAssignSubjectToGrid(created);
    }

    setCreateSubjectModalVisible(false);
    setNewSubjName("");
    setNewSubjTeacher("");
    setNewSubjRoom("");
  };

  const unverifiedCount = useMemo(() => {
    return reviewItems.filter((i) => i.confidence < 0.7 || i.isNewSubject).length;
  }, [reviewItems]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Top Header & Controls ─── */}
        <View style={styles.header}>
          <View style={styles.headerTitleCluster}>
            <Text style={styles.headerTitle}>{t("timetableImportTitle")}</Text>
            <Text style={styles.headerSubtitle}>{t("timetableImportSubtitle")}</Text>
          </View>

          {/* Bell Schedule Setup Button */}
          <Pressable
            style={styles.bellScheduleBtn}
            onPress={() => setBellModalVisible(true)}
            hitSlop={8}
          >
            <Ionicons name="time-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.bellScheduleBtnText}>{t("bellScheduleBtn")}</Text>
          </Pressable>
        </View>

        {/* ─── Four Channel Segment Tabs ─── */}
        <View style={styles.channelTabs}>
          <Pressable
            style={[styles.channelTab, activeTab === "photo" && styles.channelTabActive]}
            onPress={() => setActiveTab("photo")}
          >
            <Ionicons
              name="camera-outline"
              size={17}
              color={activeTab === "photo" ? "#ffffff" : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.channelTabText, activeTab === "photo" && styles.channelTabTextActive]}>
              {t("tabPhotoScan")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.channelTab, activeTab === "grid" && styles.channelTabActive]}
            onPress={() => setActiveTab("grid")}
          >
            <Ionicons
              name="grid-outline"
              size={17}
              color={activeTab === "grid" ? "#ffffff" : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.channelTabText, activeTab === "grid" && styles.channelTabTextActive]}>
              {t("tabManualGrid")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.channelTab, activeTab === "text" && styles.channelTabActive]}
            onPress={() => setActiveTab("text")}
          >
            <Ionicons
              name="document-text-outline"
              size={17}
              color={activeTab === "text" ? "#ffffff" : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.channelTabText, activeTab === "text" && styles.channelTabTextActive]}>
              {t("tabPasteText")}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.channelTab, activeTab === "csv" && styles.channelTabActive]}
            onPress={() => setActiveTab("csv")}
          >
            <Ionicons
              name="stats-chart-outline"
              size={17}
              color={activeTab === "csv" ? "#ffffff" : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.channelTabText, activeTab === "csv" && styles.channelTabTextActive]}>
              {t("tabCsvImport")}
            </Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* ═══════════════════════════════════════════════════════ */}
          {/* CHANNEL 1: PHOTO SCAN                                  */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeTab === "photo" && (
            <View style={styles.channelCard}>
              <View style={styles.channelCardHeader}>
                <Ionicons name="camera" size={20} color={colors.accent} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelCardTitle}>{t("scanPhotoTitle")}</Text>
                  <Text style={styles.channelCardSubtitle}>{t("scanPhotoSubtitle")}</Text>
                </View>
              </View>

              {scanState === "scanning" ? (
                <View style={styles.scanningBox}>
                  <Animated.View style={[styles.scanningShimmer, { opacity: shimmerAnim }]} />
                  <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 12 }} />
                  <Text style={styles.scanningTitle}>{t("scanningInProgress")}</Text>
                  <Text style={styles.scanningStageText}>
                    {scanStage === "preparing" && "1/3 Optimizing image & dictionary..."}
                    {scanStage === "reading" && "2/3 Reading subjects and periods..."}
                    {scanStage === "checking" && "3/3 Validating Indonesian subject catalog..."}
                  </Text>
                  <Pressable style={styles.cancelScanBtn} onPress={handleCancelScan}>
                    <Text style={styles.cancelScanBtnText}>{t("cancel")}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.photoActionsRow}>
                  <Pressable style={styles.photoActionBtn} onPress={handleLaunchCamera}>
                    <Ionicons name="camera" size={24} color={colors.primary} />
                    <Text style={styles.photoActionText}>{t("takePhoto")}</Text>
                  </Pressable>

                  <Pressable style={styles.photoActionBtn} onPress={handleLaunchGallery}>
                    <Ionicons name="images" size={24} color={colors.emerald} />
                    <Text style={styles.photoActionText}>{t("chooseGallery")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CHANNEL 2: WEEKLY GRID                                 */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeTab === "grid" && (
            <View style={styles.channelCard}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gridDayStrip}
                contentContainerStyle={{ paddingHorizontal: spacing.sm, gap: 8 }}
              >
                {WEEKDAYS_META.map((meta) => {
                  const isSelected = selectedGridDay === meta.day;
                  const dayClassCount = reviewItems.filter((i) => i.day === meta.day).length;

                  return (
                    <Pressable
                      key={meta.day}
                      style={[styles.gridDayPill, isSelected && styles.gridDayPillActive]}
                      onPress={() => setSelectedGridDay(meta.day)}
                    >
                      <Text style={[styles.gridDayPillText, isSelected && styles.gridDayPillTextActive]}>
                        {meta.nameId}
                      </Text>
                      {dayClassCount > 0 && (
                        <View style={[styles.dayCountBadge, isSelected && styles.dayCountBadgeActive]}>
                          <Text style={styles.dayCountBadgeText}>{dayClassCount}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.gridPeriodList}>
                {editablePeriods.map((period) => {
                  const assigned = gridDayItems.find((i) => i.periodNumber === period.periodNumber);

                  return (
                    <Pressable
                      key={period.periodNumber}
                      style={[
                        styles.gridPeriodRow,
                        assigned && { borderLeftColor: assigned.matchedSubjectColor, borderLeftWidth: 4 },
                      ]}
                      onPress={() => handleOpenGridCell(period.periodNumber)}
                    >
                      <View style={styles.gridPeriodInfo}>
                        <Text style={styles.gridPeriodNum}>
                          Jam {period.periodNumber}
                        </Text>
                        <Text style={styles.gridPeriodTime}>
                          {period.start} - {period.end}
                        </Text>
                      </View>

                      <View style={styles.gridSubjectBox}>
                        {assigned ? (
                          <View style={styles.gridSubjectAssigned}>
                            <View
                              style={[
                                styles.colorIndicatorDot,
                                { backgroundColor: assigned.matchedSubjectColor },
                              ]}
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.gridSubjectTitle} numberOfLines={1}>
                                {assigned.matchedSubjectName}
                              </Text>
                              {(assigned.teacher || assigned.room) && (
                                <Text style={styles.gridSubjectSub}>
                                  {[assigned.room, assigned.teacher].filter(Boolean).join(" • ")}
                                </Text>
                              )}
                            </View>
                            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                          </View>
                        ) : (
                          <View style={styles.gridSubjectEmpty}>
                            <Ionicons name="add" size={16} color={colors.textMuted} style={{ marginRight: 4 }} />
                            <Text style={styles.gridSubjectEmptyText}>{t("gridEmptySlot")}</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CHANNEL 3: PASTE TEXT                                  */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeTab === "text" && (
            <View style={styles.channelCard}>
              <View style={styles.channelCardHeader}>
                <Ionicons name="document-text" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelCardTitle}>{t("pasteTextTitle")}</Text>
                </View>
                <Pressable onPress={handleLoadSampleText} hitSlop={8}>
                  <Text style={styles.sampleActionLink}>{t("loadSampleText")}</Text>
                </Pressable>
              </View>

              <TextInput
                style={styles.textInputArea}
                placeholder={t("pasteTextHint")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={7}
                value={pastedText}
                onChangeText={setPastedText}
              />

              <Pressable style={styles.actionPrimaryBtn} onPress={handleParseText}>
                <Ionicons name="sparkles" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.actionPrimaryBtnText}>{t("parseTextBtn")}</Text>
              </Pressable>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CHANNEL 4: CSV / SHEETS                                */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeTab === "csv" && (
            <View style={styles.channelCard}>
              <View style={styles.channelCardHeader}>
                <Ionicons name="stats-chart" size={20} color={colors.emerald} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelCardTitle}>{t("csvTitle")}</Text>
                  <Text style={styles.channelCardSubtitle}>{t("csvFormatHint")}</Text>
                </View>
                <Pressable onPress={handleLoadSampleCsv} hitSlop={8}>
                  <Text style={styles.sampleActionLink}>{t("loadSampleCsv")}</Text>
                </Pressable>
              </View>

              <TextInput
                style={styles.textInputArea}
                placeholder={t("csvHint")}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={7}
                value={csvText}
                onChangeText={setCsvText}
              />

              <Pressable style={styles.actionPrimaryBtn} onPress={handleParseCsv}>
                <Ionicons name="sync-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.actionPrimaryBtnText}>{t("parseCsvBtn")}</Text>
              </Pressable>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* SHARED INTERACTIVE REVIEW TABLE                         */}
          {/* ═══════════════════════════════════════════════════════ */}
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <View>
                <Text style={styles.reviewTitle}>{t("reviewTitle")}</Text>
                <Text style={styles.reviewSubtitle}>
                  {reviewItems.length} {reviewItems.length === 1 ? "class" : "classes"} ready
                  {unverifiedCount > 0 && ` • ⚠️ ${unverifiedCount} need verification`}
                </Text>
              </View>
              <Pressable style={styles.addSlotBtn} onPress={handleAddNewSlot} hitSlop={8}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addSlotBtnText}>{t("addPeriodBtn")}</Text>
              </Pressable>
            </View>

            {reviewItems.length === 0 ? (
              <View style={styles.emptyReviewBox}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.emptyReviewText}>{t("noEntriesYet")}</Text>
              </View>
            ) : (
              <View style={styles.reviewTable}>
                {reviewItems
                  .slice()
                  .sort((a, b) => (a.day !== b.day ? a.day - b.day : a.periodNumber - b.periodNumber))
                  .map((item) => {
                    const isUnverified = item.confidence < 0.7 || item.isNewSubject;
                    const periodTimeInfo = periodTimes.find((p) => p.periodNumber === item.periodNumber);

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.reviewRow,
                          isUnverified && styles.reviewRowWarning,
                        ]}
                      >
                        {/* Day & Period Pickers */}
                        <View style={styles.rowDayPeriodColumn}>
                          <Pressable
                            style={styles.dayBadgeBtn}
                            onPress={() => {
                              setEditingItem(item);
                              setDayPickerVisible(true);
                            }}
                          >
                            <Text style={styles.dayBadgeText}>
                              {getWeekdayShort(item.day)}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                          </Pressable>

                          <Pressable
                            style={styles.periodBadgeBtn}
                            onPress={() => {
                              setEditingItem(item);
                              setPeriodPickerVisible(true);
                            }}
                          >
                            <Text style={styles.periodBadgeText}>
                              J{item.periodNumber}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                          </Pressable>
                        </View>

                        {/* Subject & Details */}
                        <Pressable
                          style={styles.rowSubjectColumn}
                          onPress={() => {
                            setEditingItem(item);
                            setSubjectPickerVisible(true);
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View
                              style={[
                                styles.colorIndicatorDot,
                                { backgroundColor: item.matchedSubjectColor },
                              ]}
                            />
                            <Text style={styles.rowSubjectName} numberOfLines={1}>
                              {item.matchedSubjectName}
                            </Text>
                          </View>

                          <View style={styles.rowSubDetails}>
                            {periodTimeInfo && (
                              <Text style={styles.rowTimeText}>
                                {periodTimeInfo.start}-{periodTimeInfo.end}
                              </Text>
                            )}
                            {(item.room || item.teacher) && (
                              <Text style={styles.rowRoomTeacher} numberOfLines={1}>
                                • {[item.room, item.teacher].filter(Boolean).join(" ")}
                              </Text>
                            )}
                          </View>
                        </Pressable>

                        {/* Warning Flag or Actions */}
                        <View style={styles.rowActionsColumn}>
                          {isUnverified && (
                            <View style={styles.unverifiedPill}>
                              <Text style={styles.unverifiedPillText}>{t("unmatchedWarning")}</Text>
                            </View>
                          )}
                          <Pressable
                            style={styles.rowDeleteBtn}
                            onPress={() => handleDeleteReviewItem(item.id)}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.rose} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}

            {/* Bottom Save Action Button */}
            {reviewItems.length > 0 && (
              <Pressable style={styles.saveTimetableMainBtn} onPress={handleInitiateSave}>
                <Ionicons name="checkmark-done" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.saveTimetableMainBtnText}>
                  {t("saveTimetableBtn")} ({reviewItems.length})
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODAL 1: SUBJECT PICKER                                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Modal
          visible={subjectPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSubjectPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSubjectPickerVisible(false)} />
            <View style={styles.pickerModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("gridSelectSubject")}</Text>
                <Pressable onPress={() => setSubjectPickerVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 320 }}>
                {subjects.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.pickerSubjectRow}
                    onPress={() => handleAssignSubjectToGrid(s)}
                  >
                    <View style={[styles.colorIndicatorDot, { backgroundColor: s.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerSubjectName}>{s.name}</Text>
                      {s.teacher && <Text style={styles.pickerSubjectSub}>{s.teacher}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.modalActionGroup}>
                <Pressable
                  style={styles.createNewSubjBtn}
                  onPress={() => {
                    setSubjectPickerVisible(false);
                    setCreateSubjectModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={18} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.createNewSubjBtnText}>{t("createNewSubject")}</Text>
                </Pressable>

                {editingItem && (
                  <Pressable
                    style={styles.clearSlotBtn}
                    onPress={() => handleClearGridSlot(editingItem.day, editingItem.periodNumber)}
                  >
                    <Text style={styles.clearSlotBtnText}>{t("gridClearSlot")}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODAL 2: DAY PICKER                                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Modal
          visible={dayPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDayPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setDayPickerVisible(false)} />
            <View style={styles.pickerModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Day</Text>
                <Pressable onPress={() => setDayPickerVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              {WEEKDAYS_META.map((meta) => (
                <Pressable
                  key={meta.day}
                  style={styles.pickerSimpleRow}
                  onPress={() => {
                    if (editingItem) {
                      setReviewItems((prev) =>
                        prev.map((i) => (i.id === editingItem.id ? { ...i, day: meta.day } : i))
                      );
                    }
                    setDayPickerVisible(false);
                  }}
                >
                  <Text style={styles.pickerSimpleRowText}>{meta.nameId}</Text>
                  {editingItem?.day === meta.day && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODAL 3: PERIOD PICKER                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Modal
          visible={periodPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPeriodPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPeriodPickerVisible(false)} />
            <View style={styles.pickerModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Period</Text>
                <Pressable onPress={() => setPeriodPickerVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 320 }}>
                {editablePeriods.map((period) => (
                  <Pressable
                    key={period.periodNumber}
                    style={styles.pickerSimpleRow}
                    onPress={() => {
                      if (editingItem) {
                        setReviewItems((prev) =>
                          prev.map((i) =>
                            i.id === editingItem.id
                              ? { ...i, periodNumber: period.periodNumber }
                              : i
                          )
                        );
                      }
                      setPeriodPickerVisible(false);
                    }}
                  >
                    <Text style={styles.pickerSimpleRowText}>
                      Jam ke-{period.periodNumber} ({period.start} - {period.end})
                    </Text>
                    {editingItem?.periodNumber === period.periodNumber && (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODAL 4: BELL SCHEDULE SETUP                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Modal
          visible={bellModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setBellModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setBellModalVisible(false)} />
            <View style={styles.largeModalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{t("bellScheduleTitle")}</Text>
                  <Text style={styles.modalSubtitle}>{t("bellScheduleSubtitle")}</Text>
                </View>
                <Pressable onPress={() => setBellModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 340 }}>
                {editablePeriods.map((period) => (
                  <View key={period.periodNumber} style={styles.bellPeriodEditRow}>
                    <Text style={styles.bellPeriodLabel}>Jam {period.periodNumber}</Text>
                    <View style={styles.bellTimeInputs}>
                      <TextInput
                        style={styles.bellTimeInput}
                        value={period.start}
                        onChangeText={(text) => {
                          setEditablePeriods((prev) =>
                            prev.map((p) =>
                              p.periodNumber === period.periodNumber ? { ...p, start: text } : p
                            )
                          );
                        }}
                        placeholder="07:00"
                        placeholderTextColor={colors.textMuted}
                        maxLength={5}
                      />
                      <Text style={{ color: colors.textSecondary }}>-</Text>
                      <TextInput
                        style={styles.bellTimeInput}
                        value={period.end}
                        onChangeText={(text) => {
                          setEditablePeriods((prev) =>
                            prev.map((p) =>
                              p.periodNumber === period.periodNumber ? { ...p, end: text } : p
                            )
                          );
                        }}
                        placeholder="07:45"
                        placeholderTextColor={colors.textMuted}
                        maxLength={5}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.modalButtonCluster}>
                <Pressable style={styles.resetBellBtn} onPress={handleResetBellSchedule}>
                  <Text style={styles.resetBellBtnText}>{t("resetDefaultBell")}</Text>
                </Pressable>

                <Pressable style={styles.actionPrimaryBtn} onPress={handleSaveBellSchedule}>
                  <Text style={styles.actionPrimaryBtnText}>{t("saveBellSchedule")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODAL 5: CONFLICT RESOLUTION MODAL                      */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Modal
          visible={conflictModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConflictModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.conflictModalCard}>
              <View style={styles.conflictIconWrapper}>
                <Ionicons name="swap-horizontal" size={28} color={colors.primary} />
              </View>
              <Text style={styles.conflictModalTitle}>{t("conflictModalTitle")}</Text>
              <Text style={styles.conflictModalMessage}>
                {t("conflictModalMessage", {
                  existing: timetableEntries.length,
                  incoming: reviewItems.length,
                })}
              </Text>

              <Pressable
                style={styles.conflictOptionBtn}
                onPress={() => executeSave("replace")}
              >
                <View style={[styles.conflictDot, { backgroundColor: colors.rose }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.conflictOptionTitle}>{t("replaceOption")}</Text>
                  <Text style={styles.conflictOptionSub}>{t("replaceOptionSub")}</Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.conflictOptionBtn}
                onPress={() => executeSave("merge")}
              >
                <View style={[styles.conflictDot, { backgroundColor: colors.emerald }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.conflictOptionTitle}>{t("mergeOption")}</Text>
                  <Text style={styles.conflictOptionSub}>{t("mergeOptionSub")}</Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.conflictCancelBtn}
                onPress={() => setConflictModalVisible(false)}
              >
                <Text style={styles.conflictCancelBtnText}>{t("cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODAL 6: CREATE SUBJECT INLINE                          */}
        {/* ═══════════════════════════════════════════════════════ */}
        <Modal
          visible={createSubjectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateSubjectModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateSubjectModalVisible(false)} />
            <View style={styles.pickerModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("createSubject")}</Text>
                <Pressable onPress={() => setCreateSubjectModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                style={styles.simpleInput}
                placeholder={t("subjectName")}
                placeholderTextColor={colors.textMuted}
                value={newSubjName}
                onChangeText={setNewSubjName}
              />

              <TextInput
                style={styles.simpleInput}
                placeholder={t("teacherName")}
                placeholderTextColor={colors.textMuted}
                value={newSubjTeacher}
                onChangeText={setNewSubjTeacher}
              />

              <TextInput
                style={styles.simpleInput}
                placeholder={t("room")}
                placeholderTextColor={colors.textMuted}
                value={newSubjRoom}
                onChangeText={setNewSubjRoom}
              />

              <View style={styles.paletteRow}>
                {PALETTE.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.paletteColorBtn,
                      { backgroundColor: c },
                      newSubjColor === c && styles.paletteColorBtnActive,
                    ]}
                    onPress={() => setNewSubjColor(c)}
                  />
                ))}
              </View>

              <Pressable style={styles.actionPrimaryBtn} onPress={handleCreateNewSubject}>
                <Text style={styles.actionPrimaryBtnText}>{t("save")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitleCluster: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bellScheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58, 134, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(58, 134, 255, 0.3)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  bellScheduleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },

  // Channel Tabs
  channelTabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  channelTabActive: {
    backgroundColor: colors.primary,
  },
  channelTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  channelTabTextActive: {
    color: "#ffffff",
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 60,
  },

  channelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  channelCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  channelCardTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  channelCardSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sampleActionLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },

  // Photo Scan State
  photoActionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoActionText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "600",
    color: colors.text,
  },
  scanningBox: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.06)",
    borderRadius: radius.md,
    overflow: "hidden",
    position: "relative",
  },
  scanningShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
  },
  scanningTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  scanningStageText: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    marginBottom: 12,
  },
  cancelScanBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cancelScanBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Grid Styles
  gridDayStrip: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  gridDayPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridDayPillActive: {
    backgroundColor: "rgba(58, 134, 255, 0.18)",
    borderColor: colors.primary,
  },
  gridDayPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  gridDayPillTextActive: {
    color: colors.primary,
  },
  dayCountBadge: {
    marginLeft: 5,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  dayCountBadgeActive: {
    backgroundColor: colors.primary,
  },
  dayCountBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
  gridPeriodList: {
    gap: 8,
  },
  gridPeriodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  gridPeriodInfo: {
    width: 90,
  },
  gridPeriodNum: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
  },
  gridPeriodTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  gridSubjectBox: {
    flex: 1,
  },
  gridSubjectAssigned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  colorIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  gridSubjectTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  gridSubjectSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  gridSubjectEmpty: {
    flexDirection: "row",
    alignItems: "center",
  },
  gridSubjectEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Text Inputs & Buttons
  textInputArea: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 13,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  actionPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimaryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },

  // Review Section
  reviewSection: {
    marginTop: spacing.xs,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  reviewTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  reviewSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58, 134, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  addSlotBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    marginLeft: 3,
  },
  emptyReviewBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyReviewText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
  reviewTable: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewRowWarning: {
    borderColor: "rgba(245, 158, 11, 0.4)",
    backgroundColor: "rgba(245, 158, 11, 0.04)",
  },
  rowDayPeriodColumn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  dayBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: radius.sm,
    gap: 2,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
  },
  periodBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: radius.sm,
    gap: 2,
  },
  periodBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  rowSubjectColumn: {
    flex: 1,
  },
  rowSubjectName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  rowSubDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rowTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  rowRoomTeacher: {
    fontSize: 10,
    color: colors.textMuted,
  },
  rowActionsColumn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 6,
  },
  unverifiedPill: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  unverifiedPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.amber,
  },
  rowDeleteBtn: {
    padding: 6,
  },
  saveTimetableMainBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  saveTimetableMainBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  pickerModalContent: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  largeModalContent: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pickerSubjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  pickerSubjectName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  pickerSubjectSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalActionGroup: {
    marginTop: spacing.md,
    gap: 8,
  },
  createNewSubjBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.08)",
  },
  createNewSubjBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  clearSlotBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  clearSlotBtnText: {
    fontSize: 12,
    color: colors.rose,
  },
  pickerSimpleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  pickerSimpleRowText: {
    fontSize: 14,
    color: colors.text,
  },

  // Bell Schedule Edit Row
  bellPeriodEditRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  bellPeriodLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  bellTimeInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bellTimeInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    width: 65,
    textAlign: "center",
  },
  modalButtonCluster: {
    marginTop: spacing.md,
    gap: 8,
  },
  resetBellBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resetBellBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Conflict Modal
  conflictModalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  conflictIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(58, 134, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  conflictModalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 6,
  },
  conflictModalMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  conflictOptionBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  conflictDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  conflictOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  conflictOptionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  conflictCancelBtn: {
    paddingVertical: 10,
    marginTop: spacing.xs,
  },
  conflictCancelBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Simple Input & Palette
  simpleInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  paletteRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: spacing.sm,
    justifyContent: "center",
  },
  paletteColorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  paletteColorBtnActive: {
    borderWidth: 3,
    borderColor: "#ffffff",
  },
});
