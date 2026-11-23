import { Badge, Box, Text } from "@masumdev/rn-ui";
import {
  AlertTriangle,
  Bell,
  Check,
  Flame,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react-native";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function BadgesSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { styles } = ctx;

  return (
    <Section title="Badges">
      <Box gap="lg">
        {/* Card 1: All Badge Variants */}
        <DemoCard
          title="Badge Variants"
          badge="5 Variants"
          badgeTone="primary"
          description="Visual hierarchy with filled, soft, outline, ghost, and glassmorphism treatments."
        >
          <Box row gap="sm" center style={styles.wrap}>
            <Badge tone="primary" variant="filled">
              Filled
            </Badge>
            <Badge tone="primary" variant="soft">
              Soft
            </Badge>
            <Badge tone="primary" variant="outline">
              Outline
            </Badge>
            <Badge tone="primary" variant="ghost">
              Ghost
            </Badge>
            <Badge tone="primary" glass>
              Glass
            </Badge>
          </Box>
        </DemoCard>

        {/* Card 2: Semantic Tones with Icons */}
        <DemoCard
          title="Semantic Tones"
          badge="With Icons"
          badgeTone="success"
          description="Harmonious design-token color palette paired with optional Lucide icon prefixes."
        >
          <Box row gap="sm" center style={styles.wrap}>
            <Badge
              tone="primary"
              variant="filled"
              icon={({ color, size }) => <Sparkles color={color} size={size} />}
            >
              Featured
            </Badge>
            <Badge
              tone="success"
              variant="soft"
              icon={({ color, size }) => <ShieldCheck color={color} size={size} />}
            >
              Verified
            </Badge>
            <Badge
              tone="warning"
              variant="soft"
              icon={({ color, size }) => <AlertTriangle color={color} size={size} />}
            >
              Warning
            </Badge>
            <Badge
              tone="danger"
              variant="filled"
              icon={({ color, size }) => <Flame color={color} size={size} />}
            >
              Hot Deal
            </Badge>
            <Badge
              tone="accent"
              variant="soft"
              icon={({ color, size }) => <Zap color={color} size={size} />}
            >
              Instant
            </Badge>
            <Badge
              tone="info"
              variant="outline"
              icon={({ color, size }) => <Bell color={color} size={size} />}
            >
              Update
            </Badge>
          </Box>
        </DemoCard>

        {/* Card 3: Size Hierarchy */}
        <DemoCard
          title="Badge Sizes"
          badge="sm • md • lg"
          badgeTone="secondary"
          description="Proportional typography and icon scaling across compact, regular, and large layouts."
        >
          <Box row gap="md" center style={styles.wrap}>
            <Box center gap="xs">
              <Badge
                size="sm"
                tone="primary"
                icon={({ color, size }) => <Check color={color} size={size} />}
              >
                Small (sm)
              </Badge>
              <Text variant="caption" color="textMuted">
                Compact
              </Text>
            </Box>

            <Box center gap="xs">
              <Badge
                size="md"
                tone="primary"
                icon={({ color, size }) => <Check color={color} size={size} />}
              >
                Medium (md)
              </Badge>
              <Text variant="caption" color="textMuted">
                Standard
              </Text>
            </Box>

            <Box center gap="xs">
              <Badge
                size="lg"
                tone="primary"
                icon={({ color, size }) => <Check color={color} size={size} />}
              >
                Large (lg)
              </Badge>
              <Text variant="caption" color="textMuted">
                Prominent
              </Text>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
