import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Svg, { Line } from "react-native-svg";

import { useTheme } from "../theme";
import { withAlpha } from "../utils";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  minTouchHitSlop,
  renderIcon,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentSize,
  type RenderIcon,
  type SizeProps,
  type VariantProps,
} from "./types";

export type StepperVariant = "input" | "soft" | "outline";
export type StepperSize = ComponentSize;

export interface StepperProps
  extends ViewProps,
    BaseGlassProps,
    BaseHapticProps,
    VariantProps<StepperVariant>,
    SizeProps<StepperSize> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  decrementIcon?: RenderIcon;
  incrementIcon?: RenderIcon;
  style?: StyleProp<ViewStyle>;
}

function roundToStepDecimals(value: number, step: number): number {
  const stepStr = String(step);
  const dotIdx = stepStr.indexOf(".");
  if (dotIdx < 0) return value;
  const decimals = stepStr.length - dotIdx - 1;
  return Number(value.toFixed(decimals));
}

function clampStepper(value: number, min: number, max: number, step: number) {
  const rounded = roundToStepDecimals(value, step);
  return Math.min(max, Math.max(min, rounded));
}

function MinusIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1={5}
        y1={12}
        x2={19}
        y2={12}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PlusIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1={5}
        y1={12}
        x2={19}
        y2={12}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={12}
        y1={5}
        x2={12}
        y2={19}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StepperComponent({
  value,
  defaultValue = 0,
  min = 0,
  max = 999,
  step = 1,
  variant = "input",
  size = "md",
  disabled = false,
  glass = false,
  haptic = true,
  onValueChange,
  decrementIcon,
  incrementIcon,
  style,
  ...props
}: StepperProps) {
  const { colors, components, radii, shadows, spacing } = useTheme();
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const [internalValue, setInternalValue] = React.useState(defaultValue);

  const currentValue = clampStepper(
    value ?? internalValue,
    safeMin,
    safeMax,
    step,
  );

  const setNextValue = React.useCallback(
    (nextValue: number) => {
      if (disabled) return;
      const next = clampStepper(nextValue, safeMin, safeMax, step);
      if (next === currentValue) return;
      if (haptic) triggerHaptic("selection");
      if (value === undefined) setInternalValue(next);
      onValueChange?.(next);
    },
    [
      currentValue,
      disabled,
      haptic,
      onValueChange,
      safeMax,
      safeMin,
      step,
      value,
    ],
  );

  const stepperTokens = components.stepper;
  const containerHeight = stepperTokens.height[size];
  const buttonSize = stepperTokens.buttonSize[size];
  const iconSize = stepperTokens.iconSize[size];
  const padding = Math.max(2, Math.round((containerHeight - buttonSize) / 2));

  const isTonalOutline = components.surface.outlineStyle === "tonal";

  const containerBg = disabled
    ? colors.disabled
    : glass
      ? colors.glassSurface
      : variant === "soft"
        ? colors.primarySoft
        : variant === "outline"
          ? isTonalOutline
            ? colors.input
            : colors.transparent
          : colors.input;

  const borderColor = glass
    ? colors.glassBorder
    : variant === "soft"
      ? components.surface.outlineBorderColor === "border"
        ? colors.border
        : withAlpha(colors.primary, 0.28)
      : variant === "outline" && isTonalOutline
        ? colors.transparent
        : colors.border;

  const borderWidth =
    variant === "outline"
      ? isTonalOutline
        ? 0
        : components.borderWidth.control
      : variant === "soft" && !glass
        ? components.borderWidth.default
        : components.borderWidth.strong;
  const containerShadow = !disabled
    ? shadows[components.surface.inputShadow]
    : shadows.none;

  const buttonRestBg =
    variant === "soft"
      ? withAlpha(colors.primary, 0.14)
      : withAlpha(colors.secondary, 0.12);

  const innerRadius = radii.md;

  const canDecrement = !disabled && currentValue > safeMin;
  const canIncrement = !disabled && currentValue < safeMax;
  const buttonHitSlop = minTouchHitSlop(buttonSize);

  const handleAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (disabled) return;
    if (e.nativeEvent.actionName === "increment") {
      setNextValue(currentValue + step);
    } else if (e.nativeEvent.actionName === "decrement") {
      setNextValue(currentValue - step);
    }
  };

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: safeMin, max: safeMax, now: currentValue }}
      accessibilityActions={[
        { name: "increment", label: "Increment" },
        { name: "decrement", label: "Decrement" },
      ]}
      onAccessibilityAction={handleAccessibilityAction}
      style={[
        styles.container,
        {
          height: containerHeight,
          minHeight: containerHeight,
          borderWidth,
          borderColor,
          borderRadius: radii.lg,
          backgroundColor: containerBg,
          padding,
          opacity: disabled ? 0.6 : 1,
        },
        containerShadow,
        style,
      ]}
      {...props}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrement stepper"
        accessibilityState={{ disabled: !canDecrement }}
        hitSlop={buttonHitSlop}
        disabled={!canDecrement}
        onPress={() => setNextValue(currentValue - step)}
        style={({ pressed }) => [
          styles.stepBtn,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: innerRadius,
            backgroundColor:
              pressed && canDecrement
                ? colors.backgroundMuted
                : canDecrement
                  ? buttonRestBg
                  : colors.transparent,
            opacity: canDecrement ? (pressed ? 0.8 : 1) : 0.4,
          },
        ]}
      >
        {decrementIcon ? (
          renderIcon(
            decrementIcon,
            canDecrement ? colors.text : colors.disabledText,
            iconSize,
          )
        ) : (
          <MinusIcon
            color={canDecrement ? colors.text : colors.disabledText}
            size={iconSize}
          />
        )}
      </Pressable>

      <View style={[styles.valueWrap, { paddingHorizontal: spacing.xs }]}>
        <Text
          variant={size === "xs" || size === "sm" ? "bodySmall" : "label"}
          color={disabled ? "disabledText" : "text"}
          weight="600"
          style={styles.tabularText}
        >
          {currentValue}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increment stepper"
        accessibilityState={{ disabled: !canIncrement }}
        hitSlop={buttonHitSlop}
        disabled={!canIncrement}
        onPress={() => setNextValue(currentValue + step)}
        style={({ pressed }) => [
          styles.stepBtn,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: innerRadius,
            backgroundColor:
              pressed && canIncrement
                ? colors.backgroundMuted
                : canIncrement
                  ? buttonRestBg
                  : colors.transparent,
            opacity: canIncrement ? (pressed ? 0.8 : 1) : 0.4,
          },
        ]}
      >
        {incrementIcon ? (
          renderIcon(
            incrementIcon,
            canIncrement ? colors.text : colors.disabledText,
            iconSize,
          )
        ) : (
          <PlusIcon
            color={canIncrement ? colors.text : colors.disabledText}
            size={iconSize}
          />
        )}
      </Pressable>
    </View>
  );
}

export const Stepper = React.memo(StepperComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  valueWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabularText: {
    fontVariant: ["tabular-nums"],
  },
});
