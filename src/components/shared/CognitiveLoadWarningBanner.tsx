"use client";

import { useMemo } from "react";
import { AlertTriangle, Brain, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStudyStore } from "@/stores/studyStore";
import { analyzeCognitiveLoad } from "@/lib/engine/cognitive-load";
import { useIsMounted } from "@/lib/hooks/useMounted";
import { cn } from "@/lib/utils";

export function CognitiveLoadWarningBanner() {
  const isMounted = useIsMounted();
  const blocks = useStudyStore((state) => state.blocks);
  const dismissedWarningIds = useStudyStore((state) => state.dismissedWarningIds);
  const dismissWarning = useStudyStore((state) => state.dismissWarning);

  const warnings = useMemo(() => {
    const all = analyzeCognitiveLoad(blocks);
    return all.filter((w) => !dismissedWarningIds.includes(w.id));
  }, [blocks, dismissedWarningIds]);

  if (!isMounted || warnings.length === 0) return null;

  const warning = warnings[0];

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b px-4 py-2 text-xs transition-all",
        warning.type === "CONSECUTIVE_HIGH"
          ? "border-amber-500/20 bg-amber-500/[0.06] text-amber-300"
          : "border-purple-500/20 bg-purple-500/[0.06] text-purple-300"
      )}
    >
      <div className="flex items-center gap-2.5 truncate">
        {warning.type === "CONSECUTIVE_HIGH" ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        ) : (
          <Brain className="h-4 w-4 shrink-0 text-purple-400" />
        )}

        <Badge
          variant="outline"
          className={cn(
            "h-4 text-[10px] px-1.5 py-0 border-current font-semibold tracking-wider shrink-0",
            warning.type === "CONSECUTIVE_HIGH"
              ? "text-amber-400 border-amber-500/40"
              : "text-purple-400 border-purple-500/40"
          )}
        >
          {warning.formattedDate}
        </Badge>

        <span className="truncate font-medium text-foreground/90">
          {warning.message}
        </span>

        <span className="hidden xl:inline text-muted-foreground/80 font-normal">
          • {warning.recommendation}
        </span>
      </div>

      <button
        onClick={() => dismissWarning(warning.id)}
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground shrink-0"
        aria-label="Dismiss warning"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
