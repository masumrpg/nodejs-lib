import React from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";

export interface TableProps extends ViewProps {
  horizontal?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "horizontal" | "children">;
  style?: StyleProp<ViewStyle>;
}

export interface TableRowProps extends ViewProps {
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface TableHeadProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export interface TableCellProps extends ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Table = React.memo(function Table({
  horizontal = true,
  scrollViewProps,
  style,
  children,
  ...props
}: TableProps) {
  const { colors, components, radii } = useTheme();
  const rowChildren = React.Children.toArray(children).filter(Boolean);
  const count = rowChildren.length;

  const enhancedChildren = rowChildren.map((child, index) => {
    if (React.isValidElement<TableRowProps>(child)) {
      return React.cloneElement(child, {
        isLast: child.props.isLast ?? index === count - 1,
      });
    }
    return child;
  });

  const table = (
    <View
      style={[
        styles.table,
        {
          borderWidth: components.borderWidth.default,
          borderColor: colors.border,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
        },
        style,
      ]}
      {...props}
    >
      {enhancedChildren}
    </View>
  );

  return horizontal ? (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContent}
      {...scrollViewProps}
    >
      {table}
    </ScrollView>
  ) : (
    table
  );
});

export const TableRow = React.memo(function TableRow({
  isLast = false,
  style,
  ...props
}: TableRowProps) {
  const { colors, components } = useTheme();

  return (
    <View
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: components.borderWidth.default,
          borderBottomColor: colors.borderMuted,
        },
        style,
      ]}
      {...props}
    />
  );
});

export const TableHead = React.memo(function TableHead({
  children,
  style,
  ...props
}: TableHeadProps) {
  const { colors, components, spacing } = useTheme();

  return (
    <View
      style={[
        styles.cell,
        {
          minWidth: components.table.minColumnWidth,
          padding: spacing.md,
          backgroundColor: colors.surfaceMuted,
        },
        style,
      ]}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text variant="labelSmall" weight="700" color="text">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
});

export const TableCell = React.memo(function TableCell({
  children,
  style,
  ...props
}: TableCellProps) {
  const { components, spacing } = useTheme();

  return (
    <View
      style={[
        styles.cell,
        {
          minWidth: components.table.minColumnWidth,
          padding: spacing.md,
        },
        style,
      ]}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text variant="bodySmall">{children}</Text>
      ) : (
        children
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  horizontalContent: {
    flexGrow: 1,
  },
  table: {
    minWidth: "100%",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
  },
});
