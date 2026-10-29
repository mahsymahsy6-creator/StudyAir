"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Clock,
  Plus,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentDate } from "@/lib/hooks/useMounted";
import type { SubjectWithUnits } from "@/types/database";

interface SubjectListProps {
  readonly subjects: SubjectWithUnits[];
  readonly selectedSubjectId: string | null;
  readonly onSelectSubject: (id: string) => void;
  readonly onAddSubject: () => void;
}

export function SubjectList({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onAddSubject,
}: SubjectListProps) {
  const today = useCurrentDate();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between pb-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Subjects ({subjects.length})
        </h2>
        <Button
          size="sm"
          variant="ghost"
          onClick={onAddSubject}
          className="h-7 gap-1 px-2.5 text-xs font-medium hover:bg-muted/30"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {subjects.map((subject) => {
        const isExpanded = expandedIds.has(subject.id);
        const isSelected = selectedSubjectId === subject.id;
        const daysUntilExam = differenceInDays(
          new Date(subject.exam_date),
          today
        );
        const completionPct =
          subject.total_count > 0
            ? Math.round(
                (subject.completed_count / subject.total_count) * 100
              )
            : 0;

        return (
          <Card
            key={subject.id}
            className={cn(
              "cursor-pointer rounded-xl border border-border/30 bg-card/40 transition-all hover:bg-card/70 hover:border-border/60 shadow-none",
              isSelected && "ring-1 ring-primary/40 border-primary/40 bg-primary/[0.03]"
            )}
            onClick={() => onSelectSubject(subject.id)}
          >
            <CardHeader className="p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color_hex }}
                  />
                  <CardTitle className="text-sm font-semibold truncate text-foreground">
                    {subject.title}
                  </CardTitle>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    suppressHydrationWarning
                    variant="outline"
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium border-border/40",
                      daysUntilExam <= 3 &&
                        "border-destructive/30 text-destructive bg-destructive/10",
                      daysUntilExam > 3 &&
                        daysUntilExam <= 7 &&
                        "border-warning/30 text-warning bg-warning/10"
                    )}
                  >
                    {daysUntilExam}d left
                  </Badge>

                  <button
                    className="p-0.5 rounded hover:bg-muted/40 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(subject.id);
                    }}
                    aria-label="Toggle details"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-2.5">
                <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span>
                    {subject.completed_count} of {subject.total_count} units
                  </span>
                  <span>{completionPct}%</span>
                </div>
                <Progress value={completionPct} className="h-1.5 bg-muted/40" />
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="border-t border-border/20 px-4 py-2.5 bg-muted/10">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      Exam: {format(new Date(subject.exam_date), "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {Math.round(subject.total_estimated_minutes / 60)}h total
                    </span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
