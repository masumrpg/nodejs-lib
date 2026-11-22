import { getContrastingTextColor, withAlpha } from "../utils/color";
import { darkTheme, flatShadows, lightTheme, subtleShadows } from "./tokens";
import type {
  DeepPartial,
  Theme,
  ThemeColors,
  ThemeInput,
  ThemeMode,
  TypographyVariant,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function mergeTheme<T extends object>(
  base: T,
  override?: DeepPartial<T>,
): T {
  if (!override) return base;

  const output: Record<string, unknown> = {
    ...(base as Record<string, unknown>),
  };

  Object.entries(override).forEach(([key, value]) => {
    const baseValue = output[key];
    if (isRecord(baseValue) && isRecord(value)) {
      output[key] = mergeTheme(
        baseValue,
        value as DeepPartial<typeof baseValue>,
      );
    } else if (value !== undefined) {
      output[key] = value;
    }
  });

  return output as T;
}

const DERIVED_TONES = [
  { key: "primary", softKey: "primarySoft", onKey: "onPrimary" },
  { key: "secondary", softKey: "secondarySoft", onKey: "onSecondary" },
  { key: "accent", softKey: "accentSoft", onKey: "onAccent" },
  { key: "success", softKey: "successSoft", onKey: "onSuccess" },
  { key: "warning", softKey: "warningSoft", onKey: "onWarning" },
  { key: "danger", softKey: "dangerSoft", onKey: "onDanger" },
  { key: "info", softKey: "infoSoft", onKey: "onInfo" },
] as const satisfies ReadonlyArray<{
  key: keyof ThemeColors;
  softKey: keyof ThemeColors;
  onKey: keyof ThemeColors;
}>;

function applyDerivedColorTokens(
  mode: ThemeMode,
  colors: ThemeColors,
  overrideColors?: DeepPartial<ThemeColors>,
): ThemeColors {
  if (!overrideColors) return colors;

  const softAlpha = mode === "dark" ? 0.22 : 0.12;
  const next: ThemeColors = { ...colors };

  for (const { key, softKey, onKey } of DERIVED_TONES) {
    const customBase = overrideColors[key];
    if (typeof customBase === "string" && customBase.length > 0) {
      if (overrideColors[softKey] === undefined) {
        next[softKey] = withAlpha(customBase, softAlpha);
      }
      if (overrideColors[onKey] === undefined) {
        next[onKey] = getContrastingTextColor(customBase);
      }
    }
  }

  if (
    typeof overrideColors.primary === "string" &&
    overrideColors.primary.length > 0 &&
    overrideColors.primaryStrong === undefined
  ) {
    next.primaryStrong = overrideColors.primary;
  }

  return next;
}

export function createTheme(mode: ThemeMode, override?: ThemeInput): Theme {
  const base = mode === "dark" ? darkTheme : lightTheme;
  const merged = mergeTheme(base, override as DeepPartial<Theme>);
  const elevationEnabled = override?.elevation ?? merged.elevation ?? base.elevation;
  const resolvedShadows = elevationEnabled
    ? mergeTheme(subtleShadows, override?.shadows)
    : flatShadows;

  return {
    ...merged,
    mode,
    dark: mode === "dark",
    elevation: elevationEnabled,
    colors: applyDerivedColorTokens(mode, merged.colors, override?.colors),
    shadows: resolvedShadows,
    typography: applyFontTokens(merged),
  };
}

function withFont(
  variant: TypographyVariant,
  fontFamily: string | undefined,
): TypographyVariant {
  return {
    ...variant,
    fontFamily: variant.fontFamily ?? fontFamily,
  };
}

function applyFontTokens(theme: Theme) {
  const { fonts, typography } = theme;

  return {
    display: withFont(typography.display, fonts.bold),
    h1: withFont(typography.h1, fonts.bold),
    h2: withFont(typography.h2, fonts.bold),
    h3: withFont(typography.h3, fonts.semibold),
    title: withFont(typography.title, fonts.semibold),
    subtitle: withFont(typography.subtitle, fonts.semibold),
    body: withFont(typography.body, fonts.regular),
    bodySmall: withFont(typography.bodySmall, fonts.regular),
    label: withFont(typography.label, fonts.semibold ?? fonts.medium),
    labelSmall: withFont(typography.labelSmall, fonts.semibold ?? fonts.medium),
    caption: withFont(typography.caption, fonts.regular),
  };
}
