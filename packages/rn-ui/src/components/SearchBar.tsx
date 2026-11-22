import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputInstance,
  TextInputProps,
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
import Svg, { Circle, Line, Path } from "react-native-svg";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveToneColors,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentShape,
  type ComponentSize,
  type ComponentTone,
  type RenderIcon,
  type ShapeProps,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type SearchBarVariant = "filled" | "outline" | "soft";

export interface SearchBarProps
  extends Omit<TextInputProps, "style" | "size">,
    VariantProps<SearchBarVariant>,
    ToneProps<ComponentTone>,
    SizeProps<ComponentSize>,
    ShapeProps<ComponentShape>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;
  onSearchDebounced?: (query: string) => void;
  debounceMs?: number;
  onClear?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  showCancelButton?: boolean;
  cancelLabel?: string;
  icon?: RenderIcon;
  clearIcon?: RenderIcon;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  cancelButtonStyle?: StyleProp<ViewStyle>;
  cancelTextStyle?: StyleProp<TextStyle>;
}

export interface SearchBarRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  isFocused: () => boolean;
}

const SEARCH_HEIGHTS: Record<ComponentSize, number> = {
  xs: 32,
  sm: 36,
  md: 44,
  lg: 48,
  xl: 54,
};

const SEARCH_FONT_SIZES: Record<ComponentSize, number> = {
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 17,
};

const SEARCH_ICON_SIZES: Record<ComponentSize, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
};

export const SearchBar = React.memo(
  forwardRef<SearchBarRef, SearchBarProps>(function SearchBar(
    {
      value,
      defaultValue = "",
      onChangeText,
      onSearchDebounced,
      debounceMs = 300,
      onClear,
      onCancel,
      onSubmitEditing,
      placeholder = "Search...",
      loading = false,
      showCancelButton = true,
      cancelLabel = "Cancel",
      icon,
      clearIcon,
      tone = "primary",
      variant = "filled",
      size = "md",
      shape = "rounded",
      disabled = false,
      glass = false,
      haptic = true,
      animated = true,
      style,
      inputStyle,
      cancelButtonStyle,
      cancelTextStyle,
      onFocus,
      onBlur,
      ...restProps
    },
    ref,
  ) {
    const { colors, components, radii, shadows, spacing } = useTheme();
    const reducedMotion = useReducedMotion();
    const shouldAnimate = animated && !reducedMotion;

    const inputRef = useRef<TextInputInstance | null>(null);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [isFocused, setIsFocused] = useState(false);

    const currentValue = value !== undefined ? value : internalValue;
    const hasValue = currentValue.length > 0;
    const shouldShowCancel =
      showCancelButton && !disabled && (isFocused || hasValue);

    const cancelAnim = useSharedValue(shouldShowCancel ? 1 : 0);
    const cancelMeasuredWidth = useSharedValue(76);

    useEffect(() => {
      if (!shouldAnimate) {
        cancelAnimation(cancelAnim);
        cancelAnim.value = shouldShowCancel ? 1 : 0;
        return;
      }
      cancelAnim.value = withTiming(shouldShowCancel ? 1 : 0, {
        duration: ANIMATION_TIMING.transition,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    }, [cancelAnim, shouldAnimate, shouldShowCancel]);

    useEffect(() => {
      return () => {
        cancelAnimation(cancelAnim);
      };
    }, [cancelAnim]);

    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearDebounce = useCallback(() => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }, []);

    const handleChangeText = useCallback(
      (text: string) => {
        if (disabled) return;
        if (value === undefined) {
          setInternalValue(text);
        }
        onChangeText?.(text);

        if (onSearchDebounced) {
          clearDebounce();
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = null;
            onSearchDebounced(text);
          }, debounceMs);
        }
      },
      [clearDebounce, debounceMs, disabled, onChangeText, onSearchDebounced, value],
    );

    useEffect(() => clearDebounce, [clearDebounce]);

    const handleClear = useCallback(() => {
      if (disabled) return;
      clearDebounce();
      if (haptic) {
        triggerHaptic("light");
      }
      if (value === undefined) {
        setInternalValue("");
      }
      onChangeText?.("");
      onClear?.();
      onSearchDebounced?.("");
      inputRef.current?.focus();
    }, [
      clearDebounce,
      disabled,
      haptic,
      onChangeText,
      onClear,
      onSearchDebounced,
      value,
    ]);

    const handleCancel = useCallback(() => {
      if (disabled) return;
      clearDebounce();
      if (haptic) {
        triggerHaptic("selection");
      }
      if (value === undefined) {
        setInternalValue("");
      }
      onChangeText?.("");
      onClear?.();
      onSearchDebounced?.("");
      setIsFocused(false);
      inputRef.current?.blur();
      onCancel?.();
    }, [
      clearDebounce,
      disabled,
      haptic,
      onCancel,
      onChangeText,
      onClear,
      onSearchDebounced,
      value,
    ]);

    const handleFocus: NonNullable<TextInputProps["onFocus"]> = useCallback(
      (e) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur: NonNullable<TextInputProps["onBlur"]> = useCallback(
      (e) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        clear: handleClear,
        isFocused: () => isFocused,
      }),
      [handleClear, isFocused],
    );

    const activeToneColor = resolveToneColors(tone, colors).solid;
    const height = SEARCH_HEIGHTS[size];
    const fontSize = SEARCH_FONT_SIZES[size];
    const iconSize = SEARCH_ICON_SIZES[size];

    const borderRadius =
      shape === "pill" ? radii.full : shape === "square" ? 0 : radii.lg;

    const isTonalOutline = components.surface.outlineStyle === "tonal";

    const backgroundColor =
      variant === "filled"
        ? colors.surfaceMuted
        : variant === "soft"
          ? withAlpha(activeToneColor, isFocused ? 0.12 : 0.08)
          : variant === "outline" && isTonalOutline
            ? colors.input
            : colors.surface;

    const hasSolidBorder = components.surface.filledBorderColor === "border";

    const borderColor = glass
      ? isFocused
        ? activeToneColor
        : colors.glassBorder
      : variant === "outline"
        ? isFocused
          ? activeToneColor
          : colors.border
        : isFocused
          ? activeToneColor
          : hasSolidBorder
            ? colors.border
            : colors.transparent;

    const borderWidth = isFocused
      ? components.borderWidth.focus
      : glass || variant === "outline"
        ? components.borderWidth.strong
        : variant === "filled"
          ? components.borderWidth.filled
          : 0;

    const containerShadow = !disabled
      ? shadows[components.surface.inputShadow]
      : shadows.none;

    const cancelAnimatedStyle = useAnimatedStyle(() => ({
      opacity: cancelAnim.value,
      width: cancelAnim.value * cancelMeasuredWidth.value,
      transform: [{ translateX: (1 - cancelAnim.value) * 12 }],
    }));

    return (
      <View style={[styles.wrapper, style]}>
        <View
          style={[
            styles.container,
            {
              height,
              paddingHorizontal: spacing.md,
              backgroundColor: glass ? colors.glassSurface : backgroundColor,
              borderRadius,
              borderColor,
              borderWidth,
              opacity: disabled ? 0.45 : 1,
            },
            containerShadow,
          ]}
        >
          <View style={[styles.leadingIcon, { marginRight: spacing.sm }]}>
            {icon ? (
              renderIcon(
                icon,
                isFocused ? activeToneColor : colors.textMuted,
                iconSize,
              )
            ) : (
              <Svg
                width={iconSize}
                height={iconSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke={isFocused ? activeToneColor : colors.textMuted}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Circle cx={11} cy={11} r={8} />
                <Line x1={21} y1={21} x2={16.65} y2={16.65} />
              </Svg>
            )}
          </View>

          <TextInput
            ref={inputRef}
            accessibilityRole="search"
            accessibilityLabel={restProps.accessibilityLabel ?? placeholder}
            accessibilityState={{ disabled }}
            value={currentValue}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={onSubmitEditing}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            editable={!disabled}
            returnKeyType="search"
            autoCorrect={false}
            hitSlop={minTouchHitSlop(height)}
            style={[
              styles.input,
              {
                fontSize,
                color: colors.text,
              },
              inputStyle,
            ]}
            {...restProps}
          />

          {loading && (
            <ActivityIndicator
              size="small"
              color={activeToneColor}
              style={styles.trailingAction}
            />
          )}

          {!loading && hasValue && (
            <Pressable
              disabled={disabled}
              onPress={handleClear}
              hitSlop={minTouchHitSlop(iconSize + 4)}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              accessibilityLabel="Clear search text"
              style={styles.trailingAction}
            >
              {clearIcon ? (
                renderIcon(clearIcon, colors.textMuted, iconSize - 2)
              ) : (
                <Svg
                  width={iconSize - 2}
                  height={iconSize - 2}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.textMuted}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Circle
                    cx={12}
                    cy={12}
                    r={10}
                    fill={colors.borderMuted}
                    stroke="none"
                  />
                  <Path d="M15 9l-6 6M9 9l6 6" stroke={colors.text} />
                </Svg>
              )}
            </Pressable>
          )}
        </View>

        {showCancelButton && (
          <Animated.View
            pointerEvents={shouldShowCancel ? "auto" : "none"}
            style={[styles.cancelWrapper, cancelAnimatedStyle]}
          >
            <Pressable
              disabled={!shouldShowCancel}
              hitSlop={minTouchHitSlop(height)}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) cancelMeasuredWidth.value = w;
              }}
              onPress={handleCancel}
              accessibilityRole="button"
              accessibilityState={{ disabled: !shouldShowCancel }}
              accessibilityLabel="Cancel search"
              style={[
                styles.cancelButton,
                { paddingLeft: spacing.md, minHeight: height },
                cancelButtonStyle,
              ]}
            >
              <Text
                numberOfLines={1}
                weight="600"
                style={[
                  {
                    fontSize,
                    color: activeToneColor,
                  },
                  cancelTextStyle,
                ]}
              >
                {cancelLabel}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  leadingIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  trailingAction: {
    marginLeft: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelWrapper: {
    overflow: "hidden",
  },
  cancelButton: {
    justifyContent: "center",
    alignItems: "center",
  },
});
