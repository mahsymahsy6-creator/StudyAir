/**
 * StudyAir Mobile — Timetable Import Wizard Controller
 * 
 * Single source of truth for the 5-step Timetable Import Wizard.
 * Survives component unmounting, screen transitions, phone rotation,
 * native camera activity launches, and app backgrounding.
 */

import { useState, useEffect } from "react";
import { PeriodTime } from "../types";
import { TimetableReviewItem } from "../lib/timetableParser";
import { DEFAULT_PERIOD_TIMES } from "../lib/storage";

export type WizardStep = 1 | 2 | 3 | 4 | 5;
// 1: Choose Source
// 2: Processing (AI OCR / Parser)
// 3: Review Results
// 4: School Bell Schedule (Period Times)
// 5: Confirm Summary & Save

export type WizardSource = "photo" | "text" | "file" | "manual";

export interface TimetableWizardState {
  currentStep: WizardStep;
  sourceType: WizardSource | null;
  rawInput: string;
  capturedImageUri: string | null;
  capturedImageBase64: string | null;
  scanStage: "preparing" | "reading" | "checking";
  isScanning: boolean;
  scanError: string | null;
  reviewItems: TimetableReviewItem[];
  periodTimes: PeriodTime[];
  detectedClasses: string[];
  selectedClass: string | null;
  saveMode: "replace" | "merge";
  hasEdits: boolean;
}

const initialWizardState: TimetableWizardState = {
  currentStep: 1,
  sourceType: null,
  rawInput: "",
  capturedImageUri: null,
  capturedImageBase64: null,
  scanStage: "preparing",
  isScanning: false,
  scanError: null,
  reviewItems: [],
  periodTimes: [],
  detectedClasses: [],
  selectedClass: null,
  saveMode: "replace",
  hasEdits: false,
};

// Singleton in-memory state that survives component remounts
let wizardState: TimetableWizardState = { ...initialWizardState };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export const timetableWizardController = {
  getState: (): TimetableWizardState => wizardState,

  setStep: (step: WizardStep) => {
    wizardState = { ...wizardState, currentStep: step };
    notify();
  },

  setSource: (source: WizardSource) => {
    wizardState = { ...wizardState, sourceType: source };
    notify();
  },

  setRawInput: (text: string) => {
    wizardState = { ...wizardState, rawInput: text, hasEdits: true };
    notify();
  },

  setCapturedImage: (uri: string | null, base64: string | null) => {
    wizardState = {
      ...wizardState,
      capturedImageUri: uri,
      capturedImageBase64: base64,
      hasEdits: uri !== null,
    };
    notify();
  },

  setScanState: (
    isScanning: boolean,
    stage: "preparing" | "reading" | "checking" = "preparing",
    error: string | null = null
  ) => {
    wizardState = {
      ...wizardState,
      isScanning,
      scanStage: stage,
      scanError: error,
    };
    notify();
  },

  setReviewItems: (items: TimetableReviewItem[]) => {
    wizardState = {
      ...wizardState,
      reviewItems: items,
      hasEdits: true,
    };
    notify();
  },

  updateReviewItem: (id: string, updates: Partial<TimetableReviewItem>) => {
    wizardState = {
      ...wizardState,
      reviewItems: wizardState.reviewItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
      hasEdits: true,
    };
    notify();
  },

  deleteReviewItem: (id: string) => {
    wizardState = {
      ...wizardState,
      reviewItems: wizardState.reviewItems.filter((item) => item.id !== id),
      hasEdits: true,
    };
    notify();
  },

  addReviewItem: (item: TimetableReviewItem) => {
    wizardState = {
      ...wizardState,
      reviewItems: [...wizardState.reviewItems, item],
      hasEdits: true,
    };
    notify();
  },

  renameSubjectEverywhere: (
    oldName: string,
    newName: string,
    subjectId?: string,
    color?: string
  ) => {
    wizardState = {
      ...wizardState,
      reviewItems: wizardState.reviewItems.map((item) => {
        if (
          item.matchedSubjectName.toLowerCase() === oldName.toLowerCase() ||
          item.rawSubject.toLowerCase() === oldName.toLowerCase()
        ) {
          return {
            ...item,
            matchedSubjectName: newName,
            subjectId: subjectId !== undefined ? subjectId : item.subjectId,
            matchedSubjectColor: color || item.matchedSubjectColor,
            isNewSubject: !subjectId,
            confidence: 1.0,
          };
        }
        return item;
      }),
      hasEdits: true,
    };
    notify();
  },

  mergeDuplicateReviewSlots: (): number => {
    const beforeCount = wizardState.reviewItems.length;
    const seen = new Map<string, TimetableReviewItem>();
    for (const item of wizardState.reviewItems) {
      const key = `${item.day}-${item.periodNumber}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const existing = seen.get(key)!;
        seen.set(key, {
          ...existing,
          room: existing.room || item.room,
          teacher: existing.teacher || item.teacher,
        });
      }
    }
    const mergedList = Array.from(seen.values());
    const mergedCount = beforeCount - mergedList.length;
    wizardState = {
      ...wizardState,
      reviewItems: mergedList,
      hasEdits: true,
    };
    notify();
    return mergedCount;
  },

  copyDayReviewItems: (
    fromDay: number,
    toDay: number,
    mode: "replace" | "append" = "replace"
  ) => {
    const sourceItems = wizardState.reviewItems.filter((i) => i.day === fromDay);
    if (sourceItems.length === 0) return 0;

    let baseItems = wizardState.reviewItems;
    if (mode === "replace") {
      baseItems = baseItems.filter((i) => i.day !== toDay);
    }

    const copied = sourceItems.map((src) => ({
      ...src,
      id: `rev-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day: toDay,
    }));

    wizardState = {
      ...wizardState,
      reviewItems: [...baseItems, ...copied],
      hasEdits: true,
    };
    notify();
    return copied.length;
  },

  setPeriodTimes: (times: PeriodTime[]) => {
    wizardState = {
      ...wizardState,
      periodTimes: times,
      hasEdits: true,
    };
    notify();
  },

  updatePeriodTime: (periodNumber: number, updates: Partial<PeriodTime>) => {
    wizardState = {
      ...wizardState,
      periodTimes: wizardState.periodTimes.map((p) =>
        p.periodNumber === periodNumber ? { ...p, ...updates } : p
      ),
      hasEdits: true,
    };
    notify();
  },

  setDetectedClasses: (classes: string[], selected: string | null = null) => {
    wizardState = {
      ...wizardState,
      detectedClasses: classes,
      selectedClass: selected,
    };
    notify();
  },

  setSelectedClass: (cls: string | null) => {
    wizardState = {
      ...wizardState,
      selectedClass: cls,
      hasEdits: true,
    };
    notify();
  },

  setSaveMode: (mode: "replace" | "merge") => {
    wizardState = {
      ...wizardState,
      saveMode: mode,
    };
    notify();
  },

  markEdited: () => {
    wizardState = {
      ...wizardState,
      hasEdits: true,
    };
    notify();
  },

  resetWizard: (initialTimes?: PeriodTime[]) => {
    wizardState = {
      ...initialWizardState,
      periodTimes:
        initialTimes && initialTimes.length > 0
          ? initialTimes
          : wizardState.periodTimes.length > 0
          ? wizardState.periodTimes
          : DEFAULT_PERIOD_TIMES,
    };
    notify();
  },
};

/**
 * React Hook to subscribe to the Timetable Wizard Controller.
 */
export function useTimetableWizard(): [
  TimetableWizardState,
  typeof timetableWizardController
] {
  const [state, setState] = useState<TimetableWizardState>(wizardState);

  useEffect(() => {
    const handler = () => setState(wizardState);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return [state, timetableWizardController];
}
