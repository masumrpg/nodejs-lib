import { Box, Button, SignaturePad, type SignaturePadRef } from "@masumdev/rn-ui";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react-native";
import { useRef, useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function SignaturePadSection(_props?: { ctx?: RnUiSectionContext }) {
  const padRef = useRef<SignaturePadRef>(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const handleClear = () => {
    padRef.current?.clear();
    setStrokeCount(0);
    setIsSaved(false);
  };

  const handleUndo = () => {
    padRef.current?.undo();
    setIsSaved(false);
  };

  const handleSave = () => {
    if (padRef.current?.isEmpty()) return;
    setIsSaved(true);
  };

  return (
    <Section title="SignaturePad">
      <Box gap="lg">
        {/* Card 1: Digital Signature Authorization Canvas */}
        <DemoCard
          title="Digital Signature Canvas"
          badge="Bezier Curves"
          badgeTone="primary"
          description="High-performance vector touch drawing with undo, clear, guideline baseline, and SVG export."
        >
          <Box gap="md">
            <SignaturePad
              ref={padRef}
              height={220}
              strokeWidth={3.5}
              guideLineText="Sign Above This Line"
              onChange={(paths) => {
                setStrokeCount(paths.length);
                setIsSaved(false);
              }}
            />

            <Box
              row
              wrap
              gap="sm"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Box row gap="xs">
                <Button
                  variant="outline"
                  tone="secondary"
                  size="sm"
                  leftIcon={({ color, size }) => <RotateCcw color={color} size={size} />}
                  onPress={handleUndo}
                  disabled={strokeCount === 0}
                >
                  Undo
                </Button>
                <Button
                  variant="outline"
                  tone="danger"
                  size="sm"
                  leftIcon={({ color, size }) => <Trash2 color={color} size={size} />}
                  onPress={handleClear}
                  disabled={strokeCount === 0}
                >
                  Clear
                </Button>
              </Box>

              <Button
                variant={isSaved ? "soft" : "filled"}
                tone="primary"
                size="sm"
                leftIcon={({ color, size }) => <CheckCircle2 color={color} size={size} />}
                onPress={handleSave}
                disabled={strokeCount === 0}
              >
                {isSaved ? "Saved" : "Save Signature"}
              </Button>
            </Box>

            <DemoReadout
              label="Signature Canvas Status"
              value={
                isSaved
                  ? `Saved (${strokeCount} strokes)`
                  : strokeCount > 0
                    ? `Drawing (${strokeCount} strokes)`
                    : "Empty Canvas"
              }
              tone={isSaved ? "success" : strokeCount > 0 ? "primary" : "muted"}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
