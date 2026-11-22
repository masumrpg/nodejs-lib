import React, { createContext, useContext, useMemo } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";
import type {
  ComponentSize,
  ComponentTone,
  SizeProps,
  ToneProps,
  VariantProps,
} from "./types";

export type ButtonGroupOrientation = "horizontal" | "vertical";
export type ButtonGroupVariant = "filled" | "outline" | "ghost" | "soft";

interface ButtonGroupContextValue {
  orientation: ButtonGroupOrientation;
  size?: ComponentSize;
  variant?: ButtonGroupVariant;
  tone?: ComponentTone;
  disabled?: boolean;
}

const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);

export interface ButtonGroupProps
  extends ViewProps,
    SizeProps<ComponentSize>,
    ToneProps<ComponentTone>,
    VariantProps<ButtonGroupVariant> {
  orientation?: ButtonGroupOrientation;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const isAnimatedStyleHandle = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  ("viewDescriptors" in value || "initial" in value);

const isAbsolute = (style: StyleProp<ViewStyle>): boolean => {
  if (!style) return false;
  if (Array.isArray(style)) {
    for (let i = style.length - 1; i >= 0; i -= 1) {
      const entry = style[i] as StyleProp<ViewStyle>;
      if (isAbsolute(entry)) return true;
    }
    return false;
  }
  if (typeof style === "number") {
    return StyleSheet.flatten(style)?.position === "absolute";
  }
  if (typeof style === "object" && !isAnimatedStyleHandle(style)) {
    return (style as ViewStyle).position === "absolute";
  }
  return false;
};

function flattenValidElements(children: React.ReactNode): React.ReactNode[] {
  const items: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.type === React.Fragment
    ) {
      items.push(...flattenValidElements(child.props.children));
      return;
    }
    items.push(child);
  });
  return items;
}

export const ButtonGroup = React.memo(function ButtonGroup({
  orientation = "horizontal",
  size,
  variant,
  tone,
  disabled,
  accessibilityRole = "toolbar",
  style,
  children,
  ...props
}: ButtonGroupProps) {
  const isHorizontal = orientation === "horizontal";

  const contextValue = useMemo<ButtonGroupContextValue>(
    () => ({ orientation, size, variant, tone, disabled }),
    [disabled, orientation, size, tone, variant],
  );

  const validChildren = flattenValidElements(children);
  const layoutChildren = validChildren.filter((child) => {
    if (
      !React.isValidElement<{ style?: StyleProp<ViewStyle> }>(child) ||
      child.type === ButtonGroupSeparator
    ) {
      return false;
    }
    return !isAbsolute(child.props.style);
  });
  const count = layoutChildren.length;
  let layoutIndex = 0;

  return (
    <ButtonGroupContext.Provider value={contextValue}>
      <View
        accessibilityRole={accessibilityRole}
        style={[
          isHorizontal ? styles.groupHorizontal : styles.groupVertical,
          style,
        ]}
        {...props}
      >
        {validChildren.map((child) => {
          if (
            !React.isValidElement<{
              style?: StyleProp<ViewStyle>;
              size?: ComponentSize;
              variant?: ButtonGroupVariant;
              tone?: ComponentTone;
              disabled?: boolean;
            }>(child)
          ) {
            return child;
          }

          if (child.type === ButtonGroupSeparator) {
            return child;
          }

          if (isAbsolute(child.props.style)) {
            return child;
          }

          const index = layoutIndex;
          layoutIndex++;

          const childStyle: ViewStyle = isHorizontal
            ? {
                ...(index > 0
                  ? {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                      borderLeftWidth: 0,
                    }
                  : null),
                ...(index < count - 1
                  ? {
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                    }
                  : null),
              }
            : {
                ...(index > 0
                  ? {
                      borderTopLeftRadius: 0,
                      borderTopRightRadius: 0,
                      borderTopWidth: 0,
                    }
                  : null),
                ...(index < count - 1
                  ? {
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                    }
                  : null),
              };

          const mergedProps: Record<string, unknown> = {
            style: [child.props.style, childStyle],
          };
          if (size !== undefined && child.props.size === undefined) {
            mergedProps.size = size;
          }
          if (variant !== undefined && child.props.variant === undefined) {
            mergedProps.variant = variant;
          }
          if (tone !== undefined && child.props.tone === undefined) {
            mergedProps.tone = tone;
          }
          if (disabled !== undefined && child.props.disabled === undefined) {
            mergedProps.disabled = disabled;
          }

          return React.cloneElement(
            child,
            mergedProps as Partial<typeof child.props> & { key?: React.Key },
          );
        })}
      </View>
    </ButtonGroupContext.Provider>
  );
});

export interface ButtonGroupTextProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const ButtonGroupText = React.memo(function ButtonGroupText({
  style,
  textStyle,
  children,
  ...props
}: ButtonGroupTextProps) {
  const { colors, components, radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.textContainer,
        {
          backgroundColor: colors.backgroundMuted,
          borderColor: colors.border,
          borderWidth: components.borderWidth.strong,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
        },
        style,
      ]}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text variant="label" color="text" style={textStyle}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
});

export interface ButtonGroupSeparatorProps extends ViewProps {
  orientation?: ButtonGroupOrientation;
  style?: StyleProp<ViewStyle>;
}

export const ButtonGroupSeparator = React.memo(function ButtonGroupSeparator({
  orientation,
  style,
  ...props
}: ButtonGroupSeparatorProps) {
  const { colors, components } = useTheme();
  const group = useContext(ButtonGroupContext);
  const resolvedOrientation =
    orientation ??
    (group?.orientation === "vertical" ? "horizontal" : "vertical");
  const isVertical = resolvedOrientation === "vertical";
  const thickness = components.borderWidth.default;

  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[
        {
          ...(isVertical ? { width: thickness } : { height: thickness }),
          backgroundColor: colors.border,
          alignSelf: "stretch",
        },
        style,
      ]}
      {...props}
    />
  );
});

const styles = StyleSheet.create({
  groupHorizontal: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
  },
  groupVertical: {
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
