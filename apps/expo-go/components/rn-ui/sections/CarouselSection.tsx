import {
  Badge,
  Box,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Text,
} from "@masumdev/rn-ui";
import { ArrowRight, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react-native";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function CarouselSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  const deckFeatures = [
    {
      title: "AI Auto-Scaling",
      subtitle: "Dynamic layout adjustment for all devices",
      icon: Sparkles,
      tone: "primary" as const,
      badge: "FEATURED",
    },
    {
      title: "Enterprise Shield",
      subtitle: "Bank-grade encryption & security protocols",
      icon: ShieldCheck,
      tone: "success" as const,
      badge: "SECURE",
    },
    {
      title: "Instant Response",
      subtitle: "Zero latency state updates & haptic motion",
      icon: Zap,
      tone: "warning" as const,
      badge: "FAST",
    },
    {
      title: "Rocket Deploy",
      subtitle: "One-click deployment to Expo & React Native",
      icon: Rocket,
      tone: "accent" as const,
      badge: "PRO",
    },
  ];

  return (
    <Section title="Carousel">
      <Box gap="xl">
        {/* Variant 1: Interactive Feature Deck */}
        <DemoCard
          title="Interactive Deck Carousel"
          badge="loop • 3D scale"
          badgeTone="primary"
          description="Horizontal carousel slider with momentum snapping and side arrow pagination."
        >
          <Box style={{ marginTop: 4 }}>
            <Carousel loop itemWidth={260}>
              <CarouselContent>
                {deckFeatures.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <CarouselItem key={index}>
                      <DemoSurface
                        tone="raised"
                        style={{
                          width: 250,
                          padding: 16,
                          gap: 12,
                        }}
                      >
                        <Box
                          row
                          wrap
                          gap="sm"
                          style={{
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <DemoSurface
                            tone="muted"
                            radius="md"
                            padded={false}
                            bordered={false}
                            style={{
                              width: 40,
                              height: 40,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <IconComponent color={colors.primary} size={22} />
                          </DemoSurface>
                          <Badge tone={item.tone}>{item.badge}</Badge>
                        </Box>

                        <Box gap="xxs">
                          <Text weight="700" color="text">
                            {item.title}
                          </Text>
                          <Text color="textMuted" variant="bodySmall">
                            {item.subtitle}
                          </Text>
                        </Box>

                        <Button
                          size="xs"
                          variant="outline"
                          tone="primary"
                          rightIcon={({ color, size }) => (
                            <ArrowRight color={color} size={size} />
                          )}
                        >
                          Explore Feature
                        </Button>
                      </DemoSurface>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </Box>
        </DemoCard>

        {/* Variant 2: Auto-Play Banner Slideshow */}
        <DemoCard
          title="Auto-Play Announcement Banner"
          badge="AUTO PLAY (3s)"
          badgeTone="success"
          description="Auto-advancing infinite slideshow loop ideal for news and product announcements."
        >
          <Box style={{ marginTop: 4 }}>
            <Carousel autoPlay autoPlayInterval={3000} loop itemWidth={270}>
              <CarouselContent>
                <CarouselItem>
                  <DemoSurface
                    tone="primary"
                    style={{
                      width: 256,
                      padding: 18,
                      gap: 8,
                    }}
                  >
                    <Text weight="700" color="primary">
                      Version 0.7.0 Released
                    </Text>
                    <Text color="textMuted" variant="bodySmall">
                      Over 61 mobile UI components added to library.
                    </Text>
                  </DemoSurface>
                </CarouselItem>

                <CarouselItem>
                  <DemoSurface
                    tone="accent"
                    style={{
                      width: 256,
                      padding: 18,
                      gap: 8,
                    }}
                  >
                    <Text weight="700" color="accent">
                      Ultra Smooth 60 FPS
                    </Text>
                    <Text color="textMuted" variant="bodySmall">
                      Reanimated UI thread animations with zero spring bounce.
                    </Text>
                  </DemoSurface>
                </CarouselItem>

                <CarouselItem>
                  <DemoSurface
                    tone="success"
                    style={{
                      width: 256,
                      padding: 18,
                      gap: 8,
                    }}
                  >
                    <Text weight="700" color="success">
                      Multi-Theme Fidelity
                    </Text>
                    <Text color="textMuted" variant="bodySmall">
                      Zero border leaks in Minimal borderless mode.
                    </Text>
                  </DemoSurface>
                </CarouselItem>
              </CarouselContent>
            </Carousel>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
