"use client";

import { useMemo } from "react";
import { useStudyStore } from "@/stores/studyStore";
import { StudyHeatmap } from "@/components/dashboard/StudyHeatmap";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Calendar,
  Clock,
  Flame,
  RotateCcw,
  Target,
  Zap,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useCurrentDate } from "@/lib/hooks/useMounted";
import { calculateStudyStreak } from "@/lib/engine/streak";

export default function DashboardPage() {
  const today = useCurrentDate();
  const subjects = useStudyStore((state) => state.subjects);
  const studyUnits = useStudyStore((state) => state.studyUnits);
  const blocks = useStudyStore((state) => state.blocks);
  const focusLogs = useStudyStore((state) => state.focusLogs);
  const reviewHistory = useStudyStore((state) => state.reviewHistory);

  // Stats
  const totalUnits = studyUnits.length;
  const completedUnits = studyUnits.filter((u) => u.is_completed).length;
  const masteryPct =
    totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const totalActualMinutes = focusLogs.reduce(
    (acc, log) => acc + log.actual_minutes,
    0
  );
  const totalHours = Math.round((totalActualMinutes / 60) * 10) / 10;

  // Cognitive load distribution calculation
  const cognitiveStats = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const unit of studyUnits) {
      if (unit.cognitive_load === "HIGH") high += unit.estimated_minutes;
      else if (unit.cognitive_load === "MEDIUM")
        medium += unit.estimated_minutes;
      else low += unit.estimated_minutes;
    }

    const total = high + medium + low || 1;
    return {
      highMin: high,
      mediumMin: medium,
      lowMin: low,
      highPct: Math.round((high / total) * 100),
      mediumPct: Math.round((medium / total) * 100),
      lowPct: Math.round((low / total) * 100),
    };
  }, [studyUnits]);

  // Dynamic study streak
  const studyStreak = useMemo(() => {
    const timestamps: (string | Date)[] = [];
    for (const b of blocks) {
      if (b.status === "COMPLETED") {
        timestamps.push(b.start_time);
      }
    }
    for (const fl of focusLogs) {
      timestamps.push(fl.started_at);
    }
    return calculateStudyStreak(timestamps, today);
  }, [blocks, focusLogs, today]);

  // Heatmap data generated from real focus logs + completed blocks only
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of blocks) {
      if (b.status === "COMPLETED") {
        const key = format(new Date(b.start_time), "yyyy-MM-dd");
        const dur = Math.round(
          (new Date(b.end_time).getTime() -
            new Date(b.start_time).getTime()) /
            60000
        );
        map.set(key, (map.get(key) ?? 0) + dur);
      }
    }
    for (const fl of focusLogs) {
      const key = format(new Date(fl.started_at), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + fl.actual_minutes);
    }

    const result: { date: string; minutes: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = format(d, "yyyy-MM-dd");
      const actual = map.get(key) ?? 0;
      result.push({ date: key, minutes: actual });
    }
    return result;
  }, [blocks, focusLogs, today]);

  // Spaced repetition review queue
  const reviewQueue = useMemo(() => {
    return reviewHistory.map((rh) => {
      const unit = studyUnits.find((u) => u.id === rh.study_unit_id);
      const subject = subjects.find((s) => s.id === unit?.subject_id);
      return {
        ...rh,
        unitTitle: unit?.title ?? "Study Unit",
        subjectTitle: subject?.title ?? "General",
        subjectColor: subject?.color_hex ?? "#3b82f6",
      };
    });
  }, [reviewHistory, studyUnits, subjects]);

  return (
    <div className="flex-1 overflow-y-auto bg-background p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Study Stats
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Track study hours, consistency, and upcoming topic reviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/30 bg-primary/10 px-3.5 py-1 text-primary text-xs font-semibold rounded-full"
          >
            <Flame className="h-4 w-4 fill-primary" />
            {studyStreak} {studyStreak === 1 ? "Day" : "Days"} Streak
          </Badge>
        </div>
      </div>

      {/* ─── Top 4 Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="rounded-2xl border border-border bg-card/60 shadow-none p-6 transition-all duration-150 hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Study Time
            </span>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground">{totalHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              {focusLogs.length} completed sessions
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-card/60 shadow-none p-6 transition-all duration-150 hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Topics Finished
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground">{masteryPct}%</div>
            <div className="mt-2.5">
              <Progress value={masteryPct} className="h-1.5 bg-muted" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {completedUnits} of {totalUnits} topics done
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-card/60 shadow-none p-6 transition-all duration-150 hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hard Topics
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Brain className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground">{cognitiveStats.highPct}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {cognitiveStats.highMin} mins of difficult material
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-card/60 shadow-none p-6 transition-all duration-150 hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Due for Review
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold tracking-tight text-foreground">{reviewQueue.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Topics ready to review
            </p>
          </div>
        </Card>
      </div>

      {/* ─── Middle Row: Heatmap & Cognitive Load Distribution ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap (2 cols) */}
        <Card className="lg:col-span-2 rounded-2xl border border-border bg-card/60 p-6 shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" />
              Study Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Daily study minutes over the past 12 weeks.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <StudyHeatmap data={heatmapData} />
          </CardContent>
        </Card>

        {/* Cognitive Load Breakdown */}
        <Card className="rounded-2xl border border-border bg-card/60 p-6 shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-purple-400" />
              Difficulty Balance
            </CardTitle>
            <CardDescription className="text-xs">
              Balance of hard, medium, and easy topics.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {/* Visual ratio bar */}
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/40">
              <div
                style={{ width: `${cognitiveStats.highPct}%` }}
                className="bg-destructive transition-all"
                title={`Hard: ${cognitiveStats.highPct}%`}
              />
              <div
                style={{ width: `${cognitiveStats.mediumPct}%` }}
                className="bg-amber-500 transition-all"
                title={`Medium: ${cognitiveStats.mediumPct}%`}
              />
              <div
                style={{ width: `${cognitiveStats.lowPct}%` }}
                className="bg-emerald-500 transition-all"
                title={`Easy: ${cognitiveStats.lowPct}%`}
              />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                  Hard Topics
                </span>
                <span className="font-semibold">{cognitiveStats.highPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Medium Topics
                </span>
                <span className="font-semibold">{cognitiveStats.mediumPct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Easy Topics
                </span>
                <span className="font-semibold">{cognitiveStats.lowPct}%</span>
              </div>
            </div>

            <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
              💡 <strong>Tip:</strong>{" "}
              {cognitiveStats.highPct > 50
                ? "You have many hard topics. StudyAir will mix in breaks and lighter reviews to keep your mind fresh."
                : "Your study workload is well balanced between hard and easy topics."}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Bottom Row: Spaced Repetition Queue & Focus Session History ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spaced Repetition Reviews */}
        <Card className="rounded-2xl border border-border bg-card/60 p-6 shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <RotateCcw className="h-4 w-4 text-info" />
              Upcoming Reviews
            </CardTitle>
            <CardDescription className="text-xs">
              Topics scheduled for review based on your session ratings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reviewQueue.length === 0 ? (
              <div className="empty-state py-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No reviews yet</p>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Complete your first study session to start your spaced repetition schedule
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {reviewQueue.map((item) => {
                  const daysToNext = differenceInDays(
                    new Date(item.next_review_date),
                    today
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.subjectColor }}
                        />
                        <div>
                          <div className="font-semibold text-foreground">
                            {item.unitTitle}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.subjectTitle} • Review #{item.repetition_number}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-[10px] border-border">
                          Every {item.interval_days}d
                        </Badge>
                        <Badge
                          suppressHydrationWarning
                          className={
                            daysToNext <= 1
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-muted text-muted-foreground"
                          }
                        >
                          {daysToNext <= 0
                            ? "Due today"
                            : `Due in ${daysToNext}d`}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Focus Session Logs */}
        <Card className="rounded-2xl border border-border bg-card/60 p-6 shadow-none">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-400" />
              Recent Sessions
            </CardTitle>
            <CardDescription className="text-xs">
              History of your latest study sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {focusLogs.length === 0 ? (
              <div className="empty-state py-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No sessions logged</p>
                  <p className="text-xs text-muted-foreground max-w-[240px]">
                    Start a focus session from the calendar to begin tracking
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {focusLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {log.timer_mode} Session
                      </div>
                      <div suppressHydrationWarning className="text-[11px] text-muted-foreground">
                        {format(new Date(log.started_at), "MMM d, yyyy • HH:mm")}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">
                        {log.actual_minutes}m
                      </span>
                      {log.pomodoro_count > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {log.pomodoro_count} rounds
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
