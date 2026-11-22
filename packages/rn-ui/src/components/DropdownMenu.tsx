import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type StyleProp,
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
import Svg, { Path } from "react-native-svg";

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
  isPressableTriggerElement,
  minTouchHitSlop,
  renderIcon,
  webDeps,
  type BaseGlassProps,
  type BaseHapticProps,
  type RenderIcon,
} from "./types";

export type DropdownMenuAlign = "start" | "end";
export type DropdownMenuItemVariant = "default" | "destructive";

export interface DropdownMenuContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchor: AnchorMeasurement | null;
  setAnchor: (layout: AnchorMeasurement | null) => void;
  triggerRef: React.RefObject<React.ComponentRef<typeof View> | null>;
  glass: boolean;
  haptic: boolean;
  colors: ThemeColors;
}

const DropdownMenuContext =
  React.createContext<DropdownMenuContextProps | null>(null);

export function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("useDropdownMenu must be used within a <DropdownMenu />");
  }
  return context;
}

export interface DropdownMenuProps extends BaseGlassProps, BaseHapticProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const DropdownMenu = React.memo(function DropdownMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  glass = false,
  haptic = true,
  children,
}: DropdownMenuProps) {
  const { colors } = useTheme();
  const portalStore = usePortalContext();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  useEffect(() => {
    if (open) {
      measureAnchorNode(
        triggerRef,
        (rect) => {
          setAnchor(rect);
        },
        portalStore?.getHostRef("root"),
      );
    }
  }, [open, portalStore]);

  const value = useMemo<DropdownMenuContextProps>(
    () => ({
      open,
      setOpen,
      anchor,
      setAnchor,
      triggerRef,
      glass,
      haptic,
      colors,
    }),
    [anchor, colors, glass, haptic, open, setOpen],
  );

  return (
    <DropdownMenuContext.Provider value={value}>
      <View collapsable={false} style={styles.triggerRoot}>
        {children}
      </View>
    </DropdownMenuContext.Provider>
  );
});

export interface DropdownMenuTriggerProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const DropdownMenuTrigger = React.memo(function DropdownMenuTrigger({
  children,
  style,
  disabled = false,
}: DropdownMenuTriggerProps) {
  const { open, setOpen, setAnchor, triggerRef, haptic } = useDropdownMenu();
  const portalStore = usePortalContext();
  const isPressableChild = isPressableTriggerElement(children);
  const childDisabled = isPressableChild
    ? Boolean(children.props.disabled)
    : false;
  const mergedDisabled = disabled || childDisabled;

  const handlePress = useCallback(() => {
    if (mergedDisabled) return;
    if (haptic) triggerHaptic("selection");

    const nextOpen = !open;
    if (nextOpen) {
      measureAnchorNode(
        triggerRef,
        (rect) => {
          setAnchor(rect);
        },
        portalStore?.getHostRef("root"),
      );
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [haptic, mergedDisabled, open, portalStore, setAnchor, setOpen, triggerRef]);

  return (
    <View ref={triggerRef} collapsable={false} style={style}>
      {isPressableChild ? (
        React.cloneElement(children, {
          disabled: mergedDisabled,
          onPress: (e: GestureResponderEvent) => {
            handlePress();
            children.props.onPress?.(e);
          },
        })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open, disabled: mergedDisabled }}
          disabled={mergedDisabled}
          hitSlop={minTouchHitSlop(36)}
          onPress={handlePress}
        >
          {children}
        </Pressable>
      )}
    </View>
  );
});

export interface DropdownMenuContentProps extends BaseGlassProps {
  children?: React.ReactNode;
  align?: DropdownMenuAlign;
  width?: number;
  maxHeight?: number;
  sideOffset?: number;
  style?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
}

export const DropdownMenuContent = React.memo(function DropdownMenuContent({
  children,
  align = "start",
  width = 220,
  maxHeight = 320,
  sideOffset = 6,
  glass: contentGlass,
  style,
  overlayStyle,
}: DropdownMenuContentProps) {
  const dropdownContext = useDropdownMenu();
  const { open, setOpen, anchor, glass: contextGlass, haptic, colors } =
    dropdownContext;
  const { components, radii, shadows, spacing, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const glass = contentGlass ?? contextGlass;
  const shouldMount = useDelayedUnmount(
    open,
    reducedMotion ? 0 : ANIMATION_TIMING.transition,
  );
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    if (open) {
      if (haptic) triggerHaptic("medium");
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
  }, [haptic, open, progress, reducedMotion]);

  const resolvedAnchor: AnchorMeasurement = anchor ?? {
    x: spacing.sm,
    y: windowHeight * 0.25,
    width,
    height: 40,
  };
  const coords = computeAnchoredPosition({
    anchor: resolvedAnchor,
    contentWidth: width,
    contentHeight: Math.min(maxHeight, 240),
    windowWidth,
    windowHeight,
    preferredPlacement: "bottom",
    align: align === "end" ? "end" : "start",
    offset: sideOffset,
    viewportPadding: spacing.sm,
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
        { scale: 0.95 + progress.value * 0.05 },
      ],
    }),
    webDeps([renderAbove]),
  );

  if (!shouldMount && !open) return null;

  return (
    <Portal layer="popover">
      <DropdownMenuContext.Provider value={dropdownContext}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss menu"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? withAlpha("#000000", 0.35)
                : withAlpha("#0F172A", 0.18),
            },
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
            styles.content,
            {
              top: coords.top,
              left: coords.left,
              width,
              maxHeight,
              backgroundColor: glass
                ? colors.glassSurfaceStrong
                : colors.surfaceRaised,
              borderWidth: components.borderWidth.default,
              borderColor: glass ? colors.glassBorder : colors.border,
              borderRadius: radii.lg,
              padding: spacing.xs,
            },
            shadows.lg,
            animatedStyle,
            style,
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </DropdownMenuContext.Provider>
    </Portal>
  );
});

export interface DropdownMenuItemProps {
  onPress?: () => void;
  children?: React.ReactNode;
  leftIcon?: RenderIcon;
  variant?: DropdownMenuItemVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const DropdownMenuItem = React.memo(function DropdownMenuItem({
  onPress,
  children,
  leftIcon,
  variant = "default",
  disabled = false,
  style,
}: DropdownMenuItemProps) {
  const { setOpen, haptic, colors } = useDropdownMenu();
  const { radii, spacing, typography } = useTheme();
  const isDestructive = variant === "destructive";
  const textColor = disabled
    ? colors.textMuted
    : isDestructive
      ? colors.danger
      : colors.text;

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (haptic) triggerHaptic("selection");
    onPress?.();
    setOpen(false);
  }, [disabled, haptic, onPress, setOpen]);

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.item,
        {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radii.sm,
          backgroundColor: pressed
            ? isDestructive
              ? colors.dangerSoft
              : colors.surfaceMuted
            : "transparent",
          opacity: disabled ? 0.5 : 1,
          gap: spacing.sm,
        },
        style,
      ]}
    >
      <View style={[styles.itemLead, { gap: spacing.sm }]}>
        {leftIcon ? renderIcon(leftIcon, textColor, 16) : null}
        {typeof children === "string" || typeof children === "number" ? (
          <Text
            style={[typography.bodySmall, { color: textColor, fontWeight: "500" }]}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
});

export interface DropdownMenuCheckboxItemProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
  leftIcon?: RenderIcon;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  checkIcon?: RenderIcon;
}

export const DropdownMenuCheckboxItem = React.memo(
  function DropdownMenuCheckboxItem({
    checked = false,
    onCheckedChange,
    children,
    leftIcon,
    disabled = false,
    style,
    checkIcon,
  }: DropdownMenuCheckboxItemProps) {
    const { setOpen, haptic, colors } = useDropdownMenu();
    const { radii, spacing, typography } = useTheme();

    const handlePress = useCallback(() => {
      if (disabled) return;
      if (haptic) triggerHaptic("selection");
      onCheckedChange?.(!checked);
      setOpen(false);
    }, [checked, disabled, haptic, onCheckedChange, setOpen]);

    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.item,
          {
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radii.sm,
            backgroundColor: pressed ? colors.surfaceMuted : "transparent",
            opacity: disabled ? 0.5 : 1,
            gap: spacing.sm,
          },
          style,
        ]}
      >
        <View style={[styles.itemLead, { gap: spacing.sm }]}>
          {leftIcon ? renderIcon(leftIcon, colors.textMuted, 16) : null}
          {typeof children === "string" || typeof children === "number" ? (
            <Text
              style={[
                typography.bodySmall,
                {
                  color: disabled ? colors.textMuted : colors.text,
                  fontWeight: "500",
                },
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
        {checked
          ? checkIcon
            ? renderIcon(checkIcon, colors.primary, 14)
            : (
                <Svg
                  width={15}
                  height={15}
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
);

export interface DropdownMenuSeparatorProps {
  style?: StyleProp<ViewStyle>;
}

export const DropdownMenuSeparator = React.memo(function DropdownMenuSeparator({
  style,
}: DropdownMenuSeparatorProps) {
  const { colors } = useDropdownMenu();
  const { components, spacing } = useTheme();

  return (
    <View
      style={[
        {
          height: components.borderWidth.hairline,
          backgroundColor: colors.borderMuted,
          marginVertical: spacing.xs,
        },
        style,
      ]}
    />
  );
});

export interface DropdownMenuLabelProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const DropdownMenuLabel = React.memo(function DropdownMenuLabel({
  children,
  style,
}: DropdownMenuLabelProps) {
  const { colors } = useDropdownMenu();
  const { spacing, typography } = useTheme();

  return (
    <View
      style={[
        { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md },
        style,
      ]}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          style={[
            typography.labelSmall,
            { color: colors.textMuted, fontWeight: "600" },
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

export interface DropdownMenuShortcutProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const DropdownMenuShortcut = React.memo(function DropdownMenuShortcut({
  children,
  style,
}: DropdownMenuShortcutProps) {
  const { colors } = useDropdownMenu();
  const { spacing, typography } = useTheme();

  return (
    <Text
      style={[
        typography.caption,
        {
          color: colors.textMuted,
          marginLeft: spacing.sm,
          fontWeight: "600",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
});

const styles = StyleSheet.create({
  triggerRoot: {
    alignSelf: "flex-start",
  },
  content: {
    position: "absolute",
  },
  item: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLead: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
});
