"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ScheduledBlockWithDetails } from "@/types/database";
import { BlockCard } from "./BlockCard";

interface TimeSlotProps {
  readonly hour: number;
  readonly dayDate: Date;
  readonly blocks: ScheduledBlockWithDetails[];
  readonly onBlockClick: (block: ScheduledBlockWithDetails) => void;
  readonly onStartSession: (block: ScheduledBlockWithDetails) => void;
  readonly onSlotClick?: (date: Date, hour: number) => void;
}

const SLOT_HEIGHT = 72;

export function TimeSlot({
  hour,
  dayDate,
  blocks,
  onBlockClick,
  onStartSession,
  onSlotClick,
}: TimeSlotProps) {
  const slotId = `${dayDate.toISOString().split("T")[0]}-${hour}`;

  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  const slotBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const blockHour = new Date(b.start_time).getHours();
      return blockHour === hour;
    });
  }, [blocks, hour]);

  return (
    <div
      ref={setNodeRef}
      onClick={() => onSlotClick?.(dayDate, hour)}
      className={cn(
        "group relative h-[72px] min-h-[72px] border-b border-border/25 transition-colors cursor-pointer hover:bg-muted/15",
        isOver && "bg-primary/10"
      )}
    >
      {/* Subtle half-hour guideline for neat visual precision */}
      <div className="pointer-events-none absolute left-0 right-0 top-[36px] border-b border-border/10 border-dashed" />

      {slotBlocks.map((block, index) => {
        const startMin = new Date(block.start_time).getMinutes();
        const durationMin =
          (new Date(block.end_time).getTime() -
            new Date(block.start_time).getTime()) /
          60000;
        const topPx = (startMin / 60) * SLOT_HEIGHT;
        const heightPx = Math.max(30, (durationMin / 60) * SLOT_HEIGHT - 3);

        const totalInSlot = slotBlocks.length;
        const widthPct = 100 / totalInSlot;
        const leftPct = index * widthPct;

        return (
          <BlockCard
            key={block.id}
            block={block}
            compact={totalInSlot > 1}
            style={{
              position: "absolute",
              top: `${topPx}px`,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              height: `${heightPx}px`,
              zIndex: 10 + index,
            }}
            onClick={() => onBlockClick(block)}
            onStartSession={() => onStartSession(block)}
          />
        );
      })}
    </div>
  );
}
