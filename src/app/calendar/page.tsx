"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useStudyStore } from "@/stores/studyStore";
import { useTimerStore } from "@/stores/timerStore";
import { CalendarShell } from "@/components/calendar/CalendarShell";

const CreateScheduleDialog = dynamic(
  () =>
    import("@/components/calendar/CreateScheduleDialog").then(
      (m) => m.CreateScheduleDialog
    ),
  { ssr: false }
);

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

const AICopilotDialog = dynamic(
  () =>
    import("@/components/ai/AICopilotDialog").then((m) => m.AICopilotDialog),
  { ssr: false }
);

import { CognitiveLoadWarningBanner } from "@/components/shared/CognitiveLoadWarningBanner";
import { CognitiveLoadBadge } from "@/components/shared/CognitiveLoadBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Play,
  RotateCcw,
  Clock,
  Trash2,
} from "lucide-react";
import type {
  ScheduledBlockWithDetails,
  ConfidenceRating,
} from "@/types/database";
import { format, differenceInMinutes } from "date-fns";

export default function CalendarPage() {
  const blocks = useStudyStore((state) => state.blocks);
  const subjects = useStudyStore((state) => state.subjects);
  const studyUnits = useStudyStore((state) => state.studyUnits);
  const moveBlock = useStudyStore((state) => state.moveBlock);
  const addBlock = useStudyStore((state) => state.addBlock);
  const deleteBlock = useStudyStore((state) => state.deleteBlock);
  const rescheduleAll = useStudyStore((state) => state.rescheduleAll);
  const resetSchedules = useStudyStore((state) => state.resetSchedules);
  const clearSchedules = useStudyStore((state) => state.clearSchedules);
  const completeBlockSession = useStudyStore(
    (state) => state.completeBlockSession
  );

  const timer = useTimerStore();

  // Create schedule modal state
  const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
  const [aiPhotoOpen, setAiPhotoOpen] = useState(false);
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [slotDefaults, setSlotDefaults] = useState<{
    date: Date;
    hour: number;
  } | null>(null);

  const handleSlotClick = useCallback((date: Date, hour: number) => {
    setSlotDefaults({ date, hour });
    setCreateScheduleOpen(true);
  }, []);

  const handleOpenScheduleModal = useCallback(() => {
    setSlotDefaults(null);
    setCreateScheduleOpen(true);
  }, []);

  // Selected block for details modal
  const [selectedBlock, setSelectedBlock] =
    useState<ScheduledBlockWithDetails | null>(null);

  // Focus modal & completion dialog state
  const [focusModalOpen, setFocusModalOpen] = useState(false);
  const [completingBlock, setCompletingBlock] =
    useState<ScheduledBlockWithDetails | null>(null);
  const [sessionActualMinutes, setSessionActualMinutes] = useState(0);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);

  // Handle starting a session from calendar or detail modal
  const handleStartSession = useCallback(
    (block: ScheduledBlockWithDetails) => {
      setSelectedBlock(null);
      setCompletingBlock(block);

      const durationMin = differenceInMinutes(
        new Date(block.end_time),
        new Date(block.start_time)
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
    },
    [timer]
  );

  // Handle session completed from timer
  const handleSessionFinished = useCallback((actualMinutes: number) => {
    setFocusModalOpen(false);
    setSessionActualMinutes(actualMinutes);
    setCompletionDialogOpen(true);
  }, []);

  // Handle SM-2 rating submission
  const handleRate = useCallback(
    (rating: ConfidenceRating) => {
      if (!completingBlock) return;

      completeBlockSession(completingBlock.id, sessionActualMinutes, rating);
      setCompletionDialogOpen(false);

      const ratingNames = ["Again", "Hard", "Good", "Easy"];
      toast.success("Study session logged & review scheduled!", {
        description: `Confidence: ${ratingNames[rating - 1]}. Spaced repetition interval updated.`,
      });
      setCompletingBlock(null);
    },
    [completingBlock, sessionActualMinutes, completeBlockSession]
  );

  // Handle drag and drop block move
  const handleBlockMove = useCallback(
    (blockId: string, slotId: string) => {
      const success = moveBlock(blockId, slotId);
      if (success) {
        toast.info("Study block rescheduled", {
          description: "New time saved to your calendar.",
        });
      }
    },
    [moveBlock]
  );

  // Handle dynamic auto-rescheduling
  const handleAutoReschedule = useCallback(() => {
    const res = rescheduleAll(240);
    if (res.count > 0) {
      toast.success(`Auto-Rescheduled ${res.count} study blocks!`, {
        description:
          "Open slots were filled respecting exam dates & daily caps.",
      });
    } else if (res.overflowCount > 0) {
      toast.warning("Capacity full", {
        description: `${res.overflowCount} units could not fit before their exam dates.`,
      });
    } else {
      toast.info("Schedule is up to date", {
        description: "All uncompleted study units already have scheduled slots.",
      });
    }
  }, [rescheduleAll]);

  const handleResetSchedule = useCallback(() => {
    resetSchedules();
    toast.success("Schedule reset to default", {
      description: "Baseline study blocks restored and warnings refreshed.",
    });
  }, [resetSchedules]);

  const handleClearSchedule = useCallback(() => {
    clearSchedules();
    toast.info("Calendar blocks cleared", {
      description: "Calendar cleared. Click 'Auto-Reschedule' to generate a fresh schedule.",
    });
  }, [clearSchedules]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* ─── Smart Cognitive Load Warnings (Slim) ─── */}
      <CognitiveLoadWarningBanner />

      {/* ─── Main Calendar Component with Consolidated Toolbar ─── */}
      <div className="flex-1 overflow-hidden">
        <CalendarShell
          blocks={blocks}
          subjects={subjects}
          onBlockClick={(b) => setSelectedBlock(b)}
          onStartSession={handleStartSession}
          onBlockMove={handleBlockMove}
          onSlotClick={handleSlotClick}
          onOpenSchedule={handleOpenScheduleModal}
          onAutoReschedule={handleAutoReschedule}
          onResetSchedule={handleResetSchedule}
          onClearSchedule={handleClearSchedule}
          onOpenAIPhoto={() => setAiPhotoOpen(true)}
          onOpenAICopilot={() => setAiCopilotOpen(true)}
        />
      </div>

      {/* ─── Block Detail Dialog ─── */}
      <Dialog
        open={selectedBlock !== null}
        onOpenChange={(open) => !open && setSelectedBlock(null)}
      >
        {selectedBlock && (
          <DialogContent className="max-w-md border border-border bg-card">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: selectedBlock.subject.color_hex }}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedBlock.subject.title}
                </span>
                <Badge
                  variant="outline"
                  className="ml-auto text-[10px] uppercase border-border"
                >
                  {selectedBlock.block_type}
                </Badge>
              </div>
              <DialogTitle className="text-base font-semibold pt-1">
                {selectedBlock.study_unit.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Scheduled for{" "}
                {format(
                  new Date(selectedBlock.start_time),
                  "EEEE, MMMM d, yyyy"
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedBlock.start_time), "HH:mm")} –{" "}
                    {format(new Date(selectedBlock.end_time), "HH:mm")}
                  </span>
                </div>
                <div className="flex items-center justify-end">
                  <CognitiveLoadBadge
                    load={selectedBlock.study_unit.cognitive_load}
                    size="sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Status:</span>
                <Badge
                  variant={
                    selectedBlock.status === "COMPLETED"
                      ? "default"
                      : selectedBlock.status === "MISSED"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {selectedBlock.status}
                </Badge>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBlock(null)}
                >
                  Close
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    deleteBlock(selectedBlock.id);
                    setSelectedBlock(null);
                    toast.success("Schedule block deleted", {
                      description: "Removed from your study calendar.",
                    });
                  }}
                  className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Block
                </Button>
              </div>

              {selectedBlock.status !== "COMPLETED" ? (
                <Button
                  size="sm"
                  onClick={() => handleStartSession(selectedBlock)}
                  className="gap-1.5"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Start Focus Session
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartSession(selectedBlock)}
                  className="gap-1.5 text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Review Again
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ─── Create Schedule Session Dialog ─── */}
      <CreateScheduleDialog
        open={createScheduleOpen}
        onClose={() => setCreateScheduleOpen(false)}
        defaultDate={slotDefaults?.date}
        defaultHour={slotDefaults?.hour}
        subjects={subjects}
        studyUnits={studyUnits}
        onAddBlock={addBlock}
      />

      {/* ─── Active Focus Session Modal ─── */}
      <FocusSessionModal
        open={focusModalOpen}
        onClose={() => setFocusModalOpen(false)}
        onComplete={handleSessionFinished}
      />

      {/* ─── Post-Session Spaced Repetition Completion Dialog ─── */}
      <CompletionDialog
        open={completionDialogOpen}
        unitTitle={completingBlock?.study_unit.title ?? "Study Unit"}
        onRate={handleRate}
        onClose={() => {
          setCompletionDialogOpen(false);
          setCompletingBlock(null);
        }}
      />

      {/* ─── AI Photo Schedule Dialog ─── */}
      <AIPhotoScheduleDialog
        open={aiPhotoOpen}
        onClose={() => setAiPhotoOpen(false)}
      />

      {/* ─── AI Copilot Dialog ─── */}
      <AICopilotDialog
        open={aiCopilotOpen}
        onClose={() => setAiCopilotOpen(false)}
      />
    </div>
  );
}
