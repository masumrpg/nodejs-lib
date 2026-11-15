import React, { useEffect } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
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
import { Text } from "./Text";

export type ChipVariant = "filled" | "outline" | "soft";

export interface ChipProps
  extends VariantProps<ChipVariant>,
    ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  label: string;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onPress?: () => void;
  onClose?: () => void;
  icon?: RenderIcon;
  rightIcon?: RenderIcon;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Filter, input, action, and suggestion Chip / Tag component with Reanimated spring physics
 */
export function Chip({
  label,
  selected = false,
  onSelect,
  onPress,
  onClose,
  icon,
  rightIcon,
  variant = "soft",
  size = "md",
  tone = "primary",
  disabled = false,
  haptic = true,
  animated = true,
  glass = false,
  style,
  textStyle,
}: ChipProps) {
  const { colors, radii } = useTheme();

  const isInteractive = Boolean(onPress || onSelect || onClose);
  const isSelectable = onSelect !== undefined;

  const pressed = useSharedValue(0);
  const selectProgress = useSharedValue(selected ? 1 : 0);
  const isDismissing = useSharedValue(1);

  useEffect(() => {
    selectProgress.value = withTiming(selected ? 1 : 0, {
      duration: 140,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
    });
  }, [selectProgress, selected]);

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      triggerHaptic("selection");
    }
    if (isSelectable) {
      onSelect?.(!selected);
    }
    onPress?.();
  };

  const handleClose = () => {
    if (disabled) return;
    if (haptic) {
      triggerHaptic("selection");
    }
    isDismissing.value = withTiming(
      0,
      { duration: 160, easing: Easing.bezier(0.23, 1, 0.32, 1) },
      (finished) => {
        if (finished && onClose) {
          scheduleOnRN(onClose);
        }
      },
    );
  };

  const toneColor = tone && tone !== "default" ? colors[tone] : colors.primary;
  const onToneColor =
    tone === "primary"
      ? colors.onPrimary
      : tone === "secondary"
        ? colors.onSecondary
        : tone === "accent"
          ? colors.onAccent
          : tone === "success"
            ? colors.onSuccess
            : tone === "warning"
              ? colors.onWarning
              : tone === "danger"
                ? colors.onDanger
                : tone === "info"
                  ? colors.onInfo
                  : colors.textInverse;

  const height = size === "sm" ? 28 : size === "lg" ? 40 : 34;
  const paddingHorizontal = size === "sm" ? 10 : size === "lg" ? 16 : 12;
  const fontSize = size === "sm" ? 12 : size === "lg" ? 14 : 13;
  const iconSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;

  let backgroundColor = colors.surface;
  let textColor = colors.text;
  let borderColor = "transparent";
  let borderWidth = 0;

  if (variant === "filled") {
    if (selected) {
      backgroundColor = toneColor;
      textColor = onToneColor;
    } else {
      backgroundColor = colors.backgroundMuted;
      textColor = colors.text;
    }
  } else if (variant === "outline") {
    borderWidth = 1;
    if (selected) {
      borderColor = toneColor;
      backgroundColor = withAlpha(toneColor, 0.12);
      textColor = toneColor;
    } else {
      borderColor = colors.border;
      backgroundColor = colors.transparent;
      textColor = colors.text;
    }
  } else {
    // Soft / Tonal variant
    if (selected) {
      backgroundColor = withAlpha(toneColor, 0.22);
      textColor = toneColor;
      borderWidth = StyleSheet.hairlineWidth;
      borderColor = withAlpha(toneColor, 0.4);
    } else {
      backgroundColor = colors.backgroundMuted;
      textColor = colors.text;
      borderWidth = StyleSheet.hairlineWidth;
      borderColor = colors.border;
    }
  }

  if (glass) {
    backgroundColor = withAlpha(backgroundColor, 0.72);
  }

  const animatedChipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: animated ? (1 - pressed.value * 0.05) * isDismissing.value : isDismissing.value }],
    opacity: isDismissing.value,
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectProgress.value }],
    opacity: selectProgress.value,
  }));

  return (
    <Animated.View style={[animatedChipStyle, { alignSelf: "flex-start" }]}>
      <Pressable
        accessibilityRole={isSelectable ? "checkbox" : isInteractive ? "button" : undefined}
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={label}
        disabled={disabled || !isInteractive}
        onPress={handlePress}
        onPressIn={() => {
          if (!animated) return;
          pressed.value = withTiming(1, {
            duration: 90,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          });
        }}
        onPressOut={() => {
          if (!animated) return;
          pressed.value = withTiming(0, {
            duration: 120,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          });
        }}
        style={[
          {
            height,
            paddingHorizontal,
            borderRadius: radii.full,
            backgroundColor,
            borderWidth,
            borderColor,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: disabled ? 0.45 : 1,
          },
          style,
        ]}
      >
        {/* Optional Left Icon */}
        {icon && renderIcon(icon, textColor, iconSize)}

        {/* Selected Checkmark with spring scale */}
        {selected && !icon && (
          <Animated.View style={checkmarkAnimatedStyle}>
            <Svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke={textColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M20 6L9 17l-5-5" />
            </Svg>
          </Animated.View>
        )}

        {/* Chip Label */}
        <Text
          style={[
            {
              fontSize,
              fontWeight: selected ? "600" : "500",
              color: textColor,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>

        {/* Optional Right Icon */}
        {rightIcon && renderIcon(rightIcon, textColor, iconSize)}

        {/* Dismiss / Remove Icon */}
        {onClose && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label}`}
            hitSlop={10}
            disabled={disabled}
            onPress={handleClose}
            style={{
              marginLeft: 2,
              padding: 2,
              borderRadius: radii.full,
            }}
          >
            <Svg
              width={iconSize - 1}
              height={iconSize - 1}
              viewBox="0 0 24 24"
              fill="none"
              stroke={textColor}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const Tag = Chip;
export type TagProps = ChipProps;
