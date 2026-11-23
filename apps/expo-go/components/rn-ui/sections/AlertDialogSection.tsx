import { AlertDialog, Box, Button } from "@masumdev/rn-ui";
import { LogOut, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, DemoReadout, Section, type RnUiSectionContext } from "../shared";

export function AlertDialogSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { icon } = ctx;
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [lastAction, setLastAction] = useState("None");

  return (
    <Section title="AlertDialog">
      <Box gap="lg">
        {/* Card 1: Modal Confirmation Dialogs */}
        <DemoCard
          title="Confirmation Dialogs"
          badge="Destructive & Neutral"
          badgeTone="danger"
          description="Blocking modal confirmation dialogs with tone badges, backdrop blur, and haptic feedback."
        >
          <Box gap="md">
            <Box row gap="sm" style={{ flexWrap: "wrap" }}>
              <Button
                variant="filled"
                tone="danger"
                leftIcon={icon(Trash2)}
                onPress={() => setDeleteVisible(true)}
              >
                Delete Workspace
              </Button>

              <Button
                variant="outline"
                tone="secondary"
                leftIcon={icon(LogOut)}
                onPress={() => setLogoutVisible(true)}
              >
                Sign Out
              </Button>
            </Box>

            <DemoReadout label="Last Dialog Action" value={lastAction} />

            {/* 1. Destructive Delete Workspace Dialog */}
            <AlertDialog
              visible={deleteVisible}
              onClose={() => setDeleteVisible(false)}
              tone="danger"
              title="Delete Entire Workspace?"
              description="This action cannot be undone. All repository packages, build caches, and deployed artifacts will be permanently destroyed."
              confirmText="Permanently Delete"
              cancelText="Keep Workspace"
              onConfirm={() => {
                setDeleteVisible(false);
                setLastAction("Confirmed permanent deletion");
              }}
              onCancel={() => {
                setDeleteVisible(false);
                setLastAction("Cancelled deletion");
              }}
            />

            {/* 2. Sign Out Confirmation Dialog */}
            <AlertDialog
              visible={logoutVisible}
              onClose={() => setLogoutVisible(false)}
              tone="warning"
              title="Sign Out of Session?"
              description="Are you sure you want to end your active developer session? Unsaved staging files will be preserved locally."
              confirmText="Sign Out"
              cancelText="Stay Signed In"
              onConfirm={() => {
                setLogoutVisible(false);
                setLastAction("Signed out of session");
              }}
              onCancel={() => {
                setLogoutVisible(false);
                setLastAction("Cancelled sign out");
              }}
            />
          </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
