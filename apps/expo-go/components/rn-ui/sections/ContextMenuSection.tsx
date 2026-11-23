import {
  Box,
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
  Text,
} from "@masumdev/rn-ui";
import { FileText } from "lucide-react-native";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function ContextMenuSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors, setAlertDialogVisible, showBookmark, setShowBookmark } = ctx;

  return (
    <Section title="ContextMenu">
      <Box gap="lg">
        <DemoCard
          title="Long-Press Action Menu"
          badge="Long-Press Trigger"
          badgeTone="primary"
          description="Long-press the card below on mobile to reveal a floating, styled context menu."
        >
          <ContextMenu>
            <ContextMenuTrigger>
              <DemoSurface
                tone="muted"
                style={{
                  paddingVertical: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderStyle: "dashed",
                  gap: 8,
                }}
              >
                <FileText color={colors.primary} size={28} />
                <Text weight="600" color="text">
                  invoice-q3-2026.pdf
                </Text>
                <Text variant="caption" color="textMuted">
                  Press and hold to view document options
                </Text>
              </DemoSurface>
            </ContextMenuTrigger>

            <ContextMenuContent>
              <ContextMenuLabel>Document Actions</ContextMenuLabel>
              <ContextMenuItem onPress={() => undefined}>
                <Text style={{ fontSize: 14 }}>Open Preview</Text>
                <ContextMenuShortcut>⌘O</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem onPress={() => undefined}>
                <Text style={{ fontSize: 14 }}>Duplicate</Text>
                <ContextMenuShortcut>⌘D</ContextMenuShortcut>
              </ContextMenuItem>

              <ContextMenuSeparator />

              <ContextMenuCheckboxItem
                checked={showBookmark}
                onCheckedChange={setShowBookmark}
              >
                Keep in Favorites
              </ContextMenuCheckboxItem>

              <ContextMenuSeparator />

              <ContextMenuItem
                variant="destructive"
                onPress={() => setAlertDialogVisible(true)}
              >
                <Text style={{ fontSize: 14, color: colors.danger }}>
                  Move to Trash
                </Text>
                <ContextMenuShortcut>⌫</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </DemoCard>
      </Box>
    </Section>
  );
}
