import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  BackHandler,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { MobileStudyProvider, useMobileStudyStore } from "./src/store";
import { HomeScreen } from "./src/screens/HomeScreen";
import { TasksScreen } from "./src/screens/TasksScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { SyllabusScreen } from "./src/screens/SyllabusScreen";
import { ExamsScreen } from "./src/screens/ExamsScreen";
import { AIScannerScreen } from "./src/screens/AIScannerScreen";
import { TimetableWizardScreen } from "./src/screens/TimetableWizardScreen";
import { FocusScreen } from "./src/screens/FocusScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { StreakScreen } from "./src/screens/StreakScreen";
import { TimetableScreen } from "./src/screens/TimetableScreen";
import { GradesScreen } from "./src/screens/GradesScreen";
import { StatsScreen } from "./src/screens/StatsScreen";
import { StreakCelebrationModal } from "./src/components/streak/StreakCelebrationModal";
import { QuickActionSheet } from "./src/components/QuickActionSheet";
import { OnboardingModal } from "./src/components/onboarding/OnboardingModal";
import { colors, spacing, radius, typography, touchTarget, applyTheme, THEMES } from "./src/theme";
import { t, setLanguage } from "./src/lib/i18n";
import { HapticFeedback } from "./src/lib/haptics";
import { soundFX } from "./src/lib/sound";

export type TabScreen =
  | "Today"
  | "Timetable"
  | "Tasks"
  | "Grades"
  | "Calendar"
  | "Stats"
  | "Exams"
  | "Subjects"
  | "Progress"
  | "AIScanner"
  | "Focus"
  | "TimetableWizard"
  | "Settings"
  | "Streak";

const MemoHomeScreen = React.memo(HomeScreen);
const MemoTasksScreen = React.memo(TasksScreen);
const MemoTimetableScreen = React.memo(TimetableScreen);
const MemoStatsScreen = React.memo(StatsScreen);

function resolveTabScreen(screen: string): TabScreen {
  const norm = (screen || "").replace(/^#\/?/, "").toLowerCase();
  if (norm === "home" || norm === "today" || norm === "rencana") return "Today";
  if (norm === "timetable" || norm === "jadwal" || norm === "jadwalpelajaran") return "Timetable";
  if (norm === "tasks" || norm === "tugas") return "Tasks";
  if (norm === "grades" || norm === "nilai" || norm === "rapor" || norm === "gpa") return "Grades";
  if (norm === "calendar" || norm === "kalender") return "Calendar";
  if (norm === "stats" || norm === "statistik") return "Stats";
  if (norm === "exams" || norm === "ulangan" || norm === "ujian") return "Exams";
  if (norm === "syllabus" || norm === "subjects" || norm === "pelajaran" || norm === "mapel") return "Subjects";
  if (norm === "dashboard" || norm === "progress" || norm === "analytics") return "Progress";
  if (norm === "aiscanner") return "AIScanner";
  if (norm === "focus" || norm === "fokus") return "Focus";
  if (norm === "timetablewizard" || norm === "timetableimport" || norm === "import") return "TimetableWizard";
  if (norm === "settings" || norm === "pengaturan") return "Settings";
  if (norm === "streak") return "Streak";
  return "Today";
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabScreen>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hash) {
      return resolveTabScreen(window.location.hash);
    }
    return "Today";
  });
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => ({
    Today: true,
    [activeTab]: true,
  }));
  const activeTabRef = useRef<TabScreen>(activeTab);
  activeTabRef.current = activeTab;
  const navHistoryRef = useRef<TabScreen[]>(activeTab === "Today" ? ["Today"] : ["Today", activeTab]);
  const isPopStateRef = useRef<boolean>(false);
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [quickActionInitialMode, setQuickActionInitialMode] = useState<
    "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addGrade"
  >("none");

  const openQuickAction = useCallback((mode: "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addGrade" = "none") => {
    HapticFeedback.light();
    soundFX.playClick();
    setQuickActionInitialMode(mode);
    setQuickActionVisible(true);
  }, []);
  const [syllabusInitialDay, setSyllabusInitialDay] = useState<number | undefined>(undefined);
  const [syllabusViewMode, setSyllabusViewMode] = useState<"byDay" | "bySubject" | undefined>(undefined);
  const [syllabusNonce, setSyllabusNonce] = useState<number>(0);
  const {
    isAIScanning,
    appSettings,
    isDatabaseReady,
    streakState,
    activeCelebrationMilestone,
    dismissCelebration,
  } = useMobileStudyStore();
  const [onboardingDismissedThisSession, setOnboardingDismissedThisSession] = useState(false);

  if (appSettings?.theme) {
    applyTheme(appSettings.theme);
  }
  if (appSettings?.language) {
    setLanguage(appSettings.language);
  }

  useEffect(() => {
    if (appSettings?.theme) {
      applyTheme(appSettings.theme);
    }
    if (appSettings?.language) {
      setLanguage(appSettings.language);
    }
  }, [appSettings?.theme, appSettings?.language]);

  const showOnboarding =
    isDatabaseReady &&
    !appSettings.hasCompletedOnboarding &&
    !onboardingDismissedThisSession;

  const [gestureHintVisible, setGestureHintVisible] = useState(false);

  useEffect(() => {
    if (!isDatabaseReady || showOnboarding) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    AsyncStorage.getItem("@studyair_gesture_hint_v1")
      .then((seen) => {
        if (!seen) {
          setGestureHintVisible(true);
          AsyncStorage.setItem("@studyair_gesture_hint_v1", "1").catch(() => {});
          timer = setTimeout(() => setGestureHintVisible(false), 4000);
        }
      })
      .catch(() => {});
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isDatabaseReady, showOnboarding]);

  const handleNavigate = useCallback((screen: string, params?: any) => {
    const target: TabScreen = resolveTabScreen(screen);
    if (target === "Subjects") {
      if (params?.initialDay !== undefined || params?.day !== undefined) {
        setSyllabusInitialDay(params.initialDay !== undefined ? params.initialDay : params.day);
      }
      if (params?.viewMode) {
        setSyllabusViewMode(params.viewMode);
      }
      setSyllabusNonce((n) => n + 1);
    }

    const current = activeTabRef.current;
    if (target !== current) {
      HapticFeedback.light();
      soundFX.playClick();
      const stack = navHistoryRef.current;
      if (stack[stack.length - 1] !== target) {
        navHistoryRef.current = [...stack.slice(-19), target];
      }
      if (Platform.OS === "web" && typeof window !== "undefined" && !isPopStateRef.current) {
        try {
          window.history.pushState({ tab: target }, "", `#/${target.toLowerCase()}`);
        } catch {
          // Ignore sandbox history restrictions
        }
      }
    }
    setVisitedTabs((prev) => (prev[target] ? prev : { ...prev, [target]: true }));
    setActiveTab(target);
  }, []);

  const handleOpenStreak = useCallback(() => {
    handleNavigate("Streak");
  }, [handleNavigate]);

  const handleBackToTab = useCallback(() => {
    soundFX.playClick();
    const stack = navHistoryRef.current;
    let target: TabScreen = "Today";
    if (stack.length > 1) {
      stack.pop();
      target = stack[stack.length - 1] || "Today";
    } else {
      target = activeTabRef.current === "TimetableWizard" ? "Timetable" : "Today";
      navHistoryRef.current = [target];
    }
    if (target === "TimetableWizard") {
      target = "Timetable";
    }
    if (Platform.OS === "web" && typeof window !== "undefined" && !isPopStateRef.current) {
      try {
        window.history.replaceState({ tab: target }, "", `#/${target.toLowerCase()}`);
      } catch {
        // Ignore sandbox history restrictions
      }
    }
    setVisitedTabs((prev) => (prev[target] ? prev : { ...prev, [target]: true }));
    setActiveTab(target);
  }, []);

  // Sync browser Back/Forward (popstate) on Web Simulator
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onPopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;
      const target = event.state?.tab
        ? resolveTabScreen(event.state.tab)
        : resolveTabScreen(window.location.hash || "Today");
      const stack = navHistoryRef.current;
      if (stack.length > 1 && stack[stack.length - 2] === target) {
        stack.pop();
      } else if (stack[stack.length - 1] !== target) {
        navHistoryRef.current = [...stack.slice(-19), target];
      }
      setVisitedTabs((prev) => (prev[target] ? prev : { ...prev, [target]: true }));
      setActiveTab(target);
      isPopStateRef.current = false;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Android Hardware Back Gesture / Button support
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (quickActionVisible) {
        setQuickActionVisible(false);
        setQuickActionInitialMode("none");
        return true;
      }
      if (activeCelebrationMilestone !== null) {
        dismissCelebration();
        return true;
      }
      if (navHistoryRef.current.length > 1 || activeTabRef.current !== "Today") {
        handleBackToTab();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [quickActionVisible, activeCelebrationMilestone, dismissCelebration, handleBackToTab]);

  const navigation = useMemo(
    () => ({
      navigate: handleNavigate,
      goBack: handleBackToTab,
    }),
    [handleNavigate, handleBackToTab]
  );

  const handleOpenAddTask = useCallback(() => openQuickAction("addTask"), [openQuickAction]);
  const handleOpenBatchCapture = useCallback(() => openQuickAction("pasteWhatsApp"), [openQuickAction]);
  const handleOpenSettings = useCallback(() => handleNavigate("Settings"), [handleNavigate]);
  const handleStartFocusForTask = useCallback((task: { id: string }) => handleNavigate("Focus", { taskId: task.id }), [handleNavigate]);

  const isAuxiliaryScreen = activeTab === "AIScanner";

  // On Web, CSS custom properties update all mounted tabs in <1ms without remounting.
  // On Native, StyleSheet rules are updated in-place and inactive tabs lazily remount on next visit.
  const tabLocaleThemeKey =
    Platform.OS === "web"
      ? `${appSettings?.language || "id"}`
      : `${appSettings?.theme || "navy"}-${appSettings?.language || "id"}`;

  useEffect(() => {
    setVisitedTabs({ [activeTabRef.current]: true });
  }, [tabLocaleThemeKey]);

  const activeThemePalette = THEMES[appSettings?.theme || "navy"] || THEMES.navy;

  return (
    <SafeAreaView
      style={[styles.appContainer, { backgroundColor: activeThemePalette.background }]}
    >
      <StatusBar style={activeThemePalette.isDark ? "light" : "dark"} />

      {/* ─── Back Navigation Header for Auxiliary Screens ─── */}
      {isAuxiliaryScreen && (
        <View style={styles.auxHeader}>
          <Pressable
            style={styles.auxBackBtn}
            onPress={handleBackToTab}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={styles.auxBackBtnText}>
              {t("back")}
            </Text>
          </Pressable>
          <Text style={styles.auxHeaderTitle}>
            {activeTab === "AIScanner"
              ? "Gemini AI"
              : activeTab === "Subjects"
              ? "Mata Pelajaran"
              : activeTab === "Focus"
              ? t("focusSessionTitle")
              : t("timetableImportTitle")}
          </Text>
          <View style={{ width: 48 }} />
        </View>
      )}

      {/* ─── Background AI Scanning Banner (Active across tabs) ─── */}
      {isAIScanning && activeTab !== "AIScanner" && (
        <Pressable
          style={styles.globalScanBanner}
          onPress={() => handleNavigate("AIScanner")}
        >
          <ActivityIndicator size="small" color={colors.textInverse} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.globalScanBannerTitle}>
              {t("ai_scanning_banner_title")}
            </Text>
            <Text style={styles.globalScanBannerSub}>
              {t("ai_scanning_banner_sub")}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
        </Pressable>
      )}

      {/* ─── Persistent Main Tabs + On-Demand Auxiliary Screens ─── */}
      <View style={styles.screenContainer}>
        {/* Tab 1: Today / Rencana */}
        {visitedTabs.Today && (
          <View key={`today-${tabLocaleThemeKey}`} style={[styles.screenWrapper, activeTab !== "Today" && styles.screenHidden]}>
            <MemoHomeScreen
              navigation={navigation}
              onOpenAddTask={handleOpenAddTask}
              onOpenBatchCapture={handleOpenBatchCapture}
            />
          </View>
        )}

        {/* Tab 2: Timetable / Jadwal */}
        {visitedTabs.Timetable && (
          <View key={`timetable-${tabLocaleThemeKey}`} style={[styles.screenWrapper, activeTab !== "Timetable" && styles.screenHidden]}>
            <MemoTimetableScreen navigation={navigation} />
          </View>
        )}

        {/* Tab 3: Tasks / Tugas */}
        {visitedTabs.Tasks && (
          <View key={`tasks-${tabLocaleThemeKey}`} style={[styles.screenWrapper, activeTab !== "Tasks" && styles.screenHidden]}>
            <MemoTasksScreen
              onOpenSettings={handleOpenSettings}
              onOpenStreak={handleOpenStreak}
              onStartFocusForTask={handleStartFocusForTask}
            />
          </View>
        )}

        {/* Tab 4: Stats / Statistik */}
        {visitedTabs.Stats && (
          <View key={`stats-${tabLocaleThemeKey}`} style={[styles.screenWrapper, activeTab !== "Stats" && styles.screenHidden]}>
            <MemoStatsScreen navigation={navigation} />
          </View>
        )}

        {/* Auxiliary Screens: Mounted on demand when active */}
        {activeTab === "Calendar" && (
          <View style={styles.screenWrapper}>
            <CalendarScreen navigation={navigation} onBack={handleBackToTab} />
          </View>
        )}
        {activeTab === "Grades" && (
          <View style={styles.screenWrapper}>
            <GradesScreen navigation={navigation} onBack={handleBackToTab} />
          </View>
        )}
        {activeTab === "Exams" && (
          <View style={styles.screenWrapper}>
            <ExamsScreen navigation={navigation} onBack={handleBackToTab} />
          </View>
        )}
        {activeTab === "Subjects" && (
          <View style={styles.screenWrapper}>
            <SyllabusScreen
              navigation={navigation}
              initialDay={syllabusInitialDay}
              initialViewMode={syllabusViewMode}
              navigationNonce={syllabusNonce}
            />
          </View>
        )}
        {activeTab === "Progress" && (
          <View style={styles.screenWrapper}>
            <DashboardScreen navigation={navigation} />
          </View>
        )}
        {activeTab === "AIScanner" && (
          <View style={styles.screenWrapper}>
            <AIScannerScreen navigation={navigation} />
          </View>
        )}
        {activeTab === "Focus" && (
          <View style={styles.screenWrapper}>
            <FocusScreen navigation={navigation} />
          </View>
        )}
        {activeTab === "TimetableWizard" && (
          <View style={styles.screenWrapper}>
            <TimetableWizardScreen navigation={navigation} />
          </View>
        )}
        {activeTab === "Settings" && (
          <View style={styles.screenWrapper}>
            <SettingsScreen navigation={navigation} />
          </View>
        )}
        {activeTab === "Streak" && (
          <View style={styles.screenWrapper}>
            <StreakScreen navigation={navigation} />
          </View>
        )}
      </View>

      {/* ─── One-Time Gesture Hint Pill ─── */}
      {gestureHintVisible && (
        <View style={styles.navToastPill} pointerEvents="none">
          <Ionicons name="hand-left-outline" size={14} color={colors.primary} />
          <Text style={styles.navToastText}>{t("gesture_hint_nav")}</Text>
        </View>
      )}

      {/* ─── School Planner 5-Tab Navigation Bar ─── */}
      {activeTab !== "TimetableWizard" && activeTab !== "Settings" && activeTab !== "Streak" && activeTab !== "Focus" && (
        <View style={styles.tabBar}>
          {/* Tab 1: Hari Ini */}
          <Pressable
            style={[styles.tabItem, activeTab === "Today" && styles.tabItemActive]}
            onPress={() => handleNavigate("Today")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "Today" }}
          >
            <View style={[styles.tabIconWrapper, activeTab === "Today" && styles.tabIconWrapperActive]}>
              <Ionicons
                name={activeTab === "Today" ? "today" : "today-outline"}
                size={21}
                color={activeTab === "Today" ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === "Today" && styles.tabLabelActive]}>
              {t("tabToday") || "Hari Ini"}
            </Text>
          </Pressable>

          {/* Tab 2: Tugas (Tasks) */}
          <Pressable
            style={[styles.tabItem, activeTab === "Tasks" && styles.tabItemActive]}
            onPress={() => handleNavigate("Tasks")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "Tasks" }}
          >
            <View style={[styles.tabIconWrapper, activeTab === "Tasks" && styles.tabIconWrapperActive]}>
              <Ionicons
                name={activeTab === "Tasks" ? "checkbox" : "checkbox-outline"}
                size={21}
                color={activeTab === "Tasks" ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === "Tasks" && styles.tabLabelActive]}>
              {t("tabTasks") || "Tugas"}
            </Text>
          </Pressable>

          {/* ─── Elevated Center Action Button (+) ─── */}
          <View style={styles.centerTabContainer}>
            <Pressable
              style={styles.centerFab}
              onPress={() => openQuickAction("none")}
              hitSlop={8}
              accessibilityLabel="Tambah Cepat"
            >
              <View style={styles.centerFabInner}>
                <Ionicons name="add" size={28} color={colors.textInverse} />
              </View>
            </Pressable>
          </View>

          {/* Tab 3: Jadwal Pelajaran (Timetable) */}
          <Pressable
            style={[styles.tabItem, activeTab === "Timetable" && styles.tabItemActive]}
            onPress={() => handleNavigate("Timetable")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "Timetable" }}
          >
            <View style={[styles.tabIconWrapper, activeTab === "Timetable" && styles.tabIconWrapperActive]}>
              <Ionicons
                name={activeTab === "Timetable" ? "time" : "time-outline"}
                size={21}
                color={activeTab === "Timetable" ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === "Timetable" && styles.tabLabelActive]}>
              {t("tabTimetable") || "Jadwal"}
            </Text>
          </Pressable>

          {/* Tab 4: Statistik */}
          <Pressable
            style={[styles.tabItem, activeTab === "Stats" && styles.tabItemActive]}
            onPress={() => handleNavigate("Stats")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "Stats" }}
          >
            <View style={[styles.tabIconWrapper, activeTab === "Stats" && styles.tabIconWrapperActive]}>
              <Ionicons
                name={activeTab === "Stats" ? "stats-chart" : "stats-chart-outline"}
                size={21}
                color={activeTab === "Stats" ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[styles.tabLabel, activeTab === "Stats" && styles.tabLabelActive]}>
              {t("tabStats")}
            </Text>
          </Pressable>
        </View>
      )}

      {/* ─── Elevated Center Action Bottom Sheet ─── */}
      {quickActionVisible && (
        <QuickActionSheet
          visible={quickActionVisible}
          initialMode={quickActionInitialMode}
          onClose={() => {
            setQuickActionVisible(false);
            setQuickActionInitialMode("none");
          }}
          onNavigateToTimetable={() => handleNavigate("Timetable")}
          onNavigateToScan={(mode) => {
            if (mode === "timetable") {
              handleNavigate("TimetableWizard");
            } else {
              handleNavigate("AIScanner");
            }
          }}
        />
      )}

      {/* ─── 3-Step Onboarding Modal (Phase 12) ─── */}
      <OnboardingModal
        visible={showOnboarding}
        onFinish={() => {
          setOnboardingDismissedThisSession(true);
        }}
        onNavigateToScan={() => {
          setOnboardingDismissedThisSession(true);
          handleNavigate("TimetableWizard");
        }}
        onNavigateToTimetable={() => {
          setOnboardingDismissedThisSession(true);
          handleNavigate("Subjects", { viewMode: "byDay" });
        }}
      />

      {/* ─── Global Streak Milestone Celebration Modal ─── */}
      <StreakCelebrationModal
        visible={activeCelebrationMilestone !== null}
        milestone={activeCelebrationMilestone}
        currentStreak={
          activeCelebrationMilestone
            ? activeCelebrationMilestone.days
            : streakState.currentStreak
        }
        onClose={dismissCelebration}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileStudyProvider>
        <MainApp />
      </MobileStudyProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  auxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: touchTarget.min,
  },
  auxBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget.min,
    justifyContent: "center",
  },
  auxBackBtnText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  auxHeaderTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  screenContainer: {
    flex: 1,
  },
  screenWrapper: {
    flex: 1,
  },
  screenHidden: {
    display: "none",
  },
  globalScanBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  globalScanBannerTitle: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.textInverse,
  },
  globalScanBannerSub: {
    fontSize: typography.fontSizes.xs,
    color: colors.textInverse,
    opacity: 0.9,
  },
  tabBar: {
    flexDirection: "row",
    height: 68,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minHeight: touchTarget.min,
  },
  tabItemActive: {},
  tabIconWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  tabIconWrapperActive: {
    backgroundColor: colors.primaryLight,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  centerTabContainer: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  centerFab: {
    marginTop: -22,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  centerFabInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  navToastPill: {
    position: "absolute",
    bottom: 82,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 50,
  },
  navToastText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
});
