"use client";

import { useDraggable } from "@dnd-kit/core";
import { CognitiveLoadBadge } from "@/components/shared/CognitiveLoadBadge";
import { cn } from "@/lib/utils";
import { Play, RotateCcw, CheckCircle2 } from "lucide-react";
import type { ScheduledBlockWithDetails } from "@/types/database";
import type { CSSProperties } from "react";

interface BlockCardProps {
  readonly block: ScheduledBlockWithDetails;
  readonly style?: CSSProperties;
  readonly onClick?: () => void;
  readonly onStartSession?: () => void;
  readonly compact?: boolean;
}

export function BlockCard({
  block,
  style,
  onClick,
  onStartSession,
  compact = false,
}: BlockCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: block.id,
    data: { block },
  });

  const startTime = new Date(block.start_time);
  const endTime = new Date(block.end_time);
  const durationMin =
    (endTime.getTime() - startTime.getTime()) / 60000;
  const timeStr = `${startTime.getHours().toString().padStart(2, "0")}:${startTime.getMinutes().toString().padStart(2, "0")}`;

  const isCompleted = block.status === "COMPLETED";
  const isMissed = block.status === "MISSED";
  const isReview = block.block_type === "REVIEW";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "group cursor-grab rounded-lg border border-border px-2.5 py-1.5 transition-all duration-150 overflow-hidden flex flex-col justify-between",
        "hover:border-primary/40 active:scale-[0.98] active:cursor-grabbing",
        isDragging && "opacity-50 ring-2 ring-primary scale-[1.02]",
        isCompleted && "opacity-60",
        isMissed && "opacity-50 border-dashed"
      )}
      style={{
        ...style,
        borderLeftWidth: "3.5px",
        borderLeftColor: block.subject.color_hex,
        backgroundColor: `${block.subject.color_hex}14`,
      }}
    >
      {/* Short block (< 45 min) or subdivided concurrent block: compact layout */}
      {durationMin < 45 || compact ? (
        <div className="flex flex-col justify-center h-full min-w-0 py-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {isReview && <RotateCcw className="h-2.5 w-2.5 shrink-0 text-amber-400" />}
            <span className="truncate text-[11px] font-semibold text-foreground leading-tight">
              {block.study_unit.title}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/80 truncate font-medium mt-0.5">
            {timeStr} • {durationMin}m
          </span>
        </div>
      ) : (
        /* Standard block (>= 45 min): airy multi-line layout */
        <div className="flex flex-col justify-between h-full min-w-0">
          <div>
            {/* Subject header & status */}
            <div className="flex items-center justify-between gap-1">
              <span
                className="truncate text-[10px] font-semibold uppercase tracking-wider opacity-90"
                style={{ color: block.subject.color_hex }}
              >
                {isReview ? "Review • " : ""}{block.subject.title}
              </span>
              {isCompleted && (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
              )}
            </div>

            {/* Study Unit Title */}
            <div className="text-xs font-medium text-foreground truncate mt-0.5 leading-snug">
              {block.study_unit.title}
            </div>
          </div>

          {/* Time & Cognitive badge row (for blocks >= 60 min) */}
          {durationMin >= 60 && (
            <div className="flex items-center justify-between gap-1 pt-1 mt-auto">
              <span className="text-[10px] text-muted-foreground/80 font-medium">
                {timeStr} • {durationMin}m
              </span>
              <CognitiveLoadBadge
                load={block.study_unit.cognitive_load}
                size="sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Floating hover launch button */}
      {!isCompleted && !isMissed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartSession?.();
          }}
          className="absolute right-1.5 top-1.5 hidden rounded-full bg-primary p-1 text-primary-foreground shadow-md transition-all hover:scale-110 active:scale-95 group-hover:flex items-center justify-center"
          aria-label="Start focus session"
        >
          <Play className="h-3 w-3 fill-current" />
        </button>
      )}
    </div>
  );
}
