/**
 * StudyAir Mobile — Haptic Feedback Engine (Phase 12)
 * 
 * Provides tactile vibration patterns for mobile interactions:
 * - Task checkbox toggle (crisp light tap)
 * - Timer completion / milestone accomplished (celebratory pattern)
 * - Danger / Error (double vibration)
 * - Tab selection / navigation (subtle micro-tap)
 */

import { Vibration, Platform } from "react-native";

export const HapticFeedback = {
  /**
   * Subtle micro-tap for buttons, tabs, chips
   */
  light: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate(15);
      } catch {
        // Safe fallback
      }
    }
  },

  /**
   * Crisp feedback for task checkboxes and checklist toggles
   */
  taskToggle: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate(25);
      } catch {
        // Safe fallback
      }
    }
  },

  /**
   * Success fanfare vibration for completing study sessions or all milestones
   */
  success: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate([0, 30, 60, 40]);
      } catch {
        // Safe fallback
      }
    }
  },

  /**
   * Heavy tap for deletions or resets
   */
  heavy: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate(50);
      } catch {
        // Safe fallback
      }
    }
  },

  /**
   * Double warning tap for errors or quota limits
   */
  warning: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate([0, 35, 70, 35]);
      } catch {
        // Safe fallback
      }
    }
  },

  /**
   * Celebratory fanfare vibration rhythm for milestone unlocks
   */
  celebration: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate([0, 35, 70, 45, 70, 90]);
      } catch {
        // Safe fallback
      }
    }
  },

  /**
   * Subtle curious double micro-pulse for inspecting locked secret milestones
   */
  mysteryClue: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate([0, 20, 45, 20]);
      } catch {
        // Safe fallback
      }
    }
  },

  /**
   * Suspenseful pulse into burst for secret milestone reveal
   */
  mysteryReveal: () => {
    if (Platform.OS === "android" || Platform.OS === "ios") {
      try {
        Vibration.vibrate([0, 45, 90, 30, 40, 70]);
      } catch {
        // Safe fallback
      }
    }
  },
};
