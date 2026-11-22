import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
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
  minTouchHitSlop,
  renderIcon,
  resolveOutlineBorderColor,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentShape,
  type ComponentSize,
  type ComponentTone,
  type RenderIcon,
  type ShapeProps,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type IconButtonVariant = "filled" | "outline" | "ghost" | "soft";
export type IconButtonSize = ComponentSize;
export type IconButtonTone = ComponentTone;
export type IconButtonShape = ComponentShape;

export interface IconButtonProps
  extends Omit<PressableProps, "children" | "style">,
    VariantProps<IconButtonVariant>,
    ToneProps<IconButtonTone>,
    SizeProps<IconButtonSize>,
    ShapeProps<IconButtonShape>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  icon: RenderIcon;
  loading?: boolean;
  badge?: number;
  style?: StyleProp<ViewStyle>;
}

function IconButtonComponent({
  icon,
  variant = "ghost",
  size = "md",
  tone = "primary",
  shape = "pill",
  loading = false,
  glass = false,
  haptic = true,
  animated = true,
  disabled,
  badge,
  hitSlop,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...props
}: IconButtonProps) {
  const { colors, components, radii, shadows, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const isInteractionBlocked = Boolean(disabled || loading);
  const showDisabledLook = Boolean(disabled);
  const toneColors = resolveToneColors(tone, colors);

  const containerSize = components.iconButton.size[size];
  const iconSize = components.iconButton.iconSize[size];
  const badgeTokens = components.iconButton.badge;

  const borderRadius =
    shape === "pill"
      ? containerSize / 2
      : shape === "square"
        ? size === "xs" || size === "sm"
          ? radii.xs
          : radii.sm
        : size === "xs" || size === "sm"
          ? radii.sm
          : size === "xl"
            ? radii.lg
            : radii.md;

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
      transform: [{ scale: 1 - pressProgress.value * 0.05 }],
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
          : variant === "outline"
            ? isTonalOutline
              ? tonalOutlineBg
              : colors.surface
            : colors.transparent;

  const iconColor = showDisabledLook
    ? colors.disabledText
    : glass
      ? softForeground
      : variant === "filled"
        ? toneColors.on
        : tone === "default" && variant === "ghost"
          ? colors.text
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
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled: isInteractionBlocked,
          busy: loading,
        }}
        disabled={isInteractionBlocked}
        hitSlop={hitSlop ?? minTouchHitSlop(containerSize)}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.button,
          {
            width: containerSize,
            height: containerSize,
            borderRadius,
            backgroundColor,
            borderColor,
            borderWidth,
            opacity: !showDisabledLook && pressed && animated ? 0.8 : 1,
          },
          buttonShadow,
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={iconColor} />
        ) : (
          renderIcon(icon, iconColor, iconSize)
        )}
        {!!badge && badge > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.badge,
              {
                top: badgeTokens.offset,
                right: badgeTokens.offset,
                minWidth: badgeTokens.minWidth,
                height: badgeTokens.size,
                paddingHorizontal: badgeTokens.paddingX,
                borderRadius: badgeTokens.size / 2,
                backgroundColor: colors.danger,
                borderWidth: badgeTokens.borderWidth,
                borderColor: colors.surface,
              },
            ]}
          >
            <Text
              variant="caption"
              color="onDanger"
              weight="700"
              style={{
                fontSize: badgeTokens.fontSize,
                lineHeight: badgeTokens.lineHeight,
              }}
            >
              {badge > 99 ? "99+" : String(badge)}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const IconButton = React.memo(IconButtonComponent);

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "flex-start",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
