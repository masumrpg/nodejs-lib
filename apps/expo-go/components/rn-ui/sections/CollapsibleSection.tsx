import {
  Box,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Text,
} from "@masumdev/rn-ui";
import { ChevronsUpDown, CreditCard, Package, Shield, Truck } from "lucide-react-native";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function CollapsibleSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  return (
    <Section title="Collapsible">
      <Box gap="lg">
        {/* 1. Order Fulfillment Details */}
        <DemoCard
          title="Collapsible Panel"
          badge="defaultOpen={false}"
          badgeTone="primary"
          description="Lightweight expandable container with smooth 60fps Reanimated height interpolation."
        >
          <Collapsible defaultOpen={false} style={{ width: "100%" }}>
            <CollapsibleTrigger>
              <DemoSurface
                tone="raised"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <Box row center gap="sm" style={{ flexShrink: 1 }}>
                  <Package color={colors.primary} size={20} />
                  <Text weight="700" color="text" style={{ flexShrink: 1 }}>
                    Order #4189 Details
                  </Text>
                </Box>
                <DemoSurface
                  tone="muted"
                  radius="xs"
                  padded={false}
                  bordered={false}
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronsUpDown color={colors.textMuted} size={16} />
                </DemoSurface>
              </DemoSurface>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <Box gap="sm" style={{ marginTop: 10 }}>
                {/* Status Row */}
                <DemoSurface
                  tone="muted"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                  }}
                >
                  <Text color="textMuted" variant="bodySmall">
                    Fulfillment Status
                  </Text>
                  <Text weight="600" color="success" variant="bodySmall">
                    Shipped • Tracking Active
                  </Text>
                </DemoSurface>

                {/* Shipping address */}
                <DemoSurface tone="muted" style={{ gap: 4 }}>
                  <Box row center gap="xs">
                    <Truck color={colors.primary} size={16} />
                    <Text weight="600" color="text" variant="bodySmall">
                      Delivery Destination
                    </Text>
                  </Box>
                  <Text color="textMuted" variant="bodySmall">
                    100 Market St, Suite 400, San Francisco, CA 94105
                  </Text>
                </DemoSurface>

                {/* Items & Payment */}
                <DemoSurface tone="muted" style={{ gap: 4 }}>
                  <Box row center gap="xs">
                    <CreditCard color={colors.primary} size={16} />
                    <Text weight="600" color="text" variant="bodySmall">
                      Items & Billing
                    </Text>
                  </Box>
                  <Text color="textMuted" variant="bodySmall">
                    2x Studio Pro Wireless Headphones • Total $598.00
                  </Text>
                </DemoSurface>
              </Box>
            </CollapsibleContent>
          </Collapsible>
        </DemoCard>

        {/* 2. Security Details Disclosure */}
        <DemoCard
          title="Security Disclosure Panel"
          badge="defaultOpen"
          badgeTone="accent"
          description="Expandable disclosure state for configuration options and sensitive keys."
        >
          <Collapsible defaultOpen style={{ width: "100%" }}>
            <CollapsibleTrigger>
              <DemoSurface
                tone="raised"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                }}
              >
                <Box row center gap="sm" style={{ flexShrink: 1 }}>
                  <Shield color={colors.accent} size={20} />
                  <Text weight="700" color="text" style={{ flexShrink: 1 }}>
                    API Key Permissions
                  </Text>
                </Box>
                <DemoSurface
                  tone="muted"
                  radius="xs"
                  padded={false}
                  bordered={false}
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ChevronsUpDown color={colors.textMuted} size={16} />
                </DemoSurface>
              </DemoSurface>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <Box gap="sm" style={{ marginTop: 10 }}>
                <DemoSurface tone="muted" style={{ gap: 4 }}>
                  <Text weight="600" color="text" variant="bodySmall">
                    Authorized Scopes
                  </Text>
                  <Text color="textMuted" variant="caption">
                    read:users, write:deployments, manage:webhooks
                  </Text>
                </DemoSurface>
              </Box>
            </CollapsibleContent>
          </Collapsible>
        </DemoCard>
      </Box>
    </Section>
  );
}
