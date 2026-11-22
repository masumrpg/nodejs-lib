import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { Label, type LabelProps } from "./Label";
import { Text } from "./Text";
import {
  renderIcon,
  type BaseHapticProps,
  type RenderIcon,
} from "./types";

export interface FormFieldContextValue {
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  error?: string;
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(
  null,
);

export function useFormField() {
  return React.useContext(FormFieldContext);
}

export interface FormFieldProps extends ViewProps, BaseHapticProps {
  invalid?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  shakeOnError?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const FormField = React.memo(function FormField({
  invalid: explicitInvalid,
  disabled = false,
  required = false,
  error,
  shakeOnError = true,
  haptic = true,
  style,
  ...props
}: FormFieldProps) {
  const { spacing } = useTheme();
  const reducedMotion = useReducedMotion();
  const shakeX = useSharedValue(0);

  const invalid = explicitInvalid ?? Boolean(error);
  const hasMountedRef = React.useRef(false);
  const prevInvalidRef = React.useRef(invalid);
  const prevErrorRef = React.useRef(error);

  React.useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevInvalidRef.current = invalid;
      prevErrorRef.current = error;
      return;
    }

    const becameInvalid = invalid && !prevInvalidRef.current;
    const errorMessageChanged =
      invalid && Boolean(error) && error !== prevErrorRef.current;

    prevInvalidRef.current = invalid;
    prevErrorRef.current = error;

    if ((becameInvalid || errorMessageChanged) && shakeOnError) {
      if (haptic) triggerHaptic("error");
      if (!reducedMotion) {
        shakeX.value = withSequence(
          withTiming(8, { duration: 45 }),
          withTiming(-8, { duration: 45 }),
          withTiming(6, { duration: 45 }),
          withTiming(-6, { duration: 45 }),
          withTiming(0, { duration: 45 }),
        );
      }
    }
  }, [error, haptic, invalid, reducedMotion, shakeOnError, shakeX]);

  React.useEffect(() => {
    return () => {
      cancelAnimation(shakeX);
    };
  }, [shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const value = React.useMemo<FormFieldContextValue>(
    () => ({ invalid, disabled, required, error }),
    [disabled, invalid, required, error],
  );

  return (
    <FormFieldContext.Provider value={value}>
      <Animated.View
        style={[
          styles.field,
          { gap: spacing.xs },
          animatedStyle,
          style,
        ]}
        {...props}
      />
    </FormFieldContext.Provider>
  );
});

export interface FormLabelProps extends LabelProps {}

export const FormLabel = React.memo(function FormLabel(props: FormLabelProps) {
  const field = useFormField();

  return (
    <Label
      invalid={field?.invalid}
      disabled={field?.disabled}
      required={field?.required}
      {...props}
    />
  );
});

export interface FormControlProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const FormControl = React.memo(function FormControl({
  style,
  ...props
}: FormControlProps) {
  return <View style={[styles.control, style]} {...props} />;
});

export interface FormDescriptionProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const FormDescription = React.memo(function FormDescription({
  children,
  style,
}: FormDescriptionProps) {
  return (
    <Text variant="bodySmall" color="textMuted" style={style}>
      {children}
    </Text>
  );
});

export interface FormErrorProps {
  children?: React.ReactNode;
  icon?: RenderIcon;
  style?: StyleProp<TextStyle>;
}

export const FormError = React.memo(function FormError({
  children,
  icon,
  style,
}: FormErrorProps) {
  const { colors, spacing } = useTheme();
  const field = useFormField();
  const content = children ?? field?.error;

  if (!content) return null;

  const isErrorState = field ? field.invalid : true;
  const foregroundColor = isErrorState ? colors.danger : colors.textMuted;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.errorRow, { gap: spacing.xs }]}
    >
      {icon ? renderIcon(icon, foregroundColor, 14) : null}
      <Text
        variant="bodySmall"
        color={isErrorState ? "danger" : "textMuted"}
        style={[styles.errorText, style]}
      >
        {content}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    width: "100%",
  },
  control: {
    width: "100%",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  errorText: {
    flexShrink: 1,
  },
});
