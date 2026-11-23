import { Box, Button, CircularProgress, Progress, Text } from "@masumdev/rn-ui";
import { Play, RotateCcw } from "lucide-react-native";
import { useEffect, useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function ProgressSection({ ctx: _ctx }: { ctx: RnUiSectionContext }) {
  const [liveProgress, setLiveProgress] = useState(65);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!isSimulating) return;

    const timer = setInterval(() => {
      setLiveProgress((prev) => {
        if (prev >= 100) {
          setIsSimulating(false);
          return 100;
        }
        return prev + 5;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [isSimulating]);

  const handleSimulate = () => {
    setLiveProgress(0);
    setIsSimulating(true);
  };

  return (
    <Section title="Progress">
      <Box gap="lg">
        {/* Card 1: Interactive Progress Bar */}
        <DemoCard
          title="Linear Progress Bar"
          badge="UI Thread Motion"
          badgeTone="primary"
          description="Reanimated UI thread progress indicator with cubic bezier easing and continuous squircle corners."
        >
          <Box gap="md">
            <Progress value={liveProgress} tone="primary" size="md" />

            <Box row gap="sm" style={{ alignItems: "center" }}>
              <Button
                size="xs"
                variant="filled"
                tone="primary"
                leftIcon={({ color, size }) => <Play color={color} size={size} />}
                onPress={handleSimulate}
                disabled={isSimulating}
              >
                {isSimulating ? "Simulating..." : "Start Upload Demo"}
              </Button>
              <Button
                size="xs"
                variant="outline"
                tone="secondary"
                leftIcon={({ color, size }) => <RotateCcw color={color} size={size} />}
                onPress={() => setLiveProgress(0)}
              >
                Reset
              </Button>
            </Box>

            <DemoReadout
              label="Simulation Progress"
              value={`${liveProgress}% Completed`}
              tone={liveProgress === 100 ? "success" : "muted"}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Progress Scale Sizes */}
        <DemoCard
          title="Progress Scale Heights"
          badge="xs to xl"
          badgeTone="secondary"
          description="Standardized thickness scale ranging from 4px micro-indicators to 18px prominent hero bars."
        >
          <Box gap="md">
            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                Extra Small (xs - 4px)
              </Text>
              <Progress value={85} size="xs" tone="success" />
            </Box>

            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                Small (sm - 6px)
              </Text>
              <Progress value={70} size="sm" tone="primary" />
            </Box>

            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                Medium (md - 10px)
              </Text>
              <Progress value={55} size="md" tone="warning" />
            </Box>

            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                Large (lg - 14px)
              </Text>
              <Progress value={40} size="lg" tone="accent" />
            </Box>

            <Box gap="xxs">
              <Text variant="caption" color="textMuted">
                Extra Large (xl - 18px)
              </Text>
              <Progress value={90} size="xl" tone="danger" />
            </Box>
          </Box>
        </DemoCard>

        {/* Card 3: Circular Progress & Activity Indicators */}
        <DemoCard
          title="Circular Activity Rings"
          badge="Determinate Rings"
          badgeTone="accent"
          description="SVG radial progress meters with rounded stroke caps, percentage centers, and semantic tones."
        >
          <Box gap="md">
            <Box row center gap="xl" style={{ justifyContent: "space-around" }}>
              <Box center gap="xs">
                <CircularProgress value={75} tone="primary" size={64} strokeLinecap="round" />
                <Text variant="caption" color="textMuted">
                  Build 75%
                </Text>
              </Box>

              <Box center gap="xs">
                <CircularProgress value={92} tone="success" size={64} strokeLinecap="round" />
                <Text variant="caption" color="textMuted">
                  Tests 92%
                </Text>
              </Box>

              <Box center gap="xs">
                <CircularProgress value={45} tone="warning" size={64} strokeLinecap="round" />
                <Text variant="caption" color="textMuted">
                  Upload 45%
                </Text>
              </Box>
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
