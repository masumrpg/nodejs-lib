import { useCallback, useState } from "react";
import {
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleProp,
  ViewStyle,
} from "react-native";

export interface UseHeaderScrollOptions {
  headerHeight?: number;
  threshold?: number;
  bgThreshold?: number;
}

export interface UseHeaderScrollResult {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  headerStyle: StyleProp<ViewStyle>;
  scrollEventThrottle: number;
  isHeaderScrolled: boolean;
  showTitle: boolean;
  isHeaderVisible: boolean;
}

/**
 * Hook to track scroll offset for modern minimalist headers:
 * - Detects when user begins scrolling (> 12px) to apply semi-transparent frosted background (Gemini style)
 * - Detects when the user scrolls past the hero title to reveal the compact title
 */
export function useHeaderScroll(
  options: UseHeaderScrollOptions = {},
): UseHeaderScrollResult {
  const bgThreshold = options.bgThreshold ?? 12;
  const threshold = options.threshold ?? 50;
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [showTitle, setShowTitle] = useState(false);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setIsHeaderScrolled(y > bgThreshold);
      setShowTitle(y > threshold);
    },
    [bgThreshold, threshold],
  );

  return {
    onScroll,
    headerStyle: undefined,
    scrollEventThrottle: 16,
    isHeaderScrolled,
    showTitle,
    isHeaderVisible: true,
  };
}
