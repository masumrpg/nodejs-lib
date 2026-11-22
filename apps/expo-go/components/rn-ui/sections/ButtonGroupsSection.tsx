import {
  Box,
  Button,
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  Card,
  Text,
  useTheme,
} from "@masumdev/rn-ui";
import React from "react";
import { type LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Section, type RnUiSectionContext } from "../shared";

export function ButtonGroupsSection({ ctx: _ctx }: { ctx: RnUiSectionContext }) {
  const { colors, components, radii } = useTheme();
  const reducedMotion = useReducedMotion();
  const [activeSegment, setActiveSegment] = React.useState<"weekly" | "monthly" | "yearly">("weekly");
  const [containerWidth, setContainerWidth] = React.useState(0);
  const padding = 4;
  const activeBlockWidth = containerWidth > 0 ? (containerWidth - padding * 2) / 3 : 0;
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    if (activeBlockWidth <= 0) return;

    let index = 0;
    if (activeSegment === "monthly") index = 1;
    if (activeSegment === "yearly") index = 2;

    const target = index * activeBlockWidth;
    if (reducedMotion) {
      translateX.value = target;
      return;
    }

    translateX.value = withTiming(target, {
      duration: 160,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
    });
  }, [activeSegment, activeBlockWidth, reducedMotion, translateX]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Section title="Button Groups">
      <Card outlined>
        <Box gap="lg">
          <Text color="textMuted">
            Layout containers to group multiple buttons, inputs, or static text
            boxes with unified border-radii.
          </Text>

          {/* Horizontal Button Group */}
          <Box gap="sm">
            <Text variant="labelSmall" color="textSubtle">
              Horizontal Orientation
            </Text>
            <ButtonGroup orientation="horizontal">
              <ButtonGroupText>USD</ButtonGroupText>
              <Button variant="outline" tone="secondary" style={{ flex: 1 }}>
                Deposit
              </Button>
              <ButtonGroupSeparator />
              <Button variant="outline" tone="secondary" style={{ flex: 1 }}>
                Withdraw
              </Button>
            </ButtonGroup>
          </Box>

          {/* Segmented Actions with sliding background animation */}
          <Box gap="sm">
            <Text variant="labelSmall" color="textSubtle">
              Segmented Actions (Animated)
            </Text>
            <ButtonGroup
              orientation="horizontal"
              style={{
                backgroundColor: colors.backgroundMuted,
                borderRadius: radii.lg,
                borderWidth: components.borderWidth.default,
                borderColor: colors.border,
                position: "relative",
                overflow: "hidden",
                padding: padding,
              }}
              onLayout={(e: LayoutChangeEvent) =>
                setContainerWidth(e.nativeEvent.layout.width)
              }
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    top: padding,
                    bottom: padding,
                    left: padding,
                    width: activeBlockWidth,
                    opacity: containerWidth > 0 ? 1 : 0,
                    backgroundColor: colors.primary,
                    borderRadius: radii.md,
                  },
                  animatedIndicatorStyle,
                ]}
              />
              <Button
                variant="ghost"
                style={{ flex: 1 }}
                textStyle={{
                  color:
                    activeSegment === "weekly"
                      ? colors.onPrimary
                      : colors.textMuted,
                }}
                onPress={() => setActiveSegment("weekly")}
              >
                Weekly
              </Button>
              <Button
                variant="ghost"
                style={{ flex: 1 }}
                textStyle={{
                  color:
                    activeSegment === "monthly"
                      ? colors.onPrimary
                      : colors.textMuted,
                }}
                onPress={() => setActiveSegment("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant="ghost"
                style={{ flex: 1 }}
                textStyle={{
                  color:
                    activeSegment === "yearly"
                      ? colors.onPrimary
                      : colors.textMuted,
                }}
                onPress={() => setActiveSegment("yearly")}
              >
                Yearly
              </Button>
            </ButtonGroup>
          </Box>

          {/* Vertical Button Group */}
          <Box gap="sm">
            <Text variant="labelSmall" color="textSubtle">
              Vertical Orientation
            </Text>
            <ButtonGroup orientation="vertical">
              <Button variant="outline" tone="secondary" fullWidth>
                Option One
              </Button>
              <Button variant="outline" tone="secondary" fullWidth>
                Option Two
              </Button>
              <Button variant="outline" tone="secondary" fullWidth>
                Option Three
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
      </Card>
    </Section>
  );
}
