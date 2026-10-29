"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useStudyStore } from "@/stores/studyStore";
import { useTimerStore } from "@/stores/timerStore";
import { FocusSessionModal } from "@/components/focus/FocusSessionModal";
import { CompletionDialog } from "@/components/review/CompletionDialog";
import { CognitiveLoadBadge } from "@/components/shared/CognitiveLoadBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CalendarDays,
  BookOpen,
  BarChart3,
  Play,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Brain,
  Target,
} from "lucide-react";
import { format, differenceInDays, isSameDay } from "date-fns";
import { useCurrentDate, useIsMounted } from "@/lib/hooks/useMounted";
import type {
  ScheduledBlockWithDetails,
  ConfidenceRating,
} from "@/types/database";

export default function HomePage() {
  const isMounted = useIsMounted();
  const subjects = useStudyStore((state) => state.subjects);
  const studyUnits = useStudyStore((state) => state.studyUnits);
  const blocks = useStudyStore((state) => state.blocks);

  const subjectsWithUnits = useMemo(() => {
    return subjects.map((subj) => {
      const units = studyUnits.filter((u) => u.subject_id === subj.id);
      const completed_count = units.filter((u) => u.is_completed).length;
      return {
        ...subj,
        units,
        study_units: units,
        completed_count,
        total_count: units.length,
      };
    });
  }, [subjects, studyUnits]);
  const completeBlockSession = useStudyStore(
    (state) => state.completeBlockSession
  );
  const timer = useTimerStore();

  const today = useCurrentDate();

  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [activeBlock, setActiveBlock] =
    useState<ScheduledBlockWithDetails | null>(null);
  const [actualMinutes, setActualMinutes] = useState(0);
  const [completionOpen, setCompletionOpen] = useState(false);

  // Today's blocks
  const todayBlocks = today
    ? blocks
        .filter((b) => isSameDay(new Date(b.start_time), today))
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
    : [];

  const completedToday = todayBlocks.filter(
    (b) => b.status === "COMPLETED"
  ).length;

  const handleLaunchSession = (block: ScheduledBlockWithDetails) => {
    setActiveBlock(block);
    const durationMin = Math.round(
      (new Date(block.end_time).getTime() -
        new Date(block.start_time).getTime()) /
        60000
    );

    timer.startSession({
      blockId: block.id,
      studyUnitTitle: block.study_unit.title,
      subjectTitle: block.subject.title,
      subjectColor: block.subject.color_hex,
      plannedMinutes: durationMin,
      mode: "POMODORO",
    });

    setFocusModalOpen(true);
  };

  const handleSessionFinished = (mins: number) => {
    setFocusModalOpen(false);
    setActualMinutes(mins);
    setCompletionOpen(true);
  };

  const handleRate = (rating: ConfidenceRating) => {
    if (!activeBlock) return;
    completeBlockSession(activeBlock.id, actualMinutes, rating);
    setCompletionOpen(false);
    toast.success("Focus session logged!", {
      description: "Spaced repetition review schedule updated.",
    });
    setActiveBlock(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* ─── Hero Section ─── */}
      <section className="relative border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background px-4 sm:px-6 py-8 sm:py-14">
        <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Adaptive Spaced-Repetition Study Engine
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Master your syllabus{" "}
            <span className="bg-gradient-to-r from-primary via-blue-400 to-amber-300 bg-clip-text text-transparent">
              before exam day.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed px-2">
            Time-blocking calendar with cognitive load tracking, automated SM-2 review intervals, and an intelligent auto-rescheduler that protects you from burnout.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link href="/calendar">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 text-xs sm:text-sm rounded-xl px-5">
                <CalendarDays className="h-4 w-4" />
                Open Time-Blocking Calendar
              </Button>
            </Link>
            <Link href="/subjects">
              <Button size="lg" variant="outline" className="gap-2 text-xs sm:text-sm rounded-xl px-5 border-border/40 hover:bg-muted/30">
                <BookOpen className="h-4 w-4" />
                Syllabus Deconstructor
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="ghost" className="gap-2 text-xs sm:text-sm rounded-xl px-5 text-muted-foreground hover:text-foreground">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Main Content Hub ─── */}
      <div className="mx-auto max-w-6xl p-6 sm:p-8 space-y-8 sm:space-y-10">
        {/* Row 1: Today's Focus & Exam Countdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Today's Schedule Card (2 cols) */}
          <Card className="lg:col-span-2 rounded-2xl border-border/30 bg-card/40 backdrop-blur-md shadow-none p-6">
            <CardHeader className="flex flex-row items-center justify-between pb-4 p-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Today&apos;s Study Schedule
                </CardTitle>
                <CardDescription suppressHydrationWarning className="text-xs text-muted-foreground mt-1">
                  {today ? format(today, "EEEE, MMMM d, yyyy") : "Today"} •{" "}
                  {completedToday}/{todayBlocks.length} completed
                </CardDescription>
              </div>

              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                  Full Calendar
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0 pt-4">
              {!isMounted ? (
                <div className="space-y-3 py-2">
                  <div className="h-16 rounded-xl bg-muted/30 animate-pulse" />
                  <div className="h-16 rounded-xl bg-muted/30 animate-pulse" />
                  <div className="h-16 rounded-xl bg-muted/30 animate-pulse" />
                </div>
              ) : todayBlocks.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No sessions scheduled for today. Drag and drop from your calendar.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayBlocks.map((block) => {
                    const isCompleted = block.status === "COMPLETED";
                    const isReview = block.block_type === "REVIEW";

                    return (
                      <div
                        key={block.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/25 bg-background/50 p-4 transition-all hover:border-border/50 hover:bg-background/80"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className="h-3.5 w-3.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: block.subject.color_hex,
                            }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  isCompleted
                                    ? "line-through text-muted-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {block.study_unit.title}
                              </span>
                              {isReview && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-amber-400 border-amber-400/30"
                                >
                                  Review
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{block.subject.title}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(
                                  new Date(block.start_time),
                                  "HH:mm"
                                )}{" "}
                                –{" "}
                                {format(new Date(block.end_time), "HH:mm")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <CognitiveLoadBadge
                            load={block.study_unit.cognitive_load}
                            size="sm"
                          />

                          {isCompleted ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-success/30 text-success text-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Done
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 gap-1 text-xs"
                              onClick={() => handleLaunchSession(block)}
                            >
                              <Play className="h-3 w-3 fill-current" />
                              Focus
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exam Countdown & Progress */}
          <Card className="rounded-2xl border-border/30 bg-card/40 backdrop-blur-md shadow-none p-6">
            <CardHeader className="pb-4 p-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                <Target className="h-4 w-4 text-primary" />
                Target Exam Deadlines
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Days remaining until your exams.
              </CardDescription>
            </CardHeader>
            <CardContent suppressHydrationWarning className="p-0 pt-4 space-y-4">
              {!isMounted ? (
                <div className="space-y-4 py-2">
                  <div className="h-10 rounded-lg bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted/40 animate-pulse" />
                  <div className="h-10 rounded-lg bg-muted/40 animate-pulse" />
                </div>
              ) : (
                subjectsWithUnits.map((subj) => {
                const daysLeft = today
                  ? differenceInDays(new Date(subj.exam_date), today)
                  : 14;
                const pct =
                  subj.total_count > 0
                    ? Math.round(
                        (subj.completed_count / subj.total_count) * 100
                      )
                    : 0;

                return (
                  <div key={subj.id} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: subj.color_hex }}
                        />
                        <span>{subj.title}</span>
                      </div>
                      <Badge
                        variant={daysLeft <= 10 ? "destructive" : "secondary"}
                        className="text-[10px]"
                      >
                        {daysLeft}d left
                      </Badge>
                    </div>

                    <Progress value={pct} className="h-1.5" />

                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>
                        {subj.completed_count}/{subj.total_count} units
                      </span>
                      <span>{pct}% mastered</span>
                    </div>
                  </div>
                );
              }))}

              <Link href="/subjects" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Manage Syllabus & Units
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Features Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm p-6 space-y-3 transition-colors hover:bg-card/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Time-Blocking Calendar</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Drag-and-drop schedule planner color-coded by subject and cognitive load, keeping your daily study blocks balanced.
            </p>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm p-6 space-y-3 transition-colors hover:bg-card/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Brain className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Cognitive Load Guard</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Detects consecutive high-demand problem sessions and alerts you to fatigue overload before mental exhaustion strikes.
            </p>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm p-6 space-y-3 transition-colors hover:bg-card/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">SM-2 Spaced Repetition</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Post-session confidence rating automatically computes optimal memory intervals and books follow-up reviews.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Focus Session Modal ─── */}
      <FocusSessionModal
        open={focusModalOpen}
        onClose={() => setFocusModalOpen(false)}
        onComplete={handleSessionFinished}
      />

      {/* ─── Spaced Repetition Completion Dialog ─── */}
      <CompletionDialog
        open={completionOpen}
        unitTitle={activeBlock?.study_unit.title ?? "Study Session"}
        onRate={handleRate}
        onClose={() => {
          setCompletionOpen(false);
          setActiveBlock(null);
        }}
      />
    </div>
  );
}
