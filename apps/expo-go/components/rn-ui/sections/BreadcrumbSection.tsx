import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Text,
} from "@masumdev/rn-ui";
import { ChevronRight, Home } from "lucide-react-native";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function BreadcrumbSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;
  const [selectedPath, setSelectedPath] = useState("Tabs.tsx");

  return (
    <Section title="Breadcrumb">
      <Box gap="lg">
        {/* 1. Standard Application Navigation Path */}
        <DemoCard
          title="App Navigation Trail"
          badge="Default Separator"
          badgeTone="primary"
          description="Hierarchical navigation path breadcrumb with interactive link steps."
        >
          <DemoSurface tone="muted" style={{ padding: 14 }}>
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink onPress={() => setSelectedPath("Dashboard")}>
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink onPress={() => setSelectedPath("Projects")}>
                  Projects
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Mobile UI Kit</BreadcrumbPage>
              </BreadcrumbItem>
            </Breadcrumb>
          </DemoSurface>

          <DemoReadout label="Navigation Trail Destination" value={selectedPath} />
        </DemoCard>

        {/* 2. File Explorer Breadcrumb with Icons */}
        <DemoCard
          title="Monorepo File Explorer Trail"
          badge="Custom Chevron"
          badgeTone="secondary"
          description="Deep directory structure navigation using custom icons."
        >
          <DemoSurface tone="raised" style={{ padding: 14 }}>
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink onPress={() => setSelectedPath("Root")}>
                  <Box row center gap="xs">
                    <Home color={colors.primary} size={14} />
                    <Text variant="bodySmall">workspace</Text>
                  </Box>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator>
                <ChevronRight color={colors.textMuted} size={14} />
              </BreadcrumbSeparator>

              <BreadcrumbItem>
                <BreadcrumbLink onPress={() => setSelectedPath("packages")}>
                  packages
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator>
                <ChevronRight color={colors.textMuted} size={14} />
              </BreadcrumbSeparator>

              <BreadcrumbItem>
                <BreadcrumbLink onPress={() => setSelectedPath("rn-ui")}>
                  rn-ui
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator>
                <ChevronRight color={colors.textMuted} size={14} />
              </BreadcrumbSeparator>

              <BreadcrumbItem>
                <BreadcrumbPage>Tabs.tsx</BreadcrumbPage>
              </BreadcrumbItem>
            </Breadcrumb>
          </DemoSurface>
        </DemoCard>
      </Box>
    </Section>
  );
}
