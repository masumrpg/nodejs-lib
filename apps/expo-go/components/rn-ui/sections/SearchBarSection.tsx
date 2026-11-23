import { Box, SearchBar } from "@masumdev/rn-ui";
import { useState } from "react";
import {
  DemoCard,
  DemoReadout,
  Section,
  type RnUiSectionContext,
} from "../shared";

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
        <DemoCard
          title="Debounced Live Search"
          badge="Filled Variant"
          badgeTone="primary"
          description="Built-in debouncing with animated clear button, loading spinner, and cancel transition."
        >
          <SearchBar
            placeholder="Search components or docs..."
            value={query1}
            onChangeText={setQuery1}
            onSearchDebounced={handleDebouncedSearch}
            debounceMs={300}
            loading={isSearching}
            showCancelButton
          />

          <DemoReadout
            label="Debounced Search Query"
            value={debouncedQuery || "(Waiting for input...)"}
          />
        </DemoCard>

        {/* 2. Outline Pill Shape */}
        <DemoCard
          title="Pill Shape Outline Search"
          badge="Outline Pill"
          badgeTone="accent"
          description="Pill curvature with accent tone highlights and custom cancel action label."
        >
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

          <DemoReadout label="Active Filter" value={query2} />
        </DemoCard>

        {/* 3. Soft Tint Variant */}
        <DemoCard
          title="Soft Tint Filter Bar"
          badge="Soft Variant"
          badgeTone="success"
          description="Subtle tinted background for embedded transaction or table filtering."
        >
          <SearchBar
            placeholder="Filter transactions..."
            variant="soft"
            tone="success"
            showCancelButton={false}
          />
        </DemoCard>
      </Box>
    </Section>
  );
}
