import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { withAlpha } from "../utils";
import {
  Button,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from "./Button";
import { useFormField } from "./FormField";
import { Input, type InputProps } from "./Input";
import { Text } from "./Text";
import {
  hasActiveShadow,
  minTouchHitSlop,
  resolveControlRadius,
  type BaseGlassProps,
  type ComponentSize,
  type SizeProps,
} from "./types";

export type InputGroupAddonAlign =
  | "inline-start"
  | "inline-end"
  | "block-start"
  | "block-end";
export type InputGroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";
export type InputGroupOrientation = "inline" | "block";

interface ControlEntry {
  invalid: boolean;
  disabled: boolean;
}

interface InputGroupContextValue {
  orientation: InputGroupOrientation;
  focused: boolean;
  invalid: boolean;
  disabled: boolean;
  size: ComponentSize;
  setFocused: (focused: boolean) => void;
  registerControlState: (id: string, state: ControlEntry | null) => void;
}

const InputGroupContext = React.createContext<InputGroupContextValue | null>(
  null,
);

function useInputGroupContext() {
  return React.useContext(InputGroupContext);
}

export interface InputGroupProps
  extends ViewProps,
    SizeProps<ComponentSize>,
    BaseGlassProps {
  orientation?: InputGroupOrientation;
  invalid?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const InputGroup = React.memo(function InputGroup({
  orientation = "inline",
  size = "md",
  invalid = false,
  disabled = false,
  glass = false,
  style,
  children,
  ...props
}: InputGroupProps) {
  const { colors, components, radii, shadows } = useTheme();
  const field = useFormField();
  const [focused, setFocused] = React.useState(false);
  const [controls, setControls] = React.useState<Record<string, ControlEntry>>(
    {},
  );

  const registerControlState = React.useCallback(
    (id: string, next: ControlEntry | null) => {
      setControls((prev) => {
        const existing = prev[id];
        if (!next) {
          if (!existing) return prev;
          const copy = { ...prev };
          delete copy[id];
          return copy;
        }
        if (
          existing &&
          existing.invalid === next.invalid &&
          existing.disabled === next.disabled
        ) {
          return prev;
        }
        return { ...prev, [id]: next };
      });
    },
    [],
  );

  const anyChildInvalid = Object.values(controls).some((c) => c.invalid);
  const anyChildDisabled = Object.values(controls).some((c) => c.disabled);

  const isInvalid = invalid || Boolean(field?.invalid) || anyChildInvalid;
  const isDisabled = disabled || Boolean(field?.disabled) || anyChildDisabled;

  const borderColor = isDisabled
    ? colors.disabled
    : isInvalid
      ? colors.danger
      : focused
        ? colors.primary
        : glass
          ? colors.glassBorder
          : colors.border;

  const value = React.useMemo<InputGroupContextValue>(
    () => ({
      focused,
      orientation,
      invalid: isInvalid,
      disabled: isDisabled,
      size,
      setFocused,
      registerControlState,
    }),
    [
      focused,
      isDisabled,
      isInvalid,
      orientation,
      registerControlState,
      size,
    ],
  );

  const groupShadow = !isDisabled
    ? shadows[components.surface.inputShadow]
    : shadows.none;

  return (
    <InputGroupContext.Provider value={value}>
      <View
        accessibilityState={{ disabled: isDisabled }}
        style={[
          styles.group,
          {
            minHeight: components.input.height[size],
            borderRadius: resolveControlRadius("rounded", size, radii),
            borderWidth: focused
              ? components.borderWidth.focus
              : components.borderWidth.strong,
            borderColor,
            backgroundColor: isDisabled
              ? withAlpha(colors.disabled, 0.72)
              : glass
                ? colors.glassSurface
                : colors.input,
            flexDirection: orientation === "block" ? "column" : "row",
            alignItems: orientation === "block" ? "stretch" : "center",
            opacity: isDisabled ? 0.7 : 1,
            overflow: hasActiveShadow(groupShadow) ? "visible" : "hidden",
          },
          groupShadow,
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    </InputGroupContext.Provider>
  );
});

export interface InputGroupAddonProps extends ViewProps {
  align?: InputGroupAddonAlign;
  style?: StyleProp<ViewStyle>;
}

export const InputGroupAddon = React.memo(function InputGroupAddon({
  align = "inline-start",
  style,
  children,
  ...props
}: InputGroupAddonProps) {
  const { colors, components, spacing } = useTheme();
  const context = useInputGroupContext();
  const isBlock = align === "block-start" || align === "block-end";

  return (
    <View
      style={[
        {
          width: isBlock ? "100%" : undefined,
          minHeight: isBlock
            ? 38
            : components.input.height[context?.size ?? "md"],
          paddingHorizontal: isBlock ? spacing.md : spacing.sm,
          paddingVertical: isBlock ? spacing.xs : 0,
          alignItems: "center",
          justifyContent: isBlock ? "space-between" : "center",
          flexDirection: "row",
          gap: spacing.sm,
          borderTopWidth:
            align === "block-end" ? components.borderWidth.default : 0,
          borderBottomWidth:
            align === "block-start" ? components.borderWidth.default : 0,
          borderColor: colors.borderMuted,
          backgroundColor: isBlock
            ? colors.backgroundMuted
            : colors.transparent,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
});

export interface InputGroupButtonProps
  extends Omit<ButtonProps, "size" | "children"> {
  size?: InputGroupButtonSize;
  variant?: ButtonVariant;
  children?: React.ReactNode;
}

export const InputGroupButton = React.memo(function InputGroupButton({
  size = "xs",
  variant = "ghost",
  shape,
  disabled,
  hitSlop,
  children,
  style,
  ...props
}: InputGroupButtonProps) {
  const { radii, spacing } = useTheme();
  const context = useInputGroupContext();
  const isIcon = size === "icon-xs" || size === "icon-sm";
  const buttonSize: ButtonSize =
    size === "sm" || size === "icon-sm" ? "sm" : "xs";
  const minHeight = size === "sm" || size === "icon-sm" ? 36 : 30;
  const resolvedDisabled = disabled ?? Boolean(context?.disabled);

  return (
    <Button
      size={buttonSize}
      variant={variant}
      shape={shape ?? (isIcon ? "square" : "rounded")}
      disabled={resolvedDisabled}
      hitSlop={hitSlop ?? minTouchHitSlop(minHeight)}
      style={[
        {
          minWidth: isIcon ? minHeight : undefined,
          minHeight,
          paddingHorizontal: isIcon
            ? 0
            : size === "sm"
              ? spacing.md
              : spacing.sm,
          borderRadius: isIcon ? radii.sm : radii.md,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Button>
  );
});

export interface InputGroupTextProps extends ViewProps {
  textStyle?: StyleProp<TextStyle>;
}

export const InputGroupText = React.memo(function InputGroupText({
  style,
  textStyle,
  children,
  ...props
}: InputGroupTextProps) {
  const { spacing } = useTheme();
  const context = useInputGroupContext();

  return (
    <View
      style={[styles.textContainer, { gap: spacing.sm }, style]}
      {...props}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          variant="bodySmall"
          color={context?.disabled ? "disabledText" : "textMuted"}
          weight="500"
          style={textStyle}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
});

export interface InputGroupInputProps extends InputProps {}

export const InputGroupInput: React.NamedExoticComponent<
  InputGroupInputProps & React.RefAttributes<TextInputInstance>
> = React.memo(
  React.forwardRef<TextInputInstance, InputGroupInputProps>(
    function InputGroupInput(
      {
        invalid = false,
        disabled = false,
        editable,
        size,
        onFocus,
        onBlur,
        style,
        ...props
      },
      ref,
    ) {
      const { colors, components } = useTheme();
      const context = useInputGroupContext();
      const controlId = React.useId();

      const resolvedDisabled = disabled || Boolean(context?.disabled);
      const isEditable = resolvedDisabled ? false : (editable ?? true);
      const resolvedSize = size ?? context?.size ?? "md";
      const minHeight = Math.max(
        32,
        components.input.height[resolvedSize] - 4,
      );

      React.useEffect(() => {
        context?.registerControlState(controlId, {
          invalid,
          disabled: Boolean(disabled),
        });
        return () => {
          context?.registerControlState(controlId, null);
        };
      }, [context, controlId, disabled, invalid]);

      return (
        <Input
          ref={ref}
          size={resolvedSize}
          invalid={false}
          disabled={resolvedDisabled}
          editable={isEditable}
          fullWidth={false}
          onFocus={(event) => {
            context?.setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            context?.setFocused(false);
            onBlur?.(event);
          }}
          style={[
            {
              flex: context?.orientation === "block" ? undefined : 1,
              width: context?.orientation === "block" ? "100%" : undefined,
              borderWidth: 0,
              borderRadius: 0,
              backgroundColor: colors.transparent,
              minHeight,
            },
            style,
          ]}
          {...props}
        />
      );
    },
  ),
);

export interface InputGroupTextareaProps
  extends Omit<InputGroupInputProps, "multiline" | "type" | "secureTextEntry"> {}

export const InputGroupTextarea: React.NamedExoticComponent<
  InputGroupTextareaProps & React.RefAttributes<TextInputInstance>
> = React.memo(
  React.forwardRef<TextInputInstance, InputGroupTextareaProps>(
    function InputGroupTextarea({ style, ...props }, ref) {
      const { spacing } = useTheme();

      return (
        <InputGroupInput
          ref={ref}
          multiline
          textAlignVertical="top"
          style={[
            {
              minHeight: 96,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + spacing.xxs,
            },
            style,
          ]}
          {...props}
        />
      );
    },
  ),
);

const styles = StyleSheet.create({
  group: {
    width: "100%",
  },
  textContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
