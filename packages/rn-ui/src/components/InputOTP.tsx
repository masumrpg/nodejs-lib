import React from "react";
import {
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type AppStateStatus,
  type PressableProps,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../theme";
import { useFormField } from "./FormField";
import {
  minTouchHitSlop,
  resolveControlRadius,
  type BaseGlassProps,
  type ComponentSize,
  type SizeProps,
} from "./types";

export type InputOTPSize = ComponentSize;

export interface InputOTPSlotState {
  char: string;
  hasFakeCaret: boolean;
  isActive: boolean;
}

export interface InputOTPContextValue {
  slots: InputOTPSlotState[];
  size: InputOTPSize;
  disabled: boolean;
  invalid: boolean;
  focused: boolean;
  glass: boolean;
  focus: () => void;
}

export const InputOTPContext = React.createContext<InputOTPContextValue | null>(
  null,
);

export interface InputOTPProps
  extends Omit<PressableProps, "children" | "style">,
    SizeProps<InputOTPSize>,
    BaseGlassProps {
  children: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChangeText?: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  textInputProps?: Omit<
    TextInputProps,
    "value" | "defaultValue" | "onChangeText" | "maxLength" | "editable"
  >;
  style?: StyleProp<ViewStyle>;
}

function normalizeValue(value: string, maxLength: number) {
  return value.replace(/\s/g, "").slice(0, maxLength);
}

export const InputOTP = React.memo(function InputOTP({
  children,
  value,
  defaultValue = "",
  onChangeText,
  maxLength = 6,
  size = "md",
  disabled = false,
  invalid = false,
  glass = false,
  autoFocus,
  textInputProps,
  hitSlop,
  style,
  onPress,
  ...props
}: InputOTPProps) {
  const { colors, components } = useTheme();
  const field = useFormField();
  const inputRef = React.useRef<TextInputInstance>(null);
  const [focused, setFocused] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(() =>
    normalizeValue(defaultValue, maxLength),
  );

  const isDisabled = disabled || Boolean(field?.disabled);
  const isInvalid = invalid || Boolean(field?.invalid);
  const currentValue = normalizeValue(value ?? internalValue, maxLength);
  const activeIndex = Math.min(currentValue.length, Math.max(0, maxLength - 1));

  const handleChangeText = React.useCallback(
    (nextValue: string) => {
      const normalized = normalizeValue(nextValue, maxLength);
      if (value === undefined) {
        setInternalValue(normalized);
      }
      onChangeText?.(normalized);
    },
    [maxLength, onChangeText, value],
  );

  const focus = React.useCallback(() => {
    if (!isDisabled) {
      inputRef.current?.focus();
    }
  }, [isDisabled]);

  const slots = React.useMemo<InputOTPSlotState[]>(
    () =>
      Array.from({ length: maxLength }, (_, index) => {
        const char = currentValue[index] ?? "";
        const isActive = focused && index === activeIndex;

        return {
          char,
          isActive,
          hasFakeCaret: isActive && !char,
        };
      }),
    [activeIndex, currentValue, focused, maxLength],
  );

  const context = React.useMemo<InputOTPContextValue>(
    () => ({
      slots,
      size,
      disabled: isDisabled,
      invalid: isInvalid,
      focused,
      glass,
      focus,
    }),
    [focus, focused, glass, isDisabled, isInvalid, size, slots],
  );

  const slotHeight = components.inputOTP.height[size];
  const {
    onFocus: userOnFocus,
    onBlur: userOnBlur,
    style: userInputStyle,
    ...restTextInputProps
  } = textInputProps ?? {};

  return (
    <InputOTPContext.Provider value={context}>
      <Pressable
        accessibilityRole="none"
        accessibilityLabel={props.accessibilityLabel ?? "One-time passcode input"}
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        hitSlop={hitSlop ?? minTouchHitSlop(slotHeight)}
        onPress={(event) => {
          focus();
          onPress?.(event);
        }}
        style={[
          styles.wrapper,
          { opacity: isDisabled ? 0.5 : 1 },
          style,
        ]}
        {...props}
      >
        {children}
        <TextInput
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          caretHidden
          spellCheck={false}
          {...restTextInputProps}
          ref={inputRef}
          value={currentValue}
          maxLength={maxLength}
          editable={!isDisabled}
          autoFocus={autoFocus}
          onChangeText={handleChangeText}
          onFocus={(event) => {
            setFocused(true);
            userOnFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            userOnBlur?.(event);
          }}
          style={[
            styles.hiddenInput,
            { color: colors.transparent },
            userInputStyle,
          ]}
        />
      </Pressable>
    </InputOTPContext.Provider>
  );
});

export interface InputOTPGroupProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const InputOTPGroup = React.memo(function InputOTPGroup({
  style,
  ...props
}: InputOTPGroupProps) {
  const { radii, spacing } = useTheme();

  return (
    <View
      style={[
        styles.group,
        {
          borderRadius: radii.md,
          gap: spacing.sm,
        },
        style,
      ]}
      {...props}
    />
  );
});

export interface InputOTPSlotProps extends ViewProps, BaseGlassProps {
  index: number;
  size?: InputOTPSize;
  style?: StyleProp<ViewStyle>;
}

export const InputOTPSlot = React.memo(function InputOTPSlot({
  index,
  size,
  glass,
  style,
  ...props
}: InputOTPSlotProps) {
  const { colors, components, radii, shadows } = useTheme();
  const context = React.useContext(InputOTPContext);
  const slot = context?.slots[index];
  const effectiveSize = size ?? context?.size ?? "md";
  const resolvedGlass = glass ?? context?.glass ?? false;
  const otpTokens = components.inputOTP;
  const slotShadow = !context?.disabled
    ? shadows[components.surface.inputShadow]
    : shadows.none;

  return (
    <View
      accessibilityState={{ selected: slot?.isActive }}
      style={[
        styles.slot,
        {
          width: otpTokens.width[effectiveSize],
          height: otpTokens.height[effectiveSize],
          borderWidth:
            slot?.isActive || context?.invalid
              ? components.borderWidth.focus
              : components.borderWidth.strong,
          borderColor: context?.invalid
            ? colors.danger
            : slot?.isActive
              ? colors.primary
              : resolvedGlass
                ? colors.glassBorder
                : colors.border,
          borderRadius: resolveControlRadius("rounded", effectiveSize, radii),
          backgroundColor: resolvedGlass ? colors.glassSurface : colors.input,
        },
        slotShadow,
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.slotChar,
          {
            fontSize: otpTokens.fontSize[effectiveSize],
            color: context?.disabled ? colors.disabledText : colors.text,
          },
        ]}
      >
        {slot?.char}
      </Text>
      {slot?.hasFakeCaret ? (
        <InputOTPCaret height={otpTokens.caretHeight[effectiveSize]} />
      ) : null}
    </View>
  );
});

function InputOTPCaret({ height }: { height: number }) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [appActive, setAppActive] = React.useState(
    AppState.currentState === "active",
  );
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        setAppActive(next === "active");
      },
    );
    return () => {
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (reducedMotion || !appActive) {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }

    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [appActive, opacity, reducedMotion]);

  const caretStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.caret,
        {
          height,
          backgroundColor: colors.primary,
        },
        caretStyle,
      ]}
    />
  );
}

export interface InputOTPSeparatorProps extends ViewProps {
  style?: StyleProp<ViewStyle>;
}

export const InputOTPSeparator = React.memo(function InputOTPSeparator({
  style,
  children,
  ...props
}: InputOTPSeparatorProps) {
  const { colors } = useTheme();

  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[styles.separator, style]}
      {...props}
    >
      {children ?? (
        <View
          style={[styles.separatorLine, { backgroundColor: colors.textMuted }]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  slot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  slotChar: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  caret: {
    position: "absolute",
    width: 2,
    borderRadius: 1,
  },
  separator: {
    width: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  separatorLine: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
});
