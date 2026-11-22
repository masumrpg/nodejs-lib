import React from "react";
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";

import { useTheme, type ThemeFonts } from "../theme";
import type { ThemeColorName } from "./types";

export interface TextProps extends RNTextProps {
  variant?: keyof ReturnType<typeof useTheme>["typography"];
  color?: ThemeColorName;
  align?: TextStyle["textAlign"];
  weight?: TextStyle["fontWeight"];
}

const HEADING_VARIANTS = new Set<TextProps["variant"]>([
  "display",
  "h1",
  "h2",
  "h3",
]);

function resolveFontFamilyForWeight(
  weight: TextStyle["fontWeight"],
  fonts: ThemeFonts,
): string | undefined {
  if (!weight) return undefined;
  const normalized = String(weight).toLowerCase();
  if (normalized === "bold" || normalized === "700" || normalized === "800" || normalized === "900") {
    return fonts.bold ?? fonts.semibold;
  }
  if (normalized === "600" || normalized === "semibold") {
    return fonts.semibold ?? fonts.medium;
  }
  if (normalized === "500" || normalized === "medium") {
    return fonts.medium ?? fonts.regular;
  }
  return fonts.regular;
}

function TextComponent({
  variant = "body",
  color = "text",
  align,
  weight,
  accessibilityRole,
  style,
  ...props
}: TextProps) {
  const { colors, fonts, typography } = useTheme();
  const baseTypography = typography[variant];

  const dynamicStyle = React.useMemo<TextStyle>(() => {
    const resolvedFamily = weight
      ? resolveFontFamilyForWeight(weight, fonts)
      : undefined;
    return {
      color: colors[color],
      ...(align !== undefined ? { textAlign: align } : null),
      ...(weight !== undefined ? { fontWeight: weight } : null),
      ...(resolvedFamily !== undefined ? { fontFamily: resolvedFamily } : null),
    };
  }, [align, color, colors, fonts, weight]);

  const resolvedRole =
    accessibilityRole ??
    (HEADING_VARIANTS.has(variant) ? "header" : undefined);

  return (
    <RNText
      accessibilityRole={resolvedRole}
      style={[baseTypography, dynamicStyle, style]}
      {...props}
    />
  );
}

export const Text = React.memo(TextComponent);
