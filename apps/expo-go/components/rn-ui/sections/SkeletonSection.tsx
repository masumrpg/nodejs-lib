import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
  Badge,
  Box,
  Button,
  Divider,
  Skeleton,
  SkeletonGroup,
  Spinner,
  Switch,
  Text,
} from "@masumdev/rn-ui";
import {
  Bookmark,
  CheckCircle2,
  Clock,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  Users,
} from "lucide-react-native";
import React from "react";
import { Image, Pressable } from "react-native";
import {
  DemoCard,
  DemoSurface,
  SAMPLE_ASSETS,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function SkeletonSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors, icon } = ctx;
  const [animated, setAnimated] = React.useState(true);

  // Simulation state
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(false);
  const [liked, setLiked] = React.useState(false);
  const [bookmarked, setBookmarked] = React.useState(false);

  const simulateFetch = React.useCallback(() => {
    setIsFetching(true);
    setIsLoading(true);

    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsFetching(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Box gap="xl">
      {/* Existing Skeleton Loaders Section */}
      <Section title="Skeleton Loaders">
        <DemoCard
          title="Skeleton Shimmer"
          badge="UI Worklet"
          badgeTone="primary"
          description="Hardware-accelerated shimmer placeholder animations designed for zero layout-shift (CLS) transitions."
        >
          <Box gap="md">
            <Box
              row
              wrap
              gap="sm"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Text variant="caption" color="textMuted">
                Toggle worklet shimmer animation:
              </Text>
              <Button
                size="xs"
                variant={animated ? "outline" : "filled"}
                tone={animated ? "default" : "primary"}
                onPress={() => setAnimated(!animated)}
              >
                {animated ? "Pause Animation" : "Play Animation"}
              </Button>
            </Box>

            <DemoSurface tone="muted" radius="md">
              <Box gap="md">
                <Box row style={{ alignItems: "center", gap: 12 }}>
                  <Skeleton
                    animated={animated}
                    radius="full"
                    style={{ width: 48, height: 48 }}
                  />
                  <Box flex={1} gap="xs">
                    <Skeleton
                      animated={animated}
                      style={{ height: 16, width: "60%" }}
                    />
                    <Skeleton
                      animated={animated}
                      style={{ height: 12, width: "40%" }}
                    />
                  </Box>
                </Box>
                <Box gap="xs" style={{ marginTop: 4 }}>
                  <Skeleton
                    animated={animated}
                    style={{ height: 14, width: "100%" }}
                  />
                  <Skeleton
                    animated={animated}
                    style={{ height: 14, width: "85%" }}
                  />
                  <Skeleton
                    animated={animated}
                    style={{ height: 14, width: "50%" }}
                  />
                </Box>
              </Box>
            </DemoSurface>

            <Box gap="sm" style={{ marginTop: 4 }}>
              <Text variant="caption" color="textMuted">
                Diagonal Shimmer Direction
              </Text>
              <Skeleton
                animated={animated}
                direction="top-left-to-bottom-right"
                style={{ height: 28, width: "100%" }}
              />

              <Text variant="caption" color="textMuted">
                Horizontal Shimmer Direction
              </Text>
              <Skeleton
                animated={animated}
                direction="left-to-right"
                style={{ height: 28, width: "100%" }}
              />
            </Box>
          </Box>
        </DemoCard>
      </Section>

      {/* Interactive Data Transition Simulation Section */}
      <Section title="Data Transition Simulation">
        <DemoCard
          title="Live Content Transition"
          badge={isLoading ? "Fetching" : "Live Ready"}
          badgeTone={isLoading ? "warning" : "success"}
          description="Demonstrating zero layout-shift (CLS) transition from placeholder skeleton to loaded components."
        >
          <Box gap="lg">
            {/* Header & Controls */}
            <Box gap="sm">
              <Box
                row
                wrap
                gap="sm"
                style={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Text variant="subtitle" weight="600" style={{ flexShrink: 1 }}>
                  Transition Controls
                </Text>
                {isLoading ? (
                  <Box row center gap="xs">
                    <Spinner size="xs" variant="circular" tone="warning" />
                    <Badge tone="warning" variant="soft" size="sm">
                      Fetching Data...
                    </Badge>
                  </Box>
                ) : (
                  <Badge
                    tone="success"
                    variant="soft"
                    size="sm"
                    icon={icon(CheckCircle2)}
                  >
                    Live Data Ready
                  </Badge>
                )}
              </Box>

              {/* Action Buttons / Controls */}
              <Box
                row
                style={{
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 6,
                  paddingVertical: 6,
                }}
              >
                <Button
                  size="xs"
                  variant={isFetching ? "outline" : "filled"}
                  tone="primary"
                  leftIcon={icon(RefreshCw)}
                  onPress={simulateFetch}
                  disabled={isFetching}
                >
                  {isFetching ? "Fetching (2s)..." : "Simulate Fetch (2s)"}
                </Button>

                <Box row center gap="sm">
                  <Text variant="caption" color="textMuted">
                    Force Skeleton
                  </Text>
                  <Switch
                    value={isLoading}
                    onValueChange={(val) => {
                      setIsLoading(val);
                      if (!val) setIsFetching(false);
                    }}
                    tone="primary"
                  />
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* Pattern 1: User Profile Card */}
            <Box gap="xs">
              <Text variant="label" weight="600" color="textMuted">
                1. USER PROFILE CARD
              </Text>

              <DemoSurface tone="muted" radius="md">
                {isLoading ? (
                  /* Skeleton State - Driven by a single shared clock via SkeletonGroup */
                  <SkeletonGroup>
                    <Box gap="md">
                      <Box row style={{ alignItems: "center", gap: 12 }}>
                        <Skeleton radius="full" style={{ width: 56, height: 56 }} />
                        <Box flex={1} gap="xs">
                          <Box row style={{ alignItems: "center", gap: 8 }}>
                            <Skeleton radius="xs" style={{ height: 18, width: 120 }} />
                            <Skeleton radius="md" style={{ height: 18, width: 44 }} />
                          </Box>
                          <Skeleton radius="xs" style={{ height: 13, width: 160 }} />
                        </Box>
                      </Box>

                      <Box gap="xs">
                        <Skeleton radius="xs" style={{ height: 13, width: "100%" }} />
                        <Skeleton radius="xs" style={{ height: 13, width: "88%" }} />
                      </Box>

                      {/* Stats pills */}
                      <Box row gap="xs" style={{ flexWrap: "wrap" }}>
                        <Skeleton radius="full" style={{ height: 24, width: 95 }} />
                        <Skeleton radius="full" style={{ height: 24, width: 105 }} />
                        <Skeleton radius="full" style={{ height: 24, width: 85 }} />
                      </Box>

                      {/* Actions */}
                      <Box row gap="sm" style={{ marginTop: 4 }}>
                        <Skeleton radius="md" style={{ height: 36, flex: 1 }} />
                        <Skeleton radius="md" style={{ height: 36, flex: 1 }} />
                      </Box>
                    </Box>
                  </SkeletonGroup>
                ) : (
                  /* Loaded Data State */
                  <Box gap="md">
                    <Box row style={{ alignItems: "center", gap: 12 }}>
                      <Avatar size="xl">
                        <AvatarImage source={{ uri: SAMPLE_ASSETS.avatarUrl }} />
                        <AvatarFallback>{SAMPLE_ASSETS.avatarInitials}</AvatarFallback>
                        <AvatarBadge status="online" />
                      </Avatar>

                      <Box flex={1} style={{ gap: 2 }}>
                        <Box row center gap="xs">
                          <Text variant="title" weight="700">
                            {SAMPLE_ASSETS.avatarName}
                          </Text>
                          <Badge tone="primary" variant="soft" size="sm">
                            PRO
                          </Badge>
                        </Box>
                        <Text variant="caption" color="textMuted">
                          @masumrpg · Lead Mobile Architect
                        </Text>
                      </Box>
                    </Box>

                    <Text variant="bodySmall" color="text">
                      Crafting typed cross-platform design systems, zero-overhead animations, and modular React Native libraries.
                    </Text>

                    {/* Stats pills */}
                    <Box row gap="xs" style={{ flexWrap: "wrap" }}>
                      <Badge
                        tone="success"
                        variant="soft"
                        size="sm"
                        icon={icon(Users)}
                      >
                        1.4k Followers
                      </Badge>
                      <Badge
                        tone="primary"
                        variant="soft"
                        size="sm"
                        icon={icon(Sparkles)}
                      >
                        61+ Components
                      </Badge>
                      <Badge
                        tone="warning"
                        variant="soft"
                        size="sm"
                        icon={icon(Star)}
                      >
                        890 Stars
                      </Badge>
                    </Box>

                    {/* Actions */}
                    <Box row gap="sm" style={{ marginTop: 4 }}>
                      <Button size="sm" variant="filled" tone="primary" style={{ flex: 1 }}>
                        Follow
                      </Button>
                      <Button size="sm" variant="outline" tone="default" style={{ flex: 1 }}>
                        Message
                      </Button>
                    </Box>
                  </Box>
                )}
              </DemoSurface>
            </Box>

            {/* Pattern 2: Media Feed Card */}
            <Box gap="xs">
              <Text variant="label" weight="600" color="textMuted">
                2. MEDIA / FEED ARTICLE CARD
              </Text>

              <DemoSurface tone="muted" radius="md">
                {isLoading ? (
                  /* Skeleton State - Driven by SkeletonGroup */
                  <SkeletonGroup>
                    <Box gap="md">
                      <Skeleton style={{ width: "100%", height: 130, borderRadius: ctx.radii.md, borderCurve: "continuous" }} />

                      <Box row style={{ alignItems: "center", gap: 8 }}>
                        <Skeleton radius="xs" style={{ height: 18, width: 85 }} />
                        <Skeleton radius="xs" style={{ height: 14, width: 65 }} />
                      </Box>

                      <Box gap="xs">
                        <Skeleton radius="xs" style={{ height: 18, width: "95%" }} />
                        <Skeleton radius="xs" style={{ height: 18, width: "65%" }} />
                      </Box>

                      <Box row style={{ justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <Box row style={{ alignItems: "center", gap: 8 }}>
                          <Skeleton radius="full" style={{ width: 28, height: 28 }} />
                          <Skeleton radius="xs" style={{ height: 14, width: 100 }} />
                        </Box>
                        <Skeleton radius="xs" style={{ height: 24, width: 24 }} />
                      </Box>
                    </Box>
                  </SkeletonGroup>
                ) : (
                  /* Loaded Data State */
                  <Box gap="md">
                    <Image
                      source={{ uri: SAMPLE_ASSETS.bannerImageUrl }}
                      style={{ width: "100%", height: 130, borderRadius: ctx.radii.md, borderCurve: "continuous" }}
                      resizeMode="cover"
                    />

                    <Box row style={{ alignItems: "center", gap: 8 }}>
                      <Badge tone="accent" variant="soft" size="sm">
                        REACT NATIVE
                      </Badge>
                      <Box row center style={{ gap: 4 }}>
                        <Clock size={11} color={colors.textMuted} />
                        <Text variant="caption" color="textMuted">
                          4 min read
                        </Text>
                      </Box>
                    </Box>

                    <Text variant="title" weight="700">
                      Zero-Shift Loading States with Skeleton Shimmer
                    </Text>

                    <Box row style={{ justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <Box row style={{ alignItems: "center", gap: 8 }}>
                        <Avatar size="sm">
                          <AvatarImage source={{ uri: SAMPLE_ASSETS.avatarUrl }} />
                          <AvatarFallback>{SAMPLE_ASSETS.avatarInitials}</AvatarFallback>
                        </Avatar>
                        <Text variant="caption" weight="600">
                          {"Ma'sum · 2h ago"}
                        </Text>
                      </Box>

                      <Box row center gap="sm">
                        <Pressable onPress={() => setLiked(!liked)} hitSlop={8}>
                          <Star
                            size={18}
                            color={liked ? colors.warning : colors.textMuted}
                            fill={liked ? colors.warning : "none"}
                          />
                        </Pressable>
                        <Pressable onPress={() => setBookmarked(!bookmarked)} hitSlop={8}>
                          <Bookmark
                            size={18}
                            color={bookmarked ? colors.primary : colors.textMuted}
                            fill={bookmarked ? colors.primary : "none"}
                          />
                        </Pressable>
                        <Pressable hitSlop={8}>
                          <Share2 size={18} color={colors.textMuted} />
                        </Pressable>
                      </Box>
                    </Box>
                  </Box>
                )}
              </DemoSurface>
            </Box>
          </Box>
        </DemoCard>
      </Section>
    </Box>
  );
}
