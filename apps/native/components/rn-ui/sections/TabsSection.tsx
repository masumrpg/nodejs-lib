import {
  Badge,
  Box,
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
} from "@masumdev/rn-ui";
import { User, Activity, Settings, Bell, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import { Section, type RnUiSectionContext } from "../shared";

export function TabsSection(_props?: { ctx?: RnUiSectionContext }) {
  const [activeTab1, setActiveTab1] = useState("profile");
  const [activeTab2, setActiveTab2] = useState("activity");
  const [activeTab3, setActiveTab3] = useState("security");

  return (
    <Section title="Tabs">
      <Box gap="lg">
        {/* 1. Classic Line Variant with Sliding Underline */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Underline Tabs
              </Text>
              <Badge tone="primary">Slide Transition</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Smooth underline indicator sliding between active tabs with directional slide content transition.
            </Text>

            <Tabs
              value={activeTab1}
              onValueChange={setActiveTab1}
              variant="line"
              transition="slide"
            >
              <TabsList>
                <TabsTrigger
                  value="profile"
                  icon={({ color, size }) => <User color={color} size={size} />}
                >
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  icon={({ color, size }) => <Activity color={color} size={size} />}
                  badge="3"
                >
                  Activity
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  icon={({ color, size }) => <Settings color={color} size={size} />}
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">User Profile Overview</Text>
                  <Text color="textMuted" variant="bodySmall">
                    Account owner: Ma'sum (masum@example.com).
                  </Text>
                </Box>
              </TabsContent>

              <TabsContent value="activity">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">Recent Account Activity</Text>
                  <Text color="textMuted" variant="bodySmall">
                    Last session authenticated 5 minutes ago.
                  </Text>
                </Box>
              </TabsContent>

              <TabsContent value="settings">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">Preferences & Configuration</Text>
                  <Text color="textMuted" variant="bodySmall">
                    Notification channels and privacy settings.
                  </Text>
                </Box>
              </TabsContent>
            </Tabs>
          </Box>
        </Card>

        {/* 2. Cupertino Capsule Pill Variant */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Pill Capsule Tabs
              </Text>
              <Badge tone="accent">Scale Transition</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Enclosed segmented capsule container with subtle content scale transition.
            </Text>

            <Tabs
              value={activeTab2}
              onValueChange={setActiveTab2}
              variant="pill"
              tone="accent"
              transition="scale"
            >
              <TabsList>
                <TabsTrigger value="activity">Overview</TabsTrigger>
                <TabsTrigger value="notifications">Alerts</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">Monthly Overview Panel</Text>
                  <Text color="textMuted" variant="bodySmall">
                    Aggregated key performance indicators.
                  </Text>
                </Box>
              </TabsContent>

              <TabsContent value="notifications">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">System Notifications</Text>
                  <Text color="textMuted" variant="bodySmall">
                    All workspace services operating normally.
                  </Text>
                </Box>
              </TabsContent>

              <TabsContent value="reports">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">Generated Reports</Text>
                  <Text color="textMuted" variant="bodySmall">
                    Quarterly statement ready for download.
                  </Text>
                </Box>
              </TabsContent>
            </Tabs>
          </Box>
        </Card>

        {/* 3. Soft Tint Variant */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Soft Tint Tabs
              </Text>
              <Badge tone="success">Fade Transition</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Soft tinted active tab indicator with pure crossfade content transition.
            </Text>

            <Tabs
              value={activeTab3}
              onValueChange={setActiveTab3}
              variant="soft"
              tone="success"
              transition="fade"
            >
              <TabsList>
                <TabsTrigger
                  value="security"
                  icon={({ color, size }) => <ShieldCheck color={color} size={size} />}
                >
                  Security
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  icon={({ color, size }) => <Bell color={color} size={size} />}
                >
                  Billing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="security">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">Two-Factor Authentication Active</Text>
                  <Text color="textMuted" variant="bodySmall">
                    Hardware key registered for identity verification.
                  </Text>
                </Box>
              </TabsContent>

              <TabsContent value="billing">
                <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }} gap="xs">
                  <Text weight="600">Subscription Status</Text>
                  <Text color="textMuted" variant="bodySmall">
                    Enterprise tier active with annual billing.
                  </Text>
                </Box>
              </TabsContent>
            </Tabs>
          </Box>
        </Card>
      </Box>
    </Section>
  );
}
