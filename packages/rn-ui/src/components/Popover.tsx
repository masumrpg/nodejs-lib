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
  cancelAnimation,
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
  withAlpha,
  type AnchorMeasurement,
  type AnchoredRectResult,
} from "../utils";
import { triggerHaptic } from "../utils/haptics";
import {
  isPressableTriggerElement,
  minTouchHitSlop,
  webDeps,
  type BaseGlassProps,
  type BaseHapticProps,
} from "./types";

const POPOVER_EASING = Easing.bezier(0.23, 1, 0.32, 1);

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
        },
        portalStore?.getHostRef("root"),
      );
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
  overlay?: boolean;
  overlayStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

interface PopoverPortalOverlayProps {
  isOpen: boolean;
  reducedMotion: boolean;
  coords: AnchoredRectResult;
  resolvedWidth: number;
  maxHeight: number;
  glass: boolean;
  overlay: boolean;
  overlayStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  haptic: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const PopoverPortalOverlay = React.memo(function PopoverPortalOverlay({
  isOpen,
  reducedMotion,
  coords,
  resolvedWidth,
  maxHeight,
  glass,
  overlay,
  overlayStyle,
  style,
  haptic,
  onClose,
  children,
}: PopoverPortalOverlayProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const progress = useSharedValue(isOpen && reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = isOpen ? 1 : 0;
      return;
    }
    progress.value = withTiming(isOpen ? 1 : 0, {
      duration: isOpen ? 200 : 150,
      easing: POPOVER_EASING,
    });
    return () => {
      cancelAnimation(progress);
    };
  }, [isOpen, progress, reducedMotion]);

  const isTopPlacement = coords.resolvedPlacement === "top";
  const backdropAnimatedStyle = useAnimatedStyle(
    () => ({ opacity: progress.value }),
    webDeps([]),
  );
  const contentAnimatedStyle = useAnimatedStyle(
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

  const isBrutal = components.surface.pressEffect === "offset";
  const backdropColor = isDark
    ? withAlpha("#000000", 0.38)
    : withAlpha("#0F172A", 0.16);
  const cardElevation: ViewStyle = isBrutal
    ? shadows.lg
    : {
        boxShadow: isDark
          ? "0px 10px 28px rgba(0, 0, 0, 0.52)"
          : "0px 8px 24px rgba(15, 23, 42, 0.14)",
      };

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
          accessibilityLabel="Dismiss popover"
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (haptic) triggerHaptic("selection");
            onClose();
          }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          {
            top: coords.top,
            left: coords.left,
            width: resolvedWidth,
            maxHeight,
            borderRadius: radii.lg,
            borderCurve: "continuous",
            borderWidth: Math.max(components.borderWidth.default, 1),
            borderColor: glass
              ? colors.glassBorder
              : components.borderWidth.default > 0
                ? colors.border
                : colors.borderMuted,
            backgroundColor: glass
              ? colors.glassSurfaceStrong
              : colors.surfaceRaised,
            padding: spacing.md,
          },
          cardElevation,
          contentAnimatedStyle,
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
});

export const PopoverContent = React.memo(function PopoverContent({
  children,
  width = 300,
  maxHeight = 320,
  align = "center",
  side = "bottom",
  sideOffset = 8,
  glass = false,
  overlay = true,
  overlayStyle,
  style,
}: PopoverContentProps) {
  const context = React.useContext(PopoverContext);
  const { spacing } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const isOpen = Boolean(context?.open);
  const shouldMount = useDelayedUnmount(isOpen, reducedMotion ? 0 : 160);

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

  if (!shouldMount && !isOpen) return null;

  const overlayNode = (
    <PopoverPortalOverlay
      isOpen={isOpen}
      reducedMotion={Boolean(reducedMotion)}
      coords={coords}
      resolvedWidth={resolvedWidth}
      maxHeight={maxHeight}
      glass={glass}
      overlay={overlay}
      overlayStyle={overlayStyle}
      style={style}
      haptic={Boolean(context?.haptic)}
      onClose={() => context?.setOpen(false)}
    >
      {children}
    </PopoverPortalOverlay>
  );

  return (
    <Portal layer="popover">
      {context ? (
        <PopoverContext.Provider value={context}>
          {overlayNode}
        </PopoverContext.Provider>
      ) : (
        overlayNode
      )}
    </Portal>
  );
});

const styles = StyleSheet.create({
  content: {
    position: "absolute",
  },
});
