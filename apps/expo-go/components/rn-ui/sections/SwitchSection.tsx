import { Switch, Card, Box, Text, Badge } from "@masumdev/rn-ui";
import { Check, Moon, Sun, X } from "lucide-react-native";
import { useState } from "react";
import { Section, type RnUiSectionContext } from "../shared";

export function SwitchSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { switchValue, setSwitchValue } = ctx;
  const [heroValue, setHeroValue] = useState(true);
  const [darkModeToggle, setDarkModeToggle] = useState(false);
  const [glassEnabled, setGlassEnabled] = useState(true);

  return (
    <Section title="Switch">
      <Card outlined>
        <Box gap="lg">
          {/* Interactive Hero Fluid Oval Switch */}
          <Box row gap="sm" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box flex={1} gap="xxs">
              <Box row wrap gap="xs" style={{ alignItems: "center" }}>
                <Text variant="label">Fluid Oval Switch</Text>
                <Badge tone="primary" variant="soft">Press & Hold</Badge>
              </Box>
              <Text variant="bodySmall" color="textMuted">
                Single enhanced oval silhouette with inward press-stretch physics.
              </Text>
            </Box>
            <Switch
              value={heroValue}
              onValueChange={setHeroValue}
              tone="primary"
            />
          </Box>

          {/* Variants */}
          <Box row gap="sm" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box flex={1} gap="xxs">
              <Text variant="label">Variants (Filled, Outline, Glass)</Text>
              <Text variant="bodySmall" color="textMuted">
                Consistent oval proportions across every track treatment.
              </Text>
            </Box>
            <Box row gap="sm" center>
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

          {/* Semantic Tones */}
          <Box gap="sm">
            <Box gap="xxs">
              <Text variant="label">Semantic Tones</Text>
              <Text variant="bodySmall" color="textMuted">
                Orthogonal tone palette across primary, secondary, accent, success, warning, and danger.
              </Text>
            </Box>
            <Box row wrap gap="sm" center style={{ justifyContent: "flex-start" }}>
              <Switch value={true} tone="primary" />
              <Switch value={true} tone="secondary" />
              <Switch value={true} tone="accent" />
              <Switch value={true} tone="success" />
              <Switch value={true} tone="warning" />
              <Switch value={true} tone="danger" />
            </Box>
          </Box>

          {/* Custom Thumb Icons */}
          <Box row gap="sm" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box flex={1} gap="xxs">
              <Text variant="label">Dynamic Thumb Icons</Text>
              <Text variant="bodySmall" color="textMuted">
                Crisp active/inactive icons centered inside the oval thumb.
              </Text>
            </Box>
            <Box row gap="sm" center>
              <Switch
                size="lg"
                tone="success"
                value={heroValue}
                onValueChange={setHeroValue}
                activeIcon={({ color, size }) => <Check color={color} size={size} />}
                inactiveIcon={({ color, size }) => <X color={color} size={size} />}
              />
              <Switch
                size="lg"
                tone="secondary"
                value={darkModeToggle}
                onValueChange={setDarkModeToggle}
                activeThumbContent={({ color, size }) => <Moon color={color} size={size} />}
                inactiveThumbContent={({ color, size }) => <Sun color={color} size={size} />}
              />
            </Box>
          </Box>

          {/* Sizes (xs - xl) */}
          <Box gap="sm">
            <Box gap="xxs">
              <Text variant="label">Sizes (XS - XL)</Text>
              <Text variant="bodySmall" color="textMuted">
                Scaled oval geometry from compact xs to prominent xl controls.
              </Text>
            </Box>
            <Box row wrap gap="sm" center style={{ justifyContent: "flex-start" }}>
              <Switch size="xs" value={true} />
              <Switch size="sm" value={true} />
              <Switch size="md" value={true} />
              <Switch size="lg" value={true} />
              <Switch size="xl" value={true} />
            </Box>
          </Box>

          {/* Disabled & Invalid States */}
          <Box row gap="sm" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box flex={1} gap="xxs">
              <Text variant="label">Disabled & Invalid States</Text>
              <Text variant="bodySmall" color="textMuted">
                Muted disabled tracks alongside danger validation outline.
              </Text>
            </Box>
            <Box row gap="sm" center>
              <Switch value={false} disabled />
              <Switch value={true} disabled />
              <Switch value={false} invalid />
            </Box>
          </Box>
        </Box>
      </Card>
    </Section>
  );
}
