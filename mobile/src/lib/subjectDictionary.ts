import { Subject } from "../types";

/**
 * Indonesian School Subject & Alias Dictionary
 * Normalizes colloquial and abbreviated school subjects (e.g. MTK, B.Indo, PJOK)
 * into canonical subject titles, colors, and search aliases.
 */

export interface SubjectMetadata {
  canonicalName: string;
  defaultColor: string;
  aliases: string[];
  defaultBringItems?: string[];
}

export const INDONESIAN_SUBJECT_CATALOG: SubjectMetadata[] = [
  {
    canonicalName: "Matematika",
    defaultColor: "#3A86FF",
    aliases: ["mtk", "mat", "math", "matematika", "kalkulus", "aljabar"],
    defaultBringItems: ["Buku Paket", "Buku Kotak-kotak", "Penggaris", "Busur"],
  },
  {
    canonicalName: "Bahasa Indonesia",
    defaultColor: "#EF4444",
    aliases: ["b.indo", "bind", "b indo", "bahasa indonesia", "indo", "bin"],
    defaultBringItems: ["Kamus KBBI", "Buku Catatan"],
  },
  {
    canonicalName: "Bahasa Inggris",
    defaultColor: "#8B5CF6",
    aliases: ["b.ing", "bing", "b ing", "bahasa inggris", "english", "eng"],
    defaultBringItems: ["Kamus Inggris", "Modul Latihan"],
  },
  {
    canonicalName: "Ilmu Pengetahuan Alam (IPA)",
    defaultColor: "#10B981",
    aliases: ["ipa", "sains", "science"],
    defaultBringItems: ["Buku Paket", "Jas Lab"],
  },
  {
    canonicalName: "Fisika",
    defaultColor: "#06B6D4",
    aliases: ["fis", "fisika", "physics"],
    defaultBringItems: ["Kalkulator Ilmiah", "Buku Catatan Rumus"],
  },
  {
    canonicalName: "Kimia",
    defaultColor: "#F59E0B",
    aliases: ["kim", "kimia", "chemistry"],
    defaultBringItems: ["Tabel Periodik", "Jas Lab"],
  },
  {
    canonicalName: "Biologi",
    defaultColor: "#84CC16",
    aliases: ["bio", "biologi", "biology"],
    defaultBringItems: ["Buku Gambar", "Pensil Warna"],
  },
  {
    canonicalName: "Ilmu Pengetahuan Sosial (IPS)",
    defaultColor: "#F97316",
    aliases: ["ips", "sosial", "social"],
    defaultBringItems: ["Atlas", "Buku Paket"],
  },
  {
    canonicalName: "Sejarah",
    defaultColor: "#B45309",
    aliases: ["sej", "sejarah", "history"],
    defaultBringItems: ["Buku Catatan", "Atlas Sejarah"],
  },
  {
    canonicalName: "Geografi",
    defaultColor: "#0D9488",
    aliases: ["geo", "geografi", "geography"],
    defaultBringItems: ["Atlas", "Penggaris"],
  },
  {
    canonicalName: "Ekonomi",
    defaultColor: "#14B8A6",
    aliases: ["eko", "ekonomi", "akuntansi", "economy"],
    defaultBringItems: ["Kalkulator", "Buku Kolom"],
  },
  {
    canonicalName: "Sosiologi",
    defaultColor: "#A855F7",
    aliases: ["sos", "sosiologi", "sociology"],
    defaultBringItems: ["Buku Catatan"],
  },
  {
    canonicalName: "Pendidikan Jasmani & Kesehatan (PJOK)",
    defaultColor: "#EC4899",
    aliases: ["pjok", "penjas", "penjaskes", "olahraga", "or", "sport"],
    defaultBringItems: ["Seragam Olahraga", "Sepatu Kets", "Air Minum"],
  },
  {
    canonicalName: "Pendidikan Agama Islam (PAI)",
    defaultColor: "#059669",
    aliases: ["pai", "agama", "agama islam", "pendidikan agama"],
    defaultBringItems: ["Al-Qur'an / Juz Amma", "Buku Catatan"],
  },
  {
    canonicalName: "Pancasila & Kewarganegaraan (PPKn)",
    defaultColor: "#DC2626",
    aliases: ["ppkn", "pkn", "kewarganegaraan", "pancasila"],
    defaultBringItems: ["UUD 1945", "Buku Paket"],
  },
  {
    canonicalName: "Seni Budaya & Keterampilan (SBK)",
    defaultColor: "#D946EF",
    aliases: ["sbk", "seni budaya", "kesenian", "seni rupa", "seni musik", "prakarya"],
    defaultBringItems: ["Buku Gambar A3", "Cat Air / Pensil Warna"],
  },
  {
    canonicalName: "Informatika / TIK",
    defaultColor: "#3B82F6",
    aliases: ["tik", "informatika", "komputer", "it", "cs"],
    defaultBringItems: ["Laptop / Flashdisk", "Buku Logika"],
  },
  {
    canonicalName: "Bimbingan & Konseling (BK)",
    defaultColor: "#64748B",
    aliases: ["bk", "bimbingan konseling", "bp"],
    defaultBringItems: ["Buku Konseling"],
  },
];

/**
 * Resolves a raw subject query (e.g. "MTK", "b.indo", "Biologi")
 * against the Indonesian school dictionary.
 */
export function resolveIndonesianSubject(rawInput: string): SubjectMetadata {
  const clean = (rawInput || "").trim().toLowerCase();
  if (!clean) {
    return {
      canonicalName: "Mata Pelajaran",
      defaultColor: "#3A86FF",
      aliases: [],
    };
  }

  // 1. Direct match on canonical name or aliases
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    if (entry.canonicalName.toLowerCase() === clean) {
      return entry;
    }
    if (entry.aliases.includes(clean)) {
      return entry;
    }
  }

  // 2. Substring matching (e.g. "PR MTK Wajib" -> MTK)
  for (const entry of INDONESIAN_SUBJECT_CATALOG) {
    for (const alias of entry.aliases) {
      // Word boundary regex
      const pattern = new RegExp(`\\b${alias}\\b`, "i");
      if (pattern.test(clean)) {
        return entry;
      }
    }
  }

  // 3. Fallback: Title-case the raw name and assign a stable vibrant color
  const titleCased = rawInput
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const fallbackColors = [
    "#3A86FF",
    "#8B5CF6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#06B6D4",
    "#EC4899",
  ];
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % fallbackColors.length;

  return {
    canonicalName: titleCased,
    defaultColor: fallbackColors[colorIndex],
    aliases: [clean],
  };
}

export const DEFAULT_CURRICULUM_SUBJECTS: Subject[] = [
  {
    id: "sub-math",
    name: "Matematika",
    title: "Matematika",
    color: "#3A86FF",
    color_hex: "#3A86FF",
    aliases: ["MTK", "Math", "Kalkulus", "Aljabar"],
    teacher: "Drs. Budi Santoso",
    room: "R. 102",
    bringItems: ["Buku Berpetak", "Penggaris Segitiga", "Kalkulator"],
  },
  {
    id: "sub-indo",
    name: "Bahasa Indonesia",
    title: "Bahasa Indonesia",
    color: "#EF4444",
    color_hex: "#EF4444",
    aliases: ["B.Indo", "Bind", "Bahasa Indonesia", "Indo"],
    teacher: "Dra. Endang Sulastri",
    room: "R. 104",
    bringItems: ["Kamus KBBI", "Buku Catatan"],
  },
  {
    id: "sub-ing",
    name: "Bahasa Inggris",
    title: "Bahasa Inggris",
    color: "#8B5CF6",
    color_hex: "#8B5CF6",
    aliases: ["B.Ing", "Bing", "English", "Bahasa Inggris"],
    teacher: "Mr. John Wijaya",
    room: "Lab Bahasa",
    bringItems: ["Kamus Inggris-Indo", "Modul Latihan"],
  },
  {
    id: "sub-fis",
    name: "Fisika",
    title: "Fisika",
    color: "#06B6D4",
    color_hex: "#06B6D4",
    aliases: ["FIS", "Fisika", "Physics"],
    teacher: "Siti Rahma, M.Pd",
    room: "Lab Fisika",
    bringItems: ["Kalkulator Ilmiah", "Buku Rumus"],
  },
  {
    id: "sub-kim",
    name: "Kimia",
    title: "Kimia",
    color: "#10B981",
    color_hex: "#10B981",
    aliases: ["KIM", "Kimia", "Chemistry"],
    teacher: "Ahmad Fauzi, S.Si",
    room: "Lab Kimia",
    bringItems: ["Jas Lab", "Buku Praktikum"],
  },
  {
    id: "sub-bio",
    name: "Biologi",
    title: "Biologi",
    color: "#84CC16",
    color_hex: "#84CC16",
    aliases: ["BIO", "Biologi", "Biology", "IPA"],
    teacher: "Nurhayati, S.Pd",
    room: "Lab Biologi",
    bringItems: ["Buku Gambar", "Pensil Warna"],
  },
  {
    id: "sub-sej",
    name: "Sejarah",
    title: "Sejarah",
    color: "#B45309",
    color_hex: "#B45309",
    aliases: ["SEJ", "Sejarah", "Sejarah Indonesia", "History"],
    teacher: "Bambang Sudiro, M.Hum",
    room: "R. 201",
    bringItems: ["Atlas Sejarah", "Buku Catatan"],
  },
  {
    id: "sub-geo",
    name: "Geografi",
    title: "Geografi",
    color: "#0D9488",
    color_hex: "#0D9488",
    aliases: ["GEO", "Geografi", "Geography"],
    teacher: "Dra. Sri Wahyuni",
    room: "R. 203",
    bringItems: ["Atlas Dunia", "Penggaris"],
  },
  {
    id: "sub-eko",
    name: "Ekonomi",
    title: "Ekonomi",
    color: "#14B8A6",
    color_hex: "#14B8A6",
    aliases: ["EKO", "Ekonomi", "Akuntansi", "Economy"],
    teacher: "Hendra Gunawan, S.E",
    room: "R. 204",
    bringItems: ["Kalkulator", "Buku Kolom"],
  },
  {
    id: "sub-sos",
    name: "Sosiologi",
    title: "Sosiologi",
    color: "#A855F7",
    color_hex: "#A855F7",
    aliases: ["SOS", "Sosiologi", "Sociology", "IPS"],
    teacher: "Rina Kusuma, S.Sos",
    room: "R. 205",
    bringItems: ["Buku Catatan"],
  },
  {
    id: "sub-pai",
    name: "Pendidikan Agama Islam (PAI)",
    title: "Pendidikan Agama Islam (PAI)",
    color: "#059669",
    color_hex: "#059669",
    aliases: ["PAI", "Agama", "Agama Islam", "Pendidikan Agama"],
    teacher: "Ustadz H. Mansyur, M.Ag",
    room: "Musholla / R. 101",
    bringItems: ["Al-Qur'an / Juz Amma", "Buku Catatan"],
  },
  {
    id: "sub-ppkn",
    name: "Pendidikan Pancasila (PPKn)",
    title: "Pendidikan Pancasila (PPKn)",
    color: "#DC2626",
    color_hex: "#DC2626",
    aliases: ["PPKn", "PKn", "Pancasila", "Kewarganegaraan"],
    teacher: "Drs. M. Taufik",
    room: "R. 103",
    bringItems: ["Buku UUD 1945", "Buku Catatan Pancasila"],
  },
  {
    id: "sub-info",
    name: "Informatika",
    title: "Informatika",
    color: "#3B82F6",
    color_hex: "#3B82F6",
    aliases: ["TIK", "Informatika", "Komputer", "IT", "Coding"],
    teacher: "Dimas Arya, S.Kom",
    room: "Lab Komputer",
    bringItems: ["Flashdisk", "Modul Praktik"],
  },
  {
    id: "sub-pjok",
    name: "PJOK",
    title: "PJOK",
    color: "#F59E0B",
    color_hex: "#F59E0B",
    aliases: ["Penjas", "Penjaskes", "Olahraga", "Sport"],
    teacher: "Pak Yanto",
    room: "Lapangan Utama",
    bringItems: ["Baju Olahraga", "Sepatu Kets", "Botol Minum"],
  },
  {
    id: "sub-seni",
    name: "Seni Budaya",
    title: "Seni Budaya",
    color: "#D946EF",
    color_hex: "#D946EF",
    aliases: ["SBK", "Seni", "Seni Budaya", "Kesenian", "Prakarya"],
    teacher: "Dewi Lestari, S.Sn",
    room: "R. Kesenian",
    bringItems: ["Buku Gambar A4", "Pensil Warna"],
  },
  {
    id: "sub-bk",
    name: "Bimbingan Konseling (BK)",
    title: "Bimbingan Konseling (BK)",
    color: "#64748B",
    color_hex: "#64748B",
    aliases: ["BK", "Bimbingan Konseling", "BP"],
    teacher: "Ibu Maya, S.Psi",
    room: "R. BK",
    bringItems: ["Buku Bimbingan"],
  },
];

export function ensureStandardSubjects(existing?: Subject[] | null): Subject[] {
  if (!existing || existing.length === 0) {
    return [...DEFAULT_CURRICULUM_SUBJECTS];
  }

  const existingNormalized = new Set<string>();
  const existingIds = new Set<string>();

  for (const s of existing) {
    if (s.id) existingIds.add(s.id);
    const n = (s.name || s.title || "").trim().toLowerCase();
    if (n) {
      existingNormalized.add(n);
      if (n.includes("mat")) existingNormalized.add("matematika");
      if (n.includes("indo")) existingNormalized.add("bahasa indonesia");
      if (n.includes("ingg") || n.includes("eng")) existingNormalized.add("bahasa inggris");
      if (n.includes("fis")) existingNormalized.add("fisika");
      if (n.includes("kim")) existingNormalized.add("kimia");
      if (n.includes("bio")) existingNormalized.add("biologi");
      if (n.includes("sej")) existingNormalized.add("sejarah");
      if (n.includes("geo")) existingNormalized.add("geografi");
      if (n.includes("eko")) existingNormalized.add("ekonomi");
      if (n.includes("sos")) existingNormalized.add("sosiologi");
      if (n.includes("pai") || n.includes("agama")) existingNormalized.add("pendidikan agama islam (pai)");
      if (n.includes("pkn") || n.includes("ppkn") || n.includes("pancasila")) existingNormalized.add("pendidikan pancasila (ppkn)");
      if (n.includes("informatika") || n.includes("komp") || n === "tik" || /\btik\b/i.test(n)) existingNormalized.add("informatika");
      if (n.includes("penjas") || n.includes("pjok") || n.includes("olah")) existingNormalized.add("pjok");
      if (n.includes("seni") || n.includes("sbk")) existingNormalized.add("seni budaya");
      if (n.includes("bk") || n.includes("konseling")) existingNormalized.add("bimbingan konseling (bk)");
    }
  }

  const additions: Subject[] = [];
  for (const std of DEFAULT_CURRICULUM_SUBJECTS) {
    const stdName = (std.name || "").trim().toLowerCase();
    if (!existingIds.has(std.id) && !existingNormalized.has(stdName)) {
      additions.push(std);
    }
  }

  if (additions.length === 0) {
    return existing;
  }
  return [...existing, ...additions];
}
