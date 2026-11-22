import React from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";

import { useTheme } from "../theme";
import type { ThemeColorName } from "./types";

type Space = keyof ReturnType<typeof useTheme>["spacing"];

export interface BoxProps extends ViewProps {
  bg?: ThemeColorName;
  borderColor?: ThemeColorName;
  radius?: keyof ReturnType<typeof useTheme>["radii"];
  p?: Space;
  px?: Space;
  py?: Space;
  m?: Space;
  mx?: Space;
  my?: Space;
  flex?: number;
  row?: boolean;
  wrap?: boolean;
  center?: boolean;
  gap?: Space;
}

function BoxComponent({
  bg,
  borderColor,
  radius,
  p,
  px,
  py,
  m,
  mx,
  my,
  flex,
  row,
  wrap,
  center,
  gap,
  style,
  ...props
}: BoxProps) {
  const { colors, components, radii, spacing } = useTheme();

  const themedStyle = React.useMemo<ViewStyle>(
    () => ({
      ...(bg ? { backgroundColor: colors[bg] } : null),
      ...(borderColor
        ? {
            borderColor: colors[borderColor],
            borderWidth: components.borderWidth.default,
          }
        : null),
      ...(radius ? { borderRadius: radii[radius] } : null),
      ...(p ? { padding: spacing[p] } : null),
      ...(px ? { paddingHorizontal: spacing[px] } : null),
      ...(py ? { paddingVertical: spacing[py] } : null),
      ...(m ? { margin: spacing[m] } : null),
      ...(mx ? { marginHorizontal: spacing[mx] } : null),
      ...(my ? { marginVertical: spacing[my] } : null),
      ...(flex !== undefined ? { flex } : null),
      ...(row ? { flexDirection: "row" } : null),
      ...(wrap ? { flexWrap: "wrap" } : null),
      ...(center ? { alignItems: "center", justifyContent: "center" } : null),
      ...(gap ? { gap: spacing[gap] } : null),
    }),
    [
      bg,
      borderColor,
      center,
      colors,
      components.borderWidth.default,
      flex,
      gap,
      m,
      mx,
      my,
      p,
      px,
      py,
      radii,
      radius,
      row,
      wrap,
      spacing,
    ],
  );

  return <View style={[themedStyle, style]} {...props} />;
}

export const Box = React.memo(BoxComponent);
