import { beforeEach, describe, expect, it, mock } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import React from "react";

import {
  Alert,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Bubble,
  Button,
  ButtonGroup,
  Card,
  Chip,
  DataList,
  DataListItem,
  DataListLabel,
  DataListValue,
  IconButton,
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
  MetricCard,
  Table,
  TableCell,
  TableHead,
  TableRow,
  Text,
  ThemeProvider,
  Timeline,
  TimelineDescription,
  TimelineItem,
  TimelineTitle,
} from "../src";
import { collectText, findAllNodes, mockUiState, renderUI } from "./setup";

function wrap(node: React.ReactElement) {
  return React.createElement(ThemeProvider, null, node);
}

describe("typography, primitives & data display components", () => {
  beforeEach(() => {
    mockUiState.reset();
  });

  it("preserves Text custom fonts and header accessibilityRole", () => {
    const customFonts = { bold: "Custom-Bold" };
    const { container } = renderUI(
      React.createElement(
        ThemeProvider,
        { themes: { light: { fonts: customFonts } } },
        React.createElement(
          Text,
          { variant: "h1", weight: "700" },
          "Ma'sum Dev",
        ),
      ),
    );

    const textNodes = findAllNodes(container, (n) => n.type === "rn-text");
    expect(textNodes.length).toBeGreaterThan(0);
    expect(textNodes[0]?.props?.accessibilityRole).toBe("header");
    expect(collectText(container)).toContain("Ma'sum Dev");
    const styleObj = textNodes[0]?.props?.style as Record<string, unknown>;
    expect(styleObj?.fontFamily).toBe("Custom-Bold");
    expect(styleObj?.fontWeight).toBe("700");
  });

  it("renders Alert with SVG icon instead of raw warning/close emoji glyphs", () => {
    const onClose = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(
          Alert,
          {
            tone: "warning",
            variant: "filled",
            title: "Attention",
            dismissible: true,
            onClose,
          },
          42,
        ),
      ),
    );

    const text = collectText(container);
    expect(text).toContain("Attention");
    expect(text).toContain("42");
    expect(text).not.toContain("⚠️");
    expect(text).not.toContain("✕");

    const svgs = findAllNodes(container, (n) => n.type === "svg");
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Badge canonical variants and numeric children", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Badge, { variant: "filled", tone: "success" }, 99),
          React.createElement(Badge, { variant: "outline", tone: "info" }, "New"),
          React.createElement(Badge, { variant: "soft", tone: "accent" }, "Beta"),
        ),
      ),
    );

    const text = collectText(container);
    expect(text).toContain("99");
    expect(text).toContain("New");
    expect(text).toContain("Beta");
  });

  it("renders Chip with accessibilityRole checkbox and hitSlop target", () => {
    const onSelect = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(Chip, {
          label: "Verified",
          selected: true,
          size: "sm",
          onSelect,
        }),
      ),
    );

    const buttons = findAllNodes(container, (n) => n.type === "rn-pressable");
    expect(buttons[0]?.props?.accessibilityRole).toBe("checkbox");
    expect(buttons[0]?.props?.accessibilityState).toEqual({
      checked: true,
      disabled: false,
    });
    expect(buttons[0]?.props?.hitSlop).toBeDefined();
  });

  it("enforces Button & IconButton disabled state and Card elevation collapse", () => {
    const onPress = mock(() => {});
    const { container } = renderUI(
      React.createElement(
        ThemeProvider,
        { elevation: false },
        React.createElement(
          Card,
          { elevated: true },
          React.createElement(
            Button,
            { disabled: true, onPress },
            "Locked",
          ),
          React.createElement(IconButton, {
            accessibilityLabel: "Settings",
            icon: React.createElement("rn-view", null),
          }),
        ),
      ),
    );

    const pressables = findAllNodes(container, (n) => n.type === "rn-pressable");
    expect(pressables[0]?.props?.disabled).toBe(true);
    expect(pressables[1]?.props?.accessibilityLabel).toBe("Settings");
    expect(pressables[1]?.props?.hitSlop).toBeDefined();
  });

  it("renders Avatar md size, Bubble orthogonal tone/variant, and Item", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Avatar,
            { size: "md" },
            React.createElement(AvatarFallback, null, "MD"),
          ),
          React.createElement(
            Bubble,
            { align: "end", tone: "primary", variant: "soft" },
            100,
          ),
          React.createElement(
            Item,
            { size: "md" },
            React.createElement(
              ItemContent,
              null,
              React.createElement(ItemTitle, null, "Ma'sum"),
              React.createElement(ItemDescription, null, "masum@example.com"),
            ),
          ),
          React.createElement(MetricCard, {
            label: "Revenue",
            value: 1200,
            delta: 0,
          }),
        ),
      ),
    );

    const text = collectText(container);
    expect(text).toContain("MD");
    expect(text).toContain("100");
    expect(text).toContain("Ma'sum");
    expect(text).toContain("masum@example.com");
    expect(text).toContain("1200");
  });

  it("renders Breadcrumb, Table, Timeline & DataList without last-item border leak", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Breadcrumb,
            null,
            React.createElement(
              BreadcrumbItem,
              null,
              React.createElement(BreadcrumbLink, { onPress: () => {} }, "Home"),
              React.createElement(BreadcrumbSeparator, null),
              React.createElement(BreadcrumbPage, null, 2026),
            ),
          ),
          React.createElement(
            Table,
            null,
            React.createElement(
              TableRow,
              null,
              React.createElement(TableHead, null, "Col"),
            ),
            React.createElement(
              TableRow,
              null,
              React.createElement(TableCell, null, 42),
            ),
          ),
          React.createElement(
            Timeline,
            null,
            React.createElement(
              TimelineItem,
              null,
              React.createElement(TimelineTitle, null, 1),
              React.createElement(TimelineDescription, null, "First"),
            ),
          ),
          React.createElement(
            DataList,
            null,
            React.createElement(
              DataListItem,
              null,
              React.createElement(DataListLabel, null, "Key"),
              React.createElement(DataListValue, null, 123),
            ),
          ),
        ),
      ),
    );

    const text = collectText(container);
    expect(text).toContain("Home");
    expect(text).toContain("2026");
    expect(text).toContain("Col");
    expect(text).toContain("42");
    expect(text).toContain("First");
    expect(text).toContain("123");

    const links = findAllNodes(
      container,
      (n) => n.props?.accessibilityRole === "link",
    );
    expect(links.length).toBe(1);
  });

  it("ignores absolute animated overlays inside ButtonGroup and omits native Reanimated dep arrays", async () => {
    const { webDeps } = await import("../src/components/types");
    expect(webDeps(["dep"])).toBeUndefined();

    const animatedLikeHandle = { viewDescriptors: {}, initial: {} };
    const { container } = renderUI(
      wrap(
        React.createElement(
          ButtonGroup,
          { orientation: "horizontal" },
          React.createElement("rn-view", {
            testID: "abs-indicator",
            style: [
              { position: "absolute", top: 0, left: 0 },
              animatedLikeHandle as never,
            ],
          }),
          React.createElement(Button, { testID: "bg-first" }, "First"),
          React.createElement(Button, { testID: "bg-second" }, "Second"),
        ),
      ),
    );

    const first = findAllNodes(container, (n) => n.props?.testID === "bg-first")[0];
    const second = findAllNodes(container, (n) => n.props?.testID === "bg-second")[0];
    const firstStyle = (first?.props?.style as Record<string, unknown> | undefined) ?? {};
    const secondStyle = (second?.props?.style as Record<string, unknown> | undefined) ?? {};

    expect(firstStyle.borderTopRightRadius).toBe(0);
    expect(firstStyle.borderBottomRightRadius).toBe(0);
    expect(firstStyle.borderLeftWidth).toBeUndefined();
    expect(secondStyle.borderTopLeftRadius).toBe(0);
    expect(secondStyle.borderBottomLeftRadius).toBe(0);
    expect(secondStyle.borderLeftWidth).toBe(0);

    const componentsDir = path.resolve(import.meta.dir, "../src/components");
    for (const entry of fs.readdirSync(componentsDir)) {
      if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
      const src = fs.readFileSync(path.join(componentsDir, entry), "utf8");
      let idx = 0;
      while ((idx = src.indexOf("useAnimatedStyle(", idx)) !== -1) {
        let depth = 0;
        let commas = 0;
        let i = idx + "useAnimatedStyle".length;
        let secondArgStart = -1;
        let inStr: string | null = null;
        let esc = false;
        for (; i < src.length; i++) {
          const ch = src[i];
          if (inStr) {
            if (esc) {
              esc = false;
              continue;
            }
            if (ch === "\\") {
              esc = true;
              continue;
            }
            if (ch === inStr) inStr = null;
            continue;
          }
          if (ch === '"' || ch === "'" || ch === "`") {
            inStr = ch;
            continue;
          }
          if (ch === "(" || ch === "{" || ch === "[") depth++;
          else if (ch === ")" || ch === "}" || ch === "]") {
            depth--;
            if (depth === 0) break;
          } else if (ch === "," && depth === 1) {
            commas++;
            if (commas === 1) secondArgStart = i + 1;
          }
        }
        if (commas >= 1 && secondArgStart !== -1) {
          const secondArg = src.slice(secondArgStart, i).trim();
          expect(secondArg.startsWith("webDeps(")).toBe(true);
        }
        idx = i + 1;
      }
    }
  });
});
