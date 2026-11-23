import { Box, IconButton } from "@masumdev/rn-ui";
import { Heart, MoreVertical, Pause, Play, Plus, RotateCcw, Settings, Share2, Shuffle } from "lucide-react-native";
import { useState } from "react";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function IconButtonsSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(true);

  return (
    <Section title="IconButton">
      <Box gap="lg">
        {/* 1. Variants & Notification Badges */}
        <DemoCard
          title="Variants & Notification Badges"
          badge="filled • soft • outline • ghost"
          badgeTone="primary"
          description="Square or rounded icon action buttons with count badges and tone support."
        >
          <Box row gap="md" center style={{ flexWrap: "wrap" }}>
            <IconButton
              icon={icon(Plus)}
              variant="filled"
              tone="primary"
              accessibilityLabel="Add new item"
            />
            <IconButton
              icon={icon(Settings)}
              variant="outline"
              tone="secondary"
              accessibilityLabel="Open settings"
            />
            <IconButton
              icon={icon(Heart)}
              variant="soft"
              tone="accent"
              accessibilityLabel="Like item"
            />
            <IconButton
              icon={icon(Share2)}
              variant="ghost"
              tone="secondary"
              accessibilityLabel="Share document"
            />
            <IconButton
              icon={icon(Heart)}
              variant="soft"
              tone="danger"
              badge={12}
              accessibilityLabel="12 Likes"
            />
          </Box>
        </DemoCard>

        {/* 2. Shapes & Size Hierarchy */}
        <DemoCard
          title="Shapes & Sizes"
          badge="xs (26px) to xl (48px)"
          badgeTone="secondary"
          description="Calibrated touch targets with circle, rounded, and square shapes."
        >
          <Box row gap="md" center style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
            <IconButton
              size="xs"
              shape="rounded"
              icon={icon(Plus)}
              variant="outline"
              accessibilityLabel="XS size"
            />
            <IconButton
              size="sm"
              shape="rounded"
              icon={icon(Plus)}
              variant="outline"
              accessibilityLabel="SM size"
            />
            <IconButton
              size="md"
              shape="rounded"
              icon={icon(Plus)}
              variant="outline"
              accessibilityLabel="MD size"
            />
            <IconButton
              size="lg"
              shape="pill"
              icon={icon(Plus)}
              variant="filled"
              tone="primary"
              accessibilityLabel="LG circle size"
            />
            <IconButton
              size="xl"
              shape="square"
              icon={icon(Plus)}
              variant="soft"
              tone="accent"
              accessibilityLabel="XL square size"
            />
          </Box>
        </DemoCard>

        {/* 3. Composed Audio Player Toolbar */}
        <DemoCard
          title="Media Player Toolbar"
          badge="Composed Toolbar"
          badgeTone="accent"
          description="Icon buttons combined in an audio player playback controller."
        >
          <DemoSurface
            tone="raised"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-around",
              paddingVertical: 12,
            }}
          >
            <IconButton
              icon={icon(Shuffle)}
              variant="ghost"
              tone="secondary"
              size="sm"
              accessibilityLabel="Shuffle"
            />
            <IconButton
              icon={icon(RotateCcw)}
              variant="outline"
              tone="secondary"
              size="md"
              accessibilityLabel="Rewind"
            />
            <IconButton
              icon={icon(isPlaying ? Pause : Play)}
              variant="filled"
              tone="primary"
              size="lg"
              shape="pill"
              onPress={() => setIsPlaying(!isPlaying)}
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
            />
            <IconButton
              icon={icon(Heart)}
              variant={isLiked ? "soft" : "ghost"}
              tone={isLiked ? "danger" : "secondary"}
              size="md"
              onPress={() => setIsLiked(!isLiked)}
              accessibilityLabel="Favorite"
            />
            <IconButton
              icon={icon(MoreVertical)}
              variant="ghost"
              tone="secondary"
              size="sm"
              accessibilityLabel="More options"
            />
          </DemoSurface>
        </DemoCard>
      </Box>
    </Section>
  );
}
