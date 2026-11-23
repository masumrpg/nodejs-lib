import { beforeEach, describe, expect, it } from "bun:test";
import React from "react";

import {
  DatePickerCard,
  SegmentedControl,
  Tabs,
  TabsList,
  TabsTrigger,
  ThemeProvider,
  builtInThemePresets,
  createTheme,
  minimalThemePreset,
  neoBrutalismThemePreset,
  useTheme,
  SideNavigation,
  SideNavHeader,
  SideNavContent,
  SideNavSection,
  SideNavItem,
  SideNavFooter,
} from "../src";
import { act, collectText, findAllNodes, mockUiState, renderUI } from "./setup";
import type { HostNode } from "./setup";

type Style = Record<string, unknown>;

function styleOf(node: HostNode | undefined): Style {
  return (node?.props?.style as Style | undefined) ?? {};
}

function renderWithPreset(
  node: React.ReactElement,
  themeName: "default" | "minimal" | "brutal" = "default",
) {
  let api: ReturnType<typeof useTheme> | null = null;
  function Probe() {
    api = useTheme();
    return node;
  }
  const result = renderUI(
    React.createElement(
      ThemeProvider,
      {
        presets: builtInThemePresets,
        defaultColorScheme: "light",
        defaultThemeName: themeName,
      },
      React.createElement(Probe, null),
    ),
  );
  return { ...result, getApi: () => api! };
}

function findTrack(container: Parameters<typeof findAllNodes>[0]) {
  return findAllNodes(
    container,
    (n) => n.props?.accessibilityRole === "tablist",
  )[0];
}

function findSolidIndicator(
  container: Parameters<typeof findAllNodes>[0],
  color: string,
) {
  return findAllNodes(container, (n) => {
    const s = styleOf(n);
    return s.position === "absolute" && s.backgroundColor === color;
  })[0];
}

function findLabel(
  container: Parameters<typeof findAllNodes>[0],
  label: string,
) {
  return findAllNodes(
    container,
    (n) => n.type === "rn-text" && collectText(n) === label,
  )[0];
}

describe("flush capsule variants for Tabs, SegmentedControl & DatePickerCard", () => {
  beforeEach(() => {
    mockUiState.reset();
  });

  it("renders SegmentedControl variant='flush' as a solid tone capsule hugging the track", () => {
    const { container, getApi } = renderWithPreset(
      React.createElement(SegmentedControl, {
        variant: "flush",
        values: ["Monthly", "Annual"],
        defaultIndex: 0,
      }),
    );

    const { colors, radii } = getApi();
    const track = styleOf(findTrack(container));
    expect(track.borderRadius).toBe(radii.full);
    expect(track.padding).toBe(2);
    expect(track.backgroundColor).toBe(colors.backgroundMuted);

    const indicator = styleOf(findSolidIndicator(container, colors.primary));
    expect(indicator.borderRadius).toBe(radii.full);
    expect(indicator.top).toBe(2);
    expect(indicator.bottom).toBe(2);

    expect(styleOf(findLabel(container, "Monthly")).color).toBe(
      colors.onPrimary,
    );
    expect(styleOf(findLabel(container, "Annual")).color).toBe(
      colors.textMuted,
    );
  });

  it("keeps SegmentedControl default 'surface' variant backwards compatible", () => {
    const { container, getApi } = renderWithPreset(
      React.createElement(SegmentedControl, { values: ["List", "Board"] }),
    );
    const { colors, radii, components } = getApi();
    const track = styleOf(findTrack(container));
    expect(track.borderRadius).toBe(radii.lg);
    expect(track.padding).toBe(components.segmentedControl.padding);
    expect(findSolidIndicator(container, colors.primary)).toBeUndefined();
    expect(styleOf(findLabel(container, "List")).color).toBe(colors.primary);
  });

  it("renders flush tracks borderless in minimal and ink-bordered in brutal", () => {
    const minimal = renderWithPreset(
      React.createElement(SegmentedControl, {
        variant: "flush",
        values: ["Day", "Week"],
      }),
      "minimal",
    );
    expect(styleOf(findTrack(minimal.container)).borderWidth).toBe(0);

    const brutal = renderWithPreset(
      React.createElement(SegmentedControl, {
        variant: "flush",
        values: ["Day", "Week"],
      }),
      "brutal",
    );
    expect(styleOf(findTrack(brutal.container)).borderWidth).toBe(2);
  });

  it("renders Tabs variant='flush' with full-width stretched triggers and on-color label", () => {
    const { container, getApi } = renderWithPreset(
      React.createElement(
        Tabs,
        { variant: "flush", tone: "success", defaultValue: "overview" },
        React.createElement(
          TabsList,
          { fullWidth: true },
          React.createElement(TabsTrigger, { value: "overview" }, "Overview"),
          React.createElement(TabsTrigger, { value: "activity" }, "Activity"),
        ),
      ),
      "minimal",
    );

    const { colors, radii } = getApi();
    const track = styleOf(findTrack(container));
    expect(track.borderRadius).toBe(radii.full);
    expect(track.borderWidth).toBe(0);
    expect(track.width).toBe("100%");

    const indicator = styleOf(findSolidIndicator(container, colors.success));
    expect(indicator.borderRadius).toBe(radii.full);

    expect(styleOf(findLabel(container, "Overview")).color).toBe(
      colors.onSuccess,
    );
    expect(styleOf(findLabel(container, "Activity")).color).toBe(
      colors.textMuted,
    );

    const triggers = findAllNodes(
      container,
      (n) => n.props?.accessibilityRole === "tab",
    );
    expect(triggers.length).toBe(2);
    for (const trigger of triggers) {
      expect(styleOf(trigger).flex).toBe(1);
    }

    act(() => {
      (triggers[1]?.props?.onPress as (() => void) | undefined)?.();
    });
    expect(styleOf(findLabel(container, "Activity")).color).toBe(
      colors.onSuccess,
    );
  });

  it("switches DatePickerCard between wheel and calendar through the flush SegmentedControl", () => {
    const { container, getApi } = renderWithPreset(
      React.createElement(DatePickerCard, {
        mode: "date",
        showVariantToggle: true,
        onConfirm: () => undefined,
      }),
    );
    const { colors } = getApi();

    const tabs = findAllNodes(
      container,
      (n) => n.props?.accessibilityRole === "tab",
    );
    expect(tabs.length).toBe(2);
    expect(findSolidIndicator(container, colors.primary)).toBeDefined();
    expect(
      findAllNodes(container, (n) => n.type === "anim-scrollview").length,
    ).toBeGreaterThan(0);

    act(() => {
      (tabs[1]?.props?.onPress as (() => void) | undefined)?.();
    });
    expect(
      findAllNodes(
        container,
        (n) =>
          n.props?.accessibilityRole === "tab" &&
          (n.props?.accessibilityState as { selected?: boolean } | undefined)
            ?.selected === true &&
          collectText(n).length > 0,
      ).length,
    ).toBe(1);
  });

  it("scales minimal preset radii to a distinctly generous modern hierarchy", () => {
    const minimal = createTheme("light", minimalThemePreset.light).radii;
    const brutal = createTheme("light", neoBrutalismThemePreset.light).radii;
    const base = createTheme("light").radii;

    const order = ["none", "xs", "sm", "md", "lg", "xl", "xxl"] as const;
    for (let i = 1; i < order.length; i += 1) {
      expect(minimal[order[i]]).toBeGreaterThan(minimal[order[i - 1]]);
    }
    expect(minimal.xl).toBeGreaterThan(base.xl);
    expect(base.xl).toBeGreaterThan(brutal.xl);
    expect(minimal.md).toBe(16);
    expect(minimal.xl).toBe(26);
  });

  it("renders SideNavigation in expanded mode and handles onSelect selection", () => {
    let selectedKey = "dashboard";
    const { container } = renderWithPreset(
      React.createElement(
        SideNavigation,
        {
          variant: "expanded",
          activeKey: selectedKey,
          onSelect: (k: string) => {
            selectedKey = k;
          },
        },
        React.createElement(SideNavHeader, {
          title: "Enterprise Studio",
          subtitle: "Workspace 1",
        }),
        React.createElement(
          SideNavContent,
          null,
          React.createElement(
            SideNavSection,
            { label: "Platform" },
            React.createElement(SideNavItem, {
              id: "dashboard",
              label: "Dashboard",
            }),
            React.createElement(SideNavItem, {
              id: "analytics",
              label: "Analytics",
              badge: "PRO",
            }),
          ),
        ),
        React.createElement(
          SideNavFooter,
          null,
          React.createElement(SideNavItem, {
            id: "settings",
            label: "Settings",
          }),
        ),
      ),
    );

    const nav = findAllNodes(container, (n) => n.props?.accessibilityRole === "menu" || n.props?.accessibilityRole === "navigation")[0];
    expect(nav).toBeDefined();

    const items = findAllNodes(container, (n) => n.props?.accessibilityRole === "button");
    expect(items.length).toBeGreaterThanOrEqual(3);

    act(() => {
      (items[1]?.props?.onPress as (() => void) | undefined)?.();
    });
    expect(selectedKey).toBe("analytics");
  });

  it("renders SideNavigation in rail mode with compact 70px width and tooltips", () => {
    const { container } = renderWithPreset(
      React.createElement(
        SideNavigation,
        {
          variant: "rail",
          activeKey: "home",
        },
        React.createElement(
          SideNavContent,
          null,
          React.createElement(SideNavItem, {
            id: "home",
            label: "Home",
          }),
        ),
      ),
    );

    const nav = findAllNodes(container, (n) => n.props?.accessibilityRole === "menu" || n.props?.accessibilityRole === "navigation")[0];
    expect(nav).toBeDefined();
    const navStyle = styleOf(nav);
    expect(navStyle.width).toBe(70);
  });

  it("renders SideNavigation in floating mode with shadows and margins", () => {
    const { container, getApi } = renderWithPreset(
      React.createElement(
        SideNavigation,
        {
          variant: "floating",
          activeKey: "feed",
        },
        React.createElement(
          SideNavContent,
          null,
          React.createElement(SideNavItem, {
            id: "feed",
            label: "Live Feed",
          }),
        ),
      ),
    );

    const { radii, spacing } = getApi();
    const nav = findAllNodes(container, (n) => n.props?.accessibilityRole === "menu" || n.props?.accessibilityRole === "navigation")[0];
    const navStyle = styleOf(nav);
    expect(navStyle.borderRadius).toBe(radii.xl);
    expect(navStyle.margin).toBe(spacing.md);
  });
});
