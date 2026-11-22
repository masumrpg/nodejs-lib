import React from "react";
import {
  TextInput,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { useTheme } from "../theme";
import { withAlpha } from "../utils";
import { useFormField } from "./FormField";
import {
  minTouchHitSlop,
  resolveControlRadius,
  type BaseGlassProps,
  type ComponentShape,
  type ComponentSize,
  type ShapeProps,
  type SizeProps,
} from "./types";

export type InputSize = ComponentSize;
export type InputType =
  | "text"
  | "email"
  | "number"
  | "password"
  | "tel"
  | "url";

export interface InputProps
  extends Omit<TextInputProps, "style">,
    SizeProps<InputSize>,
    ShapeProps<ComponentShape>,
    BaseGlassProps {
  type?: InputType;
  invalid?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<TextStyle>;
}

function getKeyboardType(type: InputType): KeyboardTypeOptions {
  if (type === "email") return "email-address";
  if (type === "number") return "numeric";
  if (type === "tel") return "phone-pad";
  if (type === "url") return "url";
  return "default";
}

export const Input: React.NamedExoticComponent<
  InputProps & React.RefAttributes<TextInputInstance>
> = React.memo(
  React.forwardRef<TextInputInstance, InputProps>(function Input(
    {
      type = "text",
      size = "md",
      shape = "rounded",
      invalid = false,
      disabled = false,
      fullWidth = true,
      glass = false,
      editable,
      multiline,
      hitSlop,
      onFocus,
      onBlur,
      keyboardType,
      secureTextEntry,
      placeholderTextColor,
      accessibilityState,
      style,
      ...props
    },
    ref,
  ) {
    const { colors, components, typography, radii, shadows } = useTheme();
    const field = useFormField();
    const [focused, setFocused] = React.useState(false);

    const isInvalid = invalid || Boolean(field?.invalid);
    const isDisabled = disabled || Boolean(field?.disabled);
    const isReadOnly = !isDisabled && editable === false;
    const isEditable = isDisabled ? false : (editable ?? true);

    const inputTokens = components.input;
    const height = inputTokens.height[size];
    const paddingX = inputTokens.paddingX[size];

    const borderRadius = resolveControlRadius(shape, size, radii);

    const borderColor = isDisabled
      ? colors.disabled
      : isInvalid
        ? colors.danger
        : focused
          ? colors.primary
          : glass
            ? colors.glassBorder
            : colors.border;

    const backgroundColor = isDisabled
      ? withAlpha(colors.disabled, 0.72)
      : isReadOnly
        ? colors.backgroundMuted
        : glass
          ? colors.glassSurface
          : colors.input;

    const textStyle =
      size === "xs" || size === "sm" ? typography.bodySmall : typography.body;
    const inputShadow = !isDisabled
      ? shadows[components.surface.inputShadow]
      : shadows.none;

    return (
      <TextInput
        ref={ref}
        editable={isEditable}
        keyboardType={keyboardType ?? getKeyboardType(type)}
        secureTextEntry={secureTextEntry ?? type === "password"}
        placeholderTextColor={placeholderTextColor ?? colors.placeholder}
        accessibilityState={{ disabled: isDisabled, ...accessibilityState }}
        hitSlop={hitSlop ?? minTouchHitSlop(height)}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          textStyle,
          {
            width: fullWidth ? "100%" : undefined,
            minHeight: multiline ? height * 2 : height,
            paddingHorizontal: paddingX,
            paddingVertical: multiline ? 10 : 0,
            borderRadius,
            borderWidth:
              focused || isInvalid
                ? components.borderWidth.focus
                : components.borderWidth.strong,
            borderColor,
            backgroundColor,
            color: isDisabled ? colors.disabledText : colors.text,
            opacity: isDisabled ? 0.65 : isReadOnly ? 0.9 : 1,
            textAlignVertical: multiline ? "top" : "center",
          },
          inputShadow,
          style,
        ]}
        {...props}
      />
    );
  }),
);
