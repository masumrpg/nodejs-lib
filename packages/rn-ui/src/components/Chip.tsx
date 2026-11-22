import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveOutlineBorderColor,
  resolveToneColors,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentShape,
  type ComponentSize,
  type ComponentTone,
  type IconSlotsProps,
  type RenderIcon,
  type ShapeProps,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type ChipVariant = "filled" | "outline" | "soft";

export interface ChipProps
  extends VariantProps<ChipVariant>,
    ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    ShapeProps<ComponentShape>,
    IconSlotsProps,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  label: string;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onPress?: () => void;
  onClose?: () => void;
  icon?: RenderIcon;
  closeIcon?: RenderIcon;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

function ChipComponent({
  label,
  selected = false,
  onSelect,
  onPress,
  onClose,
  icon,
  leftIcon,
  rightIcon,
  closeIcon,
  variant = "soft",
  size = "md",
  tone = "primary",
  shape = "pill",
  disabled = false,
  haptic = true,
  animated = true,
  glass = false,
  style,
  textStyle,
}: ChipProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const isBodyInteractive = Boolean(onPress || onSelect);
  const isSelectable = onSelect !== undefined;

  const pressed = useSharedValue(0);
  const selectProgress = useSharedValue(selected ? 1 : 0);
  const isDismissing = useSharedValue(1);
  const isClosingRef = React.useRef(false);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(selectProgress);
      selectProgress.value = selected ? 1 : 0;
      return;
    }
    selectProgress.value = withTiming(selected ? 1 : 0, {
      duration: ANIMATION_TIMING.transition,
      easing: Easing.bezier(...ANIMATION_TIMING.bezier),
    });
  }, [selectProgress, selected, shouldAnimate]);

  useEffect(() => {
    return () => {
      cancelAnimation(pressed);
      cancelAnimation(selectProgress);
      cancelAnimation(isDismissing);
    };
  }, [isDismissing, pressed, selectProgress]);

  const handlePress = () => {
    if (disabled || !isBodyInteractive) return;
    if (haptic) {
      triggerHaptic("selection");
    }
    if (isSelectable) {
      onSelect?.(!selected);
    }
    onPress?.();
  };

  const triggerClose = () => {
    onClose?.();
  };

  const handleClose = () => {
    if (disabled || isClosingRef.current) return;
    isClosingRef.current = true;
    if (haptic) {
      triggerHaptic("selection");
    }
    if (!shouldAnimate) {
      triggerClose();
      return;
    }
    isDismissing.value = withTiming(
      0,
      {
        duration: ANIMATION_TIMING.transition,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      },
      (finished) => {
        if (finished && onClose) {
          scheduleOnRN(triggerClose);
        }
      },
    );
  };

  const chipTokens = components.chip;
  const height = chipTokens.height[size];
  const paddingHorizontal = chipTokens.paddingX[size];
  const fontSize = chipTokens.fontSize[size];
  const iconSize = chipTokens.iconSize[size];

  const toneColors = resolveToneColors(tone, colors);
  const softForeground =
    tone === "warning" && !isDark ? "#92400E" : toneColors.solid;

  let backgroundColor = colors.surface;
  let textColor = colors.text;
  let borderColor = colors.transparent;
  let borderWidth = 0;

  const hasSolidBorder = components.surface.filledBorderColor === "border";
  const isTonalOutline = components.surface.outlineStyle === "tonal";
  const useUnifiedBorder =
    hasSolidBorder || components.surface.outlineBorderColor === "border";

  if (variant === "filled") {
    borderWidth = components.borderWidth.filled;
    borderColor = hasSolidBorder ? colors.border : colors.transparent;
    if (selected) {
      backgroundColor = toneColors.solid;
      textColor = toneColors.on;
    } else {
      backgroundColor = colors.backgroundMuted;
      textColor = colors.text;
    }
  } else if (variant === "outline") {
    borderWidth = isTonalOutline ? 0 : components.borderWidth.control;
    if (selected) {
      borderColor = resolveOutlineBorderColor(
        colors,
        components.surface,
        toneColors.border,
      );
      backgroundColor = isTonalOutline
        ? toneColors.soft
        : withAlpha(toneColors.solid, 0.12);
      textColor = softForeground;
    } else {
      borderColor = resolveOutlineBorderColor(colors, components.surface);
      backgroundColor = isTonalOutline
        ? isDark
          ? colors.surfaceRaised
          : colors.backgroundMuted
        : colors.transparent;
      textColor = colors.text;
    }
  } else {
    borderWidth = hasSolidBorder
      ? components.borderWidth.filled
      : components.borderWidth.hairline;
    if (selected) {
      backgroundColor = toneColors.soft;
      textColor = softForeground;
      borderColor = useUnifiedBorder
        ? colors.border
        : withAlpha(toneColors.border, 0.4);
    } else {
      backgroundColor = colors.backgroundMuted;
      textColor = colors.text;
      borderColor = colors.border;
    }
  }

  if (glass) {
    backgroundColor = colors.glassSurface;
    borderColor = selected
      ? withAlpha(toneColors.border, 0.5)
      : colors.glassBorder;
    borderWidth = components.borderWidth.default;
  }

  const borderRadius =
    shape === "pill" ? radii.full : shape === "square" ? radii.xs : radii.md;

  const animatedChipStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          (shouldAnimate ? 1 - pressed.value * 0.04 : 1) * isDismissing.value,
      },
    ],
    opacity: isDismissing.value,
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectProgress.value }],
    opacity: selectProgress.value,
  }));

  const leadIcon = leftIcon ?? icon;
  const hitSlop = minTouchHitSlop(height);

  const innerContent = (
    <>
      {leadIcon ? renderIcon(leadIcon, textColor, iconSize) : null}

      {selected && !leadIcon && (
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

      <Text
        numberOfLines={1}
        style={[
          {
            fontSize,
            lineHeight: Math.round(fontSize * 1.25),
            fontWeight: "600",
            color: textColor,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>

      {rightIcon ? renderIcon(rightIcon, textColor, iconSize) : null}
    </>
  );

  const chipShadow = !disabled ? shadows[components.surface.feedbackShadow] : shadows.none;

  return (
    <Animated.View
      style={[
        styles.container,
        animatedChipStyle,
        {
          minHeight: height,
          paddingLeft: paddingHorizontal,
          paddingRight: onClose ? spacing.xs : paddingHorizontal,
          borderRadius,
          backgroundColor,
          borderWidth,
          borderColor,
          gap: spacing.xs + spacing.xxs,
          opacity: disabled ? 0.45 : 1,
        },
        chipShadow,
        style,
      ]}
    >
      {isBodyInteractive ? (
        <Pressable
          accessibilityRole={isSelectable ? "checkbox" : "button"}
          accessibilityState={{
            ...(isSelectable ? { checked: selected } : null),
            disabled,
          }}
          accessibilityLabel={label}
          disabled={disabled}
          hitSlop={hitSlop}
          onPress={handlePress}
          onPressIn={() => {
            if (!shouldAnimate) return;
            pressed.value = withTiming(1, {
              duration: ANIMATION_TIMING.pressIn,
              easing: Easing.bezier(...ANIMATION_TIMING.bezier),
            });
          }}
          onPressOut={() => {
            if (!shouldAnimate) return;
            pressed.value = withTiming(0, {
              duration: ANIMATION_TIMING.pressOut,
              easing: Easing.bezier(...ANIMATION_TIMING.bezier),
            });
          }}
          style={[styles.bodyRow, { gap: spacing.xs + spacing.xxs }]}
        >
          {innerContent}
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={label}
          style={[styles.bodyRow, { gap: spacing.xs + spacing.xxs }]}
        >
          {innerContent}
        </View>
      )}

      {onClose && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          accessibilityState={{ disabled }}
          hitSlop={minTouchHitSlop(iconSize + 8)}
          disabled={disabled}
          onPress={handleClose}
          style={[styles.closeBtn, { borderRadius: radii.full }]}
        >
          {closeIcon ? (
            renderIcon(closeIcon, textColor, iconSize - 1)
          ) : (
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
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

export const Chip = React.memo(ChipComponent);

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  bodyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
