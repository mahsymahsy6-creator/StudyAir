"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useStudyStore } from "@/stores/studyStore";
import { useTimerStore } from "@/stores/timerStore";

const FocusSessionModal = dynamic(
  () =>
    import("@/components/focus/FocusSessionModal").then(
      (m) => m.FocusSessionModal
    ),
  { ssr: false }
);

const CompletionDialog = dynamic(
  () =>
    import("@/components/review/CompletionDialog").then(
      (m) => m.CompletionDialog
    ),
  { ssr: false }
);

const AIPhotoScheduleDialog = dynamic(
  () =>
    import("@/components/ai/AIPhotoScheduleDialog").then(
      (m) => m.AIPhotoScheduleDialog
    ),
  { ssr: false }
);

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
  Download,
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
  Camera,
  Layers,
  GraduationCap,
  Zap,
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
  const [aiPhotoOpen, setAiPhotoOpen] = useState(false);
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

  const totalCompletedUnits = studyUnits.filter((u) => u.is_completed).length;
  const overallProgressPct =
    studyUnits.length > 0
      ? Math.round((totalCompletedUnits / studyUnits.length) * 100)
      : 0;

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
    toast.success("Study session saved!");
    setActiveBlock(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background selection:bg-primary/20">
      {/* ─── Hero Section (Simple & Clean) ─── */}
      <div className="border-b border-border bg-background pt-12 pb-14 sm:pt-16 sm:pb-20">

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-5">
          {/* Brand Icon */}
          <div className="flex justify-center pb-1">
            <img
              src="/studyair-icon.svg"
              alt="StudyAir App Icon"
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl shadow-xl border border-primary/25 shadow-primary/20 hover:scale-105 transition-transform"
            />
          </div>

          {/* Subtle Tag */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Smart Study Scheduler</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tighter text-foreground leading-tight">
            Plan your study sessions.{" "}
            <span className="text-primary">
              Beat your exams.
            </span>
          </h1>

          {/* Simple Subtitle */}
          <p className="mx-auto max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Organize your courses into balanced study blocks and track what to review each day.
          </p>

          {/* Clean Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <Link href="/download">
              <Button
                size="lg"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm rounded-xl px-5 py-5 font-semibold cursor-pointer shadow-md hover:shadow-lg transition-all"
              >
                <Download className="h-4 w-4" />
                Unduh APK v2.0.1
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setAiPhotoOpen(true)}
              className="gap-2 text-xs sm:text-sm rounded-xl px-5 py-5 border-border hover:bg-muted/30 font-semibold cursor-pointer"
            >
              <Camera className="h-4 w-4 text-primary" />
              Scan Syllabus with AI
            </Button>
            <Link href="/calendar">
              <Button
                size="lg"
                className="gap-2 text-xs sm:text-sm rounded-xl px-5 py-5 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border font-semibold cursor-pointer"
              >
                <CalendarDays className="h-4 w-4 text-primary" />
                Calendar
              </Button>
            </Link>
            <Link href="/subjects">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-xs sm:text-sm rounded-xl px-4 py-5 border-border hover:bg-muted/30 font-medium"
              >
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                Courses
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="ghost"
                className="gap-2 text-xs sm:text-sm rounded-xl px-4 py-5 text-muted-foreground hover:text-foreground hover:bg-muted/20 font-medium"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Main Content Hub ─── */}
      <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Metric Highlights Strip (Simple & Direct) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                {subjects.length}
              </div>
              <div className="text-[11px] text-muted-foreground">Courses</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                {studyUnits.length}
              </div>
              <div className="text-[11px] text-muted-foreground">Topics ({overallProgressPct}% done)</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                {todayBlocks.length}
              </div>
              <div className="text-[11px] text-muted-foreground">Sessions Today</div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <span>Active</span>
              </div>
              <div className="text-[11px] text-muted-foreground">Gemini AI</div>
            </div>
          </div>
        </div>

        {/* Row 1: Today's Schedule & Exam Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Today's Schedule Card (2 cols) */}
          <Card className="lg:col-span-2 rounded-2xl border border-border bg-card/60 shadow-none p-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3 p-0">
              <div>
                <CardTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Today&apos;s Schedule
                </CardTitle>
                <CardDescription suppressHydrationWarning className="text-xs text-muted-foreground mt-0.5">
                  {today ? format(today, "EEEE, MMMM d") : "Today"} • {completedToday} of {todayBlocks.length} done
                </CardDescription>
              </div>

              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                  View Calendar
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>

            <CardContent className="p-0 pt-3">
              {!isMounted ? (
                <div className="space-y-3 py-2">
                  <div className="h-14 skeleton" />
                  <div className="h-14 skeleton" />
                </div>
              ) : todayBlocks.length === 0 ? (
                <div className="empty-state py-10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                    <CalendarDays className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No sessions today</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Add topics from your calendar or use AI to schedule your week.
                    </p>
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setAiPhotoOpen(true)}
                      className="text-xs rounded-lg gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Scan Syllabus
                    </Button>
                    <Link href="/calendar">
                      <Button size="sm" variant="outline" className="text-xs rounded-lg">
                        Open Calendar
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todayBlocks.map((block) => {
                    const isCompleted = block.status === "COMPLETED";
                    const isReview = block.block_type === "REVIEW";

                    return (
                      <div
                        key={block.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3.5 transition-all duration-150 hover:bg-background/90"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: block.subject.color_hex }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs sm:text-sm font-semibold truncate ${
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
                                  className="text-[9px] text-amber-400 border-amber-400/30 bg-amber-400/10 px-1.5 py-0"
                                >
                                  Review
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                              <span className="truncate">{block.subject.title}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(block.start_time), "HH:mm")} –{" "}
                                {format(new Date(block.end_time), "HH:mm")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <CognitiveLoadBadge
                            load={block.study_unit.cognitive_load}
                            size="sm"
                          />

                          {isCompleted ? (
                            <Badge
                              variant="outline"
                              className="gap-1 border-success/30 text-success bg-success/10 text-xs px-2 py-0.5"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Done
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 gap-1 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
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

          {/* Exam Deadlines Card */}
          <Card className="rounded-2xl border border-border bg-card/60 shadow-none p-6">
            <CardHeader className="pb-3 p-0">
              <CardTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Upcoming Exams
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Days remaining until your exams.
              </CardDescription>
            </CardHeader>
            <CardContent suppressHydrationWarning className="p-0 pt-3 space-y-3">
              {!isMounted ? (
                <div className="space-y-3 py-2">
                  <div className="h-10 skeleton" />
                  <div className="h-10 skeleton" />
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
                    <div key={subj.id} className="space-y-1.5 rounded-xl border border-border bg-background/40 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground truncate max-w-[140px]">
                          <div
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: subj.color_hex }}
                          />
                          <span className="truncate">{subj.title}</span>
                        </div>
                        <Badge
                          variant={daysLeft <= 10 ? "destructive" : "secondary"}
                          className="text-[10px] font-bold"
                        >
                          {daysLeft > 0 ? `${daysLeft}d left` : "Today"}
                        </Badge>
                      </div>

                      <Progress value={pct} className="h-1.5" />

                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>
                          {subj.completed_count}/{subj.total_count} done
                        </span>
                        <span>{pct}% ready</span>
                      </div>
                    </div>
                  );
                })
              )}

              <Link href="/subjects" className="block pt-1">
                <Button variant="outline" size="sm" className="w-full text-xs rounded-xl border-border">
                  Manage Courses
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* AI Highlight Banner (Simple & Clear) */}
        <div className="rounded-2xl border border-primary/20 bg-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                AI Planner
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Turn photos or notes into a study plan
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload a picture of your course syllabus or paste topics. The AI creates your topics and slots them into your calendar.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setAiPhotoOpen(true)}
              className="gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-xl px-4 py-2 font-semibold"
            >
              <Camera className="h-3.5 w-3.5" />
              Scan Syllabus
            </Button>
          </div>
        </div>

        {/* Features Grid (Simple 4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="rounded-xl border border-border bg-card/50 p-5 space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <Camera className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-xs text-foreground">Scan Syllabi</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Upload course photos or notes to pull out topics in seconds.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-5 space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <CalendarDays className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-xs text-foreground">Visual Calendar</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Drag and drop study blocks around your free time.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-5 space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Brain className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-xs text-foreground">Burnout Guard</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Warns you if you schedule too many hard sessions in a row.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-5 space-y-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-xs text-foreground">Spaced Reviews</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Automatically schedules review sessions before you forget.
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

      {/* ─── AI Photo Schedule Dialog ─── */}
      <AIPhotoScheduleDialog
        open={aiPhotoOpen}
        onClose={() => setAiPhotoOpen(false)}
      />
    </div>
  );
}
