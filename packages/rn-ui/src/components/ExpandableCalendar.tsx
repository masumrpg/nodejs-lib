import React, { forwardRef, useCallback, useMemo } from "react";
import { StyleSheet } from "react-native";
import {
  AgendaList as WixAgendaList,
  CalendarProvider as WixCalendarProvider,
  ExpandableCalendar as WixExpandableCalendar,
  WeekCalendar as WixWeekCalendar,
  type AgendaListProps as WixAgendaListProps,
  type CalendarContextProviderProps as WixCalendarContextProviderProps,
  type ExpandableCalendarProps as WixExpandableCalendarProps,
  type WeekCalendarProps as WixWeekCalendarProps,
} from "react-native-calendars";
import { Positions } from "react-native-calendars/src/expandableCalendar";

import { useTheme } from "../theme";
import { syncCalendarLocale, type LocaleInput } from "../utils/locale";
import {
  CalendarArrow,
  CalendarDayButton,
  type CalendarDayData,
  type CalendarDayMarking,
} from "./Calendar";

export { Positions as CalendarPositions };

export type ExpandableCalendarRef = {
  toggleCalendarPosition: () => boolean;
};

export interface ExpandableCalendarProps
  extends Omit<WixExpandableCalendarProps, "markedDates" | "initialPosition"> {
  markedDates?: Record<string, CalendarDayMarking>;
  initialPosition?: "closed" | "open" | Positions;
  locale?: LocaleInput;
  renderArrow?: (direction: "left" | "right") => React.ReactNode;
}

export interface CalendarProviderProps extends WixCalendarContextProviderProps {
  locale?: LocaleInput;
}

export interface AgendaListProps extends WixAgendaListProps {}

export interface WeekCalendarProps
  extends Omit<WixWeekCalendarProps, "markedDates"> {
  markedDates?: Record<string, CalendarDayMarking>;
  locale?: LocaleInput;
}

function resolvePosition(pos: "closed" | "open" | Positions): Positions {
  if (pos === "open") return Positions.OPEN;
  if (pos === "closed") return Positions.CLOSED;
  return pos;
}

export const CalendarProvider = React.memo(function CalendarProvider({
  theme,
  children,
  todayBottomMargin = 20,
  todayButtonStyle,
  locale,
  ...props
}: CalendarProviderProps) {
  const { colors, components, isDark, radii, shadows } = useTheme();

  useMemo(() => {
    if (locale !== undefined) syncCalendarLocale(locale);
  }, [locale]);

  const defaultTheme = useMemo<
    NonNullable<WixCalendarContextProviderProps["theme"]>
  >(() => {
    const userMain = theme?.stylesheet?.expandable?.main;
    return {
      calendarBackground: colors.surface,
      monthTextColor: colors.text,
      textMonthFontWeight: "600",
      textMonthFontSize: 16,
      textSectionTitleColor: colors.textMuted,
      textDayHeaderFontSize: 12,
      textDayHeaderFontWeight: "500",
      arrowColor: colors.text,
      disabledArrowColor: colors.disabledText,
      todayTextColor: colors.primary,
      todayButtonTextColor: colors.primary,
      todayButtonPosition: "left",
      todayButtonFontWeight: "700",
      todayButtonFontSize: 12.5,
      ...theme,
      stylesheet: {
        ...theme?.stylesheet,
        expandable: {
          ...theme?.stylesheet?.expandable,
          main: {
            todayButton: {
              height: 34,
              paddingHorizontal: 14,
              borderRadius: radii.full,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: isDark ? colors.surfaceRaised : colors.surface,
              borderWidth: components.borderWidth.default,
              borderColor: colors.border,
              ...shadows.sm,
            },
            todayButtonText: {
              color: colors.primary,
              fontSize: 12.5,
              fontWeight: "700",
            },
            todayButtonImage: {
              tintColor: colors.primary,
              marginRight: 6,
            },
            todayButtonContainer: {
              position: "absolute",
              left: 20,
              bottom: 0,
            },
            ...userMain,
          },
        },
      },
    };
  }, [
    colors.border,
    colors.disabledText,
    colors.primary,
    colors.surface,
    colors.surfaceRaised,
    colors.text,
    colors.textMuted,
    components.borderWidth.default,
    isDark,
    radii.full,
    shadows.sm,
    theme,
  ]);

  const resolvedTodayButtonStyle = useMemo(
    () =>
      StyleSheet.flatten([
        {
          backgroundColor: isDark ? colors.surfaceRaised : colors.surface,
          borderColor: colors.border,
          borderWidth: components.borderWidth.default,
          borderRadius: radii.full,
          ...shadows.sm,
        },
        todayButtonStyle,
      ]) ?? undefined,
    [
      colors.border,
      colors.surface,
      colors.surfaceRaised,
      components.borderWidth.default,
      isDark,
      radii.full,
      shadows.sm,
      todayButtonStyle,
    ],
  );

  return (
    <WixCalendarProvider
      {...props}
      theme={defaultTheme}
      todayBottomMargin={todayBottomMargin}
      todayButtonStyle={resolvedTodayButtonStyle}
    >
      {children}
    </WixCalendarProvider>
  );
});

export const ExpandableCalendar = React.memo(
  forwardRef<ExpandableCalendarRef, ExpandableCalendarProps>(
    function ExpandableCalendar(
      {
        theme,
        markedDates,
        renderArrow,
        initialPosition = "closed",
        locale,
        ...props
      },
      ref,
    ) {
      const { colors, components, isDark, radii, shadows } = useTheme();

      useMemo(() => {
        if (locale !== undefined) syncCalendarLocale(locale);
      }, [locale]);

      const customTheme = useMemo<
        NonNullable<WixExpandableCalendarProps["theme"]>
      >(() => {
        const userMain = theme?.stylesheet?.expandable?.main;
        return {
          calendarBackground: colors.surface,
          monthTextColor: colors.text,
          textMonthFontWeight: "600",
          textMonthFontSize: 16,
          textSectionTitleColor: colors.textMuted,
          textDayHeaderFontSize: 12,
          textDayHeaderFontWeight: "500",
          arrowColor: colors.text,
          disabledArrowColor: colors.disabledText,
          todayTextColor: colors.primary,
          backgroundColor: colors.surface,
          ...theme,
          stylesheet: {
            ...theme?.stylesheet,
            expandable: {
              ...theme?.stylesheet?.expandable,
              main: {
                knobContainer: {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: 24,
                  bottom: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.surface,
                  borderBottomLeftRadius: radii.xl,
                  borderBottomRightRadius: radii.xl,
                },
                knob: {
                  width: 36,
                  height: 4,
                  borderRadius: radii.full,
                  backgroundColor: colors.border,
                },
                todayButton: {
                  height: 34,
                  paddingHorizontal: 14,
                  borderRadius: radii.full,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: isDark ? colors.surfaceRaised : colors.surface,
                  borderWidth: components.borderWidth.default,
                  borderColor: colors.border,
                  ...shadows.sm,
                },
                todayButtonText: {
                  color: colors.primary,
                  fontSize: 12.5,
                  fontWeight: "700",
                },
                todayButtonImage: {
                  tintColor: colors.primary,
                  marginRight: 6,
                },
                ...userMain,
              },
            },
          },
        };
      }, [
        colors.border,
        colors.disabledText,
        colors.primary,
        colors.surface,
        colors.surfaceRaised,
        colors.text,
        colors.textMuted,
        components.borderWidth.default,
        isDark,
        radii.full,
        radii.xl,
        shadows.sm,
        theme,
      ]);

      const defaultRenderArrow = useCallback(
        (direction: "left" | "right") => (
          <CalendarArrow direction={direction} />
        ),
        [],
      );

      const renderDay = useCallback(
        ({
          date,
          state,
          marking,
          onPress,
          onLongPress,
        }: {
          date?: CalendarDayData;
          state?: string;
          marking?: CalendarDayMarking;
          onPress?: (date: CalendarDayData) => void;
          onLongPress?: (date: CalendarDayData) => void;
        }) => (
          <CalendarDayButton
            date={date}
            state={state as "selected" | "disabled" | "today" | ""}
            marking={marking}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        ),
        [],
      );

      return (
        <WixExpandableCalendar
          {...props}
          key={`${colors.surface}-${colors.primary}-${colors.text}-${components.borderWidth.default}`}
          ref={ref as never}
          theme={customTheme}
          initialPosition={resolvePosition(initialPosition)}
          renderArrow={renderArrow ?? defaultRenderArrow}
          markedDates={
            markedDates as unknown as WixExpandableCalendarProps["markedDates"]
          }
          dayComponent={
            renderDay as unknown as WixExpandableCalendarProps["dayComponent"]
          }
        />
      );
    },
  ),
);

export const AgendaList = React.memo(function AgendaList({
  theme,
  sectionStyle,
  ...props
}: AgendaListProps) {
  const { colors } = useTheme();

  const defaultSectionStyle = useMemo(
    () =>
      StyleSheet.flatten([
        {
          backgroundColor: colors.surfaceMuted,
          color: colors.textMuted,
          textTransform: "capitalize" as const,
          paddingHorizontal: 12,
          paddingVertical: 6,
        },
        sectionStyle,
      ]) ?? undefined,
    [colors.surfaceMuted, colors.textMuted, sectionStyle],
  );

  return (
    <WixAgendaList
      {...props}
      theme={theme}
      sectionStyle={defaultSectionStyle}
    />
  );
});

export const WeekCalendar = React.memo(function WeekCalendar({
  theme,
  markedDates,
  locale,
  ...props
}: WeekCalendarProps) {
  const { colors } = useTheme();

  useMemo(() => {
    if (locale !== undefined) syncCalendarLocale(locale);
  }, [locale]);

  const customTheme = useMemo<NonNullable<WixWeekCalendarProps["theme"]>>(
    () => ({
      calendarBackground: colors.surface,
      monthTextColor: colors.text,
      textMonthFontWeight: "600",
      textMonthFontSize: 16,
      textSectionTitleColor: colors.textMuted,
      textDayHeaderFontSize: 12,
      textDayHeaderFontWeight: "500",
      arrowColor: colors.text,
      disabledArrowColor: colors.disabledText,
      todayTextColor: colors.primary,
      ...theme,
    }),
    [colors.disabledText, colors.primary, colors.surface, colors.text, colors.textMuted, theme],
  );

  const renderDay = useCallback(
    ({
      date,
      state,
      marking,
      onPress,
      onLongPress,
    }: {
      date?: CalendarDayData;
      state?: string;
      marking?: CalendarDayMarking;
      onPress?: (date: CalendarDayData) => void;
      onLongPress?: (date: CalendarDayData) => void;
    }) => (
      <CalendarDayButton
        date={date}
        state={state as "selected" | "disabled" | "today" | ""}
        marking={marking}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    ),
    [],
  );

  return (
    <WixWeekCalendar
      {...props}
      key={`${colors.surface}-${colors.primary}-${colors.text}`}
      theme={customTheme}
      markedDates={markedDates as unknown as WixWeekCalendarProps["markedDates"]}
      dayComponent={renderDay as unknown as WixWeekCalendarProps["dayComponent"]}
    />
  );
});
