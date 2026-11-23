import { Box, Switch, Text } from "@masumdev/rn-ui";
import { Check, Moon, Sun, X } from "lucide-react-native";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function SwitchSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { switchValue, setSwitchValue } = ctx;
  const [pushNotifs, setPushNotifs] = useState(true);
  const [biometrics, setBiometrics] = useState(true);
  const [darkModeToggle, setDarkModeToggle] = useState(false);
  const [glassEnabled, setGlassEnabled] = useState(true);

  return (
    <Section title="Switch">
      <Box gap="lg">
        {/* Card 1: Interactive Preferences Settings */}
        <DemoCard
          title="System Preferences"
          badge="Fluid Oval Switch"
          badgeTone="primary"
          description="Consistent enhanced oval silhouette with inward press-stretch gesture physics."
        >
          <Box gap="sm">
            <DemoSurface radius="md">
              <Box
                row
                gap="sm"
                style={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Box flex={1} gap="xxs">
                  <Text variant="label" weight="600">
                    Push Notifications
                  </Text>
                  <Text variant="caption" color="textMuted">
                    Instant deployment alerts and release digests
                  </Text>
                </Box>
                <Switch
                  value={pushNotifs}
                  onValueChange={setPushNotifs}
                  tone="primary"
                />
              </Box>
            </DemoSurface>

            <DemoSurface radius="md">
              <Box
                row
                gap="sm"
                style={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Box flex={1} gap="xxs">
                  <Text variant="label" weight="600">
                    Biometric Sign-In
                  </Text>
                  <Text variant="caption" color="textMuted">
                    Require TouchID / FaceID for security actions
                  </Text>
                </Box>
                <Switch
                  size="md"
                  tone="success"
                  value={biometrics}
                  onValueChange={setBiometrics}
                  activeIcon={({ color, size }) => <Check color={color} size={size} />}
                  inactiveIcon={({ color, size }) => <X color={color} size={size} />}
                />
              </Box>
            </DemoSurface>

            <DemoSurface radius="md">
              <Box
                row
                gap="sm"
                style={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Box flex={1} gap="xxs">
                  <Text variant="label" weight="600">
                    Dark Mode Schedule
                  </Text>
                  <Text variant="caption" color="textMuted">
                    Automatic ambient display transitions
                  </Text>
                </Box>
                <Switch
                  size="md"
                  tone="secondary"
                  value={darkModeToggle}
                  onValueChange={setDarkModeToggle}
                  activeThumbContent={({ color, size }) => <Moon color={color} size={size} />}
                  inactiveThumbContent={({ color, size }) => <Sun color={color} size={size} />}
                />
              </Box>
            </DemoSurface>

            <DemoReadout
              label="Active Toggles"
              value={`Push: ${pushNotifs ? "ON" : "OFF"} • Bio: ${biometrics ? "ON" : "OFF"} • Dark: ${darkModeToggle ? "ON" : "OFF"}`}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Variants, Semantic Tones & Scale Sizes */}
        <DemoCard
          title="Variants, Tones & Sizes"
          badge="xs to xl"
          badgeTone="secondary"
          description="Filled, outline, and glass treatments across the full semantic color and sizing scale."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Track Variants (Filled, Outline, Glass)
              </Text>
              <Box row gap="sm" center style={{ flexWrap: "wrap" }}>
                <Switch
                  variant="filled"
                  value={switchValue}
                  onValueChange={setSwitchValue}
                />
                <Switch
                  variant="outline"
                  value={switchValue}
                  onValueChange={setSwitchValue}
                  tone="accent"
                />
                <Switch
                  glass
                  value={glassEnabled}
                  onValueChange={setGlassEnabled}
                  tone="secondary"
                />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Semantic Tones (Active State)
              </Text>
              <Box row wrap gap="sm" center style={{ justifyContent: "flex-start" }}>
                <Switch value={true} tone="primary" />
                <Switch value={true} tone="secondary" />
                <Switch value={true} tone="accent" />
                <Switch value={true} tone="success" />
                <Switch value={true} tone="warning" />
                <Switch value={true} tone="danger" />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Scale Sizes (XS - XL)
              </Text>
              <Box row wrap gap="sm" center style={{ justifyContent: "flex-start" }}>
                <Switch size="xs" value={true} />
                <Switch size="sm" value={true} />
                <Switch size="md" value={true} />
                <Switch size="lg" value={true} />
                <Switch size="xl" value={true} />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Disabled & Invalid States
              </Text>
              <Box row gap="sm" center>
                <Switch value={false} disabled />
                <Switch value={true} disabled />
                <Switch value={false} invalid />
              </Box>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
