import { create } from "zustand";

type ViewMode = "day" | "week";

interface CalendarState {
  viewMode: ViewMode;
  selectedDate: Date;
  dragPreviewBlockId: string | null;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date) => void;
  goToToday: () => void;
  navigateForward: () => void;
  navigateBack: () => void;
  setDragPreview: (blockId: string | null) => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  viewMode: "week",
  selectedDate: new Date(),
  dragPreviewBlockId: null,

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedDate: (date) => set({ selectedDate: date }),

  goToToday: () => set({ selectedDate: new Date() }),

  navigateForward: () => {
    const { selectedDate, viewMode } = get();
    const next = new Date(selectedDate);
    if (viewMode === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    set({ selectedDate: next });
  },

  navigateBack: () => {
    const { selectedDate, viewMode } = get();
    const prev = new Date(selectedDate);
    if (viewMode === "week") {
      prev.setDate(prev.getDate() - 7);
    } else {
      prev.setDate(prev.getDate() - 1);
    }
    set({ selectedDate: prev });
  },

  setDragPreview: (blockId) => set({ dragPreviewBlockId: blockId }),
}));
