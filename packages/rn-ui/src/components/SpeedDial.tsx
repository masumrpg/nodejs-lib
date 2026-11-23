import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Portal, usePortalContext, useTheme } from "../theme";
import {
  measureAnchorNode,
  useDelayedUnmount,
  withAlpha,
  type AnchorMeasurement,
} from "../utils";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  minTouchHitSlop,
  renderIcon,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentTone,
  type RenderIcon,
  type SizeProps,
  type ToneProps,
} from "./types";

export type SpeedDialPlacement =
  | "bottom-end"
  | "bottom-start"
  | "top-end"
  | "top-start";

export interface SpeedDialActionItem {
  id: string;
  icon: RenderIcon;
  label?: string;
  tone?: ComponentTone;
  disabled?: boolean;
  onPress: () => void;
}

export interface SpeedDialProps
  extends ToneProps<ComponentTone>,
    SizeProps<"sm" | "md" | "lg">,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  actions: SpeedDialActionItem[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: RenderIcon;
  activeIcon?: RenderIcon;
  placement?: SpeedDialPlacement;
  offset?: number;
  overlay?: boolean;
  overlayColor?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  mainButtonStyle?: StyleProp<ViewStyle>;
  actionButtonStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const DIAL_EASING = Easing.bezier(0.23, 1, 0.32, 1);

const MAIN_FAB_SIZES: Record<"sm" | "md" | "lg", number> = {
  sm: 48,
  md: 56,
  lg: 64,
};

const ACTION_FAB_SIZES: Record<"sm" | "md" | "lg", number> = {
  sm: 40,
  md: 44,
  lg: 50,
};

interface SpeedDialBackdropProps {
  isOpen: boolean;
  shouldAnimate: boolean;
  resolvedOverlayColor: string;
  onClose: () => void;
}

const SpeedDialBackdrop = React.memo(function SpeedDialBackdrop({
  isOpen,
  shouldAnimate,
  resolvedOverlayColor,
  onClose,
}: SpeedDialBackdropProps) {
  const opacity = useSharedValue(isOpen && !shouldAnimate ? 1 : 0);

  useEffect(() => {
    if (!shouldAnimate) {
      opacity.value = isOpen ? 1 : 0;
      return;
    }
    opacity.value = withTiming(isOpen ? 1 : 0, {
      duration: isOpen ? 200 : 160,
      easing: DIAL_EASING,
    });
    return () => {
      cancelAnimation(opacity);
    };
  }, [isOpen, opacity, shouldAnimate]);

  const backdropStyle = useAnimatedStyle(
    () => ({ opacity: opacity.value }),
    webDeps([]),
  );

  return (
    <Animated.View
      pointerEvents={isOpen ? "auto" : "none"}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: resolvedOverlayColor },
        backdropStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close speed dial"
        style={styles.flexOne}
        onPress={onClose}
      />
    </Animated.View>
  );
});

interface SpeedDialActionRowProps {
  action: SpeedDialActionItem;
  index: number;
  total: number;
  isOpen: boolean;
  isTop: boolean;
  isEnd: boolean;
  parentTone: ComponentTone;
  size: "sm" | "md" | "lg";
  shouldAnimate: boolean;
  haptic: boolean;
  glass: boolean;
  onSelect: (action: SpeedDialActionItem) => void;
  actionButtonStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const SpeedDialActionRow = React.memo(function SpeedDialActionRow({
  action,
  index,
  total,
  isOpen,
  isTop,
  isEnd,
  parentTone,
  size,
  shouldAnimate,
  haptic,
  glass,
  onSelect,
  actionButtonStyle,
  labelStyle,
}: SpeedDialActionRowProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const rowProgress = useSharedValue(isOpen && !shouldAnimate ? 1 : 0);

  const staggerIndex = isTop ? index : total - 1 - index;
  const closeIndex = isTop ? total - 1 - index : index;
  const openDelay = shouldAnimate ? Math.min(staggerIndex * 32, 130) : 0;
  const closeDelay = shouldAnimate ? Math.min(closeIndex * 20, 80) : 0;

  useEffect(() => {
    if (!shouldAnimate) {
      rowProgress.value = isOpen ? 1 : 0;
      return;
    }
    if (isOpen) {
      rowProgress.value = withDelay(
        openDelay,
        withTiming(1, {
          duration: 220,
          easing: DIAL_EASING,
        }),
      );
    } else {
      rowProgress.value = withDelay(
        closeDelay,
        withTiming(0, {
          duration: 150,
          easing: DIAL_EASING,
        }),
      );
    }
    return () => {
      cancelAnimation(rowProgress);
    };
  }, [closeDelay, isOpen, openDelay, rowProgress, shouldAnimate]);

  const rowStyle = useAnimatedStyle(
    () => ({
      opacity: rowProgress.value,
      transform: [
        {
          translateY: interpolate(
            rowProgress.value,
            [0, 1],
            [isTop ? -26 : 26, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            rowProgress.value,
            [0, 1],
            [0.82, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }),
    webDeps([isTop]),
  );

  const labelAnimatedStyle = useAnimatedStyle(
    () => ({
      opacity: rowProgress.value,
      transform: [
        {
          translateX: interpolate(
            rowProgress.value,
            [0, 1],
            [isEnd ? 12 : -12, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    }),
    webDeps([isEnd]),
  );

  const isBrutal = components.surface.pressEffect === "offset";
  const pillElevation: ViewStyle = isBrutal
    ? shadows.sm
    : {
        boxShadow: isDark
          ? "0px 4px 12px rgba(0, 0, 0, 0.38)"
          : "0px 2px 8px rgba(15, 23, 42, 0.12)",
      };
  const fabElevation: ViewStyle = isBrutal
    ? shadows.md
    : {
        boxShadow: isDark
          ? "0px 6px 16px rgba(0, 0, 0, 0.45)"
          : "0px 4px 12px rgba(15, 23, 42, 0.16)",
      };

  const actionSize = ACTION_FAB_SIZES[size];
  const resolvedTone = action.tone ?? parentTone;
  const toneColors = resolveToneColors(resolvedTone, colors);
  const iconColor = glass ? colors.text : toneColors.on;

  const renderLabel = () => (
    <Animated.View style={labelAnimatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        accessibilityState={{ disabled: Boolean(action.disabled) }}
        disabled={action.disabled}
        onPress={() => onSelect(action)}
        style={({ pressed }) => [
          styles.labelContainer,
          {
            backgroundColor: glass
              ? colors.glassSurfaceStrong
              : isDark
                ? colors.surfaceRaised
                : colors.surface,
            borderRadius: radii.md,
            borderCurve: "continuous",
            borderWidth: Math.max(components.borderWidth.default, 1),
            borderColor: glass
              ? colors.glassBorder
              : components.borderWidth.default > 0
                ? colors.border
                : colors.borderMuted,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            opacity: action.disabled ? 0.5 : pressed ? 0.85 : 1,
          },
          pillElevation,
        ]}
      >
        <Text variant="labelSmall" weight="600" style={labelStyle}>
          {action.label}
        </Text>
      </Pressable>
    </Animated.View>
  );

  return (
    <Animated.View
      style={[
        styles.actionRow,
        isEnd ? styles.actionRowEnd : styles.actionRowStart,
        rowStyle,
      ]}
    >
      {action.label && isEnd ? renderLabel() : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label ?? action.id}
        accessibilityState={{ disabled: Boolean(action.disabled) }}
        disabled={action.disabled}
        hitSlop={minTouchHitSlop(actionSize)}
        onPress={() => {
          if (action.disabled) return;
          if (haptic) triggerHaptic("selection");
          onSelect(action);
        }}
        style={({ pressed }) => [
          styles.actionButton,
          {
            width: actionSize,
            height: actionSize,
            borderRadius: actionSize / 2,
            backgroundColor: glass
              ? colors.glassSurfaceStrong
              : toneColors.solid,
            borderWidth: glass
              ? Math.max(components.borderWidth.default, 1)
              : isBrutal
                ? components.borderWidth.filled
                : 0,
            borderColor: glass
              ? colors.glassBorder
              : isBrutal
                ? colors.border
                : "transparent",
            opacity: action.disabled ? 0.5 : pressed ? 0.86 : 1,
          },
          fabElevation,
          actionButtonStyle,
        ]}
      >
        {renderIcon(action.icon, iconColor, Math.round(actionSize * 0.45))}
      </Pressable>

      {action.label && !isEnd ? renderLabel() : null}
    </Animated.View>
  );
});

export const SpeedDial = React.memo(function SpeedDial({
  actions,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  icon,
  activeIcon,
  tone = "primary",
  size = "md",
  placement = "bottom-end",
  offset,
  overlay = true,
  overlayColor,
  animated = true,
  haptic = true,
  glass = false,
  accessibilityLabel,
  style,
  mainButtonStyle,
  actionButtonStyle,
  labelStyle,
}: SpeedDialProps) {
  const { colors, components, shadows, spacing, isDark } = useTheme();
  const portalStore = usePortalContext();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [anchor, setAnchor] = useState<AnchorMeasurement | null>(null);
  const fabAnchorRef = useRef<React.ComponentRef<typeof View>>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? Boolean(controlledOpen) : internalOpen;

  const shouldStayMounted = useDelayedUnmount(
    isOpen,
    shouldAnimate ? 260 : 0,
  );

  const mainProgress = useSharedValue(isOpen ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      mainProgress.value = withTiming(isOpen ? 1 : 0, {
        duration: isOpen ? 220 : 180,
        easing: DIAL_EASING,
      });
    } else {
      mainProgress.value = isOpen ? 1 : 0;
    }
    return () => {
      cancelAnimation(mainProgress);
    };
  }, [isOpen, mainProgress, shouldAnimate]);

  useEffect(() => {
    return () => {
      cancelAnimation(pressScale);
    };
  }, [pressScale]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const refreshAnchor = useCallback(() => {
    measureAnchorNode(
      fabAnchorRef,
      (rect) => {
        setAnchor(rect);
      },
      portalStore?.getHostRef("root"),
    );
  }, [portalStore]);

  useEffect(() => {
    if (isOpen) {
      refreshAnchor();
    }
  }, [isOpen, refreshAnchor]);

  const close = useCallback(() => {
    if (haptic) triggerHaptic("selection");
    setOpen(false);
  }, [haptic, setOpen]);

  const toggle = useCallback(() => {
    if (haptic) triggerHaptic("medium");
    if (!isOpen) {
      refreshAnchor();
    }
    setOpen(!isOpen);
  }, [haptic, isOpen, refreshAnchor, setOpen]);

  const handleSelectAction = useCallback(
    (action: SpeedDialActionItem) => {
      if (action.disabled) return;
      action.onPress();
      setOpen(false);
    },
    [setOpen],
  );

  const edgeOffset = offset ?? spacing.lg;
  const isTop = placement.startsWith("top");
  const isEnd = placement.endsWith("end");
  const mainSize = MAIN_FAB_SIZES[size];
  const toneColors = resolveToneColors(tone, colors);
  const isBrutal = components.surface.pressEffect === "offset";
  const hasActiveIcon = Boolean(activeIcon);

  const iconRotateStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          rotate: `${hasActiveIcon ? 0 : interpolate(mainProgress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg`,
        },
      ],
    }),
    webDeps([hasActiveIcon]),
  );

  const mainFabPressStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: pressScale.value }],
    }),
    webDeps([]),
  );

  const resolvedOverlayColor =
    overlayColor ??
    (isDark ? withAlpha("#000000", 0.56) : withAlpha("#0F172A", 0.36));

  const mainBg = glass ? colors.glassSurfaceStrong : toneColors.solid;
  const mainIconColor = glass ? colors.text : toneColors.on;
  const mainFabElevation: ViewStyle = isBrutal
    ? shadows.lg
    : {
        boxShadow: isDark
          ? "0px 8px 20px rgba(0, 0, 0, 0.50)"
          : "0px 6px 16px rgba(15, 23, 42, 0.18)",
      };

  const renderMainFab = (inPortal: boolean) => {
    const currentIcon =
      isOpen && activeIcon
        ? renderIcon(activeIcon, mainIconColor, Math.round(mainSize * 0.43))
        : icon
          ? renderIcon(icon, mainIconColor, Math.round(mainSize * 0.43))
          : (
              <Svg
                width={Math.round(mainSize * 0.43)}
                height={Math.round(mainSize * 0.43)}
                viewBox="0 0 24 24"
                fill="none"
                stroke={mainIconColor}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M12 5v14M5 12h14" />
              </Svg>
            );

    return (
      <Animated.View style={mainFabPressStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            accessibilityLabel ?? (isOpen ? "Close actions" : "Open actions")
          }
          accessibilityState={{ expanded: isOpen }}
          hitSlop={minTouchHitSlop(mainSize)}
          onPress={toggle}
          onPressIn={() => {
            if (shouldAnimate) {
              pressScale.value = withTiming(0.94, {
                duration: 100,
                easing: DIAL_EASING,
              });
            }
          }}
          onPressOut={() => {
            if (shouldAnimate) {
              pressScale.value = withTiming(1, {
                duration: 140,
                easing: DIAL_EASING,
              });
            }
          }}
          style={[
            styles.mainFab,
            {
              width: mainSize,
              height: mainSize,
              borderRadius: mainSize / 2,
              backgroundColor: mainBg,
              borderWidth: glass
                ? Math.max(components.borderWidth.default, 1)
                : isBrutal
                  ? components.borderWidth.filled
                  : 0,
              borderColor: glass
                ? colors.glassBorder
                : isBrutal
                  ? colors.border
                  : "transparent",
              opacity: !inPortal && overlay && (isOpen || shouldStayMounted) ? 0 : 1,
            },
            mainFabElevation,
            mainButtonStyle,
          ]}
        >
          <Animated.View style={iconRotateStyle}>{currentIcon}</Animated.View>
        </Pressable>
      </Animated.View>
    );
  };

  const renderActionRows = () => (
    <View
      style={[
        styles.actionsWrapper,
        isTop ? styles.actionsWrapperTop : styles.actionsWrapperBottom,
        isEnd ? styles.alignEnd : styles.alignStart,
        { gap: spacing.sm },
      ]}
    >
      {actions.map((action, idx) => (
        <SpeedDialActionRow
          key={action.id}
          action={action}
          index={idx}
          total={actions.length}
          isOpen={isOpen}
          isTop={isTop}
          isEnd={isEnd}
          parentTone={tone}
          size={size}
          shouldAnimate={shouldAnimate}
          haptic={haptic}
          glass={glass}
          onSelect={handleSelectAction}
          actionButtonStyle={actionButtonStyle}
          labelStyle={labelStyle}
        />
      ))}
    </View>
  );

  const cornerPosition: ViewStyle = useMemo(() => {
    if (anchor) {
      const rightOffset = Math.max(
        edgeOffset,
        windowWidth - (anchor.x + anchor.width),
      );
      const bottomOffset = Math.max(
        edgeOffset,
        windowHeight - (anchor.y + anchor.height),
      );
      return {
        ...(isTop ? { top: anchor.y } : { bottom: bottomOffset }),
        ...(isEnd ? { right: rightOffset } : { left: anchor.x }),
      };
    }
    return {
      ...(isTop ? { top: edgeOffset } : { bottom: edgeOffset }),
      ...(isEnd ? { right: edgeOffset } : { left: edgeOffset }),
    };
  }, [anchor, edgeOffset, isEnd, isTop, windowHeight, windowWidth]);

  const inlineCornerPosition: ViewStyle = {
    ...(isTop ? { top: edgeOffset } : { bottom: edgeOffset }),
    ...(isEnd ? { right: edgeOffset } : { left: edgeOffset }),
  };

  const showPortal = overlay && (isOpen || shouldStayMounted);

  return (
    <>
      <View
        pointerEvents={showPortal ? "none" : "box-none"}
        style={[
          styles.container,
          inlineCornerPosition,
          isEnd ? styles.alignEnd : styles.alignStart,
          style,
        ]}
      >
        {!overlay && (isOpen || shouldStayMounted) && !isTop
          ? renderActionRows()
          : null}

        <View
          ref={fabAnchorRef}
          collapsable={false}
          onLayout={(_e: LayoutChangeEvent) => {
            if (isOpen) refreshAnchor();
          }}
        >
          {renderMainFab(false)}
        </View>

        {!overlay && (isOpen || shouldStayMounted) && isTop
          ? renderActionRows()
          : null}
      </View>

      {showPortal ? (
        <Portal layer="overlay">
          <SpeedDialBackdrop
            isOpen={isOpen}
            shouldAnimate={shouldAnimate}
            resolvedOverlayColor={resolvedOverlayColor}
            onClose={close}
          />

          <View
            pointerEvents="box-none"
            style={[
              styles.container,
              cornerPosition,
              isEnd ? styles.alignEnd : styles.alignStart,
              style,
            ]}
          >
            {!isTop ? renderActionRows() : null}
            {renderMainFab(true)}
            {isTop ? renderActionRows() : null}
          </View>
        </Portal>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    position: "absolute",
    zIndex: 20,
  },
  alignEnd: {
    alignItems: "flex-end",
  },
  alignStart: {
    alignItems: "flex-start",
  },
  actionsWrapper: {
    width: "100%",
  },
  actionsWrapperBottom: {
    marginBottom: 12,
  },
  actionsWrapperTop: {
    marginTop: 12,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionRowEnd: {
    justifyContent: "flex-end",
  },
  actionRowStart: {
    justifyContent: "flex-start",
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelContainer: {},
  mainFab: {
    alignItems: "center",
    justifyContent: "center",
  },
});
