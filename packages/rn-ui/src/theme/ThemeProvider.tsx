import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";

import { PortalHost, PortalProvider } from "./Portal";
import { createTheme, mergeTheme } from "./createTheme";
import { builtInThemePresets } from "./presets";
import type {
  ColorSchemePreference,
  DeepPartial,
  ThemeContextValue,
  ThemeInput,
  ThemeMode,
  ThemeProviderProps,
} from "./types";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const DEFAULT_STORAGE_KEY = "rn-ui-color-scheme";
const DEFAULT_THEME_NAME_STORAGE_KEY = "rn-ui-theme-name";
const VALID_SCHEMES = new Set<ColorSchemePreference>([
  "light",
  "dark",
  "system",
]);

function isValidScheme(value: string | null): value is ColorSchemePreference {
  return !!value && VALID_SCHEMES.has(value as ColorSchemePreference);
}

function resolveColorScheme(
  preference: ColorSchemePreference,
  nativeScheme: ReturnType<typeof useNativeColorScheme>,
): ThemeMode {
  if (preference === "system") {
    return nativeScheme === "dark" ? "dark" : "light";
  }
  return preference;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function deepEqualThemeInput(a: unknown, b: unknown, depth = 0): boolean {
  if (Object.is(a, b)) return true;
  if (depth > 8 || !isPlainObject(a) || !isPlainObject(b)) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i += 1) {
    const key = keysA[i]!;
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqualThemeInput(a[key], b[key], depth + 1)) return false;
  }

  return true;
}

export function ThemeProvider({
  children,
  colorScheme,
  defaultColorScheme = "system",
  elevation,
  defaultElevation,
  themeName,
  defaultThemeName = "default",
  presets,
  themes,
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
  themeNameStorageKey = DEFAULT_THEME_NAME_STORAGE_KEY,
  waitForStorage = true,
  fallback = null,
  onColorSchemeChange,
  onThemeNameChange,
  onElevationChange,
}: ThemeProviderProps) {
  const nativeScheme = useNativeColorScheme();
  const isSchemeControlled = colorScheme !== undefined;
  const isThemeNameControlled = themeName !== undefined;
  const isElevationControlled = elevation !== undefined;

  const resolvedPresets = presets ?? builtInThemePresets;
  const availableThemes = useMemo(
    () => Object.keys(resolvedPresets),
    [resolvedPresets],
  );

  const fallbackThemeName = resolvedPresets[defaultThemeName]
    ? defaultThemeName
    : (availableThemes[0] ?? "default");

  const [internalScheme, setInternalScheme] = useState<ColorSchemePreference>(
    colorScheme ?? defaultColorScheme,
  );
  const [internalThemeName, setInternalThemeName] = useState<string>(
    themeName ?? fallbackThemeName,
  );
  const [internalElevationOverride, setInternalElevationOverride] = useState<
    boolean | undefined
  >(defaultElevation);

  const needsStorageHydration =
    Boolean(storage) && (!isSchemeControlled || !isThemeNameControlled);
  const [isHydrated, setIsHydrated] = useState(!needsStorageHydration);
  const prevKeysRef = useRef(`${storageKey}:${themeNameStorageKey}`);

  useEffect(() => {
    const currentKeys = `${storageKey}:${themeNameStorageKey}`;
    if (!needsStorageHydration || !storage) {
      setIsHydrated(true);
      prevKeysRef.current = currentKeys;
      return;
    }

    let mounted = true;
    if (prevKeysRef.current !== currentKeys) {
      setIsHydrated(false);
      prevKeysRef.current = currentKeys;
    }

    const schemePromise = !isSchemeControlled
      ? Promise.resolve(storage.getItem(storageKey)).catch(() => null)
      : Promise.resolve(null);
    const namePromise = !isThemeNameControlled
      ? Promise.resolve(storage.getItem(themeNameStorageKey)).catch(() => null)
      : Promise.resolve(null);

    Promise.all([schemePromise, namePromise])
      .then(([savedScheme, savedThemeName]) => {
        if (!mounted) return;
        if (!isSchemeControlled && isValidScheme(savedScheme)) {
          setInternalScheme(savedScheme);
        }
        if (
          !isThemeNameControlled &&
          savedThemeName &&
          resolvedPresets[savedThemeName]
        ) {
          setInternalThemeName(savedThemeName);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    isSchemeControlled,
    isThemeNameControlled,
    needsStorageHydration,
    resolvedPresets,
    storage,
    storageKey,
    themeNameStorageKey,
  ]);

  const activeScheme = colorScheme ?? internalScheme;
  const resolvedColorScheme = resolveColorScheme(activeScheme, nativeScheme);

  const requestedThemeName = themeName ?? internalThemeName;
  const activeThemeName = resolvedPresets[requestedThemeName]
    ? requestedThemeName
    : fallbackThemeName;

  const presetOverride = resolvedPresets[activeThemeName]?.[resolvedColorScheme];
  const explicitOverride = themes?.[resolvedColorScheme];
  const effectiveElevation = elevation ?? internalElevationOverride;

  const mergedOverride = useMemo<ThemeInput | undefined>(() => {
    let base: ThemeInput | undefined;
    if (presetOverride && explicitOverride) {
      base = mergeTheme(
        presetOverride,
        explicitOverride as DeepPartial<ThemeInput>,
      );
    } else {
      base = presetOverride ?? explicitOverride;
    }

    if (effectiveElevation === undefined) return base;
    return base ? { ...base, elevation: effectiveElevation } : { elevation: effectiveElevation };
  }, [effectiveElevation, explicitOverride, presetOverride]);

  const stableOverrideRef = useRef<{
    mode: ThemeMode;
    override: ThemeInput | undefined;
  }>({ mode: resolvedColorScheme, override: mergedOverride });

  if (
    stableOverrideRef.current.mode !== resolvedColorScheme ||
    !deepEqualThemeInput(stableOverrideRef.current.override, mergedOverride)
  ) {
    stableOverrideRef.current = {
      mode: resolvedColorScheme,
      override: mergedOverride,
    };
  }

  const stableMode = stableOverrideRef.current.mode;
  const stableOverride = stableOverrideRef.current.override;

  const theme = useMemo(
    () => createTheme(stableMode, stableOverride),
    [stableMode, stableOverride],
  );

  const setColorScheme = useCallback(
    (next: ColorSchemePreference) => {
      if (!isSchemeControlled) {
        setInternalScheme(next);
      }

      onColorSchemeChange?.(next);

      if (storage) {
        Promise.resolve(storage.setItem(storageKey, next)).catch(
          () => undefined,
        );
      }
    },
    [isSchemeControlled, onColorSchemeChange, storage, storageKey],
  );

  const toggleColorScheme = useCallback(() => {
    setColorScheme(resolvedColorScheme === "dark" ? "light" : "dark");
  }, [resolvedColorScheme, setColorScheme]);

  const setThemeName = useCallback(
    (nextName: string) => {
      if (!resolvedPresets[nextName]) return;
      if (!isThemeNameControlled) {
        setInternalThemeName(nextName);
      }
      if (!isElevationControlled) {
        // Let each newly selected preset express its authentic default elevation.
        setInternalElevationOverride(undefined);
      }

      onThemeNameChange?.(nextName);

      if (storage) {
        Promise.resolve(storage.setItem(themeNameStorageKey, nextName)).catch(
          () => undefined,
        );
      }
    },
    [
      isElevationControlled,
      isThemeNameControlled,
      onThemeNameChange,
      resolvedPresets,
      storage,
      themeNameStorageKey,
    ],
  );

  const setElevation = useCallback(
    (nextElevation: boolean) => {
      if (!isElevationControlled) {
        setInternalElevationOverride(nextElevation);
      }
      onElevationChange?.(nextElevation);
    },
    [isElevationControlled, onElevationChange],
  );

  const toggleElevation = useCallback(() => {
    setElevation(!theme.elevation);
  }, [setElevation, theme.elevation]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      colors: theme.colors,
      fonts: theme.fonts,
      typography: theme.typography,
      spacing: theme.spacing,
      radii: theme.radii,
      shadows: theme.shadows,
      components: theme.components,
      elevation: theme.elevation,
      themeName: activeThemeName,
      availableThemes,
      colorScheme: activeScheme,
      resolvedColorScheme,
      isDark: theme.dark,
      isHydrated,
      setColorScheme,
      toggleColorScheme,
      setThemeName,
      setElevation,
      toggleElevation,
    }),
    [
      activeScheme,
      activeThemeName,
      availableThemes,
      isHydrated,
      resolvedColorScheme,
      setColorScheme,
      setElevation,
      setThemeName,
      theme,
      toggleColorScheme,
      toggleElevation,
    ],
  );

  if (waitForStorage && !isHydrated) {
    return <>{fallback}</>;
  }

  return (
    <ThemeContext.Provider value={value}>
      <PortalProvider>
        {children}
        <PortalHost name="root" />
      </PortalProvider>
    </ThemeContext.Provider>
  );
}
