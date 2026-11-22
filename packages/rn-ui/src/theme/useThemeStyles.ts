import { useMemo, useRef } from "react";
import { StyleSheet } from "react-native";

import { useTheme } from "./useTheme";
import type { ThemeNamedStyles, ThemeStyleFactory } from "./types";

export function useThemeStyles<T extends ThemeNamedStyles<T>>(
  factory: ThemeStyleFactory<T>,
): T {
  const { theme } = useTheme();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  return useMemo(
    () => StyleSheet.create(factoryRef.current(theme)),
    [theme],
  );
}
