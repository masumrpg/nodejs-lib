import { Box, Button, Text, Textarea } from "@masumdev/rn-ui";
import { Send } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function TextareaSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [feedback, setFeedback] = useState(
    "The new continuous squircle borders and flush tab switcher look incredible!",
  );
  const [ticketDetails, setTicketDetails] = useState("");
  const maxLength = 240;

  return (
    <Section title="Textarea">
      <Box gap="lg">
        {/* Card 1: Multi-line User Feedback with Character Count */}
        <DemoCard
          title="Multi-line Feedback"
          badge="Auto-Growing"
          badgeTone="primary"
          description="Theme-aware multi-line editor with smooth scrolling, auto-growing height, and character limits."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Release Notes & Review Feedback
              </Text>
              <Textarea
                value={feedback}
                onChangeText={setFeedback}
                placeholder="Share your feedback or bug report here..."
                numberOfLines={4}
                maxLength={maxLength}
              />
            </Box>

            <Box
              row
              style={{
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Text variant="caption" color="textMuted">
                {feedback.length}/{maxLength} characters
              </Text>

              <Button
                variant="filled"
                tone="primary"
                size="sm"
                leftIcon={icon(Send)}
                onPress={() => undefined}
              >
                Submit Feedback
              </Button>
            </Box>

            <DemoReadout
              label="Live Editor Length"
              value={`${feedback.length} chars`}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Support Ticket & Disabled State */}
        <DemoCard
          title="Support Ticket Editor"
          badge="Diagnostics"
          badgeTone="secondary"
          description="Deep multiline text area for stack traces, system logs, and disabled inputs."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Diagnostic Stack Trace (Editable)
              </Text>
              <Textarea
                value={ticketDetails}
                onChangeText={setTicketDetails}
                placeholder="Paste runtime stack traces, crash reproduction logs, or device info..."
                numberOfLines={3}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Read-Only System Configuration
              </Text>
              <Textarea
                value={`OS: Android 15 (API 35)\nArchitecture: arm64-v8a\nRuntime: Hermes Engine (React Native 0.88)`}
                disabled
                numberOfLines={3}
              />
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
