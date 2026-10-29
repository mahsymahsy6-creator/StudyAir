"use client";

import { useMemo } from "react";
import { format, isToday, isSameDay, differenceInMinutes } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Target, CheckCircle2 } from "lucide-react";
import type { ScheduledBlockWithDetails, Subject } from "@/types/database";
import { CognitiveLoadBadge } from "@/components/shared/CognitiveLoadBadge";

interface CalendarSidebarProps {
  readonly selectedDate: Date;
  readonly blocks: ScheduledBlockWithDetails[];
  readonly subjects: Subject[];
}

export function CalendarSidebar({
  selectedDate,
  blocks,
}: CalendarSidebarProps) {
  const todayBlocks = useMemo(
    () =>
      blocks
        .filter((b) => isSameDay(new Date(b.start_time), selectedDate))
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime()
        ),
    [blocks, selectedDate]
  );

  const completedCount = todayBlocks.filter(
    (b) => b.status === "COMPLETED"
  ).length;
  const totalMinutes = todayBlocks.reduce(
    (sum, b) => sum + differenceInMinutes(new Date(b.end_time), new Date(b.start_time)),
    0
  );
  const progressPct =
    todayBlocks.length > 0
      ? Math.round((completedCount / todayBlocks.length) * 100)
      : 0;

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border/30 bg-card/15 p-5">
      {/* Daily Progress Card */}
      <Card className="border-border/30 bg-card/50 backdrop-blur-sm shadow-none">
        <CardHeader className="pb-3">
          <CardTitle suppressHydrationWarning className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Target className="h-4 w-4 text-primary" />
            {isToday(selectedDate)
              ? "Today's Focus"
              : format(selectedDate, "MMM d") + " Focus"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <div>
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground font-medium">
              <span>
                {completedCount} of {todayBlocks.length} completed
              </span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5 bg-muted/50" />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>{Math.round(totalMinutes / 60 * 10) / 10}h planned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>{todayBlocks.length} session{todayBlocks.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Sessions List */}
      <Card className="flex-1 border-border/30 bg-card/50 backdrop-blur-sm shadow-none flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold tracking-tight">
              Day Schedule
            </CardTitle>
            <Badge variant="outline" className="text-[10px] font-medium border-border/40">
              {todayBlocks.length} Total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 flex-1 overflow-y-auto">
          {todayBlocks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No sessions scheduled for this day. Click any empty calendar slot to schedule.
            </div>
          ) : (
            todayBlocks.map((block) => {
              const start = new Date(block.start_time);
              const dur = differenceInMinutes(
                new Date(block.end_time),
                start
              );
              const isCompleted = block.status === "COMPLETED";

              return (
                <div
                  key={block.id}
                  className="rounded-lg border border-border/25 bg-background/50 p-2.5 transition-all hover:border-border/50"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: block.subject.color_hex,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider truncate"
                      style={{ color: block.subject.color_hex }}
                    >
                      {block.subject.title}
                    </span>
                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Done
                      </span>
                    ) : (
                      <CognitiveLoadBadge
                        load={block.study_unit.cognitive_load}
                        size="sm"
                      />
                    )}
                  </div>

                  <div className="text-xs font-medium text-foreground truncate mt-1">
                    {block.study_unit.title}
                  </div>

                  <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(start, "HH:mm")} • {dur}m
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
