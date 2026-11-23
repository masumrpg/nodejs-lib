import {
  Box,
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Text,
} from "@masumdev/rn-ui";
import { Check, Globe, Search } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function InputGroupSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors, searchQuery, setSearchQuery } = ctx;
  const [slug, setSlug] = useState("mobile-docs");
  const [amount, setAmount] = useState("250000");

  return (
    <Section title="InputGroup">
      <Box gap="lg">
        {/* Card 1: Search Bar & Addon Integration */}
        <DemoCard
          title="Search & Filter Group"
          badge="Prefix & Suffix"
          badgeTone="primary"
          description="Composite input grouping leading search icons with inline result counter tags."
        >
          <Box gap="md">
            <InputGroup>
              <InputGroupAddon>
                <Search color={colors.textMuted} size={16} />
              </InputGroupAddon>
              <InputGroupInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search repository packages..."
                returnKeyType="search"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>14 packages</InputGroupText>
              </InputGroupAddon>
            </InputGroup>

            <DemoReadout
              label="Active Query"
              value={searchQuery || "All Packages"}
            />
          </Box>
        </DemoCard>

        {/* Card 2: URL Slug Builder */}
        <DemoCard
          title="URL Slug Builder"
          badge="Prefix + Suffix"
          badgeTone="accent"
          description="Prefix and suffix text addons attached flush to the domain slug input."
        >
          <Box gap="md">
            <InputGroup>
              <InputGroupAddon>
                <Globe color={colors.textMuted} size={16} />
                <InputGroupText>https://</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                value={slug}
                onChangeText={setSlug}
                placeholder="your-subdomain"
                autoCapitalize="none"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>.masumdev.id</InputGroupText>
              </InputGroupAddon>
            </InputGroup>

            <DemoReadout
              label="Resolved Canonical URL"
              value={`https://${slug || "project"}.masumdev.id`}
            />
          </Box>
        </DemoCard>

        {/* Card 3: Currency & Action Button */}
        <DemoCard
          title="Currency & Action Group"
          badge="Addon + Button"
          badgeTone="secondary"
          description="Currency symbol prefix addon paired with an inline submit action button."
        >
          <Box gap="md">
            <Box row gap="sm" style={{ alignItems: "center" }}>
              <Box flex={1}>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>IDR</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </InputGroup>
              </Box>
              <Button
                variant="filled"
                tone="primary"
                leftIcon={({ color, size }) => <Check color={color} size={size} />}
              >
                Top Up
              </Button>
            </Box>

            <Text variant="caption" color="textMuted">
              Transfer funds to workspace developer account balance.
            </Text>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
