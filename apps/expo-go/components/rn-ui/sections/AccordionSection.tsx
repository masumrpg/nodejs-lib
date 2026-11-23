import { Accordion, Box, Text } from "@masumdev/rn-ui";
import {
  HelpCircle,
  Layers,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react-native";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function AccordionSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;

  const sampleItems = [
    {
      id: "theme",
      title: "Theme Tokens Architecture",
      subtitle: "Colors, typography, spacing, radius, and continuous border scale",
      icon: icon(Palette),
      content:
        "Accordion follows the same design token system and automatically adapts across Minimal Borderless, Default, and Neo-Brutalism themes.",
    },
    {
      id: "icons",
      title: "Pluggable Icon Support",
      subtitle: "Zero tight-coupling to proprietary icon bundles",
      icon: icon(HelpCircle),
      content: (
        <Text color="textMuted">
          Pass any React node or Lucide render function for item icons and expand indicators with smooth 60fps chevron rotation.
        </Text>
      ),
    },
    {
      id: "controlled",
      title: "State Management Modes",
      subtitle: "Controlled or uncontrolled item expansion",
      icon: icon(Settings),
      content:
        "Use defaultOpenIds for lightweight local setup, or openIds plus onOpenChange when accordion expansion is synchronized with external application state.",
    },
  ];

  const glassItems = [
    {
      id: "glass_1",
      title: "Glassmorphism Accordion",
      subtitle: "Translucent backdrop with frosted blur effect",
      icon: icon(Sparkles),
      content:
        "Uses translucent glass surface and frosted border tokens for modern ambient overlay panels.",
    },
    {
      id: "glass_2",
      title: "End-to-End Security",
      subtitle: "Encrypted payload delivery across all edge gateways",
      icon: icon(ShieldCheck),
      content:
        "All application payloads are encrypted in transit and at rest using AES-256 and strict TLS 1.3 standards.",
    },
  ];

  const flatItems = [
    {
      id: "flat_1",
      title: "Flat Borderless Style",
      subtitle: "Subtle background fill with zero borders",
      icon: icon(Layers),
      content:
        "Clean borderless card layout ideal for nested interface hierarchies and dense mobile screens.",
    },
  ];

  return (
    <Section title="Accordion">
      <Box gap="lg">
        {/* Card 1: Default Outline Accordion */}
        <DemoCard
          title="Collapsible FAQ Accordions"
          badge="Reanimated 60fps"
          badgeTone="primary"
          description="Hardware-accelerated height and opacity collapse with rotating indicator chevrons."
        >
          <Box gap="xs">
            <Accordion
              variant="outline"
              defaultOpenIds={["theme"]}
              items={sampleItems}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Glassmorphism & Flat Treatments */}
        <DemoCard
          title="Glass & Flat Styles"
          badge="Frosted & Flat"
          badgeTone="secondary"
          description="Frosted glass surfaces alongside flat borderless accordions for varied layout densities."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Glassmorphism Overlay
              </Text>
              <Accordion
                variant="outline"
                glass
                defaultOpenIds={["glass_1"]}
                items={glassItems}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Flat Borderless Variant
              </Text>
              <Accordion
                variant="flat"
                defaultOpenIds={["flat_1"]}
                items={flatItems}
              />
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
