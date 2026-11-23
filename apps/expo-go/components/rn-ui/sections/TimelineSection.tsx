import { Box, Timeline, TimelineDescription, TimelineItem, TimelineTitle } from "@masumdev/rn-ui";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function TimelineSection({ ctx }: { ctx: RnUiSectionContext }) {
  return (
    <Section title="Timeline">
      <Box gap="lg">
        {/* 1. Order Fulfillment & Delivery Tracking */}
        <DemoCard
          title="Fulfillment Tracking Timeline"
          badge="Live Status"
          badgeTone="primary"
          description="Vertical event timeline with status nodes, connecting lines, and timestamp metadata."
        >
          <DemoSurface tone="muted" style={{ padding: 14 }}>
            <Timeline>
              <TimelineItem active dotColor={ctx.colors.success}>
                <TimelineTitle>Delivered to Front Door</TimelineTitle>
                <TimelineDescription>
                  Package signed and received by customer at 02:45 PM.
                </TimelineDescription>
              </TimelineItem>

              <TimelineItem active dotColor={ctx.colors.primary}>
                <TimelineTitle>Out for Delivery</TimelineTitle>
                <TimelineDescription>
                  Courier is in transit in your local delivery area (10:15 AM).
                </TimelineDescription>
              </TimelineItem>

              <TimelineItem active dotColor={ctx.colors.secondary}>
                <TimelineTitle>Arrived at Regional Sort Center</TimelineTitle>
                <TimelineDescription>
                  San Francisco sorting facility completed package intake (06:30 AM).
                </TimelineDescription>
              </TimelineItem>

              <TimelineItem dotColor={ctx.colors.secondary}>
                <TimelineTitle>Order Placed & Confirmed</TimelineTitle>
                <TimelineDescription>
                  Payment verified and inventory allocated from warehouse.
                </TimelineDescription>
              </TimelineItem>
            </Timeline>
          </DemoSurface>
        </DemoCard>

        {/* 2. CI/CD Release Pipeline */}
        <DemoCard
          title="CI/CD Release Pipeline"
          badge="Automated Deploy"
          badgeTone="accent"
          description="Sequential release stages tracking automated verification steps."
        >
          <DemoSurface tone="raised" style={{ padding: 14 }}>
            <Timeline>
              <TimelineItem active dotColor={ctx.colors.success}>
                <TimelineTitle>Production Release v0.7.0</TimelineTitle>
                <TimelineDescription>
                  Live deployment to npm registry and Expo Go showcase.
                </TimelineDescription>
              </TimelineItem>

              <TimelineItem active dotColor={ctx.colors.success}>
                <TimelineTitle>AST Codebase Audit (Zero Any)</TimelineTitle>
                <TimelineDescription>
                  11 workspaces audited, 298/298 files passed clean type check.
                </TimelineDescription>
              </TimelineItem>

              <TimelineItem active dotColor={ctx.colors.primary}>
                <TimelineTitle>Automated Unit & E2E Test Suite</TimelineTitle>
                <TimelineDescription>
                  55 tests passed, 462 assertions verified with zero regressions.
                </TimelineDescription>
              </TimelineItem>
            </Timeline>
          </DemoSurface>
        </DemoCard>
      </Box>
    </Section>
  );
}
