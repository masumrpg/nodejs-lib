import React, { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
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

export interface RangeSliderProps
  extends Omit<ViewProps, "style">,
    ToneProps<ComponentTone>,
    BaseGlassProps,
    BaseHapticProps {
  min?: number;
  max?: number;
  step?: number;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (values: [number, number]) => void;
  onSlidingStart?: (values: [number, number]) => void;
  onSlidingComplete?: (values: [number, number]) => void;
  disabled?: boolean;
  trackHeight?: number;
  thumbSize?: number;
  style?: StyleProp<ViewStyle>;
}

function clamp(val: number, min: number, max: number) {
  "worklet";
  return Math.max(min, Math.min(val, max));
}

function snap(val: number, step: number, min: number, max: number) {
  "worklet";
  if (step <= 0) return clamp(val, min, max);
  const raw = Math.round((val - min) / step) * step + min;
  const stepStr = String(step);
  const dotIdx = stepStr.indexOf(".");
  const decimals = dotIdx >= 0 ? stepStr.length - dotIdx - 1 : 0;
  const rounded = decimals > 0 ? Number(raw.toFixed(decimals)) : raw;
  return clamp(rounded, min, max);
}

function normalizePair(
  pair: [number, number],
  min: number,
  max: number,
): [number, number] {
  const a = clamp(pair[0], min, max);
  const b = clamp(pair[1], min, max);
  return a <= b ? [a, b] : [b, a];
}

function RangeSliderComponent({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = [20, 80],
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
  tone = "primary",
  disabled = false,
  glass = false,
  haptic = true,
  trackHeight,
  thumbSize,
  onLayout,
  style,
  ...props
}: RangeSliderProps) {
  const { colors, components, radii, shadows } = useTheme();
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const range = safeMax - safeMin;

  const resolvedTrackHeight = trackHeight ?? components.slider.trackHeight;
  const resolvedThumbSize = thumbSize ?? components.slider.thumbSize;

  const isControlled = value !== undefined;
  const [internalValues, setInternalValues] = useState<[number, number]>(() =>
    normalizePair(defaultValue, safeMin, safeMax),
  );
  const currentValues = normalizePair(
    isControlled ? value : internalValues,
    safeMin,
    safeMax,
  );
  const valMin = currentValues[0];
  const valMax = currentValues[1];

  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);

  const minRatio = range === 0 ? 0 : (valMin - safeMin) / range;
  const maxRatio = range === 0 ? 1 : (valMax - safeMin) / range;

  const minProgress = useSharedValue(minRatio);
  const maxProgress = useSharedValue(maxRatio);
  const trackWidth = useSharedValue(0);
  const lastEmittedMin = useSharedValue(valMin);
  const lastEmittedMax = useSharedValue(valMax);
  const isInteracting = useSharedValue(false);
  const activeDragThumb = useSharedValue<"min" | "max">("min");

  useEffect(() => {
    if (isInteracting.value) return;
    minProgress.value = minRatio;
    maxProgress.value = maxRatio;
    lastEmittedMin.value = valMin;
    lastEmittedMax.value = valMax;
  }, [
    isInteracting,
    lastEmittedMax,
    lastEmittedMin,
    maxProgress,
    maxRatio,
    minProgress,
    minRatio,
    valMax,
    valMin,
  ]);

  const updateValues = useCallback(
    (newMin: number, newMax: number, phase: "start" | "move" | "end") => {
      const normalized = normalizePair([newMin, newMax], safeMin, safeMax);
      if (haptic) {
        triggerHaptic("selection");
      }
      if (!isControlled) {
        setInternalValues(normalized);
      }
      if (phase === "start") {
        onSlidingStart?.(normalized);
      }
      onValueChange?.(normalized);
      if (phase === "end") {
        onSlidingComplete?.(normalized);
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
    ],
  );

  const handleActiveThumbChange = useCallback((thumb: "min" | "max" | null) => {
    setActiveThumb(thumb);
  }, []);

  const panGesture = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-4, 4],
    failOffsetY: [-14, 14],
    hitSlop: components.slider.hitSlop,
    onActivate: (e) => {
      "worklet";
      const width = trackWidth.value;
      if (width <= 0) return;

      isInteracting.value = true;
      const usable = Math.max(1, width - resolvedThumbSize);
      const touchProgress = clamp((e.x - resolvedThumbSize / 2) / usable, 0, 1);

      const distToMin = Math.abs(touchProgress - minProgress.value);
      const distToMax = Math.abs(touchProgress - maxProgress.value);

      // Tie-break when both thumbs share exact coordinate so dragging right moves max cleanly
      let chosen: "min" | "max";
      if (Math.abs(distToMin - distToMax) < 1e-4) {
        chosen = touchProgress >= maxProgress.value ? "max" : "min";
      } else {
        chosen = distToMin < distToMax ? "min" : "max";
      }

      activeDragThumb.value = chosen;
      scheduleOnRN(handleActiveThumbChange, chosen);

      let nextMin = lastEmittedMin.value;
      let nextMax = lastEmittedMax.value;

      if (chosen === "min") {
        const clampedProg = Math.min(touchProgress, maxProgress.value);
        minProgress.value = clampedProg;
        const raw = safeMin + clampedProg * range;
        const snapped = snap(raw, step, safeMin, safeMax);
        const currentMaxVal = safeMin + maxProgress.value * range;
        const snappedMax = snap(currentMaxVal, step, safeMin, safeMax);
        nextMin = snapped;
        nextMax = Math.max(snapped, snappedMax);
      } else {
        const clampedProg = Math.max(touchProgress, minProgress.value);
        maxProgress.value = clampedProg;
        const raw = safeMin + clampedProg * range;
        const snapped = snap(raw, step, safeMin, safeMax);
        const currentMinVal = safeMin + minProgress.value * range;
        const snappedMin = snap(currentMinVal, step, safeMin, safeMax);
        nextMin = Math.min(snappedMin, snapped);
        nextMax = snapped;
      }

      lastEmittedMin.value = nextMin;
      lastEmittedMax.value = nextMax;
      scheduleOnRN(updateValues, nextMin, nextMax, "start");
    },
    onUpdate: (e) => {
      "worklet";
      const width = trackWidth.value;
      if (width <= 0) return;

      const usable = Math.max(1, width - resolvedThumbSize);
      const touchProgress = clamp((e.x - resolvedThumbSize / 2) / usable, 0, 1);

      let nextMin = minProgress.value;
      let nextMax = maxProgress.value;

      if (activeDragThumb.value === "min") {
        const clampedProg = Math.min(touchProgress, maxProgress.value);
        minProgress.value = clampedProg;
        const raw = safeMin + clampedProg * range;
        const snapped = snap(raw, step, safeMin, safeMax);
        const currentMaxVal = safeMin + maxProgress.value * range;
        const snappedMax = snap(currentMaxVal, step, safeMin, safeMax);
        nextMin = snapped;
        nextMax = Math.max(snapped, snappedMax);
      } else {
        const clampedProg = Math.max(touchProgress, minProgress.value);
        maxProgress.value = clampedProg;
        const raw = safeMin + clampedProg * range;
        const snapped = snap(raw, step, safeMin, safeMax);
        const currentMinVal = safeMin + minProgress.value * range;
        const snappedMin = snap(currentMinVal, step, safeMin, safeMax);
        nextMin = Math.min(snappedMin, snapped);
        nextMax = snapped;
      }

      if (
        nextMin !== lastEmittedMin.value ||
        nextMax !== lastEmittedMax.value
      ) {
        lastEmittedMin.value = nextMin;
        lastEmittedMax.value = nextMax;
        scheduleOnRN(updateValues, nextMin, nextMax, "move");
      }
    },
    onFinalize: () => {
      "worklet";
      isInteracting.value = false;
      scheduleOnRN(handleActiveThumbChange, null);
      if (range > 0) {
        minProgress.value = (lastEmittedMin.value - safeMin) / range;
        maxProgress.value = (lastEmittedMax.value - safeMin) / range;
      }
      scheduleOnRN(
        updateValues,
        lastEmittedMin.value,
        lastEmittedMax.value,
        "end",
      );
    },
  });

  const minThumbStyle = useAnimatedStyle(() => {
    const travel = Math.max(0, trackWidth.value - resolvedThumbSize);
    return {
      transform: [{ translateX: minProgress.value * travel }],
    };
  });

  const maxThumbStyle = useAnimatedStyle(() => {
    const travel = Math.max(0, trackWidth.value - resolvedThumbSize);
    return {
      transform: [{ translateX: maxProgress.value * travel }],
    };
  });

  const activeTrackStyle = useAnimatedStyle(() => {
    const travel = Math.max(0, trackWidth.value - resolvedThumbSize);
    const startX = minProgress.value * travel + resolvedThumbSize / 2;
    const endX = maxProgress.value * travel + resolvedThumbSize / 2;
    return {
      transform: [{ translateX: startX }],
      width: Math.max(0, endX - startX),
    };
  });

  const toneColor = resolveToneColors(tone, colors).solid;

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackWidth.value = e.nativeEvent.layout.width;
      onLayout?.(e);
    },
    [onLayout, trackWidth],
  );

  const handleThumbA11yAction = (thumb: "min" | "max") => (e: AccessibilityActionEvent) => {
    if (disabled) return;
    const a11yStep = step > 0 ? step : Math.max(1, Math.round(range / 20));
    const delta = e.nativeEvent.actionName === "increment" ? a11yStep : -a11yStep;
    if (thumb === "min") {
      const next = snap(valMin + delta, a11yStep, safeMin, valMax);
      updateValues(next, valMax, "end");
    } else {
      const next = snap(valMax + delta, a11yStep, valMin, safeMax);
      updateValues(valMin, next, "end");
    }
  };

  return (
    <View style={[styles.wrapper, style]} {...props}>
      <GestureDetector gesture={panGesture}>
        <View
          onLayout={handleLayout}
          style={[
            styles.inner,
            {
              height: Math.max(components.slider.height, resolvedThumbSize),
              opacity: disabled ? 0.45 : 1,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.track,
              {
                height: resolvedTrackHeight,
                borderRadius: radii.full,
                backgroundColor: glass
                  ? colors.glassSurface
                  : colors.backgroundSubtle,
                borderWidth: glass ? components.borderWidth.default : 0,
                borderColor: glass ? colors.glassBorder : colors.transparent,
              },
            ]}
          />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeTrack,
              {
                height: resolvedTrackHeight,
                borderRadius: radii.full,
                backgroundColor: toneColor,
              },
              activeTrackStyle,
            ]}
          />

          <Animated.View
            pointerEvents="none"
            accessibilityRole="adjustable"
            accessibilityLabel="Minimum value"
            accessibilityState={{ disabled }}
            accessibilityValue={{
              min: safeMin,
              max: valMax,
              now: valMin,
            }}
            accessibilityActions={[
              { name: "increment", label: "Increase minimum" },
              { name: "decrement", label: "Decrease minimum" },
            ]}
            onAccessibilityAction={handleThumbA11yAction("min")}
            style={[
              styles.thumb,
              shadows.md,
              {
                width: resolvedThumbSize,
                height: resolvedThumbSize,
                borderRadius: radii.full,
                backgroundColor: colors.surface,
                borderWidth: components.borderWidth.focus,
                borderColor: toneColor,
                zIndex: activeThumb === "min" ? 10 : 5,
              },
              minThumbStyle,
            ]}
          />

          <Animated.View
            pointerEvents="none"
            accessibilityRole="adjustable"
            accessibilityLabel="Maximum value"
            accessibilityState={{ disabled }}
            accessibilityValue={{
              min: valMin,
              max: safeMax,
              now: valMax,
            }}
            accessibilityActions={[
              { name: "increment", label: "Increase maximum" },
              { name: "decrement", label: "Decrease maximum" },
            ]}
            onAccessibilityAction={handleThumbA11yAction("max")}
            style={[
              styles.thumb,
              shadows.md,
              {
                width: resolvedThumbSize,
                height: resolvedThumbSize,
                borderRadius: radii.full,
                backgroundColor: colors.surface,
                borderWidth: components.borderWidth.focus,
                borderColor: toneColor,
                zIndex: activeThumb === "max" ? 10 : 5,
              },
              maxThumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

export const RangeSlider = React.memo(RangeSliderComponent);

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    paddingVertical: 10,
  },
  inner: {
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
