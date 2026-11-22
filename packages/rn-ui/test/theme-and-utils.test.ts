import { beforeEach, describe, expect, it } from "bun:test";
import React from "react";

import {
  Badge,
  Button,
  Card,
  IconButton,
  Portal,
  PortalHost,
  PortalProvider,
  ThemeProvider,
  builtInThemePresets,
  createHardShadows,
  createTheme,
  darkTheme,
  flatShadows,
  getContrastRatio,
  getContrastingTextColor,
  getLocaleData,
  lightTheme,
  minimalThemePreset,
  neoBrutalismThemePreset,
  registerLocale,
  resolveLocaleKey,
  subtleShadows,
  useTheme,
  useThemeStyles,
  withAlpha,
} from "../src";
import { act, collectText, findAllNodes, mockUiState, renderUI } from "./setup";

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const [r1, g1, b1] = hexToRgb(fgHex);
  const [r2, g2, b2] = hexToRgb(bgHex);
  const l1 =
    0.2126 * srgbToLinear(r1) +
    0.7152 * srgbToLinear(g1) +
    0.0722 * srgbToLinear(b1);
  const l2 =
    0.2126 * srgbToLinear(r2) +
    0.7152 * srgbToLinear(g2) +
    0.0722 * srgbToLinear(b2);
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

describe("theme tokens, WCAG AA contrast & utilities", () => {
  beforeEach(() => {
    mockUiState.reset();
  });

  it("meets WCAG AA (>= 4.5:1) contrast for key lightTheme color pairs", () => {
    const c = lightTheme.colors;
    expect(contrastRatio(c.text, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.textMuted, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.textSubtle, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onSecondary, c.secondary)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onSuccess, c.success)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onWarning, c.warning)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onDanger, c.danger)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onInfo, c.info)).toBeGreaterThanOrEqual(4.5);
  });

  it("meets WCAG AA (>= 4.5:1) contrast for key darkTheme color pairs", () => {
    const c = darkTheme.colors;
    expect(contrastRatio(c.text, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.text, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.text, c.surfaceRaised)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.textMuted, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.textSubtle, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onSuccess, c.success)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onWarning, c.warning)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onDanger, c.danger)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onInfo, c.info)).toBeGreaterThanOrEqual(4.5);
  });

  it("toggles subtleShadows vs flatShadows with elevation option", () => {
    const elevatedTheme = createTheme("light", { elevation: true });
    expect(elevatedTheme.elevation).toBe(true);
    expect(elevatedTheme.shadows.md).toEqual(subtleShadows.md);
    expect(elevatedTheme.shadows.lg.shadowOpacity).toBeGreaterThan(0);

    const flatTheme = createTheme("light", { elevation: false });
    expect(flatTheme.elevation).toBe(false);
    expect(flatTheme.shadows).toEqual(flatShadows);
    expect(flatTheme.shadows.lg.elevation).toBe(0);
    expect(flatTheme.shadows.lg.shadowOpacity).toBe(0);
  });

  it("keeps useThemeStyles output referentially stable across re-renders", () => {
    const refs: unknown[] = [];

    function Probe({ tick }: { tick: number }) {
      const styles = useThemeStyles((theme) => ({
        box: { backgroundColor: theme.colors.surface, padding: theme.spacing.md },
        tickValue: { opacity: tick > 0 ? 1 : 1 },
      }));
      refs.push(styles);
      return React.createElement("rn-view", { style: styles.box });
    }

    const { rerender } = renderUI(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(Probe, { tick: 1 }),
      ),
    );
    rerender(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(Probe, { tick: 2 }),
      ),
    );

    expect(refs.length).toBe(2);
    expect(refs[0]).toBe(refs[1]);
  });

  it("normalizes hex, rgb, rgba, transparent, and invalid inputs in withAlpha", () => {
    expect(withAlpha("#fff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
    expect(withAlpha("#33CDCF", 0.25)).toBe("rgba(51, 205, 207, 0.25)");
    expect(withAlpha("#11223380", 0.4)).toBe("rgba(17, 34, 51, 0.4)");
    expect(withAlpha("rgb(10, 20, 30)", 0.6)).toBe("rgba(10, 20, 30, 0.6)");
    expect(withAlpha("rgba(10, 20, 30, 0.9)", 0.3)).toBe(
      "rgba(10, 20, 30, 0.3)",
    );
    expect(withAlpha("transparent", 0.5)).toBe("transparent");
    expect(withAlpha("#33CDCF", 2)).toBe("rgba(51, 205, 207, 1)");
  });

  it("resolves regional BCP-47 tags and supports registerLocale", () => {
    expect(resolveLocaleKey("id-ID")).toBe("id");
    expect(resolveLocaleKey("en-US")).toBe("en");
    expect(resolveLocaleKey("xx-UNKNOWN")).toBe("en");

    registerLocale("fr", {
      monthNames: [
        "Janvier",
        "Fevrier",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Aout",
        "Septembre",
        "Octobre",
        "Novembre",
        "Decembre",
      ],
      today: "Aujourd'hui",
      confirm: "Confirmer",
    });

    const fr = getLocaleData("fr-FR");
    expect(fr.today).toBe("Aujourd'hui");
    expect(fr.confirm).toBe("Confirmer");
    expect(fr.monthNames[0]).toBe("Janvier");
  });

  it("mounts Portal entries ordered by layer priority inside PortalHost", () => {
    const { container } = renderUI(
      React.createElement(
        PortalProvider,
        null,
        React.createElement(
          Portal,
          { layer: "toast" },
          React.createElement("rn-text", null, "ToastLayer"),
        ),
        React.createElement(
          Portal,
          { layer: "overlay" },
          React.createElement("rn-text", null, "OverlayLayer"),
        ),
        React.createElement(
          Portal,
          { layer: "tooltip" },
          React.createElement("rn-text", null, "TooltipLayer"),
        ),
        React.createElement(PortalHost, { name: "root" }),
      ),
    );

    const text = collectText(container);
    const overlayIdx = text.indexOf("OverlayLayer");
    const tooltipIdx = text.indexOf("TooltipLayer");
    const toastIdx = text.indexOf("ToastLayer");

    expect(overlayIdx).toBeGreaterThanOrEqual(0);
    expect(tooltipIdx).toBeGreaterThan(overlayIdx);
    expect(toastIdx).toBeGreaterThan(tooltipIdx);
  });

  it("meets WCAG AA (>= 4.5:1) contrast for Minimal (HeroUI) and Neo-Brutalism presets in Light and Dark modes", () => {
    const presetThemes = [
      createTheme("light", minimalThemePreset.light),
      createTheme("dark", minimalThemePreset.dark),
      createTheme("light", neoBrutalismThemePreset.light),
      createTheme("dark", neoBrutalismThemePreset.dark),
    ];

    for (const presetTheme of presetThemes) {
      const c = presetTheme.colors;
      expect(getContrastRatio(c.text, c.background)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(c.text, c.surface)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(c.textMuted, c.surface)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(c.textSubtle, c.input)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(
        getContrastRatio(c.onSecondary, c.secondary),
      ).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(c.onSuccess, c.success)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(c.onWarning, c.warning)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(c.onDanger, c.danger)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(getContrastRatio(c.onInfo, c.info)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("auto-derives soft and high-contrast foreground tokens on partial color override", () => {
    const emerald = createTheme("light", {
      colors: { primary: "#059669" },
    });
    expect(emerald.colors.primary).toBe("#059669");
    expect(emerald.colors.primarySoft).toBe("rgba(5, 150, 105, 0.12)");
    expect(emerald.colors.onPrimary).toBe(getContrastingTextColor("#059669"));
    expect(
      getContrastRatio(emerald.colors.onPrimary, "#059669"),
    ).toBeGreaterThanOrEqual(4.5);

    const hard = createHardShadows("#09090B");
    expect(hard.md.boxShadow).toBe("4px 4px 0px 0px #09090B");
    expect(hard.md.elevation).toBe(0);
    expect(hard.md.shadowOpacity).toBe(1);
    expect(hard.md.shadowRadius).toBe(0);

    const collapsedBrutal = createTheme("light", {
      ...neoBrutalismThemePreset.light,
      elevation: false,
    });
    expect(collapsedBrutal.shadows).toEqual(flatShadows);
    expect(collapsedBrutal.shadows.md.boxShadow).toBeUndefined();
  });

  it("switches presets reactively at runtime between default, minimal borderless, and neo-brutalism", () => {
    let api: ReturnType<typeof useTheme> | null = null;
    const styleRefs: unknown[] = [];

    function Probe() {
      api = useTheme();
      const probeStyles = useThemeStyles((t) => ({
        surface: {
          backgroundColor: t.colors.surface,
          borderWidth: t.components.borderWidth.strong,
        },
      }));
      styleRefs.push(probeStyles);

      return React.createElement(
        Card,
        null,
        React.createElement(Button, { variant: "filled" }, api.themeName),
      );
    }

    const { container } = renderUI(
      React.createElement(
        ThemeProvider,
        {
          presets: builtInThemePresets,
          defaultColorScheme: "light",
          defaultThemeName: "default",
        },
        React.createElement(Probe, null),
      ),
    );

    expect(api).not.toBeNull();
    expect(api!.themeName).toBe("default");
    expect(api!.availableThemes).toEqual(["default", "minimal", "brutal"]);
    expect(api!.components.borderWidth.strong).toBe(1.5);
    expect(api!.components.surface.outlineStyle).toBe("bordered");
    expect(api!.elevation).toBe(true);

    act(() => {
      api!.setThemeName("minimal");
    });

    expect(api!.themeName).toBe("minimal");
    expect(api!.elevation).toBe(false);
    expect(api!.components.borderWidth.default).toBe(0);
    expect(api!.components.borderWidth.strong).toBe(0);
    expect(api!.components.borderWidth.control).toBe(1.5);
    expect(api!.components.surface.outlineStyle).toBe("tonal");
    expect(api!.components.surface.pressEffect).toBe("scale");

    act(() => {
      api!.setThemeName("brutal");
    });

    expect(api!.themeName).toBe("brutal");
    expect(api!.elevation).toBe(true);
    expect(api!.components.borderWidth.strong).toBe(2.5);
    expect(api!.components.borderWidth.filled).toBe(2.5);
    expect(api!.components.surface.outlineStyle).toBe("bordered");
    expect(api!.shadows.md.boxShadow).toBe("4px 4px 0px 0px #09090B");
    expect(api!.components.surface.pressEffect).toBe("offset");
    expect(styleRefs[0]).not.toBe(styleRefs[styleRefs.length - 1]);

    const cards = findAllNodes(container, (n) => n.type === "rn-view");
    const brutalCard = cards.find(
      (v) =>
        typeof (v.props?.style as Record<string, unknown> | undefined)
          ?.boxShadow === "string",
    );
    expect(
      (brutalCard?.props?.style as Record<string, unknown> | undefined)
        ?.borderWidth,
    ).toBe(2.5);
    expect(
      (brutalCard?.props?.style as Record<string, unknown> | undefined)
        ?.overflow,
    ).toBe("visible");

    act(() => {
      api!.toggleElevation();
    });
    expect(api!.elevation).toBe(false);
    expect(api!.shadows.md).toEqual(flatShadows.md);
  });

  it("renders outline Button, IconButton, and Badge as 0px borderless tonal pills under minimal preset", () => {
    let api: ReturnType<typeof useTheme> | null = null;

    function OutlineProbe() {
      api = useTheme();
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          Button,
          { variant: "outline", testID: "outline-btn" },
          "OutlineBtn",
        ),
        React.createElement(IconButton, {
          variant: "outline",
          accessibilityLabel: "OutlineIcon",
          testID: "outline-icon-btn",
          icon: ({ color, size }: { color: string; size: number }) =>
            React.createElement("rn-view", { "data-icon": `${color}:${size}` }),
        }),
        React.createElement(
          Badge,
          { variant: "outline", tone: "secondary" },
          "5 items",
        ),
      );
    }

    const { container } = renderUI(
      React.createElement(
        ThemeProvider,
        {
          presets: builtInThemePresets,
          defaultColorScheme: "light",
          defaultThemeName: "minimal",
        },
        React.createElement(OutlineProbe, null),
      ),
    );

    const getStyleByTestId = (testID: string): Record<string, unknown> => {
      const node = findAllNodes(
        container,
        (n) => n.props?.testID === testID,
      )[0];
      return (node?.props?.style as Record<string, unknown> | undefined) ?? {};
    };

    const getBadgeStyle = (): Record<string, unknown> => {
      const node = findAllNodes(
        container,
        (n) =>
          n.type === "rn-view" &&
          n.props?.accessibilityRole === "text" &&
          collectText(n).includes("5 items"),
      )[0];
      return (node?.props?.style as Record<string, unknown> | undefined) ?? {};
    };

    const lightBtn = getStyleByTestId("outline-btn");
    const lightIconBtn = getStyleByTestId("outline-icon-btn");
    const lightBadge = getBadgeStyle();

    expect(lightBtn.borderWidth).toBe(0);
    expect(lightBtn.borderColor).toBe("transparent");
    expect(lightBtn.backgroundColor).toBe(
      minimalThemePreset.light.colors?.backgroundMuted,
    );
    expect(lightIconBtn.borderWidth).toBe(0);
    expect(lightIconBtn.borderColor).toBe("transparent");
    expect(lightIconBtn.backgroundColor).toBe(
      minimalThemePreset.light.colors?.backgroundMuted,
    );
    expect(lightBadge.borderWidth).toBe(0);
    expect(lightBadge.borderColor).toBe("transparent");
    expect(lightBadge.backgroundColor).toBe(
      minimalThemePreset.light.colors?.backgroundMuted,
    );

    act(() => {
      api!.setColorScheme("dark");
    });

    const darkBtn = getStyleByTestId("outline-btn");
    const darkIconBtn = getStyleByTestId("outline-icon-btn");
    const darkBadge = getBadgeStyle();

    expect(darkBtn.borderWidth).toBe(0);
    expect(darkBtn.backgroundColor).toBe(
      minimalThemePreset.dark.colors?.surfaceRaised,
    );
    expect(darkIconBtn.borderWidth).toBe(0);
    expect(darkIconBtn.backgroundColor).toBe(
      minimalThemePreset.dark.colors?.surfaceRaised,
    );
    expect(darkBadge.borderWidth).toBe(0);
    expect(darkBadge.backgroundColor).toBe(
      minimalThemePreset.dark.colors?.surfaceRaised,
    );

    act(() => {
      api!.setColorScheme("light");
      api!.setThemeName("default");
    });

    const defaultLightBtn = getStyleByTestId("outline-btn");
    const defaultLightIconBtn = getStyleByTestId("outline-icon-btn");
    const defaultLightBadge = getBadgeStyle();

    expect(defaultLightBtn.borderWidth).toBe(1.5);
    expect(defaultLightBtn.borderColor).toBe(lightTheme.colors.border);
    expect(defaultLightBtn.backgroundColor).toBe("transparent");
    expect(defaultLightIconBtn.borderWidth).toBe(1.5);
    expect(defaultLightIconBtn.borderColor).toBe(lightTheme.colors.border);
    expect(defaultLightIconBtn.backgroundColor).toBe(lightTheme.colors.surface);
    expect(defaultLightBadge.borderWidth).toBe(1.5);
    expect(defaultLightBadge.borderColor).toBe(lightTheme.colors.border);
    expect(defaultLightBadge.backgroundColor).toBe("transparent");

    act(() => {
      api!.setColorScheme("dark");
    });

    const defaultDarkBtn = getStyleByTestId("outline-btn");
    const defaultDarkIconBtn = getStyleByTestId("outline-icon-btn");
    const defaultDarkBadge = getBadgeStyle();

    expect(defaultDarkBtn.borderWidth).toBe(1.5);
    expect(defaultDarkBtn.borderColor).toBe(darkTheme.colors.border);
    expect(defaultDarkIconBtn.borderWidth).toBe(1.5);
    expect(defaultDarkIconBtn.borderColor).toBe(darkTheme.colors.border);
    expect(defaultDarkBadge.borderWidth).toBe(1.5);
    expect(defaultDarkBadge.borderColor).toBe(darkTheme.colors.border);

    act(() => {
      api!.setColorScheme("light");
      api!.setThemeName("brutal");
    });

    expect(getStyleByTestId("outline-btn").borderWidth).toBe(2.5);
    expect(getStyleByTestId("outline-btn").borderColor).toBe("#09090B");
    expect(getStyleByTestId("outline-icon-btn").borderColor).toBe("#09090B");
    expect(getBadgeStyle().borderColor).toBe("#09090B");

    act(() => {
      api!.setColorScheme("dark");
    });

    expect(getStyleByTestId("outline-btn").borderWidth).toBe(2.5);
    expect(getStyleByTestId("outline-btn").borderColor).toBe("#F4F4F5");
    expect(getStyleByTestId("outline-icon-btn").borderColor).toBe("#F4F4F5");
    expect(getBadgeStyle().borderColor).toBe("#F4F4F5");

    const optInToneTheme = createTheme("dark", {
      components: { surface: { outlineBorderColor: "tone" } },
    });
    expect(optInToneTheme.components.surface.outlineBorderColor).toBe("tone");
  });

  it("renders Button with calibrated xs-xl proportions, size-aware borderRadius, and 44pt accessible hitSlop", () => {
    const sizes = ["xs", "sm", "md", "lg", "xl"] as const;

    function GeometryProbe() {
      return React.createElement(
        React.Fragment,
        null,
        ...sizes.map((s) =>
          React.createElement(
            Button,
            { key: s, size: s, testID: `btn-${s}` },
            `Btn-${s}`,
          ),
        ),
        React.createElement(
          Button,
          { size: "md", shape: "square", testID: "btn-square" },
          "Square",
        ),
        React.createElement(
          Button,
          { size: "md", shape: "pill", testID: "btn-pill" },
          "Pill",
        ),
      );
    }

    const { container, rerender } = renderUI(
      React.createElement(
        ThemeProvider,
        {
          presets: builtInThemePresets,
          defaultColorScheme: "light",
          defaultThemeName: "default",
        },
        React.createElement(GeometryProbe, null),
      ),
    );

    const getPressable = (testID: string) =>
      findAllNodes(container, (n) => n.props?.testID === testID)[0];

    const expectedHeights = { xs: 28, sm: 34, md: 40, lg: 46, xl: 52 };
    const expectedPaddingX = { xs: 10, sm: 14, md: 18, lg: 22, xl: 26 };

    for (const s of sizes) {
      const node = getPressable(`btn-${s}`);
      const style = (node?.props?.style as Record<string, unknown> | undefined) ?? {};
      expect(style.minHeight).toBe(expectedHeights[s]);
      expect(style.paddingHorizontal).toBe(expectedPaddingX[s]);
      if (s === "xs" || s === "sm" || s === "md") {
        expect(node?.props?.hitSlop).toBeDefined();
      } else {
        expect(node?.props?.hitSlop).toBeUndefined();
      }
    }

    expect(
      (getPressable("btn-md")?.props?.style as Record<string, unknown> | undefined)
        ?.borderRadius,
    ).toBe(12);
    expect(
      (
        getPressable("btn-square")?.props?.style as
          | Record<string, unknown>
          | undefined
      )?.borderRadius,
    ).toBe(8);
    expect(
      (getPressable("btn-pill")?.props?.style as Record<string, unknown> | undefined)
        ?.borderRadius,
    ).toBe(9999);

    rerender(
      React.createElement(
        ThemeProvider,
        {
          presets: builtInThemePresets,
          defaultColorScheme: "light",
          defaultThemeName: "minimal",
        },
        React.createElement(GeometryProbe, null),
      ),
    );

    expect(
      (getPressable("btn-md")?.props?.style as Record<string, unknown> | undefined)
        ?.borderRadius,
    ).toBe(12);
  });
});
