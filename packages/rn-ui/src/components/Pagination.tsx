import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Button } from "./Button";
import { Text } from "./Text";

export interface PaginationProps extends ViewProps {
  page: number;
  pageCount: number;
  onPageChange?: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  previousAccessibilityLabel?: string;
  nextAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export const Pagination = React.memo(function Pagination({
  page,
  pageCount,
  onPageChange,
  previousLabel = "Prev",
  nextLabel = "Next",
  previousAccessibilityLabel = "Previous page",
  nextAccessibilityLabel = "Next page",
  style,
  ...props
}: PaginationProps) {
  const { spacing } = useTheme();
  const isCountValid = Number.isFinite(pageCount) && pageCount > 0;
  const safeCount = isCountValid ? Math.max(1, Math.trunc(pageCount)) : 1;
  const rawPage = Number.isFinite(page) ? Math.trunc(page) : 1;
  const safePage = Math.min(safeCount, Math.max(1, rawPage));

  const prevDisabled = !isCountValid || safePage <= 1;
  const nextDisabled = !isCountValid || safePage >= safeCount;

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel={`Pagination, page ${safePage} of ${safeCount}`}
      style={[styles.container, { gap: spacing.sm }, style]}
      {...props}
    >
      <Button
        size="sm"
        variant="outline"
        tone="secondary"
        accessibilityLabel={previousAccessibilityLabel}
        disabled={prevDisabled}
        onPress={() => {
          if (!prevDisabled) {
            onPageChange?.(safePage - 1);
          }
        }}
      >
        {previousLabel}
      </Button>
      <Text
        variant="labelSmall"
        color="textMuted"
        style={styles.pageLabel}
      >
        {safePage} / {safeCount}
      </Text>
      <Button
        size="sm"
        variant="outline"
        tone="secondary"
        accessibilityLabel={nextAccessibilityLabel}
        disabled={nextDisabled}
        onPress={() => {
          if (!nextDisabled) {
            onPageChange?.(safePage + 1);
          }
        }}
      >
        {nextLabel}
      </Button>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageLabel: {
    fontVariant: ["tabular-nums"],
  },
});
