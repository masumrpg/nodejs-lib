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
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line, Path } from "react-native-svg";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveToneColors,
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
} from "./types";

export interface CheckboxProps
  extends Omit<PressableProps, "style" | "children">,
    ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    ShapeProps<ComponentShape>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: RenderIcon;
}

function DefaultCheckIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M20 6L9 17l-5-5" />
    </Svg>
  );
}

function DefaultIndeterminateIcon({
  color,
  size,
}: {
  color: string;
  size: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
    >
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  );
}

function CheckboxComponent({
  checked,
  defaultChecked = false,
  indeterminate = false,
  onCheckedChange,
  disabled = false,
  invalid = false,
  size = "md",
  tone = "primary",
  shape = "rounded",
  glass = false,
  haptic = true,
  animated = true,
  hitSlop,
  onPress,
  style,
  icon,
  ...props
}: CheckboxProps) {
  const { colors, components, radii } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const isControlled = checked !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState(defaultChecked);
  const currentChecked = isControlled ? checked : uncontrolled;
  const isFilled = Boolean(currentChecked || indeterminate);

  const progress = useSharedValue(isFilled ? 1 : 0);

  React.useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(progress);
      progress.value = isFilled ? 1 : 0;
      return;
    }
    progress.value = withTiming(isFilled ? 1 : 0, {
      duration: ANIMATION_TIMING.transition,
      easing: Easing.bezier(...ANIMATION_TIMING.bezier),
    });
  }, [isFilled, progress, shouldAnimate]);

  React.useEffect(() => {
    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled) return;
    if (haptic) triggerHaptic("selection");
    const nextValue = indeterminate ? true : !currentChecked;
    if (!isControlled) {
      setUncontrolled(nextValue);
    }
    onCheckedChange?.(nextValue);
    onPress?.(event);
  };

  const cbTokens = components.checkbox;
  const boxSize = cbTokens.size[size];
  const iconSize = cbTokens.iconSize[size];
  const borderRadius =
    shape === "pill"
      ? radii.full
      : shape === "square"
        ? radii.xs
        : cbTokens.radius[size];

  const toneColors = resolveToneColors(tone, colors);
  const activeBg = invalid ? colors.danger : toneColors.solid;
  const activeFg = invalid ? colors.onDanger : toneColors.on;

  const borderColor = disabled
    ? colors.disabledText
    : invalid
      ? colors.danger
      : isFilled
        ? activeBg
        : glass
          ? colors.glassBorder
          : colors.border;

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.72 + progress.value * 0.28 }],
  }));

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: indeterminate ? "mixed" : Boolean(currentChecked),
        disabled,
      }}
      accessibilityHint={invalid ? "Invalid selection" : undefined}
      hitSlop={hitSlop ?? minTouchHitSlop(boxSize)}
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.box,
        {
          width: boxSize,
          height: boxSize,
          borderRadius,
          borderWidth: components.borderWidth.control,
          borderColor,
          backgroundColor: disabled
            ? colors.disabled
            : glass
              ? colors.glassSurface
              : colors.transparent,
          opacity: disabled ? 0.6 : pressed ? 0.82 : 1,
        },
        style,
      ]}
      {...props}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.fillCenter,
          {
            backgroundColor: disabled ? colors.disabled : activeBg,
          },
          overlayStyle,
        ]}
      >
        {icon ? (
          renderIcon(icon, disabled ? colors.disabledText : activeFg, iconSize)
        ) : indeterminate ? (
          <DefaultIndeterminateIcon
            color={disabled ? colors.disabledText : activeFg}
            size={iconSize}
          />
        ) : (
          <DefaultCheckIcon
            color={disabled ? colors.disabledText : activeFg}
            size={iconSize}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

export const Checkbox = React.memo(CheckboxComponent);

const styles = StyleSheet.create({
  box: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  fillCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
});
