import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AppState,
  StyleSheet,
  useWindowDimensions,
  type AppStateStatus,
  type LayoutChangeEvent,
  type StyleProp,
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

import { useTheme } from "../theme";
import { withAlpha } from "../utils";

export type SkeletonShimmerDirection =
  | "top-left-to-bottom-right"
  | "left-to-right"
  | "top-to-bottom"
  | "top-right-to-bottom-left";

export interface SkeletonGroupContextValue {
  progress: SharedValue<number>;
  animated: boolean;
}

export const SkeletonContext =
  createContext<SkeletonGroupContextValue | null>(null);

export interface SkeletonGroupProps {
  /** Whether the shared shimmer animation is actively running */
  animated?: boolean;
  /** Duration of one shimmer sweep in milliseconds. Defaults to 1400ms */
  duration?: number;
  children: React.ReactNode;
}

export function SkeletonGroup({
  animated = true,
  duration = 1400,
  children,
}: SkeletonGroupProps) {
  const reducedMotion = useReducedMotion();
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );
  const progress = useSharedValue(0);

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

  const isRunning = animated && !reducedMotion && appActive;

  useEffect(() => {
    if (!isRunning) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [duration, isRunning, progress]);

  const value = useMemo(
    () => ({
      progress,
      animated: animated && !reducedMotion,
    }),
    [animated, progress, reducedMotion],
  );

  return (
    <SkeletonContext.Provider value={value}>
      {children}
    </SkeletonContext.Provider>
  );
}

export interface SkeletonProps extends ViewProps {
  /** Whether shimmer animation is enabled. Defaults to true */
  animated?: boolean;
  /** Border radius token from the theme. Defaults to "md" */
  radius?: keyof ReturnType<typeof useTheme>["radii"];
  /** Direction of the shimmer wave sweep */
  direction?: SkeletonShimmerDirection;
  /** Additional styling applied to the skeleton placeholder */
  style?: StyleProp<ViewStyle>;
  /** Optional inner children */
  children?: React.ReactNode;
}

function SkeletonComponent({
  animated = true,
  radius = "md",
  direction = "top-left-to-bottom-right",
  style,
  children,
  onLayout,
  ...props
}: SkeletonProps) {
  const { colors, isDark, radii } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const groupContext = useContext(SkeletonContext);

  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );

  useEffect(() => {
    if (groupContext) return;
    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        setAppActive(next === "active");
      },
    );
    return () => {
      subscription.remove();
    };
  }, [groupContext]);

  const localProgress = useSharedValue(0);
  const progress = groupContext ? groupContext.progress : localProgress;
  const isAnimated = groupContext
    ? groupContext.animated && animated
    : animated && !reducedMotion;
  const shouldRunLocalLoop = isAnimated && !groupContext && appActive;

  const measuredWidth = useSharedValue(Math.max(120, windowWidth));
  const measuredHeight = useSharedValue(48);

  useEffect(() => {
    if (groupContext) return;

    if (!shouldRunLocalLoop) {
      cancelAnimation(localProgress);
      localProgress.value = 0;
      return;
    }

    localProgress.value = 0;
    localProgress.value = withRepeat(
      withTiming(1, {
        duration: 1400,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(localProgress);
    };
  }, [groupContext, localProgress, shouldRunLocalLoop]);

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (width > 0) measuredWidth.value = width;
      if (height > 0) measuredHeight.value = height;
      onLayout?.(event);
    },
    [measuredHeight, measuredWidth, onLayout],
  );

  const containerAnimatedStyle = useAnimatedStyle(() => {
    if (!isAnimated) return { opacity: 1 };
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0.78, 1, 0.78]);
    return { opacity };
  });

  const isVertical = direction === "top-to-bottom";

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    if (!isAnimated) return { opacity: 0 };

    if (isVertical) {
      const sweepY = Math.max(80, measuredHeight.value * 1.4);
      const translateY = interpolate(progress.value, [0, 1], [-sweepY, sweepY]);
      return {
        transform: [{ translateY }],
      };
    }

    const sweepX = Math.max(120, measuredWidth.value * 1.4);
    const startPos =
      direction === "top-right-to-bottom-left" ? sweepX : -sweepX;
    const endPos =
      direction === "top-right-to-bottom-left" ? -sweepX : sweepX;
    const translateX = interpolate(progress.value, [0, 1], [startPos, endPos]);

    if (direction === "left-to-right") {
      return { transform: [{ translateX }] };
    }
    const rotate =
      direction === "top-right-to-bottom-left" ? "-25deg" : "25deg";
    return {
      transform: [{ translateX }, { rotate }],
    };
  });

  const shimmerColor = isDark
    ? withAlpha("#FFFFFF", 0.14)
    : withAlpha("#FFFFFF", 0.58);
  const shimmerBarWidth = Math.max(56, Math.min(windowWidth * 0.3, 110));

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityState={{ busy: isAnimated }}
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundSubtle,
          borderRadius: radii[radius],
        },
        style,
        containerAnimatedStyle,
      ]}
      {...props}
    >
      {isAnimated && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            isVertical
              ? styles.verticalShimmerBar
              : {
                  top: -60,
                  bottom: -60,
                  width: shimmerBarWidth,
                },
            { backgroundColor: shimmerColor },
            shimmerAnimatedStyle,
          ]}
        />
      )}
      {children}
    </Animated.View>
  );
}

export const Skeleton = React.memo(SkeletonComponent);

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
    minHeight: 8,
  },
  verticalShimmerBar: {
    left: 0,
    right: 0,
    height: 48,
  },
});
