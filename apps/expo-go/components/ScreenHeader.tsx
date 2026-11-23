import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Moon, Palette, Sun } from "lucide-react-native";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Text,
  useTheme,
  useThemeStyles,
  withAlpha,
  type RenderIcon,
} from "@masumdev/rn-ui";

const icon =
  (Icon: React.ComponentType<{ color?: string; size?: number }>): RenderIcon =>
  ({ color, size }) => <Icon color={color} size={size} />;

export interface ScreenHeaderProps {
  /** Optional compact title shown in the floating top bar (e.g. when scrolled past hero) */
  title?: string | React.ReactNode;
  subtitle?: string;
  eyebrow?: string;
  showBack?: boolean;
  onBack?: () => void;
  /**
   * Custom right action component.
   * If not provided (`undefined`), a theme preset picker and dark/light toggle are rendered.
   * Pass `null` to render no right action.
   */
  rightAction?: React.ReactNode | null;
  headerStyle?: StyleProp<ViewStyle>;
  /** Whether the compact title should be visible in the top action bar */
  showTitle?: boolean;
  /** Whether the header is currently scrolled down (enables semi-transparent background) */
  isScrolled?: boolean;
}

const PRESET_LABELS: Record<string, string> = {
  default: "Default Clean",
  minimal: "Minimal",
  brutal: "Neo-Brutalism",
  glass: "Vision Glass",
  editorial: "Editorial",
  cyber: "Cyberpunk",
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Modern minimalist floating top action bar (Gemini Android style).
 * Completely transparent background, borderless ("plong-plongan"),
 * with essential actions floating cleanly above the content.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
  headerStyle,
  showTitle = false,
  isScrolled,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    colors,
    isDark,
    setColorScheme,
    themeName,
    availableThemes,
    setThemeName,
    elevation,
    toggleElevation,
  } = useTheme();
  const styles = useStyles();

  const isScrolledActive = isScrolled ?? showTitle;

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isScrolledActive ? 1 : 0, {
      duration: 180,
      easing: EASE_OUT,
    }),
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showTitle && Boolean(title) ? 1 : 0, {
      duration: 160,
      easing: EASE_OUT,
    }),
    transform: [
      {
        translateY: withTiming(showTitle && Boolean(title) ? 0 : 6, {
          duration: 160,
          easing: EASE_OUT,
        }),
      },
      {
        scale: withTiming(showTitle && Boolean(title) ? 1 : 0.96, {
          duration: 160,
          easing: EASE_OUT,
        }),
      },
    ],
  }));

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const toggleTheme = () => {
    setColorScheme(isDark ? "light" : "dark");
  };

  const topPadding = insets.top + 6;

  const renderRightAction = () => {
    if (rightAction === null) {
      return null;
    }
    if (rightAction !== undefined) {
      return rightAction;
    }
    return (
      <View style={styles.rightButtonsRow}>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <IconButton
              accessibilityLabel="Switch theme preset"
              icon={icon(Palette)}
              variant="outline"
              size="md"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" width={210}>
            <DropdownMenuLabel>Theme Preset</DropdownMenuLabel>
            {availableThemes.map((presetKey) => (
              <DropdownMenuCheckboxItem
                key={presetKey}
                checked={themeName === presetKey}
                onCheckedChange={() => setThemeName(presetKey)}
              >
                {PRESET_LABELS[presetKey] ?? presetKey}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={elevation}
              onCheckedChange={() => toggleElevation()}
            >
              Shadows (elevation)
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <IconButton
          accessibilityLabel={
            isDark ? "Switch to light mode" : "Switch to dark mode"
          }
          icon={icon(isDark ? Sun : Moon)}
          variant="outline"
          size="md"
          onPress={toggleTheme}
        />
      </View>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingBar,
        {
          paddingTop: topPadding,
        },
        headerStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundLayer,
          {
            backgroundColor: withAlpha(colors.background, isDark ? 0.88 : 0.92),
            borderBottomColor: colors.divider,
          },
          animatedBackgroundStyle,
        ]}
      />

      <View style={styles.topBar}>
        {showBack ? (
          <IconButton
            icon={icon(ChevronLeft)}
            variant="outline"
            size="md"
            accessibilityLabel="Go back"
            onPress={handleBack}
          />
        ) : (
          <View style={styles.spacer} />
        )}

        <Animated.View
          pointerEvents="none"
          style={[styles.centerTitleContainer, animatedTitleStyle]}
        >
          {typeof title === "string" ? (
            <Text
              variant="label"
              color="primary"
              weight="700"
              numberOfLines={1}
              style={styles.compactTitleText}
            >
              {title}
            </Text>
          ) : (
            title
          )}
        </Animated.View>

        <View style={styles.rightActionsRow}>{renderRightAction()}</View>
      </View>
    </View>
  );
};

export interface ScreenHeroHeaderProps {
  eyebrow?: string;
  title: string | React.ReactNode;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Modern in-flow hero header that sits directly inside ScrollView.
 * Scrolls naturally with content ("terskroll gitu") with breathable,
 * open ("plong-plongan") typography and layout.
 */
export const ScreenHeroHeader: React.FC<ScreenHeroHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  style,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  return (
    <View
      style={[
        styles.heroContainer,
        {
          paddingTop: insets.top + 56,
        },
        style,
      ]}
    >
      {!!eyebrow && (
        <Text
          variant="labelSmall"
          color="primary"
          weight="600"
          style={styles.heroEyebrow}
          numberOfLines={1}
        >
          {eyebrow}
        </Text>
      )}

      {typeof title === "string" ? (
        <Text variant="h1" style={styles.heroTitle}>
          {title}
        </Text>
      ) : (
        title
      )}

      {!!subtitle && (
        <Text variant="bodySmall" color="textMuted" style={styles.heroSubtitle}>
          {subtitle}
        </Text>
      )}

      {children}
    </View>
  );
};

function useStyles() {
  return useThemeStyles((theme) => ({
    floatingBar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xs,
    },
    backgroundLayer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderBottomWidth: 0.5,
    },
    topBar: {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: 44,
    },
    centerTitleContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 88,
    },
    compactTitleText: {
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: -0.2,
      includeFontPadding: false,
      textAlign: "center",
    },
    rightActionsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    rightButtonsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    spacer: {
      width: 40,
      height: 40,
    },
    heroContainer: {
      gap: theme.spacing.xs + 2,
      paddingBottom: theme.spacing.sm,
    },
    heroEyebrow: {
      letterSpacing: 0.5,
    },
    heroTitle: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "800",
      letterSpacing: -0.5,
      includeFontPadding: false,
    },
    heroSubtitle: {
      marginTop: 2,
      lineHeight: 20,
    },
  }));
}
