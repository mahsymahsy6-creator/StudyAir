/* ─────────────────────────────────────────────────────
 *  StudyAir — Database Type Definitions
 *  Maps directly to the Supabase PostgreSQL schema.
 * ───────────────────────────────────────────────────── */

export type CognitiveLoad = "HIGH" | "MEDIUM" | "LOW";

export type BlockStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "MISSED"
  | "RESCHEDULED";

export type BlockType = "STUDY" | "REVIEW";

export type TimerMode = "POMODORO" | "FLOWMODORO";

export type ConfidenceRating = 1 | 2 | 3 | 4;

/* ─── Row Types ─── */

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  daily_max_study_minutes: number;
  preferences: UserPreferences;
  created_at: string;
}

export interface UserPreferences {
  default_timer_mode: TimerMode;
  pomodoro_length_minutes: number;
  break_length_minutes: number;
  timezone: string;
  study_start_hour: number;
  study_end_hour: number;
}

export interface Subject {
  id: string;
  user_id: string;
  title: string;
  color_hex: string;
  exam_date: string;
  total_estimated_minutes: number;
  created_at: string;
}

export interface StudyUnit {
  id: string;
  subject_id: string;
  title: string;
  estimated_minutes: number;
  cognitive_load: CognitiveLoad;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface ScheduledBlock {
  id: string;
  user_id: string;
  study_unit_id: string;
  start_time: string;
  end_time: string;
  status: BlockStatus;
  block_type: BlockType;
  created_at: string;
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

/* ─── Joined / Enriched types for the UI ─── */

export interface ScheduledBlockWithDetails extends ScheduledBlock {
  study_unit: StudyUnit;
  subject: Subject;
}

export interface SubjectWithUnits extends Subject {
  study_units: StudyUnit[];
  completed_count: number;
  total_count: number;
}

export interface DailyStudyStats {
  date: string;
  planned_minutes: number;
  actual_minutes: number;
}

export interface SubjectMastery {
  subject: Subject;
  total_units: number;
  completed_units: number;
  avg_confidence: number;
  mastery_pct: number;
  days_until_exam: number;
}
