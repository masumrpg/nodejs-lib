import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
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
import Svg, { Path } from "react-native-svg";

import { Portal, useTheme, type ThemeColors } from "../theme";
import {
  computeAnchoredPosition,
  measureAnchorNode,
  useDelayedUnmount,
  withAlpha,
  type AnchorMeasurement,
} from "../utils";
import { triggerHaptic } from "../utils/haptics";
import { useFormField } from "./FormField";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  type BaseGlassProps,
  type BaseHapticProps,
  type RenderIcon,
  type SizeProps,
  type VariantProps,
} from "./types";

export type SelectVariant = "outline" | "filled" | "soft";
export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps
  extends BaseGlassProps,
    BaseHapticProps,
    VariantProps<SelectVariant>,
    SizeProps<SelectSize> {
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  maxHeight?: number;
  accessibilityLabel?: string;
  onValueChange?: (value: string) => void;
  chevronIcon?: RenderIcon;
  checkIcon?: RenderIcon;
  style?: StyleProp<ViewStyle>;
}

const selectHeights: Record<SelectSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

const selectPaddingX: Record<SelectSize, number> = {
  sm: 10,
  md: 12,
  lg: 14,
};

function getSelectTriggerColors(
  variant: SelectVariant,
  open: boolean,
  glass: boolean,
  isDisabled: boolean,
  colors: ThemeColors,
  outlineBorderColor: "border" | "tone",
) {
  if (isDisabled) {
    return {
      backgroundColor: withAlpha(colors.disabled, 0.72),
      borderColor: colors.disabled,
    };
  }
  if (glass) {
    return {
      backgroundColor: colors.glassSurface,
      borderColor: open ? colors.primary : colors.glassBorder,
    };
  }
  if (variant === "filled") {
    return {
      backgroundColor: colors.surfaceMuted,
      borderColor: open ? colors.primary : colors.surfaceMuted,
    };
  }
  if (variant === "soft") {
    return {
      backgroundColor: colors.primarySoft,
      borderColor: open
        ? colors.primary
        : outlineBorderColor === "border"
          ? colors.border
          : withAlpha(colors.primary, 0.25),
    };
  }
  return {
    backgroundColor: colors.input,
    borderColor: open ? colors.primary : colors.border,
  };
}

export const Select = React.memo(function Select({
  value,
  defaultValue,
  options,
  placeholder = "Select an option",
  disabled = false,
  glass = false,
  haptic = true,
  variant = "outline",
  size = "md",
  maxHeight = 280,
  accessibilityLabel,
  onValueChange,
  chevronIcon,
  checkIcon,
  style,
}: SelectProps) {
  const { colors, components, radii, shadows, spacing } = useTheme();
  const field = useFormField();
  const isDisabled = disabled || Boolean(field?.disabled);
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);

  const shouldMountMenu = useDelayedUnmount(
    open,
    reducedMotion ? 0 : ANIMATION_TIMING.transition,
  );
  const progress = useSharedValue(0);

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = useMemo(
    () => options.find((item) => item.value === currentValue),
    [currentValue, options],
  );

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

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  const openMenu = useCallback(() => {
    if (isDisabled) return;
    if (haptic) triggerHaptic("selection");
    measureAnchorNode(triggerRef, (rect) => {
      setAnchor(rect);
    });
    setOpen(true);
  }, [haptic, isDisabled]);

  const handleSelect = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return;
      if (haptic) triggerHaptic("selection");
      if (value === undefined) {
        setInternalValue(option.value);
      }
      onValueChange?.(option.value);
      setOpen(false);
    },
    [haptic, onValueChange, value],
  );

  const height = selectHeights[size];
  const paddingHorizontal = selectPaddingX[size];
  const triggerShadow = !isDisabled
    ? shadows[components.surface.inputShadow]
    : shadows.none;
  const triggerPalette = getSelectTriggerColors(
    variant,
    open,
    glass,
    isDisabled,
    colors,
    components.surface.outlineBorderColor,
  );

  const menuWidth = Math.max(220, anchor?.width ?? windowWidth - spacing.md * 2);
  const estimatedHeight = Math.min(maxHeight, Math.max(64, options.length * 50 + 16));
  const resolvedAnchor: AnchorMeasurement = anchor ?? {
    x: spacing.md,
    y: windowHeight * 0.25,
    width: menuWidth,
    height: selectHeights[size],
  };
  const coords = computeAnchoredPosition({
    anchor: resolvedAnchor,
    contentWidth: menuWidth,
    contentHeight: estimatedHeight,
    windowWidth,
    windowHeight,
    preferredPlacement: "bottom",
    align: "start",
    offset: 6,
    viewportPadding: spacing.md,
  });

  const isTopPlacement = coords.resolvedPlacement === "top";
  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: isTopPlacement
          ? (1 - progress.value) * 6
          : (1 - progress.value) * -6,
      },
      { scale: 0.96 + progress.value * 0.04 },
    ],
  }));

  const renderOption = useCallback(
    ({ item }: ListRenderItemInfo<SelectOption>) => {
      const active = item.value === currentValue;
      return (
        <Pressable
          accessibilityRole="menuitem"
          accessibilityState={{
            selected: active,
            disabled: Boolean(item.disabled),
          }}
          disabled={item.disabled}
          onPress={() => handleSelect(item)}
          style={({ pressed }) => [
            styles.optionItem,
            {
              backgroundColor: active
                ? colors.primarySoft
                : pressed
                  ? colors.surfaceMuted
                  : "transparent",
              opacity: item.disabled ? 0.5 : 1,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
            },
          ]}
        >
          <View style={styles.optionTextContainer}>
            <Text
              variant="label"
              color={active ? "primary" : "text"}
              weight={active ? "600" : "400"}
            >
              {item.label}
            </Text>
            {item.description ? (
              <Text variant="caption" color="textMuted">
                {item.description}
              </Text>
            ) : null}
          </View>
          {active
            ? checkIcon
              ? renderIcon(checkIcon, colors.primary, 16)
              : (
                  <Svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M20 6L9 17l-5-5" />
                  </Svg>
                )
            : null}
        </Pressable>
      );
    },
    [checkIcon, colors.primary, colors.primarySoft, colors.surfaceMuted, currentValue, handleSelect, spacing.md, spacing.sm],
  );

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? selectedOption?.label ?? placeholder}
          accessibilityState={{ disabled: isDisabled, expanded: open }}
          disabled={isDisabled}
          hitSlop={minTouchHitSlop(height)}
          onPress={() => {
            if (open) {
              closeMenu();
            } else {
              openMenu();
            }
          }}
          style={({ pressed }) => [
            styles.trigger,
            {
              height,
              paddingHorizontal,
              borderRadius: radii.lg,
              borderWidth: open
                ? components.borderWidth.focus
                : components.borderWidth.strong,
              borderColor: triggerPalette.borderColor,
              backgroundColor: triggerPalette.backgroundColor,
              opacity: isDisabled ? 0.6 : pressed ? 0.92 : 1,
            },
            triggerShadow,
            style,
          ]}
        >
          <Text
            variant={size === "sm" ? "bodySmall" : "body"}
            color={selectedOption ? "text" : "placeholder"}
            numberOfLines={1}
            style={styles.triggerText}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          {chevronIcon ? (
            renderIcon(
              chevronIcon,
              isDisabled ? colors.textSubtle : colors.textMuted,
              16,
            )
          ) : (
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDisabled ? colors.textSubtle : colors.textMuted}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="m6 9 6 6 6-6" />
            </Svg>
          )}
        </Pressable>
      </View>

      {shouldMountMenu ? (
        <Portal layer="popover">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha("#0F172A", 0.16) },
            ]}
            onPress={() => {
              if (haptic) triggerHaptic("selection");
              closeMenu();
            }}
          />

          <Animated.View
            accessibilityRole="menu"
            style={[
              styles.menu,
              {
                top: coords.top,
                left: coords.left,
                width: menuWidth,
                maxHeight,
                backgroundColor: glass
                  ? colors.glassSurfaceStrong
                  : colors.surface,
                borderRadius: radii.xl,
                borderWidth: components.borderWidth.default,
                borderColor: glass ? colors.glassBorder : colors.border,
              },
              shadows.lg,
              menuAnimatedStyle,
            ]}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={renderOption}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={{ padding: spacing.md }}>
                  <Text variant="bodySmall" color="textMuted" align="center">
                    No options available
                  </Text>
                </View>
              }
            />
          </Animated.View>
        </Portal>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  triggerText: {
    flex: 1,
  },
  menu: {
    position: "absolute",
  },
  optionItem: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  optionTextContainer: {
    flex: 1,
    gap: 2,
  },
});
