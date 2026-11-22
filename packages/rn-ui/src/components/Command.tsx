import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../theme";
import { useDelayedUnmount, withAlpha } from "../utils";
import { triggerHaptic } from "../utils/haptics";
import { Badge } from "./Badge";
import { Input } from "./Input";
import { Text } from "./Text";
import {
  ANIMATION_TIMING,
  minTouchHitSlop,
  renderIcon,
  type BaseAnimatedProps,
  type BaseGlassProps,
  type BaseHapticProps,
  type RenderIcon,
} from "./types";

export interface CommandItem {
  value: string;
  label: string;
  description?: string;
  group?: string;
  shortcut?: string;
  badge?: string;
  icon?: RenderIcon;
  disabled?: boolean;
}

export interface CommandProps
  extends BaseGlassProps,
    BaseHapticProps,
    BaseAnimatedProps {
  visible: boolean;
  items: CommandItem[];
  title?: string;
  placeholder?: string;
  emptyText?: string;
  onClose: () => void;
  onSelect?: (value: string, item: CommandItem) => void;
  style?: StyleProp<ViewStyle>;
}

type FlattenedCommandRow =
  | { type: "header"; key: string; title: string }
  | { type: "item"; key: string; item: CommandItem };

const CLOSE_BUTTON_SIZE = 34;

export const Command = React.memo(function Command({
  visible,
  items,
  title = "Command Palette",
  placeholder = "Type a command or search...",
  emptyText = "No matching commands found",
  glass = false,
  haptic = true,
  animated = true,
  onClose,
  onSelect,
  style,
}: CommandProps) {
  const { colors, components, radii, shadows, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;
  const shouldMount = useDelayedUnmount(
    visible,
    shouldAnimate ? ANIMATION_TIMING.transition : 0,
  );
  const [query, setQuery] = useState("");
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      if (shouldAnimate) {
        progress.value = withTiming(1, {
          duration: ANIMATION_TIMING.transition,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
      } else {
        progress.value = 1;
      }
    } else if (shouldAnimate) {
      progress.value = withTiming(0, {
        duration: ANIMATION_TIMING.transition,
        easing: Easing.bezier(...ANIMATION_TIMING.bezier),
      });
    } else {
      progress.value = 0;
    }
  }, [progress, shouldAnimate, visible]);

  const rows = useMemo<FlattenedCommandRow[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? items.filter((item) => {
          const text =
            `${item.label} ${item.description ?? ""} ${item.group ?? ""}`.toLowerCase();
          return text.includes(normalizedQuery);
        })
      : items;

    const grouped = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const groupName = item.group ?? "General";
      const list = grouped.get(groupName);
      if (list) {
        list.push(item);
      } else {
        grouped.set(groupName, [item]);
      }
    }

    const flattened: FlattenedCommandRow[] = [];
    for (const [groupName, groupList] of grouped.entries()) {
      flattened.push({
        type: "header",
        key: `header:${groupName}`,
        title: groupName,
      });
      for (const item of groupList) {
        flattened.push({
          type: "item",
          key: `item:${groupName}:${item.value}`,
          item,
        });
      }
    }
    return flattened;
  }, [items, query]);

  const handleClose = useCallback(() => {
    if (haptic) triggerHaptic("selection");
    onClose();
  }, [haptic, onClose]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.disabled) return;
      if (haptic) triggerHaptic("selection");
      onSelect?.(item.value, item);
      onClose();
    },
    [haptic, onClose, onSelect],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  const renderRow = useCallback(
    ({ item: row }: ListRenderItemInfo<FlattenedCommandRow>) => {
      if (row.type === "header") {
        return (
          <Text
            variant="caption"
            weight="700"
            color="textMuted"
            style={[
              styles.groupHeader,
              {
                paddingHorizontal: spacing.xs,
                paddingTop: spacing.xs,
              },
            ]}
          >
            {row.title}
          </Text>
        );
      }

      const cmd = row.item;
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cmd.label}
          accessibilityState={{ disabled: Boolean(cmd.disabled) }}
          disabled={cmd.disabled}
          onPress={() => handleSelect(cmd)}
          style={({ pressed }) => [
            styles.itemRow,
            {
              borderRadius: radii.xl,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              gap: spacing.md,
              backgroundColor: pressed
                ? colors.backgroundMuted
                : colors.surfaceMuted,
              borderWidth: components.borderWidth.default,
              borderColor: pressed ? colors.border : colors.borderMuted,
              opacity: cmd.disabled ? 0.5 : 1,
            },
          ]}
        >
          {cmd.icon ? renderIcon(cmd.icon, colors.primary, 18) : null}

          <View style={styles.itemTextWrap}>
            <Text variant="label" weight="600">
              {cmd.label}
            </Text>
            {cmd.description ? (
              <Text variant="bodySmall" color="textMuted">
                {cmd.description}
              </Text>
            ) : null}
          </View>

          {cmd.badge ? (
            <Badge tone="accent" size="sm">
              {cmd.badge}
            </Badge>
          ) : null}

          {cmd.shortcut ? (
            <View
              style={[
                styles.shortcutBox,
                {
                  backgroundColor: colors.backgroundMuted,
                  borderRadius: radii.sm,
                  borderWidth: components.borderWidth.hairline,
                  borderColor: colors.borderMuted,
                },
              ]}
            >
              <Text variant="caption" weight="700" color="textMuted">
                {cmd.shortcut}
              </Text>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [
      colors.backgroundMuted,
      colors.border,
      colors.borderMuted,
      colors.primary,
      colors.surfaceMuted,
      components.borderWidth.hairline,
      components.borderWidth.default,
      handleSelect,
      radii.sm,
      radii.xl,
      spacing.md,
      spacing.xs,
    ],
  );

  if (!shouldMount && !visible) return null;

  return (
    <Modal
      visible={shouldMount}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? withAlpha("#000000", 0.65)
                : withAlpha("#0F172A", 0.45),
            },
            backdropStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close command palette"
            style={styles.flexOne}
            onPress={handleClose}
          />
        </Animated.View>

        <KeyboardAvoidingView behavior="padding" style={styles.avoidingWrap}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: glass
                  ? colors.glassSurfaceStrong
                  : colors.surface,
                borderTopLeftRadius: radii.xxl,
                borderTopRightRadius: radii.xxl,
                borderWidth: components.borderWidth.default,
                borderColor: glass ? colors.glassBorder : colors.border,
                padding: spacing.lg,
                paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.md),
                gap: spacing.md,
              },
              shadows.lg,
              sheetStyle,
              style,
            ]}
          >
            <View style={styles.header}>
              <Text variant="title" weight="700">
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={minTouchHitSlop(CLOSE_BUTTON_SIZE)}
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.closeBtn,
                  {
                    borderRadius: radii.full,
                    backgroundColor: pressed
                      ? colors.backgroundMuted
                      : "transparent",
                  },
                ]}
              >
                <Svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.textMuted}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </Pressable>
            </View>

            <Input
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              size="md"
              glass={glass}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <FlatList
              data={rows}
              keyExtractor={(row) => row.key}
              renderItem={renderRow}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={[
                styles.listContent,
                { paddingVertical: spacing.xs, gap: spacing.xs },
              ]}
              ListEmptyComponent={
                <View style={{ paddingVertical: spacing.xl }}>
                  <Text color="textMuted" align="center">
                    {emptyText}
                  </Text>
                </View>
              }
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  flexOne: {
    flex: 1,
  },
  avoidingWrap: {
    width: "100%",
    maxHeight: "85%",
  },
  sheet: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeBtn: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    maxHeight: 380,
  },
  listContent: {
    flexGrow: 1,
  },
  groupHeader: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  itemRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  shortcutBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
