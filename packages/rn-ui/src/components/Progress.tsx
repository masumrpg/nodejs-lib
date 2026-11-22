import React from "react";
import {
  AppState,
  StyleSheet,
  View,
  type AppStateStatus,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "../theme";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  resolveToneColors,
  type BaseAnimatedProps,
  type ComponentSize,
  type ComponentTone,
  type SizeProps,
  type ToneProps,
} from "./types";

export type ProgressSize = ComponentSize;

export interface ProgressProps
  extends ViewProps,
    ToneProps<ComponentTone>,
    SizeProps<ProgressSize>,
    BaseAnimatedProps {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  style?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
}

const PROGRESS_HEIGHTS: Record<ProgressSize, number> = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
};

function ProgressComponent({
  value = 0,
  max = 100,
  tone = "primary",
  size = "md",
  animated = true,
  indeterminate = false,
  style,
  indicatorStyle,
  onLayout,
  ...props
}: ProgressProps) {
  const { colors, radii } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const [appActive, setAppActive] = React.useState(
    AppState.currentState === "active",
  );

  React.useEffect(() => {
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

  const toneColor = resolveToneColors(tone, colors).solid;
  const height = PROGRESS_HEIGHTS[size] ?? PROGRESS_HEIGHTS.md;

  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const progress = Math.max(0, Math.min(1, safeValue / safeMax));

  const trackWidth = useSharedValue(0);
  const ratio = useSharedValue(progress);
  const indeterminateOffset = useSharedValue(-0.4);

  React.useEffect(() => {
    if (indeterminate) {
      if (!appActive || reducedMotion) {
        cancelAnimation(indeterminateOffset);
        indeterminateOffset.value = 0.3;
        return;
      }
      indeterminateOffset.value = -0.4;
      indeterminateOffset.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
        -1,
        false,
      );
      return () => {
        cancelAnimation(indeterminateOffset);
      };
    }

    if (!shouldAnimate) {
      cancelAnimation(ratio);
      ratio.value = progress;
      return;
    }

    ratio.value = withTiming(progress, {
      duration: 200,
      easing: Easing.bezier(...ANIMATION_TIMING.bezier),
    });

    return () => {
      cancelAnimation(ratio);
    };
  }, [
    appActive,
    indeterminate,
    indeterminateOffset,
    progress,
    ratio,
    reducedMotion,
    shouldAnimate,
  ]);

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;
      if (nextWidth > 0) {
        trackWidth.value = nextWidth;
      }
      onLayout?.(event);
    },
    [onLayout, trackWidth],
  );

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const w = trackWidth.value;
    if (indeterminate) {
      if (w <= 0) {
        return {
          width: "40%",
          transform: [{ translateX: 0 }],
        };
      }
      const barWidth = Math.max(36, w * 0.4);
      return {
        width: barWidth,
        transform: [{ translateX: indeterminateOffset.value * w }],
      };
    }
    const p = ratio.value;
    if (w > 0) {
      return {
        width: w,
        transform: [{ translateX: -(w * (1 - p)) / 2 }, { scaleX: p }],
      };
    }
    return {
      width: `${p * 100}%`,
    };
  });

  const accessibilityValue = indeterminate
    ? undefined
    : {
        min: 0,
        max: safeMax,
        now: Math.max(0, Math.min(safeMax, safeValue)),
      };

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={accessibilityValue}
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          height,
          borderRadius: radii.full,
          backgroundColor: colors.backgroundSubtle,
        },
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            borderRadius: radii.full,
            backgroundColor: toneColor,
          },
          indicatorAnimatedStyle,
          indicatorStyle,
        ]}
      />
    </View>
  );
}

export const Progress = React.memo(ProgressComponent);

export interface CircularProgressProps
  extends Omit<ViewProps, "style">,
    ToneProps<ComponentTone> {
  value?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  strokeLinecap?: "round" | "square" | "butt";
  style?: StyleProp<ViewStyle>;
}

function CircularProgressComponent({
  value = 0,
  size = 64,
  strokeWidth = 6,
  tone = "primary",
  showValue = true,
  strokeLinecap = "round",
  style,
  ...props
}: CircularProgressProps) {
  const { colors } = useTheme();

  const safeSize = Number.isFinite(size) && size > 4 ? size : 64;
  const safeStroke = Number.isFinite(strokeWidth)
    ? Math.max(1, Math.min(strokeWidth, safeSize / 2 - 1))
    : 6;
  const safeValue = Number.isFinite(value) ? value : 0;
  const clamped = Math.max(0, Math.min(100, safeValue));

  const toneColor = resolveToneColors(tone, colors).solid;
  const radius = Math.max(1, (safeSize - safeStroke) / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * clamped) / 100;
  const fontSize = Math.max(10, Math.round(safeSize * 0.22));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[
        {
          width: safeSize,
          height: safeSize,
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        },
        style,
      ]}
      {...props}
    >
      <Svg
        width={safeSize}
        height={safeSize}
        style={styles.svgRotate}
      >
        <Circle
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          stroke={colors.backgroundSubtle}
          strokeWidth={safeStroke}
          fill="none"
        />

        {clamped > 0 && (
          <Circle
            cx={safeSize / 2}
            cy={safeSize / 2}
            r={radius}
            stroke={toneColor}
            strokeWidth={safeStroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap={strokeLinecap}
            fill="none"
          />
        )}
      </Svg>

      {showValue && (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <Text
            weight="700"
            color="text"
            style={{ fontSize, lineHeight: Math.round(fontSize * 1.15) }}
          >
            {Math.round(clamped)}%
          </Text>
        </View>
      )}
    </View>
  );
}

export const CircularProgress = React.memo(CircularProgressComponent);

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
  indicator: {
    height: "100%",
  },
  svgRotate: {
    transform: [{ rotate: "-90deg" }],
  },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
  },
});
