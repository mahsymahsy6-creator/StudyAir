/**
 * StudyAir Mobile — Date & Days Left Utilities
 * 
 * Provides unified, timezone-safe calendar day calculations and
 * localized Indonesian date formatting.
 */

import { format, parseISO, isValid, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { getLanguage } from "./i18n";

/**
 * Formats a Date into a local "YYYY-MM-DD" calendar string.
 */
export function toLocalDateStr(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Adds a number of calendar days to a "YYYY-MM-DD" string in local time
 * and returns the resulting local "YYYY-MM-DD" string.
 */
export function addDaysLocal(dateStr: string, days: number): string {
  return toLocalDateStr(addDays(parseLocalMidnight(dateStr), days));
}

/**
 * Parses a "YYYY-MM-DD" string into a Date at local midnight.
 * Avoids UTC timezone shifts where "2026-11-25" becomes 2026-11-24 in negative timezones
 * or causes fractional day differences.
 */
export function parseLocalMidnight(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0);
  }
  if (!dateInput || typeof dateInput !== "string") {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  // YYYY-MM-DD
  const parts = dateInput.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d, 0, 0, 0, 0);
    }
  }
  const parsed = parseISO(dateInput);
  if (isValid(parsed)) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  }
  const fallback = new Date();
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0);
}

export interface DaysLeftResult {
  days: number;
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  isPassed: boolean;
}

/**
 * Shared Days Left calculation using local calendar dates (not 24-hour hour math).
 * On 2026-10-25, 2026-11-25 returns exactly 31.
 */
export function calculateDaysLeft(targetDateStr: string | Date, baseDate: Date = new Date()): DaysLeftResult {
  const targetMidnight = parseLocalMidnight(targetDateStr);
  const baseMidnight = parseLocalMidnight(baseDate);

  const diffMs = targetMidnight.getTime() - baseMidnight.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  const isEn = getLanguage() === "en";

  let label: string;
  if (diffDays < 0) {
    label = isEn ? "Passed" : "Sudah lewat";
  } else if (diffDays === 0) {
    label = isEn ? "Today" : "Hari ini";
  } else if (diffDays === 1) {
    label = isEn ? "Tomorrow" : "Besok";
  } else {
    label = isEn ? `${diffDays} days left` : `${diffDays} hari lagi`;
  }

  return {
    days: diffDays,
    label,
    isToday: diffDays === 0,
    isTomorrow: diffDays === 1,
    isPassed: diffDays < 0,
  };
}

/**
 * Locale-aware date formatter using current app language as default.
 * Example outputs: "Minggu, 25 Okt", "Sen, 26 Okt", "25 Nov 2026".
 */
export function formatLocaleDate(
  dateInput: Date | string,
  patternStr: string = "EEEE, d MMM yyyy",
  locale: "id" | "en" = getLanguage()
): string {
  try {
    const date = dateInput instanceof Date ? dateInput : parseLocalMidnight(dateInput);
    if (!isValid(date)) return String(dateInput);
    return format(date, patternStr, {
      locale: locale === "id" ? idLocale : undefined,
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats study time in minutes.
 * Under 1 hour: "0m", "25m", "45m" (never "0h" or "0.4h").
 * 1 hour or more: "1j", "1j 10m", "2j 30m".
 */
export function formatStudyMinutes(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes || 0));
  if (mins < 60) {
    return `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    return `${hours}j 0m`;
  }
  return `${hours}j ${remainingMins}m`;
}
