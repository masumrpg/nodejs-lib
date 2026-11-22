import type { ReactNode } from "react";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

export type ThemeMode = "light" | "dark";
export type ColorSchemePreference = ThemeMode | "system";
export type ThemeScaleSize = "xs" | "sm" | "md" | "lg" | "xl";

export type ThemeStyle = ViewStyle | TextStyle | ImageStyle;
export type ThemeNamedStyles<T> = { [P in keyof T]: ThemeStyle };
export type ThemeStyleFactory<T extends ThemeNamedStyles<T>> = (
  theme: Theme,
) => T;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface ThemeColors {
  background: string;
  backgroundMuted: string;
  backgroundSubtle: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  primary: string;
  primarySoft: string;
  primaryStrong: string;
  onPrimary: string;
  secondary: string;
  secondarySoft: string;
  onSecondary: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  onSuccess: string;
  warning: string;
  warningSoft: string;
  onWarning: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
  info: string;
  infoSoft: string;
  onInfo: string;
  border: string;
  borderMuted: string;
  divider: string;
  input: string;
  placeholder: string;
  disabled: string;
  disabledText: string;
  overlay: string;
  glassSurface: string;
  glassSurfaceStrong: string;
  glassBorder: string;
  transparent: string;
}

export interface TypographyVariant {
  fontFamily?: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: TextStyle["fontWeight"];
  letterSpacing?: number;
}

export interface ThemeTypography {
  display: TypographyVariant;
  h1: TypographyVariant;
  h2: TypographyVariant;
  h3: TypographyVariant;
  title: TypographyVariant;
  subtitle: TypographyVariant;
  body: TypographyVariant;
  bodySmall: TypographyVariant;
  label: TypographyVariant;
  labelSmall: TypographyVariant;
  caption: TypographyVariant;
}

export interface ThemeFonts {
  regular?: string;
  medium?: string;
  semibold?: string;
  bold?: string;
  mono?: string;
}

export interface ThemeSpacing {
  none: number;
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface ThemeRadii {
  none: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  full: number;
}

export interface ThemeShadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
  boxShadow?: string;
}

export interface ThemeShadows {
  none: ThemeShadow;
  sm: ThemeShadow;
  md: ThemeShadow;
  lg: ThemeShadow;
}

export interface ThemeSurfaceStyle {
  cardShadow: keyof ThemeShadows;
  buttonShadow: keyof ThemeShadows;
  inputShadow: keyof ThemeShadows;
  feedbackShadow: keyof ThemeShadows;
  filledBorderColor: "transparent" | "border";
  outlineBorderColor: "border" | "tone";
  outlineBorderOpacity: number;
  outlineStyle: "bordered" | "tonal";
  pressEffect: "scale" | "offset";
  pressOffset: number;
}

export interface ThemeComponents {
  touchTarget: {
    min: number;
  };
  borderWidth: {
    default: number;
    strong: number;
    control: number;
    filled: number;
    focus: number;
    ring: number;
    hairline: number;
  };
  surface: ThemeSurfaceStyle;
  button: {
    height: Record<ThemeScaleSize, number>;
    paddingX: Record<ThemeScaleSize, number>;
    fontSize: Record<ThemeScaleSize, number>;
    iconSize: Record<ThemeScaleSize, number>;
    gap: Record<ThemeScaleSize, number>;
  };
  iconButton: {
    size: Record<ThemeScaleSize, number>;
    iconSize: Record<ThemeScaleSize, number>;
    badge: {
      size: number;
      minWidth: number;
      offset: number;
      paddingX: number;
      borderWidth: number;
      fontSize: number;
      lineHeight: number;
    };
  };
  checkbox: {
    size: Record<ThemeScaleSize, number>;
    radius: Record<ThemeScaleSize, number>;
    iconSize: Record<ThemeScaleSize, number>;
  };
  chip: {
    height: Record<ThemeScaleSize, number>;
    paddingX: Record<ThemeScaleSize, number>;
    iconSize: Record<ThemeScaleSize, number>;
    fontSize: Record<ThemeScaleSize, number>;
  };
  segmentedControl: {
    height: Record<ThemeScaleSize, number>;
    padding: number;
    iconSize: Record<ThemeScaleSize, number>;
    fontSize: Record<ThemeScaleSize, number>;
  };
  stepper: {
    height: Record<ThemeScaleSize, number>;
    buttonSize: Record<ThemeScaleSize, number>;
    iconSize: Record<ThemeScaleSize, number>;
  };
  input: {
    height: Record<ThemeScaleSize, number>;
    paddingX: Record<ThemeScaleSize, number>;
  };
  inputOTP: {
    width: Record<ThemeScaleSize, number>;
    height: Record<ThemeScaleSize, number>;
    fontSize: Record<ThemeScaleSize, number>;
    caretHeight: Record<ThemeScaleSize, number>;
  };
  calendar: {
    dayHeight: number;
    arrowSize: number;
  };
  timeline: {
    indicatorSize: number;
    connectorWidth: number;
    connectorMinHeight: number;
  };
  table: {
    minColumnWidth: number;
  };
  metricCard: {
    iconSize: number;
  };
  floatingActionButton: {
    size: Record<ThemeScaleSize, number>;
    iconSize: Record<ThemeScaleSize, number>;
    paddingX: Record<ThemeScaleSize, number>;
  };
  switch: {
    width: Record<ThemeScaleSize, number>;
    height: Record<ThemeScaleSize, number>;
    thumbSize: Record<ThemeScaleSize, number>;
    iconSize: Record<ThemeScaleSize, number>;
  };
  slider: {
    height: number;
    trackHeight: number;
    thumbSize: number;
    activeThumbSize: number;
    hitSlop: number;
  };
  rating: {
    size: Record<ThemeScaleSize, number>;
  };
}

export interface Theme {
  mode: ThemeMode;
  dark: boolean;
  elevation: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  components: ThemeComponents;
}

export type ThemeInput = DeepPartial<Omit<Theme, "mode" | "dark">>;
export type ThemePair = Partial<Record<ThemeMode, ThemeInput>>;
export type ThemePresets = Record<string, ThemePair>;

export interface ThemeStorage {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
}

export interface ThemeProviderProps {
  children: ReactNode;
  colorScheme?: ColorSchemePreference;
  defaultColorScheme?: ColorSchemePreference;
  elevation?: boolean;
  defaultElevation?: boolean;
  themeName?: string;
  defaultThemeName?: string;
  presets?: ThemePresets;
  themes?: ThemePair;
  storage?: ThemeStorage;
  storageKey?: string;
  themeNameStorageKey?: string;
  waitForStorage?: boolean;
  fallback?: ReactNode;
  onColorSchemeChange?: (scheme: ColorSchemePreference) => void;
  onThemeNameChange?: (name: string) => void;
  onElevationChange?: (elevation: boolean) => void;
}

export interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  fonts: ThemeFonts;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radii: ThemeRadii;
  shadows: ThemeShadows;
  components: ThemeComponents;
  elevation: boolean;
  themeName: string;
  availableThemes: string[];
  colorScheme: ColorSchemePreference;
  resolvedColorScheme: ThemeMode;
  isDark: boolean;
  isHydrated: boolean;
  setColorScheme: (scheme: ColorSchemePreference) => void;
  toggleColorScheme: () => void;
  setThemeName: (name: string) => void;
  setElevation: (elevation: boolean) => void;
  toggleElevation: () => void;
}
