/**
 * StudyAir Mobile — Tomorrow's Bag & Uniform Preparation Checklist
 * Fully editable, persistent, and organized by clean Duolingo categories.
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget } from "../../theme";
import { EffectiveScheduleItem, useMobileStudyStore } from "../../store";
import { Subject } from "../../types";
import { HapticFeedback } from "../../lib/haptics";
import { t, getLanguage } from "../../lib/i18n";

export interface PrepItem {
  id: string;
  label: string;
  rawBringItem?: string;
  category: "uniform" | "subject" | "custom";
  subjectId?: string;
  subjectName?: string;
  subjectColor?: string;
  checked: boolean;
  isCustom?: boolean;
}

interface TomorrowsBagChecklistProps {
  scheduleItems: EffectiveScheduleItem[];
  targetDateStr: string; // e.g. "Senin, 26 Okt"
  isTomorrow?: boolean;
  onOpenSubjectDetail?: (subjectId: string) => void;
  onProgressChange?: (completed: number, total: number) => void;
}

const PRESET_SUGGESTIONS_ID = [
  "Uang Kas Kelas",
  "Kartu Pelajar",
  "Bekal & Botol Minum",
  "Jas Hujan / Payung",
  "Buku PR & Tugas",
  "Kamus Bahasa",
];

const PRESET_SUGGESTIONS_EN = [
  "Class Fund",
  "Student ID Card",
  "Lunchbox & Water Bottle",
  "Raincoat / Umbrella",
  "Homework & Notebook",
  "Language Dictionary",
];

const SUBJECT_BRING_PRESETS_ID = [
  "Buku Paket",
  "Buku Catatan",
  "LKS / Modul",
  "Kalkulator",
  "Busur & Penggaris",
  "Jas Lab",
  "Kamus",
  "Baju Olahraga",
];

const SUBJECT_BRING_PRESETS_EN = [
  "Textbook",
  "Notebook",
  "Workbook / Module",
  "Calculator",
  "Protractor & Ruler",
  "Lab Coat",
  "Dictionary",
  "PE Uniform",
];

const STORAGE_PREFIX = "@studyair_prep_checklist_v2_";

export function TomorrowsBagChecklist({
  scheduleItems,
  targetDateStr,
  isTomorrow = true,
  onOpenSubjectDetail,
  onProgressChange,
}: TomorrowsBagChecklistProps) {
  const { subjects, updateSubject } = useMobileStudyStore();

  // Storage key sanitized from target date
  const storageKey = useMemo(() => {
    const sanitized = targetDateStr.toLowerCase().replace(/[^a-z0-9]/g, "_");
    return `${STORAGE_PREFIX}${sanitized}`;
  }, [targetDateStr]);

  // Persisted state
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [customItems, setCustomItems] = useState<{ id: string; label: string }[]>([]);
  const [editedLabels, setEditedLabels] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newCustomText, setNewCustomText] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Per-Subject Bring Items Modal state
  const [subjectBringModalVisible, setSubjectBringModalVisible] = useState(false);
  const [selectedSubjectForBringId, setSelectedSubjectForBringId] = useState<string>("");
  const [newSubjectBringText, setNewSubjectBringText] = useState("");
  const [editingSubjectBringIdx, setEditingSubjectBringIdx] = useState<number | null>(null);
  const [editingSubjectBringText, setEditingSubjectBringText] = useState("");

  // Active (non-cancelled) classes
  const activeClasses = useMemo(() => {
    return scheduleItems.filter((item) => item.overrideType !== "cancelled" && item.subject);
  }, [scheduleItems]);

  // Distinct subjects meeting tomorrow (always resolved against latest store subjects so bringItems edits reflect immediately)
  const distinctSubjects = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const item of activeClasses) {
      if (item.subject && !map.has(item.subject.id)) {
        const liveSub = subjects.find((s) => s.id === item.subject!.id) || item.subject;
        map.set(liveSub.id, liveSub);
      }
    }
    return Array.from(map.values());
  }, [activeClasses, subjects]);

  const openSubjectBringEditor = (subjectId?: string) => {
    HapticFeedback.light();
    const targetId =
      subjectId ||
      distinctSubjects[0]?.id ||
      subjects[0]?.id ||
      "";
    setSelectedSubjectForBringId(targetId);
    setNewSubjectBringText("");
    setEditingSubjectBringIdx(null);
    setEditingSubjectBringText("");
    setSubjectBringModalVisible(true);
  };

  const activeSubjectForBring = useMemo(() => {
    return (
      subjects.find((s) => s.id === selectedSubjectForBringId) ||
      distinctSubjects[0] ||
      subjects[0] ||
      null
    );
  }, [subjects, distinctSubjects, selectedSubjectForBringId]);

  const handleAddSubjectBringItem = (textOverride?: string) => {
    if (!activeSubjectForBring) return;
    const clean = (textOverride ?? newSubjectBringText).trim();
    if (!clean) return;
    HapticFeedback.light();
    const current = activeSubjectForBring.bringItems || [];
    if (!current.some((b) => b.toLowerCase() === clean.toLowerCase())) {
      updateSubject(activeSubjectForBring.id, {
        bringItems: [...current, clean],
      });
    }
    if (!textOverride) {
      setNewSubjectBringText("");
    }
  };

  const handleSaveSubjectBringItemEdit = (idx: number) => {
    if (!activeSubjectForBring) return;
    const clean = editingSubjectBringText.trim();
    if (!clean) return;
    HapticFeedback.light();
    const current = [...(activeSubjectForBring.bringItems || [])];
    if (idx >= 0 && idx < current.length) {
      current[idx] = clean;
      updateSubject(activeSubjectForBring.id, { bringItems: current });
    }
    setEditingSubjectBringIdx(null);
    setEditingSubjectBringText("");
  };

  const handleRemoveSubjectBringItem = (itemToRemove: string) => {
    if (!activeSubjectForBring) return;
    HapticFeedback.light();
    const current = activeSubjectForBring.bringItems || [];
    updateSubject(activeSubjectForBring.id, {
      bringItems: current.filter((i) => i !== itemToRemove),
    });
  };

  // 1. Load persisted data for this target date
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw && isMounted) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.checkedIds)) {
            setCheckedIds(new Set(parsed.checkedIds));
          }
          if (Array.isArray(parsed.customItems)) {
            setCustomItems(parsed.customItems);
          }
          if (parsed.editedLabels && typeof parsed.editedLabels === "object") {
            setEditedLabels(parsed.editedLabels);
          }
          if (Array.isArray(parsed.deletedIds)) {
            setDeletedIds(new Set(parsed.deletedIds));
          }
        }
      } catch (e) {
        console.warn("Failed to load bag checklist state", e);
      } finally {
        if (isMounted) setIsLoaded(true);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  // 2. Persist state changes
  const saveState = useCallback(
    async (
      newChecked: Set<string>,
      newCustom: { id: string; label: string }[],
      newEdited: Record<string, string>,
      newDeleted: Set<string>
    ) => {
      try {
        const payload = {
          checkedIds: Array.from(newChecked),
          customItems: newCustom,
          editedLabels: newEdited,
          deletedIds: Array.from(newDeleted),
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
      } catch (e) {
        console.warn("Failed to save bag checklist state", e);
      }
    },
    [storageKey]
  );

  // 3. Compile automatic items with user overrides
  const compiledItems = useMemo<PrepItem[]>(() => {
    const items: PrepItem[] = [];

    // --- A. Uniforms ---
    const lowerDate = targetDateStr.toLowerCase();
    const isMonday = lowerDate.includes("senin") || lowerDate.includes("monday");
    const isFriday = lowerDate.includes("jumat") || lowerDate.includes("friday");

    if (isMonday) {
      items.push({
        id: "uniform-upacara",
        label: t("uniform_upacara"),
        category: "uniform",
        checked: false,
      });
    }

    const hasPjok = distinctSubjects.some((s) => {
      const name = (s.title || s.name || "").toLowerCase();
      return name.includes("pjok") || name.includes("olahraga") || name.includes("penjas") || name.includes("sport") || name.includes("pe");
    });
    if (hasPjok) {
      items.push({
        id: "uniform-pjok",
        label: t("uniform_pjok"),
        category: "uniform",
        checked: false,
      });
    }

    const hasLab = distinctSubjects.some((s) => {
      const name = (s.title || s.name || "").toLowerCase();
      return name.includes("kimia") || name.includes("biologi") || name.includes("lab") || name.includes("chem") || name.includes("bio");
    });
    if (hasLab) {
      items.push({
        id: "uniform-jas-lab",
        label: t("uniform_lab"),
        category: "uniform",
        checked: false,
      });
    }

    if (!isMonday && !hasPjok) {
      if (isFriday) {
        items.push({
          id: "uniform-pramuka",
          label: t("uniform_pramuka"),
          category: "uniform",
          checked: false,
        });
      } else {
        items.push({
          id: "uniform-regular",
          label: t("uniform_regular"),
          category: "uniform",
          checked: false,
        });
      }
    }

    // --- B. Subject Bring Items ---
    for (const sub of distinctSubjects) {
      const subBring = sub.bringItems || [];
      const subColor = sub.color || sub?.color_hex || colors.primary;
      const subTitle = sub.title || sub.name;

      if (subBring.length > 0) {
        for (const bi of subBring) {
          const id = `subject-${sub.id}-${bi.toLowerCase().replace(/\s+/g, "-")}`;
          items.push({
            id,
            label: bi,
            rawBringItem: bi,
            category: "subject",
            subjectId: sub.id,
            subjectName: subTitle,
            subjectColor: subColor,
            checked: false,
          });
        }
      } else {
        const id = `subject-${sub.id}-buku-paket`;
        items.push({
          id,
          label: t("bag_book_note_prefix", { subject: subTitle }),
          category: "subject",
          subjectId: sub.id,
          subjectName: subTitle,
          subjectColor: subColor,
          checked: false,
        });
      }
    }

    // --- C. Custom Items ---
    for (const c of customItems) {
      items.push({
        id: c.id,
        label: c.label,
        category: "custom",
        isCustom: true,
        checked: false,
      });
    }

    // --- D. Apply Overrides (checked, edited text, deleted) ---
    return items
      .filter((i) => !deletedIds.has(i.id))
      .map((item) => ({
        ...item,
        label: editedLabels[item.id] || item.label,
        checked: checkedIds.has(item.id),
      }));
  }, [distinctSubjects, targetDateStr, customItems, checkedIds, editedLabels, deletedIds]);

  // Progress computation
  const totalItems = compiledItems.length;
  const completedItems = compiledItems.filter((i) => i.checked).length;
  const percentComplete = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const lastReportedRef = useRef<string>("");
  useEffect(() => {
    const key = `${completedItems}/${totalItems}`;
    if (onProgressChange && lastReportedRef.current !== key) {
      lastReportedRef.current = key;
      onProgressChange(completedItems, totalItems);
    }
  }, [completedItems, totalItems, onProgressChange]);

  // Group items by category
  const groupedItems = useMemo(() => {
    return {
      uniform: compiledItems.filter((i) => i.category === "uniform"),
      subject: compiledItems.filter((i) => i.category === "subject"),
      custom: compiledItems.filter((i) => i.category === "custom"),
    };
  }, [compiledItems]);

  // Actions
  const toggleCheck = (id: string) => {
    HapticFeedback.taskToggle();
    const next = new Set(checkedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIds(next);
    saveState(next, customItems, editedLabels, deletedIds);
  };

  const handleStartEdit = (item: PrepItem) => {
    setEditingId(item.id);
    setEditText(item.label);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const clean = editText.trim();
    if (clean) {
      const targetItem = compiledItems.find((i) => i.id === editingId);
      if (targetItem?.category === "subject" && targetItem.subjectId) {
        const sub = subjects.find((s) => s.id === targetItem.subjectId);
        if (sub) {
          const currentBring = sub.bringItems || [];
          if (targetItem.rawBringItem && currentBring.includes(targetItem.rawBringItem)) {
            updateSubject(sub.id, {
              bringItems: currentBring.map((b) => (b === targetItem.rawBringItem ? clean : b)),
            });
          } else if (currentBring.length === 0) {
            updateSubject(sub.id, { bringItems: [clean] });
          }
        }
      }
      const nextEdited = { ...editedLabels, [editingId]: clean };
      setEditedLabels(nextEdited);
      saveState(checkedIds, customItems, nextEdited, deletedIds);
    }
    setEditingId(null);
    setEditText("");
  };

  const handleDeleteItem = (id: string) => {
    HapticFeedback.light();
    const targetItem = compiledItems.find((i) => i.id === id);
    if (targetItem?.category === "subject" && targetItem.subjectId && targetItem.rawBringItem) {
      const sub = subjects.find((s) => s.id === targetItem.subjectId);
      if (sub && (sub.bringItems || []).includes(targetItem.rawBringItem)) {
        updateSubject(sub.id, {
          bringItems: (sub.bringItems || []).filter((b) => b !== targetItem.rawBringItem),
        });
      }
    }
    const nextDeleted = new Set(deletedIds);
    nextDeleted.add(id);
    setDeletedIds(nextDeleted);

    const nextCustom = customItems.filter((c) => c.id !== id);
    setCustomItems(nextCustom);

    const nextChecked = new Set(checkedIds);
    nextChecked.delete(id);
    setCheckedIds(nextChecked);

    saveState(nextChecked, nextCustom, editedLabels, nextDeleted);
  };

  const handleAddCustom = (presetText?: string) => {
    const textToAdd = (presetText || newCustomText).trim();
    if (!textToAdd) return;
    HapticFeedback.light();
    const newId = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const nextCustom = [...customItems, { id: newId, label: textToAdd }];
    setCustomItems(nextCustom);
    setNewCustomText("");
    setIsAddingCustom(false);
    saveState(checkedIds, nextCustom, editedLabels, deletedIds);
  };

  const handleResetToDefault = () => {
    HapticFeedback.light();
    setCheckedIds(new Set());
    setCustomItems([]);
    setEditedLabels({});
    setDeletedIds(new Set());
    saveState(new Set(), [], {}, new Set());
  };

  if (!isLoaded && activeClasses.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ─── Harmonized Progress Header + Edit by Subject Action ─── */}
      <View style={styles.progressHeaderCard}>
        <View style={styles.progressTopRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.progressCountText}>
                <Text style={styles.progressBoldCount}>{completedItems}</Text> {t("bag_ready_progress", { total: totalItems })}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {subjects.length > 0 && (
                  <Pressable
                    style={styles.editBySubjectBtn}
                    onPress={() => openSubjectBringEditor()}
                    hitSlop={6}
                  >
                    <Ionicons name="options-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.editBySubjectBtnText}>{t("edit_subject_bring_btn")}</Text>
                  </Pressable>
                )}
                {percentComplete === 100 ? (
                  <View style={styles.readyBadge}>
                    <Ionicons name="checkmark-done" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                    <Text style={styles.readyBadgeText}>{t("bag_ready_badge")}</Text>
                  </View>
                ) : (
                  <Text style={styles.percentText}>{percentComplete}%</Text>
                )}
              </View>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${percentComplete}%`,
                    backgroundColor: percentComplete === 100 ? colors.emerald : colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.scrollContent}>
        {/* ─── SECTION 1: Seragam & Atribut ─── */}
        {groupedItems.uniform.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconPill, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="shirt-outline" size={13} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>{t("bag_sec_uniform")}</Text>
              <Text style={styles.sectionCountBadge}>{groupedItems.uniform.length}</Text>
            </View>

            <View style={styles.itemsCard}>
              {groupedItems.uniform.map((item) => renderItemRow(item))}
            </View>
          </View>
        )}

        {/* ─── SECTION 2: Buku & Mapel ─── */}
        {(groupedItems.subject.length > 0 || distinctSubjects.length > 0) && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconPill, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="book-outline" size={13} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>{t("bag_sec_books")}</Text>
              <Pressable
                style={styles.sectionEditSubjectLink}
                onPress={() => openSubjectBringEditor()}
                hitSlop={6}
              >
                <Ionicons name="create-outline" size={13} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.sectionEditSubjectLinkText}>{t("edit_subject_bring_btn")}</Text>
              </Pressable>
              <Text style={styles.sectionCountBadge}>{groupedItems.subject.length}</Text>
            </View>

            <View style={styles.itemsCard}>
              {groupedItems.subject.map((item) => renderItemRow(item))}
            </View>
          </View>
        )}

        {/* ─── SECTION 3: Barang Pribadi & Tambahan ─── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIconPill, { backgroundColor: colors.amberLight }]}>
              <Ionicons name="briefcase" size={14} color={colors.amber} />
            </View>
            <Text style={styles.sectionTitle}>{t("bag_sec_custom")}</Text>
            {groupedItems.custom.length > 0 && (
              <Text style={styles.sectionCountBadge}>{groupedItems.custom.length}</Text>
            )}
          </View>

          {groupedItems.custom.length > 0 && (
            <View style={styles.itemsCard}>
              {groupedItems.custom.map((item) => renderItemRow(item))}
            </View>
          )}

          {/* Quick Suggestion Chips */}
          <Text style={styles.suggestionTitle}>{t("bag_quick_suggestions")}</Text>
          <View style={styles.presetChipsRow}>
            {(getLanguage() === "en" ? PRESET_SUGGESTIONS_EN : PRESET_SUGGESTIONS_ID).map((preset) => (
              <Pressable
                key={preset}
                style={styles.presetChip}
                onPress={() => handleAddCustom(preset)}
                hitSlop={touchTarget.min / 4}
              >
                <Ionicons name="add" size={12} color={colors.primary} style={{ marginRight: 2 }} />
                <Text style={styles.presetChipText}>{preset}</Text>
              </Pressable>
            ))}
          </View>

          {/* Add Custom Item Input */}
          {isAddingCustom ? (
            <View style={styles.addCustomCard}>
              <TextInput
                style={styles.customTextInput}
                placeholder={t("bag_add_custom_placeholder")}
                placeholderTextColor={colors.textMuted}
                value={newCustomText}
                onChangeText={setNewCustomText}
                autoFocus
                onSubmitEditing={() => handleAddCustom()}
              />
              <View style={styles.addCustomActionRow}>
                <Pressable
                  style={styles.customCancelBtn}
                  onPress={() => {
                    setIsAddingCustom(false);
                    setNewCustomText("");
                  }}
                  hitSlop={touchTarget.min / 4}
                >
                  <Text style={styles.customCancelText}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  style={styles.customSaveBtn}
                  onPress={() => handleAddCustom()}
                  hitSlop={touchTarget.min / 4}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.customSaveText}>{t("save")}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.addCustomBtn}
              onPress={() => setIsAddingCustom(true)}
              hitSlop={touchTarget.min / 4}
            >
              <Ionicons name="add-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.addCustomBtnText}>{t("bag_add_custom_btn")}</Text>
            </Pressable>
          )}
        </View>

        {/* ─── Footer: Reset to Default ─── */}
        {(Object.keys(editedLabels).length > 0 || deletedIds.size > 0 || customItems.length > 0) && (
          <View style={styles.resetFooter}>
            <Pressable
              style={styles.resetBtn}
              onPress={handleResetToDefault}
              hitSlop={touchTarget.min / 4}
            >
              <Ionicons name="refresh" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={styles.resetBtnText}>{t("bag_reset_default")}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ─── Per-Subject Bring Items ("Barang Bawaan Mapel") Editor Modal ─── */}
      <Modal
        visible={subjectBringModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubjectBringModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSubjectBringModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{t("subject_bring_modal_title")}</Text>
                <Text style={styles.modalSubtitle}>{t("subject_bring_modal_sub")}</Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSubjectBringModalVisible(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Subject Selector Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectSelectorRow}
            >
              {subjects.map((sub) => {
                const isSelected = activeSubjectForBring?.id === sub.id;
                const subCol = sub.color || sub.color_hex || colors.primary;
                const count = (sub.bringItems || []).length;
                return (
                  <Pressable
                    key={sub.id}
                    style={[
                      styles.subjectSelectorChip,
                      isSelected && {
                        backgroundColor: colors.surfaceHover,
                        borderColor: subCol,
                      },
                    ]}
                    onPress={() => {
                      HapticFeedback.light();
                      setSelectedSubjectForBringId(sub.id);
                      setEditingSubjectBringIdx(null);
                      setNewSubjectBringText("");
                    }}
                  >
                    <View style={[styles.subjectDot, { backgroundColor: subCol }]} />
                    <Text
                      style={[
                        styles.subjectSelectorChipText,
                        isSelected && { color: colors.text, fontWeight: "700" },
                      ]}
                    >
                      {sub.title || sub.name}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.subjectChipCountBadge, { backgroundColor: subCol }]}>
                        <Text style={styles.subjectChipCountText}>{count}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Selected Subject Bring Items List */}
            {activeSubjectForBring && (
              <View style={styles.subjectBringBody}>
                <View style={styles.subjectBringList}>
                  {(activeSubjectForBring.bringItems || []).length === 0 ? (
                    <View style={styles.subjectBringEmptyBox}>
                      <Ionicons name="book-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                      <Text style={styles.subjectBringEmptyText}>
                        {t("subject_bring_empty")}
                      </Text>
                    </View>
                  ) : (
                    (activeSubjectForBring.bringItems || []).map((bItem, idx) => {
                      const isRowEditing = editingSubjectBringIdx === idx;
                      return (
                        <View key={`${bItem}-${idx}`} style={styles.subjectBringRow}>
                          {isRowEditing ? (
                            <View style={styles.inlineEditRow}>
                              <TextInput
                                style={styles.inlineEditTextInput}
                                value={editingSubjectBringText}
                                onChangeText={setEditingSubjectBringText}
                                autoFocus
                                onSubmitEditing={() => handleSaveSubjectBringItemEdit(idx)}
                              />
                              <Pressable
                                style={styles.inlineActionBtnSave}
                                onPress={() => handleSaveSubjectBringItemEdit(idx)}
                              >
                                <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                              </Pressable>
                              <Pressable
                                style={styles.inlineActionBtnCancel}
                                onPress={() => setEditingSubjectBringIdx(null)}
                              >
                                <Ionicons name="close" size={15} color={colors.textSecondary} />
                              </Pressable>
                            </View>
                          ) : (
                            <>
                              <Ionicons
                                name="cube-outline"
                                size={15}
                                color={activeSubjectForBring.color || activeSubjectForBring.color_hex || colors.primary}
                              />
                              <Text style={styles.subjectBringRowText}>{bItem}</Text>
                              <Pressable
                                style={styles.itemIconBtn}
                                onPress={() => {
                                  setEditingSubjectBringIdx(idx);
                                  setEditingSubjectBringText(bItem);
                                }}
                                hitSlop={6}
                              >
                                <Ionicons name="pencil-outline" size={14} color={colors.textSecondary} />
                              </Pressable>
                              <Pressable
                                style={styles.itemIconBtn}
                                onPress={() => handleRemoveSubjectBringItem(bItem)}
                                hitSlop={6}
                              >
                                <Ionicons name="trash-outline" size={14} color={colors.rose} />
                              </Pressable>
                            </>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Add New Item Input Row for Selected Subject */}
                <View style={styles.subjectBringAddRow}>
                  <TextInput
                    style={styles.subjectBringInput}
                    placeholder={t("subject_bring_add_placeholder", {
                      subject: activeSubjectForBring.title || activeSubjectForBring.name,
                    })}
                    placeholderTextColor={colors.textMuted}
                    value={newSubjectBringText}
                    onChangeText={setNewSubjectBringText}
                    onSubmitEditing={() => handleAddSubjectBringItem()}
                  />
                  <Pressable
                    style={styles.subjectBringAddBtn}
                    onPress={() => handleAddSubjectBringItem()}
                  >
                    <Ionicons name="add" size={18} color={colors.textInverse} />
                    <Text style={styles.subjectBringAddBtnText}>{t("save")}</Text>
                  </Pressable>
                </View>

                {/* Quick Add Presets for Subject */}
                <Text style={styles.suggestionTitle}>{t("subject_bring_presets_label")}</Text>
                <View style={styles.presetChipsRow}>
                  {(getLanguage() === "en" ? SUBJECT_BRING_PRESETS_EN : SUBJECT_BRING_PRESETS_ID).map(
                    (preset) => {
                      const alreadyAdded = (activeSubjectForBring.bringItems || []).some(
                        (b) => b.toLowerCase() === preset.toLowerCase()
                      );
                      return (
                        <Pressable
                          key={preset}
                          style={[styles.presetChip, alreadyAdded && styles.presetChipAdded]}
                          onPress={() => {
                            if (alreadyAdded) {
                              handleRemoveSubjectBringItem(preset);
                            } else {
                              handleAddSubjectBringItem(preset);
                            }
                          }}
                        >
                          <Ionicons
                            name={alreadyAdded ? "checkmark" : "add"}
                            size={12}
                            color={alreadyAdded ? colors.emerald : colors.primary}
                            style={{ marginRight: 3 }}
                          />
                          <Text
                            style={[
                              styles.presetChipText,
                              alreadyAdded && { color: colors.emerald, fontWeight: "700" },
                            ]}
                          >
                            {preset}
                          </Text>
                        </Pressable>
                      );
                    }
                  )}
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );

  function renderItemRow(item: PrepItem) {
    const isEditing = editingId === item.id;

    if (isEditing) {
      return (
        <View key={item.id} style={styles.inlineEditRow}>
          <TextInput
            style={styles.inlineEditTextInput}
            value={editText}
            onChangeText={setEditText}
            autoFocus
            onSubmitEditing={handleSaveEdit}
          />
          <Pressable
            style={styles.inlineActionBtnSave}
            onPress={handleSaveEdit}
            hitSlop={touchTarget.min / 4}
          >
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={styles.inlineActionBtnCancel}
            onPress={() => setEditingId(null)}
            hitSlop={touchTarget.min / 4}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      );
    }

    return (
      <View key={item.id} style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
        {/* Duolingo Circular Checkbox */}
        <Pressable
          style={[styles.checkboxCircle, item.checked && styles.checkboxCircleChecked]}
          onPress={() => toggleCheck(item.id)}
          hitSlop={touchTarget.min / 4}
        >
          {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </Pressable>

        {/* Item Label & Meta */}
        <Pressable
          style={{ flex: 1, paddingVertical: 2 }}
          onPress={() => toggleCheck(item.id)}
        >
          <Text
            style={[styles.itemLabel, item.checked && styles.itemLabelChecked]}
            numberOfLines={2}
          >
            {item.label}
          </Text>

          {item.subjectName && (
            <Pressable
              style={styles.subjectBadgeRow}
              onPress={() => openSubjectBringEditor(item.subjectId)}
            >
              <View
                style={[
                  styles.subjectDot,
                  { backgroundColor: item.subjectColor || colors.primary },
                ]}
              />
              <Text style={styles.subjectBadgeText}>{item.subjectName}</Text>
              <Ionicons name="create-outline" size={11} color={colors.textMuted} />
            </Pressable>
          )}
        </Pressable>

        {/* Quick Edit & Delete Actions */}
        <View style={styles.itemActionGroup}>
          <Pressable
            style={styles.itemIconBtn}
            onPress={() => handleStartEdit(item)}
            hitSlop={touchTarget.min / 4}
          >
            <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.itemIconBtn}
            onPress={() => handleDeleteItem(item.id)}
            hitSlop={touchTarget.min / 4}
          >
            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressHeaderCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  editBySubjectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  editBySubjectBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  sectionEditSubjectLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionEditSubjectLinkText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
  },
  progressCountText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  progressBoldCount: {
    color: colors.text,
    fontWeight: "800",
    fontSize: typography.fontSizes.section,
  },
  percentText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.emerald,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  scrollContent: {
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sectionIconPill: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCountBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.textMuted,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  itemsCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.sm + 2,
    minHeight: 46,
  },
  itemRowChecked: {
    opacity: 0.65,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircleChecked: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  itemLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 20,
  },
  itemLabelChecked: {
    textDecorationLine: "line-through",
    color: colors.textMuted,
  },
  subjectBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  subjectDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  itemActionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineEditRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surfaceHover,
  },
  inlineEditTextInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  inlineActionBtnSave: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActionBtnCancel: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginLeft: 4,
  },
  presetChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.sm,
  },
  addCustomBtnText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  addCustomCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  customTextInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  addCustomActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  customCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customCancelText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  customSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  customSaveText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  resetFooter: {
    alignItems: "center",
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  resetBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  presetChipAdded: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldLight,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    maxHeight: "86%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.fontSizes.section,
    fontWeight: "700",
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  modalCloseBtn: {
    padding: 4,
    marginLeft: spacing.sm,
  },
  subjectSelectorRow: {
    gap: 8,
    paddingBottom: spacing.md,
  },
  subjectSelectorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  subjectSelectorChipText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  subjectChipCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  subjectChipCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  subjectBringBody: {
    gap: spacing.xs,
  },
  subjectBringList: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: "hidden",
  },
  subjectBringEmptyBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  subjectBringEmptyText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  subjectBringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  subjectBringRowText: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    fontWeight: "600",
    color: colors.text,
  },
  subjectBringAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  subjectBringInput: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  subjectBringAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryBottom,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  subjectBringAddBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
    color: colors.textInverse,
  },
});
