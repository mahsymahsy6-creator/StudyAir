"use client";

import { useMemo } from "react";
import { subDays, format, getDay, startOfWeek, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useCurrentDate, useIsMounted } from "@/lib/hooks/useMounted";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  if (!isMounted) {
    return (
      <div className="h-32 rounded-lg bg-muted/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
        Loading activity heatmap...
      </div>
    );
  }

  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const totalHours = Math.round(totalMinutes / 60);
  const activeDays = data.filter((d) => d.minutes > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-4 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{totalHours}h</strong> total
        </span>
        <span>
          <strong className="text-foreground">{activeDays}</strong> active
          days
        </span>
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map(({ key, date }) => {
              const minutes = dataMap.get(key) ?? 0;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger>
                    <div
                      className={cn(
                        "h-3 w-3 rounded-[2px] transition-colors",
                        getIntensity(minutes)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="text-xs"
                  >
                    <p className="font-medium">
                      {format(date, "MMM d, yyyy")}
                    </p>
                    <p className="text-muted-foreground">
                      {minutes > 0
                        ? `${Math.round(minutes / 60 * 10) / 10}h studied`
                        : "No study"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {["bg-muted/40", "bg-primary/20", "bg-primary/35", "bg-primary/55", "bg-primary/75", "bg-primary"].map(
          (cls) => (
            <div
              key={cls}
              className={cn("h-2.5 w-2.5 rounded-[2px]", cls)}
            />
          )
        )}
        <span>More</span>
      </div>
    </div>
  );
}
