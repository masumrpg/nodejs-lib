import React, { createContext, useContext, useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";
import {
  resolveOutlineBorderColor,
  resolveToneColors,
  type ComponentTone,
  type ToneProps,
  type VariantProps,
} from "./types";

export type BubbleVariant = "filled" | "soft" | "outline" | "ghost";
export type BubbleTone = ComponentTone;
export type BubbleAlign = "start" | "end";

interface BubbleContextType {
  tone: BubbleTone;
  variant: BubbleVariant;
  align: BubbleAlign;
}

const BubbleContext = createContext<BubbleContextType | null>(null);

function useBubbleContext() {
  const context = useContext(BubbleContext);
  if (!context) {
    throw new Error(
      "Bubble components must be rendered within a Bubble provider",
    );
  }
  return context;
}

export interface BubbleGroupProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const BubbleGroup = React.memo(function BubbleGroup({
  style,
  children,
  ...props
}: BubbleGroupProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[styles.group, { gap: spacing.md }, style]}
      {...props}
    >
      {children}
    </View>
  );
});

export interface BubbleProps
  extends ViewProps,
    ToneProps<BubbleTone>,
    VariantProps<BubbleVariant> {
  align?: BubbleAlign;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const Bubble = React.memo(function Bubble({
  tone = "primary",
  variant = "filled",
  align = "start",
  style,
  children,
  ...props
}: BubbleProps) {
  const { spacing } = useTheme();

  const contextValue = useMemo(
    () => ({ tone, variant, align }),
    [align, tone, variant],
  );

  const bubbleStyle = useMemo<ViewStyle>(
    () => ({
      alignSelf: align === "end" ? "flex-end" : "flex-start",
      maxWidth: variant === "ghost" ? "100%" : "80%",
      position: "relative",
      flexDirection: "column",
      gap: spacing.xs,
    }),
    [align, spacing.xs, variant],
  );

  return (
    <BubbleContext.Provider value={contextValue}>
      <View style={[bubbleStyle, style]} {...props}>
        {children}
      </View>
    </BubbleContext.Provider>
  );
});

export interface BubbleContentProps extends Omit<ViewProps, "style"> {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onPress?: PressableProps["onPress"];
  children?: React.ReactNode;
}

export const BubbleContent = React.memo(function BubbleContent({
  style,
  textStyle,
  onPress,
  children,
  ...props
}: BubbleContentProps) {
  const { tone, variant, align } = useBubbleContext();
  const { colors, components, radii, shadows, spacing, typography, isDark } =
    useTheme();
  const toneColors = resolveToneColors(tone, colors);
  const hasSolidBorder = components.surface.filledBorderColor === "border";
  const isTonalOutline = components.surface.outlineStyle === "tonal";

  let bg = toneColors.solid;
  let textColor = toneColors.on;
  let borderColor = hasSolidBorder ? colors.border : colors.transparent;

  if (variant === "soft") {
    bg = toneColors.soft;
    textColor =
      tone === "warning" && !isDark
        ? "#92400E"
        : tone === "default"
          ? colors.text
          : toneColors.solid;
  } else if (variant === "outline") {
    bg = isTonalOutline
      ? isDark
        ? colors.surfaceRaised
        : colors.backgroundMuted
      : colors.surface;
    textColor = colors.text;
    borderColor = resolveOutlineBorderColor(
      colors,
      components.surface,
      tone === "default" ? undefined : toneColors.border,
    );
  } else if (variant === "ghost") {
    bg = colors.transparent;
    textColor = colors.text;
  }

  const isGhost = variant === "ghost";
  const alignSelf = align === "end" ? "flex-end" : "flex-start";
  const bubbleShadow = !isGhost
    ? shadows[components.surface.feedbackShadow]
    : shadows.none;

  const finalContainerStyle: ViewStyle = isGhost
    ? {
        borderWidth: 0,
        backgroundColor: colors.transparent,
        borderRadius: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
        alignSelf,
      }
    : {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + spacing.xxs,
        borderRadius: radii.xl + spacing.xs,
        borderWidth:
          variant === "outline"
            ? isTonalOutline
              ? 0
              : components.borderWidth.control
            : components.borderWidth.filled,
        borderColor,
        backgroundColor: bg,
        alignSelf,
        ...bubbleShadow,
      };

  const renderedChildren =
    typeof children === "string" || typeof children === "number" ? (
      <Text
        variant="bodySmall"
        style={[{ color: textColor, lineHeight: typography.bodySmall.lineHeight }, textStyle]}
      >
        {children}
      </Text>
    ) : (
      children
    );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          finalContainerStyle,
          { opacity: pressed ? 0.8 : 1 },
          style,
        ]}
        {...props}
      >
        {renderedChildren}
      </Pressable>
    );
  }

  return (
    <View style={[finalContainerStyle, style]} {...props}>
      {renderedChildren}
    </View>
  );
});

export interface BubbleReactionsProps extends ViewProps {
  side?: "top" | "bottom";
  align?: "start" | "end";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const BubbleReactions = React.memo(function BubbleReactions({
  side = "bottom",
  align = "end",
  style,
  children,
  ...props
}: BubbleReactionsProps) {
  const { colors, components, radii, spacing } = useTheme();

  const reactionStyle: ViewStyle = {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    backgroundColor: colors.backgroundMuted,
    borderRadius: radii.full,
    borderWidth: components.borderWidth.focus,
    borderColor: colors.surface,
    paddingHorizontal: spacing.xs + spacing.xxs,
    paddingVertical: spacing.xxs + 1,
    zIndex: 10,
    ...(side === "top" ? { top: -10 } : { bottom: -10 }),
    ...(align === "start" ? { left: spacing.md } : { right: spacing.md }),
  };

  return (
    <View style={[reactionStyle, style]} {...props}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    flexDirection: "column",
    width: "100%",
  },
});
