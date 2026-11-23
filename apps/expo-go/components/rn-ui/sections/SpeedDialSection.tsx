import { Box, SpeedDial, Text, useTheme } from "@masumdev/rn-ui";
import { FileText, Plus, QrCode, Share2, Upload } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function SpeedDialSection(_props?: { ctx?: RnUiSectionContext }) {
  const { colors, components, radii } = useTheme();
  const [lastAction, setLastAction] = useState<string>("None");
  const [dialOpen, setDialOpen] = useState(false);

  return (
    <Section title="SpeedDial">
      <Box gap="lg">
        {/* Card 1: Expanding FAB Menu */}
        <DemoCard
          title="SpeedDial FAB Menu"
          badge="Staggered Physics"
          badgeTone="primary"
          description="Expanding floating action menu with staggered spring timing, rotating plus icon, and haptic clicks."
        >
          <Box gap="md">
            <DemoReadout label="Last Triggered Action" value={lastAction} />

            {/* Embedded interactive preview container */}
            <View
              style={{
                height: 340,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.lg,
                borderCurve: "continuous",
                position: "relative",
                overflow: "hidden",
                borderWidth: components.borderWidth.default,
                borderColor:
                  components.borderWidth.default > 0
                    ? colors.borderMuted
                    : "transparent",
              }}
            >
              <Box p="md">
                <Text color="textMuted" variant="caption">
                  Touch canvas container with anchored SpeedDial
                </Text>
              </Box>

              <SpeedDial
                open={dialOpen}
                onOpenChange={setDialOpen}
                tone="primary"
                offset={16}
                overlay={false}
                icon={({ color, size }) => <Plus color={color} size={size} />}
                actions={[
                  {
                    id: "doc",
                    label: "Create Document",
                    icon: ({ color, size }) => <FileText color={color} size={size} />,
                    onPress: () => setLastAction("Create Document"),
                  },
                  {
                    id: "qr",
                    label: "Scan QR Code",
                    icon: ({ color, size }) => <QrCode color={color} size={size} />,
                    tone: "accent",
                    onPress: () => setLastAction("Scan QR Code"),
                  },
                  {
                    id: "upload",
                    label: "Upload File",
                    icon: ({ color, size }) => <Upload color={color} size={size} />,
                    tone: "success",
                    onPress: () => setLastAction("Upload File"),
                  },
                  {
                    id: "share",
                    label: "Share Monorepo",
                    icon: ({ color, size }) => <Share2 color={color} size={size} />,
                    tone: "secondary",
                    onPress: () => setLastAction("Share Monorepo"),
                  },
                ]}
              />
            </View>
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
