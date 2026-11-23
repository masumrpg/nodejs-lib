import { Box, Rating, Text, useTheme } from "@masumdev/rn-ui";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function RatingSection({ ctx: _ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = useTheme();
  const [starRating, setStarRating] = useState(4);
  const [halfRating, setHalfRating] = useState(3.5);
  const [heartRating, setHeartRating] = useState(5);

  return (
    <Section title="Rating">
      <Box gap="lg">
        {/* Card 1: Interactive Touch & Drag Ratings */}
        <DemoCard
          title="Interactive Star Ratings"
          badge="Full & Half Step"
          badgeTone="warning"
          description="Direct gesture scrubbing with smooth animated scale response and zero unicode drift."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Full-Step Precision Rating (1 to 5)
              </Text>
              <Rating
                value={starRating}
                precision="full"
                size="lg"
                showValue
                onValueChange={setStarRating}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Half-Step Precision Rating (0.5 Step)
              </Text>
              <Rating
                value={halfRating}
                precision="half"
                size="lg"
                tone="warning"
                showValue
                onValueChange={setHalfRating}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Heart Shape Rating (Favorites)
              </Text>
              <Rating
                value={heartRating}
                shape="heart"
                precision="full"
                size="lg"
                tone="danger"
                showValue
                onValueChange={setHeartRating}
              />
            </Box>

            <DemoReadout
              label="Live Scores"
              value={`Stars: ${starRating}/5 • Half: ${halfRating}/5 • Hearts: ${heartRating}/5`}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Preset Shapes & Read-Only Review Display */}
        <DemoCard
          title="Preset Shapes & Reviews"
          badge="6 Shapes • Exact"
          badgeTone="secondary"
          description="Built-in SVG shapes and exact fractional review display with custom label formatting."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Vector Geometry Presets
              </Text>
              <Box style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
                <Box center gap="xs">
                  <Rating shape="star" value={4} size="md" readOnly />
                  <Text variant="caption" color="textMuted">Star</Text>
                </Box>
                <Box center gap="xs">
                  <Rating shape="heart" value={5} size="md" readOnly />
                  <Text variant="caption" color="textMuted">Heart</Text>
                </Box>
                <Box center gap="xs">
                  <Rating shape="thumb" value={4} size="md" readOnly />
                  <Text variant="caption" color="textMuted">Thumb</Text>
                </Box>
                <Box center gap="xs">
                  <Rating shape="fire" value={5} size="md" readOnly />
                  <Text variant="caption" color="textMuted">Fire</Text>
                </Box>
                <Box center gap="xs">
                  <Rating shape="smile" value={4} size="md" readOnly />
                  <Text variant="caption" color="textMuted">Smile</Text>
                </Box>
                <Box center gap="xs">
                  <Rating shape="shield" value={5} size="md" readOnly />
                  <Text variant="caption" color="textMuted">Shield</Text>
                </Box>
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Exact Fractional Review Display (4.7)
              </Text>
              <Rating
                value={4.7}
                precision="exact"
                size="xl"
                readOnly
                showValue
                valueFormat={(val, max) => `${val.toFixed(1)} / ${max} (1,248 reviews)`}
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Custom Lucide Icon Support
              </Text>
              <Rating
                value={4}
                size="lg"
                color={colors.accent}
                icon={({ color, size }) => <Sparkles color={color} size={size} />}
                showValue
              />
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
