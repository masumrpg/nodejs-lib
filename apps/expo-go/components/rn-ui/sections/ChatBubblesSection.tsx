import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Box,
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
  Text,
} from "@masumdev/rn-ui";
import {
  DemoCard,
  SAMPLE_ASSETS,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function ChatBubblesSection({ ctx: _ctx }: { ctx: RnUiSectionContext }) {
  return (
    <Section title="Chat Bubbles">
      <Box gap="lg">
        <DemoCard
          title="Conversation Thread"
          badge="start • end • reactions"
          badgeTone="primary"
          description="WhatsApp-style message bubbles supporting start/end alignment, tone fills, and reaction tags."
        >
          <BubbleGroup>
            {/* Short incoming & outgoing WhatsApp-style bubbles */}
            <Box
              row
              gap="sm"
              style={{ alignSelf: "flex-start", alignItems: "flex-end" }}
            >
              <Avatar size="sm">
                <AvatarImage source={{ uri: SAMPLE_ASSETS.avatarUrl }} />
                <AvatarFallback>{SAMPLE_ASSETS.avatarInitials}</AvatarFallback>
              </Avatar>
              <Bubble align="start" tone="secondary" variant="soft">
                <BubbleContent>Hai!</BubbleContent>
              </Bubble>
            </Box>

            <Bubble align="end" tone="primary" variant="filled">
              <BubbleContent>Siap, halo!</BubbleContent>
            </Bubble>

            {/* Incoming message */}
            <Box
              row
              gap="sm"
              style={{ alignSelf: "flex-start", alignItems: "flex-end" }}
            >
              <Avatar size="sm">
                <AvatarImage source={{ uri: SAMPLE_ASSETS.avatarUrl }} />
                <AvatarFallback>{SAMPLE_ASSETS.avatarInitials}</AvatarFallback>
              </Avatar>
              <Bubble align="start" tone="secondary" variant="soft">
                <BubbleContent>
                  Hai! Apakah varian flush di Tabs dan SegmentedControl sudah siap digunakan?
                </BubbleContent>
              </Bubble>
            </Box>

            {/* Outgoing message */}
            <Bubble align="end" tone="primary" variant="filled">
              <BubbleContent>
                Sudah siap! Varian flush mengusung kapsul solid mepet container dengan animasi Reanimated 60fps tanpa spring bounce.
              </BubbleContent>
              <BubbleReactions side="bottom" align="end">
                <Text style={{ fontSize: 11 }}>+2</Text>
              </BubbleReactions>
            </Bubble>

            {/* Outgoing follow-up */}
            <Bubble align="end" tone="primary" variant="soft">
              <BubbleContent>
                Semua rounded juga sudah terintegrasi ke tema minimal borderless!
              </BubbleContent>
              <BubbleReactions side="bottom" align="end">
                <Text style={{ fontSize: 11 }}>+1</Text>
              </BubbleReactions>
            </Bubble>

            {/* Incoming message */}
            <Box
              row
              gap="sm"
              style={{
                alignSelf: "flex-start",
                alignItems: "flex-end",
                marginTop: 8,
              }}
            >
              <Avatar size="sm">
                <AvatarImage source={{ uri: SAMPLE_ASSETS.avatarUrl }} />
                <AvatarFallback>{SAMPLE_ASSETS.avatarInitials}</AvatarFallback>
              </Avatar>
              <Bubble align="start" tone="success" variant="soft">
                <BubbleContent>
                  Mantap banget, langsung terasa bedanya saat ganti preset tema!
                </BubbleContent>
              </Bubble>
            </Box>
          </BubbleGroup>
        </DemoCard>
      </Box>
    </Section>
  );
}
