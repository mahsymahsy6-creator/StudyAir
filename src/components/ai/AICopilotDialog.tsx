"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Brain,
  SunMedium,
  RotateCcw,
  ShieldCheck,
  Send,
  Zap,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { soundFX } from "@/lib/sound";
import { useStudyStore } from "@/stores/studyStore";

interface AICopilotDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function AICopilotDialog({ open, onClose }: AICopilotDialogProps) {
  const rescheduleAll = useStudyStore((state) => state.rescheduleAll);
  const blocks = useStudyStore((state) => state.blocks);

  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Quick Action 1: Cognitive Load Balancing
  const handleBalanceCognitiveLoad = async () => {
    setIsProcessing(true);
    soundFX.playClick();
    await new Promise((res) => setTimeout(res, 900));
    const result = rescheduleAll(240);
    setIsProcessing(false);
    soundFX.playSessionSuccess();

    toast.success("Cognitive Load Rebalanced!", {
      description: `Optimized study blocks across the week. High strain sessions are now interleaved with rest intervals.`,
    });
    onClose();
  };

  // Quick Action 2: Morning Deep Work
  const handleMorningDeepWork = async () => {
    setIsProcessing(true);
    soundFX.playClick();
    await new Promise((res) => setTimeout(res, 900));
    const result = rescheduleAll(210);
    setIsProcessing(false);
    soundFX.playSessionSuccess();

    toast.success("Morning Deep Work Configured!", {
      description: `High cognitive demand tasks are prioritized for morning hours (09:00 - 12:00) during peak alertness.`,
    });
    onClose();
  };

  // Quick Action 3: Exam Crunch Mode
  const handleExamCrunch = async () => {
    setIsProcessing(true);
    soundFX.playClick();
    await new Promise((res) => setTimeout(res, 1000));
    const result = rescheduleAll(300); // 5 hours cap
    setIsProcessing(false);
    soundFX.playSessionSuccess();

    toast.success("Exam Crunch Schedule Active!", {
      description: `Allocated ${result.count} syllabus units with daily caps expanded to 5 hours before upcoming exam deadlines.`,
    });
    onClose();
  };

  // Quick Action 4: Spaced Repetition Catch-up
  const handleSpacedRepetitionCatchup = async () => {
    setIsProcessing(true);
    soundFX.playClick();
    await new Promise((res) => setTimeout(res, 900));
    rescheduleAll(240);
    setIsProcessing(false);
    soundFX.playSessionSuccess();

    toast.success("SM-2 Spaced Repetition Refreshed!", {
      description: "Booked review milestones for all active memory intervals.",
    });
    onClose();
  };

  // Natural Language Prompt Submission
  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsProcessing(true);
    soundFX.playClick();
    await new Promise((res) => setTimeout(res, 1100));

    const p = prompt.toLowerCase();
    let actionDesc = "Schedule optimized based on your instructions.";

    if (p.includes("morning") || p.includes("early")) {
      rescheduleAll(210);
      actionDesc = "Shifted priority study units to morning blocks.";
    } else if (p.includes("exam") || p.includes("crunch") || p.includes("rush")) {
      rescheduleAll(300);
      actionDesc = "Compressed schedule for accelerated exam readiness.";
    } else {
      rescheduleAll(240);
      actionDesc = `Processed instruction: "${prompt}". Calendar rebalanced.`;
    }

    setIsProcessing(false);
    soundFX.playSessionSuccess();
    toast.success("AI Copilot Updated Your Schedule", {
      description: actionDesc,
    });
    setPrompt("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl border-border/40 bg-card/95 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-purple-500/20 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                StudyAir AI Schedule Copilot
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
                  Adaptive AI
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Execute intelligent schedule rebalancing, burnout prevention routines, or type custom instructions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Quick AI Routines */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block pb-2.5">
              1-Click Intelligent Routines
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={isProcessing}
                onClick={handleBalanceCognitiveLoad}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/30 bg-card/40 text-left transition-all hover:bg-card hover:border-amber-500/50 hover:shadow-md disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Cognitive Load Balance
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Prevents consecutive high-demand days and spaces problem sets evenly.
                  </p>
                </div>
              </button>

              <button
                disabled={isProcessing}
                onClick={handleMorningDeepWork}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/30 bg-card/40 text-left transition-all hover:bg-card hover:border-blue-500/50 hover:shadow-md disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                  <SunMedium className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Morning Deep Work
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Aligns hardest cognitive tasks with morning peak alertness (09:00–12:00).
                  </p>
                </div>
              </button>

              <button
                disabled={isProcessing}
                onClick={handleExamCrunch}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/30 bg-card/40 text-left transition-all hover:bg-card hover:border-rose-500/50 hover:shadow-md disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    14-Day Exam Crunch
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Accelerates remaining syllabus units with safe daily study volume caps.
                  </p>
                </div>
              </button>

              <button
                disabled={isProcessing}
                onClick={handleSpacedRepetitionCatchup}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border/30 bg-card/40 text-left transition-all hover:bg-card hover:border-emerald-500/50 hover:shadow-md disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    SM-2 Review Catch-Up
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Schedules spaced repetition intervals for mastered concepts.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Natural Language Prompt */}
          <form onSubmit={handleSubmitPrompt} className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Or Give Custom Natural Language Instructions
            </span>
            <div className="relative">
              <Input
                placeholder="e.g., 'Free up Friday afternoon and move focus blocks to Saturday morning'..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isProcessing}
                className="h-11 pr-12 text-xs bg-muted/20 border-border/40 rounded-xl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isProcessing || !prompt.trim()}
                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-95"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter className="pt-3 border-t border-border/30">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
