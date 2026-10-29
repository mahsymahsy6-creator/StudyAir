import type { ScheduledBlockWithDetails } from "@/types/database";
import { format, differenceInMinutes } from "date-fns";

export interface CognitiveLoadWarning {
  id: string;
  date: string;
  formattedDate: string;
  type: "CONSECUTIVE_HIGH" | "DAILY_OVERLOAD";
  blockTitles: string[];
  message: string;
  recommendation: string;
}

/**
 * Analyzes scheduled blocks to detect:
 * 1. Consecutive High-Cognitive-Load blocks (two or more high-load sessions with <= 20min break)
 * 2. High-Cognitive-Load fatigue overload (> 65% of day's study time in High load)
 */
export function analyzeCognitiveLoad(
  blocks: ScheduledBlockWithDetails[]
): CognitiveLoadWarning[] {
  const warnings: CognitiveLoadWarning[] = [];

  // Group blocks by date (YYYY-MM-DD)
  const blocksByDate = new Map<string, ScheduledBlockWithDetails[]>();

  for (const block of blocks) {
    if (block.status === "MISSED") continue;
    const dateKey = format(new Date(block.start_time), "yyyy-MM-dd");
    if (!blocksByDate.has(dateKey)) {
      blocksByDate.set(dateKey, []);
    }
    blocksByDate.get(dateKey)!.push(block);
  }

  for (const [dateKey, dayBlocks] of blocksByDate.entries()) {
    // Sort chronologically
    const sorted = [...dayBlocks].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const formattedDate = format(new Date(sorted[0].start_time), "EEE, MMM d");

    // 1. Check for consecutive HIGH cognitive load blocks
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (
        current.study_unit.cognitive_load === "HIGH" &&
        next.study_unit.cognitive_load === "HIGH"
      ) {
        const gap = differenceInMinutes(
          new Date(next.start_time),
          new Date(current.end_time)
        );

        if (gap <= 20) {
          warnings.push({
            id: `consecutive-${current.id}-${next.id}`,
            date: dateKey,
            formattedDate,
            type: "CONSECUTIVE_HIGH",
            blockTitles: [current.study_unit.title, next.study_unit.title],
            message: `Consecutive High Cognitive Load blocks scheduled back-to-back: "${current.study_unit.title}" and "${next.study_unit.title}".`,
            recommendation:
              "Insert a 20-30 min break or reschedule a Low-load review block between them to avoid cognitive fatigue.",
          });
        }
      }
    }

    // 2. Check for daily HIGH overload percentage
    let totalMinutes = 0;
    let highMinutes = 0;

    for (const b of sorted) {
      const duration = differenceInMinutes(
        new Date(b.end_time),
        new Date(b.start_time)
      );
      totalMinutes += duration;
      if (b.study_unit.cognitive_load === "HIGH") {
        highMinutes += duration;
      }
    }

    if (totalMinutes >= 120 && highMinutes / totalMinutes > 0.65) {
      warnings.push({
        id: `overload-${dateKey}`,
        date: dateKey,
        formattedDate,
        type: "DAILY_OVERLOAD",
        blockTitles: sorted
          .filter((b) => b.study_unit.cognitive_load === "HIGH")
          .map((b) => b.study_unit.title),
        message: `High cognitive load makes up ${Math.round(
          (highMinutes / totalMinutes) * 100
        )}% of study time on ${formattedDate}.`,
        recommendation:
          "Balance the schedule with medium or low cognitive load units to sustain focus.",
      });
    }
  }

  return warnings;
}
