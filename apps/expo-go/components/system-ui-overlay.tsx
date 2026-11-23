import { StatusBar } from "expo-status-bar";
import { useTheme } from "@masumdev/rn-ui";

export interface SystemUIOverlayProps {
  statusBarStyle?: "light" | "dark" | "auto";
}

export function SystemUIOverlay({
  statusBarStyle,
}: SystemUIOverlayProps) {
  const { isDark } = useTheme();
  const resolvedStyle = statusBarStyle ?? (isDark ? "light" : "dark");

  return <StatusBar style={resolvedStyle} />;
}
