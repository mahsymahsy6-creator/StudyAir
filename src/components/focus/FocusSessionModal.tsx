"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Pause, Play, Square, CheckCircle2, Coffee } from "lucide-react";
import { useTimerStore } from "@/stores/timerStore";
import { cn } from "@/lib/utils";

interface FocusSessionModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onComplete: (actualMinutes: number) => void;
}

export function FocusSessionModal({
  open,
  onClose,
  onComplete,
}: FocusSessionModalProps) {
  const timer = useTimerStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second
  useEffect(() => {
    if (timer.isActive && !timer.isPaused) {
      intervalRef.current = setInterval(() => {
        timer.tick();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.isActive, timer.isPaused, timer]);

  const handleComplete = useCallback(() => {
    const actualMinutes = Math.ceil(timer.elapsedSeconds / 60);
    timer.completeSession();
    onComplete(actualMinutes);
  }, [timer, onComplete]);

  const handleStop = useCallback(() => {
    timer.resetTimer();
    onClose();
  }, [timer, onClose]);

  // Format time
  const totalSeconds = timer.elapsedSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const timeStr = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Progress calculations
  const plannedSeconds = timer.plannedMinutes * 60;
  const progressPct = plannedSeconds > 0
    ? Math.min(100, (totalSeconds / plannedSeconds) * 100)
    : 0;

  // SVG ring dimensions
  const RING_SIZE = 200;
  const STROKE_WIDTH = 8;
  const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (progressPct / 100) * CIRCUMFERENCE;

  // Pomodoro progress within current cycle
  const pomodoroProgressPct =
    timer.mode === "POMODORO" && !timer.isOnBreak
      ? ((totalSeconds % timer.pomodoroLength) / timer.pomodoroLength) * 100
      : timer.isOnBreak
        ? ((totalSeconds % timer.breakLength) / timer.breakLength) * 100
        : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleStop()}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: timer.subjectColor || "#3b82f6" }}
            />
            {timer.studyUnitTitle || "Focus Session"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {timer.subjectTitle}
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Timer Ring */}
          <div className="relative">
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              className="rotate-[-90deg]"
            >
              {/* Background circle */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE_WIDTH}
                className="text-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000",
                  timer.isOnBreak ? "text-success" : "text-primary"
                )}
              />
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {timer.isOnBreak ? (
                <>
                  <Coffee className="mb-1 h-5 w-5 text-success" />
                  <span className="text-xs text-muted-foreground">
                    Break
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-3xl font-bold tracking-wider">
                    {timeStr}
                  </span>
                  {timer.isPaused && (
                    <span className="mt-1 text-xs text-warning animate-pulse">
                      Paused
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stats & Mode row */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-semibold">
                {Math.ceil(totalSeconds / 60)}/{timer.plannedMinutes}
              </p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </div>
            {timer.mode === "POMODORO" && (
              <div className="text-center">
                <p className="font-semibold">{timer.pomodoroCount}</p>
                <p className="text-xs text-muted-foreground">cycles</p>
              </div>
            )}
            <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => timer.setMode("POMODORO")}
                className={cn(
                  "px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-all duration-150",
                  timer.mode === "POMODORO"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pomodoro
              </button>
              <button
                type="button"
                onClick={() => timer.setMode("FLOWMODORO")}
                className={cn(
                  "px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-all duration-150",
                  timer.mode === "FLOWMODORO"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Flowmodoro
              </button>
            </div>
          </div>

          <div className="w-full space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Overall Planned Session</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>

          {timer.mode === "POMODORO" && (
            <div className="w-full space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {timer.isOnBreak
                    ? "Break Interval"
                    : `Pomodoro Cycle #${timer.pomodoroCount + 1}`}
                </span>
                <span>{Math.round(pomodoroProgressPct)}%</span>
              </div>
              <Progress value={pomodoroProgressPct} className="h-1" />
            </div>
          )}

          {/* Quick Break Toggle Button */}
          <div className="flex items-center justify-center gap-2">
            {timer.isOnBreak ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => timer.endBreak()}
                className="h-8 gap-1.5 text-xs border-success/40 text-success hover:bg-success/10"
              >
                <Play className="h-3.5 w-3.5" />
                End Break & Resume Focus
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => timer.startBreak()}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Coffee className="h-3.5 w-3.5" />
                Take Short Break
              </Button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {timer.isPaused ? (
              <Button
                size="lg"
                onClick={() => timer.resume()}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => timer.pause()}
                className="gap-2"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              onClick={handleStop}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>

            <Button
              size="lg"
              variant="default"
              onClick={handleComplete}
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
