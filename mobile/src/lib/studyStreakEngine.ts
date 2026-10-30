/**
 * StudyAir Mobile — Study Streak Engine (Step 4)
 * 
 * Single source of truth for:
 * - StudyDay derivation (focus logs, completed tasks, completed topics)
 * - Anti-cheat validation (task < 2 min disqualified, focus < 10 min disqualified)
 * - Required days vs Free days (weekends & holidays are free by default)
 * - Current streak, best streak, and "terancam" (at-risk) state
 * - Tiered milestones (3, 7, 14, 21, 30, 45, 60, 90, 120, 150, 180, 270, 365, +100d)
 */

import { format, subDays, addDays, parseISO, isSameDay } from "date-fns";
import { Task, FocusLog, StudyUnit, TimetableEntry, DayOff, StudyBlock } from "../types";
import { parseLocalMidnight } from "./dateUtils";

export type MilestoneTier = "bronze" | "silver" | "gold" | "rainbow";

export type MascotStageId = "egg" | "baby" | "winged" | "deity";

export interface MascotStage {
  id: MascotStageId;
  stageNumber: number;
  name: string;
  minDays: number;
  maxDays: number;
  iconName: string;
  emoji: string;
  tagline: string;
  lore: string;
  themeColor: string;
}

export const MASCOT_STAGES: MascotStage[] = [
  {
    id: "egg",
    stageNumber: 1,
    name: "Telur Naga Api",
    minDays: 0,
    maxDays: 6,
    iconName: "egg",
    emoji: "🥚",
    tagline: "Telur naga apimu mulai hangat!",
    lore: "Belajar konsisten hingga 7 hari untuk memecahkan cangkang dan menetaskannya.",
    themeColor: "#FF9600",
  },
  {
    id: "baby",
    stageNumber: 2,
    name: "Anak Naga Api",
    minDays: 7,
    maxDays: 29,
    iconName: "sparkles",
    emoji: "🐲",
    tagline: "Anak naga telah menetas dan lincah!",
    lore: "Terus beri makan dengan sesi belajar harian hingga hari ke-30 untuk menumbuhkan sayap megahnya.",
    themeColor: "#06B6D4",
  },
  {
    id: "winged",
    stageNumber: 3,
    name: "Naga Bersayap",
    minDays: 30,
    maxDays: 99,
    iconName: "shield-checkmark",
    emoji: "🐉",
    tagline: "Naga apimu terbang tinggi perkasa!",
    lore: "Kepakan sayap apimu semakin dahsyat. Menuju hari ke-100 untuk mencapai wujud dewa abadi.",
    themeColor: "#F59E0B",
  },
  {
    id: "deity",
    stageNumber: 4,
    name: "Dewa Phoenix Kosmik",
    minDays: 100,
    maxDays: Infinity,
    iconName: "infinite",
    emoji: "✨",
    tagline: "Wujud ilahi naga phoenix kosmik!",
    lore: "Konsistensi legendaris tanpa tanding. Apimu telah menjadi bagian dari rasi bintang abadi.",
    themeColor: "#CE82FF",
  },
];

export function getMascotStage(days: number): MascotStage {
  if (days >= 100) return MASCOT_STAGES[3];
  if (days >= 30) return MASCOT_STAGES[2];
  if (days >= 7) return MASCOT_STAGES[1];
  return MASCOT_STAGES[0];
}

export function getNextMascotStage(days: number): MascotStage | null {
  if (days < 7) return MASCOT_STAGES[1];
  if (days < 30) return MASCOT_STAGES[2];
  if (days < 100) return MASCOT_STAGES[3];
  return null;
}

export interface StreakMilestone {
  days: number;
  id: string;
  title: string;
  description: string;
  tier: MilestoneTier;
  iconName: string;
}

export interface StudyDay {
  date: string; // YYYY-MM-DD
  minutes: number;
  tasksCompleted: number;
  topicsCompleted: number;
  blocksCompleted?: number;
  hasStudied: boolean;
  isRequiredDay: boolean;
  isFreeDay: boolean;
}

export interface CalculateStreakOptions {
  today?: Date | string;
  tasks?: Task[];
  studyBlocks?: StudyBlock[];
  focusLogs?: FocusLog[];
  studyUnits?: StudyUnit[];
  timetableEntries?: TimetableEntry[];
  daysOff?: DayOff[];
  countEveryDay?: boolean;
  minFocusMinutes?: number;
  savedBestStreak?: number;
}

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  isAtRisk: boolean; // Today not yet studied, but streak intact until midnight
  todayStudied: boolean;
  activeMilestone: StreakMilestone | null;
  nextMilestone: StreakMilestone | null;
  daysToNextMilestone: number;
  milestoneProgressPercent: number;
  todayStudyDay: StudyDay;
  recentWeekDays: StudyDay[]; // Monday to Sunday for current week
  allMilestones: StreakMilestone[];
  unlockedMilestones: StreakMilestone[];
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  {
    days: 3,
    id: "streak-3",
    title: "Percikan Pertama",
    description: "Belajar 3 hari berturut-turut",
    tier: "bronze",
    iconName: "flame-outline",
  },
  {
    days: 7,
    id: "streak-7",
    title: "Api Membara",
    description: "Konsisten belajar selama 1 minggu penuh",
    tier: "bronze",
    iconName: "flame",
  },
  {
    days: 14,
    id: "streak-14",
    title: "Kobaran Semangat",
    description: "2 minggu belajar tanpa henti",
    tier: "silver",
    iconName: "flash",
  },
  {
    days: 21,
    id: "streak-21",
    title: "Kebiasaan Emas",
    description: "21 hari membangun kebiasaan belajar solid",
    tier: "silver",
    iconName: "ribbon",
  },
  {
    days: 30,
    id: "streak-30",
    title: "Bintang Ketekunan",
    description: "1 bulan penuh konsistensi belajar",
    tier: "silver",
    iconName: "trophy",
  },
  {
    days: 45,
    id: "streak-45",
    title: "Sang Penjelajah",
    description: "45 hari konsisten menembus batas",
    tier: "gold",
    iconName: "shield-checkmark",
  },
  {
    days: 60,
    id: "streak-60",
    title: "Ksatria Belajar",
    description: "2 bulan kedisiplinan tingkat tinggi",
    tier: "gold",
    iconName: "medal",
  },
  {
    days: 90,
    id: "streak-90",
    title: "Pilar Prestasi",
    description: "1 kuartal konsistensi luar biasa",
    tier: "gold",
    iconName: "sparkles",
  },
  {
    days: 120,
    id: "streak-120",
    title: "Legenda Abadi",
    description: "120 hari dedikasi tanpa henti",
    tier: "rainbow",
    iconName: "infinite",
  },
  {
    days: 150,
    id: "streak-150",
    title: "Penguasa Waktu",
    description: "150 hari konsistensi tanpa tanding",
    tier: "rainbow",
    iconName: "planet",
  },
  {
    days: 180,
    id: "streak-180",
    title: "Master Semester",
    description: "Satu semester penuh prestasi",
    tier: "rainbow",
    iconName: "school",
  },
  {
    days: 270,
    id: "streak-270",
    title: "Bintang Gemilang",
    description: "Tiga perempat tahun konsistensi tak tergoyahkan",
    tier: "rainbow",
    iconName: "star",
  },
  {
    days: 365,
    id: "streak-365",
    title: "Siklus Keemasan",
    description: "Satu tahun penuh belajar setiap hari",
    tier: "rainbow",
    iconName: "diamond",
  },
];

/**
 * Anti-cheat validation: checks if a task was completed unnaturally fast (< 2 mins).
 */
export function isTaskAntiCheatDisqualified(task: Task): boolean {
  if (!task.completedAt) return false;

  let createdTimestamp: number | null = null;
  if (task.createdAt) {
    createdTimestamp = new Date(task.createdAt).getTime();
  } else if (task.id.startsWith("task-")) {
    const rawNum = parseInt(task.id.replace("task-", ""), 10);
    if (!isNaN(rawNum) && rawNum > 1600000000000) {
      createdTimestamp = rawNum;
    }
  }

  if (createdTimestamp !== null) {
    const completedTimestamp = new Date(task.completedAt).getTime();
    const diffMs = completedTimestamp - createdTimestamp;
    // Disqualify if completed within 2 minutes (120,000 ms) of creation
    if (diffMs >= 0 && diffMs < 2 * 60 * 1000) {
      return true;
    }
  }

  return false;
}

/**
 * Derives a StudyDay summary for a specific calendar date.
 */
export function deriveStudyDay(
  dateStr: string,
  options: {
    tasks?: Task[];
    focusLogs?: FocusLog[];
    studyUnits?: StudyUnit[];
    studyBlocks?: StudyBlock[];
    timetableEntries?: TimetableEntry[];
    daysOff?: DayOff[];
    countEveryDay?: boolean;
    minFocusMinutes?: number;
  } = {}
): StudyDay {
  const tasks = options.tasks || [];
  const studyBlocks = options.studyBlocks || [];
  const focusLogs = options.focusLogs || [];
  const studyUnits = options.studyUnits || [];
  const timetableEntries = options.timetableEntries || [];
  const daysOff = options.daysOff || [];
  const countEveryDay = options.countEveryDay ?? false;
  const minFocusMinutes = options.minFocusMinutes ?? 15;

  const targetDate = parseLocalMidnight(dateStr);
  const weekdayNum = targetDate.getDay() === 0 ? 7 : targetDate.getDay(); // 1=Senin ... 7=Minggu

  // 1. Calculate Focus Minutes (Anti-cheat: actual_minutes >= 10 required)
  let totalMinutes = 0;
  for (const log of focusLogs) {
    if (!log.started_at) continue;
    const logDateStr = format(parseISO(log.started_at), "yyyy-MM-dd");
    if (logDateStr === dateStr) {
      const act = log.actual_minutes || 0;
      if (act >= 10) {
        totalMinutes += act;
      }
    }
  }

  // 2. Calculate Completed Tasks (Anti-cheat: < 2 min disqualified)
  let tasksCompleted = 0;
  for (const t of tasks) {
    const isCompleted = (t as any).is_completed || t.status === "COMPLETED";
    if (!isCompleted) continue;

    let compDateStr = "";
    if (t.completedAt) {
      compDateStr = format(parseISO(t.completedAt), "yyyy-MM-dd");
    } else if (t.deadlineDate) {
      compDateStr = t.deadlineDate;
    }

    if (compDateStr === dateStr) {
      if (!isTaskAntiCheatDisqualified(t)) {
        tasksCompleted += 1;
      }
    }
  }

  // 3. Calculate Completed Study Units / Topics
  let topicsCompleted = 0;
  for (const u of studyUnits) {
    if (!u.is_completed) continue;
    if (u.completed_at) {
      const uDateStr = format(parseISO(u.completed_at), "yyyy-MM-dd");
      if (uDateStr === dateStr) {
        topicsCompleted += 1;
      }
    }
  }

  // 3b. Calculate Completed StudyBlocks (v2)
  let blocksCompleted = 0;
  for (const b of studyBlocks) {
    if (b.status !== "COMPLETED") continue;
    let bDateStr = b.date;
    if (b.completedAt) {
      try {
        bDateStr = format(parseISO(b.completedAt), "yyyy-MM-dd");
      } catch {
        bDateStr = b.date;
      }
    }
    if (bDateStr === dateStr) {
      blocksCompleted += 1;
    }
  }

  // 4. Rule to earn the day:
  // At least 1 valid task finished OR >= minFocusMinutes focus OR >= 1 topic finished OR >= 1 block finished
  const hasStudied =
    tasksCompleted >= 1 ||
    totalMinutes >= minFocusMinutes ||
    topicsCompleted >= 1 ||
    blocksCompleted >= 1;

  // 5. Determine whether this day is a REQUIRED day or a FREE day
  let isRequiredDay = false;
  if (countEveryDay) {
    isRequiredDay = true;
  } else if (timetableEntries.length === 0) {
    // Timetable empty fallback: all days required so streak works before import
    isRequiredDay = true;
  } else {
    // Check if it's a designated day off / holiday
    const isHoliday = daysOff.some((d) => d.date === dateStr);
    if (isHoliday) {
      isRequiredDay = false; // Holidays are free
    } else {
      // Check if timetable has academic classes on this weekday
      const hasClassesOnWeekday = timetableEntries.some(
        (e) => e.weekday === weekdayNum && (e.kind === "class" || !e.kind)
      );
      isRequiredDay = hasClassesOnWeekday;
    }
  }

  return {
    date: dateStr,
    minutes: totalMinutes,
    tasksCompleted,
    topicsCompleted,
    hasStudied,
    isRequiredDay,
    isFreeDay: !isRequiredDay,
  };
}

/**
 * Calculates current study streak, best streak, and at-risk status.
 */
export function calculateStreak(options: CalculateStreakOptions = {}): StreakState {
  const baseToday = parseLocalMidnight(options.today || new Date());
  const todayStr = format(baseToday, "yyyy-MM-dd");

  const countEveryDay = options.countEveryDay ?? false;
  const minFocusMinutes = options.minFocusMinutes ?? 15;
  const savedBest = options.savedBestStreak || 0;

  // Derive today's study state
  const todayStudyDay = deriveStudyDay(todayStr, {
    ...options,
    countEveryDay,
    minFocusMinutes,
  });
  const todayStudied = todayStudyDay.hasStudied;

  let currentStreak = 0;
  let isAtRisk = false;

  if (todayStudied) {
    currentStreak = 1;
  }

  // Walk backwards from yesterday
  let cursor = subDays(baseToday, 1);
  let encounteredRequiredUnstudied = false;

  // Check up to 365 past days
  for (let i = 1; i <= 365; i++) {
    const dStr = format(cursor, "yyyy-MM-dd");
    const dayData = deriveStudyDay(dStr, {
      ...options,
      countEveryDay,
      minFocusMinutes,
    });

    if (dayData.hasStudied) {
      currentStreak += 1;
    } else {
      if (dayData.isRequiredDay) {
        // Required school day was missed: streak broken!
        encounteredRequiredUnstudied = true;
        break;
      } else {
        // Free day (weekend / holiday without study):
        // Streak stays intact, but doesn't increment. Continue checking past days!
      }
    }

    cursor = subDays(cursor, 1);
  }

  // Determine at-risk status:
  // If today is NOT yet studied, but the past streak was intact (currentStreak > 0),
  // then the streak is currently "terancam" (at risk).
  if (!todayStudied) {
    if (currentStreak > 0) {
      isAtRisk = true;
    }
  }

  // Best streak calculation
  const bestStreak = Math.max(savedBest, currentStreak);

  // Compute Active & Next Milestones
  let activeMilestone: StreakMilestone | null = null;
  let nextMilestone: StreakMilestone | null = null;

  for (const m of STREAK_MILESTONES) {
    if (m.days <= currentStreak) {
      activeMilestone = m;
    } else if (!nextMilestone && m.days > currentStreak) {
      nextMilestone = m;
    }
  }

  // Fallback for extreme streaks (> 365 days): dynamic 100-day intervals
  if (!nextMilestone) {
    const nextHundreds = Math.ceil((currentStreak + 1) / 100) * 100;
    nextMilestone = {
      days: nextHundreds,
      id: `streak-${nextHundreds}`,
      title: `${nextHundreds} Hari Ketekunan`,
      description: `Luar biasa! Konsisten belajar ${nextHundreds} hari`,
      tier: "rainbow",
      iconName: "diamond",
    };
  }

  const prevThreshold = activeMilestone ? activeMilestone.days : 0;
  const nextThreshold = nextMilestone.days;
  const daysToNextMilestone = Math.max(0, nextThreshold - currentStreak);
  const span = nextThreshold - prevThreshold;
  const progressFromPrev = Math.max(0, currentStreak - prevThreshold);
  const milestoneProgressPercent = span > 0 ? Math.min(100, Math.round((progressFromPrev / span) * 100)) : 100;

  const unlockedMilestones = STREAK_MILESTONES.filter((m) => m.days <= currentStreak);

  // Recent 7 days (Monday to Sunday containing baseToday)
  const mondayOffset = (baseToday.getDay() + 6) % 7;
  const weekStart = subDays(baseToday, mondayOffset);
  const recentWeekDays: StudyDay[] = [];
  for (let d = 0; d < 7; d++) {
    const dDate = addDays(weekStart, d);
    recentWeekDays.push(
      deriveStudyDay(format(dDate, "yyyy-MM-dd"), {
        ...options,
        countEveryDay,
        minFocusMinutes,
      })
    );
  }

  return {
    currentStreak,
    bestStreak,
    isAtRisk,
    todayStudied,
    activeMilestone,
    nextMilestone,
    daysToNextMilestone,
    milestoneProgressPercent,
    todayStudyDay,
    recentWeekDays,
    allMilestones: STREAK_MILESTONES,
    unlockedMilestones,
  };
}
