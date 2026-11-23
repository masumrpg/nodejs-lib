import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text, type TextProps } from "./Text";

export interface DataListProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export interface DataListItemProps extends ViewProps {
  isLast?: boolean;
  alignItems?: "center" | "flex-start" | "start";
  style?: StyleProp<ViewStyle>;
}

export interface DataListLabelProps extends Omit<TextProps, "children"> {
  children?: React.ReactNode;
}

export interface DataListValueProps extends Omit<TextProps, "children"> {
  children?: React.ReactNode;
}

export const DataList = React.memo(function DataList({
  style,
  children,
  ...props
}: DataListProps) {
  const { spacing } = useTheme();
  const childArray = React.Children.toArray(children).filter(Boolean);
  const count = childArray.length;

  const enhancedChildren = childArray.map((child, index) => {
    if (React.isValidElement<DataListItemProps>(child)) {
      return React.cloneElement(child, {
        isLast: child.props.isLast ?? index === count - 1,
      });
    }
    return child;
  });

  return (
    <View style={[styles.list, { gap: spacing.xs }, style]} {...props}>
      {enhancedChildren}
    </View>
  );
});

export const DataListItem = React.memo(function DataListItem({
  isLast = false,
  alignItems = "center",
  style,
  ...props
}: DataListItemProps) {
  const { colors, components, spacing } = useTheme();
  const resolvedAlign = alignItems === "start" ? "flex-start" : alignItems;

  return (
    <View
      accessible
      style={[
        styles.item,
        {
          alignItems: resolvedAlign,
          gap: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: isLast ? 0 : components.borderWidth.default,
          borderBottomColor: isLast ? "transparent" : colors.borderMuted,
        },
        style,
      ]}
      {...props}
    />
  );
});

export const DataListLabel = React.memo(function DataListLabel({
  children,
  style,
  ...props
}: DataListLabelProps) {
  return typeof children === "string" || typeof children === "number" ? (
    <Text
      variant="bodySmall"
      color="textMuted"
      style={[styles.label, style]}
      {...props}
    >
      {children}
    </Text>
  ) : (
    <>{children}</>
  );
});

export const DataListValue = React.memo(function DataListValue({
  children,
  style,
  ...props
}: DataListValueProps) {
  return typeof children === "string" || typeof children === "number" ? (
    <Text
      variant="label"
      color="text"
      align="right"
      style={[styles.value, style]}
      {...props}
    >
      {children}
    </Text>
  ) : (
    <>{children}</>
  );
});

const styles = StyleSheet.create({
  list: {
    width: "100%",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    flexShrink: 0,
  },
  value: {
    flexShrink: 1,
  },
});
