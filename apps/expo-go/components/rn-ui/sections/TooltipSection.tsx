import { Box, Button, IconButton, Text, Tooltip } from "@masumdev/rn-ui";
import { Bookmark, Download, HelpCircle, Settings, Share2, Shield } from "lucide-react-native";
import { DemoCard, DemoSurface, Section, type RnUiSectionContext } from "../shared";

export function TooltipSection({ ctx }: { ctx?: RnUiSectionContext }) {
  const icon = ctx?.icon ?? ((Icon: React.ComponentType<{ color?: string; size?: number }>) => ({ color, size }: { color?: string; size?: number }) => <Icon color={color} size={size} />);

  const dummyItems = [
    {
      id: "1",
      title: "Workspace Profile",
      desc: "Owner: Ma'sum (masum@example.com)",
      tip: "Manage profile details and access rights",
    },
    {
      id: "2",
      title: "Security & 2FA Keys",
      desc: "Hardware authenticator registered",
      tip: "View registered hardware passkeys",
    },
    {
      id: "3",
      title: "Cloud Backup Sync",
      desc: "Last synchronized 2 minutes ago",
      tip: "Trigger manual off-site snapshot",
    },
    {
      id: "4",
      title: "API Gateway Telemetry",
      desc: "Healthy: 99.99% uptime this month",
      tip: "Inspect real-time gateway latency metrics",
    },
    {
      id: "5",
      title: "Audit Log Retention",
      desc: "Compliance policy active for 365 days",
      tip: "Export encrypted regulatory audit archive",
    },
  ];

  return (
    <Section title="Tooltip">
      <Box gap="lg">
        {/* Card 1: Smart Edge Auto-Flip Collision */}
        <DemoCard
          title="Edge Collision & Auto-Flip"
          badge="Collision-Safe"
          badgeTone="primary"
          description="Tooltips automatically measure window boundaries and flip axes to avoid edge clipping."
        >
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between", paddingVertical: 8 }}>
              <Tooltip
                content="Near left edge: auto-flips to right"
                triggerMode="press"
                position="left"
                autoFlip
              >
                <Button variant="outline" tone="secondary" size="xs">
                  Left Edge
                </Button>
              </Tooltip>

              <Tooltip
                content="Top center: anchored above button"
                triggerMode="press"
                position="top"
              >
                <Button variant="filled" tone="primary" size="xs">
                  Top Balloon
                </Button>
              </Tooltip>

              <Tooltip
                content="Near right edge: auto-flips to left"
                triggerMode="press"
                position="right"
                autoFlip
              >
                <Button variant="outline" tone="secondary" size="xs">
                  Right Edge
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </DemoCard>

        {/* Card 2: Interactive Toolbar Icon Tooltips */}
        <DemoCard
          title="Toolbar Action Hints"
          badge="Trigger on Press"
          badgeTone="secondary"
          description="Accessible hint balloons attached to compact icon buttons with arrow indicators."
        >
          <Box gap="md">
            <DemoSurface radius="md">
              <Box row gap="md" center style={{ justifyContent: "space-around" }}>
                <Tooltip content="Share project link" triggerMode="press" position="top" tone="primary">
                  <IconButton
                    icon={icon(Share2)}
                    variant="ghost"
                    tone="primary"
                    size="md"
                    accessibilityLabel="Share"
                  />
                </Tooltip>

                <Tooltip content="Download production bundle" triggerMode="press" position="top" tone="success">
                  <IconButton
                    icon={icon(Download)}
                    variant="ghost"
                    tone="success"
                    size="md"
                    accessibilityLabel="Download"
                  />
                </Tooltip>

                <Tooltip content="Security audit passed" triggerMode="press" position="top" tone="accent">
                  <IconButton
                    icon={icon(Shield)}
                    variant="ghost"
                    tone="accent"
                    size="md"
                    accessibilityLabel="Security"
                  />
                </Tooltip>

                <Tooltip content="Bookmark workspace" triggerMode="press" position="top" tone="warning">
                  <IconButton
                    icon={icon(Bookmark)}
                    variant="ghost"
                    tone="warning"
                    size="md"
                    accessibilityLabel="Bookmark"
                  />
                </Tooltip>

                <Tooltip content="Project settings" triggerMode="press" position="top" tone="secondary">
                  <IconButton
                    icon={icon(Settings)}
                    variant="ghost"
                    tone="secondary"
                    size="md"
                    accessibilityLabel="Settings"
                  />
                </Tooltip>
              </Box>
            </DemoSurface>
          </Box>
        </DemoCard>

        {/* Card 3: Scrollable List with Anchored Tooltips */}
        <DemoCard
          title="List Item Information"
          badge="Scrollable Anchors"
          badgeTone="secondary"
          description="Consistent portal projection even inside nested scroll views and list rows."
        >
          <Box gap="xs">
            {dummyItems.map((item) => (
              <DemoSurface
                key={item.id}
                radius="sm"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                }}
              >
                <Box flex={1} gap="xxs">
                  <Text variant="label" weight="600">
                    {item.title}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {item.desc}
                  </Text>
                </Box>

                <Tooltip
                  content={item.tip}
                  triggerMode="press"
                  position="left"
                  autoFlip
                >
                  <IconButton
                    icon={icon(HelpCircle)}
                    variant="ghost"
                    tone="secondary"
                    size="xs"
                    accessibilityLabel={`Hint for ${item.title}`}
                  />
                </Tooltip>
              </DemoSurface>
            ))}
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
