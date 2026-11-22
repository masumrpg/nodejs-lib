import React, { type ReactNode } from "react";
import { Platform, type Insets } from "react-native";

import type { ThemeColors, ThemeShadow, ThemeSurfaceStyle } from "../theme";
import { withAlpha } from "../utils/color";

export function webDeps(deps: Array<unknown>): Array<unknown> | undefined {
  return Platform.OS === "web" ? deps : undefined;
}

export function hasActiveShadow(shadow: ThemeShadow): boolean {
  return Boolean(
    shadow.boxShadow || shadow.shadowOpacity > 0 || shadow.elevation > 0,
  );
}

export function resolveOutlineBorderColor(
  colors: ThemeColors,
  surface: ThemeSurfaceStyle,
  toneBorderColor?: string,
): string {
  if (surface.outlineStyle === "tonal") {
    return colors.transparent;
  }
  if (
    surface.outlineBorderColor === "tone" &&
    surface.filledBorderColor !== "border" &&
    toneBorderColor
  ) {
    return withAlpha(toneBorderColor, surface.outlineBorderOpacity);
  }
  return colors.border;
}

export type ThemeColorName = keyof ThemeColors;

export type RenderIcon =
  | ReactNode
  | ((props: { color: string; size: number }) => ReactNode);

export const ANIMATION_TIMING = {
  pressIn: 90,
  pressOut: 120,
  transition: 150,
  bezier: [0.23, 1, 0.32, 1] as const,
};

export function minTouchHitSlop(
  dimension: number,
  minTarget = 44,
): Insets | undefined {
  if (!Number.isFinite(dimension) || dimension >= minTarget) {
    return undefined;
  }
  const pad = Math.ceil((minTarget - dimension) / 2);
  return { top: pad, bottom: pad, left: pad, right: pad };
}

export interface ResolvedToneColors {
  solid: string;
  soft: string;
  on: string;
  border: string;
}

export function resolveToneColors(
  tone: ComponentTone | undefined,
  colors: ThemeColors,
): ResolvedToneColors {
  switch (tone) {
    case "primary":
      return {
        solid: colors.primary,
        soft: colors.primarySoft,
        on: colors.onPrimary,
        border: colors.primary,
      };
    case "secondary":
      return {
        solid: colors.secondary,
        soft: colors.secondarySoft,
        on: colors.onSecondary,
        border: colors.secondary,
      };
    case "accent":
      return {
        solid: colors.accent,
        soft: colors.accentSoft,
        on: colors.onAccent,
        border: colors.accent,
      };
    case "success":
      return {
        solid: colors.success,
        soft: colors.successSoft,
        on: colors.onSuccess,
        border: colors.success,
      };
    case "warning":
      return {
        solid: colors.warning,
        soft: colors.warningSoft,
        on: colors.onWarning,
        border: colors.warning,
      };
    case "danger":
      return {
        solid: colors.danger,
        soft: colors.dangerSoft,
        on: colors.onDanger,
        border: colors.danger,
      };
    case "info":
      return {
        solid: colors.info,
        soft: colors.infoSoft,
        on: colors.onInfo,
        border: colors.info,
      };
    case "default":
    default:
      return {
        solid: colors.text,
        soft: colors.backgroundMuted,
        on: colors.textInverse,
        border: colors.border,
      };
  }
}

export function renderIcon(
  icon: RenderIcon | React.ComponentType<{ color?: string; size?: number }> | undefined,
  color: string,
  size: number,
): ReactNode {
  if (icon === null || icon === undefined || typeof icon === "boolean") {
    return null;
  }
  if (React.isValidElement(icon)) return icon;
  if (typeof icon === "function") {
    const fn = icon as { prototype?: { isReactComponent?: boolean } };
    if (fn.prototype?.isReactComponent) {
      const Component = icon as React.ComponentType<{
        color?: string;
        size?: number;
      }>;
      return React.createElement(Component, { color, size });
    }
    try {
      const result = (
        icon as (props: { color: string; size: number }) => ReactNode
      )({ color, size });
      if (React.isValidElement(result) || result === null || result === undefined) {
        return result;
      }
      return result;
    } catch (error) {
      if (
        error instanceof Error &&
        /invalid hook call|hooks can only be called/i.test(error.message)
      ) {
        const Component = icon as React.ComponentType<{
          color?: string;
          size?: number;
        }>;
        return React.createElement(Component, { color, size });
      }
      throw error;
    }
  }
  if (typeof icon === "object" && "$$typeof" in icon) {
    const Component = icon as unknown as React.ComponentType<{
      color?: string;
      size?: number;
    }>;
    return React.createElement(Component, { color, size });
  }
  return icon as ReactNode;
}

/**
 * Standard semantic color tones across the design system.
 */
export type ComponentTone =
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default";

/**
 * Standard component dimension scaling sizes.
 */
export type ComponentSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Standard border radius shape styles.
 */
export type ComponentShape = "rounded" | "pill" | "square";

/**
 * Base props interface for components that accept a semantic color tone.
 */
export interface ToneProps<T extends string = ComponentTone> {
  /**
   * Semantic color tone (e.g. 'primary', 'success', 'danger').
   */
  tone?: T;
}

/**
 * Base props interface for components that accept visual style variants.
 */
export interface VariantProps<V extends string = string> {
  /**
   * Visual fill or structure variant (e.g. 'filled', 'outline', 'ghost', 'soft').
   */
  variant?: V;
}

/**
 * Base props interface for components that scale size.
 */
export interface SizeProps<S extends string | number = ComponentSize> {
  /**
   * Size dimension scaling (e.g. 'sm', 'md', 'lg').
   */
  size?: S;
}

/**
 * Base props interface for components that support border radius shapes.
 */
export interface ShapeProps<S extends string = ComponentShape> {
  /**
   * Border radius shape style (e.g. 'rounded', 'pill', 'square').
   */
  shape?: S;
}

/**
 * Base props interface for components with left and right icon slots.
 */
export interface IconSlotsProps {
  /**
   * Icon element or render function positioned on the left side.
   */
  leftIcon?: RenderIcon;
  /**
   * Icon element or render function positioned on the right side.
   */
  rightIcon?: RenderIcon;
}

/**
 * Composite base interface for general interactive UI components.
 * Can be extended by internal components or external user components.
 */
export interface BaseUIComponentProps<
  V extends string = string,
  T extends string = ComponentTone,
  S extends string = ComponentSize
> extends VariantProps<V>, ToneProps<T>, SizeProps<S> {
  /**
   * Whether user interaction is disabled.
   */
  disabled?: boolean;
  /**
   * Whether the component is in a loading state.
   */
  loading?: boolean;
}

/**
 * Base props interface for components that support glassmorphism styling.
 */
export interface BaseGlassProps {
  /**
   * Enables translucent glassmorphism styling with soft highlight borders.
   * Default: false
   */
  glass?: boolean;
}

/**
 * Base props interface for components that support tactile haptic feedback.
 */
export interface BaseHapticProps {
  /**
   * Enables tactile haptic feedback on press interactions.
   * Default: true
   */
  haptic?: boolean;
}

/**
 * Base props interface for components that support micro timing transitions.
 */
export interface BaseAnimatedProps {
  /**
   * Enables micro timing transition on press or state changes.
   * Default: true
   */
  animated?: boolean;
}

/**
 * Combined base interface for universal component capabilities.
 */
export interface BaseComponentProps
  extends BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {}
