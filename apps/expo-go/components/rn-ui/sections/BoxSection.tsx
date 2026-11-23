import { Box, Button, Text } from "@masumdev/rn-ui";
import { User } from "lucide-react-native";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function BoxSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  return (
    <Section title="Box">
      <Box gap="lg">
        {/* 1. Flexbox Alignment & Spacing */}
        <DemoCard
          title="Flexbox Alignment & Spacing"
          badge="row • gap tokens"
          badgeTone="primary"
          description="Flexible structural primitive supporting row/column direction, alignment, and gap tokens."
        >
          <Box gap="sm">
            <DemoSurface tone="muted" style={{ gap: 8 }}>
              <Text variant="caption" weight="600" color="textMuted">
                Horizontal Flex Row (gap="sm"):
              </Text>
              <Box row gap="sm" style={{ flexWrap: "wrap" }}>
                <DemoSurface
                  tone="raised"
                  radius="sm"
                  style={{ flex: 1, minWidth: 80, alignItems: "center" }}
                >
                  <Text variant="caption" weight="600">
                    Box 1
                  </Text>
                </DemoSurface>
                <DemoSurface
                  tone="raised"
                  radius="sm"
                  style={{ flex: 1, minWidth: 80, alignItems: "center" }}
                >
                  <Text variant="caption" weight="600">
                    Box 2
                  </Text>
                </DemoSurface>
                <DemoSurface
                  tone="raised"
                  radius="sm"
                  style={{ flex: 1, minWidth: 80, alignItems: "center" }}
                >
                  <Text variant="caption" weight="600">
                    Box 3
                  </Text>
                </DemoSurface>
              </Box>
            </DemoSurface>
          </Box>
        </DemoCard>

        {/* 2. Nested Tonal Surfaces */}
        <DemoCard
          title="Nested Tonal Layers"
          badge="bg tokens"
          badgeTone="secondary"
          description="Tonal surface stepping creates optical hierarchy without relying on heavy borders."
        >
          <Box gap="sm">
            <Box row gap="sm" style={{ flexWrap: "wrap" }}>
              <DemoSurface tone="primary" style={{ flex: 1, minWidth: 120, gap: 4 }}>
                <Text variant="label" color="primary">
                  Primary Tone
                </Text>
                <Text variant="caption" color="textMuted">
                  tone="primary"
                </Text>
              </DemoSurface>

              <DemoSurface tone="success" style={{ flex: 1, minWidth: 120, gap: 4 }}>
                <Text variant="label" color="success">
                  Success Tone
                </Text>
                <Text variant="caption" color="textMuted">
                  tone="success"
                </Text>
              </DemoSurface>
            </Box>

            <Box row gap="sm" style={{ flexWrap: "wrap" }}>
              <DemoSurface tone="accent" style={{ flex: 1, minWidth: 120, gap: 4 }}>
                <Text variant="label" color="accent">
                  Accent Tone
                </Text>
                <Text variant="caption" color="textMuted">
                  tone="accent"
                </Text>
              </DemoSurface>

              <DemoSurface tone="muted" style={{ flex: 1, minWidth: 120, gap: 4 }}>
                <Text variant="label" color="text">
                  Muted Surface
                </Text>
                <Text variant="caption" color="textMuted">
                  tone="muted"
                </Text>
              </DemoSurface>
            </Box>
          </Box>
        </DemoCard>

        {/* 3. Composed Header Layout */}
        <DemoCard
          title="Composed Header Layout"
          badge="Real-world UI"
          badgeTone="accent"
          description="Composing avatar, typography, badges, and actions purely using Box flex layouts."
        >
          <DemoSurface tone="muted" style={{ padding: 14 }}>
            <Box row style={{ alignItems: "center", justifyContent: "space-between" }} gap="md">
              <Box row style={{ alignItems: "center", gap: 12, flex: 1 }}>
                <DemoSurface
                  tone="primary"
                  radius="full"
                  padded={false}
                  bordered={false}
                  style={{
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User color={colors.primary} size={22} />
                </DemoSurface>

                <Box flex={1} gap="xxs">
                  <Text variant="subtitle" weight="700">
                    Ma'sum
                  </Text>
                  <Text variant="caption" color="textMuted">
                    Core Maintainer • @masumdev/rn-ui
                  </Text>
                </Box>
              </Box>

              <Button size="xs" variant="filled" tone="primary">
                Follow
              </Button>
            </Box>
          </DemoSurface>
        </DemoCard>
      </Box>
    </Section>
  );
}
