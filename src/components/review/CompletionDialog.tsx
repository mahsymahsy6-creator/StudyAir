"use client";

import { useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
} from "lucide-react";
import type { ConfidenceRating } from "@/types/database";
import { cn } from "@/lib/utils";
import { soundFX } from "@/lib/sound";

interface CompletionDialogProps {
  readonly open: boolean;
  readonly unitTitle: string;
  readonly onRate: (rating: ConfidenceRating) => void;
  readonly onClose: () => void;
}

const RATINGS: {
  value: ConfidenceRating;
  label: string;
  sublabel: string;
  icon: typeof RotateCcw;
  className: string;
  key: string;
}[] = [
  {
    value: 1,
    label: "Again",
    sublabel: "Review tomorrow",
    icon: RotateCcw,
    className:
      "border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive",
    key: "1",
  },
  {
    value: 2,
    label: "Hard",
    sublabel: "Shorter interval",
    icon: ThumbsDown,
    className:
      "border-warning/30 bg-warning/5 hover:bg-warning/10 text-warning",
    key: "2",
  },
  {
    value: 3,
    label: "Good",
    sublabel: "Standard interval",
    icon: ThumbsUp,
    className:
      "border-info/30 bg-info/5 hover:bg-info/10 text-info",
    key: "3",
  },
  {
    value: 4,
    label: "Easy",
    sublabel: "Longer interval",
    icon: Sparkles,
    className:
      "border-success/30 bg-success/5 hover:bg-success/10 text-success",
    key: "4",
  },
];

export function CompletionDialog({
  open,
  unitTitle,
  onRate,
  onClose,
}: CompletionDialogProps) {
  const handleSelect = useCallback(
    (rating: ConfidenceRating) => {
      soundFX.playSessionSuccess();
      onRate(rating);
    },
    [onRate]
  );

  // Keyboard shortcuts 1-4
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 4) {
        handleSelect(num as ConfidenceRating);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleSelect]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-border/40 bg-card">
        <DialogHeader>
          <DialogTitle>How well do you know this?</DialogTitle>
          <DialogDescription className="text-sm">
            Rate your confidence for &ldquo;{unitTitle}&rdquo; to schedule
            the next review.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {RATINGS.map(
            ({ value, label, sublabel, icon: Icon, className, key }) => (
              <button
                key={value}
                onClick={() => handleSelect(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-4 transition-all hover:scale-[1.03] active:scale-[0.98]",
                  className
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-[10px] opacity-70">{sublabel}</span>
                <kbd className="mt-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {key}
                </kbd>
              </button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
