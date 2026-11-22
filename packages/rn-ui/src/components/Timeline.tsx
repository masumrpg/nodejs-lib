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
import { renderIcon, type BaseGlassProps, type RenderIcon } from "./types";

export interface TimelineProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export interface TimelineItemProps extends ViewProps, BaseGlassProps {
  active?: boolean;
  isLast?: boolean;
  isFirst?: boolean;
  lineColor?: string;
  dotColor?: string;
  icon?: RenderIcon;
  style?: StyleProp<ViewStyle>;
}

export interface TimelineTitleProps {
  children?: React.ReactNode;
}

export interface TimelineDescriptionProps {
  children?: React.ReactNode;
}

export const Timeline = React.memo(function Timeline({
  style,
  children,
  ...props
}: TimelineProps) {
  const childrenArray = React.Children.toArray(children).filter(Boolean);
  const count = childrenArray.length;

  return (
    <View style={[styles.root, style]} {...props}>
      {childrenArray.map((child, index) => {
        if (React.isValidElement<TimelineItemProps>(child)) {
          return React.cloneElement(child, {
            isLast: child.props.isLast ?? index === count - 1,
            isFirst: child.props.isFirst ?? index === 0,
          });
        }
        return child;
      })}
    </View>
  );
});

export const TimelineItem = React.memo(function TimelineItem({
  active = false,
  isLast = false,
  isFirst = false,
  glass = false,
  lineColor,
  dotColor,
  icon,
  style,
  children,
  ...props
}: TimelineItemProps) {
  const { colors, components, radii, spacing } = useTheme();
  const indicatorSize = components.timeline.indicatorSize;
  const resolvedDotBg =
    dotColor ?? (active ? colors.primary : colors.surfaceMuted);
  const resolvedDotBorder = active || dotColor ? "transparent" : colors.border;
  const resolvedIconColor =
    active || dotColor ? colors.onPrimary : colors.textMuted;
  const resolvedLineColor =
    lineColor ?? (active ? colors.primary : colors.borderMuted);

  return (
    <View
      style={[
        styles.row,
        {
          gap: spacing.md,
          minHeight: !isLast ? components.timeline.connectorMinHeight : undefined,
        },
        style,
      ]}
      {...props}
    >
      <View
        style={[
          styles.trackColumn,
          { width: indicatorSize + 8 },
        ]}
      >
        <View
          style={[
            styles.dot,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              backgroundColor: resolvedDotBg,
              borderWidth: components.borderWidth.default,
              borderColor: resolvedDotBorder,
              marginTop: isFirst ? 2 : 4,
            },
          ]}
        >
          {icon ? renderIcon(icon, resolvedIconColor, 8) : null}
        </View>
        {!isLast ? (
          <View
            style={[
              styles.connector,
              {
                width: components.timeline.connectorWidth ?? 1.5,
                backgroundColor: resolvedLineColor,
              },
            ]}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.contentColumn,
          {
            marginBottom: isLast ? 0 : spacing.lg,
            gap: spacing.xs,
          },
          glass && {
            backgroundColor: colors.glassSurface,
            borderWidth: components.borderWidth.default,
            borderColor: colors.glassBorder,
            borderRadius: radii.lg,
            padding: spacing.md,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
});

export const TimelineTitle = React.memo(function TimelineTitle({
  children,
}: TimelineTitleProps) {
  return typeof children === "string" || typeof children === "number" ? (
    <Text variant="label">{children}</Text>
  ) : (
    <>{children}</>
  );
});

export const TimelineDescription = React.memo(function TimelineDescription({
  children,
}: TimelineDescriptionProps) {
  return typeof children === "string" || typeof children === "number" ? (
    <Text variant="bodySmall" color="textMuted">
      {children}
    </Text>
  ) : (
    <>{children}</>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
  },
  trackColumn: {
    alignItems: "center",
  },
  dot: {
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    flex: 1,
    marginTop: 4,
  },
  contentColumn: {
    flex: 1,
  },
});
