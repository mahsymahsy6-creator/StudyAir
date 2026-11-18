import { ConfidenceRating } from "../types";

const BASE_INTERVALS = [1, 3, 7, 14]; // days

export function getNextReviewInterval(
  repetition: number,
  confidence: ConfidenceRating
): number {
  const idx = Math.min(repetition, BASE_INTERVALS.length - 1);
  const base = BASE_INTERVALS[idx];

  switch (confidence) {
    case 1:
      return 1; // Again — review tomorrow
    case 2:
      return Math.max(1, Math.round(base * 0.5)); // Hard
    case 3:
      return base; // Good
    case 4:
      return Math.round(base * 1.5); // Easy
    default:
      return BASE_INTERVALS[0];
  }
}

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

export function confidenceLabel(rating: ConfidenceRating): string {
  const labels: Record<ConfidenceRating, string> = {
    1: "Again",
    2: "Hard",
    3: "Good",
    4: "Easy",
  };
  return labels[rating] || "Good";
}
