import { Box, Select, Text } from "@masumdev/rn-ui";
import { Check, ChevronsUpDown } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function SelectSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [framework, setFramework] = useState("rn-cli");
  const [region, setRegion] = useState("sin1");
  const [plan, setPlan] = useState("pro");

  const frameworkOptions = [
    {
      value: "rn-cli",
      label: "React Native CLI",
      description: "Bare React Native runtime engine.",
    },
    {
      value: "expo",
      label: "Expo SDK 57",
      description: "Modern cross-platform mobile framework.",
    },
    {
      value: "rn-ui",
      label: "@masumdev/rn-ui",
      description: "Design-token driven component library.",
    },
  ];

  const regionOptions = [
    {
      value: "sin1",
      label: "Singapore (sin1)",
      description: "Asia Southeast (Latency ~14ms)",
    },
    {
      value: "iad1",
      label: "US East (iad1)",
      description: "North America East (Latency ~160ms)",
    },
    {
      value: "fra1",
      label: "Frankfurt (fra1)",
      description: "Europe Central (Latency ~185ms)",
    },
  ];

  const planOptions = [
    {
      value: "starter",
      label: "Starter Developer",
      description: "Free forever, single project.",
    },
    {
      value: "pro",
      label: "Pro Team",
      description: "Unlimited team members & fast CI/CD.",
    },
    {
      value: "enterprise",
      label: "Enterprise Sovereign",
      description: "Dedicated cluster & 99.99% uptime SLA.",
    },
  ];

  return (
    <Section title="Select">
      <Box gap="lg">
        {/* Card 1: Default Outline Dropdown */}
        <DemoCard
          title="Dropdown Selector"
          badge="Outline • Soft • Glass"
          badgeTone="primary"
          description="Anchored floating dropdown picker with portal overlay, continuous curvature, and haptic feedback."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Default Outline Dropdown (Framework)
              </Text>
              <Select
                value={framework}
                onValueChange={setFramework}
                variant="outline"
                placeholder="Select framework"
                options={frameworkOptions}
                checkIcon={icon(Check)}
                chevronIcon={icon(ChevronsUpDown)}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Soft Tonal Variant (Deployment Region)
              </Text>
              <Select
                value={region}
                onValueChange={setRegion}
                variant="soft"
                placeholder="Select cloud region"
                options={regionOptions}
                checkIcon={icon(Check)}
                chevronIcon={icon(ChevronsUpDown)}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Glassmorphism Variant (Subscription Plan)
              </Text>
              <Select
                value={plan}
                onValueChange={setPlan}
                glass
                placeholder="Select subscription"
                options={planOptions}
                checkIcon={icon(Check)}
                chevronIcon={icon(ChevronsUpDown)}
              />
            </Box>

            <DemoReadout
              label="Selected"
              value={`${framework} • ${region} • ${plan}`}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Control Sizes */}
        <DemoCard
          title="Select Sizes"
          badge="sm • md • lg"
          badgeTone="secondary"
          description="Three standardized input heights with aligned typographic scale and chevron hit targets."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Small (sm - 36px)
              </Text>
              <Select
                size="sm"
                value={framework}
                onValueChange={setFramework}
                options={frameworkOptions}
                checkIcon={icon(Check)}
                chevronIcon={icon(ChevronsUpDown)}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Medium (md - 44px)
              </Text>
              <Select
                size="md"
                value={region}
                onValueChange={setRegion}
                options={regionOptions}
                checkIcon={icon(Check)}
                chevronIcon={icon(ChevronsUpDown)}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Large (lg - 52px)
              </Text>
              <Select
                size="lg"
                value={plan}
                onValueChange={setPlan}
                options={planOptions}
                checkIcon={icon(Check)}
                chevronIcon={icon(ChevronsUpDown)}
              />
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
