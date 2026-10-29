"use client";

import { useMemo } from "react";
import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  isToday,
} from "date-fns";
import { TimeSlot } from "./TimeSlot";
import { cn } from "@/lib/utils";
import type { ScheduledBlockWithDetails } from "@/types/database";

interface WeekViewProps {
  readonly selectedDate: Date;
  readonly blocks: ScheduledBlockWithDetails[];
  readonly studyStartHour?: number;
  readonly studyEndHour?: number;
  readonly onBlockClick: (block: ScheduledBlockWithDetails) => void;
  readonly onStartSession: (block: ScheduledBlockWithDetails) => void;
  readonly onSlotClick?: (date: Date, hour: number) => void;
}

export function WeekView({
  selectedDate,
  blocks,
  studyStartHour = 7,
  studyEndHour = 22,
  onBlockClick,
  onStartSession,
  onSlotClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from(
    { length: studyEndHour - studyStartHour },
    (_, i) => studyStartHour + i
  );

  const blocksByDay = useMemo(() => {
    const map = new Map<string, ScheduledBlockWithDetails[]>();
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      map.set(
        key,
        blocks.filter((b) => isSameDay(new Date(b.start_time), day))
      );
    }
    return map;
  }, [blocks, days]);

  return (
    <div className="flex flex-1 overflow-auto bg-background">
      {/* Time gutter */}
      <div className="sticky left-0 z-20 w-16 shrink-0 border-r border-border/30 bg-background/95 backdrop-blur-md select-none">
        <div className="h-16 border-b border-border/30" /> {/* Header spacer */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="flex h-[72px] items-start justify-end pr-2.5 pt-1.5"
          >
            <span className="text-[11px] font-medium text-muted-foreground/70">
              {hour.toString().padStart(2, "0")}:00
            </span>
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="min-w-[910px] grid flex-1 grid-cols-7">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayBlocks = blocksByDay.get(dayKey) ?? [];
          const today_ = isToday(day);

          return (
            <div
              key={dayKey}
              className={cn(
                "min-w-[130px] border-r border-border/20 last:border-r-0 transition-colors",
                today_ && "bg-primary/[0.02]"
              )}
            >
              {/* Day header */}
              <div
                className={cn(
                  "sticky top-0 z-10 flex h-16 flex-col items-center justify-center gap-0.5 border-b border-border/30 bg-background/90 backdrop-blur-md select-none",
                  today_ && "bg-primary/[0.04]"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    today_
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-foreground hover:bg-muted/30"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Time slots */}
              {hours.map((hour) => (
                <TimeSlot
                  key={`${dayKey}-${hour}`}
                  hour={hour}
                  dayDate={day}
                  blocks={dayBlocks}
                  onBlockClick={onBlockClick}
                  onStartSession={onStartSession}
                  onSlotClick={onSlotClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
