import { Box, Input, Text } from "@masumdev/rn-ui";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function InputSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { sampleInput, setSampleInput } = ctx;
  const [email, setEmail] = useState("masum@example.com");
  const [password, setPassword] = useState("SecretPassword123!");
  const [searchTerm, setSearchTerm] = useState("Turborepo");

  return (
    <Section title="Input">
      <Box gap="lg">
        {/* Card 1: Standard Input Variants */}
        <DemoCard
          title="Text Input Fields"
          badge="Types & States"
          badgeTone="primary"
          description="Single-line text inputs with automatic label association, keyboard types, and focus transitions."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Full Legal Name
              </Text>
              <Input
                value={sampleInput}
                onChangeText={setSampleInput}
                placeholder="Enter full legal name"
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Work Email Address
              </Text>
              <Input
                type="email"
                value={email}
                onChangeText={setEmail}
                placeholder="developer@example.com"
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Account Password
              </Text>
              <Input
                type="password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter account password"
              />
            </Box>

            <DemoReadout
              label="Live State"
              value={`${sampleInput || "No Name"} • ${email}`}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Control Sizes & States */}
        <DemoCard
          title="Input Sizes & States"
          badge="sm • md • lg"
          badgeTone="secondary"
          description="Scaled input heights from compact 36px to prominent 52px, alongside disabled and error states."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Compact Search (sm - 36px)
              </Text>
              <Input
                size="sm"
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Quick search..."
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Standard Input (md - 44px)
              </Text>
              <Input
                size="md"
                placeholder="Standard text input"
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Hero Large Input (lg - 52px)
              </Text>
              <Input
                size="lg"
                placeholder="Large prominent input"
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="danger">
                Validation Error State
              </Text>
              <Input
                invalid
                value="invalid-subdomain$$#"
                placeholder="Enter subdomain"
              />
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
