# @masumdev/rn-ui

> A modern, typed React Native & Expo UI kit with 63 typed components, WCAG AA light/dark theme engine, flexible thin shadows, built-in Portal overlay layering, zero-bounce worklet animations, and pluggable architecture.

[![npm version](https://img.shields.io/npm/v/@masumdev/rn-ui.svg?style=flat-square&color=33CDCF)](https://www.npmjs.com/package/@masumdev/rn-ui)
[![npm downloads](https://img.shields.io/npm/dt/@masumdev/rn-ui.svg?style=flat-square&color=33CDCF)](https://www.npmjs.com/package/@masumdev/rn-ui)
[![Expo Supported](https://img.shields.io/badge/Expo-Supported-000020.svg?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-33CDCF.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Zero_Any-3178c6.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Built with Bun](https://img.shields.io/badge/Built_with-Bun-fbf0df.svg?style=flat-square)](https://bun.sh)
[![XERJ Corpus Hub contributor](https://hub.xerj.org/contributors/masumrpg/badge.svg)](https://hub.xerj.org/contributors/masumrpg)

---

## Full Documentation

Comprehensive guides, component previews, prop tables, and interactive examples are available in our official documentation:

**[Explore Full Documentation & Component Catalog](https://lib.masumdev.id/rn-ui)**

- **[Installation Guide](https://lib.masumdev.id/rn-ui/installation)**
- **[Theming & Dark Mode](https://lib.masumdev.id/rn-ui/theming)**
- **[63 Component Catalog](https://lib.masumdev.id/rn-ui/components)**
- **[Building Custom Components](https://lib.masumdev.id/rn-ui/custom-components)**
- **[Changelog](https://lib.masumdev.id/rn-ui/changelog)**

---

## Features

- **Flexible Multi-Theme Design System**: Switch live at runtime between **Default**, **Minimal (HeroUI-inspired borderless)**, and **Neo-Brutalism** (solid ink borders, zero-blur hard-offset shadows via `createHardShadows()`, and offset press feedback) via `ThemeProvider` `presets` + `setThemeName()`, alongside toggleable `elevation` (`setElevation()` / `toggleElevation()`) and semantic `glassSurface` / `glassBorder` tokens.
- **Built-in Portal Overlay Layering**: `ThemeProvider` automatically mounts `<PortalProvider>` and `<PortalHost name="root" />` so floating menus, selects, tooltips, popovers, speed dials, and toasts layer reliably above screens.
- **WCAG AA Dynamic Theme Engine**: Light, dark, and system preference support via `ThemeProvider` with contrast-calibrated semantic tokens.
- **63 Typed Components**: Forms, feedback, overlays, navigation, calendars, data display, and chat UI primitives.
- **Pluggable Architecture**: Zero lock-in for fonts, icons (`renderIcon`), navigation, storage, or haptics.
- **Zero-Bounce Timing Worklets**: Pure `withTiming` transitions using `Easing.bezier(0.23, 1, 0.32, 1)` and `useReducedMotion()` running on the UI thread with zero spring bounce.
- **A11y First**: Enforced accessibility roles, interactive states, SVG icons, and touch targets (>= 44pt).
- **Strict Type Safety**: 100% TypeScript with zero `any` types and shared base UI prop interfaces.

### Component Highlights (62 Primitives)

- **Navigation & Structure**: `Tabs` (Compound TabView with animated indicator & fluid slide/scale transitions), `Breadcrumb`, `Pagination`, `Stepper`
- **Overlays & Modals**: `Tooltip` (Collision-aware balloons with pointer arrows & tap-and-hold), `SpeedDial` (Expanding FAB with staggered actions), `Alert`, `AlertDialog`, `Toast`, `Popover`, `HoverCard`, `DropdownMenu`, `ContextMenu`, `Command`
- **Form Controls & Inputs**: `SearchBar` (Debounced input with clear & cancel transition), `Input`, `InputGroup`, `InputOTP`, `DatePicker`, `TimePicker`, `Textarea`, `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `RangeSlider`, `SignaturePad`, `Rating`, `Select`, `Combobox`, `Label`, `FormField`
- **Buttons & Actions**: `Button`, `IconButton`, `Chip`, `SegmentedControl`, `FloatingActionButton`
- **Typography & Data**: `Text`, `Avatar`, `Badge`, `Item`, `SwipeableItem`, `Bubble`, `Attachment`, `DataList`, `MetricCard`, `Table`, `Timeline`, `Empty`
- **Layout & Foundations**: `Box`, `Card`, `Divider`, `AspectRatio`, `KeyboardAvoiding`
- **Disclosure & Loading**: `Accordion`, `Collapsible`, `Carousel`, `Calendar`, `ExpandableCalendar`, `TimelineCalendar`, `Progress`, `Skeleton`, `Spinner`

---

## Quick Install

### Expo
```sh
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler react-native-calendars
bun add @masumdev/rn-ui
```

### React Native CLI
```sh
bun add @masumdev/rn-ui react-native-reanimated react-native-worklets react-native-gesture-handler react-native-calendars
```

---

## Quick Setup

Wrap your application root with `GestureHandlerRootView` and `ThemeProvider`:

```tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, ToastProvider } from "@masumdev/rn-ui";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider defaultColorScheme="system">
        <ToastProvider placement="bottom">
          <RootNavigator />
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

---

## Basic Usage

```tsx
import React from "react";
import { Box, Card, Text, Badge, Button, useTheme } from "@masumdev/rn-ui";

export function ExampleScreen() {
  const { toggleColorScheme } = useTheme();

  return (
    <Box flex={1} bg="background" p="lg" gap="md" justify="center">
      <Card elevated>
        <Box row justify="space-between" align="center">
          <Text variant="h3">@masumdev/rn-ui</Text>
          <Badge tone="success">Active</Badge>
        </Box>
        <Text color="textMuted" style={{ marginTop: 8 }}>
          Flat, token-driven React Native components built for speed and type-safety.
        </Text>
      </Card>

      <Button tone="primary" variant="filled" fullWidth onPress={toggleColorScheme}>
        Toggle Theme Mode
      </Button>
    </Box>
  );
}
```

---

## License

MIT © [Ma'sum](https://github.com/masumrpg)
