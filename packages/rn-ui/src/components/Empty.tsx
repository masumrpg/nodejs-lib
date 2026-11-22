import React from "react";
import {
  View,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";
import type { BaseGlassProps } from "./types";

export type EmptyMediaVariant = "default" | "icon";
export type EmptyMediaSize = "sm" | "md" | "lg";

export interface EmptyProps extends ViewProps, BaseGlassProps {
  bordered?: boolean;
  fullHeight?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const Empty = React.memo(function Empty({
  bordered = false,
  fullHeight = false,
  glass = false,
  style,
  ...props
}: EmptyProps) {
  const { colors, components, radii, spacing } = useTheme();

  return (
    <View
      style={[
        {
          width: "100%",
          minWidth: 0,
          flexShrink: 1,
          ...(fullHeight ? { flexGrow: 1 } : null),
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.lg,
          borderRadius: radii.xl,
          borderWidth: glass || bordered ? components.borderWidth.strong : 0,
          borderStyle: bordered ? "dashed" : "solid",
          borderColor: glass
            ? colors.glassBorder
            : bordered
              ? colors.border
              : colors.transparent,
          backgroundColor: glass ? colors.glassSurface : colors.transparent,
          padding: spacing.xxl,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface EmptyHeaderProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const EmptyHeader = React.memo(function EmptyHeader({
  style,
  ...props
}: EmptyHeaderProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[
        {
          width: "100%",
          maxWidth: 340,
          alignItems: "center",
          gap: spacing.sm,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface EmptyMediaProps extends ViewProps, BaseGlassProps {
  variant?: EmptyMediaVariant;
  size?: EmptyMediaSize;
  style?: StyleProp<ViewStyle>;
}

const iconMediaSizes: Record<EmptyMediaSize, number> = {
  sm: 44,
  md: 56,
  lg: 72,
};

export const EmptyMedia = React.memo(function EmptyMedia({
  variant = "default",
  size = "md",
  glass = false,
  style,
  ...props
}: EmptyMediaProps) {
  const { colors, components, radii } = useTheme();
  const isIcon = variant === "icon";
  const boxSize = iconMediaSizes[size];

  return (
    <View
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: isIcon ? boxSize : undefined,
          height: isIcon ? boxSize : undefined,
          borderRadius: isIcon ? radii.xl : undefined,
          borderWidth: isIcon && glass ? components.borderWidth.default : 0,
          borderColor: glass ? colors.glassBorder : colors.transparent,
          backgroundColor: isIcon
            ? glass
              ? colors.glassSurfaceStrong
              : colors.primarySoft
            : colors.transparent,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface EmptyTitleProps extends Omit<RNTextProps, "style"> {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const EmptyTitle = React.memo(function EmptyTitle({
  children,
  accessibilityRole = "header",
  style,
  ...props
}: EmptyTitleProps) {
  return (
    <Text
      variant="title"
      align="center"
      accessibilityRole={accessibilityRole}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
});

export interface EmptyDescriptionProps extends Omit<RNTextProps, "style"> {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const EmptyDescription = React.memo(function EmptyDescription({
  children,
  style,
  ...props
}: EmptyDescriptionProps) {
  return (
    <Text
      variant="bodySmall"
      color="textMuted"
      align="center"
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
});

export interface EmptyContentProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const EmptyContent = React.memo(function EmptyContent({
  style,
  ...props
}: EmptyContentProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[
        {
          width: "100%",
          maxWidth: 340,
          minWidth: 0,
          alignItems: "center",
          gap: spacing.sm,
        },
        style,
      ]}
      {...props}
    />
  );
});
