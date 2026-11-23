import {
  Badge,
  Box,
  Card,
  Text,
  useTheme,
  type ComponentTone,
  type ThemeRadii,
} from "@masumdev/rn-ui";
import { ChevronRight } from "lucide-react-native";
import React from "react";
import {
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { useSectionContext } from "./useSectionContext";

export type RnUiSectionContext = ReturnType<typeof useSectionContext>;

export const SAMPLE_ASSETS = {
  avatarUrl: "https://github.com/masumrpg.png",
  avatarName: "Ma'sum",
  avatarInitials: "MS",
  bannerImageUrl:
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
  galleryImageUrl:
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80",
};

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ComponentProps<typeof Box>["children"];
}) {
  return (
    <Box gap="sm">
      <Text
        variant="label"
        weight="600"
        color="textMuted"
        style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
      >
        {title}
      </Text>
      {children}
    </Box>
  );
}

export function AnimatedDetail({
  visible,
  children,
}: {
  visible: boolean;
  children: React.ComponentProps<typeof Box>["children"];
}) {
  const progress = useSharedValue(visible ? 1 : 0);
  const [contentHeight, setContentHeight] = React.useState(0);

  React.useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 180 });
  }, [progress, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: progress.value * contentHeight,
    opacity: progress.value,
  }));

  return (
    <Animated.View style={[{ overflow: "hidden" }, animatedStyle]}>
      <View
        style={{ position: "absolute", left: 0, right: 0 }}
        onLayout={(event) => setContentHeight(event.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}

export function ColorBox({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  const { colors, radii, components } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: radii.md,
        borderCurve: "continuous",
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexShrink: 1,
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: radii.xs,
            borderCurve: "continuous",
            backgroundColor: color,
            borderWidth: Math.max(components.borderWidth.hairline, 0.5),
            borderColor: colors.borderMuted,
          }}
        />
        <Text variant="bodySmall" weight="500">
          {label}
        </Text>
      </View>
      <Text variant="caption" color="textMuted">
        {value}
      </Text>
    </View>
  );
}

type DemoRadius = Exclude<keyof ThemeRadii, "none">;
type DemoSurfaceTone = ComponentTone | "muted" | "raised" | "input";

const SOFT_TONE_KEY: Record<
  ComponentTone,
  | "primarySoft"
  | "secondarySoft"
  | "accentSoft"
  | "successSoft"
  | "warningSoft"
  | "dangerSoft"
  | "infoSoft"
> = {
  default: "secondarySoft",
  primary: "primarySoft",
  secondary: "secondarySoft",
  accent: "accentSoft",
  success: "successSoft",
  warning: "warningSoft",
  danger: "dangerSoft",
  info: "infoSoft",
};

/**
 * Theme-reactive inner panel / preview tile for demos.
 * Radius, border width, and tonal fill all come from the active preset, so it
 * renders 0px borderless + generous squircle in Minimal, hairline in Default,
 * and ink-bordered boxy in Neo-Brutalism. Never hardcode radii in sections.
 */
export function DemoSurface({
  children,
  tone = "muted",
  radius = "lg",
  padded = true,
  bordered = true,
  style,
}: {
  children?: React.ReactNode;
  tone?: DemoSurfaceTone;
  radius?: DemoRadius;
  padded?: boolean;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radii, components, spacing } = useTheme();
  const backgroundColor =
    tone === "muted"
      ? colors.surfaceMuted
      : tone === "raised"
        ? colors.surfaceRaised
        : tone === "input"
          ? colors.input
          : colors[SOFT_TONE_KEY[tone]];
  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: radii[radius],
          borderCurve: "continuous",
          borderWidth: bordered ? components.borderWidth.default : 0,
          borderColor: colors.borderMuted,
          overflow: "hidden",
        },
        padded ? { padding: spacing.md } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Standard demo card anatomy: overflow-safe title + badge header, optional
 * description, consistent body gap, and optional footer slot.
 */
export function DemoCard({
  title,
  badge,
  badgeTone = "primary",
  description,
  footer,
  children,
  style,
}: {
  title: string;
  badge?: string;
  badgeTone?: ComponentTone;
  description?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card outlined style={style}>
      <Box gap="md">
        <Box gap="xs">
          <Box row gap="sm" style={{ alignItems: "flex-start" }}>
            <Text
              variant="subtitle"
              weight="700"
              style={{ flex: 1, minWidth: 0 }}
            >
              {title}
            </Text>
            {badge ? (
              <Badge
                tone={badgeTone}
                variant="soft"
                size="sm"
                style={{ flexShrink: 0, marginTop: 2 }}
              >
                {badge}
              </Badge>
            ) : null}
          </Box>
          {description ? (
            <Text variant="bodySmall" color="textMuted">
              {description}
            </Text>
          ) : null}
        </Box>
        {children}
        {footer}
      </Box>
    </Card>
  );
}

/** Compact live-state readout bar (selected values, counters, callbacks). */
export function DemoReadout({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: React.ReactNode;
  tone?: DemoSurfaceTone;
}) {
  return (
    <DemoSurface
      tone={tone}
      radius="md"
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingVertical: 10,
      }}
    >
      <Text variant="caption" color="textMuted" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text
          variant="labelSmall"
          weight="600"
          numberOfLines={1}
          style={{ flexShrink: 1, fontVariant: ["tabular-nums"] }}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </DemoSurface>
  );
}

export function RotatingChevron({
  expanded,
  color,
  size,
  direction = "down",
}: {
  expanded: boolean;
  color: string;
  size: number;
  direction?: "down" | "up" | "left";
}) {
  const progress = useSharedValue(expanded ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: 180 });
  }, [expanded, progress]);

  const targetDeg = direction === "up" ? -90 : direction === "left" ? 180 : 90;

  const animatedStyle = useAnimatedStyle(() => {
    const deg = interpolate(progress.value, [0, 1], [0, targetDeg]);
    return {
      transform: [{ rotate: `${deg}deg` }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <ChevronRight color={color} size={size} />
    </Animated.View>
  );
}

export const AnimatedToggleIcon = RotatingChevron;
