import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";
import {
  renderIcon,
  type ComponentTone,
  type RenderIcon,
  type ThemeColorName,
} from "./types";

export interface MetricCardProps extends ViewProps {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  deltaTone?: ComponentTone;
  icon?: RenderIcon;
  style?: StyleProp<ViewStyle>;
}

function resolveDeltaTextColor(
  delta: React.ReactNode,
  deltaTone?: ComponentTone,
): ThemeColorName {
  if (deltaTone === "danger") return "danger";
  if (deltaTone === "warning") return "warning";
  if (deltaTone === "info") return "info";
  if (deltaTone === "accent") return "accent";
  if (deltaTone === "primary") return "primary";
  if (deltaTone === "secondary" || deltaTone === "default") return "textMuted";
  if (deltaTone === "success") return "success";

  if (typeof delta === "number") {
    return delta < 0 ? "danger" : delta > 0 ? "success" : "textMuted";
  }
  if (typeof delta === "string") {
    const trimmed = delta.trim();
    if (trimmed.startsWith("-")) return "danger";
    if (trimmed === "0" || trimmed === "0%") return "textMuted";
    return "success";
  }
  return "success";
}

function MetricCardComponent({
  label,
  value,
  delta,
  deltaTone,
  icon,
  accessibilityRole = "summary",
  style,
  ...props
}: MetricCardProps) {
  const { colors, components, radii, spacing } = useTheme();
  const hasDelta = delta !== undefined && delta !== null && delta !== "";
  const deltaColor = resolveDeltaTextColor(delta, deltaTone);

  return (
    <View
      accessibilityRole={accessibilityRole}
      style={[
        {
          borderWidth: components.borderWidth.strong,
          borderColor: colors.border,
          borderRadius: radii.xl,
          backgroundColor: colors.surface,
          padding: spacing.lg,
          gap: spacing.md,
        },
        style,
      ]}
      {...props}
    >
      <View style={[styles.headerRow, { gap: spacing.md }]}>
        {typeof label === "string" || typeof label === "number" ? (
          <Text variant="bodySmall" color="textMuted" style={styles.label}>
            {label}
          </Text>
        ) : (
          <View style={styles.label}>{label}</View>
        )}
        {renderIcon(icon, colors.primary, components.metricCard.iconSize)}
      </View>
      {typeof value === "string" || typeof value === "number" ? (
        <Text variant="h3">{value}</Text>
      ) : (
        value
      )}
      {hasDelta ? (
        typeof delta === "string" || typeof delta === "number" ? (
          <Text variant="caption" color={deltaColor}>
            {delta}
          </Text>
        ) : (
          delta
        )
      ) : null}
    </View>
  );
}

export const MetricCard = React.memo(MetricCardComponent);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    flex: 1,
    flexShrink: 1,
  },
});
