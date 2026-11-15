import {
  Badge,
  Box,
  Card,
  SpeedDial,
  Text,
} from "@masumdev/rn-ui";
import { Plus, FileText, QrCode, Upload, Share } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Section, type RnUiSectionContext } from "../shared";

export function SpeedDialSection(_props?: { ctx?: RnUiSectionContext }) {
  const [lastAction, setLastAction] = useState<string>("None");
  const [dialOpen, setDialOpen] = useState(false);

  return (
    <Section title="SpeedDial">
      <Box gap="lg">
        <Card outlined>
          <Box gap="md">
            <Box row center style={{ justifyContent: "space-between" }}>
              <Text weight="700" color="text">
                Expanding FAB Menu
              </Text>
              <Badge tone="primary">Spring Stagger</Badge>
            </Box>
            <Text color="textMuted" variant="bodySmall">
              Tap the floating action button to reveal secondary action pills with staggered spring animation.
            </Text>

            <Box p="md" bg="surfaceMuted" style={{ borderRadius: 8 }}>
              <Text variant="caption" color="textMuted">
                Last Triggered Action:{" "}
                <Text variant="caption" weight="600" color="primary">
                  {lastAction}
                </Text>
              </Text>
            </Box>

            {/* Embedded interactive preview container */}
            <View
              style={{
                height: 240,
                backgroundColor: "rgba(0,0,0,0.03)",
                borderRadius: 12,
                position: "relative",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.06)",
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
                    icon: ({ color, size }) => <Share color={color} size={size} />,
                    tone: "secondary",
                    onPress: () => setLastAction("Share Monorepo"),
                  },
                ]}
              />
            </View>
          </Box>
        </Card>
      </Box>
    </Section>
  );
}
