import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Portal, usePortalContext, useTheme, type ThemeColors } from "../theme";
import {
  computeAnchoredPosition,
  measureAnchorNode,
  useDelayedUnmount,
  withAlpha,
  type AnchorMeasurement,
} from "../utils";
import { triggerHaptic } from "../utils/haptics";
import {
  ANIMATION_TIMING,
  isPressableTriggerElement,
  minTouchHitSlop,
  webDeps,
  type BaseGlassProps,
  type BaseHapticProps,
} from "./types";

export type HoverCardAlign = "start" | "center" | "end";
export type HoverCardTriggerMode = "press" | "longPress";

export interface HoverCardContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchor: AnchorMeasurement | null;
  setAnchor: (layout: AnchorMeasurement | null) => void;
  triggerRef: React.RefObject<React.ComponentRef<typeof View> | null>;
  openDelay: number;
  closeDelay: number;
  triggerMode: HoverCardTriggerMode;
  haptic: boolean;
  colors: ThemeColors;
}

const HoverCardContext = React.createContext<HoverCardContextProps | null>(null);

export function useHoverCard() {
  const context = React.useContext(HoverCardContext);
  if (!context) {
    throw new Error("useHoverCard must be used within a <HoverCard />");
  }
  return context;
}

export interface HoverCardProps extends BaseHapticProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  triggerMode?: HoverCardTriggerMode;
  children?: React.ReactNode;
}

export const HoverCard = React.memo(function HoverCard({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  openDelay = 0,
  closeDelay = 0,
  triggerMode = "press",
  haptic = true,
  children,
}: HoverCardProps) {
  const { colors } = useTheme();
  const portalStore = usePortalContext();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (open && !anchor) {
      measureAnchorNode(
        triggerRef,
        (rect) => {
          setAnchor(rect);
        },
        portalStore?.getHostRef("root"),
      );
    }
  }, [anchor, open, portalStore]);

  const contextValue = useMemo<HoverCardContextProps>(
    () => ({
      open,
      setOpen,
      anchor,
      setAnchor,
      triggerRef,
      openDelay,
      closeDelay,
      triggerMode,
      haptic,
      colors,
    }),
    [
      anchor,
      closeDelay,
      colors,
      haptic,
      open,
      openDelay,
      setOpen,
      triggerMode,
    ],
  );

  return (
    <HoverCardContext.Provider value={contextValue}>
      <View collapsable={false} style={styles.root}>
        {children}
      </View>
    </HoverCardContext.Provider>
  );
});

export interface HoverCardTriggerProps {
  children?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const HoverCardTrigger = React.memo(function HoverCardTrigger({
  children,
  disabled = false,
  style,
}: HoverCardTriggerProps) {
  const {
    open,
    setOpen,
    setAnchor,
    triggerRef,
    openDelay,
    closeDelay,
    triggerMode,
    haptic,
  } = useHoverCard();
  const portalStore = usePortalContext();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const scheduleOpen = useCallback(() => {
    clearTimer();
    measureAnchorNode(
      triggerRef,
      (rect) => {
        setAnchor(rect);
      },
      portalStore?.getHostRef("root"),
    );
    if (openDelay > 0) {
      timerRef.current = setTimeout(() => {
        if (haptic) triggerHaptic("selection");
        setOpen(true);
      }, openDelay);
    } else {
      if (haptic) triggerHaptic("selection");
      setOpen(true);
    }
  }, [clearTimer, haptic, openDelay, portalStore, setAnchor, setOpen, triggerRef]);

  const scheduleClose = useCallback(() => {
    clearTimer();
    if (closeDelay > 0) {
      timerRef.current = setTimeout(() => setOpen(false), closeDelay);
    } else {
      setOpen(false);
    }
  }, [clearTimer, closeDelay, setOpen]);

  const isPressableChild = isPressableTriggerElement(children);
  const childDisabled = isPressableChild
    ? Boolean(children.props.disabled)
    : false;
  const mergedDisabled = disabled || childDisabled;

  const handlePress = useCallback(() => {
    if (mergedDisabled || triggerMode !== "press") return;
    if (open) {
      scheduleClose();
    } else {
      scheduleOpen();
    }
  }, [mergedDisabled, open, scheduleClose, scheduleOpen, triggerMode]);

  const handleLongPress = useCallback(() => {
    if (mergedDisabled || triggerMode !== "longPress") return;
    if (haptic) triggerHaptic("medium");
    scheduleOpen();
  }, [haptic, mergedDisabled, scheduleOpen, triggerMode]);

  return (
    <View
      ref={triggerRef}
      collapsable={false}
      style={isPressableChild ? style : undefined}
    >
      {isPressableChild ? (
        React.cloneElement(children, {
          disabled: mergedDisabled,
          delayLongPress: children.props.delayLongPress ?? 260,
          onPress: (event: GestureResponderEvent) => {
            handlePress();
            children.props.onPress?.(event);
          },
          onLongPress: (event: GestureResponderEvent) => {
            handleLongPress();
            children.props.onLongPress?.(event);
          },
        })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled: mergedDisabled }}
          disabled={mergedDisabled}
          hitSlop={minTouchHitSlop(36)}
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={260}
          style={style}
        >
          {children}
        </Pressable>
      )}
    </View>
  );
});

export interface HoverCardContentProps extends BaseGlassProps {
  children?: React.ReactNode;
  align?: HoverCardAlign;
  width?: number;
  maxHeight?: number;
  sideOffset?: number;
  style?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
}

export const HoverCardContent = React.memo(function HoverCardContent({
  children,
  align = "start",
  width = 280,
  maxHeight = 280,
  sideOffset = 8,
  glass = false,
  style,
  overlayStyle,
}: HoverCardContentProps) {
  const hoverCardContext = useHoverCard();
  const { open, setOpen, anchor, haptic, colors } = hoverCardContext;
  const { components, radii, shadows, spacing } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const shouldMount = useDelayedUnmount(
    open,
    reducedMotion ? 0 : ANIMATION_TIMING.transition,
  );
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    if (open) {
      progress.value = reducedMotion
        ? 1
        : withTiming(1, {
            duration: ANIMATION_TIMING.transition,
            easing: Easing.bezier(...ANIMATION_TIMING.bezier),
          });
    } else {
      progress.value = reducedMotion
        ? 0
        : withTiming(0, {
            duration: 120,
            easing: Easing.bezier(...ANIMATION_TIMING.bezier),
          });
    }
  }, [open, progress, reducedMotion]);

  const resolvedWidth = Math.min(width, Math.max(180, windowWidth - spacing.md * 2));
  const resolvedAnchor: AnchorMeasurement = anchor ?? {
    x: spacing.md,
    y: windowHeight * 0.25,
    width: resolvedWidth,
    height: 40,
  };
  const coords = computeAnchoredPosition({
    anchor: resolvedAnchor,
    contentWidth: resolvedWidth,
    contentHeight: Math.min(maxHeight, 200),
    windowWidth,
    windowHeight,
    preferredPlacement: "bottom",
    align,
    offset: sideOffset,
    viewportPadding: spacing.md,
  });

  const renderAbove = coords.resolvedPlacement === "top";
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      transform: [
        {
          translateY: renderAbove
            ? (1 - progress.value) * 6
            : (1 - progress.value) * -6,
        },
        { scale: 0.96 + progress.value * 0.04 },
      ],
    }),
    webDeps([renderAbove]),
  );

  if (!shouldMount && !open) return null;

  return (
    <Portal layer="popover">
      <HoverCardContext.Provider value={hoverCardContext}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss hover card"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: withAlpha("#0F172A", 0.1) },
            overlayStyle,
          ]}
          onPress={() => {
            if (haptic) triggerHaptic("selection");
            setOpen(false);
          }}
        />

        <Animated.View
          style={[
            styles.card,
            {
              top: coords.top,
              left: coords.left,
              width: resolvedWidth,
              maxHeight,
              backgroundColor: glass
                ? colors.glassSurfaceStrong
                : colors.surfaceRaised,
              borderColor: glass ? colors.glassBorder : colors.border,
              borderWidth: components.borderWidth.default,
              borderRadius: radii.lg,
              padding: spacing.md,
            },
            shadows.lg,
            animatedStyle,
            style,
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </HoverCardContext.Provider>
    </Portal>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: "flex-start",
  },
  card: {
    position: "absolute",
  },
});
