import { beforeEach, describe, expect, it, mock } from "bun:test";
import React from "react";

import {
  Checkbox,
  FormControl,
  FormError,
  FormField,
  FormLabel,
  Input,
  InputGroup,
  InputGroupInput,
  InputOTP,
  InputOTPSlot,
  RadioGroup,
  RadioGroupItem,
  RangeSlider,
  Rating,
  SearchBar,
  Slider,
  Stepper,
  Switch,
  ThemeProvider,
  lightTheme,
} from "../src";
import { act, collectText, findAllNodes, mockUiState, renderUI } from "./setup";

function wrap(node: React.ReactElement) {
  return React.createElement(ThemeProvider, null, node);
}

describe("forms, controls & input components", () => {
  beforeEach(() => {
    mockUiState.reset();
  });

  it("propagates FormField invalid and disabled state into Input and FormError", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          FormField,
          { invalid: true, disabled: true, required: true },
          React.createElement(FormLabel, null, "Email"),
          React.createElement(
            FormControl,
            null,
            React.createElement(Input, { placeholder: "masum@example.com" }),
          ),
          React.createElement(FormError, null, "Invalid email"),
        ),
      ),
    );

    const text = collectText(container);
    expect(text).toContain("Email");
    expect(text).toContain("Invalid email");

    const textInputs = findAllNodes(container, (n) => n.type === "rn-textinput");
    expect(textInputs[0]?.props?.editable).toBe(false);
    expect(textInputs[0]?.props?.accessibilityState).toEqual({ disabled: true });
  });

  it("blocks Checkbox, Switch, and RadioGroup callbacks when disabled", () => {
    const onCheckbox = mock(() => {});
    const onSwitch = mock(() => {});
    const onRadio = mock(() => {});

    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Checkbox, {
            checked: false,
            disabled: true,
            onCheckedChange: onCheckbox,
          }),
          React.createElement(Switch, {
            value: false,
            disabled: true,
            onValueChange: onSwitch,
          }),
          React.createElement(
            RadioGroup,
            { value: "a", disabled: true, onValueChange: onRadio },
            React.createElement(RadioGroupItem, { value: "a", label: "A" }),
            React.createElement(RadioGroupItem, { value: "b", label: "B" }),
          ),
        ),
      ),
    );

    const pressables = findAllNodes(container, (n) => n.type === "rn-pressable");
    for (const p of pressables) {
      const fn = p.props?.onPress as (() => void) | undefined;
      fn?.();
    }

    expect(onCheckbox).toHaveBeenCalledTimes(0);
    expect(onSwitch).toHaveBeenCalledTimes(0);
    expect(onRadio).toHaveBeenCalledTimes(0);
  });

  it("increments and decrements Stepper cleanly without floating point drift", () => {
    const values: number[] = [];
    const { container } = renderUI(
      wrap(
        React.createElement(Stepper, {
          value: 0.1,
          step: 0.2,
          min: 0,
          max: 1,
          onValueChange: (val: number) => values.push(val),
        }),
      ),
    );

    const buttons = findAllNodes(container, (n) => n.type === "rn-pressable");
    const incBtn = buttons.find((b) =>
      String(b.props?.accessibilityLabel ?? "").toLowerCase().includes("increment"),
    );
    expect(incBtn).toBeDefined();
    act(() => {
      (incBtn?.props?.onPress as (() => void) | undefined)?.();
    });

    expect(values).toEqual([0.3]);
  });

  it("supports InputOTP, InputGroup, Slider, RangeSlider, Rating, and SearchBar without errors", () => {
    const onRangeChange = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            InputGroup,
            null,
            React.createElement(InputGroupInput, { placeholder: "Username" }),
          ),
          React.createElement(
            InputOTP,
            { maxLength: 4, value: "12" },
            React.createElement(InputOTPSlot, { index: 0 }),
            React.createElement(InputOTPSlot, { index: 1 }),
            React.createElement(InputOTPSlot, { index: 2 }),
            React.createElement(InputOTPSlot, { index: 3 }),
          ),
          React.createElement(Slider, { value: 40, min: 0, max: 100 }),
          React.createElement(RangeSlider, {
            value: [10, 10],
            min: 10,
            max: 100,
            onValueChange: onRangeChange,
          }),
          React.createElement(Rating, { value: 3, max: 5, allowClear: true }),
          React.createElement(SearchBar, { placeholder: "Search components" }),
        ),
      ),
    );

    expect(collectText(container)).toContain("1");
    expect(collectText(container)).toContain("2");
    expect(mockUiState.withSpringCallCount).toBe(0);
  });

  it("renders Switch with unified fluid oval proportions, centered wrapper, and toggle callback", () => {
    const onValueChange = mock((_next: boolean) => {});
    const { container } = renderUI(
      wrap(
        React.createElement(Switch, {
          value: false,
          onValueChange,
          accessibilityLabel: "Notifications",
        }),
      ),
    );

    const pressable = findAllNodes(
      container,
      (n) => n.props?.accessibilityRole === "switch",
    )[0];
    expect(pressable).toBeDefined();
    const wrapperStyle =
      (pressable?.props?.style as Record<string, unknown> | undefined) ?? {};
    expect(wrapperStyle.alignSelf).toBeUndefined();

    const animViews = pressable
      ? findAllNodes(pressable, (n) => n.type === "anim-view")
      : [];
    const trackStyle =
      (animViews[0]?.props?.style as Record<string, unknown> | undefined) ?? {};
    const thumbStyle =
      (animViews[1]?.props?.style as Record<string, unknown> | undefined) ?? {};

    expect(Number(trackStyle.width)).toBeGreaterThan(
      Number(trackStyle.height) * 1.7,
    );
    expect(trackStyle.borderRadius).toBe(lightTheme.radii.full);
    expect(Number(thumbStyle.width)).toBeGreaterThan(Number(thumbStyle.height));
    expect(thumbStyle.borderRadius).toBe(lightTheme.radii.full);

    act(() => {
      (pressable?.props?.onPress as (() => void) | undefined)?.();
    });

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(true);
    expect(mockUiState.withSpringCallCount).toBe(0);
  });
});
