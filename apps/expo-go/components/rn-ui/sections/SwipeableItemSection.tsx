import { Badge, Box, Button, SwipeableItem, Text, useTheme } from "@masumdev/rn-ui";
import { Archive, Trash2, Pin, Mail, Share2, CheckCircle2, RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { DemoCard, Section, type RnUiSectionContext } from "../shared";

interface EmailItem {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
}

interface SimpleTask {
  id: string;
  title: string;
  done: boolean;
}

const INITIAL_EMAILS: EmailItem[] = [
  {
    id: "1",
    sender: "Apple Design Awards",
    subject: "Your nomination is confirmed",
    preview: "Congratulations! We have received your submission for the 2026 awards.",
    time: "10:42 AM",
    unread: true,
  },
  {
    id: "2",
    sender: "GitHub Team",
    subject: "Security alert: 1 dependency updated",
    preview: "We noticed new security updates available for react-native-library repository.",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "3",
    sender: "Stripe Notification",
    subject: "Payment received: $450.00 USD",
    preview: "A payout of $450.00 USD has been initiated to your bank account ending in 4242.",
    time: "Aug 22",
    unread: false,
  },
];

const INITIAL_TASKS: SimpleTask[] = [
  { id: "t1", title: "Review pull request #14 for DatePicker", done: false },
  { id: "t2", title: "Prepare npm release v1.4.0 notes", done: false },
  { id: "t3", title: "Update design tokens for dark theme", done: false },
  { id: "t4", title: "Run end-to-end Expo tests on Android", done: true },
];

export function SwipeableItemSection({ ctx }: { ctx?: RnUiSectionContext }) {
  const { colors, components, radii, spacing, isDark } = useTheme();
  const [emails, setEmails] = useState<EmailItem[]>(INITIAL_EMAILS);
  const [tasks, setTasks] = useState<SimpleTask[]>(INITIAL_TASKS);
  const [message, setMessage] = useState<string>("");

  const isBorderless = components.borderWidth.default === 0;
  const rowSurface = isBorderless
    ? isDark
      ? colors.surfaceRaised
      : colors.surfaceMuted
    : colors.surface;

  const deleteEmail = (id: string) => {
    setEmails((prev) => prev.filter((item) => item.id !== id));
    setMessage(`Deleted mail #${id}`);
  };

  const archiveEmail = (id: string) => {
    setEmails((prev) => prev.filter((item) => item.id !== id));
    setMessage(`Archived mail #${id}`);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setMessage(`Removed task #${id}`);
  };

  const completeTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
    setMessage(`Updated task #${id}`);
  };

  return (
    <Section title="Swipeable Item & Row">
      <Box gap="lg">
        {/* 1. Multi-line Rich Mail Card */}
        <DemoCard
          title="Rich Mail Swipe Actions"
          badge="Swipe Left & Right"
          badgeTone="primary"
          description="Momentum-driven swipe reveal actions with smooth collapse delete animation."
        >

            {message ? (
              <Box
                style={{
                  padding: spacing.sm,
                  borderRadius: radii.sm,
                  backgroundColor: colors.primarySoft,
                }}
              >
                <Text variant="labelSmall" color="primary" weight="600">
                  {message}
                </Text>
              </Box>
            ) : null}

            {/* Swipeable Items List (uses itemGap so spacing collapses cleanly) */}
            <Box style={{ marginTop: 4 }}>
              {emails.map((item, idx) => (
                <SwipeableItem
                  key={item.id}
                  itemGap={idx < emails.length - 1 ? spacing.sm : 0}
                  style={{
                    padding: 14,
                    backgroundColor: rowSurface,
                  }}
                  leftActions={[
                    {
                      label: "Pin",
                      icon: ({ color, size }) => <Pin color={color} size={size} />,
                      tone: "primary",
                      onPress: () => setMessage(`Pinned ${item.sender}`),
                    },
                    {
                      label: "Share",
                      icon: ({ color, size }) => <Share2 color={color} size={size} />,
                      tone: "accent",
                      onPress: () => setMessage(`Shared ${item.sender}`),
                    },
                  ]}
                  rightActions={[
                    {
                      label: "Archive",
                      icon: ({ color, size }) => <Archive color={color} size={size} />,
                      tone: "secondary",
                      isDestructive: true,
                      onPress: () => archiveEmail(item.id),
                    },
                    {
                      label: "Delete",
                      icon: ({ color, size }) => <Trash2 color={color} size={size} />,
                      tone: "danger",
                      isDestructive: true,
                      onPress: () => deleteEmail(item.id),
                    },
                  ]}
                  onFullSwipeLeft={() => deleteEmail(item.id)}
                >
                  <Box gap="xs">
                    <Box
                      row
                      gap="sm"
                      style={{ alignItems: "center", justifyContent: "space-between" }}
                    >
                      <Box row center gap="xs" style={{ flex: 1, justifyContent: "flex-start" }}>
                        {item.unread && (
                          <Box
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: radii.full,
                              backgroundColor: colors.primary,
                            }}
                          />
                        )}
                        <Text weight="700" color="text" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {item.sender}
                        </Text>
                      </Box>
                      <Text variant="caption" color="textMuted" style={{ flexShrink: 0 }}>
                        {item.time}
                      </Text>
                    </Box>
                    <Text weight="600" color="text" style={{ fontSize: 13 }} numberOfLines={1}>
                      {item.subject}
                    </Text>
                    <Text variant="bodySmall" color="textMuted" numberOfLines={2}>
                      {item.preview}
                    </Text>
                  </Box>
                </SwipeableItem>
              ))}

              {emails.length === 0 && (
                <Box center style={{ padding: 18, gap: spacing.sm }}>
                  <Mail size={28} color={colors.textSubtle} />
                  <Text color="textMuted" variant="bodySmall">
                    All mailbox messages deleted!
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    tone="primary"
                    leftIcon={ctx ? ctx.icon(RotateCcw) : ({ color, size }) => <RotateCcw color={color} size={size} />}
                    onPress={() => setEmails(INITIAL_EMAILS)}
                  >
                    Reset Messages
                  </Button>
                </Box>
              )}
            </Box>
        </DemoCard>

        {/* 2. Single-Line Task List */}
        <DemoCard
          title="Single-Line Task Items"
          badge="Compact Row"
          badgeTone="accent"
          description="Swipe right to mark complete, swipe left to delete simple 1-line tasks."
        >

            <Box style={{ marginTop: 4 }}>
              {tasks.map((task, idx) => (
                <SwipeableItem
                  key={task.id}
                  actionWidth={68}
                  itemGap={idx < tasks.length - 1 ? spacing.xs : 0}
                  containerStyle={{ borderRadius: radii.md }}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: rowSurface,
                  }}
                  leftActions={[
                    {
                      label: task.done ? "Undo" : "Done",
                      icon: ({ color, size }) => <CheckCircle2 color={color} size={size} />,
                      tone: "success",
                      onPress: () => completeTask(task.id),
                    },
                  ]}
                  rightActions={[
                    {
                      label: "Delete",
                      icon: ({ color, size }) => <Trash2 color={color} size={size} />,
                      tone: "danger",
                      onPress: () => deleteTask(task.id),
                    },
                  ]}
                  onFullSwipeLeft={() => deleteTask(task.id)}
                >
                  <Box
                    row
                    gap="sm"
                    style={{ alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: "500",
                        textDecorationLine: task.done ? "line-through" : "none",
                        opacity: task.done ? 0.5 : 1,
                      }}
                      color="text"
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>
                    {task.done && (
                      <Badge size="sm" tone="success">
                        Done
                      </Badge>
                    )}
                  </Box>
                </SwipeableItem>
              ))}

              {tasks.length === 0 && (
                <Box center style={{ padding: 18, gap: spacing.sm }}>
                  <Text color="textMuted" variant="bodySmall">
                    All tasks completed and cleared!
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    tone="primary"
                    leftIcon={ctx ? ctx.icon(RotateCcw) : ({ color, size }) => <RotateCcw color={color} size={size} />}
                    onPress={() => setTasks(INITIAL_TASKS)}
                  >
                    Reset Tasks
                  </Button>
                </Box>
              )}
            </Box>
        </DemoCard>
      </Box>
    </Section>
  );
}
