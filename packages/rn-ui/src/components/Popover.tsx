import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type PressableProps,
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

import { Portal, usePortalContext, useTheme } from "../theme";
import {
  computeAnchoredPosition,
  measureAnchorNode,
  useDelayedUnmount,
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

export interface PopoverProps extends BaseHapticProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<React.ComponentRef<typeof View> | null>;
  anchor: AnchorMeasurement | null;
  measureAndToggle: () => void;
  haptic: boolean;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

export const Popover = React.memo(function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  haptic = true,
  children,
}: PopoverProps) {
  const portalStore = usePortalContext();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);

  const isControlled = open !== undefined;
  const currentOpen = isControlled ? Boolean(open) : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (currentOpen) {
      measureAnchorNode(
        triggerRef,
        (rect) => {
          setAnchor(rect);
        },
        portalStore?.getHostRef("root"),
      );
    }
  }, [currentOpen, portalStore]);

  const measureAndToggle = useCallback(() => {
    const nextOpen = !currentOpen;
    if (nextOpen && triggerRef.current) {
      measureAnchorNode(
        triggerRef,
        (rect) => {
          setAnchor(rect);
          setOpen(true);
        },
        portalStore?.getHostRef("root"),
      );
      return;
    }
    setOpen(nextOpen);
  }, [currentOpen, portalStore, setOpen]);

  const value = useMemo<PopoverContextValue>(
    () => ({
      open: currentOpen,
      setOpen,
      triggerRef,
      anchor,
      measureAndToggle,
      haptic,
    }),
    [anchor, currentOpen, haptic, measureAndToggle, setOpen],
  );

  return (
    <PopoverContext.Provider value={value}>
      <View collapsable={false}>{children}</View>
    </PopoverContext.Provider>
  );
});

export interface PopoverTriggerProps extends PressableProps {
  triggerMode?: "press" | "longPress";
}

export const PopoverTrigger = React.memo(function PopoverTrigger({
  children,
  triggerMode = "press",
  disabled,
  hitSlop,
  delayLongPress,
  onPress,
  onLongPress,
  style,
  ...props
}: PopoverTriggerProps) {
  const context = React.useContext(PopoverContext);

  const isPressableChild = isPressableTriggerElement(children);
  const childDisabled = isPressableChild
    ? Boolean(children.props.disabled)
    : false;
  const mergedDisabled = Boolean(disabled) || childDisabled;

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (mergedDisabled) return;
      if (triggerMode === "press") {
        if (context?.haptic) triggerHaptic("selection");
        context?.measureAndToggle();
      }
      onPress?.(event);
    },
    [context, mergedDisabled, onPress, triggerMode],
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      if (mergedDisabled) return;
      if (triggerMode === "longPress") {
        if (context?.haptic) triggerHaptic("medium");
        context?.measureAndToggle();
      }
      onLongPress?.(event);
    },
    [context, mergedDisabled, onLongPress, triggerMode],
  );

  return (
    <View
      ref={context?.triggerRef}
      collapsable={false}
      style={isPressableChild && typeof style !== "function" ? style : undefined}
    >
      {isPressableChild ? (
        React.cloneElement(children, {
          disabled: mergedDisabled,
          delayLongPress: children.props.delayLongPress ?? delayLongPress,
          onPress: (event: GestureResponderEvent) => {
            handlePress(event);
            children.props.onPress?.(event);
          },
          onLongPress: (event: GestureResponderEvent) => {
            handleLongPress(event);
            children.props.onLongPress?.(event);
          },
        })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            expanded: Boolean(context?.open),
            disabled: mergedDisabled,
          }}
          disabled={mergedDisabled}
          hitSlop={hitSlop ?? minTouchHitSlop(36)}
          delayLongPress={delayLongPress}
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={style}
          {...props}
        >
          {children}
        </Pressable>
      )}
    </View>
  );
});

export interface PopoverContentProps extends BaseGlassProps {
  children?: React.ReactNode;
  width?: number;
  maxHeight?: number;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  sideOffset?: number;
  style?: StyleProp<ViewStyle>;
}

export const PopoverContent = React.memo(function PopoverContent({
  children,
  width = 300,
  maxHeight = 320,
  align = "center",
  side = "bottom",
  sideOffset = 8,
  glass = false,
  style,
}: PopoverContentProps) {
  const context = React.useContext(PopoverContext);
  const { colors, components, radii, shadows, spacing } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isOpen = Boolean(context?.open);
  const shouldMount = useDelayedUnmount(
    isOpen,
    reducedMotion ? 0 : ANIMATION_TIMING.transition,
  );
  const progress = useSharedValue(isOpen ? 1 : 0);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, progress, reducedMotion]);

  const resolvedWidth = Math.min(width, Math.max(180, windowWidth - spacing.lg * 2));
  const resolvedAnchor: AnchorMeasurement = context?.anchor ?? {
    x: (windowWidth - resolvedWidth) / 2,
    y: windowHeight * 0.25,
    width: resolvedWidth,
    height: 40,
  };
  const coords = computeAnchoredPosition({
    anchor: resolvedAnchor,
    contentWidth: resolvedWidth,
    contentHeight: Math.min(maxHeight, 220),
    windowWidth,
    windowHeight,
    preferredPlacement: side,
    align,
    offset: sideOffset,
    viewportPadding: spacing.md,
  });

  const isTopPlacement = coords.resolvedPlacement === "top";
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      transform: [
        {
          translateY: isTopPlacement
            ? (1 - progress.value) * 6
            : (1 - progress.value) * -6,
        },
        { scale: 0.96 + progress.value * 0.04 },
      ],
    }),
    webDeps([isTopPlacement]),
  );

  if (!shouldMount && !isOpen) return null;

  const portalBody = (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss popover"
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (context?.haptic) triggerHaptic("selection");
          context?.setOpen(false);
        }}
      />

      <Animated.View
        style={[
          styles.content,
          {
            top: coords.top,
            left: coords.left,
            width: resolvedWidth,
            maxHeight,
            borderRadius: radii.lg,
            borderWidth: components.borderWidth.default,
            borderColor: glass ? colors.glassBorder : colors.border,
            backgroundColor: glass
              ? colors.glassSurfaceStrong
              : colors.surfaceRaised,
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
    </>
  );

  return (
    <Portal layer="popover">
      {context ? (
        <PopoverContext.Provider value={context}>
          {portalBody}
        </PopoverContext.Provider>
      ) : (
        portalBody
      )}
    </Portal>
  );
});

const styles = StyleSheet.create({
  content: {
    position: "absolute",
  },
});
