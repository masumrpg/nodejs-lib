import { beforeEach, describe, expect, it, mock } from "bun:test";
import React from "react";

import {
  AlertDialog,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Command,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SpeedDial,
  ThemeProvider,
  ToastProvider,
  Tooltip,
  computeAnchoredPosition,
  useToast,
} from "../src";
import { act, collectText, findAllNodes, mockUiState, renderUI } from "./setup";

function wrap(node: React.ReactElement) {
  return React.createElement(ThemeProvider, null, node);
}

describe("overlays, portals, toasts & anchored menus", () => {
  beforeEach(() => {
    mockUiState.reset();
  });

  it("auto-flips and clamps anchored overlay coordinates inside viewport bounds", () => {
    const nearBottomRight = computeAnchoredPosition({
      anchor: { x: 340, y: 780, width: 40, height: 40 },
      contentWidth: 220,
      contentHeight: 200,
      windowWidth: 390,
      windowHeight: 844,
      preferredPlacement: "bottom",
      align: "start",
      offset: 8,
      viewportPadding: 12,
    });

    expect(nearBottomRight.resolvedPlacement).toBe("top");
    expect(nearBottomRight.top).toBeLessThan(780);
    expect(nearBottomRight.left).toBeLessThanOrEqual(390 - 220 - 12);
    expect(nearBottomRight.left).toBeGreaterThanOrEqual(12);
  });

  it("renders SpeedDial actions inside Portal with clickable buttons when open", () => {
    const onCreate = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(SpeedDial, {
          open: true,
          overlay: true,
          actions: [
            {
              id: "create",
              label: "Create Note",
              icon: React.createElement("rn-view", null),
              onPress: onCreate,
            },
          ],
        }),
      ),
    );

    expect(collectText(container)).toContain("Create Note");
    const actionBtn = findAllNodes(
      container,
      (n) => n.type === "rn-pressable" && n.props?.accessibilityLabel === "Create Note",
    )[0];
    expect(actionBtn).toBeDefined();
    (actionBtn?.props?.onPress as (() => void) | undefined)?.();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("opens Select inside Portal without closing on disabled options", () => {
    const onChange = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(Select, {
          placeholder: "Pick fruit",
          onValueChange: onChange,
          options: [
            { label: "Apple", value: "apple" },
            { label: "Banana", value: "banana", disabled: true },
          ],
        }),
      ),
    );

    const trigger = findAllNodes(
      container,
      (n) => n.type === "rn-pressable" && n.props?.accessibilityLabel === "Pick fruit",
    )[0];
    expect(trigger).toBeDefined();
    act(() => {
      (trigger?.props?.onPress as (() => void) | undefined)?.();
    });

    const text = collectText(container);
    expect(text).toContain("Apple");
    expect(text).toContain("Banana");

    const appleRow = findAllNodes(
      container,
      (n) =>
        n.type === "rn-pressable" &&
        n.props?.accessibilityRole === "menuitem" &&
        collectText(n).includes("Apple"),
    )[0];
    act(() => {
      (appleRow?.props?.onPress as (() => void) | undefined)?.();
    });
    expect(onChange).toHaveBeenCalledWith("apple");
  });

  it("shows ComboboxEmpty only when no items match query", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          Combobox,
          { open: true },
          React.createElement(ComboboxInput, { placeholder: "Search city" }),
          React.createElement(
            ComboboxContent,
            null,
            React.createElement(
              ComboboxList,
              null,
              React.createElement(ComboboxItem, {
                value: "jkt",
                label: "Jakarta",
              }),
              React.createElement(ComboboxEmpty, null, "Nothing matched"),
            ),
          ),
        ),
      ),
    );

    expect(collectText(container)).toContain("Jakarta");
    expect(collectText(container)).not.toContain("Nothing matched");
  });

  it("supports Toast outline variant and AlertDialog / Command rendering", () => {
    let api: ReturnType<typeof useToast> | null = null;
    function Driver() {
      api = useToast();
      return null;
    }

    const { container } = renderUI(
      wrap(
        React.createElement(
          ToastProvider,
          { variant: "outline" },
          React.createElement(Driver, null),
          React.createElement(AlertDialog, {
            visible: true,
            title: "Confirm Action",
            confirmText: "Proceed",
            cancelText: "Cancel",
            onConfirm: () => {},
            onCancel: () => {},
          }),
          React.createElement(Command, {
            visible: true,
            items: [{ value: "open", label: "Open File", group: "File" }],
            onClose: () => {},
          }),
        ),
      ),
    );

    expect(collectText(container)).toContain("Confirm Action");
    expect(collectText(container)).toContain("Open File");
    expect(api).not.toBeNull();
    let id = "";
    act(() => {
      id = api!.show({ title: "Saved", variant: "outline", duration: 0 });
    });
    expect(id.length).toBeGreaterThan(0);
    expect(collectText(container)).toContain("Saved");
    act(() => {
      api!.dismiss(id);
    });
  });

  it("preserves child disabled state in DropdownMenu and mounts Popover / Tooltip / HoverCard / ContextMenu", () => {
    const childPress = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            DropdownMenu,
            null,
            React.createElement(
              DropdownMenuTrigger,
              null,
              React.createElement("rn-pressable", {
                disabled: true,
                accessibilityLabel: "Disabled trigger",
                onPress: childPress,
              }),
            ),
            React.createElement(
              DropdownMenuContent,
              null,
              React.createElement(DropdownMenuItem, null, "Action"),
            ),
          ),
          React.createElement(
            Popover,
            { open: true },
            React.createElement(PopoverTrigger, null, "Open"),
            React.createElement(PopoverContent, null, "Popover Body"),
          ),
          React.createElement(
            Tooltip,
            { content: "Tip Text", tone: "secondary", visible: true },
            React.createElement("rn-text", null, "Info"),
          ),
          React.createElement(
            HoverCard,
            { open: true },
            React.createElement(HoverCardTrigger, null, "Profile"),
            React.createElement(HoverCardContent, null, "Hover Details"),
          ),
          React.createElement(
            DropdownMenu,
            { open: true },
            React.createElement(DropdownMenuTrigger, null, "Menu Trigger"),
            React.createElement(
              DropdownMenuContent,
              null,
              React.createElement(DropdownMenuItem, null, "Menu Item"),
            ),
          ),
          React.createElement(
            ContextMenu,
            { open: true },
            React.createElement(ContextMenuTrigger, null, "Row"),
            React.createElement(
              ContextMenuContent,
              null,
              React.createElement(ContextMenuItem, null, "Inspect"),
            ),
          ),
        ),
      ),
    );

    const disabledNode = findAllNodes(
      container,
      (n) => n.props?.accessibilityLabel === "Disabled trigger",
    )[0];
    expect(disabledNode?.props?.disabled).toBe(true);
    expect(collectText(container)).toContain("Popover Body");
    expect(collectText(container)).toContain("Hover Details");
    expect(collectText(container)).toContain("Menu Item");
    expect(collectText(container)).toContain("Inspect");
  });
});
