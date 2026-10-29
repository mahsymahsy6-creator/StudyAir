import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TimerMode } from "@/types/database";
import { soundFX } from "@/lib/sound";

interface TimerState {
  isActive: boolean;
  isPaused: boolean;
  mode: TimerMode;
  blockId: string | null;
  studyUnitTitle: string;
  subjectTitle: string;
  subjectColor: string;
  plannedMinutes: number;
  elapsedSeconds: number;
  pomodoroCount: number;
  pomodoroLength: number; // seconds
  breakLength: number; // seconds
  isOnBreak: boolean;

  // Actions
  startSession: (params: {
    blockId: string;
    mode: TimerMode;
    studyUnitTitle: string;
    subjectTitle: string;
    subjectColor: string;
    plannedMinutes: number;
    pomodoroLength?: number;
    breakLength?: number;
  }) => void;
  tick: () => void;
  pause: () => void;
  resume: () => void;
  startBreak: () => void;
  endBreak: () => void;
  completeSession: () => void;
  resetTimer: () => void;
  setMode: (mode: TimerMode) => void;
}

const DEFAULT_POMODORO = 25 * 60; // 25 minutes in seconds
const DEFAULT_BREAK = 5 * 60; // 5 minutes in seconds

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isActive: false,
  isPaused: false,
  mode: "POMODORO",
  blockId: null,
  studyUnitTitle: "",
  subjectTitle: "",
  subjectColor: "",
  plannedMinutes: 0,
  elapsedSeconds: 0,
  pomodoroCount: 0,
  pomodoroLength: DEFAULT_POMODORO,
  breakLength: DEFAULT_BREAK,
  isOnBreak: false,

  setMode: (mode) => set({ mode }),

  startSession: ({
    blockId,
    mode,
    studyUnitTitle,
    subjectTitle,
    subjectColor,
    plannedMinutes,
    pomodoroLength,
    breakLength,
  }) =>
    set({
      isActive: true,
      isPaused: false,
      mode,
      blockId,
      studyUnitTitle,
      subjectTitle,
      subjectColor,
      plannedMinutes,
      elapsedSeconds: 0,
      pomodoroCount: 0,
      pomodoroLength: pomodoroLength
        ? pomodoroLength * 60
        : DEFAULT_POMODORO,
      breakLength: breakLength ? breakLength * 60 : DEFAULT_BREAK,
      isOnBreak: false,
    }),

  tick: () => {
    const state = get();
    if (!state.isActive || state.isPaused) return;

    const newElapsed = state.elapsedSeconds + 1;

    // Pomodoro mode: check if a pomodoro cycle completed
    if (
      state.mode === "POMODORO" &&
      !state.isOnBreak &&
      newElapsed > 0 &&
      newElapsed % state.pomodoroLength === 0
    ) {
      soundFX.playPomodoroEnd();
      set({
        elapsedSeconds: newElapsed,
        pomodoroCount: state.pomodoroCount + 1,
        isOnBreak: true,
      });
      return;
    }

    set({ elapsedSeconds: newElapsed });
  },

  pause: () => set({ isPaused: true }),

  resume: () => set({ isPaused: false }),

  startBreak: () => {
    soundFX.playPomodoroEnd();
    set({ isOnBreak: true });
  },

  endBreak: () => {
    soundFX.playBreakEnd();
    set({ isOnBreak: false });
  },

  completeSession: () => {
    soundFX.playSessionSuccess();
    set({
      isActive: false,
      isPaused: false,
      isOnBreak: false,
    });
  },

  resetTimer: () =>
    set({
      isActive: false,
      isPaused: false,
      mode: "POMODORO",
      blockId: null,
      studyUnitTitle: "",
      subjectTitle: "",
      subjectColor: "",
      plannedMinutes: 0,
      elapsedSeconds: 0,
      pomodoroCount: 0,
      pomodoroLength: DEFAULT_POMODORO,
      breakLength: DEFAULT_BREAK,
      isOnBreak: false,
    }),
}),
    {
      name: "studyair-timer-storage",
    }
  )
);
