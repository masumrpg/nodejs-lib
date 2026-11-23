import {
  Box,
  Button,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Text,
} from "@masumdev/rn-ui";
import { Check, Filter, Share2, X } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function PopoverSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [open, setOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState("all");

  return (
    <Section title="Popover">
      <Box gap="lg">
        {/* Card 1: Anchored Contextual Popover */}
        <DemoCard
          title="Anchored Quick Actions"
          badge="Portal Floating"
          badgeTone="primary"
          description="Contextual popover card anchored to trigger node with continuous squircle corners and backdrop dismiss."
        >
          <Box gap="md">
            <Box row gap="sm" style={{ alignItems: "center" }}>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger>
                  <Button
                    variant="filled"
                    tone="primary"
                    leftIcon={icon(Filter)}
                  >
                    Quick Filter
                  </Button>
                </PopoverTrigger>

                <PopoverContent width={310}>
                  <Box gap="sm">
                    <Box
                      row
                      style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text variant="subtitle" weight="700">
                        Filter Components
                      </Text>
                      <IconButton
                        variant="ghost"
                        tone="secondary"
                        size="xs"
                        accessibilityLabel="Close popover"
                        icon={icon(X)}
                        onPress={() => setOpen(false)}
                      />
                    </Box>

                    <Text variant="caption" color="textMuted">
                      Select component category to highlight in the catalog.
                    </Text>

                    <Box row style={{ flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                      {[
                        { id: "all", label: "All Items" },
                        { id: "inputs", label: "Form Inputs" },
                        { id: "layout", label: "Layout" },
                        { id: "overlays", label: "Overlays" },
                      ].map((item) => (
                        <Button
                          key={item.id}
                          variant={selectedTag === item.id ? "filled" : "outline"}
                          tone="primary"
                          size="xs"
                          leftIcon={selectedTag === item.id ? icon(Check) : undefined}
                          onPress={() => {
                            setSelectedTag(item.id);
                            setOpen(false);
                          }}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                tone="secondary"
                leftIcon={icon(Share2)}
                onPress={() => undefined}
              >
                Share
              </Button>
            </Box>

            <DemoReadout
              label="Active Filter Selection"
              value={selectedTag.toUpperCase()}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
