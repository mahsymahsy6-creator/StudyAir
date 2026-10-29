"use client";

import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { TimeSlot } from "./TimeSlot";
import type { ScheduledBlockWithDetails } from "@/types/database";

interface DayViewProps {
  readonly selectedDate: Date;
  readonly blocks: ScheduledBlockWithDetails[];
  readonly studyStartHour?: number;
  readonly studyEndHour?: number;
  readonly onBlockClick: (block: ScheduledBlockWithDetails) => void;
  readonly onStartSession: (block: ScheduledBlockWithDetails) => void;
  readonly onSlotClick?: (date: Date, hour: number) => void;
}

export function DayView({
  selectedDate,
  blocks,
  studyStartHour = 7,
  studyEndHour = 22,
  onBlockClick,
  onStartSession,
  onSlotClick,
}: DayViewProps) {
  const hours = Array.from(
    { length: studyEndHour - studyStartHour },
    (_, i) => studyStartHour + i
  );

  const dayBlocks = useMemo(
    () =>
      blocks.filter((b) =>
        isSameDay(new Date(b.start_time), selectedDate)
      ),
    [blocks, selectedDate]
  );

  return (
    <div className="flex flex-1 overflow-auto bg-background">
      {/* Time gutter */}
      <div className="sticky left-0 z-20 w-20 shrink-0 border-r border-border/30 bg-background/95 backdrop-blur-md select-none">
        <div className="h-16 border-b border-border/30" /> {/* Header spacer */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="flex h-[72px] items-start justify-end pr-3 pt-1.5"
          >
            <span className="text-xs font-medium text-muted-foreground/70">
              {hour.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Day column */}
      <div className="flex-1 max-w-4xl">
        <div className="flex items-center justify-between h-16 border-b border-border/30 px-6 bg-card/20 backdrop-blur-sm">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {dayBlocks.length} session{dayBlocks.length !== 1 ? "s" : ""} scheduled
            </p>
          </div>
        </div>

        {hours.map((hour) => (
          <TimeSlot
            key={hour}
            hour={hour}
            dayDate={selectedDate}
            blocks={dayBlocks}
            onBlockClick={onBlockClick}
            onStartSession={onStartSession}
            onSlotClick={onSlotClick}
          />
        ))}
      </div>
    </div>
  );
}
