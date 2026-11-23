import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
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
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  renderIcon,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type RenderIcon,
  type VariantProps,
} from "./types";

export type AccordionVariant = "outline" | "flat" | "ghost";
export type AccordionIconAlign = "start" | "center" | "auto";

export interface AccordionItem {
  id: string;
  title: React.ReactNode;
  content: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: RenderIcon;
  iconAlign?: AccordionIconAlign;
  disabled?: boolean;
}

export interface AccordionIndicatorProps {
  expanded: boolean;
  color: string;
  size: number;
}

export interface AccordionAnimatedContentProps {
  expanded: boolean;
  children: React.ReactNode;
  duration: number;
  style?: StyleProp<ViewStyle>;
}

export interface AccordionAnimatedIndicatorProps {
  expanded: boolean;
  children: React.ReactNode;
  duration: number;
  style?: StyleProp<ViewStyle>;
}

export interface AccordionAnimationComponents {
  Content?: React.ComponentType<AccordionAnimatedContentProps>;
  Indicator?: React.ComponentType<AccordionAnimatedIndicatorProps>;
}

export type AccordionIndicator =
  | React.ReactNode
  | ((props: AccordionIndicatorProps) => React.ReactNode);

export interface AccordionProps
  extends VariantProps<AccordionVariant>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  openIds?: string[];
  onOpenChange?: (openIds: string[]) => void;
  disabled?: boolean;
  animationDuration?: number;
  animationComponents?: AccordionAnimationComponents;
  indicator?: AccordionIndicator;
  iconAlign?: AccordionIconAlign;
  itemStyle?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

function renderDefaultIndicator(
  indicator: AccordionIndicator | undefined,
  expanded: boolean,
  color: string,
  size: number,
) {
  if (typeof indicator === "function") {
    return indicator({ expanded, color, size });
  }
  if (indicator) {
    return indicator;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

const DefaultAccordionContent = React.memo(function DefaultAccordionContent({
  expanded,
  children,
  duration,
  style,
}: AccordionAnimatedContentProps) {
  const reducedMotion = useReducedMotion();
  const measuredHeight = useSharedValue(0);
  const progress = useSharedValue(expanded ? 1 : 0);
  const [useAbsoluteInner, setUseAbsoluteInner] = useState(!expanded);

  useEffect(() => {
    if (reducedMotion || duration <= 0) {
      progress.value = expanded ? 1 : 0;
      return;
    }

    progress.value = withTiming(expanded ? 1 : 0, {
      duration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [duration, expanded, progress, reducedMotion]);

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

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      if (nextHeight > 0 && Math.abs(measuredHeight.value - nextHeight) > 0.5) {
        measuredHeight.value = nextHeight;
        setUseAbsoluteInner(true);
      }
    },
    [measuredHeight],
  );

  return (
    <Animated.View
      pointerEvents={expanded ? "auto" : "none"}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "yes" : "no-hide-descendants"}
      style={[styles.contentMask, maskAnimatedStyle]}
    >
      <Animated.View
        style={[
          useAbsoluteInner ? styles.measuredAbsolute : undefined,
          innerAnimatedStyle,
          style,
        ]}
        onLayout={handleLayout}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
});

const DefaultAccordionIndicator = React.memo(function DefaultAccordionIndicator({
  expanded,
  children,
  duration,
  style,
}: AccordionAnimatedIndicatorProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(expanded ? 1 : 0);

  useEffect(() => {
    progress.value =
      reducedMotion || duration <= 0
        ? expanded
          ? 1
          : 0
        : withTiming(expanded ? 1 : 0, {
            duration,
            easing: Easing.bezier(...ANIMATION_TIMING.bezier),
          });
  }, [duration, expanded, progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
});

export const Accordion = React.memo(function Accordion({
  items,
  variant = "outline",
  allowMultiple = false,
  defaultOpenIds = [],
  openIds,
  onOpenChange,
  disabled = false,
  animated = true,
  glass = false,
  haptic = true,
  animationDuration = 240,
  animationComponents,
  indicator,
  iconAlign = "auto",
  itemStyle,
  headerStyle,
  titleStyle,
  subtitleStyle,
  contentStyle,
  style,
}: AccordionProps) {
  const { colors, components, radii, spacing, typography } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const [internalOpenIds, setInternalOpenIds] = useState(defaultOpenIds);
  const activeOpenIds = openIds ?? internalOpenIds;

  const openSet = useMemo(() => new Set(activeOpenIds), [activeOpenIds]);

  const setNextOpenIds = useCallback(
    (nextOpenIds: string[]) => {
      if (openIds === undefined) {
        setInternalOpenIds(nextOpenIds);
      }
      onOpenChange?.(nextOpenIds);
    },
    [onOpenChange, openIds],
  );

  const AnimatedContent =
    animationComponents?.Content ?? DefaultAccordionContent;
  const AnimatedIndicator =
    animationComponents?.Indicator ?? DefaultAccordionIndicator;

  const isFlat = variant === "flat";
  const isGhost = variant === "ghost";

  const toggleItem = useCallback(
    (item: AccordionItem) => {
      if (disabled || item.disabled) return;

      if (haptic) triggerHaptic("selection");
      const expanded = openSet.has(item.id);
      const nextOpenIds = expanded
        ? activeOpenIds.filter((id) => id !== item.id)
        : allowMultiple
          ? [...activeOpenIds, item.id]
          : [item.id];

      setNextOpenIds(nextOpenIds);
    },
    [activeOpenIds, allowMultiple, disabled, haptic, openSet, setNextOpenIds],
  );

  return (
    <View style={[{ gap: isGhost ? 0 : spacing.sm }, style]}>
      {items.map((item, index) => {
        const expanded = openSet.has(item.id);
        const itemDisabled = Boolean(disabled || item.disabled);

        const itemBg = glass
          ? colors.glassSurface
          : isGhost
            ? "transparent"
            : isFlat
              ? colors.surfaceMuted
              : colors.surface;

        const itemBorderColor = glass
          ? colors.glassBorder
          : isGhost
            ? colors.borderMuted
            : isFlat
              ? "transparent"
              : expanded
                ? colors.primary
                : colors.border;

        const borderWidth = isGhost || isFlat ? 0 : components.borderWidth.default;
        const borderBottomWidth =
          isGhost && index < items.length - 1
            ? components.borderWidth.default
            : borderWidth;

        const resolvedAlign = item.iconAlign ?? iconAlign;
        const isTopAligned =
          resolvedAlign === "start" ||
          (resolvedAlign === "auto" && item.subtitle !== undefined);

        return (
          <View
            key={item.id}
            style={[
              styles.itemContainer,
              {
                backgroundColor: itemBg,
                borderRadius: isGhost ? 0 : radii.lg,
                borderWidth,
                borderBottomWidth,
                borderColor: itemBorderColor,
                opacity: itemDisabled ? 0.58 : 1,
              },
              itemStyle,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded, disabled: itemDisabled }}
              disabled={itemDisabled}
              onPress={() => toggleItem(item)}
              style={({ pressed }) => [
                styles.header,
                {
                  padding: spacing.lg,
                  gap: spacing.md,
                  alignItems: isTopAligned ? "flex-start" : "center",
                  backgroundColor:
                    pressed && !itemDisabled
                      ? colors.backgroundMuted
                      : "transparent",
                },
                headerStyle,
              ]}
            >
              {item.icon ? (
                <View
                  style={[
                    styles.iconWrap,
                    isTopAligned ? styles.topAlignedIcon : undefined,
                  ]}
                >
                  {renderIcon(
                    item.icon,
                    expanded ? colors.primary : colors.textMuted,
                    20,
                  )}
                </View>
              ) : null}

              <View style={[styles.headerTextWrap, { gap: spacing.xxs }]}>
                {typeof item.title === "string" || typeof item.title === "number" ? (
                  <Text
                    style={[
                      typography.subtitle,
                      { color: expanded ? colors.primary : colors.text },
                      titleStyle,
                    ]}
                  >
                    {item.title}
                  </Text>
                ) : (
                  item.title
                )}

                {item.subtitle !== undefined ? (
                  typeof item.subtitle === "string" ||
                  typeof item.subtitle === "number" ? (
                    <Text
                      style={[
                        typography.bodySmall,
                        { color: colors.textMuted },
                        subtitleStyle,
                      ]}
                    >
                      {item.subtitle}
                    </Text>
                  ) : (
                    item.subtitle
                  )
                ) : null}
              </View>

              <View
                style={[
                  styles.indicatorWrap,
                  isTopAligned ? styles.topAlignedIndicator : undefined,
                ]}
              >
                {shouldAnimate ? (
                  <AnimatedIndicator
                    expanded={expanded}
                    duration={animationDuration}
                  >
                    {renderDefaultIndicator(
                      indicator,
                      expanded,
                      expanded ? colors.primary : colors.textMuted,
                      18,
                    )}
                  </AnimatedIndicator>
                ) : (
                  renderDefaultIndicator(
                    indicator,
                    expanded,
                    expanded ? colors.primary : colors.textMuted,
                    18,
                  )
                )}
              </View>
            </Pressable>

            {shouldAnimate ? (
              <AnimatedContent
                expanded={expanded}
                duration={animationDuration}
                style={[
                  {
                    borderTopWidth: isGhost
                      ? 0
                      : components.borderWidth.default,
                    borderTopColor: colors.borderMuted,
                    padding: spacing.lg,
                  },
                  contentStyle,
                ]}
              >
                {typeof item.content === "string" ||
                typeof item.content === "number" ? (
                  <Text variant="body" color="textMuted">
                    {item.content}
                  </Text>
                ) : (
                  item.content
                )}
              </AnimatedContent>
            ) : (
              expanded && (
                <View
                  style={[
                    {
                      borderTopWidth: isGhost
                        ? 0
                        : components.borderWidth.default,
                      borderTopColor: colors.borderMuted,
                      padding: spacing.lg,
                    },
                    contentStyle,
                  ]}
                >
                  {typeof item.content === "string" ||
                  typeof item.content === "number" ? (
                    <Text variant="body" color="textMuted">
                      {item.content}
                    </Text>
                  ) : (
                    item.content
                  )}
                </View>
              )
            )}
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  itemContainer: {
    overflow: "hidden",
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  topAlignedIcon: {
    marginTop: 4,
  },
  indicatorWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  topAlignedIndicator: {
    marginTop: 2,
  },
  contentMask: {
    overflow: "hidden",
  },
  measuredAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
