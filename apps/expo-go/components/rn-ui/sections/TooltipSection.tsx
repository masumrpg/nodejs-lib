import {
  Badge,
  Box,
  Button,
  Card,
  IconButton,
  Text,
  Tooltip,
  useTheme,
} from "@masumdev/rn-ui";
import {
  Info,
  HelpCircle,
  Download,
  Share2,
  Shield,
  Settings,
  Bookmark,
  RefreshCw,
} from "lucide-react-native";
import { Section, type RnUiSectionContext } from "../shared";

export function TooltipSection(_props?: { ctx?: RnUiSectionContext }) {
  const { colors } = useTheme();
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
        {/* 1. Smart Edge Collision & Auto-Flip Test */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Smart Edge Auto-Flip
              </Text>
              <Badge tone="success">Smart Collision</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              When near the edge, tooltips automatically invert (right ➔ left, left ➔ right, top ➔ bottom, bottom ➔ top).
            </Text>

            {/* Left and Right Edge test buttons */}
            <Box row center style={{ justifyContent: "space-between", paddingVertical: 8 }}>
              <Tooltip
                content="Near left edge: auto-flips to the right"
                position="left"
                autoFlip
                tone="primary"
              >
                <Button
                  size="sm"
                  variant="outline"
                  tone="primary"
                  leftIcon={({ color, size }) => <Info color={color} size={size} />}
                >
                  Left Edge
                </Button>
              </Tooltip>

              <Tooltip
                content="Near right edge: auto-flips to the left"
                position="right"
                autoFlip
                tone="dark"
              >
                <Button
                  size="sm"
                  variant="outline"
                  tone="secondary"
                  rightIcon={({ color, size }) => <Info color={color} size={size} />}
                >
                  Right Edge
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Card>

        {/* 2. Tap & Hold Tooltip Toolbar */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Tap & Hold Action Bar
              </Text>
              <Badge tone="primary">Tap & Hold 250ms</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Tap and hold on any button to reveal directional pointer balloon. Tap outside to dismiss.
            </Text>

            <Box row gap="sm" center style={{ justifyContent: "space-around", paddingVertical: 12 }}>
              <Tooltip content="Download monthly balance statement" position="top">
                <IconButton
                  icon={({ color, size }) => <Download color={color} size={size} />}
                  variant="outline"
                  tone="primary"
                />
              </Tooltip>

              <Tooltip content="Share record with team member" position="bottom" tone="primary">
                <IconButton
                  icon={({ color, size }) => <Share2 color={color} size={size} />}
                  variant="filled"
                  tone="primary"
                />
              </Tooltip>

              <Tooltip content="Two-factor security active" position="top" tone="success">
                <IconButton
                  icon={({ color, size }) => <Shield color={color} size={size} />}
                  variant="soft"
                  tone="success"
                />
              </Tooltip>

              <Tooltip content="Detailed security documentation" position="left">
                <IconButton
                  icon={({ color, size }) => <HelpCircle color={color} size={size} />}
                  variant="soft"
                  tone="accent"
                />
              </Tooltip>

              <Tooltip content="System telemetry status" position="right" tone="dark">
                <IconButton
                  icon={({ color, size }) => <Info color={color} size={size} />}
                  variant="outline"
                  tone="secondary"
                />
              </Tooltip>
            </Box>
          </Box>
        </Card>

        {/* 3. Direct Tap Mode */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Direct Tap Mode
              </Text>
              <Badge tone="accent">Press Mode</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Single tap opens tooltip immediately with 3s auto-dismiss or backdrop dismissal.
            </Text>

            <Box row gap="sm" center style={{ justifyContent: "center", paddingVertical: 8 }}>
              <Tooltip
                content="API key configured for production"
                triggerMode="press"
                position="top"
                tone="dark"
                duration={3000}
              >
                <Button
                  tone="secondary"
                  variant="outline"
                  leftIcon={({ color, size }) => <Info color={color} size={size} />}
                >
                  Tap to Inspect API Key
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Card>

        {/* 4. Scrollable List Sample with Action Tooltips */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Scrollable List Test Cases
              </Text>
              <Badge tone="default">5 Items</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Scroll up and down to test tooltips at varying screen vertical positions.
            </Text>

            <Box gap="xs">
              {dummyItems.map((item, index) => (
                <Box
                  key={item.id}
                  row
                  center
                  style={[
                    {
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      justifyContent: "space-between",
                    },
                    index < dummyItems.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderMuted,
                    },
                  ]}
                >
                  <Box style={{ flex: 1, paddingRight: 12 }}>
                    <Text weight="600">{item.title}</Text>
                    <Text color="textMuted" variant="bodySmall">
                      {item.desc}
                    </Text>
                  </Box>
                  <Box row gap="xs" center>
                    <Tooltip content={item.tip} position="top" tone="primary">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        tone="primary"
                        icon={({ color, size }) => <Bookmark color={color} size={size} />}
                      />
                    </Tooltip>

                    <Tooltip content={`Configure ${item.title}`} position="top" tone="dark">
                      <IconButton
                        size="sm"
                        variant="ghost"
                        tone="secondary"
                        icon={({ color, size }) => <Settings color={color} size={size} />}
                      />
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>

        {/* 5. Bottom Card to Test Bottom-Edge Auto-Flip */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Bottom Edge Flip Test
              </Text>
              <Badge tone="warning">Bottom Viewport</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              This button specifies position="bottom", but when near the bottom of the screen, it flips smoothly to top!
            </Text>

            <Box row center style={{ justifyContent: "center", paddingVertical: 12 }}>
              <Tooltip
                content="Trigger snapshot rebuild now"
                position="bottom"
                autoFlip
                tone="warning"
              >
                <Button
                  tone="warning"
                  variant="filled"
                  leftIcon={({ color, size }) => <RefreshCw color={color} size={size} />}
                >
                  Bottom Button (Flips to Top)
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Card>
      </Box>
    </Section>
  );
}
