import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { triggerHaptic } from "../utils/haptics";
import {
  minTouchHitSlop,
  type BaseAnimatedProps,
  type BaseHapticProps,
} from "./types";

const COLLAPSIBLE_DURATION = 240;

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

  const measuredHeight = useSharedValue(0);
  const progress = useSharedValue(open ? 1 : 0);
  const [useAbsoluteInner, setUseAbsoluteInner] = useState(!open);

  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = open ? 1 : 0;
      return;
    }

    progress.value = withTiming(open ? 1 : 0, {
      duration: COLLAPSIBLE_DURATION,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [open, progress, shouldAnimate]);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && Math.abs(measuredHeight.value - h) > 0.5) {
        measuredHeight.value = h;
        setUseAbsoluteInner(true);
      }
    },
    [measuredHeight],
  );

  const maskAnimatedStyle = useAnimatedStyle(() => {
    const h = measuredHeight.value;
    const p = progress.value;
    if (h <= 0) {
      return p > 0 ? { opacity: p } : { height: 0, opacity: 0 };
    }
    return {
      height: h * p,
      opacity: interpolate(p, [0, 0.25, 1], [0, 0.65, 1], Extrapolation.CLAMP),
    };
  });

  const innerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * -6 }],
  }));

  if (!shouldAnimate && !open) {
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
      style={[styles.mask, maskAnimatedStyle]}
    >
      <Animated.View
        onLayout={handleLayout}
        style={[
          useAbsoluteInner ? styles.measuredInner : undefined,
          innerAnimatedStyle,
          style,
        ]}
        {...props}
      >
        {childContent}
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  mask: {
    overflow: "hidden",
  },
  measuredInner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
