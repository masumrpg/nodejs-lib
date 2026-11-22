import React, { useEffect, useState } from "react";
import {
  AppState,
  StyleSheet,
  View,
  type AppStateStatus,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../theme";
import { Text } from "./Text";
import {
  resolveToneColors,
  type BaseAnimatedProps,
  type ComponentSize,
  type ComponentTone,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type SpinnerVariant = "circular" | "dots" | "bars" | "ring";
export type SpinnerSize = ComponentSize | number;
export type SpinnerSpeed = "slow" | "normal" | "fast" | number;
export type SpinnerLabelPlacement = "bottom" | "right" | "top" | "left";

export interface SpinnerProps
  extends ViewProps,
    VariantProps<SpinnerVariant>,
    ToneProps<ComponentTone>,
    SizeProps<SpinnerSize>,
    BaseAnimatedProps {
  /** Custom stroke width for circular/ring variants. Calculated automatically if omitted. */
  strokeWidth?: number;
  /** Rotation/pulse animation speed. Defaults to "normal" */
  speed?: SpinnerSpeed;
  /** Optional descriptive loading text */
  label?: string;
  /** Position of the label relative to the spinner. Defaults to "bottom" */
  labelPlacement?: SpinnerLabelPlacement;
  /** Custom style for the label text */
  labelStyle?: StyleProp<TextStyle>;
  /** Custom background track circle color */
  trackColor?: string;
  /** Direct color override, superseding tone */
  color?: string;
}

const SIZE_MAP: Record<ComponentSize, number> = {
  xs: 16,
  sm: 22,
  md: 32,
  lg: 44,
  xl: 58,
};

function resolveDuration(speed: SpinnerSpeed): number {
  if (typeof speed === "number" && Number.isFinite(speed) && speed > 0) {
    return speed;
  }
  switch (speed) {
    case "fast":
      return 550;
    case "slow":
      return 1400;
    case "normal":
    default:
      return 850;
  }
}

function resolveDimension(size: SpinnerSize): number {
  if (typeof size === "number") {
    return Number.isFinite(size) && size > 0 ? size : SIZE_MAP.md;
  }
  return SIZE_MAP[size] ?? SIZE_MAP.md;
}

function resolveStrokeWidth(dimension: number, customWidth?: number): number {
  if (
    typeof customWidth === "number" &&
    Number.isFinite(customWidth) &&
    customWidth > 0
  ) {
    return Math.min(customWidth, dimension / 2.5);
  }
  if (dimension <= 18) return 2;
  if (dimension <= 26) return 2.5;
  if (dimension <= 36) return 3.2;
  if (dimension <= 48) return 4;
  return 5;
}

function toSafeDeg(val: number, multiplier = 1): string {
  "worklet";
  if (!Number.isFinite(val)) return "0deg";
  const raw = (val * multiplier) % 360;
  const normalized = (raw + 360) % 360;
  return `${normalized.toFixed(1)}deg`;
}

interface DotItemProps {
  pulse: SharedValue<number>;
  offset: number;
  size: number;
  color: string;
}

const DotItem = React.memo(function DotItem({
  pulse,
  offset,
  size,
  color,
}: DotItemProps) {
  const dotStyle = useAnimatedStyle(() => {
    const p = Number.isFinite(pulse.value) ? pulse.value : 0;
    const phase = (p + offset) % 1;
    const scale = interpolate(phase, [0, 0.5, 1], [0.45, 1.1, 0.45]);
    const opacity = interpolate(phase, [0, 0.5, 1], [0.35, 1, 0.35]);
    return {
      transform: [{ scale: Number.isFinite(scale) ? scale : 1 }],
      opacity: Number.isFinite(opacity) ? opacity : 1,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        dotStyle,
      ]}
    />
  );
});

interface BarItemProps {
  pulse: SharedValue<number>;
  offset: number;
  width: number;
  height: number;
  color: string;
}

const BarItem = React.memo(function BarItem({
  pulse,
  offset,
  width,
  height,
  color,
}: BarItemProps) {
  const barStyle = useAnimatedStyle(() => {
    const p = Number.isFinite(pulse.value) ? pulse.value : 0;
    const phase = (p + offset) % 1;
    const scaleY = interpolate(phase, [0, 0.5, 1], [0.3, 1, 0.3]);
    const opacity = interpolate(phase, [0, 0.5, 1], [0.4, 1, 0.4]);
    return {
      transform: [{ scaleY: Number.isFinite(scaleY) ? scaleY : 1 }],
      opacity: Number.isFinite(opacity) ? opacity : 1,
    };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: width / 2,
          backgroundColor: color,
        },
        barStyle,
      ]}
    />
  );
});

function SpinnerComponent({
  variant = "circular",
  tone = "primary",
  size = "md",
  strokeWidth: customStrokeWidth,
  speed = "normal",
  label,
  labelPlacement = "bottom",
  labelStyle,
  trackColor,
  color: customColor,
  animated = true,
  style,
  ...props
}: SpinnerProps) {
  const { colors, spacing } = useTheme();
  const reducedMotion = useReducedMotion();
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        setAppActive(next === "active");
      },
    );
    return () => {
      subscription.remove();
    };
  }, []);

  const toneColor = customColor || resolveToneColors(tone, colors).solid;
  const dimension = Math.max(8, resolveDimension(size));
  const strokeWidth = Math.max(
    1,
    resolveStrokeWidth(dimension, customStrokeWidth),
  );
  const duration = resolveDuration(speed);

  const shouldAnimate = animated && !reducedMotion && appActive;
  const needsRotation = variant === "circular" || variant === "ring";
  const needsPulse = variant === "dots" || variant === "bars";

  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
      rotation.value = 0;
      pulse.value = 0;
      return;
    }

    if (needsRotation) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }

    if (needsPulse) {
      pulse.value = 0;
      pulse.value = withRepeat(
        withTiming(1, {
          duration: Math.round(duration * 1.2),
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }

    return () => {
      cancelAnimation(rotation);
      cancelAnimation(pulse);
    };
  }, [duration, needsPulse, needsRotation, pulse, rotation, shouldAnimate]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: toSafeDeg(rotation.value, 1) }],
  }));

  // Integer multiplier (-2x) ensures seamless wrap at 360deg without jump
  const counterSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: toSafeDeg(rotation.value, -2) }],
  }));

  const radius = Math.max(1, (dimension - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.72;
  const gapLength = Math.max(0.01, circumference - arcLength);
  const backgroundTrackColor = trackColor || colors.backgroundSubtle;

  const renderLoader = () => {
    switch (variant) {
      case "ring": {
        const innerDimension = Math.max(6, dimension * 0.65);
        const innerStroke = Math.max(1, strokeWidth * 0.75);
        const innerRadius = Math.max(1, (innerDimension - innerStroke) / 2);
        const innerCircumference = 2 * Math.PI * innerRadius;

        return (
          <View
            style={[
              styles.ringContainer,
              { width: dimension, height: dimension },
            ]}
          >
            <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
              <Svg width={dimension} height={dimension}>
                <Circle
                  cx={dimension / 2}
                  cy={dimension / 2}
                  r={radius}
                  stroke={backgroundTrackColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx={dimension / 2}
                  cy={dimension / 2}
                  r={radius}
                  stroke={toneColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference * 0.5} ${circumference * 0.5}`}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>

            <Animated.View style={counterSpinStyle}>
              <Svg width={innerDimension} height={innerDimension}>
                <Circle
                  cx={innerDimension / 2}
                  cy={innerDimension / 2}
                  r={innerRadius}
                  stroke={toneColor}
                  strokeWidth={innerStroke}
                  strokeDasharray={`${innerCircumference * 0.45} ${innerCircumference * 0.55}`}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.8}
                />
              </Svg>
            </Animated.View>
          </View>
        );
      }

      case "dots": {
        const dotSize = Math.max(3, Math.floor(dimension * 0.22));
        const gap = Math.max(2, Math.floor((dimension - dotSize * 3) / 2));

        return (
          <View style={[styles.rowCenter, { gap, height: dimension }]}>
            {[0, 0.33, 0.66].map((offset, idx) => (
              <DotItem
                key={idx}
                pulse={pulse}
                offset={offset}
                size={dotSize}
                color={toneColor}
              />
            ))}
          </View>
        );
      }

      case "bars": {
        const barWidth = Math.max(2, Math.floor(dimension * 0.14));
        const barMaxHeight = dimension;
        const gap = Math.max(2, Math.floor((dimension - barWidth * 4) / 3));

        return (
          <View
            style={[styles.rowCenter, { height: barMaxHeight, gap }]}
          >
            {[0, 0.25, 0.5, 0.75].map((offset, idx) => (
              <BarItem
                key={idx}
                pulse={pulse}
                offset={offset}
                width={barWidth}
                height={barMaxHeight}
                color={toneColor}
              />
            ))}
          </View>
        );
      }

      case "circular":
      default:
        return (
          <Animated.View
            style={[{ width: dimension, height: dimension }, spinStyle]}
          >
            <Svg width={dimension} height={dimension}>
              <Circle
                cx={dimension / 2}
                cy={dimension / 2}
                r={radius}
                stroke={backgroundTrackColor}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx={dimension / 2}
                cy={dimension / 2}
                r={radius}
                stroke={toneColor}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arcLength} ${gapLength}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        );
    }
  };

  const isRowLayout = labelPlacement === "left" || labelPlacement === "right";
  const isReverse = labelPlacement === "top" || labelPlacement === "left";

  const containerStyle: ViewStyle = {
    flexDirection: isRowLayout
      ? isReverse
        ? "row-reverse"
        : "row"
      : isReverse
        ? "column-reverse"
        : "column",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label || "Loading"}
      accessibilityState={{ busy: animated }}
      accessibilityLiveRegion="polite"
      style={[containerStyle, style]}
      {...props}
    >
      {renderLoader()}
      {typeof label === "string" && label.length > 0 && (
        <Text
          variant="labelSmall"
          color="textMuted"
          numberOfLines={2}
          style={[styles.labelText, labelStyle]}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

export const Spinner = React.memo(SpinnerComponent);

const styles = StyleSheet.create({
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  labelText: {
    flexShrink: 1,
  },
});
