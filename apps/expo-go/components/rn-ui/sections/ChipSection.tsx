import { Box, Chip } from "@masumdev/rn-ui";
import { MapPin, Plus, Sparkles, Tag as TagIcon } from "lucide-react-native";
import { useRef, useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function ChipSection(_props?: { ctx?: RnUiSectionContext }) {
  const nextChipIdRef = useRef(1);

  // Filter chips state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "React Native",
    "TypeScript",
  ]);

  // Removable input tags state
  const [tags, setTags] = useState<string[]>([
    "Mobile",
    "UI Kit",
    "Reanimated",
    "Cross-Platform",
  ]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((item) => item !== t));
  };

  return (
    <Section title="Chip">
      <Box gap="lg">
        {/* Card 1: Multi-Select Filter Chips */}
        <DemoCard
          title="Filter Chips"
          badge="Multi-Select"
          badgeTone="primary"
          description="Interactive category toggles with dynamic checkmark indicators and tactile haptic feedback."
        >
          <Box gap="sm">
            <Box row style={{ flexWrap: "wrap", gap: 8 }}>
              {["React Native", "TypeScript", "Tailwind", "Expo", "GraphQL", "Swift"].map(
                (cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <Chip
                      key={cat}
                      label={cat}
                      selected={isSelected}
                      onSelect={() => toggleCategory(cat)}
                      tone="primary"
                      variant="soft"
                    />
                  );
                },
              )}
            </Box>
            <DemoReadout
              label="Selected Categories"
              value={selectedCategories.join(", ") || "None"}
            />
          </Box>
        </DemoCard>

        {/* Card 2: Dismissible Tags with Add Action */}
        <DemoCard
          title="Input & Tag Chips"
          badge="Dismissible"
          badgeTone="accent"
          description="Removable tags for keyword entry, query filters, and recipient lists with onClose callbacks."
        >
          <Box row style={{ flexWrap: "wrap", gap: 8 }}>
            {tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                variant="outline"
                tone="accent"
                onClose={() => removeTag(tag)}
                icon={({ color, size }) => <TagIcon color={color} size={size} />}
              />
            ))}

            {tags.length < 6 && (
              <Chip
                label="Add Tag"
                variant="filled"
                tone="secondary"
                icon={({ color, size }) => <Plus color={color} size={size} />}
                onPress={() =>
                  setTags((prev) => [
                    ...prev,
                    `Tag ${nextChipIdRef.current++}`,
                  ])
                }
              />
            )}
          </Box>
        </DemoCard>

        {/* Card 3: Variants & Sizes */}
        <DemoCard
          title="Chip Variants & Sizes"
          badge="sm • md • lg"
          badgeTone="secondary"
          description="Filled, outline, and soft tonal variants across three standardized scale sizes."
        >
          <Box gap="md">
            <Box row style={{ flexWrap: "wrap", gap: 8 }}>
              <Chip
                label="Filled Variant"
                variant="filled"
                selected
                tone="success"
                icon={({ color, size }) => <Sparkles color={color} size={size} />}
              />
              <Chip
                label="Outline Variant"
                variant="outline"
                selected
                tone="warning"
                icon={({ color, size }) => <MapPin color={color} size={size} />}
              />
              <Chip
                label="Soft Tonal Variant"
                variant="soft"
                selected
                tone="danger"
              />
            </Box>

            <Box row style={{ flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              <Chip label="Small Chip" size="sm" tone="primary" selected />
              <Chip label="Medium Chip" size="md" tone="primary" selected />
              <Chip label="Large Chip" size="lg" tone="primary" selected />
            </Box>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
