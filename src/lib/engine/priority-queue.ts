import type { StudyUnit, Subject } from "@/types/database";

export interface PrioritizedUnit {
  unit: StudyUnit;
  subject: Subject;
  urgencyScore: number;
}

/**
 * Sort study units by urgency:
 *   1. Closest exam date first
 *   2. Highest cognitive load first (tiebreaker)
 *   3. Sort order within subject (tiebreaker)
 */
export function prioritizeUnits(
  units: StudyUnit[],
  subjectMap: Map<string, Subject>
): PrioritizedUnit[] {
  const now = Date.now();

  return units
    .filter((u) => !u.is_completed)
    .map((unit) => {
      const subject = subjectMap.get(unit.subject_id);
      if (!subject) {
        return null;
      }

      const daysUntilExam = Math.max(
        1,
        (new Date(subject.exam_date).getTime() - now) / (1000 * 60 * 60 * 24)
      );

      const cognitiveWeight =
        unit.cognitive_load === "HIGH"
          ? 3
          : unit.cognitive_load === "MEDIUM"
            ? 2
            : 1;

      // Higher score = more urgent
      const urgencyScore = (cognitiveWeight * 10) / daysUntilExam;

      return { unit, subject, urgencyScore };
    })
    .filter((item): item is PrioritizedUnit => item !== null)
    .sort((a, b) => b.urgencyScore - a.urgencyScore);
}
