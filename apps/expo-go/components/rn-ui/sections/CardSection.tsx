import { Badge, Box, Button, Card, Text } from "@masumdev/rn-ui";
import { Check, Sparkles } from "lucide-react-native";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function CardSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  return (
    <Section title="Card">
      <Box gap="lg">
        {/* 1. Subscription Plan Card (Outlined) */}
        <DemoCard
          title="Outlined Card"
          badge="padded • outlined"
          badgeTone="primary"
          description="Default content container with theme-reactive border tokens and continuous curvature."
        >
          <Card outlined padded>
            <Box gap="md">
              <Box row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box gap="xxs">
                  <Text variant="title" weight="700">
                    Pro Developer Plan
                  </Text>
                  <Text variant="caption" color="textMuted">
                    For individual mobile engineers and independent creators.
                  </Text>
                </Box>
                <Badge tone="primary" variant="filled">
                  POPULAR
                </Badge>
              </Box>

              <Box row style={{ alignItems: "baseline", gap: 4 }}>
                <Text variant="display" weight="700" color="primary">
                  $24
                </Text>
                <Text variant="bodySmall" color="textMuted">
                  / user / month
                </Text>
              </Box>

              <Box gap="xs">
                {[
                  "Unlimited components and screen templates",
                  "Zero-shift Reanimated layout transitions",
                  "Priority GitHub issue support & early releases",
                ].map((feature, idx) => (
                  <Box key={idx} row center gap="xs">
                    <Check color={colors.success} size={15} />
                    <Text variant="bodySmall" color="text">
                      {feature}
                    </Text>
                  </Box>
                ))}
              </Box>

              <Button variant="filled" tone="primary" size="md">
                Upgrade to Pro
              </Button>
            </Box>
          </Card>
        </DemoCard>

        {/* 2. Glassmorphism Card */}
        <DemoCard
          title="Glassmorphism Card"
          badge='glass'
          badgeTone="secondary"
          description="Frosted glass container with translucent background stepping and soft highlight rim."
        >
          <Card glass padded>
            <Box gap="xs">
              <Box row center gap="xs">
                <Sparkles color={colors.primary} size={18} />
                <Text variant="title" weight="700" color="primary">
                  Frosted Sequoia Surface
                </Text>
              </Box>
              <Text variant="bodySmall" color="textMuted">
                Translucent background adapts smoothly over dark and light backdrops with subtle highlight borders.
              </Text>
            </Box>
          </Card>
        </DemoCard>

        {/* 3. Elevated Card */}
        <DemoCard
          title="Elevated Card"
          badge="elevated"
          badgeTone="accent"
          description="Card container styled with subtle drop-shadows under elevated themes."
        >
          <Card elevated padded>
            <Box gap="xs">
              <Text variant="title" weight="700">
                Workspace Storage Notification
              </Text>
              <Text variant="bodySmall" color="textMuted">
                Your workspace utilized 84% of allocated cloud storage quota.
              </Text>
            </Box>
          </Card>
        </DemoCard>
      </Box>
    </Section>
  );
}
