import { Badge, Box, Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@masumdev/rn-ui";
import { ChevronRight, HardDrive, Lock, LogOut, User } from "lucide-react-native";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

export function ItemSection({ ctx }: { ctx: RnUiSectionContext }) {
  const { colors } = ctx;

  return (
    <Section title="Item">
      <Box gap="lg">
        {/* 1. Account Settings Group */}
        <DemoCard
          title="Account Settings List"
          badge="ItemGroup • Rows"
          badgeTone="primary"
          description="Reusable list item row with left media slot, title/description content, and right actions."
        >
          <ItemGroup>
            <Item>
              <ItemMedia variant="icon">
                <User color={colors.primary} size={20} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Account Profile</ItemTitle>
                <ItemDescription>
                  Ma'sum (masum@example.com) • Administrator
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight color={colors.textMuted} size={18} />
              </ItemActions>
            </Item>

            <ItemSeparator />

            <Item>
              <ItemMedia variant="icon">
                <Lock color={colors.success} size={20} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Security & Password</ItemTitle>
                <ItemDescription>
                  Hardware 2FA active • Password changed 12d ago
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge tone="success" variant="soft" size="xs">
                  SECURE
                </Badge>
                <ChevronRight color={colors.textMuted} size={18} />
              </ItemActions>
            </Item>

            <ItemSeparator />

            <Item>
              <ItemMedia variant="icon">
                <HardDrive color={colors.accent} size={20} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Cloud Workspace Storage</ItemTitle>
                <ItemDescription>
                  Using 42.8 GB of 100 GB (42%)
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <ChevronRight color={colors.textMuted} size={18} />
              </ItemActions>
            </Item>
          </ItemGroup>
        </DemoCard>

        {/* 2. Destructive Session Action Row */}
        <DemoCard
          title="Action Item Variant"
          badge='variant="muted"'
          badgeTone="danger"
          description="Specialized list row with contextual danger actions."
        >
          <Item variant="muted">
            <ItemMedia variant="icon">
              <LogOut color={colors.danger} size={20} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle style={{ color: colors.danger }}>
                Sign Out from All Devices
              </ItemTitle>
              <ItemDescription>
                Revokes active session tokens across mobile and web clients.
              </ItemDescription>
            </ItemContent>
          </Item>
        </DemoCard>
      </Box>
    </Section>
  );
}
