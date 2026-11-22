import React, { forwardRef } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import type { ThemeColorName } from "./types";

type Space = keyof ReturnType<typeof useTheme>["spacing"];

export interface KeyboardAvoidingProps extends Omit<
  KeyboardAvoidingViewProps,
  "style"
> {
  bg?: ThemeColorName;
  p?: Space;
  px?: Space;
  py?: Space;
  gap?: Space;
  scroll?: boolean;
  fullHeight?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: ScrollViewProps;
  style?: StyleProp<ViewStyle>;
}

export const KeyboardAvoiding = forwardRef<
  KeyboardAvoidingView,
  KeyboardAvoidingProps
>(function KeyboardAvoiding(
  {
    bg = "background",
    p,
    px,
    py,
    gap,
    scroll = false,
    fullHeight = true,
    behavior,
    keyboardVerticalOffset = 0,
    enabled = true,
    contentContainerStyle,
    scrollViewProps,
    style,
    children,
    ...props
  },
  ref,
) {
  const { colors, spacing } = useTheme();
  const resolvedBehavior = behavior ?? "padding";
  const {
    contentContainerStyle: scrollContentContainerStyle,
    keyboardShouldPersistTaps = "handled",
    contentInsetAdjustmentBehavior = "automatic",
    ...restScrollViewProps
  } = scrollViewProps ?? {};

  const contentStyle = React.useMemo<ViewStyle>(
    () => ({
      ...(p ? { padding: spacing[p] } : null),
      ...(px ? { paddingHorizontal: spacing[px] } : null),
      ...(py ? { paddingVertical: spacing[py] } : null),
      ...(gap ? { gap: spacing[gap] } : null),
    }),
    [gap, p, px, py, spacing],
  );

  const rootStyle = React.useMemo<ViewStyle>(
    () => ({
      ...(fullHeight ? { flex: 1 } : null),
      backgroundColor: colors[bg],
    }),
    [bg, colors, fullHeight],
  );

  return (
    <KeyboardAvoidingView
      ref={ref}
      behavior={resolvedBehavior}
      keyboardVerticalOffset={keyboardVerticalOffset}
      enabled={enabled}
      contentContainerStyle={
        resolvedBehavior === "position" ? contentContainerStyle : undefined
      }
      style={[rootStyle, style]}
      {...props}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
          contentContainerStyle={[
            contentStyle,
            fullHeight && styles.flexGrow,
            contentContainerStyle,
            scrollContentContainerStyle,
          ]}
          {...restScrollViewProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            fullHeight && styles.flex,
            contentStyle,
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      )}
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGrow: { flexGrow: 1 },
});
