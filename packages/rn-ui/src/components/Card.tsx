import React from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";

import { useTheme } from "../theme";
import { hasActiveShadow, type BaseGlassProps } from "./types";

export interface CardProps extends ViewProps, BaseGlassProps {
  padded?: boolean;
  elevated?: boolean;
  outlined?: boolean;
}

function CardComponent({
  padded = true,
  elevated = false,
  outlined = true,
  glass = false,
  style,
  ...props
}: CardProps) {
  const { colors, components, radii, spacing, shadows } = useTheme();

  const cardStyle = React.useMemo<ViewStyle>(() => {
    const activeShadow = elevated
      ? shadows.md
      : shadows[components.surface.cardShadow];
    return {
      backgroundColor: glass ? colors.glassSurface : colors.surface,
      borderRadius: radii.xl,
      ...(padded ? { padding: spacing.lg } : null),
      borderWidth: glass || outlined ? components.borderWidth.strong : 0,
      borderColor: glass ? colors.glassBorder : colors.border,
      overflow: hasActiveShadow(activeShadow) ? "visible" : "hidden",
      ...activeShadow,
    };
  }, [
    colors.border,
    colors.glassBorder,
    colors.glassSurface,
    colors.surface,
    components.borderWidth.strong,
    components.surface.cardShadow,
    elevated,
    glass,
    outlined,
    padded,
    radii.xl,
    shadows,
    spacing.lg,
  ]);

  return <View style={[cardStyle, style]} {...props} />;
}

export const Card = React.memo(CardComponent);
