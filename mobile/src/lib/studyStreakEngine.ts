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
    minDays: 1,
    maxDays: 6,
    iconName: "egg",
    emoji: "🥚",
    tagline: "Telur naga apimu mulai berdenyut hangat!",
    lore: "Di dalam cangkang bersisik magma ini tertidur seekor naga penjaga. Belajar hingga 7 hari untuk menetaskannya!",
    themeColor: "#FF9600",
  },
  {
    id: "baby",
    stageNumber: 2,
    name: "Tukik Naga Bara",
    minDays: 7,
    maxDays: 29,
    iconName: "flame",
    emoji: "🐲",
    tagline: "Tukik nagamu sudah menetas dan menyemburkan bara!",
    lore: "Anak naga kecil dengan tanduk mungil dan sayap kepak. Terus belajar hingga hari ke-30 agar ia tumbuh menjadi Naga Langit!",
    themeColor: "#06B6D4",
  },
  {
    id: "winged",
    stageNumber: 3,
    name: "Naga Langit Perkasa",
    minDays: 30,
    maxDays: 99,
    iconName: "shield-checkmark",
    emoji: "🐉",
    tagline: "Naga apimu membentangkan sayap dan menguasai angkasa!",
    lore: "Sisik bajanya berkilau dan semburan apinya membakar rasa malas. Capai 100 hari untuk membangkitkan wujud Kaisar Naga Kosmik!",
    themeColor: "#F59E0B",
  },
  {
    id: "deity",
    stageNumber: 4,
    name: "Naga Agung Kosmik",
    minDays: 100,
    maxDays: Infinity,
    iconName: "infinite",
    emoji: "🐉",
    tagline: "Wujud legendaris Naga Agung Kosmik bermahkota emas!",
    lore: "Naga agung dengan mahkota emas melayang dan lambang bintang di dada. Konsistensimu telah menjadi legenda!",
    themeColor: "#8B5CF6",
  },
];

export function getMascotStage(days: number): MascotStage {
  if (days >= 100) return MASCOT_STAGES[3];
  if (days >= 30) return MASCOT_STAGES[2];
  if (days >= 7) return MASCOT_STAGES[1];
  return MASCOT_STAGES[0];
}

export function getNextMascotStage(days: number): MascotStage | null {
  if (days < 1) return MASCOT_STAGES[0];
  if (days < 7) return MASCOT_STAGES[1];
  if (days < 30) return MASCOT_STAGES[2];
  if (days < 100) return MASCOT_STAGES[3];
  return null;
}

export interface MascotGrowthState {
  level: number; // 1..10
  subTier: 1 | 2 | 3; // 1 = early in stage, 2 = mid-stage, 3 = mastered stage
  stageProgress: number; // 0..1 within current stage
  scaleMultiplier: number; // subtle size growth within stage
  traitTitle: string;
  traitDescription: string;
  nextTraitDays: number | null;
  flamePuffCount: 1 | 2 | 3;
  hasHorizontalDrift: boolean;
  hasAmbientEmbers: boolean;
  hasCrown: boolean;
}

export function getMascotGrowthState(days: number): MascotGrowthState {
  if (days < 3) {
    return {
      level: 1,
      subTier: 1,
      stageProgress: Math.max(0, (days - 1) / 5),
      scaleMultiplier: 0.94,
      traitTitle: "Denyut Hangat Awal",
      traitDescription: "Cangkang telur mulai menghangat dengan retakan magma pertama.",
      nextTraitDays: 3,
      flamePuffCount: 1,
      hasHorizontalDrift: false,
      hasAmbientEmbers: false,
      hasCrown: false,
    };
  }
  if (days < 5) {
    return {
      level: 2,
      subTier: 2,
      stageProgress: (days - 1) / 5,
      scaleMultiplier: 0.98,
      traitTitle: "Retakan Magma Aktif",
      traitDescription: "Ujung tanduk mulai menyembul dan cangkang bergoyang hangat.",
      nextTraitDays: 5,
      flamePuffCount: 1,
      hasHorizontalDrift: false,
      hasAmbientEmbers: false,
      hasCrown: false,
    };
  }
  if (days < 7) {
    return {
      level: 3,
      subTier: 3,
      stageProgress: Math.min(1, (days - 1) / 5),
      scaleMultiplier: 1.03,
      traitTitle: "Siap Menetas",
      traitDescription: "Mata naga mulai mengintip dari balik retakan emas yang bercahaya!",
      nextTraitDays: 7,
      flamePuffCount: 2,
      hasHorizontalDrift: false,
      hasAmbientEmbers: true,
      hasCrown: false,
    };
  }
  if (days < 14) {
    return {
      level: 4,
      subTier: 1,
      stageProgress: (days - 7) / 22,
      scaleMultiplier: 0.92,
      traitTitle: "Kepakan Sayap Mungil",
      traitDescription: "Tukik naga baru menetas dan belajar melayang rendah dengan percikan bara.",
      nextTraitDays: 14,
      flamePuffCount: 1,
      hasHorizontalDrift: false,
      hasAmbientEmbers: false,
      hasCrown: false,
    };
  }
  if (days < 21) {
    return {
      level: 5,
      subTier: 2,
      stageProgress: (days - 7) / 22,
      scaleMultiplier: 1.0,
      traitTitle: "Jambul & Tanduk Muda",
      traitDescription: "Tubuh membesar, jambul punggung tumbuh, dan semburan api makin stabil.",
      nextTraitDays: 21,
      flamePuffCount: 2,
      hasHorizontalDrift: false,
      hasAmbientEmbers: false,
      hasCrown: false,
    };
  }
  if (days < 30) {
    return {
      level: 6,
      subTier: 3,
      stageProgress: Math.min(1, (days - 7) / 22),
      scaleMultiplier: 1.07,
      traitTitle: "Terbang Lincah",
      traitDescription: "Sirip pipi tumbuh dan tukik naga mulai melayang lincah ke kiri-kanan.",
      nextTraitDays: 30,
      flamePuffCount: 3,
      hasHorizontalDrift: true,
      hasAmbientEmbers: true,
      hasCrown: false,
    };
  }
  if (days < 50) {
    return {
      level: 7,
      subTier: 1,
      stageProgress: (days - 30) / 69,
      scaleMultiplier: 0.95,
      traitTitle: "Sayap Bentang Angkasa",
      traitDescription: "Sayap membran lebar dan sisik perisai merah-emas yang gagah.",
      nextTraitDays: 50,
      flamePuffCount: 2,
      hasHorizontalDrift: false,
      hasAmbientEmbers: false,
      hasCrown: false,
    };
  }
  if (days < 75) {
    return {
      level: 8,
      subTier: 2,
      stageProgress: (days - 30) / 69,
      scaleMultiplier: 1.02,
      traitTitle: "Aura Bara Mengambang",
      traitDescription: "Tanduk emas memanjang dengan partikel bara lembut yang melayang tenang.",
      nextTraitDays: 75,
      flamePuffCount: 3,
      hasHorizontalDrift: true,
      hasAmbientEmbers: true,
      hasCrown: false,
    };
  }
  if (days < 100) {
    return {
      level: 9,
      subTier: 3,
      stageProgress: Math.min(1, (days - 30) / 69),
      scaleMultiplier: 1.08,
      traitTitle: "Mahkota Naga Surya",
      traitDescription: "Mahkota emas mulai terbentuk di atas kepala dengan kepakan sayap agung.",
      nextTraitDays: 100,
      flamePuffCount: 3,
      hasHorizontalDrift: true,
      hasAmbientEmbers: true,
      hasCrown: true,
    };
  }
  return {
    level: 10,
    subTier: 3,
    stageProgress: 1,
    scaleMultiplier: days >= 180 ? 1.08 : 1.04,
    traitTitle: days >= 180 ? "Naga Agung Abadi" : "Mahkota & Bintang Dada",
    traitDescription: "Mahkota emas melayang tenang dengan lencana bintang bercahaya di dada.",
    nextTraitDays: null,
    flamePuffCount: 3,
    hasHorizontalDrift: true,
    hasAmbientEmbers: true,
    hasCrown: true,
  };
}

export type DragonElementId = "auto" | "fire" | "ice" | "emerald" | "solar" | "cosmic";

export interface DragonElementOption {
  id: DragonElementId;
  name: string;
  emoji: string;
  minDays: number;
  accentColor: string;
  description: string;
}

export const DRAGON_ELEMENTS: DragonElementOption[] = [
  {
    id: "auto",
    name: "Alami",
    emoji: "🐉",
    minDays: 1,
    accentColor: "#FF9600",
    description: "Mengikuti elemen asli tiap tahap evolusi naga.",
  },
  {
    id: "fire",
    name: "Api Magma",
    emoji: "🔥",
    minDays: 1,
    accentColor: "#EF4444",
    description: "Sisik magma merah-bara dengan semburan api vulkanik.",
  },
  {
    id: "ice",
    name: "Petir Biru",
    emoji: "⚡",
    minDays: 3,
    accentColor: "#06B6D4",
    description: "Sisik safir es dengan semburan plasma biru elektrik.",
  },
  {
    id: "emerald",
    name: "Zamrud Hutan",
    emoji: "🌿",
    minDays: 7,
    accentColor: "#10B981",
    description: "Sisik giok zamrud penjaga alam dengan nafas cahaya hijau.",
  },
  {
    id: "solar",
    name: "Surya Emas",
    emoji: "☀️",
    minDays: 14,
    accentColor: "#F59E0B",
    description: "Sisik emas kerajaan dengan semburan suar matahari murni.",
  },
  {
    id: "cosmic",
    name: "Nebula Kosmik",
    emoji: "🌌",
    minDays: 30,
    accentColor: "#CE82FF",
    description: "Sisik galaksi ungu-bintang dengan nafas astral kosmik.",
  },
];

export type DragonMoodId = "ecstatic" | "happy" | "calm" | "hungry" | "sleepy";

export type DragonCircadianPhase = "pagi" | "siang" | "sore" | "malam";

export type DragonIdleBehaviorId =
  | "curious_tilt"
  | "warm_exhale"
  | "wing_stretch"
  | "happy_wag"
  | "drowsy_nod";

export interface DragonOrganicBehavior {
  circadianPhase: DragonCircadianPhase;
  circadianLabel: string;
  circadianEmoji: string;
  breathCycleMs: number;
  wingDownstrokeMs: number;
  wingUpstrokeMs: number;
  heartbeatBpm: number;
  idleBehaviors: DragonIdleBehaviorId[];
  idleThoughts: string[];
}

export function deriveDragonOrganicBehavior(options: {
  stageId?: MascotStageId;
  mood: DragonMoodId;
  hourOfDay?: number;
}): DragonOrganicBehavior {
  const { stageId = "baby", mood, hourOfDay = new Date().getHours() } = options;
  const h = ((hourOfDay % 24) + 24) % 24;

  let circadianPhase: DragonCircadianPhase = "siang";
  let circadianLabel = "Aktif Siang";
  let circadianEmoji = "☀️";

  if (h >= 5 && h < 11) {
    circadianPhase = "pagi";
    circadianLabel = "Segar Pagi";
    circadianEmoji = "🌅";
  } else if (h >= 11 && h < 17) {
    circadianPhase = "siang";
    circadianLabel = "Aktif Siang";
    circadianEmoji = "☀️";
  } else if (h >= 17 && h < 21) {
    circadianPhase = "sore";
    circadianLabel = "Hangat Senja";
    circadianEmoji = "🌆";
  } else {
    circadianPhase = "malam";
    circadianLabel = "Tenang Malam";
    circadianEmoji = "🌙";
  }

  // Organic breathing & wingbeat cadence based on mood and circadian rhythm
  const baseBreathMs =
    mood === "ecstatic"
      ? 1600
      : mood === "happy"
      ? 1900
      : mood === "hungry"
      ? 1450
      : mood === "calm"
      ? 2300
      : 2600;

  const circadianMultiplier = circadianPhase === "malam" ? 1.15 : circadianPhase === "pagi" ? 0.95 : 1.0;
  const breathCycleMs = Math.round(baseBreathMs * circadianMultiplier);

  // Asymmetric wingbeat: fast power downstroke (38%), slower recovery glide (62%)
  const totalFlapMs =
    mood === "ecstatic"
      ? 1100
      : mood === "happy"
      ? 1350
      : mood === "hungry"
      ? 1650
      : 1950;
  const wingDownstrokeMs = Math.round(totalFlapMs * 0.38);
  const wingUpstrokeMs = Math.round(totalFlapMs * 0.62);

  const heartbeatBpm =
    mood === "ecstatic"
      ? 96
      : mood === "happy"
      ? 82
      : mood === "hungry"
      ? 88
      : mood === "calm"
      ? 68
      : 58;

  const idleBehaviors: DragonIdleBehaviorId[] =
    mood === "sleepy" || mood === "hungry"
      ? ["drowsy_nod", "curious_tilt", "warm_exhale"]
      : mood === "ecstatic"
      ? ["happy_wag", "wing_stretch", "warm_exhale", "curious_tilt"]
      : ["curious_tilt", "warm_exhale", "wing_stretch", "happy_wag"];

  const idleThoughts: string[] = (() => {
    if (mood === "hungry") {
      return [
        "🥺 Perutku keroncongan bara...",
        "🔥 Yuk fokus 15 menit hari ini!",
        "🍖 Satu tugas selesai = 1 Bara Api hangat!",
      ];
    }
    if (mood === "sleepy") {
      return [
        "💤 Menunggu percikan api pertamamu...",
        "🥚 Hangatkan aku dengan mulai belajar!",
      ];
    }
    if (stageId === "egg") {
      return [
        "🥚 *Deg-deg...* hangat sekali di dalam!",
        "✨ Sebentar lagi cangkangku retak!",
        "🔥 Terus belajar ya, aku ingin menetas!",
      ];
    }
    if (circadianPhase === "pagi") {
      return [
        "🌅 Semangat pagi! Siap belajar apa hari ini?",
        "🔥 Sayapku sudah hangat untuk terbang!",
        "✨ Hari baru, bara baru!",
      ];
    }
    if (circadianPhase === "malam") {
      return [
        "🌙 Malam yang tenang, api kita tetap terjaga.",
        "✨ Bangga dengan belajarmu hari ini!",
        "🔥 Istirahat yang cukup ya setelah belajar.",
      ];
    }
    return [
      "🔥 Api belajarmu terasa hangat sekali!",
      "🐲 Senang menemanimu belajar hari ini!",
      "✨ Ketuk atau elus aku kapan saja!",
    ];
  })();

  return {
    circadianPhase,
    circadianLabel,
    circadianEmoji,
    breathCycleMs,
    wingDownstrokeMs,
    wingUpstrokeMs,
    heartbeatBpm,
    idleBehaviors,
    idleThoughts,
  };
}

export interface DragonPetStats {
  mood: DragonMoodId;
  moodLabel: string;
  moodEmoji: string;
  moodColor: string;
  energyPercent: number;
  embersEarnedToday: number;
  embersAvailable: number;
  fedTodayCount: number;
  satietyCount: number;
  satietyTarget: number;
  satietyLabel: string;
  organic: DragonOrganicBehavior;
}

export function deriveDragonPetStats(options: {
  currentStreak: number;
  todayStudied: boolean;
  isAtRisk: boolean;
  todayStudyDay?: StudyDay;
  fedTodayCount?: number;
  lastFedDate?: string;
  hourOfDay?: number;
}): DragonPetStats {
  const {
    currentStreak,
    todayStudied,
    isAtRisk,
    todayStudyDay,
    fedTodayCount = 0,
    lastFedDate = "",
    hourOfDay,
  } = options;

  const todayStr = todayStudyDay?.date || format(new Date(), "yyyy-MM-dd");
  const effectiveFedToday = lastFedDate === todayStr ? Math.max(0, fedTodayCount) : 0;

  const todayMinutes = todayStudyDay?.minutes || 0;
  const todayTasks = todayStudyDay?.tasksCompleted || 0;
  const todayTopics = todayStudyDay?.topicsCompleted || 0;

  // Base embers earned today from study actions
  const activityEmbers =
    (todayStudied ? 2 : 0) +
    todayTasks +
    todayTopics +
    Math.floor(todayMinutes / 15);
  const embersEarnedToday = Math.min(12, activityEmbers);
  const embersAvailable = Math.max(0, embersEarnedToday - effectiveFedToday);

  const satietyTarget = 3;
  const satietyCount = Math.min(satietyTarget, effectiveFedToday);
  const satietyLabel =
    satietyCount >= satietyTarget
      ? `Kenyang Penuh (${satietyCount}/${satietyTarget})`
      : `Kenyang Harian ${satietyCount}/${satietyTarget}`;

  let mood: DragonMoodId = "sleepy";
  let moodLabel = "Tertidur";
  let moodEmoji = "💤";
  let moodColor = "#64748B";
  let energyPercent = 20;

  if (currentStreak <= 0 && !todayStudied) {
    mood = "sleepy";
    moodLabel = "Menunggu Api Pertama";
    moodEmoji = "🥚";
    moodColor = "#94A3B8";
    energyPercent = 15;
  } else if (isAtRisk && !todayStudied) {
    mood = "hungry";
    moodLabel = "Lapar Bara! Ayo Belajar";
    moodEmoji = "🥺";
    moodColor = "#FF7A00";
    energyPercent = 35;
  } else if (todayStudied && effectiveFedToday >= satietyTarget) {
    mood = "ecstatic";
    moodLabel = "Kenyang & Sangat Bersemangat!";
    moodEmoji = "🤩";
    moodColor = "#10B981";
    energyPercent = 100;
  } else if (todayStudied && effectiveFedToday > 0) {
    mood = "ecstatic";
    moodLabel = "Sangat Bersemangat!";
    moodEmoji = "🤩";
    moodColor = "#10B981";
    energyPercent = 95;
  } else if (todayStudied) {
    mood = "happy";
    moodLabel = "Senang & Membara";
    moodEmoji = "🔥";
    moodColor = "#FF9600";
    energyPercent = Math.min(95, 75 + effectiveFedToday * 10);
  } else if (todayStudyDay?.isFreeDay) {
    mood = "calm";
    moodLabel = "Santai (Hari Libur)";
    moodEmoji = "❄️";
    moodColor = "#38BDF8";
    energyPercent = 85;
  }

  const stageId = getMascotStage(currentStreak).id;
  const organic = deriveDragonOrganicBehavior({ stageId, mood, hourOfDay });

  return {
    mood,
    moodLabel,
    moodEmoji,
    moodColor,
    energyPercent,
    embersEarnedToday,
    embersAvailable,
    fedTodayCount: effectiveFedToday,
    satietyCount,
    satietyTarget,
    satietyLabel,
    organic,
  };
}

export const MAX_STREAK_FREEZES = 2;

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
  isFrozen?: boolean;
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
  streakFrozenDates?: string[];
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
    streakFrozenDates?: string[];
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
  const isFrozen = Boolean(options.streakFrozenDates && options.streakFrozenDates.includes(dateStr));

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
    isFrozen,
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
      if (dayData.isFrozen) {
        // Frozen day: streak stays intact across this day! Continue checking past days.
      } else if (dayData.isRequiredDay) {
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
  // and today is NOT already frozen, then the streak is currently "terancam" (at risk).
  if (!todayStudied) {
    if (currentStreak > 0 && !todayStudyDay.isFrozen) {
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

/**
 * Evaluates whether reaching currentStreak awards a new streak freeze.
 * Awards 1 streak freeze for every 3 days in a row (e.g. at 3, 6, 9... days).
 */
export function evaluate3DayStreakFreezeAward(
  currentStreak: number,
  lastAwardedStreakInterval: number,
  currentFreezes: number
): { shouldAward: boolean; newAwardedStreak: number; newFreezeCount: number } {
  if (currentStreak < 3) {
    return { shouldAward: false, newAwardedStreak: lastAwardedStreakInterval, newFreezeCount: currentFreezes };
  }
  const currentInterval = Math.floor(currentStreak / 3);
  if (currentInterval > lastAwardedStreakInterval) {
    return {
      shouldAward: true,
      newAwardedStreak: currentInterval,
      newFreezeCount: Math.min(MAX_STREAK_FREEZES, currentFreezes + 1),
    };
  }
  return { shouldAward: false, newAwardedStreak: lastAwardedStreakInterval, newFreezeCount: currentFreezes };
}

/**
 * Evaluates the daily lucky chance drop of a streak freeze upon completing a study day.
 * Default 35% probability, capped at MAX_STREAK_FREEZES.
 */
export function evaluateDailyLuckyFreezeDrop(
  todayStudied: boolean,
  lastCheckDate: string,
  todayStr: string,
  currentFreezes: number,
  randomFn: () => number = Math.random
): { won: boolean; newCheckDate: string; newFreezeCount: number } {
  if (!todayStudied || lastCheckDate === todayStr) {
    return { won: false, newCheckDate: lastCheckDate, newFreezeCount: currentFreezes };
  }
  const won = randomFn() < 0.35;
  if (won && currentFreezes < MAX_STREAK_FREEZES) {
    return {
      won: true,
      newCheckDate: todayStr,
      newFreezeCount: currentFreezes + 1,
    };
  }
  return {
    won: false,
    newCheckDate: todayStr,
    newFreezeCount: currentFreezes,
  };
}

/**
 * Automatically consumes 1 streak freeze to protect a missed required day (e.g. yesterday).
 */
export function autoProtectMissedYesterday(options: {
  yesterdayStr: string;
  yesterdayRequired: boolean;
  yesterdayStudied: boolean;
  frozenDates: string[];
  freezeCount: number;
}): { consumed: boolean; newFrozenDates: string[]; newFreezeCount: number } {
  const { yesterdayStr, yesterdayRequired, yesterdayStudied, frozenDates, freezeCount } = options;
  if (
    !yesterdayStudied &&
    yesterdayRequired &&
    !frozenDates.includes(yesterdayStr) &&
    freezeCount > 0
  ) {
    return {
      consumed: true,
      newFrozenDates: [...frozenDates, yesterdayStr],
      newFreezeCount: freezeCount - 1,
    };
  }
  return {
    consumed: false,
    newFrozenDates: frozenDates,
    newFreezeCount: freezeCount,
  };
}
