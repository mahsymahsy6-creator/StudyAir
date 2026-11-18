"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CognitiveLoad } from "@/types/database";

interface CognitiveLoadBadgeProps {
  readonly load: CognitiveLoad;
  readonly size?: "sm" | "default";
}

const CONFIG: Record<
  CognitiveLoad,
  { label: string; className: string }
> = {
  HIGH: {
    label: "High",
    className: "bg-cognitive-high/15 text-cognitive-high border-cognitive-high/30",
  },
  MEDIUM: {
    label: "Med",
    className:
      "bg-cognitive-medium/15 text-cognitive-medium border-cognitive-medium/30",
  },
  LOW: {
    label: "Low",
    className: "bg-cognitive-low/15 text-cognitive-low border-cognitive-low/30",
  },
};

export function CognitiveLoadBadge({
  load,
  size = "default",
}: CognitiveLoadBadgeProps) {
  const { label, className } = CONFIG[load];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium transition-colors duration-150",
        className,
        size === "sm" && "px-1.5 py-0 text-[10px]"
      )}
    >
      {label}
    </Badge>
  );
}
