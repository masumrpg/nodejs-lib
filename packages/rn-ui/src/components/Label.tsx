import React from "react";
import {
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from "react-native";

import { useTheme } from "../theme";

export interface LabelProps extends TextProps {
  required?: boolean;
  requiredIndicator?: React.ReactNode;
  requiredIndicatorStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  invalid?: boolean;
  style?: StyleProp<TextStyle>;
}

function LabelComponent({
  required = false,
  requiredIndicator,
  requiredIndicatorStyle,
  disabled = false,
  invalid = false,
  accessibilityState,
  style,
  children,
  ...props
}: LabelProps) {
  const { colors, spacing, typography } = useTheme();
  const isCustomNodeIndicator =
    required &&
    requiredIndicator !== undefined &&
    requiredIndicator !== null &&
    typeof requiredIndicator !== "string" &&
    typeof requiredIndicator !== "number";

  const textColor = disabled
    ? colors.disabledText
    : invalid
      ? colors.danger
      : colors.text;

  if (isCustomNodeIndicator) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityState={{ disabled, ...accessibilityState }}
        style={[styles.row, { gap: spacing.xxs }]}
      >
        <RNText
          style={[typography.label, { color: textColor }, style]}
          {...props}
        >
          {children}
        </RNText>
        <View pointerEvents="none">{requiredIndicator}</View>
      </View>
    );
  }

  return (
    <RNText
      accessibilityState={{ disabled, ...accessibilityState }}
      style={[typography.label, { color: textColor }, style]}
      {...props}
    >
      {children}
      {required ? (
        <RNText style={[{ color: colors.danger }, requiredIndicatorStyle]}>
          {requiredIndicator ?? " *"}
        </RNText>
      ) : null}
    </RNText>
  );
}

export const Label = React.memo(LabelComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
