import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Dimensions,
  GestureResponderEvent,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import type { BaseAnimatedProps, BaseGlassProps, BaseHapticProps } from "./types";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export type TooltipPlacement = "top" | "bottom" | "left" | "right" | "auto";
export type TooltipTone =
  | "default"
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "dark"
  | "light";

export interface TooltipProps
  extends BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  content: ReactNode;
  position?: TooltipPlacement;
  triggerMode?: "longPress" | "press";
  autoFlip?: boolean;
  tone?: TooltipTone;
  arrow?: boolean;
  delay?: number;
  duration?: number;
  delayLongPress?: number;
  dismissOnPressOut?: boolean;
  visible?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: ReactElement;
}

interface TargetMeasurements {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Anchored micro-interaction tooltip balloon with directional arrow and touch-outside dismissal.
 */
export function Tooltip({
  content,
  position = "top",
  triggerMode = "longPress",
  autoFlip = true,
  tone = "default",
  arrow = true,
  delay = 0,
  duration,
  delayLongPress = 250,
  dismissOnPressOut = false,
  visible,
  onOpenChange,
  haptic = true,
  animated = true,
  glass = false,
  style,
  contentStyle,
  textStyle,
  children,
}: TooltipProps) {
  const { colors, radii, isDark } = useTheme();
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);

  const [internalVisible, setInternalVisible] = useState(false);
  const [targetCoords, setTargetCoords] = useState<TargetMeasurements | null>(null);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const isVisible = visible !== undefined ? visible : internalVisible;

  const anim = useSharedValue(0);

  const setOpen = useCallback(
    (next: boolean) => {
      if (haptic && next) {
        triggerHaptic("light");
      }
      if (visible === undefined) {
        setInternalVisible(next);
      }
      onOpenChange?.(next);
    },
    [haptic, onOpenChange, visible]
  );

  const measureAndShow = useCallback(() => {
    if (!triggerRef.current) return;

    triggerRef.current.measureInWindow(
      (x: number, y: number, width: number, height: number) => {
        if (width > 0 && height > 0) {
          setTargetCoords({ x, y, width, height });
          setOpen(true);
        } else {
          // Fallback to measure if measureInWindow returned 0
          triggerRef.current?.measure(
            (_x: number, _y: number, mWidth: number, mHeight: number, pageX: number, pageY: number) => {
              if (mWidth > 0 && mHeight > 0) {
                setTargetCoords({
                  x: pageX ?? 0,
                  y: pageY ?? 0,
                  width: mWidth,
                  height: mHeight,
                });
                setOpen(true);
              }
            }
          );
        }
      }
    );
  }, [setOpen]);

  const childProps = (
    React.isValidElement(children) ? children.props : {}
  ) as {
    onPress?: (e: GestureResponderEvent) => void;
    onLongPress?: (e: GestureResponderEvent) => void;
    onPressIn?: (e: GestureResponderEvent) => void;
    onPressOut?: (e: GestureResponderEvent) => void;
    delayLongPress?: number;
  };

  const handleTriggerPress = useCallback(
    (e: GestureResponderEvent) => {
      if (triggerMode === "press") {
        if (delay > 0) {
          setTimeout(measureAndShow, delay);
        } else {
          measureAndShow();
        }
      }
      childProps.onPress?.(e);
    },
    [childProps, delay, measureAndShow, triggerMode]
  );

  const handleTriggerLongPress = useCallback(
    (e: GestureResponderEvent) => {
      if (triggerMode === "longPress") {
        if (delay > 0) {
          setTimeout(measureAndShow, delay);
        } else {
          measureAndShow();
        }
      }
      childProps.onLongPress?.(e);
    },
    [childProps, delay, measureAndShow, triggerMode]
  );

  const handleTriggerPressOut = useCallback(
    (e: GestureResponderEvent) => {
      if (dismissOnPressOut && triggerMode === "longPress") {
        setOpen(false);
      }
      childProps.onPressOut?.(e);
    },
    [childProps, dismissOnPressOut, setOpen, triggerMode]
  );

  useEffect(() => {
    if (isVisible) {
      if (animated) {
        anim.set(
          withTiming(1, {
            duration: 180,
            easing: EASE_OUT,
          })
        );
      } else {
        anim.set(1);
      }

      if (duration && duration > 0) {
        const timer = setTimeout(() => {
          setOpen(false);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      anim.set(0);
    }
    return undefined;
  }, [animated, anim, duration, isVisible, setOpen]);

  const isMeasured = contentSize.width > 0 && contentSize.height > 0;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: isMeasured ? anim.get() : 0,
    transform: [{ scale: 0.94 + anim.get() * 0.06 }],
  }));

  // Resolve background and text colors based on tone
  const backgroundColor =
    tone === "primary"
      ? colors.primary
      : tone === "secondary"
      ? colors.secondary
      : tone === "accent"
      ? colors.accent
      : tone === "success"
      ? colors.success
      : tone === "warning"
      ? colors.warning
      : tone === "danger"
      ? colors.danger
      : tone === "info"
      ? colors.info
      : tone === "dark"
      ? isDark
        ? colors.surfaceRaised
        : "#1E293B"
      : tone === "light"
      ? isDark
        ? "#F8FAFC"
        : colors.surface
      : isDark
      ? colors.surfaceRaised
      : "#0F172A";

  const textColor =
    tone === "primary"
      ? colors.onPrimary
      : tone === "light"
      ? "#0F172A"
      : tone === "warning"
      ? colors.background
      : "#FFFFFF";

  const windowDim = Dimensions.get("window");
  const statusBarOffset =
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
  const arrowSize = 8;
  const screenPadding = 12;
  const targetGap = 4;

  // Calculate position coordinates and smart collision flip
  let resolvedPosition = position;
  let top = 0;
  let left = 0;
  let arrowOffset: StyleProp<ViewStyle> = {};

  if (targetCoords) {
    const { x: rawX, y: rawY, width: tWidth, height: tHeight } = targetCoords;
    const { width: cWidth, height: cHeight } = contentSize;

    // Adjust Y coordinate on Android for statusBarTranslucent Modal
    const x = rawX;
    const y = rawY + statusBarOffset;

    const spaceAbove = y - screenPadding;
    const spaceBelow = windowDim.height - (y + tHeight) - screenPadding;
    const spaceLeft = x - screenPadding;
    const spaceRight = windowDim.width - (x + tWidth) - screenPadding;

    const neededHeight = cHeight + arrowSize + targetGap;
    const neededWidth = cWidth + arrowSize + targetGap;

    // Smart auto-flip when constrained by viewport boundaries
    if (autoFlip) {
      if (position === "auto") {
        if (spaceAbove >= neededHeight && spaceAbove >= spaceBelow) {
          resolvedPosition = "top";
        } else if (spaceBelow >= neededHeight) {
          resolvedPosition = "bottom";
        } else if (spaceRight >= neededWidth) {
          resolvedPosition = "right";
        } else {
          resolvedPosition = "left";
        }
      } else if (position === "top" && spaceAbove < neededHeight && spaceBelow >= neededHeight) {
        resolvedPosition = "bottom";
      } else if (position === "bottom" && spaceBelow < neededHeight && spaceAbove >= neededHeight) {
        resolvedPosition = "top";
      } else if (position === "left" && spaceLeft < neededWidth && spaceRight >= neededWidth) {
        resolvedPosition = "right";
      } else if (position === "right" && spaceRight < neededWidth && spaceLeft >= neededWidth) {
        resolvedPosition = "left";
      }
    }

    // Compute coordinates based on resolved direction
    if (resolvedPosition === "top") {
      top = y - cHeight - arrowSize - targetGap;
      left = x + tWidth / 2 - cWidth / 2;
    } else if (resolvedPosition === "bottom") {
      top = y + tHeight + arrowSize + targetGap;
      left = x + tWidth / 2 - cWidth / 2;
    } else if (resolvedPosition === "left") {
      top = y + tHeight / 2 - cHeight / 2;
      left = x - cWidth - arrowSize - targetGap;
    } else if (resolvedPosition === "right") {
      top = y + tHeight / 2 - cHeight / 2;
      left = x + tWidth + arrowSize + targetGap;
    }

    // Edge clamping
    left = Math.max(screenPadding, Math.min(windowDim.width - cWidth - screenPadding, left));
    top = Math.max(screenPadding + statusBarOffset, Math.min(windowDim.height - cHeight - screenPadding, top));

    // Dynamic arrow offset to point directly at trigger center
    if (cWidth > 0 && (resolvedPosition === "top" || resolvedPosition === "bottom")) {
      const buttonCenterX = x + tWidth / 2;
      const arrowX = buttonCenterX - left - arrowSize / 2;
      const clampedArrowX = Math.max(10, Math.min(cWidth - 18, arrowX));
      arrowOffset = { left: clampedArrowX, marginLeft: 0 };
    } else if (cHeight > 0 && (resolvedPosition === "left" || resolvedPosition === "right")) {
      const buttonCenterY = y + tHeight / 2;
      const arrowY = buttonCenterY - top - arrowSize / 2;
      const clampedArrowY = Math.max(8, Math.min(cHeight - 16, arrowY));
      arrowOffset = { top: clampedArrowY, marginTop: 0 };
    }
  }

  const effectiveDelayLongPress = childProps.delayLongPress ?? delayLongPress;

  const clonedChild = React.isValidElement(children)
    ? React.cloneElement(
        children as ReactElement<{
          onPress?: (e: GestureResponderEvent) => void;
          onLongPress?: (e: GestureResponderEvent) => void;
          onPressOut?: (e: GestureResponderEvent) => void;
          delayLongPress?: number;
        }>,
        {
          onPress: handleTriggerPress,
          onLongPress: handleTriggerLongPress,
          onPressOut: handleTriggerPressOut,
          delayLongPress: effectiveDelayLongPress,
        }
      )
    : children;

  return (
    <View
      ref={triggerRef}
      collapsable={false}
      style={[styles.triggerWrapper, style]}
    >
      <Pressable
        onPress={handleTriggerPress}
        onLongPress={handleTriggerLongPress}
        onPressOut={handleTriggerPressOut}
        delayLongPress={effectiveDelayLongPress}
      >
        {clonedChild}
      </Pressable>

      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop Dismiss Area */}
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tooltip"
        >
          {targetCoords && (
            <Animated.View
              onStartShouldSetResponder={() => true}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width > 0 && height > 0) {
                  setContentSize({ width, height });
                }
              }}
              style={[
                styles.balloon,
                {
                  top,
                  left,
                  backgroundColor: glass ? withAlpha(backgroundColor, 0.85) : backgroundColor,
                  borderRadius: radii.md,
                },
                animatedStyle,
                contentStyle,
              ]}
            >
              {typeof content === "string" ? (
                <Text
                  variant="caption"
                  weight="500"
                  style={[{ color: textColor }, textStyle]}
                >
                  {content}
                </Text>
              ) : (
                content
              )}

              {/* Directional Arrow Pointer */}
              {arrow && (
                <View
                  style={[
                    styles.arrowBase,
                    { backgroundColor },
                    resolvedPosition === "top" && styles.arrowTop,
                    resolvedPosition === "bottom" && styles.arrowBottom,
                    resolvedPosition === "left" && styles.arrowLeft,
                    resolvedPosition === "right" && styles.arrowRight,
                    arrowOffset,
                  ]}
                />
              )}
            </Animated.View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerWrapper: {},
  backdrop: {
    flex: 1,
    position: "relative",
  },
  balloon: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 9999,
  },
  arrowBase: {
    position: "absolute",
    width: 8,
    height: 8,
    transform: [{ rotate: "45deg" }],
  },
  arrowTop: {
    bottom: -4,
    alignSelf: "center",
    left: "50%",
    marginLeft: -4,
  },
  arrowBottom: {
    top: -4,
    alignSelf: "center",
    left: "50%",
    marginLeft: -4,
  },
  arrowLeft: {
    right: -4,
    top: "50%",
    marginTop: -4,
  },
  arrowRight: {
    left: -4,
    top: "50%",
    marginTop: -4,
  },
});
