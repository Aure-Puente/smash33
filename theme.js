//Theme:
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

// ---- Escalas base ----
export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };
export const SPACING = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32 };

export const FONT_FAMILY = {
  displayBold: "Rajdhani_700Bold",
  displaySemibold: "Rajdhani_600SemiBold",
  displayMedium: "Rajdhani_500Medium",
  bold: "Manrope_700Bold",
  semibold: "Manrope_600SemiBold",
  medium: "Manrope_500Medium",
  regular: "Manrope_400Regular",
};

export const CHART_PALETTE = [
  "#F0303A", "#2F8CFF", "#26B36B", "#FFD23F",
  "#FF6FA8", "#F2F3F7", "#F2B84B", "#9B5DE5",
];

export const GOLD = "#F2B84B";
const GOLD_ON = "#241A05";
const DANGER = "#FF4569";
const DANGER_ON = "#2A0008";
export const SUCCESS = "#26B36B";

const NEUTRAL_DARK = {
  bg: "#0A0A0E",
  surface: "#121217",
  surface2: "#1A1A21",
  surface3: "#23232B",
  outline: "#2A2A33",
  text: "#F4F3F8",
  textMuted: "#9794A3",
  scrim: "rgba(4,4,7,0.8)",
};

const NEUTRAL_LIGHT = {
  bg: "#F7F5F2",
  surface: "#FFFFFF",
  surface2: "#F0EDF7",
  surface3: "#E7E2F0",
  outline: "#E4E0EA",
  text: "#1B1926",
  textMuted: "#6E6879",
  scrim: "rgba(27,25,38,0.55)",
};

export const ACCENTS = {
  mario: {
    key: "mario",
    label: "Rojo Mario",
    primary: "#FF4B4B",
    primaryPressed: "#E33333",
    onPrimary: "#2B0605",
    tint: "rgba(255,75,75,0.16)",
  },
  luigi: {
    key: "luigi",
    label: "Verde Luigi",
    primary: "#26B36B",
    primaryPressed: "#1B9257",
    onPrimary: "#04140D",
    tint: "rgba(38,179,107,0.16)",
  },
  kirby: {
    key: "kirby",
    label: "Rosa Kirby",
    primary: "#FF6FA8",
    primaryPressed: "#E9508C",
    onPrimary: "#2B0716",
    tint: "rgba(255,111,168,0.16)",
  },
  pikachu: {
    key: "pikachu",
    label: "Amarillo Pikachu",
    primary: "#FFD23F",
    primaryPressed: "#E6B920",
    onPrimary: "#241A02",
    tint: "rgba(255,210,63,0.18)",
  },
  sonic: {
    key: "sonic",
    label: "Azul Sonic",
    primary: "#2F8CFF",
    primaryPressed: "#1C6FDE",
    onPrimary: "#041526",
    tint: "rgba(47,140,255,0.16)",
  },
  wolf: {
    key: "wolf",
    label: "Blanco Wolf",
    primary: "#F2F3F7",
    primaryPressed: "#D6D9E2",
    onPrimary: "#14151A",
    tint: "rgba(242,243,247,0.14)",
  },
};

export const ACCENT_LIST = Object.values(ACCENTS);
export const DEFAULT_ACCENT = "mario";

const FONT_MAP = {
  displayLarge: FONT_FAMILY.displayBold,
  displayMedium: FONT_FAMILY.displayBold,
  displaySmall: FONT_FAMILY.displayBold,
  headlineLarge: FONT_FAMILY.displayBold,
  headlineMedium: FONT_FAMILY.displaySemibold,
  headlineSmall: FONT_FAMILY.displaySemibold,
  titleLarge: FONT_FAMILY.displaySemibold,
  titleMedium: FONT_FAMILY.bold,
  titleSmall: FONT_FAMILY.bold,
  labelLarge: FONT_FAMILY.semibold,
  labelMedium: FONT_FAMILY.semibold,
  labelSmall: FONT_FAMILY.semibold,
  bodyLarge: FONT_FAMILY.medium,
  bodyMedium: FONT_FAMILY.medium,
  bodySmall: FONT_FAMILY.regular,
};

function buildFonts(baseVariants) {
  const result = {};
  Object.keys(baseVariants).forEach((key) => {
    result[key] = { ...baseVariants[key], fontFamily: FONT_MAP[key] || FONT_FAMILY.regular };
  });
  return result;
}

const DARK_FONTS = buildFonts(MD3DarkTheme.fonts);
const LIGHT_FONTS = buildFonts(MD3LightTheme.fonts);

export function buildTheme(accentKey = DEFAULT_ACCENT, scheme = "dark") {
  const accent = ACCENTS[accentKey] || ACCENTS[DEFAULT_ACCENT];
  const isDark = scheme === "dark";
  const neutrals = isDark ? NEUTRAL_DARK : NEUTRAL_LIGHT;
  const base = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...base,
    dark: isDark,
    fonts: isDark ? DARK_FONTS : LIGHT_FONTS,
    colors: {
      ...base.colors,
      primary: accent.primary,
      onPrimary: accent.onPrimary,
      primaryContainer: accent.tint,
      onPrimaryContainer: neutrals.text,
      secondary: GOLD,
      onSecondary: GOLD_ON,
      background: neutrals.bg,
      onBackground: neutrals.text,
      surface: neutrals.surface,
      onSurface: neutrals.text,
      surfaceVariant: neutrals.surface2,
      onSurfaceVariant: neutrals.textMuted,
      outline: neutrals.outline,
      outlineVariant: neutrals.outline,
      error: DANGER,
      onError: DANGER_ON,
      backdrop: neutrals.scrim,
      elevation: {
        level0: "transparent",
        level1: neutrals.surface,
        level2: neutrals.surface2,
        level3: neutrals.surface3,
        level4: neutrals.surface3,
        level5: neutrals.surface3,
      },
    },
    custom: {
      accentKey: accent.key,
      accentLabel: accent.label,
      primaryPressed: accent.primaryPressed,
      tint: accent.tint,
      gold: GOLD,
      success: SUCCESS,
      danger: DANGER,
      surface2: neutrals.surface2,
      surface3: neutrals.surface3,
      scrim: neutrals.scrim,
      isDark,
    },
  };
}

export const LightTheme = buildTheme(DEFAULT_ACCENT, "light");
export const DarkTheme = buildTheme(DEFAULT_ACCENT, "dark");