import { Alert, Box, Button, Text } from "@masumdev/rn-ui";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, RefreshCw } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function AlertSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [showDismissible, setShowDismissible] = useState(true);

  return (
    <Section title="Alert">
      <Box gap="lg">
        {/* Card 1: Semantic Tonal Alerts */}
        <DemoCard
          title="Semantic Banner Alerts"
          badge="4 Tones"
          badgeTone="primary"
          description="Contextual notification banners with continuous squircle curvature, icons, and contrast text."
        >
          <Box gap="sm">
            <Alert
              tone="success"
              variant="soft"
              title="Deployment Succeeded"
              icon={icon(CheckCircle2)}
            >
              Your mobile production bundle v2.4 has been published to edge nodes.
            </Alert>

            <Alert
              tone="info"
              variant="soft"
              title="Scheduled Maintenance"
              icon={icon(Info)}
            >
              Database indexing scheduled on Sunday 02:00 AM UTC. No API downtime expected.
            </Alert>

            <Alert
              tone="warning"
              variant="soft"
              title="API Rate-Limit Threshold"
              icon={icon(AlertTriangle)}
            >
              Your workspace has consumed 88% of your monthly included request quota.
            </Alert>

            <Alert
              tone="danger"
              variant="soft"
              title="Pipeline Build Failure"
              icon={icon(AlertOctagon)}
            >
              TypeScript type-check failed on packages/rn-ui. See CI build logs for details.
            </Alert>
          </Box>
        </DemoCard>

        {/* Card 2: Interactive Actions & Dismissible State */}
        <DemoCard
          title="Interactive & Dismissible Alerts"
          badge="Actions & Close"
          badgeTone="secondary"
          description="Alert banners featuring inline retry actions, close buttons, and restore states."
        >
          <Box gap="md">
            {showDismissible ? (
              <Alert
                tone="primary"
                variant="outline"
                title="New Component Available"
                icon={icon(Info)}
                onClose={() => setShowDismissible(false)}
                action={{
                  label: "Explore",
                  onPress: () => setShowDismissible(false),
                }}
              >
                Tabs & SegmentedControl now feature the flush capsule switcher variant.
              </Alert>
            ) : (
              <Box row gap="sm" style={{ alignItems: "center" }}>
                <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                  Alert was dismissed.
                </Text>
                <Button
                  variant="outline"
                  tone="secondary"
                  size="xs"
                  leftIcon={icon(RefreshCw)}
                  onPress={() => setShowDismissible(true)}
                >
                  Restore Alert
                </Button>
              </Box>
            )}

            <Alert
              tone="danger"
              variant="filled"
              title="Critical Security Notice"
              icon={icon(AlertOctagon)}
              action={{
                label: "Configure",
                onPress: () => undefined,
              }}
            >
              Two-factor authentication is required for all administrator accounts.
            </Alert>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
