import {
  Avatar,
  Badge,
  Box,
  Button,
  SegmentedControl,
  SideNavContent,
  SideNavFooter,
  SideNavHeader,
  SideNavItem,
  SideNavSection,
  SideNavigation,
  Text,
} from "@masumdev/rn-ui";
import {
  BarChart3,
  Bell,
  Compass,
  CreditCard,
  FolderGit2,
  HelpCircle,
  Home,
  Layers,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function SideNavigationSection({ ctx: _ctx }: { ctx?: RnUiSectionContext }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerActiveKey, setDrawerActiveKey] = useState("dashboard");
  const [railActiveKey, setRailActiveKey] = useState("home");
  const [floatingActiveKey, setFloatingActiveKey] = useState("analytics");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsibleActiveKey, setCollapsibleActiveKey] = useState("projects");
  const [activeHighlightVariant, setActiveHighlightVariant] = useState<
    "subtle" | "solid" | "outline" | "ghost"
  >("subtle");

  const HIGHLIGHT_OPTIONS = [
    { label: "Subtle Fill", value: "subtle" },
    { label: "Solid Color", value: "solid" },
    { label: "Outline", value: "outline" },
    { label: "Ghost", value: "ghost" },
  ];

  return (
    <Section title="SideNavigation">
      <Box gap="lg">
        {/* 1. Interactive Drawer (Gesture-Dismiss Modal) */}
        <DemoCard
          title="Gesture Drawer Modal"
          badge='variant="drawer"'
          badgeTone="primary"
          description="Sliding overlay navigation drawer with gesture swipe-to-dismiss tracking, velocity handoff, and backdrop blur."
        >
          <Box gap="md">
            <Box row style={{ alignItems: "center", justifyContent: "space-between" }}>
              <Button
                variant="filled"
                tone="primary"
                leftIcon={({ color, size }: { color: string; size: number }) => (
                  <Menu color={color} size={size} />
                )}
                onPress={() => setIsDrawerOpen(true)}
              >
                Open Navigation Drawer
              </Button>

              <DemoReadout label="Active Route" value={drawerActiveKey} />
            </Box>

            <SideNavigation
              variant="drawer"
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              activeKey={drawerActiveKey}
              onSelect={setDrawerActiveKey}
              activeVariant={activeHighlightVariant}
            >
              <SideNavHeader
                title="Masum Studio"
                subtitle="Enterprise Workspace"
                icon={({ color, size }) => <Compass color={color} size={size} />}
              />

              <SideNavContent>
                <SideNavSection label="Platform">
                  <SideNavItem
                    id="dashboard"
                    label="Dashboard"
                    icon={({ color, size }) => (
                      <LayoutDashboard color={color} size={size} />
                    )}
                    badge="NEW"
                    badgeTone="success"
                  />
                  <SideNavItem
                    id="analytics"
                    label="Analytics & Metrics"
                    icon={({ color, size }) => (
                      <BarChart3 color={color} size={size} />
                    )}
                  />
                  <SideNavItem
                    id="projects"
                    label="Repositories"
                    icon={({ color, size }) => (
                      <FolderGit2 color={color} size={size} />
                    )}
                    badge="12"
                    badgeTone="primary"
                  />
                </SideNavSection>

                <SideNavSection label="Organization">
                  <SideNavItem
                    id="team"
                    label="Team Members"
                    icon={({ color, size }) => <Users color={color} size={size} />}
                  />
                  <SideNavItem
                    id="billing"
                    label="Plans & Billing"
                    icon={({ color, size }) => (
                      <CreditCard color={color} size={size} />
                    )}
                    badge="PRO"
                    badgeTone="warning"
                  />
                </SideNavSection>

                <SideNavSection label="System">
                  <SideNavItem
                    id="settings"
                    label="Workspace Settings"
                    icon={({ color, size }) => (
                      <Settings color={color} size={size} />
                    )}
                  />
                  <SideNavItem
                    id="support"
                    label="Help & Documentation"
                    icon={({ color, size }) => (
                      <HelpCircle color={color} size={size} />
                    )}
                  />
                </SideNavSection>
              </SideNavContent>

              <SideNavFooter>
                <Box row style={{ alignItems: "center", gap: 10, flex: 1 }}>
                  <Avatar size="sm">
                    <Text variant="caption" weight="700">
                      MS
                    </Text>
                  </Avatar>
                  <Box flex={1}>
                    <Text variant="label" weight="600" numberOfLines={1}>
                      Ma'sum
                    </Text>
                    <Text variant="caption" color="textMuted" numberOfLines={1}>
                      Admin • Lead Dev
                    </Text>
                  </Box>
                </Box>
              </SideNavFooter>
            </SideNavigation>
          </Box>
        </DemoCard>

        {/* 2. Compact Icon Rail Variant */}
        <DemoCard
          title="Compact Navigation Rail"
          badge='variant="rail"'
          badgeTone="accent"
          description="Persistent 70px icon dock designed for tablets and foldables. Long press or hover any icon to preview accessible tooltips."
        >
          <Box row gap="md" style={{ alignItems: "flex-start" }}>
            <Box style={{ height: 280, borderRadius: 12, overflow: "hidden" }}>
              <SideNavigation
                variant="rail"
                activeKey={railActiveKey}
                onSelect={setRailActiveKey}
                activeVariant="solid"
                tone="accent"
              >
                <SideNavHeader
                  icon={({ color, size }) => <Layers color={color} size={size} />}
                />
                <SideNavContent>
                  <SideNavItem
                    id="home"
                    label="Home"
                    icon={({ color, size }) => <Home color={color} size={size} />}
                  />
                  <SideNavItem
                    id="analytics"
                    label="Analytics"
                    icon={({ color, size }) => (
                      <BarChart3 color={color} size={size} />
                    )}
                    badge="dot"
                  />
                  <SideNavItem
                    id="notifications"
                    label="Notifications"
                    icon={({ color, size }) => <Bell color={color} size={size} />}
                    badge="5"
                  />
                  <SideNavItem
                    id="settings"
                    label="Settings"
                    icon={({ color, size }) => (
                      <Settings color={color} size={size} />
                    )}
                  />
                </SideNavContent>
              </SideNavigation>
            </Box>

            <Box flex={1} gap="sm" style={{ paddingVertical: 12 }}>
              <Text variant="label" weight="700">
                Tablet Rail Integration
              </Text>
              <Text variant="bodySmall" color="textMuted">
                Selected dock target:
              </Text>
              <Badge tone="accent" variant="soft" size="sm">
                {railActiveKey.toUpperCase()}
              </Badge>
              <Text variant="caption" color="textMuted">
                In rail mode, labels collapse automatically and each icon anchors an accessible Tooltip component.
              </Text>
            </Box>
          </Box>
        </DemoCard>

        {/* 3. Collapsible Sidebar with Smooth Morphing */}
        <DemoCard
          title="Collapsible Adaptive Sidebar"
          badge='variant="collapsible"'
          badgeTone="success"
          description="Smoothly toggles between expanded sidebar (260px) and compact rail (70px) with custom collapse trigger."
        >
          <Box gap="md">
            <Box row style={{ alignItems: "center", justifyContent: "space-between" }}>
              <Button
                size="sm"
                variant="outline"
                tone="success"
                leftIcon={({ color, size }: { color: string; size: number }) =>
                  isCollapsed ? (
                    <PanelLeftOpen color={color} size={size} />
                  ) : (
                    <PanelLeftClose color={color} size={size} />
                  )
                }
                onPress={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? "Expand Sidebar" : "Collapse to Rail"}
              </Button>

              <Badge tone={isCollapsed ? "accent" : "success"} variant="soft">
                {isCollapsed ? "Rail Mode (70px)" : "Expanded (260px)"}
              </Badge>
            </Box>

            <Box style={{ height: 260, borderRadius: 12, overflow: "hidden" }}>
              <SideNavigation
                variant="collapsible"
                collapsed={isCollapsed}
                onCollapsedChange={setIsCollapsed}
                activeKey={collapsibleActiveKey}
                onSelect={setCollapsibleActiveKey}
                tone="success"
              >
                <SideNavHeader
                  title="Dev Suite"
                  subtitle="v2.4 LTS"
                  icon={({ color, size }) => <FolderGit2 color={color} size={size} />}
                  showToggle
                />
                <SideNavContent>
                  <SideNavItem
                    id="projects"
                    label="Projects"
                    icon={({ color, size }) => (
                      <FolderGit2 color={color} size={size} />
                    )}
                  />
                  <SideNavItem
                    id="team"
                    label="Team Sync"
                    icon={({ color, size }) => <Users color={color} size={size} />}
                    badge="4"
                  />
                  <SideNavItem
                    id="settings"
                    label="Configuration"
                    icon={({ color, size }) => (
                      <Settings color={color} size={size} />
                    )}
                  />
                </SideNavContent>
              </SideNavigation>
            </Box>
          </Box>
        </DemoCard>

        {/* 4. Active Pill Highlight Variant Studio */}
        <DemoCard
          title="Active Pill Variant Studio"
          badge="Design System"
          badgeTone="secondary"
          description="Select visual style for active indicator pill across subtle, solid, outline, and ghost fills."
        >
          <Box gap="md">
            <SegmentedControl
              variant="flush"
              values={HIGHLIGHT_OPTIONS}
              selectedIndex={Math.max(
                0,
                HIGHLIGHT_OPTIONS.findIndex(
                  (o) => o.value === activeHighlightVariant,
                ),
              )}
              onChange={(_, next) =>
                setActiveHighlightVariant(
                  next as "subtle" | "solid" | "outline" | "ghost",
                )
              }
            />

            <Box style={{ height: 200, borderRadius: 12, overflow: "hidden" }}>
              <SideNavigation
                variant="expanded"
                activeKey={floatingActiveKey}
                onSelect={setFloatingActiveKey}
                activeVariant={activeHighlightVariant}
                tone="secondary"
              >
                <SideNavContent>
                  <SideNavItem
                    id="dashboard"
                    label="Overview Matrix"
                    icon={({ color, size }) => (
                      <LayoutDashboard color={color} size={size} />
                    )}
                  />
                  <SideNavItem
                    id="analytics"
                    label="Live Telemetry"
                    icon={({ color, size }) => (
                      <BarChart3 color={color} size={size} />
                    )}
                    badge="LIVE"
                    badgeTone="danger"
                  />
                  <SideNavItem
                    id="nodes"
                    label="Cluster Nodes"
                    icon={({ color, size }) => <Layers color={color} size={size} />}
                  />
                </SideNavContent>
              </SideNavigation>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
