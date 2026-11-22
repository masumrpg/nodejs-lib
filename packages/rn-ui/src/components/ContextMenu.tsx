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

export interface ContextMenuProps extends BaseGlassProps, BaseHapticProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export interface ContextMenuContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  anchor: AnchorMeasurement | null;
  setAnchor: (layout: AnchorMeasurement | null) => void;
  triggerRef: React.RefObject<React.ComponentRef<typeof View> | null>;
  glass: boolean;
  haptic: boolean;
  colors: ThemeColors;
}

const ContextMenuContext = React.createContext<ContextMenuContextProps | null>(
  null,
);

export function useContextMenu() {
  const context = React.useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within a <ContextMenu />");
  }
  return context;
}

export const ContextMenu = React.memo(function ContextMenu({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  glass = false,
  haptic = true,
  children,
}: ContextMenuProps) {
  const { colors } = useTheme();
  const portalStore = usePortalContext();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const triggerRef = useRef<React.ComponentRef<typeof View>>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
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

  const contextValue = useMemo<ContextMenuContextProps>(
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
    <ContextMenuContext.Provider value={contextValue}>
      <View collapsable={false} style={styles.root}>
        {children}
      </View>
    </ContextMenuContext.Provider>
  );
});

export interface ContextMenuTriggerProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export const ContextMenuTrigger = React.memo(function ContextMenuTrigger({
  children,
  style,
  disabled = false,
}: ContextMenuTriggerProps) {
  const { open, setOpen, setAnchor, triggerRef, haptic } = useContextMenu();
  const portalStore = usePortalContext();

  const isPressableChild = isPressableTriggerElement(children);
  const childDisabled = isPressableChild
    ? Boolean(children.props.disabled)
    : false;
  const mergedDisabled = disabled || childDisabled;

  const handleLongPress = useCallback(() => {
    if (mergedDisabled) return;
    if (haptic) triggerHaptic("medium");
    measureAnchorNode(
      triggerRef,
      (rect) => {
        setAnchor(rect);
      },
      portalStore?.getHostRef("root"),
    );
    setOpen(true);
  }, [haptic, mergedDisabled, portalStore, setAnchor, setOpen, triggerRef]);

  return (
    <View
      ref={triggerRef}
      collapsable={false}
      style={isPressableChild ? style : undefined}
    >
      {isPressableChild ? (
        React.cloneElement(children, {
          disabled: mergedDisabled,
          delayLongPress: children.props.delayLongPress ?? 420,
          onLongPress: (event: GestureResponderEvent) => {
            handleLongPress();
            children.props.onLongPress?.(event);
          },
        })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Long press to open context menu"
          accessibilityState={{ expanded: open, disabled: mergedDisabled }}
          disabled={mergedDisabled}
          hitSlop={minTouchHitSlop(36)}
          onLongPress={handleLongPress}
          delayLongPress={420}
          style={style}
        >
          {children}
        </Pressable>
      )}
    </View>
  );
});

export interface ContextMenuContentProps extends BaseGlassProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  overlayStyle?: StyleProp<ViewStyle>;
  width?: number;
  maxHeight?: number;
}

export const ContextMenuContent = React.memo(function ContextMenuContent({
  children,
  glass: contentGlass,
  style,
  overlayStyle,
  width = 200,
  maxHeight = 280,
}: ContextMenuContentProps) {
  const contextMenuContext = useContextMenu();
  const { open, setOpen, anchor, glass: contextGlass, haptic, colors } =
    contextMenuContext;
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

  const resolvedAnchor: AnchorMeasurement = anchor ?? {
    x: spacing.sm,
    y: windowHeight * 0.25,
    width,
    height: 40,
  };
  const coords = computeAnchoredPosition({
    anchor: resolvedAnchor,
    contentWidth: width,
    contentHeight: Math.min(maxHeight, 220),
    windowWidth,
    windowHeight,
    preferredPlacement: "bottom",
    align: "start",
    offset: 6,
    viewportPadding: spacing.sm,
  });

  const renderAbove = coords.resolvedPlacement === "top";
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      transform: [
        { translateY: (renderAbove ? 8 : -8) * (1 - progress.value) },
        { scale: 0.96 + progress.value * 0.04 },
      ],
    }),
    webDeps([renderAbove]),
  );

  if (!shouldMount && !open) return null;

  return (
    <Portal layer="popover">
      <ContextMenuContext.Provider value={contextMenuContext}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss context menu"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? withAlpha("#000000", 0.35)
                : withAlpha("#0F172A", 0.16),
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
      </ContextMenuContext.Provider>
    </Portal>
  );
});

export interface ContextMenuItemProps {
  onPress?: () => void;
  children?: React.ReactNode;
  variant?: "default" | "destructive";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ContextMenuItem = React.memo(function ContextMenuItem({
  onPress,
  children,
  variant = "default",
  disabled = false,
  style,
}: ContextMenuItemProps) {
  const { setOpen, haptic, colors } = useContextMenu();
  const { radii, spacing, typography } = useTheme();

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (haptic) triggerHaptic("selection");
    onPress?.();
    setOpen(false);
  }, [disabled, haptic, onPress, setOpen]);

  const isDestructive = variant === "destructive";
  const textColor = disabled
    ? colors.textMuted
    : isDestructive
      ? colors.danger
      : colors.text;

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ disabled }}
      onPress={handlePress}
      disabled={disabled}
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
        },
        style,
      ]}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text style={[typography.bodySmall, { color: textColor, fontWeight: "500" }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
});

export interface ContextMenuSeparatorProps {
  style?: StyleProp<ViewStyle>;
}

export const ContextMenuSeparator = React.memo(function ContextMenuSeparator({
  style,
}: ContextMenuSeparatorProps) {
  const { colors } = useContextMenu();
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

export interface ContextMenuLabelProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ContextMenuLabel = React.memo(function ContextMenuLabel({
  children,
  style,
}: ContextMenuLabelProps) {
  const { colors } = useContextMenu();
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

export interface ContextMenuCheckboxItemProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children?: React.ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  checkIcon?: RenderIcon;
}

export const ContextMenuCheckboxItem = React.memo(
  function ContextMenuCheckboxItem({
    checked = false,
    onCheckedChange,
    children,
    disabled = false,
    style,
    checkIcon,
  }: ContextMenuCheckboxItemProps) {
    const { setOpen, haptic, colors } = useContextMenu();
    const { radii, spacing, typography } = useTheme();

    const handlePress = useCallback(() => {
      if (disabled) return;
      if (haptic) triggerHaptic("selection");
      onCheckedChange?.(!checked);
      setOpen(false);
    }, [checked, disabled, haptic, onCheckedChange, setOpen]);

    const textColor = disabled ? colors.textMuted : colors.text;

    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.item,
          {
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radii.sm,
            backgroundColor: pressed ? colors.surfaceMuted : "transparent",
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {typeof children === "string" || typeof children === "number" ? (
          <Text
            style={[
              typography.bodySmall,
              { color: textColor, flex: 1, fontWeight: "500" },
            ]}
          >
            {children}
          </Text>
        ) : (
          <View style={styles.flexOne}>{children}</View>
        )}
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

export interface ContextMenuShortcutProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const ContextMenuShortcut = React.memo(function ContextMenuShortcut({
  children,
  style,
}: ContextMenuShortcutProps) {
  const { colors } = useContextMenu();
  const { spacing, typography } = useTheme();

  return (
    <Text
      style={[
        typography.caption,
        {
          color: colors.textMuted,
          marginLeft: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
});

const styles = StyleSheet.create({
  root: {
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
    gap: 8,
  },
  flexOne: {
    flex: 1,
  },
});
