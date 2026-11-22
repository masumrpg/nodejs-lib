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
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  markAsPressableTrigger,
  minTouchHitSlop,
  renderIcon,
  resolveOutlineBorderColor,
  resolveToneColors,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentShape,
  type ComponentSize,
  type RenderIcon,
  type ShapeProps,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";
import type { ButtonTone, ButtonVariant } from "./Button";

export type FloatingActionButtonSize = ComponentSize;
export type FloatingActionButtonPlacement =
  | "none"
  | "bottom-end"
  | "bottom-start"
  | "top-end"
  | "top-start";

export interface FloatingActionButtonProps
  extends Omit<PressableProps, "children" | "style">,
    VariantProps<ButtonVariant>,
    ToneProps<ButtonTone>,
    SizeProps<FloatingActionButtonSize>,
    ShapeProps<ComponentShape>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  icon?: RenderIcon;
  label?: React.ReactNode;
  extended?: boolean;
  placement?: FloatingActionButtonPlacement;
  offset?: number;
  visible?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

function FloatingActionButtonComponent({
  icon,
  label,
  extended = Boolean(label),
  size = "md",
  tone = "primary",
  variant = "filled",
  shape = "pill",
  placement = "bottom-end",
  offset,
  visible = true,
  animated = true,
  glass = false,
  haptic = true,
  loading = false,
  disabled,
  fullWidth,
  hitSlop,
  accessibilityLabel,
  style,
  textStyle,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: FloatingActionButtonProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const [mounted, setMounted] = React.useState(visible);
  const visibility = useSharedValue(visible ? 1 : 0);
  const press = useSharedValue(1);
  const isInteractionBlocked = Boolean(disabled || loading);
  const showDisabledLook = Boolean(disabled);
  const toneColors = resolveToneColors(tone, colors);

  const fabTokens = components.floatingActionButton;
  const dimension = fabTokens.size[size];
  const iconSize = fabTokens.iconSize[size];
  const resolvedOffset = offset ?? spacing.lg;

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
    }

    if (!shouldAnimate) {
      cancelAnimation(visibility);
      visibility.value = visible ? 1 : 0;
      if (!visible) {
        setMounted(false);
      }
      return;
    }

    visibility.value = withTiming(
      visible ? 1 : 0,
      {
        duration: ANIMATION_TIMING.transition,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      },
      (finished) => {
        if (finished && !visible) {
          scheduleOnRN(setMounted, false);
        }
      },
    );

    return () => {
      cancelAnimation(visibility);
    };
  }, [shouldAnimate, visible, visibility]);

  React.useEffect(() => {
    return () => {
      cancelAnimation(press);
    };
  }, [press]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
    transform: [
      { scale: press.value * (0.88 + visibility.value * 0.12) },
      { translateY: 8 * (1 - visibility.value) },
    ],
  }));

  if (!mounted) {
    return null;
  }

  const isTonalOutline = components.surface.outlineStyle === "tonal";
  const tonalOutlineBg = isDark ? colors.surfaceRaised : colors.backgroundMuted;

  const softForeground =
    tone === "warning" && !isDark ? "#92400E" : toneColors.solid;

  const backgroundColor = showDisabledLook
    ? colors.disabled
    : glass
      ? colors.glassSurfaceStrong
      : variant === "filled"
        ? toneColors.solid
        : variant === "soft"
          ? toneColors.soft
          : variant === "outline"
            ? isTonalOutline
              ? tonalOutlineBg
              : colors.surface
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

  const fabBorderWidth =
    variant === "outline"
      ? isTonalOutline
        ? 0
        : components.borderWidth.control
      : glass
        ? components.borderWidth.strong
        : variant === "filled" || variant === "soft"
          ? components.borderWidth.filled
          : 0;

  const borderRadius =
    shape === "pill" ? radii.full : shape === "square" ? radii.xs : radii.lg;

  const placementStyle: ViewStyle =
    placement === "none"
      ? fullWidth
        ? styles.fullWidth
        : {}
      : {
          position: "absolute",
          bottom: placement.startsWith("bottom") ? resolvedOffset : undefined,
          top: placement.startsWith("top") ? resolvedOffset : undefined,
          right: fullWidth || placement.endsWith("end") ? resolvedOffset : undefined,
          left:
            fullWidth || placement.endsWith("start")
              ? resolvedOffset
              : undefined,
          zIndex: 100,
        };

  const resolvedLabel =
    accessibilityLabel ??
    (typeof label === "string" ? label : "Floating action button");

  const handlePress = (event: GestureResponderEvent) => {
    if (isInteractionBlocked) return;
    if (haptic) triggerHaptic("light");
    onPress?.(event);
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (isInteractionBlocked) return;
    if (shouldAnimate) {
      press.value = withTiming(0.95, {
        duration: ANIMATION_TIMING.pressIn,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (shouldAnimate) {
      press.value = withTiming(1, {
        duration: ANIMATION_TIMING.pressOut,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    }
    onPressOut?.(event);
  };

  return (
    <Animated.View
      style={[
        placementStyle,
        shouldAnimate ? animatedStyle : undefined,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={resolvedLabel}
        accessibilityState={{
          disabled: isInteractionBlocked,
          busy: loading,
        }}
        disabled={isInteractionBlocked}
        hitSlop={hitSlop ?? minTouchHitSlop(dimension)}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.button,
          shadows.lg,
          {
            minWidth: extended ? undefined : dimension,
            width: fullWidth ? "100%" : undefined,
            height: dimension,
            paddingHorizontal: extended ? fabTokens.paddingX[size] : 0,
            borderRadius,
            borderWidth: fabBorderWidth,
            borderColor,
            backgroundColor,
            gap: spacing.sm,
            opacity: !shouldAnimate && pressed && !isInteractionBlocked ? 0.8 : 1,
          },
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={foregroundColor} />
        ) : (
          renderIcon(icon, foregroundColor, iconSize)
        )}
        {extended && label ? (
          typeof label === "string" || typeof label === "number" ? (
            <Text variant="label" style={[{ color: foregroundColor }, textStyle]}>
              {label}
            </Text>
          ) : (
            label
          )
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export const FloatingActionButton = markAsPressableTrigger(
  React.memo(FloatingActionButtonComponent),
);

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
