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
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type SwitchSize = ComponentSize;
export type SwitchVariant = "filled" | "outline";
export type SwitchTone = ComponentTone;

const SWITCH_EASING: readonly [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];

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
  const { colors, components, radii, shadows, isDark } = useTheme();
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
      duration: 210,
      easing: Easing.bezier(...SWITCH_EASING),
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
  const isBrutal = components.surface.pressEffect === "offset";

  const thumbIcon = checked ? activeIcon : inactiveIcon;
  const selectedThumbContent =
    (checked ? activeThumbContent : inactiveThumbContent) ?? thumbContent;

  const baseWidth = components.switch.width[size];
  const width = Math.round(baseWidth * 1.16);
  const height = components.switch.height[size];
  const iconSize = components.switch.iconSize[size];

  const trackBorderWidth =
    variant === "outline" || invalid
      ? components.borderWidth.control
      : glass
        ? Math.max(1, components.borderWidth.hairline)
        : components.borderWidth.filled;

  const baseThumbSize = components.switch.thumbSize[size];
  const innerHeight = Math.max(8, height - trackBorderWidth * 2);
  const minInset = size === "xs" ? 2 : 3;
  const thumbHeight = Math.min(baseThumbSize, Math.max(8, innerHeight - minInset * 2));
  const thumbWidth = Math.round(thumbHeight * 1.28);
  const inset = Math.max(1.5, (innerHeight - thumbHeight) / 2);
  const travel = Math.max(0, width - trackBorderWidth * 2 - inset * 2 - thumbWidth);
  const stretch = Math.min(
    Math.round(thumbWidth * 0.22),
    Math.max(0, Math.floor(travel * 0.45)),
  );

  const trackBorderRadius = radii.full;
  const thumbBorderRadius = radii.full;

  const inactiveTrackColor = disabled
    ? colors.disabled
    : glass
      ? colors.glassSurface
      : variant === "outline"
        ? colors.transparent
        : isDark
          ? colors.surfaceRaised
          : colors.backgroundSubtle;

  const activeTrackColor = disabled
    ? colors.disabled
    : variant === "outline"
      ? withAlpha(activeColor, isDark ? 0.22 : 0.14)
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
      : variant === "filled" && isBrutal
        ? colors.border
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

  const thumbBorderWidth = isBrutal
    ? components.borderWidth.hairline
    : variant === "outline"
      ? 0
      : components.borderWidth.hairline;

  const inactiveThumbBorder = isBrutal ? colors.border : colors.transparent;
  const activeThumbBorder = isBrutal
    ? colors.border
    : variant === "outline"
      ? colors.transparent
      : withAlpha(activeColor, 0.22);

  const thumbElevationStyle: ViewStyle | undefined =
    !disabled && !isBrutal && variant === "filled"
      ? {
          boxShadow: isDark
            ? "0px 1px 3px rgba(0, 0, 0, 0.45)"
            : "0px 1px 3px rgba(15, 23, 42, 0.22)",
        }
      : undefined;

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
        duration: 120,
        easing: Easing.bezier(...SWITCH_EASING),
      });
    }
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    if (disabled) return;
    onPressOut?.(event);
    if (shouldAnimate) {
      pressed.value = withTiming(0, {
        duration: 160,
        easing: Easing.bezier(...SWITCH_EASING),
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
    () => {
      const dynamicStretch = pressed.value * stretch;
      return {
        width: thumbWidth + dynamicStretch,
        transform: [{ translateX: progress.value * (travel - dynamicStretch) }],
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
      };
    },
    webDeps([
      activeThumbBorder,
      activeThumbColor,
      inactiveThumbBorder,
      inactiveThumbColor,
      stretch,
      thumbWidth,
      travel,
    ]),
  );

  const iconColor = disabled
    ? colors.disabledText
    : checked
      ? variant === "outline"
        ? toneColors.on
        : activeColor
      : isDark
        ? colors.surface
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
      style={[
        styles.wrapper,
        {
          width,
          height,
          opacity: disabled ? 0.52 : 1,
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
            borderWidth: trackBorderWidth,
            padding: inset,
          },
          isBrutal && !disabled ? shadows.sm : undefined,
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
              borderWidth: thumbBorderWidth,
            },
            thumbElevationStyle,
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
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    justifyContent: "center",
  },
  thumb: {
    alignItems: "center",
    justifyContent: "center",
  },
});
