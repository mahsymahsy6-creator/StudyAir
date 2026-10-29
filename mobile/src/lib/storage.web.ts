/**
 * StudyAir Mobile — Web Platform Storage Implementation
 * 
 * Provides AsyncStorage-backed persistence when running in Web/Playwright.
 * Avoids native expo-sqlite wasm build dependencies.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Subject,
  PeriodTime,
  TimetableEntry,
  DayOff,
  Override,
  Task,
  StudyUnit,
  ScheduledBlock,
  FocusLog,
  ReviewHistory,
  DailyStudyStats,
  AppSettings,
  DEFAULT_APP_SETTINGS,
  StudyBlock,
  SchedulePrefs,
  DEFAULT_SCHEDULE_PREFS,
} from "../types";
import { INITIAL_SUBJECTS, INITIAL_STUDY_UNITS, INITIAL_BLOCKS } from "../mockData";

const ASYNC_STORAGE_KEY = "studyfly_persistent_mirror_v2";

export interface DatabaseState {
  subjects: Subject[];
  periodTimes: PeriodTime[];
  timetableEntries: TimetableEntry[];
  daysOff: DayOff[];
  overrides: Override[];
  tasks: Task[];
  studyUnits: StudyUnit[];
  blocks: ScheduledBlock[];
  focusLogs: FocusLog[];
  reviewHistory: ReviewHistory[];
  dailyStats: DailyStudyStats[];
  dismissedWarningIds: string[];
  geminiApiKey: string;
  appSettings: AppSettings;
  studyBlocks?: StudyBlock[];
  schedulePrefs?: SchedulePrefs;
}

export interface BackupPayload {
  version: 2;
  exportedAt: string;
  data: DatabaseState;
}

export const DEFAULT_PERIOD_TIMES: PeriodTime[] = [
  { periodNumber: 1, start: "07:00", end: "07:45" },
  { periodNumber: 2, start: "07:45", end: "08:30" },
  { periodNumber: 3, start: "08:30", end: "09:15" },
  { periodNumber: 4, start: "09:30", end: "10:15" },
  { periodNumber: 5, start: "10:15", end: "11:00" },
  { periodNumber: 6, start: "11:00", end: "11:45" },
  { periodNumber: 7, start: "12:30", end: "13:15" },
  { periodNumber: 8, start: "13:15", end: "14:00" },
];

export async function initDatabase(): Promise<boolean> {
  return true;
}

export async function loadAllData(): Promise<DatabaseState> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.subjects && parsed.subjects.length > 0) {
        const tasks = (parsed.tasks || []).map((t: any) => ({
          ...t,
          estimatedMinutes: t.estimatedMinutes != null ? Number(t.estimatedMinutes) : 30,
        }));
        return {
          ...parsed,
          tasks,
          studyBlocks: Array.isArray(parsed.studyBlocks) ? parsed.studyBlocks : [],
          schedulePrefs: parsed.schedulePrefs || DEFAULT_SCHEDULE_PREFS,
          appSettings: {
            ...DEFAULT_APP_SETTINGS,
            ...(parsed.appSettings || {}),
          },
        };
      }
    }
  } catch (err) {
    console.warn("[StorageWeb] Error loading AsyncStorage:", err);
  }

  // Initial seed with sample subjects & timetable for instant demo
  const sampleSubjects: Subject[] = [
    {
      id: "sub-math",
      title: "Matematika",
      name: "Matematika",
      color: "#3A86FF",
      color_hex: "#3A86FF",
      aliases: ["MTK", "Math"],
      teacher: "Drs. Budi Santoso",
      room: "R. 102",
      bringItems: ["Buku Berpetak", "Penggaris Segitiga", "Kalkulator"],
      exam_date: "2026-11-25",
      examDate: "2026-11-25",
    },
    {
      id: "sub-fis",
      title: "Fisika",
      name: "Fisika",
      color: "#8B5CF6",
      color_hex: "#8B5CF6",
      aliases: ["FIS"],
      teacher: "Siti Rahma, M.Pd",
      room: "Lab Fisika",
      bringItems: ["Kalkulator Ilmiah", "Buku Rumus"],
      exam_date: "2026-11-28",
      examDate: "2026-11-28",
    },
    {
      id: "sub-kim",
      title: "Kimia",
      name: "Kimia",
      color: "#10B981",
      color_hex: "#10B981",
      aliases: ["KIM"],
      teacher: "Ahmad Fauzi, S.Si",
      room: "Lab Kimia",
      bringItems: ["Jas Lab", "Buku Praktikum"],
      exam_date: "2026-11-30",
      examDate: "2026-11-30",
    },
    {
      id: "sub-pjok",
      title: "PJOK",
      name: "PJOK",
      color: "#F59E0B",
      color_hex: "#F59E0B",
      aliases: ["Penjas", "Olahraga"],
      teacher: "Pak Yanto",
      room: "Lapangan Utama",
      bringItems: ["Baju Olahraga", "Sepatu Kets", "Botol Minum"],
      exam_date: "2026-12-05",
      examDate: "2026-12-05",
    },
  ];

  const sampleTimetable: TimetableEntry[] = [
    { id: "tt-1", weekday: 1, periodNumber: 1, subjectId: "sub-math", weekPattern: "every", kind: "class", room: "R. 102" },
    { id: "tt-2", weekday: 1, periodNumber: 2, subjectId: "sub-math", weekPattern: "every", kind: "class", room: "R. 102" },
    { id: "tt-3", weekday: 1, periodNumber: 3, subjectId: "sub-pjok", weekPattern: "every", kind: "class", room: "Lapangan" },
    { id: "tt-4", weekday: 2, periodNumber: 1, subjectId: "sub-fis", weekPattern: "every", kind: "class", room: "Lab Fisika" },
    { id: "tt-5", weekday: 2, periodNumber: 2, subjectId: "sub-fis", weekPattern: "every", kind: "class", room: "Lab Fisika" },
    { id: "tt-6", weekday: 3, periodNumber: 1, subjectId: "sub-kim", weekPattern: "every", kind: "class", room: "Lab Kimia" },
  ];

  const sampleTasks: Task[] = [
    {
      id: "task-1",
      subjectId: "sub-math",
      title: "Latihan Soal Bab 1 No. 1 - 10",
      type: "homework",
      givenDate: "2026-10-24",
      deadlineDate: "2026-10-26",
      deadlineMode: "nextClass",
      estimatedMinutes: 30,
      status: "PENDING",
    },
    {
      id: "task-2",
      subjectId: "sub-fis",
      title: "Laporan Praktikum Kinematika",
      type: "homework",
      givenDate: "2026-10-23",
      deadlineDate: "2026-10-27",
      deadlineMode: "nextClass",
      estimatedMinutes: 45,
      status: "PENDING",
    },
  ];

  const sampleUnits: StudyUnit[] = [
    {
      id: "unit-1",
      subject_id: "sub-math",
      title: "Trigonometri & Rumus Jumlah Dua Sudut",
      estimated_minutes: 25,
      cognitive_load: "HIGH",
      sort_order: 1,
      is_completed: false,
      completed_at: null,
    },
    {
      id: "unit-2",
      subject_id: "sub-fis",
      title: "Hukum Newton tentang Gerak",
      estimated_minutes: 45,
      cognitive_load: "MEDIUM",
      sort_order: 2,
      is_completed: false,
      completed_at: null,
    },
  ];

  const initialState: DatabaseState = {
    subjects: sampleSubjects,
    periodTimes: DEFAULT_PERIOD_TIMES,
    timetableEntries: sampleTimetable,
    daysOff: [],
    overrides: [],
    tasks: sampleTasks,
    studyUnits: sampleUnits,
    blocks: INITIAL_BLOCKS,
    focusLogs: [],
    reviewHistory: [],
    dailyStats: [{ date: "2026-10-25", planned_minutes: 60, actual_minutes: 45 }],
    dismissedWarningIds: [],
    geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
    studyBlocks: [],
    schedulePrefs: DEFAULT_SCHEDULE_PREFS,
    appSettings: {
      ...DEFAULT_APP_SETTINGS,
      hasCompletedOnboarding: true, // Set to true so main UI displays immediately
    },
  };

  saveStateImmediately(initialState).catch(() => {});
  return initialState;
}

export async function persistFullStateToSQLite(state: DatabaseState): Promise<void> {
  await saveStateImmediately(state);
}

export async function saveStateImmediately(state: DatabaseState): Promise<void> {
  try {
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[StorageWeb] Error saving to AsyncStorage:", err);
  }
}

export function exportBackupJSON(state: DatabaseState): BackupPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: state,
  };
}

export async function importBackupJSON(
  jsonString: string
): Promise<{ success: boolean; state?: DatabaseState; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    const data = parsed.data || parsed;
    if (!data.subjects || !Array.isArray(data.subjects)) {
      return { success: false, error: "Format cadangan tidak valid (mata pelajaran tidak ditemukan)" };
    }
    const cleanState: DatabaseState = {
      ...data,
      tasks: (data.tasks || []).map((t: any) => ({
        ...t,
        estimatedMinutes: t.estimatedMinutes != null ? Number(t.estimatedMinutes) : 30,
      })),
      studyBlocks: Array.isArray(data.studyBlocks) ? data.studyBlocks : [],
      schedulePrefs: data.schedulePrefs || DEFAULT_SCHEDULE_PREFS,
    };
    await saveStateImmediately(cleanState);
    return { success: true, state: cleanState };
  } catch (err) {
    return { success: false, error: (err as any).message || "Gagal mengurai file JSON" };
  }
}

/**
 * Saves all study blocks into AsyncStorage.
 */
export async function saveStudyBlocks(blocks: StudyBlock[]): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    const state: DatabaseState = raw ? JSON.parse(raw) : ({} as any);
    state.studyBlocks = blocks;
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[StorageWeb] Error saving study blocks:", err);
  }
}

/**
 * Loads all study blocks from AsyncStorage.
 */
export async function getStudyBlocks(): Promise<StudyBlock[]> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (Array.isArray(state.studyBlocks)) {
        return state.studyBlocks;
      }
    }
  } catch (err) {
    console.warn("[StorageWeb] Error reading study blocks:", err);
  }
  return [];
}

/**
 * Saves schedule preferences into AsyncStorage.
 */
export async function saveSchedulePrefs(prefs: SchedulePrefs): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    const state: DatabaseState = raw ? JSON.parse(raw) : ({} as any);
    state.schedulePrefs = prefs;
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[StorageWeb] Error saving schedule prefs:", err);
  }
}

/**
 * Loads schedule preferences from AsyncStorage.
 */
export async function getSchedulePrefs(): Promise<SchedulePrefs> {
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (state.schedulePrefs) {
        return {
          ...DEFAULT_SCHEDULE_PREFS,
          ...state.schedulePrefs,
          priorityWeights: {
            ...DEFAULT_SCHEDULE_PREFS.priorityWeights,
            ...(state.schedulePrefs.priorityWeights || {}),
          },
        };
      }
    }
  } catch (err) {
    console.warn("[StorageWeb] Error reading schedule prefs:", err);
  }
  return DEFAULT_SCHEDULE_PREFS;
}

