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
import { colors, spacing, radius, typography, touchTarget } from "../theme";
import { useMobileStudyStore } from "../store";
import { t } from "../lib/i18n";
import { TaskType, Subject } from "../types";
import { format, addDays, parseISO } from "date-fns";
import { calculateNextClassDeadline } from "../engine/deadlineEngine";
import { parseIndonesianDateHint } from "../engine/dateHintParser";
import { resolveIndonesianSubject } from "../lib/subjectDictionary";
import {
  extractTasksFromAI,
  createFallbackTaskFromText,
  RawExtractedTask,
  suggestTaskDuration,
} from "../services/aiService";
import { AddTaskSheet } from "./tasks/AddTaskSheet";

export interface QuickActionSheetProps {
  visible: boolean;
  initialMode?: "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addFromText";
  onClose: () => void;
  onNavigateToScan: (mode: "timetable" | "whiteboard") => void;
}

interface ParsedBatchTask {
  id: string;
  title: string;
  subjectId: string;
  type: TaskType;
  deadlineDate: string;
  deadlineLabel: string;
  datePhrase?: string;
  notes?: string;
  estimatedMinutes?: number;
}

export function QuickActionSheet({
  visible,
  initialMode = "none",
  onClose,
  onNavigateToScan,
}: QuickActionSheetProps) {
  const {
    subjects,
    timetableEntries,
    daysOff,
    overrides,
    addTask,
    addSubject,
  } = useMobileStudyStore();

  // Modal sub-flows
  const [activeModal, setActiveModal] = useState<
    "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addFromText"
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

  // Today reference
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

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

    addSubject({
      name: subjectName.trim(),
      color: subjectColor,
      teacher: subjectTeacher.trim() || undefined,
      room: subjectRoom.trim() || undefined,
      bringItems: items,
      examDate: undefined,
    });

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
        Alert.alert(t("quickActionsTitle"), "Clipboard is empty.");
      }
    } catch (err) {
      console.warn("[QuickAction] Clipboard paste error:", err);
    }
  };

  const handleExtractTasksFromAI = async () => {
    const clean = whatsappText.trim();
    if (!clean) {
      Alert.alert(t("quickActionsTitle"), "Please enter or paste assignment text first.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);

    try {
      const res = await extractTasksFromAI(clean, undefined, 20000);
      const rawTasks = res.tasks || [];

      if (rawTasks.length === 0) {
        throw new Error("No tasks were detected in the text.");
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

        // Deadline = Next class of that subject
        const nextRes = calculateNextClassDeadline(targetId, todayStr, timetableEntries, {
          daysOff,
          overrides,
          afterNClasses: 1,
        });

        let deadlineDate = "";
        let deadlineLabel = "";

        if (nextRes.found && nextRes.deadlineDate) {
          deadlineDate = nextRes.deadlineDate;
          try {
            deadlineLabel = `Next Class (${format(parseISO(nextRes.deadlineDate), "d MMM")})`;
          } catch {
            deadlineLabel = nextRes.deadlineDate;
          }
        } else {
          deadlineDate = format(addDays(new Date(), 1), "yyyy-MM-dd");
          deadlineLabel = `Besok (${format(addDays(new Date(), 1), "d MMM")})`;
        }

        // Date phrases are shown as a note only (the date parser comes in Phase 7)
        const dateNote = item.datePhrase ? `Date note: ${item.datePhrase}` : "";
        const combinedNotes = [item.notes, dateNote].filter(Boolean).join("\n");

        const duration = suggestTaskDuration(item.title, item.type || "homework");
        return {
          id: `ai-task-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: item.title,
          subjectId: targetId,
          type: item.type || "homework",
          deadlineDate,
          deadlineLabel,
          datePhrase: item.datePhrase,
          notes: combinedNotes,
          estimatedMinutes: duration,
        };
      });

      setParsedBatchTasks(parsed);
      setBatchStep("review");
    } catch (err: any) {
      console.warn("[QuickAction] AI Task extraction failed:", err);
      // On failure show friendly message and KEEP the pasted text
      setExtractError(
        "Could not extract tasks with AI (request timed out after 20s or server unavailable). Your text is kept intact below."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyFallback = () => {
    const clean = whatsappText.trim();
    if (!clean) {
      Alert.alert(t("quickActionsTitle"), "Please enter or paste assignment text first.");
      return;
    }

    // Fallback: 1 task with pasted text as notes, subject matched by alias, deadline = next class
    const fallback = createFallbackTaskFromText(clean, subjects, timetableEntries, todayStr, {
      daysOff,
      overrides,
    });

    setParsedBatchTasks([fallback]);
    setBatchStep("review");
  };

  // ─── Step 2 of Batch: Commit All Reviewed Tasks ───
  const handleSaveBatchTasks = () => {
    let count = 0;
    for (const item of parsedBatchTasks) {
      if (item.title.trim()) {
        addTask({
          title: item.title.trim(),
          subjectId: item.subjectId,
          type: item.type,
          givenDate: todayStr,
          deadlineDate: item.deadlineDate,
          deadlineMode: "custom",
          estimatedMinutes: item.estimatedMinutes || 30,
          notes: item.notes?.trim() || undefined,
        });
        count++;
      }
    }

    setActiveModal("none");
    setBatchStep("input");
    setParsedBatchTasks([]);
    setIsExtracting(false);
    setExtractError(null);
    onClose();

    Alert.alert(
      t("taskAddedSuccess"),
      `${count} task${count > 1 ? "s" : ""} added to your schedule.`
    );
  };

  const handleUpdateBatchItemDuration = (id: string, mins: number) => {
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
    setParsedBatchTasks((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        // Recalculate next class for new subject
        const nextRes = calculateNextClassDeadline(newSubjectId, todayStr, timetableEntries, {
          daysOff,
          overrides,
        });
        const deadlineDate = nextRes.found && nextRes.deadlineDate
          ? nextRes.deadlineDate
          : item.deadlineDate;
        const deadlineLabel = nextRes.found && nextRes.deadlineDate
          ? `Next Class (${format(parseISO(nextRes.deadlineDate), "d MMM")})`
          : item.deadlineLabel;
        return {
          ...item,
          subjectId: newSubjectId,
          deadlineDate,
          deadlineLabel,
        };
      })
    );
  };

  const handleDeleteBatchItem = (id: string) => {
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

        {/* ─── DECLUTTERED QUICK ACTIONS SHEET MAIN MENU ─── */}
        {activeModal === "none" && (
          <View style={styles.compactSheetContainer}>
            <View style={styles.handleBar} />

            <View style={styles.compactActionsList}>
              {/* 1. ONE primary action at the top: Tambah tugas */}
              <Pressable
                style={styles.primaryAddTaskBtn}
                onPress={handleOpenAddTask}
              >
                <Ionicons name="add-circle" size={24} color="#ffffff" style={styles.btnIconLeft} />
                <Text style={styles.primaryAddTaskBtnText}>Tambah tugas</Text>
              </Pressable>

              {/* 2. Compact row: Tambah dari foto */}
              <Pressable
                style={styles.compactActionRow}
                onPress={() => {
                  onClose();
                  onNavigateToScan("whiteboard");
                }}
              >
                <Ionicons name="camera-outline" size={20} color="#8B5CF6" style={styles.btnIconLeft} />
                <Text style={styles.compactActionRowText}>Tambah dari foto</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              {/* 3. Compact row: Tambah dari teks */}
              <Pressable
                style={styles.compactActionRow}
                onPress={handleOpenAddFromText}
              >
                <Ionicons name="document-text-outline" size={20} color="#8B5CF6" style={styles.btnIconLeft} />
                <Text style={styles.compactActionRowText}>Tambah dari teks</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              {/* 4. Add subject as small text button */}
              <Pressable
                style={styles.smallTextBtn}
                onPress={handleOpenAddSubject}
                hitSlop={10}
              >
                <Text style={styles.smallTextBtnLabel}>+ Tambah mapel</Text>
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
                onPress={() => setActiveModal("none")}
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
              >
                <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.sheetTitle}>
                {batchStep === "input" ? "Add from text" : `Review Tasks (${parsedBatchTasks.length})`}
              </Text>
              {batchStep === "review" && (
                <Pressable onPress={handleSaveBatchTasks} style={styles.saveHeaderBtn}>
                  <Text style={styles.saveHeaderBtnText}>{t("save")}</Text>
                </Pressable>
              )}
            </View>

            {batchStep === "input" ? (
              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Message or Notes</Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaLarge]}
                    placeholder="Paste a message or assignment notes here...&#10;e.g. Besok PR Matematika hal 45 no 1-5 dikumpul hari Senin. Biologi bikin rangkuman Bab 3 ya."
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
                    <Text style={styles.clipboardBtnText}>Paste from clipboard</Text>
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
                      {isExtracting ? "Extracting..." : "Extract tasks"}
                    </Text>
                  </Pressable>
                </View>

                {/* Loading state indicator */}
                {isExtracting && (
                  <View style={styles.loadingStateBanner}>
                    <Text style={styles.loadingStateText}>
                      Analyzing tasks with AI (timeout 20s)...
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
                        <Text style={styles.fallbackBtnTitle}>Use Fallback (1 Task)</Text>
                        <Text style={styles.fallbackBtnSub}>
                          Creates 1 task with your pasted text as notes, subject matched by alias, and deadline = next class.
                        </Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            ) : (
              /* Review Step — Always show before saving */
              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                <Text style={styles.reviewSubTitle}>
                  Review detected tasks before saving. Dates from text are preserved as notes.
                </Text>

                {parsedBatchTasks.map((item) => {
                  const sub = subjects.find((s) => s.id === item.subjectId);
                  const subColor = sub?.color || sub?.color_hex || colors.primary;

                  return (
                    <View key={item.id} style={styles.batchReviewCard}>
                      <View style={styles.batchCardHeader}>
                        <View style={[styles.typeBadge, { backgroundColor: `${subColor}22` }]}>
                          <Text style={[styles.typeBadgeText, { color: subColor }]}>
                            {item.type.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.batchDeadlineText}>
                          📅 {item.deadlineLabel}
                        </Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() => handleDeleteBatchItem(item.id)}
                          style={styles.deleteBatchBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.rose} />
                        </Pressable>
                      </View>

                      {/* Title Edit */}
                      <TextInput
                        style={styles.batchTitleInput}
                        value={item.title}
                        onChangeText={(txt) => handleUpdateBatchItemTitle(item.id, txt)}
                        placeholder="Task title..."
                        placeholderTextColor={colors.textMuted}
                      />

                      {/* Date phrases are shown as a note only (the date parser comes in Phase 7) */}
                      {item.datePhrase ? (
                        <View style={styles.datePhrasePill}>
                          <Ionicons name="calendar-outline" size={13} color="#8B5CF6" style={{ marginRight: 4 }} />
                          <Text style={styles.datePhrasePillText}>
                            Catatan tanggal: "{item.datePhrase}" (sebagai catatan)
                          </Text>
                        </View>
                      ) : null}

                      {/* Subject Chips */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.batchChipsRow}
                      >
                        {subjects.map((s) => {
                          const isCur = s.id === item.subjectId;
                          return (
                            <Pressable
                              key={s.id}
                              style={[
                                styles.batchChip,
                                isCur && {
                                  backgroundColor: s.color || s.color_hex || colors.primary,
                                  borderColor: s.color || s.color_hex || colors.primary,
                                },
                              ]}
                              onPress={() => handleUpdateBatchItemSubject(item.id, s.id)}
                            >
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
                      </ScrollView>

                      {/* Duration selector */}
                      <View style={styles.batchDurationRow}>
                        <Text style={styles.batchDurationLabel}>Estimasi waktu:</Text>
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

                      {/* Notes / Pasted text display if present */}
                      {item.notes ? (
                        <View style={styles.notesBox}>
                          <Text style={styles.notesLabel}>Notes / Instructions</Text>
                          <TextInput
                            style={styles.notesInput}
                            value={item.notes}
                            onChangeText={(txt) => handleUpdateBatchItemNotes(item.id, txt)}
                            multiline
                            numberOfLines={3}
                          />
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                <Pressable
                  style={styles.primaryActionBtn}
                  onPress={handleSaveBatchTasks}
                >
                  <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionBtnText}>
                    Save All {parsedBatchTasks.length} Tasks
                  </Text>
                </Pressable>
              </ScrollView>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    maxHeight: "88%",
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
  reviewSubTitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  batchReviewCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  batchCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
  },
  batchDeadlineText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  deleteBatchBtn: {
    padding: spacing.xs,
  },
  batchTitleInput: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  batchChipsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  batchChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  batchChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  batchChipTextActive: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  batchDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  batchDurationLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    fontWeight: typography.fontWeights.medium,
  },
  batchDurationChips: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  batchDurationChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  batchDurationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  batchDurationChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  batchDurationChipTextActive: {
    color: "#ffffff",
    fontWeight: typography.fontWeights.bold,
  },
  // Decluttered Quick Action Sheet Styles
  compactSheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "38%",
  },
  compactActionsList: {
    gap: 8,
  },
  primaryAddTaskBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryAddTaskBtnText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  btnIconLeft: {
    marginRight: 10,
  },
  compactActionRow: {
    height: 50,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  compactActionRowText: {
    flex: 1,
    fontSize: typography.fontSizes.sm + 1,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
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
    backgroundColor: "#8B5CF6",
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  extractBtnDisabled: {
    opacity: 0.65,
  },
  extractBtnText: {
    fontSize: typography.fontSizes.xs + 1,
    fontWeight: typography.fontWeights.bold,
    color: "#ffffff",
  },
  loadingStateBanner: {
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.25)",
    borderRadius: radius.sm,
    padding: 8,
    marginTop: 8,
    alignItems: "center",
  },
  loadingStateText: {
    fontSize: typography.fontSizes.xs,
    color: "#8B5CF6",
    fontWeight: typography.fontWeights.medium,
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
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
  },
  datePhrasePillText: {
    fontSize: 11,
    color: "#8B5CF6",
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
