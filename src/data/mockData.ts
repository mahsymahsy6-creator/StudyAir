import type {
  Subject,
  StudyUnit,
  ScheduledBlockWithDetails,
  FocusLog,
  ReviewHistory,
  CognitiveLoad,
  BlockStatus,
  BlockType,
  DailyStudyStats,
} from "@/types/database";
import {
  addDays,
  subDays,
  setHours,
  setMinutes,
  format,
} from "date-fns";

/* ─── Subjects ─── */

export const SUBJECT_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

const today = new Date();

export const mockSubjects: Subject[] = [
  {
    id: "subj-1",
    user_id: "user-1",
    title: "Linear Algebra",
    color_hex: "#3b82f6",
    exam_date: format(addDays(today, 14), "yyyy-MM-dd"),
    total_estimated_minutes: 720,
    created_at: subDays(today, 30).toISOString(),
  },
  {
    id: "subj-2",
    user_id: "user-1",
    title: "Organic Chemistry",
    color_hex: "#8b5cf6",
    exam_date: format(addDays(today, 21), "yyyy-MM-dd"),
    total_estimated_minutes: 960,
    created_at: subDays(today, 28).toISOString(),
  },
  {
    id: "subj-3",
    user_id: "user-1",
    title: "Data Structures",
    color_hex: "#10b981",
    exam_date: format(addDays(today, 10), "yyyy-MM-dd"),
    total_estimated_minutes: 540,
    created_at: subDays(today, 25).toISOString(),
  },
];

/* ─── Study Units ─── */

function unit(
  id: string,
  subjectId: string,
  title: string,
  minutes: number,
  load: CognitiveLoad,
  order: number,
  completed = false
): StudyUnit {
  return {
    id,
    subject_id: subjectId,
    title,
    estimated_minutes: minutes,
    cognitive_load: load,
    sort_order: order,
    is_completed: completed,
    completed_at: completed ? subDays(today, 2).toISOString() : null,
    created_at: subDays(today, 20).toISOString(),
  };
}

export const mockStudyUnits: StudyUnit[] = [
  // Linear Algebra
  unit("su-1", "subj-1", "Matrix Operations", 60, "MEDIUM", 1, true),
  unit("su-2", "subj-1", "Eigenvalues & Eigenvectors", 90, "HIGH", 2),
  unit("su-3", "subj-1", "Vector Spaces", 60, "MEDIUM", 3),
  unit("su-4", "subj-1", "Linear Transformations", 75, "HIGH", 4),
  unit("su-5", "subj-1", "Determinants", 45, "LOW", 5, true),

  // Organic Chemistry
  unit("su-6", "subj-2", "Nomenclature", 45, "LOW", 1, true),
  unit("su-7", "subj-2", "Stereochemistry", 90, "HIGH", 2),
  unit("su-8", "subj-2", "Substitution Reactions", 75, "HIGH", 3),
  unit("su-9", "subj-2", "Elimination Reactions", 60, "MEDIUM", 4),
  unit("su-10", "subj-2", "Spectroscopy", 60, "MEDIUM", 5),

  // Data Structures
  unit("su-11", "subj-3", "Arrays & Linked Lists", 45, "LOW", 1, true),
  unit("su-12", "subj-3", "Trees & BST", 60, "MEDIUM", 2),
  unit("su-13", "subj-3", "Graphs & BFS/DFS", 90, "HIGH", 3),
  unit("su-14", "subj-3", "Dynamic Programming", 90, "HIGH", 4),
  unit("su-15", "subj-3", "Hash Tables", 30, "LOW", 5, true),
];

/* ─── Scheduled Blocks ─── */

function block(
  id: string,
  unitId: string,
  dayOffset: number,
  startHour: number,
  durationMin: number,
  status: BlockStatus = "SCHEDULED",
  blockType: BlockType = "STUDY"
): ScheduledBlockWithDetails {
  const start = setMinutes(
    setHours(addDays(today, dayOffset), startHour),
    0
  );
  const end = new Date(start.getTime() + durationMin * 60000);

  const studyUnit = mockStudyUnits.find((u) => u.id === unitId)!;
  const subject = mockSubjects.find((s) => s.id === studyUnit.subject_id)!;

  return {
    id,
    user_id: "user-1",
    study_unit_id: unitId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status,
    block_type: blockType,
    created_at: subDays(today, 5).toISOString(),
    study_unit: studyUnit,
    subject,
  };
}

export const mockBlocks: ScheduledBlockWithDetails[] = [
  // Today
  block("blk-1", "su-2", 0, 9, 90),
  block("blk-2", "su-12", 0, 11, 60),
  block("blk-3", "su-7", 0, 14, 90),
  block("blk-4", "su-1", 0, 16, 30, "COMPLETED", "REVIEW"),

  // Tomorrow
  block("blk-5", "su-3", 1, 9, 60),
  block("blk-6", "su-8", 1, 10, 75),
  block("blk-7", "su-13", 1, 14, 90),

  // Day after
  block("blk-8", "su-4", 2, 9, 75),
  block("blk-9", "su-9", 2, 11, 60),
  block("blk-10", "su-14", 2, 14, 90),

  // Day 3
  block("blk-11", "su-10", 3, 10, 60),
  block("blk-12", "su-2", 3, 14, 60, "SCHEDULED", "REVIEW"),

  // Yesterday (some completed, some missed)
  block("blk-13", "su-6", -1, 9, 45, "COMPLETED"),
  block("blk-14", "su-11", -1, 10, 45, "COMPLETED"),
  block("blk-15", "su-5", -1, 14, 45, "MISSED"),
];

/* ─── Daily Study Stats (past 14 days) ─── */

export const mockDailyStats: DailyStudyStats[] = Array.from(
  { length: 14 },
  (_, i) => {
    const date = format(subDays(today, 13 - i), "yyyy-MM-dd");
    const planned = 120 + Math.floor(Math.random() * 120);
    const actual = Math.max(
      0,
      planned - 30 + Math.floor(Math.random() * 60)
    );
    return { date, planned_minutes: planned, actual_minutes: actual };
  }
);

/* ─── Heatmap Data (past 84 days / 12 weeks) ─── */

export const mockHeatmapData: { date: string; minutes: number }[] =
  Array.from({ length: 84 }, (_, i) => ({
    date: format(subDays(today, 83 - i), "yyyy-MM-dd"),
    minutes: Math.random() > 0.2 ? Math.floor(Math.random() * 240) : 0,
  }));

/* ─── Focus Logs ─── */

export const mockFocusLogs: FocusLog[] = [
  {
    id: "fl-1",
    scheduled_block_id: "blk-13",
    user_id: "user-1",
    planned_minutes: 45,
    actual_minutes: 42,
    timer_mode: "POMODORO",
    pomodoro_count: 2,
    started_at: subDays(today, 1).toISOString(),
    ended_at: subDays(today, 1).toISOString(),
  },
  {
    id: "fl-2",
    scheduled_block_id: "blk-14",
    user_id: "user-1",
    planned_minutes: 45,
    actual_minutes: 50,
    timer_mode: "FLOWMODORO",
    pomodoro_count: 0,
    started_at: subDays(today, 1).toISOString(),
    ended_at: subDays(today, 1).toISOString(),
  },
];

/* ─── Review History ─── */

export const mockReviewHistory: ReviewHistory[] = [
  {
    id: "rh-1",
    study_unit_id: "su-1",
    user_id: "user-1",
    confidence_rating: 3,
    review_date: format(subDays(today, 3), "yyyy-MM-dd"),
    next_review_date: format(addDays(today, 4), "yyyy-MM-dd"),
    interval_days: 7,
    repetition_number: 1,
    created_at: subDays(today, 3).toISOString(),
  },
  {
    id: "rh-2",
    study_unit_id: "su-5",
    user_id: "user-1",
    confidence_rating: 4,
    review_date: format(subDays(today, 1), "yyyy-MM-dd"),
    next_review_date: format(addDays(today, 13), "yyyy-MM-dd"),
    interval_days: 14,
    repetition_number: 2,
    created_at: subDays(today, 1).toISOString(),
  },
];
