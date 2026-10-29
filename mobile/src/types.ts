/**
 * StudyAir Mobile Data Types
 * Unified Subject, Timetable, Task, and Persistence Schema
 */

export type CognitiveLoad = "LOW" | "MEDIUM" | "HIGH";
export type BlockType = "STUDY" | "REVIEW" | "EXAM_PREP";
export type BlockStatus = "SCHEDULED" | "COMPLETED" | "MISSED" | "IN_PROGRESS" | "RESCHEDULED";
export type ConfidenceRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
export type TimerMode = "POMODORO" | "FLOWMODORO";

// ─── 1. Unified Subject Model ───
export interface Subject {
  id: string;
  name: string;
  color: string;
  aliases: string[];
  teacher?: string;
  room?: string;
  bringItems: string[];
  examDate?: string; // YYYY-MM-DD

  // Backward compatibility fields for legacy views
  title: string;
  color_hex: string;
  exam_date: string;
  total_estimated_minutes?: number;
}

export interface ExamEvent {
  id?: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  description?: string;
}

// ─── 2. School Timetable & Period Time Models ───
export interface PeriodTime {
  periodNumber: number; // e.g. 1, 2, 3 ...
  start: string; // HH:mm (e.g. "07:15")
  end: string; // HH:mm (e.g. "08:00")
  weekday?: number | null; // Optional: 1=Senin ... 5=Jumat (null or undefined = default)
}

export type WeekPattern = "every" | "A" | "B";
export type TimetableEntryKind = "class" | "break" | "event";

export interface TimetableEntry {
  id: string;
  subjectId: string;
  weekday: number; // 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
  periodNumber: number;
  weekPattern: WeekPattern;
  kind?: TimetableEntryKind; // "class" (default) | "break" | "event"
  customLabel?: string;      // e.g. "Istirahat", "Upacara", "Sholat Dzuhur"
  startTime?: string;        // "HH:mm" e.g. "09:15"
  endTime?: string;          // "HH:mm" e.g. "09:45"
  room?: string;
  teacher?: string;
}

// ─── 3. Days Off & Calendar Overrides ───
export interface DayOff {
  date: string; // YYYY-MM-DD
  reason: string;
}

export type OverrideType = "cancelled" | "swapped" | "added";

export interface Override {
  date: string; // YYYY-MM-DD
  entryId: string; // TimetableEntry id (or custom ID for 'added')
  type: OverrideType;
  newSubjectId?: string; // Target subject ID if swapped or added
  periodNumber?: number; // Target period number if added or swapped
  customLabel?: string; // Optional custom label or note
}

// ─── 4. Task Management Model ───
export type TaskType = "homework" | "quiz" | "project";
export type DeadlineMode = "nextClass" | "afterNClasses" | "custom";
export type TaskStatus = "PENDING" | "COMPLETED";

export interface Task {
  id: string;
  subjectId: string;
  title: string;
  notes?: string;
  type: TaskType;
  givenDate: string; // YYYY-MM-DD
  deadlineDate: string; // YYYY-MM-DD
  deadlineMode: DeadlineMode;
  estimatedMinutes?: number; // v2: duration estimate in minutes (default 30)
  status: TaskStatus;
  completedAt?: string; // ISO
  createdAt?: string; // ISO
  photoUri?: string;
}

// ─── 4b. v2 Scheduling Models ───
export type StudyBlockStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "MISSED" | "SKIPPED";

export interface StudyBlock {
  id: string;
  taskId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  status: StudyBlockStatus;
  completedAt?: string; // ISO timestamp
  createdAt?: string; // ISO timestamp
}

export type BusyBlockSource = "timetable" | "custom" | "calendar";

export interface BusyBlock {
  id: string;
  source: BusyBlockSource;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface SchedulePrefs {
  studyWindowStart: string; // "HH:mm", default "15:00"
  studyWindowEnd: string;   // "HH:mm", default "21:00"
  maxBlockMinutes: number;  // default 45
  minBreakMinutes: number;  // default 15
  daysOff: string[];        // days without study blocks (e.g. ["Sunday"] or "YYYY-MM-DD")
  priorityWeights: {
    urgentFirst: boolean;   // prioritize closer deadline
    hardFirst: boolean;     // prioritize high cognitive load / hard subjects
  };
}

export const DEFAULT_SCHEDULE_PREFS: SchedulePrefs = {
  studyWindowStart: "15:00",
  studyWindowEnd: "21:00",
  maxBlockMinutes: 45,
  minBreakMinutes: 15,
  daysOff: [],
  priorityWeights: {
    urgentFirst: true,
    hardFirst: false,
  },
};

// ─── 5. Study Units & Focus Blocks (Internal Focus Engine) ───
export interface StudyUnit {
  id: string;
  subject_id: string;
  title: string;
  estimated_minutes: number;
  cognitive_load: CognitiveLoad;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface ScheduledBlock {
  id: string;
  study_unit_id: string;
  start_time: string; // ISO
  end_time: string; // ISO
  block_type: BlockType;
  status: BlockStatus;
  actual_duration_minutes: number | null;
}

export interface ScheduledBlockWithDetails extends ScheduledBlock {
  study_unit: StudyUnit;
  subject: Subject;
}

export interface FocusLog {
  id: string;
  scheduled_block_id: string;
  user_id: string;
  planned_minutes: number;
  actual_minutes: number;
  timer_mode: TimerMode;
  pomodoro_count: number;
  started_at: string;
  ended_at: string | null;
}

export interface ReviewHistory {
  id: string;
  study_unit_id: string;
  user_id: string;
  confidence_rating: ConfidenceRating;
  review_date: string;
  next_review_date: string;
  interval_days: number;
  repetition_number: number;
  created_at: string;
}

export interface DailyStudyStats {
  date: string;
  planned_minutes: number;
  actual_minutes: number;
}

export interface CognitiveLoadWarning {
  id: string;
  date: string;
  formattedDate: string;
  type: "CONSECUTIVE_HIGH" | "DAILY_OVERLOAD";
  blockTitles: string[];
  message: string;
  recommendation: string;
}

// ─── 7. Application & Notification Settings ───
export type AppTheme =
  | "navy"
  | "emerald"
  | "amethyst"
  | "sunset"
  | "sakura"
  | "high_contrast"
  | "daylight";

export interface AppSettings {
  theme: AppTheme;
  language: "en" | "id";
  notificationsEnabled: boolean;
  eveningReminderEnabled: boolean;
  eveningReminderTime: string; // e.g. "20:00"
  morningAlertEnabled: boolean;
  morningAlertTime: string; // e.g. "06:30"
  aiMode: "secure_store" | "proxy";
  proxyUrl?: string;
  proxyToken?: string;
  dailyScanQuota: number;
  scansUsedToday: number;
  lastScanDate: string; // YYYY-MM-DD
  hasCompletedOnboarding: boolean;
  streakCountEveryDay?: boolean;
  streakMinFocusMinutes?: number;
  bestStreak?: number;
  lastCelebratedMilestone?: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "navy",
  language: "id",
  notificationsEnabled: false,
  eveningReminderEnabled: true,
  eveningReminderTime: "20:00",
  morningAlertEnabled: true,
  morningAlertTime: "06:30",
  aiMode: "secure_store",
  dailyScanQuota: 20,
  scansUsedToday: 0,
  lastScanDate: "",
  hasCompletedOnboarding: false,
  streakCountEveryDay: false,
  streakMinFocusMinutes: 15,
  bestStreak: 0,
  lastCelebratedMilestone: 0,
};

// ─── 8. Persistence State ───
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
}

