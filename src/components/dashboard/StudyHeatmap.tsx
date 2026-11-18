"use client";

import { useState, useMemo } from "react";
import { subDays, format, getDay, startOfWeek, addDays, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentDate, useIsMounted } from "@/lib/hooks/useMounted";
import { useStudyStore } from "@/stores/studyStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Clock, BookOpen, Timer, Calendar, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StudyHeatmapProps {
  readonly data: { date: string; minutes: number }[];
}

function getIntensity(minutes: number): string {
  if (minutes === 0) return "bg-muted/40";
  if (minutes < 30) return "bg-primary/20";
  if (minutes < 60) return "bg-primary/35";
  if (minutes < 120) return "bg-primary/55";
  if (minutes < 180) return "bg-primary/75";
  return "bg-primary";
}

export function StudyHeatmap({ data }: StudyHeatmapProps) {
  const isMounted = useIsMounted();
  const today = useCurrentDate();

  const subjects = useStudyStore((state) => state.subjects);
  const studyUnits = useStudyStore((state) => state.studyUnits);
  const blocks = useStudyStore((state) => state.blocks);
  const focusLogs = useStudyStore((state) => state.focusLogs);

  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    key: string;
    minutes: number;
  } | null>(null);

  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.date, d.minutes);
    return map;
  }, [data]);

  // Build weeks grid (12 weeks)
  const weeks = useMemo(() => {
    const result: { date: Date; key: string }[][] = [];

    // Find the start of the grid (12 weeks ago, aligned to Monday)
    const gridStart = startOfWeek(subDays(today, 83), { weekStartsOn: 1 });

    let current = new Date(gridStart);
    let week: { date: Date; key: string }[] = [];

    while (current <= today) {
      const dayOfWeek = getDay(current); // 0=Sun
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0

      if (adjustedDay === 0 && week.length > 0) {
        result.push(week);
        week = [];
      }

      week.push({
        date: new Date(current),
        key: format(current, "yyyy-MM-dd"),
      });

      current = addDays(current, 1);
    }

    if (week.length > 0) result.push(week);
    return result;
  }, [today]);

  // Selected Day Statistics Calculation
  const selectedDayStats = useMemo(() => {
    if (!selectedDay) return null;
    const dayDate = selectedDay.date;

    const completedOnDate: {
      id: string;
      title: string;
      subjectTitle: string;
      subjectColor: string;
      cognitiveLoad: string;
      minutes: number;
    }[] = [];

    const seenUnitIds = new Set<string>();

    for (const unit of studyUnits) {
      if (unit.is_completed && unit.completed_at) {
        if (isSameDay(new Date(unit.completed_at), dayDate)) {
          const sub = subjects.find((s) => s.id === unit.subject_id);
          seenUnitIds.add(unit.id);
          completedOnDate.push({
            id: unit.id,
            title: unit.title,
            subjectTitle: sub?.title || "Course",
            subjectColor: sub?.color_hex || "#3b82f6",
            cognitiveLoad: unit.cognitive_load,
            minutes: unit.estimated_minutes,
          });
        }
      }
    }

    const dayBlocks = blocks.filter(
      (b) =>
        b.status === "COMPLETED" &&
        isSameDay(new Date(b.start_time), dayDate)
    );

    for (const b of dayBlocks) {
      if (!seenUnitIds.has(b.study_unit_id)) {
        const u = studyUnits.find((unit) => unit.id === b.study_unit_id);
        if (u) {
          const sub = subjects.find((s) => s.id === u.subject_id);
          seenUnitIds.add(u.id);
          const blockDur = Math.round(
            (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000
          );
          completedOnDate.push({
            id: u.id,
            title: u.title,
            subjectTitle: sub?.title || "Course",
            subjectColor: sub?.color_hex || "#3b82f6",
            cognitiveLoad: u.cognitive_load,
            minutes: blockDur || u.estimated_minutes,
          });
        }
      }
    }

    const dayLogs = focusLogs.filter((fl) =>
      isSameDay(new Date(fl.started_at), dayDate)
    );

    const totalMins = selectedDay.minutes;
    const hours = Math.round((totalMins / 60) * 10) / 10;
    const sessionsCount = Math.max(dayBlocks.length, dayLogs.length);

    return {
      date: dayDate,
      dateFormatted: format(dayDate, "EEEE, MMMM d, yyyy"),
      totalMinutes: totalMins,
      hours,
      completedUnits: completedOnDate,
      sessionsCount,
      isToday: isSameDay(dayDate, today),
    };
  }, [selectedDay, studyUnits, subjects, blocks, focusLogs, today]);

  if (!isMounted) {
    return <div className="h-32 rounded-lg skeleton" />;
  }

  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const activeDays = data.filter((d) => d.minutes > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-foreground">{totalHours}h</strong> total
          </span>
          <span>
            <strong className="text-foreground">{activeDays}</strong> active days
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          Click any cell to view day statistics
        </span>
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map(({ key, date }) => {
              const minutes = dataMap.get(key) ?? 0;
              const formattedDate = format(date, "MMM d, yyyy");
              const studiedText =
                minutes > 0
                  ? `${Math.round((minutes / 60) * 10) / 10}h studied`
                  : "No study";
              const isSelected = selectedDay?.key === key;

              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDay({ date, key, minutes })}
                  title={`${formattedDate}: ${studiedText}`}
                  className={cn(
                    "h-3 w-3 rounded-[2px] transition-all cursor-pointer hover:ring-2 hover:ring-primary/60 hover:scale-110",
                    getIntensity(minutes),
                    isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-125 z-10"
                  )}
                  aria-label={`${formattedDate}: ${studiedText}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend & Inspect Prompt */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
        <button
          type="button"
          onClick={() => {
            const todayKey = format(today, "yyyy-MM-dd");
            const mins = dataMap.get(todayKey) ?? 0;
            setSelectedDay({ date: today, key: todayKey, minutes: mins });
          }}
          className="text-primary hover:underline flex items-center gap-1 font-medium"
        >
          <Sparkles className="h-3 w-3" />
          <span>Inspect today&apos;s activity</span>
        </button>

        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {[
            "bg-muted/40",
            "bg-primary/20",
            "bg-primary/35",
            "bg-primary/55",
            "bg-primary/75",
            "bg-primary",
          ].map((cls) => (
            <div key={cls} className={cn("h-2.5 w-2.5 rounded-[2px]", cls)} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* ─── Day Statistics Modal ─── */}
      <Dialog
        open={!!selectedDayStats}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null);
        }}
      >
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border rounded-2xl p-6">
          <DialogHeader className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Study Activity Statistics
            </span>
            <DialogTitle className="text-base font-semibold text-foreground">
              {selectedDayStats?.dateFormatted}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Breakdown of hours studied, completed syllabus topics, and focus sessions.
            </DialogDescription>
          </DialogHeader>

          {/* Metric Badges */}
          <div className="grid grid-cols-3 gap-2 py-3">
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border border-border">
              <Clock className="h-4 w-4 text-primary mb-1" />
              <span className="text-lg font-bold text-foreground">
                {selectedDayStats?.hours}h
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Hours Studied
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border border-border">
              <BookOpen className="h-4 w-4 text-emerald-400 mb-1" />
              <span className="text-lg font-bold text-foreground">
                {selectedDayStats?.completedUnits.length || 0}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Syllabus Done
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-muted/40 border border-border">
              <Timer className="h-4 w-4 text-purple-400 mb-1" />
              <span className="text-lg font-bold text-foreground">
                {selectedDayStats?.sessionsCount || 0}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">
                Sessions
              </span>
            </div>
          </div>

          {/* Topics List or Empty State */}
          {selectedDayStats && selectedDayStats.completedUnits.length > 0 ? (
            <div className="space-y-2 mt-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Completed Syllabus Topics ({selectedDayStats.completedUnits.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedDayStats.completedUnits.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: u.subjectColor }}
                      />
                      <div className="truncate">
                        <p className="font-medium text-foreground truncate">
                          {u.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {u.subjectTitle} • {u.minutes} mins
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 shrink-0 uppercase font-semibold",
                        u.cognitiveLoad === "HIGH" && "border-red-500/40 text-red-400 bg-red-500/10",
                        u.cognitiveLoad === "MEDIUM" && "border-amber-500/40 text-amber-400 bg-amber-500/10",
                        u.cognitiveLoad === "LOW" && "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      )}
                    >
                      {u.cognitiveLoad}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center space-y-1.5 rounded-xl bg-muted/10 border border-border/50">
              <Calendar className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="text-xs font-medium text-foreground">
                {selectedDayStats?.totalMinutes === 0
                  ? "Rest Day"
                  : "General Study Logged"}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                {selectedDayStats?.totalMinutes === 0
                  ? "No syllabus topics or focus sessions completed on this date."
                  : `${selectedDayStats?.totalMinutes} minutes recorded across focus sessions.`}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
