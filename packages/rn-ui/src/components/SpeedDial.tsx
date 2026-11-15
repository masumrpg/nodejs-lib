import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import {
  renderIcon,
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
  style?: StyleProp<ViewStyle>;
  mainButtonStyle?: StyleProp<ViewStyle>;
  actionButtonStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

interface SpeedDialActionRowProps {
  action: SpeedDialActionItem;
  index: number;
  total: number;
  isOpen: boolean;
  isTop: boolean;
  isEnd: boolean;
  parentTone: ComponentTone;
  size: "sm" | "md" | "lg";
  animated: boolean;
  haptic: boolean;
  glass: boolean;
  onSelect: (action: SpeedDialActionItem) => void;
  actionButtonStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

function SpeedDialActionRow({
  action,
  index,
  isOpen,
  isTop,
  isEnd,
  parentTone,
  size,
  animated,
  haptic,
  glass,
  onSelect,
  actionButtonStyle,
  labelStyle,
}: SpeedDialActionRowProps) {
  const { colors, radii } = useTheme();
  const rowProgress = useSharedValue(0);

  useEffect(() => {
    const delay = animated ? index * 40 : 0;
    if (isOpen) {
      rowProgress.value = withDelay(
        delay,
        withTiming(1, {
          duration: 180,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        })
      );
    } else {
      rowProgress.value = withTiming(0, {
        duration: 120,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      });
    }
  }, [animated, index, isOpen, rowProgress]);

  const animatedRowStyle = useAnimatedStyle(() => {
    const translateY = (1 - rowProgress.value) * (isTop ? -16 : 16);
    return {
      opacity: rowProgress.value,
      transform: [
        { translateY },
        { scale: 0.75 + rowProgress.value * 0.25 },
      ],
    };
  });

  const effectiveTone = action.tone || parentTone;
  const actionColor =
    effectiveTone === "primary"
      ? colors.primary
      : effectiveTone === "secondary"
      ? colors.secondary
      : effectiveTone === "accent"
      ? colors.accent
      : effectiveTone === "success"
      ? colors.success
      : effectiveTone === "warning"
      ? colors.warning
      : effectiveTone === "danger"
      ? colors.danger
      : colors.info;

  const btnDimension = size === "sm" ? 38 : size === "lg" ? 48 : 42;
  const iconSize = size === "sm" ? 16 : size === "lg" ? 22 : 18;

  const handlePress = () => {
    if (action.disabled) return;
    if (haptic) {
      triggerHaptic("selection");
    }
    onSelect(action);
  };

  return (
    <Animated.View
      style={[
        styles.actionRow,
        isEnd ? styles.actionRowEnd : styles.actionRowStart,
        animatedRowStyle,
      ]}
    >
      {/* Label Badge (on left if placement is end) */}
      {isEnd && action.label && (
        <View
          style={[
            styles.labelContainer,
            {
              backgroundColor: glass
                ? withAlpha(colors.surfaceRaised, 0.8)
                : colors.surfaceRaised,
              borderRadius: radii.md,
            },
          ]}
        >
          <Text
            variant="caption"
            weight="600"
            style={[{ color: colors.text }, labelStyle]}
          >
            {action.label}
          </Text>
        </View>
      )}

      {/* Action Button */}
      <Pressable
        onPress={handlePress}
        disabled={action.disabled}
        accessibilityRole="button"
        accessibilityLabel={action.label || `Action ${index + 1}`}
        style={[
          styles.actionButton,
          {
            width: btnDimension,
            height: btnDimension,
            borderRadius: radii.full,
            backgroundColor: actionColor,
            opacity: action.disabled ? 0.45 : 1,
          },
          actionButtonStyle,
        ]}
      >
        {renderIcon(action.icon, colors.onPrimary, iconSize)}
      </Pressable>

      {/* Label Badge (on right if placement is start) */}
      {!isEnd && action.label && (
        <View
          style={[
            styles.labelContainer,
            {
              backgroundColor: glass
                ? withAlpha(colors.surfaceRaised, 0.8)
                : colors.surfaceRaised,
              borderRadius: radii.md,
            },
          ]}
        >
          <Text
            variant="caption"
            weight="600"
            style={[{ color: colors.text }, labelStyle]}
          >
            {action.label}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Expanding floating action menu with staggered spring sub-actions, label pills, and backdrop overlay.
 */
export function SpeedDial({
  actions,
  open,
  defaultOpen = false,
  onOpenChange,
  icon,
  activeIcon,
  placement = "bottom-end",
  offset = 20,
  tone = "primary",
  size = "md",
  overlay = true,
  overlayColor,
  glass = false,
  haptic = true,
  animated = true,
  style,
  mainButtonStyle,
  actionButtonStyle,
  labelStyle,
}: SpeedDialProps) {
  const { colors, radii } = useTheme();

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open !== undefined ? open : internalOpen;

  const toggleOpen = useCallback(() => {
    if (haptic) {
      triggerHaptic("selection");
    }
    const next = !isOpen;
    if (open === undefined) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  }, [haptic, isOpen, onOpenChange, open]);

  const handleActionSelect = useCallback(
    (action: SpeedDialActionItem) => {
      if (open === undefined) {
        setInternalOpen(false);
      }
      onOpenChange?.(false);
      action.onPress();
    },
    [onOpenChange, open]
  );

  const mainProgress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      mainProgress.value = withTiming(isOpen ? 1 : 0, {
        duration: 200,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
      });
    } else {
      mainProgress.value = isOpen ? 1 : 0;
    }
  }, [animated, isOpen, mainProgress]);

  const mainRotateStyle = useAnimatedStyle(() => {
    if (activeIcon) return {};
    return {
      transform: [{ rotate: `${mainProgress.value * 45}deg` }],
    };
  });

  const isTop = placement.startsWith("top");
  const isEnd = placement.endsWith("end");

  const mainColor =
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

  const mainDimension = size === "sm" ? 48 : size === "lg" ? 64 : 56;
  const iconDimension = size === "sm" ? 20 : size === "lg" ? 28 : 24;

  const positionStyles: ViewStyle = {
    position: "absolute",
    ...(isTop ? { top: offset } : { bottom: offset }),
    ...(isEnd ? { right: offset } : { left: offset }),
  };

  return (
    <>
      {/* Semi-transparent Modal Overlay when Open */}
      {overlay && isOpen && (
        <Modal
          transparent
          visible={isOpen}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => {
            if (open === undefined) setInternalOpen(false);
            onOpenChange?.(false);
          }}
        >
          <Pressable
            onPress={() => {
              if (open === undefined) setInternalOpen(false);
              onOpenChange?.(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Close speed dial"
            style={[
              styles.backdrop,
              {
                backgroundColor:
                  overlayColor || withAlpha(colors.overlay || "#000", 0.45),
              },
            ]}
          />
        </Modal>
      )}

      {/* Floating SpeedDial Container */}
      <View
        pointerEvents="box-none"
        style={[
          styles.container,
          positionStyles,
          isTop ? styles.containerTop : styles.containerBottom,
          isEnd ? styles.alignEnd : styles.alignStart,
          style,
        ]}
      >
        {/* Expanded Action Buttons (rendered above or below main button) */}
        {isOpen && (
          <View
            style={[
              styles.actionsWrapper,
              isTop ? styles.actionsWrapperTop : styles.actionsWrapperBottom,
              isEnd ? styles.alignEnd : styles.alignStart,
            ]}
          >
            {(isTop ? actions : [...actions].reverse()).map((act, idx) => (
              <SpeedDialActionRow
                key={act.id}
                action={act}
                index={idx}
                total={actions.length}
                isOpen={isOpen}
                isTop={isTop}
                isEnd={isEnd}
                parentTone={tone}
                size={size}
                animated={animated}
                haptic={haptic}
                glass={glass}
                onSelect={handleActionSelect}
                actionButtonStyle={actionButtonStyle}
                labelStyle={labelStyle}
              />
            ))}
          </View>
        )}

        {/* Primary FAB Trigger Button */}
        <Pressable
          onPress={toggleOpen}
          accessibilityRole="button"
          accessibilityLabel="Open speed dial menu"
          style={[
            styles.mainFab,
            {
              width: mainDimension,
              height: mainDimension,
              borderRadius: radii.full,
              backgroundColor: mainColor,
            },
            mainButtonStyle,
          ]}
        >
          <Animated.View style={mainRotateStyle}>
            {isOpen && activeIcon ? (
              renderIcon(activeIcon, colors.onPrimary, iconDimension)
            ) : icon ? (
              renderIcon(icon, colors.onPrimary, iconDimension)
            ) : (
              <Svg
                width={iconDimension}
                height={iconDimension}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.onPrimary}
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Line x1={12} y1={5} x2={12} y2={19} />
                <Line x1={5} y1={12} x2={19} y2={12} />
              </Svg>
            )}
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
  },
  containerTop: {
    flexDirection: "column",
  },
  containerBottom: {
    flexDirection: "column-reverse",
  },
  alignEnd: {
    alignItems: "flex-end",
  },
  alignStart: {
    alignItems: "flex-start",
  },
  actionsWrapper: {
    gap: 12,
  },
  actionsWrapperBottom: {
    marginBottom: 14,
  },
  actionsWrapperTop: {
    marginTop: 14,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  labelContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  mainFab: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
  },
  backdrop: {
    flex: 1,
  },
});
