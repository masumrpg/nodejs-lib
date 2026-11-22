import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  markAsPressableTrigger,
  minTouchHitSlop,
  renderIcon,
  resolveControlRadius,
  resolveOutlineBorderColor,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentShape,
  type ComponentSize,
  type ComponentTone,
  type IconSlotsProps,
  type ShapeProps,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type ButtonVariant = "filled" | "outline" | "ghost" | "soft";
export type ButtonSize = ComponentSize;
export type ButtonTone = ComponentTone;
export type ButtonShape = ComponentShape;

export interface ButtonProps
  extends Omit<PressableProps, "children" | "style">,
    VariantProps<ButtonVariant>,
    ToneProps<ButtonTone>,
    SizeProps<ButtonSize>,
    ShapeProps<ButtonShape>,
    IconSlotsProps,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  children: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const BUTTON_LINE_HEIGHT: Record<ButtonSize, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
};

function coalesceTextChildren(
  children: React.ReactNode,
  textColor: string,
  textVariant: "label" | "labelSmall",
  fontSize: number,
  lineHeight: number,
  textStyle: StyleProp<TextStyle>,
): React.ReactNode {
  const labelStyle: StyleProp<TextStyle> = [
    { color: textColor, fontSize, lineHeight, includeFontPadding: false },
    textStyle,
  ];

  if (typeof children === "string" || typeof children === "number") {
    return (
      <Text variant={textVariant} align="center" style={labelStyle}>
        {children}
      </Text>
    );
  }

  if (!Array.isArray(children)) {
    return children;
  }

  const result: React.ReactNode[] = [];
  let textBuffer: Array<string | number> = [];

  const flushBuffer = (keyIndex: number) => {
    if (textBuffer.length === 0) return;
    result.push(
      <Text
        key={`btn-txt-${keyIndex}`}
        variant={textVariant}
        align="center"
        style={labelStyle}
      >
        {textBuffer.join("")}
      </Text>,
    );
    textBuffer = [];
  };

  children.forEach((child, idx) => {
    if (typeof child === "string" || typeof child === "number") {
      textBuffer.push(child);
    } else if (child !== null && child !== undefined && typeof child !== "boolean") {
      flushBuffer(idx);
      result.push(child);
    }
  });
  flushBuffer(children.length);

  return result;
}

function ButtonComponent({
  children,
  variant = "filled",
  size = "md",
  tone = "primary",
  shape = "rounded",
  leftIcon,
  rightIcon,
  loading = false,
  glass = false,
  haptic = true,
  animated = true,
  fullWidth,
  disabled,
  hitSlop,
  onPress,
  onPressIn,
  onPressOut,
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const { colors, radii, components, shadows, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const isInteractionBlocked = Boolean(disabled || loading);
  const showDisabledLook = Boolean(disabled);
  const toneColors = resolveToneColors(tone, colors);

  const pressProgress = useSharedValue(0);

  React.useEffect(() => {
    return () => {
      cancelAnimation(pressProgress);
    };
  }, [pressProgress]);

  const pressEffect = components.surface.pressEffect;
  const pressOffset = components.surface.pressOffset;

  const animatedStyle = useAnimatedStyle(() => {
    if (pressEffect === "offset" && pressOffset !== 0) {
      return {
        transform: [
          { translateX: pressProgress.value * pressOffset },
          { translateY: pressProgress.value * pressOffset },
        ],
      };
    }
    return {
      transform: [{ scale: 1 - pressProgress.value * 0.03 }],
    };
  }, webDeps([pressEffect, pressOffset]));

  const isTonalOutline = components.surface.outlineStyle === "tonal";
  const tonalOutlineBg = isDark ? colors.surfaceRaised : colors.backgroundMuted;

  const softForeground =
    tone === "warning" && !isDark ? "#92400E" : toneColors.solid;

  const backgroundColor = showDisabledLook
    ? colors.disabled
    : glass
      ? colors.glassSurface
      : variant === "filled"
        ? toneColors.solid
        : variant === "soft"
          ? toneColors.soft
          : variant === "outline" && isTonalOutline
            ? tonalOutlineBg
            : colors.transparent;

  const foregroundColor = showDisabledLook
    ? colors.disabledText
    : glass
      ? softForeground
      : variant === "filled"
        ? toneColors.on
        : softForeground;

  const hasSolidBorder = components.surface.filledBorderColor === "border";

  const borderColor = showDisabledLook
    ? colors.disabled
    : glass
      ? colors.glassBorder
      : variant === "outline"
        ? resolveOutlineBorderColor(
            colors,
            components.surface,
            toneColors.border,
          )
        : variant === "filled" || variant === "soft"
          ? hasSolidBorder
            ? colors.border
            : colors.transparent
          : colors.transparent;

  const borderWidth = glass
    ? Math.max(components.borderWidth.strong, 1)
    : variant === "outline"
      ? isTonalOutline
        ? 0
        : components.borderWidth.control
      : variant === "filled" || variant === "soft"
        ? components.borderWidth.filled
        : 0;

  const buttonShadow =
    !showDisabledLook && variant !== "ghost"
      ? shadows[components.surface.buttonShadow]
      : shadows.none;

  const height = components.button.height[size];
  const fontSize = components.button.fontSize[size];
  const lineHeight = BUTTON_LINE_HEIGHT[size];
  const iconSize = components.button.iconSize[size];
  const borderRadius = resolveControlRadius(shape, size, radii);
  const textVariant = size === "xs" || size === "sm" ? "labelSmall" : "label";
  const resolvedHitSlop = hitSlop ?? minTouchHitSlop(height);

  const handlePress = React.useCallback(
    (e: GestureResponderEvent) => {
      if (isInteractionBlocked) return;
      if (haptic) triggerHaptic("light");
      onPress?.(e);
    },
    [haptic, isInteractionBlocked, onPress],
  );

  const handlePressIn = React.useCallback(
    (e: GestureResponderEvent) => {
      if (isInteractionBlocked) return;
      if (shouldAnimate) {
        pressProgress.value = withTiming(1, {
          duration: ANIMATION_TIMING.pressIn,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
      }
      onPressIn?.(e);
    },
    [isInteractionBlocked, onPressIn, pressProgress, shouldAnimate],
  );

  const handlePressOut = React.useCallback(
    (e: GestureResponderEvent) => {
      if (shouldAnimate) {
        pressProgress.value = withTiming(0, {
          duration: ANIMATION_TIMING.pressOut,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
      }
      onPressOut?.(e);
    },
    [onPressOut, pressProgress, shouldAnimate],
  );

  return (
    <Animated.View
      style={[
        animatedStyle,
        fullWidth ? styles.fullWidth : undefined,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled: isInteractionBlocked,
          busy: loading,
        }}
        disabled={isInteractionBlocked}
        hitSlop={resolvedHitSlop}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.button,
          {
            minHeight: height,
            paddingHorizontal: components.button.paddingX[size],
            borderRadius,
            backgroundColor,
            borderColor,
            borderWidth,
            gap: components.button.gap[size],
            opacity:
              !showDisabledLook && pressed && !loading && animated
                ? 0.85
                : loading
                  ? 0.88
                  : 1,
            width: fullWidth ? "100%" : undefined,
          },
          buttonShadow,
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={foregroundColor} />
        ) : (
          renderIcon(leftIcon, foregroundColor, iconSize)
        )}
        {coalesceTextChildren(
          children,
          foregroundColor,
          textVariant,
          fontSize,
          lineHeight,
          textStyle,
        )}
        {!loading && renderIcon(rightIcon, foregroundColor, iconSize)}
      </Pressable>
    </Animated.View>
  );
}

export const Button = markAsPressableTrigger(React.memo(ButtonComponent));

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});
