import {
  Badge,
  Box,
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
  Text,
} from "@masumdev/rn-ui";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function DataListSection({ ctx }: { ctx: RnUiSectionContext }) {
  void ctx;
  return (
    <Section title="DataList">
      <Box gap="lg">
        {/* 1. Deployment & Server Metadata */}
        <DemoCard
          title="Deployment Metadata"
          badge="Key - Value"
          badgeTone="primary"
          description="Clear label-value pairs for technical specifications, server metadata, and summary rows."
        >
          <DemoSurface tone="muted" style={{ padding: 14 }}>
            <DataList>
              <DataListItem>
                <DataListLabel>Environment</DataListLabel>
                <DataListValue>
                  <Badge tone="success" variant="soft" size="xs">
                    Production (Live)
                  </Badge>
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Cloud Region</DataListLabel>
                <DataListValue>ap-southeast-1 (Singapore)</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Commit SHA</DataListLabel>
                <DataListValue>
                  <Text variant="bodySmall" weight="600" style={{ fontVariant: ["tabular-nums"] }}>
                    e3b7a1f8
                  </Text>
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Lead Maintainer</DataListLabel>
                <DataListValue>Ma'sum (masum@example.com)</DataListValue>
              </DataListItem>
            </DataList>
          </DemoSurface>
        </DemoCard>

        {/* 2. Workspace Account Details */}
        <DemoCard
          title="Account Specifications"
          badge="Workspace Info"
          badgeTone="secondary"
          description="Structured account configuration display."
        >
          <DemoSurface tone="raised" style={{ padding: 14 }}>
            <DataList>
              <DataListItem>
                <DataListLabel>Organization</DataListLabel>
                <DataListValue>Masum Dev Open Source</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Active Plan</DataListLabel>
                <DataListValue>
                  <Badge tone="primary" variant="filled" size="xs">
                    Enterprise
                  </Badge>
                </DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Strict Typing</DataListLabel>
                <DataListValue>Zero Any Policy (100% Validated)</DataListValue>
              </DataListItem>
              <DataListItem>
                <DataListLabel>Motion Policy</DataListLabel>
                <DataListValue>Zero Bounce (Timing Eased)</DataListValue>
              </DataListItem>
            </DataList>
          </DemoSurface>
        </DemoCard>
      </Box>
    </Section>
  );
}
