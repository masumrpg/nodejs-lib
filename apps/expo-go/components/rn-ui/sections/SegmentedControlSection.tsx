import {
  Box,
  SegmentedControl,
  Text,
} from "@masumdev/rn-ui";
import { Calendar, List, Moon, Sun, Monitor, Kanban } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function SegmentedControlSection(_props?: { ctx?: RnUiSectionContext }) {
  const [billingCycle, setBillingCycle] = useState("annual");
  const [viewMode, setViewMode] = useState("board");
  const [themeMode, setThemeMode] = useState("system");
  const [filterIdx, setFilterIdx] = useState(0);

  return (
    <Section title="SegmentedControl">
      <Box gap="lg">
        {/* 1. Flush Solid Capsule Variant (Featured) */}
        <DemoCard
          title="Flush Capsule Switcher"
          badge='variant="flush"'
          badgeTone="primary"
          description="Edge-hugging solid capsule indicator with high-contrast label color and haptic feedback."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" color="textMuted">
                Billing Cycle (Annual Discount Badge)
              </Text>
              <SegmentedControl
                variant="flush"
                size="md"
                tone="primary"
                values={[
                  { label: "Monthly", value: "monthly" },
                  { label: "Annual", value: "annual", badge: "-20%" },
                ]}
                selectedIndex={billingCycle === "monthly" ? 0 : 1}
                onChange={(_idx, val) => setBillingCycle(val)}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" color="textMuted">
                Project View Mode (Icons + Labels)
              </Text>
              <SegmentedControl
                variant="flush"
                size="md"
                tone="accent"
                values={[
                  {
                    label: "List",
                    value: "list",
                    icon: ({ color, size }) => <List color={color} size={size} />,
                  },
                  {
                    label: "Board",
                    value: "board",
                    icon: ({ color, size }) => <Kanban color={color} size={size} />,
                  },
                  {
                    label: "Timeline",
                    value: "timeline",
                    icon: ({ color, size }) => <Calendar color={color} size={size} />,
                  },
                ]}
                selectedIndex={viewMode === "list" ? 0 : viewMode === "board" ? 1 : 2}
                onChange={(_idx, val) => setViewMode(val)}
              />
            </Box>
          </Box>

          <DemoReadout
            label="Selected View & Cycle"
            value={`${viewMode.toUpperCase()} • ${billingCycle.toUpperCase()}`}
          />
        </DemoCard>

        {/* 2. Classic Surface Card Variant */}
        <DemoCard
          title="Surface Raised Switcher"
          badge='variant="surface"'
          badgeTone="secondary"
          description="Floating raised segment card with subtle elevation and calibrated track padding."
        >
          <SegmentedControl
            values={["Overview", "Deployments", "Analytics"]}
            selectedIndex={filterIdx}
            onChange={(idx) => setFilterIdx(idx)}
          />

          <DemoReadout
            label="Selected Segment Index"
            value={`Tab #${filterIdx + 1}: ${["Overview", "Deployments", "Analytics"][filterIdx]}`}
          />
        </DemoCard>

        {/* 3. Sizes & Semantic Tones */}
        <DemoCard
          title="Sizes & Semantic Tones"
          badge="xs • sm • md • lg"
          badgeTone="success"
          description="Calibrated touch targets across sizes with full tone color support."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" color="textMuted">
                Small Flush (32px height)
              </Text>
              <SegmentedControl
                variant="flush"
                size="sm"
                values={["Day", "Week", "Month", "Year"]}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" color="textMuted">
                Large Surface (44px height) • Success Tone
              </Text>
              <SegmentedControl
                size="lg"
                tone="success"
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
                    icon: ({ color, size }) => <Monitor color={color} size={size} />,
                  },
                ]}
                selectedIndex={themeMode === "light" ? 0 : themeMode === "dark" ? 1 : 2}
                onChange={(_idx, val) => setThemeMode(val)}
              />
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
