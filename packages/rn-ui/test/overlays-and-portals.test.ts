import { beforeEach, describe, expect, it, mock } from "bun:test";
import React from "react";

import {
  AlertDialog,
  Button,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
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
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SpeedDial,
  ThemeProvider,
  Toast,
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
    expect(mockUiState.withSpringCallCount).toBe(0);
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

  it("supports Toast outline variant and AlertDialog rendering", () => {
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
        ),
      ),
    );

    expect(collectText(container)).toContain("Confirm Action");
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

  it("renders AlertDialog via Portal by default and non-scrollable, with scrollable opt-in and modal fallback", () => {
    const { container, unmount } = renderUI(
      wrap(
        React.createElement(AlertDialog, {
          visible: true,
          title: "Delete File",
          description: "Are you sure you want to delete this file?",
          confirmText: "Delete",
          cancelText: "Cancel",
          onConfirm: () => {},
          onCancel: () => {},
        }),
      ),
    );

    expect(collectText(container)).toContain("Delete File");
    expect(collectText(container)).toContain(
      "Are you sure you want to delete this file?",
    );
    const scrollViews = findAllNodes(
      container,
      (n) => n.type === "rn-scrollview",
    );
    expect(scrollViews.length).toBe(0);
    unmount();

    const { container: scrollContainer, unmount: unmountScroll } = renderUI(
      wrap(
        React.createElement(AlertDialog, {
          visible: true,
          scrollable: true,
          title: "Terms and Conditions",
          description: "Long text here...",
          confirmText: "Accept",
        }),
      ),
    );
    const scrollViewsWithScrollable = findAllNodes(
      scrollContainer,
      (n) => n.type === "rn-scrollview",
    );
    expect(scrollViewsWithScrollable.length).toBe(1);
    unmountScroll();

    const { container: modalContainer } = renderUI(
      wrap(
        React.createElement(AlertDialog, {
          visible: true,
          portal: false,
          title: "Modal Fallback",
          description: "Renders in native modal",
        }),
      ),
    );
    const modals = findAllNodes(modalContainer, (n) => n.type === "rn-modal");
    expect(modals.length).toBe(1);
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

  it("compensates PortalHost window offset in Select positioning and clips menu rows inside rounded corners", () => {
    mockUiState.portalHostOffset = { x: 0, y: -48 };
    mockUiState.anchorRect = { x: 36, y: 252, width: 318, height: 44 };

    const { container } = renderUI(
      wrap(
        React.createElement(Select, {
          placeholder: "Anchor Select",
          options: [
            { label: "First", value: "first", description: "One" },
            { label: "Second", value: "second", description: "Two" },
          ],
        }),
      ),
    );

    const trigger = findAllNodes(
      container,
      (n) =>
        n.type === "rn-pressable" &&
        n.props?.accessibilityLabel === "Anchor Select",
    )[0];
    expect(trigger).toBeDefined();

    act(() => {
      (trigger?.props?.onPress as (() => void) | undefined)?.();
    });

    const menuNode = findAllNodes(
      container,
      (n) => n.type === "anim-view" && n.props?.accessibilityRole === "menu",
    )[0];
    expect(menuNode).toBeDefined();
    const menuStyle =
      (menuNode?.props?.style as Record<string, unknown> | undefined) ?? {};
    // Adjusted anchor y = 252 - (-48) = 300; top = 300 + 44 (height) + 6 (offset) = 350
    expect(menuStyle.top).toBe(350);
    expect(menuStyle.left).toBe(36);

    const clippedInner = menuNode
      ? findAllNodes(
          menuNode,
          (n) =>
            n.type === "rn-view" &&
            (n.props?.style as Record<string, unknown> | undefined)?.overflow ===
              "hidden",
        )[0]
      : undefined;
    expect(clippedInner).toBeDefined();
  });

  it("opens Popover when pressing inner Button trigger without nested Pressable swallowing", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          Popover,
          null,
          React.createElement(
            PopoverTrigger,
            null,
            React.createElement(Button, null, "Toggle Popover"),
          ),
          React.createElement(PopoverContent, null, "Popover Content"),
        ),
      ),
    );

    expect(collectText(container)).not.toContain("Popover Content");
    const buttonTrigger = findAllNodes(
      container,
      (n) => n.type === "rn-pressable" && collectText(n).includes("Toggle Popover"),
    )[0];
    expect(buttonTrigger).toBeDefined();

    act(() => {
      (buttonTrigger?.props?.onPress as ((e: unknown) => void) | undefined)?.({});
    });

    expect(collectText(container)).toContain("Popover Content");
  });

  it("opens Tooltip on longPress of Button and on press of IconButton", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Tooltip,
            { content: "Hold Tip", triggerMode: "longPress" },
            React.createElement(Button, null, "Left Edge"),
          ),
          React.createElement(
            Tooltip,
            { content: "Tap Tip", triggerMode: "press" },
            React.createElement(IconButton, {
              accessibilityLabel: "Inspect key",
              icon: React.createElement("rn-view", null),
            }),
          ),
        ),
      ),
    );

    const holdBtn = findAllNodes(
      container,
      (n) => n.type === "rn-pressable" && collectText(n).includes("Left Edge"),
    )[0];
    expect(holdBtn).toBeDefined();

    act(() => {
      (holdBtn?.props?.onLongPress as ((e: unknown) => void) | undefined)?.({});
    });
    expect(collectText(container)).toContain("Hold Tip");

    const tapBtn = findAllNodes(
      container,
      (n) =>
        n.type === "rn-pressable" &&
        n.props?.accessibilityLabel === "Inspect key",
    )[0];
    expect(tapBtn).toBeDefined();

    act(() => {
      (tapBtn?.props?.onPress as ((e: unknown) => void) | undefined)?.({});
    });
    expect(collectText(container)).toContain("Tap Tip");
  });

  it("renders non-overlapping Toast cards capped cleanly and slides top toasts from off-screen", () => {
    let api: ReturnType<typeof useToast> | null = null;
    function Driver() {
      api = useToast();
      return null;
    }

    const { container } = renderUI(
      wrap(
        React.createElement(
          ToastProvider,
          { placement: "top" },
          React.createElement(Driver, null),
        ),
      ),
    );

    act(() => {
      api!.show({ title: "Toast 1", duration: 0 });
      api!.show({ title: "Toast 2", duration: 0 });
      api!.show({ title: "Toast 3", duration: 0 });
      api!.show({ title: "Toast 4", duration: 0 });
    });

    const alerts = findAllNodes(
      container,
      (n) => n.type === "anim-view" && n.props?.accessibilityRole === "alert",
    );
    expect(alerts.length).toBe(3);
    for (const alertNode of alerts) {
      const st = (alertNode.props?.style as Record<string, unknown> | undefined) ?? {};
      expect(st.position).toBe("absolute");
    }

    const closedTopToast = renderUI(
      wrap(
        React.createElement(Toast, {
          placement: "top",
          viewportOffset: 56,
          toast: {
            id: "offscreen-toast",
            title: "Offscreen",
            tone: "info",
            variant: "subtle",
            duration: 0,
            open: false,
          },
        }),
      ),
    );

    const closedAlert = findAllNodes(
      closedTopToast.container,
      (n) => n.type === "anim-view" && n.props?.accessibilityRole === "alert",
    )[0];
    const transforms =
      ((closedAlert?.props?.style as Record<string, unknown> | undefined)
        ?.transform as Array<Record<string, number>> | undefined) ?? [];
    const ty = transforms.find((t) => typeof t.translateY === "number")?.translateY;
    expect(ty).toBeDefined();
    expect(ty!).toBeLessThanOrEqual(-140);
  });

  it("renders visible overlay backdrops and opens Popover/Tooltip even when anchor rect measurement is delayed or empty", () => {
    mockUiState.anchorRect = { x: 0, y: 0, width: 0, height: 0 };

    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Popover,
            null,
            React.createElement(
              PopoverTrigger,
              null,
              React.createElement(Button, null, "Show Popover"),
            ),
            React.createElement(PopoverContent, null, "Popover Overlay Ready"),
          ),
          React.createElement(
            Tooltip,
            { content: "Tooltip Overlay Ready", triggerMode: "press" },
            React.createElement(Button, null, "Show Tooltip"),
          ),
        ),
      ),
    );

    const popTrigger = findAllNodes(
      container,
      (n) => n.type === "rn-pressable" && collectText(n).includes("Show Popover"),
    )[0];
    const tipTrigger = findAllNodes(
      container,
      (n) => n.type === "rn-pressable" && collectText(n).includes("Show Tooltip"),
    )[0];

    act(() => {
      (popTrigger?.props?.onPress as ((e: unknown) => void) | undefined)?.({});
      (tipTrigger?.props?.onPress as ((e: unknown) => void) | undefined)?.({});
    });

    expect(collectText(container)).toContain("Popover Overlay Ready");
    expect(collectText(container)).toContain("Tooltip Overlay Ready");

    const backdropViews = findAllNodes(
      container,
      (n) =>
        n.type === "anim-view" &&
        typeof (n.props?.style as Record<string, unknown> | undefined)
          ?.backgroundColor === "string" &&
        findAllNodes(
          n,
          (c) =>
            c.props?.accessibilityLabel === "Dismiss popover" ||
            c.props?.accessibilityLabel === "Dismiss tooltip",
        ).length > 0,
    );
    expect(backdropViews.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Spinner inside static Toast badge while loading and clears spinner to upright icon on completion update", () => {
    let api: ReturnType<typeof useToast> | null = null;
    function Driver() {
      api = useToast();
      return null;
    }

    const { container } = renderUI(
      wrap(
        React.createElement(
          ToastProvider,
          { placement: "top" },
          React.createElement(Driver, null),
        ),
      ),
    );

    let id = "";
    act(() => {
      id = api!.show({
        title: "Saving Settings...",
        tone: "info",
        loading: true,
        duration: 0,
      });
    });

    const alertWhileLoading = findAllNodes(
      container,
      (n) => n.type === "anim-view" && n.props?.accessibilityRole === "alert",
    )[0];
    expect(alertWhileLoading).toBeDefined();
    const spinnersDuringLoad = alertWhileLoading
      ? findAllNodes(
          alertWhileLoading,
          (n) => n.props?.accessibilityRole === "progressbar",
        )
      : [];
    expect(spinnersDuringLoad.length).toBe(1);

    // Outer badge around spinner must remain static (rn-view, no rotation transform)
    const staticBadges = alertWhileLoading
      ? findAllNodes(
          alertWhileLoading,
          (n) =>
            n.type === "rn-view" &&
            (n.props?.style as Record<string, unknown> | undefined)?.width === 36 &&
            (n.props?.style as Record<string, unknown> | undefined)?.height === 36,
        )
      : [];
    expect(staticBadges.length).toBe(1);
    expect(
      (staticBadges[0]?.props?.style as Record<string, unknown> | undefined)
        ?.transform,
    ).toBeUndefined();

    act(() => {
      api!.update(id, {
        title: "Settings Saved!",
        tone: "success",
        loading: false,
        duration: 3500,
      });
    });

    const alertAfterDone = findAllNodes(
      container,
      (n) => n.type === "anim-view" && n.props?.accessibilityRole === "alert",
    )[0];
    expect(collectText(container)).toContain("Settings Saved!");
    const spinnersAfterDone = alertAfterDone
      ? findAllNodes(
          alertAfterDone,
          (n) => n.props?.accessibilityRole === "progressbar",
        )
      : [];
    expect(spinnersAfterDone.length).toBe(0);

    const completionBadge = alertAfterDone
      ? findAllNodes(
          alertAfterDone,
          (n) =>
            n.type === "rn-view" &&
            (n.props?.style as Record<string, unknown> | undefined)?.width === 36,
        )[0]
      : undefined;
    expect(completionBadge).toBeDefined();
    const innerAnimatedWrappers = completionBadge
      ? findAllNodes(completionBadge, (n) => n.type === "anim-view")
      : [];
    for (const wrapper of innerAnimatedWrappers) {
      const transforms =
        ((wrapper.props?.style as Record<string, unknown> | undefined)
          ?.transform as Array<Record<string, unknown>> | undefined) ?? [];
      const hasRotate = transforms.some((t) => "rotate" in t);
      expect(hasRotate).toBe(false);
    }
  });
});
