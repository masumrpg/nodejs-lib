import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
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
import Svg, { Circle, Line, Path, Polygon } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { withAlpha } from "../utils";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  hasActiveShadow,
  minTouchHitSlop,
  renderIcon,
  resolveOutlineBorderColor,
  resolveToneColors,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type ComponentTone,
  type RenderIcon,
  type ToneProps,
  type VariantProps,
} from "./types";

export type AlertTone = ComponentTone;
export type AlertVariant = "filled" | "soft" | "outline" | "accent";

export interface AlertAction {
  label: string;
  onPress: () => void;
  icon?: RenderIcon;
}

export interface AlertProps
  extends BaseGlassProps,
    ToneProps<AlertTone>,
    VariantProps<AlertVariant>,
    BaseAnimatedProps {
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: RenderIcon;
  action?: AlertAction;
  dismissible?: boolean;
  animationDuration?: number;
  onClose?: () => void;
  closeIcon?: RenderIcon;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
}

function DefaultInfoIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Line x1={12} y1={11} x2={12} y2={16} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={1.2} fill={color} />
    </Svg>
  );
}

function DefaultSuccessIcon({
  color,
  onColor,
}: {
  color: string;
  onColor: string;
}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill={color} />
      <Path
        d="M8.5 12.2L10.8 14.5L15.8 9.5"
        stroke={onColor}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DefaultWarningIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="12,3 22,20 2,20"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Line x1={12} y1={9} x2={12} y2={14} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={1.2} fill={color} />
    </Svg>
  );
}

function DefaultDangerIcon({
  color,
  onColor,
}: {
  color: string;
  onColor: string;
}) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} fill={color} />
      <Path
        d="M9 9L15 15M15 9L9 15"
        stroke={onColor}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function DefaultCloseIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6L18 18M18 6L6 18"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function renderDefaultIcon(tone: AlertTone, color: string, onColor: string) {
  if (tone === "success") {
    return <DefaultSuccessIcon color={color} onColor={onColor} />;
  }
  if (tone === "warning") return <DefaultWarningIcon color={color} />;
  if (tone === "danger") {
    return <DefaultDangerIcon color={color} onColor={onColor} />;
  }
  return <DefaultInfoIcon color={color} />;
}

function AlertComponent({
  title,
  children,
  tone = "info",
  variant = "soft",
  glass = false,
  icon,
  action,
  dismissible = false,
  animated = true,
  animationDuration = ANIMATION_TIMING.transition,
  onClose,
  closeIcon,
  style,
  contentStyle,
  titleStyle,
  textStyle,
}: AlertProps) {
  const { colors, components, radii, spacing, shadows, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const [visible, setVisible] = React.useState(true);
  const isClosingRef = React.useRef(false);
  const progress = useSharedValue(1);

  const toneColors = resolveToneColors(tone, colors);
  const currentToneColor = toneColors.solid;
  const currentOnColor = toneColors.on;

  let backgroundColor = colors.surface;
  let borderColor = colors.border;
  let titleTextColor = colors.text;
  let bodyTextColor = colors.textMuted;
  let iconColor = currentToneColor;

  const hasSolidBorder = components.surface.filledBorderColor === "border";
  const isTonalOutline = components.surface.outlineStyle === "tonal";
  const useUnifiedBorder =
    hasSolidBorder || components.surface.outlineBorderColor === "border";

  if (variant === "filled" && !glass) {
    backgroundColor =
      tone === "primary" && isDark ? colors.primaryStrong : currentToneColor;
    borderColor = hasSolidBorder ? colors.border : backgroundColor;
    titleTextColor = currentOnColor;
    bodyTextColor = withAlpha(currentOnColor, 0.88);
    iconColor = currentOnColor;
  } else if (glass) {
    backgroundColor = colors.glassSurfaceStrong;
    borderColor = hasSolidBorder
      ? colors.border
      : withAlpha(currentToneColor, 0.35);
    titleTextColor = colors.text;
    bodyTextColor = colors.textMuted;
    iconColor =
      tone === "warning" && !isDark ? colors.text : currentToneColor;
  } else if (variant === "soft") {
    backgroundColor = isDark
      ? withAlpha(currentToneColor, 0.14)
      : withAlpha(currentToneColor, 0.08);
    borderColor = useUnifiedBorder
      ? colors.border
      : isDark
        ? withAlpha(currentToneColor, 0.3)
        : withAlpha(currentToneColor, 0.24);
    titleTextColor = colors.text;
    bodyTextColor = colors.textMuted;
    iconColor =
      tone === "warning" && !isDark ? "#B45309" : currentToneColor;
  } else if (variant === "outline") {
    backgroundColor = isTonalOutline
      ? isDark
        ? colors.surfaceRaised
        : colors.backgroundMuted
      : colors.transparent;
    borderColor = resolveOutlineBorderColor(
      colors,
      components.surface,
      currentToneColor,
    );
    titleTextColor = colors.text;
    bodyTextColor = colors.textMuted;
    iconColor =
      tone === "warning" && !isDark ? "#B45309" : currentToneColor;
  } else {
    // accent
    backgroundColor = colors.surface;
    borderColor = colors.border;
    titleTextColor = colors.text;
    bodyTextColor = colors.textMuted;
    iconColor =
      tone === "warning" && !isDark ? "#B45309" : currentToneColor;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.98 + progress.value * 0.02 }],
  }));

  const finalizeClose = React.useCallback(() => {
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const handleClose = React.useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (shouldAnimate) {
      progress.value = withTiming(
        0,
        {
          duration: animationDuration,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(finalizeClose);
          }
        },
      );
    } else {
      finalizeClose();
    }
  }, [animationDuration, finalizeClose, progress, shouldAnimate]);

  if (!visible) return null;

  const isSolid = variant === "filled" && !glass;
  const closeHitSlop = minTouchHitSlop(24);
  const feedbackShadow = shadows[components.surface.feedbackShadow];
  const resolvedBorderWidth =
    variant === "outline"
      ? isTonalOutline
        ? 0
        : components.borderWidth.control
      : variant === "filled" && !glass
        ? components.borderWidth.filled
        : components.borderWidth.strong;

  const content = (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          borderWidth: resolvedBorderWidth,
          borderRadius: radii.xl,
          padding: spacing.lg,
          gap: spacing.md,
          overflow: hasActiveShadow(feedbackShadow) ? "visible" : "hidden",
        },
        feedbackShadow,
        variant === "accent" && {
          borderLeftWidth: 4,
          borderLeftColor: currentToneColor,
        },
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        {icon
          ? renderIcon(icon, iconColor, 20)
          : renderDefaultIcon(
              tone,
              iconColor,
              isSolid ? currentOnColor : colors.textInverse,
            )}
      </View>

      <View style={[styles.bodyWrap, contentStyle]}>
        {title ? (
          typeof title === "string" || typeof title === "number" ? (
            <Text
              variant="label"
              weight="600"
              style={[{ color: titleTextColor }, titleStyle]}
            >
              {title}
            </Text>
          ) : (
            title
          )
        ) : null}

        {children ? (
          typeof children === "string" || typeof children === "number" ? (
            <Text
              variant="bodySmall"
              style={[{ color: bodyTextColor, lineHeight: 20 }, textStyle]}
            >
              {children}
            </Text>
          ) : (
            children
          )
        ) : null}

        {action ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={minTouchHitSlop(24)}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                gap: spacing.xs,
                marginTop: spacing.xs,
                opacity: pressed ? 0.72 : 1,
              },
            ]}
          >
            {renderIcon(action.icon, iconColor, 14)}
            <Text variant="labelSmall" weight="600" style={{ color: iconColor }}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {dismissible || onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close alert"
          onPress={handleClose}
          hitSlop={closeHitSlop}
          style={({ pressed }) => [
            styles.closeBtn,
            {
              backgroundColor: pressed
                ? withAlpha(iconColor, 0.15)
                : colors.transparent,
              opacity: pressed ? 0.85 : 0.75,
            },
          ]}
        >
          {closeIcon ? (
            renderIcon(closeIcon, iconColor, 16)
          ) : (
            <DefaultCloseIcon color={iconColor} />
          )}
        </Pressable>
      ) : null}
    </View>
  );

  if (shouldAnimate) {
    return <Animated.View style={animatedStyle}>{content}</Animated.View>;
  }

  return content;
}

export const Alert = React.memo(AlertComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
  },
  iconWrap: {
    marginTop: 2,
  },
  bodyWrap: {
    flex: 1,
    gap: 4,
  },
  actionBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
