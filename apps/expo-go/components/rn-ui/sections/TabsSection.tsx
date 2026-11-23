import { Box, Tabs, TabsContent, TabsList, TabsTrigger, Text } from "@masumdev/rn-ui";
import { Activity, Bell, Settings, ShieldCheck, User } from "lucide-react-native";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function TabsSection(_props?: { ctx?: RnUiSectionContext }) {
  const [activeTabFlush, setActiveTabFlush] = useState("overview");
  const [activeTabVariant, setActiveTabVariant] = useState("profile");
  const [activeTabSoft, setActiveTabSoft] = useState("security");
  const [tabTone, _setTabTone] = useState<"primary" | "success" | "accent">("primary");

  return (
    <Section title="Tabs">
      <Box gap="lg">
        {/* 1. Flush Solid Capsule Variant (Featured) */}
        <DemoCard
          title="Flush Solid Capsule"
          badge='variant="flush"'
          badgeTone="primary"
          description="Edge-hugging solid capsule indicator with continuous curvature and high-contrast label color."
        >
          <Tabs
            value={activeTabFlush}
            onValueChange={setActiveTabFlush}
            variant="flush"
            tone={tabTone}
            transition="slide"
          >
            <TabsList fullWidth>
              <TabsTrigger
                value="overview"
                icon={({ color, size }) => <User color={color} size={size} />}
              >
                Overview
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

            <TabsContent value="overview">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Workspace Overview</Text>
                <Text color="textMuted" variant="bodySmall">
                  Production environment active with 12 microservices running smoothly.
                </Text>
              </DemoSurface>
            </TabsContent>

            <TabsContent value="activity">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Recent Deployment Logs</Text>
                <Text color="textMuted" variant="bodySmall">
                  Version 0.7.0 deployed successfully by Ma'sum 8 minutes ago.
                </Text>
              </DemoSurface>
            </TabsContent>

            <TabsContent value="settings">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Security & Key Access</Text>
                <Text color="textMuted" variant="bodySmall">
                  API tokens scoped to read/write access. Auto-rotation enabled.
                </Text>
              </DemoSurface>
            </TabsContent>
          </Tabs>

          <DemoReadout label="Active Flush Tab" value={activeTabFlush} />
        </DemoCard>

        {/* 2. Classic Line & Pill Variants */}
        <DemoCard
          title="Underline & Pill Variants"
          badge='variant="line" | "pill"'
          badgeTone="secondary"
          description="Directional underline slide or raised pill switcher with theme-aware elevation."
        >
          <Tabs
            value={activeTabVariant}
            onValueChange={setActiveTabVariant}
            variant="pill"
            tone="accent"
            transition="scale"
          >
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="billing" badge="Pro">
                Billing
              </TabsTrigger>
              <TabsTrigger value="notifications">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Account Owner</Text>
                <Text color="textMuted" variant="bodySmall">
                  Ma'sum (masum@example.com) — Administrator role.
                </Text>
              </DemoSurface>
            </TabsContent>

            <TabsContent value="billing">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Subscription Plan</Text>
                <Text color="textMuted" variant="bodySmall">
                  Enterprise tier active with annual billing cycle.
                </Text>
              </DemoSurface>
            </TabsContent>

            <TabsContent value="notifications">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Channel Alerts</Text>
                <Text color="textMuted" variant="bodySmall">
                  Email and push notifications enabled for high-priority alerts.
                </Text>
              </DemoSurface>
            </TabsContent>
          </Tabs>

          <DemoReadout label="Pill Tab Selection" value={activeTabVariant} />
        </DemoCard>

        {/* 3. Soft Tint Variant */}
        <DemoCard
          title="Soft Tint Indicator"
          badge='variant="soft"'
          badgeTone="success"
          description="Translucent tinted indicator with smooth crossfade content transition."
        >
          <Tabs
            value={activeTabSoft}
            onValueChange={setActiveTabSoft}
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
                value="notifications"
                icon={({ color, size }) => <Bell color={color} size={size} />}
              >
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="security">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Hardware Key Authentication</Text>
                <Text color="textMuted" variant="bodySmall">
                  FIDO2 WebAuthn key registered as primary 2FA factor.
                </Text>
              </DemoSurface>
            </TabsContent>

            <TabsContent value="notifications">
              <DemoSurface tone="muted" style={{ gap: 6 }}>
                <Text weight="600">Incident Alerts</Text>
                <Text color="textMuted" variant="bodySmall">
                  Critical webhook dispatched to incident management team.
                </Text>
              </DemoSurface>
            </TabsContent>
          </Tabs>

          <DemoReadout label="Soft Tab Selection" value={activeTabSoft} />
        </DemoCard>
      </Box>
    </Section>
  );
}
