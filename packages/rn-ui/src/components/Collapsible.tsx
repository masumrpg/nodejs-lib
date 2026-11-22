import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useDelayedUnmount } from "../utils";
import { triggerHaptic } from "../utils/haptics";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  webDeps,
  type BaseAnimatedProps,
  type BaseHapticProps,
} from "./types";

export interface CollapsibleProps
  extends Omit<ViewProps, "style">,
    BaseAnimatedProps,
    BaseHapticProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export interface CollapsibleContextProps {
  open: boolean;
  toggle: () => void;
  animated: boolean;
  haptic: boolean;
}

const CollapsibleContext = React.createContext<CollapsibleContextProps | null>(
  null,
);

export function useCollapsible() {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error("useCollapsible must be used within a <Collapsible />");
  }
  return context;
}

export const Collapsible = React.memo(function Collapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  animated = true,
  haptic = true,
  children,
  style,
  ...props
}: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;

  const toggle = useCallback(() => {
    const nextOpen = !open;
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange, open]);

  const contextValue = useMemo<CollapsibleContextProps>(
    () => ({ open, toggle, animated, haptic }),
    [animated, haptic, open, toggle],
  );

  return (
    <CollapsibleContext.Provider value={contextValue}>
      <View style={style} {...props}>
        {children}
      </View>
    </CollapsibleContext.Provider>
  );
});

export interface CollapsibleTriggerProps
  extends Omit<PressableProps, "children" | "style"> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CollapsibleTrigger = React.memo(function CollapsibleTrigger({
  children,
  disabled,
  hitSlop,
  onPress,
  style,
  ...props
}: CollapsibleTriggerProps) {
  const { toggle, open, haptic } = useCollapsible();

  const handlePress = useCallback(
    (event: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
      if (disabled) return;
      if (haptic) triggerHaptic("selection");
      toggle();
      onPress?.(event);
    },
    [disabled, haptic, onPress, toggle],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open, disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop ?? minTouchHitSlop(36)}
      onPress={handlePress}
      style={style}
      {...props}
    >
      {typeof children === "function"
        ? (children as () => React.ReactNode)()
        : children}
    </Pressable>
  );
});

export interface CollapsibleContentProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const CollapsibleContent = React.memo(function CollapsibleContent({
  children,
  style,
  ...props
}: CollapsibleContentProps) {
  const { open, animated } = useCollapsible();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const [contentHeight, setContentHeight] = useState(0);
  const [settledClosed, setSettledClosed] = useState(!open);
  const openRef = useRef(open);
  openRef.current = open;

  const progress = useSharedValue(open ? 1 : 0);
  const shouldStayMounted = useDelayedUnmount(
    open,
    shouldAnimate ? ANIMATION_TIMING.transition + 40 : 0,
  );

  const handleFinished = useCallback(() => {
    if (!openRef.current) {
      setSettledClosed(true);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setSettledClosed(false);
    }

    if (!shouldAnimate) {
      progress.value = open ? 1 : 0;
      if (!open) {
        setSettledClosed(true);
      }
      return;
    }

    progress.value = withTiming(
      open ? 1 : 0,
      {
        duration: ANIMATION_TIMING.transition + 30,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      },
      (finished) => {
        if (finished) {
          scheduleOnRN(handleFinished);
        }
      },
    );
  }, [handleFinished, open, progress, shouldAnimate]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setContentHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    if (contentHeight <= 0) {
      return {
        opacity: progress.value,
      };
    }
    return {
      height: progress.value * contentHeight,
      opacity: progress.value,
    };
  }, webDeps([contentHeight]));

  if (!open && !shouldStayMounted && settledClosed) {
    return null;
  }

  const childContent =
    typeof children === "function"
      ? (children as () => React.ReactNode)()
      : children;

  return (
    <Animated.View
      pointerEvents={open ? "auto" : "none"}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "yes" : "no-hide-descendants"}
      style={[styles.mask, animatedStyle]}
    >
      <View
        onLayout={handleLayout}
        style={[
          contentHeight > 0 ? styles.measuredInner : undefined,
          style,
        ]}
        {...props}
      >
        {childContent}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  mask: {
    overflow: "hidden",
  },
  measuredInner: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
