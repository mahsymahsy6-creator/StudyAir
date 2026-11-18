/**
 * StudyAir Mobile — Settings Screen (Phase 9)
 * 
 * Features:
 * 1. Appearance & Language:
 *    - Theme toggle (Dark Soft Navy vs High-contrast Dark)
 *    - Language switcher (Bahasa Indonesia / English via i18n)
 * 2. Reminders & Local Notifications:
 *    - Notifications master toggle with contextual permission handling
 *    - Evening preview notification time & preview snippet
 *    - Morning "Due Today" alert time
 *    - Live "Send Test Notification" action
 * 3. Bell Schedule / Period Times:
 *    - Inline editor for start & end times of each school period
 *    - Add new period / reset to default schedule
 * 4. Subject Aliases:
 *    - Subject selector with color badge
 *    - View, add, and remove aliases for intelligent AI OCR/text extraction
 * 5. Advanced Settings & AI Mode:
 *    - Mode A: Secure Storage (Direct Gemini with expo-secure-store)
 *    - Mode B: School / Self-hosted Proxy
 *    - Daily scan quota meter with progress bar
 * 6. Backup & Reset:
 *    - Export JSON backup
 *    - Import JSON backup
 *    - Reset all data with confirmation
 */

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  Modal,
  Share,
  Platform,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { colors, spacing, radius, typography, touchTarget, tidySpacing, THEMES, applyTheme } from "../theme";
import { useMobileStudyStore } from "../store";
import { t } from "../lib/i18n";
import { PeriodTime, Subject, AppTheme } from "../types";
import { DEFAULT_PERIOD_TIMES } from "../lib/storage";
import {
  CURRENT_APP_VERSION,
  CURRENT_VERSION_CODE,
  DEFAULT_APK_SIZE_MB,
  UpdateCheckResult,
  checkAppUpdate,
  triggerApkDownload,
  resolveDownloadEndpoints,
} from "../lib/updateChecker";
import {
  requestNotificationPermission,
  sendTestNotification,
} from "../services/notificationService";
import { BellTimesEditor } from "../components/timetable/BellTimesEditor";
import { ScreenHeader } from "../components/common/ScreenHeader";
import { SectionHeader } from "../components/common/SectionHeader";
import { ListRow } from "../components/common/ListRow";
import { BottomSheet } from "../components/common/BottomSheet";
import { Snackbar } from "../components/common/Snackbar";
import { STREAK_MILESTONES } from "../lib/studyStreakEngine";
import { StreakDebugModal } from "../components/streak/StreakDebugModal";
import { TeacherDirectoryModal } from "../components/teachers/TeacherDirectoryModal";
import { HapticFeedback } from "../lib/haptics";
import { soundFX } from "../lib/sound";

interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const {
    appSettings,
    updateAppSettings,
    subjects,
    addSubjectAlias,
    removeSubjectAlias,
    periodTimes,
    setPeriodTimes,
    updatePeriodTime,
    timetableEntries,
    setTimetableEntries,
    tasks,
    deleteTask,
    geminiApiKey,
    setGeminiApiKey,
    syncNotifications,
    exportBackupData,
    importBackupData,
    resetAll,
    streakState,
    triggerCelebration,
    resetStreak,
  } = useMobileStudyStore();

  // Active collapsed section state (null = show root grouped rows)
  const [activeSection, setActiveSection] = useState<null | "tampilan" | "pengingat" | "jamPelajaran" | "dataCadangan" | "lanjutan" | "streak">(null);

  // Local state for API key input
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || "");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeySavedStatus, setApiKeySavedStatus] = useState(false);

  // Local state for Proxy inputs
  const [proxyUrlInput, setProxyUrlInput] = useState(appSettings.proxyUrl || "");
  const [proxyTokenInput, setProxyTokenInput] = useState(appSettings.proxyToken || "");

  // Local state for Subject Alias management
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ""
  );
  const [newAliasText, setNewAliasText] = useState("");

  // Local state for Import JSON modal
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [streakDebugModalVisible, setStreakDebugModalVisible] = useState(false);
  const [teacherDirectoryVisible, setTeacherDirectoryVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingApk, setDownloadingApk] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);

  const effectiveVersion = updateInfo?.latestVersion || CURRENT_APP_VERSION;
  const effectiveSizeMB = updateInfo?.apkSizeMB || DEFAULT_APK_SIZE_MB;
  const isUpdateAvailable = updateInfo?.status === "update_available";

  // ─── Android-style 7-Tap Developer Mode Easter Egg ───
  const buildClickCountRef = useRef(0);
  const lastBuildClickTimeRef = useRef(0);
  const devToastTimerRef = useRef<any>(null);
  const [devToastMessage, setDevToastMessage] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const showDevToast = useCallback((msg: string) => {
    setDevToastMessage(msg);
    setSnackbarMessage(msg);
    setSnackbarVisible(true);
    if (devToastTimerRef.current) {
      clearTimeout(devToastTimerRef.current);
    }
    devToastTimerRef.current = setTimeout(() => {
      setDevToastMessage(null);
    }, 3200);
  }, []);

  const handleBuildNumberClick = useCallback(() => {
    const now = Date.now();
    // Reset click counter if more than 3.5 seconds elapsed between clicks
    if (now - lastBuildClickTimeRef.current > 3500) {
      buildClickCountRef.current = 0;
    }
    lastBuildClickTimeRef.current = now;

    if (appSettings.developerModeEnabled) {
      soundFX?.playClick?.();
      HapticFeedback?.light?.();
      showDevToast(t("dev_mode_already_active"));
      return;
    }

    buildClickCountRef.current += 1;
    const count = buildClickCountRef.current;

    if (count >= 7) {
      buildClickCountRef.current = 0;
      updateAppSettings({ developerModeEnabled: true });
      soundFX?.playSuccess?.();
      HapticFeedback?.success?.();
      showDevToast(t("dev_mode_activated"));
    } else if (count >= 4) {
      soundFX?.playClick?.();
      HapticFeedback?.light?.();
      const remaining = 7 - count;
      showDevToast(t("dev_mode_steps", { count: remaining }));
    } else {
      soundFX?.playClick?.();
      HapticFeedback?.light?.();
    }
  }, [appSettings.developerModeEnabled, updateAppSettings, showDevToast]);

  const handleDownloadApp = async () => {
    HapticFeedback?.light?.();
    soundFX?.playClick?.();
    setDownloadingApk(true);
    try {
      await triggerApkDownload(
        (url) => Linking.openURL(url),
        updateInfo?.downloadUrl
      );
      HapticFeedback?.success?.();
    } finally {
      setTimeout(() => setDownloadingApk(false), 1200);
    }
  };

  const handleCheckUpdate = async () => {
    HapticFeedback?.light?.();
    soundFX?.playClick?.();
    setCheckingUpdate(true);
    try {
      const result = await checkAppUpdate();
      setUpdateInfo(result);
      HapticFeedback?.success?.();
      setUpdateModalVisible(true);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleCopyDownloadLink = async () => {
    HapticFeedback?.light?.();
    soundFX?.playClick?.();
    const endpoints = resolveDownloadEndpoints();
    const linkToCopy = updateInfo?.downloadUrl || endpoints.directApkUrl;
    await Clipboard.setStringAsync(linkToCopy);
    setLinkCopied(true);
    HapticFeedback?.success?.();
    setTimeout(() => setLinkCopied(false), 2200);
  };

  const handleOpenDownloadPortal = () => {
    HapticFeedback?.light?.();
    soundFX?.playClick?.();
    const endpoints = resolveDownloadEndpoints();
    Linking.openURL(updateInfo?.portalUrl || endpoints.portalUrl).catch(() => {});
  };

  // Selected subject object
  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || subjects[0],
    [subjects, selectedSubjectId]
  );

  // Break entries from existing timetable for gap detection
  const breakEntriesFromTimetable = useMemo(() => {
    return (timetableEntries || [])
      .filter(
        (e) =>
          e.kind === "break" ||
          (e.customLabel &&
            (e.customLabel.toLowerCase().includes("istirahat") ||
              e.customLabel.toLowerCase().includes("ishoma")))
      )
      .map((e) => ({
        label: e.customLabel || "Istirahat",
        periodNumber: e.periodNumber,
        startTime: e.startTime,
        endTime: e.endTime,
      }));
  }, [timetableEntries]);

  // Remaining daily scan quota
  const remainingScans = Math.max(
    0,
    appSettings.dailyScanQuota - (appSettings.scansUsedToday || 0)
  );
  const quotaPercentage = Math.min(
    100,
    Math.round(((appSettings.scansUsedToday || 0) / appSettings.dailyScanQuota) * 100)
  );

  // ─── Notification Handlers ───
  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Izin Notifikasi Diperlukan",
          "Aktifkan notifikasi di pengaturan perangkatmu agar StudyAir dapat mengirim pengingat jadwal.",
          [{ text: "OK" }]
        );
        return;
      }
      updateAppSettings({ notificationsEnabled: true });
      await syncNotifications();
    } else {
      updateAppSettings({ notificationsEnabled: false });
    }
  };

  const handleSendTestNotification = async () => {
    const success = await sendTestNotification();
    if (success) {
      Alert.alert(
        "Notifikasi Terkirim 🔔",
        t("testNotificationSent"),
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Gagal Mengirim",
        "Pastikan izin notifikasi telah diberikan untuk aplikasi StudyAir.",
        [{ text: "OK" }]
      );
    }
  };

  // ─── Bell Schedule Handlers ───
  const handleTimeChange = (
    periodNumber: number,
    field: "start" | "end",
    value: string
  ) => {
    updatePeriodTime(periodNumber, { [field]: value });
  };

  const handleAddPeriod = () => {
    const nextNum = periodTimes.length > 0
      ? Math.max(...periodTimes.map((p) => p.periodNumber)) + 1
      : 1;
    const lastPeriod = periodTimes[periodTimes.length - 1];
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
    setPeriodTimes([...periodTimes, newPeriod]);
  };

  const handleResetBellSchedule = () => {
    Alert.alert(
      "Reset Jam Belajar",
      "Kembalikan jam pelajaran ke jadwal standar (07:00 - 14:00)?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => setPeriodTimes(DEFAULT_PERIOD_TIMES),
        },
      ]
    );
  };

  const handleDeletePeriod = (periodNumber: number) => {
    if (periodTimes.length <= 1) {
      Alert.alert("Perhatian", "Minimal harus ada 1 jam pelajaran.");
      return;
    }
    const filtered = periodTimes.filter((p) => p.periodNumber !== periodNumber);
    const reindexed = filtered.map((p, idx) => ({
      ...p,
      periodNumber: idx + 1,
    }));
    setPeriodTimes(reindexed);
  };

  const handleAddBreak = (name: string = "Istirahat") => {
    const lastPeriod = periodTimes[periodTimes.length - 1];
    if (!lastPeriod) return;
    const [h, m] = lastPeriod.end.split(":").map(Number);
    const breakEndMins = (h * 60 + m + 30) % 1440;
    const breakEndH = String(Math.floor(breakEndMins / 60)).padStart(2, "0");
    const breakEndM = String(breakEndMins % 60).padStart(2, "0");
    const newStart = `${breakEndH}:${breakEndM}`;

    const nextNum = periodTimes.length + 1;
    const nextEndMins = (breakEndMins + 45) % 1440;
    const nextEndH = String(Math.floor(nextEndMins / 60)).padStart(2, "0");
    const nextEndM = String(nextEndMins % 60).padStart(2, "0");

    setPeriodTimes([
      ...periodTimes,
      {
        periodNumber: nextNum,
        start: newStart,
        end: `${nextEndH}:${nextEndM}`,
      },
    ]);
    Alert.alert(
      "Istirahat Ditambahkan",
      `Jeda ${name} (30 menit) dibuat dari ${lastPeriod.end} - ${newStart}. Jam ke-${nextNum} dimulai pukul ${newStart}.`
    );
  };

  const handleClearSampleData = () => {
    Alert.alert(
      "Hapus Data Contoh",
      "Apakah kamu ingin menghapus jadwal dan tugas contoh? Tindakan ini akan membersihkan data bawaan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Data Contoh",
          style: "destructive",
          onPress: () => {
            setTimetableEntries([]);
            tasks.forEach((t) => deleteTask(t.id));
            Alert.alert("Berhasil", "Data jadwal dan tugas contoh berhasil dibersihkan.");
          },
        },
      ]
    );
  };

  // ─── Alias Handlers ───
  const handleAddAlias = () => {
    if (!selectedSubject || !newAliasText.trim()) return;
    addSubjectAlias(selectedSubject.id, newAliasText.trim());
    setNewAliasText("");
  };

  // ─── AI Mode & Key Handlers ───
  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput.trim());
    setApiKeySavedStatus(true);
    setTimeout(() => setApiKeySavedStatus(false), 3000);
    Alert.alert("Tersimpan", t("apiKeySaved"));
  };

  const handleSaveProxy = () => {
    updateAppSettings({
      proxyUrl: proxyUrlInput.trim(),
      proxyToken: proxyTokenInput.trim(),
    });
    Alert.alert("Tersimpan", "Konfigurasi server proksi berhasil disimpan.");
  };

  // ─── Backup & Restore Handlers ───
  const handleExportBackup = async () => {
    const res = await exportBackupData();
    if (res.success && res.jsonString) {
      if (Platform.OS !== "web" && res.filePath) {
        // Sharing handled inside exportBackupData or fallback to Share dialog
      } else {
        Share.share({
          message: res.jsonString,
          title: "StudyAir Backup JSON",
        });
      }
    } else {
      Alert.alert("Gagal Ekspor", "Tidak dapat mengekspor cadangan data.");
    }
  };

  const handleImportBackup = async () => {
    if (!importJsonText.trim()) return;
    const res = await importBackupData(importJsonText.trim());
    if (res.success) {
      Alert.alert("Impor Berhasil", res.message);
      setImportModalVisible(false);
      setImportJsonText("");
    } else {
      Alert.alert("Gagal Impor", res.message);
    }
  };

  const handleResetAllData = () => {
    Alert.alert(
      "Reset Semua Data?",
      "Tindakan ini akan menghapus semua jadwal, tugas, mapel, dan catatan belajar. Tindakan ini tidak dapat dibatalkan.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Reset Semuanya",
          style: "destructive",
          onPress: () => {
            resetAll();
            Alert.alert("Selesai", "Semua data telah dikembalikan ke kondisi awal.");
          },
        },
      ]
    );
  };

  if (activeSection === null) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScreenHeader
          title={t("settings")}
          onBack={navigation.goBack}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.rootListContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title={t("settings_group_academic")} />
          <ListRow
            title={t("settings_subjects_title")}
            subtitle={t("settings_subjects_sub", { count: subjects.length })}
            leftIcon="book-outline"
            leftIconColor={colors.primary}
            onPress={() => navigation.navigate("Subjects")}
          />
          <ListRow
            title={t("bellSchedule")}
            subtitle={t("settings_periods_count", { count: periodTimes.length })}
            leftIcon="time-outline"
            leftIconColor={colors.primary}
            onPress={() => {
              HapticFeedback.light();
              setActiveSection("jamPelajaran");
            }}
          />
          <ListRow
            title={t("settings_teachers_title")}
            subtitle={t("settings_teachers_sub")}
            leftIcon="people-outline"
            leftIconColor={colors.primary}
            onPress={() => {
              HapticFeedback.light();
              setTeacherDirectoryVisible(true);
            }}
          />
          <ListRow
            title={t("settings_grades_title")}
            subtitle={t("settings_grades_sub")}
            leftIcon="stats-chart-outline"
            leftIconColor={colors.primary}
            onPress={() => navigation.navigate("Grades")}
          />
          <ListRow
            title={t("settings_exams_title")}
            subtitle={t("settings_exams_sub")}
            leftIcon="ribbon-outline"
            leftIconColor={colors.primary}
            onPress={() => navigation.navigate("Exams")}
          />

          <SectionHeader title={t("settings_group_preferences")} />
          <ListRow
            title={t("appearanceLanguage")}
            subtitle={`${(appSettings.language === "id" ? THEMES[appSettings.theme]?.nameId : THEMES[appSettings.theme]?.name) || "Navy"} • ${appSettings.language === "id" ? "Bahasa Indonesia" : "English"}`}
            leftIcon="color-palette-outline"
            leftIconColor={colors.primary}
            onPress={() => {
              HapticFeedback.light();
              setActiveSection("tampilan");
            }}
          />
          <ListRow
            title={t("remindersNotifications")}
            subtitle={appSettings.notificationsEnabled ? t("settings_active") : t("settings_inactive")}
            leftIcon="notifications-outline"
            leftIconColor={colors.amber}
            onPress={() => {
              HapticFeedback.light();
              setActiveSection("pengingat");
            }}
          />
          <ListRow
            title={t("settings_streak_title")}
            subtitle={`${appSettings.streakCountEveryDay ? t("settings_streak_every_day") : t("settings_streak_school_days")} • Min ${appSettings.streakMinFocusMinutes || 15} ${t("menit_singkat")}`}
            leftIcon="flame-outline"
            leftIconColor={colors.amber}
            onPress={() => {
              HapticFeedback.light();
              setActiveSection("streak");
            }}
          />

          <SectionHeader title={t("settings_group_system")} />
          <ListRow
            title={t("backupData")}
            subtitle={t("settings_backup_sub")}
            leftIcon="cloud-upload-outline"
            leftIconColor={colors.emerald}
            onPress={() => {
              HapticFeedback.light();
              setActiveSection("dataCadangan");
            }}
          />
          <ListRow
            title={t("settings_advanced_title")}
            subtitle={t("settings_advanced_sub")}
            leftIcon="options-outline"
            leftIconColor={colors.accent}
            onPress={() => {
              HapticFeedback.light();
              setActiveSection("lanjutan");
            }}
          />
          <ListRow
            title={t("update_sheet_title")}
            subtitle={t("update_card_title", { version: CURRENT_APP_VERSION })}
            rightText={
              isUpdateAvailable
                ? t("update_badge_available", { version: effectiveVersion })
                : t("update_badge_latest")
            }
            leftIcon="information-circle-outline"
            leftIconColor={colors.textSecondary}
            onPress={handleCheckUpdate}
          />
        </ScrollView>

        <TeacherDirectoryModal
          visible={teacherDirectoryVisible}
          onClose={() => setTeacherDirectoryVisible(false)}
        />

        {/* ─── App Version & Download BottomSheet ─── */}
        <BottomSheet
          visible={updateModalVisible}
          onClose={() => setUpdateModalVisible(false)}
          title={t("update_sheet_title")}
        >
          <View style={styles.updateModalHeaderRow}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.updateModalAppIcon}
              accessibilityLabel={t("appTitle")}
            />
            <View style={{ flex: 1 }}>
              <Pressable
                onPress={handleBuildNumberClick}
                hitSlop={touchTarget.min / 2}
                accessibilityRole="button"
                accessibilityLabel="Nomor Build Aplikasi"
              >
                <Text style={styles.updateModalTitle}>
                  {t("update_card_title", { version: effectiveVersion })}
                </Text>
                <Text style={styles.updateModalSubtitle}>
                  {t("update_meta_line", {
                    version: effectiveVersion,
                    build: updateInfo?.versionCode || CURRENT_VERSION_CODE,
                    size: effectiveSizeMB,
                  })}
                </Text>
              </Pressable>
              {devToastMessage ? (
                <View style={styles.devToastPill}>
                  <Ionicons name="sparkles" size={13} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.devToastText}>{devToastMessage}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.updateStatusBanner,
              isUpdateAvailable && styles.updateStatusBannerAvailable,
            ]}
          >
            <Ionicons
              name={isUpdateAvailable ? "sparkles" : "checkmark-circle"}
              size={18}
              color={isUpdateAvailable ? colors.primary : colors.emerald}
            />
            <Text
              style={[
                styles.updateStatusBannerText,
                isUpdateAvailable && { color: colors.primary },
              ]}
            >
              {isUpdateAvailable
                ? t("update_status_available", { version: effectiveVersion })
                : t("update_status_latest", { version: CURRENT_APP_VERSION })}
            </Text>
          </View>

          <View style={styles.changelogBox}>
            <Text style={styles.changelogHeading}>
              {t("update_changelog_heading", { version: effectiveVersion })}
            </Text>
            <View style={styles.changelogItem}>
              <Text style={styles.changelogBullet}>🚀</Text>
              <Text style={styles.changelogText}>{t("update_note_1")}</Text>
            </View>
            <View style={styles.changelogItem}>
              <Text style={styles.changelogBullet}>🐉</Text>
              <Text style={styles.changelogText}>{t("update_note_2")}</Text>
            </View>
            <View style={styles.changelogItem}>
              <Text style={styles.changelogBullet}>📊</Text>
              <Text style={styles.changelogText}>{t("update_note_3")}</Text>
            </View>
            <View style={styles.changelogItem}>
              <Text style={styles.changelogBullet}>🎨</Text>
              <Text style={styles.changelogText}>{t("update_note_4")}</Text>
            </View>
          </View>

          <View style={styles.updateModalActions}>
            <Pressable
              style={styles.modalDownloadBtn}
              onPress={() => {
                handleDownloadApp();
              }}
              accessibilityRole="button"
            >
              <Ionicons
                name="download"
                size={16}
                color={colors.textInverse}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.modalDownloadBtnText}>
                {downloadingApk
                  ? t("update_btn_downloading")
                  : t("update_download_full_btn", { size: effectiveSizeMB })}
              </Text>
            </Pressable>

            <View style={styles.updateSecondaryActionsRow}>
              <Pressable
                style={styles.updateSecondaryBtn}
                onPress={handleCopyDownloadLink}
                accessibilityRole="button"
              >
                <Ionicons
                  name={linkCopied ? "checkmark-circle" : "copy-outline"}
                  size={15}
                  color={linkCopied ? colors.emerald : colors.primary}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.updateSecondaryBtnText,
                    linkCopied && { color: colors.emerald },
                  ]}
                >
                  {linkCopied ? t("update_link_copied") : t("update_copy_link_btn")}
                </Text>
              </Pressable>

              <Pressable
                style={styles.updateSecondaryBtn}
                onPress={handleOpenDownloadPortal}
                accessibilityRole="button"
              >
                <Ionicons
                  name="open-outline"
                  size={15}
                  color={colors.textSecondary}
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.updateSecondaryBtnText}>
                  {t("update_open_portal_btn")}
                </Text>
              </Pressable>
            </View>
          </View>
        </BottomSheet>
      </SafeAreaView>
    );
  }

  const sectionTitle =
    activeSection === "tampilan"
      ? t("appearanceLanguage")
      : activeSection === "pengingat"
      ? t("remindersNotifications")
      : activeSection === "jamPelajaran"
      ? t("bellSchedule")
      : activeSection === "streak"
      ? t("settings_streak_title")
      : activeSection === "dataCadangan"
      ? t("backupData")
      : t("settings_advanced_title");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScreenHeader
        title={sectionTitle}
        onBack={() => setActiveSection(null)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════════════════
            SECTION 1: APPEARANCE & LANGUAGE
            ══════════════════════════════════════════════════════════ */}
        {activeSection === "tampilan" && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t("appearanceLanguage")}</Text>
          </View>

          {/* Theme Selector */}
          <Text style={styles.fieldLabel}>{t("themeLabel")}</Text>
          <View style={styles.themeGrid}>
            {(Object.keys(THEMES) as AppTheme[]).map((themeKey) => {
              const theme = THEMES[themeKey];
              const isSelected = appSettings.theme === themeKey;
              return (
                <Pressable
                  key={themeKey}
                  style={[
                    styles.themeCard,
                    isSelected && styles.themeCardActive,
                  ]}
                  onPress={() => {
                    HapticFeedback.light();
                    applyTheme(themeKey);
                    updateAppSettings({ theme: themeKey });
                  }}
                >
                  <View style={styles.themeSwatchContainer}>
                    <View style={[styles.themeSwatchBg, { backgroundColor: theme.background }]}>
                      <View style={[styles.themeSwatchDot, { backgroundColor: theme.primary }]} />
                    </View>
                  </View>
                  <View style={styles.themeInfo}>
                    <Text
                      style={[
                        styles.themeName,
                        isSelected && styles.themeNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {appSettings.language === "id" ? theme.nameId : theme.name}
                    </Text>
                    <Text style={styles.themeSubtext}>
                      {theme.isDark ? (appSettings.language === "id" ? "Mode Gelap" : "Dark Mode") : (appSettings.language === "id" ? "Mode Terang" : "Light Mode")}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.themeCheckBadge}>
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Language Selector */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>{t("languageLabel")}</Text>
          <View style={styles.optionsRow}>
            <Pressable
              style={[
                styles.optionButton,
                appSettings.language === "id" && styles.optionButtonActive,
              ]}
              onPress={() => {
                HapticFeedback.light();
                updateAppSettings({ language: "id" });
              }}
            >
              <Text style={styles.flagIcon}>🇮🇩</Text>
              <Text
                style={[
                  styles.optionButtonText,
                  appSettings.language === "id" && styles.optionButtonTextActive,
                ]}
              >
                Bahasa Indonesia
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.optionButton,
                appSettings.language === "en" && styles.optionButtonActive,
              ]}
              onPress={() => {
                HapticFeedback.light();
                updateAppSettings({ language: "en" });
              }}
            >
              <Text style={styles.flagIcon}>🇬🇧</Text>
              <Text
                style={[
                  styles.optionButtonText,
                  appSettings.language === "en" && styles.optionButtonTextActive,
                ]}
              >
                English
              </Text>
            </Pressable>
          </View>

          {/* Onboarding Tutorial Replay (Phase 12) */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>{t("settings_onboarding_label")}</Text>
          <Pressable
            style={[styles.optionButton, { flex: undefined, width: "100%", justifyContent: "center", minHeight: 44, borderColor: colors.borderLight }]}
            onPress={() => {
              updateAppSettings({ hasCompletedOnboarding: false });
              Alert.alert(
                "Panduan Onboarding 🚀",
                "Panduan 3 langkah awal StudyAir telah diaktifkan kembali. Tekan 'Buka Sekarang' untuk memulai.",
                [
                  { text: t("cancel"), style: "cancel" },
                  { text: "Buka Sekarang", onPress: () => navigation.navigate("Home") },
                ]
              );
            }}
          >
            <Ionicons name="sparkles" size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.optionButtonText, { color: colors.accent, fontWeight: "700" }]}>
              {t("settings_onboarding_btn")}
            </Text>
          </Pressable>
        </View>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 2: REMINDERS & NOTIFICATIONS
            ══════════════════════════════════════════════════════════ */}
        {activeSection === "pengingat" && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.amber} />
            <Text style={styles.sectionTitle}>Pengingat & Notifikasi</Text>
          </View>

          {/* Master Switch */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: spacing.md }}>
              <Text style={styles.switchTitle}>Aktifkan Notifikasi</Text>
              <Text style={styles.switchDesc}>Kirim pengingat jadwal harian dan tenggat tugas sekolah</Text>
            </View>
            <Switch
              value={appSettings.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={appSettings.notificationsEnabled ? "#ffffff" : colors.textMuted}
            />
          </View>

          {/* SubSettings: Always visible, greyed out when off */}
          <View
            style={[
              styles.subSettingsContainer,
              !appSettings.notificationsEnabled && { opacity: 0.45, pointerEvents: "none" },
            ]}
          >
            {/* Evening Preview Notification */}
            <View style={styles.subSettingCard}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subSettingTitle}>Ringkasan malam</Text>
                  <Text style={styles.subSettingDesc}>Pratinjau jadwal dan persiapan barang untuk besok</Text>
                </View>
                <Switch
                  disabled={!appSettings.notificationsEnabled}
                  value={appSettings.eveningReminderEnabled}
                  onValueChange={(val) => {
                    updateAppSettings({ eveningReminderEnabled: val });
                    syncNotifications();
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={appSettings.eveningReminderEnabled ? "#ffffff" : colors.textMuted}
                />
              </View>

              <View style={styles.timeSettingRow}>
                <Text style={styles.timeSettingLabel}>Waktu Pengingat:</Text>
                <TextInput
                  editable={appSettings.notificationsEnabled}
                  style={styles.timeInput}
                  value={appSettings.eveningReminderTime}
                  onChangeText={(val) => {
                    updateAppSettings({ eveningReminderTime: val });
                  }}
                  onBlur={syncNotifications}
                  placeholder="20:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Morning Alert Notification */}
            <View style={[styles.subSettingCard, { marginTop: spacing.md }]}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subSettingTitle}>Pengingat tugas</Text>
                  <Text style={styles.subSettingDesc}>Peringatan pagi untuk tugas yang harus dikumpulkan hari ini</Text>
                </View>
                <Switch
                  disabled={!appSettings.notificationsEnabled}
                  value={appSettings.morningAlertEnabled}
                  onValueChange={(val) => {
                    updateAppSettings({ morningAlertEnabled: val });
                    syncNotifications();
                  }}
                  trackColor={{ false: colors.border, true: colors.amber }}
                  thumbColor={appSettings.morningAlertEnabled ? "#ffffff" : colors.textMuted}
                />
              </View>

              <View style={styles.timeSettingRow}>
                <Text style={styles.timeSettingLabel}>Waktu Pengingat:</Text>
                <TextInput
                  editable={appSettings.notificationsEnabled}
                  style={styles.timeInput}
                  value={appSettings.morningAlertTime}
                  onChangeText={(val) => {
                    updateAppSettings({ morningAlertTime: val });
                  }}
                  onBlur={syncNotifications}
                  placeholder="06:30"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Test Notification Trigger */}
            <Pressable
              style={styles.testNotificationBtn}
              onPress={handleSendTestNotification}
              disabled={!appSettings.notificationsEnabled}
            >
              <Ionicons name="paper-plane-outline" size={16} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.testNotificationBtnText}>Kirim Uji Coba Notifikasi</Text>
            </Pressable>
          </View>
        </View>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: BELL SCHEDULE / PERIOD TIMES
            ══════════════════════════════════════════════════════════ */}
        {activeSection === "jamPelajaran" && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={20} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Jam Pelajaran (Bell Times)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Atur rentang jam untuk setiap periode belajar dan jeda istirahat/ishoma.
          </Text>

          <BellTimesEditor
            periodTimes={periodTimes}
            onChangePeriodTimes={(times) => setPeriodTimes(times)}
            breakEntries={breakEntriesFromTimetable}
            mode="settings"
          />
        </View>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 4 & 5: LANJUTAN (ALIASES & AI MODE)
            ══════════════════════════════════════════════════════════ */}
        {activeSection === "lanjutan" && (
          <>
            <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="pricetags-outline" size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>{t("subjectAliases")}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{t("subjectAliasesDesc")}</Text>

          {/* Subject Horizontal Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subjectChipScroll}
            contentContainerStyle={styles.subjectChipContent}
          >
            {subjects.map((s) => {
              const isSelected = s.id === selectedSubjectId;
              const subColor = s.color || s.color_hex || colors.primary;
              return (
                <Pressable
                  key={s.id}
                  style={[
                    styles.subjectChip,
                    isSelected && { borderColor: subColor, backgroundColor: `${subColor}22` },
                  ]}
                  onPress={() => setSelectedSubjectId(s.id)}
                >
                  <View style={[styles.subjectDot, { backgroundColor: subColor }]} />
                  <Text
                    style={[
                      styles.subjectChipText,
                      isSelected && { color: "#ffffff", fontWeight: "700" },
                    ]}
                  >
                    {s.title || s.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected Subject Aliases Editor */}
          {selectedSubject && (
            <View style={styles.aliasEditorContainer}>
              <Text style={styles.aliasGroupLabel}>
                Alias aktif untuk <Text style={{ color: colors.text, fontWeight: "700" }}>{selectedSubject.title}</Text>:
              </Text>

              <View style={styles.aliasChipsWrap}>
                {(selectedSubject.aliases || []).length === 0 ? (
                  <Text style={styles.noAliasText}>Belum ada alias kustom untuk mapel ini.</Text>
                ) : (
                  (selectedSubject.aliases || []).map((alias) => (
                    <View key={alias} style={styles.aliasTag}>
                      <Text style={styles.aliasTagText}>{alias}</Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => removeSubjectAlias(selectedSubject.id, alias)}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ))
                )}
              </View>

              {/* Add New Alias Input */}
              <View style={styles.addAliasRow}>
                <TextInput
                  style={styles.addAliasInput}
                  value={newAliasText}
                  onChangeText={setNewAliasText}
                  placeholder="Tambah alias baru (misal: MTK, Matematika)"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleAddAlias}
                />
                <Pressable
                  style={[
                    styles.addAliasSubmitBtn,
                    !newAliasText.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleAddAlias}
                  disabled={!newAliasText.trim()}
                >
                  <Text style={styles.addAliasSubmitText}>{t("addAlias")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════
            SECTION 5: ADVANCED SETTINGS & AI MODE
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.violet} />
            <Text style={styles.sectionTitle}>{t("aiMode")}</Text>
          </View>

          {/* Mode Switcher */}
          <View style={styles.aiModeSelector}>
            <Pressable
              style={[
                styles.aiModeCard,
                appSettings.aiMode === "secure_store" && styles.aiModeCardActive,
              ]}
              onPress={() => updateAppSettings({ aiMode: "secure_store" })}
            >
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={appSettings.aiMode === "secure_store" ? colors.primary : colors.textMuted}
              />
              <Text style={styles.aiModeTitle}>{t("modeSecureStore")}</Text>
              <Text style={styles.aiModeDesc}>
                Kunci API disimpan secara terenkripsi di keystore hardware perangkat.
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.aiModeCard,
                appSettings.aiMode === "proxy" && styles.aiModeCardActive,
              ]}
              onPress={() => updateAppSettings({ aiMode: "proxy" })}
            >
              <Ionicons
                name="server"
                size={20}
                color={appSettings.aiMode === "proxy" ? colors.accent : colors.textMuted}
              />
              <Text style={styles.aiModeTitle}>{t("modeProxy")}</Text>
              <Text style={styles.aiModeDesc}>
                Terhubung ke server proksi sekolah atau endpoint self-hosted.
              </Text>
            </Pressable>
          </View>

          {/* Mode A: Secure Store Configuration */}
          {appSettings.aiMode === "secure_store" ? (
            <View style={styles.apiKeySection}>
              <Text style={styles.fieldLabel}>{t("geminiApiKeyLabel")}</Text>
              <View style={styles.apiKeyInputRow}>
                <TextInput
                  style={styles.apiKeyInput}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder="Masukkan API Key..."
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!apiKeyVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.apiKeyVisibilityBtn}
                  onPress={() => setApiKeyVisible(!apiKeyVisible)}
                  hitSlop={8}
                >
                  <Ionicons
                    name={apiKeyVisible ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={styles.apiKeyActionsRow}>
                <Pressable style={styles.saveApiKeyBtn} onPress={handleSaveApiKey}>
                  <Ionicons name="lock-closed" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.saveApiKeyBtnText}>{t("saveApiKey")}</Text>
                </Pressable>
                {apiKeySavedStatus && (
                  <Text style={styles.savedBadgeText}>✓ Tersimpan di Keystore</Text>
                )}
              </View>
            </View>
          ) : (
            /* Mode B: Proxy Configuration */
            <View style={styles.apiKeySection}>
              <Text style={styles.fieldLabel}>URL Server Proksi</Text>
              <TextInput
                style={styles.proxyInput}
                value={proxyUrlInput}
                onChangeText={setProxyUrlInput}
                placeholder="https://studyair-proxy.school.edu/v1"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Token Autentikasi (Opsional)</Text>
              <TextInput
                style={styles.proxyInput}
                value={proxyTokenInput}
                onChangeText={setProxyTokenInput}
                placeholder="Bearer token..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Pressable style={[styles.saveApiKeyBtn, { marginTop: spacing.md }]} onPress={handleSaveProxy}>
                <Text style={styles.saveApiKeyBtnText}>Simpan Pengaturan Proksi</Text>
              </Pressable>
            </View>
          )}

          {/* Daily Scan Quota Meter */}
          <View style={styles.quotaMeterCard}>
            <View style={styles.quotaHeaderRow}>
              <Text style={styles.quotaTitle}>{t("dailyQuota")}</Text>
              <Text style={styles.quotaCountText}>
                {remainingScans} / {appSettings.dailyScanQuota} tersisa
              </Text>
            </View>

            <View style={styles.quotaTrack}>
              <View style={[styles.quotaFill, { width: `${quotaPercentage}%` }]} />
            </View>

            <Text style={styles.quotaSub}>
              {t("scansUsed", {
                used: appSettings.scansUsedToday || 0,
                quota: appSettings.dailyScanQuota,
              })} • Reset otomatis setiap tengah malam.
            </Text>
          </View>
        </View>

        {Boolean(appSettings.developerModeEnabled) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="construct-outline" size={20} color={colors.amber} />
              <Text style={styles.sectionTitle}>Simulator Streak</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Alat uji coba hari streak, kondisi terancam, dan perayaan milestone.
            </Text>
            <Pressable
              style={[styles.backupActionBtn, { backgroundColor: colors.amber, borderColor: colors.amberBottom }]}
              onPress={() => setStreakDebugModalVisible(true)}
            >
              <Ionicons name="construct" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.backupActionBtnText}>Buka Simulator Streak</Text>
            </Pressable>

            <Pressable
              style={[
                styles.backupActionBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderLight,
                  marginTop: 10,
                },
              ]}
              onPress={() => {
                updateAppSettings({ developerModeEnabled: false });
                soundFX?.playClick?.();
                HapticFeedback?.light?.();
                setSnackbarMessage(t("dev_mode_deactivated"));
                setSnackbarVisible(true);
              }}
            >
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.backupActionBtnText, { color: colors.textSecondary }]}>
                {t("dev_mode_disable_btn")}
              </Text>
            </Pressable>
          </View>
        )}
      </>
    )}

    {/* ══════════════════════════════════════════════════════════
        SECTION 6 & 7: DATA & CADANGAN
        ══════════════════════════════════════════════════════════ */}
    {activeSection === "dataCadangan" && (
      <>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.emerald} />
            <Text style={styles.sectionTitle}>Data & Cadangan</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Cadangkan data jadwal, tugas, dan mata pelajaran agar tidak hilang saat berganti perangkat.
          </Text>

          <View style={styles.backupActionsColumn}>
            <Pressable style={styles.backupActionBtn} onPress={handleExportBackup}>
              <Ionicons name="download-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.backupActionBtnText}>Ekspor cadangan</Text>
            </Pressable>

            <Pressable
              style={[styles.backupActionBtn, styles.importBtn]}
              onPress={() => setImportModalVisible(true)}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.backupActionBtnText}>Impor cadangan</Text>
            </Pressable>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════
            SECTION 7: DATA CLEANUP & RESET
            ══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trash-bin-outline" size={20} color={colors.rose} />
            <Text style={styles.sectionTitle}>Hapus Data Contoh & Reset</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Kelola penghapusan data contoh bawaan atau reset total aplikasi jika ingin memulai dari awal.
          </Text>

          <View style={styles.backupActionsColumn}>
            <Pressable
              style={[styles.backupActionBtn, styles.clearSampleBtn]}
              onPress={handleClearSampleData}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.amber} style={{ marginRight: 8 }} />
              <Text style={[styles.backupActionBtnText, { color: colors.amber }]}>Hapus data contoh</Text>
            </Pressable>

            <Pressable
              style={[styles.backupActionBtn, styles.resetBtn]}
              onPress={handleResetAllData}
            >
              <Ionicons name="trash-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.backupActionBtnText}>Reset semua data</Text>
            </Pressable>
          </View>
        </View>
      </>
    )}

    {/* ══════════════════════════════════════════════════════════
        SECTION: ATURAN STREAK
        ══════════════════════════════════════════════════════════ */}
    {activeSection === "streak" && (
      <>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="flame" size={20} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Aturan Study Streak</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Atur bagaimana konsistensi belajarmu dihitung setiap hari.
          </Text>

          {/* Hitung Setiap Hari Toggle */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={styles.settingRowTitle}>Hitung Setiap Hari</Text>
              <Text style={styles.settingRowDesc}>
                Jika aktif, akhir pekan & hari libur wajib belajar. Jika mati (standar), libur tidak memutus streak.
              </Text>
            </View>
            <Switch
              value={appSettings.streakCountEveryDay ?? false}
              onValueChange={(val) => updateAppSettings({ streakCountEveryDay: val })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Minimum Focus Duration */}
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Durasi Fokus Minimum (Menit)</Text>
          <Text style={styles.settingRowDesc}>
            Waktu fokus minimal dalam sehari agar terhitung sebagai hari belajar.
          </Text>
          <View style={styles.optionsRow}>
            {[10, 15, 20, 25, 30].map((mins) => {
              const currentMin = appSettings.streakMinFocusMinutes || 15;
              const isSelected = currentMin === mins;
              return (
                <Pressable
                  key={mins}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonActive,
                    { minWidth: 54 },
                  ]}
                  onPress={() => updateAppSettings({ streakMinFocusMinutes: mins })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      isSelected && styles.optionButtonTextActive,
                    ]}
                  >
                    {mins} mnt
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Shortcut to Streak Screen */}
          <View style={styles.divider} />
          <Pressable
            style={styles.backupActionBtn}
            onPress={() => {
              setActiveSection(null);
              navigation.navigate("Streak");
            }}
          >
            <Ionicons name="flame-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.backupActionBtnText}>Buka Layar Streak & Lencana</Text>
          </Pressable>

          {/* Reset Streak */}
          <Pressable
            style={[styles.backupActionBtn, styles.resetBtn, { marginTop: 8 }]}
            onPress={() => {
              Alert.alert(
                "Reset Streak?",
                "Apakah kamu yakin ingin mengembalikan streak belajar ke 0? Tindakan ini tidak dapat dibatalkan.",
                [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                      resetStreak();
                      Alert.alert("Streak Direset", "Streak belajarmu telah diatur kembali ke 0.");
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.backupActionBtnText}>Reset Streak Belajar</Text>
          </Pressable>
        </View>
      </>
    )}
      </ScrollView>

      {/* ─── Import JSON BottomSheet ─── */}
      <BottomSheet
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        title="Impor Cadangan Data"
        subtitle="Tempelkan teks JSON cadangan StudyAir di bawah ini untuk memulihkan jadwal, tugas, dan mata pelajaran."
        primaryButtonLabel="Pulihkan Data"
        primaryButtonDisabled={!importJsonText.trim()}
        onPrimaryButtonPress={handleImportBackup}
      >
        <TextInput
          style={styles.modalJsonInput}
          value={importJsonText}
          onChangeText={setImportJsonText}
          placeholder='{"version": 1, "exportedAt": "...", "data": {...}}'
          placeholderTextColor={colors.textMuted}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
        />
      </BottomSheet>

      {/* ─── Streak Debug Menu & Simulator ─── */}
      {Boolean(appSettings.developerModeEnabled) && (
        <StreakDebugModal
          visible={streakDebugModalVisible}
          onClose={() => setStreakDebugModalVisible(false)}
        />
      )}

      {/* ─── Feedback Snackbar ─── */}
      <Snackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3500}
      />
    </SafeAreaView>
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  backBtnText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeights.medium,
  },
  headerTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  rootListContent: {
    paddingBottom: spacing.xxxl,
  },
  scrollContent: {
    padding: tidySpacing.screen,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  settingRowTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  settingRowDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  optionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  optionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: touchTarget.min,
  },
  optionButtonActive: {
    borderColor: colors.primary,
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryBottom,
    backgroundColor: colors.primaryLight,
  },
  optionButtonText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.medium,
  },
  optionButtonTextActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.heavy,
  },
  themeSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  themeGrid: {
    gap: spacing.sm,
  },
  themeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderBottomWidth: 3.5,
    borderBottomColor: colors.borderBottom,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  themeCardActive: {
    borderColor: colors.primary,
    borderBottomColor: colors.primaryBottom,
    backgroundColor: colors.surface,
  },
  themeSwatchContainer: {
    marginRight: spacing.md,
  },
  themeSwatchBg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  themeSwatchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  themeNameActive: {
    color: colors.text,
  },
  themeSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  themeCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
  },
  flagIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  switchDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  subSettingsContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  subSettingCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subSettingTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  subSettingDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeSettingLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.text,
  },
  timeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    textAlign: "center",
    width: 80,
  },
  previewNotificationBox: {
    backgroundColor: "rgba(58, 134, 255, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.xs,
    marginTop: spacing.md,
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  previewTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  previewBody: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  testNotificationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    minHeight: touchTarget.min,
  },
  testNotificationBtnText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  periodListContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodBadgeText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeights.semibold,
  },
  periodInputsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  periodTimeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
    textAlign: "center",
    width: 68,
    justifyContent: "center",
  },
  periodTimeSep: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  periodDeleteBtn: {
    padding: spacing.xs,
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xs,
  },
  periodActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addPeriodBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  addPeriodBtnText: {
    color: colors.primary,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: 4,
  },
  addBreakBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentLight,
    borderRadius: radius.sm,
  },
  addBreakBtnText: {
    color: colors.accent,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  resetPeriodBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  resetPeriodBtnText: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.sm,
  },
  subjectChipScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  subjectChipContent: {
    gap: spacing.sm,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  subjectChipText: {
    fontSize: typography.fontSizes.sm,
    color: colors.textSecondary,
  },
  aliasEditorContainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aliasGroupLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  aliasChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  noAliasText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  aliasTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  aliasTagText: {
    fontSize: typography.fontSizes.xs,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
  addAliasRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  addAliasInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
  },
  addAliasSubmitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  addAliasSubmitText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  aiModeSelector: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  aiModeCard: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  aiModeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  aiModeTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: 4,
  },
  aiModeDesc: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  apiKeySection: {
    marginBottom: spacing.lg,
  },
  apiKeyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  apiKeyInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
  },
  apiKeyVisibilityBtn: {
    padding: spacing.xs,
  },
  proxyInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.fontSizes.sm,
  },
  apiKeyActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  saveApiKeyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minHeight: 36,
  },
  saveApiKeyBtnText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  savedBadgeText: {
    color: colors.emerald,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
  },
  quotaMeterCard: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  quotaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  quotaTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  quotaCountText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.amber,
  },
  quotaTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: spacing.xs,
  },
  quotaFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  quotaSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  backupActionsColumn: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  backupActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: touchTarget.min,
  },
  importBtn: {
    borderColor: colors.borderLight,
  },
  resetBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: colors.rose,
  },
  clearSampleBtn: {
    backgroundColor: colors.amberLight,
    borderColor: colors.amber,
  },
  backupActionBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: "#ffffff",
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  versionText: {
    fontSize: typography.fontSizes.xs,
    color: colors.textMuted,
  },
  buildText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.fontSizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalJsonInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.text,
    fontSize: 11,
    height: 180,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: spacing.lg,
  },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
  },
  modalCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: colors.textSecondary,
    fontSize: typography.fontSizes.sm,
  },
  modalConfirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  modalConfirmBtnText: {
    color: "#ffffff",
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  updateCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  updateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  updateAppIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  updateIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  updateCardTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  latestBadgePill: {
    backgroundColor: colors.emeraldLight,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  updateAvailableBadgePill: {
    backgroundColor: colors.primaryLight,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.emerald,
  },
  updateAvailableBadgeText: {
    color: colors.primary,
  },
  updateCardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  updateActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm + 4,
  },
  downloadApkBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  downloadApkBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textInverse,
  },
  checkUpdateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  checkUpdateBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  updateModalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    marginBottom: spacing.sm + 4,
  },
  updateModalAppIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  updateModalTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  updateModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  devToastPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  devToastText: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  updateStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.emeraldLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm + 4,
  },
  updateStatusBannerAvailable: {
    backgroundColor: colors.primaryLight,
  },
  updateStatusBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: typography.fontWeights.semibold,
    color: colors.emerald,
  },
  changelogBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 8,
    marginBottom: spacing.md,
  },
  changelogHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  changelogItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  changelogBullet: {
    fontSize: 13,
    lineHeight: 18,
  },
  changelogText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  updateModalActions: {
    gap: 8,
  },
  modalDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  modalDownloadBtnText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.textInverse,
  },
  updateSecondaryActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  updateSecondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  updateSecondaryBtnText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
});
