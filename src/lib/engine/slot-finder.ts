import type { ScheduledBlock } from "@/types/database";

export interface TimeSlotWindow {
  start: Date;
  end: Date;
  durationMinutes: number;
}

/**
 * Find open time windows in a given day, excluding existing blocks.
 *
 * @param date - The day to analyze
 * @param existingBlocks - Already scheduled blocks for that day
 * @param studyStartHour - Earliest study hour (default 8)
 * @param studyEndHour - Latest study hour (default 22)
 * @param slotGranularityMinutes - Minimum slot size (default 30)
 */
export function findOpenSlots(
  date: Date,
  existingBlocks: ScheduledBlock[],
  studyStartHour = 8,
  studyEndHour = 22,
  slotGranularityMinutes = 30
): TimeSlotWindow[] {
  const dayStart = new Date(date);
  dayStart.setHours(studyStartHour, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(studyEndHour, 0, 0, 0);

  // Sort existing blocks by start time
  const sorted = [...existingBlocks]
    .map((b) => ({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
    }))
    .filter(
      (b) =>
        b.end > dayStart && b.start < dayEnd // overlaps with study window
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const openSlots: TimeSlotWindow[] = [];
  let cursor = dayStart;

  for (const block of sorted) {
    // Gap between cursor and block start
    if (block.start > cursor) {
      const gapMinutes = (block.start.getTime() - cursor.getTime()) / 60000;
      if (gapMinutes >= slotGranularityMinutes) {
        openSlots.push({
          start: new Date(cursor),
          end: new Date(block.start),
          durationMinutes: gapMinutes,
        });
      }
    }
    // Advance cursor past this block
    if (block.end > cursor) {
      cursor = new Date(block.end);
    }
  }

  // Gap after last block until end of study window
  if (cursor < dayEnd) {
    const gapMinutes = (dayEnd.getTime() - cursor.getTime()) / 60000;
    if (gapMinutes >= slotGranularityMinutes) {
      openSlots.push({
        start: new Date(cursor),
        end: new Date(dayEnd),
        durationMinutes: gapMinutes,
      });
    }
  }

  return openSlots;
}

/**
 * Fit a study unit into the first available slot.
 * Returns the start and end times, or null if no slot fits.
 */
export function fitIntoSlot(
  slots: TimeSlotWindow[],
  durationMinutes: number
): { start: Date; end: Date } | null {
  for (const slot of slots) {
    if (slot.durationMinutes >= durationMinutes) {
      const end = new Date(slot.start);
      end.setMinutes(end.getMinutes() + durationMinutes);
      return { start: new Date(slot.start), end };
    }
  }
  return null;
}
