import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewProps,
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
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentSize,
  type ComponentTone,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type RadioGroupVariant = "card" | "plain";

export interface RadioGroupContextValue {
  value?: string;
  disabled: boolean;
  orientation: "horizontal" | "vertical";
  variant: RadioGroupVariant;
  tone: ComponentTone;
  size: ComponentSize;
  glass: boolean;
  haptic: boolean;
  animated: boolean;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null,
);

export interface RadioGroupProps
  extends ViewProps,
    VariantProps<RadioGroupVariant>,
    ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  onValueChange?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const RadioGroup = React.memo(function RadioGroup({
  value,
  defaultValue,
  disabled = false,
  orientation = "vertical",
  variant = "card",
  tone = "primary",
  size = "md",
  glass = false,
  haptic = true,
  animated = true,
  onValueChange,
  style,
  ...props
}: RadioGroupProps) {
  const { spacing } = useTheme();
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [onValueChange, value],
  );

  const context = React.useMemo<RadioGroupContextValue>(
    () => ({
      value: currentValue,
      disabled,
      orientation,
      variant,
      tone,
      size,
      glass,
      haptic,
      animated,
      onValueChange: handleValueChange,
    }),
    [
      animated,
      currentValue,
      disabled,
      glass,
      handleValueChange,
      haptic,
      orientation,
      size,
      tone,
      variant,
    ],
  );

  return (
    <RadioGroupContext.Provider value={context}>
      <View
        accessibilityRole="radiogroup"
        style={[
          styles.group,
          {
            flexDirection: orientation === "horizontal" ? "row" : "column",
            alignItems: orientation === "horizontal" ? "stretch" : "flex-start",
            gap: orientation === "horizontal" ? spacing.md : spacing.sm,
          },
          style,
        ]}
        {...props}
      />
    </RadioGroupContext.Provider>
  );
});

export interface RadioGroupItemProps
  extends Omit<PressableProps, "style">,
    VariantProps<RadioGroupVariant>,
    ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  value: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const RadioGroupItem = React.memo(function RadioGroupItem({
  value,
  label,
  description,
  disabled = false,
  glass,
  haptic,
  animated,
  variant,
  tone,
  size,
  hitSlop,
  style,
  containerStyle,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: RadioGroupItemProps) {
  const context = React.useContext(RadioGroupContext);
  const { colors, components, radii, spacing, isDark } = useTheme();
  const reducedMotion = useReducedMotion();

  const resolvedVariant = variant ?? context?.variant ?? "card";
  const resolvedTone = tone ?? context?.tone ?? "primary";
  const resolvedSize = size ?? context?.size ?? "md";
  const resolvedGlass = glass ?? context?.glass ?? false;
  const resolvedHaptic = haptic ?? context?.haptic ?? true;
  const shouldAnimate = (animated ?? context?.animated ?? true) && !reducedMotion;

  const checked = context?.value === value;
  const isDisabled = disabled || Boolean(context?.disabled);
  const isHorizontal = context?.orientation === "horizontal";
  const isPlain = resolvedVariant === "plain";

  const checkedProgress = useSharedValue(checked ? 1 : 0);
  const pressedProgress = useSharedValue(0);

  React.useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(checkedProgress);
      checkedProgress.value = checked ? 1 : 0;
      return;
    }
    checkedProgress.value = withTiming(checked ? 1 : 0, {
      duration: ANIMATION_TIMING.transition,
      easing: Easing.bezier(...ANIMATION_TIMING.bezier),
    });
  }, [checked, checkedProgress, shouldAnimate]);

  React.useEffect(() => {
    return () => {
      cancelAnimation(checkedProgress);
      cancelAnimation(pressedProgress);
    };
  }, [checkedProgress, pressedProgress]);

  const toneColors = resolveToneColors(resolvedTone, colors);
  const activeBorder = toneColors.solid;

  const inactiveBg = isPlain
    ? colors.transparent
    : resolvedGlass
      ? colors.glassSurface
      : colors.surface;
  const activeBg = isPlain
    ? colors.transparent
    : withAlpha(toneColors.solid, isDark ? 0.18 : 0.08);
  const inactiveBorder = isPlain
    ? colors.transparent
    : resolvedGlass
      ? colors.glassBorder
      : colors.border;

  const containerAnimatedStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        checkedProgress.value,
        [0, 1],
        [inactiveBg, activeBg],
      ),
      borderColor: interpolateColor(
        checkedProgress.value,
        [0, 1],
        [inactiveBorder, activeBorder],
      ),
      transform: [
        { scale: shouldAnimate ? 1 - pressedProgress.value * 0.015 : 1 },
      ],
    }),
    webDeps([activeBg, activeBorder, inactiveBg, inactiveBorder, shouldAnimate]),
  );

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkedProgress.value }],
    opacity: checkedProgress.value,
  }));

  const radioCircleAnimatedStyle = useAnimatedStyle(
    () => ({
      borderColor: interpolateColor(
        checkedProgress.value,
        [0, 1],
        [colors.border, activeBorder],
      ),
    }),
    webDeps([activeBorder, colors.border]),
  );

  const circleSize =
    resolvedSize === "xs"
      ? 16
      : resolvedSize === "sm"
        ? 18
        : resolvedSize === "lg"
          ? 22
          : resolvedSize === "xl"
            ? 24
            : 20;
  const dotSize = Math.round(circleSize * 0.5);

  const handlePress = (e: GestureResponderEvent) => {
    if (isDisabled) return;
    if (context?.onValueChange) {
      if (resolvedHaptic) triggerHaptic("selection");
      context.onValueChange(value);
    }
    onPress?.(e);
  };

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={hitSlop ?? (isPlain ? minTouchHitSlop(36) : undefined)}
      onPress={handlePress}
      onPressIn={(e) => {
        if (!isDisabled && shouldAnimate && !isPlain) {
          pressedProgress.value = withTiming(1, {
            duration: ANIMATION_TIMING.pressIn,
          });
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!isDisabled && shouldAnimate && !isPlain) {
          pressedProgress.value = withTiming(0, {
            duration: ANIMATION_TIMING.pressOut,
          });
        }
        onPressOut?.(e);
      }}
      style={[isHorizontal ? styles.flex1 : styles.fullWidth, style]}
      {...props}
    >
      <Animated.View
        style={[
          isPlain
            ? [
                styles.plainItem,
                {
                  alignItems: description ? "flex-start" : "center",
                  gap: spacing.sm,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.xs,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]
            : [
                styles.cardItem,
                isHorizontal ? styles.flex1 : undefined,
                {
                  alignItems: description ? "flex-start" : "center",
                  gap: spacing.md,
                  padding: resolvedSize === "sm" ? spacing.sm : spacing.md,
                  borderWidth: components.borderWidth.strong,
                  borderRadius: radii.xl,
                  opacity: isDisabled ? 0.5 : 1,
                },
                containerAnimatedStyle,
              ],
          containerStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.radioOuter,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              borderWidth: components.borderWidth.control,
              marginTop: description ? 2 : 0,
            },
            radioCircleAnimatedStyle,
          ]}
        >
          <Animated.View
            style={[
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: activeBorder,
              },
              dotAnimatedStyle,
            ]}
          />
        </Animated.View>

        <View style={[styles.textWrap, { gap: spacing.xs }]}>
          {typeof label === "string" || typeof label === "number" ? (
            <Text variant="label" color="text">
              {label}
            </Text>
          ) : (
            label
          )}

          {typeof description === "string" || typeof description === "number" ? (
            <Text variant="bodySmall" color="textMuted">
              {description}
            </Text>
          ) : (
            description
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  group: {
    width: "100%",
  },
  flex1: {
    flex: 1,
  },
  fullWidth: {
    width: "100%",
  },
  plainItem: {
    width: "100%",
    minHeight: 44,
    flexDirection: "row",
  },
  cardItem: {
    width: "100%",
    flexDirection: "row",
  },
  radioOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
});
