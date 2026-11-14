import React, { useCallback, useImperativeHandle, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  ViewStyle,
} from "react-native";
import { usePanGesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { renderIcon, type BaseHapticProps, type ComponentTone, type RenderIcon } from "./types";
import { Text } from "./Text";

export interface SwipeableAction {
  key?: string;
  label?: string;
  icon?: RenderIcon;
  tone?: ComponentTone;
  backgroundColor?: string;
  color?: string;
  isDestructive?: boolean;
  onPress?: () => void;
  closeOnPress?: boolean;
}

export interface SwipeableItemRef {
  close: () => void;
  openLeft: () => void;
  openRight: () => void;
  dismiss: (callback?: () => void) => void;
}

export interface SwipeableItemProps extends BaseHapticProps {
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

const SCREEN_WIDTH = Dimensions.get("window").width;

/**
 * High-performance SwipeableItem list row with Reanimated spring physics, collapse animation, & haptics
 */
export const SwipeableItem = React.forwardRef<SwipeableItemRef, SwipeableItemProps>(
  (
    {
      children,
      leftActions = [],
      rightActions = [],
      actionWidth = 75,
      fullSwipeThreshold = SCREEN_WIDTH * 0.42,
      onFullSwipeLeft,
      onFullSwipeRight,
      haptic = true,
      disabled = false,
      style,
      containerStyle,
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const itemHeight = useSharedValue<number | null>(null);
    const itemOpacity = useSharedValue(1);
    const hasTriggeredThresholdHaptic = useSharedValue(false);
    const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);

    const maxLeftDrag = leftActions.length * actionWidth;
    const maxRightDrag = -(rightActions.length * actionWidth);

    const close = useCallback(() => {
      translateX.value = withSpring(0, {
        duration: 300,
        dampingRatio: 1,
        overshootClamping: true,
      });
    }, [translateX]);

    const openLeft = useCallback(() => {
      if (maxLeftDrag > 0) {
        translateX.value = withSpring(maxLeftDrag, {
          duration: 300,
          dampingRatio: 1,
          overshootClamping: true,
        });
      }
    }, [maxLeftDrag, translateX]);

    const openRight = useCallback(() => {
      if (maxRightDrag < 0) {
        translateX.value = withSpring(maxRightDrag, {
          duration: 300,
          dampingRatio: 1,
          overshootClamping: true,
        });
      }
    }, [maxRightDrag, translateX]);

    const fireHaptic = useCallback(() => {
      if (haptic) {
        triggerHaptic("selection");
      }
    }, [haptic]);

    const fireMediumHaptic = useCallback(() => {
      if (haptic) {
        triggerHaptic("medium");
      }
    }, [haptic]);

    const performDeleteCollapse = useCallback(
      (callback?: () => void) => {
        if (haptic) triggerHaptic("medium");
        translateX.value = withTiming(-SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        });
        itemOpacity.value = withTiming(0, {
          duration: 180,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        });
        itemHeight.value = withTiming(
          0,
          {
            duration: 240,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          },
          (finished) => {
            if (finished && callback) {
              scheduleOnRN(callback);
            }
          },
        );
      },
      [haptic, itemHeight, itemOpacity, translateX],
    );

    useImperativeHandle(ref, () => ({
      close,
      openLeft,
      openRight,
      dismiss: (callback?: () => void) => {
        performDeleteCollapse(callback);
      },
    }));

    const panGesture = usePanGesture({
      enabled: !disabled,
      activeOffsetX: [-10, 10],
      failOffsetY: [-12, 12],
      onActivate: () => {
        "worklet";
        startX.value = translateX.value;
        hasTriggeredThresholdHaptic.value = false;
      },
      onUpdate: (event) => {
        "worklet";
        let nextX = startX.value + event.translationX;

        if (nextX > maxLeftDrag && !onFullSwipeRight) {
          nextX = maxLeftDrag + (nextX - maxLeftDrag) * 0.22;
        } else if (nextX < maxRightDrag && !onFullSwipeLeft) {
          nextX = maxRightDrag + (nextX - maxRightDrag) * 0.22;
        }

        if (
          (nextX > fullSwipeThreshold && onFullSwipeRight) ||
          (nextX < -fullSwipeThreshold && onFullSwipeLeft)
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
      onDeactivate: (event) => {
        "worklet";
        if (event.canceled) {
          translateX.value = withSpring(0, {
            duration: 300,
            dampingRatio: 1,
            overshootClamping: true,
          });
          return;
        }

        const currentX = translateX.value;
        const velocityX = event.velocityX;

        // Full swipe right trigger
        if (
          (currentX > fullSwipeThreshold || (currentX > maxLeftDrag && velocityX > 800)) &&
          onFullSwipeRight
        ) {
          if (haptic) scheduleOnRN(fireMediumHaptic);
          translateX.value = withTiming(
            SCREEN_WIDTH,
            { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) },
            (finished) => {
              if (finished && onFullSwipeRight) {
                scheduleOnRN(onFullSwipeRight);
              }
            },
          );
          return;
        }

        // Full swipe left auto delete collapse
        if (
          (currentX < -fullSwipeThreshold || (currentX < maxRightDrag && velocityX < -800)) &&
          onFullSwipeLeft
        ) {
          scheduleOnRN(performDeleteCollapse, onFullSwipeLeft);
          return;
        }

        // Snap to open Left actions
        if (currentX > maxLeftDrag * 0.45 && maxLeftDrag > 0) {
          if (haptic) scheduleOnRN(fireHaptic);
          translateX.value = withSpring(maxLeftDrag, {
            duration: 300,
            dampingRatio: 1,
            overshootClamping: true,
          });
          return;
        }

        // Snap to open Right actions
        if (currentX < maxRightDrag * 0.45 && maxRightDrag < 0) {
          if (haptic) scheduleOnRN(fireHaptic);
          translateX.value = withSpring(maxRightDrag, {
            duration: 300,
            dampingRatio: 1,
            overshootClamping: true,
          });
          return;
        }

        // Otherwise snap closed
        translateX.value = withSpring(0, {
          duration: 300,
          dampingRatio: 1,
          overshootClamping: true,
        });
      },
    });

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

    const getActionToneColor = (tone?: ComponentTone) => {
      if (tone === "danger") return colors.danger;
      if (tone === "success") return colors.success;
      if (tone === "warning") return colors.warning;
      if (tone === "accent") return colors.accent;
      if (tone === "secondary") return colors.surfaceRaised;
      return colors.primary;
    };

    const handleLayout = (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (measuredHeight === null && h > 0) {
        setMeasuredHeight(h);
        itemHeight.value = h;
      }
    };

    return (
      <Animated.View
        onLayout={handleLayout}
        style={[
          {
            position: "relative",
            overflow: "hidden",
          },
          outerAnimatedStyle,
          containerStyle,
        ]}
      >
        {/* Left Actions Underlay */}
        {leftActions.length > 0 && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                flexDirection: "row",
                zIndex: 0,
              },
              leftContainerStyle,
            ]}
          >
            {leftActions.map((action, idx) => {
              const bg = action.backgroundColor ?? getActionToneColor(action.tone);
              const fg = action.color ?? colors.onPrimary ?? colors.textInverse;
              const isDestructive = action.isDestructive ?? action.tone === "danger";

              return (
                <Pressable
                  key={action.key ?? `left-action-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => {
                    if (haptic) triggerHaptic("selection");
                    if (isDestructive) {
                      performDeleteCollapse(action.onPress);
                    } else {
                      action.onPress?.();
                      if (action.closeOnPress !== false) {
                        translateX.value = withTiming(0, {
                          duration: 180,
                          easing: Easing.bezier(0.23, 1, 0.32, 1),
                        });
                      }
                    }
                  }}
                  style={{
                    width: actionWidth,
                    backgroundColor: bg,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    gap: 4,
                  }}
                >
                  {action.icon && renderIcon(action.icon, fg, 20)}
                  {action.label && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: fg,
                        textAlign: "center",
                      }}
                    >
                      {action.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {/* Right Actions Underlay */}
        {rightActions.length > 0 && (
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                bottom: 0,
                right: 0,
                flexDirection: "row",
                zIndex: 0,
              },
              rightContainerStyle,
            ]}
          >
            {rightActions.map((action, idx) => {
              const bg = action.backgroundColor ?? getActionToneColor(action.tone ?? "danger");
              const fg = action.color ?? colors.onPrimary ?? colors.textInverse;
              const isDestructive = action.isDestructive ?? (action.tone === "danger" || action.label?.toLowerCase().includes("delete"));

              return (
                <Pressable
                  key={action.key ?? `right-action-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  onPress={() => {
                    if (haptic) triggerHaptic("selection");
                    if (isDestructive) {
                      performDeleteCollapse(action.onPress);
                    } else {
                      action.onPress?.();
                      if (action.closeOnPress !== false) {
                        translateX.value = withTiming(0, {
                          duration: 180,
                          easing: Easing.bezier(0.23, 1, 0.32, 1),
                        });
                      }
                    }
                  }}
                  style={{
                    width: actionWidth,
                    backgroundColor: bg,
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    gap: 4,
                  }}
                >
                  {action.icon && renderIcon(action.icon, fg, 20)}
                  {action.label && (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: fg,
                        textAlign: "center",
                      }}
                    >
                      {action.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        )}

        {/* Swiping Foreground Content */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              {
                backgroundColor: colors.surface,
                zIndex: 2,
              },
              rowAnimatedStyle,
              style,
            ]}
          >
            {children}
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    );
  },
);

SwipeableItem.displayName = "SwipeableItem";

export const SwipeableRow = SwipeableItem;
