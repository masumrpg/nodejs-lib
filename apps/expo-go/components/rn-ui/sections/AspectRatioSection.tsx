import { AspectRatio, Box, Text, useTheme } from "@masumdev/rn-ui";
import { Image } from "react-native";
import {
  DemoCard,
  SAMPLE_ASSETS,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function AspectRatioSection({ ctx: _ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = useTheme();

  return (
    <Section title="AspectRatio">
      <Box gap="lg">
        <DemoCard
          title="Aspect Ratio Media Frames"
          badge="16:9 • 4:3 • 1:1"
          badgeTone="primary"
          description="Maintains exact proportions for images or media cards with edge-to-edge continuous corners."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                16:9 Video & Banner Ratio (radius="lg")
              </Text>
              <AspectRatio
                ratio={16 / 9}
                radius="lg"
                style={{ backgroundColor: colors.surfaceMuted }}
              >
                <Image
                  source={{ uri: SAMPLE_ASSETS.bannerImageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </AspectRatio>
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                4:3 Gallery & Card Ratio
              </Text>
              <AspectRatio
                ratio={4 / 3}
                radius="lg"
                style={{ backgroundColor: colors.surfaceMuted }}
              >
                <Image
                  source={{ uri: SAMPLE_ASSETS.galleryImageUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </AspectRatio>
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                1:1 Square Thumbnail Ratio (120x120)
              </Text>
              <AspectRatio
                ratio={1}
                radius="lg"
                style={{ width: 120, backgroundColor: colors.surfaceMuted }}
              >
                <Image
                  source={{ uri: SAMPLE_ASSETS.avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </AspectRatio>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
