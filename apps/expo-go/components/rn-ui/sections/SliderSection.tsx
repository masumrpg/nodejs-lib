import { Box, RangeSlider, Slider, Text } from "@masumdev/rn-ui";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function SliderSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { sliderValue, setSliderValue } = ctx;
  const [priceRange, setPriceRange] = useState<[number, number]>([150, 850]);
  const [ageRange, setAgeRange] = useState<[number, number]>([21, 45]);

  return (
    <Section title="Slider">
      <Box gap="lg">
        {/* Card 1: Single Slider */}
        <DemoCard
          title="Single Value Slider"
          badge="Haptic Scrubbing"
          badgeTone="accent"
          description="Continuous slider with instant tactile step feedback and fluid thumb animations."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                System Volume & Opacity Control
              </Text>
              <Slider
                value={sliderValue}
                tone="accent"
                onValueChange={setSliderValue}
                onSlidingComplete={setSliderValue}
              />
            </Box>

            <DemoReadout label="Slider Value" value={`${sliderValue}%`} />
          </Box>
        </DemoCard>

        {/* Card 2: Dual-Thumb Range Sliders */}
        <DemoCard
          title="Dual-Thumb Range Slider"
          badge="Collision-Safe"
          badgeTone="primary"
          description="Interactive dual handles with collision prevention, boundary clamping, and live range readout."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                E-Commerce Price Filter ($0 to $1,000)
              </Text>
              <RangeSlider
                min={0}
                max={1000}
                step={10}
                value={priceRange}
                onValueChange={setPriceRange}
                tone="primary"
              />
            </Box>

            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Demographic Age Bracket (18 to 70 Yrs)
              </Text>
              <RangeSlider
                min={18}
                max={70}
                step={1}
                value={ageRange}
                onValueChange={setAgeRange}
                tone="accent"
              />
            </Box>

            <DemoReadout
              label="Selected Ranges"
              value={`Price: $${priceRange[0]} - $${priceRange[1]} • Age: ${ageRange[0]} - ${ageRange[1]} Yrs`}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
