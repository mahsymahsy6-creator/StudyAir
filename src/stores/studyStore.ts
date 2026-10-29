import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  mockSubjects,
  mockStudyUnits,
  mockBlocks,
  mockDailyStats,
  mockFocusLogs,
  mockReviewHistory,
  SUBJECT_COLORS,
} from "@/data/mockData";
import type {
  Subject,
  SubjectWithUnits,
  StudyUnit,
  ScheduledBlockWithDetails,
  DailyStudyStats,
  FocusLog,
  ReviewHistory,
  ConfidenceRating,
  CognitiveLoad,
  BlockType,
} from "@/types/database";
import { reschedule } from "@/lib/engine/rescheduler";
import { getNextReviewDate } from "@/lib/engine/spaced-repetition";
import { analyzeCognitiveLoad, type CognitiveLoadWarning } from "@/lib/engine/cognitive-load";
import { setHours, setMinutes, format } from "date-fns";

interface StudyState {
  subjects: Subject[];
  studyUnits: StudyUnit[];
  blocks: ScheduledBlockWithDetails[];
  dailyStats: DailyStudyStats[];
  focusLogs: FocusLog[];
  reviewHistory: ReviewHistory[];
  dismissedWarningIds: string[];

  // Getters
  getSubjectWithUnits: () => (SubjectWithUnits & { units: StudyUnit[] })[];
  getCognitiveWarnings: () => CognitiveLoadWarning[];

  // Actions
  addSubject: (data: { title: string; exam_date: string; color_hex?: string }) => Subject;
  deleteSubject: (id: string) => void;
  addStudyUnit: (data: {
    subject_id: string;
    title: string;
    estimated_minutes: number;
    cognitive_load: CognitiveLoad;
  }) => StudyUnit;
  updateStudyUnit: (id: string, updates: Partial<StudyUnit>) => void;
  toggleStudyUnitCompletion: (id: string) => void;
  deleteStudyUnit: (id: string) => void;
  addBlock: (data: {
    study_unit_id: string;
    start_time: string;
    end_time: string;
    block_type?: BlockType;
  }) => ScheduledBlockWithDetails | null;
  deleteBlock: (blockId: string) => void;
  moveBlock: (blockId: string, slotId: string) => boolean;
  rescheduleAll: (dailyMaxMinutes?: number) => {
    count: number;
    warnings: string[];
    overflowCount: number;
  };
  completeBlockSession: (
    blockId: string,
    actualMinutes: number,
    rating: ConfidenceRating
  ) => void;
  dismissWarning: (warningId: string) => void;
  importSyllabus: (data: { subjects: Subject[]; studyUnits: StudyUnit[] }) => void;
  resetSchedules: () => void;
  clearSchedules: () => void;
  resetAll: () => void;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      subjects: mockSubjects,
      studyUnits: mockStudyUnits,
      blocks: mockBlocks,
      dailyStats: mockDailyStats,
      focusLogs: mockFocusLogs,
  reviewHistory: mockReviewHistory,
  dismissedWarningIds: [],

  getSubjectWithUnits: () => {
    const { subjects, studyUnits } = get();
    return subjects.map((subj) => {
      const units = studyUnits.filter((u) => u.subject_id === subj.id);
      const completed_count = units.filter((u) => u.is_completed).length;
      return {
        ...subj,
        units,
        study_units: units,
        completed_count,
        total_count: units.length,
      };
    });
  },

  getCognitiveWarnings: () => {
    const { blocks, dismissedWarningIds } = get();
    const all = analyzeCognitiveLoad(blocks);
    return all.filter((w) => !dismissedWarningIds.includes(w.id));
  },

  addSubject: (data) => {
    const { subjects } = get();
    const color =
      data.color_hex ||
      SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length];
    const newSubject: Subject = {
      id: `subj-${Date.now()}`,
      user_id: "user-1",
      title: data.title,
      exam_date: data.exam_date,
      color_hex: color,
      total_estimated_minutes: 0,
      created_at: new Date().toISOString(),
    };

    set({ subjects: [...subjects, newSubject] });
    return newSubject;
  },

  deleteSubject: (id) => {
    const { subjects, studyUnits, blocks } = get();
    const affectedUnitIds = new Set(
      studyUnits.filter((u) => u.subject_id === id).map((u) => u.id)
    );
    set({
      subjects: subjects.filter((s) => s.id !== id),
      studyUnits: studyUnits.filter((u) => u.subject_id !== id),
      blocks: blocks.filter((b) => !affectedUnitIds.has(b.study_unit_id)),
    });
  },

  addStudyUnit: (data) => {
    const { studyUnits, subjects } = get();
    const existing = studyUnits.filter((u) => u.subject_id === data.subject_id);
    const newUnit: StudyUnit = {
      id: `su-${Date.now()}`,
      subject_id: data.subject_id,
      title: data.title,
      estimated_minutes: data.estimated_minutes,
      cognitive_load: data.cognitive_load,
      sort_order: existing.length + 1,
      is_completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
    };

    // Update subject estimated minutes
    const updatedSubjects = subjects.map((s) =>
      s.id === data.subject_id
        ? {
            ...s,
            total_estimated_minutes:
              s.total_estimated_minutes + data.estimated_minutes,
          }
        : s
    );

    set({
      studyUnits: [...studyUnits, newUnit],
      subjects: updatedSubjects,
    });
    return newUnit;
  },

  updateStudyUnit: (id, updates) => {
    const { studyUnits, blocks } = get();
    const updatedUnits = studyUnits.map((u) =>
      u.id === id ? { ...u, ...updates } : u
    );
    const updatedBlocks = blocks.map((b) =>
      b.study_unit_id === id
        ? {
            ...b,
            study_unit: { ...b.study_unit, ...updates },
          }
        : b
    );
    set({ studyUnits: updatedUnits, blocks: updatedBlocks });
  },

  toggleStudyUnitCompletion: (id) => {
    const { studyUnits, blocks } = get();
    const target = studyUnits.find((u) => u.id === id);
    if (!target) return;
    const nextCompleted = !target.is_completed;

    const updatedUnits = studyUnits.map((u) =>
      u.id === id
        ? {
            ...u,
            is_completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
          }
        : u
    );

    // If marked completed, mark any scheduled blocks for this unit completed
    const updatedBlocks = blocks.map((b) =>
      b.study_unit_id === id
        ? {
            ...b,
            status: nextCompleted ? ("COMPLETED" as const) : b.status,
            study_unit: {
              ...b.study_unit,
              is_completed: nextCompleted,
            },
          }
        : b
    );

    set({ studyUnits: updatedUnits, blocks: updatedBlocks });
  },

  deleteStudyUnit: (id) => {
    const { studyUnits, blocks } = get();
    set({
      studyUnits: studyUnits.filter((u) => u.id !== id),
      blocks: blocks.filter((b) => b.study_unit_id !== id),
    });
  },

  addBlock: (data) => {
    const { blocks, studyUnits, subjects } = get();
    const unit = studyUnits.find((u) => u.id === data.study_unit_id);
    if (!unit) return null;
    const subject = subjects.find((s) => s.id === unit.subject_id);
    if (!subject) return null;

    const newBlock: ScheduledBlockWithDetails = {
      id: `blk-${Date.now()}`,
      user_id: "user-1",
      study_unit_id: data.study_unit_id,
      start_time: data.start_time,
      end_time: data.end_time,
      status: "SCHEDULED",
      block_type: data.block_type || "STUDY",
      created_at: new Date().toISOString(),
      study_unit: unit,
      subject,
    };

    set({ blocks: [...blocks, newBlock] });
    return newBlock;
  },

  deleteBlock: (blockId) => {
    const { blocks } = get();
    set({ blocks: blocks.filter((b) => b.id !== blockId) });
  },

  moveBlock: (blockId, slotId) => {
    // slotId format: YYYY-MM-DD-H or YYYY-MM-DD-HH
    const parts = slotId.split("-");
    if (parts.length < 4) return false;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    const hour = parseInt(parts[3]);

    const { blocks } = get();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return false;

    const durationMin =
      (new Date(block.end_time).getTime() -
        new Date(block.start_time).getTime()) /
      60000;

    const targetDate = new Date(year, month, day);
    const newStart = setMinutes(setHours(targetDate, hour), 0);
    const newEnd = new Date(newStart.getTime() + durationMin * 60000);

    const updatedBlocks = blocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
          }
        : b
    );

    set({ blocks: updatedBlocks });
    return true;
  },

  rescheduleAll: (dailyMaxMinutes = 240) => {
    const { subjects, studyUnits, blocks } = get();

    // Identify study units that are either:
    // 1. Not completed and have NO future SCHEDULED block
    // 2. Have a block with status === "MISSED"
    const scheduledUnitIds = new Set(
      blocks
        .filter((b) => b.status === "SCHEDULED")
        .map((b) => b.study_unit_id)
    );

    const unitsToSchedule = studyUnits.filter(
      (u) => !u.is_completed && !scheduledUnitIds.has(u.id)
    );

    if (unitsToSchedule.length === 0) {
      return {
        count: 0,
        warnings: ["All active study units already have scheduled slots."],
        overflowCount: 0,
      };
    }

    const result = reschedule({
      userId: "user-1",
      unitsToSchedule,
      subjects,
      existingBlocks: blocks,
      dailyMaxStudyMinutes: dailyMaxMinutes,
      studyStartHour: 8,
      studyEndHour: 22,
    });

    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const unitMap = new Map(studyUnits.map((u) => [u.id, u]));

    const newBlocksWithDetails: ScheduledBlockWithDetails[] =
      result.newBlocks.map((b, idx) => {
        const u = unitMap.get(b.study_unit_id)!;
        const subj = subjectMap.get(u.subject_id)!;
        return {
          ...b,
          id: `rescheduled-${Date.now()}-${idx}`,
          created_at: new Date().toISOString(),
          study_unit: u,
          subject: subj,
        };
      });

    set({
      blocks: [...blocks, ...newBlocksWithDetails],
    });

    return {
      count: newBlocksWithDetails.length,
      warnings: result.warnings,
      overflowCount: result.overflowUnits.length,
    };
  },

  completeBlockSession: (blockId, actualMinutes, rating) => {
    const { blocks, studyUnits, focusLogs, reviewHistory } = get();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // 1. Mark block as completed
    const updatedBlocks = blocks.map((b) =>
      b.id === blockId
        ? {
            ...b,
            status: "COMPLETED" as const,
          }
        : b
    );

    // 2. Mark unit as completed if not already
    const updatedUnits = studyUnits.map((u) =>
      u.id === block.study_unit_id
        ? {
            ...u,
            is_completed: true,
            completed_at: new Date().toISOString(),
          }
        : u
    );

    // 3. Create Focus Log
    const newFocusLog: FocusLog = {
      id: `fl-${Date.now()}`,
      scheduled_block_id: blockId,
      user_id: "user-1",
      planned_minutes: Math.round(
        (new Date(block.end_time).getTime() -
          new Date(block.start_time).getTime()) /
          60000
      ),
      actual_minutes: actualMinutes,
      timer_mode: "POMODORO",
      pomodoro_count: Math.ceil(actualMinutes / 25),
      started_at: block.start_time,
      ended_at: new Date().toISOString(),
    };

    // 4. Calculate Spaced Repetition Next Review Date (SM-2)
    const priorReviews = reviewHistory.filter(
      (r) => r.study_unit_id === block.study_unit_id
    );
    const repetition = priorReviews.length;
    const nextReview = getNextReviewDate(new Date(), repetition, rating);
    const intervalDays = Math.max(
      1,
      Math.round(
        (nextReview.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const newReviewEntry: ReviewHistory = {
      id: `rh-${Date.now()}`,
      study_unit_id: block.study_unit_id,
      user_id: "user-1",
      confidence_rating: rating,
      review_date: format(new Date(), "yyyy-MM-dd"),
      next_review_date: format(nextReview, "yyyy-MM-dd"),
      interval_days: intervalDays,
      repetition_number: repetition + 1,
      created_at: new Date().toISOString(),
    };

    // 5. Schedule a REVIEW block on that target date (set at 10:00 AM for 30 mins)
    const reviewStart = setMinutes(setHours(nextReview, 10), 0);
    const reviewEnd = setMinutes(setHours(nextReview, 10), 30);

    const newReviewBlock: ScheduledBlockWithDetails = {
      id: `review-${Date.now()}`,
      user_id: "user-1",
      study_unit_id: block.study_unit_id,
      start_time: reviewStart.toISOString(),
      end_time: reviewEnd.toISOString(),
      status: "SCHEDULED",
      block_type: "REVIEW",
      created_at: new Date().toISOString(),
      study_unit: block.study_unit,
      subject: block.subject,
    };

    set({
      blocks: [...updatedBlocks, newReviewBlock],
      studyUnits: updatedUnits,
      focusLogs: [...focusLogs, newFocusLog],
      reviewHistory: [...reviewHistory, newReviewEntry],
    });
  },

  dismissWarning: (warningId) => {
    const { dismissedWarningIds } = get();
    set({ dismissedWarningIds: [...dismissedWarningIds, warningId] });
  },

  importSyllabus: (data) => {
    const { subjects, studyUnits } = get();
    const existingSubjectIds = new Set(subjects.map((s) => s.id));
    const newSubjects = [...subjects];
    data.subjects.forEach((subj) => {
      if (!existingSubjectIds.has(subj.id)) {
        newSubjects.push(subj);
        existingSubjectIds.add(subj.id);
      }
    });

    const existingUnitIds = new Set(studyUnits.map((u) => u.id));
    const newUnits = [...studyUnits];
    data.studyUnits.forEach((unit) => {
      if (!existingUnitIds.has(unit.id)) {
        newUnits.push(unit);
        existingUnitIds.add(unit.id);
      }
    });

    set({ subjects: newSubjects, studyUnits: newUnits });
  },

  resetSchedules: () => {
    set({
      blocks: mockBlocks,
      dismissedWarningIds: [],
    });
  },

  clearSchedules: () => {
    set({
      blocks: [],
      dismissedWarningIds: [],
    });
  },

  resetAll: () => {
    set({
      subjects: mockSubjects,
      studyUnits: mockStudyUnits,
      blocks: mockBlocks,
      dailyStats: mockDailyStats,
      focusLogs: mockFocusLogs,
      reviewHistory: mockReviewHistory,
      dismissedWarningIds: [],
    });
  },
}),
    {
      name: "studyair-study-storage",
    }
  )
);
