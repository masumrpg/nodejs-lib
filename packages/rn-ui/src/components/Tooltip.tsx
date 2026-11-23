import React, {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Portal, usePortalContext, useTheme } from "../theme";
import {
  measureAnchorNode,
  useDelayedUnmount,
  withAlpha,
  type AnchorMeasurement,
} from "../utils";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  isPressableTriggerElement,
  minTouchHitSlop,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
} from "./types";

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
  overlay?: boolean;
  overlayStyle?: StyleProp<ViewStyle>;
  visible?: boolean;
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children: ReactElement;
}

const ARROW_SIZE = 7;
const TOOLTIP_EASING = Easing.bezier(0.23, 1, 0.32, 1);

interface TooltipPortalOverlayProps {
  isOpen: boolean;
  shouldAnimate: boolean;
  overlay: boolean;
  overlayStyle?: StyleProp<ViewStyle>;
  screenWidth: number;
  resolvedPosition: "top" | "bottom" | "left" | "right";
  layoutPlacement: {
    top: number;
    left: number;
    arrowOffsetX: number;
    arrowOffsetY: number;
  };
  tonePalette: { bg: string; fg: string; border: string };
  arrow: boolean;
  tooltipSize: { width: number; height: number };
  onBalloonLayout: (event: LayoutChangeEvent) => void;
  onClose: () => void;
  content: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const TooltipPortalOverlay = React.memo(function TooltipPortalOverlay({
  isOpen,
  shouldAnimate,
  overlay,
  overlayStyle,
  screenWidth,
  resolvedPosition,
  layoutPlacement,
  tonePalette,
  arrow,
  tooltipSize,
  onBalloonLayout,
  onClose,
  content,
  contentStyle,
  textStyle,
}: TooltipPortalOverlayProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const animProgress = useSharedValue(isOpen && !shouldAnimate ? 1 : 0);

  useEffect(() => {
    if (!shouldAnimate) {
      animProgress.value = isOpen ? 1 : 0;
      return;
    }
    animProgress.value = withTiming(isOpen ? 1 : 0, {
      duration: isOpen ? 180 : 130,
      easing: TOOLTIP_EASING,
    });
    return () => {
      cancelAnimation(animProgress);
    };
  }, [animProgress, isOpen, shouldAnimate]);

  const backdropAnimatedStyle = useAnimatedStyle(
    () => ({ opacity: animProgress.value }),
    webDeps([]),
  );

  const animatedTooltipStyle = useAnimatedStyle(() => {
    const shiftX =
      resolvedPosition === "left" ? 6 : resolvedPosition === "right" ? -6 : 0;
    const shiftY =
      resolvedPosition === "top" ? 6 : resolvedPosition === "bottom" ? -6 : 0;

    return {
      opacity: animProgress.value,
      transform: [
        { translateX: (1 - animProgress.value) * shiftX },
        { translateY: (1 - animProgress.value) * shiftY },
        { scale: 0.94 + animProgress.value * 0.06 },
      ],
    };
  }, webDeps([resolvedPosition]));

  const backdropColor = withAlpha(colors.overlay, isDark ? 0.35 : 0.2);
  const balloonElevation: ViewStyle = shadows.md;

  return (
    <>
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          overlay ? { backgroundColor: backdropColor } : undefined,
          backdropAnimatedStyle,
          overlayStyle,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss tooltip"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
      </Animated.View>

      <Animated.View
        onLayout={onBalloonLayout}
        style={[
          styles.balloon,
          {
            top: layoutPlacement.top,
            left: layoutPlacement.left,
            maxWidth: Math.min(280, screenWidth - spacing.md * 2),
            backgroundColor: tonePalette.bg,
            borderColor: tonePalette.border,
            borderWidth: Math.max(components.borderWidth.default, 1),
            borderRadius: radii.md,
            borderCurve: "continuous",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 3,
          },
          balloonElevation,
          animatedTooltipStyle,
          contentStyle,
        ]}
      >
        {typeof content === "string" || typeof content === "number" ? (
          <Text
            variant="caption"
            weight="600"
            style={[{ color: tonePalette.fg }, textStyle]}
          >
            {content}
          </Text>
        ) : (
          content
        )}

        {arrow && tooltipSize.width > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.arrowBase,
              resolvedPosition === "top" && {
                bottom: -ARROW_SIZE,
                left: layoutPlacement.arrowOffsetX - ARROW_SIZE,
                borderTopColor: tonePalette.bg,
                borderTopWidth: ARROW_SIZE,
                borderLeftWidth: ARROW_SIZE,
                borderRightWidth: ARROW_SIZE,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
              },
              resolvedPosition === "bottom" && {
                top: -ARROW_SIZE,
                left: layoutPlacement.arrowOffsetX - ARROW_SIZE,
                borderBottomColor: tonePalette.bg,
                borderBottomWidth: ARROW_SIZE,
                borderLeftWidth: ARROW_SIZE,
                borderRightWidth: ARROW_SIZE,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
              },
              resolvedPosition === "left" && {
                right: -ARROW_SIZE,
                top: layoutPlacement.arrowOffsetY - ARROW_SIZE,
                borderLeftColor: tonePalette.bg,
                borderLeftWidth: ARROW_SIZE,
                borderTopWidth: ARROW_SIZE,
                borderBottomWidth: ARROW_SIZE,
                borderTopColor: "transparent",
                borderBottomColor: "transparent",
              },
              resolvedPosition === "right" && {
                left: -ARROW_SIZE,
                top: layoutPlacement.arrowOffsetY - ARROW_SIZE,
                borderRightColor: tonePalette.bg,
                borderRightWidth: ARROW_SIZE,
                borderTopWidth: ARROW_SIZE,
                borderBottomWidth: ARROW_SIZE,
                borderTopColor: "transparent",
                borderBottomColor: "transparent",
              },
            ]}
          />
        ) : null}
      </Animated.View>
    </>
  );
});

export const Tooltip = React.memo(function Tooltip({
  content,
  position = "auto",
  triggerMode = "longPress",
  autoFlip = true,
  tone = "default",
  arrow = true,
  delay = 0,
  duration = 0,
  delayLongPress = 320,
  dismissOnPressOut = false,
  overlay = true,
  overlayStyle,
  visible: controlledVisible,
  onOpenChange,
  glass = false,
  haptic = true,
  animated = true,
  style,
  contentStyle,
  textStyle,
  children,
}: TooltipProps) {
  const { colors, spacing, isDark } = useTheme();
  const portalStore = usePortalContext();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [internalOpen, setInternalOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  const isControlled = controlledVisible !== undefined;
  const isOpen = isControlled ? Boolean(controlledVisible) : internalOpen;

  const shouldMount = useDelayedUnmount(
    isOpen,
    shouldAnimate ? 140 : 0,
  );

  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (durationTimerRef.current) {
      clearTimeout(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const setOpenState = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const close = useCallback(() => {
    clearTimers();
    setOpenState(false);
  }, [clearTimers, setOpenState]);

  const measureAndShow = useCallback(() => {
    clearTimers();
    measureAnchorNode(
      triggerRef,
      (rect) => {
        setAnchor(rect);
      },
      portalStore?.getHostRef("root"),
    );

    const activate = () => {
      if (haptic) triggerHaptic("light");
      setOpenState(true);
      if (duration > 0) {
        durationTimerRef.current = setTimeout(() => {
          setOpenState(false);
        }, duration);
      }
    };

    if (delay > 0) {
      delayTimerRef.current = setTimeout(activate, delay);
    } else {
      activate();
    }
  }, [clearTimers, delay, duration, haptic, portalStore, setOpenState]);

  useEffect(() => {
    if (isOpen && !anchor) {
      measureAnchorNode(
        triggerRef,
        (rect) => {
          setAnchor(rect);
        },
        portalStore?.getHostRef("root"),
      );
    }
  }, [anchor, isOpen, portalStore]);

  useEffect(() => clearTimers, [clearTimers]);

  const effectiveAnchor: AnchorMeasurement = anchor ?? {
    x: screenWidth / 2 - 40,
    y: screenHeight * 0.35,
    width: 80,
    height: 40,
  };

  const resolvedPosition = (() => {
    const estW = tooltipSize.width || 160;
    const estH = tooltipSize.height || 44;
    const gap = ARROW_SIZE + 8;

    const spaceTop = effectiveAnchor.y;
    const spaceBottom = screenHeight - (effectiveAnchor.y + effectiveAnchor.height);
    const spaceLeft = effectiveAnchor.x;
    const spaceRight = screenWidth - (effectiveAnchor.x + effectiveAnchor.width);

    if (position === "auto") {
      if (spaceTop >= estH + gap) return "top";
      if (spaceBottom >= estH + gap) return "bottom";
      if (spaceRight >= estW + gap) return "right";
      if (spaceLeft >= estW + gap) return "left";
      return spaceBottom > spaceTop ? "bottom" : "top";
    }
    if (!autoFlip) return position;
    if (position === "top" && spaceTop < estH + gap && spaceBottom > spaceTop) {
      return "bottom";
    }
    if (
      position === "bottom" &&
      spaceBottom < estH + gap &&
      spaceTop > spaceBottom
    ) {
      return "top";
    }
    if (position === "left" && spaceLeft < estW + gap && spaceRight > spaceLeft) {
      return "right";
    }
    if (
      position === "right" &&
      spaceRight < estW + gap &&
      spaceLeft > spaceRight
    ) {
      return "left";
    }
    return position;
  })();

  const layoutPlacement = (() => {
    const w = tooltipSize.width || 140;
    const h = tooltipSize.height || 40;
    const pad = spacing.md;
    const gap = arrow ? ARROW_SIZE + 6 : 6;

    let top = 0;
    let left = 0;
    let arrowOffsetX = 0;
    let arrowOffsetY = 0;

    const centerX = effectiveAnchor.x + effectiveAnchor.width / 2;
    const centerY = effectiveAnchor.y + effectiveAnchor.height / 2;

    if (resolvedPosition === "top" || resolvedPosition === "bottom") {
      top =
        resolvedPosition === "top"
          ? effectiveAnchor.y - h - gap
          : effectiveAnchor.y + effectiveAnchor.height + gap;
      left = Math.max(
        pad,
        Math.min(centerX - w / 2, screenWidth - w - pad),
      );
      arrowOffsetX = Math.max(
        ARROW_SIZE + 6,
        Math.min(centerX - left, w - ARROW_SIZE - 6),
      );
    } else {
      left =
        resolvedPosition === "left"
          ? effectiveAnchor.x - w - gap
          : effectiveAnchor.x + effectiveAnchor.width + gap;
      top = Math.max(
        pad,
        Math.min(centerY - h / 2, screenHeight - h - pad),
      );
      arrowOffsetY = Math.max(
        ARROW_SIZE + 6,
        Math.min(centerY - top, h - ARROW_SIZE - 6),
      );
    }

    return { top, left, arrowOffsetX, arrowOffsetY };
  })();

  const tonePalette = (() => {
    if (glass) {
      return {
        bg: colors.glassSurfaceStrong,
        fg: colors.text,
        border: colors.glassBorder,
      };
    }
    if (tone === "default") {
      if (isDark) {
        return {
          bg: colors.surfaceRaised,
          fg: colors.text,
          border: colors.border,
        };
      }
      return {
        bg: colors.text,
        fg: colors.background,
        border: withAlpha(colors.text, 0.12),
      };
    }
    if (tone === "dark") {
      return {
        bg: isDark ? colors.surfaceRaised : "#0F172A",
        fg: isDark ? colors.text : "#F8FAFC",
        border: isDark ? colors.border : "#1E293B",
      };
    }
    if (tone === "light") {
      return {
        bg: isDark ? colors.backgroundMuted : "#FFFFFF",
        fg: isDark ? colors.textMuted : "#0F172A",
        border: colors.border,
      };
    }
    const resolved = resolveToneColors(tone, colors);
    return {
      bg: resolved.solid,
      fg: resolved.on,
      border: resolved.border,
    };
  })();

  const handlePress = useCallback(() => {
    if (triggerMode !== "press") return;
    if (isOpen) {
      close();
    } else {
      measureAndShow();
    }
  }, [close, isOpen, measureAndShow, triggerMode]);

  const handleLongPress = useCallback(() => {
    if (triggerMode !== "longPress") return;
    measureAndShow();
  }, [measureAndShow, triggerMode]);

  const handlePressOut = useCallback(() => {
    if (delayTimerRef.current && !isOpen) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (dismissOnPressOut && isOpen) {
      close();
    }
  }, [close, dismissOnPressOut, isOpen]);

  const handleBalloonLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setTooltipSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  const canShowPortal = shouldMount || isOpen;
  const isPressableChild = isPressableTriggerElement(children);

  return (
    <>
      <View
        ref={triggerRef}
        collapsable={false}
        style={[styles.triggerWrapper, style]}
        onLayout={() => {
          if (isOpen) {
            measureAnchorNode(
              triggerRef,
              (rect) => {
                setAnchor(rect);
              },
              portalStore?.getHostRef("root"),
            );
          }
        }}
      >
        {isPressableChild ? (
          React.cloneElement(children, {
            delayLongPress: children.props.delayLongPress ?? delayLongPress,
            onPress: (event: GestureResponderEvent) => {
              if (triggerMode === "press") {
                handlePress();
              }
              children.props.onPress?.(event);
            },
            onLongPress: (event: GestureResponderEvent) => {
              if (triggerMode === "longPress") {
                handleLongPress();
              }
              children.props.onLongPress?.(event);
            },
            onPressOut: (event: GestureResponderEvent) => {
              handlePressOut();
              children.props.onPressOut?.(event);
            },
          })
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Displays tooltip"
            hitSlop={minTouchHitSlop(32)}
            delayLongPress={delayLongPress}
            onPress={handlePress}
            onLongPress={handleLongPress}
            onPressOut={handlePressOut}
          >
            {children}
          </Pressable>
        )}
      </View>

      {canShowPortal ? (
        <Portal layer="tooltip">
          <TooltipPortalOverlay
            isOpen={isOpen}
            shouldAnimate={shouldAnimate}
            overlay={overlay}
            overlayStyle={overlayStyle}
            screenWidth={screenWidth}
            resolvedPosition={resolvedPosition}
            layoutPlacement={layoutPlacement}
            tonePalette={tonePalette}
            arrow={arrow}
            tooltipSize={tooltipSize}
            onBalloonLayout={handleBalloonLayout}
            onClose={close}
            content={content}
            contentStyle={contentStyle}
            textStyle={textStyle}
          />
        </Portal>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  triggerWrapper: {
    alignSelf: "flex-start",
  },
  balloon: {
    position: "absolute",
  },
  arrowBase: {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  },
});
