import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  renderIcon,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseHapticProps,
  type ComponentTone,
  type RenderIcon,
} from "./types";

export interface SwipeableAction {
  key?: string;
  label?: string;
  icon?: RenderIcon;
  tone?: ComponentTone;
  backgroundColor?: string;
  color?: string;
  isDestructive?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  closeOnPress?: boolean;
}

export interface SwipeableItemRef {
  close: () => void;
  openLeft: () => void;
  openRight: () => void;
  dismiss: (callback?: () => void) => void;
  reset: () => void;
}

export interface SwipeableItemProps extends BaseAnimatedProps, BaseHapticProps {
  children: React.ReactNode;
  leftActions?: SwipeableAction[];
  rightActions?: SwipeableAction[];
  actionWidth?: number;
  fullSwipeThreshold?: number;
  /** Optional bottom margin between list items that smoothly collapses alongside the row height on dismiss. */
  itemGap?: number;
  onFullSwipeLeft?: () => void;
  onFullSwipeRight?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

const SWIPE_EASING = Easing.bezier(0.23, 1, 0.32, 1);

function projectMomentum(velocity: number, decelerationRate = 0.996): number {
  "worklet";
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function rubberbandDrag(
  overshoot: number,
  dimension: number,
  constant = 0.5,
): number {
  "worklet";
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

export const SwipeableItem = React.forwardRef<
  SwipeableItemRef,
  SwipeableItemProps
>(function SwipeableItem(
  {
    children,
    leftActions = [],
    rightActions = [],
    actionWidth = 76,
    fullSwipeThreshold,
    itemGap = 0,
    onFullSwipeLeft,
    onFullSwipeRight,
    animated = true,
    haptic = true,
    disabled = false,
    style,
    containerStyle,
  },
  ref,
) {
  const { colors, components, radii } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const { width: windowWidth } = useWindowDimensions();

  const resolvedThreshold = fullSwipeThreshold ?? Math.min(180, windowWidth * 0.42);
  const maxLeftDrag = leftActions.length * actionWidth;
  const maxRightDrag = -(rightActions.length * actionWidth);

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const collapsingHeight = useSharedValue(0);
  const isCollapsing = useSharedValue(0);
  const collapseProgress = useSharedValue(1);
  const hasTriggeredThresholdHaptic = useSharedValue(false);
  const isCollapsingRef = useRef(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  React.useEffect(() => {
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(collapseProgress);
    };
  }, [collapseProgress, translateX]);

  const animateTranslateX = useCallback(
    (toValue: number) => {
      if (!shouldAnimate) {
        translateX.value = toValue;
        return;
      }
      translateX.value = withTiming(toValue, {
        duration: 210,
        easing: SWIPE_EASING,
      });
    },
    [shouldAnimate, translateX],
  );

  const close = useCallback(() => {
    animateTranslateX(0);
  }, [animateTranslateX]);

  const openLeft = useCallback(() => {
    if (maxLeftDrag > 0) {
      animateTranslateX(maxLeftDrag);
    }
  }, [animateTranslateX, maxLeftDrag]);

  const openRight = useCallback(() => {
    if (maxRightDrag < 0) {
      animateTranslateX(maxRightDrag);
    }
  }, [animateTranslateX, maxRightDrag]);

  const reset = useCallback(() => {
    isCollapsingRef.current = false;
    cancelAnimation(translateX);
    cancelAnimation(collapseProgress);
    isCollapsing.value = 0;
    translateX.value = 0;
    collapseProgress.value = 1;
    if (measuredHeight && measuredHeight > 0) {
      collapsingHeight.value = measuredHeight;
    }
  }, [collapseProgress, collapsingHeight, isCollapsing, measuredHeight, translateX]);

  const fireHaptic = useCallback(() => {
    if (haptic) triggerHaptic("selection");
  }, [haptic]);

  const fireMediumHaptic = useCallback(() => {
    if (haptic) triggerHaptic("medium");
  }, [haptic]);

  const performCollapse = useCallback(
    (exitToX: number, callback?: () => void) => {
      if (isCollapsingRef.current) return;
      isCollapsingRef.current = true;
      if (haptic) triggerHaptic("medium");

      if (!shouldAnimate) {
        isCollapsing.value = 1;
        translateX.value = exitToX;
        collapseProgress.value = 0;
        callback?.();
        return;
      }

      if (measuredHeight && measuredHeight > 0) {
        collapsingHeight.value = measuredHeight;
      }
      isCollapsing.value = 1;

      translateX.value = withTiming(exitToX, {
        duration: 170,
        easing: SWIPE_EASING,
      });
      collapseProgress.value = withDelay(
        90,
        withTiming(
          0,
          {
            duration: 190,
            easing: SWIPE_EASING,
          },
          (finished) => {
            if (finished && callback) {
              scheduleOnRN(callback);
            }
          },
        ),
      );
    },
    [
      collapseProgress,
      collapsingHeight,
      haptic,
      isCollapsing,
      measuredHeight,
      shouldAnimate,
      translateX,
    ],
  );

  useImperativeHandle(
    ref,
    () => ({
      close,
      openLeft,
      openRight,
      dismiss: (callback?: () => void) => {
        performCollapse(-windowWidth, callback);
      },
      reset,
    }),
    [close, openLeft, openRight, performCollapse, reset, windowWidth],
  );

  const allowRightSwipe = maxLeftDrag > 0 || Boolean(onFullSwipeRight);
  const allowLeftSwipe = maxRightDrag < 0 || Boolean(onFullSwipeLeft);

  const panConfig = useMemo(
    () => ({
      enabled: !disabled && (allowRightSwipe || allowLeftSwipe),
      activeOffsetX: [-10, 10] as [number, number],
      failOffsetY: [-12, 12] as [number, number],
      onActivate: () => {
        "worklet";
        cancelAnimation(translateX);
        startX.value = translateX.value;
        hasTriggeredThresholdHaptic.value = false;
      },
      onUpdate: (event: { translationX: number }) => {
        "worklet";
        let nextX = startX.value + event.translationX;

        if (!allowRightSwipe && nextX > 0) {
          nextX = rubberbandDrag(nextX, Math.max(80, actionWidth), 0.35);
        }
        if (!allowLeftSwipe && nextX < 0) {
          nextX = rubberbandDrag(nextX, Math.max(80, actionWidth), 0.35);
        }

        if (nextX > maxLeftDrag && !onFullSwipeRight) {
          const overshoot = nextX - maxLeftDrag;
          nextX =
            maxLeftDrag +
            rubberbandDrag(overshoot, Math.max(100, windowWidth * 0.35));
        } else if (nextX < maxRightDrag && !onFullSwipeLeft) {
          const overshoot = nextX - maxRightDrag;
          nextX =
            maxRightDrag +
            rubberbandDrag(overshoot, Math.max(100, windowWidth * 0.35));
        }

        const crossedRight = Boolean(onFullSwipeRight) && nextX > resolvedThreshold;
        const crossedLeft = Boolean(onFullSwipeLeft) && nextX < -resolvedThreshold;
        if (crossedRight || crossedLeft) {
          if (!hasTriggeredThresholdHaptic.value) {
            hasTriggeredThresholdHaptic.value = true;
            if (haptic) scheduleOnRN(fireHaptic);
          }
        } else if (hasTriggeredThresholdHaptic.value) {
          hasTriggeredThresholdHaptic.value = false;
        }

        translateX.value = nextX;
      },
      onDeactivate: (event: { canceled: boolean; velocityX: number }) => {
        "worklet";
        if (event.canceled) {
          translateX.value = shouldAnimate
            ? withTiming(0, { duration: 200, easing: SWIPE_EASING })
            : 0;
          return;
        }

        const currentX = translateX.value;
        const velocityX = event.velocityX;
        const projectedX = currentX + projectMomentum(velocityX);

        if (
          onFullSwipeRight &&
          (currentX > resolvedThreshold ||
            (projectedX > resolvedThreshold && velocityX > 350))
        ) {
          if (haptic) scheduleOnRN(fireMediumHaptic);
          scheduleOnRN(performCollapse, windowWidth, onFullSwipeRight);
          return;
        }

        if (
          onFullSwipeLeft &&
          (currentX < -resolvedThreshold ||
            (projectedX < -resolvedThreshold && velocityX < -350))
        ) {
          if (haptic) scheduleOnRN(fireMediumHaptic);
          scheduleOnRN(performCollapse, -windowWidth, onFullSwipeLeft);
          return;
        }

        if (
          maxLeftDrag > 0 &&
          (currentX > maxLeftDrag * 0.45 ||
            (currentX > 16 && projectedX > maxLeftDrag * 0.6 && velocityX > 250))
        ) {
          if (haptic) scheduleOnRN(fireHaptic);
          translateX.value = shouldAnimate
            ? withTiming(maxLeftDrag, { duration: 200, easing: SWIPE_EASING })
            : maxLeftDrag;
          return;
        }

        if (
          maxRightDrag < 0 &&
          (currentX < maxRightDrag * 0.45 ||
            (currentX < -16 && projectedX < maxRightDrag * 0.6 && velocityX < -250))
        ) {
          if (haptic) scheduleOnRN(fireHaptic);
          translateX.value = shouldAnimate
            ? withTiming(maxRightDrag, { duration: 200, easing: SWIPE_EASING })
            : maxRightDrag;
          return;
        }

        translateX.value = shouldAnimate
          ? withTiming(0, { duration: 200, easing: SWIPE_EASING })
          : 0;
      },
    }),
    [
      actionWidth,
      allowLeftSwipe,
      allowRightSwipe,
      disabled,
      fireHaptic,
      fireMediumHaptic,
      haptic,
      hasTriggeredThresholdHaptic,
      maxLeftDrag,
      maxRightDrag,
      onFullSwipeLeft,
      onFullSwipeRight,
      performCollapse,
      resolvedThreshold,
      shouldAnimate,
      startX,
      translateX,
      windowWidth,
    ],
  );

  const panGesture = usePanGesture(panConfig);

  const rowAnimatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: translateX.value }],
    }),
    webDeps([]),
  );

  const outerAnimatedStyle = useAnimatedStyle(() => {
    const p = collapseProgress.value;
    const baseOpacity = interpolate(
      p,
      [0, 0.55, 1],
      [0, 0.45, 1],
      Extrapolation.CLAMP,
    );
    if (isCollapsing.value === 1 && collapsingHeight.value > 0) {
      return {
        height: collapsingHeight.value * p,
        marginBottom: itemGap * p,
        opacity: baseOpacity,
      };
    }
    return {
      marginBottom: itemGap,
      opacity: isCollapsing.value === 1 ? baseOpacity : 1,
    };
  }, webDeps([itemGap]));

  const leftContainerStyle = useAnimatedStyle(
    () => ({
      opacity:
        translateX.value > 0
          ? interpolate(translateX.value, [0, 18], [0, 1], Extrapolation.CLAMP)
          : 0,
    }),
    webDeps([]),
  );

  const rightContainerStyle = useAnimatedStyle(
    () => ({
      opacity:
        translateX.value < 0
          ? interpolate(translateX.value, [-18, 0], [1, 0], Extrapolation.CLAMP)
          : 0,
    }),
    webDeps([]),
  );

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (isCollapsingRef.current) return;
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== measuredHeight) {
        setMeasuredHeight(h);
        collapsingHeight.value = h;
      }
    },
    [collapsingHeight, measuredHeight],
  );

  const resolveActionBg = (action: SwipeableAction, isRightSide: boolean) => {
    const toneColors = resolveToneColors(
      action.tone ?? (isRightSide ? "danger" : "primary"),
      colors,
    );
    return action.backgroundColor ?? toneColors.solid;
  };

  const leftOverflowBg =
    leftActions.length > 0
      ? resolveActionBg(leftActions[0]!, false)
      : colors.primary;
  const rightOverflowBg =
    rightActions.length > 0
      ? resolveActionBg(rightActions[rightActions.length - 1]!, true)
      : colors.danger;

  const renderActions = (actions: SwipeableAction[], isRightSide: boolean) =>
    actions.map((action, idx) => {
      const toneColors = resolveToneColors(
        action.tone ?? (isRightSide ? "danger" : "primary"),
        colors,
      );
      const bg = action.backgroundColor ?? toneColors.solid;
      const fg = action.color ?? toneColors.on;
      const destructive =
        action.isDestructive ??
        action.destructive ??
        action.tone === "danger";

      return (
        <Pressable
          key={action.key ?? `${isRightSide ? "right" : "left"}-${idx}`}
          accessibilityRole="button"
          accessibilityLabel={action.label ?? `Action ${idx + 1}`}
          onPress={() => {
            if (haptic) triggerHaptic("selection");
            if (destructive) {
              performCollapse(
                isRightSide ? -windowWidth : windowWidth,
                action.onPress,
              );
            } else {
              action.onPress?.();
              if (action.closeOnPress !== false) {
                animateTranslateX(0);
              }
            }
          }}
          style={({ pressed }) => [
            styles.actionButton,
            {
              width: actionWidth,
              backgroundColor: bg,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {action.icon ? renderIcon(action.icon, fg, 20) : null}
          {action.label ? (
            <Text style={[styles.actionLabel, { color: fg }]}>
              {action.label}
            </Text>
          ) : null}
        </Pressable>
      );
    });

  const themeBorderWidth = components.borderWidth.default;
  const themeBorderColor =
    themeBorderWidth > 0 ? colors.border : "transparent";

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[
        styles.outer,
        {
          borderRadius: radii.lg,
          borderCurve: "continuous",
          borderWidth: themeBorderWidth,
          borderColor: themeBorderColor,
        },
        outerAnimatedStyle,
        containerStyle,
      ]}
    >
      {leftActions.length > 0 ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.leftUnderlay,
            leftContainerStyle,
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: leftOverflowBg },
            ]}
          />
          {renderActions(leftActions, false)}
        </Animated.View>
      ) : null}

      {rightActions.length > 0 ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.rightUnderlay,
            rightContainerStyle,
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: rightOverflowBg },
            ]}
          />
          {renderActions(rightActions, true)}
        </Animated.View>
      ) : null}

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.foreground,
            { backgroundColor: colors.surface },
            rowAnimatedStyle,
            style,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

SwipeableItem.displayName = "SwipeableItem";

export const SwipeableRow = SwipeableItem;

const styles = StyleSheet.create({
  outer: {
    position: "relative",
    overflow: "hidden",
  },
  leftUnderlay: {
    flexDirection: "row",
    justifyContent: "flex-start",
    zIndex: 0,
  },
  rightUnderlay: {
    flexDirection: "row",
    justifyContent: "flex-end",
    zIndex: 0,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  foreground: {
    zIndex: 2,
  },
});
