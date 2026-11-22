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
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  renderIcon,
  resolveToneColors,
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
  onFullSwipeLeft?: () => void;
  onFullSwipeRight?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

const SWIPE_EASING = Easing.bezier(...ANIMATION_TIMING.bezier);

export const SwipeableItem = React.forwardRef<
  SwipeableItemRef,
  SwipeableItemProps
>(function SwipeableItem(
  {
    children,
    leftActions = [],
    rightActions = [],
    actionWidth = 75,
    fullSwipeThreshold,
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
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const snapDuration = shouldAnimate ? ANIMATION_TIMING.transition : 0;
  const { width: windowWidth } = useWindowDimensions();

  const resolvedThreshold = fullSwipeThreshold ?? windowWidth * 0.42;

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const itemHeight = useSharedValue<number | null>(null);
  const itemOpacity = useSharedValue(1);
  const hasTriggeredThresholdHaptic = useSharedValue(false);
  const isCollapsingRef = useRef(false);
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

  const maxLeftDrag = leftActions.length * actionWidth;
  const maxRightDrag = -(rightActions.length * actionWidth);

  const animateTranslateX = useCallback(
    (toValue: number) => {
      if (snapDuration <= 0) {
        translateX.value = toValue;
        return;
      }
      translateX.value = withTiming(toValue, {
        duration: snapDuration,
        easing: SWIPE_EASING,
      });
    },
    [snapDuration, translateX],
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
    translateX.value = 0;
    itemOpacity.value = 1;
    itemHeight.value = measuredHeight;
  }, [itemHeight, itemOpacity, measuredHeight, translateX]);

  const fireHaptic = useCallback(() => {
    if (haptic) triggerHaptic("selection");
  }, [haptic]);

  const fireMediumHaptic = useCallback(() => {
    if (haptic) triggerHaptic("medium");
  }, [haptic]);

  const performCollapse = useCallback(
    (exitToX: number, callback?: () => void) => {
      isCollapsingRef.current = true;
      if (haptic) triggerHaptic("medium");

      if (!shouldAnimate) {
        translateX.value = exitToX;
        itemOpacity.value = 0;
        itemHeight.value = 0;
        callback?.();
        return;
      }

      translateX.value = withTiming(exitToX, {
        duration: 180,
        easing: SWIPE_EASING,
      });
      itemOpacity.value = withTiming(0, {
        duration: 160,
        easing: SWIPE_EASING,
      });
      itemHeight.value = withTiming(
        0,
        {
          duration: 210,
          easing: SWIPE_EASING,
        },
        (finished) => {
          if (finished && callback) {
            scheduleOnRN(callback);
          }
        },
      );
    },
    [haptic, itemHeight, itemOpacity, shouldAnimate, translateX],
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
        startX.value = translateX.value;
        hasTriggeredThresholdHaptic.value = false;
      },
      onUpdate: (event: { translationX: number }) => {
        "worklet";
        let nextX = startX.value + event.translationX;

        if (!allowRightSwipe && nextX > 0) nextX = 0;
        if (!allowLeftSwipe && nextX < 0) nextX = 0;

        if (nextX > maxLeftDrag && !onFullSwipeRight) {
          nextX = maxLeftDrag + (nextX - maxLeftDrag) * 0.22;
        } else if (nextX < maxRightDrag && !onFullSwipeLeft) {
          nextX = maxRightDrag + (nextX - maxRightDrag) * 0.22;
        }

        if (
          (nextX > resolvedThreshold && onFullSwipeRight) ||
          (nextX < -resolvedThreshold && onFullSwipeLeft)
        ) {
          if (!hasTriggeredThresholdHaptic.value) {
            hasTriggeredThresholdHaptic.value = true;
            if (haptic) {
              scheduleOnRN(fireHaptic);
            }
          }
        }

        translateX.value = nextX;
      },
      onDeactivate: (event: { canceled: boolean; velocityX: number }) => {
        "worklet";
        if (event.canceled) {
          translateX.value =
            snapDuration > 0
              ? withTiming(0, { duration: snapDuration, easing: SWIPE_EASING })
              : 0;
          return;
        }

        const currentX = translateX.value;
        const velocityX = event.velocityX;

        if (
          onFullSwipeRight &&
          (currentX > resolvedThreshold ||
            (maxLeftDrag > 0 && currentX > maxLeftDrag && velocityX > 800))
        ) {
          if (haptic) scheduleOnRN(fireMediumHaptic);
          scheduleOnRN(performCollapse, windowWidth, onFullSwipeRight);
          return;
        }

        if (
          onFullSwipeLeft &&
          (currentX < -resolvedThreshold ||
            (maxRightDrag < 0 && currentX < maxRightDrag && velocityX < -800))
        ) {
          if (haptic) scheduleOnRN(fireMediumHaptic);
          scheduleOnRN(performCollapse, -windowWidth, onFullSwipeLeft);
          return;
        }

        if (maxLeftDrag > 0 && currentX > maxLeftDrag * 0.45) {
          if (haptic) scheduleOnRN(fireHaptic);
          translateX.value =
            snapDuration > 0
              ? withTiming(maxLeftDrag, {
                  duration: snapDuration,
                  easing: SWIPE_EASING,
                })
              : maxLeftDrag;
          return;
        }

        if (maxRightDrag < 0 && currentX < maxRightDrag * 0.45) {
          if (haptic) scheduleOnRN(fireHaptic);
          translateX.value =
            snapDuration > 0
              ? withTiming(maxRightDrag, {
                  duration: snapDuration,
                  easing: SWIPE_EASING,
                })
              : maxRightDrag;
          return;
        }

        translateX.value =
          snapDuration > 0
            ? withTiming(0, { duration: snapDuration, easing: SWIPE_EASING })
            : 0;
      },
    }),
    [
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
      snapDuration,
      startX,
      translateX,
      windowWidth,
    ],
  );

  const panGesture = usePanGesture(panConfig);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const outerAnimatedStyle = useAnimatedStyle(() => {
    if (itemHeight.value === null) {
      return { opacity: itemOpacity.value };
    }
    return {
      height: itemHeight.value,
      opacity: itemOpacity.value,
      marginBottom: itemHeight.value === 0 ? 0 : undefined,
    };
  });

  const leftContainerStyle = useAnimatedStyle(() => {
    const isVisible = translateX.value > 0;
    const opacity = interpolate(translateX.value, [0, 20], [0, 1], "clamp");
    return {
      opacity: isVisible ? opacity : 0,
      pointerEvents: isVisible ? "auto" : "none",
    };
  });

  const rightContainerStyle = useAnimatedStyle(() => {
    const isVisible = translateX.value < 0;
    const opacity = interpolate(translateX.value, [-20, 0], [1, 0], "clamp");
    return {
      opacity: isVisible ? opacity : 0,
      pointerEvents: isVisible ? "auto" : "none",
    };
  });

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (isCollapsingRef.current) return;
      const h = e.nativeEvent.layout.height;
      if (h > 0 && h !== measuredHeight) {
        setMeasuredHeight(h);
        itemHeight.value = h;
      }
    },
    [itemHeight, measuredHeight],
  );

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

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[styles.outer, outerAnimatedStyle, containerStyle]}
    >
      {leftActions.length > 0 ? (
        <Animated.View style={[styles.leftUnderlay, leftContainerStyle]}>
          {renderActions(leftActions, false)}
        </Animated.View>
      ) : null}

      {rightActions.length > 0 ? (
        <Animated.View style={[styles.rightUnderlay, rightContainerStyle]}>
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
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
    zIndex: 0,
  },
  rightUnderlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: "row",
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
