import React, { createContext, useContext, useMemo } from "react";
import {
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text, type TextProps } from "./Text";

export type ItemVariant = "default" | "outline" | "muted";
export type ItemSize = "xs" | "sm" | "md";
export type ItemMediaVariant = "default" | "icon" | "image";
export type ItemAlignItems = "center" | "flex-start" | "start";

interface ItemContextValue {
  size: ItemSize;
  variant: ItemVariant;
  alignItems?: "center" | "flex-start";
}

const ItemContext = createContext<ItemContextValue | null>(null);

export interface ItemGroupProps extends ViewProps {
  size?: ItemSize;
  variant?: ItemVariant;
  alignItems?: ItemAlignItems;
  style?: StyleProp<ViewStyle>;
}

export const ItemGroup = React.memo(function ItemGroup({
  size = "md",
  variant = "default",
  alignItems = "start",
  style,
  children,
  ...props
}: ItemGroupProps) {
  const { spacing } = useTheme();
  const gap =
    size === "xs" ? spacing.sm : size === "sm" ? spacing.md : spacing.lg;

  const resolvedAlign: "center" | "flex-start" =
    alignItems === "center" ? "center" : "flex-start";
  const contextValue = useMemo(
    () => ({ size, variant, alignItems: resolvedAlign }),
    [size, variant, resolvedAlign],
  );

  return (
    <ItemContext.Provider value={contextValue}>
      <View
        accessibilityRole="list"
        style={[
          {
            width: "100%",
            gap,
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </ItemContext.Provider>
  );
});

export interface ItemSeparatorProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const ItemSeparator = React.memo(function ItemSeparator({
  style,
  ...props
}: ItemSeparatorProps) {
  const { colors, components, spacing } = useTheme();

  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[
        {
          height: components.borderWidth.default,
          width: "100%",
          marginVertical: spacing.sm,
          backgroundColor: colors.divider,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface ItemProps extends Omit<PressableProps, "style"> {
  variant?: ItemVariant;
  size?: ItemSize;
  alignItems?: ItemAlignItems;
  style?:
    | StyleProp<ViewStyle>
    | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
}

export const Item = React.memo(function Item({
  variant,
  size,
  alignItems,
  disabled,
  onPress,
  onLongPress,
  style,
  children,
  ...props
}: ItemProps) {
  const { colors, components, radii, spacing, isDark } = useTheme();
  const group = useContext(ItemContext);
  const resolvedVariant = variant ?? group?.variant ?? "default";
  const resolvedSize = size ?? group?.size ?? "md";
  const resolvedAlign =
    alignItems === "center"
      ? "center"
      : alignItems === "start"
        ? "flex-start"
        : (group?.alignItems ?? "flex-start");
  const isTonalOutline = components.surface.outlineStyle === "tonal";
  const isTonalItemOutline = resolvedVariant === "outline" && isTonalOutline;

  const itemContextValue = useMemo(
    () => ({
      size: resolvedSize,
      variant: resolvedVariant,
      alignItems: resolvedAlign,
    }),
    [resolvedSize, resolvedVariant, resolvedAlign],
  );

  const paddingX =
    resolvedSize === "xs"
      ? spacing.sm
      : resolvedSize === "sm"
        ? spacing.md
        : spacing.lg;
  const paddingY =
    resolvedSize === "xs"
      ? spacing.xs
      : resolvedSize === "sm"
        ? spacing.sm
        : spacing.md;
  const minHeight =
    resolvedSize === "xs" ? 40 : resolvedSize === "sm" ? 44 : 52;
  const gap = resolvedSize === "xs" ? spacing.sm : spacing.md;
  const isDisabled = Boolean(disabled);
  const isInteractive = Boolean(onPress || onLongPress);

  const baseStyle: ViewStyle = {
    width: "100%",
    minHeight,
    paddingHorizontal: paddingX,
    paddingVertical: paddingY,
    borderRadius: radii.md,
    borderWidth:
      resolvedVariant === "outline" && !isTonalOutline
        ? components.borderWidth.default
        : 0,
    borderColor:
      resolvedVariant === "outline" && !isTonalOutline
        ? colors.border
        : colors.transparent,
    backgroundColor: isTonalItemOutline
      ? isDark
        ? colors.surfaceRaised
        : colors.backgroundMuted
      : resolvedVariant === "muted"
        ? colors.surfaceMuted
        : colors.transparent,
    flexDirection: "row",
    alignItems: resolvedAlign,
    flexWrap: "nowrap",
    gap,
    opacity: isDisabled ? 0.5 : 1,
  };

  if (!isInteractive) {
    const staticStyle =
      typeof style === "function" ? style({ pressed: false }) : style;
    const resolvedChildren =
      typeof children === "function" ? children({ pressed: false }) : children;
    return (
      <ItemContext.Provider value={itemContextValue}>
        <View style={[baseStyle, staticStyle]} {...(props as ViewProps)}>
          {resolvedChildren}
        </View>
      </ItemContext.Provider>
    );
  }

  return (
    <ItemContext.Provider value={itemContextValue}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          baseStyle,
          { opacity: isDisabled ? 0.5 : pressed ? 0.78 : 1 },
          typeof style === "function" ? style({ pressed }) : style,
        ]}
        {...props}
      >
        {children}
      </Pressable>
    </ItemContext.Provider>
  );
});

export interface ItemMediaProps extends ViewProps {
  variant?: ItemMediaVariant;
  size?: ItemSize;
  align?: "start" | "center" | "flex-start";
  boxed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ItemMedia = React.memo(function ItemMedia({
  variant = "default",
  size,
  align,
  boxed,
  style,
  ...props
}: ItemMediaProps) {
  const { colors, radii } = useTheme();
  const group = useContext(ItemContext);
  const resolvedSize = size ?? group?.size ?? "md";
  const boxDimension =
    resolvedSize === "xs" ? 28 : resolvedSize === "sm" ? 34 : 40;
  const isTopAligned =
    align === "start" ||
    align === "flex-start" ||
    (align === undefined &&
      (group?.alignItems === "flex-start" ||
        (group?.alignItems as string) === "start"));
  const isBoxed =
    boxed !== undefined
      ? boxed
      : variant === "image" || (variant === "icon" && !isTopAligned);
  const hasBox = variant === "image" || isBoxed;
  const opticalTopOffset =
    resolvedSize === "xs" ? 1 : resolvedSize === "sm" ? 2 : 2;

  return (
    <View
      style={[
        {
          width: boxDimension,
          height: hasBox ? boxDimension : undefined,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: isTopAligned && !hasBox ? "flex-start" : "center",
          alignSelf: isTopAligned ? "flex-start" : "center",
          marginTop: isTopAligned ? opticalTopOffset : 0,
          overflow: variant === "image" ? "hidden" : undefined,
          borderRadius:
            variant === "image"
              ? radii.sm
              : hasBox
                ? radii.md
                : undefined,
          backgroundColor: hasBox
            ? colors.backgroundMuted
            : colors.transparent,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface ItemContentProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const ItemContent = React.memo(function ItemContent({
  style,
  ...props
}: ItemContentProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          minWidth: 0,
          gap: spacing.xs,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface ItemTitleProps extends Omit<TextProps, "style"> {
  style?: StyleProp<TextStyle>;
}

export const ItemTitle = React.memo(function ItemTitle({
  numberOfLines = 1,
  style,
  ...props
}: ItemTitleProps) {
  return (
    <Text
      variant="label"
      color="text"
      numberOfLines={numberOfLines}
      style={style}
      {...props}
    />
  );
});

export interface ItemDescriptionProps extends Omit<TextProps, "style"> {
  style?: StyleProp<TextStyle>;
}

export const ItemDescription = React.memo(function ItemDescription({
  numberOfLines = 2,
  style,
  ...props
}: ItemDescriptionProps) {
  return (
    <Text
      variant="bodySmall"
      color="textMuted"
      numberOfLines={numberOfLines}
      style={style}
      {...props}
    />
  );
});

export interface ItemActionsProps extends ViewProps {
  align?: "start" | "center" | "flex-start";
  style?: StyleProp<ViewStyle>;
}

export const ItemActions = React.memo(function ItemActions({
  align,
  style,
  ...props
}: ItemActionsProps) {
  const { spacing } = useTheme();
  const group = useContext(ItemContext);
  const isTopAligned =
    align === "start" ||
    align === "flex-start" ||
    (align === undefined &&
      (group?.alignItems === "flex-start" ||
        (group?.alignItems as string) === "start"));

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: isTopAligned ? "flex-start" : "center",
          marginTop: isTopAligned ? 2 : 0,
          gap: spacing.sm,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface ItemHeaderProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const ItemHeader = React.memo(function ItemHeader({
  style,
  ...props
}: ItemHeaderProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[
        {
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface ItemFooterProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const ItemFooter = React.memo(function ItemFooter({
  style,
  ...props
}: ItemFooterProps) {
  const { spacing } = useTheme();

  return (
    <View
      style={[
        {
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.sm,
        },
        style,
      ]}
      {...props}
    />
  );
});
