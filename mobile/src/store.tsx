import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  Subject,
  PeriodTime,
  TimetableEntry,
  DayOff,
  Override,
  OverrideType,
  Task,
  StudyUnit,
  ScheduledBlock,
  ScheduledBlockWithDetails,
  CognitiveLoad,
  BlockType,
  ConfidenceRating,
  FocusLog,
  ReviewHistory,
  DailyStudyStats,
  CognitiveLoadWarning,
  AppSettings,
  DEFAULT_APP_SETTINGS,
  StudyBlock,
  SchedulePrefs,
  DEFAULT_SCHEDULE_PREFS,
} from "./types";
import { INITIAL_SUBJECTS, INITIAL_STUDY_UNITS, INITIAL_BLOCKS } from "./mockData";
import { getNextReviewDate } from "./engine/sm2";
import { analyzeCognitiveLoad } from "./engine/cognitive-load";
import { format, parseISO, addDays, subDays, isBefore } from "date-fns";
import { recalculateDynamicTaskDeadlines } from "./engine/deadlineEngine";
import { setLanguage } from "./lib/i18n";
import { getSecureGeminiKey, setSecureGeminiKey } from "./services/secureStoreService";
import { calculateStreak, StreakState, StreakMilestone } from "./lib/studyStreakEngine";
import {
  scheduleEveningPreviewNotification,
  scheduleMorningAlertNotification,
  setupNotificationChannels,
} from "./services/notificationService";
import {
  initDatabase,
  loadAllData,
  saveStateImmediately,
  exportBackupJSON,
  importBackupJSON,
  DatabaseState,
  DEFAULT_PERIOD_TIMES,
} from "./lib/storage";
import { mergeTimetableEntries } from "./lib/timetableParser";
import { getDayItems, DayScheduleSummary, classifyTimetableKind } from "./lib/daySchedule";
import { auditTimetableData, removeExactDuplicates, TimetableAuditResult } from "./lib/dataRepair";

export interface EffectiveScheduleItem {
  id: string; // entryId or override ID
  entryId: string;
  periodNumber: number;
  startTime?: string;
  endTime?: string;
  subjectId: string;
  subject?: Subject;
  isOverride: boolean;
  overrideType?: OverrideType;
  originalSubjectId?: string;
  originalSubject?: Subject;
  customLabel?: string;
  room?: string;
  teacher?: string;
}

export interface EffectiveScheduleResult {
  date: string; // YYYY-MM-DD
  isDayOff: boolean;
  dayOffReason?: string;
  items: EffectiveScheduleItem[];
  summary?: DayScheduleSummary;
}

interface MobileStudyContextType {
  subjects: Subject[];
  periodTimes: PeriodTime[];
  timetableEntries: TimetableEntry[];
  daysOff: DayOff[];
  overrides: Override[];
  tasks: Task[];
  studyUnits: StudyUnit[];
  blocks: ScheduledBlock[];
  blocksWithDetails: ScheduledBlockWithDetails[];
  focusLogs: FocusLog[];
  reviewHistory: ReviewHistory[];
  dailyStats: DailyStudyStats[];
  dismissedWarningIds: string[];
  activeFocusBlock: ScheduledBlockWithDetails | null;

  // Actions - Subjects
  addSubject: (data: {
    name?: string;
    title?: string;
    color?: string;
    color_hex?: string;
    aliases?: string[];
    teacher?: string;
    room?: string;
    bringItems?: string[];
    examDate?: string;
    exam_date?: string;
  }) => Subject;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Actions - Periods & Timetable
  setPeriodTimes: (times: PeriodTime[]) => void;
  updatePeriodTime: (periodNumber: number, data: Partial<PeriodTime>) => void;
  setTimetableEntries: (entries: TimetableEntry[]) => void;
  addTimetableEntry: (data: Omit<TimetableEntry, "id">) => TimetableEntry;
  updateTimetableEntry: (id: string, data: Partial<TimetableEntry>) => void;
  deleteTimetableEntry: (id: string) => void;
  importTimetable: (entries: TimetableEntry[], mode: "replace" | "merge") => void;
  getDaySchedule: (target: number | Date | string, activeWeekPattern?: "A" | "B" | "all") => DayScheduleSummary;
  auditData: () => TimetableAuditResult;
  relinkOrphanEntry: (entryId: string, newSubjectId: string) => void;
  autoRelinkOrphans: () => number;
  rapikanDuplicates: () => number;
  reclassifyExistingEntries: (treatAsSubjectIds?: string[]) => number;

  // Actions - Days Off & Overrides
  addDayOff: (data: DayOff) => void;
  addDayOffRange: (startDate: string, endDate: string, reason: string) => number;
  deleteDayOff: (date: string) => void;
  addOverride: (data: Override) => void;
  deleteOverride: (date: string, entryId: string) => void;
  getEffectiveScheduleForDate: (date: Date | string) => EffectiveScheduleResult;
  recalculateDeadlines: () => number;

  // Actions - Tasks
  addTask: (data: Omit<Task, "id" | "status" | "completedAt">) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompletion: (id: string) => void;

  // Actions - v2 Study Blocks & Schedule Prefs
  studyBlocks: StudyBlock[];
  schedulePrefs: SchedulePrefs;
  lastScheduleBackup: StudyBlock[] | null;
  setStudyBlocks: (blocks: StudyBlock[]) => void;
  applySchedule: (newBlocks: StudyBlock[]) => void;
  undoLastSchedule: () => boolean;
  addStudyBlock: (block: Omit<StudyBlock, "id" | "status" | "createdAt">) => StudyBlock;
  updateStudyBlock: (id: string, patch: Partial<StudyBlock>) => void;
  deleteStudyBlock: (id: string) => void;
  toggleBlockCompletion: (id: string) => void;
  updateSchedulePrefs: (patch: Partial<SchedulePrefs>) => void;

  // Actions - Study Units & Focus
  addStudyUnit: (data: {
    subject_id: string;
    title: string;
    estimated_minutes: number;
    cognitive_load: CognitiveLoad;
  }) => StudyUnit;
  deleteStudyUnit: (id: string) => void;
  toggleStudyUnitCompletion: (id: string) => void;

  addBlock: (data: {
    study_unit_id: string;
    start_time: string;
    end_time: string;
    block_type?: BlockType;
  }) => ScheduledBlock;
  deleteBlock: (id: string) => void;
  autoReschedule: (dailyCapMinutes?: number) => { count: number };
  rebalanceSchedule: (routine?: string, customCapMinutes?: number) => { count: number };
  resetSchedule: () => void;
  resetAll: () => void;

  dismissWarning: (warningId: string) => void;
  getCognitiveWarnings: () => CognitiveLoadWarning[];

  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;

  // Settings & Aliases (Phase 9)
  appSettings: AppSettings;
  updateAppSettings: (partial: Partial<AppSettings>) => void;
  incrementDailyScanCount: () => void;
  addSubjectAlias: (subjectId: string, alias: string) => void;
  removeSubjectAlias: (subjectId: string, alias: string) => void;
  syncNotifications: () => Promise<void>;

  isAIScanning: boolean;
  setIsAIScanning: (scanning: boolean) => void;

  startStudySessionForUnit: (unitId: string) => ScheduledBlockWithDetails | null;
  setActiveFocusBlock: (block: ScheduledBlockWithDetails | null) => void;
  completeFocusSession: (
    blockId: string,
    actualMinutes: number,
    rating: ConfidenceRating
  ) => void;
  logIndependentFocusSession: (
    subjectId: string,
    actualMinutes: number,
    rating?: ConfidenceRating
  ) => FocusLog;

  // Local Storage & Backup Operations
  exportBackupData: () => Promise<{ success: boolean; filePath?: string; jsonString: string }>;
  importBackupData: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  isDatabaseReady: boolean;

  // Study Streak Engine & Debug Simulation
  streakState: StreakState;
  activeCelebrationMilestone: StreakMilestone | null;
  triggerCelebration: (milestone: StreakMilestone) => void;
  dismissCelebration: () => void;
  resetStreak: () => void;
  streakDebugOverride: Partial<StreakState> | null;
  setStreakDebugOverride: (override: Partial<StreakState> | null) => void;
  simulateStreakDays: (days: number) => void;
  addMockStudyToday: (minutes?: number) => void;
  clearTodayStudySessions: () => void;
}

const MobileStudyContext = createContext<MobileStudyContextType | null>(null);

export function MobileStudyProvider({ children }: { children: ReactNode }) {
  const [geminiApiKey, setGeminiApiKey] = useState<string>(
    process.env.EXPO_PUBLIC_GEMINI_API_KEY || ""
  );
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [periodTimes, setPeriodTimes] = useState<PeriodTime[]>(DEFAULT_PERIOD_TIMES);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([]);
  const [lastScheduleBackup, setLastScheduleBackup] = useState<StudyBlock[] | null>(null);
  const [schedulePrefs, setSchedulePrefs] = useState<SchedulePrefs>(DEFAULT_SCHEDULE_PREFS);
  const [studyUnits, setStudyUnits] = useState<StudyUnit[]>(INITIAL_STUDY_UNITS);
  const [blocks, setBlocks] = useState<ScheduledBlock[]>(INITIAL_BLOCKS);
  const [focusLogs, setFocusLogs] = useState<FocusLog[]>([]);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistory[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStudyStats[]>([]);
  const [dismissedWarningIds, setDismissedWarningIds] = useState<string[]>([]);
  const [activeFocusBlock, setActiveFocusBlock] =
    useState<ScheduledBlockWithDetails | null>(null);
  const [isAIScanning, setIsAIScanning] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);

  // Load persistent state from SQLite (or storage fallback) on boot
  useEffect(() => {
    (async () => {
      try {
        const loaded = await loadAllData();
        if (loaded) {
          if (loaded.subjects) setSubjects(loaded.subjects);
          if (loaded.periodTimes && loaded.periodTimes.length > 0) {
            setPeriodTimes(loaded.periodTimes);
          }
          if (loaded.timetableEntries) setTimetableEntries(loaded.timetableEntries);
          if (loaded.daysOff) setDaysOff(loaded.daysOff);
          if (loaded.overrides) setOverrides(loaded.overrides);
          if (loaded.tasks) setTasks(loaded.tasks);
          if (loaded.studyBlocks) setStudyBlocks(loaded.studyBlocks);
          if (loaded.schedulePrefs) setSchedulePrefs(loaded.schedulePrefs);
          if (loaded.studyUnits) setStudyUnits(loaded.studyUnits);
          if (loaded.blocks) setBlocks(loaded.blocks);
          if (loaded.focusLogs) setFocusLogs(loaded.focusLogs);
          if (loaded.reviewHistory) setReviewHistory(loaded.reviewHistory);
          if (loaded.dailyStats) setDailyStats(loaded.dailyStats);
          if (loaded.dismissedWarningIds) setDismissedWarningIds(loaded.dismissedWarningIds);
          if (loaded.geminiApiKey) setGeminiApiKey(loaded.geminiApiKey);
          if (loaded.appSettings) {
            setAppSettings(loaded.appSettings);
            if (loaded.appSettings.language) {
              setLanguage(loaded.appSettings.language);
            }
          }
        }

        // Also check hardware-backed secure storage for personal API key (Mode A)
        const secureKey = await getSecureGeminiKey();
        if (secureKey) {
          setGeminiApiKey(secureKey);
        }

        // Setup notification channels on Android
        await setupNotificationChannels();

        setIsDatabaseReady(true);
      } catch (err) {
        console.warn("[Store] Error loading persistent storage:", err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist immediately to SQLite database & mirror whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    const stateToSave: DatabaseState = {
      subjects,
      periodTimes,
      timetableEntries,
      daysOff,
      overrides,
      tasks,
      studyUnits,
      blocks,
      focusLogs,
      reviewHistory,
      dailyStats,
      dismissedWarningIds,
      geminiApiKey,
      appSettings,
      studyBlocks,
      schedulePrefs,
    };
    saveStateImmediately(stateToSave);
  }, [
    isLoaded,
    subjects,
    periodTimes,
    timetableEntries,
    daysOff,
    overrides,
    tasks,
    studyUnits,
    blocks,
    focusLogs,
    reviewHistory,
    dailyStats,
    dismissedWarningIds,
    geminiApiKey,
    appSettings,
    studyBlocks,
    schedulePrefs,
  ]);

  // Compute enriched blocks with subject and study unit details
  const blocksWithDetails = useMemo(() => {
    return blocks
      .map((block) => {
        const unit = studyUnits.find((u) => u.id === block.study_unit_id);
        if (!unit) return null;
        const subject = subjects.find((s) => s.id === unit.subject_id);
        if (!subject) return null;

        return {
          ...block,
          study_unit: unit,
          subject,
        };
      })
      .filter((b): b is ScheduledBlockWithDetails => b !== null);
  }, [blocks, studyUnits, subjects]);

  // ─── Study Streak Engine ───
  const [activeCelebrationMilestone, setActiveCelebrationMilestone] = useState<StreakMilestone | null>(null);
  const [streakDebugOverride, setStreakDebugOverride] = useState<Partial<StreakState> | null>(null);

  const rawStreakState: StreakState = useMemo(() => {
    return calculateStreak({
      tasks,
      focusLogs,
      studyUnits,
      timetableEntries,
      daysOff,
      countEveryDay: appSettings.streakCountEveryDay,
      minFocusMinutes: appSettings.streakMinFocusMinutes,
      savedBestStreak: appSettings.bestStreak,
    });
  }, [
    tasks,
    focusLogs,
    studyUnits,
    timetableEntries,
    daysOff,
    appSettings.streakCountEveryDay,
    appSettings.streakMinFocusMinutes,
    appSettings.bestStreak,
  ]);

  const streakState: StreakState = useMemo(() => {
    if (streakDebugOverride) {
      return {
        ...rawStreakState,
        ...streakDebugOverride,
      };
    }
    return rawStreakState;
  }, [rawStreakState, streakDebugOverride]);

  // Sync best streak to settings if exceeded
  useEffect(() => {
    if (streakState.currentStreak > (appSettings.bestStreak || 0)) {
      setAppSettings((prev) => ({
        ...prev,
        bestStreak: streakState.currentStreak,
      }));
    }
  }, [streakState.currentStreak, appSettings.bestStreak]);

  // Automatically celebrate unlocked milestone if new
  useEffect(() => {
    if (
      streakState.activeMilestone &&
      streakState.activeMilestone.days > (appSettings.lastCelebratedMilestone || 0)
    ) {
      setActiveCelebrationMilestone(streakState.activeMilestone);
      setAppSettings((prev) => ({
        ...prev,
        lastCelebratedMilestone: streakState.activeMilestone?.days || 0,
      }));
    }
  }, [streakState.activeMilestone, appSettings.lastCelebratedMilestone]);

  const triggerCelebration = (milestone: StreakMilestone) => {
    setActiveCelebrationMilestone(milestone);
  };

  const dismissCelebration = () => {
    setActiveCelebrationMilestone(null);
  };

  const resetStreak = () => {
    setFocusLogs([]);
    setStreakDebugOverride(null);
    setAppSettings((prev) => ({
      ...prev,
      bestStreak: 0,
      lastCelebratedMilestone: 0,
    }));
  };

  const simulateStreakDays = (days: number) => {
    const targetDays = Math.max(0, days);
    const now = new Date();
    const newLogs: FocusLog[] = [];

    for (let i = 0; i < targetDays; i++) {
      const sessionDate = subDays(now, i);
      newLogs.push({
        id: `sim-focus-${Date.now()}-${i}`,
        scheduled_block_id: `sim-block-${i}`,
        user_id: "user-1",
        planned_minutes: 25,
        actual_minutes: 25,
        timer_mode: "POMODORO",
        pomodoro_count: 1,
        started_at: sessionDate.toISOString(),
        ended_at: sessionDate.toISOString(),
      });
    }

    setFocusLogs(newLogs);
    setStreakDebugOverride(null);
    setAppSettings((prev) => ({
      ...prev,
      bestStreak: Math.max(prev.bestStreak || 0, targetDays),
    }));
  };

  const addMockStudyToday = (minutes: number = 25) => {
    const newLog: FocusLog = {
      id: `sim-focus-${Date.now()}`,
      scheduled_block_id: `sim-block-${Date.now()}`,
      user_id: "user-1",
      planned_minutes: minutes,
      actual_minutes: minutes,
      timer_mode: "POMODORO",
      pomodoro_count: 1,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    };
    setFocusLogs((prev) => [newLog, ...prev]);
    setStreakDebugOverride(null);
  };

  const clearTodayStudySessions = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setFocusLogs((prev) => prev.filter((log) => !log.started_at.startsWith(todayStr)));
    setTasks((prev) =>
      prev.map((t) => {
        if (t.completedAt && t.completedAt.startsWith(todayStr)) {
          return { ...t, status: "PENDING", completedAt: undefined };
        }
        return t;
      })
    );
    setStreakDebugOverride(null);
  };

  // ─── Actions: Subjects ───
  const addSubject = (data: {
    name?: string;
    title?: string;
    color?: string;
    color_hex?: string;
    aliases?: string[];
    teacher?: string;
    room?: string;
    bringItems?: string[];
    examDate?: string;
    exam_date?: string;
  }): Subject => {
    const name = data.name || data.title || "Course";
    const color = data.color || data.color_hex || "#3b82f6";
    const examDate = data.examDate || data.exam_date || "";

    const newSubject: Subject = {
      id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      color,
      aliases: data.aliases || [],
      teacher: data.teacher,
      room: data.room,
      bringItems: data.bringItems || [],
      examDate: examDate || undefined,
      // Backward compatibility fields
      title: name,
      color_hex: color,
      exam_date: examDate,
      total_estimated_minutes: 0,
    };
    setSubjects((prev) => [...prev, newSubject]);
    return newSubject;
  };

  const updateSubject = (id: string, data: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const name = data.name ?? data.title ?? s.name;
        const color = data.color ?? data.color_hex ?? s.color;
        const examDate = data.examDate ?? data.exam_date ?? s.examDate;
        return {
          ...s,
          ...data,
          name,
          color,
          examDate,
          title: name,
          color_hex: color,
          exam_date: examDate || "",
        };
      })
    );
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTimetableEntries((prev) => prev.filter((t) => t.subjectId !== id));
    setTasks((prev) => prev.filter((t) => t.subjectId !== id));
    const affectedUnitIds = new Set(
      studyUnits.filter((u) => u.subject_id === id).map((u) => u.id)
    );
    setStudyUnits((prev) => prev.filter((u) => u.subject_id !== id));
    setBlocks((prev) => prev.filter((b) => !affectedUnitIds.has(b.study_unit_id)));
  };

  // ─── Actions: Periods & Timetable ───
  const updatePeriodTime = (periodNumber: number, data: Partial<PeriodTime>) => {
    setPeriodTimes((prev) =>
      prev.map((p) => (p.periodNumber === periodNumber ? { ...p, ...data } : p))
    );
  };

  const addTimetableEntry = (data: Omit<TimetableEntry, "id">): TimetableEntry => {
    const entryKind = data.kind || classifyTimetableKind(data.kind, data.customLabel);
    const pattern = data.weekPattern || "every";
    const entry: TimetableEntry = {
      ...data,
      id: `tt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      kind: entryKind,
      weekPattern: pattern,
    };

    // Uniqueness rule: update existing entry on (weekday, periodNumber, weekPattern)
    setTimetableEntries((prev) => {
      const existingIdx = prev.findIndex(
        (e) =>
          e.weekday === data.weekday &&
          e.periodNumber === data.periodNumber &&
          (e.weekPattern || "every") === pattern
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], ...entry, id: next[existingIdx].id };
        return next;
      }
      return [...prev, entry];
    });
    return entry;
  };

  const updateTimetableEntry = (id: string, data: Partial<TimetableEntry>) => {
    setTimetableEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data } : e))
    );
  };

  const deleteTimetableEntry = (id: string) => {
    setTimetableEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const importTimetable = (entries: TimetableEntry[], mode: "replace" | "merge") => {
    if (mode === "replace") {
      setTimetableEntries(entries);
    } else {
      setTimetableEntries((prev) => mergeTimetableEntries(prev, entries));
    }
  };

  const getDaySchedule = (
    target: number | Date | string,
    activeWeekPattern: "A" | "B" | "all" = "all"
  ): DayScheduleSummary => {
    return getDayItems(target, {
      timetableEntries,
      subjects,
      periodTimes,
      overrides,
      daysOff,
      activeWeekPattern,
      language: appSettings.language || "id",
    });
  };

  const auditData = (): TimetableAuditResult => {
    return auditTimetableData(timetableEntries, subjects);
  };

  const relinkOrphanEntry = (entryId: string, newSubjectId: string) => {
    setTimetableEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, subjectId: newSubjectId } : e))
    );
  };

  const autoRelinkOrphans = (): number => {
    const audit = auditTimetableData(timetableEntries, subjects);
    let count = 0;
    const relinkMap = new Map<string, string>();
    for (const orph of audit.orphans) {
      if (orph.suggestedSubject) {
        relinkMap.set(orph.entry.id, orph.suggestedSubject.id);
        count++;
      }
    }
    if (count > 0) {
      setTimetableEntries((prev) =>
        prev.map((e) => (relinkMap.has(e.id) ? { ...e, subjectId: relinkMap.get(e.id)! } : e))
      );
    }
    return count;
  };

  const rapikanDuplicates = (): number => {
    const { repairedEntries, removedCount } = removeExactDuplicates(timetableEntries);
    if (removedCount > 0) {
      setTimetableEntries(repairedEntries);
    }
    return removedCount;
  };

  const reclassifyExistingEntries = (treatAsSubjectIds: string[] = []): number => {
    const treatSet = new Set(treatAsSubjectIds);
    let changedCount = 0;
    setTimetableEntries((prev) =>
      prev.map((e) => {
        if (treatSet.has(e.id)) {
          return { ...e, kind: "class" };
        }
        const subj = subjects.find((s) => s.id === e.subjectId);
        const rawName = e.customLabel || subj?.title || subj?.name || "";
        const proposed = classifyTimetableKind(undefined, rawName, e.customLabel);
        if (proposed !== (e.kind || "class")) {
          changedCount++;
          return { ...e, kind: proposed };
        }
        return e;
      })
    );
    return changedCount;
  };

  // ─── Actions: Days Off & Overrides ───
  const recalculateDeadlinesInternal = (
    currentTasks: Task[],
    currentDaysOff: DayOff[],
    currentOverrides: Override[]
  ): number => {
    const { updatedTasks, changedCount } = recalculateDynamicTaskDeadlines(
      currentTasks,
      timetableEntries,
      { daysOff: currentDaysOff, overrides: currentOverrides }
    );
    if (changedCount > 0) {
      setTasks(updatedTasks as Task[]);
    }
    return changedCount;
  };

  const recalculateDeadlines = (): number => {
    return recalculateDeadlinesInternal(tasks, daysOff, overrides);
  };

  const addDayOff = (data: DayOff) => {
    setDaysOff((prev) => {
      const next = [...prev.filter((d) => d.date !== data.date), data].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      recalculateDeadlinesInternal(tasks, next, overrides);
      return next;
    });
  };

  const addDayOffRange = (startDateStr: string, endDateStr: string, reason: string): number => {
    const start = parseISO(startDateStr);
    const end = parseISO(endDateStr);
    if (isBefore(end, start)) {
      return 0;
    }
    const newDays: DayOff[] = [];
    let curr = start;
    while (!isBefore(end, curr)) {
      newDays.push({ date: format(curr, "yyyy-MM-dd"), reason });
      curr = addDays(curr, 1);
    }
    setDaysOff((prev) => {
      const newDateSet = new Set(newDays.map((d) => d.date));
      const next = [...prev.filter((d) => !newDateSet.has(d.date)), ...newDays].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      recalculateDeadlinesInternal(tasks, next, overrides);
      return next;
    });
    return newDays.length;
  };

  const deleteDayOff = (date: string) => {
    setDaysOff((prev) => {
      const next = prev.filter((d) => d.date !== date);
      recalculateDeadlinesInternal(tasks, next, overrides);
      return next;
    });
  };

  const addOverride = (data: Override) => {
    setOverrides((prev) => {
      const next = [
        ...prev.filter((o) => !(o.date === data.date && o.entryId === data.entryId)),
        data,
      ];
      recalculateDeadlinesInternal(tasks, daysOff, next);
      return next;
    });
  };

  const deleteOverride = (date: string, entryId: string) => {
    setOverrides((prev) => {
      const next = prev.filter((o) => !(o.date === date && o.entryId === entryId));
      recalculateDeadlinesInternal(tasks, daysOff, next);
      return next;
    });
  };

  const getEffectiveScheduleForDate = (dateInput: Date | string): EffectiveScheduleResult => {
    const dateObj = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    const dateStr = format(dateObj, "yyyy-MM-dd");

    const summary = getDayItems(dateObj, {
      timetableEntries,
      subjects,
      periodTimes,
      overrides,
      daysOff,
      language: appSettings.language || "id",
    });

    if (summary.isDayOff) {
      return {
        date: dateStr,
        isDayOff: true,
        dayOffReason: summary.dayOffReason,
        items: [],
        summary,
      };
    }

    const items: EffectiveScheduleItem[] = summary.classBlocks.map((b) => ({
      id: b.id,
      entryId: b.rawEntry?.id || b.id,
      periodNumber: b.startPeriod,
      startTime: b.startTime,
      endTime: b.endTime,
      subjectId: b.subjectId || "",
      subject: b.subject,
      isOverride: b.isOverride || false,
      overrideType: b.overrideType,
      customLabel: b.title,
      room: b.room,
      teacher: b.teacher,
    }));

    return {
      date: dateStr,
      isDayOff: false,
      items,
      summary,
    };
  };

  const clampEstimate = (mins?: number): number => {
    if (mins == null || isNaN(mins)) return 30;
    return Math.max(5, Math.min(360, Math.round(mins)));
  };

  // ─── Actions: Tasks ───
  const addTask = (data: Omit<Task, "id" | "status" | "completedAt">): Task => {
    const newTask: Task = {
      ...data,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      estimatedMinutes: clampEstimate(data.estimatedMinutes),
      status: "PENDING",
    };
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  };

  const updateTask = (id: string, data: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, ...data };
        if (data.estimatedMinutes !== undefined) {
          updated.estimatedMinutes = clampEstimate(data.estimatedMinutes);
        }
        return updated;
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const isDone = t.status === "COMPLETED";
        return {
          ...t,
          status: isDone ? "PENDING" : "COMPLETED",
          completedAt: isDone ? undefined : new Date().toISOString(),
        };
      })
    );
  };

  // ─── Actions: v2 Study Blocks & Schedule Prefs ───
  const handleSetStudyBlocks = (blocks: StudyBlock[]) => {
    setStudyBlocks(blocks);
  };

  const applySchedule = (newBlocks: StudyBlock[]) => {
    setLastScheduleBackup([...studyBlocks]);
    setStudyBlocks(newBlocks);
  };

  const undoLastSchedule = (): boolean => {
    if (!lastScheduleBackup) return false;
    setStudyBlocks([...lastScheduleBackup]);
    setLastScheduleBackup(null);
    return true;
  };

  const addStudyBlock = (block: Omit<StudyBlock, "id" | "status" | "createdAt">): StudyBlock => {
    const newBlock: StudyBlock = {
      ...block,
      id: `sb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    };
    setStudyBlocks((prev) => [...prev, newBlock]);
    return newBlock;
  };

  const updateStudyBlock = (id: string, patch: Partial<StudyBlock>) => {
    setStudyBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const deleteStudyBlock = (id: string) => {
    setStudyBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const toggleBlockCompletion = (id: string) => {
    setStudyBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const isDone = b.status === "COMPLETED";
        return {
          ...b,
          status: isDone ? "SCHEDULED" : "COMPLETED",
          completedAt: isDone ? undefined : new Date().toISOString(),
        };
      })
    );
  };

  const updateSchedulePrefs = (patch: Partial<SchedulePrefs>) => {
    setSchedulePrefs((prev) => ({
      ...prev,
      ...patch,
      priorityWeights: {
        ...prev.priorityWeights,
        ...(patch.priorityWeights || {}),
      },
    }));
  };

  const addStudyUnit = (data: {
    subject_id: string;
    title: string;
    estimated_minutes: number;
    cognitive_load: CognitiveLoad;
  }): StudyUnit => {
    const existing = studyUnits.filter((u) => u.subject_id === data.subject_id);
    const newUnit: StudyUnit = {
      id: `unit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      subject_id: data.subject_id,
      title: data.title,
      estimated_minutes: data.estimated_minutes,
      cognitive_load: data.cognitive_load,
      sort_order: existing.length + 1,
      is_completed: false,
      completed_at: null,
    };

    setStudyUnits((prev) => [...prev, newUnit]);
    setSubjects((prev) =>
      prev.map((s) =>
        s.id === data.subject_id
          ? { ...s, total_estimated_minutes: (s.total_estimated_minutes || 0) + data.estimated_minutes }
          : s
      )
    );
    return newUnit;
  };

  const deleteStudyUnit = (id: string) => {
    setStudyUnits((prev) => prev.filter((u) => u.id !== id));
    setBlocks((prev) => prev.filter((b) => b.study_unit_id !== id));
  };

  const toggleStudyUnitCompletion = (id: string) => {
    setStudyUnits((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const nextState = !u.is_completed;
        return {
          ...u,
          is_completed: nextState,
          completed_at: nextState ? new Date().toISOString() : null,
        };
      })
    );
  };

  const addBlock = (data: {
    study_unit_id: string;
    start_time: string;
    end_time: string;
    block_type?: BlockType;
  }): ScheduledBlock => {
    const newBlock: ScheduledBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      study_unit_id: data.study_unit_id,
      start_time: data.start_time,
      end_time: data.end_time,
      block_type: data.block_type || "STUDY",
      status: "SCHEDULED",
      actual_duration_minutes: null,
    };
    setBlocks((prev) => [...prev, newBlock]);
    return newBlock;
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const autoReschedule = (dailyCapMinutes = 240) => {
    const uncompletedUnits = studyUnits.filter((u) => !u.is_completed);
    const newBlocks: ScheduledBlock[] = [];
    let scheduledCount = 0;

    let dayOffset = 0;
    let currentHour = 9;
    let dailyMins = 0;

    for (const unit of uncompletedUnits) {
      if (dailyMins + unit.estimated_minutes > dailyCapMinutes || currentHour >= 18) {
        dayOffset++;
        currentHour = 9;
        dailyMins = 0;
      }

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      targetDate.setHours(currentHour, 0, 0, 0);

      const endDate = new Date(targetDate);
      endDate.setMinutes(endDate.getMinutes() + unit.estimated_minutes);

      newBlocks.push({
        id: `block-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        study_unit_id: unit.id,
        start_time: targetDate.toISOString(),
        end_time: endDate.toISOString(),
        block_type: "STUDY",
        status: "SCHEDULED",
        actual_duration_minutes: null,
      });

      scheduledCount++;
      dailyMins += unit.estimated_minutes;
      currentHour += Math.ceil(unit.estimated_minutes / 60) + 1;
    }

    setBlocks(newBlocks);
    return { count: scheduledCount };
  };

  const rebalanceSchedule = (routine = "balanced", customCapMinutes = 240) => {
    let cap = customCapMinutes;
    if (routine === "recovery") cap = 120;
    else if (routine === "sprint") cap = 300;
    return autoReschedule(cap);
  };

  const resetSchedule = () => {
    setBlocks([]);
  };

  const resetAll = () => {
    setSubjects([]);
    setPeriodTimes(DEFAULT_PERIOD_TIMES);
    setTimetableEntries([]);
    setDaysOff([]);
    setOverrides([]);
    setTasks([]);
    setStudyUnits([]);
    setBlocks([]);
    setFocusLogs([]);
    setReviewHistory([]);
    setDailyStats([]);
    setDismissedWarningIds([]);
    saveStateImmediately({
      subjects: [],
      periodTimes: DEFAULT_PERIOD_TIMES,
      timetableEntries: [],
      daysOff: [],
      overrides: [],
      tasks: [],
      studyUnits: [],
      blocks: [],
      focusLogs: [],
      reviewHistory: [],
      dailyStats: [],
      dismissedWarningIds: [],
      geminiApiKey,
    });
  };

  const dismissWarning = (warningId: string) => {
    setDismissedWarningIds((prev) => [...prev, warningId]);
  };

  const getCognitiveWarnings = (): CognitiveLoadWarning[] => {
    const all = analyzeCognitiveLoad(blocksWithDetails);
    return all.filter((w) => !dismissedWarningIds.includes(w.id));
  };

  const completeFocusSession = (
    blockId: string,
    actualMinutes: number,
    rating: ConfidenceRating
  ) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // 1. Mark block completed
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? {
              ...b,
              status: "COMPLETED",
              actual_duration_minutes: actualMinutes,
            }
          : b
      )
    );

    // 2. Mark unit completed
    setStudyUnits((prev) =>
      prev.map((u) =>
        u.id === block.study_unit_id
          ? {
              ...u,
              is_completed: true,
              completed_at: new Date().toISOString(),
            }
          : u
      )
    );

    // 3. Create FocusLog
    const newFocusLog: FocusLog = {
      id: `fl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      scheduled_block_id: blockId,
      user_id: "user-mobile",
      planned_minutes: Math.round(
        (new Date(block.end_time).getTime() - new Date(block.start_time).getTime()) / 60000
      ),
      actual_minutes: actualMinutes,
      timer_mode: "POMODORO",
      pomodoro_count: Math.ceil(actualMinutes / 25),
      started_at: block.start_time,
      ended_at: new Date().toISOString(),
    };
    setFocusLogs((prev) => [newFocusLog, ...prev]);

    // 4. SM-2 Spaced Repetition calculation (Ensures exactly ONE review entry per unit)
    const repetition = 0; // Initial review repetition
    const nextReview = getNextReviewDate(new Date(), repetition, rating);
    const intervalDays = Math.max(
      1,
      Math.round((nextReview.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    );

    const newReviewEntry: ReviewHistory = {
      id: `rh-${block.study_unit_id}`,
      study_unit_id: block.study_unit_id,
      user_id: "user-mobile",
      confidence_rating: rating,
      review_date: format(new Date(), "yyyy-MM-dd"),
      next_review_date: format(nextReview, "yyyy-MM-dd"),
      interval_days: intervalDays,
      repetition_number: 1, // Exactly Rep #1
      created_at: new Date().toISOString(),
    };
    setReviewHistory((prev) => [
      newReviewEntry,
      ...prev.filter((r) => r.study_unit_id !== block.study_unit_id),
    ]);

    // 5. Automatically schedule an SM-2 REVIEW block on target date at 10:00 AM
    const reviewStart = new Date(nextReview);
    reviewStart.setHours(10, 0, 0, 0);
    const reviewEnd = new Date(reviewStart);
    reviewEnd.setMinutes(reviewEnd.getMinutes() + 30);

    const reviewBlock: ScheduledBlock = {
      id: `block-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      study_unit_id: block.study_unit_id,
      start_time: reviewStart.toISOString(),
      end_time: reviewEnd.toISOString(),
      block_type: "REVIEW",
      status: "SCHEDULED",
      actual_duration_minutes: null,
    };
    setBlocks((prev) => [...prev, reviewBlock]);

    // 6. Update Daily Study Stats
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setDailyStats((prev) => {
      const existing = prev.find((d) => d.date === todayStr);
      if (existing) {
        return prev.map((d) =>
          d.date === todayStr
            ? { ...d, actual_minutes: d.actual_minutes + actualMinutes }
            : d
        );
      }
      return [...prev, { date: todayStr, planned_minutes: 0, actual_minutes: actualMinutes }];
    });

    setActiveFocusBlock(null);
  };

  const logIndependentFocusSession = (
    subjectId: string,
    actualMinutes: number,
    rating?: ConfidenceRating
  ): FocusLog => {
    const now = new Date();
    const startTime = new Date(now.getTime() - actualMinutes * 60000).toISOString();
    const endTime = now.toISOString();

    const newFocusLog: FocusLog = {
      id: `fl-indep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      scheduled_block_id: "independent",
      user_id: "user-mobile",
      planned_minutes: actualMinutes,
      actual_minutes: actualMinutes,
      timer_mode: "POMODORO",
      pomodoro_count: Math.ceil(actualMinutes / 25),
      started_at: startTime,
      ended_at: endTime,
    };
    setFocusLogs((prev) => [newFocusLog, ...prev]);

    // Update Daily Study Stats
    const todayStr = format(now, "yyyy-MM-dd");
    setDailyStats((prev) => {
      const existing = prev.find((d) => d.date === todayStr);
      if (existing) {
        return prev.map((d) =>
          d.date === todayStr
            ? { ...d, actual_minutes: d.actual_minutes + actualMinutes }
            : d
        );
      }
      return [...prev, { date: todayStr, planned_minutes: 0, actual_minutes: actualMinutes }];
    });

    return newFocusLog;
  };

  const startStudySessionForUnit = (
    unitId: string
  ): ScheduledBlockWithDetails | null => {
    const unit = studyUnits.find((u) => u.id === unitId);
    if (!unit) return null;
    const subject = subjects.find((s) => s.id === unit.subject_id);
    if (!subject) return null;

    // Check if an existing uncompleted block exists for this unit
    const existing = blocksWithDetails.find(
      (b) => b.study_unit_id === unit.id && b.status !== "COMPLETED"
    );

    if (existing) {
      setActiveFocusBlock(existing);
      return existing;
    }

    // Otherwise create an on-demand scheduled block starting now
    const now = new Date();
    const end = new Date(now.getTime() + unit.estimated_minutes * 60000);
    const newBlock: ScheduledBlock = {
      id: `block-study-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      study_unit_id: unit.id,
      start_time: now.toISOString(),
      end_time: end.toISOString(),
      block_type: "STUDY",
      status: "SCHEDULED",
      actual_duration_minutes: null,
    };

    setBlocks((prev) => [newBlock, ...prev]);

    const enriched: ScheduledBlockWithDetails = {
      ...newBlock,
      study_unit: unit,
      subject,
    };

    setActiveFocusBlock(enriched);
    return enriched;
  };

  const exportBackupData = async (): Promise<{
    success: boolean;
    filePath?: string;
    jsonString: string;
  }> => {
    const currentState: DatabaseState = {
      subjects,
      periodTimes,
      timetableEntries,
      daysOff,
      overrides,
      tasks,
      studyUnits,
      blocks,
      focusLogs,
      reviewHistory,
      dailyStats,
      dismissedWarningIds,
      geminiApiKey,
    };
    const payload = exportBackupJSON(currentState);
    const jsonString = JSON.stringify(payload, null, 2);

    let filePath: string | undefined = undefined;
    try {
      const fileName = `studyfly-backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`;
      const docDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
      if (docDir) {
        filePath = `${docDir}${fileName}`;
        await (FileSystem as any).writeAsStringAsync(filePath, jsonString);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: "application/json",
            dialogTitle: "Export StudyFly Backup",
            UTI: "public.json",
          });
        }
      }
    } catch (err) {
      console.warn("[Backup] Native sharing / write error, returning jsonString:", err);
    }

    return { success: true, filePath, jsonString };
  };

  const importBackupData = async (
    jsonString: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await importBackupJSON(jsonString);
    if (res.success && res.state) {
      setSubjects(res.state.subjects);
      if (res.state.periodTimes && res.state.periodTimes.length > 0) {
        setPeriodTimes(res.state.periodTimes);
      }
      setTimetableEntries(res.state.timetableEntries || []);
      setDaysOff(res.state.daysOff || []);
      setOverrides(res.state.overrides || []);
      setTasks(res.state.tasks || []);
      setStudyUnits(res.state.studyUnits || []);
      setBlocks(res.state.blocks || []);
      setFocusLogs(res.state.focusLogs || []);
      setReviewHistory(res.state.reviewHistory || []);
      setDailyStats(res.state.dailyStats || []);
      setDismissedWarningIds(res.state.dismissedWarningIds || []);
      if (res.state.geminiApiKey) setGeminiApiKey(res.state.geminiApiKey);

      return {
        success: true,
        message: `Successfully restored ${res.state.subjects.length} subjects, ${res.state.timetableEntries?.length || 0} timetable entries, and ${res.state.tasks?.length || 0} tasks!`,
      };
    }
    return {
      success: false,
      message: res.error || "Failed to import backup data.",
    };
  };

  const updateAppSettings = (partial: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const updated = { ...prev, ...partial };
      if (partial.language) {
        setLanguage(partial.language);
      }
      return updated;
    });
  };

  const incrementDailyScanCount = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    setAppSettings((prev) => {
      const isNewDay = prev.lastScanDate !== todayStr;
      const scansUsedToday = isNewDay ? 1 : prev.scansUsedToday + 1;
      return {
        ...prev,
        lastScanDate: todayStr,
        scansUsedToday,
      };
    });
  };

  const addSubjectAlias = (subjectId: string, alias: string) => {
    if (!alias.trim()) return;
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        const currentAliases = s.aliases || [];
        if (currentAliases.some((a) => a.toLowerCase() === alias.trim().toLowerCase())) {
          return s;
        }
        return {
          ...s,
          aliases: [...currentAliases, alias.trim()],
        };
      })
    );
  };

  const removeSubjectAlias = (subjectId: string, alias: string) => {
    setSubjects((prev) =>
      prev.map((s) => {
        if (s.id !== subjectId) return s;
        return {
          ...s,
          aliases: (s.aliases || []).filter((a) => a !== alias),
        };
      })
    );
  };

  const syncNotifications = async () => {
    if (!appSettings.notificationsEnabled) return;
    const tomorrow = addDays(new Date(), 1);
    const tomorrowSchedule = getEffectiveScheduleForDate(tomorrow);
    const tasksDueTomorrow = tasks.filter(
      (t) => t.status === "PENDING" && t.deadlineDate === format(tomorrow, "yyyy-MM-dd")
    ).length;

    if (appSettings.eveningReminderEnabled) {
      await scheduleEveningPreviewNotification(
        appSettings.eveningReminderTime || "20:00",
        tomorrowSchedule,
        tasksDueTomorrow
      );
    }

    if (appSettings.morningAlertEnabled) {
      const today = new Date();
      const todaySchedule = getEffectiveScheduleForDate(today);
      const activeTodayClasses = todaySchedule.items.filter((c) => c.overrideType !== "cancelled").length;
      const tasksDueToday = tasks.filter(
        (t) => t.status === "PENDING" && t.deadlineDate === format(today, "yyyy-MM-dd")
      ).length;

      await scheduleMorningAlertNotification(
        appSettings.morningAlertTime || "06:30",
        activeTodayClasses,
        tasksDueToday
      );
    }
  };

  const handleSetGeminiApiKey = (key: string) => {
    setGeminiApiKey(key);
    setSecureGeminiKey(key);
  };

  return (
    <MobileStudyContext.Provider
      value={{
        subjects,
        periodTimes,
        timetableEntries,
        daysOff,
        overrides,
        tasks,
        studyUnits,
        blocks,
        blocksWithDetails,
        focusLogs,
        reviewHistory,
        dailyStats,
        dismissedWarningIds,
        activeFocusBlock,
        addSubject,
        updateSubject,
        deleteSubject,
        setPeriodTimes,
        updatePeriodTime,
        setTimetableEntries,
        addTimetableEntry,
        updateTimetableEntry,
        deleteTimetableEntry,
        importTimetable,
        getDaySchedule,
        auditData,
        relinkOrphanEntry,
        autoRelinkOrphans,
        rapikanDuplicates,
        reclassifyExistingEntries,
        addDayOff,
        addDayOffRange,
        deleteDayOff,
        addOverride,
        deleteOverride,
        getEffectiveScheduleForDate,
        recalculateDeadlines,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompletion,
        studyBlocks,
        schedulePrefs,
        lastScheduleBackup,
        setStudyBlocks: handleSetStudyBlocks,
        applySchedule,
        undoLastSchedule,
        addStudyBlock,
        updateStudyBlock,
        deleteStudyBlock,
        toggleBlockCompletion,
        updateSchedulePrefs,
        addStudyUnit,
        deleteStudyUnit,
        toggleStudyUnitCompletion,
        addBlock,
        deleteBlock,
        autoReschedule,
        rebalanceSchedule,
        resetSchedule,
        resetAll,
        dismissWarning,
        getCognitiveWarnings,
        geminiApiKey,
        setGeminiApiKey: handleSetGeminiApiKey,
        appSettings,
        updateAppSettings,
        incrementDailyScanCount,
        addSubjectAlias,
        removeSubjectAlias,
        syncNotifications,
        isAIScanning,
        setIsAIScanning,
        startStudySessionForUnit,
        setActiveFocusBlock,
        completeFocusSession,
        logIndependentFocusSession,
        exportBackupData,
        importBackupData,
        isDatabaseReady,
        streakState,
        activeCelebrationMilestone,
        triggerCelebration,
        dismissCelebration,
        resetStreak,
        streakDebugOverride,
        setStreakDebugOverride,
        simulateStreakDays,
        addMockStudyToday,
        clearTodayStudySessions,
      }}
    >
      {children}
    </MobileStudyContext.Provider>
  );
}

export function useMobileStudyStore() {
  const ctx = useContext(MobileStudyContext);
  if (!ctx) {
    throw new Error("useMobileStudyStore must be used within MobileStudyProvider");
  }
  return ctx;
}
