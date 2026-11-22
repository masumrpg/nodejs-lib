import {
  Badge,
  Box,
  Card,
  Chip,
  Text,
} from "@masumdev/rn-ui";
import { Sparkles, MapPin, Tag as TagIcon, Plus } from "lucide-react-native";
import { useRef, useState } from "react";
import { Section, type RnUiSectionContext } from "../shared";

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
        {/* 1. Filter Chips (Multi-Selectable) */}
        <Card outlined>
          <Box gap="md">
            <Box
              row
              wrap
              gap="sm"
              style={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Text weight="700" color="text" style={{ flexShrink: 1 }}>
                Selectable Filter Chips
              </Text>
              <Badge tone="primary">Filter Mode</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Interactive toggles with checkmark indicator and haptics.
            </Text>

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
          </Box>
        </Card>

        {/* 2. Removable Input Chips */}
        <Card outlined>
          <Box gap="md">
            <Box
              row
              wrap
              gap="sm"
              style={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Text weight="700" color="text" style={{ flexShrink: 1 }}>
                Removable Input Chips
              </Text>
              <Badge tone="accent">onClose Handler</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Dismissible chip items for forms, keyword selectors, and filters.
            </Text>

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
                  label="Add Chip"
                  variant="filled"
                  tone="secondary"
                  icon={({ color, size }) => <Plus color={color} size={size} />}
                  onPress={() =>
                    setTags((prev) => [
                      ...prev,
                      `New Chip ${nextChipIdRef.current++}`,
                    ])
                  }
                />
              )}
            </Box>
          </Box>
        </Card>

        {/* 3. Variants & Sizes */}
        <Card outlined>
          <Box gap="md">
            <Text weight="700" color="text">
              Variants (Filled, Outline, Soft)
            </Text>

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
        </Card>
      </Box>
    </Section>
  );
}
