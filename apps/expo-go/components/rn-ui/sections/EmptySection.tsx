import {
  Box,
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@masumdev/rn-ui";
import { BellOff, FileSearch } from "lucide-react-native";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function EmptySection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  return (
    <Section title="Empty">
      <Box gap="lg">
        {/* 1. Empty Documents Collection */}
        <DemoCard
          title="No Documents Placeholder"
          badge="Empty Collection"
          badgeTone="primary"
          description="Empty state for collections before initial data creation or sync."
        >
          <DemoSurface tone="muted" style={{ padding: 24 }}>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon" size="md">
                  <FileSearch color={colors.primary} size={28} />
                </EmptyMedia>
                <EmptyTitle>No Documents Found</EmptyTitle>
                <EmptyDescription>
                  There are no files or documents uploaded to this workspace yet.
                  Create your first document to get started.
                </EmptyDescription>
              </EmptyHeader>

              <EmptyContent>
                <Box row center gap="sm" style={{ flexWrap: "wrap" }}>
                  <Button size="sm" variant="filled" tone="primary">
                    Create Document
                  </Button>
                  <Button size="sm" variant="outline" tone="secondary">
                    Import File
                  </Button>
                </Box>
              </EmptyContent>
            </Empty>
          </DemoSurface>
        </DemoCard>

        {/* 2. Empty Notifications Inbox */}
        <DemoCard
          title="Empty Notification Feed"
          badge="Caught Up"
          badgeTone="success"
          description="Subdued confirmation indicating all alerts have been resolved."
        >
          <DemoSurface tone="raised" style={{ padding: 24 }}>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon" size="md">
                  <BellOff color={colors.success} size={28} />
                </EmptyMedia>
                <EmptyTitle>All Caught Up!</EmptyTitle>
                <EmptyDescription>
                  You have resolved all outstanding notifications and review requests.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </DemoSurface>
        </DemoCard>
      </Box>
    </Section>
  );
}
