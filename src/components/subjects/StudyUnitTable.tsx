"use client";

import { CognitiveLoadBadge } from "@/components/shared/CognitiveLoadBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  GripVertical,
  Trash2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudyUnit } from "@/types/database";

interface StudyUnitTableProps {
  readonly units: StudyUnit[];
  readonly subjectTitle: string;
  readonly subjectColor: string;
  readonly onToggleComplete: (unitId: string) => void;
  readonly onDelete: (unitId: string) => void;
  readonly onAddUnit?: () => void;
}

export function StudyUnitTable({
  units,
  subjectTitle,
  subjectColor,
  onToggleComplete,
  onDelete,
  onAddUnit,
}: StudyUnitTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="h-3.5 w-3.5 rounded-full"
            style={{ backgroundColor: subjectColor }}
          />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {subjectTitle} Curriculum
          </h3>
          <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-border/40 font-medium">
            {units.length} unit{units.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {onAddUnit && (
          <Button
            size="sm"
            onClick={onAddUnit}
            className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Unit
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden shadow-none">
        {/* Header */}
        <div className="grid grid-cols-[36px_1fr_90px_100px_48px] items-center gap-3 border-b border-border/30 bg-muted/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 select-none">
          <span />
          <span>Atomic Study Unit</span>
          <span className="text-center">Duration</span>
          <span className="text-center">Cognitive Load</span>
          <span />
        </div>

        {/* Rows */}
        {units.length === 0 ? (
          <div className="px-6 py-12 text-center text-xs text-muted-foreground">
            No study units created yet. Break your syllabus down into 30–90 minute atomic concepts.
          </div>
        ) : (
          units.map((unit) => (
            <div
              key={unit.id}
              className={cn(
                "group grid grid-cols-[36px_1fr_90px_100px_48px] items-center gap-3 border-b border-border/20 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-muted/15",
                unit.is_completed && "opacity-60 bg-muted/[0.04]"
              )}
            >
              {/* Drag handle */}
              <div className="flex items-center justify-center">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60 active:cursor-grabbing" />
              </div>

              {/* Title + Status Checkbox */}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => onToggleComplete(unit.id)}
                  className="shrink-0 transition-transform active:scale-90"
                  aria-label={
                    unit.is_completed
                      ? "Mark as incomplete"
                      : "Mark as complete"
                  }
                >
                  {unit.is_completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-xs font-medium truncate text-foreground",
                    unit.is_completed && "line-through text-muted-foreground"
                  )}
                >
                  {unit.title}
                </span>
              </div>

              {/* Duration */}
              <div className="text-center text-xs text-muted-foreground font-medium">
                {unit.estimated_minutes} min
              </div>

              {/* Cognitive Load Badge */}
              <div className="flex justify-center">
                <CognitiveLoadBadge
                  load={unit.cognitive_load}
                  size="sm"
                />
              </div>

              {/* Delete Action */}
              <div className="flex justify-end">
                <button
                  onClick={() => onDelete(unit.id)}
                  className="p-1 rounded text-muted-foreground/40 opacity-0 transition-all hover:text-destructive hover:bg-destructive/10 group-hover:opacity-100"
                  aria-label="Delete unit"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
