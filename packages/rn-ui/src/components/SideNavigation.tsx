import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { Portal } from "../theme/Portal";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { Badge } from "./Badge";
import { Text } from "./Text";
import { Tooltip } from "./Tooltip";
import {
  renderIcon,
  resolveToneColors,
  webDeps,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type ComponentTone,
  type RenderIcon,
  type ToneProps,
} from "./types";

export type SideNavVariant =
  | "drawer"
  | "rail"
  | "expanded"
  | "floating"
  | "collapsible";

export type SideNavPosition = "left" | "right";

export interface SideNavContextValue {
  variant: SideNavVariant;
  position: SideNavPosition;
  activeKey?: string;
  collapsed: boolean;
  isRail: boolean;
  tone: ComponentTone;
  activeVariant: "solid" | "subtle" | "outline" | "ghost";
  glass: boolean;
  onSelect?: (key: string) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  closeDrawer: () => void;
}

export const SideNavContext = createContext<SideNavContextValue | null>(null);

export function useSideNavContext(): SideNavContextValue {
  const ctx = useContext(SideNavContext);
  if (!ctx) {
    return {
      variant: "expanded",
      position: "left",
      collapsed: false,
      isRail: false,
      tone: "primary",
      activeVariant: "subtle",
      glass: false,
      closeDrawer: () => {},
    };
  }
  return ctx;
}

const SIDE_NAV_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const DEFAULT_DRAWER_WIDTH = 280;
const DEFAULT_EXPANDED_WIDTH = 260;
const DEFAULT_RAIL_WIDTH = 70;
const DEFAULT_FLOATING_WIDTH = 260;

export interface SideNavigationProps
  extends ViewProps,
    ToneProps,
    BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  /**
   * Layout presentation variant.
   * - `drawer`: sliding overlay drawer with backdrop and swipe-to-dismiss gesture.
   * - `rail`: compact 70px icon dock with tooltips for desktop/tablet.
   * - `expanded`: full 260px persistent sidebar.
   * - `floating`: elevated floating island dock with rounded margins.
   * - `collapsible`: smoothly animates between expanded and compact rail states.
   * @default "expanded"
   */
  variant?: SideNavVariant;

  /**
   * Active item visual highlight style.
   * @default "subtle"
   */
  activeVariant?: "solid" | "subtle" | "outline" | "ghost";

  /**
   * Drawer edge anchor position.
   * @default "left"
   */
  position?: SideNavPosition;

  /**
   * Drawer visibility state (controlled).
   * Relevant when `variant="drawer"`.
   * @default false
   */
  isOpen?: boolean;

  /**
   * Callback fired when drawer open/close state changes.
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Controlled collapsed state for `variant="collapsible"`.
   */
  collapsed?: boolean;

  /**
   * Callback fired when collapsed state changes.
   */
  onCollapsedChange?: (collapsed: boolean) => void;

  /**
   * Currently active navigation item identifier.
   */
  activeKey?: string;

  /**
   * Callback fired when an item is pressed.
   */
  onSelect?: (key: string) => void;

  /**
   * Custom width for expanded sidebar or drawer.
   * Defaults to 280 for drawer, 260 for expanded/floating.
   */
  width?: number;

  /**
   * Custom width for rail mode or collapsed state.
   * Defaults to 70.
   */
  collapsedWidth?: number;

  /**
   * Whether to wrap drawer in Portal overlay layer.
   * @default true
   */
  portal?: boolean;

  /**
   * Additional style for the drawer backdrop.
   */
  overlayStyle?: StyleProp<ViewStyle>;

  /**
   * Navigation content children.
   */
  children?: ReactNode;
}

/**
 * High-performance, cross-platform side navigation container with
 * zero-bounce animations, gesture swipe dismiss, and multi-theme preset adaptation.
 */
export const SideNavigation = React.memo(function SideNavigation({
  variant = "expanded",
  position = "left",
  isOpen = false,
  onOpenChange,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  activeKey,
  onSelect,
  width: customWidth,
  collapsedWidth: customCollapsedWidth = DEFAULT_RAIL_WIDTH,
  tone = "primary",
  activeVariant = "subtle",
  glass = false,
  haptic = true,
  animated = true,
  portal = true,
  overlayStyle,
  style,
  children,
  ...props
}: SideNavigationProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const isControlledCollapsed = controlledCollapsed !== undefined;
  const isCollapsed = isControlledCollapsed
    ? Boolean(controlledCollapsed)
    : internalCollapsed;

  const handleCollapsedChange = useCallback(
    (next: boolean) => {
      if (!isControlledCollapsed) {
        setInternalCollapsed(next);
      }
      onCollapsedChange?.(next);
      if (haptic) {
        triggerHaptic("selection");
      }
    },
    [haptic, isControlledCollapsed, onCollapsedChange],
  );

  const resolvedWidth =
    customWidth ??
    (variant === "drawer"
      ? DEFAULT_DRAWER_WIDTH
      : variant === "floating"
        ? DEFAULT_FLOATING_WIDTH
        : DEFAULT_EXPANDED_WIDTH);

  const isRail = variant === "rail" || (variant === "collapsible" && isCollapsed);
  const currentWidth = isRail ? customCollapsedWidth : resolvedWidth;

  const drawerAnim = useSharedValue(isOpen ? 1 : 0);
  const dragTranslateX = useSharedValue(0);

  useEffect(() => {
    if (!shouldAnimate) {
      drawerAnim.value = isOpen ? 1 : 0;
      dragTranslateX.value = 0;
      return;
    }
    cancelAnimation(drawerAnim);
    cancelAnimation(dragTranslateX);
    dragTranslateX.value = 0;
    drawerAnim.value = withTiming(isOpen ? 1 : 0, {
      duration: isOpen ? 220 : 180,
      easing: SIDE_NAV_EASING,
    });
  }, [drawerAnim, dragTranslateX, isOpen, shouldAnimate]);

  const handleCloseDrawer = useCallback(() => {
    if (onOpenChange) {
      onOpenChange(false);
    }
    if (haptic) {
      triggerHaptic("selection");
    }
  }, [haptic, onOpenChange]);

  const handleSelect = useCallback(
    (key: string) => {
      onSelect?.(key);
      if (variant === "drawer") {
        handleCloseDrawer();
      }
      if (haptic) {
        triggerHaptic("selection");
      }
    },
    [handleCloseDrawer, haptic, onSelect, variant],
  );

  const contextValue = useMemo<SideNavContextValue>(
    () => ({
      variant,
      position,
      activeKey,
      collapsed: isCollapsed,
      isRail,
      tone,
      activeVariant,
      glass,
      onSelect: handleSelect,
      onCollapsedChange: handleCollapsedChange,
      closeDrawer: handleCloseDrawer,
    }),
    [
      variant,
      position,
      activeKey,
      isCollapsed,
      isRail,
      tone,
      activeVariant,
      glass,
      handleSelect,
      handleCollapsedChange,
      handleCloseDrawer,
    ],
  );

  // Gesture handling for drawer dismiss with velocity handoff (expo-animation)
  const isLeft = position === "left";
  const panGesture = usePanGesture({
    enabled: variant === "drawer" && isOpen,
    activeOffsetX: [-10, 10],
    onUpdate: (event) => {
      "worklet";
      if (isLeft) {
        dragTranslateX.value = Math.min(0, event.translationX);
      } else {
        dragTranslateX.value = Math.max(0, event.translationX);
      }
    },
    onDeactivate: (event: { velocityX: number; canceled?: boolean }) => {
      "worklet";
      if (event.canceled) {
        dragTranslateX.value = withTiming(0, {
          duration: 180,
          easing: SIDE_NAV_EASING,
        });
        return;
      }
      const currentTranslate = dragTranslateX.value;
      const velocity = event.velocityX;
      const dismissThreshold = resolvedWidth * 0.28;

      const shouldDismiss = isLeft
        ? currentTranslate < -dismissThreshold || velocity < -400
        : currentTranslate > dismissThreshold || velocity > 400;

      if (shouldDismiss) {
        dragTranslateX.value = withTiming(
          isLeft ? -resolvedWidth : resolvedWidth,
          { duration: 160, easing: SIDE_NAV_EASING },
          () => {
            scheduleOnRN(handleCloseDrawer);
          },
        );
      } else {
        dragTranslateX.value = withTiming(0, {
          duration: 180,
          easing: SIDE_NAV_EASING,
        });
      }
    },
  });

  const drawerAnimatedStyle = useAnimatedStyle(() => {
    const isLeft = position === "left";
    const baseOffset = isLeft ? -resolvedWidth : resolvedWidth;
    const progress = drawerAnim.value;
    const translateX = baseOffset * (1 - progress) + dragTranslateX.value;

    return {
      transform: [{ translateX }],
    };
  }, webDeps([position, resolvedWidth]));

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: drawerAnim.value,
    };
  }, webDeps([]));

  const isBrutal = components.surface.pressEffect === "offset";
  const isBorderless = components.borderWidth.default === 0;

  const containerBg = glass
    ? colors.glassSurfaceStrong
    : colors.surfaceRaised;
  const containerBorder = glass
    ? colors.glassBorder
    : isBorderless
      ? colors.transparent
      : colors.border;
  const borderWidth = isBorderless
    ? 0
    : isBrutal
      ? 2
      : components.borderWidth.default;

  const baseSurfaceStyle: ViewStyle = {
    backgroundColor: containerBg,
    borderColor: containerBorder,
    borderWidth,
    borderRadius:
      variant === "floating"
        ? radii.xl
        : variant === "rail"
          ? radii.lg
          : 0,
    overflow: "hidden",
  };

  // Render Drawer Overlay
  if (variant === "drawer") {
    if (!isOpen && drawerAnim.value === 0) {
      return null;
    }

    const drawerContent = (
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        {/* Backdrop Overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: withAlpha(colors.overlay, isDark ? 0.45 : 0.28),
            },
            backdropAnimatedStyle,
            overlayStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close navigation drawer"
            style={StyleSheet.absoluteFill}
            onPress={handleCloseDrawer}
          />
        </Animated.View>

        {/* Sliding Drawer Container */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            accessibilityRole="menu"
            style={[
              styles.drawerContainer,
              {
                width: resolvedWidth,
                left: position === "left" ? 0 : undefined,
                right: position === "right" ? 0 : undefined,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
              baseSurfaceStyle,
              shadows.lg,
              drawerAnimatedStyle,
              style,
            ]}
            {...props}
          >
            <SideNavContext.Provider value={contextValue}>
              {children}
            </SideNavContext.Provider>
          </Animated.View>
        </GestureDetector>
      </View>
    );

    if (portal) {
      return <Portal layer="overlay">{drawerContent}</Portal>;
    }
    return drawerContent;
  }

  // Render Persistent / Floating / Rail / Collapsible Sidebar
  return (
    <SideNavContext.Provider value={contextValue}>
      <View
        accessibilityRole="menu"
        style={[
          styles.persistentContainer,
          baseSurfaceStyle,
          {
            width: currentWidth,
            borderRightWidth:
              position === "left" && variant !== "floating"
                ? borderWidth
                : 0,
            borderLeftWidth:
              position === "right" && variant !== "floating"
                ? borderWidth
                : 0,
          },
          variant === "floating" && [
            styles.floatingContainer,
            shadows.md,
            { margin: spacing.md },
          ],
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </SideNavContext.Provider>
  );
});

// -----------------------------------------------------------------------------
// SideNavHeader
// -----------------------------------------------------------------------------

export interface SideNavHeaderProps extends ViewProps {
  title?: string;
  subtitle?: string;
  icon?: RenderIcon;
  action?: ReactNode;
  showToggle?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export const SideNavHeader = React.memo(function SideNavHeader({
  title,
  subtitle,
  icon,
  action,
  showToggle = false,
  style,
  children,
  ...props
}: SideNavHeaderProps) {
  const { colors, components, spacing } = useTheme();
  const nav = useSideNavContext();
  const isBorderless = components.borderWidth.default === 0;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          paddingHorizontal: nav.isRail ? spacing.xs : spacing.md,
          paddingVertical: spacing.md,
          borderBottomWidth: isBorderless ? 0 : 1,
          borderBottomColor: isBorderless
            ? "transparent"
            : withAlpha(colors.divider, 0.4),
        },
        style,
      ]}
      {...props}
    >
      {children ? (
        children
      ) : (
        <View
          style={[
            styles.headerRow,
            { justifyContent: nav.isRail ? "center" : "space-between" },
          ]}
        >
          <View
            style={[
              styles.headerBrandRow,
              { justifyContent: nav.isRail ? "center" : "flex-start" },
            ]}
          >
            {icon ? (
              <View style={styles.headerIconSlot}>
                {renderIcon(icon, colors.primary, 24)}
              </View>
            ) : null}

            {!nav.isRail && (title || subtitle) ? (
              <View style={styles.headerTextCol}>
                {title ? (
                  <Text variant="label" weight="700" numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                {subtitle ? (
                  <Text variant="caption" color="textMuted" numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {!nav.isRail && (action || showToggle) ? (
            <View style={styles.headerActionRow}>
              {action}
              {showToggle ? <SideNavToggle /> : null}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});

// -----------------------------------------------------------------------------
// SideNavContent
// -----------------------------------------------------------------------------

export interface SideNavContentProps extends ViewProps {
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export const SideNavContent = React.memo(function SideNavContent({
  scrollable = true,
  contentContainerStyle,
  style,
  children,
  ...props
}: SideNavContentProps) {
  const { spacing } = useTheme();
  const nav = useSideNavContext();

  const containerPadding: ViewStyle = {
    paddingHorizontal: nav.isRail ? spacing.xs : spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  };

  if (!scrollable) {
    return (
      <View
        style={[styles.contentFlex, containerPadding, style]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.contentFlex, style]}
      contentContainerStyle={[containerPadding, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
});

// -----------------------------------------------------------------------------
// SideNavSection
// -----------------------------------------------------------------------------

export interface SideNavSectionProps extends ViewProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
}

export const SideNavSection = React.memo(function SideNavSection({
  label,
  style,
  labelStyle,
  children,
  ...props
}: SideNavSectionProps) {
  const { colors, components, spacing } = useTheme();
  const nav = useSideNavContext();
  const isBorderless = components.borderWidth.default === 0;

  return (
    <View
      style={[
        styles.sectionContainer,
        {
          marginTop: spacing.xs,
          marginBottom: spacing.xs,
          gap: spacing.xxs,
        },
        style,
      ]}
      {...props}
    >
      {label && !nav.isRail ? (
        <Text
          variant="caption"
          weight="700"
          style={[
            styles.sectionLabel,
            {
              color: colors.textMuted,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xxs,
            },
            labelStyle,
          ]}
        >
          {label.toUpperCase()}
        </Text>
      ) : nav.isRail && label ? (
        <View
          style={[
            styles.sectionDivider,
            {
              backgroundColor: isBorderless
                ? "transparent"
                : withAlpha(colors.divider, 0.4),
              marginVertical: spacing.xxs,
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
});

// -----------------------------------------------------------------------------
// SideNavItem
// -----------------------------------------------------------------------------

export interface SideNavItemProps {
  /**
   * Unique identifier for active state comparison.
   */
  id: string;

  /**
   * Navigation label text.
   */
  label: string;

  /**
   * Left icon or custom icon renderer.
   */
  icon?: RenderIcon;

  /**
   * Right badge label, numeric count, or custom element.
   */
  badge?: ReactNode;

  /**
   * Semantic tone for badge.
   * @default "primary"
   */
  badgeTone?: ComponentTone;

  /**
   * Tooltip text in rail mode (defaults to `label`).
   */
  tooltip?: string;

  /**
   * Disabled interactive state.
   * @default false
   */
  disabled?: boolean;

  /**
   * Custom press callback. If omitted, falls back to `onSelect(id)`.
   */
  onPress?: () => void;

  /**
   * Custom container style.
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Custom label style.
   */
  labelStyle?: StyleProp<TextStyle>;
}

export const SideNavItem = React.memo(function SideNavItem({
  id,
  label,
  icon,
  badge,
  badgeTone = "primary",
  tooltip,
  disabled = false,
  onPress,
  style,
  labelStyle,
}: SideNavItemProps) {
  const { colors, components, radii, spacing, isDark } = useTheme();
  const nav = useSideNavContext();
  const isActive = nav.activeKey === id;

  const toneColors = useMemo(
    () => resolveToneColors(nav.tone, colors),
    [nav.tone, colors],
  );

  const isBrutal = components.surface.pressEffect === "offset";
  const isBorderless = components.borderWidth.default === 0;

  // Active pill visual styles based on design system
  const activeBg = useMemo(() => {
    if (!isActive) return colors.transparent;
    switch (nav.activeVariant) {
      case "solid":
        return toneColors.solid;
      case "outline":
        return isDark ? withAlpha(toneColors.solid, 0.14) : toneColors.soft;
      case "ghost":
        return withAlpha(toneColors.solid, 0.1);
      case "subtle":
      default:
        return toneColors.soft;
    }
  }, [isActive, nav.activeVariant, toneColors, colors.transparent, isDark]);

  const activeFg = useMemo(() => {
    if (!isActive) return colors.text;
    if (nav.activeVariant === "solid") return toneColors.on;
    return toneColors.solid;
  }, [isActive, nav.activeVariant, toneColors, colors.text]);

  const activeBorder = useMemo(() => {
    if (!isActive) return colors.transparent;
    if (isBorderless) return colors.transparent;
    if (nav.activeVariant === "outline" || isBrutal) {
      return isBrutal ? colors.border : toneColors.border;
    }
    return colors.transparent;
  }, [isActive, isBorderless, nav.activeVariant, isBrutal, colors.border, toneColors.border, colors.transparent]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (onPress) {
      onPress();
    } else {
      nav.onSelect?.(id);
    }
  }, [disabled, id, nav, onPress]);

  const itemContent = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive, disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.itemContainer,
        {
          backgroundColor: pressed && !disabled
            ? withAlpha(activeBg === colors.transparent ? colors.backgroundMuted : activeBg, 0.8)
            : activeBg,
          borderColor: activeBorder,
          borderWidth: activeBorder !== colors.transparent ? 1 : 0,
          borderRadius: isBrutal ? 0 : radii.md,
          paddingHorizontal: nav.isRail ? spacing.xs : spacing.sm + 2,
          paddingVertical: spacing.sm,
          opacity: disabled ? 0.45 : 1,
          justifyContent: nav.isRail ? "center" : "flex-start",
        },
        style,
      ]}
    >
      {/* Icon Slot */}
      {icon ? (
        <View style={styles.itemIconSlot}>
          {renderIcon(icon, activeFg, 20)}
          {nav.isRail && badge ? (
            <View
              style={[
                styles.railBadgeDot,
                {
                  backgroundColor: toneColors.solid,
                  borderColor: colors.surfaceRaised,
                },
              ]}
            />
          ) : null}
        </View>
      ) : null}

      {/* Label and Badge (Hidden in Rail mode) */}
      {!nav.isRail ? (
        <>
          <Text
            variant="bodySmall"
            weight={isActive ? "700" : "500"}
            numberOfLines={1}
            style={[
              styles.itemLabel,
              {
                color: activeFg,
                marginLeft: icon ? spacing.sm : 0,
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>

          {badge ? (
            typeof badge === "string" || typeof badge === "number" ? (
              <Badge
                size="xs"
                variant={isActive ? "filled" : "soft"}
                tone={badgeTone}
              >
                {badge}
              </Badge>
            ) : (
              badge
            )
          ) : null}
        </>
      ) : null}
    </Pressable>
  );

  // In rail mode, wrap in Tooltip for accessibility
  if (nav.isRail) {
    return (
      <Tooltip
        content={tooltip ?? label}
        position={nav.position === "right" ? "left" : "right"}
        delay={0}
      >
        {itemContent}
      </Tooltip>
    );
  }

  return itemContent;
});

// -----------------------------------------------------------------------------
// SideNavFooter
// -----------------------------------------------------------------------------

export interface SideNavFooterProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export const SideNavFooter = React.memo(function SideNavFooter({
  style,
  children,
  ...props
}: SideNavFooterProps) {
  const { colors, components, spacing } = useTheme();
  const nav = useSideNavContext();
  const isBorderless = components.borderWidth.default === 0;

  return (
    <View
      style={[
        styles.footerContainer,
        {
          paddingHorizontal: nav.isRail ? spacing.xs : spacing.md,
          paddingVertical: spacing.md,
          borderTopWidth: isBorderless ? 0 : 1,
          borderTopColor: isBorderless
            ? "transparent"
            : withAlpha(colors.divider, 0.4),
          justifyContent: nav.isRail ? "center" : "flex-start",
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
});

// -----------------------------------------------------------------------------
// SideNavToggle
// -----------------------------------------------------------------------------

export interface SideNavToggleProps extends ViewProps {
  icon?: RenderIcon;
  style?: StyleProp<ViewStyle>;
}

export const SideNavToggle = React.memo(function SideNavToggle({
  icon,
  style,
  ...props
}: SideNavToggleProps) {
  const { colors, radii, spacing } = useTheme();
  const nav = useSideNavContext();

  const handleToggle = useCallback(() => {
    nav.onCollapsedChange?.(!nav.collapsed);
  }, [nav]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nav.collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onPress={handleToggle}
      style={({ pressed }) => [
        styles.toggleButton,
        {
          borderRadius: radii.sm,
          backgroundColor: pressed
            ? colors.backgroundMuted
            : colors.transparent,
          padding: spacing.xs,
        },
        style,
      ]}
      {...props}
    >
      {icon ? (
        renderIcon(icon, colors.textMuted, 18)
      ) : (
        <View
          style={[
            styles.toggleBar,
            {
              backgroundColor: colors.textMuted,
              width: 14,
              height: 2,
              borderRadius: 1,
            },
          ]}
        />
      )}
    </Pressable>
  );
});

// -----------------------------------------------------------------------------
// Stylesheet
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  drawerContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 100,
    flexDirection: "column",
  },
  persistentContainer: {
    height: "100%",
    flexDirection: "column",
  },
  floatingContainer: {
    alignSelf: "flex-start",
  },
  headerContainer: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  headerIconSlot: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
  },
  headerActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  contentFlex: {
    flex: 1,
  },
  sectionContainer: {
    width: "100%",
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  sectionDivider: {
    height: 1,
    width: "70%",
    alignSelf: "center",
  },
  itemContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  itemIconSlot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
  },
  railBadgeDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  itemLabel: {
    flex: 1,
  },
  footerContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  toggleButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBar: {
    marginVertical: 2,
  },
});
