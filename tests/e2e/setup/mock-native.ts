import { mock } from "bun:test";
import React from "react";

export interface MockCameraDevice {
  id: string;
  position: string;
  name: string;
}

export interface MockPhotoFileSpec {
  filePath: string;
  width: number;
  height: number;
  orientation: string;
  isMirrored: boolean;
}

export interface MockCameraState {
  hasPermission: boolean;
  devices: Record<string, MockCameraDevice | undefined>;
  lastCameraProps: Record<string, unknown> | null;
  lastFrameOutputOptions: Record<string, unknown> | null;
  lastPhotoOutputOptions: Record<string, unknown> | null;
  capturePhotoCallCount: number;
  mockNextPhotoFile: MockPhotoFileSpec;
  reducedMotion: boolean;
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
  lastPhotoOutputOptions: null,
  capturePhotoCallCount: 0,
  mockNextPhotoFile: {
    filePath: "/data/user/0/app/cache/mock_capture.jpg",
    width: 1920,
    height: 1440,
    orientation: "right",
    isMirrored: false,
  },
  reducedMotion: false,
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
    this.lastPhotoOutputOptions = null;
    this.capturePhotoCallCount = 0;
    this.mockNextPhotoFile = {
      filePath: "/data/user/0/app/cache/mock_capture.jpg",
      width: 1920,
      height: 1440,
      orientation: "right",
      isMirrored: false,
    };
    this.reducedMotion = false;
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
  Image: (props: Record<string, unknown>) =>
    React.createElement("img", cleanProps(props)),
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
  Share: {
    share: async () => ({ action: "sharedAction" }),
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
    const storeRef = React.useRef<{ value: T }>({ value: v });
    const wrapperRef = React.useRef<{
      value: T;
      get(): T;
      set(next: T): void;
    } | null>(null);
    if (!wrapperRef.current) {
      wrapperRef.current = {
        get value() {
          return storeRef.current.value;
        },
        set value(next: T) {
          storeRef.current.value = next;
        },
        get: () => storeRef.current.value,
        set: (next: T) => {
          storeRef.current.value = next;
        },
      };
    }
    return wrapperRef.current;
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useReducedMotion: () => mockCameraState.reducedMotion,
  withTiming: <T>(toValue: T) => toValue,
  withRepeat: <T>(animation: T) => animation,
  withSequence: <T>(...animations: T[]) => animations[animations.length - 1],
  cancelAnimation: () => {},
  ReduceMotion: {
    System: "system",
    Always: "always",
    Never: "never",
  },
  Easing: {
    bezier: () => (t: number) => t,
    linear: (t: number) => t,
    ease: (t: number) => t,
  },
  cubicBezier: () => "cubic-bezier(0.23, 1, 0.32, 1)",
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
  usePhotoOutput: (options: Record<string, unknown> = {}) => {
    mockCameraState.lastPhotoOutputOptions = options;
    return {
      __mockPhotoOutput: true,
      ...options,
      capturePhotoToFile: async () => {
        mockCameraState.capturePhotoCallCount += 1;
        return {
          ...mockCameraState.mockNextPhotoFile,
          timestamp: Date.now(),
          isRawPhoto: false,
          containerFormat: "jpeg",
          dispose: () => {},
        };
      },
      dispose: () => {},
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

// 8. Mock react-native-vision-camera-mlkit
const createMockMLKitTextResult = () => ({
  text: "Masum Dev\nmasum@example.com\n3273011505990001",
  blocks: [
    {
      text: "Masum Dev\nmasum@example.com",
      bounds: { x: 300, y: 200, width: 320, height: 90, left: 140, top: 155 },
      languages: ["en"],
      lines: [
        {
          text: "Masum Dev",
          bounds: { x: 250, y: 175, width: 200, height: 32, left: 150, top: 159 },
          confidence: 0.95,
          angle: 0,
          languages: ["en"],
          elements: [],
        },
      ],
    },
  ],
});

mock.module("react-native-vision-camera-mlkit", () => ({
  isFeatureAvailable: () => true,
  PluginFactory: {
    isFeatureAvailable: () => true,
    initPlugin: () => ({
      recognize: () => createMockMLKitTextResult(),
      recognizeImage: async () => createMockMLKitTextResult(),
      dispose: () => {},
    }),
  },
  VisionCameraMLKit: {
    isFeatureAvailable: () => true,
    createTextRecognizer: () => ({
      recognize: () => createMockMLKitTextResult(),
      recognizeImage: async () => createMockMLKitTextResult(),
      dispose: () => {},
    }),
  },
  processImageTextRecognition: async () => createMockMLKitTextResult(),
}));
