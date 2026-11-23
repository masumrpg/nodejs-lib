import { Box, Divider, RadioGroup, RadioGroupItem, Text } from "@masumdev/rn-ui";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function RadioGroupSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { radioValue, setRadioValue } = ctx;
  const [plainDelivery, setPlainDelivery] = useState("express");
  const [accountType, setAccountType] = useState("organization");

  return (
    <Section title="RadioGroup">
      <Box gap="lg">
        {/* Card 1: Interactive Card Containers */}
        <DemoCard
          title="Card Radio Containers"
          badge="Card Variant"
          badgeTone="primary"
          description="Full-width interactive cards with active tonal borders, subtle backgrounds, and descriptions."
        >
          <Box gap="md">
            <RadioGroup variant="card" value={radioValue} onValueChange={setRadioValue}>
              <RadioGroupItem
                value="expo"
                label="Expo React Native SDK 57"
                description="Modern file-based routing, auto-linking, and fast live refresh."
              />
              <RadioGroupItem
                value="bare"
                label="Bare React Native CLI"
                description="Direct control over native Android Gradle and iOS Xcode projects."
              />
              <RadioGroupItem
                value="web"
                label="Universal Web (Astro 5 + Starlight)"
                description="Ultra-fast static documentation portal with server-side rendering."
              />
            </RadioGroup>

            <DemoReadout label="Active Architecture" value={radioValue} />
          </Box>
        </DemoCard>

        {/* Card 2: Plain Horizontal & Vertical Radio Choices */}
        <DemoCard
          title="Minimal Plain Radios"
          badge="Horizontal & Vertical"
          badgeTone="secondary"
          description="Lightweight radio controls without container cards for forms and clean settings lists."
        >
          <Box gap="lg">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Account Ownership (Horizontal Orientation)
              </Text>
              <RadioGroup
                variant="plain"
                orientation="horizontal"
                value={accountType}
                onValueChange={setAccountType}
                style={{ gap: 24 }}
              >
                <RadioGroupItem value="personal" label="Personal Account" />
                <RadioGroupItem value="organization" label="Organization" />
              </RadioGroup>
            </Box>

            <Divider />

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Shipping Priority (Vertical List)
              </Text>
              <RadioGroup
                variant="plain"
                value={plainDelivery}
                onValueChange={setPlainDelivery}
                style={{ gap: 10 }}
              >
                <RadioGroupItem
                  value="standard"
                  label="Standard Ground Delivery"
                  description="3 to 5 business days transit time."
                />
                <RadioGroupItem
                  value="express"
                  label="Priority Air Express"
                  description="Guaranteed next business day by 12:00 PM."
                />
                <RadioGroupItem
                  value="same-day"
                  label="Courier Same-Day Dispatch"
                  description="Delivered to your doorstep within 4 hours."
                />
              </RadioGroup>
            </Box>

            <DemoReadout
              label="Selected Setup"
              value={`${accountType} • ${plainDelivery}`}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
