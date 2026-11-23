import { Box, Checkbox, Text } from "@masumdev/rn-ui";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function CheckboxSection({ ctx }: { ctx: RnUiSectionContext }) {
  void ctx;
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  // Select all logic
  const allChecked = emailNotifs && pushNotifs && smsNotifs;
  const isIndeterminate = (emailNotifs || pushNotifs || smsNotifs) && !allChecked;

  const handleSelectAll = (checked: boolean) => {
    setEmailNotifs(checked);
    setPushNotifs(checked);
    setSmsNotifs(checked);
  };

  return (
    <Section title="Checkbox">
      <Box gap="lg">
        {/* 1. Notification Channels & Indeterminate State */}
        <DemoCard
          title="Notification Channel Selection"
          badge="Indeterminate Support"
          badgeTone="primary"
          description="Accessible checkbox inputs with active focus colors, indeterminate state, and tones."
        >
          <DemoSurface tone="muted" style={{ padding: 14, gap: 12 }}>
            <Box row center gap="sm">
              <Checkbox
                checked={allChecked}
                indeterminate={isIndeterminate}
                onCheckedChange={handleSelectAll}
                tone="primary"
              />
              <Text variant="label" weight="700">
                Select All Notification Channels
              </Text>
            </Box>

            <Box style={{ paddingLeft: 24, gap: 10 }}>
              <Box row center gap="sm">
                <Checkbox
                  checked={emailNotifs}
                  onCheckedChange={setEmailNotifs}
                  tone="primary"
                />
                <Text variant="bodySmall">
                  Email Digests ({emailNotifs ? "Enabled" : "Disabled"})
                </Text>
              </Box>

              <Box row center gap="sm">
                <Checkbox
                  checked={pushNotifs}
                  onCheckedChange={setPushNotifs}
                  tone="primary"
                />
                <Text variant="bodySmall">
                  Push Notifications ({pushNotifs ? "Enabled" : "Disabled"})
                </Text>
              </Box>

              <Box row center gap="sm">
                <Checkbox
                  checked={smsNotifs}
                  onCheckedChange={setSmsNotifs}
                  tone="primary"
                />
                <Text variant="bodySmall">
                  SMS Security Alerts ({smsNotifs ? "Enabled" : "Disabled"})
                </Text>
              </Box>
            </Box>
          </DemoSurface>

          <DemoReadout
            label="Active Notification Count"
            value={`${[emailNotifs, pushNotifs, smsNotifs].filter(Boolean).length} of 3 enabled`}
          />
        </DemoCard>

        {/* 2. Sizes, Disabled & Validation States */}
        <DemoCard
          title="Sizes & Validation States"
          badge="xs • sm • md • lg"
          badgeTone="secondary"
          description="Different component sizes alongside disabled and validation states."
        >
          <Box gap="md">
            <Box row center gap="lg" style={{ flexWrap: "wrap" }}>
              <Box row center gap="xs">
                <Checkbox size="sm" defaultChecked tone="primary" />
                <Text variant="caption">Small (sm)</Text>
              </Box>
              <Box row center gap="xs">
                <Checkbox size="md" defaultChecked tone="success" />
                <Text variant="caption">Medium (md)</Text>
              </Box>
              <Box row center gap="xs">
                <Checkbox size="lg" defaultChecked tone="accent" />
                <Text variant="caption">Large (lg)</Text>
              </Box>
            </Box>

            <Box row center gap="md" style={{ flexWrap: "wrap" }}>
              <Box row center gap="xs">
                <Checkbox disabled defaultChecked />
                <Text variant="bodySmall" color="textMuted">
                  Disabled Checked
                </Text>
              </Box>
              <Box row center gap="xs">
                <Checkbox invalid defaultChecked={false} />
                <Text variant="bodySmall" color="danger">
                  Required (Invalid)
                </Text>
              </Box>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
