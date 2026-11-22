import React from "react";
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";
import { withAlpha } from "../utils";
import { triggerHaptic } from "../utils/haptics";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentSize,
  type ComponentTone,
  type RenderIcon,
  type ShapeProps,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type SwitchSize = ComponentSize;
export type SwitchVariant = "filled" | "outline";
export type SwitchShape = "pill" | "oval" | "rounded";
export type SwitchTone = ComponentTone;

export interface SwitchRenderThumbParams {
  checked: boolean;
  disabled: boolean;
  invalid: boolean;
  color: string;
  size: number;
}

export type SwitchThumbContent =
  | React.ReactNode
  | ((params: SwitchRenderThumbParams) => React.ReactNode);

export interface SwitchProps
  extends Omit<PressableProps, "onPress" | "style" | "children">,
    VariantProps<SwitchVariant>,
    ToneProps<SwitchTone>,
    SizeProps<SwitchSize>,
    ShapeProps<SwitchShape>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  value?: boolean;
  defaultValue?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
  activeIcon?: RenderIcon;
  inactiveIcon?: RenderIcon;
  thumbContent?: SwitchThumbContent;
  activeThumbContent?: SwitchThumbContent;
  inactiveThumbContent?: SwitchThumbContent;
  renderThumb?: (params: SwitchRenderThumbParams) => React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
}

function SwitchComponent({
  value,
  defaultValue = false,
  onValueChange,
  disabled = false,
  invalid = false,
  size = "md",
  variant = "filled",
  shape = "pill",
  tone = "primary",
  glass = false,
  haptic = true,
  animated = true,
  hitSlop,
  style,
  trackStyle,
  thumbStyle,
  activeIcon,
  inactiveIcon,
  thumbContent,
  activeThumbContent,
  inactiveThumbContent,
  renderThumb,
  onPress,
  onPressIn,
  onPressOut,
  accessibilityLabel,
  ...props
}: SwitchProps) {
  const { colors, components, radii, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState(defaultValue);
  const checked = isControlled ? value : uncontrolledValue;
  const progress = useSharedValue(checked ? 1 : 0);
  const pressed = useSharedValue(0);

  React.useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(progress);
      progress.value = checked ? 1 : 0;
      return;
    }
    progress.value = withTiming(checked ? 1 : 0, {
      duration: ANIMATION_TIMING.transition,
      easing: Easing.bezier(...ANIMATION_TIMING.bezier),
    });
  }, [checked, progress, shouldAnimate]);

  React.useEffect(() => {
    return () => {
      cancelAnimation(progress);
      cancelAnimation(pressed);
    };
  }, [pressed, progress]);

  const toneColors = resolveToneColors(invalid ? "danger" : tone, colors);
  const activeColor = toneColors.solid;

  const thumbIcon = checked ? activeIcon : inactiveIcon;
  const selectedThumbContent =
    (checked ? activeThumbContent : inactiveThumbContent) ?? thumbContent;
  const isOval = shape === "oval";
  const isRounded = shape === "rounded";

  const baseWidth = components.switch.width[size];
  const width = isOval ? Math.round(baseWidth * 1.14) : baseWidth;
  const height = components.switch.height[size];
  const baseThumbSize = components.switch.thumbSize[size];
  const thumbWidth = isOval ? Math.round(baseThumbSize * 1.18) : baseThumbSize;
  const thumbHeight = baseThumbSize;
  const iconSize = components.switch.iconSize[size];
  const borderWidth = components.borderWidth.control;
  const inset = Math.max(2, (height - thumbHeight) / 2);
  const travel = Math.max(0, width - thumbWidth - (inset + borderWidth) * 2);

  const trackBorderRadius = isRounded ? radii.md : radii.full;
  const thumbBorderRadius = isRounded ? radii.sm : radii.full;

  const inactiveTrackColor = disabled
    ? colors.disabled
    : glass
      ? colors.glassSurface
      : variant === "outline"
        ? colors.transparent
        : isDark
          ? colors.surfaceRaised
          : colors.backgroundMuted;

  const activeTrackColor = disabled
    ? colors.disabled
    : variant === "outline"
      ? withAlpha(activeColor, 0.14)
      : activeColor;

  const inactiveBorderColor = invalid
    ? colors.danger
    : glass
      ? colors.glassBorder
      : colors.border;

  const activeBorderColor = disabled
    ? colors.disabled
    : invalid
      ? colors.danger
      : activeColor;

  const inactiveThumbColor = disabled
    ? colors.disabledText
    : isDark
      ? colors.text
      : colors.surface;

  const activeThumbColor = disabled
    ? colors.disabledText
    : variant === "outline"
      ? activeColor
      : toneColors.on;

  const inactiveThumbBorder = colors.transparent;
  const activeThumbBorder =
    variant === "outline" ? colors.transparent : withAlpha(activeColor, 0.25);

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;
    onPress?.(event);

    if (haptic) triggerHaptic("selection");
    const nextValue = !checked;
    if (!isControlled) {
      setUncontrolledValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  const handlePressIn = (event: GestureResponderEvent) => {
    if (disabled) return;
    onPressIn?.(event);
    if (shouldAnimate) {
      pressed.value = withTiming(1, {
        duration: ANIMATION_TIMING.pressIn,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    }
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (disabled) return;
    onPressOut?.(event);
    if (shouldAnimate) {
      pressed.value = withTiming(0, {
        duration: ANIMATION_TIMING.pressOut,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    }
  };

  const trackAnimatedStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [inactiveTrackColor, activeTrackColor],
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [inactiveBorderColor, activeBorderColor],
      ),
    }),
    webDeps([
      activeBorderColor,
      activeTrackColor,
      inactiveBorderColor,
      inactiveTrackColor,
    ]),
  );

  const thumbAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateX: progress.value * travel },
        {
          scaleX: isOval ? 1 + pressed.value * 0.1 : 1 + pressed.value * 0.05,
        },
        { scaleY: 1 - pressed.value * 0.04 },
      ],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        [inactiveThumbColor, activeThumbColor],
      ),
      borderColor: interpolateColor(
        progress.value,
        [0, 1],
        [inactiveThumbBorder, activeThumbBorder],
      ),
    }),
    webDeps([
      activeThumbBorder,
      activeThumbColor,
      inactiveThumbBorder,
      inactiveThumbColor,
      isOval,
      travel,
    ]),
  );

  const iconColor = disabled
    ? colors.disabledText
    : checked
      ? variant === "outline"
        ? toneColors.on
        : activeColor
      : colors.textSubtle;

  const safeIconColor =
    checked && variant !== "outline" && tone === "warning" && !isDark
      ? "#92400E"
      : iconColor;

  const thumbContentParams: SwitchRenderThumbParams = {
    checked,
    disabled,
    invalid,
    color: safeIconColor,
    size: iconSize,
  };
  const renderedThumbContent =
    typeof selectedThumbContent === "function"
      ? selectedThumbContent(thumbContentParams)
      : selectedThumbContent;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
      accessibilityHint={invalid ? "Invalid selection" : undefined}
      disabled={disabled}
      hitSlop={hitSlop ?? minTouchHitSlop(height)}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={({ pressed: isPressed }) => [
        styles.wrapper,
        {
          opacity: disabled ? 0.55 : isPressed ? 0.9 : 1,
        },
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width,
            height,
            borderRadius: trackBorderRadius,
            borderWidth,
            padding: inset,
          },
          trackAnimatedStyle,
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbWidth,
              height: thumbHeight,
              borderRadius: thumbBorderRadius,
              borderWidth: components.borderWidth.hairline,
            },
            thumbAnimatedStyle,
            thumbStyle,
          ]}
        >
          {renderThumb
            ? renderThumb(thumbContentParams)
            : renderedThumbContent
              ? renderedThumbContent
              : thumbIcon
                ? renderIcon(thumbIcon, safeIconColor, iconSize)
                : null}
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export const Switch = React.memo(SwitchComponent);

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "flex-start",
  },
  track: {
    justifyContent: "center",
  },
  thumb: {
    alignItems: "center",
    justifyContent: "center",
  },
});
