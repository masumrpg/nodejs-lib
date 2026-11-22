import { beforeEach, describe, expect, it, mock } from "bun:test";
import React from "react";

import {
  Calendar,
  CalendarProvider,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  DatePicker,
  DatePickerCard,
  ExpandableCalendar,
  Progress,
  SignaturePad,
  Skeleton,
  Spinner,
  SwipeableItem,
  ThemeProvider,
  TimelineCalendar,
  parseLocalDateString,
  type SignaturePadRef,
} from "../src";
import { collectText, findAllNodes, mockUiState, renderUI } from "./setup";

function wrap(node: React.ReactElement) {
  return React.createElement(ThemeProvider, null, node);
}

describe("calendars, date picker, carousel & gesture components", () => {
  beforeEach(() => {
    mockUiState.reset();
  });

  it("parses YYYY-MM-DD local dates without UTC month/day rollback", () => {
    const parsed = parseLocalDateString("2026-03-01");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(1);
  });

  it("renders Calendar, ExpandableCalendar nested stylesheet, and high-contrast TimelineCalendar", () => {
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Calendar, {
            current: "2026-03-01",
            locale: "id",
          }),
          React.createElement(
            CalendarProvider,
            { date: "2026-03-01" },
            React.createElement(ExpandableCalendar, null),
          ),
          React.createElement(TimelineCalendar, {
            events: [],
          }),
        ),
      ),
    );

    const expandable = findAllNodes(
      container,
      (n) => n.type === "wix-expandable-calendar",
    )[0];
    const expTheme = expandable?.props?.theme as
      | Record<string, unknown>
      | undefined;
    expect(
      (expTheme?.stylesheet as Record<string, Record<string, unknown>> | undefined)
        ?.expandable?.main,
    ).toBeDefined();

    const timeline = findAllNodes(
      container,
      (n) => n.type === "wix-timeline",
    )[0];
    const tlTheme = timeline?.props?.theme as
      | Record<string, Record<string, unknown>>
      | undefined;
    expect(tlTheme?.event?.backgroundColor).toBeDefined();
    expect(tlTheme?.eventTitle?.color).toBeDefined();
  });

  it("renders localized DatePickerCard without hardcoded 'SET BIRTHDAY' and clamps minuteInterval", () => {
    const onConfirm = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(DatePickerCard, {
          locale: "id",
          mode: "date",
          minuteInterval: 0,
          onConfirm,
        }),
      ),
    );

    const text = collectText(container);
    expect(text).not.toContain("SET BIRTHDAY");
    expect(text).toContain("Pilih Tanggal");
    expect(
      findAllNodes(container, (n) => n.type === "rn-flatlist").length,
    ).toBeGreaterThan(0);

    renderUI(
      wrap(
        React.createElement(DatePicker, {
          defaultValue: new Date(2026, 2, 1),
          minuteInterval: 15,
        }),
      ),
    );
  });

  it("renders virtualized Carousel and SwipeableItem with zero withSpring usage", () => {
    const onIndexChange = mock(() => {});
    const { container } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Carousel,
            { onIndexChange },
            React.createElement(CarouselPrevious, null),
            React.createElement(
              CarouselContent,
              null,
              React.createElement(CarouselItem, null, "Slide 1"),
              React.createElement(CarouselItem, null, "Slide 2"),
            ),
            React.createElement(CarouselNext, null),
          ),
          React.createElement(
            SwipeableItem,
            {
              rightActions: [{ label: "Archive", tone: "primary" }],
            },
            React.createElement("rn-text", null, "Row Item"),
          ),
        ),
      ),
    );

    expect(onIndexChange).toHaveBeenCalledTimes(0);
    expect(collectText(container)).toContain("Slide 1");
    expect(collectText(container)).toContain("Row Item");
    expect(mockUiState.withSpringCallCount).toBe(0);
  });

  it("renders SignaturePad with viewBox SVG export and cleans up AppState animations on unmount", () => {
    const padRef = React.createRef<SignaturePadRef>();
    const { unmount } = renderUI(
      wrap(
        React.createElement(
          React.Fragment,
          null,
          React.createElement(SignaturePad, { ref: padRef, height: 180 }),
          React.createElement(Spinner, { variant: "ring" }),
          React.createElement(Progress, { value: Number.NaN, indeterminate: true }),
          React.createElement(Skeleton, { width: 120, height: 20 }),
        ),
      ),
    );

    expect(padRef.current).not.toBeNull();
    expect(padRef.current?.isEmpty()).toBe(true);
    expect(padRef.current?.getSvg()).toContain('viewBox="0 0');
    expect(mockUiState.appStateListeners.size).toBeGreaterThan(0);

    unmount();
    expect(mockUiState.appStateListeners.size).toBe(0);
  });
});
