import { Box, Button, Divider, Text } from "@masumdev/rn-ui";
import { Mail, Shield, User } from "lucide-react-native";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function DividerSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  return (
    <Section title="Divider">
      <Box gap="lg">
        {/* 1. Horizontal Section Separators */}
        <DemoCard
          title="Horizontal Dividers"
          badge="inset • flat line"
          badgeTone="primary"
          description="Theme-reactive separator lines using calibrated border tokens for clean content grouping."
        >
          <DemoSurface tone="muted" style={{ padding: 14, gap: 12 }}>
            <Box row center gap="sm">
              <User color={colors.primary} size={18} />
              <Box flex={1}>
                <Text variant="label" weight="600">
                  Account Owner
                </Text>
                <Text variant="caption" color="textMuted">
                  Ma'sum (masum@example.com)
                </Text>
              </Box>
            </Box>

            <Divider />

            <Box row center gap="sm">
              <Shield color={colors.success} size={18} />
              <Box flex={1}>
                <Text variant="label" weight="600">
                  Security Status
                </Text>
                <Text variant="caption" color="textMuted">
                  Two-factor authentication enabled
                </Text>
              </Box>
            </Box>

            <Divider inset={12} />

            <Box row center gap="sm">
              <Mail color={colors.accent} size={18} />
              <Box flex={1}>
                <Text variant="label" weight="600">
                  Email Notifications
                </Text>
                <Text variant="caption" color="textMuted">
                  Weekly activity summary digest
                </Text>
              </Box>
            </Box>
          </DemoSurface>
        </DemoCard>

        {/* 2. Vertical Divider in Inline Stats */}
        <DemoCard
          title="Vertical Divider in Toolbar"
          badge="vertical"
          badgeTone="secondary"
          description="Vertical divider separating inline stats and toolbar actions."
        >
          <DemoSurface
            tone="raised"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-around",
              paddingVertical: 14,
            }}
          >
            <Box center gap="xxs">
              <Text variant="h3" weight="700" color="primary">
                61
              </Text>
              <Text variant="caption" color="textMuted">
                Components
              </Text>
            </Box>

            <Divider vertical style={{ height: 32 }} />

            <Box center gap="xxs">
              <Text variant="h3" weight="700" color="success">
                100%
              </Text>
              <Text variant="caption" color="textMuted">
                Type Safe
              </Text>
            </Box>

            <Divider vertical style={{ height: 32 }} />

            <Box center gap="xxs">
              <Text variant="h3" weight="700" color="accent">
                0
              </Text>
              <Text variant="caption" color="textMuted">
                Any Types
              </Text>
            </Box>
          </DemoSurface>
        </DemoCard>

        {/* 3. Labeled Auth Divider */}
        <DemoCard
          title="Labeled Separator"
          badge="Auth Divider"
          badgeTone="accent"
          description="Composing dividers with centered badge text for form separation."
        >
          <Box gap="md">
            <Button variant="outline" size="md">
              Sign In with Single Sign-On (SSO)
            </Button>

            <Box row center gap="sm">
              <Box flex={1}>
                <Divider />
              </Box>
              <Text variant="caption" color="textMuted" style={{ textTransform: "uppercase" }}>
                Or continue with
              </Text>
              <Box flex={1}>
                <Divider />
              </Box>
            </Box>

            <Button variant="filled" tone="primary" size="md">
              Sign In with Email
            </Button>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
