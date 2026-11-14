import React from "react";
import {
  type TextInputInstance,
  type TextInputProps,
} from "react-native";

import { Input, type InputProps } from "./Input";

export interface TextareaProps extends Omit<InputProps, "multiline"> {
  minRows?: number;
}

export const Textarea: (
  props: TextareaProps & { ref?: React.Ref<TextInputInstance> },
) => React.ReactNode = React.forwardRef<TextInputInstance, TextareaProps>(
  function Textarea({ minRows = 4, size = "md", style, ...props }, ref) {
  const minHeight = size === "lg" ? 132 : size === "sm" ? 84 : 108;

  return (
    <Input
      ref={ref as never}
        multiline
        size={size}
        textAlignVertical="top"
        style={[
          {
            minHeight: Math.max(minRows * 24, minHeight),
            paddingVertical: 10,
          },
          style,
        ]}
        {...(props as TextInputProps)}
      />
    );
  },
);
