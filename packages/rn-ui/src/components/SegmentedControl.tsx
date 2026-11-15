import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Badge } from "./Badge";
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
} from "./types";
import { Text } from "./Text";

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

/**
 * Cupertino-style SegmentedControl with fluid sliding pill spring animation
 */
export function SegmentedControl({
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
  const { colors, radii, isDark } = useTheme();

  const options = useMemo<SegmentedOption[]>(() => {
    return values.map((item) => {
      if (typeof item === "string") {
        return { label: item, value: item };
      }
      return item;
    });
  }, [values]);

  const isControlled = selectedIndex !== undefined;
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const activeIndex = isControlled ? selectedIndex : internalIndex;

  const [containerWidth, setContainerWidth] = useState(0);

  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const padding = 3;
  const count = options.length;

  useEffect(() => {
    if (containerWidth > 0 && count > 0) {
      const innerWidth = containerWidth - padding * 2;
      const segmentW = innerWidth / count;
      const targetX = padding + activeIndex * segmentW;

      if (!animated) {
        indicatorX.value = targetX;
        indicatorWidth.value = segmentW;
      } else {
        indicatorX.value = withSpring(targetX, {
          duration: 240,
          dampingRatio: 1,
          overshootClamping: true,
        });
        indicatorWidth.value = withSpring(segmentW, {
          duration: 240,
          dampingRatio: 1,
          overshootClamping: true,
        });
      }
    }
  }, [activeIndex, animated, containerWidth, count, indicatorWidth, indicatorX]);

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

  const height = size === "sm" ? 32 : size === "lg" ? 44 : 38;

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) =>
        setContainerWidth(e.nativeEvent.layout.width)
      }
      style={[
        {
          height,
          flexDirection: "row",
          backgroundColor: glass
            ? withAlpha(isDark ? (colors.surfaceRaised ?? colors.surface) : colors.surface, 0.72)
            : isDark
              ? "rgba(30, 41, 59, 0.85)"
              : colors.backgroundMuted,
          borderRadius: radii.lg,
          padding,
          position: "relative",
          alignItems: "center",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: glass ? withAlpha(colors.border, 0.5) : colors.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {/* Sliding Pill Indicator */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: padding,
            bottom: padding,
            borderRadius: radii.md,
            backgroundColor: isDark
              ? colors.surfaceRaised ?? colors.surface
              : colors.surface,
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.12,
            shadowRadius: 2.5,
            elevation: 2,
            zIndex: 1,
          },
          indicatorAnimatedStyle,
          indicatorStyle,
        ]}
      />

      {/* Segment Buttons */}
      {options.map((option, idx) => {
        const isSelected = activeIndex === idx;
        const isOptionDisabled = disabled || option.disabled;
        const toneColor = tone && tone !== "default" ? colors[tone] : colors.primary;

        return (
          <Pressable
            key={`${option.value}-${idx}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected, disabled: isOptionDisabled }}
            accessibilityLabel={option.label}
            disabled={isOptionDisabled}
            onPress={() => handleSelect(idx)}
            style={[
              {
                flex: 1,
                height: "100%",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 8,
                zIndex: 2,
                gap: 5,
                opacity: isOptionDisabled ? 0.4 : 1,
              },
              segmentStyle,
            ]}
          >
            {option.icon &&
              renderIcon(
                option.icon,
                isSelected ? toneColor : colors.textMuted,
                size === "sm" ? 14 : size === "lg" ? 18 : 16,
              )}

            <Text
              style={[
                {
                  fontSize: size === "sm" ? 12 : size === "lg" ? 14 : 13,
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected ? toneColor : colors.textMuted,
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
                size="sm"
                tone={isSelected ? tone : "secondary"}
                variant={isSelected ? "solid" : "soft"}
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
