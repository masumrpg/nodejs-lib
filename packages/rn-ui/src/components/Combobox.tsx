import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputInstance,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { Portal, usePortalContext, useTheme, type ThemeColors } from "../theme";
import {
  computeAnchoredPosition,
  measureAnchorNode,
  useDelayedUnmount,
  withAlpha,
  type AnchorMeasurement,
} from "../utils";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveControlRadius,
  webDeps,
  type BaseGlassProps,
  type BaseHapticProps,
  type RenderIcon,
  type SizeProps,
  type VariantProps,
} from "./types";

export type ComboboxVariant = "outline" | "filled" | "soft";
export type ComboboxSize = "sm" | "md" | "lg";

export interface ComboboxContextProps {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  inputValue: string;
  setInputValue: (val: string) => void;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
  triggerRef: React.RefObject<React.ComponentRef<typeof View> | null>;
  anchor: AnchorMeasurement | null;
  measureTrigger: (callback?: () => void) => void;
  registerItemMatch: (itemValue: string, matched: boolean) => void;
  unregisterItemMatch: (itemValue: string) => void;
  visibleCount: number;
  glass: boolean;
  haptic: boolean;
  colors: ThemeColors;
}

const ComboboxContext = React.createContext<ComboboxContextProps | null>(null);

export function useCombobox() {
  const context = React.useContext(ComboboxContext);
  if (!context) {
    throw new Error("useCombobox must be used within a <Combobox />");
  }
  return context;
}

export interface ComboboxProps extends BaseGlassProps, BaseHapticProps {
  value?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const Combobox = React.memo(function Combobox({
  value: controlledValue,
  onValueChange,
  open: controlledOpen,
  onOpenChange,
  glass = false,
  haptic = true,
  children,
}: ComboboxProps) {
  const { colors } = useTheme();
  const portalStore = usePortalContext();
  const [uncontrolledValue, setUncontrolledValue] = useState("");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const matchMapRef = useRef<Map<string, boolean>>(new Map());
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);

  const isValueControlled = controlledValue !== undefined;
  const value = isValueControlled ? controlledValue : uncontrolledValue;

  const isOpenControlled = controlledOpen !== undefined;
  const open = isOpenControlled ? controlledOpen : uncontrolledOpen;

  const syncVisibleCount = useCallback(() => {
    let count = 0;
    for (const matched of matchMapRef.current.values()) {
      if (matched) count += 1;
    }
    setVisibleCount((prev) => (prev === count ? prev : count));
  }, []);

  const registerItemMatch = useCallback(
    (itemValue: string, matched: boolean) => {
      if (matchMapRef.current.get(itemValue) === matched) return;
      matchMapRef.current.set(itemValue, matched);
      syncVisibleCount();
    },
    [syncVisibleCount],
  );

  const unregisterItemMatch = useCallback(
    (itemValue: string) => {
      if (!matchMapRef.current.has(itemValue)) return;
      matchMapRef.current.delete(itemValue);
      syncVisibleCount();
    },
    [syncVisibleCount],
  );

  const handleValueChange = useCallback(
    (nextValue: string) => {
      if (!isValueControlled) {
        setUncontrolledValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isValueControlled, onValueChange],
  );

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isOpenControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isOpenControlled, onOpenChange],
  );

  const measureTrigger = useCallback(
    (callback?: () => void) => {
      let called = false;
      measureAnchorNode(
        triggerRef,
        (rect) => {
          setAnchor(rect);
          called = true;
          callback?.();
        },
        portalStore?.getHostRef("root"),
      );
      if (!called) {
        callback?.();
      }
    },
    [portalStore],
  );

  useEffect(() => {
    if (open) {
      measureTrigger();
    } else if (selectedLabel && value) {
      setInputValue(selectedLabel);
    }
  }, [measureTrigger, open, selectedLabel, value]);

  const contextValue = useMemo<ComboboxContextProps>(
    () => ({
      value,
      onValueChange: handleValueChange,
      open,
      setOpen,
      inputValue,
      setInputValue,
      selectedLabel,
      setSelectedLabel,
      triggerRef,
      anchor,
      measureTrigger,
      registerItemMatch,
      unregisterItemMatch,
      visibleCount,
      glass,
      haptic,
      colors,
    }),
    [
      anchor,
      colors,
      glass,
      handleValueChange,
      haptic,
      inputValue,
      measureTrigger,
      open,
      registerItemMatch,
      selectedLabel,
      setOpen,
      unregisterItemMatch,
      value,
      visibleCount,
    ],
  );

  return (
    <ComboboxContext.Provider value={contextValue}>
      <View style={styles.root}>{children}</View>
    </ComboboxContext.Provider>
  );
});

export interface ComboboxInputProps
  extends VariantProps<ComboboxVariant>,
    SizeProps<ComboboxSize> {
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  chevronIcon?: RenderIcon;
  searchIcon?: RenderIcon;
}

const comboboxHeights: Record<ComboboxSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

export const ComboboxInput = React.memo(function ComboboxInput({
  placeholder = "Search...",
  variant = "outline",
  size = "md",
  style,
  inputStyle,
  disabled = false,
  chevronIcon,
  searchIcon,
}: ComboboxInputProps) {
  const {
    open,
    setOpen,
    inputValue,
    setInputValue,
    onValueChange,
    setSelectedLabel,
    triggerRef,
    measureTrigger,
    glass,
    haptic,
    colors,
  } = useCombobox();
  const { components, radii, shadows, spacing, typography } = useTheme();
  const inputRef = useRef<TextInputInstance>(null);

  const height = comboboxHeights[size];
  const triggerShadow = !disabled
    ? shadows[components.surface.inputShadow]
    : shadows.none;

  const getColors = () => {
    if (disabled) {
      return {
        bg: withAlpha(colors.disabled, 0.72),
        border: colors.disabled,
      };
    }
    if (glass) {
      return {
        bg: colors.glassSurface,
        border: open ? colors.primary : colors.glassBorder,
      };
    }
    if (variant === "filled") {
      return {
        bg: colors.surfaceMuted,
        border: open ? colors.primary : colors.surfaceMuted,
      };
    }
    if (variant === "soft") {
      return {
        bg: colors.primarySoft,
        border: open
          ? colors.primary
          : components.surface.outlineBorderColor === "border"
            ? colors.border
            : withAlpha(colors.primary, 0.25),
      };
    }
    return {
      bg: colors.input,
      border: open ? colors.primary : colors.border,
    };
  };

  const palette = getColors();

  const handleChevronPress = useCallback(() => {
    if (disabled) return;
    if (haptic) triggerHaptic("selection");
    if (open) {
      setOpen(false);
    } else {
      measureTrigger(() => {
        setOpen(true);
        inputRef.current?.focus();
      });
    }
  }, [disabled, haptic, measureTrigger, open, setOpen]);

  return (
    <View
      ref={triggerRef}
      collapsable={false}
      style={[
        styles.inputBox,
        {
          height,
          borderRadius: resolveControlRadius("rounded", size, radii),
          borderWidth: open
            ? components.borderWidth.focus
            : components.borderWidth.strong,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
          opacity: disabled ? 0.6 : 1,
        },
        triggerShadow,
        style,
      ]}
    >
      {searchIcon ? (
        renderIcon(searchIcon, colors.textMuted, 16)
      ) : (
        <Svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textMuted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Circle cx={11} cy={11} r={8} />
          <Line x1={21} y1={21} x2={16.65} y2={16.65} />
        </Svg>
      )}

      <TextInput
        ref={inputRef}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        accessibilityState={{ disabled }}
        value={inputValue}
        onChangeText={(text) => {
          setInputValue(text);
          if (!open) {
            measureTrigger(() => setOpen(true));
          }
        }}
        onFocus={() => {
          if (!open && !disabled) {
            measureTrigger(() => setOpen(true));
          }
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        editable={!disabled}
        style={[
          styles.textInput,
          size === "sm" ? typography.bodySmall : typography.body,
          { color: colors.text },
          inputStyle,
        ]}
      />

      {inputValue.length > 0 && !disabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear selection"
          hitSlop={minTouchHitSlop(28)}
          onPress={() => {
            if (haptic) triggerHaptic("selection");
            setInputValue("");
            setSelectedLabel("");
            onValueChange("");
          }}
          style={styles.iconBtn}
        >
          <Svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textMuted}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M18 6L6 18M6 6l12 12" />
          </Svg>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle options"
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        hitSlop={minTouchHitSlop(28)}
        onPress={handleChevronPress}
        style={styles.iconBtn}
      >
        {chevronIcon ? (
          renderIcon(chevronIcon, colors.textMuted, 16)
        ) : (
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textMuted}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d={open ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
          </Svg>
        )}
      </Pressable>
    </View>
  );
});

export interface ComboboxContentProps {
  children?: React.ReactNode;
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
}

export const ComboboxContent = React.memo(function ComboboxContent({
  children,
  maxHeight = 280,
  style,
  overlayStyle,
}: ComboboxContentProps) {
  const comboboxContext = useCombobox();
  const { open, setOpen, anchor, glass, haptic, colors } = comboboxContext;
  const { components, radii, shadows, spacing } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const shouldMount = useDelayedUnmount(
    open,
    reducedMotion ? 0 : ANIMATION_TIMING.transition,
  );
  const progress = useSharedValue(open ? 1 : 0);

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

  const cardWidth = Math.max(220, anchor?.width ?? windowWidth - spacing.lg * 2);
  const resolvedAnchor: AnchorMeasurement = anchor ?? {
    x: spacing.md,
    y: windowHeight * 0.25,
    width: cardWidth,
    height: 44,
  };
  const coords = computeAnchoredPosition({
    anchor: resolvedAnchor,
    contentWidth: cardWidth,
    contentHeight: Math.min(maxHeight, 220),
    windowWidth,
    windowHeight,
    preferredPlacement: "bottom",
    align: "start",
    offset: 6,
    viewportPadding: spacing.md,
  });

  const renderAbove = coords.resolvedPlacement === "top";
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      transform: [
        {
          translateY: renderAbove
            ? (1 - progress.value) * 6
            : (1 - progress.value) * -6,
        },
        { scale: 0.96 + progress.value * 0.04 },
      ],
    }),
    webDeps([renderAbove]),
  );

  if (!shouldMount && !open) return null;

  return (
    <Portal layer="popover">
      <ComboboxContext.Provider value={comboboxContext}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss combobox options"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: withAlpha("#0F172A", 0.14) },
            overlayStyle,
          ]}
          onPress={() => {
            if (haptic) triggerHaptic("selection");
            setOpen(false);
          }}
        />

        <Animated.View
          accessibilityRole="menu"
          style={[
            styles.contentCard,
            {
              top: coords.top,
              left: coords.left,
              width: cardWidth,
              maxHeight,
              backgroundColor: glass
                ? colors.glassSurfaceStrong
                : colors.surfaceRaised,
              borderWidth: components.borderWidth.default,
              borderColor: glass ? colors.glassBorder : colors.border,
              borderRadius: radii.lg,
            },
            shadows.lg,
            animatedStyle,
            style,
          ]}
        >
          <View
            style={[
              styles.contentClip,
              {
                borderRadius: Math.max(
                  0,
                  radii.lg - components.borderWidth.default,
                ),
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </Animated.View>
      </ComboboxContext.Provider>
    </Portal>
  );
});

export interface ComboboxListProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ComboboxList = React.memo(function ComboboxList({
  children,
  style,
}: ComboboxListProps) {
  const { spacing } = useTheme();
  return <View style={[{ paddingVertical: spacing.xs }, style]}>{children}</View>;
});

export interface ComboboxItemProps {
  value: string;
  label: string;
  children?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  checkIcon?: RenderIcon;
}

export const ComboboxItem = React.memo(function ComboboxItem({
  value,
  label,
  children,
  disabled = false,
  style,
  checkIcon,
}: ComboboxItemProps) {
  const {
    value: selectedValue,
    onValueChange,
    inputValue,
    setInputValue,
    selectedLabel,
    setSelectedLabel,
    setOpen,
    registerItemMatch,
    unregisterItemMatch,
    haptic,
    colors,
  } = useCombobox();
  const { radii, spacing, typography } = useTheme();

  const isSelected = selectedValue === value;
  const query = inputValue.trim().toLowerCase();
  const isShowingSelectedLabel =
    selectedLabel.length > 0 && inputValue === selectedLabel;
  const matches =
    query.length === 0 ||
    isShowingSelectedLabel ||
    label.toLowerCase().includes(query);

  useEffect(() => {
    registerItemMatch(value, matches);
    return () => unregisterItemMatch(value);
  }, [matches, registerItemMatch, unregisterItemMatch, value]);

  useEffect(() => {
    if (isSelected && selectedLabel !== label) {
      setSelectedLabel(label);
    }
  }, [isSelected, label, selectedLabel, setSelectedLabel]);

  if (!matches) return null;

  const handleSelect = () => {
    if (disabled) return;
    if (haptic) triggerHaptic("selection");
    onValueChange(value);
    setSelectedLabel(label);
    setInputValue(label);
    setOpen(false);
  };

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={handleSelect}
      style={({ pressed }) => [
        styles.itemRow,
        {
          backgroundColor: isSelected
            ? colors.primarySoft
            : pressed
              ? colors.surfaceMuted
              : "transparent",
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          marginHorizontal: spacing.xs,
          borderRadius: radii.sm,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={styles.itemContent}>
        {children ?? (
          <Text
            style={[
              typography.bodySmall,
              {
                color: isSelected ? colors.primary : colors.text,
                fontWeight: isSelected ? "600" : "400",
              },
            ]}
          >
            {label}
          </Text>
        )}
      </View>

      {isSelected
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
});

export interface ComboboxEmptyProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ComboboxEmpty = React.memo(function ComboboxEmpty({
  children = "No results found.",
  style,
}: ComboboxEmptyProps) {
  const { visibleCount, colors } = useCombobox();
  const { spacing, typography } = useTheme();

  if (visibleCount > 0) return null;

  return (
    <View style={[styles.empty, { padding: spacing.md }, style]}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          style={[
            typography.bodySmall,
            { color: colors.textMuted, textAlign: "center" },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: "100%",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    paddingVertical: 0,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  contentCard: {
    position: "absolute",
  },
  contentClip: {
    overflow: "hidden",
    width: "100%",
    flexShrink: 1,
  },
  itemRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemContent: {
    flex: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
  },
});
