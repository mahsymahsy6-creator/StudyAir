import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { registerRootComponent } from "expo";
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
import { StreakCelebrationModal } from "./src/components/streak/StreakCelebrationModal";
import { QuickActionSheet } from "./src/components/QuickActionSheet";
import { OnboardingModal } from "./src/components/onboarding/OnboardingModal";
import { colors, spacing, radius, typography, touchTarget, applyTheme, THEMES } from "./src/theme";
import { t } from "./src/lib/i18n";

export type TabScreen =
  | "Today"
  | "Timetable"
  | "Tasks"
  | "Grades"
  | "Calendar"
  | "Exams"
  | "Subjects"
  | "Progress"
  | "AIScanner"
  | "Focus"
  | "TimetableWizard"
  | "Settings"
  | "Streak";

function MainApp() {
  const [activeTab, setActiveTab] = useState<TabScreen>("Today");
  const [previousTab, setPreviousTab] = useState<TabScreen>("Today");
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [quickActionInitialMode, setQuickActionInitialMode] = useState<
    "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addGrade"
  >("none");

  const openQuickAction = (mode: "none" | "addTask" | "addSubject" | "pasteWhatsApp" | "addGrade" = "none") => {
    setQuickActionInitialMode(mode);
    setQuickActionVisible(true);
  };
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

  useEffect(() => {
    if (appSettings?.theme) {
      applyTheme(appSettings.theme);
    }
  }, [appSettings?.theme]);

  const showOnboarding =
    isDatabaseReady &&
    !appSettings.hasCompletedOnboarding &&
    !onboardingDismissedThisSession;

  const handleNavigate = (screen: string, params?: any) => {
    // Route aliases with backward compatibility
    let target: TabScreen = "Today";
    const norm = screen.toLowerCase();
    if (norm === "home" || norm === "today" || norm === "rencana") target = "Today";
    else if (norm === "timetable" || norm === "jadwal" || norm === "jadwalpelajaran") target = "Timetable";
    else if (norm === "tasks" || norm === "tugas") target = "Tasks";
    else if (norm === "grades" || norm === "nilai" || norm === "rapor" || norm === "gpa") target = "Grades";
    else if (norm === "calendar" || norm === "kalender") target = "Calendar";
    else if (norm === "exams" || norm === "ulangan" || norm === "ujian") target = "Exams";
    else if (norm === "syllabus" || norm === "subjects" || norm === "pelajaran" || norm === "mapel") {
      target = "Subjects";
      if (params?.initialDay !== undefined || params?.day !== undefined) {
        setSyllabusInitialDay(params.initialDay !== undefined ? params.initialDay : params.day);
      }
      if (params?.viewMode) {
        setSyllabusViewMode(params.viewMode);
      }
      setSyllabusNonce((n) => n + 1);
    }
    else if (norm === "dashboard" || norm === "progress" || norm === "analytics")
      target = "Progress";
    else if (norm === "aiscanner") target = "AIScanner";
    else if (norm === "focus" || norm === "fokus") target = "Focus";
    else if (
      norm === "timetablewizard" ||
      norm === "timetableimport" ||
      norm === "import"
    )
      target = "TimetableWizard";
    else if (norm === "settings" || norm === "pengaturan") target = "Settings";
    else if (norm === "streak") target = "Streak";

    if (
      activeTab === "Today" ||
      activeTab === "Timetable" ||
      activeTab === "Tasks" ||
      activeTab === "Grades" ||
      activeTab === "Exams" ||
      activeTab === "Subjects" ||
      activeTab === "Calendar" ||
      activeTab === "Focus"
    ) {
      setPreviousTab(activeTab);
    }
    setActiveTab(target);
  };

  const handleBackToTab = () => {
    setActiveTab(previousTab);
  };

  const navigation = {
    navigate: handleNavigate,
    goBack: handleBackToTab,
  };

  const isAuxiliaryScreen = activeTab === "AIScanner";

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar style={THEMES[appSettings?.theme || "navy"]?.isDark ? "light" : "dark"} />

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
              Gemini AI is analyzing schedule in background...
            </Text>
            <Text style={styles.globalScanBannerSub}>
              Tap to view live progress
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.textInverse} />
        </Pressable>
      )}

      {/* ─── Persistent Screen Hierarchy (Never destroyed on tab switch) ─── */}
      <View style={styles.screenContainer}>
        {/* Tab 1: Today / Rencana */}
        <View style={[styles.screenWrapper, activeTab !== "Today" && styles.screenHidden]}>
          <HomeScreen
            navigation={navigation}
            onOpenAddTask={() => openQuickAction("addTask")}
            onOpenBatchCapture={() => openQuickAction("pasteWhatsApp")}
          />
        </View>

        {/* Tab 2: Tasks / Tugas */}
        <View style={[styles.screenWrapper, activeTab !== "Tasks" && styles.screenHidden]}>
          <TasksScreen
            onOpenSettings={() => handleNavigate("Settings")}
            onStartFocusForTask={(task) => handleNavigate("Focus", { taskId: task.id })}
          />
        </View>

        {/* Tab / Screen: Timetable / Jadwal */}
        <View style={[styles.screenWrapper, activeTab !== "Timetable" && styles.screenHidden]}>
          <TimetableScreen navigation={navigation} />
        </View>

        {/* Tab / Screen: Grades / Nilai & Rapor */}
        <View style={[styles.screenWrapper, activeTab !== "Grades" && styles.screenHidden]}>
          <GradesScreen navigation={navigation} />
        </View>

        {/* Tab 3: Calendar / Kalender */}
        <View style={[styles.screenWrapper, activeTab !== "Calendar" && styles.screenHidden]}>
          <CalendarScreen navigation={navigation} />
        </View>

        {/* Tab 3 / Screen: Exams / Ulangan */}
        <View style={[styles.screenWrapper, activeTab !== "Exams" && styles.screenHidden]}>
          <ExamsScreen navigation={navigation} />
        </View>

        {/* Auxiliary Screen: Subjects */}
        <View style={[styles.screenWrapper, activeTab !== "Subjects" && styles.screenHidden]}>
          <SyllabusScreen
            navigation={navigation}
            initialDay={syllabusInitialDay}
            initialViewMode={syllabusViewMode}
            navigationNonce={syllabusNonce}
          />
        </View>

        {/* Auxiliary Screen: Progress */}
        <View style={[styles.screenWrapper, activeTab !== "Progress" && styles.screenHidden]}>
          <DashboardScreen navigation={navigation} />
        </View>

        {/* Auxiliary Screen: AIScanner */}
        <View style={[styles.screenWrapper, activeTab !== "AIScanner" && styles.screenHidden]}>
          <AIScannerScreen navigation={navigation} />
        </View>

        {/* Auxiliary Screen: Focus */}
        <View style={[styles.screenWrapper, activeTab !== "Focus" && styles.screenHidden]}>
          <FocusScreen navigation={navigation} />
        </View>

        {/* Wizard Screen: TimetableWizard (Phase 5) */}
        <View style={[styles.screenWrapper, activeTab !== "TimetableWizard" && styles.screenHidden]}>
          <TimetableWizardScreen navigation={navigation} />
        </View>

        {/* Settings Screen: Settings (Phase 9) */}
        <View style={[styles.screenWrapper, activeTab !== "Settings" && styles.screenHidden]}>
          <SettingsScreen navigation={navigation} />
        </View>

        {/* Streak Screen (Step 5) */}
        <View style={[styles.screenWrapper, activeTab !== "Streak" && styles.screenHidden]}>
          <StreakScreen navigation={navigation} />
        </View>
      </View>

      {/* ─── School Planner 5-Tab Navigation Bar with Center '+' Action Button ─── */}
      {activeTab !== "TimetableWizard" && activeTab !== "Settings" && activeTab !== "Streak" && activeTab !== "Focus" && (
        <View style={styles.tabBar}>
          {/* Tab 1: Hari Ini */}
          <Pressable
            style={[styles.tabItem, activeTab === "Today" && styles.tabItemActive]}
            onPress={() => handleNavigate("Today")}
          >
            <Ionicons
              name={activeTab === "Today" ? "today" : "today-outline"}
              size={22}
              color={activeTab === "Today" ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === "Today" && styles.tabLabelActive]}>
              {t("tabToday") || "Hari Ini"}
            </Text>
          </Pressable>

          {/* Tab 2: Jadwal Pelajaran (Timetable) */}
          <Pressable
            style={[styles.tabItem, activeTab === "Timetable" && styles.tabItemActive]}
            onPress={() => handleNavigate("Timetable")}
          >
            <Ionicons
              name={activeTab === "Timetable" ? "time" : "time-outline"}
              size={22}
              color={activeTab === "Timetable" ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === "Timetable" && styles.tabLabelActive]}>
              Jadwal
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

          {/* Tab 3: Tugas (Tasks) */}
          <Pressable
            style={[styles.tabItem, activeTab === "Tasks" && styles.tabItemActive]}
            onPress={() => handleNavigate("Tasks")}
          >
            <Ionicons
              name={activeTab === "Tasks" ? "checkbox" : "checkbox-outline"}
              size={22}
              color={activeTab === "Tasks" ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === "Tasks" && styles.tabLabelActive]}>
              {t("tabTasks") || "Tugas"}
            </Text>
          </Pressable>

          {/* Tab 4: Nilai & Rapor (Grades & GPA) */}
          <Pressable
            style={[styles.tabItem, activeTab === "Grades" && styles.tabItemActive]}
            onPress={() => handleNavigate("Grades")}
          >
            <Ionicons
              name={activeTab === "Grades" ? "stats-chart" : "stats-chart-outline"}
              size={22}
              color={activeTab === "Grades" ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, activeTab === "Grades" && styles.tabLabelActive]}>
              Nilai
            </Text>
          </Pressable>
        </View>
      )}

      {/* ─── Elevated Center Action Bottom Sheet ─── */}
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
    borderBottomWidth: 2,
    borderBottomColor: colors.accentBottom,
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
    paddingVertical: spacing.xs,
    minHeight: touchTarget.min,
  },
  tabItemActive: {},
  tabLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.medium,
    color: colors.textSecondary,
    marginTop: 2,
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
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  centerFabInner: {
    alignItems: "center",
    justifyContent: "center",
  },
});

registerRootComponent(App);
