import * as SQLite from "expo-sqlite";
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
  Grade,
  Teacher,
} from "../types";
import { INITIAL_SUBJECTS, INITIAL_STUDY_UNITS, INITIAL_BLOCKS } from "../mockData";

const DB_NAME = "studyfly_persistent.db";
const ASYNC_STORAGE_FALLBACK_KEY = "studyfly_persistent_mirror_v2";

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
  appSettings?: AppSettings;
  studyBlocks?: StudyBlock[];
  schedulePrefs?: SchedulePrefs;
  grades?: Grade[];
  teachers?: Teacher[];
}

export interface BackupPayload {
  app: "StudyAir";
  version: "2.0.0";
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

let dbInstance: SQLite.SQLiteDatabase | null = null;
let isSQLiteReady = false;

/**
 * Migration helper to ensure columns exist in SQLite table
 */
async function ensureColumnExists(
  db: SQLite.SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDef: string
) {
  try {
    const tableInfo = await db.getAllAsync<any>(`PRAGMA table_info(${tableName});`);
    const exists = tableInfo.some((col) => col.name === columnName);
    if (!exists) {
      await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
    }
  } catch (err) {
    console.warn(`[Storage] Could not alter table ${tableName} for column ${columnName}:`, err);
  }
}

/**
 * Initializes the SQLite database and executes migrations for Phase 2 models
 */
export async function initDatabase(): Promise<boolean> {
  if (isSQLiteReady && dbInstance) return true;

  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    dbInstance = db;

    // Enable WAL mode for concurrency and durability
    await db.execAsync("PRAGMA journal_mode = WAL;");

    // 1. Subjects table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT,
        title TEXT,
        color TEXT,
        color_hex TEXT,
        aliases TEXT,
        teacher TEXT,
        room TEXT,
        bring_items TEXT,
        exam_date TEXT,
        total_estimated_minutes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Ensure unified subject columns exist for migrated databases
    await ensureColumnExists(db, "subjects", "name", "TEXT");
    await ensureColumnExists(db, "subjects", "color", "TEXT");
    await ensureColumnExists(db, "subjects", "aliases", "TEXT");
    await ensureColumnExists(db, "subjects", "teacher", "TEXT");
    await ensureColumnExists(db, "subjects", "room", "TEXT");
    await ensureColumnExists(db, "subjects", "bring_items", "TEXT");

    // 2. School Timetable & Period Times
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS period_times (
        period_number INTEGER PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS timetable_entries (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        weekday INTEGER NOT NULL,
        period_number INTEGER NOT NULL,
        week_pattern TEXT NOT NULL DEFAULT 'every'
      );

      CREATE TABLE IF NOT EXISTS days_off (
        date TEXT PRIMARY KEY,
        reason TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS overrides (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        entry_id TEXT NOT NULL,
        type TEXT NOT NULL,
        new_subject_id TEXT,
        period_number INTEGER,
        custom_label TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        type TEXT NOT NULL DEFAULT 'homework',
        given_date TEXT NOT NULL,
        deadline_date TEXT NOT NULL,
        deadline_mode TEXT NOT NULL DEFAULT 'nextClass',
        estimated_minutes INTEGER DEFAULT 30,
        status TEXT NOT NULL DEFAULT 'PENDING',
        completed_at TEXT,
        photo_uri TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS study_blocks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS study_units (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        title TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL,
        cognitive_load TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS scheduled_blocks (
        id TEXT PRIMARY KEY,
        study_unit_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT NOT NULL,
        block_type TEXT NOT NULL,
        actual_duration_minutes INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS focus_logs (
        id TEXT PRIMARY KEY,
        scheduled_block_id TEXT,
        user_id TEXT DEFAULT 'user-1',
        planned_minutes INTEGER NOT NULL,
        actual_minutes INTEGER NOT NULL,
        timer_mode TEXT DEFAULT 'POMODORO',
        pomodoro_count INTEGER DEFAULT 1,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS review_history (
        id TEXT PRIMARY KEY,
        study_unit_id TEXT NOT NULL,
        user_id TEXT DEFAULT 'user-1',
        confidence_rating INTEGER NOT NULL,
        review_date TEXT NOT NULL,
        next_review_date TEXT NOT NULL,
        interval_days INTEGER NOT NULL,
        repetition_number INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        planned_minutes INTEGER NOT NULL,
        actual_minutes INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS grades (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,
        title TEXT NOT NULL,
        score REAL NOT NULL,
        max_score REAL DEFAULT 100,
        weight REAL DEFAULT 1,
        category TEXT DEFAULT 'exam',
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        subject_ids TEXT,
        phone TEXT,
        email TEXT,
        room TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_timetable_weekday ON timetable_entries(weekday);
      CREATE INDEX IF NOT EXISTS idx_tasks_subject ON tasks(subject_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline_date);
      CREATE INDEX IF NOT EXISTS idx_study_blocks_date ON study_blocks(date);
      CREATE INDEX IF NOT EXISTS idx_study_blocks_task ON study_blocks(task_id);
      CREATE INDEX IF NOT EXISTS idx_grades_subject ON grades(subject_id);
      CREATE INDEX IF NOT EXISTS idx_grades_date ON grades(date);
    `);

    // Safe schema migrations for existing local databases
    await ensureColumnExists(db, "subjects", "target_grade", "REAL DEFAULT 80");
    await ensureColumnExists(db, "subjects", "credit_hours", "INTEGER DEFAULT 2");
    await ensureColumnExists(db, "tasks", "estimated_minutes", "INTEGER DEFAULT 30");
    await ensureColumnExists(db, "overrides", "period_number", "INTEGER");
    await ensureColumnExists(db, "overrides", "custom_label", "TEXT");
    await ensureColumnExists(db, "timetable_entries", "kind", "TEXT");
    await ensureColumnExists(db, "timetable_entries", "custom_label", "TEXT");
    await ensureColumnExists(db, "timetable_entries", "start_time", "TEXT");
    await ensureColumnExists(db, "timetable_entries", "end_time", "TEXT");
    await ensureColumnExists(db, "timetable_entries", "room", "TEXT");
    await ensureColumnExists(db, "timetable_entries", "teacher", "TEXT");

    isSQLiteReady = true;
    return true;
  } catch (err) {
    console.warn("[Storage] SQLite initialization skipped or unavailable, falling back to AsyncStorage:", err);
    isSQLiteReady = false;
    return false;
  }
}

/**
 * Loads all state on app launch from SQLite (or AsyncStorage fallback).
 * Performs automatic data migration if legacy data structures are present.
 */
export async function loadAllData(): Promise<DatabaseState> {
  const sqliteAvailable = await initDatabase();

  if (sqliteAvailable && dbInstance) {
    try {
      const subjectRows = await dbInstance.getAllAsync<any>("SELECT * FROM subjects ORDER BY created_at ASC");
      const periodRows = await dbInstance.getAllAsync<any>("SELECT * FROM period_times ORDER BY period_number ASC");
      const timetableRows = await dbInstance.getAllAsync<any>("SELECT * FROM timetable_entries ORDER BY weekday ASC, period_number ASC");
      const dayOffRows = await dbInstance.getAllAsync<any>("SELECT * FROM days_off ORDER BY date ASC");
      const overrideRows = await dbInstance.getAllAsync<any>("SELECT * FROM overrides ORDER BY date ASC");
      const taskRows = await dbInstance.getAllAsync<any>("SELECT * FROM tasks ORDER BY deadline_date ASC");

      const unitRows = await dbInstance.getAllAsync<any>("SELECT * FROM study_units ORDER BY sort_order ASC, created_at ASC");
      const blockRows = await dbInstance.getAllAsync<any>("SELECT * FROM scheduled_blocks ORDER BY start_time ASC");
      const logRows = await dbInstance.getAllAsync<any>("SELECT * FROM focus_logs ORDER BY started_at ASC");
      const reviewRows = await dbInstance.getAllAsync<any>("SELECT * FROM review_history ORDER BY review_date ASC");
      const statRows = await dbInstance.getAllAsync<any>("SELECT * FROM daily_stats ORDER BY date ASC");
      const settingRows = await dbInstance.getAllAsync<any>("SELECT * FROM app_settings");

      if (subjectRows.length > 0 || periodRows.length > 0 || taskRows.length > 0) {
        // Map subjects with full compatibility for legacy and unified fields
        const subjects: Subject[] = subjectRows.map((r) => {
          const name = r.name || r.title || "Course";
          const color = r.color || r.color_hex || "#3b82f6";
          const examDate = r.exam_date || undefined;

          let aliases: string[] = [];
          try {
            aliases = r.aliases ? JSON.parse(r.aliases) : [];
          } catch {
            aliases = [];
          }

          let bringItems: string[] = [];
          try {
            bringItems = r.bring_items ? JSON.parse(r.bring_items) : [];
          } catch {
            bringItems = [];
          }

          return {
            id: r.id,
            name,
            color,
            aliases,
            teacher: r.teacher || undefined,
            room: r.room || undefined,
            bringItems,
            examDate,
            targetGrade: r.target_grade != null ? Number(r.target_grade) : 80,
            creditHours: r.credit_hours != null ? Number(r.credit_hours) : 2,
            // Legacy aliases
            title: name,
            color_hex: color,
            exam_date: examDate || "",
            total_estimated_minutes: r.total_estimated_minutes || 0,
          };
        });

        // Period times (fall back to default Indonesian bell schedule if none saved yet)
        const periodTimes: PeriodTime[] =
          periodRows.length > 0
            ? periodRows.map((r) => ({
                periodNumber: r.period_number,
                start: r.start_time,
                end: r.end_time,
              }))
            : DEFAULT_PERIOD_TIMES;

        const timetableEntries: TimetableEntry[] = timetableRows.map((r) => ({
          id: r.id,
          subjectId: r.subject_id || "",
          weekday: r.weekday,
          periodNumber: r.period_number,
          weekPattern: r.week_pattern || "every",
          kind: r.kind || "class",
          customLabel: r.custom_label || undefined,
          startTime: r.start_time || undefined,
          endTime: r.end_time || undefined,
          room: r.room || undefined,
          teacher: r.teacher || undefined,
        }));

        const daysOff: DayOff[] = dayOffRows.map((r) => ({
          date: r.date,
          reason: r.reason,
        }));

        const overrides: Override[] = overrideRows.map((r) => ({
          date: r.date,
          entryId: r.entry_id,
          type: r.type,
          newSubjectId: r.new_subject_id || undefined,
          periodNumber: r.period_number != null ? r.period_number : undefined,
          customLabel: r.custom_label || undefined,
        }));

        const tasks: Task[] = taskRows.map((r) => {
          const est = r.estimated_minutes != null ? Number(r.estimated_minutes) : 30;
          return {
            id: r.id,
            subjectId: r.subject_id,
            title: r.title,
            notes: r.notes || undefined,
            type: r.type || "homework",
            givenDate: r.given_date,
            deadlineDate: r.deadline_date,
            deadlineMode: r.deadline_mode || "nextClass",
            estimatedMinutes: !isNaN(est) && est > 0 ? est : 30,
            status: r.status || "PENDING",
            completedAt: r.completed_at || undefined,
            photoUri: r.photo_uri || undefined,
          };
        });

        const studyUnits: StudyUnit[] = unitRows.map((r, idx) => ({
          id: r.id,
          subject_id: r.subject_id,
          title: r.title,
          estimated_minutes: r.estimated_minutes,
          cognitive_load: r.cognitive_load,
          sort_order: r.sort_order ?? idx,
          is_completed: Boolean(r.is_completed),
          completed_at: r.completed_at || null,
        }));

        const blocks: ScheduledBlock[] = blockRows.map((r) => ({
          id: r.id,
          study_unit_id: r.study_unit_id,
          start_time: r.start_time,
          end_time: r.end_time,
          status: r.status,
          block_type: r.block_type,
          actual_duration_minutes: r.actual_duration_minutes !== null ? r.actual_duration_minutes : null,
        }));

        const focusLogs: FocusLog[] = logRows.map((r) => ({
          id: r.id,
          scheduled_block_id: r.scheduled_block_id || "",
          user_id: r.user_id || "user-1",
          planned_minutes: r.planned_minutes,
          actual_minutes: r.actual_minutes,
          timer_mode: r.timer_mode || "POMODORO",
          pomodoro_count: r.pomodoro_count || 1,
          started_at: r.started_at,
          ended_at: r.ended_at || null,
        }));

        const reviewHistory: ReviewHistory[] = reviewRows.map((r) => ({
          id: r.id,
          study_unit_id: r.study_unit_id,
          user_id: r.user_id || "user-1",
          confidence_rating: r.confidence_rating,
          review_date: r.review_date,
          next_review_date: r.next_review_date,
          interval_days: r.interval_days,
          repetition_number: r.repetition_number,
          created_at: r.created_at || new Date().toISOString(),
        }));

        const dailyStats: DailyStudyStats[] = statRows.map((r) => ({
          date: r.date,
          planned_minutes: r.planned_minutes,
          actual_minutes: r.actual_minutes,
        }));

        const settingsMap: Record<string, string> = {};
        for (const s of settingRows) {
          settingsMap[s.key] = s.value;
        }

        const dismissedWarningIds = settingsMap["dismissed_warning_ids"]
          ? JSON.parse(settingsMap["dismissed_warning_ids"])
          : [];
        const geminiApiKey = settingsMap["gemini_api_key"] || "";
        const rawSettings = settingsMap["app_settings"]
          ? JSON.parse(settingsMap["app_settings"])
          : null;
        const appSettings: AppSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...(rawSettings || {}),
        };

        let studyBlocks: StudyBlock[] = [];
        try {
          const studyBlockRows = await dbInstance.getAllAsync<any>(
            "SELECT * FROM study_blocks ORDER BY date ASC, start_time ASC"
          );
          studyBlocks = studyBlockRows.map((r) => ({
            id: r.id,
            taskId: r.task_id,
            subjectId: r.subject_id,
            date: r.date,
            startTime: r.start_time,
            endTime: r.end_time,
            durationMinutes: r.duration_minutes != null ? Number(r.duration_minutes) : 30,
            status: r.status || "SCHEDULED",
            completedAt: r.completed_at || undefined,
            createdAt: r.created_at || undefined,
          }));
        } catch (sbErr) {
          console.warn("[Storage] Could not query study_blocks table:", sbErr);
        }

        let schedulePrefs: SchedulePrefs = DEFAULT_SCHEDULE_PREFS;
        if (settingsMap["schedule_prefs"]) {
          try {
            const parsedPrefs = JSON.parse(settingsMap["schedule_prefs"]);
            schedulePrefs = {
              ...DEFAULT_SCHEDULE_PREFS,
              ...parsedPrefs,
              priorityWeights: {
                ...DEFAULT_SCHEDULE_PREFS.priorityWeights,
                ...(parsedPrefs.priorityWeights || {}),
              },
            };
          } catch {
            schedulePrefs = DEFAULT_SCHEDULE_PREFS;
          }
        }

        let grades: Grade[] = [];
        try {
          const gradeRows = await dbInstance.getAllAsync<any>(
            "SELECT * FROM grades ORDER BY date DESC, created_at DESC"
          );
          grades = gradeRows.map((r) => ({
            id: r.id,
            subjectId: r.subject_id,
            title: r.title,
            score: Number(r.score) || 0,
            maxScore: Number(r.max_score) || 100,
            weight: Number(r.weight) || 1,
            category: r.category || "exam",
            date: r.date,
            notes: r.notes || undefined,
            createdAt: r.created_at || undefined,
          }));
        } catch (gErr) {
          console.warn("[Storage] Could not query grades table:", gErr);
        }

        let teachers: Teacher[] = [];
        try {
          const teacherRows = await dbInstance.getAllAsync<any>(
            "SELECT * FROM teachers ORDER BY name ASC"
          );
          teachers = teacherRows.map((r) => {
            let subjectIds: string[] = [];
            try {
              subjectIds = r.subject_ids ? JSON.parse(r.subject_ids) : [];
            } catch {
              subjectIds = [];
            }
            return {
              id: r.id,
              name: r.name,
              subjectIds,
              phone: r.phone || undefined,
              email: r.email || undefined,
              room: r.room || undefined,
              notes: r.notes || undefined,
            };
          });
        } catch (tErr) {
          console.warn("[Storage] Could not query teachers table:", tErr);
        }

        const loadedState: DatabaseState = {
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
          grades,
          teachers,
        };

        // Keep mirror up-to-date
        AsyncStorage.setItem(ASYNC_STORAGE_FALLBACK_KEY, JSON.stringify(loadedState)).catch(() => {});
        return loadedState;
      }
    } catch (e) {
      console.warn("[Storage] Error reading from SQLite:", e);
    }
  }

  // Check AsyncStorage mirror / fallback
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_FALLBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.subjects && parsed.subjects.length > 0) {
        if (parsed.tasks && Array.isArray(parsed.tasks)) {
          parsed.tasks = parsed.tasks.map((t: any) => ({
            ...t,
            estimatedMinutes: t.estimatedMinutes != null ? Number(t.estimatedMinutes) : 30,
          }));
        }
        if (!parsed.studyBlocks) parsed.studyBlocks = [];
        if (!parsed.schedulePrefs) parsed.schedulePrefs = DEFAULT_SCHEDULE_PREFS;
        if (sqliteAvailable && dbInstance) {
          await persistFullStateToSQLite(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Storage] Error reading AsyncStorage fallback:", err);
  }

  // First boot seed
  const initialState: DatabaseState = {
    subjects: INITIAL_SUBJECTS.map((s) => ({
      ...s,
      name: s.title || "Subject",
      color: s.color_hex || "#3b82f6",
      aliases: [],
      bringItems: [],
      examDate: s.exam_date,
    })),
    periodTimes: DEFAULT_PERIOD_TIMES,
    timetableEntries: [],
    daysOff: [],
    overrides: [],
    tasks: [],
    studyUnits: INITIAL_STUDY_UNITS,
    blocks: INITIAL_BLOCKS,
    focusLogs: [],
    reviewHistory: [],
    dailyStats: [],
    dismissedWarningIds: [],
    geminiApiKey: "",
    studyBlocks: [],
    schedulePrefs: DEFAULT_SCHEDULE_PREFS,
  };

  if (sqliteAvailable && dbInstance) {
    await persistFullStateToSQLite(initialState);
  }
  AsyncStorage.setItem(ASYNC_STORAGE_FALLBACK_KEY, JSON.stringify(initialState)).catch(() => {});

  return initialState;
}

let isPersistingToSQLite = false;
let pendingStateToPersist: DatabaseState | null = null;

async function _executePersistFullState(state: DatabaseState): Promise<void> {
  if (!dbInstance || !isSQLiteReady) return;

  await dbInstance.withTransactionAsync(async () => {
      // Clear existing records
      await dbInstance!.execAsync(`
        DELETE FROM subjects;
        DELETE FROM period_times;
        DELETE FROM timetable_entries;
        DELETE FROM days_off;
        DELETE FROM overrides;
        DELETE FROM tasks;
        DELETE FROM study_units;
        DELETE FROM scheduled_blocks;
        DELETE FROM focus_logs;
        DELETE FROM review_history;
        DELETE FROM daily_stats;
        DELETE FROM study_blocks;
        DELETE FROM grades;
        DELETE FROM teachers;
      `);

      // 1. Insert subjects
      for (const s of state.subjects || []) {
        const name = s.name || s.title || "Subject";
        const color = s.color || s.color_hex || "#3b82f6";
        const examDate = s.examDate || s.exam_date || null;
        const aliases = JSON.stringify(s.aliases || []);
        const bringItems = JSON.stringify(s.bringItems || []);

        await dbInstance!.runAsync(
          `INSERT OR REPLACE INTO subjects (id, name, title, color, color_hex, aliases, teacher, room, bring_items, exam_date, total_estimated_minutes, target_grade, credit_hours)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          s.id || `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          name,
          color,
          color,
          aliases,
          s.teacher || null,
          s.room || null,
          bringItems,
          examDate,
          s.total_estimated_minutes || 0,
          s.targetGrade != null ? s.targetGrade : 80,
          s.creditHours != null ? s.creditHours : 2
        );
      }

      // 2. Insert period times
      for (const pt of state.periodTimes || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO period_times (period_number, start_time, end_time) VALUES (?, ?, ?)",
          pt.periodNumber,
          pt.start || "07:00",
          pt.end || "07:45"
        );
      }

      // 3. Insert timetable entries
      for (const te of state.timetableEntries || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO timetable_entries (id, subject_id, weekday, period_number, week_pattern, kind, custom_label, start_time, end_time, room, teacher) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          te.id || `te-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          te.subjectId || "",
          te.weekday,
          te.periodNumber,
          te.weekPattern || "every",
          te.kind || "class",
          te.customLabel || null,
          te.startTime || null,
          te.endTime || null,
          te.room || null,
          te.teacher || null
        );
      }

      // 4. Insert days off
      for (const d of state.daysOff || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO days_off (date, reason) VALUES (?, ?)",
          d.date,
          d.reason || ""
        );
      }

      // 5. Insert overrides
      for (let i = 0; i < (state.overrides || []).length; i++) {
        const o = state.overrides[i];
        const safeEntryId = o.entryId || "";
        const overrideId = (o as any).id || `${o.date}-${safeEntryId || 'p' + (o.periodNumber ?? i)}-${i}`;
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO overrides (id, date, entry_id, type, new_subject_id, period_number, custom_label) VALUES (?, ?, ?, ?, ?, ?, ?)",
          overrideId,
          o.date || new Date().toISOString().slice(0, 10),
          safeEntryId,
          o.type || "added",
          o.newSubjectId || null,
          o.periodNumber != null ? o.periodNumber : null,
          o.customLabel || null
        );
      }

      // 6. Insert tasks
      for (const t of state.tasks || []) {
        const est = t.estimatedMinutes != null ? Number(t.estimatedMinutes) : 30;
        await dbInstance!.runAsync(
          `INSERT OR REPLACE INTO tasks (id, subject_id, title, notes, type, given_date, deadline_date, deadline_mode, estimated_minutes, status, completed_at, photo_uri)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          t.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          t.subjectId || "",
          t.title || "Tugas",
          t.notes || null,
          t.type || "homework",
          t.givenDate || new Date().toISOString().slice(0, 10),
          t.deadlineDate || new Date().toISOString().slice(0, 10),
          t.deadlineMode || "nextClass",
          !isNaN(est) && est > 0 ? est : 30,
          t.status || "PENDING",
          t.completedAt || null,
          t.photoUri || null
        );
      }

      // 7. Insert study units
      for (const u of state.studyUnits || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO study_units (id, subject_id, title, estimated_minutes, cognitive_load, sort_order, is_completed, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          u.id || `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          u.subject_id || "",
          u.title || "Materi",
          u.estimated_minutes || 0,
          u.cognitive_load || "low",
          u.sort_order || 0,
          u.is_completed ? 1 : 0,
          u.completed_at || null
        );
      }

      // 8. Insert scheduled blocks
      for (const b of state.blocks || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO scheduled_blocks (id, study_unit_id, start_time, end_time, status, block_type, actual_duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)",
          b.id || `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          b.study_unit_id || "",
          b.start_time || new Date().toISOString(),
          b.end_time || new Date().toISOString(),
          b.status || "PLANNED",
          b.block_type || "STUDY",
          b.actual_duration_minutes || null
        );
      }

      // 9. Insert focus logs
      for (const l of state.focusLogs || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO focus_logs (id, scheduled_block_id, user_id, planned_minutes, actual_minutes, timer_mode, pomodoro_count, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          l.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          l.scheduled_block_id || null,
          l.user_id || "user-1",
          l.planned_minutes || 0,
          l.actual_minutes || 0,
          l.timer_mode || "POMODORO",
          l.pomodoro_count || 1,
          l.started_at || new Date().toISOString(),
          l.ended_at || null
        );
      }

      // 10. Insert review history
      for (const r of state.reviewHistory || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO review_history (id, study_unit_id, user_id, confidence_rating, review_date, next_review_date, interval_days, repetition_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          r.id || `review-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          r.study_unit_id || "",
          r.user_id || "user-1",
          r.confidence_rating || 3,
          r.review_date || new Date().toISOString().slice(0, 10),
          r.next_review_date || new Date().toISOString().slice(0, 10),
          r.interval_days || 1,
          r.repetition_number || 1,
          r.created_at || new Date().toISOString()
        );
      }

      // 11. Insert daily stats
      for (const ds of state.dailyStats || []) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO daily_stats (date, planned_minutes, actual_minutes) VALUES (?, ?, ?)",
          ds.date,
          ds.planned_minutes,
          ds.actual_minutes
        );
      }

      // 12. Save settings
      await dbInstance!.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('dismissed_warning_ids', ?)",
        JSON.stringify(state.dismissedWarningIds)
      );
      await dbInstance!.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('gemini_api_key', ?)",
        state.geminiApiKey || ""
      );
      if (state.appSettings) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('app_settings', ?)",
          JSON.stringify(state.appSettings)
        );
      }
      if (state.schedulePrefs) {
        await dbInstance!.runAsync(
          "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
          "schedule_prefs",
          JSON.stringify(state.schedulePrefs)
        );
      }

      // 13. Insert study blocks
      for (const sb of state.studyBlocks || []) {
        await dbInstance!.runAsync(
          `INSERT OR REPLACE INTO study_blocks (id, task_id, subject_id, date, start_time, end_time, duration_minutes, status, completed_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          sb.id || `sb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sb.taskId || "",
          sb.subjectId || "",
          sb.date || new Date().toISOString().slice(0, 10),
          sb.startTime || "15:00",
          sb.endTime || "15:45",
          sb.durationMinutes || 45,
          sb.status || "SCHEDULED",
          sb.completedAt || null,
          sb.createdAt || new Date().toISOString()
        );
      }

      // 14. Insert grades
      if (state.grades) {
        for (const g of state.grades) {
          await dbInstance!.runAsync(
            `INSERT OR REPLACE INTO grades (id, subject_id, title, score, max_score, weight, category, date, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            g.id || `grade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            g.subjectId || "",
            g.title || "Penilaian",
            g.score != null ? g.score : 0,
            g.maxScore != null ? g.maxScore : 100,
            g.weight != null ? g.weight : 1,
            g.category || "exam",
            g.date || new Date().toISOString().slice(0, 10),
            g.notes || null,
            g.createdAt || new Date().toISOString()
          );
        }
      }

      // 15. Insert teachers
      if (state.teachers) {
        for (const tc of state.teachers) {
          await dbInstance!.runAsync(
            `INSERT OR REPLACE INTO teachers (id, name, subject_ids, phone, email, room, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            tc.id || `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            tc.name || "Guru",
            JSON.stringify(tc.subjectIds || []),
            tc.phone || null,
            tc.email || null,
            tc.room || null,
            tc.notes || null,
            new Date().toISOString()
          );
        }
      }
    });
}

/**
 * Persists full state into SQLite sequentially using a coalescing queue
 * to prevent concurrent transaction conflicts ("cannot commit - no transaction is active").
 */
export async function persistFullStateToSQLite(state: DatabaseState): Promise<void> {
  if (!dbInstance || !isSQLiteReady) return;

  pendingStateToPersist = state;
  if (isPersistingToSQLite) {
    // Another transaction is already in progress; it will pick up the latest pendingStateToPersist upon completion.
    return;
  }

  isPersistingToSQLite = true;
  try {
    while (pendingStateToPersist) {
      const currentState = pendingStateToPersist;
      pendingStateToPersist = null;
      try {
        await _executePersistFullState(currentState);
      } catch (err: any) {
        console.warn("[Storage] SQLite persist warning (will retry on next state update):", err?.message || err);
      }
    }
  } finally {
    isPersistingToSQLite = false;
  }
}

/**
 * Saves current state immediately to both SQLite and AsyncStorage mirror.
 */
export async function saveStateImmediately(state: DatabaseState): Promise<void> {
  AsyncStorage.setItem(ASYNC_STORAGE_FALLBACK_KEY, JSON.stringify(state)).catch(() => {});

  if (isSQLiteReady && dbInstance) {
    await persistFullStateToSQLite(state);
  }
}

/**
 * Creates a JSON backup payload of the entire database.
 */
export function exportBackupJSON(state: DatabaseState): BackupPayload {
  return {
    app: "StudyAir",
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    data: state,
  };
}

/**
 * Validates and restores data from a JSON backup payload with schema migration.
 */
export async function importBackupJSON(jsonString: string): Promise<{ success: boolean; state?: DatabaseState; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    const data: any = parsed.data || parsed;

    if (!Array.isArray(data.subjects)) {
      return { success: false, error: "Invalid backup format: subjects array is missing." };
    }

    // Migrate subjects if imported from legacy format
    const subjects: Subject[] = data.subjects.map((s: any) => {
      const name = s.name || s.title || "Subject";
      const color = s.color || s.color_hex || "#3b82f6";
      const examDate = s.examDate || s.exam_date || undefined;
      return {
        id: s.id,
        name,
        color,
        aliases: Array.isArray(s.aliases) ? s.aliases : [],
        teacher: s.teacher || undefined,
        room: s.room || undefined,
        bringItems: Array.isArray(s.bringItems) ? s.bringItems : [],
        examDate,
        title: name,
        color_hex: color,
        exam_date: examDate || "",
        total_estimated_minutes: s.total_estimated_minutes || 0,
      };
    });

    const cleanState: DatabaseState = {
      subjects,
      periodTimes: Array.isArray(data.periodTimes) && data.periodTimes.length > 0 ? data.periodTimes : DEFAULT_PERIOD_TIMES,
      timetableEntries: Array.isArray(data.timetableEntries) ? data.timetableEntries : [],
      daysOff: Array.isArray(data.daysOff) ? data.daysOff : [],
      overrides: Array.isArray(data.overrides) ? data.overrides : [],
      tasks: Array.isArray(data.tasks)
        ? data.tasks.map((t: any) => ({
            ...t,
            estimatedMinutes: t.estimatedMinutes != null ? Number(t.estimatedMinutes) : 30,
          }))
        : [],
      studyUnits: Array.isArray(data.studyUnits) ? data.studyUnits : [],
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      focusLogs: Array.isArray(data.focusLogs) ? data.focusLogs : [],
      reviewHistory: Array.isArray(data.reviewHistory) ? data.reviewHistory : [],
      dailyStats: Array.isArray(data.dailyStats) ? data.dailyStats : [],
      dismissedWarningIds: Array.isArray(data.dismissedWarningIds) ? data.dismissedWarningIds : [],
      geminiApiKey: data.geminiApiKey || "",
      studyBlocks: Array.isArray(data.studyBlocks) ? data.studyBlocks : [],
      schedulePrefs: data.schedulePrefs || DEFAULT_SCHEDULE_PREFS,
    };

    await saveStateImmediately(cleanState);
    return { success: true, state: cleanState };
  } catch (e: any) {
    return { success: false, error: e?.message || "Failed to parse JSON backup file." };
  }
}

/**
 * Saves all study blocks into SQLite and updates the AsyncStorage mirror.
 */
export async function saveStudyBlocks(blocks: StudyBlock[]): Promise<void> {
  const sqliteAvailable = await initDatabase();
  if (sqliteAvailable && dbInstance) {
    try {
      await dbInstance.withTransactionAsync(async () => {
        await dbInstance!.execAsync("DELETE FROM study_blocks;");
        for (const sb of blocks) {
          await dbInstance!.runAsync(
            `INSERT OR REPLACE INTO study_blocks (id, task_id, subject_id, date, start_time, end_time, duration_minutes, status, completed_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            sb.id || `sb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sb.taskId || "",
            sb.subjectId || "",
            sb.date || new Date().toISOString().slice(0, 10),
            sb.startTime || "15:00",
            sb.endTime || "15:45",
            sb.durationMinutes || 45,
            sb.status || "SCHEDULED",
            sb.completedAt || null,
            sb.createdAt || new Date().toISOString()
          );
        }
      });
    } catch (err) {
      console.warn("[Storage] Error saving study blocks to SQLite:", err);
    }
  }

  // Update AsyncStorage mirror
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_FALLBACK_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      state.studyBlocks = blocks;
      await AsyncStorage.setItem(ASYNC_STORAGE_FALLBACK_KEY, JSON.stringify(state));
    }
  } catch (err) {
    console.warn("[Storage] Error updating AsyncStorage mirror with study blocks:", err);
  }
}

/**
 * Loads all study blocks from SQLite (or AsyncStorage fallback).
 */
export async function getStudyBlocks(): Promise<StudyBlock[]> {
  const sqliteAvailable = await initDatabase();
  if (sqliteAvailable && dbInstance) {
    try {
      const rows = await dbInstance.getAllAsync<any>(
        "SELECT * FROM study_blocks ORDER BY date ASC, start_time ASC"
      );
      return rows.map((r) => ({
        id: r.id,
        taskId: r.task_id,
        subjectId: r.subject_id,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
        durationMinutes: r.duration_minutes != null ? Number(r.duration_minutes) : 30,
        status: r.status || "SCHEDULED",
        completedAt: r.completed_at || undefined,
        createdAt: r.created_at || undefined,
      }));
    } catch (err) {
      console.warn("[Storage] Error reading study blocks from SQLite:", err);
    }
  }

  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_FALLBACK_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      if (Array.isArray(state.studyBlocks)) {
        return state.studyBlocks;
      }
    }
  } catch (err) {
    console.warn("[Storage] Error reading study blocks from AsyncStorage:", err);
  }

  return [];
}

/**
 * Saves schedule preferences into SQLite and updates the AsyncStorage mirror.
 */
export async function saveSchedulePrefs(prefs: SchedulePrefs): Promise<void> {
  const sqliteAvailable = await initDatabase();
  if (sqliteAvailable && dbInstance) {
    try {
      await dbInstance.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
        "schedule_prefs",
        JSON.stringify(prefs)
      );
    } catch (err) {
      console.warn("[Storage] Error saving schedule prefs to SQLite:", err);
    }
  }

  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_FALLBACK_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      state.schedulePrefs = prefs;
      await AsyncStorage.setItem(ASYNC_STORAGE_FALLBACK_KEY, JSON.stringify(state));
    }
  } catch (err) {
    console.warn("[Storage] Error updating AsyncStorage mirror with schedule prefs:", err);
  }
}

/**
 * Loads schedule preferences from SQLite (or AsyncStorage fallback).
 */
export async function getSchedulePrefs(): Promise<SchedulePrefs> {
  const sqliteAvailable = await initDatabase();
  if (sqliteAvailable && dbInstance) {
    try {
      const row = await dbInstance.getFirstAsync<any>(
        "SELECT value FROM app_settings WHERE key = 'schedule_prefs'"
      );
      if (row && row.value) {
        const parsed = JSON.parse(row.value);
        return {
          ...DEFAULT_SCHEDULE_PREFS,
          ...parsed,
          priorityWeights: {
            ...DEFAULT_SCHEDULE_PREFS.priorityWeights,
            ...(parsed.priorityWeights || {}),
          },
        };
      }
    } catch (err) {
      console.warn("[Storage] Error reading schedule prefs from SQLite:", err);
    }
  }

  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_FALLBACK_KEY);
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
    console.warn("[Storage] Error reading schedule prefs from AsyncStorage:", err);
  }

  return DEFAULT_SCHEDULE_PREFS;
}

