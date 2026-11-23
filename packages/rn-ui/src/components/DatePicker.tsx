import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../theme";
import { withAlpha } from "../utils/color";
import { triggerHaptic } from "../utils/haptics";
import { getLocaleData, LocaleConfig, type LocaleInput } from "../utils/locale";
import { Button } from "./Button";
import { Calendar } from "./Calendar";
import { SegmentedControl } from "./SegmentedControl";
import { Text } from "./Text";
import { minTouchHitSlop, webDeps, type BaseHapticProps } from "./types";

export type DatePickerVariant = "wheel" | "calendar";

export type DatePickerMode =
  | "date"
  | "time"
  | "datetime"
  | "month-year"
  | "year";

export type DatePickerOrder = ("year" | "month" | "day")[];

export type MonthFormat = "short" | "full" | "numeric";

export interface WheelPickerItem<T = string | number> {
  label: string;
  value: T;
}

export interface WheelPickerColumnProps<T = string | number>
  extends BaseHapticProps {
  items: WheelPickerItem<T>[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  itemHeight?: number;
  visibleItems?: number;
  hapticType?:
    | "light"
    | "medium"
    | "heavy"
    | "soft"
    | "rigid"
    | "selection";
  itemStyle?: StyleProp<TextStyle>;
  selectedItemStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

function getDaysInMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

function formatDateToIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTime(
  date: Date,
  is24Hour: boolean = true,
  locale?: LocaleInput,
): string {
  const hours = date.getHours();
  const mins = String(date.getMinutes()).padStart(2, "0");

  if (is24Hour) {
    return `${String(hours).padStart(2, "0")}:${mins}`;
  }

  const localeData = getLocaleData(locale);
  const isPM = hours >= 12;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const ampm = isPM ? localeData.pm : localeData.am;
  return `${String(h12).padStart(2, "0")}:${mins} ${ampm}`;
}

function buildUpdatedDate(
  base: Date,
  parts: {
    year?: number;
    month?: number;
    day?: number;
    hours?: number;
    minutes?: number;
  },
): Date {
  const year = parts.year ?? base.getFullYear();
  const month = parts.month ?? base.getMonth();
  const maxDay = getDaysInMonth(year, month);
  const day = Math.min(parts.day ?? base.getDate(), maxDay);
  const hours = parts.hours ?? base.getHours();
  const minutes = parts.minutes ?? base.getMinutes();
  return new Date(
    year,
    month,
    day,
    hours,
    minutes,
    base.getSeconds(),
    base.getMilliseconds(),
  );
}

interface AnimatedWheelItemProps {
  label: string;
  index: number;
  isSelected: boolean;
  scrollY: SharedValue<number>;
  itemHeight: number;
  onPress: (index: number) => void;
  textColor: string;
  itemStyle?: StyleProp<TextStyle>;
  selectedItemStyle?: StyleProp<TextStyle>;
}

const AnimatedWheelItem = React.memo(function AnimatedWheelItem({
  label,
  index,
  isSelected,
  scrollY,
  itemHeight,
  onPress,
  textColor,
  itemStyle,
  selectedItemStyle,
}: AnimatedWheelItemProps) {
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      const distance = Math.abs(scrollY.value - index * itemHeight);
      const opacity = distance < itemHeight * 0.6 ? 1 : 0.4;
      return { opacity };
    }

    const itemPosition = index * itemHeight;
    const distance = Math.abs(scrollY.value - itemPosition);
    const normalizedDistance = itemHeight > 0 ? distance / itemHeight : 0;

    // Fast-path early exit for off-screen rows (beyond visible window + 1 row buffer)
    // Avoids running 3D rotateX and perspective calculations on 100+ off-screen items per frame
    if (normalizedDistance > 3.2) {
      return {
        opacity: 0,
        transform: [{ perspective: 600 }, { rotateX: "0deg" }, { scale: 0.85 }],
      };
    }

    const opacity = interpolate(
      normalizedDistance,
      [0, 1, 2, 3],
      [1, 0.52, 0.24, 0.08],
      "clamp",
    );

    const scale = interpolate(
      normalizedDistance,
      [0, 1, 2],
      [1, 0.93, 0.85],
      "clamp",
    );

    const rawVal =
      itemHeight > 0 ? (scrollY.value - itemPosition) / itemHeight : 0;
    const interpDeg = interpolate(
      Number.isFinite(rawVal) ? rawVal : 0,
      [-2, -1, 0, 1, 2],
      [36, 18, 0, -18, -36],
      "clamp",
    );
    const rotateX = `${Number.isFinite(interpDeg) ? interpDeg : 0}deg`;

    return {
      opacity,
      transform: [{ perspective: 600 }, { rotateX }, { scale }],
    };
  }, webDeps([index, itemHeight, reducedMotion]));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onPress(index)}
      style={[styles.wheelItemPress, { height: itemHeight }]}
    >
      <Animated.View style={[styles.wheelItemInner, animatedStyle]}>
        <Text
          style={[
            styles.wheelItemText,
            { color: textColor },
            itemStyle,
            isSelected ? selectedItemStyle : undefined,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export const WheelPickerColumn = React.memo(function WheelPickerColumn<
  T = string | number,
>({
  items,
  selectedValue,
  onValueChange,
  itemHeight = 44,
  visibleItems = 5,
  haptic = true,
  hapticType = "selection",
  itemStyle,
  selectedItemStyle,
  style,
}: WheelPickerColumnProps<T>) {
  const { colors } = useTheme();
  const scrollRef = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
  const containerHeight = itemHeight * visibleItems;
  const paddingCount = Math.floor(visibleItems / 2);
  const scrollY = useSharedValue(0);

  const hasInitialScrolledRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isMomentumRef = useRef(false);
  const dragCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndex = useMemo(() => {
    const idx = items.findIndex((it) => it.value === selectedValue);
    return idx >= 0 ? idx : 0;
  }, [items, selectedValue]);

  useEffect(() => {
    scrollY.value = selectedIndex * itemHeight;
    if (
      !isDraggingRef.current &&
      !isMomentumRef.current &&
      scrollRef.current &&
      items.length > 0
    ) {
      scrollRef.current.scrollTo({
        y: selectedIndex * itemHeight,
        animated: false,
      });
    }
  }, [selectedIndex, itemHeight, items.length, scrollY]);

  const handleLayout = useCallback(() => {
    if (!hasInitialScrolledRef.current && items.length > 0) {
      hasInitialScrolledRef.current = true;
      scrollY.value = selectedIndex * itemHeight;
      scrollRef.current?.scrollTo({
        y: selectedIndex * itemHeight,
        animated: false,
      });
    }
  }, [itemHeight, items.length, scrollY, selectedIndex]);

  useEffect(
    () => () => {
      if (dragCommitTimerRef.current) {
        clearTimeout(dragCommitTimerRef.current);
      }
    },
    [],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const commitOffset = useCallback(
    (offsetY: number) => {
      const index = Math.round(offsetY / itemHeight);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const picked = items[clampedIndex];
      if (picked && picked.value !== selectedValue) {
        if (haptic) triggerHaptic(hapticType);
        onValueChange(picked.value);
      }
    },
    [haptic, hapticType, itemHeight, items, onValueChange, selectedValue],
  );

  const handleScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
    isMomentumRef.current = false;
    if (dragCommitTimerRef.current) {
      clearTimeout(dragCommitTimerRef.current);
      dragCommitTimerRef.current = null;
    }
  }, []);

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isDraggingRef.current = false;
      const offsetY = event.nativeEvent.contentOffset.y;
      if (dragCommitTimerRef.current) {
        clearTimeout(dragCommitTimerRef.current);
      }
      dragCommitTimerRef.current = setTimeout(() => {
        if (!isMomentumRef.current) {
          commitOffset(offsetY);
        }
      }, 60);
    },
    [commitOffset],
  );

  const handleMomentumScrollBegin = useCallback(() => {
    isMomentumRef.current = true;
    if (dragCommitTimerRef.current) {
      clearTimeout(dragCommitTimerRef.current);
      dragCommitTimerRef.current = null;
    }
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isMomentumRef.current = false;
      isDraggingRef.current = false;
      commitOffset(event.nativeEvent.contentOffset.y);
    },
    [commitOffset],
  );

  const handleItemPress = useCallback(
    (index: number) => {
      scrollRef.current?.scrollTo({
        y: index * itemHeight,
        animated: true,
      });
      if (haptic) triggerHaptic(hapticType);
      const picked = items[index];
      if (picked && picked.value !== selectedValue) {
        onValueChange(picked.value);
      }
    },
    [haptic, hapticType, itemHeight, items, onValueChange, selectedValue],
  );

  return (
    <View style={[styles.wheelColumn, { height: containerHeight }, style]}>
      <Animated.ScrollView
        ref={scrollRef}
        nestedScrollEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onLayout={handleLayout}
        onScroll={scrollHandler}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: paddingCount * itemHeight,
        }}
      >
        {items.map((option, idx) => (
          <AnimatedWheelItem
            key={`${idx}-${String(option.value)}`}
            label={option.label}
            index={idx}
            isSelected={idx === selectedIndex}
            scrollY={scrollY}
            itemHeight={itemHeight}
            onPress={handleItemPress}
            textColor={colors.text}
            itemStyle={itemStyle}
            selectedItemStyle={selectedItemStyle}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}) as <T = string | number>(
  props: WheelPickerColumnProps<T>,
) => React.ReactElement | null;

export interface DatePickerProps extends BaseHapticProps {
  value?: Date;
  defaultValue?: Date;
  onChange?: (date: Date) => void;
  variant?: DatePickerVariant;
  mode?: DatePickerMode;
  order?: DatePickerOrder;
  monthFormat?: MonthFormat;
  locale?: LocaleInput;
  is24Hour?: boolean;
  startYear?: number;
  endYear?: number;
  minuteInterval?: number;
  itemHeight?: number;
  visibleItems?: number;
  highlightColor?: string;
  selectedItemStyle?: StyleProp<TextStyle>;
  itemStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}

export const DatePicker = React.memo(function DatePicker({
  value,
  defaultValue,
  onChange,
  variant = "wheel",
  mode = "date",
  order = ["year", "month", "day"],
  monthFormat = "short",
  locale,
  is24Hour = true,
  startYear = 1940,
  endYear = new Date().getFullYear() + 10,
  minuteInterval = 1,
  itemHeight = 44,
  visibleItems = 5,
  highlightColor,
  haptic = true,
  selectedItemStyle,
  itemStyle,
  style,
}: DatePickerProps) {
  const { colors, components, radii, spacing } = useTheme();
  const localeData = useMemo(() => getLocaleData(locale), [locale]);
  const [internalDate, setInternalDate] = useState<Date>(
    () => value ?? defaultValue ?? new Date(),
  );

  const isControlled = value !== undefined;
  const currentDate = isControlled ? value : internalDate;

  const emitChange = useCallback(
    (next: Date) => {
      if (!isControlled) {
        setInternalDate(next);
      }
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  const safeMinuteInterval = useMemo(() => {
    if (!Number.isFinite(minuteInterval)) return 1;
    return Math.max(1, Math.min(60, Math.trunc(minuteInterval)));
  }, [minuteInterval]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  const hours = currentDate.getHours();
  const rawMinutes = currentDate.getMinutes();

  const isPM = hours >= 12;
  const current12Hour = hours % 12 === 0 ? 12 : hours % 12;
  const currentAmPm = isPM ? "PM" : "AM";

  const yearItems = useMemo<WheelPickerItem<number>[]>(() => {
    const list: WheelPickerItem<number>[] = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push({ label: String(y), value: y });
    }
    return list;
  }, [startYear, endYear]);

  const monthItems = useMemo<WheelPickerItem<number>[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        let label = String(i + 1).padStart(2, "0");
        if (monthFormat === "short") {
          label = localeData.monthNamesShort[i] || label;
        } else if (monthFormat === "full") {
          label = localeData.monthNames[i] || label;
        }
        return { label, value: i };
      }),
    [monthFormat, localeData],
  );

  const dayItems = useMemo<WheelPickerItem<number>[]>(() => {
    const maxDays = getDaysInMonth(year, month);
    return Array.from({ length: maxDays }, (_, i) => {
      const d = i + 1;
      return { label: String(d).padStart(2, "0"), value: d };
    });
  }, [year, month]);

  const hour24Items = useMemo<WheelPickerItem<number>[]>(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        label: String(i).padStart(2, "0"),
        value: i,
      })),
    [],
  );

  const hour12Items = useMemo<WheelPickerItem<number>[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const h = i + 1;
        return { label: String(h).padStart(2, "0"), value: h };
      }),
    [],
  );

  const amPmItems = useMemo<WheelPickerItem<string>[]>(
    () => [
      { label: localeData.am, value: "AM" },
      { label: localeData.pm, value: "PM" },
    ],
    [localeData.am, localeData.pm],
  );

  const minuteItems = useMemo<WheelPickerItem<number>[]>(() => {
    const list: WheelPickerItem<number>[] = [];
    for (let m = 0; m < 60; m += safeMinuteInterval) {
      list.push({ label: String(m).padStart(2, "0"), value: m });
    }
    return list;
  }, [safeMinuteInterval]);

  const snappedMinutes = useMemo(() => {
    let best = minuteItems[0]?.value ?? 0;
    let bestDist = Infinity;
    for (const item of minuteItems) {
      const dist = Math.abs(item.value - rawMinutes);
      if (dist < bestDist) {
        bestDist = dist;
        best = item.value;
      }
    }
    return best;
  }, [minuteItems, rawMinutes]);

  const handleYearChange = useCallback(
    (newYear: number) => {
      emitChange(buildUpdatedDate(currentDate, { year: newYear }));
    },
    [currentDate, emitChange],
  );

  const handleMonthChange = useCallback(
    (newMonth: number) => {
      emitChange(buildUpdatedDate(currentDate, { month: newMonth }));
    },
    [currentDate, emitChange],
  );

  const handleDayChange = useCallback(
    (newDay: number) => {
      emitChange(buildUpdatedDate(currentDate, { day: newDay }));
    },
    [currentDate, emitChange],
  );

  const handle24HourChange = useCallback(
    (newHour: number) => {
      emitChange(buildUpdatedDate(currentDate, { hours: newHour }));
    },
    [currentDate, emitChange],
  );

  const handle12HourChange = useCallback(
    (new12Hour: number) => {
      const new24Hour = isPM
        ? new12Hour === 12
          ? 12
          : new12Hour + 12
        : new12Hour === 12
          ? 0
          : new12Hour;
      emitChange(buildUpdatedDate(currentDate, { hours: new24Hour }));
    },
    [currentDate, emitChange, isPM],
  );

  const handleAmPmChange = useCallback(
    (newAmPm: string) => {
      let new24Hour = hours;
      if (newAmPm === "PM" && hours < 12) {
        new24Hour = hours + 12;
      } else if (newAmPm === "AM" && hours >= 12) {
        new24Hour = hours - 12;
      }
      emitChange(buildUpdatedDate(currentDate, { hours: new24Hour }));
    },
    [currentDate, emitChange, hours],
  );

  const handleMinuteChange = useCallback(
    (newMinute: number) => {
      emitChange(buildUpdatedDate(currentDate, { minutes: newMinute }));
    },
    [currentDate, emitChange],
  );

  const renderDateColumn = (col: "year" | "month" | "day") => {
    if (col === "year") {
      return (
        <WheelPickerColumn
          key="year"
          items={yearItems}
          selectedValue={year}
          onValueChange={handleYearChange}
          itemHeight={itemHeight}
          visibleItems={visibleItems}
          haptic={haptic}
          itemStyle={itemStyle}
          selectedItemStyle={selectedItemStyle}
        />
      );
    }
    if (col === "month") {
      return (
        <WheelPickerColumn
          key="month"
          items={monthItems}
          selectedValue={month}
          onValueChange={handleMonthChange}
          itemHeight={itemHeight}
          visibleItems={visibleItems}
          haptic={haptic}
          itemStyle={itemStyle}
          selectedItemStyle={selectedItemStyle}
        />
      );
    }
    return (
      <WheelPickerColumn
        key="day"
        items={dayItems}
        selectedValue={day}
        onValueChange={handleDayChange}
        itemHeight={itemHeight}
        visibleItems={visibleItems}
        haptic={haptic}
        itemStyle={itemStyle}
        selectedItemStyle={selectedItemStyle}
      />
    );
  };

  if (
    variant === "calendar" &&
    mode !== "time" &&
    mode !== "month-year" &&
    mode !== "year"
  ) {
    const isoString = formatDateToIso(currentDate);

    return (
      <View style={[styles.calendarWrap, { gap: spacing.md }, style]}>
        <Calendar
          current={isoString}
          locale={locale}
          haptic={haptic}
          markedDates={{
            [isoString]: {
              selected: true,
              color: colors.primary,
              textColor: colors.onPrimary,
            },
          }}
          onDayPress={(dayData) => {
            if (haptic) triggerHaptic("selection");
            emitChange(
              buildUpdatedDate(currentDate, {
                year: dayData.year,
                month: dayData.month - 1,
                day: dayData.day,
              }),
            );
          }}
        />

        {mode === "datetime" ? (
          <View
            style={[
              styles.inlineTimeSection,
              {
                paddingTop: spacing.xs,
                borderTopWidth: components.borderWidth.default,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.inlineTimeLabel, { color: colors.textMuted }]}>
              {localeData.selectTime} ({is24Hour ? "24H" : `${localeData.am}/${localeData.pm}`})
            </Text>
            <View style={styles.inlineTimeRow}>
              {is24Hour ? (
                <WheelPickerColumn
                  items={hour24Items}
                  selectedValue={hours}
                  onValueChange={handle24HourChange}
                  itemHeight={34}
                  visibleItems={3}
                  haptic={haptic}
                />
              ) : (
                <WheelPickerColumn
                  items={hour12Items}
                  selectedValue={current12Hour}
                  onValueChange={handle12HourChange}
                  itemHeight={34}
                  visibleItems={3}
                  haptic={haptic}
                />
              )}

              <Text style={[styles.colon, { color: colors.text }]}>:</Text>

              <WheelPickerColumn
                items={minuteItems}
                selectedValue={snappedMinutes}
                onValueChange={handleMinuteChange}
                itemHeight={34}
                visibleItems={3}
                haptic={haptic}
              />

              {!is24Hour ? (
                <WheelPickerColumn
                  items={amPmItems}
                  selectedValue={currentAmPm}
                  onValueChange={handleAmPmChange}
                  itemHeight={34}
                  visibleItems={3}
                  haptic={haptic}
                  style={styles.amPmNarrow}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  const containerHeight = itemHeight * visibleItems;

  return (
    <View
      style={[
        styles.wheelContainer,
        { height: containerHeight },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.selectionHighlight,
          {
            top: (containerHeight - itemHeight) / 2,
            height: itemHeight,
            borderRadius: radii.md,
            backgroundColor: highlightColor ?? colors.surfaceRaised,
            borderTopWidth: components.borderWidth.hairline,
            borderBottomWidth: components.borderWidth.hairline,
            borderColor: colors.border,
          },
        ]}
      />

      {mode === "date" ? order.map((col) => renderDateColumn(col)) : null}

      {mode === "month-year" ? (
        <>
          {renderDateColumn("month")}
          {renderDateColumn("year")}
        </>
      ) : null}

      {mode === "year" ? renderDateColumn("year") : null}

      {mode === "time" ? (
        <>
          {is24Hour ? (
            <WheelPickerColumn
              key="hours-24"
              items={hour24Items}
              selectedValue={hours}
              onValueChange={handle24HourChange}
              itemHeight={itemHeight}
              visibleItems={visibleItems}
              haptic={haptic}
              itemStyle={itemStyle}
              selectedItemStyle={selectedItemStyle}
            />
          ) : (
            <WheelPickerColumn
              key="hours-12"
              items={hour12Items}
              selectedValue={current12Hour}
              onValueChange={handle12HourChange}
              itemHeight={itemHeight}
              visibleItems={visibleItems}
              haptic={haptic}
              itemStyle={itemStyle}
              selectedItemStyle={selectedItemStyle}
            />
          )}

          <Text style={[styles.colonLarge, { color: colors.text }]}>:</Text>

          <WheelPickerColumn
            key="minutes"
            items={minuteItems}
            selectedValue={snappedMinutes}
            onValueChange={handleMinuteChange}
            itemHeight={itemHeight}
            visibleItems={visibleItems}
            haptic={haptic}
            itemStyle={itemStyle}
            selectedItemStyle={selectedItemStyle}
          />

          {!is24Hour ? (
            <WheelPickerColumn
              key="ampm"
              items={amPmItems}
              selectedValue={currentAmPm}
              onValueChange={handleAmPmChange}
              itemHeight={itemHeight}
              visibleItems={visibleItems}
              haptic={haptic}
              itemStyle={itemStyle}
              selectedItemStyle={selectedItemStyle}
              style={styles.amPmWide}
            />
          ) : null}
        </>
      ) : null}

      {mode === "datetime" ? (
        <>
          {order.map((col) => renderDateColumn(col))}
          <View
            style={[
              styles.datetimeDivider,
              {
                height: containerHeight * 0.7,
                backgroundColor: colors.border,
              },
            ]}
          />

          {is24Hour ? (
            <WheelPickerColumn
              key="dt-hours-24"
              items={hour24Items}
              selectedValue={hours}
              onValueChange={handle24HourChange}
              itemHeight={itemHeight}
              visibleItems={visibleItems}
              haptic={haptic}
              itemStyle={itemStyle}
              selectedItemStyle={selectedItemStyle}
            />
          ) : (
            <WheelPickerColumn
              key="dt-hours-12"
              items={hour12Items}
              selectedValue={current12Hour}
              onValueChange={handle12HourChange}
              itemHeight={itemHeight}
              visibleItems={visibleItems}
              haptic={haptic}
              itemStyle={itemStyle}
              selectedItemStyle={selectedItemStyle}
            />
          )}

          <Text style={[styles.colon, { color: colors.text }]}>:</Text>

          <WheelPickerColumn
            key="dt-minutes"
            items={minuteItems}
            selectedValue={snappedMinutes}
            onValueChange={handleMinuteChange}
            itemHeight={itemHeight}
            visibleItems={visibleItems}
            haptic={haptic}
            itemStyle={itemStyle}
            selectedItemStyle={selectedItemStyle}
          />

          {!is24Hour ? (
            <WheelPickerColumn
              key="dt-ampm"
              items={amPmItems}
              selectedValue={currentAmPm}
              onValueChange={handleAmPmChange}
              itemHeight={itemHeight}
              visibleItems={visibleItems}
              haptic={haptic}
              itemStyle={itemStyle}
              selectedItemStyle={selectedItemStyle}
              style={styles.amPmNarrow}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
});

export interface DatePickerCardProps extends DatePickerProps {
  title?: string;
  onClose?: () => void;
  onConfirm?: (date: Date) => void;
  confirmText?: string;
  showVariantToggle?: boolean;
  locale?: LocaleInput;
  is24Hour?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
}

export const DatePickerCard = React.memo(function DatePickerCard({
  title,
  value,
  defaultValue,
  onChange,
  onClose,
  onConfirm,
  confirmText,
  variant = "wheel",
  showVariantToggle = true,
  locale,
  is24Hour = true,
  mode = "date",
  order = ["year", "month", "day"],
  haptic = true,
  cardStyle,
  ...props
}: DatePickerCardProps) {
  const { colors, components, radii, shadows, spacing } = useTheme();
  const localeData = useMemo(() => getLocaleData(locale), [locale]);
  const [internalDate, setInternalDate] = useState(
    () => value ?? defaultValue ?? new Date(),
  );
  const [currentVariant, setCurrentVariant] = useState<DatePickerVariant>(
    variant ?? "wheel",
  );

  const resolvedTitle = useMemo(() => {
    if (title) return title;
    if (mode === "time") return localeData.selectTime;
    if (mode === "datetime") {
      return `${localeData.selectDate} & ${localeData.selectTime}`;
    }
    return localeData.selectDate;
  }, [localeData.selectDate, localeData.selectTime, mode, title]);

  useEffect(() => {
    if (value) {
      setInternalDate(value);
    }
  }, [value]);

  useEffect(() => {
    if (variant) {
      setCurrentVariant(variant);
    }
  }, [variant]);

  const handleChange = useCallback(
    (d: Date) => {
      setInternalDate(d);
      onChange?.(d);
    },
    [onChange],
  );

  const handleConfirm = useCallback(() => {
    if (haptic) triggerHaptic("selection");
    onConfirm?.(internalDate);
  }, [haptic, internalDate, onConfirm]);

  const supportsCalendarVariant =
    mode === "date" || mode === "datetime";

  const summaryText = useMemo(() => {
    const dName = localeData.dayNames[internalDate.getDay()];
    const dayNum = internalDate.getDate();
    const monthName = localeData.monthNames[internalDate.getMonth()];
    const yearNum = internalDate.getFullYear();
    const timeStr = formatTime(internalDate, is24Hour, locale);

    if (mode === "time") return timeStr;
    if (mode === "datetime") {
      return `${dName}, ${dayNum} ${monthName} ${yearNum} • ${timeStr}`;
    }
    if (mode === "month-year") return `${monthName} ${yearNum}`;
    if (mode === "year") return `${yearNum}`;
    return `${dName}, ${dayNum} ${monthName} ${yearNum}`;
  }, [internalDate, is24Hour, locale, localeData.dayNames, localeData.monthNames, mode]);

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: radii.xl,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          borderWidth: components.borderWidth.default,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        },
        shadows.lg,
        cardStyle,
      ]}
    >
      <View style={[styles.cardHeader, { paddingBottom: spacing.xs }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          {resolvedTitle}
        </Text>

        <View style={styles.cardHeaderActions}>
          {showVariantToggle && supportsCalendarVariant ? (
            <SegmentedControl
              variant="flush"
              size="xs"
              haptic={haptic}
              values={[
                { label: localeData.wheel, value: "wheel" },
                { label: localeData.calendar, value: "calendar" },
              ]}
              selectedIndex={currentVariant === "calendar" ? 1 : 0}
              onChange={(_, next) =>
                setCurrentVariant(next === "calendar" ? "calendar" : "wheel")
              }
              style={styles.variantSwitch}
            />
          ) : null}

          {onClose ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={localeData.cancel}
              onPress={() => {
                if (haptic) triggerHaptic("selection");
                onClose();
              }}
              hitSlop={minTouchHitSlop(26)}
              style={[styles.closeButton, { borderRadius: radii.full }]}
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textMuted}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M18 6L6 18M6 6l12 12" />
              </Svg>
            </Pressable>
          ) : null}
        </View>
      </View>

      <DatePicker
        {...props}
        value={internalDate}
        onChange={handleChange}
        variant={currentVariant}
        locale={locale}
        is24Hour={is24Hour}
        mode={mode}
        order={order}
        haptic={haptic}
      />

      <View
        style={[
          styles.summaryBox,
          {
            backgroundColor: colors.backgroundMuted,
            borderRadius: radii.md,
            borderWidth: components.borderWidth.hairline,
            borderColor: colors.border,
          },
        ]}
      >
        <Svg
          width={15}
          height={15}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {mode === "time" ? (
            <>
              <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <Path d="M12 6v6l4 2" />
            </>
          ) : (
            <>
              <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
              <Path d="M16 2v4M8 2v4M3 10h18" />
            </>
          )}
        </Svg>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {summaryText}
        </Text>
      </View>

      <Button
        variant="filled"
        tone="primary"
        size="lg"
        fullWidth
        style={{
          borderRadius: radii.xl,
          marginTop: spacing.xs,
        }}
        onPress={handleConfirm}
      >
        {confirmText ?? localeData.confirm}
      </Button>
    </View>
  );
});

export interface DatePickerModalProps extends DatePickerCardProps {
  visible: boolean;
  onClose: () => void;
}

export const DatePickerModal = React.memo(function DatePickerModal({
  visible,
  onClose,
  ...props
}: DatePickerModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close date picker"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        >
          <View
            style={[
              styles.flexOne,
              { backgroundColor: withAlpha("#000000", 0.6) },
            ]}
          />
        </Pressable>

        <View style={styles.modalCardWrap}>
          <DatePickerCard key={String(visible)} onClose={onClose} {...props} />
        </View>
      </View>
    </Modal>
  );
});

export const DatePickerDialog = DatePickerModal;

export interface DatePickerInputProps extends BaseHapticProps {
  value?: Date;
  onChange?: (date: Date) => void;
  variant?: DatePickerVariant;
  showVariantToggle?: boolean;
  showDayOfWeek?: boolean;
  locale?: LocaleInput;
  is24Hour?: boolean;
  placeholder?: string;
  label?: string;
  title?: string;
  mode?: DatePickerMode;
  order?: DatePickerOrder;
  monthFormat?: MonthFormat;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const DatePickerInput = React.memo(function DatePickerInput({
  value,
  onChange,
  variant = "wheel",
  showVariantToggle = true,
  showDayOfWeek = true,
  locale,
  is24Hour = true,
  placeholder,
  title,
  mode = "date",
  order = ["year", "month", "day"],
  monthFormat = "full",
  haptic = true,
  disabled,
  style,
}: DatePickerInputProps) {
  const { colors, components, radii, spacing } = useTheme();
  const localeData = useMemo(() => getLocaleData(locale), [locale]);
  const [open, setOpen] = useState(false);

  const defaultPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (mode === "time") return localeData.selectTime;
    if (mode === "datetime") {
      return `${localeData.selectDate} & ${localeData.selectTime}`;
    }
    return localeData.selectDate;
  }, [localeData.selectDate, localeData.selectTime, mode, placeholder]);

  const defaultTitle = useMemo(() => {
    if (title) return title;
    if (mode === "time") return localeData.selectTime;
    if (mode === "datetime") {
      return `${localeData.selectDate} & ${localeData.selectTime}`;
    }
    return localeData.selectDate;
  }, [localeData.selectDate, localeData.selectTime, mode, title]);

  const formattedValue = useMemo(() => {
    if (!value) return "";
    const dName = localeData.dayNames[value.getDay()];
    const y = value.getFullYear();
    const m =
      monthFormat === "short"
        ? localeData.monthNamesShort[value.getMonth()]
        : monthFormat === "full"
          ? localeData.monthNames[value.getMonth()]
          : String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    const timeStr = formatTime(value, is24Hour, locale);

    const prefix = showDayOfWeek ? `${dName}, ` : "";

    if (mode === "date") return `${prefix}${d} ${m} ${y}`;
    if (mode === "time") return timeStr;
    if (mode === "datetime") return `${prefix}${d} ${m} ${y} • ${timeStr}`;
    if (mode === "month-year") return `${m} ${y}`;
    return String(y);
  }, [
    is24Hour,
    locale,
    localeData.dayNames,
    localeData.monthNames,
    localeData.monthNamesShort,
    mode,
    monthFormat,
    showDayOfWeek,
    value,
  ]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={formattedValue || defaultPlaceholder}
        accessibilityState={{ disabled: Boolean(disabled), expanded: open }}
        disabled={disabled}
        hitSlop={minTouchHitSlop(48)}
        onPress={() => {
          if (haptic) triggerHaptic("selection");
          setOpen(true);
        }}
        style={[
          styles.inputTrigger,
          {
            borderRadius: radii.md,
            borderCurve: "continuous",
            borderWidth: components.borderWidth.default,
            borderColor: colors.border,
            backgroundColor: colors.input,
            paddingHorizontal: spacing.md,
            opacity: disabled ? 0.6 : 1,
          },
          style,
        ]}
      >
        <Text
          style={{
            fontSize: 15,
            color: formattedValue ? colors.text : colors.textMuted,
          }}
        >
          {formattedValue || defaultPlaceholder}
        </Text>

        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.textMuted}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {mode === "time" ? (
            <>
              <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <Path d="M12 6v6l4 2" />
            </>
          ) : (
            <>
              <Path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
              <Path d="M16 2v4M8 2v4M3 10h18" />
            </>
          )}
        </Svg>
      </Pressable>

      <DatePickerModal
        visible={open}
        title={defaultTitle}
        variant={variant}
        showVariantToggle={showVariantToggle}
        locale={locale}
        is24Hour={is24Hour}
        mode={mode}
        order={order}
        haptic={haptic}
        value={value}
        onClose={() => setOpen(false)}
        onConfirm={(selected) => {
          onChange?.(selected);
          setOpen(false);
        }}
      />
    </>
  );
});

export function TimePicker(props: Omit<DatePickerProps, "mode">) {
  return <DatePicker mode="time" {...props} />;
}

export function TimePickerCard(props: Omit<DatePickerCardProps, "mode">) {
  return <DatePickerCard mode="time" {...props} />;
}

export function TimePickerModal(props: Omit<DatePickerModalProps, "mode">) {
  return <DatePickerModal mode="time" {...props} />;
}

export function TimePickerInput(props: Omit<DatePickerInputProps, "mode">) {
  return <DatePickerInput mode="time" {...props} />;
}

export { LocaleConfig, getLocaleData, type LocaleInput };

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  wheelColumn: {
    flex: 1,
    overflow: "hidden",
  },
  wheelItemPress: {
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  calendarWrap: {
    width: "100%",
  },
  inlineTimeSection: {},
  inlineTimeLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  inlineTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 100,
  },
  colon: {
    fontSize: 18,
    fontWeight: "700",
    marginHorizontal: 2,
    zIndex: 2,
  },
  colonLarge: {
    fontSize: 20,
    fontWeight: "700",
    marginHorizontal: 4,
    zIndex: 2,
  },
  amPmNarrow: {
    maxWidth: 70,
  },
  amPmWide: {
    maxWidth: 85,
  },
  wheelContainer: {
    position: "relative",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionHighlight: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 0,
  },
  datetimeDivider: {
    width: 1,
    marginHorizontal: 4,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  variantSwitch: {
    width: 148,
  },
  closeButton: {
    padding: 4,
  },
  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 6,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCardWrap: {
    width: "100%",
    maxWidth: 360,
    zIndex: 10,
  },
  inputTrigger: {
    height: 48,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
