import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  type AppStateStatus,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { Portal, useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Button } from "./Button";
import { Progress } from "./Progress";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  resolveOutlineBorderColor,
  webDeps,
  type BaseGlassProps,
  type ComponentTone,
  type RenderIcon,
} from "./types";

export type ToastTone = "default" | "success" | "warning" | "danger" | "info";
export type ToastVariant = "solid" | "outline" | "flat" | "subtle";
export type ToastPlacement = "top" | "bottom";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  id?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  tone?: ToastTone;
  variant?: ToastVariant;
  glass?: boolean;
  icon?: RenderIcon;
  media?: React.ReactNode;
  banner?: React.ReactNode;
  progress?: number;
  content?: React.ReactNode;
  closeIcon?: RenderIcon;
  action?: ToastAction;
  duration?: number;
}

export interface ToastRecord extends Required<Pick<ToastOptions, "id">> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  tone: ToastTone;
  variant: ToastVariant;
  glass?: boolean;
  icon?: RenderIcon;
  media?: React.ReactNode;
  banner?: React.ReactNode;
  progress?: number;
  content?: React.ReactNode;
  closeIcon?: RenderIcon;
  action?: ToastAction;
  duration: number;
  open: boolean;
}

export interface ToastContextValue {
  show: (options: ToastOptions) => string;
  dismiss: (id?: string) => void;
  update: (id: string, options: Omit<ToastOptions, "id">) => void;
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);

interface ToastItemContextValue {
  isSolid: boolean;
  tone: { base: string; soft: string };
  onToneColor?: string;
}

const ToastItemContext = React.createContext<ToastItemContextValue>({
  isSolid: true,
  tone: { base: "", soft: "" },
});

export interface ToastProviderProps extends BaseGlassProps {
  children: React.ReactNode;
  placement?: ToastPlacement;
  variant?: ToastVariant;
  offset?: number;
  duration?: number;
  maxToasts?: number;
  swipeToDismiss?: boolean;
  renderToast?: (
    toast: ToastRecord,
    controls: ToastContextValue,
  ) => React.ReactNode;
  viewportStyle?: StyleProp<ViewStyle>;
}

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function resolveToastProgressTone(tone: ToastTone): ComponentTone {
  if (tone === "default") return "primary";
  return tone;
}

export function ToastProvider({
  children,
  placement = "top",
  variant: defaultVariant = "subtle",
  glass: defaultGlass = false,
  offset,
  duration = 3500,
  maxToasts = 3,
  swipeToDismiss = true,
  renderToast,
  viewportStyle,
}: ToastProviderProps) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const toastsRef = useRef<ToastRecord[]>([]);
  toastsRef.current = toasts;

  const resolvedViewportOffset =
    offset ??
    (placement === "top"
      ? Math.max(insets.top, StatusBar.currentHeight ?? 0) + spacing.sm
      : Math.max(insets.bottom, 0) + spacing.md);

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const activeIds = new Set(toasts.filter((t) => t.open).map((t) => t.id));
    for (const id of Array.from(timers.current.keys())) {
      if (!activeIds.has(id)) {
        clearTimer(id);
      }
    }
  }, [clearTimer, toasts]);

  const remove = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer],
  );

  const dismiss = useCallback(
    (id?: string) => {
      setToasts((current) =>
        current.map((toast) => {
          if (id && toast.id !== id) return toast;
          clearTimer(toast.id);
          return { ...toast, open: false };
        }),
      );
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (toast: ToastRecord) => {
      clearTimer(toast.id);
      if (toast.duration <= 0) return;

      const timer = setTimeout(() => dismiss(toast.id), toast.duration);
      timers.current.set(toast.id, timer);
    },
    [clearTimer, dismiss],
  );

  const show = useCallback(
    (options: ToastOptions) => {
      triggerHaptic("medium");
      const id = options.id ?? createToastId();
      const nextToast: ToastRecord = {
        ...options,
        id,
        tone: options.tone ?? "default",
        variant: options.variant ?? defaultVariant,
        glass: options.glass ?? defaultGlass,
        duration: options.duration ?? duration,
        open: true,
      };

      setToasts((current) => {
        const withoutDuplicate = current.filter((toast) => toast.id !== id);
        const next =
          placement === "top"
            ? [nextToast, ...withoutDuplicate]
            : [...withoutDuplicate, nextToast];

        return placement === "top"
          ? next.slice(0, maxToasts)
          : next.slice(-maxToasts);
      });
      scheduleDismiss(nextToast);

      return id;
    },
    [defaultGlass, defaultVariant, duration, maxToasts, placement, scheduleDismiss],
  );

  const update = useCallback(
    (id: string, options: Omit<ToastOptions, "id">) => {
      triggerHaptic("selection");
      const existing = toastsRef.current.find((toast) => toast.id === id);
      const nextToast: ToastRecord | null = existing
        ? {
            ...existing,
            ...options,
            duration: options.duration ?? existing.duration,
            open: true,
          }
        : null;

      setToasts((current) =>
        current.map((toast) => {
          if (toast.id !== id) return toast;
          return {
            ...toast,
            ...options,
            duration: options.duration ?? toast.duration,
            open: true,
          };
        }),
      );

      if (nextToast) {
        scheduleDismiss(nextToast);
      }
    },
    [scheduleDismiss],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const controls = useMemo<ToastContextValue>(
    () => ({ show, dismiss, update }),
    [dismiss, show, update],
  );

  const viewportNode =
    toasts.length > 0 ? (
      <ToastViewport
        placement={placement}
        offset={resolvedViewportOffset}
        style={viewportStyle}
      >
        {toasts.map((toast, index) =>
          renderToast ? (
            <React.Fragment key={toast.id}>
              {renderToast(toast, controls)}
            </React.Fragment>
          ) : (
            <Toast
              key={toast.id}
              toast={toast}
              index={index}
              totalToasts={toasts.length}
              viewportOffset={resolvedViewportOffset}
              placement={placement}
              swipeToDismiss={swipeToDismiss}
              onDismiss={() => dismiss(toast.id)}
              onCloseComplete={() => remove(toast.id)}
            />
          ),
        )}
      </ToastViewport>
    ) : null;

  return (
    <ToastContext.Provider value={controls}>
      <View style={styles.providerRoot}>
        {children}
        {viewportNode ? (
          <Portal layer="toast">
            <ToastContext.Provider value={controls}>
              {viewportNode}
            </ToastContext.Provider>
          </Portal>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export interface ToastViewportProps extends ViewProps {
  placement?: ToastPlacement;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

export const ToastViewport = React.memo(function ToastViewport({
  placement = "top",
  offset,
  style,
  ...props
}: ToastViewportProps) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const resolvedOffset =
    offset ??
    (placement === "top"
      ? Math.max(insets.top, StatusBar.currentHeight ?? 0) + spacing.sm
      : Math.max(insets.bottom, 0) + spacing.md);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.viewport,
        {
          gap: spacing.sm,
          flexDirection: placement === "top" ? "column" : "column-reverse",
          left: spacing.lg,
          right: spacing.lg,
          top: placement === "top" ? resolvedOffset : undefined,
          bottom: placement === "bottom" ? resolvedOffset : undefined,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface ToastProps extends ViewProps {
  toast: ToastRecord;
  index?: number;
  totalToasts?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  viewportOffset?: number;
  placement?: ToastPlacement;
  swipeToDismiss?: boolean;
  onDismiss?: () => void;
  onCloseComplete?: () => void;
  style?: StyleProp<ViewStyle>;
}

function getToastTone(
  tone: ToastTone,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  if (tone === "success")
    return { base: colors.success, soft: colors.successSoft };
  if (tone === "warning")
    return { base: colors.warning, soft: colors.warningSoft };
  if (tone === "danger")
    return { base: colors.danger, soft: colors.dangerSoft };
  if (tone === "info") return { base: colors.info, soft: colors.infoSoft };
  return { base: colors.primary, soft: colors.surfaceMuted };
}

function getToastOnToneColor(
  tone: ToastTone,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  if (tone === "success") return colors.onSuccess ?? colors.textInverse;
  if (tone === "warning") return colors.onWarning ?? colors.textInverse;
  if (tone === "danger") return colors.onDanger ?? colors.textInverse;
  if (tone === "info") return colors.onInfo ?? colors.textInverse;
  return colors.onPrimary ?? colors.textInverse;
}

const DefaultToastToneIcon = React.memo(function DefaultToastToneIcon({
  tone,
  color,
  isSolid,
  onColor,
}: {
  tone: ToastTone;
  color: string;
  isSolid?: boolean;
  onColor?: string;
}) {
  const iconColor = isSolid ? (onColor ?? "#FFFFFF") : color;

  if (tone === "success") {
    return (
      <Svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <Path d="M22 4L12 14.01l-3-3" />
      </Svg>
    );
  }

  if (tone === "danger") {
    return (
      <Svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Circle cx={12} cy={12} r={10} />
        <Path d="M12 8v4" />
        <Path d="M12 16h.01" />
      </Svg>
    );
  }

  if (tone === "warning") {
    return (
      <Svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <Path d="M12 9v4" />
        <Path d="M12 17h.01" />
      </Svg>
    );
  }

  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke={iconColor}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 16v-4" />
      <Path d="M12 8h.01" />
    </Svg>
  );
});

const CLOSE_BUTTON_SIZE = 30;

export const Toast = React.memo(function Toast({
  toast,
  viewportOffset = 56,
  onToggleExpand,
  placement = "top",
  swipeToDismiss = true,
  onDismiss,
  onCloseComplete,
  style,
  ...props
}: ToastProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();

  const [toastHeight, setToastHeight] = useState(76);
  const progress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateYDrag = useSharedValue(0);
  const rotateValue = useSharedValue(0);
  const slideDistanceSV = useSharedValue(
    Math.max(140, toastHeight + viewportOffset + 32),
  );
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      setAppActive(next === "active");
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    slideDistanceSV.value = Math.max(140, toastHeight + viewportOffset + 32);
  }, [slideDistanceSV, toastHeight, viewportOffset]);

  const tone = useMemo(
    () => getToastTone(toast.tone, colors),
    [colors, toast.tone],
  );
  const isAsyncLoading = toast.duration === 0;

  useEffect(() => {
    if (toast.open) {
      translateX.value = 0;
      translateYDrag.value = 0;
    }
    if (reducedMotion) {
      progress.value = toast.open ? 1 : 0;
      if (!toast.open && onCloseComplete) {
        onCloseComplete();
      }
      return;
    }

    progress.value = withTiming(
      toast.open ? 1 : 0,
      toast.open
        ? {
            duration: 280,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
          }
        : {
            duration: 230,
            easing: Easing.bezier(0.4, 0, 1, 1),
          },
      (finished) => {
        if (finished && !toast.open && onCloseComplete) {
          scheduleOnRN(onCloseComplete);
        }
      },
    );
  }, [
    onCloseComplete,
    progress,
    reducedMotion,
    toast.open,
    translateX,
    translateYDrag,
  ]);

  useEffect(() => {
    if (isAsyncLoading && appActive && !reducedMotion) {
      rotateValue.value = withRepeat(
        withTiming(360, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      );
      return () => {
        cancelAnimation(rotateValue);
      };
    }
    cancelAnimation(rotateValue);
    rotateValue.value = 0;
    return undefined;
  }, [appActive, isAsyncLoading, reducedMotion, rotateValue]);

  const exitDistance = windowWidth + 40;

  const panGesture = usePanGesture({
    enabled: swipeToDismiss,
    activeOffsetX: [-12, 12],
    activeOffsetY: [-10, 10],
    onUpdate: (event) => {
      "worklet";
      if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
        translateX.value = event.translationX;
        translateYDrag.value = 0;
      } else {
        const towardDismissEdge =
          placement === "top"
            ? event.translationY < 0
            : event.translationY > 0;
        translateYDrag.value = towardDismissEdge
          ? event.translationY
          : event.translationY * 0.15;
      }
    },
    onDeactivate: (event) => {
      "worklet";
      if (event.canceled) {
        translateX.value = withTiming(0, {
          duration: ANIMATION_TIMING.transition,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
        translateYDrag.value = withTiming(0, {
          duration: ANIMATION_TIMING.transition,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
        return;
      }
      const isHorizontal =
        Math.abs(event.translationX) > Math.abs(event.translationY);

      if (
        isHorizontal &&
        (Math.abs(event.translationX) > 72 || Math.abs(event.velocityX) > 600)
      ) {
        const exitTarget =
          event.velocityX > 0 || (event.velocityX === 0 && event.translationX > 0)
            ? exitDistance
            : -exitDistance;
        translateX.value = withTiming(
          exitTarget,
          { duration: 150, easing: Easing.bezier(...ANIMATION_TIMING.bezier) },
          (finished) => {
            if (finished && onDismiss) {
              scheduleOnRN(onDismiss);
            }
          },
        );
        return;
      }

      const dismissVertically =
        !isHorizontal &&
        (placement === "top"
          ? event.translationY < -32 || event.velocityY < -400
          : event.translationY > 32 || event.velocityY > 400);

      if (dismissVertically) {
        const verticalTarget =
          placement === "top" ? -slideDistanceSV.value : slideDistanceSV.value;
        translateYDrag.value = withTiming(
          verticalTarget,
          { duration: 160, easing: Easing.bezier(0.4, 0, 1, 1) },
          (finished) => {
            if (finished && onDismiss) {
              scheduleOnRN(onDismiss);
            }
          },
        );
        return;
      }

      translateX.value = withTiming(0, {
        duration: ANIMATION_TIMING.transition,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
      translateYDrag.value = withTiming(0, {
        duration: ANIMATION_TIMING.transition,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const travel =
      placement === "top" ? -slideDistanceSV.value : slideDistanceSV.value;
    return {
      opacity: interpolate(
        progress.value,
        [0, 0.22, 1],
        [0, 1, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateY: travel * (1 - progress.value) + translateYDrag.value },
        { translateX: translateX.value },
        { scale: 0.96 + progress.value * 0.04 },
      ],
    };
  }, webDeps([placement]));

  const animatedIconStyle = useAnimatedStyle(() => {
    const raw = Number.isFinite(rotateValue.value) ? rotateValue.value : 0;
    const safeDeg = ((raw % 360) + 360) % 360;
    return {
      transform: [{ rotate: `${safeDeg.toFixed(1)}deg` }],
    };
  });

  const isSolid = toast.variant === "solid";
  const isFlat = toast.variant === "flat";
  const isOutlined = toast.variant === "outline";
  const isGlass = Boolean(toast.glass);

  const surfaceBg = isGlass
    ? colors.glassSurfaceStrong
    : isDark
      ? colors.surfaceRaised
      : colors.surface;

  const containerBg = isSolid ? tone.base : surfaceBg;
  const borderColor = isGlass
    ? colors.glassBorder
    : isFlat || isSolid
      ? "transparent"
      : isOutlined
        ? resolveOutlineBorderColor(colors, components.surface, tone.base)
        : colors.border;

  const borderWidth = isFlat || isSolid
    ? 0
    : isOutlined
      ? components.borderWidth.strong
      : components.borderWidth.default;
  const onToneColor = getToastOnToneColor(toast.tone, colors);

  const itemContextValue = useMemo(
    () => ({ isSolid, tone, onToneColor }),
    [isSolid, tone, onToneColor],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const layoutHeight = event.nativeEvent.layout.height;
      if (layoutHeight > 0 && Math.abs(layoutHeight - toastHeight) > 2) {
        setToastHeight(layoutHeight);
      }
    },
    [toastHeight],
  );

  return (
    <ToastItemContext.Provider value={itemContextValue}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          accessibilityRole="alert"
          style={[
            styles.toastCard,
            {
              position: "relative",
              borderRadius: radii.xl,
              borderWidth,
              borderColor,
              backgroundColor: containerBg,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              gap: spacing.md,
              alignItems: toast.banner ? "flex-start" : "center",
            },
            !isFlat ? shadows.lg : undefined,
            animatedStyle,
            style,
          ]}
          onLayout={handleLayout}
          {...props}
        >
          {toast.media ? (
            <View style={styles.mediaWrap}>{toast.media}</View>
          ) : (
            <Animated.View
              style={[
                styles.iconBadge,
                {
                  borderRadius: radii.md,
                  backgroundColor: isSolid
                    ? withAlpha(onToneColor, 0.22)
                    : tone.soft,
                },
                isAsyncLoading ? animatedIconStyle : undefined,
              ]}
            >
              {toast.icon ? (
                renderIcon(toast.icon, isSolid ? onToneColor : tone.base, 18)
              ) : (
                <DefaultToastToneIcon
                  tone={toast.tone}
                  color={tone.base}
                  isSolid={isSolid}
                  onColor={onToneColor}
                />
              )}
            </Animated.View>
          )}

          <ToastContent onPress={onToggleExpand}>
            {toast.title ? <ToastTitle>{toast.title}</ToastTitle> : null}
            {toast.description ? (
              <ToastDescription>{toast.description}</ToastDescription>
            ) : null}
            {toast.banner ? (
              <View style={{ marginTop: spacing.xs, width: "100%" }}>
                {toast.banner}
              </View>
            ) : null}
            {typeof toast.progress === "number" ? (
              <View style={styles.progressWrap}>
                <Progress
                  value={Math.min(100, Math.max(0, toast.progress))}
                  tone={resolveToastProgressTone(toast.tone)}
                  size="xs"
                  style={[
                    styles.progressBar,
                    isSolid
                      ? { backgroundColor: withAlpha(onToneColor, 0.28) }
                      : undefined,
                  ]}
                  indicatorStyle={
                    isSolid ? { backgroundColor: onToneColor } : undefined
                  }
                />
              </View>
            ) : null}
            {toast.content}
          </ToastContent>

          {toast.action ? (
            <ToastAction
              label={toast.action.label}
              onPress={() => {
                triggerHaptic("selection");
                toast.action?.onPress();
                onDismiss?.();
              }}
            />
          ) : null}

          <ToastClose onPress={onDismiss} icon={toast.closeIcon} />
        </Animated.View>
      </GestureDetector>
    </ToastItemContext.Provider>
  );
});

export interface ToastContentProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const ToastContent = React.memo(function ToastContent({
  style,
  onPress,
  ...props
}: ToastContentProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.content, style]}
        {...props}
      />
    );
  }

  return <View style={[styles.content, style]} {...props} />;
});

export interface ToastTitleProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const ToastTitle = React.memo(function ToastTitle({
  children,
  style,
}: ToastTitleProps) {
  const { colors } = useTheme();
  const { isSolid, onToneColor } = React.useContext(ToastItemContext);
  if (typeof children !== "string" && typeof children !== "number") {
    return <>{children}</>;
  }

  return (
    <Text
      variant="label"
      weight="700"
      style={[
        {
          color: isSolid ? (onToneColor ?? colors.onPrimary) : colors.text,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
});

export interface ToastDescriptionProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const ToastDescription = React.memo(function ToastDescription({
  children,
  style,
}: ToastDescriptionProps) {
  const { colors } = useTheme();
  const { isSolid, onToneColor } = React.useContext(ToastItemContext);
  if (typeof children !== "string" && typeof children !== "number") {
    return <>{children}</>;
  }

  return (
    <Text
      variant="bodySmall"
      style={[
        {
          lineHeight: 18,
          color: isSolid
            ? withAlpha(onToneColor ?? colors.onPrimary, 0.9)
            : colors.textMuted,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
});

export interface ToastActionProps {
  label: string;
  onPress?: () => void;
}

export const ToastAction = React.memo(function ToastAction({
  label,
  onPress,
}: ToastActionProps) {
  const { isSolid, onToneColor } = React.useContext(ToastItemContext);

  return (
    <Button
      size="xs"
      variant={isSolid ? "filled" : "outline"}
      tone="primary"
      onPress={onPress}
      style={
        isSolid
          ? { backgroundColor: withAlpha(onToneColor ?? "#FFFFFF", 0.22) }
          : undefined
      }
    >
      {label}
    </Button>
  );
});

export interface ToastCloseProps {
  onPress?: () => void;
  icon?: RenderIcon;
}

export const ToastClose = React.memo(function ToastClose({
  onPress,
  icon,
}: ToastCloseProps) {
  const { colors } = useTheme();
  const { isSolid, onToneColor } = React.useContext(ToastItemContext);

  const handleClose = useCallback(() => {
    triggerHaptic("selection");
    onPress?.();
  }, [onPress]);

  const closeColor = isSolid
    ? (onToneColor ?? colors.onPrimary)
    : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close toast"
      onPress={handleClose}
      hitSlop={minTouchHitSlop(CLOSE_BUTTON_SIZE)}
      style={({ pressed }) => [
        styles.closeButton,
        {
          backgroundColor: pressed
            ? isSolid
              ? withAlpha(closeColor, 0.2)
              : colors.backgroundMuted
            : "transparent",
          opacity: pressed ? 0.72 : 0.9,
        },
      ]}
    >
      {icon ? (
        renderIcon(icon, closeColor, 16)
      ) : (
        <Svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke={closeColor}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="M18 6L6 18M6 6l12 12" />
        </Svg>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
  viewport: {
    position: "absolute",
    zIndex: 9999,
  },
  toastCard: {
    width: "100%",
    flexDirection: "row",
  },
  mediaWrap: {
    marginRight: 2,
  },
  iconBadge: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  progressWrap: {
    marginTop: 6,
    width: "100%",
  },
  progressBar: {
    height: 4,
  },
  closeButton: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    borderRadius: CLOSE_BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
