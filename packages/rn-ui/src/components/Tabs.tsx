import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
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
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveToneColors,
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

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

/**
 * - `line`: underline indicator.
 * - `pill`: raised surface pill inside a muted track.
 * - `soft`: translucent tone-tinted pill.
 * - `flush`: solid tone-filled capsule hugging a full-capsule track edge
 *   (2px concentric inset) with high-contrast `on` label color.
 */
export type TabsVariant = "line" | "pill" | "soft" | "flush";

const FLUSH_INSET = 2;

const TRIGGER_METRICS: Record<
  ComponentSize,
  {
    minHeight: number;
    paddingVertical: number;
    paddingHorizontal: number;
    iconSize: number;
    fontSize: number;
  }
> = {
  xs: { minHeight: 28, paddingVertical: 4, paddingHorizontal: 10, iconSize: 12, fontSize: 12 },
  sm: { minHeight: 34, paddingVertical: 6, paddingHorizontal: 12, iconSize: 14, fontSize: 13 },
  md: { minHeight: 40, paddingVertical: 9, paddingHorizontal: 14, iconSize: 16, fontSize: 14 },
  lg: { minHeight: 44, paddingVertical: 12, paddingHorizontal: 18, iconSize: 18, fontSize: 16 },
  xl: { minHeight: 48, paddingVertical: 13, paddingHorizontal: 22, iconSize: 20, fontSize: 17 },
};
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
  unregisterTabLayout: (val: string) => void;
  registerTabKey: (val: string) => void;
  tabLayouts: Record<string, TabLayout>;
}

const TabsContext = createContext<TabsContextValue | null>(null);
const TabsListContext = createContext<{ fullWidth: boolean }>({
  fullWidth: false,
});

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(
      "Tabs compound components must be rendered inside a <Tabs> container.",
    );
  }
  return context;
}

export const Tabs = React.memo(function Tabs({
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
  const prevValueRef = useRef<string>(activeValue);

  const computeDirection = useCallback(
    (fromVal: string, toVal: string) => {
      const prevLayout = tabLayouts[fromVal];
      const nextLayout = tabLayouts[toVal];
      if (prevLayout && nextLayout && prevLayout.x !== nextLayout.x) {
        return nextLayout.x > prevLayout.x ? 1 : -1;
      }
      const prevIdx = tabKeys.indexOf(fromVal);
      const nextIdx = tabKeys.indexOf(toVal);
      if (prevIdx !== -1 && nextIdx !== -1) {
        return nextIdx >= prevIdx ? 1 : -1;
      }
      return 1;
    },
    [tabKeys, tabLayouts],
  );

  useEffect(() => {
    if (prevValueRef.current !== activeValue) {
      setDirection(computeDirection(prevValueRef.current, activeValue));
      setTabChangeCount((c) => c + 1);
      prevValueRef.current = activeValue;
    }
  }, [activeValue, computeDirection]);

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

  const unregisterTabLayout = useCallback((val: string) => {
    setTabLayouts((prev) => {
      if (!(val in prev)) return prev;
      const next = { ...prev };
      delete next[val];
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (newVal: string) => {
      if (newVal === activeValue) return;
      if (haptic) triggerHaptic("selection");

      if (value === undefined) {
        setDirection(computeDirection(activeValue, newVal));
        setTabChangeCount((c) => c + 1);
        prevValueRef.current = newVal;
        setInternalValue(newVal);
      }
      onValueChange?.(newVal);
    },
    [activeValue, computeDirection, haptic, onValueChange, value],
  );

  const contextValue = useMemo<TabsContextValue>(
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
      unregisterTabLayout,
      registerTabKey,
      tabLayouts,
    }),
    [
      activeValue,
      animated,
      direction,
      glass,
      handleSelect,
      haptic,
      registerTabKey,
      registerTabLayout,
      size,
      tabChangeCount,
      tabLayouts,
      tone,
      transition,
      unregisterTabLayout,
      variant,
    ],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <View style={[styles.root, style]}>{children}</View>
    </TabsContext.Provider>
  );
});

export interface TabsListProps {
  scrollable?: boolean;
  /** Stretch triggers evenly across the available width (non-scrollable only). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export const TabsList = React.memo(function TabsList({
  scrollable = false,
  fullWidth = false,
  style,
  indicatorStyle,
  children,
}: TabsListProps) {
  const { colors, components, radii, shadows, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const { value, variant, tone, glass, tabLayouts, animated } =
    useTabsContext();

  const shouldAnimate = animated && !reducedMotion;
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);
  const hasInitializedRef = useRef(false);

  const activeLayout = tabLayouts[value];

  useEffect(() => {
    if (!activeLayout || activeLayout.width <= 0) return;

    if (!hasInitializedRef.current || !shouldAnimate) {
      hasInitializedRef.current = true;
      indicatorX.value = activeLayout.x;
      indicatorWidth.value = activeLayout.width;
      indicatorOpacity.value = 1;
      return;
    }

    indicatorX.value = withTiming(activeLayout.x, {
      duration: 200,
      easing: EASE_IN_OUT,
    });
    indicatorWidth.value = withTiming(activeLayout.width, {
      duration: 200,
      easing: EASE_IN_OUT,
    });
    indicatorOpacity.value = withTiming(1, { duration: 140 });
  }, [
    activeLayout,
    indicatorOpacity,
    indicatorWidth,
    indicatorX,
    shouldAnimate,
  ]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  const activeColor = resolveToneColors(tone, colors).solid;
  const isPill = variant === "pill";
  const isSoft = variant === "soft";
  const isFlush = variant === "flush";
  const stretch = fullWidth && !scrollable;
  const listContextValue = useMemo(() => ({ fullWidth: stretch }), [stretch]);

  const listBg = glass
    ? colors.glassSurface
    : isFlush
      ? colors.backgroundMuted
      : isPill || isSoft
        ? colors.surfaceMuted
        : "transparent";

  const pillActiveBg = glass
    ? colors.glassSurfaceStrong
    : isDark
      ? colors.surfaceRaised
      : colors.surface;

  const content = (
    <View
      accessibilityRole="tablist"
      style={[
        styles.listContainer,
        stretch && styles.listStretch,
        isFlush && {
          backgroundColor: listBg,
          borderRadius: radii.full,
          borderCurve: "continuous",
          padding: FLUSH_INSET,
          borderWidth: glass
            ? components.borderWidth.default
            : components.borderWidth.hairline,
          borderColor: glass ? colors.glassBorder : colors.border,
          overflow: "hidden",
        },
        isPill && {
          backgroundColor: listBg,
          borderRadius: radii.lg,
          borderCurve: "continuous",
          padding: 4,
          borderWidth: glass ? components.borderWidth.default : 0,
          borderColor: glass ? colors.glassBorder : "transparent",
        },
        isSoft && {
          backgroundColor: listBg,
          borderRadius: radii.md,
          borderCurve: "continuous",
          padding: 3,
          borderWidth: glass ? components.borderWidth.default : 0,
          borderColor: glass ? colors.glassBorder : "transparent",
        },
        variant === "line" && {
          borderBottomWidth: components.borderWidth.default,
          borderBottomColor: glass ? colors.glassBorder : colors.borderMuted,
        },
        !scrollable && style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicatorBase,
          variant === "line" && {
            bottom: 0,
            height: 2.5,
            backgroundColor: activeColor,
            borderRadius: radii.full,
          },
          isFlush && {
            top: FLUSH_INSET,
            bottom: FLUSH_INSET,
            backgroundColor: activeColor,
            borderRadius: radii.full,
            borderCurve: "continuous",
          },
          isPill && [
            {
              top: 4,
              bottom: 4,
              backgroundColor: pillActiveBg,
              borderRadius: Math.max(radii.xs, radii.lg - 4),
              borderCurve: "continuous",
              borderWidth: isDark ? components.borderWidth.hairline : 0,
              borderColor: isDark ? colors.border : "transparent",
            },
            shadows.sm,
          ],
          isSoft && {
            top: 3,
            bottom: 3,
            backgroundColor: withAlpha(activeColor, isDark ? 0.24 : 0.14),
            borderRadius: Math.max(radii.xs, radii.md - 3),
            borderCurve: "continuous",
          },
          animatedIndicatorStyle,
          indicatorStyle,
        ]}
      />
      <TabsListContext.Provider value={listContextValue}>
        {children}
      </TabsListContext.Provider>
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, style]}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
});

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

export const TabsTrigger = React.memo(function TabsTrigger({
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
    unregisterTabLayout,
    registerTabKey,
  } = useTabsContext();
  const { fullWidth } = useContext(TabsListContext);

  useEffect(() => {
    registerTabKey(value);
    return () => {
      unregisterTabLayout(value);
    };
  }, [registerTabKey, unregisterTabLayout, value]);

  const isSelected = activeValue === value;

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { x, width } = e.nativeEvent.layout;
      registerTabLayout(value, { x, width });
    },
    [registerTabLayout, value],
  );

  const toneColors = resolveToneColors(tone, colors);
  const activeColor = toneColors.solid;
  const isFlush = variant === "flush";
  const { minHeight, paddingVertical, paddingHorizontal, iconSize, fontSize } =
    TRIGGER_METRICS[size] ?? TRIGGER_METRICS.md;

  const textColor = isSelected
    ? isFlush
      ? toneColors.on
      : variant === "line" || variant === "soft"
        ? activeColor
        : colors.text
    : colors.textMuted;

  return (
    <Pressable
      onLayout={handleLayout}
      disabled={disabled}
      hitSlop={minTouchHitSlop(36)}
      onPress={() => onSelect(value)}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected, disabled }}
      style={[
        styles.trigger,
        {
          minHeight,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled ? 0.45 : 1,
        },
        fullWidth && styles.triggerStretch,
        style,
      ]}
    >
      {icon ? renderIcon(icon, textColor, iconSize) : null}
      {typeof children === "string" || typeof children === "number" ? (
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
      {badge !== undefined ? (
        <Badge
          size="sm"
          tone={isSelected ? tone : "secondary"}
          variant={isSelected && !isFlush ? "filled" : "soft"}
        >
          {String(badge)}
        </Badge>
      ) : null}
    </Pressable>
  );
});

export interface TabsContentProps {
  value: string;
  lazy?: boolean;
  transition?: TabsTransition;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export const TabsContent = React.memo(function TabsContent({
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
  const isInitial = tabChangeCount === 0;

  const shouldSlide =
    animated && !reduced && effectiveTransition === "slide" && !isInitial;
  const shouldScale =
    animated && !reduced && effectiveTransition === "scale" && !isInitial;

  const initialOpacity = isSelected ? (isInitial || !animated || reduced ? 1 : 0) : 0;
  const initialTranslateX = shouldSlide ? direction * 14 : 0;
  const initialScale = shouldScale ? 0.96 : 1;

  const contentOpacity = useSharedValue(initialOpacity);
  const contentTranslateX = useSharedValue(initialTranslateX);
  const contentScale = useSharedValue(initialScale);

  useEffect(() => {
    if (!isSelected) {
      contentOpacity.value = 0;
      return;
    }

    if (!animated || reduced || effectiveTransition === "none" || isInitial) {
      contentOpacity.value = 1;
      contentTranslateX.value = 0;
      contentScale.value = 1;
      return;
    }

    if (effectiveTransition === "slide") {
      contentTranslateX.value = direction * 14;
      contentOpacity.value = 0;
      contentTranslateX.value = withTiming(0, {
        duration: ANIMATION_TIMING.transition + 30,
        easing: EASE_OUT,
      });
      contentOpacity.value = withTiming(1, {
        duration: ANIMATION_TIMING.transition + 30,
        easing: EASE_OUT,
      });
    } else if (effectiveTransition === "scale") {
      contentScale.value = 0.96;
      contentOpacity.value = 0;
      contentScale.value = withTiming(1, {
        duration: ANIMATION_TIMING.transition + 30,
        easing: EASE_OUT,
      });
      contentOpacity.value = withTiming(1, {
        duration: ANIMATION_TIMING.transition + 30,
        easing: EASE_OUT,
      });
    } else {
      contentOpacity.value = 0;
      contentOpacity.value = withTiming(1, {
        duration: ANIMATION_TIMING.transition,
        easing: EASE_OUT,
      });
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
    opacity: contentOpacity.value,
    transform: [
      { translateX: contentTranslateX.value },
      { scale: contentScale.value },
    ],
  }));

  if (!isSelected && lazy) {
    return null;
  }

  return (
    <Animated.View
      accessibilityElementsHidden={!isSelected}
      importantForAccessibility={isSelected ? "yes" : "no-hide-descendants"}
      style={[
        styles.content,
        !isSelected && styles.hiddenContent,
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
  },
  listContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  listStretch: {
    width: "100%",
  },
  indicatorBase: {
    position: "absolute",
    left: 0,
    zIndex: 0,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 1,
  },
  triggerStretch: {
    flex: 1,
  },
  content: {
    width: "100%",
    paddingTop: 12,
  },
  hiddenContent: {
    display: "none",
  },
});
