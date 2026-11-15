import {
  Badge,
  Box,
  Card,
  SearchBar,
  Text,
} from "@masumdev/rn-ui";
import { useState } from "react";
import { Section, type RnUiSectionContext } from "../shared";

export function SearchBarSection(_props?: { ctx?: RnUiSectionContext }) {
  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("Ma'sum");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleDebouncedSearch = (text: string) => {
    setIsSearching(true);
    setDebouncedQuery(text);
    setTimeout(() => {
      setIsSearching(false);
    }, 600);
  };

  return (
    <Section title="SearchBar">
      <Box gap="lg">
        {/* 1. Standard Filled SearchBar with Debouncing */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Debounced Search
              </Text>
              <Badge tone="primary">Filled Variant</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Built-in debouncing with animated clear button and cancel action.
            </Text>

            <SearchBar
              placeholder="Search components or docs..."
              value={query1}
              onChangeText={setQuery1}
              onSearchDebounced={handleDebouncedSearch}
              debounceMs={300}
              loading={isSearching}
              showCancelButton
            />

            <Box p="sm" bg="surfaceMuted" style={{ borderRadius: 6 }}>
              <Text variant="caption" color="textMuted">
                Debounced Query:{" "}
                <Text variant="caption" weight="600" color="primary">
                  {debouncedQuery || "(Waiting for input...)"}
                </Text>
              </Text>
            </Box>
          </Box>
        </Card>

        {/* 2. Outline Pill Shape */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Pill Outline Search
              </Text>
              <Badge tone="accent">Outline Pill</Badge>
            </Box>

            <SearchBar
              placeholder="Search contacts..."
              value={query2}
              onChangeText={setQuery2}
              variant="outline"
              shape="pill"
              tone="accent"
              showCancelButton
              cancelLabel="Done"
            />
          </Box>
        </Card>

        {/* 3. Soft Tint Variant */}
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Soft Tint Search
              </Text>
              <Badge tone="success">Soft Variant</Badge>
            </Box>

            <SearchBar
              placeholder="Filter transactions..."
              variant="soft"
              tone="success"
              showCancelButton={false}
            />
          </Box>
        </Card>
      </Box>
    </Section>
  );
}
