import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Badge } from "./Badge";
import { Text } from "./Text";
import {
  renderIcon,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentSize,
  type ComponentTone,
  type RenderIcon,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

// Easing curves from expo-animation skill
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1); // Strong ease-out for UI entering
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1); // Smooth on-screen movement for indicator

export type TabsVariant = "line" | "pill" | "soft";
export type TabsTransition = "slide" | "fade" | "scale" | "none";

export interface TabsProps
  extends VariantProps<TabsVariant>,
    ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  transition?: TabsTransition;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

interface TabLayout {
  x: number;
  width: number;
}

interface TabsContextValue {
  value: string;
  onSelect: (val: string) => void;
  variant: TabsVariant;
  tone: ComponentTone;
  size: ComponentSize;
  glass: boolean;
  haptic: boolean;
  animated: boolean;
  transition: TabsTransition;
  direction: number;
  tabChangeCount: number;
  registerTabLayout: (val: string, layout: TabLayout) => void;
  registerTabKey: (val: string) => void;
  tabLayouts: Record<string, TabLayout>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs compound components must be rendered inside a <Tabs> container.");
  }
  return context;
}

/**
 * Compound Tabs system providing accessible tab navigation with smooth indicator transitions.
 */
export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  variant = "line",
  tone = "primary",
  size = "md",
  glass = false,
  haptic = true,
  animated = true,
  transition = "slide",
  style,
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [tabLayouts, setTabLayouts] = useState<Record<string, TabLayout>>({});
  const [tabKeys, setTabKeys] = useState<string[]>([]);
  const [direction, setDirection] = useState<number>(1);
  const [tabChangeCount, setTabChangeCount] = useState<number>(0);

  const activeValue = value !== undefined ? value : internalValue;

  const registerTabKey = useCallback((val: string) => {
    setTabKeys((prev) => (prev.includes(val) ? prev : [...prev, val]));
  }, []);

  const registerTabLayout = useCallback((val: string, layout: TabLayout) => {
    setTabLayouts((prev) => {
      if (prev[val]?.x === layout.x && prev[val]?.width === layout.width) {
        return prev;
      }
      return { ...prev, [val]: layout };
    });
  }, []);

  const handleSelect = useCallback(
    (newVal: string) => {
      if (newVal === activeValue) return;

      if (haptic) {
        triggerHaptic("selection");
      }

      // Determine movement direction (-1 for leftward, 1 for rightward)
      const prevLayout = tabLayouts[activeValue];
      const newLayout = tabLayouts[newVal];
      if (prevLayout && newLayout && prevLayout.x !== newLayout.x) {
        setDirection(newLayout.x > prevLayout.x ? 1 : -1);
      } else {
        const prevIdx = tabKeys.indexOf(activeValue);
        const newIdx = tabKeys.indexOf(newVal);
        if (prevIdx !== -1 && newIdx !== -1) {
          setDirection(newIdx >= prevIdx ? 1 : -1);
        } else {
          setDirection(1);
        }
      }

      setTabChangeCount((c) => c + 1);

      if (value === undefined) {
        setInternalValue(newVal);
      }
      onValueChange?.(newVal);
    },
    [activeValue, haptic, onValueChange, tabKeys, tabLayouts, value]
  );

  const contextValue = useMemo(
    () => ({
      value: activeValue,
      onSelect: handleSelect,
      variant,
      tone,
      size,
      glass,
      haptic,
      animated,
      transition,
      direction,
      tabChangeCount,
      registerTabLayout,
      registerTabKey,
      tabLayouts,
    }),
    [
      activeValue,
      handleSelect,
      variant,
      tone,
      size,
      glass,
      haptic,
      animated,
      transition,
      direction,
      tabChangeCount,
      registerTabLayout,
      registerTabKey,
      tabLayouts,
    ]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <View style={[styles.root, style]}>{children}</View>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  style?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Horizontal tab button header list with animated indicator bar or pill capsule.
 */
export function TabsList({ style, indicatorStyle, children }: TabsListProps) {
  const { colors, radii } = useTheme();
  const { value, variant, tone, tabLayouts, animated } = useTabsContext();

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  const activeLayout = tabLayouts[value];

  useEffect(() => {
    if (activeLayout && activeLayout.width > 0) {
      if (animated) {
        indicatorX.set(
          withTiming(activeLayout.x, {
            duration: 220,
            easing: EASE_IN_OUT,
          })
        );
        indicatorWidth.set(
          withTiming(activeLayout.width, {
            duration: 220,
            easing: EASE_IN_OUT,
          })
        );
        indicatorOpacity.set(withTiming(1, { duration: 150 }));
      } else {
        indicatorX.set(activeLayout.x);
        indicatorWidth.set(activeLayout.width);
        indicatorOpacity.set(1);
      }
    }
  }, [activeLayout, animated, indicatorOpacity, indicatorWidth, indicatorX]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.get() }],
    width: indicatorWidth.get(),
    opacity: indicatorOpacity.get(),
  }));

  const activeColor =
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
      : colors.info;

  const isPill = variant === "pill";
  const isSoft = variant === "soft";

  return (
    <View
      style={[
        styles.listContainer,
        isPill && {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.lg,
          padding: 4,
        },
        isSoft && {
          backgroundColor: colors.surfaceMuted,
          borderRadius: radii.md,
          padding: 3,
        },
        variant === "line" && {
          borderBottomWidth: 1,
          borderBottomColor: colors.borderMuted,
        },
        style,
      ]}
    >
      {/* Sliding Animated Indicator */}
      <Animated.View
        style={[
          styles.indicatorBase,
          variant === "line" && {
            bottom: 0,
            height: 2.5,
            backgroundColor: activeColor,
            borderRadius: 2,
          },
          isPill && {
            top: 4,
            bottom: 4,
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
          isSoft && {
            top: 3,
            bottom: 3,
            backgroundColor: withAlpha(activeColor, 0.14),
            borderRadius: radii.sm,
          },
          animatedIndicatorStyle,
          indicatorStyle,
        ]}
      />
      {children}
    </View>
  );
}

export interface TabsTriggerProps {
  value: string;
  disabled?: boolean;
  icon?: RenderIcon;
  badge?: string | number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeTextStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
}

/**
 * Interactive tab item trigger button.
 */
export function TabsTrigger({
  value,
  disabled = false,
  icon,
  badge,
  style,
  textStyle,
  activeTextStyle,
  children,
}: TabsTriggerProps) {
  const { colors } = useTheme();
  const {
    value: activeValue,
    onSelect,
    variant,
    tone,
    size,
    registerTabLayout,
    registerTabKey,
  } = useTabsContext();

  useEffect(() => {
    registerTabKey(value);
  }, [registerTabKey, value]);

  const isSelected = activeValue === value;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    registerTabLayout(value, { x, width });
  };

  const activeColor =
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
      : colors.info;

  const paddingVertical = size === "sm" ? 6 : size === "lg" ? 12 : 9;
  const paddingHorizontal = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 14;

  const textColor = isSelected
    ? variant === "line" || variant === "soft"
      ? activeColor
      : colors.text
    : colors.textMuted;

  return (
    <Pressable
      onLayout={handleLayout}
      disabled={disabled}
      onPress={() => onSelect(value)}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected, disabled }}
      style={[
        styles.trigger,
        {
          paddingVertical,
          paddingHorizontal,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {icon && renderIcon(icon, textColor, iconSize)}
      {typeof children === "string" ? (
        <Text
          weight={isSelected ? "600" : "500"}
          style={[
            {
              fontSize,
              color: textColor,
            },
            textStyle,
            isSelected && activeTextStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
      {badge !== undefined && (
        <Badge
          size="sm"
          tone={isSelected ? tone : "default"}
          variant={isSelected ? "solid" : "soft"}
        >
          {String(badge)}
        </Badge>
      )}
    </Pressable>
  );
}

export interface TabsContentProps {
  value: string;
  lazy?: boolean;
  transition?: TabsTransition;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Tab content view rendered when the corresponding tab trigger is active.
 * Features fluid directional slide, scale, or fade transitions adhering to expo-animation.
 */
export function TabsContent({
  value,
  lazy = true,
  transition: localTransition,
  style,
  children,
}: TabsContentProps) {
  const {
    value: activeValue,
    animated,
    transition: contextTransition,
    direction,
    tabChangeCount,
  } = useTabsContext();

  const isSelected = activeValue === value;
  const reduced = useReducedMotion();

  const effectiveTransition: TabsTransition =
    localTransition ?? contextTransition;

  // Initial load before user interaction: display immediately with zero transition delay
  const isInitial = tabChangeCount === 0;

  const shouldSlide =
    animated && !reduced && effectiveTransition === "slide" && !isInitial;
  const shouldScale =
    animated && !reduced && effectiveTransition === "scale" && !isInitial;

  const initialOpacity = isSelected ? (isInitial || !animated ? 1 : 0) : 0;
  const initialTranslateX = shouldSlide ? direction * 14 : 0;
  const initialScale = shouldScale ? 0.96 : 1;

  const contentOpacity = useSharedValue(initialOpacity);
  const contentTranslateX = useSharedValue(initialTranslateX);
  const contentScale = useSharedValue(initialScale);

  useEffect(() => {
    if (!isSelected) {
      contentOpacity.set(0);
      return;
    }

    if (!animated || effectiveTransition === "none") {
      contentOpacity.set(1);
      contentTranslateX.set(0);
      contentScale.set(1);
      return;
    }

    if (isInitial) {
      contentOpacity.set(1);
      contentTranslateX.set(0);
      contentScale.set(1);
      return;
    }

    // Entering transition
    if (effectiveTransition === "slide" && !reduced) {
      contentTranslateX.set(direction * 14);
      contentOpacity.set(0);
      contentTranslateX.set(
        withTiming(0, {
          duration: 200,
          easing: EASE_OUT,
        })
      );
      contentOpacity.set(
        withTiming(1, {
          duration: 200,
          easing: EASE_OUT,
        })
      );
    } else if (effectiveTransition === "scale" && !reduced) {
      contentScale.set(0.96);
      contentOpacity.set(0);
      contentScale.set(
        withTiming(1, {
          duration: 200,
          easing: EASE_OUT,
        })
      );
      contentOpacity.set(
        withTiming(1, {
          duration: 200,
          easing: EASE_OUT,
        })
      );
    } else {
      // Fade transition (or reduced motion fallback)
      contentOpacity.set(0);
      contentOpacity.set(
        withTiming(1, {
          duration: 180,
          easing: EASE_OUT,
        })
      );
    }
  }, [
    animated,
    contentOpacity,
    contentScale,
    contentTranslateX,
    direction,
    effectiveTransition,
    isInitial,
    isSelected,
    reduced,
  ]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.get(),
    transform: [
      { translateX: contentTranslateX.get() },
      { scale: contentScale.get() },
    ],
  }));

  if (!isSelected && lazy) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.content,
        !isSelected && { display: "none" },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  listContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  indicatorBase: {
    position: "absolute",
    zIndex: 0,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 1,
  },
  content: {
    width: "100%",
    paddingTop: 12,
  },
});
