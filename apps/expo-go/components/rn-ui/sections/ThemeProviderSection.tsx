import { useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Input,
  Switch,
  Text,
} from "@masumdev/rn-ui";
import { Section, type RnUiSectionContext } from "../shared";

const PRESET_META: Record<string, { label: string; summary: string }> = {
  default: {
    label: "Default",
    summary: "Balanced hairline borders and subtle soft elevation shadows.",
  },
  minimal: {
    label: "Minimal (HeroUI)",
    summary: "0px borderless surfaces distinguished by tonal background layers.",
  },
  brutal: {
    label: "Neo-Brutalism",
    summary: "2.5px solid ink borders, hard zero-blur offset shadows, offset press.",
  },
};

export function ThemeProviderSection({ ctx }: { ctx: RnUiSectionContext }) {
  const {
    styles,
    themeOptions,
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
  const [toggleSample, setToggleSample] = useState(true);
  const [chipSelected, setChipSelected] = useState(true);

  const activeMeta = PRESET_META[themeName] ?? {
    label: themeName,
    summary: "Active theme preset.",
  };

  return (
    <Section title="Theme Provider Studio">
      <Box gap="md">
        <Card>
          <Box gap="md">
            <Box gap="xxs">
              <Text variant="label">Global Design Preset</Text>
              <Text variant="bodySmall" color="textMuted">
                {activeMeta.label}: {activeMeta.summary}
              </Text>
            </Box>

            <Box row gap="sm" style={styles.wrap}>
              {availableThemes.map((presetKey) => {
                const active = themeName === presetKey;
                const label = PRESET_META[presetKey]?.label ?? presetKey;
                return (
                  <Button
                    key={presetKey}
                    size="sm"
                    variant={active ? "filled" : "outline"}
                    onPress={() => setThemeName(presetKey)}
                  >
                    {label}
                  </Button>
                );
              })}
            </Box>

            <Box gap="xs">
              <Text variant="label">
                Color Mode ({colorScheme} {"->"} {resolvedColorScheme})
              </Text>
              <Box row gap="sm" style={styles.wrap}>
                {(
                  (themeOptions as Array<{
                    label: string;
                    value: string;
                    icon?: (props: { size: number; color: string }) => React.ReactNode;
                  }>) || []
                ).map((item) => {
                  const active = colorScheme === item.value;
                  return (
                    <Button
                      key={item.value}
                      size="sm"
                      variant={active ? "filled" : "outline"}
                      tone="secondary"
                      leftIcon={item.icon as never}
                      onPress={() =>
                        (setColorScheme as (val: string) => void)(item.value)
                      }
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </Box>
            </Box>

            <Box
              row
              style={{
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 4,
              }}
            >
              <Box flex={1} gap="xxs">
                <Text variant="label">Global Elevation Shadows</Text>
                <Text variant="caption" color="textMuted">
                  {elevation
                    ? `Enabled (${shadows.md.boxShadow ?? "soft shadow"})`
                    : "Disabled (pure flat shadows)"}
                </Text>
              </Box>
              <Switch
                size="sm"
                value={elevation}
                onValueChange={setElevation}
              />
            </Box>
          </Box>
        </Card>

        <Card>
          <Box gap="md">
            <Box row style={{ alignItems: "center", justifyContent: "space-between" }}>
              <Text variant="label">Live Reactive Surface Preview</Text>
              <Badge tone="primary" variant="filled">
                {themeName.toUpperCase()}
              </Badge>
            </Box>

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
              placeholder="Borderless / Bordered Input"
            />

            <Box row style={{ alignItems: "center", justifyContent: "space-between" }}>
              <Text variant="bodySmall" color="textMuted">
                borderWidth.strong={components.borderWidth.strong} | control=
                {components.borderWidth.control} | radii.xl={radii.xl} | press=
                {components.surface.pressEffect}
              </Text>
              <Switch
                size="sm"
                value={toggleSample}
                onValueChange={setToggleSample}
              />
            </Box>

            <Alert tone="info" variant="soft" title="Instant Theme Propagation">
              Every card, input, button, badge, switch, and shadow reacts to
              preset changes without remounting the app.
            </Alert>
          </Box>
        </Card>
      </Box>
    </Section>
  );
}
