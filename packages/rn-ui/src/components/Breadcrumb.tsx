import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";
import { minTouchHitSlop, renderIcon, type RenderIcon } from "./types";

export interface BreadcrumbProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const Breadcrumb = React.memo(function Breadcrumb({
  style,
  ...props
}: BreadcrumbProps) {
  const { spacing } = useTheme();
  return (
    <View
      style={[styles.root, { gap: spacing.xs }, style]}
      {...props}
    />
  );
});

export interface BreadcrumbItemProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const BreadcrumbItem = React.memo(function BreadcrumbItem({
  style,
  ...props
}: BreadcrumbItemProps) {
  return <View style={[styles.item, style]} {...props} />;
});

export interface BreadcrumbLinkProps extends Omit<PressableProps, "children"> {
  children?: React.ReactNode | RenderIcon;
}

export interface BreadcrumbPageProps {
  children?: React.ReactNode | RenderIcon;
}

export interface BreadcrumbSeparatorProps {
  children?: React.ReactNode | RenderIcon;
}

export const BreadcrumbLink = React.memo(function BreadcrumbLink({
  children,
  disabled,
  hitSlop,
  ...props
}: BreadcrumbLinkProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop ?? minTouchHitSlop(24)}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          variant="bodySmall"
          color={disabled ? "textMuted" : "primary"}
          weight="600"
        >
          {children}
        </Text>
      ) : typeof children === "function" ? (
        renderIcon(
          children as RenderIcon,
          disabled ? colors.textMuted : colors.primary,
          14,
        )
      ) : (
        children
      )}
    </Pressable>
  );
});

export const BreadcrumbPage = React.memo(function BreadcrumbPage({
  children,
}: BreadcrumbPageProps) {
  const { colors } = useTheme();

  return typeof children === "string" || typeof children === "number" ? (
    <Text accessibilityRole="text" variant="bodySmall" color="text" weight="600">
      {children}
    </Text>
  ) : typeof children === "function" ? (
    <>{renderIcon(children as RenderIcon, colors.text, 14)}</>
  ) : (
    <>{children}</>
  );
});

export const BreadcrumbSeparator = React.memo(function BreadcrumbSeparator({
  children = "/",
}: BreadcrumbSeparatorProps) {
  const { colors } = useTheme();

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      {typeof children === "string" || typeof children === "number" ? (
        <Text variant="bodySmall" color="textSubtle">
          {children}
        </Text>
      ) : typeof children === "function" ? (
        renderIcon(children as RenderIcon, colors.textMuted, 14)
      ) : (
        children
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
