import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";
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
} from "./types";

export interface SegmentedOption {
  label: string;
  value: string;
  icon?: RenderIcon;
  badge?: string | number;
  disabled?: boolean;
}

export interface SegmentedControlProps
  extends ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  values: (string | SegmentedOption)[];
  selectedIndex?: number;
  defaultIndex?: number;
  onChange?: (index: number, value: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  segmentStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  activeLabelStyle?: StyleProp<TextStyle>;
}

function SegmentedControlComponent({
  values,
  selectedIndex,
  defaultIndex = 0,
  onChange,
  size = "md",
  tone = "primary",
  disabled = false,
  haptic = true,
  animated = true,
  glass = false,
  style,
  segmentStyle,
  indicatorStyle,
  labelStyle,
  activeLabelStyle,
}: SegmentedControlProps) {
  const { colors, components, radii, shadows, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const options = useMemo<SegmentedOption[]>(
    () =>
      values.map((item) =>
        typeof item === "string" ? { label: item, value: item } : item,
      ),
    [values],
  );

  const count = options.length;
  const maxIndex = Math.max(0, count - 1);
  const clampIndex = useCallback(
    (idx: number) => Math.max(0, Math.min(idx, maxIndex)),
    [maxIndex],
  );

  const isControlled = selectedIndex !== undefined;
  const [internalIndex, setInternalIndex] = useState(() =>
    clampIndex(defaultIndex),
  );
  const activeIndex = clampIndex(isControlled ? selectedIndex : internalIndex);

  const [containerWidth, setContainerWidth] = useState(0);
  const hasPositionedRef = useRef(false);

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const segTokens = components.segmentedControl;
  const padding = segTokens.padding;
  const height = segTokens.height[size];
  const iconSize = segTokens.iconSize[size];
  const fontSize = segTokens.fontSize[size];

  useEffect(() => {
    if (containerWidth <= 0 || count <= 0) return;

    const innerWidth = Math.max(0, containerWidth - padding * 2);
    const segmentW = innerWidth / count;
    const targetX = padding + activeIndex * segmentW;

    if (!shouldAnimate || !hasPositionedRef.current) {
      hasPositionedRef.current = true;
      cancelAnimation(indicatorX);
      cancelAnimation(indicatorWidth);
      indicatorX.value = targetX;
      indicatorWidth.value = segmentW;
      return;
    }

    const timingConfig = {
      duration: ANIMATION_TIMING.transition,
      easing: Easing.bezier(...ANIMATION_TIMING.bezier),
    };
    indicatorX.value = withTiming(targetX, timingConfig);
    indicatorWidth.value = withTiming(segmentW, timingConfig);
  }, [
    activeIndex,
    containerWidth,
    count,
    indicatorWidth,
    indicatorX,
    padding,
    shouldAnimate,
  ]);

  useEffect(() => {
    return () => {
      cancelAnimation(indicatorX);
      cancelAnimation(indicatorWidth);
    };
  }, [indicatorWidth, indicatorX]);

  const handleSelect = useCallback(
    (index: number) => {
      if (disabled || options[index]?.disabled) return;
      if (haptic) {
        triggerHaptic("selection");
      }
      if (!isControlled) {
        setInternalIndex(index);
      }
      onChange?.(index, options[index]?.value ?? "");
    },
    [disabled, haptic, isControlled, onChange, options],
  );

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value > 0 ? indicatorWidth.value : undefined,
  }));

  const toneColors = resolveToneColors(tone, colors);
  const activeTextColor =
    tone === "warning" && !isDark ? "#92400E" : toneColors.solid;
  const hitSlop = minTouchHitSlop(height);

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) =>
        setContainerWidth(e.nativeEvent.layout.width)
      }
      style={[
        styles.container,
        {
          height,
          backgroundColor: glass ? colors.glassSurface : colors.backgroundMuted,
          borderRadius: radii.lg,
          padding,
          borderWidth: components.borderWidth.default,
          borderColor: glass ? colors.glassBorder : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.indicator,
          shadows.sm,
          {
            top: padding,
            bottom: padding,
            borderRadius: radii.md,
            backgroundColor: isDark ? colors.surfaceRaised : colors.surface,
          },
          indicatorAnimatedStyle,
          indicatorStyle,
        ]}
      />

      {options.map((option, idx) => {
        const isSelected = activeIndex === idx;
        const isOptionDisabled = disabled || option.disabled;

        return (
          <Pressable
            key={`${option.value}-${idx}`}
            accessibilityRole="tab"
            accessibilityState={{
              selected: isSelected,
              disabled: isOptionDisabled,
            }}
            accessibilityLabel={option.label}
            disabled={isOptionDisabled}
            hitSlop={hitSlop}
            onPress={() => handleSelect(idx)}
            style={[
              styles.segment,
              { opacity: isOptionDisabled ? 0.45 : 1 },
              segmentStyle,
            ]}
          >
            {option.icon
              ? renderIcon(
                  option.icon,
                  isSelected ? activeTextColor : colors.textMuted,
                  iconSize,
                )
              : null}

            <Text
              numberOfLines={1}
              style={[
                {
                  fontSize,
                  lineHeight: Math.round(fontSize * 1.25),
                  fontWeight: isSelected ? "600" : "500",
                  color: isSelected ? activeTextColor : colors.textMuted,
                  textAlign: "center",
                },
                labelStyle,
                isSelected && activeLabelStyle,
              ]}
            >
              {option.label}
            </Text>

            {option.badge !== undefined && (
              <Badge
                size="xs"
                tone={isSelected ? tone : "secondary"}
                variant={isSelected ? "filled" : "soft"}
              >
                {String(option.badge)}
              </Badge>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export const SegmentedControl = React.memo(SegmentedControlComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    position: "relative",
    alignItems: "center",
  },
  indicator: {
    position: "absolute",
    left: 0,
    zIndex: 1,
  },
  segment: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    zIndex: 2,
    gap: 5,
  },
});
