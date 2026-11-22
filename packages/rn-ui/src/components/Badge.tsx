import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";
import {
  renderIcon,
  resolveOutlineBorderColor,
  resolveToneColors,
  type BaseGlassProps,
  type ComponentSize,
  type ComponentTone,
  type IconSlotsProps,
  type RenderIcon,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type BadgeTone = ComponentTone;
export type BadgeVariant = "filled" | "outline" | "soft" | "ghost";
export type BadgeSize = ComponentSize;

export interface BadgeProps
  extends ToneProps<BadgeTone>,
    VariantProps<BadgeVariant>,
    SizeProps<BadgeSize>,
    IconSlotsProps,
    BaseGlassProps {
  children: React.ReactNode;
  icon?: RenderIcon;
  style?: StyleProp<ViewStyle>;
}

const BADGE_ICON_SIZE: Record<BadgeSize, number> = {
  xs: 10,
  sm: 11,
  md: 12,
  lg: 14,
  xl: 16,
};

function BadgeComponent({
  children,
  tone = "primary",
  variant = "soft",
  size = "md",
  glass = false,
  icon,
  leftIcon,
  rightIcon,
  style,
}: BadgeProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const toneColors = resolveToneColors(tone, colors);

  const isFilled = variant === "filled";
  const isSoft = variant === "soft";
  const isOutline = variant === "outline";
  const isTonalOutline = components.surface.outlineStyle === "tonal";
  const tonalOutlineBg = isDark ? colors.surfaceRaised : colors.backgroundMuted;
  const iconSize = BADGE_ICON_SIZE[size];
  const leadIcon = leftIcon ?? icon;
  const hasSolidBorder = components.surface.filledBorderColor === "border";

  const nonFilledForeground =
    tone === "warning" && !isDark ? "#92400E" : toneColors.solid;

  const backgroundColor = glass
    ? colors.glassSurface
    : isFilled
      ? toneColors.solid
      : isSoft
        ? toneColors.soft
        : isOutline && isTonalOutline
          ? tonalOutlineBg
          : colors.transparent;

  const borderWidth = glass
    ? components.borderWidth.default
    : isOutline
      ? isTonalOutline
        ? 0
        : components.borderWidth.control
      : isFilled || isSoft
        ? components.borderWidth.filled
        : 0;

  const borderColor = glass
    ? colors.glassBorder
    : isOutline
      ? resolveOutlineBorderColor(colors, components.surface, toneColors.border)
      : (isFilled || isSoft) && hasSolidBorder
        ? colors.border
        : colors.transparent;

  const textColor = isFilled && !glass ? toneColors.on : nonFilledForeground;
  const badgeShadow =
    isFilled || isOutline || glass
      ? shadows[components.surface.feedbackShadow]
      : shadows.none;

  const paddingHorizontal =
    size === "xs"
      ? spacing.xs
      : size === "sm"
        ? spacing.sm
        : size === "lg" || size === "xl"
          ? spacing.md
          : spacing.sm;

  const paddingVertical =
    size === "xs"
      ? 1
      : size === "lg"
        ? spacing.xs
        : size === "xl"
          ? spacing.xs + 2
          : spacing.xxs;

  const textVariant =
    size === "xl" || size === "lg" ? "label" : "labelSmall";

  return (
    <View
      accessible
      accessibilityRole="text"
      style={[
        styles.container,
        {
          gap: spacing.xs,
          paddingHorizontal,
          paddingVertical,
          borderRadius: radii.full,
          backgroundColor,
          borderWidth,
          borderColor,
        },
        badgeShadow,
        style,
      ]}
    >
      {leadIcon ? renderIcon(leadIcon, textColor, iconSize) : null}
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          variant={textVariant}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            color: textColor,
            flexShrink: 1,
            includeFontPadding: false,
            ...(size === "xs" ? { fontSize: 10, lineHeight: 14 } : null),
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
      {rightIcon ? renderIcon(rightIcon, textColor, iconSize) : null}
    </View>
  );
}

export const Badge = React.memo(BadgeComponent);

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
  },
});
