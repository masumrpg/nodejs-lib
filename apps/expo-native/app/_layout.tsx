import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, ToastProvider, useTheme } from "@masumdev/rn-ui";
import {
  CameraAIThemeProvider,
  createCameraAIThemeFromTokens,
} from "@masumdev/rn-camera-ai";

function CameraAIThemeBridge({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const { theme, colorScheme } = useTheme();
  const cameraTheme = React.useMemo(() => {
    return createCameraAIThemeFromTokens(theme.colors);
  }, [theme.colors]);

  return (
    <CameraAIThemeProvider theme={cameraTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      {children}
    </CameraAIThemeProvider>
  );
}

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider defaultThemeName="default" defaultColorScheme="dark">
          <ToastProvider>
            <CameraAIThemeBridge>
              <Stack screenOptions={{ headerShown: false }} />
            </CameraAIThemeBridge>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
