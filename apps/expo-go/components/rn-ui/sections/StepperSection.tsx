import { Box, Stepper, Text } from "@masumdev/rn-ui";
import { Minus, Plus } from "lucide-react-native";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function StepperSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [cartCount, setCartCount] = useState(3);
  const [guestsCount, setGuestsCount] = useState(2);

  return (
    <Section title="Stepper">
      <Box gap="lg">
        {/* Card 1: E-Commerce Quantity Row */}
        <DemoCard
          title="E-Commerce Stepper"
          badge="Interactive Row"
          badgeTone="primary"
          description="Numeric counter with concentric inner radii, smooth button press states, and boundary bounds."
        >
          <Box gap="md">
            <DemoSurface radius="md">
              <Box
                row
                wrap
                gap="sm"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box gap="xxs" style={{ flexShrink: 1 }}>
                  <Text variant="label" weight="600">
                    Order Quantity
                  </Text>
                  <Text variant="caption" color="textMuted">
                    Select number of items to checkout
                  </Text>
                </Box>

                <Stepper
                  value={cartCount}
                  min={1}
                  max={10}
                  onValueChange={setCartCount}
                  decrementIcon={icon(Minus)}
                  incrementIcon={icon(Plus)}
                />
              </Box>
            </DemoSurface>

            <DemoSurface radius="md">
              <Box
                row
                wrap
                gap="sm"
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box gap="xxs" style={{ flexShrink: 1 }}>
                  <Text variant="label" weight="600">
                    Hotel Guests
                  </Text>
                  <Text variant="caption" color="textMuted">
                    Adults per master suite
                  </Text>
                </Box>

                <Stepper
                  variant="soft"
                  value={guestsCount}
                  min={1}
                  max={6}
                  onValueChange={setGuestsCount}
                  decrementIcon={icon(Minus)}
                  incrementIcon={icon(Plus)}
                />
              </Box>
            </DemoSurface>

            <DemoReadout
              label="Reservation Total"
              value={`Items: ${cartCount} • Guests: ${guestsCount}`}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Variants & Sizes */}
        <DemoCard
          title="Stepper Variants & Sizes"
          badge="sm • md • lg"
          badgeTone="secondary"
          description="Filled, soft, and glassmorphism styling across compact, medium, and large dimensions."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Glassmorphism & Soft Variants
              </Text>
              <Box row gap="sm" style={{ flexWrap: "wrap" }}>
                <Stepper
                  variant="soft"
                  value={cartCount}
                  min={1}
                  max={10}
                  onValueChange={setCartCount}
                />
                <Stepper
                  glass
                  value={cartCount}
                  min={1}
                  max={10}
                  onValueChange={setCartCount}
                />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Control Sizes (sm, md, lg)
              </Text>
              <Box row gap="sm" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <Stepper
                  size="sm"
                  value={cartCount}
                  min={1}
                  max={10}
                  onValueChange={setCartCount}
                />
                <Stepper
                  size="md"
                  value={cartCount}
                  min={1}
                  max={10}
                  onValueChange={setCartCount}
                />
                <Stepper
                  size="lg"
                  value={cartCount}
                  min={1}
                  max={10}
                  onValueChange={setCartCount}
                />
              </Box>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
