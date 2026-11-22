import React from "react";
import type { TextInputInstance } from "react-native";

import { useTheme } from "../theme";
import { Input, type InputProps } from "./Input";
import type { ComponentSize } from "./types";

export interface TextareaProps
  extends Omit<InputProps, "multiline" | "type" | "secureTextEntry"> {
  minRows?: number;
}

const ROW_MULTIPLIER: Record<ComponentSize, number> = {
  xs: 18,
  sm: 20,
  md: 24,
  lg: 26,
  xl: 28,
};

export const Textarea: React.NamedExoticComponent<
  TextareaProps & React.RefAttributes<TextInputInstance>
> = React.memo(
  React.forwardRef<TextInputInstance, TextareaProps>(function Textarea(
    { minRows = 4, size = "md", style, ...props },
    ref,
  ) {
    const { spacing, typography } = useTheme();
    const safeRows = Math.max(1, Math.round(minRows));
    const lineHeight = ROW_MULTIPLIER[size] ?? typography.body.lineHeight;
    const minHeight = safeRows * lineHeight + spacing.lg;

    return (
      <Input
        ref={ref}
        multiline
        size={size}
        textAlignVertical="top"
        style={[
          {
            minHeight,
            paddingVertical: spacing.sm + spacing.xxs,
          },
          style,
        ]}
        {...props}
      />
    );
  }),
);
