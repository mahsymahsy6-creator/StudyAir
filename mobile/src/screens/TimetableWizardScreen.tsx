/**
 * StudyAir Mobile — Timetable Import Wizard (Phase 5 Clean Routing)
 * 
 * Strict 5-Step Linear Wizard Architecture:
 * Step 1: Choose Source (Photo, Paste Text, CSV/File, Manual Grid)
 * Step 2: Processing (AI OCR pipeline, stage progress, cancelable)
 * Step 3: Review (Editable timetable results)
 * Step 4: School Bell Times (Configure period start & end times)
 * Step 5: Confirm Summary & Save (Conflict resolution, saves, navigates to Today)
 * 
 * Back button pops exactly 1 step; cancel prompts for confirmation if edits exist.
 * All state lives in timetableWizardController singleton so rotation/backgrounding never loses work.
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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget } from "../theme";
import { useMobileStudyStore } from "../store";
import { t } from "../lib/i18n";
import { Subject, PeriodTime } from "../types";
import { extractTimetableFromAI } from "../services/aiService";
import {
  useTimetableWizard,
  WizardSource,
  WizardStep,
} from "../services/timetableWizardStore";
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
import { BellTimesEditor } from "../components/timetable/BellTimesEditor";
import { DEFAULT_PERIOD_TIMES } from "../lib/storage";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";

interface TimetableWizardScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export function TimetableWizardScreen({ navigation }: TimetableWizardScreenProps) {
  const [wizard, controller] = useTimetableWizard();
  const {
    subjects,
    addSubject,
    periodTimes: storePeriodTimes,
    setPeriodTimes: setStorePeriodTimes,
    timetableEntries,
    importTimetable,
    geminiApiKey,
  } = useMobileStudyStore();

  // Local UI modals for Step 3 inline adjustments
  const [editingItem, setEditingItem] = useState<TimetableReviewItem | null>(null);
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);

  // Manual grid day selector (Step 1 manual builder)
  const [selectedGridDay, setSelectedGridDay] = useState<number>(1);

  // Inline subject creator
  const [createSubjectModalVisible, setCreateSubjectModalVisible] = useState(false);
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjColor, setNewSubjColor] = useState("#3A86FF");
  const [newSubjTeacher, setNewSubjTeacher] = useState("");
  const [newSubjRoom, setNewSubjRoom] = useState("");

  const PALETTE = ["#3A86FF", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

  // ─── Step 3: Collapsible Day Sections State ───
  const [collapsedDays, setCollapsedDays] = useState<Record<number, boolean>>({});

  // ─── Step 3: Bulk Tools State ───
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameOldSubject, setRenameOldSubject] = useState("");
  const [renameNewName, setRenameNewName] = useState("");
  const [renameTargetSubjectId, setRenameTargetSubjectId] = useState("");

  const [copyReviewModalVisible, setCopyReviewModalVisible] = useState(false);
  const [copyReviewFromDay, setCopyReviewFromDay] = useState(1);
  const [copyReviewToDay, setCopyReviewToDay] = useState(2);
  const [copyReviewMode, setCopyReviewMode] = useState<"replace" | "append">("replace");

  const abortControllerRef = useRef<AbortController | null>(null);
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  // Initialize / sync period times from store
  useEffect(() => {
    if (storePeriodTimes && storePeriodTimes.length > 0) {
      const isDifferent =
        wizard.periodTimes.length !== storePeriodTimes.length ||
        wizard.periodTimes.some((p, idx) => {
          const sp = storePeriodTimes[idx];
          return (
            !sp ||
            sp.periodNumber !== p.periodNumber ||
            sp.start !== p.start ||
            sp.end !== p.end ||
            sp.weekday !== p.weekday
          );
        });
      if ((wizard.currentStep === 1 || wizard.periodTimes.length === 0) && isDifferent) {
        controller.setPeriodTimes(storePeriodTimes);
      }
    }
  }, [storePeriodTimes, wizard.currentStep, wizard.periodTimes, controller]);

  // Sync existing timetableEntries into wizard.reviewItems so Susun Manual is populated with existing schedule
  useEffect(() => {
    if (wizard.reviewItems.length === 0 && timetableEntries.length > 0 && wizard.currentStep === 1) {
      const existingItems: TimetableReviewItem[] = timetableEntries.map((e) => {
        const subj = subjects.find((s) => s.id === e.subjectId);
        return {
          id: `rev-existing-${e.id}`,
          day: e.weekday,
          periodNumber: e.periodNumber,
          subjectId: e.subjectId,
          rawSubject: subj?.name || e.customLabel || "Pelajaran",
          matchedSubjectName: subj?.name || e.customLabel || "Pelajaran",
          matchedSubjectColor: subj?.color || subj?.color_hex || "#3A86FF",
          isNewSubject: false,
          confidence: 1.0,
          startTime: e.startTime,
          endTime: e.endTime,
          room: e.room,
          teacher: e.teacher,
        };
      });
      controller.setReviewItems(existingItems);
    }
  }, [timetableEntries, subjects, wizard.reviewItems.length, wizard.currentStep, controller]);

  // Shimmer animation for Step 2
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (wizard.isScanning) {
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
  }, [wizard.isScanning, shimmerAnim]);

  // ─── Back & Cancel Navigation Handlers ───
  const handleBack = () => {
    if (wizard.currentStep > 1) {
      // Step back exactly one step
      controller.setStep((wizard.currentStep - 1) as WizardStep);
    } else {
      handleCancelPrompt();
    }
  };

  const handleCancelPrompt = () => {
    soundFX.playClick();
    const doExit = () => {
      controller.resetWizard(storePeriodTimes);
      if (navigation.goBack) {
        navigation.goBack();
      }
      navigation.navigate("Timetable");
    };

    if (Platform.OS === "web") {
      if (!wizard.hasEdits || typeof window === "undefined") {
        doExit();
      } else {
        const confirmed = window.confirm(
          "Batalkan dan keluar dari pengaturan jadwal? Perubahan yang belum disimpan akan dibatalkan."
        );
        if (confirmed) {
          doExit();
        }
      }
      return;
    }

    if (wizard.hasEdits) {
      Alert.alert(
        t("discardAlertTitle") || "Batalkan Pengaturan Jadwal",
        t("discardAlertMsg") || "Perubahan yang belum disimpan akan dibatalkan.",
        [
          {
            text: t("discardBtn") || "Buang Perubahan",
            style: "destructive",
            onPress: doExit,
          },
          { text: t("keepEditing") || "Lanjut Mengedit", style: "cancel" },
        ]
      );
    } else {
      doExit();
    }
  };

  // ─── Step 1: Launch Photo Capture ───
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
      controller.setSource("photo");
      controller.setCapturedImage(result.assets[0].uri, result.assets[0].base64 || "");
      controller.setStep(2);
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
      controller.setSource("photo");
      controller.setCapturedImage(result.assets[0].uri, result.assets[0].base64 || "");
      controller.setStep(2);
      startAIScan(result.assets[0].base64 || "");
    }
  };

  // ─── Step 2: AI OCR Scanning ───
  const startAIScan = async (base64: string) => {
    controller.setScanState(true, "preparing", null);
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    setTimeout(() => {
      if (wizard.isScanning) controller.setScanState(true, "reading", null);
    }, 700);

    setTimeout(() => {
      if (wizard.isScanning) controller.setScanState(true, "checking", null);
    }, 2800);

    try {
      const res = await extractTimetableFromAI(
        {
          imageBase64: base64,
          mimeType: "image/jpeg",
          signal: abortCtrl.signal,
        },
        geminiApiKey
      );

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

      controller.setReviewItems(items);
      controller.setScanState(false, "checking", null);
      controller.setStep(3); // Auto transition to Review screen!
    } catch (err: any) {
      if (err.name === "AbortError") {
        controller.setScanState(false, "preparing", null);
        controller.setStep(1);
        return;
      }
      console.warn("[TimetableScan] Error:", err);
      controller.setScanState(false, "preparing", t("scanFailed"));
    }
  };

  const handleCancelAIScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    controller.setScanState(false, "preparing", null);
    controller.setStep(1);
  };

  // ─── Step 1: Text & CSV Processors ───
  const handleProcessText = () => {
    if (!wizard.rawInput.trim()) {
      Alert.alert("Input Required", "Please enter or paste your schedule text first.");
      return;
    }
    const res = parseStructuredTextTimetable(wizard.rawInput, subjects);
    if (res.items.length === 0) {
      Alert.alert("No Classes Detected", "Could not parse any classes. Please check the format.");
      return;
    }
    controller.setReviewItems(res.items);
    controller.setStep(3);
  };

  const handleProcessCsv = () => {
    if (!wizard.rawInput.trim()) {
      Alert.alert("Input Required", "Please paste CSV or spreadsheet text first.");
      return;
    }
    const res = parseCsvTimetable(wizard.rawInput, subjects);
    if (res.items.length === 0) {
      Alert.alert("No Classes Detected", "Could not parse any classes. Check delimiter or headers.");
      return;
    }
    controller.setReviewItems(res.items);
    controller.setStep(3);
  };

  const handleLoadSampleText = () => {
    controller.setRawInput(
      `=== SENIN ===\n1 MTK\n2 Fisika R.Lab Pak Joko\n3 Bahasa Indonesia\n\n=== SELASA ===\n1-2 Bahasa Inggris\n3 Kimia\n\n=== RABU ===\n1 PJOK\n2-3 Biologi`
    );
  };

  const handleLoadSampleCsv = () => {
    controller.setRawInput(
      `Period\tSenin\tSelasa\tRabu\tKamis\tJumat\n1\tMTK\tFisika\tKimia\tB.Indo\tAgama\n2\tMTK\tFisika\tKimia\tB.Indo\tAgama\n3\tB.Inggris\tBiologi\tSejarah\tPJOK\tPKn\n4\tB.Inggris\tBiologi\tSeni Budaya\tPJOK\tTIK`
    );
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        controller.setRawInput(text.trim());
        Alert.alert("Berhasil Ditempel", "Teks jadwal dari clipboard berhasil dimuat.");
      } else {
        Alert.alert("Papan Klip Kosong", "Tidak ada teks yang disalin di clipboard.");
      }
    } catch (err) {
      console.warn("Clipboard paste error:", err);
    }
  };

  const handlePickDocument = async () => {
    if (Platform.OS === "web") {
      try {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,.txt,.tsv,.xlsx,.xls,.pdf";
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const text = await file.text();
            controller.setRawInput(text);
            Alert.alert("File Dipilih", `Berhasil memuat berkas: ${file.name}`);
          }
        };
        input.click();
      } catch (err) {
        console.warn("File pick error:", err);
      }
    } else {
      Alert.alert(
        "Pilih Berkas",
        "Pilih berkas CSV, Excel, atau PDF jadwal pelajaran dari penyimpanan perangkat.",
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Gunakan Berkas Contoh",
            onPress: handleLoadSampleCsv,
          },
        ]
      );
    }
  };

  // ─── Step 1: Manual Grid Builder Helpers ───
  const gridDayItems = useMemo(() => {
    return wizard.reviewItems.filter((i) => i.day === selectedGridDay);
  }, [wizard.reviewItems, selectedGridDay]);

  // Resolve period times for the currently selected grid day (applying day-specific bell times if any)
  const manualGridPeriods = useMemo(() => {
    const times = wizard.periodTimes.length > 0 ? wizard.periodTimes : storePeriodTimes;
    if (!times || times.length === 0) return DEFAULT_PERIOD_TIMES;

    // Two-pass resolution:
    // Pass 1: Default periods (where weekday is falsy or 0)
    const defaultPeriods = times.filter((p) => !p.weekday || p.weekday === 0);
    // Pass 2: Overrides specific to selectedGridDay
    const daySpecific = times.filter((p) => p.weekday === selectedGridDay);

    const periodMap = new Map<number, PeriodTime>();
    for (const p of defaultPeriods) {
      periodMap.set(p.periodNumber, p);
    }
    for (const p of daySpecific) {
      periodMap.set(p.periodNumber, p);
    }

    return Array.from(periodMap.values()).sort((a, b) => a.periodNumber - b.periodNumber);
  }, [wizard.periodTimes, storePeriodTimes, selectedGridDay]);

  const handleManualAddPeriod = () => {
    HapticFeedback.light();
    soundFX.playClick();
    const nextNum = manualGridPeriods.length > 0
      ? Math.max(...manualGridPeriods.map((p) => p.periodNumber)) + 1
      : 1;
    const lastPeriod = manualGridPeriods[manualGridPeriods.length - 1];
    const startTime = lastPeriod ? lastPeriod.end : "14:00";
    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = (h * 60 + m + 45) % 1440;
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    const endTime = `${endH}:${endM}`;

    const newPeriod: PeriodTime = {
      periodNumber: nextNum,
      start: startTime,
      end: endTime,
    };
    const currentBase =
      wizard.periodTimes.length > 0
        ? wizard.periodTimes
        : storePeriodTimes.length > 0
        ? storePeriodTimes
        : DEFAULT_PERIOD_TIMES;
    const updated = [...currentBase, newPeriod];
    controller.setPeriodTimes(updated);
    setStorePeriodTimes(updated);
  };

  const handleOpenGridSlot = (periodNum: number) => {
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

  const handleAssignSubject = (subject: Subject) => {
    if (!editingItem) return;
    const filtered = wizard.reviewItems.filter(
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
    controller.setReviewItems([...filtered, updated]);
    setSubjectPickerVisible(false);
    setEditingItem(null);
  };

  const handleClearSlot = (day: number, periodNum: number) => {
    controller.setReviewItems(
      wizard.reviewItems.filter((i) => !(i.day === day && i.periodNumber === periodNum))
    );
    setSubjectPickerVisible(false);
    setEditingItem(null);
  };

  // ─── Step 3: Review Screen Operations ───
  const handleAddNewReviewSlot = () => {
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
    controller.addReviewItem(newItem);
  };

  const handleAddNewReviewSlotForDay = (day: number) => {
    const dayItems = wizard.reviewItems.filter((i) => i.day === day);
    const nextPeriod = dayItems.length > 0 ? Math.max(...dayItems.map((i) => i.periodNumber)) + 1 : 1;
    const newItem: TimetableReviewItem = {
      id: `rev-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day,
      periodNumber: Math.min(nextPeriod, 10),
      rawSubject: subjects[0]?.name || "Matematika",
      subjectId: subjects[0]?.id,
      matchedSubjectName: subjects[0]?.name || "Matematika",
      matchedSubjectColor: subjects[0]?.color || "#3A86FF",
      isNewSubject: false,
      confidence: 1.0,
    };
    controller.addReviewItem(newItem);
  };

  // ─── Step 3: Bulk Tools Handlers ───
  const handleOpenRenameModal = () => {
    const distinct = Array.from(new Set(wizard.reviewItems.map((i) => i.matchedSubjectName)));
    if (distinct.length === 0) {
      Alert.alert("No Subjects", "No classes detected yet to rename.");
      return;
    }
    setRenameOldSubject(distinct[0]);
    setRenameNewName(distinct[0]);
    setRenameTargetSubjectId("");
    setRenameModalVisible(true);
  };

  const handleApplyRenameEverywhere = () => {
    if (!renameNewName.trim()) {
      Alert.alert("Validation", "Please enter a valid subject name.");
      return;
    }
    const targetSub = subjects.find((s) => s.id === renameTargetSubjectId);
    controller.renameSubjectEverywhere(
      renameOldSubject,
      renameNewName.trim(),
      targetSub?.id,
      targetSub?.color || targetSub?.color_hex
    );
    setRenameModalVisible(false);
    Alert.alert(
      "Renamed Everywhere",
      `All occurrences of "${renameOldSubject}" have been updated to "${renameNewName.trim()}".`
    );
  };

  const handleMergeDuplicates = () => {
    const mergedCount = controller.mergeDuplicateReviewSlots();
    if (mergedCount > 0) {
      Alert.alert(
        "Duplicates Merged",
        `Successfully merged ${mergedCount} duplicate period slot${mergedCount > 1 ? "s" : ""}.`
      );
    } else {
      Alert.alert(
        "Clean Schedule",
        "No duplicate period slots found. Every class slot is already unique."
      );
    }
  };

  const handleOpenCopyReviewDay = (fromDay?: number) => {
    const activeDays = Array.from(new Set(wizard.reviewItems.map((i) => i.day))).sort((a, b) => a - b);
    if (activeDays.length === 0) {
      Alert.alert("Empty Timetable", "No classes detected yet to copy.");
      return;
    }
    const source = fromDay || activeDays[0] || 1;
    setCopyReviewFromDay(source);
    setCopyReviewToDay(source >= 6 ? 1 : source + 1);
    setCopyReviewMode("replace");
    setCopyReviewModalVisible(true);
  };

  const handleApplyCopyReviewDay = () => {
    const copiedCount = controller.copyDayReviewItems(
      copyReviewFromDay,
      copyReviewToDay,
      copyReviewMode
    );
    setCopyReviewModalVisible(false);
    const targetMeta = WEEKDAYS_META.find((w) => w.day === copyReviewToDay);
    const targetName = targetMeta ? targetMeta.nameId : `Day ${copyReviewToDay}`;
    Alert.alert("Schedule Copied", `Copied ${copiedCount} classes to ${targetName}.`);
  };

  const toggleDayCollapse = (day: number) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [day]: !prev[day],
    }));
  };

  // Group review items by day with problem counting & default open logic
  const reviewDaysGrouped = useMemo(() => {
    const dayMap = new Map<number, TimetableReviewItem[]>();
    for (const item of wizard.reviewItems) {
      const list = dayMap.get(item.day) || [];
      list.push(item);
      dayMap.set(item.day, list);
    }

    const sortedDayNumbers = Array.from(dayMap.keys()).sort((a, b) => a - b);

    return sortedDayNumbers.map((dayNum) => {
      const items = (dayMap.get(dayNum) || []).sort((a, b) => a.periodNumber - b.periodNumber);
      const problemItems = items.filter((i) => i.confidence < 0.7 || i.isNewSubject);
      const meta = WEEKDAYS_META.find((w) => w.day === dayNum);
      const dayName = meta ? meta.nameId : `Day ${dayNum}`;

      // Sections with problems open by default
      const hasProblems = problemItems.length > 0;
      const isCollapsed =
        collapsedDays[dayNum] !== undefined ? collapsedDays[dayNum] : !hasProblems;

      return {
        dayNum,
        dayName,
        items,
        problemCount: problemItems.length,
        isCollapsed,
      };
    });
  }, [wizard.reviewItems, collapsedDays]);

  // ─── Step 4: Bell Schedule Metadata & Actions ───
  const maxUsedPeriodInReview = useMemo(() => {
    if (wizard.reviewItems.length === 0) return undefined;
    return Math.max(1, ...wizard.reviewItems.map((r) => r.periodNumber));
  }, [wizard.reviewItems]);

  const breakEntriesInReview = useMemo(() => {
    return wizard.reviewItems
      .filter((r) => {
        const title = (r.matchedSubjectName || r.rawSubject || "").toLowerCase();
        return title.includes("istirahat") || title.includes("ishoma");
      })
      .map((r) => ({
        label: r.matchedSubjectName || r.rawSubject || "Istirahat",
        periodNumber: r.periodNumber,
      }));
  }, [wizard.reviewItems]);

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
    controller.setPeriodTimes(standard);
  };

  // ─── Step 5: Final Save Execution ───
  const handleExecuteSave = () => {
    if (wizard.reviewItems.length === 0) {
      Alert.alert("Empty Timetable", t("noEntriesYet"));
      return;
    }

    // 1. Resolve review items to database entries and create any new subjects
    const { entries, newSubjects } = resolveReviewItemsToTimetable(
      wizard.reviewItems,
      subjects
    );

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

    // 3. Save period times
    setStorePeriodTimes(wizard.periodTimes);

    // 4. Import timetable entries into store with conflict mode
    importTimetable(entries, wizard.saveMode);

    // 5. Determine the first day that has classes
    const activeDays = Array.from(new Set(entries.map((e) => e.weekday))).sort((a, b) => a - b);
    const firstDayWithClasses = activeDays[0] || 1;

    // 6. Clear wizard state
    controller.resetWizard();

    // 7. Navigate to Timetable screen (Subjects tab in "byDay" mode) with the first day selected
    Alert.alert(
      "Success",
      t("timetableSavedSuccess"),
      [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("Calendar");
          },
        },
      ]
    );
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
      handleAssignSubject(created);
    }

    setCreateSubjectModalVisible(false);
    setNewSubjName("");
    setNewSubjTeacher("");
    setNewSubjRoom("");
  };

  // Computed summary metrics
  const activeDaysCount = useMemo(() => {
    return new Set(wizard.reviewItems.map((i) => i.day)).size;
  }, [wizard.reviewItems]);

  const unverifiedCount = useMemo(() => {
    return wizard.reviewItems.filter((i) => i.confidence < 0.7 || i.isNewSubject).length;
  }, [wizard.reviewItems]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ─── Top Header with Progress Bar ─── */}
        <View style={styles.header}>
          {wizard.currentStep === 1 ? (
            <View style={{ width: 48 }} />
          ) : (
            <Pressable style={styles.headerNavBtn} onPress={handleBack} hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <Text style={styles.headerNavBtnText}>Kembali</Text>
            </Pressable>
          )}

          <View style={styles.headerCenter}>
            <Text style={styles.headerStepIndicator}>
              {t("stepIndicator", { current: wizard.currentStep, total: 5 })}
            </Text>
            <Text style={styles.headerStepTitle}>
              {wizard.currentStep === 1 && t("step1Title")}
              {wizard.currentStep === 2 && t("step2Title")}
              {wizard.currentStep === 3 && t("step3Title")}
              {wizard.currentStep === 4 && t("step4Title")}
              {wizard.currentStep === 5 && t("step5Title")}
            </Text>
          </View>

          <Pressable style={styles.headerNavBtn} onPress={handleCancelPrompt} hitSlop={12}>
            <Text style={[styles.headerNavBtnText, { color: colors.textSecondary }]}>
              Batal
            </Text>
          </Pressable>
        </View>

        {/* 5-Segment Progress Indicator */}
        <View style={styles.progressBarRow}>
          {[1, 2, 3, 4, 5].map((step) => (
            <View
              key={step}
              style={[
                styles.progressBarSegment,
                step <= wizard.currentStep && styles.progressBarSegmentActive,
              ]}
            />
          ))}
        </View>

        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 1: CHOOSE SOURCE                                   */}
          {/* ═══════════════════════════════════════════════════════ */}
          {wizard.currentStep === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepSubtitle}>{t("step1Subtitle")}</Text>

              {/* Source Option 1: Photo / Gallery */}
              <View style={styles.sourceCard}>
                <View style={styles.sourceCardHeader}>
                  <View style={[styles.sourceIconBox, { backgroundColor: colors.accentLight }]}>
                    <Ionicons name="camera" size={24} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceTitle}>{t("sourcePhotoTitle")}</Text>
                    <Text style={styles.sourceDesc}>{t("sourcePhotoDesc")}</Text>
                  </View>
                </View>
                <View style={styles.photoActionsRow}>
                  <Pressable style={styles.photoBtn} onPress={handleLaunchCamera}>
                    <Ionicons name="camera-outline" size={18} color={colors.accent} />
                    <Text style={styles.photoBtnText}>{t("takePhoto")}</Text>
                  </Pressable>
                  <Pressable style={styles.photoBtn} onPress={handleLaunchGallery}>
                    <Ionicons name="images-outline" size={18} color={colors.emerald} />
                    <Text style={styles.photoBtnText}>{t("chooseGallery")}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Source Option 2: Paste Text */}
              <Pressable
                style={[
                  styles.sourceCard,
                  wizard.sourceType === "text" && styles.sourceCardSelected,
                ]}
                onPress={() => controller.setSource("text")}
              >
                <View style={styles.sourceCardHeader}>
                  <View style={[styles.sourceIconBox, { backgroundColor: "rgba(58, 134, 255, 0.15)" }]}>
                    <Ionicons name="document-text" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceTitle}>{t("sourceTextTitle")}</Text>
                    <Text style={styles.sourceDesc}>{t("sourceTextDesc")}</Text>
                  </View>
                  <Ionicons
                    name={wizard.sourceType === "text" ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>

                {wizard.sourceType === "text" && (
                  <View style={styles.expandedInputSection}>
                    <View style={styles.sampleLinkRow}>
                      <Pressable
                        style={styles.clipboardActionBtn}
                        onPress={handlePasteFromClipboard}
                      >
                        <Ionicons name="clipboard-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={styles.clipboardActionBtnText}>Tempel dari clipboard</Text>
                      </Pressable>
                      <Pressable onPress={handleLoadSampleText} hitSlop={8}>
                        <Text style={styles.sampleLinkText}>{t("loadSampleText")}</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      style={styles.textInputBox}
                      placeholder={t("pasteTextHint")}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={6}
                      value={wizard.rawInput}
                      onChangeText={(text) => controller.setRawInput(text)}
                    />
                    <Text style={styles.freeFormatHintText}>
                      💡 Format bebas juga bisa — AI akan menyusun hari dan jamnya otomatis.
                    </Text>
                    <Pressable style={styles.actionPrimaryBtn} onPress={handleProcessText}>
                      <Text style={styles.actionPrimaryBtnText}>{t("proceedToReview")}</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>

              {/* Source Option 3: File (CSV / Sheets / PDF) */}
              <Pressable
                style={[
                  styles.sourceCard,
                  wizard.sourceType === "file" && styles.sourceCardSelected,
                ]}
                onPress={() => controller.setSource("file")}
              >
                <View style={styles.sourceCardHeader}>
                  <View style={[styles.sourceIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                    <Ionicons name="stats-chart" size={24} color={colors.emerald} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceTitle}>{t("sourceFileTitle")}</Text>
                    <Text style={styles.sourceDesc}>{t("sourceFileDesc")}</Text>
                  </View>
                  <Ionicons
                    name={wizard.sourceType === "file" ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>

                {wizard.sourceType === "file" && (
                  <View style={styles.expandedInputSection}>
                    <View style={styles.sampleLinkRow}>
                      <Pressable
                        style={styles.clipboardActionBtn}
                        onPress={handlePickDocument}
                      >
                        <Ionicons name="document-attach-outline" size={16} color={colors.emerald} style={{ marginRight: 4 }} />
                        <Text style={[styles.clipboardActionBtnText, { color: colors.emerald }]}>Pilih berkas (CSV / Sheets / PDF)</Text>
                      </Pressable>
                      <Pressable onPress={handleLoadSampleCsv} hitSlop={8}>
                        <Text style={styles.sampleLinkText}>{t("loadSampleCsv")}</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      style={styles.textInputBox}
                      placeholder={t("csvHint")}
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={5}
                      value={wizard.rawInput}
                      onChangeText={(text) => controller.setRawInput(text)}
                    />
                    <Pressable style={styles.actionPrimaryBtn} onPress={handleProcessCsv}>
                      <Text style={styles.actionPrimaryBtnText}>{t("proceedToReview")}</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>

              {/* Source Option 4: Build Manually */}
              <Pressable
                style={[
                  styles.sourceCard,
                  wizard.sourceType === "manual" && styles.sourceCardSelected,
                ]}
                onPress={() => controller.setSource("manual")}
              >
                <View style={styles.sourceCardHeader}>
                  <View style={[styles.sourceIconBox, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                    <Ionicons name="grid" size={24} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceTitle}>{t("sourceManualTitle")}</Text>
                    <Text style={styles.sourceDesc}>{t("sourceManualDesc")}</Text>
                  </View>
                  <Ionicons
                    name={wizard.sourceType === "manual" ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>

                {wizard.sourceType === "manual" && (
                  <View style={styles.expandedInputSection}>
                    {/* Day selector pills */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginBottom: 12 }}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {WEEKDAYS_META.map((meta) => {
                        const isSelected = selectedGridDay === meta.day;
                        const dayCount = wizard.reviewItems.filter((i) => i.day === meta.day).length;
                        return (
                          <Pressable
                            key={meta.day}
                            style={[styles.dayPill, isSelected && styles.dayPillActive]}
                            onPress={() => setSelectedGridDay(meta.day)}
                          >
                            <Text style={[styles.dayPillText, isSelected && styles.dayPillTextActive]}>
                              {meta.nameId}
                            </Text>
                            {dayCount > 0 && (
                              <View style={[styles.dayPillBadge, isSelected && styles.dayPillBadgeActive]}>
                                <Text style={styles.dayPillBadgeText}>{dayCount}</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {/* Period Rows */}
                    <View style={{ gap: 8, marginBottom: 12 }}>
                      {manualGridPeriods.map((period) => {
                        const assigned = gridDayItems.find(
                          (i) => i.periodNumber === period.periodNumber
                        );
                        return (
                          <Pressable
                            key={period.periodNumber}
                            style={[
                              styles.gridRow,
                              assigned && {
                                borderLeftColor: assigned.matchedSubjectColor,
                                borderLeftWidth: 4,
                              },
                            ]}
                            onPress={() => handleOpenGridSlot(period.periodNumber)}
                          >
                            <View style={{ width: 85 }}>
                              <Text style={styles.gridRowPeriod}>Jam {period.periodNumber}</Text>
                              <Text style={styles.gridRowTime}>{period.start}-{period.end}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              {assigned ? (
                                <Text style={styles.gridRowSubject}>{assigned.matchedSubjectName}</Text>
                              ) : (
                                <Text style={styles.gridRowEmpty}>{t("gridEmptySlot")}</Text>
                              )}
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Inline Button: Tambah Jam Pelajaran */}
                    <Pressable
                      style={styles.addPeriodManualBtn}
                      onPress={handleManualAddPeriod}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={styles.addPeriodManualBtnText}>
                        + Tambah Jam Pelajaran (Jam {manualGridPeriods.length + 1})
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.actionPrimaryBtn}
                      onPress={() => {
                        if (wizard.reviewItems.length === 0) {
                          Alert.alert("Empty Grid", "Please assign at least one class to continue.");
                          return;
                        }
                        controller.setStep(3);
                      }}
                    >
                      <Text style={styles.actionPrimaryBtnText}>{t("proceedToReview")}</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 2: PROCESSING (AI OCR & PIPELINE)                  */}
          {/* ═══════════════════════════════════════════════════════ */}
          {wizard.currentStep === 2 && (
            <View style={styles.processingCard}>
              <Animated.View style={[styles.scanningShimmer, { opacity: shimmerAnim }]} />
              <ActivityIndicator size="large" color={colors.accent} style={{ marginBottom: 16 }} />
              <Text style={styles.processingTitle}>{t("step2Title")}</Text>
              <Text style={styles.processingStageText}>
                {wizard.scanStage === "preparing" && "1/3 Optimizing image & dictionary..."}
                {wizard.scanStage === "reading" && "2/3 Reading subjects and periods..."}
                {wizard.scanStage === "checking" && "3/3 Validating catalog & break rows..."}
              </Text>

              {wizard.scanError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{wizard.scanError}</Text>
                  <Pressable
                    style={styles.actionPrimaryBtn}
                    onPress={() => {
                      if (wizard.capturedImageBase64) {
                        startAIScan(wizard.capturedImageBase64);
                      } else {
                        controller.setStep(1);
                      }
                    }}
                  >
                    <Text style={styles.actionPrimaryBtnText}>Try Again</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.cancelScanBtn} onPress={handleCancelAIScan}>
                  <Text style={styles.cancelScanBtnText}>{t("cancel")}</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 3: REVIEW RESULTS (GROUPED BY DAY WITH BULK TOOLS) */}
          {/* ═══════════════════════════════════════════════════════ */}
          {wizard.currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.reviewHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepSubtitle}>{t("step3Subtitle")}</Text>
                  <Text style={styles.reviewCountSubtitle}>
                    {wizard.reviewItems.length} kelas terdeteksi
                    {unverifiedCount > 0 && ` • ⚠️ ${unverifiedCount} perlu dicek`}
                  </Text>
                </View>
                <Pressable style={styles.addSlotBtn} onPress={handleAddNewReviewSlot} hitSlop={8}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addSlotBtnText}>{t("addPeriodBtn")}</Text>
                </Pressable>
              </View>

              {/* ─── Bulk Tools Toolbar ─── */}
              {wizard.reviewItems.length > 0 && (
                <View style={styles.bulkToolsBar}>
                  <Pressable style={styles.bulkToolBtn} onPress={handleOpenRenameModal}>
                    <Ionicons name="pencil-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.bulkToolBtnText}>Ubah Nama Semua</Text>
                  </Pressable>

                  <Pressable style={styles.bulkToolBtn} onPress={handleMergeDuplicates}>
                    <Ionicons name="git-merge-outline" size={14} color={colors.accent} style={{ marginRight: 4 }} />
                    <Text style={styles.bulkToolBtnText}>Gabung Duplikat</Text>
                  </Pressable>

                  <Pressable style={styles.bulkToolBtn} onPress={() => handleOpenCopyReviewDay()}>
                    <Ionicons name="copy-outline" size={14} color={colors.emerald} style={{ marginRight: 4 }} />
                    <Text style={styles.bulkToolBtnText}>Salin Hari</Text>
                  </Pressable>
                </View>
              )}

              {wizard.reviewItems.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
                  <Text style={styles.emptyText}>{t("noEntriesYet")}</Text>
                </View>
              ) : (
                <View style={styles.daySectionsContainer}>
                  {reviewDaysGrouped.map((dayGroup) => {
                    const hasProblems = dayGroup.problemCount > 0;

                    return (
                      <View key={dayGroup.dayNum} style={styles.daySectionCard}>
                        {/* Day Section Header */}
                        <Pressable
                          style={styles.daySectionHeader}
                          onPress={() => toggleDayCollapse(dayGroup.dayNum)}
                        >
                          <View style={styles.daySectionHeaderLeft}>
                            <Text style={styles.daySectionHeaderTitle}>{dayGroup.dayName}</Text>
                            <View style={styles.dayCountBadge}>
                              <Text style={styles.dayCountBadgeText}>
                                {dayGroup.items.length} kelas
                              </Text>
                            </View>
                          </View>

                          <View style={styles.daySectionHeaderRight}>
                            {hasProblems ? (
                              <View style={styles.problemBadgeAmber}>
                                <Ionicons name="warning" size={12} color="#F59E0B" style={{ marginRight: 3 }} />
                                <Text style={styles.problemBadgeAmberText}>
                                  Perlu dicek ({dayGroup.problemCount})
                                </Text>
                              </View>
                            ) : (
                              <View style={styles.problemBadgeGreen}>
                                <Ionicons name="checkmark-circle" size={12} color={colors.emerald} style={{ marginRight: 3 }} />
                                <Text style={styles.problemBadgeGreenText}>Cocok semua</Text>
                              </View>
                            )}

                            <Ionicons
                              name={dayGroup.isCollapsed ? "chevron-forward" : "chevron-down"}
                              size={18}
                              color={colors.textSecondary}
                              style={{ marginLeft: 6 }}
                            />
                          </View>
                        </Pressable>

                        {/* Day Chain Preview */}
                        <View style={styles.dayChainPreviewBox}>
                          <Text style={styles.dayChainPreviewText} numberOfLines={1}>
                            {dayGroup.items.map((i) => i.matchedSubjectName || i.rawSubject).join(" • ")}
                          </Text>
                        </View>

                        {/* Collapsible Content */}
                        {!dayGroup.isCollapsed && (
                          <View style={styles.daySectionContent}>
                            <View style={styles.reviewTable}>
                              {dayGroup.items.map((item) => {
                                const isUnverified = item.confidence < 0.7 || item.isNewSubject;
                                const periodTimeInfo = wizard.periodTimes.find(
                                  (p) => p.periodNumber === item.periodNumber
                                );

                                return (
                                  <View
                                    key={item.id}
                                    style={[
                                      styles.reviewRow,
                                      isUnverified && styles.reviewRowWarning,
                                    ]}
                                  >
                                    {/* Day & Period Selectors */}
                                    <View style={styles.rowDayPeriodCol}>
                                      <Pressable
                                        style={styles.pillBtn}
                                        onPress={() => {
                                          setEditingItem(item);
                                          setDayPickerVisible(true);
                                        }}
                                      >
                                        <Text style={styles.pillBtnText}>{getWeekdayShort(item.day)}</Text>
                                        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                                      </Pressable>

                                      <Pressable
                                        style={styles.pillBtn}
                                        onPress={() => {
                                          setEditingItem(item);
                                          setPeriodPickerVisible(true);
                                        }}
                                      >
                                        <Text style={[styles.pillBtnText, { color: colors.primary }]}>
                                          J{item.periodNumber}
                                        </Text>
                                        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                                      </Pressable>
                                    </View>

                                    {/* Subject Info */}
                                    <Pressable
                                      style={styles.rowSubjectCol}
                                      onPress={() => {
                                        setEditingItem(item);
                                        setSubjectPickerVisible(true);
                                      }}
                                    >
                                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <View
                                          style={[
                                            styles.colorDot,
                                            { backgroundColor: item.matchedSubjectColor },
                                          ]}
                                        />
                                        <Text style={styles.rowSubjectTitle} numberOfLines={2}>
                                          {item.matchedSubjectName}
                                        </Text>
                                      </View>
                                      <View style={styles.rowDetailsRow}>
                                        {periodTimeInfo && (
                                          <Text style={styles.rowTimeText}>
                                            {periodTimeInfo.start}-{periodTimeInfo.end}
                                          </Text>
                                        )}
                                        {(item.room || item.teacher) && (
                                          <Text style={styles.rowRoomText} numberOfLines={1}>
                                            • {[item.room, item.teacher].filter(Boolean).join(" ")}
                                          </Text>
                                        )}
                                      </View>
                                    </Pressable>

                                    {/* Unverified Pill & Delete */}
                                    <View style={styles.rowActionsCol}>
                                      {isUnverified && (
                                        <View style={styles.warningPill}>
                                          <Text style={styles.warningPillText}>{t("unmatchedWarning")}</Text>
                                        </View>
                                      )}
                                      <Pressable
                                        style={styles.deleteBtn}
                                        onPress={() => controller.deleteReviewItem(item.id)}
                                        hitSlop={8}
                                      >
                                        <Ionicons name="trash-outline" size={16} color={colors.rose} />
                                      </Pressable>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>

                            {/* Actions inside Day Section */}
                            <View style={styles.daySectionFooterActions}>
                              <Pressable
                                style={styles.dayAddSlotBtn}
                                onPress={() => handleAddNewReviewSlotForDay(dayGroup.dayNum)}
                              >
                                <Ionicons name="add" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                                <Text style={styles.dayAddSlotBtnText}>Tambah Kelas di {dayGroup.dayName}</Text>
                              </Pressable>

                              <Pressable
                                style={styles.dayCopyBtn}
                                onPress={() => handleOpenCopyReviewDay(dayGroup.dayNum)}
                              >
                                <Ionicons name="copy-outline" size={13} color={colors.textSecondary} style={{ marginRight: 3 }} />
                                <Text style={styles.dayCopyBtnText}>Salin Hari</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Bottom Step Actions */}
              <View style={styles.stepButtonRow}>
                <Pressable
                  style={[styles.actionPrimaryBtn, { flex: 1 }]}
                  onPress={() => controller.setStep(4)}
                >
                  <Text style={styles.actionPrimaryBtnText}>Atur jam pelajaran →</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 4: SCHOOL BELL SCHEDULE (PERIOD TIMES)            */}
          {/* ═══════════════════════════════════════════════════════ */}
          {wizard.currentStep === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepSubtitle}>{t("step4Subtitle")}</Text>

              <BellTimesEditor
                periodTimes={wizard.periodTimes}
                onChangePeriodTimes={(times) => {
                  controller.setPeriodTimes(times);
                  setStorePeriodTimes(times);
                }}
                maxUsedPeriod={maxUsedPeriodInReview}
                breakEntries={breakEntriesInReview}
                mode="wizard"
                confirmButtonText="Lanjut ke ringkasan"
                onConfirm={() => controller.setStep(5)}
              />
            </View>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STEP 5: CONFIRM SUMMARY & SAVE                          */}
          {/* ═══════════════════════════════════════════════════════ */}
          {wizard.currentStep === 5 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepSubtitle}>{t("step5Subtitle")}</Text>

              {/* Summary Metrics Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconBox}>
                  <Ionicons name="calendar" size={32} color={colors.primary} />
                </View>
                <Text style={styles.summaryTitle}>
                  {t("summaryClassesDetected", { count: wizard.reviewItems.length })}
                </Text>
                <Text style={styles.summarySubtitle}>
                  {t("summaryDaysActive", { count: activeDaysCount })}
                </Text>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryInfoRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={styles.summaryInfoText}>
                    {wizard.periodTimes[0]?.start || "07:00"} -{" "}
                    {wizard.periodTimes[wizard.periodTimes.length - 1]?.end || "14:00"}
                  </Text>
                </View>
              </View>

              {/* Conflict Option Selection (If existing timetable has classes) */}
              {timetableEntries.length > 0 ? (
                <View style={styles.conflictBox}>
                  <Text style={styles.conflictTitle}>{t("conflictModalTitle")}</Text>
                  <Text style={styles.conflictMsg}>
                    {t("conflictModalMessage", {
                      existing: timetableEntries.length,
                      incoming: wizard.reviewItems.length,
                    })}
                  </Text>

                  <Pressable
                    style={[
                      styles.conflictChoiceBtn,
                      wizard.saveMode === "replace" && styles.conflictChoiceBtnActive,
                    ]}
                    onPress={() => controller.setSaveMode("replace")}
                  >
                    <View
                      style={[
                        styles.radioDot,
                        wizard.saveMode === "replace" && { backgroundColor: colors.rose },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>{t("replaceOption")}</Text>
                      <Text style={styles.choiceSub}>{t("replaceOptionSub")}</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.conflictChoiceBtn,
                      wizard.saveMode === "merge" && styles.conflictChoiceBtnActive,
                    ]}
                    onPress={() => controller.setSaveMode("merge")}
                  >
                    <View
                      style={[
                        styles.radioDot,
                        wizard.saveMode === "merge" && { backgroundColor: colors.emerald },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceTitle}>{t("mergeOption")}</Text>
                      <Text style={styles.choiceSub}>{t("mergeOptionSub")}</Text>
                    </View>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cleanSaveBox}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.emerald} style={{ marginRight: 8 }} />
                  <Text style={styles.cleanSaveText}>Jadwal mingguan kamu siap disimpan!</Text>
                </View>
              )}

              {/* Save Final Button */}
              <Pressable style={styles.saveFinalBtn} onPress={handleExecuteSave}>
                <Ionicons name="checkmark-done" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.saveFinalBtnText}>{t("saveTimetableBtn")}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* MODALS: SUBJECT, DAY, PERIOD PICKERS                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {/* Subject Picker Modal */}
        <Modal
          visible={subjectPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSubjectPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSubjectPickerVisible(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>{t("gridSelectSubject")}</Text>
                <Pressable onPress={() => setSubjectPickerVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {subjects.map((s) => (
                  <Pressable
                    key={s.id}
                    style={styles.subjectRow}
                    onPress={() => handleAssignSubject(s)}
                  >
                    <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectRowTitle}>{s.name}</Text>
                      {s.teacher && <Text style={styles.subjectRowSub}>{s.teacher}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </ScrollView>

              <View style={{ marginTop: 12, gap: 8 }}>
                <Pressable
                  style={styles.modalActionBtn}
                  onPress={() => {
                    setSubjectPickerVisible(false);
                    setCreateSubjectModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={18} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.modalActionBtnText}>{t("createNewSubject")}</Text>
                </Pressable>

                {editingItem && (
                  <Pressable
                    style={styles.clearBtn}
                    onPress={() => handleClearSlot(editingItem.day, editingItem.periodNumber)}
                  >
                    <Text style={styles.clearBtnText}>{t("gridClearSlot")}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Day Picker Modal */}
        <Modal
          visible={dayPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDayPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setDayPickerVisible(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Select Day</Text>
                <Pressable onPress={() => setDayPickerVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              {WEEKDAYS_META.map((meta) => (
                <Pressable
                  key={meta.day}
                  style={styles.simpleRow}
                  onPress={() => {
                    if (editingItem) {
                      controller.updateReviewItem(editingItem.id, { day: meta.day });
                    }
                    setDayPickerVisible(false);
                  }}
                >
                  <Text style={styles.simpleRowText}>{meta.nameId}</Text>
                  {editingItem?.day === meta.day && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </Modal>

        {/* Period Picker Modal */}
        <Modal
          visible={periodPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPeriodPickerVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPeriodPickerVisible(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Select Period</Text>
                <Pressable onPress={() => setPeriodPickerVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 300 }}>
                {(wizard.periodTimes.length > 0 ? wizard.periodTimes : storePeriodTimes).map((period) => (
                  <Pressable
                    key={period.periodNumber}
                    style={styles.simpleRow}
                    onPress={() => {
                      if (editingItem) {
                        controller.updateReviewItem(editingItem.id, {
                          periodNumber: period.periodNumber,
                        });
                      }
                      setPeriodPickerVisible(false);
                    }}
                  >
                    <Text style={styles.simpleRowText}>
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

        {/* Create Subject Modal */}
        <Modal
          visible={createSubjectModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateSubjectModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateSubjectModalVisible(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>{t("createSubject")}</Text>
                <Pressable onPress={() => setCreateSubjectModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                style={styles.inputField}
                placeholder={t("subjectName")}
                placeholderTextColor={colors.textMuted}
                value={newSubjName}
                onChangeText={setNewSubjName}
              />
              <TextInput
                style={styles.inputField}
                placeholder={t("teacherName")}
                placeholderTextColor={colors.textMuted}
                value={newSubjTeacher}
                onChangeText={setNewSubjTeacher}
              />
              <TextInput
                style={styles.inputField}
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
                      styles.paletteDot,
                      { backgroundColor: c },
                      newSubjColor === c && styles.paletteDotActive,
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

        {/* Rename Subject Everywhere Modal */}
        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRenameModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setRenameModalVisible(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Rename Everywhere</Text>
                <Pressable onPress={() => setRenameModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Text style={styles.modalFieldLabel}>Detected Name to Replace:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detectedChipsScroll}>
                {Array.from(new Set(wizard.reviewItems.map((i) => i.matchedSubjectName))).map((name) => (
                  <Pressable
                    key={name}
                    style={[
                      styles.detectedChip,
                      renameOldSubject === name && styles.detectedChipActive,
                    ]}
                    onPress={() => {
                      setRenameOldSubject(name);
                      setRenameNewName(name);
                    }}
                  >
                    <Text
                      style={[
                        styles.detectedChipText,
                        renameOldSubject === name && styles.detectedChipTextActive,
                      ]}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>New Canonical Name:</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Matematika"
                placeholderTextColor={colors.textMuted}
                value={renameNewName}
                onChangeText={setRenameNewName}
              />

              {subjects.length > 0 && (
                <>
                  <Text style={[styles.modalFieldLabel, { marginTop: 8 }]}>Or Link to Existing Subject:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.detectedChipsScroll}>
                    {subjects.map((sub) => {
                      const isSelected = renameTargetSubjectId === sub.id;
                      return (
                        <Pressable
                          key={sub.id}
                          style={[
                            styles.detectedChip,
                            isSelected && { borderColor: sub.color || sub.color_hex, backgroundColor: `${sub.color || sub.color_hex}22` },
                          ]}
                          onPress={() => {
                            setRenameTargetSubjectId(sub.id);
                            setRenameNewName(sub.name);
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: sub.color || sub.color_hex || colors.primary,
                              marginRight: 5,
                            }}
                          />
                          <Text style={[styles.detectedChipText, isSelected && { color: colors.text, fontWeight: "bold" }]}>
                            {sub.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Pressable
                  style={[styles.modalActionBtn, { flex: 1, backgroundColor: colors.surfaceSubtle }]}
                  onPress={() => setRenameModalVisible(false)}
                >
                  <Text style={[styles.modalActionBtnText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionPrimaryBtn, { flex: 1.5, marginTop: 0 }]}
                  onPress={handleApplyRenameEverywhere}
                >
                  <Text style={styles.actionPrimaryBtnText}>Apply Everywhere</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Copy Day Schedule Modal */}
        <Modal
          visible={copyReviewModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCopyReviewModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setCopyReviewModalVisible(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Copy Day Schedule</Text>
                <Pressable onPress={() => setCopyReviewModalVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Text style={styles.modalFieldLabel}>Source Day (Copy From):</Text>
              <View style={styles.daySelectorRow}>
                {WEEKDAYS_META.map((w) => {
                  const isSelected = copyReviewFromDay === w.day;
                  return (
                    <Pressable
                      key={w.day}
                      style={[styles.daySelectorChip, isSelected && styles.daySelectorChipActive]}
                      onPress={() => setCopyReviewFromDay(w.day)}
                    >
                      <Text
                        style={[
                          styles.daySelectorChipText,
                          isSelected && styles.daySelectorChipTextActive,
                        ]}
                      >
                        {getWeekdayShort(w.day)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>Target Day (Paste To):</Text>
              <View style={styles.daySelectorRow}>
                {WEEKDAYS_META.map((w) => {
                  const isSelected = copyReviewToDay === w.day;
                  const isSameDay = copyReviewFromDay === w.day;
                  return (
                    <Pressable
                      key={w.day}
                      disabled={isSameDay}
                      style={[
                        styles.daySelectorChip,
                        isSelected && styles.daySelectorChipActive,
                        isSameDay && { opacity: 0.3 },
                      ]}
                      onPress={() => setCopyReviewToDay(w.day)}
                    >
                      <Text
                        style={[
                          styles.daySelectorChipText,
                          isSelected && styles.daySelectorChipTextActive,
                        ]}
                      >
                        {getWeekdayShort(w.day)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalFieldLabel, { marginTop: 12 }]}>Paste Mode:</Text>
              <View style={styles.copyModeRow}>
                <Pressable
                  style={[
                    styles.copyModeChip,
                    copyReviewMode === "replace" && styles.copyModeChipActive,
                  ]}
                  onPress={() => setCopyReviewMode("replace")}
                >
                  <Text
                    style={[
                      styles.copyModeChipText,
                      copyReviewMode === "replace" && styles.copyModeChipTextActive,
                    ]}
                  >
                    Replace Target Day
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.copyModeChip,
                    copyReviewMode === "append" && styles.copyModeChipActive,
                  ]}
                  onPress={() => setCopyReviewMode("append")}
                >
                  <Text
                    style={[
                      styles.copyModeChipText,
                      copyReviewMode === "append" && styles.copyModeChipTextActive,
                    ]}
                  >
                    Append to Existing
                  </Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Pressable
                  style={[styles.modalActionBtn, { flex: 1, backgroundColor: colors.surfaceSubtle }]}
                  onPress={() => setCopyReviewModalVisible(false)}
                >
                  <Text style={[styles.modalActionBtnText, { color: colors.textSecondary }]}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionPrimaryBtn, { flex: 1.5, marginTop: 0 }]}
                  onPress={handleApplyCopyReviewDay}
                >
                  <Text style={styles.actionPrimaryBtnText}>Copy Schedule</Text>
                </Pressable>
              </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.xs,
    minWidth: 64,
  },
  headerNavBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
    marginLeft: 4,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerStepIndicator: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  headerStepTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 1,
  },
  progressBarRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSubtle,
  },
  progressBarSegmentActive: {
    backgroundColor: colors.primary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 60,
  },
  stepContainer: {
    gap: spacing.md,
  },
  stepSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  // Source Cards (Step 1)
  sourceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.04)",
  },
  sourceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sourceIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sourceDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.md,
  },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    gap: 6,
  },
  photoBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  expandedInputSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  sampleLinkRow: {
    alignItems: "flex-end",
    marginBottom: 6,
  },
  sampleLinkText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  textInputBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: spacing.md,
    fontSize: 13,
    minHeight: 110,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },

  // Manual Grid Elements
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPillActive: {
    backgroundColor: "rgba(58, 134, 255, 0.18)",
    borderColor: colors.primary,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  dayPillTextActive: {
    color: colors.primary,
  },
  dayPillBadge: {
    marginLeft: 4,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  dayPillBadgeActive: {
    backgroundColor: colors.primary,
  },
  dayPillBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  gridRowPeriod: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  gridRowTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  gridRowSubject: {
    fontSize: 13,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  gridRowEmpty: {
    fontSize: 12,
    color: colors.textMuted,
  },
  addPeriodManualBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceSubtle,
    gap: 6,
    marginBottom: 12,
  },
  addPeriodManualBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.primary,
  },

  // Step 2 Processing
  processingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    position: "relative",
    overflow: "hidden",
  },
  scanningShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
  },
  processingTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 4,
  },
  processingStageText: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    marginBottom: 16,
  },
  cancelScanBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  cancelScanBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semibold,
  },
  errorBox: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.rose,
    textAlign: "center",
  },

  // Step 3 Review
  reviewHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewCountSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(58, 134, 255, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  addSlotBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
    marginLeft: 3,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    textAlign: "center",
  },
  reviewTable: {
    gap: 8,
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
  rowDayPeriodCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 8,
  },
  pillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: radius.sm,
    gap: 2,
  },
  pillBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  rowSubjectCol: {
    flex: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowSubjectTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    lineHeight: 18,
    flexShrink: 1,
  },
  rowDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rowTimeText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  rowRoomText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  rowActionsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 6,
  },
  warningPill: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  warningPillText: {
    fontSize: 9,
    fontWeight: typography.fontWeights.bold,
    color: colors.amber,
  },
  deleteBtn: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Step 4 Bell Times
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  bellRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  bellLabel: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  bellInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bellInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    width: 65,
    textAlign: "center",
  },
  resetTimesBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resetTimesBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semibold,
  },

  // Step 5 Confirm & Save
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(58, 134, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  summaryTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summarySubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: "100%",
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  summaryInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  conflictBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  conflictTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  conflictMsg: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  conflictChoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  conflictChoiceBtnActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.08)",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
  },
  choiceTitle: {
    fontSize: 13,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  choiceSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  cleanSaveBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: radius.md,
    padding: spacing.md,
  },
  cleanSaveText: {
    fontSize: 13,
    color: colors.emerald,
    fontWeight: typography.fontWeights.semibold,
  },
  saveFinalBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  saveFinalBtnText: {
    fontSize: 15,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },

  // Button Utility
  actionPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimaryBtnText: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
    fontSize: 14,
  },
  stepButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: spacing.md,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalContent: {
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
  modalHeaderTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  subjectRowTitle: {
    fontSize: 14,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  subjectRowSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.08)",
  },
  modalActionBtnText: {
    fontSize: 13,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  clearBtn: {
    alignItems: "center",
    paddingVertical: 6,
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.rose,
  },
  simpleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  simpleRowText: {
    fontSize: 14,
    color: colors.text,
  },
  inputField: {
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
  paletteDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  paletteDotActive: {
    borderWidth: 3,
    borderColor: "#ffffff",
  },

  // ─── Step 3: Collapsible Day Sections & Problem Badges ───
  bulkToolsBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  bulkToolBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    minHeight: touchTarget.min,
  },
  bulkToolBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  daySectionsContainer: {
    gap: 12,
  },
  daySectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  daySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    minHeight: touchTarget.min,
  },
  daySectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  daySectionHeaderTitle: {
    fontSize: 14,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dayCountBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  dayCountBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  daySectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  problemBadgeAmber: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  problemBadgeAmberText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: "#F59E0B",
  },
  problemBadgeGreen: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  problemBadgeGreenText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.emerald,
  },
  daySectionContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 8,
  },
  daySectionFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    paddingHorizontal: 4,
    gap: 8,
  },
  dayAddSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: "rgba(58, 134, 255, 0.10)",
    minHeight: 38,
  },
  dayAddSlotBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  dayCopyBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    minHeight: 38,
  },
  dayCopyBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },

  // ─── Bulk Modals Styling ───
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  detectedChipsScroll: {
    marginBottom: 6,
  },
  detectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: 6,
  },
  detectedChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.15)",
  },
  detectedChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detectedChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  daySelectorRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  daySelectorChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daySelectorChipActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(58, 134, 255, 0.15)",
  },
  daySelectorChipText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  daySelectorChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  copyModeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  copyModeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyModeChipActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
  },
  copyModeChipText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  copyModeChipTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeights.bold,
  },
  clipboardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clipboardActionBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  freeFormatHintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.xs,
    fontStyle: "italic",
  },
  dayChainPreviewBox: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayChainPreviewText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
});
