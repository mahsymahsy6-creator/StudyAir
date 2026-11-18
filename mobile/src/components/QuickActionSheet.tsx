import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { colors, spacing, radius, typography, touchTarget, tidySpacing } from "../theme";
import { useMobileStudyStore } from "../store";
import { t } from "../lib/i18n";
import { Task, TaskType, Subject, DeadlineMode } from "../types";
import { format, addDays, parseISO } from "date-fns";
import { calculateNextClassDeadline } from "../engine/deadlineEngine";
import { parseIndonesianDateHint } from "../engine/dateHintParser";
import { resolveIndonesianSubject } from "../lib/subjectDictionary";
import { formatLocaleDate } from "../lib/dateUtils";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";
import { buildSchedule, extractBusyBlocksFromTimetable } from "../engine/schedulerEngine";
import {
  extractTasksFromAI,
  createFallbackTaskFromText,
  splitCompoundTaskClauses,
  suggestTaskDuration,
} from "../services/aiService";
import { AddTaskSheet } from "./tasks/AddTaskSheet";
import { AddGradeSheet } from "./grades/AddGradeSheet";
import {
  DeadlinePickerStrip,
  formatDeadlineRelativeInfo,
} from "./tasks/DeadlinePickerStrip";
import { PrimaryButton } from "./common/PrimaryButton";

export interface QuickActionSheetProps {
  visible: boolean;
  initialMode?: "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addFromText" | "addGrade";
  onClose: () => void;
  onNavigateToScan: (mode: "timetable" | "whiteboard") => void;
  onNavigateToTimetable?: () => void;
}

interface ParsedBatchTask {
  id: string;
  title: string;
  subjectId: string;
  type: TaskType;
  deadlineDate: string;
  deadlineLabel: string;
  deadlineMode: DeadlineMode;
  datePhrase?: string;
  notes?: string;
  estimatedMinutes?: number;
}

const TASK_TYPE_OPTIONS: { key: TaskType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "homework", label: "PR", icon: "document-text-outline" },
  { key: "quiz", label: "Kuis", icon: "help-circle-outline" },
  { key: "project", label: "Proyek", icon: "layers-outline" },
];

export function QuickActionSheet({
  visible,
  initialMode = "none",
  onClose,
  onNavigateToScan,
  onNavigateToTimetable,
}: QuickActionSheetProps) {
  const {
    subjects,
    tasks,
    timetableEntries,
    periodTimes,
    daysOff,
    overrides,
    schedulePrefs,
    addTask,
    addSubject,
    addGrade,
    applySchedule,
  } = useMobileStudyStore();

  // Modal sub-flows
  const [activeModal, setActiveModal] = useState<
    "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addFromText" | "addGrade"
  >("none");

  // Add Subject Form State
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#3A86FF");
  const [subjectTeacher, setSubjectTeacher] = useState("");
  const [subjectRoom, setSubjectRoom] = useState("");
  const [subjectBringItems, setSubjectBringItems] = useState("");
  const [subjectNameError, setSubjectNameError] = useState("");

  // Add From Text State
  const [whatsappText, setWhatsappText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [batchStep, setBatchStep] = useState<"input" | "review">("input");
  const [parsedBatchTasks, setParsedBatchTasks] = useState<ParsedBatchTask[]>([]);
  const [expandedDeadlineId, setExpandedDeadlineId] = useState<string | null>(null);
  const [autoScheduleBatch, setAutoScheduleBatch] = useState(true);
  const [returnToBatchItemId, setReturnToBatchItemId] = useState<string | null>(null);

  const PALETTE = [
    "#3A86FF",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#EC4899",
  ];

  // Sync initialMode when sheet opens
  useEffect(() => {
    if (visible) {
      if (initialMode && initialMode !== "none") {
        if (initialMode === "addTask") {
          handleOpenAddTask();
        } else if (initialMode === "addGrade") {
          setActiveModal("addGrade");
        } else if (initialMode === "pasteWhatsApp" || initialMode === "addFromText") {
          handleOpenAddFromText();
        } else if (initialMode === "addSubject") {
          handleOpenAddSubject();
        } else {
          setActiveModal(initialMode as any);
        }
      }
    } else {
      setActiveModal("none");
      setBatchStep("input");
      setIsExtracting(false);
      setExtractError(null);
    }
  }, [visible, initialMode]);

  // Today reference (fresh on render so it updates after midnight)
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const handleOpenAddTask = () => {
    setActiveModal("addTask");
  };

  const handleOpenAddSubject = () => {
    setSubjectName("");
    setSubjectColor("#3A86FF");
    setSubjectTeacher("");
    setSubjectRoom("");
    setSubjectBringItems("");
    setSubjectNameError("");
    setActiveModal("addSubject");
  };

  const handleSaveSubject = () => {
    if (!subjectName.trim()) {
      setSubjectNameError(t("errorTitleRequired"));
      return;
    }

    const items = subjectBringItems
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const created = addSubject({
      name: subjectName.trim(),
      color: subjectColor,
      teacher: subjectTeacher.trim() || undefined,
      room: subjectRoom.trim() || undefined,
      bringItems: items,
      examDate: undefined,
    });

    if (returnToBatchItemId) {
      handleUpdateBatchItemSubject(returnToBatchItemId, created.id);
      setReturnToBatchItemId(null);
      setActiveModal("addFromText");
      return;
    }

    setActiveModal("none");
    onClose();
  };

  const handleOpenAddFromText = () => {
    setIsExtracting(false);
    setExtractError(null);
    setBatchStep("input");
    setActiveModal("addFromText");
  };

  const handleOpenPasteWhatsApp = () => {
    handleOpenAddFromText();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setWhatsappText(text.trim());
        setExtractError(null);
      } else {
        Alert.alert(t("quickActionsTitle"), "Clipboard masih kosong.");
      }
    } catch (err) {
      console.warn("[QuickAction] Clipboard paste error:", err);
    }
  };

  const formatBatchDeadlineLabel = (
    dateStr: string,
    mode: DeadlineMode
  ): string => {
    if (mode === "nextClass") {
      return `Kelas Depan (${formatLocaleDate(dateStr, "EEE, d MMM")})`;
    }
    if (mode === "afterNClasses") {
      return `2 Pertemuan (${formatLocaleDate(dateStr, "EEE, d MMM")})`;
    }
    const rel = formatDeadlineRelativeInfo(dateStr, todayStr);
    return `${rel.relativeLabel} (${formatLocaleDate(dateStr, "EEE, d MMM")})`;
  };

  const handleExtractTasksFromAI = async () => {
    const clean = whatsappText.trim();
    if (!clean) {
      Alert.alert(t("quickActionsTitle"), "Tempel atau ketik catatan tugas terlebih dahulu.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const res = await extractTasksFromAI(clean, undefined, 20000);
      const rawTasks = res.tasks || [];

      if (rawTasks.length === 0) {
        throw new Error("Tidak ada tugas yang terdeteksi dari teks.");
      }

      const parsed: ParsedBatchTask[] = rawTasks.map((item, idx) => {
        // Match subject by name/title or aliases
        let matchedSubject = subjects.find((s) => {
          if (!item.subject) return false;
          const subLower = item.subject.toLowerCase();
          return (
            s.name.toLowerCase() === subLower ||
            (s.title && s.title.toLowerCase() === subLower) ||
            s.aliases?.some((a) => a.toLowerCase() === subLower)
          );
        });

        if (!matchedSubject && item.subject) {
          const dict = resolveIndonesianSubject(item.subject);
          matchedSubject = subjects.find(
            (s) =>
              s.name.toLowerCase() === dict.canonicalName.toLowerCase() ||
              s.aliases?.some((a) => dict.aliases.includes(a.toLowerCase()))
          );
        }

        const targetSub = matchedSubject || subjects[idx % (subjects.length || 1)] || subjects[0];
        const targetId = targetSub?.id || "general";

        // Deadline = Date hint from AI datePhrase / title / notes if present, else Next class of that subject
        const isExplicitNextClass =
          item.datePhrase && /pertemuan|kelas\s+depan|next\s+class/i.test(item.datePhrase);
        const dateHint = !isExplicitNextClass
          ? (item.datePhrase ? parseIndonesianDateHint(item.datePhrase, todayStr) : null) ||
            parseIndonesianDateHint(item.title || "", todayStr) ||
            (item.notes ? parseIndonesianDateHint(item.notes, todayStr) : null)
          : null;
        const nextRes = calculateNextClassDeadline(targetId, todayStr, timetableEntries, {
          daysOff,
          overrides,
          afterNClasses: 1,
        });

        let deadlineDate = "";
        let deadlineLabel = "";
        let deadlineMode: DeadlineMode = "nextClass";

        if (dateHint) {
          deadlineDate = dateHint.suggestedDate;
          deadlineMode = "custom";
          deadlineLabel = formatBatchDeadlineLabel(deadlineDate, deadlineMode);
        } else if (nextRes.found && nextRes.deadlineDate) {
          deadlineDate = nextRes.deadlineDate;
          deadlineMode = "nextClass";
          deadlineLabel = formatBatchDeadlineLabel(deadlineDate, deadlineMode);
        } else {
          deadlineDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
          deadlineMode = "custom";
          deadlineLabel = formatBatchDeadlineLabel(deadlineDate, deadlineMode);
        }

        const duration = suggestTaskDuration(item.title, item.type || "homework");
        return {
          id: `ai-task-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: item.title,
          subjectId: targetId,
          type: item.type || "homework",
          deadlineDate,
          deadlineLabel,
          deadlineMode,
          datePhrase: item.datePhrase,
          notes: item.notes?.trim() || undefined,
          estimatedMinutes: duration,
        };
      });

      setParsedBatchTasks(parsed);
      setExpandedDeadlineId(null);
      setAutoScheduleBatch(true);
      setBatchStep("review");
    } catch (err: any) {
      console.warn("[QuickAction] AI Task extraction failed:", err);
      // On failure show friendly message and KEEP the pasted text
      setExtractError(
        "Gagal mengekstrak tugas dengan AI (batas waktu 20 dtk atau server tidak terjangkau). Teks kamu tetap tersimpan di bawah."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyFallback = () => {
    const clean = whatsappText.trim();
    if (!clean) {
      Alert.alert(t("quickActionsTitle"), "Tempel atau ketik catatan tugas terlebih dahulu.");
      return;
    }

    // Fallback: 1 task with pasted text as notes, subject matched by alias, deadline = next class
    const fallback = createFallbackTaskFromText(clean, subjects, timetableEntries, todayStr, {
      daysOff,
      overrides,
    });

    setParsedBatchTasks([
      {
        ...fallback,
        deadlineMode: fallback.deadlineMode || "nextClass",
      },
    ]);
    setExpandedDeadlineId(null);
    setAutoScheduleBatch(true);
    setBatchStep("review");
  };

  // ─── Step 2 of Batch: Commit All Reviewed Tasks ───
  const handleSaveBatchTasks = () => {
    const validItems = parsedBatchTasks.filter((item) => item.title.trim().length > 0);
    if (validItems.length === 0) {
      Alert.alert("Tidak Ada Tugas", "Tambahkan minimal 1 judul tugas sebelum menyimpan.");
      return;
    }

    HapticFeedback.success();
    const createdTasks: Task[] = [];
    for (const item of validItems) {
      const created = addTask({
        title: item.title.trim(),
        subjectId: item.subjectId,
        type: item.type,
        givenDate: todayStr,
        deadlineDate: item.deadlineDate,
        deadlineMode: item.deadlineMode || "custom",
        estimatedMinutes: item.estimatedMinutes || 30,
        notes: item.notes?.trim() || undefined,
      });
      createdTasks.push(created);
    }

    let scheduledBlocksCount = 0;
    if (autoScheduleBatch && createdTasks.length > 0) {
      try {
        const horizonEndStr = format(addDays(parseISO(todayStr), 14), "yyyy-MM-dd");
        const busyBlocks = extractBusyBlocksFromTimetable({
          timetableEntries,
          periodTimes,
          daysOff,
          overrides,
          startDate: todayStr,
          endDate: horizonEndStr,
        });
        const createdIds = new Set(createdTasks.map((tk) => tk.id));
        const pendingAll = [
          ...tasks.filter((tk) => tk.status === "PENDING" && !createdIds.has(tk.id)),
          ...createdTasks,
        ];
        const scheduledRes = buildSchedule({
          tasks: pendingAll,
          busyBlocks,
          prefs: schedulePrefs,
          referenceDate: todayStr,
        });
        if (scheduledRes.blocks.length > 0) {
          applySchedule(scheduledRes.blocks);
          scheduledBlocksCount = scheduledRes.blocks.filter((b) => createdIds.has(b.taskId)).length;
        }
      } catch {
        // Ignore auto-schedule error
      }
    }

    setActiveModal("none");
    setBatchStep("input");
    setParsedBatchTasks([]);
    setExpandedDeadlineId(null);
    setIsExtracting(false);
    setExtractError(null);
    onClose();

    Alert.alert(
      t("taskAddedSuccess") || "Tugas Berhasil Disimpan",
      scheduledBlocksCount > 0
        ? `${createdTasks.length} tugas ditambahkan dengan ${scheduledBlocksCount} blok belajar terjadwal.`
        : `${createdTasks.length} tugas berhasil ditambahkan ke daftar Tugas.`
    );
  };

  const handleUpdateBatchItemDeadlineDirect = (
    id: string,
    dateStr: string,
    mode: DeadlineMode
  ) => {
    setParsedBatchTasks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          deadlineDate: dateStr,
          deadlineMode: mode,
          deadlineLabel: formatBatchDeadlineLabel(dateStr, mode),
        };
      })
    );
  };

  const handleStepBatchItemDeadline = (id: string, deltaDays: number) => {
    HapticFeedback.light();
    setParsedBatchTasks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        try {
          const nextDate = format(addDays(parseISO(item.deadlineDate || todayStr), deltaDays), "yyyy-MM-dd");
          return {
            ...item,
            deadlineDate: nextDate,
            deadlineMode: "custom",
            deadlineLabel: formatBatchDeadlineLabel(nextDate, "custom"),
          };
        } catch {
          return item;
        }
      })
    );
  };

  const handleUpdateBatchItemType = (id: string, type: TaskType) => {
    HapticFeedback.light();
    setParsedBatchTasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, type } : item))
    );
  };

  const handleSplitBatchItemByClause = (id: string) => {
    HapticFeedback.light();
    setParsedBatchTasks((prev) => {
      const next: ParsedBatchTask[] = [];
      for (const item of prev) {
        if (item.id !== id) {
          next.push(item);
          continue;
        }
        const parts = splitCompoundTaskClauses(item.title);
        if (parts.length <= 1) {
          const commaParts = item.title
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 2);
          if (commaParts.length <= 1) {
            next.push(item);
            continue;
          }
          commaParts.forEach((partTitle, idx) => {
            next.push({
              ...item,
              id: `${item.id}-split-${idx}-${Date.now()}`,
              title: partTitle,
            });
          });
        } else {
          parts.forEach((partTitle, idx) => {
            next.push({
              ...item,
              id: `${item.id}-split-${idx}-${Date.now()}`,
              title: partTitle,
            });
          });
        }
      }
      return next;
    });
  };

  const handleAddEmptyBatchItem = () => {
    HapticFeedback.light();
    const defaultSubId = parsedBatchTasks[0]?.subjectId || subjects[0]?.id || "general";
    const nextRes = calculateNextClassDeadline(defaultSubId, todayStr, timetableEntries, {
      daysOff,
      overrides,
      afterNClasses: 1,
    });
    const deadlineMode: DeadlineMode = nextRes.found && nextRes.deadlineDate ? "nextClass" : "custom";
    const deadlineDate =
      nextRes.found && nextRes.deadlineDate
        ? nextRes.deadlineDate
        : format(addDays(parseISO(todayStr), 1), "yyyy-MM-dd");

    setParsedBatchTasks((prev) => [
      ...prev,
      {
        id: `manual-batch-${Date.now()}`,
        title: "",
        subjectId: defaultSubId,
        type: "homework",
        deadlineDate,
        deadlineMode,
        deadlineLabel: formatBatchDeadlineLabel(deadlineDate, deadlineMode),
        estimatedMinutes: 30,
      },
    ]);
  };

  const handleUpdateBatchItemDuration = (id: string, mins: number) => {
    HapticFeedback.light();
    setParsedBatchTasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, estimatedMinutes: mins } : item))
    );
  };

  const handleUpdateBatchItemTitle = (id: string, newTitle: string) => {
    setParsedBatchTasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  };

  const handleUpdateBatchItemSubject = (id: string, newSubjectId: string) => {
    HapticFeedback.light();
    setParsedBatchTasks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Only recalculate automatic class-based deadlines when deadlineMode follows class schedule
        if (item.deadlineMode === "nextClass" || item.deadlineMode === "afterNClasses") {
          const nextRes = calculateNextClassDeadline(newSubjectId, todayStr, timetableEntries, {
            daysOff,
            overrides,
            afterNClasses: item.deadlineMode === "afterNClasses" ? 2 : 1,
          });
          if (nextRes.found && nextRes.deadlineDate) {
            return {
              ...item,
              subjectId: newSubjectId,
              deadlineDate: nextRes.deadlineDate,
              deadlineLabel: formatBatchDeadlineLabel(nextRes.deadlineDate, item.deadlineMode),
            };
          }
        }
        return {
          ...item,
          subjectId: newSubjectId,
        };
      })
    );
  };

  const handleDeleteBatchItem = (id: string) => {
    HapticFeedback.light();
    setParsedBatchTasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateBatchItemNotes = (id: string, newNotes: string) => {
    setParsedBatchTasks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes: newNotes } : item))
    );
  };

  return (
    <>
      <Modal
        visible={visible && activeModal !== "addTask"}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (activeModal !== "none") {
            setActiveModal("none");
          } else {
            onClose();
          }
        }}
      >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropTouch}
          onPress={() => {
            if (activeModal !== "none") {
              setActiveModal("none");
            } else {
              onClose();
            }
          }}
        />

        {/* ─── MINIMALIST 3-CARD GRID QUICK ACTIONS (Catat Nilai Baru & onNavigateToTimetable moved to Settings/Tabs) ─── */}
        {activeModal === "none" && (
          <View style={styles.compactSheetContainer}>
            <View style={styles.handleBar} />

            <View style={styles.gridHeader}>
              <Text style={styles.gridHeaderTitle}>{t("quickActionsTitle") || "Buat Baru"}</Text>
              <Text style={styles.gridHeaderSub}>{t("quick_actions_sub")}</Text>
            </View>

            <View style={styles.cardsGridList}>
              {/* Card 1: Manual Task */}
              <Pressable
                style={styles.gridCard}
                onPress={handleOpenAddTask}
                accessibilityLabel={t("tugas_baru")}
              >
                <View style={[styles.gridIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </View>
                <View style={styles.gridCardContent}>
                  <Text style={styles.gridCardTitle}>{t("tugas_baru") || "Tugas Baru"}</Text>
                  <Text style={styles.gridCardSub}>
                    {t("quick_action_tugas_baru_sub") || "Catat tugas atau PR manual (< 5 detik)"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              {/* Card 2: Dari Foto (Camera Scan AI) */}
              <Pressable
                style={[styles.gridCard, styles.aiCardBorder]}
                onPress={() => {
                  onClose();
                  onNavigateToScan("whiteboard");
                }}
                accessibilityLabel={t("dari_foto")}
              >
                <View style={[styles.gridIconCircle, { backgroundColor: colors.accentLight }]}>
                  <Ionicons name="camera" size={22} color={colors.accent} />
                </View>
                <View style={styles.gridCardContent}>
                  <View style={styles.aiTitleRow}>
                    <Text style={styles.gridCardTitle}>{t("dari_foto") || "Dari Foto"}</Text>
                    <View style={styles.aiBadgePill}>
                      <Ionicons name="sparkles" size={10} color={colors.textInverse} style={{ marginRight: 2 }} />
                      <Text style={styles.aiBadgePillText}>AI</Text>
                    </View>
                  </View>
                  <Text style={styles.gridCardSub}>
                    {t("quick_action_scan_ai_sub") || "Pindai dari papan tulis atau buku"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </Pressable>

              {/* Card 3: Dari Teks (WhatsApp Text AI) */}
              <Pressable
                style={[styles.gridCard, styles.aiCardBorder]}
                onPress={handleOpenAddFromText}
                accessibilityLabel={t("dari_teks")}
              >
                <View style={[styles.gridIconCircle, { backgroundColor: colors.accentLight }]}>
                  <Ionicons name="document-text" size={22} color={colors.accent} />
                </View>
                <View style={styles.gridCardContent}>
                  <View style={styles.aiTitleRow}>
                    <Text style={styles.gridCardTitle}>{t("dari_teks") || "Dari Teks"}</Text>
                    <View style={styles.aiBadgePill}>
                      <Ionicons name="sparkles" size={10} color={colors.textInverse} style={{ marginRight: 2 }} />
                      <Text style={styles.aiBadgePillText}>AI</Text>
                    </View>
                  </View>
                  <Text style={styles.gridCardSub}>
                    {t("quick_action_tempel_ai_sub") || "Ekstrak tugas dari pesan WhatsApp"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.accent} />
              </Pressable>
            </View>
          </View>
        )}



        {/* ─── Sub-Modal: Add Subject ─── */}
        {activeModal === "addSubject" && (
          <View style={styles.sheetContainer}>
            <View style={styles.handleBar} />
            <View style={styles.sheetHeader}>
              <Pressable
                onPress={() => {
                  if (returnToBatchItemId) {
                    setReturnToBatchItemId(null);
                    setActiveModal("addFromText");
                  } else {
                    setActiveModal("none");
                  }
                }}
                hitSlop={12}
                style={styles.headerBackBtn}
              >
                <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>{t("createSubject")}</Text>
              <Pressable onPress={handleSaveSubject} style={styles.saveHeaderBtn}>
                <Text style={styles.saveHeaderBtnText}>{t("save")}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("subjectName")}</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    subjectNameError ? styles.inputErrorBorder : null,
                  ]}
                  placeholder="e.g. Matematika, Fisika, B. Inggris"
                  placeholderTextColor={colors.textMuted}
                  value={subjectName}
                  onChangeText={(val) => {
                    setSubjectName(val);
                    if (subjectNameError) setSubjectNameError("");
                  }}
                  autoFocus
                />
                {subjectNameError ? (
                  <Text style={styles.inputErrorText}>{subjectNameError}</Text>
                ) : null}
              </View>

              {/* Color picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("color")}</Text>
                <View style={styles.colorPaletteRow}>
                  {PALETTE.map((color) => {
                    const isSelected = subjectColor === color;
                    return (
                      <Pressable
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color },
                          isSelected && styles.colorCircleSelected,
                        ]}
                        onPress={() => setSubjectColor(color)}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("teacherName")}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Pak Budi Santoso"
                  placeholderTextColor={colors.textMuted}
                  value={subjectTeacher}
                  onChangeText={setSubjectTeacher}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("room")}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Lab Fisika, Ruang 10-A"
                  placeholderTextColor={colors.textMuted}
                  value={subjectRoom}
                  onChangeText={setSubjectRoom}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("bringItems")}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Buku Paket, Busur, Penggaris"
                  placeholderTextColor={colors.textMuted}
                  value={subjectBringItems}
                  onChangeText={setSubjectBringItems}
                />
              </View>

              <Pressable style={styles.primaryActionBtn} onPress={handleSaveSubject}>
                <Ionicons name="add-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionBtnText}>{t("createSubject")}</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* ─── Sub-Modal: Add From Text (with AI extraction & Fallback) ─── */}
        {(activeModal === "pasteWhatsApp" || activeModal === "addFromText") && (
          <View style={styles.sheetContainer}>
            <View style={styles.handleBar} />
            <View style={styles.sheetHeader}>
              <Pressable
                onPress={() => {
                  if (batchStep === "review") {
                    setBatchStep("input");
                  } else {
                    setActiveModal("none");
                  }
                }}
                hitSlop={12}
                style={styles.headerBackBtn}
                accessibilityLabel="Kembali"
              >
                <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>
                {batchStep === "input" ? "Tambah dari Teks" : `Tinjau Tugas (${parsedBatchTasks.length})`}
              </Text>
              <Pressable
                onPress={() => {
                  setActiveModal("none");
                  onClose();
                }}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityLabel="Tutup"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {batchStep === "input" ? (
              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Pesan atau Catatan</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaLarge]}
                    placeholder="Tempel pesan atau catatan tugas di sini...&#10;cth: Besok PR Matematika hal 45 no 1-5 dikumpul hari Senin. Biologi bikin rangkuman Bab 3 ya."
                    placeholderTextColor={colors.textMuted}
                    value={whatsappText}
                    onChangeText={(val) => {
                      setWhatsappText(val);
                      if (extractError) setExtractError(null);
                    }}
                    multiline
                    numberOfLines={8}
                    autoFocus
                  />
                </View>

                {/* Paste from clipboard & Extract tasks action buttons */}
                <View style={styles.textActionButtonsRow}>
                  <Pressable
                    style={styles.clipboardBtn}
                    onPress={handlePasteFromClipboard}
                    disabled={isExtracting}
                  >
                    <Ionicons name="clipboard-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.clipboardBtnText}>{t("paste_clipboard_btn")}</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.extractBtn, isExtracting && styles.extractBtnDisabled]}
                    onPress={handleExtractTasksFromAI}
                    disabled={isExtracting}
                  >
                    {isExtracting ? (
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
                    ) : (
                      <Ionicons name="sparkles" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.extractBtnText}>
                      {isExtracting ? t("extracting_tasks_btn") : t("extract_tasks_btn")}
                    </Text>
                  </Pressable>
                </View>

                {/* Loading state indicator */}
                {isExtracting && (
                  <View style={styles.loadingStateBanner}>
                    <Text style={styles.loadingStateText}>
                      Menganalisis tugas dengan AI (batas 20 dtk)...
                    </Text>
                  </View>
                )}

                {/* Friendly Error Message + KEEP pasted text + Fallback Offer */}
                {extractError && (
                  <View style={styles.errorBanner}>
                    <View style={styles.errorBannerHeader}>
                      <Ionicons name="alert-circle-outline" size={20} color={colors.amber} style={{ marginRight: 8, marginTop: 1 }} />
                      <Text style={styles.errorBannerText}>{extractError}</Text>
                    </View>
                    <Pressable style={styles.fallbackBtn} onPress={handleApplyFallback}>
                      <Ionicons name="flash" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fallbackBtnTitle}>Simpan Tanpa AI (1 Tugas)</Text>
                        <Text style={styles.fallbackBtnSub}>
                          Buat 1 tugas dengan teks di atas sebagai catatan dan tenggat pertemuan berikutnya.
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            ) : (
              /* Review Step — Overhauled clean Indonesian card UI */
              <>
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.reviewScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.reviewSubTitle}>
                    Periksa mata pelajaran, jenis, dan tenggat sebelum disimpan ke jadwal.
                  </Text>

                  {parsedBatchTasks.map((item, idx) => {
                    const sub = subjects.find((s) => s.id === item.subjectId);
                    const subColor = sub?.color || sub?.color_hex || colors.primary;
                    const relInfo = formatDeadlineRelativeInfo(item.deadlineDate, todayStr);
                    const isExpanded = expandedDeadlineId === item.id;
                    const compoundParts = splitCompoundTaskClauses(item.title);
                    const rawCommaParts = item.title
                      .split(/[,;\n]+/)
                      .map((s) => s.trim())
                      .filter((s) => s.length > 2);
                    const splitPreviewCount =
                      compoundParts.length > 1
                        ? compoundParts.length
                        : rawCommaParts.length >= 2 && item.title.length > 28
                        ? rawCommaParts.length
                        : 0;

                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.batchReviewCard,
                          { borderLeftWidth: 4, borderLeftColor: subColor },
                        ]}
                      >
                        {/* Row 1: Editable Task Type Pills + Index + Trash */}
                        <View style={styles.batchCardHeader}>
                          <View style={styles.typeSelectorGroup}>
                            {TASK_TYPE_OPTIONS.map((opt) => {
                              const isTypeActive = item.type === opt.key;
                              return (
                                <Pressable
                                  key={opt.key}
                                  style={[
                                    styles.typePillBtn,
                                    isTypeActive && {
                                      backgroundColor: colors.primaryLight,
                                      borderColor: colors.primary,
                                    },
                                  ]}
                                  onPress={() => handleUpdateBatchItemType(item.id, opt.key)}
                                >
                                  <Text
                                    style={[
                                      styles.typePillBtnText,
                                      isTypeActive && styles.typePillBtnTextActive,
                                    ]}
                                  >
                                    {opt.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>

                          <View style={styles.cardHeaderRight}>
                            <Text style={styles.cardIndexTag}>#{idx + 1}</Text>
                            <Pressable
                              hitSlop={8}
                              onPress={() => handleDeleteBatchItem(item.id)}
                              style={styles.deleteBatchBtn}
                              accessibilityLabel="Hapus tugas ini"
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.rose} />
                            </Pressable>
                          </View>
                        </View>

                        {/* Row 2: Multiline Task Title */}
                        <Text style={styles.fieldMiniLabel}>Judul Tugas</Text>
                        <TextInput
                          style={styles.batchTitleInput}
                          value={item.title}
                          onChangeText={(txt) => handleUpdateBatchItemTitle(item.id, txt)}
                          placeholder="Tulis judul tugas..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                        />

                        {/* Optional 1-Tap Split Helper for Compound Lists */}
                        {splitPreviewCount > 1 && (
                          <Pressable
                            style={styles.splitHelperBtn}
                            onPress={() => handleSplitBatchItemByClause(item.id)}
                          >
                            <Ionicons name="cut-outline" size={13} color={colors.accent} />
                            <Text style={styles.splitHelperText}>
                              Pisahkan menjadi {splitPreviewCount} tugas terpisah
                            </Text>
                          </Pressable>
                        )}

                        {/* Row 3: Subject Selector */}
                        <Text style={styles.fieldMiniLabel}>Mata Pelajaran</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.batchChipsRow}
                        >
                          {subjects.map((s) => {
                            const sColor = s.color || s.color_hex || colors.primary;
                            const isCur = s.id === item.subjectId;
                            return (
                              <Pressable
                                key={s.id}
                                style={[
                                  styles.batchChip,
                                  isCur && {
                                    backgroundColor: sColor,
                                    borderColor: sColor,
                                  },
                                ]}
                                onPress={() => handleUpdateBatchItemSubject(item.id, s.id)}
                              >
                                <View
                                  style={[
                                    styles.subjectChipDot,
                                    { backgroundColor: isCur ? "#FFFFFF" : sColor },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.batchChipText,
                                    isCur && styles.batchChipTextActive,
                                  ]}
                                >
                                  {s.name || s.title}
                                </Text>
                              </Pressable>
                            );
                          })}
                          <Pressable
                            style={[
                              styles.batchChip,
                              {
                                backgroundColor: colors.surfaceSubtle,
                                borderColor: colors.primary,
                                borderWidth: 1,
                                borderStyle: "dashed",
                              },
                            ]}
                            onPress={() => {
                              soundFX?.playClick?.();
                              HapticFeedback?.light?.();
                              setSubjectName("");
                              setSubjectColor(PALETTE[0]);
                              setSubjectBringItems("");
                              setSubjectTeacher("");
                              setSubjectRoom("");
                              setSubjectNameError("");
                              setReturnToBatchItemId(item.id);
                              setActiveModal("addSubject");
                            }}
                          >
                            <Ionicons name="add" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={[styles.batchChipText, { color: colors.primary, fontWeight: typography.fontWeights.bold }]}>
                              Tambah Mapel
                            </Text>
                          </Pressable>
                        </ScrollView>

                        {/* Row 4: Class-Aware Deadline Summary + Steppers + Expandable 14-Day Calendar Strip */}
                        <View style={styles.deadlineBox}>
                          <View style={styles.deadlineBoxHeader}>
                            <View style={styles.deadlineSummaryLeft}>
                              <Ionicons
                                name={item.deadlineMode === "nextClass" ? "school-outline" : "calendar-outline"}
                                size={15}
                                color={colors.primary}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.deadlineDateHeadline} numberOfLines={1}>
                                  {item.deadlineMode === "nextClass" ? "Kelas Depan • " : ""}
                                  {relInfo.shortDateLabel}
                                </Text>
                                <Text style={styles.deadlineRelativeSub} numberOfLines={1}>
                                  {relInfo.relativeLabel}
                                  {item.datePhrase ? ` • Dari teks: "${item.datePhrase}"` : ""}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.deadlineActionControls}>
                              <Pressable
                                style={styles.stepMiniBtn}
                                onPress={() => handleStepBatchItemDeadline(item.id, -1)}
                                accessibilityLabel="Majukan tenggat 1 hari"
                              >
                                <Text style={styles.stepMiniBtnText}>-1h</Text>
                              </Pressable>
                              <Pressable
                                style={styles.stepMiniBtn}
                                onPress={() => handleStepBatchItemDeadline(item.id, 1)}
                                accessibilityLabel="Undurkan tenggat 1 hari"
                              >
                                <Text style={styles.stepMiniBtnText}>+1h</Text>
                              </Pressable>
                              <Pressable
                                style={[
                                  styles.calendarToggleBtn,
                                  isExpanded && styles.calendarToggleBtnActive,
                                ]}
                                onPress={() => {
                                  HapticFeedback.light();
                                  setExpandedDeadlineId(isExpanded ? null : item.id);
                                }}
                              >
                                <Ionicons
                                  name={isExpanded ? "chevron-up" : "calendar"}
                                  size={12}
                                  color={isExpanded ? colors.textInverse : colors.primary}
                                />
                                <Text
                                  style={[
                                    styles.calendarToggleBtnText,
                                    isExpanded && { color: colors.textInverse },
                                  ]}
                                >
                                  {isExpanded ? "Tutup" : "Ubah"}
                                </Text>
                              </Pressable>
                            </View>
                          </View>

                          {isExpanded && (
                            <View style={styles.expandedStripWrap}>
                              <DeadlinePickerStrip
                                todayStr={todayStr}
                                subjectId={item.subjectId}
                                subjectName={sub?.name}
                                subjectColor={subColor}
                                selectedDate={item.deadlineDate}
                                deadlineMode={item.deadlineMode}
                                timetableEntries={timetableEntries}
                                daysOff={daysOff}
                                overrides={overrides}
                                compact
                                onSelectDeadline={(dateStr, mode) =>
                                  handleUpdateBatchItemDeadlineDirect(item.id, dateStr, mode)
                                }
                              />
                            </View>
                          )}
                        </View>

                        {/* Row 5: Estimasi Waktu */}
                        <View style={styles.batchDurationRow}>
                          <Text style={styles.batchDurationLabel}>Estimasi:</Text>
                          <View style={styles.batchDurationChips}>
                            {[15, 30, 45, 60, 90].map((mins) => {
                              const isCur = (item.estimatedMinutes || 30) === mins;
                              return (
                                <Pressable
                                  key={mins}
                                  style={[
                                    styles.batchDurationChip,
                                    isCur && styles.batchDurationChipActive,
                                  ]}
                                  onPress={() => handleUpdateBatchItemDuration(item.id, mins)}
                                >
                                  <Text
                                    style={[
                                      styles.batchDurationChipText,
                                      isCur && styles.batchDurationChipTextActive,
                                    ]}
                                  >
                                    {mins}m
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {/* Row 6: Optional Notes */}
                        {item.notes !== undefined ? (
                          <View style={styles.notesBox}>
                            <Text style={styles.notesLabel}>Catatan / Instruksi (opsional)</Text>
                            <TextInput
                              style={styles.notesInput}
                              value={item.notes}
                              placeholder="Tambahkan halaman atau catatan..."
                              placeholderTextColor={colors.textMuted}
                              onChangeText={(txt) => handleUpdateBatchItemNotes(item.id, txt)}
                              multiline
                            />
                          </View>
                        ) : (
                          <Pressable
                            style={styles.addNoteChipBtn}
                            onPress={() => handleUpdateBatchItemNotes(item.id, "")}
                          >
                            <Ionicons name="add-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.addNoteChipText}>Tambah Catatan</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}

                  {/* Add Another Task Row */}
                  <Pressable
                    style={styles.addMoreBatchBtn}
                    onPress={handleAddEmptyBatchItem}
                  >
                    <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                    <Text style={styles.addMoreBatchBtnText}>Tambah Tugas Lain</Text>
                  </Pressable>
                </ScrollView>

                {/* Sticky Footer: Auto-Schedule Toggle + Single Primary CTA */}
                <View style={styles.reviewFooter}>
                  <Pressable
                    style={styles.autoScheduleToggleRow}
                    onPress={() => {
                      HapticFeedback.light();
                      setAutoScheduleBatch((v) => !v);
                    }}
                  >
                    <Ionicons
                      name={autoScheduleBatch ? "checkbox" : "square-outline"}
                      size={18}
                      color={autoScheduleBatch ? colors.primary : colors.textSecondary}
                    />
                    <Text style={styles.autoScheduleToggleText}>
                      ✨ Jadwalkan blok belajar otomatis
                    </Text>
                  </Pressable>

                  <PrimaryButton
                    label={
                      autoScheduleBatch
                        ? `Simpan & Jadwalkan ${parsedBatchTasks.length} Tugas`
                        : `Simpan ${parsedBatchTasks.length} Tugas`
                    }
                    icon="checkmark-done"
                    disabled={parsedBatchTasks.filter((it) => it.title.trim().length > 0).length === 0}
                    onPress={handleSaveBatchTasks}
                  />
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>

    {/* ─── P4 Add Task Sheet ─── */}
    <AddTaskSheet
      visible={visible && activeModal === "addTask"}
      onClose={() => {
        setActiveModal("none");
        onClose();
      }}
    />

    {/* ─── School Planner Add Grade Sheet ─── */}
    <AddGradeSheet
      visible={visible && activeModal === "addGrade"}
      subjects={subjects}
      onClose={() => {
        setActiveModal("none");
        onClose();
      }}
      onSave={async (data) => {
        await addGrade(data);
        setActiveModal("none");
        onClose();
      }}
    />
  </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.75)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    maxHeight: "90%",
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  headerBackBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  saveHeaderBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  saveHeaderBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  actionsList: {
    gap: spacing.sm,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: touchTarget.min,
  },
  actionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actionTextWrapper: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  modalScroll: {
    maxHeight: 520,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    fontSize: typography.fontSizes.md,
    minHeight: touchTarget.min,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  textAreaLarge: {
    minHeight: 160,
    textAlignVertical: "top",
  },
  inputErrorBorder: {
    borderColor: colors.danger,
  },
  inputErrorText: {
    color: colors.danger,
    fontSize: typography.fontSizes.xs,
    marginTop: 4,
  },
  hintChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.xs,
  },
  hintChipText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  hintChipHighlight: {
    color: colors.amber,
    fontWeight: typography.fontWeights.bold,
  },
  chipsScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    minHeight: 36,
    justifyContent: "center",
  },
  chipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: touchTarget.min,
  },
  segmentedBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  segmentedBtnText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semibold,
  },
  segmentedBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  segmentedBtnSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  quickDatePills: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  quickDatePill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDatePillText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
  },
  colorPaletteRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    minHeight: touchTarget.min,
  },
  primaryActionBtnText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  reviewScrollContent: {
    paddingBottom: spacing.md,
  },
  reviewSubTitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  batchReviewCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  batchCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  typeSelectorGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typePillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  typePillBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  typePillBtnTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardIndexTag: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
  },
  deleteBatchBtn: {
    padding: spacing.xs,
  },
  fieldMiniLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  batchTitleInput: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    lineHeight: 20,
    minHeight: 42,
    textAlignVertical: "top",
  },
  splitHelperBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  splitHelperText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
  },
  batchChipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  batchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  subjectChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  batchChipText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  batchChipTextActive: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  deadlineBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: 2,
  },
  deadlineBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  deadlineSummaryLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deadlineDateHeadline: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  deadlineRelativeSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  deadlineActionControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stepMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  stepMiniBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.textSecondary,
  },
  calendarToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  calendarToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  calendarToggleBtnText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  expandedStripWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  batchDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: spacing.sm,
  },
  batchDurationLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.bold,
  },
  batchDurationChips: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  batchDurationChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  batchDurationChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  batchDurationChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  batchDurationChipTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  addNoteChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  addNoteChipText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
  },
  addMoreBatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
    marginTop: 2,
  },
  addMoreBatchBtnText: {
    fontSize: 12,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  reviewFooter: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  autoScheduleToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  autoScheduleToggleText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  // Minimalist 3-Card Grid Quick Action Sheet Styles
  compactSheetContainer: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: tidySpacing.screen,
    paddingTop: 12,
    paddingBottom: spacing.xl,
    maxHeight: "85%",
  },
  gridHeader: {
    marginBottom: spacing.md,
  },
  gridHeaderTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  gridHeaderSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardsGridList: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gridCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  aiCardBorder: {
    borderColor: colors.accent,
    borderBottomWidth: 3,
    borderBottomColor: colors.accentBottom,
    backgroundColor: colors.accentLight,
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardContent: {
    flex: 1,
  },
  aiTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gridCardTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: 2,
  },
  gridCardSub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
  },
  aiBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  aiBadgePillText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: "#FFFFFF",
  },
  smallTextBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    marginTop: 2,
  },
  smallTextBtnLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
  },
  // Add From Text Styles
  textActionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  clipboardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  clipboardBtnText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  extractBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    borderBottomWidth: 3,
    borderBottomColor: colors.accentBottom,
  },
  extractBtnDisabled: {
    opacity: 0.65,
  },
  extractBtnText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: colors.textInverse,
  },
  loadingStateBanner: {
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 8,
    alignItems: "center",
  },
  loadingStateText: {
    fontSize: typography.fontSizes.xs,
    color: colors.accent,
    fontWeight: typography.fontWeights.medium,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
    marginRight: spacing.xs,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
  },
  errorBannerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  fallbackBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  fallbackBtnTitle: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  fallbackBtnSub: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },
  datePhrasePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
  },
  datePhrasePillText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: typography.fontWeights.medium,
  },
  notesBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 6,
  },
  notesLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.bold,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesInput: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
    minHeight: 48,
    textAlignVertical: "top",
    padding: 0,
  },
});
