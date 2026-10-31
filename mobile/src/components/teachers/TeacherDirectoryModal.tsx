/**
 * StudyAir Mobile — School Planner Teacher Directory Modal
 * 
 * Features:
 * 1. Unified teacher directory (custom teachers + auto-derived from subjects/timetable)
 * 2. Search filter by teacher name, subject name, or room
 * 3. 1-tap WhatsApp chat launcher (`https://wa.me/...`)
 * 4. 1-tap phone dialer launcher (`tel:...`)
 * 5. Add / Edit / Delete teacher contact modal
 * 6. Indonesian copy and Duolingo 3D tactile buttons
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
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, typography, touchTarget, spacing } from "../../theme";
import { Subject, Teacher } from "../../types";
import { useMobileStudyStore } from "../../store";
import { HapticFeedback } from "../../lib/haptics";
import { soundFX } from "../../lib/sound";

interface TeacherDirectoryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TeacherDirectoryModal({
  visible,
  onClose,
}: TeacherDirectoryModalProps) {
  const { subjects, teachers, addTeacher, updateTeacher, deleteTeacher } =
    useMobileStudyStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([]);
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Map of subject id to Subject
  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  // Combine explicit teachers and teachers derived from subjects if not yet in explicit list
  const unifiedTeachers = useMemo(() => {
    const list: Teacher[] = [...teachers];
    const existingNames = new Set(teachers.map((t) => t.name.toLowerCase().trim()));

    // Auto-discover teachers from subjects
    subjects.forEach((s) => {
      const teacherName = s.teacher?.trim();
      if (teacherName && !existingNames.has(teacherName.toLowerCase())) {
        list.push({
          id: `derived-${s.id}`,
          name: teacherName,
          subjectIds: [s.id],
          room: s.room,
          phone: undefined,
          email: undefined,
        });
        existingNames.add(teacherName.toLowerCase());
      }
    });

    return list;
  }, [teachers, subjects]);

  // Filtered teachers by search
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return unifiedTeachers;
    const q = searchQuery.toLowerCase().trim();

    return unifiedTeachers.filter((tc) => {
      if (tc.name.toLowerCase().includes(q)) return true;
      if (tc.room && tc.room.toLowerCase().includes(q)) return true;
      // Search in subjects taught
      return tc.subjectIds.some((sId) => {
        const sub = subjectMap.get(sId);
        return sub && (sub.title || sub.name).toLowerCase().includes(q);
      });
    });
  }, [unifiedTeachers, searchQuery, subjectMap]);

  const handleOpenAdd = () => {
    HapticFeedback.light();
    soundFX.playClick();
    setEditingTeacher(null);
    setFormName("");
    setFormSubjectIds(subjects.length > 0 ? [subjects[0].id] : []);
    setFormPhone("");
    setFormEmail("");
    setFormRoom("");
    setFormNotes("");
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    HapticFeedback.light();
    soundFX.playClick();
    setEditingTeacher(t);
    setFormName(t.name);
    setFormSubjectIds(t.subjectIds || []);
    setFormPhone(t.phone || "");
    setFormEmail(t.email || "");
    setFormRoom(t.room || "");
    setFormNotes(t.notes || "");
    setIsAddEditOpen(true);
  };

  const handleSaveTeacher = async () => {
    if (!formName.trim()) {
      Alert.alert("Perhatian", "Nama guru wajib diisi.");
      return;
    }

    HapticFeedback.success();
    soundFX.playClick();

    if (editingTeacher && !editingTeacher.id.startsWith("derived-")) {
      await updateTeacher(editingTeacher.id, {
        name: formName.trim(),
        subjectIds: formSubjectIds,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        room: formRoom.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    } else {
      await addTeacher({
        name: formName.trim(),
        subjectIds: formSubjectIds,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        room: formRoom.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });
    }

    setIsAddEditOpen(false);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    Alert.alert(
      "Hapus Kontak Guru",
      `Apakah Anda yakin ingin menghapus data kontak ${name}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            HapticFeedback.heavy();
            soundFX.playClick();
            await deleteTeacher(id);
          },
        },
      ]
    );
  };

  const handleLaunchWhatsApp = (phone?: string, teacherName?: string) => {
    if (!phone) {
      Alert.alert("Informasi", "Nomor telepon/WhatsApp guru belum diisi.");
      return;
    }
    HapticFeedback.light();
    soundFX.playClick();

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const message = encodeURIComponent(
      `Halo Bapak/Ibu ${teacherName || "Guru"}, saya ingin bertanya seputar materi pelajaran. Terima kasih.`
    );
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Tidak dapat membuka aplikasi WhatsApp.");
    });
  };

  const handleLaunchPhone = (phone?: string) => {
    if (!phone) {
      Alert.alert("Informasi", "Nomor telepon guru belum diisi.");
      return;
    }
    HapticFeedback.light();
    soundFX.playClick();
    Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`).catch(() => {
      Alert.alert("Error", "Tidak dapat memulai panggilan telepon.");
    });
  };

  const toggleSubjectInForm = (subjectId: string) => {
    setFormSubjectIds((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.closeBtn}
            onPress={() => {
              HapticFeedback.light();
              soundFX.playClick();
              onClose();
            }}
            hitSlop={touchTarget.min / 4}
            accessibilityLabel="Tutup"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Daftar Guru</Text>
            <Text style={styles.headerSub}>{unifiedTeachers.length} Guru Terdaftar</Text>
          </View>
          <Pressable
            style={styles.addHeaderBtn}
            onPress={handleOpenAdd}
            hitSlop={touchTarget.min / 4}
            accessibilityLabel="Tambah Guru"
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama guru, mapel, atau ruangan..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Teachers List */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map((tc) => {
              const primarySubject =
                tc.subjectIds.length > 0 ? subjectMap.get(tc.subjectIds[0]) : null;
              const accentColor =
                primarySubject?.color || primarySubject?.color_hex || colors.primary;

              return (
                <View key={tc.id} style={styles.teacherCard}>
                  {/* Left Color Indicator & Avatar */}
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: `${accentColor}25` }]}>
                      <Text style={[styles.avatarInitials, { color: accentColor }]}>
                        {tc.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.teacherInfoCol}>
                      <Text style={styles.teacherName}>{tc.name}</Text>
                      {tc.room && (
                        <View style={styles.roomPill}>
                          <Ionicons name="location-outline" size={12} color={colors.textSecondary} style={{ marginRight: 3 }} />
                          <Text style={styles.roomText}>{tc.room}</Text>
                        </View>
                      )}
                    </View>

                    {/* Edit button */}
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={() => handleOpenEdit(tc)}
                      hitSlop={touchTarget.min / 4}
                    >
                      <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Subjects taught pills */}
                  {tc.subjectIds.length > 0 && (
                    <View style={styles.subjectsRow}>
                      {tc.subjectIds.map((sId) => {
                        const s = subjectMap.get(sId);
                        if (!s) return null;
                        const subColor = s.color || s.color_hex || colors.primary;
                        return (
                          <View
                            key={sId}
                            style={[styles.subjectTag, { backgroundColor: `${subColor}18` }]}
                          >
                            <View style={[styles.colorDot, { backgroundColor: subColor }]} />
                            <Text style={[styles.subjectTagText, { color: colors.text }]}>
                              {s.title || s.name}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Notes if any */}
                  {tc.notes && <Text style={styles.teacherNotes}>{tc.notes}</Text>}

                  {/* Quick Contact Actions Row */}
                  <View style={styles.contactActionsRow}>
                    {/* WhatsApp */}
                    <Pressable
                      style={[
                        styles.contactBtn,
                        styles.waBtn,
                        !tc.phone && styles.contactBtnDisabled,
                      ]}
                      onPress={() => handleLaunchWhatsApp(tc.phone, tc.name)}
                      disabled={!tc.phone}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.waBtnText}>WhatsApp</Text>
                    </Pressable>

                    {/* Phone Call */}
                    <Pressable
                      style={[
                        styles.contactBtn,
                        styles.callBtn,
                        !tc.phone && styles.contactBtnDisabled,
                      ]}
                      onPress={() => handleLaunchPhone(tc.phone)}
                      disabled={!tc.phone}
                    >
                      <Ionicons name="call-outline" size={16} color={colors.text} style={{ marginRight: 6 }} />
                      <Text style={styles.callBtnText}>Telepon</Text>
                    </Pressable>

                    {/* Delete action (only for custom saved teachers) */}
                    {!tc.id.startsWith("derived-") && (
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteTeacher(tc.id, tc.name)}
                        hitSlop={touchTarget.min / 4}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="school-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Belum Ada Kontak Guru</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? "Tidak ada guru yang sesuai dengan pencarian."
                  : "Tambahkan guru atau masukkan nama guru saat mengedit jadwal pelajaran."}
              </Text>
              <Pressable style={styles.emptyAddBtn} onPress={handleOpenAdd}>
                <Text style={styles.emptyAddBtnText}>+ Tambah Guru Baru</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* ─── Add / Edit Teacher Modal ─── */}
        <Modal
          visible={isAddEditOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsAddEditOpen(false)}
        >
          <View style={styles.formOverlay}>
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Text style={styles.formTitle}>
                  {editingTeacher ? "Edit Kontak Guru" : "Tambah Guru Baru"}
                </Text>
                <Pressable
                  onPress={() => setIsAddEditOpen(false)}
                  hitSlop={touchTarget.min / 4}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Name */}
                <Text style={styles.label}>Nama Lengkap Guru *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Dra. Siti Rahmawati, M.Pd"
                  placeholderTextColor={colors.textMuted}
                  value={formName}
                  onChangeText={setFormName}
                />

                {/* Subject Selector */}
                <Text style={styles.label}>Mata Pelajaran yang Diajar</Text>
                <View style={styles.subjectsSelectWrap}>
                  {subjects.map((sub) => {
                    const selected = formSubjectIds.includes(sub.id);
                    const subColor = sub.color || sub.color_hex || colors.primary;
                    return (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.subjectChipOption,
                          selected && {
                            borderColor: subColor,
                            backgroundColor: `${subColor}20`,
                          },
                        ]}
                        onPress={() => toggleSubjectInForm(sub.id)}
                      >
                        <View style={[styles.colorDot, { backgroundColor: subColor }]} />
                        <Text
                          style={[
                            styles.subjectChipText,
                            selected && { color: subColor, fontWeight: "bold" },
                          ]}
                        >
                          {sub.title || sub.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Phone / WhatsApp */}
                <Text style={styles.label}>Nomor WhatsApp / Telepon</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 08123456789"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={formPhone}
                  onChangeText={setFormPhone}
                />

                {/* Email */}
                <Text style={styles.label}>Email (Opsional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: guru@sekolah.sch.id"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formEmail}
                  onChangeText={setFormEmail}
                />

                {/* Room */}
                <Text style={styles.label}>Ruangan / Tempat Konsultasi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: Ruang Guru Lt. 2 / Lab Fisika"
                  placeholderTextColor={colors.textMuted}
                  value={formRoom}
                  onChangeText={setFormRoom}
                />

                {/* Notes */}
                <Text style={styles.label}>Catatan Tambahan</Text>
                <TextInput
                  style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                  placeholder="Contoh: Wali Kelas X-IPA 1, jadwal konsultasi istirahat ke-2"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={formNotes}
                  onChangeText={setFormNotes}
                />
              </ScrollView>

              {/* Save Button */}
              <Pressable style={styles.submitBtn} onPress={handleSaveTeacher}>
                <Text style={styles.submitBtnText}>Simpan Data Guru</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 54,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  teacherCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: `${colors.primary}40`,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "800",
  },
  teacherInfoCol: {
    flex: 1,
  },
  teacherName: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  roomPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  roomText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  iconActionBtn: {
    padding: 6,
  },
  subjectsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  subjectTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  subjectTagText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
  },
  teacherNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 16,
  },
  contactActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  contactBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  waBtn: {
    backgroundColor: "#25D366",
  },
  waBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  callBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  callBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  contactBtnDisabled: {
    opacity: 0.4,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: `${colors.danger}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySub: {
    fontSize: typography.fontSizes.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  emptyAddBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
  },
  formOverlay: {
    flex: 1,
    backgroundColor: "rgba(11, 19, 43, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  formCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  formHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  formTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: 10,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: typography.fontSizes.caption,
    color: colors.text,
  },
  subjectsSelectWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  subjectChipOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceSubtle,
  },
  subjectChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  submitBtn: {
    marginTop: spacing.md,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    borderBottomWidth: 4,
    borderBottomColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: typography.fontSizes.caption,
    fontWeight: "700",
  },
});
