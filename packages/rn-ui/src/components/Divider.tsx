import React from "react";
import {
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";

export interface DividerProps extends Omit<ViewProps, "style"> {
  inset?: number;
  vertical?: boolean;
  style?: StyleProp<ViewStyle>;
}

function DividerComponent({
  inset = 0,
  vertical = false,
  importantForAccessibility = "no",
  accessibilityElementsHidden = true,
  style,
  ...props
}: DividerProps) {
  const { colors, components } = useTheme();
  const thickness = components.borderWidth.default;

  const dividerStyle = React.useMemo<ViewStyle>(
    () => ({
      backgroundColor: colors.divider,
      marginHorizontal: vertical ? 0 : inset,
      marginVertical: vertical ? inset : 0,
      width: vertical ? thickness : undefined,
      height: vertical ? undefined : thickness,
      alignSelf: vertical ? "stretch" : undefined,
    }),
    [colors.divider, inset, thickness, vertical],
  );

  return (
    <View
      importantForAccessibility={importantForAccessibility}
      accessibilityElementsHidden={accessibilityElementsHidden}
      style={[dividerStyle, style]}
      {...props}
    />
  );
}

export const Divider = React.memo(DividerComponent);
