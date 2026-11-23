import {
  Box,
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  Text,
} from "@masumdev/rn-ui";
import {
  ChevronDown,
  Copy,
  FolderInput,
  Pencil,
  RefreshCw,
  Settings,
  Trash2,
  User,
} from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function DropdownMenuSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [lastAction, setLastAction] = useState("None");

  return (
    <Section title="DropdownMenu">
      <Box gap="lg">
        {/* Card 1: Document Context Menu */}
        <DemoCard
          title="Document Actions Menu"
          badge="Shortcuts & Checkboxes"
          badgeTone="primary"
          description="Contextual floating menu with shortcuts, icons, dividers, checkbox items, and destructive actions."
        >
          <Box gap="md">
            <Box row gap="sm" style={{ alignItems: "center" }}>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="filled"
                    tone="primary"
                    rightIcon={icon(ChevronDown)}
                  >
                    Document Actions
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent width={230} align="start">
                  <DropdownMenuLabel>File Actions</DropdownMenuLabel>

                  <DropdownMenuItem
                    leftIcon={icon(Copy)}
                    onPress={() => setLastAction("Duplicated document")}
                  >
                    <Text variant="bodySmall">Duplicate</Text>
                    <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    leftIcon={icon(Pencil)}
                    onPress={() => setLastAction("Renamed document")}
                  >
                    <Text variant="bodySmall">Rename</Text>
                    <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    leftIcon={icon(FolderInput)}
                    onPress={() => setLastAction("Moved to folder")}
                  >
                    <Text variant="bodySmall">Move to...</Text>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel>Editor Preferences</DropdownMenuLabel>

                  <DropdownMenuCheckboxItem
                    checked={showLineNumbers}
                    onCheckedChange={setShowLineNumbers}
                  >
                    Line Numbers
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuCheckboxItem
                    checked={autoSave}
                    onCheckedChange={setAutoSave}
                  >
                    Auto-Save Cloud
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    variant="destructive"
                    leftIcon={icon(Trash2)}
                    onPress={() => setLastAction("Deleted document")}
                  >
                    <Text variant="bodySmall">Delete File</Text>
                    <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button
                    variant="outline"
                    tone="secondary"
                    rightIcon={icon(ChevronDown)}
                  >
                    Account
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent width={200} align="end">
                  <DropdownMenuLabel>Ma'sum (@masumdev)</DropdownMenuLabel>
                  <DropdownMenuItem
                    leftIcon={icon(User)}
                    onPress={() => setLastAction("Opened Profile")}
                  >
                    <Text variant="bodySmall">Profile</Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    leftIcon={icon(Settings)}
                    onPress={() => setLastAction("Opened Settings")}
                  >
                    <Text variant="bodySmall">Settings</Text>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    leftIcon={icon(RefreshCw)}
                    onPress={() => setLastAction("Refreshed Session")}
                  >
                    <Text variant="bodySmall">Refresh Token</Text>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Box>

            <DemoReadout
              label="Last Action Selected"
              value={lastAction}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
