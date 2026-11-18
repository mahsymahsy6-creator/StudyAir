/**
 * StudyAir Mobile — Indonesian Date Hint Parser
 * 
 * Extracts date hints from freeform task titles, notes, or messages.
 * 
 * Matches:
 * - "besok", "bsk", "tomorrow" -> +1 day
 * - "lusa" -> +2 days
 * - "minggu depan", "next week" -> +7 days
 * - "senin depan", "selasa depan", etc. -> target weekday in next week
 * - "hari senin", "hari selasa", etc. (or standalone weekday mention) -> upcoming weekday
 * - Explicit dates: "tgl 25", "tanggal 28 oktober", "28/10", "28-10-2026", "2026-10-28"
 */

import { format, addDays, parseISO, startOfDay, setMonth, setDate } from "date-fns";

export interface DateHintResult {
  suggestedDate: string; // "YYYY-MM-DD"
  matchedPhrase: string; // The text substring matched
  label: string; // Friendly Indonesian label, e.g. "Besok (24 Okt)"
}

const INDO_MONTHS: Record<string, number> = {
  jan: 0, januari: 0,
  feb: 1, februari: 1,
  mar: 2, maret: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5,
  jul: 6, juli: 6,
  agu: 7, agustus: 7, aug: 7,
  sep: 8, september: 8,
  okt: 9, oktober: 9, oct: 9,
  nov: 10, november: 10,
  des: 11, desember: 11, dec: 11,
};

const INDO_WEEKDAYS: Record<string, number> = {
  senin: 1, mon: 1, monday: 1,
  selasa: 2, tue: 2, tuesday: 2,
  rabu: 3, rabo: 3, wed: 3, wednesday: 3,
  kamis: 4, thu: 4, thursday: 4,
  jumat: 5, "jum'at": 5, fri: 5, friday: 5,
  sabtu: 6, sat: 6, saturday: 6,
  minggu: 7, ahad: 7, sun: 7, sunday: 7,
};

const WEEKDAY_LABELS: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

function parseCoreDateHint(rawLower: string, baseDate: Date): DateHintResult | null {
  // 1. ISO date: YYYY-MM-DD
  const isoMatch = rawLower.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return {
      suggestedDate: isoMatch[0],
      matchedPhrase: isoMatch[0],
      label: isoMatch[0],
    };
  }

  // 2. Explicit "DD Month [YYYY]" or "tgl/tanggal DD [Month] [YYYY]"
  const monthNamesPattern = Object.keys(INDO_MONTHS).join("|");
  const dayMonthRegex = new RegExp(
    `\\b(?:(?:tgl|tanggal)\\s+)?(\\d{1,2})\\s+(${monthNamesPattern})(?:\\s+(\\d{4}))?\\b`
  );
  const dayMonthMatch = rawLower.match(dayMonthRegex);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthStr = dayMonthMatch[2];
    const yearStr = dayMonthMatch[3];
    if (day >= 1 && day <= 31 && INDO_MONTHS[monthStr] !== undefined) {
      const targetMonth = INDO_MONTHS[monthStr];
      let targetYear = yearStr ? parseInt(yearStr, 10) : baseDate.getFullYear();
      const testDate = new Date(targetYear, targetMonth, day);
      if (!yearStr && testDate < baseDate) {
        targetYear += 1;
      }
      const target = new Date(targetYear, targetMonth, day);
      return {
        suggestedDate: format(target, "yyyy-MM-dd"),
        matchedPhrase: dayMonthMatch[0],
        label: `Tgl ${day} ${format(target, "MMM yyyy")}`,
      };
    }
  }

  // 3. "tgl/tanggal DD" (without month name, assumes current or next month)
  const tglOnlyMatch = rawLower.match(/\b(?:tgl|tanggal)\s+(\d{1,2})(?:\s+(\d{4}))?\b/);
  if (tglOnlyMatch) {
    const day = parseInt(tglOnlyMatch[1], 10);
    const yearStr = tglOnlyMatch[2];
    if (day >= 1 && day <= 31) {
      let targetMonth = baseDate.getMonth();
      let targetYear = yearStr ? parseInt(yearStr, 10) : baseDate.getFullYear();
      let target = new Date(targetYear, targetMonth, day);
      if (!yearStr && target < baseDate) {
        targetMonth += 1;
        if (targetMonth > 11) {
          targetMonth = 0;
          targetYear += 1;
        }
        target = new Date(targetYear, targetMonth, day);
      }
      return {
        suggestedDate: format(target, "yyyy-MM-dd"),
        matchedPhrase: tglOnlyMatch[0],
        label: `Tgl ${day} ${format(target, "MMM yyyy")}`,
      };
    }
  }

  // 4. Numeric slash or dash date: DD/MM[/YYYY] or DD-MM-YYYY
  const slashMatch = rawLower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}|\d{2}))?\b/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      let year = slashMatch[3] ? parseInt(slashMatch[3], 10) : baseDate.getFullYear();
      if (year < 100) year += 2000;
      let target = new Date(year, month, day);
      if (!slashMatch[3] && target < baseDate) {
        target = new Date(year + 1, month, day);
      }
      return {
        suggestedDate: format(target, "yyyy-MM-dd"),
        matchedPhrase: slashMatch[0],
        label: format(target, "d MMM yyyy"),
      };
    }
  }

  // 5. Relative N days / N weeks ("3 hari lagi", "dalam 2 hari", "2 minggu lagi")
  const relDaysMatch = rawLower.match(/\b(?:(\d{1,2})\s*hari\s+lagi|dalam\s+(\d{1,2})\s*hari|in\s+(\d{1,2})\s*days?)\b/);
  if (relDaysMatch) {
    const nDays = parseInt(relDaysMatch[1] || relDaysMatch[2] || relDaysMatch[3], 10);
    if (nDays > 0 && nDays <= 90) {
      const target = addDays(baseDate, nDays);
      return {
        suggestedDate: format(target, "yyyy-MM-dd"),
        matchedPhrase: relDaysMatch[0],
        label: `${nDays} hari lagi (${format(target, "d MMM")})`,
      };
    }
  }

  const relWeeksMatch = rawLower.match(/\b(?:(\d{1,2})\s*(?:minggu|pekan)\s+lagi|dalam\s+(\d{1,2})\s*(?:minggu|pekan))\b/);
  if (relWeeksMatch) {
    const nWeeks = parseInt(relWeeksMatch[1] || relWeeksMatch[2], 10);
    if (nWeeks > 0 && nWeeks <= 12) {
      const target = addDays(baseDate, nWeeks * 7);
      return {
        suggestedDate: format(target, "yyyy-MM-dd"),
        matchedPhrase: relWeeksMatch[0],
        label: `${nWeeks} minggu lagi (${format(target, "d MMM")})`,
      };
    }
  }

  // 6. Minggu Depan / Pekan Depan / Next Week (+7 days)
  const mingguDepanMatch = rawLower.match(/\b(minggu depan|pekan depan|next week)\b/);
  if (mingguDepanMatch) {
    const target = addDays(baseDate, 7);
    return {
      suggestedDate: format(target, "yyyy-MM-dd"),
      matchedPhrase: mingguDepanMatch[0],
      label: `Minggu depan (${format(target, "d MMM")})`,
    };
  }

  // 7. "[Weekday] Depan" (e.g. "Senin depan", "Jumat depan")
  const weekdayDepanRegex = /\b(senin|selasa|rabu|rabo|kamis|jumat|jum'at|sabtu|minggu|ahad)\s+depan\b/;
  const wdDepanMatch = rawLower.match(weekdayDepanRegex);
  if (wdDepanMatch) {
    const targetWd = INDO_WEEKDAYS[wdDepanMatch[1]];
    const currentWd = baseDate.getDay() === 0 ? 7 : baseDate.getDay();

    let daysToAdd = (targetWd - currentWd + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    if (daysToAdd < 7) daysToAdd += 7;

    const target = addDays(baseDate, daysToAdd);
    const capName = WEEKDAY_LABELS[targetWd] || wdDepanMatch[1];
    return {
      suggestedDate: format(target, "yyyy-MM-dd"),
      matchedPhrase: wdDepanMatch[0],
      label: `${capName} depan (${format(target, "d MMM")})`,
    };
  }

  // 8. Hari Ini / Malam Ini / Sore Ini / Today (+0 days)
  const todayMatch = rawLower.match(/\b(hari ini|malam ini|sore ini|siang ini|pagi ini|today|tonight)\b/);
  if (todayMatch) {
    return {
      suggestedDate: format(baseDate, "yyyy-MM-dd"),
      matchedPhrase: todayMatch[0],
      label: `Hari ini (${format(baseDate, "d MMM")})`,
    };
  }

  // 9. Besok / Bsk / Esok / Tomorrow (+1 day)
  const besokMatch = rawLower.match(/\b(besok|bsk|esok|tomorrow)\b/);
  if (besokMatch) {
    const target = addDays(baseDate, 1);
    return {
      suggestedDate: format(target, "yyyy-MM-dd"),
      matchedPhrase: besokMatch[0],
      label: `Besok (${format(target, "d MMM")})`,
    };
  }

  // 10. Lusa (+2 days)
  const lusaMatch = rawLower.match(/\b(lusa)\b/);
  if (lusaMatch) {
    const target = addDays(baseDate, 2);
    return {
      suggestedDate: format(target, "yyyy-MM-dd"),
      matchedPhrase: lusaMatch[0],
      label: `Lusa (${format(target, "d MMM")})`,
    };
  }

  // 11. "Hari [Weekday]" or standalone Weekday (e.g. "Hari Jumat", "dikumpul Kamis", "Senin")
  const wdRegex = /\b(?:(hari)\s+)?(senin|selasa|rabu|rabo|kamis|jumat|jum'at|sabtu|minggu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;
  const wdMatch = rawLower.match(wdRegex);
  if (wdMatch) {
    const targetWd = INDO_WEEKDAYS[wdMatch[2]];
    const currentWd = baseDate.getDay() === 0 ? 7 : baseDate.getDay();
    let daysToAdd = (targetWd - currentWd + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7;
    const target = addDays(baseDate, daysToAdd);
    const capName = WEEKDAY_LABELS[targetWd] || wdMatch[2];
    return {
      suggestedDate: format(target, "yyyy-MM-dd"),
      matchedPhrase: wdMatch[0],
      label: `Hari ${capName} (${format(target, "d MMM")})`,
    };
  }

  return null;
}

/**
 * Parses freeform text and returns the most specific Indonesian date hint, or null.
 * Prioritizes explicit deadline clauses (e.g. "dikumpul ...", "deadline ...", "tenggat ...")
 * over leading context words (e.g. "Besok PR Matematika dikumpul hari Senin").
 */
export function parseIndonesianDateHint(
  text: string,
  referenceDate: Date | string = new Date()
): DateHintResult | null {
  if (!text || !text.trim()) return null;

  const rawLower = text.toLowerCase();
  const baseDate = startOfDay(
    typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate
  );

  // Priority 1: Check explicit deadline trigger phrase first ("dikumpul ...", "deadline ...", "tenggat ...")
  const deadlineClauseMatch = rawLower.match(
    /\b(?:dikumpul(?:kan)?|kumpul|tenggat|deadline|batas(?:\s+waktu)?|paling\s+lambat|due)\s*[:\-]?\s*([^.,;\n]+)/
  );
  if (deadlineClauseMatch && deadlineClauseMatch[1]) {
    const clauseHint = parseCoreDateHint(deadlineClauseMatch[1], baseDate);
    if (clauseHint) {
      return clauseHint;
    }
  }

  return parseCoreDateHint(rawLower, baseDate);
}
