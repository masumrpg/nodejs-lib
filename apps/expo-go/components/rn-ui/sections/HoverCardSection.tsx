import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Box,
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Text,
} from "@masumdev/rn-ui";
import { Check, UserPlus } from "lucide-react-native";
import { useState } from "react";
import {
  DemoCard,
  DemoSurface,
  SAMPLE_ASSETS,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function HoverCardSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [following, setFollowing] = useState(false);

  return (
    <Section title="HoverCard">
      <Box gap="lg">
        {/* Card 1: Author Profile Preview */}
        <DemoCard
          title="Author Profile Preview"
          badge="Long-Press Preview"
          badgeTone="primary"
          description="Interactive preview card anchored to text links with delay timers, portal layering, and rich layout."
        >
          <Box gap="md">
            <DemoSurface radius="md">
              <Box row gap="xs" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <Text color="text">Authored with care by </Text>

                <HoverCard openDelay={80} closeDelay={150}>
                  <HoverCardTrigger>
                    <Text variant="label" color="primary" weight="700">
                      @masumdev
                    </Text>
                  </HoverCardTrigger>

                  <HoverCardContent width={320}>
                    <Box gap="md">
                      <Box row gap="md" style={{ alignItems: "center" }}>
                        <Avatar size="lg">
                          <AvatarImage source={{ uri: SAMPLE_ASSETS.avatarUrl }} />
                          <AvatarFallback>MD</AvatarFallback>
                        </Avatar>

                        <Box flex={1} gap="xxs">
                          <Box row gap="xs" style={{ alignItems: "center" }}>
                            <Text variant="subtitle" weight="700">
                              Ma'sum
                            </Text>
                            <Badge tone="success" variant="soft" size="xs">
                              Author
                            </Badge>
                          </Box>
                          <Text variant="caption" color="textMuted">
                            @masumdev • masum@example.com
                          </Text>
                        </Box>
                      </Box>

                      <Text variant="bodySmall" color="textMuted">
                        Creator of @masumdev open-source libraries. Crafting high-performance React Native, Expo, and TypeScript packages.
                      </Text>

                      <Box
                        row
                        style={{
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 2,
                        }}
                      >
                        <Text variant="caption" color="textSubtle">
                          61 UI Components • Turborepo
                        </Text>

                        <Button
                          variant={following ? "soft" : "filled"}
                          tone="primary"
                          size="xs"
                          leftIcon={following ? icon(Check) : icon(UserPlus)}
                          onPress={() => setFollowing((prev) => !prev)}
                        >
                          {following ? "Following" : "Follow"}
                        </Button>
                      </Box>
                    </Box>
                  </HoverCardContent>
                </HoverCard>

                <Text color="text"> for the open-source community.</Text>
              </Box>
            </DemoSurface>

            <Text variant="caption" color="textMuted">
              Long-press @masumdev above to inspect the author hover card.
            </Text>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
