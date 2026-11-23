import { Box, Text } from "@masumdev/rn-ui";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function TextSection({ ctx }: { ctx: RnUiSectionContext }) {
  void ctx;
  return (
    <Section title="Text">
      <Box gap="lg">
        {/* 1. Complete Typography Hierarchy */}
        <DemoCard
          title="Typography Scale"
          badge="display • h1-h3 • body"
          badgeTone="primary"
          description="Theme-driven typography scale with proportional line-heights and system font weights."
        >
          <DemoSurface tone="muted" style={{ gap: 10 }}>
            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                variant="display" (44px)
              </Text>
              <Text variant="display">Headline</Text>
            </Box>

            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                variant="h1" (32px) / variant="h2" (28px) / variant="h3" (24px)
              </Text>
              <Text variant="h1">Heading One</Text>
              <Text variant="h2">Heading Two</Text>
              <Text variant="h3">Heading Three</Text>
            </Box>

            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                variant="title" (20px) / variant="subtitle" (16px)
              </Text>
              <Text variant="title">Section Title</Text>
              <Text variant="subtitle">Subsection Subtitle</Text>
            </Box>

            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                variant="body" (16px) / variant="bodySmall" (14px) / variant="caption" (12px)
              </Text>
              <Text variant="body">
                Standard body paragraph for primary user interface copy.
              </Text>
              <Text variant="bodySmall" color="textMuted">
                Small body text for secondary metadata and explanatory labels.
              </Text>
              <Text variant="caption" color="textSubtle">
                Caption text for timestamps, indicators, and legal footers.
              </Text>
            </Box>
          </DemoSurface>
        </DemoCard>

        {/* 2. Semantic Tone Colors */}
        <DemoCard
          title="Semantic Tone Colors"
          badge="WCAG AA Compliant"
          badgeTone="success"
          description="High-contrast semantic color tokens that adapt between light and dark themes."
        >
          <DemoSurface tone="muted" style={{ gap: 8 }}>
            <Text variant="label" color="primary">
              color="primary" • Electric brand accent
            </Text>
            <Text variant="label" color="success">
              color="success" • Positive operational state
            </Text>
            <Text variant="label" color="warning">
              color="warning" • Cautionary notice or threshold
            </Text>
            <Text variant="label" color="danger">
              color="danger" • Critical error or destructive action
            </Text>
            <Text variant="label" color="textMuted">
              color="textMuted" • Subdued secondary information
            </Text>
          </DemoSurface>
        </DemoCard>

        {/* 3. Realistic Editorial Article Preview */}
        <DemoCard
          title="Editorial Layout Article"
          badge="Composed Reading"
          badgeTone="accent"
          description="Demonstrating readability and typographic balance in long-form editorial views."
        >
          <DemoSurface tone="raised" style={{ gap: 8, padding: 16 }}>
            <Text variant="caption" color="primary" weight="700" style={{ textTransform: "uppercase" }}>
              Engineering Spotlight
            </Text>
            <Text variant="title" weight="700">
              Modern Minimalist Design Systems with Zero Bounce
            </Text>
            <Text variant="caption" color="textMuted">
              By Ma'sum • Published 2 hours ago • 4 min read
            </Text>
            <Text variant="bodySmall" color="text" style={{ lineHeight: 22 }}>
              Building cross-platform mobile libraries requires unwavering discipline:
              continuous corner curves, predictable timing curves over unpredictable
              spring bounce, and strict type safety across every exported component.
            </Text>
          </DemoSurface>
        </DemoCard>
      </Box>
    </Section>
  );
}
