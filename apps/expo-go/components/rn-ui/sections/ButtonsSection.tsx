import { Box, Button } from "@masumdev/rn-ui";
import { ArrowRight, Heart, Sparkles, Trash2 } from "lucide-react-native";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function ButtonsSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { styles, icon } = ctx;

  return (
    <Section title="Button">
      <Box gap="lg">
        {/* 1. Variants */}
        <DemoCard
          title="Button Variants"
          badge="filled • soft • outline • ghost • glass"
          badgeTone="primary"
          description="Interactive pressable button with calibrated sizes, shapes, and haptic feedback."
        >
          <Box row style={styles.wrap} gap="sm">
            <Button variant="filled">Filled</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button glass leftIcon={icon(Sparkles)}>
              Glassmorphism
            </Button>
          </Box>
        </DemoCard>

        {/* 2. Shapes & Size Hierarchy */}
        <DemoCard
          title="Shapes & Size Scale"
          badge="xs to xl • continuous curves"
          badgeTone="secondary"
          description="Proportional typography, icon sizing, and continuous corner radius across all sizes."
        >
          <Box gap="md">
            <Box row style={[styles.wrap, { alignItems: "center" }]} gap="sm">
              <Button size="xs">XS (26px)</Button>
              <Button size="sm">SM (32px)</Button>
              <Button size="md">MD (36px)</Button>
              <Button size="lg">LG (42px)</Button>
              <Button size="xl">XL (48px)</Button>
            </Box>

            <Box row style={styles.wrap} gap="sm">
              <Button shape="rounded" variant="soft">
                Rounded Shape
              </Button>
              <Button shape="pill" variant="soft">
                Pill Shape
              </Button>
              <Button shape="square" variant="soft">
                Square Shape
              </Button>
            </Box>
          </Box>
        </DemoCard>

        {/* 3. Semantic Tones & Action States */}
        <DemoCard
          title="Semantic Tones & Async Loading"
          badge="Accessible Colors"
          badgeTone="success"
          description="Semantic color palette with built-in loading spinner and disabled states."
        >
          <Box gap="md">
            <Box row style={styles.wrap} gap="sm">
              <Button tone="primary" leftIcon={icon(Heart)}>
                Primary
              </Button>
              <Button tone="secondary">Secondary</Button>
              <Button tone="accent">Accent</Button>
              <Button tone="success">Success</Button>
              <Button tone="warning">Warning</Button>
              <Button tone="danger" leftIcon={icon(Trash2)}>
                Danger
              </Button>
            </Box>

            <Box row style={styles.wrap} gap="sm">
              <Button loading>Saving Draft...</Button>
              <Button disabled>Disabled Action</Button>
            </Box>

            <Button fullWidth size="lg" rightIcon={icon(ArrowRight)} tone="primary">
              Continue to Checkout
            </Button>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
