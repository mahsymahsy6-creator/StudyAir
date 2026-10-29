import type {
  ScheduledBlock,
  StudyUnit,
  Subject,
  BlockType,
} from "@/types/database";
import { findOpenSlots, fitIntoSlot } from "./slot-finder";
import { prioritizeUnits } from "./priority-queue";

export interface RescheduleResult {
  newBlocks: Omit<ScheduledBlock, "id" | "created_at">[];
  overflowUnits: StudyUnit[];
  warnings: string[];
}

/**
 * Auto-rescheduler: redistributes unscheduled/missed study units
 * into open time windows between now and each subject's exam date.
 *
 * Pure function — does not perform any DB writes.
 */
export function reschedule(params: {
  userId: string;
  unitsToSchedule: StudyUnit[];
  subjects: Subject[];
  existingBlocks: ScheduledBlock[];
  dailyMaxStudyMinutes: number;
  studyStartHour?: number;
  studyEndHour?: number;
  blockType?: BlockType;
}): RescheduleResult {
  const {
    userId,
    unitsToSchedule,
    subjects,
    existingBlocks,
    dailyMaxStudyMinutes,
    studyStartHour = 8,
    studyEndHour = 22,
    blockType = "STUDY",
  } = params;

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const prioritized = prioritizeUnits(unitsToSchedule, subjectMap);

  const newBlocks: Omit<ScheduledBlock, "id" | "created_at">[] = [];
  const overflowUnits: StudyUnit[] = [];
  const warnings: string[] = [];

  // Track blocks per day (existing + newly created)
  const blocksByDay = new Map<string, ScheduledBlock[]>();

  for (const block of existingBlocks) {
    const dayKey = new Date(block.start_time).toISOString().split("T")[0];
    if (!blocksByDay.has(dayKey)) blocksByDay.set(dayKey, []);
    blocksByDay.get(dayKey)!.push(block);
  }

  for (const { unit, subject } of prioritized) {
    const examDate = new Date(subject.exam_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from tomorrow
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + 1);

    let scheduled = false;

    // Iterate days from tomorrow to exam date
    const cursor = new Date(startDate);
    while (cursor <= examDate) {
      const dayKey = cursor.toISOString().split("T")[0];
      const dayBlocks = blocksByDay.get(dayKey) ?? [];

      // Check daily capacity
      const usedMinutes = dayBlocks.reduce((sum, b) => {
        const dur =
          (new Date(b.end_time).getTime() -
            new Date(b.start_time).getTime()) /
          60000;
        return sum + dur;
      }, 0);

      const remainingCapacity = dailyMaxStudyMinutes - usedMinutes;

      if (remainingCapacity >= unit.estimated_minutes) {
        const slots = findOpenSlots(
          cursor,
          dayBlocks,
          studyStartHour,
          studyEndHour
        );
        const fit = fitIntoSlot(slots, unit.estimated_minutes);

        if (fit) {
          const newBlock: Omit<ScheduledBlock, "id" | "created_at"> = {
            user_id: userId,
            study_unit_id: unit.id,
            start_time: fit.start.toISOString(),
            end_time: fit.end.toISOString(),
            status: "SCHEDULED",
            block_type: blockType,
          };

          newBlocks.push(newBlock);

          // Track this block for future days
          const fakeBlock = {
            ...newBlock,
            id: `pending-${unit.id}`,
            created_at: new Date().toISOString(),
          } as ScheduledBlock;

          if (!blocksByDay.has(dayKey)) blocksByDay.set(dayKey, []);
          blocksByDay.get(dayKey)!.push(fakeBlock);

          scheduled = true;
          break;
        }
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (!scheduled) {
      overflowUnits.push(unit);
      warnings.push(
        `"${unit.title}" (${subject.title}) could not be scheduled before the exam date ${subject.exam_date}.`
      );
    }
  }

  return { newBlocks, overflowUnits, warnings };
}
