/**
 * StudyAir Mobile — 3-Step Onboarding Flow (Phase 12 / Kurikulum Merdeka Polish)
 * 
 * 1. Welcome & Subject Setup (Jenjang SMA/MA, SMK, SMP/MTs & Kelas X, XI, XII with toggleable subject chips)
 * 2. Timetable Setup (AI Camera Scan, Manual entry, or Sample schedule)
 * 3. Create First Task (With next-class deadline preview and validation)
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, typography, touchTarget } from "../../theme";
import { useMobileStudyStore } from "../../store";
import { HapticFeedback } from "../../lib/haptics";
import { toLocalDateStr, addDaysLocal, formatLocaleDate } from "../../lib/dateUtils";
import { calculateNextClassDeadline } from "../../engine/deadlineEngine";

interface OnboardingModalProps {
  visible: boolean;
  onFinish: () => void;
  onNavigateToScan?: () => void;
  onNavigateToTimetable?: () => void;
}

export type JenjangType = "SMA/MA" | "SMK" | "SMP/MTs";

interface PresetSubjectItem {
  id: string;
  title: string;
  color: string;
  bringItems: string[];
  defaultSelected: boolean;
}

// Kurikulum Merdeka Common Subjects with PAI, PPKn, PJOK, Sejarah, Informatika, Seni Budaya
const KURIKULUM_MERDEKA_SUBJECTS: PresetSubjectItem[] = [
  {
    id: "pai",
    title: "Pendidikan Agama & Budi Pekerti (PAI)",
    color: "#10B981",
    bringItems: ["Buku Bacaan / Al-Qur'an", "Buku Catatan Agama"],
    defaultSelected: true,
  },
  {
    id: "ppkn",
    title: "Pendidikan Pancasila (PPKn)",
    color: "#3A86FF",
    bringItems: ["Buku UUD 1945", "Buku Catatan Pancasila"],
    defaultSelected: true,
  },
  {
    id: "pjok",
    title: "Penjasorkes (PJOK)",
    color: "#EF4444",
    bringItems: ["Baju Olahraga", "Sepatu Kets", "Handuk & Botol Minum"],
    defaultSelected: true,
  },
  {
    id: "sejarah",
    title: "Sejarah Indonesia",
    color: "#8B5CF6",
    bringItems: ["Rangkuman Garis Waktu", "Buku Catatan Sejarah"],
    defaultSelected: true,
  },
  {
    id: "informatika",
    title: "Informatika",
    color: "#06D6A0",
    bringItems: ["Modul Praktik", "Flashdisk / Dokumen Digital"],
    defaultSelected: true,
  },
  {
    id: "seni",
    title: "Seni Budaya",
    color: "#F59E0B",
    bringItems: ["Buku Gambar A4", "Pensil Gambar & Pewarna"],
    defaultSelected: true,
  },
  {
    id: "mtk",
    title: "Matematika",
    color: "#3A86FF",
    bringItems: ["Buku Berpetak", "Penggaris Segitiga", "Busur Derajat"],
    defaultSelected: true,
  },
  {
    id: "bindo",
    title: "Bahasa Indonesia",
    color: "#F59E0B",
    bringItems: ["Kamus KBBI Ringkas", "Buku Catatan"],
    defaultSelected: true,
  },
  {
    id: "bing",
    title: "Bahasa Inggris",
    color: "#EC4899",
    bringItems: ["Kamus Inggris-Indo", "Buku Latihan Grammar"],
    defaultSelected: true,
  },
  {
    id: "ipa",
    title: "IPA Terpadu / Biologi",
    color: "#10B981",
    bringItems: ["Buku Rumus Ringkas", "Buku Gambar Pengamatan"],
    defaultSelected: true,
  },
  {
    id: "fisika",
    title: "Fisika",
    color: "#8B5CF6",
    bringItems: ["Kalkulator Ilmiah", "Buku Rumus"],
    defaultSelected: false,
  },
  {
    id: "kimia",
    title: "Kimia",
    color: "#06D6A0",
    bringItems: ["Tabel Periodik", "Jas Lab"],
    defaultSelected: false,
  },
  {
    id: "ekonomi",
    title: "Ekonomi",
    color: "#F97316",
    bringItems: ["Kalkulator", "Buku Kas"],
    defaultSelected: false,
  },
  {
    id: "geografi",
    title: "Geografi",
    color: "#14B8A6",
    bringItems: ["Atlas Dunia", "Peta Tematik"],
    defaultSelected: false,
  },
  {
    id: "sosiologi",
    title: "Sosiologi",
    color: "#A855F7",
    bringItems: ["Buku Catatan Portofolio"],
    defaultSelected: false,
  },
];

export function OnboardingModal({
  visible,
  onFinish,
  onNavigateToScan,
  onNavigateToTimetable,
}: OnboardingModalProps) {
  const {
    subjects,
    timetableEntries,
    daysOff,
    overrides,
    addSubject,
    addTask,
    updateAppSettings,
  } = useMobileStudyStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Kurikulum Merdeka selectors
  const [selectedJenjang, setSelectedJenjang] = useState<JenjangType>("SMA/MA");
  const [selectedKelas, setSelectedKelas] = useState<string>("X");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    KURIKULUM_MERDEKA_SUBJECTS.filter((s) => s.defaultSelected).map((s) => s.id)
  );

  // Step 2: Timetable setup choice
  const [selectedTimetableOption, setSelectedTimetableOption] = useState<
    "scan" | "manual" | "sample" | null
  >("sample");

  // Step 3: Task creation state
  const [taskTitle, setTaskTitle] = useState("Latihan Soal Bab 1");
  const [taskSubjectId, setTaskSubjectId] = useState<string>(
    subjects.length > 0 ? subjects[0].id : ""
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);

  const kelasOptions = useMemo(() => {
    if (selectedJenjang === "SMP/MTs") {
      return ["VII", "VIII", "IX"];
    }
    return ["X", "XI", "XII"];
  }, [selectedJenjang]);

  const todayStr = useMemo(() => toLocalDateStr(), []);
  const resolvedDeadlineDate = useMemo(() => {
    const targetSub = subjects.find((s) => s.id === taskSubjectId) || subjects[0];
    const subId = targetSub ? targetSub.id : "";
    if (subId && timetableEntries.length > 0) {
      const nextRes = calculateNextClassDeadline(subId, todayStr, timetableEntries, {
        daysOff,
        overrides,
      });
      if (nextRes.found && nextRes.deadlineDate) {
        return nextRes.deadlineDate;
      }
    }
    return addDaysLocal(todayStr, 3);
  }, [subjects, taskSubjectId, timetableEntries, daysOff, overrides, todayStr]);

  const toggleSubjectChip = (id: string) => {
    HapticFeedback.light();
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleApplySubjectsAndGoStep2 = () => {
    HapticFeedback.light();
    // Add selected subjects to store (without fake exam dates)
    const chosenSubjects = KURIKULUM_MERDEKA_SUBJECTS.filter((s) =>
      selectedSubjectIds.includes(s.id)
    );

    let firstCreatedId = "";
    for (const item of chosenSubjects) {
      const exists = subjects.find(
        (s) => (s.title || s.name || "").toLowerCase() === item.title.toLowerCase()
      );
      if (!exists) {
        const created = addSubject({
          title: item.title,
          name: item.title,
          color: item.color,
          color_hex: item.color,
          bringItems: item.bringItems || [],
        });
        if (!firstCreatedId) firstCreatedId = created.id;
      } else if (!firstCreatedId) {
        firstCreatedId = exists.id;
      }
    }

    if (firstCreatedId) {
      setTaskSubjectId(firstCreatedId);
    } else if (subjects[0]) {
      setTaskSubjectId(subjects[0].id);
    }

    setStep(2);
  };

  const handleExecuteTimetableOption = () => {
    HapticFeedback.light();
    if (selectedTimetableOption === "scan") {
      updateAppSettings({ hasCompletedOnboarding: true });
      onFinish();
      onNavigateToScan?.();
    } else if (selectedTimetableOption === "manual") {
      updateAppSettings({ hasCompletedOnboarding: true });
      onFinish();
      onNavigateToTimetable?.();
    } else if (selectedTimetableOption === "sample") {
      setStep(3);
    }
  };

  const handleSkipToStep3 = () => {
    HapticFeedback.light();
    setStep(3);
  };

  const handleCompleteOnboarding = () => {
    if (!taskTitle.trim() || !taskSubjectId) return;
    HapticFeedback.success();

    const targetSub = subjects.find((s) => s.id === taskSubjectId) || subjects[0];
    const subId = targetSub ? targetSub.id : "sub-general";

    addTask({
      subjectId: subId,
      title: taskTitle.trim(),
      type: "homework",
      givenDate: todayStr,
      deadlineDate: resolvedDeadlineDate,
      deadlineMode: "nextClass",
      estimatedMinutes,
    });

    updateAppSettings({ hasCompletedOnboarding: true });
    onFinish();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* ─── Header & Progress Indicators ─── */}
        <View style={styles.header}>
          {step > 1 ? (
            <Pressable
              hitSlop={12}
              style={styles.backStepBtn}
              onPress={() => {
                HapticFeedback.light();
                setStep((prev) => (prev === 3 ? 2 : 1));
              }}
              accessibilityLabel="Langkah Sebelumnya"
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={styles.backStepText}>Kembali</Text>
            </Pressable>
          ) : null}

          <View style={styles.stepIndicatorRow}>
            <View style={[styles.stepBar, step >= 1 && styles.stepBarActive]} />
            <View style={[styles.stepBar, step >= 2 && styles.stepBarActive]} />
            <View style={[styles.stepBar, step >= 3 && styles.stepBarActive]} />
          </View>

          <Pressable
            hitSlop={12}
            style={styles.skipBtn}
            onPress={() => {
              HapticFeedback.light();
              updateAppSettings({ hasCompletedOnboarding: true });
              onFinish();
            }}
            accessibilityLabel="Lewati Orientasi"
          >
            <Text style={styles.skipBtnText}>Lewati</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ═════════════════════════════════════════════════════ */}
          {/* STEP 1: WELCOME & KURIKULUM MERDEKA SETUP             */}
          {/* ═════════════════════════════════════════════════════ */}
          {step === 1 && (
            <View style={styles.stepBox}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={styles.heroBadgeText}>Langkah 1 dari 3</Text>
              </View>

              <Text style={styles.stepTitle}>Pilih Jenjang & Kelas</Text>
              <Text style={styles.stepSubtitle}>
                Kurikulum Merdeka — Tentukan jenjang dan pilih mata pelajaran kamu untuk
                menyiapkan daftar belajar dan seragam harian:
              </Text>

              {/* Jenjang Selector */}
              <Text style={styles.fieldLabel}>JENJANG PENDIDIKAN</Text>
              <View style={styles.jenjangRow}>
                {(["SMA/MA", "SMK", "SMP/MTs"] as JenjangType[]).map((jenjang) => {
                  const isSel = selectedJenjang === jenjang;
                  return (
                    <Pressable
                      key={jenjang}
                      style={[
                        styles.jenjangChip,
                        isSel && styles.jenjangChipSelected,
                      ]}
                      onPress={() => {
                        HapticFeedback.light();
                        setSelectedJenjang(jenjang);
                        if (jenjang === "SMP/MTs") {
                          setSelectedKelas("VII");
                        } else {
                          setSelectedKelas("X");
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.jenjangChipText,
                          isSel && styles.jenjangChipTextSelected,
                        ]}
                      >
                        {jenjang}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Kelas Selector */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>TINGKAT KELAS</Text>
              <View style={styles.kelasRow}>
                {kelasOptions.map((k) => {
                  const isSel = selectedKelas === k;
                  return (
                    <Pressable
                      key={k}
                      style={[
                        styles.kelasChip,
                        isSel && styles.kelasChipSelected,
                      ]}
                      onPress={() => {
                        HapticFeedback.light();
                        setSelectedKelas(k);
                      }}
                    >
                      <Text
                        style={[
                          styles.kelasChipText,
                          isSel && styles.kelasChipTextSelected,
                        ]}
                      >
                        Kelas {k}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Subject Toggle List */}
              <View style={styles.subjectSectionCard}>
                <View style={styles.subjectSectionHeader}>
                  <Text style={styles.fieldLabel}>MATA PELAJARAN (KETUK UNTUK PILIH)</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {selectedSubjectIds.length} dipilih
                    </Text>
                  </View>
                </View>

                <View style={styles.chipsWrap}>
                  {KURIKULUM_MERDEKA_SUBJECTS.map((sub) => {
                    const isSelected = selectedSubjectIds.includes(sub.id);
                    return (
                      <Pressable
                        key={sub.id}
                        style={[
                          styles.toggleChip,
                          isSelected && {
                            borderColor: sub.color,
                            backgroundColor: `${sub.color}20`,
                          },
                        ]}
                        onPress={() => toggleSubjectChip(sub.id)}
                      >
                        <View style={[styles.subDot, { backgroundColor: sub.color }]} />
                        <Text
                          style={[
                            styles.toggleChipText,
                            isSelected && { color: colors.text, fontWeight: "700" },
                          ]}
                        >
                          {sub.title}
                        </Text>
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                          size={18}
                          color={isSelected ? sub.color : colors.textMuted}
                          style={{ marginLeft: 4 }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                style={[
                  styles.primaryActionButton,
                  selectedSubjectIds.length === 0 && { opacity: 0.5 },
                ]}
                disabled={selectedSubjectIds.length === 0}
                onPress={handleApplySubjectsAndGoStep2}
              >
                <Text style={styles.primaryActionButtonText}>
                  Terapkan & Lanjut ke Jadwal →
                </Text>
              </Pressable>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════ */}
          {/* STEP 2: TIMETABLE SETUP                               */}
          {/* ═════════════════════════════════════════════════════ */}
          {step === 2 && (
            <View style={styles.stepBox}>
              <View style={styles.heroBadge}>
                <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                <Text style={styles.heroBadgeText}>Langkah 2 dari 3</Text>
              </View>

              <Text style={styles.stepTitle}>Atur Jadwal Pelajaran</Text>
              <Text style={styles.stepSubtitle}>
                StudyAir secara cerdas menyinkronkan tugas dan seragam harian
                berdasarkan jadwal sekolah kamu:
              </Text>

              {/* Option 1: AI Camera Scan */}
              <Pressable
                style={[
                  styles.optionCard,
                  selectedTimetableOption === "scan" && styles.optionCardSelected,
                ]}
                onPress={() => {
                  HapticFeedback.light();
                  setSelectedTimetableOption("scan");
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
                  <Ionicons name="camera" size={24} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.optionTitle}>Foto Jadwal Pelajaran</Text>
                    <View style={styles.aiTag}>
                      <Text style={styles.aiTagText}>AI</Text>
                    </View>
                  </View>
                  <Text style={styles.optionDesc}>
                    Pindai foto jadwal sekolah dari kamera atau galeri, diekstrak instan dalam hitungan detik.
                  </Text>
                </View>
                <Ionicons
                  name={selectedTimetableOption === "scan" ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selectedTimetableOption === "scan" ? colors.primary : colors.border}
                />
              </Pressable>

              {/* Option 2: Quick Manual Setup */}
              <Pressable
                style={[
                  styles.optionCard,
                  selectedTimetableOption === "manual" && styles.optionCardSelected,
                ]}
                onPress={() => {
                  HapticFeedback.light();
                  setSelectedTimetableOption("manual");
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: "rgba(58, 134, 255, 0.15)" }]}>
                  <Ionicons name="create-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Isi Jadwal Manual</Text>
                  <Text style={styles.optionDesc}>
                    Masukkan mata pelajaran ke jam belajar dan hari sekolah dengan mudah.
                  </Text>
                </View>
                <Ionicons
                  name={selectedTimetableOption === "manual" ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selectedTimetableOption === "manual" ? colors.primary : colors.border}
                />
              </Pressable>

              {/* Option 3: Continue with Sample Schedule */}
              <Pressable
                style={[
                  styles.optionCard,
                  selectedTimetableOption === "sample" && styles.optionCardSelected,
                ]}
                onPress={() => {
                  HapticFeedback.light();
                  setSelectedTimetableOption("sample");
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <Ionicons name="arrow-forward-circle-outline" size={24} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Jadwal contoh (bisa dihapus)</Text>
                  <Text style={styles.optionDesc}>
                    Lanjutkan dengan jadwal contoh bawaan dan sesuaikan kapan saja nanti di Pengaturan.
                  </Text>
                </View>
                <Ionicons
                  name={selectedTimetableOption === "sample" ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={selectedTimetableOption === "sample" ? colors.primary : colors.border}
                />
              </Pressable>

              {/* Bottom Action Button (Disabled until option chosen) */}
              <Pressable
                style={[
                  styles.primaryActionButton,
                  { marginTop: spacing.md },
                  !selectedTimetableOption && { opacity: 0.5 },
                ]}
                disabled={!selectedTimetableOption}
                onPress={handleExecuteTimetableOption}
              >
                <Text style={styles.primaryActionButtonText}>
                  {selectedTimetableOption === "scan"
                    ? "Buka Kamera AI →"
                    : selectedTimetableOption === "manual"
                    ? "Buka Pengisian Manual →"
                    : selectedTimetableOption === "sample"
                    ? "Lanjut dengan Contoh Bawaan →"
                    : "Pilih Salah Satu Opsi di Atas"}
                </Text>
              </Pressable>

              {/* Secondary Skip Link */}
              <Pressable
                style={styles.secondaryLinkBtn}
                onPress={handleSkipToStep3}
                hitSlop={10}
              >
                <Text style={styles.secondaryLinkText}>Lewati dulu</Text>
              </Pressable>
            </View>
          )}

          {/* ═════════════════════════════════════════════════════ */}
          {/* STEP 3: CREATE FIRST TASK                             */}
          {/* ═════════════════════════════════════════════════════ */}
          {step === 3 && (
            <View style={styles.stepBox}>
              <View style={styles.heroBadge}>
                <Ionicons name="checkmark-done" size={16} color={colors.primary} />
                <Text style={styles.heroBadgeText}>Langkah 3 dari 3</Text>
              </View>

              <Text style={styles.stepTitle}>Buat Tugas Pertama Kamu</Text>
              <Text style={styles.stepSubtitle}>
                Coba tambahkan satu tugas sekolah atau PR agar jadwal belajar kamu siap pakai:
              </Text>

              {/* Task Form */}
              <View style={styles.formCard}>
                <Text style={styles.inputLabel}>JUDUL TUGAS ATAU PR</Text>
                <TextInput
                  style={styles.textInput}
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  placeholder="Misal: Latihan Soal Bab 1"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Quick Suggestion Pills */}
                <View style={styles.quickPillsRow}>
                  {["PR Halaman 45", "Kuis Kimia", "Laporan Praktikum"].map((p, i) => (
                    <Pressable
                      key={i}
                      style={styles.quickPill}
                      onPress={() => {
                        HapticFeedback.light();
                        setTaskTitle(p);
                      }}
                    >
                      <Text style={styles.quickPillText}>+ {p}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>PILIH MATA PELAJARAN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: spacing.xs }}>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    {subjects.map((sub) => {
                      const isSel = taskSubjectId === sub.id;
                      const c = sub.color || sub.color_hex || colors.primary;
                      return (
                        <Pressable
                          key={sub.id}
                          style={[
                            styles.subSelectChip,
                            isSel && {
                              borderColor: c,
                              backgroundColor: `${c}25`,
                              borderWidth: 2,
                            },
                          ]}
                          onPress={() => {
                            HapticFeedback.light();
                            setTaskSubjectId(sub.id);
                          }}
                        >
                          <View style={[styles.subDot, { backgroundColor: c }]} />
                          <Text
                            style={[
                              styles.subSelectText,
                              isSel && { color: colors.text, fontWeight: "700" },
                            ]}
                          >
                            {sub.title || sub.name}
                          </Text>
                          {isSel && (
                            <Ionicons name="checkmark-circle" size={14} color={c} style={{ marginLeft: 2 }} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* v2 Duration Estimate Selector */}
                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>ESTIMASI DURASI BELAJAR</Text>
                <View style={styles.quickPillsRow}>
                  {[15, 30, 45, 60].map((mins) => {
                    const isSel = estimatedMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        style={[
                          styles.quickPill,
                          isSel && {
                            borderColor: colors.primary,
                            backgroundColor: colors.primaryLight,
                          },
                        ]}
                        onPress={() => {
                          HapticFeedback.light();
                          setEstimatedMinutes(mins);
                        }}
                      >
                        <Text
                          style={[
                            styles.quickPillText,
                            isSel && { color: colors.primary, fontWeight: "700" },
                          ]}
                        >
                          ⏱️ {mins} menit
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Smart Deadline Badge Preview */}
                <View style={styles.smartDeadlineBanner}>
                  <Ionicons name="sparkles" size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.smartDeadlineTitle}>Tenggat Otomatis Cerdas</Text>
                    <Text style={styles.smartDeadlineDesc}>
                      Tenggat: {formatLocaleDate(resolvedDeadlineDate)} (pertemuan berikutnya)
                    </Text>
                  </View>
                </View>

                {/* Streak Dragon Companion Teaser */}
                <View
                  style={[
                    styles.smartDeadlineBanner,
                    {
                      backgroundColor: colors.amberLight,
                      borderColor: colors.amber,
                      marginTop: spacing.sm,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 20, marginRight: 8 }}>🥚</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.smartDeadlineTitle, { color: colors.amber }]}>
                      Telur Naga Api Siap Menetas
                    </Text>
                    <Text style={styles.smartDeadlineDesc}>
                      Selesaikan 1 tugas atau fokus 15 menit setiap hari untuk merawat naga pendampingmu!
                    </Text>
                  </View>
                </View>
              </View>

              {/* Primary Blue Button, disabled if title or subject missing */}
              <Pressable
                style={[
                  styles.primaryActionButton,
                  (!taskTitle.trim() || !taskSubjectId) && { opacity: 0.5 },
                ]}
                disabled={!taskTitle.trim() || !taskSubjectId}
                onPress={handleCompleteOnboarding}
              >
                <Text style={styles.primaryActionButtonText}>
                  Selesai & Buka StudyAir! 🚀
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backStepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backStepText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    fontWeight: "600",
  },
  stepIndicatorRow: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    marginRight: spacing.lg,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepBarActive: {
    backgroundColor: colors.primary,
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  skipBtnText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  stepBox: {
    gap: spacing.sm,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(58, 134, 255, 0.12)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 6,
    marginBottom: spacing.xs,
  },
  heroBadgeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  jenjangRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  jenjangChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  jenjangChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  jenjangChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  jenjangChipTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  kelasRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kelasChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  kelasChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  kelasChipText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  kelasChipTextSelected: {
    color: colors.primary,
    fontWeight: "700",
  },
  subjectSectionCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  subjectSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  countBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  toggleChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  subDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  primaryActionButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: touchTarget.min,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryActionButtonText: {
    fontSize: typography.fontSizes.md,
    fontWeight: "700",
    color: "#ffffff",
  },
  secondaryLinkBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryLinkText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    marginVertical: 4,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
    color: colors.text,
  },
  aiTag: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.accent,
  },
  optionDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    minHeight: 44,
  },
  quickPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
  },
  quickPill: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  quickPillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  subSelectChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  subSelectText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  smartDeadlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  smartDeadlineTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: "700",
    color: colors.accent,
  },
  smartDeadlineDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
