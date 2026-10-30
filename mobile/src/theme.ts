/**
 * StudyAir Mobile Design System Tokens
 * Multi-Theme Engine supporting Duolingo aesthetics, high contrast, and daylight.
 */

import { Platform } from "react-native";
import { AppTheme } from "./types";

export interface ThemePalette {
  id: AppTheme;
  name: string;
  nameId: string;
  isDark: boolean;
  swatch: string;
  swatchSecondary: string;

  // Surfaces & Background
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceHover: string;
  border: string;
  borderLight: string;
  borderSubtle: string;
  borderBottom: string; // 3D card bottom bevel

  // Text hierarchy
  text: string;
  textSecondary: string;
  textMuted: string;

  // Primary brand (tactile 3D bottom)
  primary: string;
  primaryBottom: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  secondaryBottom: string;

  // Duolingo status & accents
  emerald: string;
  emeraldBottom: string;
  emeraldLight: string;
  success: string;
  successBottom: string;

  amber: string;
  amberBottom: string;
  amberLight: string;
  warning: string;
  warningBottom: string;

  rose: string;
  roseBottom: string;
  roseLight: string;
  danger: string;
  dangerBottom: string;

  accent: string;
  accentBottom: string;
  accentLight: string;
  violet: string;
  violetBottom: string;

  yellow: string;
  yellowBottom: string;

  // Cognitive tokens
  cognitiveHigh: string;
  cognitiveHighBg: string;
  cognitiveMedium: string;
  cognitiveMediumBg: string;
  cognitiveLow: string;
  cognitiveLowBg: string;

  info: string;

  // Study blocks & tactile extensions
  textInverse: string;
  blockBorder: string;
  blockSurface: string;
}

export const THEMES: Record<AppTheme, ThemePalette> = {
  navy: {
    id: "navy",
    name: "Midnight Slate",
    nameId: "Biru Navy",
    isDark: true,
    swatch: "#0C1322",
    swatchSecondary: "#1CB0F6",

    background: "#0C1322",
    surface: "#18223B",
    surfaceSubtle: "#131B30",
    surfaceHover: "#202D4E",
    border: "#283659",
    borderLight: "#3A4C78",
    borderSubtle: "#1C2640",
    borderBottom: "#121A2C",

    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",

    primary: "#1CB0F6",
    primaryBottom: "#1488C2",
    primaryHover: "#0FA0E5",
    primaryLight: "rgba(28, 176, 246, 0.16)",
    secondary: "#4895EF",
    secondaryBottom: "#2D7AD4",

    emerald: "#58CC02",
    emeraldBottom: "#46A302",
    emeraldLight: "rgba(88, 204, 2, 0.16)",
    success: "#58CC02",
    successBottom: "#46A302",

    amber: "#FF9600",
    amberBottom: "#CC7800",
    amberLight: "rgba(255, 150, 0, 0.16)",
    warning: "#FF9600",
    warningBottom: "#CC7800",

    rose: "#FF4B4B",
    roseBottom: "#D63434",
    roseLight: "rgba(255, 75, 75, 0.16)",
    danger: "#FF4B4B",
    dangerBottom: "#D63434",

    accent: "#CE82FF",
    accentBottom: "#A855F7",
    accentLight: "rgba(206, 130, 255, 0.16)",
    violet: "#A855F7",
    violetBottom: "#8B3ED8",

    yellow: "#FFC800",
    yellowBottom: "#E5A400",

    cognitiveHigh: "#FF4B4B",
    cognitiveHighBg: "rgba(255, 75, 75, 0.16)",
    cognitiveMedium: "#FF9600",
    cognitiveMediumBg: "rgba(255, 150, 0, 0.16)",
    cognitiveLow: "#58CC02",
    cognitiveLowBg: "rgba(88, 204, 2, 0.16)",

    info: "#1CB0F6",
    textInverse: "#FFFFFF",
    blockBorder: "rgba(28, 176, 246, 0.4)",
    blockSurface: "rgba(28, 176, 246, 0.08)",
  },

  emerald: {
    id: "emerald",
    name: "Emerald Forest",
    nameId: "Hijau Emerald",
    isDark: true,
    swatch: "#0A1811",
    swatchSecondary: "#58CC02",

    background: "#0A1811",
    surface: "#132B1F",
    surfaceSubtle: "#0E2118",
    surfaceHover: "#1A3B2A",
    border: "#224D36",
    borderLight: "#2E6649",
    borderSubtle: "#163324",
    borderBottom: "#0E1F16",

    text: "#F0FDF4",
    textSecondary: "#BBF7D0",
    textMuted: "#86EFAC",

    primary: "#58CC02",
    primaryBottom: "#46A302",
    primaryHover: "#4EBA02",
    primaryLight: "rgba(88, 204, 2, 0.18)",
    secondary: "#22C55E",
    secondaryBottom: "#16A34A",

    emerald: "#58CC02",
    emeraldBottom: "#46A302",
    emeraldLight: "rgba(88, 204, 2, 0.18)",
    success: "#58CC02",
    successBottom: "#46A302",

    amber: "#FF9600",
    amberBottom: "#CC7800",
    amberLight: "rgba(255, 150, 0, 0.16)",
    warning: "#FF9600",
    warningBottom: "#CC7800",

    rose: "#FF4B4B",
    roseBottom: "#D63434",
    roseLight: "rgba(255, 75, 75, 0.16)",
    danger: "#FF4B4B",
    dangerBottom: "#D63434",

    accent: "#CE82FF",
    accentBottom: "#A855F7",
    accentLight: "rgba(206, 130, 255, 0.16)",
    violet: "#A855F7",
    violetBottom: "#8B3ED8",

    yellow: "#FFC800",
    yellowBottom: "#E5A400",

    cognitiveHigh: "#FF4B4B",
    cognitiveHighBg: "rgba(255, 75, 75, 0.16)",
    cognitiveMedium: "#FF9600",
    cognitiveMediumBg: "rgba(255, 150, 0, 0.16)",
    cognitiveLow: "#58CC02",
    cognitiveLowBg: "rgba(88, 204, 2, 0.16)",

    info: "#58CC02",
    textInverse: "#FFFFFF",
    blockBorder: "rgba(88, 204, 2, 0.4)",
    blockSurface: "rgba(88, 204, 2, 0.08)",
  },

  amethyst: {
    id: "amethyst",
    name: "Amethyst Night",
    nameId: "Ungu Amethyst",
    isDark: true,
    swatch: "#110D24",
    swatchSecondary: "#CE82FF",

    background: "#110D24",
    surface: "#1E173E",
    surfaceSubtle: "#16112E",
    surfaceHover: "#2A2054",
    border: "#362A6B",
    borderLight: "#493A8E",
    borderSubtle: "#241C48",
    borderBottom: "#140F2A",

    text: "#FAF5FF",
    textSecondary: "#E9D5FF",
    textMuted: "#C084FC",

    primary: "#CE82FF",
    primaryBottom: "#A855F7",
    primaryHover: "#BA6BF0",
    primaryLight: "rgba(206, 130, 255, 0.18)",
    secondary: "#A855F7",
    secondaryBottom: "#9333EA",

    emerald: "#58CC02",
    emeraldBottom: "#46A302",
    emeraldLight: "rgba(88, 204, 2, 0.16)",
    success: "#58CC02",
    successBottom: "#46A302",

    amber: "#FF9600",
    amberBottom: "#CC7800",
    amberLight: "rgba(255, 150, 0, 0.16)",
    warning: "#FF9600",
    warningBottom: "#CC7800",

    rose: "#FF4B4B",
    roseBottom: "#D63434",
    roseLight: "rgba(255, 75, 75, 0.16)",
    danger: "#FF4B4B",
    dangerBottom: "#D63434",

    accent: "#1CB0F6",
    accentBottom: "#1488C2",
    accentLight: "rgba(28, 176, 246, 0.16)",
    violet: "#CE82FF",
    violetBottom: "#A855F7",

    yellow: "#FFC800",
    yellowBottom: "#E5A400",

    cognitiveHigh: "#FF4B4B",
    cognitiveHighBg: "rgba(255, 75, 75, 0.16)",
    cognitiveMedium: "#FF9600",
    cognitiveMediumBg: "rgba(255, 150, 0, 0.16)",
    cognitiveLow: "#58CC02",
    cognitiveLowBg: "rgba(88, 204, 2, 0.16)",

    info: "#CE82FF",
    textInverse: "#FFFFFF",
    blockBorder: "rgba(206, 130, 255, 0.4)",
    blockSurface: "rgba(206, 130, 255, 0.08)",
  },

  sunset: {
    id: "sunset",
    name: "Sunset Flame",
    nameId: "Oranye Sunset",
    isDark: true,
    swatch: "#19110B",
    swatchSecondary: "#FF9600",

    background: "#19110B",
    surface: "#2C1D14",
    surfaceSubtle: "#20150E",
    surfaceHover: "#3B271B",
    border: "#4D3323",
    borderLight: "#6B4731",
    borderSubtle: "#332217",
    borderBottom: "#1C120C",

    text: "#FFF7ED",
    textSecondary: "#FED7AA",
    textMuted: "#FDBA74",

    primary: "#FF9600",
    primaryBottom: "#CC7800",
    primaryHover: "#E58500",
    primaryLight: "rgba(255, 150, 0, 0.18)",
    secondary: "#F97316",
    secondaryBottom: "#EA580C",

    emerald: "#58CC02",
    emeraldBottom: "#46A302",
    emeraldLight: "rgba(88, 204, 2, 0.16)",
    success: "#58CC02",
    successBottom: "#46A302",

    amber: "#FF9600",
    amberBottom: "#CC7800",
    amberLight: "rgba(255, 150, 0, 0.18)",
    warning: "#FF9600",
    warningBottom: "#CC7800",

    rose: "#FF4B4B",
    roseBottom: "#D63434",
    roseLight: "rgba(255, 75, 75, 0.16)",
    danger: "#FF4B4B",
    dangerBottom: "#D63434",

    accent: "#CE82FF",
    accentBottom: "#A855F7",
    accentLight: "rgba(206, 130, 255, 0.16)",
    violet: "#A855F7",
    violetBottom: "#8B3ED8",

    yellow: "#FFC800",
    yellowBottom: "#E5A400",

    cognitiveHigh: "#FF4B4B",
    cognitiveHighBg: "rgba(255, 75, 75, 0.16)",
    cognitiveMedium: "#FF9600",
    cognitiveMediumBg: "rgba(255, 150, 0, 0.16)",
    cognitiveLow: "#58CC02",
    cognitiveLowBg: "rgba(88, 204, 2, 0.16)",

    info: "#FF9600",
    textInverse: "#FFFFFF",
    blockBorder: "rgba(255, 150, 0, 0.4)",
    blockSurface: "rgba(255, 150, 0, 0.08)",
  },

  sakura: {
    id: "sakura",
    name: "Sakura Coral",
    nameId: "Merah Sakura",
    isDark: true,
    swatch: "#1A0D12",
    swatchSecondary: "#FF4B4B",

    background: "#1A0D12",
    surface: "#2C161F",
    surfaceSubtle: "#211017",
    surfaceHover: "#3B1E2A",
    border: "#4D2736",
    borderLight: "#6B374B",
    borderSubtle: "#331A24",
    borderBottom: "#1C0E14",

    text: "#FFF1F2",
    textSecondary: "#FECDD3",
    textMuted: "#FDA4AF",

    primary: "#FF4B4B",
    primaryBottom: "#D63434",
    primaryHover: "#E54040",
    primaryLight: "rgba(255, 75, 75, 0.18)",
    secondary: "#FB7185",
    secondaryBottom: "#E11D48",

    emerald: "#58CC02",
    emeraldBottom: "#46A302",
    emeraldLight: "rgba(88, 204, 2, 0.16)",
    success: "#58CC02",
    successBottom: "#46A302",

    amber: "#FF9600",
    amberBottom: "#CC7800",
    amberLight: "rgba(255, 150, 0, 0.16)",
    warning: "#FF9600",
    warningBottom: "#CC7800",

    rose: "#FF4B4B",
    roseBottom: "#D63434",
    roseLight: "rgba(255, 75, 75, 0.18)",
    danger: "#FF4B4B",
    dangerBottom: "#D63434",

    accent: "#CE82FF",
    accentBottom: "#A855F7",
    accentLight: "rgba(206, 130, 255, 0.16)",
    violet: "#A855F7",
    violetBottom: "#8B3ED8",

    yellow: "#FFC800",
    yellowBottom: "#E5A400",

    cognitiveHigh: "#FF4B4B",
    cognitiveHighBg: "rgba(255, 75, 75, 0.16)",
    cognitiveMedium: "#FF9600",
    cognitiveMediumBg: "rgba(255, 150, 0, 0.16)",
    cognitiveLow: "#58CC02",
    cognitiveLowBg: "rgba(88, 204, 2, 0.16)",

    info: "#FF4B4B",
    textInverse: "#FFFFFF",
    blockBorder: "rgba(255, 75, 75, 0.4)",
    blockSurface: "rgba(255, 75, 75, 0.08)",
  },

  high_contrast: {
    id: "high_contrast",
    name: "AMOLED Pitch Black",
    nameId: "Hitam AMOLED",
    isDark: true,
    swatch: "#000000",
    swatchSecondary: "#38BDF8",

    background: "#000000",
    surface: "#121212",
    surfaceSubtle: "#0A0A0A",
    surfaceHover: "#202020",
    border: "#3A3A3A",
    borderLight: "#505050",
    borderSubtle: "#222222",
    borderBottom: "#050505",

    text: "#FFFFFF",
    textSecondary: "#E2E8F0",
    textMuted: "#A1A1AA",

    primary: "#38BDF8",
    primaryBottom: "#0284C7",
    primaryHover: "#0EA5E9",
    primaryLight: "rgba(56, 189, 248, 0.20)",
    secondary: "#60A5FA",
    secondaryBottom: "#2563EB",

    emerald: "#4ADE80",
    emeraldBottom: "#16A34A",
    emeraldLight: "rgba(74, 222, 128, 0.20)",
    success: "#4ADE80",
    successBottom: "#16A34A",

    amber: "#FBBF24",
    amberBottom: "#D97706",
    amberLight: "rgba(251, 191, 36, 0.20)",
    warning: "#FBBF24",
    warningBottom: "#D97706",

    rose: "#F87171",
    roseBottom: "#DC2626",
    roseLight: "rgba(248, 113, 113, 0.20)",
    danger: "#F87171",
    dangerBottom: "#DC2626",

    accent: "#C084FC",
    accentBottom: "#9333EA",
    accentLight: "rgba(192, 132, 252, 0.20)",
    violet: "#C084FC",
    violetBottom: "#9333EA",

    yellow: "#FACC15",
    yellowBottom: "#CA8A04",

    cognitiveHigh: "#F87171",
    cognitiveHighBg: "rgba(248, 113, 113, 0.20)",
    cognitiveMedium: "#FBBF24",
    cognitiveMediumBg: "rgba(251, 191, 36, 0.20)",
    cognitiveLow: "#4ADE80",
    cognitiveLowBg: "rgba(74, 222, 128, 0.20)",

    info: "#38BDF8",
    textInverse: "#FFFFFF",
    blockBorder: "rgba(56, 189, 248, 0.4)",
    blockSurface: "rgba(56, 189, 248, 0.08)",
  },

  daylight: {
    id: "daylight",
    name: "Paper Daylight",
    nameId: "Terang Putih",
    isDark: false,
    swatch: "#F1F5F9",
    swatchSecondary: "#1CB0F6",

    background: "#F1F5F9",
    surface: "#FFFFFF",
    surfaceSubtle: "#F8FAFC",
    surfaceHover: "#E2E8F0",
    border: "#CBD5E1",
    borderLight: "#94A3B8",
    borderSubtle: "#E2E8F0",
    borderBottom: "#94A3B8",

    text: "#0F172A",
    textSecondary: "#334155",
    textMuted: "#64748B",

    primary: "#1CB0F6",
    primaryBottom: "#1488C2",
    primaryHover: "#0FA0E5",
    primaryLight: "rgba(28, 176, 246, 0.14)",
    secondary: "#3B82F6",
    secondaryBottom: "#1D4ED8",

    emerald: "#58CC02",
    emeraldBottom: "#46A302",
    emeraldLight: "rgba(88, 204, 2, 0.14)",
    success: "#58CC02",
    successBottom: "#46A302",

    amber: "#FF9600",
    amberBottom: "#CC7800",
    amberLight: "rgba(255, 150, 0, 0.14)",
    warning: "#FF9600",
    warningBottom: "#CC7800",

    rose: "#FF4B4B",
    roseBottom: "#D63434",
    roseLight: "rgba(255, 75, 75, 0.14)",
    danger: "#FF4B4B",
    dangerBottom: "#D63434",

    accent: "#CE82FF",
    accentBottom: "#A855F7",
    accentLight: "rgba(206, 130, 255, 0.14)",
    violet: "#A855F7",
    violetBottom: "#8B3ED8",

    yellow: "#FFC800",
    yellowBottom: "#E5A400",

    cognitiveHigh: "#FF4B4B",
    cognitiveHighBg: "rgba(255, 75, 75, 0.14)",
    cognitiveMedium: "#FF9600",
    cognitiveMediumBg: "rgba(255, 150, 0, 0.14)",
    cognitiveLow: "#58CC02",
    cognitiveLowBg: "rgba(88, 204, 2, 0.14)",

    info: "#1CB0F6",
    textInverse: "#FFFFFF",
    blockBorder: "rgba(28, 176, 246, 0.4)",
    blockSurface: "rgba(28, 176, 246, 0.08)",
  },
};

const isWeb = Platform.OS === "web";
let activeThemeKey: AppTheme = "navy";

/**
 * Apply theme dynamically across Web & Native.
 * On Web, custom CSS variables are updated on the DOM root for zero-delay cascading updates.
 */
export function applyTheme(themeKey: AppTheme) {
  const palette = THEMES[themeKey] || THEMES.navy;
  activeThemeKey = themeKey;

  // Mutate colors runtime mirror
  Object.assign(rawColors, palette);

  if (isWeb && typeof document !== "undefined" && document.documentElement) {
    const root = document.documentElement;
    root.style.setProperty("--color-bg", palette.background);
    root.style.setProperty("--color-surface", palette.surface);
    root.style.setProperty("--color-surfaceSubtle", palette.surfaceSubtle);
    root.style.setProperty("--color-surfaceHover", palette.surfaceHover);
    root.style.setProperty("--color-border", palette.border);
    root.style.setProperty("--color-borderLight", palette.borderLight);
    root.style.setProperty("--color-borderSubtle", palette.borderSubtle);
    root.style.setProperty("--color-borderBottom", palette.borderBottom);
    root.style.setProperty("--color-text", palette.text);
    root.style.setProperty("--color-textSecondary", palette.textSecondary);
    root.style.setProperty("--color-textMuted", palette.textMuted);
    root.style.setProperty("--color-primary", palette.primary);
    root.style.setProperty("--color-primaryBottom", palette.primaryBottom);
    root.style.setProperty("--color-primaryHover", palette.primaryHover);
    root.style.setProperty("--color-primaryLight", palette.primaryLight);
    root.style.setProperty("--color-secondary", palette.secondary);
    root.style.setProperty("--color-secondaryBottom", palette.secondaryBottom);
    root.style.setProperty("--color-emerald", palette.emerald);
    root.style.setProperty("--color-emeraldBottom", palette.emeraldBottom);
    root.style.setProperty("--color-emeraldLight", palette.emeraldLight);
    root.style.setProperty("--color-success", palette.success);
    root.style.setProperty("--color-successBottom", palette.successBottom);
    root.style.setProperty("--color-amber", palette.amber);
    root.style.setProperty("--color-amberBottom", palette.amberBottom);
    root.style.setProperty("--color-amberLight", palette.amberLight);
    root.style.setProperty("--color-warning", palette.warning);
    root.style.setProperty("--color-warningBottom", palette.warningBottom);
    root.style.setProperty("--color-rose", palette.rose);
    root.style.setProperty("--color-roseBottom", palette.roseBottom);
    root.style.setProperty("--color-roseLight", palette.roseLight);
    root.style.setProperty("--color-danger", palette.danger);
    root.style.setProperty("--color-dangerBottom", palette.dangerBottom);
    root.style.setProperty("--color-accent", palette.accent);
    root.style.setProperty("--color-accentBottom", palette.accentBottom);
    root.style.setProperty("--color-accentLight", palette.accentLight);
    root.style.setProperty("--color-violet", palette.violet);
    root.style.setProperty("--color-violetBottom", palette.violetBottom);
    root.style.setProperty("--color-yellow", palette.yellow);
    root.style.setProperty("--color-yellowBottom", palette.yellowBottom);
    root.style.setProperty("--color-cognitiveHigh", palette.cognitiveHigh);
    root.style.setProperty("--color-cognitiveHighBg", palette.cognitiveHighBg);
    root.style.setProperty("--color-cognitiveMedium", palette.cognitiveMedium);
    root.style.setProperty("--color-cognitiveMediumBg", palette.cognitiveMediumBg);
    root.style.setProperty("--color-cognitiveLow", palette.cognitiveLow);
    root.style.setProperty("--color-cognitiveLowBg", palette.cognitiveLowBg);
    root.style.setProperty("--color-info", palette.info);
    root.style.setProperty("--color-textInverse", palette.textInverse);
    root.style.setProperty("--color-blockBorder", palette.blockBorder);
    root.style.setProperty("--color-blockSurface", palette.blockSurface);

    if (document.body) {
      document.body.style.backgroundColor = palette.background;
    }
  }
}

export function getActiveTheme(): ThemePalette {
  return THEMES[activeThemeKey] || THEMES.navy;
}

export function getThemeColors(themeKey?: AppTheme): ThemePalette {
  return THEMES[themeKey || activeThemeKey] || THEMES.navy;
}

const rawColors: ThemePalette = { ...THEMES.navy };

export const colors: ThemePalette = new Proxy(rawColors, {
  get(target, prop: string) {
    if (isWeb) {
      const varMap: Record<string, string> = {
        background: `var(--color-bg, ${rawColors.background || "#0C1322"})`,
        surface: `var(--color-surface, ${rawColors.surface || "#18223B"})`,
        surfaceSubtle: `var(--color-surfaceSubtle, ${rawColors.surfaceSubtle || "#131B30"})`,
        surfaceHover: `var(--color-surfaceHover, ${rawColors.surfaceHover || "#202D4E"})`,
        border: `var(--color-border, ${rawColors.border || "#283659"})`,
        borderLight: `var(--color-borderLight, ${rawColors.borderLight || "#3A4C78"})`,
        borderSubtle: `var(--color-borderSubtle, ${rawColors.borderSubtle || "#1C2640"})`,
        borderBottom: `var(--color-borderBottom, ${rawColors.borderBottom || "#121A2C"})`,
        text: `var(--color-text, ${rawColors.text || "#F8FAFC"})`,
        textSecondary: `var(--color-textSecondary, ${rawColors.textSecondary || "#CBD5E1"})`,
        textMuted: `var(--color-textMuted, ${rawColors.textMuted || "#94A3B8"})`,
        primary: `var(--color-primary, ${rawColors.primary || "#1CB0F6"})`,
        primaryBottom: `var(--color-primaryBottom, ${rawColors.primaryBottom || "#1488C2"})`,
        primaryHover: `var(--color-primaryHover, ${rawColors.primaryHover || "#0FA0E5"})`,
        primaryLight: `var(--color-primaryLight, ${rawColors.primaryLight || "rgba(28, 176, 246, 0.16)"})`,
        secondary: `var(--color-secondary, ${rawColors.secondary || "#4895EF"})`,
        secondaryBottom: `var(--color-secondaryBottom, ${rawColors.secondaryBottom || "#2D7AD4"})`,
        emerald: `var(--color-emerald, ${rawColors.emerald || "#58CC02"})`,
        emeraldBottom: `var(--color-emeraldBottom, ${rawColors.emeraldBottom || "#46A302"})`,
        emeraldLight: `var(--color-emeraldLight, ${rawColors.emeraldLight || "rgba(88, 204, 2, 0.16)"})`,
        success: `var(--color-success, ${rawColors.success || "#58CC02"})`,
        successBottom: `var(--color-successBottom, ${rawColors.successBottom || "#46A302"})`,
        amber: `var(--color-amber, ${rawColors.amber || "#FF9600"})`,
        amberBottom: `var(--color-amberBottom, ${rawColors.amberBottom || "#CC7800"})`,
        amberLight: `var(--color-amberLight, ${rawColors.amberLight || "rgba(255, 150, 0, 0.16)"})`,
        warning: `var(--color-warning, ${rawColors.warning || "#FF9600"})`,
        warningBottom: `var(--color-warningBottom, ${rawColors.warningBottom || "#CC7800"})`,
        rose: `var(--color-rose, ${rawColors.rose || "#FF4B4B"})`,
        roseBottom: `var(--color-roseBottom, ${rawColors.roseBottom || "#D63434"})`,
        roseLight: `var(--color-roseLight, ${rawColors.roseLight || "rgba(255, 75, 75, 0.16)"})`,
        danger: `var(--color-danger, ${rawColors.danger || "#FF4B4B"})`,
        dangerBottom: `var(--color-dangerBottom, ${rawColors.dangerBottom || "#D63434"})`,
        accent: `var(--color-accent, ${rawColors.accent || "#CE82FF"})`,
        accentBottom: `var(--color-accentBottom, ${rawColors.accentBottom || "#A855F7"})`,
        accentLight: `var(--color-accentLight, ${rawColors.accentLight || "rgba(206, 130, 255, 0.16)"})`,
        violet: `var(--color-violet, ${rawColors.violet || "#A855F7"})`,
        violetBottom: `var(--color-violetBottom, ${rawColors.violetBottom || "#8B3ED8"})`,
        yellow: `var(--color-yellow, ${rawColors.yellow || "#FFC800"})`,
        yellowBottom: `var(--color-yellowBottom, ${rawColors.yellowBottom || "#E5A400"})`,
        cognitiveHigh: `var(--color-cognitiveHigh, ${rawColors.cognitiveHigh || "#FF4B4B"})`,
        cognitiveHighBg: `var(--color-cognitiveHighBg, ${rawColors.cognitiveHighBg || "rgba(255, 75, 75, 0.16)"})`,
        cognitiveMedium: `var(--color-cognitiveMedium, ${rawColors.cognitiveMedium || "#FF9600"})`,
        cognitiveMediumBg: `var(--color-cognitiveMediumBg, ${rawColors.cognitiveMediumBg || "rgba(255, 150, 0, 0.16)"})`,
        cognitiveLow: `var(--color-cognitiveLow, ${rawColors.cognitiveLow || "#58CC02"})`,
        cognitiveLowBg: `var(--color-cognitiveLowBg, ${rawColors.cognitiveLowBg || "rgba(88, 204, 2, 0.16)"})`,
        info: `var(--color-info, ${rawColors.info || "#1CB0F6"})`,
        textInverse: `var(--color-textInverse, ${rawColors.textInverse || "#FFFFFF"})`,
        blockBorder: `var(--color-blockBorder, ${rawColors.blockBorder || "rgba(28, 176, 246, 0.4)"})`,
        blockSurface: `var(--color-blockSurface, ${rawColors.blockSurface || "rgba(28, 176, 246, 0.08)"})`,
      };
      if (prop in varMap) return varMap[prop];
    }
    return (rawColors as any)[prop] ?? (THEMES.navy as any)[prop];
  },
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  grid: 8, // Strict 8dp grid unit
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  card: 18, // Duolingo chunky card corners
  cardLarge: 22, // Hero card corners
  lg: 18,
  xl: 22,
  full: 9999,
} as const;

export const touchTarget = {
  min: 48, // Minimum touch target size in dp
} as const;

const fontSizes = {
  caption: 12, // Caption: 12sp
  body: 13,    // Body: 13sp
  section: 15, // Section: 15sp
  title: 20,   // Title: 20sp

  // Backwards compatibility aliases
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 20,
  xxl: 24,
} as const;

export const tidySpacing = {
  small: 8,
  medium: 16,
  large: 24,
  screen: 16,
} as const;

export const typography = {
  fontSizes,
  sizes: fontSizes,
  fontWeights: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    heavy: "800" as const,
  },
} as const;
