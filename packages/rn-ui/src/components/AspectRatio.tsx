import React from "react";
import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { useTheme } from "../theme";

export interface AspectRatioProps extends ViewProps {
  /**
   * The aspect ratio of the container, e.g., 16/9, 4/3, 1.
   * Defaults to 1.
   */
  ratio?: number;
  /**
   * The border radius token from the theme.
   */
  radius?: keyof ReturnType<typeof useTheme>["radii"];
  /**
   * The content to render inside the AspectRatio container.
   */
  children?: React.ReactNode;
}

function AspectRatioComponent({
  ratio = 1,
  radius,
  children,
  style,
  ...props
}: AspectRatioProps) {
  const { radii } = useTheme();
  const safeRatio =
    typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0
      ? ratio
      : 1;

  const containerStyle = React.useMemo<ViewStyle>(
    () => ({
      width: "100%",
      aspectRatio: safeRatio,
      overflow: "hidden",
      ...(radius ? { borderRadius: radii[radius] } : null),
    }),
    [radii, radius, safeRatio],
  );

  return (
    <View style={[containerStyle, style]} {...props}>
      <View style={StyleSheet.absoluteFill}>{children}</View>
    </View>
  );
}

export const AspectRatio = React.memo(AspectRatioComponent);
