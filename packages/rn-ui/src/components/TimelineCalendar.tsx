import React, { useCallback, useMemo } from "react";
import {
  CalendarUtils,
  Timeline as WixTimeline,
  TimelineList as WixTimelineList,
  type TimelineEventProps,
  type TimelineListProps,
  type TimelineListRenderItemInfo,
  type TimelinePackedEventProps,
  type TimelineProps as WixTimelineProps,
} from "react-native-calendars";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { syncCalendarLocale, type LocaleInput } from "../utils/locale";

export {
  CalendarUtils,
  type TimelineEventProps,
  type TimelinePackedEventProps,
  type TimelineListProps,
  type TimelineListRenderItemInfo,
};

export interface TimelineCalendarProps extends WixTimelineProps {
  locale?: LocaleInput;
}

export interface TimelineListWrapperProps extends TimelineListProps {
  locale?: LocaleInput;
}

function buildTimelineTheme(
  colors: ReturnType<typeof useTheme>["colors"],
  radii: ReturnType<typeof useTheme>["radii"],
  resolvedUnavailableColor: string,
  userTheme?: WixTimelineProps["theme"],
) {
  return {
    calendarBackground: colors.surface,
    textSectionTitleColor: colors.textMuted,
    lineColor: colors.border,
    timeLabelColor: colors.textMuted,
    nowIndicatorColor: colors.danger,
    unavailableHoursColor: resolvedUnavailableColor,
    unavailableHoursBlock: {
      backgroundColor: resolvedUnavailableColor,
    },
    event: {
      backgroundColor: colors.primary,
      borderRadius: radii.lg,
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 8,
      paddingBottom: 8,
      borderWidth: 0,
    },
    eventTitle: {
      color: colors.onPrimary,
      fontWeight: "700",
      fontSize: 12.5,
    },
    eventSummary: {
      color: withAlpha(colors.onPrimary, 0.9),
      fontSize: 11,
      marginTop: 2,
    },
    eventTimes: {
      color: withAlpha(colors.onPrimary, 0.78),
      fontSize: 10,
      fontWeight: "600",
      marginTop: 2,
    },
    ...userTheme,
  };
}

export const TimelineCalendar = React.memo(function TimelineCalendar({
  theme,
  styles,
  renderEvent,
  unavailableHoursColor,
  locale,
  ...props
}: TimelineCalendarProps) {
  const { colors, isDark, radii } = useTheme();

  useMemo(() => {
    if (locale !== undefined) syncCalendarLocale(locale);
  }, [locale]);

  const resolvedUnavailableColor =
    unavailableHoursColor ??
    (isDark ? withAlpha("#FFFFFF", 0.05) : withAlpha("#000000", 0.03));

  const customTheme = useMemo(
    () =>
      buildTimelineTheme(colors, radii, resolvedUnavailableColor, theme),
    [colors, radii, resolvedUnavailableColor, theme],
  );

  return (
    <WixTimeline
      {...props}
      key={`${colors.surface}-${colors.primary}-${colors.text}-${radii.lg}`}
      theme={customTheme}
      styles={styles}
      renderEvent={renderEvent}
      unavailableHoursColor={resolvedUnavailableColor}
    />
  );
});

export const TimelineList = React.memo(function TimelineList({
  timelineProps,
  renderItem,
  locale,
  ...props
}: TimelineListWrapperProps) {
  const { colors, isDark, radii } = useTheme();

  useMemo(() => {
    if (locale !== undefined) syncCalendarLocale(locale);
  }, [locale]);

  const resolvedUnavailableColor =
    timelineProps?.unavailableHoursColor ??
    (isDark ? withAlpha("#FFFFFF", 0.05) : withAlpha("#000000", 0.03));

  const customTimelineProps = useMemo(
    () => ({
      ...timelineProps,
      unavailableHoursColor: resolvedUnavailableColor,
      theme: buildTimelineTheme(
        colors,
        radii,
        resolvedUnavailableColor,
        timelineProps?.theme,
      ),
    }),
    [colors, radii, resolvedUnavailableColor, timelineProps],
  );

  const defaultRenderItem = useCallback(
    (itemProps: WixTimelineProps, info: TimelineListRenderItemInfo) => {
      if (renderItem) {
        return renderItem(itemProps, info);
      }
      const { key: _k, ...rest } = (itemProps as unknown || {}) as Record<
        string,
        unknown
      >;
      return (
        <TimelineCalendar
          key={info.item}
          locale={locale}
          {...(rest as unknown as TimelineCalendarProps)}
        />
      );
    },
    [locale, renderItem],
  );

  return (
    <WixTimelineList
      {...props}
      timelineProps={customTimelineProps}
      renderItem={
        defaultRenderItem as unknown as TimelineListProps["renderItem"]
      }
    />
  );
});
