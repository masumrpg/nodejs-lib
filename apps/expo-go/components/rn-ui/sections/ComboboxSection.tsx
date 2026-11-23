import {
  Box,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Text,
} from "@masumdev/rn-ui";
import { Check, ChevronsUpDown, Search } from "lucide-react-native";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function ComboboxSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon, framework, setFramework } = ctx;

  const frameworks = [
    { value: "react-native", label: "React Native CLI" },
    { value: "expo", label: "Expo SDK 57" },
    { value: "rn-ui", label: "@masumdev/rn-ui" },
    { value: "turbo", label: "Turborepo Workspace" },
    { value: "next", label: "Next.js 15" },
    { value: "astro", label: "Astro 5 + Starlight" },
    { value: "bun", label: "Bun Fast Runtime" },
  ];

  return (
    <Section title="Combobox">
      <Box gap="lg">
        {/* Card 1: Searchable Autocomplete Picker */}
        <DemoCard
          title="Searchable Combobox"
          badge="Live Filter"
          badgeTone="primary"
          description="Floating autocomplete input with instant substring filtering, portal layering, and empty states."
        >
          <Box gap="md">
            <Box gap="xs">
              <Text variant="caption" weight="600" color="textMuted">
                Target Architecture & Framework
              </Text>
              <Combobox value={framework} onValueChange={setFramework}>
                <ComboboxInput
                  placeholder="Type to filter frameworks..."
                  searchIcon={icon(Search)}
                  chevronIcon={icon(ChevronsUpDown)}
                />
                <ComboboxContent>
                  <ComboboxList>
                    {frameworks.map((item) => (
                      <ComboboxItem
                        key={item.value}
                        value={item.value}
                        label={item.label}
                        checkIcon={icon(Check)}
                      />
                    ))}
                    <ComboboxEmpty>No matching framework found.</ComboboxEmpty>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Box>

            <DemoReadout
              label="Selected Architecture"
              value={framework || "None"}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
