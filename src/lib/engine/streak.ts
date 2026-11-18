import { format, subDays } from "date-fns";

/**
 * Calculates current active consecutive study streak in days.
 * Returns 0 if no study activity occurred today or yesterday.
 */
export function calculateStudyStreak(
  activityTimestamps: (Date | string | number)[],
  currentDate: Date = new Date()
): number {
  if (!activityTimestamps || activityTimestamps.length === 0) return 0;

  // Normalize all valid timestamps to "yyyy-MM-dd"
  const activeDays = new Set<string>();
  for (const item of activityTimestamps) {
    if (!item) continue;
    try {
      const d = new Date(item);
      if (!isNaN(d.getTime())) {
        activeDays.add(format(d, "yyyy-MM-dd"));
      }
    } catch {
      // ignore invalid dates
    }
  }

  if (activeDays.size === 0) return 0;

  const todayStr = format(currentDate, "yyyy-MM-dd");
  let cursor = new Date(currentDate);

  // If there is study activity today, streak starts from today.
  // If not today, check if yesterday was active (grace period to maintain streak today).
  if (!activeDays.has(todayStr)) {
    cursor = subDays(cursor, 1);
    const yesterdayStr = format(cursor, "yyyy-MM-dd");
    if (!activeDays.has(yesterdayStr)) {
      return 0;
    }
  }

  let streak = 0;
  while (activeDays.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }

  return streak;
}
