import React, { createContext, useContext, useMemo } from "react";
import type { CameraAITheme } from "./types";

export const CameraAIThemeContext = createContext<CameraAITheme | undefined>(
  undefined,
);

export interface CameraAIThemeProviderProps {
  theme?: CameraAITheme;
  children: React.ReactNode;
}

/**
 * Optional Theme Provider for @masumdev/rn-camera-ai.
 * Propagates theme tokens across all CameraAI instances and overlays within its subtree.
 */
export function CameraAIThemeProvider({
  theme,
  children,
}: CameraAIThemeProviderProps): React.JSX.Element {
  const parentTheme = useContext(CameraAIThemeContext);

  const mergedTheme = useMemo<CameraAITheme | undefined>(() => {
    if (!parentTheme && !theme) return undefined;
    return {
      ...(parentTheme ?? {}),
      ...(theme ?? {}),
    };
  }, [parentTheme, theme]);

  return (
    <CameraAIThemeContext.Provider value={mergedTheme}>
      {children}
    </CameraAIThemeContext.Provider>
  );
}

/**
 * Hook to retrieve the current CameraAI theme tokens from Context.
 */
export function useCameraAITheme(): CameraAITheme | undefined {
  return useContext(CameraAIThemeContext);
}
