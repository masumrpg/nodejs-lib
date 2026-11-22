import React from "react";
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import {
  resolveToneColors,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentTone,
  type ToneProps,
} from "./types";

export type SliderTone = ComponentTone;

export interface SliderProps
  extends Omit<ViewProps, "style">,
    ToneProps<SliderTone>,
    BaseGlassProps,
    BaseHapticProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  onSlidingStart?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  activeTrackStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
}

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, step: number, min: number, max: number) {
  "worklet";
  if (step <= 0) return clamp(value, min, max);
  const raw = Math.round((value - min) / step) * step + min;
  const stepStr = String(step);
  const dotIdx = stepStr.indexOf(".");
  const decimals = dotIdx >= 0 ? stepStr.length - dotIdx - 1 : 0;
  const rounded = decimals > 0 ? Number(raw.toFixed(decimals)) : raw;
  return clamp(rounded, min, max);
}

function SliderComponent({
  value,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  tone = "primary",
  glass = false,
  haptic = true,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
  style,
  trackStyle,
  activeTrackStyle,
  thumbStyle,
  onLayout,
  ...props
}: SliderProps) {
  const { colors, components, radii, shadows } = useTheme();
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const range = safeMax - safeMin;

  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = clamp(value ?? internalValue, safeMin, safeMax);
  const initialProgress =
    range === 0 ? 0 : (currentValue - safeMin) / range;

  const progress = useSharedValue(initialProgress);
  const trackWidth = useSharedValue(0);
  const lastEmittedValue = useSharedValue(currentValue);
  const isInteractingRef = React.useRef(false);
  const lastCommittedRef = React.useRef(currentValue);
  const isControlled = value !== undefined;

  const activeColor = resolveToneColors(tone, colors).solid;
  const thumbSize = components.slider.thumbSize;
  const trackHeight = components.slider.trackHeight;
  const containerHeight = Math.max(components.slider.height, thumbSize);

  React.useEffect(() => {
    if (isInteractingRef.current) return;
    const nextProgress =
      range === 0 ? 0 : (currentValue - safeMin) / range;
    lastEmittedValue.value = currentValue;
    lastCommittedRef.current = currentValue;
    progress.value = clamp(nextProgress, 0, 1);
  }, [currentValue, lastEmittedValue, progress, range, safeMin]);

  const setInteractionActive = React.useCallback((active: boolean) => {
    isInteractingRef.current = active;
  }, []);

  const commitValue = React.useCallback(
    (nextValue: number, complete: boolean, start = false) => {
      const next = clamp(nextValue, safeMin, safeMax);
      const changed = next !== lastCommittedRef.current;

      if (haptic && step > 0 && changed) {
        triggerHaptic("selection");
      }
      lastCommittedRef.current = next;

      if (!isControlled) {
        setInternalValue(next);
      }
      if (start) {
        onSlidingStart?.(next);
      }
      if (changed || start) {
        onValueChange?.(next);
      }
      if (complete) {
        onSlidingComplete?.(next);
      }
    },
    [
      haptic,
      isControlled,
      onSlidingComplete,
      onSlidingStart,
      onValueChange,
      safeMax,
      safeMin,
      step,
    ],
  );

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
      onLayout?.(event);
    },
    [onLayout, trackWidth],
  );

  const computeFromX = React.useCallback(
    (x: number) => {
      "worklet";
      const usable = Math.max(1, trackWidth.value - thumbSize);
      const nextProgress = clamp((x - thumbSize / 2) / usable, 0, 1);
      const rawValue = safeMin + nextProgress * range;
      const nextValue = snap(rawValue, step, safeMin, safeMax);
      return { nextProgress, nextValue };
    },
    [range, safeMax, safeMin, step, thumbSize, trackWidth],
  );

  const tapGesture = useTapGesture({
    enabled: !disabled,
    onDeactivate: (event) => {
      "worklet";
      if (event.canceled || trackWidth.value <= 0) return;
      const { nextValue } = computeFromX(event.x);
      const snappedProgress =
        range === 0 ? 0 : (nextValue - safeMin) / range;
      progress.value = snappedProgress;
      lastEmittedValue.value = nextValue;
      scheduleOnRN(commitValue, nextValue, true, true);
    },
  });

  const panGesture = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-4, 4],
    failOffsetY: [-14, 14],
    hitSlop: components.slider.hitSlop,
    onActivate: (event) => {
      "worklet";
      if (trackWidth.value <= 0) return;
      const { nextProgress, nextValue } = computeFromX(event.x);
      lastEmittedValue.value = nextValue;
      progress.value = nextProgress;
      scheduleOnRN(setInteractionActive, true);
      scheduleOnRN(commitValue, nextValue, false, true);
    },
    onUpdate: (event) => {
      "worklet";
      if (trackWidth.value <= 0) return;
      const { nextProgress, nextValue } = computeFromX(event.x);
      progress.value = nextProgress;
      if (nextValue !== lastEmittedValue.value) {
        lastEmittedValue.value = nextValue;
        scheduleOnRN(commitValue, nextValue, false, false);
      }
    },
    onFinalize: (event) => {
      "worklet";
      scheduleOnRN(setInteractionActive, false);
      if (event.canceled || trackWidth.value <= 0) return;
      const { nextValue } = computeFromX(event.x);
      const snappedProgress =
        range === 0 ? 0 : (nextValue - safeMin) / range;
      progress.value = snappedProgress;
      lastEmittedValue.value = nextValue;
      scheduleOnRN(commitValue, nextValue, true, false);
    },
  });

  const gesture = useCompetingGestures(panGesture, tapGesture);

  const activeTrackAnimatedStyle = useAnimatedStyle(() => ({
    width: Math.max(
      0,
      progress.value * Math.max(0, trackWidth.value - thumbSize) +
        thumbSize / 2,
    ),
  }));

  const thumbAnimatedStyle = useAnimatedStyle(() => {
    const travel = Math.max(0, trackWidth.value - thumbSize);
    return {
      transform: [{ translateX: progress.value * travel }],
    };
  });

  const handleAccessibilityAction = React.useCallback(
    (event: AccessibilityActionEvent) => {
      if (disabled) return;
      const a11yStep = step > 0 ? step : Math.max(1, Math.round(range / 20));
      if (event.nativeEvent.actionName === "increment") {
        commitValue(
          snap(currentValue + a11yStep, a11yStep, safeMin, safeMax),
          true,
          false,
        );
      } else if (event.nativeEvent.actionName === "decrement") {
        commitValue(
          snap(currentValue - a11yStep, a11yStep, safeMin, safeMax),
          true,
          false,
        );
      }
    },
    [commitValue, currentValue, disabled, range, safeMax, safeMin, step],
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: safeMin, max: safeMax, now: currentValue }}
        accessibilityActions={[
          { name: "increment", label: "Increase" },
          { name: "decrement", label: "Decrease" },
        ]}
        onAccessibilityAction={handleAccessibilityAction}
        onLayout={handleLayout}
        style={[
          styles.container,
          {
            height: containerHeight,
            opacity: disabled ? 0.45 : 1,
          },
          style,
        ]}
        {...props}
      >
        <View
          pointerEvents="none"
          style={[
            styles.track,
            {
              height: trackHeight,
              borderRadius: radii.full,
              backgroundColor: glass
                ? colors.glassSurface
                : colors.backgroundSubtle,
              borderWidth: glass ? components.borderWidth.default : 0,
              borderColor: glass ? colors.glassBorder : colors.transparent,
            },
            trackStyle,
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeTrack,
            {
              height: trackHeight,
              borderRadius: radii.full,
              backgroundColor: activeColor,
            },
            activeTrackAnimatedStyle,
            activeTrackStyle,
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            shadows.md,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: radii.full,
              backgroundColor: colors.surface,
              borderWidth: components.borderWidth.focus,
              borderColor: activeColor,
            },
            thumbAnimatedStyle,
            thumbStyle,
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

export const Slider = React.memo(SliderComponent);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    justifyContent: "center",
    position: "relative",
  },
  track: {
    width: "100%",
  },
  activeTrack: {
    position: "absolute",
    left: 0,
  },
  thumb: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
