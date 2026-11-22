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
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Portal, useTheme } from "../theme";
import {
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
  resolveToneColors,
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
  const { colors, components, radii, shadows, spacing } = useTheme();
  const rowProgress = useSharedValue(isOpen ? 1 : 0);

  const staggerIndex = isTop ? index : total - 1 - index;
  const openDelay = shouldAnimate ? Math.min(staggerIndex * 28, 120) : 0;

  useEffect(() => {
    if (!shouldAnimate) {
      rowProgress.value = isOpen ? 1 : 0;
      return;
    }
    if (isOpen) {
      rowProgress.value = withDelay(
        openDelay,
        withTiming(1, {
          duration: ANIMATION_TIMING.transition,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        }),
      );
    } else {
      rowProgress.value = withTiming(0, {
        duration: 110,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    }
  }, [isOpen, openDelay, rowProgress, shouldAnimate]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: rowProgress.value,
    transform: [
      {
        translateY: interpolate(
          rowProgress.value,
          [0, 1],
          [isTop ? -12 : 12, 0],
        ),
      },
      { scale: interpolate(rowProgress.value, [0, 1], [0.88, 1]) },
    ],
  }));

  const actionSize = ACTION_FAB_SIZES[size];
  const resolvedTone = action.tone ?? parentTone;
  const toneColors = resolveToneColors(resolvedTone, colors);
  const iconColor = glass ? colors.text : toneColors.on;

  return (
    <Animated.View
      style={[
        styles.actionRow,
        isEnd ? styles.actionRowEnd : styles.actionRowStart,
        rowStyle,
      ]}
    >
      {action.label && isEnd ? (
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
                : colors.surface,
              borderRadius: radii.md,
              borderWidth: components.borderWidth.default,
              borderColor: glass ? colors.glassBorder : colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              opacity: action.disabled ? 0.5 : pressed ? 0.85 : 1,
            },
            shadows.sm,
          ]}
        >
          <Text variant="labelSmall" weight="600" style={labelStyle}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}

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
            borderWidth: glass ? components.borderWidth.default : 0,
            borderColor: glass ? colors.glassBorder : "transparent",
            opacity: action.disabled ? 0.5 : pressed ? 0.85 : 1,
          },
          shadows.lg,
          actionButtonStyle,
        ]}
      >
        {renderIcon(action.icon, iconColor, Math.round(actionSize * 0.45))}
      </Pressable>

      {action.label && !isEnd ? (
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
                : colors.surface,
              borderRadius: radii.md,
              borderWidth: components.borderWidth.default,
              borderColor: glass ? colors.glassBorder : colors.border,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs + 2,
              opacity: action.disabled ? 0.5 : pressed ? 0.85 : 1,
            },
            shadows.sm,
          ]}
        >
          <Text variant="labelSmall" weight="600" style={labelStyle}>
            {action.label}
          </Text>
        </Pressable>
      ) : null}
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
    shouldAnimate ? 170 : 0,
  );

  const mainProgress = useSharedValue(isOpen ? 1 : 0);

  useEffect(() => {
    if (shouldAnimate) {
      mainProgress.value = withTiming(isOpen ? 1 : 0, {
        duration: ANIMATION_TIMING.transition,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    } else {
      mainProgress.value = isOpen ? 1 : 0;
    }
  }, [isOpen, mainProgress, shouldAnimate]);

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
    measureAnchorNode(fabAnchorRef, (rect) => {
      setAnchor(rect);
    });
  }, []);

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

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: mainProgress.value,
  }));

  const iconRotateStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${activeIcon ? 0 : interpolate(mainProgress.value, [0, 1], [0, 45])}deg`,
      },
    ],
  }));

  const resolvedOverlayColor =
    overlayColor ??
    (isDark ? withAlpha("#000000", 0.56) : withAlpha("#0F172A", 0.36));

  const mainBg = glass ? colors.glassSurfaceStrong : toneColors.solid;
  const mainIconColor = glass ? colors.text : toneColors.on;

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ?? (isOpen ? "Close actions" : "Open actions")
        }
        accessibilityState={{ expanded: isOpen }}
        hitSlop={minTouchHitSlop(mainSize)}
        onPress={() => {
          toggle();
        }}
        style={({ pressed }) => [
          styles.mainFab,
          {
            width: mainSize,
            height: mainSize,
            borderRadius: mainSize / 2,
            backgroundColor: mainBg,
            borderWidth: glass ? components.borderWidth.default : 0,
            borderColor: glass ? colors.glassBorder : "transparent",
            opacity: !inPortal && overlay && (isOpen || shouldStayMounted) ? 0 : pressed ? 0.88 : 1,
          },
          shadows.lg,
          mainButtonStyle,
        ]}
      >
        <Animated.View style={iconRotateStyle}>{currentIcon}</Animated.View>
      </Pressable>
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
          <Animated.View
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
              onPress={close}
            />
          </Animated.View>

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
