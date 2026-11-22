import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type FlatList,
  type LayoutChangeEvent,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import {
  minTouchHitSlop,
  renderIcon,
  webDeps,
  type BaseHapticProps,
  type RenderIcon,
} from "./types";

export interface CarouselProps extends BaseHapticProps {
  itemWidth?: number;
  gap?: number;
  onIndexChange?: (index: number) => void;
  showPagination?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  loop?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export interface CarouselContextProps {
  scrollX: SharedValue<number>;
  snapStepSV: SharedValue<number>;
  itemWidth: number;
  snapStep: number;
  containerWidth: number;
  activeIndex: number;
  totalItems: number;
  showPagination: boolean;
  haptic: boolean;
  isDraggingRef: React.RefObject<boolean>;
  setTotalItems: React.Dispatch<React.SetStateAction<number>>;
  scrollPrev: () => void;
  scrollNext: () => void;
  scrollToIndex: (index: number) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  listRef: React.RefObject<FlatList<React.ReactElement> | null>;
  setActiveIndex: React.Dispatch<React.SetStateAction<number>>;
}

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

export function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

const CarouselDot = React.memo(function CarouselDot({
  index,
}: {
  index: number;
}) {
  const { colors, radii } = useTheme();
  const { scrollX, snapStepSV, scrollToIndex } = useCarousel();

  const animatedStyle = useAnimatedStyle(() => {
    const step = Math.max(1, snapStepSV.value);
    const inputRange = [
      (index - 1) * step,
      index * step,
      (index + 1) * step,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [6, 22, 6],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.35, 1, 0.35],
      Extrapolation.CLAMP,
    );

    return {
      width,
      opacity,
    };
  }, webDeps([index]));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Go to slide ${index + 1}`}
      onPress={() => scrollToIndex(index)}
      hitSlop={minTouchHitSlop(16)}
    >
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: colors.primary, borderRadius: radii.full },
          animatedStyle,
        ]}
      />
    </Pressable>
  );
});

export const Carousel = React.memo(function Carousel({
  itemWidth,
  gap = 0,
  onIndexChange,
  showPagination = true,
  autoPlay = false,
  autoPlayInterval = 3000,
  loop = true,
  haptic = true,
  style,
  children,
  ...props
}: CarouselProps) {
  const { spacing } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const activeIndexRef = useRef(0);
  const didMountRef = useRef(false);
  const isDraggingRef = useRef(false);
  const scrollX = useSharedValue(0);
  const listRef = useRef<FlatList<React.ReactElement>>(null);

  const resolvedItemWidth = Math.max(
    1,
    itemWidth
      ? Math.min(itemWidth, containerWidth)
      : Math.round(containerWidth * 0.78),
  );
  const snapStep = resolvedItemWidth + gap;
  const snapStepSV = useSharedValue(snapStep);

  useEffect(() => {
    snapStepSV.value = snapStep;
  }, [snapStep, snapStepSV]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (totalItems <= 0) return;
      const clamped = Math.max(0, Math.min(totalItems - 1, index));
      if (haptic) triggerHaptic("selection");
      listRef.current?.scrollToOffset({
        offset: clamped * snapStep,
        animated: !reducedMotion,
      });
      activeIndexRef.current = clamped;
      setActiveIndex(clamped);
    },
    [haptic, reducedMotion, snapStep, totalItems],
  );

  const scrollPrev = useCallback(() => {
    if (totalItems <= 0) return;
    const curr = activeIndexRef.current;
    const nextIndex = curr > 0 ? curr - 1 : loop ? totalItems - 1 : 0;
    scrollToIndex(nextIndex);
  }, [loop, scrollToIndex, totalItems]);

  const scrollNext = useCallback(() => {
    if (totalItems <= 0) return;
    const curr = activeIndexRef.current;
    const nextIndex = curr < totalItems - 1 ? curr + 1 : loop ? 0 : totalItems - 1;
    scrollToIndex(nextIndex);
  }, [loop, scrollToIndex, totalItems]);

  const canScrollPrev = loop || activeIndex > 0;
  const canScrollNext = loop || activeIndex < totalItems - 1;

  useEffect(() => {
    if (!autoPlay || totalItems <= 1) return;

    const timer = setInterval(() => {
      if (isDraggingRef.current) return;
      const curr = activeIndexRef.current;
      const nextIndex =
        curr < totalItems - 1 ? curr + 1 : loop ? 0 : totalItems - 1;
      if (!loop && nextIndex === curr) return;
      listRef.current?.scrollToOffset({
        offset: nextIndex * snapStep,
        animated: !reducedMotion,
      });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, loop, reducedMotion, snapStep, totalItems]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth((prev) => (prev === width ? prev : width));
    }
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    onIndexChange?.(activeIndex);
  }, [activeIndex, onIndexChange]);

  const contextValue = useMemo<CarouselContextProps>(
    () => ({
      scrollX,
      snapStepSV,
      itemWidth: resolvedItemWidth,
      snapStep,
      containerWidth,
      activeIndex,
      totalItems,
      showPagination,
      haptic,
      isDraggingRef,
      setTotalItems,
      scrollPrev,
      scrollNext,
      scrollToIndex,
      canScrollPrev,
      canScrollNext,
      listRef,
      setActiveIndex,
    }),
    [
      activeIndex,
      canScrollNext,
      canScrollPrev,
      containerWidth,
      haptic,
      resolvedItemWidth,
      scrollNext,
      scrollPrev,
      scrollToIndex,
      scrollX,
      showPagination,
      snapStep,
      snapStepSV,
      totalItems,
    ],
  );

  return (
    <CarouselContext.Provider value={contextValue}>
      <View
        onLayout={handleLayout}
        style={[styles.carouselRoot, style]}
        {...props}
      >
        {children}

        {showPagination && totalItems > 1 ? (
          <View
            style={[
              styles.pagination,
              { marginTop: spacing.md, gap: spacing.xs },
            ]}
          >
            {Array.from({ length: totalItems }).map((_, i) => (
              <CarouselDot key={i} index={i} />
            ))}
          </View>
        ) : null}
      </View>
    </CarouselContext.Provider>
  );
});

export interface CarouselContentProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const CarouselContent = React.memo(function CarouselContent({
  style,
  children,
}: CarouselContentProps) {
  const {
    scrollX,
    snapStepSV,
    itemWidth,
    snapStep,
    containerWidth,
    listRef,
    isDraggingRef,
    setTotalItems,
    setActiveIndex,
  } = useCarousel();

  const items = useMemo(
    () =>
      React.Children.toArray(children).filter((child): child is React.ReactElement =>
        React.isValidElement(child),
      ),
    [children],
  );
  const total = items.length;
  const gap = Math.max(0, snapStep - itemWidth);
  const totalSV = useSharedValue(total);

  useEffect(() => {
    totalSV.value = total;
    setTotalItems(total);
  }, [setTotalItems, total, totalSV]);

  const snapOffsets = useMemo(
    () => items.map((_, i) => i * snapStep),
    [items, snapStep],
  );

  const updateActiveIndex = useCallback(
    (index: number) => {
      setActiveIndex((prev) => (prev !== index ? index : prev));
    },
    [setActiveIndex],
  );

  const lastActiveIndex = useSharedValue(-1);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const step = Math.max(1, snapStepSV.value);
      const count = totalSV.value;
      const index = Math.round(event.contentOffset.x / step);
      if (index >= 0 && index < count && index !== lastActiveIndex.value) {
        lastActiveIndex.value = index;
        scheduleOnRN(updateActiveIndex, index);
      }
    },
  });

  const handleScrollBeginDrag = useCallback(() => {
    isDraggingRef.current = true;
  }, [isDraggingRef]);

  const handleScrollSettle = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      isDraggingRef.current = false;
      const step = Math.max(1, snapStep);
      const index = Math.round(event.nativeEvent.contentOffset.x / step);
      if (index >= 0 && index < total) {
        setActiveIndex((prev) => (prev !== index ? index : prev));
      }
    },
    [isDraggingRef, setActiveIndex, snapStep, total],
  );

  const sidePadding = Math.max(0, (containerWidth - itemWidth) / 2);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<React.ReactElement>) => (
      <View style={index < total - 1 && gap > 0 ? { marginRight: gap } : undefined}>
        {React.cloneElement(item as React.ReactElement<{ index?: number }>, {
          index,
        })}
      </View>
    ),
    [gap, total],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<React.ReactElement> | null | undefined, index: number) => ({
      length: snapStep,
      offset: snapStep * index,
      index,
    }),
    [snapStep],
  );

  return (
    <View style={styles.contentWrapper}>
      <Animated.FlatList<React.ReactElement>
        ref={listRef}
        data={items}
        keyExtractor={(_, idx) => `carousel-item-${idx}`}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled={false}
        snapToOffsets={snapOffsets}
        disableIntervalMomentum
        decelerationRate="fast"
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleScrollSettle}
        contentContainerStyle={[
          { paddingHorizontal: sidePadding },
          style,
        ]}
      />
    </View>
  );
});

export interface CarouselItemProps {
  index?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const CarouselItem = React.memo(function CarouselItem({
  index = 0,
  style,
  children,
  ...props
}: CarouselItemProps) {
  const { scrollX, itemWidth, snapStepSV } = useCarousel();

  const animatedStyle = useAnimatedStyle(() => {
    const step = Math.max(1, snapStepSV.value);
    const inputRange = [
      (index - 1) * step,
      index * step,
      (index + 1) * step,
    ];

    return {
      opacity: interpolate(
        scrollX.value,
        inputRange,
        [0.65, 1, 0.65],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            scrollX.value,
            inputRange,
            [0.92, 1, 0.92],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, webDeps([index]));

  return (
    <Animated.View
      style={[
        styles.itemContainer,
        { width: itemWidth },
        animatedStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
});

export interface CarouselButtonProps {
  style?: StyleProp<ViewStyle>;
  icon?: RenderIcon;
}

const ARROW_SIZE = 36;

export const CarouselPrevious = React.memo(function CarouselPrevious({
  style,
  icon,
}: CarouselButtonProps) {
  const { colors, components, radii, shadows, spacing } = useTheme();
  const { scrollPrev, canScrollPrev, showPagination, totalItems } =
    useCarousel();

  if (!canScrollPrev) return null;

  const verticalOffset = showPagination && totalItems > 1 ? -30 : -18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Previous slide"
      hitSlop={minTouchHitSlop(ARROW_SIZE)}
      onPress={scrollPrev}
      style={({ pressed }) => [
        styles.navButton,
        {
          left: spacing.sm,
          marginTop: verticalOffset,
          borderRadius: radii.full,
          backgroundColor: colors.surface,
          borderWidth: components.borderWidth.default,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
        },
        shadows.sm,
        style,
      ]}
    >
      {icon ? (
        renderIcon(icon, colors.text, 18)
      ) : (
        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.text}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="m15 18-6-6 6-6" />
        </Svg>
      )}
    </Pressable>
  );
});

export const CarouselNext = React.memo(function CarouselNext({
  style,
  icon,
}: CarouselButtonProps) {
  const { colors, components, radii, shadows, spacing } = useTheme();
  const { scrollNext, canScrollNext, showPagination, totalItems } =
    useCarousel();

  if (!canScrollNext) return null;

  const verticalOffset = showPagination && totalItems > 1 ? -30 : -18;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Next slide"
      hitSlop={minTouchHitSlop(ARROW_SIZE)}
      onPress={scrollNext}
      style={({ pressed }) => [
        styles.navButton,
        {
          right: spacing.sm,
          marginTop: verticalOffset,
          borderRadius: radii.full,
          backgroundColor: colors.surface,
          borderWidth: components.borderWidth.default,
          borderColor: colors.border,
          opacity: pressed ? 0.78 : 1,
        },
        shadows.sm,
        style,
      ]}
    >
      {icon ? (
        renderIcon(icon, colors.text, 18)
      ) : (
        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.text}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d="m9 18 6-6-6-6" />
        </Svg>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  carouselRoot: {
    width: "100%",
    position: "relative",
  },
  contentWrapper: {
    width: "100%",
    overflow: "hidden",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    height: 6,
  },
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
