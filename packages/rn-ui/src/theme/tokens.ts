import type {
  Theme,
  ThemeColors,
  ThemeComponents,
  ThemeFonts,
  ThemeRadii,
  ThemeShadows,
  ThemeSpacing,
  ThemeTypography,
} from "./types";

export const fonts: ThemeFonts = {
  regular: undefined,
  medium: undefined,
  semibold: undefined,
  bold: undefined,
  mono: undefined,
};

export const spacing: ThemeSpacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii: ThemeRadii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const typography: ThemeTypography = {
  display: { fontSize: 44, lineHeight: 52, fontWeight: "700" },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: "700" },
  h2: { fontSize: 28, lineHeight: 36, fontWeight: "700" },
  h3: { fontSize: 24, lineHeight: 32, fontWeight: "600" },
  title: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
  subtitle: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  labelSmall: { fontSize: 12, lineHeight: 16, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400" },
};

const ZERO_SHADOW = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
  boxShadow: undefined,
};

export const flatShadows: ThemeShadows = {
  none: ZERO_SHADOW,
  sm: ZERO_SHADOW,
  md: ZERO_SHADOW,
  lg: ZERO_SHADOW,
};

export const subtleShadows: ThemeShadows = {
  none: ZERO_SHADOW,
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
};

export function createHardShadows(
  color: string,
  offsets?: { sm?: number; md?: number; lg?: number },
): ThemeShadows {
  const sm = offsets?.sm ?? 2;
  const md = offsets?.md ?? 4;
  const lg = offsets?.lg ?? 6;

  return {
    none: ZERO_SHADOW,
    sm: {
      shadowColor: color,
      shadowOffset: { width: sm, height: sm },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
      boxShadow: `${sm}px ${sm}px 0px 0px ${color}`,
    },
    md: {
      shadowColor: color,
      shadowOffset: { width: md, height: md },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
      boxShadow: `${md}px ${md}px 0px 0px ${color}`,
    },
    lg: {
      shadowColor: color,
      shadowOffset: { width: lg, height: lg },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 0,
      boxShadow: `${lg}px ${lg}px 0px 0px ${color}`,
    },
  };
}

const components: ThemeComponents = {
  touchTarget: {
    min: 44,
  },
  borderWidth: {
    default: 1,
    strong: 1.5,
    control: 1.5,
    filled: 0,
    focus: 2,
    ring: 2,
    hairline: 0.5,
  },
  surface: {
    cardShadow: "none",
    buttonShadow: "none",
    inputShadow: "none",
    feedbackShadow: "none",
    filledBorderColor: "transparent",
    outlineBorderColor: "border",
    outlineBorderOpacity: 0.48,
    outlineStyle: "bordered",
    pressEffect: "scale",
    pressOffset: 0,
  },
  button: {
    height: { xs: 28, sm: 34, md: 40, lg: 46, xl: 52 },
    paddingX: { xs: 10, sm: 14, md: 18, lg: 22, xl: 26 },
    fontSize: { xs: 12, sm: 13, md: 14, lg: 15, xl: 16 },
    iconSize: { xs: 13, sm: 15, md: 17, lg: 19, xl: 21 },
    gap: { xs: 4, sm: 6, md: 8, lg: 8, xl: 10 },
  },
  iconButton: {
    size: { xs: 28, sm: 34, md: 40, lg: 46, xl: 52 },
    iconSize: { xs: 14, sm: 16, md: 19, lg: 21, xl: 24 },
    badge: {
      size: 16,
      minWidth: 16,
      offset: -2,
      paddingX: 4,
      borderWidth: 1.5,
      fontSize: 9,
      lineHeight: 11,
    },
  },
  checkbox: {
    size: { xs: 16, sm: 18, md: 20, lg: 24, xl: 28 },
    radius: { xs: 4, sm: 4, md: 5, lg: 6, xl: 7 },
    iconSize: { xs: 10, sm: 11, md: 12, lg: 15, xl: 18 },
  },
  chip: {
    height: { xs: 24, sm: 28, md: 34, lg: 40, xl: 46 },
    paddingX: { xs: 8, sm: 10, md: 12, lg: 16, xl: 18 },
    iconSize: { xs: 12, sm: 13, md: 15, lg: 17, xl: 19 },
    fontSize: { xs: 11, sm: 12, md: 13, lg: 14, xl: 15 },
  },
  segmentedControl: {
    height: { xs: 28, sm: 32, md: 38, lg: 44, xl: 50 },
    padding: 3,
    iconSize: { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 },
    fontSize: { xs: 11, sm: 12, md: 13, lg: 14, xl: 15 },
  },
  stepper: {
    height: { xs: 32, sm: 36, md: 44, lg: 52, xl: 56 },
    buttonSize: { xs: 24, sm: 28, md: 36, lg: 42, xl: 46 },
    iconSize: { xs: 11, sm: 12, md: 14, lg: 16, xl: 18 },
  },
  input: {
    height: { xs: 32, sm: 36, md: 44, lg: 52, xl: 56 },
    paddingX: { xs: 8, sm: 10, md: 12, lg: 14, xl: 16 },
  },
  inputOTP: {
    width: { xs: 32, sm: 38, md: 44, lg: 52, xl: 58 },
    height: { xs: 38, sm: 44, md: 50, lg: 58, xl: 64 },
    fontSize: { xs: 15, sm: 17, md: 20, lg: 24, xl: 28 },
    caretHeight: { xs: 16, sm: 18, md: 22, lg: 26, xl: 30 },
  },
  calendar: {
    dayHeight: 38,
    arrowSize: 32,
  },
  timeline: {
    indicatorSize: 12,
    connectorWidth: 1.5,
    connectorMinHeight: 32,
  },
  table: {
    minColumnWidth: 120,
  },
  metricCard: {
    iconSize: 20,
  },
  floatingActionButton: {
    size: { xs: 36, sm: 44, md: 52, lg: 60, xl: 68 },
    iconSize: { xs: 16, sm: 18, md: 22, lg: 24, xl: 28 },
    paddingX: { xs: 10, sm: 14, md: 18, lg: 22, xl: 26 },
  },
  switch: {
    width: { xs: 36, sm: 42, md: 50, lg: 58, xl: 66 },
    height: { xs: 20, sm: 24, md: 30, lg: 34, xl: 38 },
    thumbSize: { xs: 14, sm: 18, md: 22, lg: 26, xl: 30 },
    iconSize: { xs: 9, sm: 10, md: 12, lg: 14, xl: 16 },
  },
  slider: {
    height: 36,
    trackHeight: 8,
    thumbSize: 22,
    activeThumbSize: 28,
    hitSlop: 12,
  },
  rating: {
    size: { xs: 14, sm: 16, md: 24, lg: 32, xl: 40 },
  },
};

const lightColors: ThemeColors = {
  background: "#F8FAFC",
  backgroundMuted: "#F1F5F9",
  backgroundSubtle: "#E2E8F0",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  text: "#0F172A",
  textMuted: "#475569",
  textSubtle: "#64748B",
  textInverse: "#FFFFFF",
  primary: "#4F46E5",
  primarySoft: "#EEF2FF",
  primaryStrong: "#3730A3",
  onPrimary: "#FFFFFF",
  secondary: "#334155",
  secondarySoft: "#E2E8F0",
  onSecondary: "#FFFFFF",
  accent: "#C2410C",
  accentSoft: "#FFF7ED",
  onAccent: "#FFFFFF",
  success: "#047857",
  successSoft: "#ECFDF5",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  onWarning: "#111827",
  danger: "#B91C1C",
  dangerSoft: "#FEF2F2",
  onDanger: "#FFFFFF",
  info: "#0369A1",
  infoSoft: "#F0F9FF",
  onInfo: "#FFFFFF",
  border: "rgba(15, 23, 42, 0.15)",
  borderMuted: "rgba(15, 23, 42, 0.08)",
  divider: "rgba(15, 23, 42, 0.15)",
  input: "#FFFFFF",
  placeholder: "#64748B",
  disabled: "#E2E8F0",
  disabledText: "#64748B",
  overlay: "rgba(15, 23, 42, 0.48)",
  glassSurface: "rgba(255, 255, 255, 0.78)",
  glassSurfaceStrong: "rgba(255, 255, 255, 0.90)",
  glassBorder: "rgba(15, 23, 42, 0.15)",
  transparent: "transparent",
};

const darkColors: ThemeColors = {
  background: "#08111F",
  backgroundMuted: "#0F1B2D",
  backgroundSubtle: "#17243A",
  surface: "#0F1B2D",
  surfaceRaised: "#1E293B",
  surfaceMuted: "#0B1320",
  text: "#F8FAFC",
  textMuted: "#CBD5E1",
  textSubtle: "#94A3B8",
  textInverse: "#0F172A",
  primary: "#818CF8",
  primarySoft: "#1E1B4B",
  primaryStrong: "#A5B4FC",
  onPrimary: "#0F172A",
  secondary: "#CBD5E1",
  secondarySoft: "#334155",
  onSecondary: "#0F172A",
  accent: "#FB923C",
  accentSoft: "#431407",
  onAccent: "#0F172A",
  success: "#34D399",
  successSoft: "#064E3B",
  onSuccess: "#052E16",
  warning: "#FBBF24",
  warningSoft: "#451A03",
  onWarning: "#0F172A",
  danger: "#F87171",
  dangerSoft: "#450A0A",
  onDanger: "#0F172A",
  info: "#38BDF8",
  infoSoft: "#0C4A6E",
  onInfo: "#082F49",
  border: "rgba(248, 250, 252, 0.18)",
  borderMuted: "rgba(248, 250, 252, 0.10)",
  divider: "rgba(248, 250, 252, 0.18)",
  input: "#0F1B2D",
  placeholder: "#94A3B8",
  disabled: "#1E293B",
  disabledText: "#94A3B8",
  overlay: "rgba(0, 0, 0, 0.72)",
  glassSurface: "rgba(15, 27, 45, 0.72)",
  glassSurfaceStrong: "rgba(15, 27, 45, 0.88)",
  glassBorder: "rgba(248, 250, 252, 0.18)",
  transparent: "transparent",
};

export const lightTheme: Theme = {
  mode: "light",
  dark: false,
  elevation: true,
  colors: lightColors,
  fonts,
  typography,
  spacing,
  radii,
  shadows: subtleShadows,
  components,
};

export const darkTheme: Theme = {
  mode: "dark",
  dark: true,
  elevation: true,
  colors: darkColors,
  fonts,
  typography,
  spacing,
  radii,
  shadows: subtleShadows,
  components,
};

export const defaultThemes = {
  light: lightTheme,
  dark: darkTheme,
} as const;
