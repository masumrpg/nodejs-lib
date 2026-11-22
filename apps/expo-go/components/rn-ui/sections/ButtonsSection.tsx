import { Box, Button, Card, Text } from "@masumdev/rn-ui";
import { ArrowRight, Heart, Sparkles } from "lucide-react-native";
import { Section, type RnUiSectionContext } from "../shared";

export function ButtonsSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { styles, icon } = ctx;

  return (
    <Section title="Buttons">
      <Card outlined>
        <Box gap="lg">
          <Text color="textMuted">
            Interactive buttons with calibrated sizes, corner shapes, semantic tones, and glassmorphism styling.
          </Text>

          {/* Variants */}
          <Box gap="xs">
            <Text variant="labelSmall" color="textSubtle">
              Variants
            </Text>
            <Box row style={styles.wrap} gap="sm">
              <Button variant="filled">Filled</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button glass leftIcon={icon(Sparkles)}>
                Glassmorphism
              </Button>
            </Box>
          </Box>

          {/* Sizes */}
          <Box gap="xs">
            <Text variant="labelSmall" color="textSubtle">
              Sizes (xs - xl)
            </Text>
            <Box row style={[styles.wrap, { alignItems: "center" }]} gap="sm">
              <Button size="xs">XS</Button>
              <Button size="sm">SM</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </Box>
          </Box>

          {/* Shapes */}
          <Box gap="xs">
            <Text variant="labelSmall" color="textSubtle">
              Shapes
            </Text>
            <Box row style={styles.wrap} gap="sm">
              <Button shape="square" variant="soft">
                Square
              </Button>
              <Button shape="rounded" variant="soft">
                Rounded
              </Button>
              <Button shape="pill" variant="soft">
                Pill
              </Button>
            </Box>
          </Box>

          {/* Tones */}
          <Box gap="xs">
            <Text variant="labelSmall" color="textSubtle">
              Semantic Tones
            </Text>
            <Box row style={styles.wrap} gap="sm">
              <Button tone="primary" leftIcon={icon(Heart)}>
                Primary
              </Button>
              <Button tone="secondary">Secondary</Button>
              <Button tone="accent">Accent</Button>
              <Button tone="success">Success</Button>
              <Button tone="warning">Warning</Button>
              <Button tone="danger">Danger</Button>
            </Box>
          </Box>

          {/* States & Full Width */}
          <Box gap="xs">
            <Text variant="labelSmall" color="textSubtle">
              States & Full Width
            </Text>
            <Box row style={styles.wrap} gap="sm">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </Box>
            <Button fullWidth size="lg" rightIcon={icon(ArrowRight)}>
              Continue Action
            </Button>
          </Box>
        </Box>
      </Card>
    </Section>
  );
}
