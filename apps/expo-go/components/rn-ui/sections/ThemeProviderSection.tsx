import { useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { Alert, Box, Button, Chip, Input, SegmentedControl, Switch, Text } from "@masumdev/rn-ui";
import { Moon, Sun, Smartphone } from "lucide-react-native";
import {
  DemoCard,
  DemoReadout,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

const PRESET_META: Record<string, { label: string; summary: string }> = {
  default: {
    label: "Default Clean",
    summary: "Balanced hairline borders, standard radii hierarchy, and soft subtle elevation.",
  },
  minimal: {
    label: "Minimal",
    summary: "0px borderless surfaces, continuous modern generous squircle radii, and calibrated tonal layers.",
  },
  brutal: {
    label: "Neo-Brutalism",
    summary: "2.5px solid ink borders, hard zero-blur offset shadows, and mechanical offset press.",
  },
  glass: {
    label: "Vision Glass",
    summary: "Translucent frosted-glass surfaces, specular borders, and chromatic accents.",
  },
  editorial: {
    label: "Warm Editorial",
    summary: "Warm paper backgrounds, deep espresso ink typography, and organic subtle radii.",
  },
  cyber: {
    label: "Cyberpunk",
    summary: "Deep abyss slate, neon cyan & magenta wireframe geometry, and high-tech HUD accents.",
  },
};

export function ThemeProviderSection({ ctx }: { ctx: RnUiSectionContext }) {
  const {
    colors,
    styles,
    colorScheme,
    resolvedColorScheme,
    setColorScheme,
    themeName,
    availableThemes,
    setThemeName,
    elevation,
    setElevation,
    components,
    radii,
    shadows,
  } = ctx;

  const [sampleText, setSampleText] = useState("Live Theme Studio");
  const [_toggleSample, _setToggleSample] = useState(true);
  const [chipSelected, setChipSelected] = useState(true);

  const activeMeta = PRESET_META[themeName] ?? {
    label: themeName,
    summary: "Active theme preset.",
  };

  const radiusScale = [
    { key: "xs" as const, val: radii.xs },
    { key: "sm" as const, val: radii.sm },
    { key: "md" as const, val: radii.md },
    { key: "lg" as const, val: radii.lg },
    { key: "xl" as const, val: radii.xl },
    { key: "xxl" as const, val: radii.xxl },
  ];

  return (
    <Section title="Theme Provider Studio">
      <Box gap="lg">
        {/* 1. Global Preset Switcher */}
        <DemoCard
          title="Global Design Presets"
          badge={activeMeta.label}
          badgeTone="primary"
          description={activeMeta.summary}
        >
          <Box gap="md">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingVertical: 4,
                alignItems: "center",
              }}
            >
              {availableThemes.map((key) => {
                const isActive = themeName === key;
                const meta = PRESET_META[key] ?? {
                  label: key.charAt(0).toUpperCase() + key.slice(1),
                  summary: "",
                };
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    onPress={() => setThemeName(key)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: radii.full,
                      borderWidth: Math.max(components.borderWidth.default, 1),
                      borderColor: isActive
                        ? colors.primary
                        : components.borderWidth.default > 0
                          ? colors.border
                          : colors.transparent,
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.surfaceRaised,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <Text
                      variant="labelSmall"
                      weight={isActive ? "700" : "500"}
                      style={{
                        color: isActive ? colors.onPrimary : colors.text,
                        includeFontPadding: false,
                      }}
                    >
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Live Radius Scale Preview */}
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Live Radius Hierarchy (px):
              </Text>
              <Box row gap="xs" style={{ flexWrap: "wrap" }}>
                {radiusScale.map(({ key, val }) => (
                  <DemoSurface
                    key={key}
                    radius={key}
                    tone="muted"
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      minWidth: 52,
                    }}
                  >
                    <Text variant="caption" weight="700">
                      {key.toUpperCase()}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      {val}px
                    </Text>
                  </DemoSurface>
                ))}
              </Box>
            </Box>

            {/* Color Mode Switcher */}
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Color Scheme ({colorScheme} → {resolvedColorScheme}):
              </Text>
              <SegmentedControl
                variant="flush"
                size="sm"
                tone="secondary"
                values={[
                  {
                    label: "Light",
                    value: "light",
                    icon: ({ color, size }) => <Sun color={color} size={size} />,
                  },
                  {
                    label: "Dark",
                    value: "dark",
                    icon: ({ color, size }) => <Moon color={color} size={size} />,
                  },
                  {
                    label: "System",
                    value: "system",
                    icon: ({ color, size }) => (
                      <Smartphone color={color} size={size} />
                    ),
                  },
                ]}
                selectedIndex={
                  colorScheme === "light" ? 0 : colorScheme === "dark" ? 1 : 2
                }
                onChange={(_idx, val) =>
                  (setColorScheme as (val: string) => void)(val)
                }
              />
            </Box>

            {/* Global Elevation Shadows Switch */}
            <Box
              row
              style={{
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 4,
              }}
            >
              <Box flex={1} gap="xxs">
                <Text variant="label" weight="600">
                  Global Elevation Shadows
                </Text>
                <Text variant="caption" color="textMuted">
                  {elevation
                    ? `Enabled (${shadows.md.boxShadow ?? "soft shadow"})`
                    : "Disabled (pure flat / borderless stepping)"}
                </Text>
              </Box>
              <Switch
                size="sm"
                value={elevation}
                onValueChange={setElevation}
              />
            </Box>
          </Box>
        </DemoCard>

        {/* 2. Live Reactive Surface Preview */}
        <DemoCard
          title="Component Propagation"
          badge={`Theme: ${themeName}`}
          badgeTone="accent"
          description="Every component reacts instantly to preset switching without unmounting."
        >
          <Box gap="md">
            <Box row gap="sm" style={styles.wrap}>
              <Button size="sm" variant="filled">
                Filled Button
              </Button>
              <Button size="sm" variant="outline">
                Outline Button
              </Button>
              <Chip
                label="Interactive Chip"
                selected={chipSelected}
                onSelect={setChipSelected}
              />
            </Box>

            <Input
              value={sampleText}
              onChangeText={setSampleText}
              placeholder="Theme-aware Input"
            />

            <DemoReadout
              label="Active Geometry Tokens"
              value={`border: ${components.borderWidth.default}px • md radius: ${radii.md}px`}
            />

            <Alert tone="info" variant="soft" title="Instant Theme Propagation">
              Controls, cards, inputs, overlays, and badges adapt to the selected
              preset with zero layout shift.
            </Alert>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
