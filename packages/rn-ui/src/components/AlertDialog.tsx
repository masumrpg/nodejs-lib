import React, { useCallback, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ModalProps,
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

import { useTheme } from "../theme";
import { useDelayedUnmount, withAlpha } from "../utils";
import { triggerHaptic } from "../utils/haptics";
import { Button } from "./Button";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveToneColors,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type RenderIcon,
  type ToneProps,
} from "./types";

export type AlertDialogTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "secondary";

export type AlertDialogAlign = "center" | "left";

export interface AlertDialogProps
  extends ToneProps<AlertDialogTone>,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  visible: boolean;
  align?: AlertDialogAlign;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  icon?: RenderIcon;
  closeIcon?: RenderIcon;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  dismissOnBackdropPress?: boolean;
  animationDuration?: number;
  modalProps?: Omit<
    ModalProps,
    "visible" | "transparent" | "animationType" | "onRequestClose"
  >;
  overlayStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}

const CLOSE_BUTTON_SIZE = 34;

export const AlertDialog = React.memo(function AlertDialog({
  visible,
  align = "center",
  title,
  description,
  children,
  tone = "primary",
  glass = false,
  haptic = true,
  icon,
  closeIcon,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  onClose,
  confirmLoading = false,
  confirmDisabled = false,
  cancelDisabled = false,
  dismissOnBackdropPress = true,
  animated = true,
  animationDuration = 160,
  modalProps,
  overlayStyle,
  style,
  contentStyle,
  titleStyle,
  descriptionStyle,
}: AlertDialogProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const exitDuration = shouldAnimate ? Math.max(110, animationDuration - 30) : 0;
  const shouldMount = useDelayedUnmount(visible, exitDuration);

  const progress = useSharedValue(visible ? 1 : 0);
  const toneColor = resolveToneColors(tone, colors).solid;

  useEffect(() => {
    if (visible) {
      if (haptic) triggerHaptic("medium");
      if (shouldAnimate) {
        progress.value = withTiming(1, {
          duration: animationDuration,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
      } else {
        progress.value = 1;
      }
    } else if (shouldAnimate) {
      progress.value = withTiming(0, {
        duration: exitDuration,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    } else {
      progress.value = 0;
    }
  }, [animationDuration, exitDuration, haptic, progress, shouldAnimate, visible]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.94 + progress.value * 0.06 },
      { translateY: 10 * (1 - progress.value) },
    ],
  }));

  const requestClose = useCallback(() => {
    if (haptic) triggerHaptic("selection");
    if (onClose) {
      onClose();
    } else {
      onCancel?.();
    }
  }, [haptic, onCancel, onClose]);

  const handleBackdropPress = useCallback(() => {
    if (dismissOnBackdropPress) {
      requestClose();
    }
  }, [dismissOnBackdropPress, requestClose]);

  const handleConfirm = useCallback(() => {
    if (confirmDisabled || confirmLoading) return;
    if (haptic) triggerHaptic("light");
    onConfirm?.();
  }, [confirmDisabled, confirmLoading, haptic, onConfirm]);

  const handleCancel = useCallback(() => {
    if (cancelDisabled) return;
    if (haptic) triggerHaptic("selection");
    onCancel?.();
  }, [cancelDisabled, haptic, onCancel]);

  if (!shouldMount && !visible) return null;

  const dialogBg = glass ? colors.glassSurfaceStrong : colors.surface;
  const borderColor = glass
    ? colors.glassBorder
    : components.surface.filledBorderColor === "border" ||
        components.surface.outlineBorderColor === "border"
      ? colors.border
      : withAlpha(toneColor, isDark ? 0.35 : 0.25);
  const isCentered = align === "center";

  const dialog = (
    <View
      accessibilityViewIsModal={true}
      style={[
        styles.dialog,
        {
          backgroundColor: dialogBg,
          borderRadius: radii.xxl,
          borderWidth: components.borderWidth.strong,
          borderColor,
          padding: spacing.xl,
          gap: spacing.lg,
          alignItems: isCentered ? "center" : "stretch",
        },
        shadows.lg,
        style,
      ]}
    >
      {onClose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          onPress={requestClose}
          hitSlop={minTouchHitSlop(CLOSE_BUTTON_SIZE)}
          style={({ pressed }) => [
            styles.closeButton,
            {
              top: spacing.md,
              right: spacing.md,
              borderRadius: radii.full,
              backgroundColor: pressed ? colors.backgroundMuted : "transparent",
              opacity: pressed ? 0.8 : 0.75,
            },
          ]}
        >
          {closeIcon ? (
            renderIcon(closeIcon, colors.textMuted, 16)
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
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          )}
        </Pressable>
      ) : null}

      {icon ? (
        <View
          style={{
            width: isCentered ? 56 : 44,
            height: isCentered ? 56 : 44,
            borderRadius: isCentered ? radii.full : radii.md,
            backgroundColor: withAlpha(toneColor, 0.14),
            borderWidth: components.borderWidth.strong,
            borderColor: withAlpha(toneColor, 0.28),
            alignItems: "center",
            justifyContent: "center",
            alignSelf: isCentered ? "center" : "flex-start",
          }}
        >
          {renderIcon(icon, toneColor, isCentered ? 26 : 22)}
        </View>
      ) : null}

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        style={styles.bodyScroll}
        contentContainerStyle={[
          styles.content,
          {
            gap: spacing.xs,
            alignItems: isCentered ? "center" : "flex-start",
          },
          contentStyle,
        ]}
      >
        {title ? (
          typeof title === "string" ? (
            <Text
              variant="h3"
              weight="700"
              style={[
                {
                  textAlign: isCentered ? "center" : "left",
                  color: colors.text,
                },
                titleStyle,
              ]}
            >
              {title}
            </Text>
          ) : (
            title
          )
        ) : null}

        {description ? (
          typeof description === "string" ? (
            <Text
              variant="bodySmall"
              color="textMuted"
              style={[
                {
                  textAlign: isCentered ? "center" : "left",
                  lineHeight: 22,
                },
                descriptionStyle,
              ]}
            >
              {description}
            </Text>
          ) : (
            description
          )
        ) : null}

        {children ? (
          <View style={[styles.fullWidth, { marginTop: spacing.xs }]}>
            {children}
          </View>
        ) : null}
      </ScrollView>

      {onCancel || onConfirm ? (
        <View
          style={[
            styles.actions,
            {
              justifyContent: isCentered ? "center" : "flex-end",
              gap: spacing.sm,
              marginTop: spacing.xs,
            },
          ]}
        >
          {onCancel ? (
            <Button
              variant="outline"
              tone="secondary"
              size="md"
              style={isCentered ? styles.flexOne : undefined}
              disabled={cancelDisabled}
              onPress={handleCancel}
            >
              {cancelText}
            </Button>
          ) : null}

          {onConfirm ? (
            <Button
              variant="filled"
              tone={tone}
              size="md"
              style={isCentered ? styles.flexOne : undefined}
              loading={confirmLoading}
              disabled={confirmDisabled}
              onPress={handleConfirm}
            >
              {confirmText}
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={shouldMount}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={requestClose}
      {...modalProps}
    >
      <View style={[styles.container, { padding: spacing.xl }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? withAlpha("#000000", 0.78)
                : withAlpha("#0F172A", 0.65),
            },
            backdropAnimatedStyle,
            overlayStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog"
            style={styles.flexOne}
            onPress={handleBackdropPress}
          />
        </Animated.View>

        {shouldAnimate ? (
          <Animated.View style={[styles.cardWrap, cardAnimatedStyle]}>
            {dialog}
          </Animated.View>
        ) : (
          dialog
        )}
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrap: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    position: "relative",
  },
  bodyScroll: {
    width: "100%",
  },
  closeButton: {
    position: "absolute",
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    width: "100%",
  },
  fullWidth: {
    width: "100%",
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  flexOne: {
    flex: 1,
  },
});
