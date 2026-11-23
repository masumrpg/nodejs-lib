import { Box, Button, FloatingActionButton } from "@masumdev/rn-ui";
import { Edit3, Plus, Trash2 } from "lucide-react-native";
import * as React from "react";
import {
  DemoCard,
  DemoSurface,
  Section,
  type RnUiSectionContext,
} from "../shared";

export function FloatingActionButtonSection({
  ctx,
}: {
  ctx: RnUiSectionContext;
}) {
  const { icon } = ctx;
  const [visible, setVisible] = React.useState(true);
  const [extended, setExtended] = React.useState(true);

  return (
    <Section title="FloatingActionButton">
      <Box gap="lg">
        <DemoCard
          title="Floating Action Controls"
          badge="extended • placement"
          badgeTone="primary"
          description="Floating action button with animated label expansion and smooth enter/exit scaling."
        >
          <Box gap="md">
            <Box row gap="sm">
              <Button
                size="sm"
                variant={visible ? "filled" : "outline"}
                tone="primary"
                onPress={() => setVisible((value) => !value)}
              >
                {visible ? "Hide FAB" : "Show FAB"}
              </Button>
              <Button
                size="sm"
                variant={extended ? "filled" : "outline"}
                tone="secondary"
                onPress={() => setExtended((value) => !value)}
              >
                {extended ? "Collapse Label" : "Extend Label"}
              </Button>
            </Box>

            <DemoSurface
              tone="muted"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-around",
                paddingVertical: 20,
              }}
            >
              <FloatingActionButton
                placement="none"
                visible={visible}
                icon={icon(Plus)}
                label="Create Project"
                extended={extended}
              />
              <FloatingActionButton
                placement="none"
                visible={visible}
                icon={icon(Edit3)}
                tone="accent"
                variant="soft"
              />
              <FloatingActionButton
                placement="none"
                visible={visible}
                icon={icon(Trash2)}
                tone="danger"
                variant="outline"
              />
            </DemoSurface>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
