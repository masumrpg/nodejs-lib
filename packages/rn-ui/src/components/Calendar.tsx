import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Calendar as WixCalendar } from "react-native-calendars";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../theme";
import { useDelayedUnmount, withAlpha } from "../utils";
import { triggerHaptic } from "../utils/haptics";
import {
  getLocaleData,
  syncCalendarLocale,
  type LocaleInput,
} from "../utils/locale";
import { Text } from "./Text";
import { ANIMATION_TIMING, minTouchHitSlop, type BaseHapticProps } from "./types";

export interface CalendarDayData {
  year: number;
  month: number;
  day: number;
  timestamp: number;
  dateString: string;
}

export interface CalendarDayMarking {
  selected?: boolean;
  startingDay?: boolean;
  endingDay?: boolean;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  isMiddle?: boolean;
  marked?: boolean;
  dotColor?: string;
  dots?: Array<{ key?: string; color?: string }>;
}

export interface CalendarProps
  extends Omit<
      React.ComponentProps<typeof WixCalendar>,
      "current" | "markedDates"
    >,
    BaseHapticProps {
  style?: StyleProp<ViewStyle>;
  current?: string;
  markedDates?: Record<string, CalendarDayMarking>;
  enableYearMonthPicker?: boolean;
  showTodayButton?: boolean;
  locale?: LocaleInput;
  onTodayPress?: () => void;
}

interface CustomDayProps {
  date?: CalendarDayData;
  state?: "selected" | "disabled" | "today" | "";
  marking?: CalendarDayMarking;
  onPress?: (date: CalendarDayData) => void;
  onLongPress?: (date: CalendarDayData) => void;
  haptic?: boolean;
}

export function parseLocalDateString(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export const CalendarArrow = React.memo(function CalendarArrow({
  direction,
  color,
}: {
  direction: "left" | "right";
  color?: string;
}) {
  const { colors, isDark } = useTheme();
  const arrowColor = color ?? colors.text;

  return (
    <View
      style={[
        styles.arrowCircle,
        {
          backgroundColor: isDark
            ? withAlpha("#FFFFFF", 0.08)
            : withAlpha("#000000", 0.05),
        },
      ]}
    >
      <Svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke={arrowColor}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d={direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </Svg>
    </View>
  );
});

function areDayPropsEqual(prev: CustomDayProps, next: CustomDayProps): boolean {
  if (prev.date?.dateString !== next.date?.dateString) return false;
  if (prev.state !== next.state) return false;
  if (prev.haptic !== next.haptic) return false;

  const prevMarking = prev.marking;
  const nextMarking = next.marking;

  if (prevMarking === nextMarking) return true;
  if (!prevMarking && !nextMarking) return true;
  if (!prevMarking || !nextMarking) return false;

  if (Boolean(prevMarking.selected) !== Boolean(nextMarking.selected)) return false;
  if (Boolean(prevMarking.disabled) !== Boolean(nextMarking.disabled)) return false;
  if (Boolean(prevMarking.marked) !== Boolean(nextMarking.marked)) return false;
  if (prevMarking.color !== nextMarking.color) return false;
  if (prevMarking.textColor !== nextMarking.textColor) return false;
  if (prevMarking.dotColor !== nextMarking.dotColor) return false;
  if (Boolean(prevMarking.startingDay) !== Boolean(nextMarking.startingDay)) return false;
  if (Boolean(prevMarking.endingDay) !== Boolean(nextMarking.endingDay)) return false;
  if (Boolean(prevMarking.isMiddle) !== Boolean(nextMarking.isMiddle)) return false;

  const prevDots = prevMarking.dots;
  const nextDots = nextMarking.dots;
  if (prevDots !== nextDots) {
    if (!prevDots || !nextDots) return false;
    if (prevDots.length !== nextDots.length) return false;
    for (let i = 0; i < prevDots.length; i++) {
      if (
        prevDots[i]?.key !== nextDots[i]?.key ||
        prevDots[i]?.color !== nextDots[i]?.color
      ) {
        return false;
      }
    }
  }

  return true;
}

export const CalendarDayButton = React.memo(function CalendarDayButton({
  date,
  state = "",
  marking = {},
  onPress,
  onLongPress,
  haptic = true,
}: CustomDayProps) {
  const { colors, components, radii, isDark } = useTheme();

  if (!date) return null;

  const isSelected = Boolean(marking.selected || state === "selected");
  const isStart = Boolean(marking.startingDay);
  const isEnd = Boolean(marking.endingDay);
  const isMiddle = Boolean(marking.isMiddle);
  const isToday = state === "today";
  const isDisabled = Boolean(state === "disabled" || marking.disabled);

  const activeColor = marking.color || colors.primary;
  const activeTextColor = marking.textColor || colors.onPrimary;
  const middleBg = isDark
    ? withAlpha(colors.primary, 0.25)
    : colors.primarySoft;
  const middleTextColor = isDark ? colors.text : colors.primary;

  let textColor = colors.text;
  if (isDisabled) {
    textColor = colors.disabledText;
  } else if ((isStart || isEnd || isSelected) && !isMiddle) {
    textColor = activeTextColor;
  } else if (isMiddle) {
    textColor = marking.textColor || middleTextColor;
  } else if (isToday) {
    textColor = colors.primary;
  }

  const hasDots = Boolean(
    (marking.dots && marking.dots.length > 0) || marking.marked,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={date.dateString}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={minTouchHitSlop(36)}
      onPress={() => {
        if (isDisabled) return;
        if (haptic) triggerHaptic("selection");
        onPress?.(date);
      }}
      onLongPress={() => {
        if (isDisabled || !onLongPress) return;
        if (haptic) triggerHaptic("selection");
        onLongPress(date);
      }}
      style={({ pressed }) => [
        styles.dayButton,
        { opacity: isDisabled ? 0.35 : pressed ? 0.78 : 1 },
      ]}
    >
      {isMiddle ? (
        <View
          style={[
            styles.rangeStripFull,
            { backgroundColor: marking.color || middleBg },
          ]}
        />
      ) : null}
      {isStart && !isEnd ? (
        <View
          style={[styles.rangeStripRight, { backgroundColor: middleBg }]}
        />
      ) : null}
      {isEnd && !isStart ? (
        <View
          style={[styles.rangeStripLeft, { backgroundColor: middleBg }]}
        />
      ) : null}

      {isStart || isEnd || isSelected ? (
        <View
          style={[
            styles.dayCircle,
            { borderRadius: radii.full, backgroundColor: activeColor },
          ]}
        />
      ) : isToday ? (
        <View
          style={[
            styles.dayCircle,
            {
              borderRadius: radii.full,
              backgroundColor: colors.backgroundMuted,
              borderWidth: components.borderWidth.strong,
              borderColor: colors.primary,
            },
          ]}
        />
      ) : null}

      <Text
        style={[
          styles.dayText,
          {
            color: textColor,
            fontWeight: isStart || isEnd || isSelected || isToday ? "700" : "400",
            marginTop:
              hasDots && (isStart || isEnd || isSelected || isToday) ? -4 : 0,
          },
        ]}
      >
        {date.day}
      </Text>

      {marking.dots && marking.dots.length > 0 ? (
        <View
          style={[
            styles.dotsRow,
            { bottom: isStart || isEnd || isSelected || isToday ? 5 : 2 },
          ]}
        >
          {marking.dots.map((dot, idx) => (
            <View
              key={dot.key ?? idx}
              style={[
                styles.multiDot,
                {
                  backgroundColor:
                    isStart || isEnd || isSelected
                      ? colors.onPrimary
                      : dot.color || colors.primary,
                },
              ]}
            />
          ))}
        </View>
      ) : marking.marked ? (
        <View
          style={[
            styles.dotsRow,
            { bottom: isStart || isEnd || isSelected || isToday ? 5 : 2 },
          ]}
        >
          <View
            style={[
              styles.singleDot,
              {
                backgroundColor:
                  isStart || isEnd || isSelected
                    ? colors.onPrimary
                    : marking.dotColor || colors.primary,
              },
            ]}
          />
        </View>
      ) : null}
    </Pressable>
  );
}, areDayPropsEqual);

export const Calendar = React.memo(function Calendar({
  style,
  theme,
  markingType = "period",
  markedDates,
  current,
  enableYearMonthPicker = true,
  showTodayButton = true,
  locale,
  haptic = true,
  onTodayPress,
  onMonthChange,
  ...props
}: CalendarProps) {
  const { colors, components, radii } = useTheme();
  const reducedMotion = useReducedMotion();

  const activeLocaleData = useMemo(() => {
    syncCalendarLocale(locale);
    return getLocaleData(locale);
  }, [locale]);

  const initialDate = useMemo(
    () => parseLocalDateString(current),
    [current],
  );
  const [currentMonth, setCurrentMonth] = useState(
    initialDate.getMonth() + 1,
  );
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [overlayHeight, setOverlayHeight] = useState(260);

  const shouldMountMonthOverlay = useDelayedUnmount(
    showMonthSelector,
    reducedMotion ? 0 : 180,
  );
  const shouldMountYearOverlay = useDelayedUnmount(
    showYearSelector,
    reducedMotion ? 0 : 180,
  );

  const monthProgress = useSharedValue(showMonthSelector ? 1 : 0);
  const yearProgress = useSharedValue(showYearSelector ? 1 : 0);

  useEffect(() => {
    monthProgress.value = reducedMotion
      ? showMonthSelector
        ? 1
        : 0
      : withTiming(showMonthSelector ? 1 : 0, {
          duration: ANIMATION_TIMING.transition + 30,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
  }, [monthProgress, reducedMotion, showMonthSelector]);

  useEffect(() => {
    yearProgress.value = reducedMotion
      ? showYearSelector
        ? 1
        : 0
      : withTiming(showYearSelector ? 1 : 0, {
          duration: ANIMATION_TIMING.transition + 30,
          easing: Easing.bezier(...ANIMATION_TIMING.bezier),
        });
  }, [reducedMotion, showYearSelector, yearProgress]);

  const monthOverlayStyle = useAnimatedStyle(() => ({
    opacity: monthProgress.value,
    transform: [{ translateY: -12 * (1 - monthProgress.value) }],
  }));

  const yearOverlayStyle = useAnimatedStyle(() => ({
    opacity: yearProgress.value,
    transform: [{ translateY: -12 * (1 - yearProgress.value) }],
  }));

  useEffect(() => {
    if (current) {
      const parsed = parseLocalDateString(current);
      setCurrentMonth(parsed.getMonth() + 1);
      setCurrentYear(parsed.getFullYear());
    }
  }, [current]);

  const visibleMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;

  const handlePrevMonth = useCallback(() => {
    if (haptic) triggerHaptic("selection");
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 1) {
        setCurrentYear((y) => y - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  }, [haptic]);

  const handleNextMonth = useCallback(() => {
    if (haptic) triggerHaptic("selection");
    setCurrentMonth((prevMonth) => {
      if (prevMonth === 12) {
        setCurrentYear((y) => y + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  }, [haptic]);

  const handleTodayClick = useCallback(() => {
    if (haptic) triggerHaptic("selection");
    const today = new Date();
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
    setShowMonthSelector(false);
    setShowYearSelector(false);
    onTodayPress?.();
  }, [haptic, onTodayPress]);

  const handleMonthChange = useCallback(
    (dateData: CalendarDayData) => {
      setCurrentMonth(dateData.month);
      setCurrentYear(dateData.year);
      onMonthChange?.(dateData);
    },
    [onMonthChange],
  );

  const customTheme = useMemo<React.ComponentProps<typeof WixCalendar>["theme"]>(
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
      ...theme,
    }),
    [colors.disabledText, colors.surface, colors.text, colors.textMuted, theme],
  );

  const years = useMemo(() => {
    const endYear = new Date().getFullYear() + 5;
    const startYear = endYear - 100;
    return Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => endYear - i,
    );
  }, []);

  const renderDayComponent = useCallback(
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
        haptic={haptic}
      />
    ),
    [haptic],
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderCurve: "continuous",
          borderWidth: components.borderWidth.default,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.header,
          {
            borderBottomWidth: components.borderWidth.hairline,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={activeLocaleData.prev || "Previous month"}
          hitSlop={minTouchHitSlop(32)}
          onPress={handlePrevMonth}
          style={({ pressed }) => [
            styles.headerIconBtn,
            {
              borderRadius: radii.md,
              backgroundColor: pressed ? colors.backgroundMuted : "transparent",
            },
          ]}
        >
          <Svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.text}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="m15 18-6-6 6-6" />
          </Svg>
        </Pressable>

        <View style={styles.headerCenter}>
          {enableYearMonthPicker ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select month"
                accessibilityState={{ expanded: showMonthSelector }}
                hitSlop={minTouchHitSlop(28)}
                onPress={() => {
                  if (haptic) triggerHaptic("selection");
                  setShowMonthSelector((prev) => !prev);
                  setShowYearSelector(false);
                }}
                style={({ pressed }) => [
                  styles.pickerTrigger,
                  {
                    borderRadius: radii.md,
                    backgroundColor:
                      showMonthSelector || pressed
                        ? colors.backgroundMuted
                        : "transparent",
                  },
                ]}
              >
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {activeLocaleData.monthNames[currentMonth - 1]}
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Select year"
                accessibilityState={{ expanded: showYearSelector }}
                hitSlop={minTouchHitSlop(28)}
                onPress={() => {
                  if (haptic) triggerHaptic("selection");
                  setShowYearSelector((prev) => !prev);
                  setShowMonthSelector(false);
                }}
                style={({ pressed }) => [
                  styles.pickerTrigger,
                  {
                    borderRadius: radii.md,
                    backgroundColor:
                      showYearSelector || pressed
                        ? colors.backgroundMuted
                        : "transparent",
                  },
                ]}
              >
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {currentYear}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {activeLocaleData.monthNames[currentMonth - 1]} {currentYear}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          {showTodayButton ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={activeLocaleData.today || "Today"}
              hitSlop={minTouchHitSlop(26)}
              onPress={handleTodayClick}
              style={({ pressed }) => [
                styles.todayChip,
                {
                  borderRadius: radii.sm,
                  backgroundColor: pressed
                    ? colors.backgroundMuted
                    : colors.surfaceMuted,
                  borderWidth: components.borderWidth.default,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text variant="caption" weight="600" color="primary">
                {activeLocaleData.today || "Today"}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeLocaleData.next || "Next month"}
            hitSlop={minTouchHitSlop(32)}
            onPress={handleNextMonth}
            style={({ pressed }) => [
              styles.headerIconBtn,
              {
                borderRadius: radii.md,
                backgroundColor: pressed ? colors.backgroundMuted : "transparent",
              },
            ]}
          >
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.text}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="m9 18 6-6-6-6" />
            </Svg>
          </Pressable>
        </View>
      </View>

      {shouldMountMonthOverlay ? (
        <Animated.View
          pointerEvents={showMonthSelector ? "auto" : "none"}
          accessibilityElementsHidden={!showMonthSelector}
          importantForAccessibility={
            showMonthSelector ? "yes" : "no-hide-descendants"
          }
          style={[
            styles.overlay,
            { backgroundColor: colors.surface },
            monthOverlayStyle,
          ]}
        >
          <View style={styles.monthGrid}>
            {activeLocaleData.monthNamesShort.map((m, idx) => {
              const isSel = currentMonth === idx + 1;
              return (
                <Pressable
                  key={`${m}-${idx}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  onPress={() => {
                    if (haptic) triggerHaptic("selection");
                    setCurrentMonth(idx + 1);
                    setShowMonthSelector(false);
                  }}
                  style={({ pressed }) => [
                    styles.monthCell,
                    {
                      borderRadius: radii.md,
                      backgroundColor: isSel ? colors.primary : "transparent",
                      borderWidth: components.borderWidth.default,
                      borderColor: isSel ? colors.primary : colors.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isSel ? "600" : "400",
                      color: isSel ? colors.onPrimary : colors.text,
                    }}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      {shouldMountYearOverlay ? (
        <Animated.View
          pointerEvents={showYearSelector ? "auto" : "none"}
          accessibilityElementsHidden={!showYearSelector}
          importantForAccessibility={
            showYearSelector ? "yes" : "no-hide-descendants"
          }
          onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            if (height > 0) {
              setOverlayHeight(height);
            }
          }}
          style={[
            styles.yearOverlay,
            { backgroundColor: colors.surface },
            yearOverlayStyle,
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.yearScroll}
            contentContainerStyle={[
              styles.yearGrid,
              { height: Math.max(120, overlayHeight - 24) },
            ]}
          >
            {years.map((y) => {
              const isSel = currentYear === y;
              return (
                <Pressable
                  key={y}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  onPress={() => {
                    if (haptic) triggerHaptic("selection");
                    setCurrentYear(y);
                    setShowYearSelector(false);
                  }}
                  style={({ pressed }) => [
                    styles.yearCell,
                    {
                      borderRadius: radii.md,
                      backgroundColor: isSel ? colors.primary : "transparent",
                      borderWidth: components.borderWidth.default,
                      borderColor: isSel ? colors.primary : colors.border,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSel ? "600" : "400",
                      color: isSel ? colors.onPrimary : colors.text,
                    }}
                  >
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : null}

      <WixCalendar
        {...props}
        key={`${colors.surface}-${colors.primary}-${colors.text}-${components.borderWidth.default}`}
        style={styles.wixCalendar}
        theme={customTheme}
        markingType={markingType}
        markedDates={
          markedDates as unknown as React.ComponentProps<
            typeof WixCalendar
          >["markedDates"]
        }
        hideArrows={true}
        renderHeader={() => null}
        initialDate={visibleMonthStr}
        current={visibleMonthStr}
        onMonthChange={
          handleMonthChange as unknown as (date: CalendarDayData) => void
        }
        dayComponent={
          renderDayComponent as unknown as React.ComponentProps<
            typeof WixCalendar
          >["dayComponent"]
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerIconBtn: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  pickerTrigger: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  todayChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButton: {
    width: "100%",
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  rangeStripFull: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 0,
    right: 0,
  },
  rangeStripRight: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: "50%",
    right: 0,
  },
  rangeStripLeft: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 0,
    right: "50%",
  },
  dayCircle: {
    position: "absolute",
    width: 32,
    height: 32,
  },
  dayText: {
    fontSize: 13,
    includeFontPadding: false,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  multiDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 9999,
  },
  singleDot: {
    width: 4,
    height: 4,
    borderRadius: 9999,
  },
  overlay: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    padding: 16,
    justifyContent: "center",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  monthCell: {
    width: "30%",
    margin: 4,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  yearOverlay: {
    position: "absolute",
    top: 52,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  yearScroll: {
    width: "100%",
    height: "100%",
  },
  yearGrid: {
    flexDirection: "column",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  yearCell: {
    width: 75,
    height: 42,
    margin: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  wixCalendar: {
    padding: 8,
  },
});
