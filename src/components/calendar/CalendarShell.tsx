"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Camera,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalendarStore } from "@/stores/calendarStore";
import { useIsMounted } from "@/lib/hooks/useMounted";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { CalendarSidebar } from "./CalendarSidebar";
import { BlockCard } from "./BlockCard";
import type { ScheduledBlockWithDetails, Subject } from "@/types/database";

interface CalendarShellProps {
  readonly blocks: ScheduledBlockWithDetails[];
  readonly subjects: Subject[];
  readonly onBlockClick: (block: ScheduledBlockWithDetails) => void;
  readonly onStartSession: (block: ScheduledBlockWithDetails) => void;
  readonly onSlotClick?: (date: Date, hour: number) => void;
  readonly onBlockMove?: (
    blockId: string,
    newSlotId: string
  ) => void;
  readonly onOpenSchedule?: () => void;
  readonly onAutoReschedule?: () => void;
  readonly onResetSchedule?: () => void;
  readonly onClearSchedule?: () => void;
  readonly onOpenAIPhoto?: () => void;
  readonly onOpenAICopilot?: () => void;
}

export function CalendarShell({
  blocks,
  subjects,
  onBlockClick,
  onStartSession,
  onSlotClick,
  onBlockMove,
  onOpenSchedule,
  onAutoReschedule,
  onResetSchedule,
  onClearSchedule,
  onOpenAIPhoto,
  onOpenAICopilot,
}: CalendarShellProps) {
  const {
    viewMode,
    selectedDate,
    setViewMode,
    goToToday,
    navigateForward,
    navigateBack,
  } = useCalendarStore();

  const [activeBlock, setActiveBlock] =
    useState<ScheduledBlockWithDetails | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const block = blocks.find((b) => b.id === event.active.id);
      if (block) setActiveBlock(block);
    },
    [blocks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveBlock(null);
      if (event.over && event.active.id !== event.over.id) {
        onBlockMove?.(String(event.active.id), String(event.over.id));
      }
    },
    [onBlockMove]
  );

  const isMounted = useIsMounted();

  const dateLabel =
    viewMode === "week"
      ? `Week of ${format(selectedDate, "MMM d, yyyy")}`
      : format(selectedDate, "EEEE, MMM d, yyyy");

  if (!isMounted) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/30 px-6 py-3">
          <div className="h-8 w-48 rounded-lg bg-muted/30 animate-pulse" />
          <div className="h-8 w-24 rounded-lg bg-muted/30 animate-pulse" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-16 rounded-xl bg-muted/20 animate-pulse" />
          <div className="h-64 rounded-xl bg-muted/15 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full flex-col bg-background">
        {/* ─── Unified Clean Toolbar ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-card/25 backdrop-blur-md px-4 sm:px-6 py-2.5 select-none">
          {/* Left: Navigation and Date */}
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 suppressHydrationWarning className="text-sm sm:text-base font-semibold tracking-tight text-foreground mr-1">
              {dateLabel}
            </h1>

            <div className="flex items-center rounded-lg border border-border/40 bg-muted/20 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={navigateBack}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                onClick={navigateForward}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 rounded-lg px-2.5 text-xs font-medium border-border/40 hover:bg-muted/30"
            >
              Today
            </Button>
          </div>

          {/* Right: View Switcher and Action Cluster */}
          <div className="flex items-center gap-2">
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as "day" | "week")}
            >
              <TabsList className="h-8 rounded-lg bg-muted/30 p-0.5 border border-border/30">
                <TabsTrigger value="day" className="h-7 rounded-md px-3 text-xs font-medium">
                  Day
                </TabsTrigger>
                <TabsTrigger value="week" className="h-7 rounded-md px-3 text-xs font-medium">
                  Week
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="h-4 w-[1px] bg-border/40 mx-1 hidden sm:block" />

            {/* AI Photo Scan Action */}
            {onOpenAIPhoto && (
              <Button
                size="sm"
                onClick={onOpenAIPhoto}
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-500 hover:to-indigo-500 border border-violet-400/20 transition-all"
                title="Scan syllabus, timetable, or notes with AI"
              >
                <Camera className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">AI Photo Scan</span>
              </Button>
            )}

            {/* AI Copilot Action */}
            {onOpenAICopilot && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenAICopilot}
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-medium border-border/40 hover:bg-muted/30"
                title="AI Schedule Copilot & Rebalancer"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="hidden lg:inline">AI Copilot</span>
              </Button>
            )}

            {/* Schedule Primary Action */}
            {onOpenSchedule && (
              <Button
                size="sm"
                onClick={onOpenSchedule}
                className="h-8 gap-1.5 rounded-lg px-3 text-xs font-medium shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                Schedule
              </Button>
            )}

            {/* Auto-Schedule Action */}
            {onAutoReschedule && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAutoReschedule}
                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs border-border/40 hover:bg-muted/30"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden md:inline">Auto-Schedule</span>
              </Button>
            )}

            {/* Reset to Baseline */}
            {onResetSchedule && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onResetSchedule}
                title="Reset baseline schedule"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden lg:inline ml-1">Reset</span>
              </Button>
            )}

            {/* Clear All */}
            {onClearSchedule && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSchedule}
                title="Clear calendar blocks"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* ─── Calendar Body & Sidebar ─── */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {viewMode === "week" ? (
              <WeekView
                selectedDate={selectedDate}
                blocks={blocks}
                onBlockClick={onBlockClick}
                onStartSession={onStartSession}
                onSlotClick={onSlotClick}
              />
            ) : (
              <DayView
                selectedDate={selectedDate}
                blocks={blocks}
                onBlockClick={onBlockClick}
                onStartSession={onStartSession}
                onSlotClick={onSlotClick}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="hidden xl:block">
            <CalendarSidebar
              selectedDate={selectedDate}
              blocks={blocks}
              subjects={subjects}
            />
          </div>
        </div>
      </div>

      {/* ─── Drag Overlay ─── */}
      <DragOverlay>
        {activeBlock ? (
          <BlockCard
            block={activeBlock}
            compact
            style={{
              width: 170,
              opacity: 0.9,
              transform: "rotate(2deg)",
            }}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
