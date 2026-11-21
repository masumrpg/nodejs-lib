import { mock } from "bun:test";
import React from "react";

export interface MockCameraDevice {
  id: string;
  position: string;
  name: string;
}

export interface MockCameraState {
  hasPermission: boolean;
  devices: Record<string, MockCameraDevice | undefined>;
  lastCameraProps: Record<string, unknown> | null;
  lastFrameOutputOptions: Record<string, unknown> | null;
  convertedImageCount: number;
  disposedImageCount: number;
  requestPermissionCallCount: number;
  openSettingsCallCount: number;
  reset(): void;
}

export const mockCameraState: MockCameraState = {
  hasPermission: true,
  devices: {
    back: { id: "back-camera", position: "back", name: "Back Camera" },
    front: { id: "front-camera", position: "front", name: "Front Camera" },
  },
  lastCameraProps: null,
  lastFrameOutputOptions: null,
  convertedImageCount: 0,
  disposedImageCount: 0,
  requestPermissionCallCount: 0,
  openSettingsCallCount: 0,
  reset() {
    this.hasPermission = true;
    this.devices = {
      back: { id: "back-camera", position: "back", name: "Back Camera" },
      front: { id: "front-camera", position: "front", name: "Front Camera" },
    };
    this.lastCameraProps = null;
    this.lastFrameOutputOptions = null;
    this.convertedImageCount = 0;
    this.disposedImageCount = 0;
    this.requestPermissionCallCount = 0;
    this.openSettingsCallCount = 0;
  },
};

const flattenStyle = (s: unknown): Record<string, unknown> => {
  if (Array.isArray(s)) {
    return Object.assign({}, ...s.filter(Boolean).map(flattenStyle));
  }
  return typeof s === "object" && s ? (s as Record<string, unknown>) : {};
};

const cleanProps = (props: Record<string, unknown>): Record<string, unknown> => {
  const {
    accessibilityRole: _role,
    accessibilityLabel: _label,
    style,
    ...rest
  } = props;
  const flat = flattenStyle(style);
  return { ...rest, "data-style": JSON.stringify(flat) };
};

// 1. Mock react-native
mock.module("react-native", () => ({
  View: (props: Record<string, unknown>) =>
    React.createElement(
      "div",
      cleanProps(props),
      props.children as React.ReactNode,
    ),
  ScrollView: (props: Record<string, unknown>) =>
    React.createElement(
      "div",
      cleanProps(props),
      props.children as React.ReactNode,
    ),
  TextInput: (props: Record<string, unknown>) =>
    React.createElement("input", cleanProps(props)),
  Text: (props: Record<string, unknown>) =>
    React.createElement(
      "span",
      cleanProps(props),
      props.children as React.ReactNode,
    ),
  Pressable: (props: Record<string, unknown> & { children?: unknown }) =>
    React.createElement(
      "button",
      cleanProps(props),
      typeof props.children === "function"
        ? (props.children as (state: { pressed: boolean }) => React.ReactNode)({
            pressed: false,
          })
        : (props.children as React.ReactNode),
    ),
  Platform: {
    OS: "android",
    select: <T>(obj: Record<string, T>): T | undefined =>
      obj.android ?? obj.default,
  },
  Linking: {
    openSettings: async () => {
      mockCameraState.openSettingsCallCount += 1;
    },
  },
  StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    flatten: flattenStyle,
    absoluteFill: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
  },
}));

// 2. Mock react-native-reanimated
mock.module("react-native-reanimated", () => ({
  default: {
    View: (props: Record<string, unknown>) =>
      React.createElement(
        "div",
        cleanProps(props),
        props.children as React.ReactNode,
      ),
    Text: (props: Record<string, unknown>) =>
      React.createElement(
        "span",
        cleanProps(props),
        props.children as React.ReactNode,
      ),
  },
  useSharedValue: <T>(v: T) => {
    const ref = React.useRef<{ value: T }>({ value: v });
    return ref.current;
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
}));

// 3. Mock react-native-vision-camera (v5)
mock.module("react-native-vision-camera", () => ({
  Camera: (props: Record<string, unknown>) => {
    mockCameraState.lastCameraProps = props;
    return React.createElement(
      "camera-preview",
      cleanProps(props),
      props.children as React.ReactNode,
    );
  },
  useCameraDevice: (pos: string) => mockCameraState.devices[pos],
  useCameraPermission: () => ({
    hasPermission: mockCameraState.hasPermission,
    requestPermission: async () => {
      mockCameraState.requestPermissionCallCount += 1;
      return mockCameraState.hasPermission;
    },
  }),
  useFrameOutput: (options: Record<string, unknown>) => {
    mockCameraState.lastFrameOutputOptions = options;
    return {
      __mockFrameOutput: true,
      ...options,
      outputOrientation: "up",
      thread: {},
      dispose: () => {},
      setOnFrameDroppedCallback: () => {},
    };
  },
  HybridFrameConverter: {
    convertFrameToImage: (frame?: {
      width?: number;
      height?: number;
      pixelFormat?: string;
      getPixelBuffer?: () => ArrayBuffer;
    }) => {
      mockCameraState.convertedImageCount += 1;
      const srcW = frame?.width ?? 300;
      const srcH = frame?.height ?? 300;
      const fmt =
        frame?.pixelFormat === "BGRA" ||
        frame?.pixelFormat === "ARGB" ||
        frame?.pixelFormat === "ABGR" ||
        frame?.pixelFormat === "RGB" ||
        frame?.pixelFormat === "BGR"
          ? frame.pixelFormat
          : "RGBA";
      const makeRaw = (w: number, h: number) => {
        const provided =
          w === srcW && h === srcH ? frame?.getPixelBuffer?.() : undefined;
        return {
          buffer: provided ?? new ArrayBuffer(w * h * (fmt === "RGB" || fmt === "BGR" ? 3 : 4)),
          width: w,
          height: h,
          pixelFormat: fmt,
        };
      };
      return {
        width: srcW,
        height: srcH,
        resize: (w: number, h: number) => ({
          width: w,
          height: h,
          toRawPixelData: () => makeRaw(w, h),
          dispose: () => {
            mockCameraState.disposedImageCount += 1;
          },
        }),
        toRawPixelData: () => makeRaw(srcW, srcH),
        dispose: () => {
          mockCameraState.disposedImageCount += 1;
        },
      };
    },
  },
}));

// 4. Mock react-native-worklets
mock.module("react-native-worklets", () => ({
  runOnJS: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  scheduleOnRN: <Args extends unknown[]>(
    fn: (...args: Args) => unknown,
    ...args: Args
  ) => {
    fn(...args);
  },
  runOnUI: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  scheduleOnUI: <Args extends unknown[]>(
    fn: (...args: Args) => unknown,
    ...args: Args
  ) => {
    fn(...args);
  },
  createSynchronizable: <T>(initial: T) => {
    let value = initial;
    return {
      __synchronizableRef: true,
      getDirty: () => value,
      getBlocking: () => value,
      setBlocking: (next: T | ((prev: T) => T)) => {
        value =
          typeof next === "function"
            ? (next as (prev: T) => T)(value)
            : next;
      },
      setDirty: (next: T) => {
        value = next;
      },
      lock: () => {},
      unlock: () => {},
    };
  },
  isWorkletFunction: (fn: unknown) =>
    typeof fn === "function" &&
    Boolean((fn as Record<string, unknown>).__workletHash),
}));

// 5. Mock react-native-vision-camera-worklets
mock.module("react-native-vision-camera-worklets", () => ({
  provider: {
    createAsyncRunner: () => ({}),
    createRuntimeForThread: () => ({
      setOnFrameCallback: () => {},
    }),
    bindUIUpdatesToController: () => {},
  },
}));

// 6. Mock react-native-nitro-modules & react-native-nitro-image
mock.module("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: () => ({}),
  },
  callback: <T>(fn: T) => fn,
}));

mock.module("react-native-nitro-image", () => ({}));

// 7. Mock react-native-fast-tflite (v3) honoring SIMULATE_GPU_FAILURE
mock.module("react-native-fast-tflite", () => ({
  loadTensorflowModel: async (
    _source: unknown,
    delegates?: string[] | string,
  ) => {
    const hasDelegate = Array.isArray(delegates)
      ? delegates.length > 0
      : Boolean(delegates && delegates !== "default");
    if (
      typeof process !== "undefined" &&
      process.env?.SIMULATE_GPU_FAILURE === "true" &&
      hasDelegate
    ) {
      throw new Error("GPU delegate initialization failed: OpenCL unavailable");
    }
    return {
      runSync: () => [],
      run: async () => [],
      delegates: Array.isArray(delegates)
        ? delegates
        : delegates
          ? [delegates]
          : [],
    };
  },
}));
