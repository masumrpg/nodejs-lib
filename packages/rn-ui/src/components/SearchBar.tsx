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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  renderIcon,
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

/**
 * Mobile-optimized SearchBar with built-in debouncing, clear button, loading spinner, and animated cancel transition.
 */
export const SearchBar = forwardRef<SearchBarRef, SearchBarProps>(function SearchBar(
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
  ref
) {
  const { colors, radii } = useTheme();
  const inputRef = useRef<TextInputInstance | null>(null);

  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  const currentValue = value !== undefined ? value : internalValue;
  const hasValue = currentValue.length > 0;

  // Animated values for cancel button entrance
  const cancelAnim = useSharedValue(0);

  useEffect(() => {
    const shouldShowCancel = isFocused || hasValue;
    if (showCancelButton) {
      if (animated) {
        cancelAnim.value = withTiming(shouldShowCancel ? 1 : 0, {
          duration: 180,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        });
      } else {
        cancelAnim.value = shouldShowCancel ? 1 : 0;
      }
    } else {
      cancelAnim.value = 0;
    }
  }, [animated, cancelAnim, hasValue, isFocused, showCancelButton]);

  // Debounce handler
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      if (value === undefined) {
        setInternalValue(text);
      }
      onChangeText?.(text);

      if (onSearchDebounced) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onSearchDebounced(text);
        }, debounceMs);
      }
    },
    [debounceMs, onChangeText, onSearchDebounced, value]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleClear = useCallback(() => {
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
  }, [haptic, onChangeText, onClear, onSearchDebounced, value]);

  const handleCancel = useCallback(() => {
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
  }, [haptic, onChangeText, onClear, onSearchDebounced, value, onCancel]);

  const handleFocus: NonNullable<TextInputProps["onFocus"]> = useCallback(
    (e) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur: NonNullable<TextInputProps["onBlur"]> = useCallback(
    (e) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    clear: handleClear,
    isFocused: () => isFocused,
  }));

  const activeToneColor =
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

  const height = size === "sm" ? 36 : size === "lg" ? 48 : 42;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 14;
  const iconSize = size === "sm" ? 16 : size === "lg" ? 20 : 18;

  const borderRadius =
    shape === "pill"
      ? radii.full
      : shape === "square"
      ? 0
      : radii.lg;

  // Variant styling
  const backgroundColor =
    variant === "filled"
      ? colors.surfaceMuted
      : variant === "soft"
      ? withAlpha(activeToneColor, isFocused ? 0.12 : 0.08)
      : colors.surface;

  const borderColor =
    variant === "outline"
      ? isFocused
        ? activeToneColor
        : colors.border
      : isFocused
      ? activeToneColor
      : "transparent";

  const borderWidth = variant === "outline" || isFocused ? 1.5 : 0;

  const cancelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cancelAnim.value,
    transform: [{ translateX: (1 - cancelAnim.value) * 16 }],
    maxWidth: cancelAnim.value * 90,
  }));

  return (
    <View style={[styles.wrapper, style]}>
      {/* Search Input Box */}
      <View
        style={[
          styles.container,
          {
            height,
            backgroundColor: glass ? withAlpha(backgroundColor, 0.75) : backgroundColor,
            borderRadius,
            borderColor,
            borderWidth,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        {/* Leading Search Icon */}
        <View style={styles.leadingIcon}>
          {icon ? (
            renderIcon(icon, isFocused ? activeToneColor : colors.textMuted, iconSize)
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

        {/* Text Input Element */}
        <TextInput
          ref={inputRef}
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

        {/* Loading Spinner */}
        {loading && (
          <ActivityIndicator
            size="small"
            color={activeToneColor}
            style={styles.trailingAction}
          />
        )}

        {/* Clear Button */}
        {!loading && hasValue && (
          <Pressable
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
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
                <Circle cx={12} cy={12} r={10} fill={colors.borderMuted} stroke="none" />
                <Path d="M15 9l-6 6M9 9l6 6" stroke={colors.text} />
              </Svg>
            )}
          </Pressable>
        )}
      </View>

      {/* Animated Cancel Button (iOS / Material style) */}
      {showCancelButton && (
        <Animated.View style={[styles.cancelWrapper, cancelAnimatedStyle]}>
          <Pressable
            onPress={handleCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel search"
            style={[styles.cancelButton, cancelButtonStyle]}
          >
            <Text
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
});

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
    paddingHorizontal: 12,
  },
  leadingIcon: {
    marginRight: 8,
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
    paddingLeft: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
