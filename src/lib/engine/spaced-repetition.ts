import type { ConfidenceRating } from "@/types/database";

/**
 * SM-2 inspired interval calculation for spaced repetition.
 *
 * Confidence levels:
 *   1 = Again (reset to 1 day)
 *   2 = Hard  (half the base interval)
 *   3 = Good  (standard interval)
 *   4 = Easy  (1.5× the base interval)
 */

const BASE_INTERVALS = [1, 3, 7, 14]; // days

export function getNextReviewInterval(
  repetition: number,
  confidence: ConfidenceRating
): number {
  const idx = Math.min(repetition, BASE_INTERVALS.length - 1);
  const base = BASE_INTERVALS[idx];

  switch (confidence) {
    case 1:
      return 1; // Reset — review tomorrow
    case 2:
      return Math.max(1, Math.round(base * 0.5));
    case 3:
      return base;
    case 4:
      return Math.round(base * 1.5);
    default:
      return BASE_INTERVALS[0];
  }
}

/**
 * Calculate the next review date from a given date.
 */
export function getNextReviewDate(
  fromDate: Date,
  repetition: number,
  confidence: ConfidenceRating
): Date {
  const intervalDays = getNextReviewInterval(repetition, confidence);
  const nextDate = new Date(fromDate);
  nextDate.setDate(nextDate.getDate() + intervalDays);
  return nextDate;
}

/**
 * Map confidence rating to display label.
 */
export function confidenceLabel(rating: ConfidenceRating): string {
  const labels: Record<ConfidenceRating, string> = {
    1: "Again",
    2: "Hard",
    3: "Good",
    4: "Easy",
  };
  return labels[rating];
}

/**
 * Map confidence rating to a color class.
 */
export function confidenceColor(rating: ConfidenceRating): string {
  const colors: Record<ConfidenceRating, string> = {
    1: "text-destructive",
    2: "text-warning",
    3: "text-info",
    4: "text-success",
  };
  return colors[rating];
}
