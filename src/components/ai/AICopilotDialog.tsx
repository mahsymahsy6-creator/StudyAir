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
  Send,
  TrendingUp,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { soundFX } from "@/lib/sound";
import { useStudyStore } from "@/stores/studyStore";
import { GeminiApiKeyModal } from "@/components/ai/GeminiApiKeyModal";

interface AICopilotDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function AICopilotDialog({ open, onClose }: AICopilotDialogProps) {
  const rescheduleAll = useStudyStore((state) => state.rescheduleAll);
  const blocks = useStudyStore((state) => state.blocks);
  const subjects = useStudyStore((state) => state.subjects);

  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [geminiKeyOpen, setGeminiKeyOpen] = useState(false);

  // Common Gemini copilot executor
  const runCopilotRequest = async (userPrompt: string, routine?: string) => {
    setIsProcessing(true);
    soundFX.playClick();

    const storedKey =
      typeof window !== "undefined"
        ? localStorage.getItem("studyair-gemini-key")
        : null;

    try {
      const res = await fetch("/api/gemini/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          routine,
          blocks,
          subjects,
          apiKey: storedKey || undefined,
        }),
      });

      const data = await res.json();
      const cap = data.dailyCapMinutes || 240;
      rescheduleAll(cap);
      soundFX.playSessionSuccess();

      toast.success(data.recommendedAction || "Schedule Rebalanced with Gemini", {
        description: data.explanation || "Schedule updated respecting cognitive limits.",
      });
    } catch {
      rescheduleAll(240);
      toast.success("Schedule Rebalanced", {
        description: "Study blocks updated based on cognitive load distribution.",
      });
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  // Quick Action 1: Cognitive Load Balancing
  const handleBalanceCognitiveLoad = () => {
    runCopilotRequest("Interleave high and low cognitive strain units", "balance");
  };

  // Quick Action 2: Morning Deep Work
  const handleMorningDeepWork = () => {
    runCopilotRequest("Prioritize heavy problem solving in the morning hours", "morning");
  };

  // Quick Action 3: Exam Crunch Mode
  const handleExamCrunch = () => {
    runCopilotRequest("Expand study capacity for upcoming exam deadlines", "crunch");
  };

  // Quick Action 4: Spaced Repetition Catch-up
  const handleSpacedRepetitionCatchup = () => {
    runCopilotRequest("Catch up on active recall spaced repetition", "catchup");
  };

  // Natural Language Prompt Submission
  const handleSubmitPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    runCopilotRequest(prompt.trim());
    setPrompt("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl border-border bg-card p-6 sm:p-7 shadow-none">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                AI Schedule Assistant
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  ⚡ Gemini AI
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>Rebalance your schedule to prevent study burnout.</span>
                <button
                  type="button"
                  onClick={() => setGeminiKeyOpen(true)}
                  className="text-primary hover:underline flex items-center gap-1 font-medium text-[11px]"
                >
                  <Key className="h-3 w-3" />
                  Gemini Key
                </button>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Quick AI Routines */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block pb-2.5">
              Quick Actions
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={isProcessing}
                onClick={handleBalanceCognitiveLoad}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card/60 text-left transition-all duration-150 hover:border-primary/40 disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Balance Workload
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Evenly spaces hard topics across the week.
                  </p>
                </div>
              </button>

              <button
                disabled={isProcessing}
                onClick={handleMorningDeepWork}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card/60 text-left transition-all duration-150 hover:border-primary/40 disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                  <SunMedium className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Morning Focus
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Schedules hard topics in the morning hours.
                  </p>
                </div>
              </button>

              <button
                disabled={isProcessing}
                onClick={handleExamCrunch}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card/60 text-left transition-all duration-150 hover:border-primary/40 disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Exam Prep
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Adds extra study time before upcoming exams.
                  </p>
                </div>
              </button>

              <button
                disabled={isProcessing}
                onClick={handleSpacedRepetitionCatchup}
                className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card/60 text-left transition-all duration-150 hover:border-primary/40 disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Catch Up on Reviews
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Adds quick review sessions for completed topics.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Natural Language Prompt */}
          <form onSubmit={handleSubmitPrompt} className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Or Tell AI What To Change
            </span>
            <div className="relative">
              <Input
                placeholder="e.g., Free up Friday afternoon and move study to Saturday morning..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isProcessing}
                className="h-11 pr-12 text-xs bg-muted/20 border-border rounded-xl"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isProcessing || !prompt.trim()}
                className="absolute right-1.5 top-1.5 h-8 w-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter className="pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <GeminiApiKeyModal
        open={geminiKeyOpen}
        onClose={() => setGeminiKeyOpen(false)}
      />
    </Dialog>
  );
}
