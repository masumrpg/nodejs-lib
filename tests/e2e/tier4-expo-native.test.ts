import { afterEach, beforeEach, describe, test, expect, mock } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import React from "react";
import { mockCameraState } from "./setup/mock-native";
import {
  createTFLiteObjectDetector,
  parseDetectionOutputs,
} from "./helpers/adapter";
import {
  COCO_91_LABELS,
  MODEL_INPUT_HEIGHT,
  MODEL_INPUT_WIDTH,
  MODEL_LABEL_OFFSET,
} from "../../apps/expo-native/src/constants/cocoLabels";

interface HostNode {
  type?: string;
  props?: Record<string, unknown>;
  text?: string;
  children: HostNode[];
}

interface ReconcilerRootContainer {
  children: HostNode[];
}

interface ReconcilerInstance {
  createContainer(
    containerInfo: ReconcilerRootContainer,
    tag: number,
    hydrationCallbacks: null,
    isStrictMode: boolean,
    concurrentUpdatesByDefaultOverride: null,
    identifierPrefix: string,
    onUncaughtError: (error: Error) => void,
    transitionCallbacks: null,
  ): unknown;
  updateContainer(
    element: React.ReactElement | null,
    container: unknown,
    parentComponent: null,
    callback: () => void,
  ): void;
}

type ReconcilerFactory = (
  hostConfig: Record<string, unknown>,
) => ReconcilerInstance;

interface ReconcilerConstants {
  ConcurrentRoot: number;
  DefaultEventPriority: number;
}

interface MockTFLiteModel {
  runSync: () => unknown[];
  run: () => Promise<unknown[]>;
  delegates: string[];
}

let loadTensorflowModelOverride:
  | ((
      source: unknown,
      delegates?: string[] | string,
    ) => Promise<MockTFLiteModel>)
  | null = null;

function createMockIcon(name: string) {
  return (props: Record<string, unknown>) =>
    React.createElement("svg", { "data-icon": name, ...props });
}

mock.module("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: (props: Record<string, unknown>) =>
    props.children as React.ReactNode,
}));

mock.module("lucide-react-native", () => ({
  AlertTriangle: createMockIcon("AlertTriangle"),
  ArrowLeft: createMockIcon("ArrowLeft"),
  Box: createMockIcon("Box"),
  Camera: createMockIcon("Camera"),
  CheckCircle2: createMockIcon("CheckCircle2"),
  ChevronRight: createMockIcon("ChevronRight"),
  Cpu: createMockIcon("Cpu"),
  Eye: createMockIcon("Eye"),
  Palette: createMockIcon("Palette"),
  Pause: createMockIcon("Pause"),
  Play: createMockIcon("Play"),
  RefreshCw: createMockIcon("RefreshCw"),
  RotateCcw: createMockIcon("RotateCcw"),
  ScanFace: createMockIcon("ScanFace"),
  ScanText: createMockIcon("ScanText"),
  Share2: createMockIcon("Share2"),
  ShieldAlert: createMockIcon("ShieldAlert"),
  ShieldCheck: createMockIcon("ShieldCheck"),
  SlidersHorizontal: createMockIcon("SlidersHorizontal"),
  Smile: createMockIcon("Smile"),
  Sparkles: createMockIcon("Sparkles"),
  SwitchCamera: createMockIcon("SwitchCamera"),
  Trash2: createMockIcon("Trash2"),
  UserPlus: createMockIcon("UserPlus"),
  Zap: createMockIcon("Zap"),
}));

mock.module("expo-router", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    back: () => {},
    canGoBack: () => true,
  }),
  Stack: (props: Record<string, unknown>) => props.children as React.ReactNode,
}));

const tfliteAssetPath = path.resolve(
  __dirname,
  "../../apps/expo-native/assets/models/detect.tflite",
);

const faceTfliteAssetPath = path.resolve(
  __dirname,
  "../../apps/expo-native/assets/models/face_detection_full_range.tflite",
);

const mobileFaceNetAssetPath = path.resolve(
  __dirname,
  "../../apps/expo-native/assets/models/mobilefacenet.tflite",
);

const faceMeshAssetPath = path.resolve(
  __dirname,
  "../../apps/expo-native/assets/models/face_landmark.tflite",
);

mock.module(tfliteAssetPath, () => ({
  url: "assets/models/detect.tflite",
}));

mock.module(faceTfliteAssetPath, () => ({
  url: "assets/models/face_detection_full_range.tflite",
}));

mock.module(mobileFaceNetAssetPath, () => ({
  url: "assets/models/mobilefacenet.tflite",
}));

mock.module(faceMeshAssetPath, () => ({
  url: "assets/models/face_landmark.tflite",
}));

mock.module(
  path.resolve(__dirname, "../../apps/expo-native/node_modules/react/index.js"),
  () => React,
);

mock.module("react-native-fast-tflite", () => ({
  loadTensorflowModel: async (
    source: unknown,
    delegates?: string[] | string,
  ): Promise<MockTFLiteModel> => {
    if (loadTensorflowModelOverride) {
      return loadTensorflowModelOverride(source, delegates);
    }
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

const createReconciler = require("react-reconciler") as ReconcilerFactory;
const { ConcurrentRoot, DefaultEventPriority } =
  require("react-reconciler/constants") as ReconcilerConstants;

function createScreenTestRenderer() {
  const reconciler = createReconciler({
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    isPrimaryRenderer: false,
    createInstance: (type: string, props: Record<string, unknown>): HostNode => ({
      type,
      props,
      children: [],
    }),
    createTextInstance: (text: string): HostNode => ({
      text,
      children: [],
    }),
    appendInitialChild: (parent: HostNode, child: HostNode) => {
      parent.children.push(child);
    },
    appendChild: (parent: HostNode, child: HostNode) => {
      parent.children.push(child);
    },
    appendChildToContainer: (
      container: ReconcilerRootContainer,
      child: HostNode,
    ) => {
      container.children.push(child);
    },
    insertBefore: (parent: HostNode, child: HostNode) => {
      parent.children.push(child);
    },
    insertInContainerBefore: (
      container: ReconcilerRootContainer,
      child: HostNode,
    ) => {
      container.children.push(child);
    },
    removeChild: (parent: HostNode, child: HostNode) => {
      const idx = parent.children.indexOf(child);
      if (idx !== -1) parent.children.splice(idx, 1);
    },
    removeChildFromContainer: (
      container: ReconcilerRootContainer,
      child: HostNode,
    ) => {
      const idx = container.children.indexOf(child);
      if (idx !== -1) container.children.splice(idx, 1);
    },
    commitUpdate: (
      instance: HostNode,
      _type: string,
      _oldProps: Record<string, unknown>,
      newProps: Record<string, unknown>,
    ) => {
      instance.props = newProps;
    },
    commitTextUpdate: (
      textInstance: HostNode,
      _oldText: string,
      newText: string,
    ) => {
      textInstance.text = newText;
    },
    finalizeInitialChildren: () => false,
    prepareForCommit: () => null,
    resetAfterCommit: () => {},
    getRootHostContext: () => ({}),
    getChildHostContext: (parentHostContext: unknown) => parentHostContext,
    shouldSetTextContent: () => false,
    clearContainer: (container: ReconcilerRootContainer) => {
      container.children = [];
    },
    getPublicInstance: (instance: HostNode) => instance,
    preparePortalMount: () => {},
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,
    getCurrentUpdatePriority: () => DefaultEventPriority,
    setCurrentUpdatePriority: () => {},
    resolveUpdatePriority: () => DefaultEventPriority,
    maySuspendCommit: () => false,
    preloadInstance: () => true,
    startSuspendingCommit: () => {},
    suspendInstance: () => {},
    waitForCommitToBeReady: () => null,
    NotPendingTransition: null,
    HostTransitionContext: React.createContext(null),
    resetFormInstance: () => {},
    requestPostPaintCallback: () => {},
    shouldAttemptEagerTransition: () => false,
    trackSchedulerEvent: () => {},
    resolveEventType: () => null,
    resolveEventTimeStamp: () => -1.1,
    detachDeletedInstance: () => {},
  });

  const container: ReconcilerRootContainer = { children: [] };
  const root = reconciler.createContainer(
    container,
    ConcurrentRoot,
    null,
    false,
    null,
    "",
    () => {},
    null,
  );

  return {
    container,
    mount(element: React.ReactElement) {
      React.act(() => {
        reconciler.updateContainer(element, root, null, () => {});
      });
    },
    unmount() {
      React.act(() => {
        reconciler.updateContainer(null, root, null, () => {});
      });
    },
  };
}

function collectTexts(node: HostNode | ReconcilerRootContainer): string[] {
  const texts: string[] = [];
  if ("text" in node && typeof node.text === "string") {
    texts.push(node.text);
  }
  for (const child of node.children) {
    texts.push(...collectTexts(child));
  }
  return texts;
}

function findNodes(
  node: HostNode | ReconcilerRootContainer,
  predicate: (candidate: HostNode) => boolean,
): HostNode[] {
  const matches: HostNode[] = [];
  for (const child of node.children) {
    if (predicate(child)) {
      matches.push(child);
    }
    matches.push(...findNodes(child, predicate));
  }
  return matches;
}

function findButtonByText(
  container: ReconcilerRootContainer,
  label: string,
): HostNode | undefined {
  return findNodes(
    container,
    (node) =>
      node.type === "button" &&
      collectTexts(node).join("").includes(label),
  )[0];
}

function buildSampleSSDTensors(): [
  Float32Array,
  Float32Array,
  Float32Array,
  Float32Array,
] {
  return [
    new Float32Array([
      0.1, 0.2, 0.8, 0.6,
      0.15, 0.25, 0.45, 0.55,
    ]),
    new Float32Array([0, 12]),
    new Float32Array([0.92, 0.62]),
    new Float32Array([2]),
  ];
}

const ROOT_DIR = path.resolve(__dirname, "../..");
const EXPO_NATIVE_DIR = path.join(ROOT_DIR, "apps", "expo-native");

interface ExpoNativePackageJson {
  name: string;
  private: boolean;
  main: string;
  dependencies: Record<string, string>;
}

interface ExpoNativeAppJson {
  expo: {
    android: {
      package: string;
      permissions: string[];
    };
    plugins: Array<string | [string, Record<string, unknown>]>;
  };
}

interface ExpoNativeTsConfig {
  extends: string;
  compilerOptions: {
    strict: boolean;
    ignoreDeprecations?: string;
    paths?: Record<string, string[]>;
  };
  exclude: string[];
}

interface MetroConfigShape {
  watchFolders: string[];
  resolver: {
    assetExts: string[];
    nodeModulesPaths: string[];
  };
}

interface BabelConfigShape {
  presets: string[];
  plugins: string[];
}

describe("Tier 4: apps/expo-native Scaffold, Bundled Model & Detector Integration", () => {
  test("1. All required apps/expo-native scaffold files and assets exist", () => {
    const requiredFiles = [
      "package.json",
      "app.json",
      "metro.config.js",
      "babel.config.js",
      "tsconfig.json",
      "index.js",
      ".gitignore",
      "app/_layout.tsx",
      "app/index.tsx",
      "app/object-detection.tsx",
      "app/face-recognition.tsx",
      "src/constants/cocoLabels.ts",
      "assets/icon.png",
      "assets/adaptive-icon.png",
      "assets/splash.png",
      "assets/favicon.png",
      "assets/models/detect.tflite",
      "assets/models/face_detection_full_range.tflite",
      "assets/models/mobilefacenet.tflite",
      "assets/models/labelmap.txt",
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(EXPO_NATIVE_DIR, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  test("2. package.json declares @masumdev workspace packages and required native dependencies", () => {
    const pkgRaw = fs.readFileSync(
      path.join(EXPO_NATIVE_DIR, "package.json"),
      "utf8",
    );
    const pkg = JSON.parse(pkgRaw) as ExpoNativePackageJson;

    expect(pkg.name).toBe("expo-native");
    expect(pkg.private).toBe(true);
    expect(pkg.main).toBe("index.js");

    const requiredDeps = [
      "@masumdev/rn-camera-ai",
      "@masumdev/rn-camera-ai-tflite",
      "expo",
      "expo-dev-client",
      "expo-router",
      "react-native-vision-camera",
      "react-native-vision-camera-worklets",
      "react-native-fast-tflite",
      "react-native-nitro-modules",
      "react-native-nitro-image",
      "react-native-worklets",
      "react-native-reanimated",
      "react-native-gesture-handler",
      "react-native-safe-area-context",
      "react-native-screens",
      "lucide-react-native",
    ];

    for (const dep of requiredDeps) {
      expect(typeof pkg.dependencies[dep]).toBe("string");
    }
    expect(pkg.dependencies["@masumdev/rn-camera-ai"]).toBe("workspace:*");
    expect(pkg.dependencies["@masumdev/rn-camera-ai-tflite"]).toBe(
      "workspace:*",
    );
  });

  test("3. app.json configures Android CAMERA permission and fast-tflite GPU plugin without invalid VC plugin", () => {
    const appJsonRaw = fs.readFileSync(
      path.join(EXPO_NATIVE_DIR, "app.json"),
      "utf8",
    );
    const appJson = JSON.parse(appJsonRaw) as ExpoNativeAppJson;

    expect(appJson.expo.android.package).toBe("id.masumdev.exponative");
    expect(appJson.expo.android.permissions).toContain(
      "android.permission.CAMERA",
    );

    const pluginNames = appJson.expo.plugins.map((entry) =>
      Array.isArray(entry) ? entry[0] : entry,
    );
    expect(pluginNames).toContain("expo-dev-client");
    expect(pluginNames).toContain("expo-router");
    expect(pluginNames).toContain("react-native-fast-tflite");
    expect(pluginNames).not.toContain("react-native-vision-camera");

    const tflitePlugin = appJson.expo.plugins.find(
      (entry): entry is [string, Record<string, unknown>] =>
        Array.isArray(entry) && entry[0] === "react-native-fast-tflite",
    );
    expect(tflitePlugin).toBeDefined();
    expect(tflitePlugin?.[1].enableAndroidGpuLibraries).toBe(true);
  });

  test("4. metro.config.js, babel.config.js, and tsconfig.json satisfy monorepo and worklet rules", () => {
    const metroConfig = require(
      path.join(EXPO_NATIVE_DIR, "metro.config.js"),
    ) as MetroConfigShape;

    expect(metroConfig.resolver.assetExts).toContain("tflite");
    expect(metroConfig.watchFolders).toContain(ROOT_DIR);
    expect(metroConfig.resolver.nodeModulesPaths).toContain(
      path.join(ROOT_DIR, "node_modules"),
    );

    const babelFactory = require(
      path.join(EXPO_NATIVE_DIR, "babel.config.js"),
    ) as (api: { cache: (enabled: boolean) => void }) => BabelConfigShape;
    const babelConfig = babelFactory({ cache: () => {} });

    expect(
      babelConfig.presets.some((preset) => preset.includes("babel-preset-expo")),
    ).toBe(true);
    expect(
      babelConfig.plugins.some((plugin) =>
        plugin.includes("react-native-reanimated"),
      ),
    ).toBe(true);

    const tsConfigRaw = fs.readFileSync(
      path.join(EXPO_NATIVE_DIR, "tsconfig.json"),
      "utf8",
    );
    const tsConfig = JSON.parse(tsConfigRaw) as ExpoNativeTsConfig;

    expect(tsConfig.extends).toBe("expo/tsconfig.base");
    expect(tsConfig.compilerOptions.strict).toBe(true);
    expect(tsConfig.exclude).toContain("android");
    expect(tsConfig.exclude).toContain("ios");
    expect(tsConfig.exclude).toContain(".expo");
    expect(tsConfig.exclude).toContain("node_modules");
  });

  test("5. Bundled detect.tflite has valid TFL3 header (>4 MB) and labelmap.txt matches COCO_91_LABELS", () => {
    const modelBuffer = fs.readFileSync(
      path.join(EXPO_NATIVE_DIR, "assets", "models", "detect.tflite"),
    );
    expect(modelBuffer.byteLength).toBeGreaterThan(4_000_000);
    expect(modelBuffer.subarray(4, 8).toString("ascii")).toBe("TFL3");

    const labelmapRaw = fs.readFileSync(
      path.join(EXPO_NATIVE_DIR, "assets", "models", "labelmap.txt"),
      "utf8",
    );
    const lines = labelmapRaw.trimEnd().split(/\r?\n/);

    expect(lines.length).toBe(91);
    expect(COCO_91_LABELS.length).toBe(91);
    expect(lines).toEqual(COCO_91_LABELS);
    expect(MODEL_INPUT_WIDTH).toBe(300);
    expect(MODEL_INPUT_HEIGHT).toBe(300);
    expect(MODEL_LABEL_OFFSET).toBe(1);
  });

  test("6. parseDetectionOutputs and createTFLiteObjectDetector align COCO_91_LABELS with labelOffset=1", async () => {
    const rawOutputs: [
      Float32Array,
      Float32Array,
      Float32Array,
      Float32Array,
    ] = [
      new Float32Array([
        0.1, 0.2, 0.8, 0.6,
        0.15, 0.25, 0.45, 0.55,
        0.2, 0.3, 0.7, 0.8,
        0.05, 0.05, 0.25, 0.25,
      ]),
      new Float32Array([0, 12, 89, 1]),
      new Float32Array([0.95, 0.88, 0.76, 0.4]),
      new Float32Array([4]),
    ];

    const parsed = parseDetectionOutputs(rawOutputs, {
      confidenceThreshold: 0.5,
      maxResults: 10,
      labels: COCO_91_LABELS,
      labelOffset: MODEL_LABEL_OFFSET,
    });

    expect(parsed.length).toBe(3);
    expect(parsed[0].label).toBe("person");
    expect(parsed[1].label).toBe("stop sign");
    expect(parsed[2].label).toBe("toothbrush");

    const detector = await createTFLiteObjectDetector({
      model: 1,
      labels: COCO_91_LABELS,
      labelOffset: MODEL_LABEL_OFFSET,
      inputWidth: MODEL_INPUT_WIDTH,
      inputHeight: MODEL_INPUT_HEIGHT,
      confidenceThreshold: 0.5,
      maxResults: 10,
      targetFps: 15,
      useGpu: true,
      resizePlugin: {
        resize: () => ({
          buffer: new ArrayBuffer(MODEL_INPUT_WIDTH * MODEL_INPUT_HEIGHT * 3),
        }),
      },
      loadModel: async () => ({
        runSync: () => rawOutputs,
      }),
    });

    const initialDetections = detector.processFrame({
      width: 640,
      height: 480,
    });
    expect(initialDetections.map((item) => item.label)).toEqual([
      "person",
      "stop sign",
      "toothbrush",
    ]);

    detector.setConfidenceThreshold(0.9);
    await new Promise((resolve) => setTimeout(resolve, 80));
    const filteredDetections = detector.processFrame({
      width: 640,
      height: 480,
    });
    expect(filteredDetections.length).toBe(1);
    expect(filteredDetections[0].label).toBe("person");

    detector.dispose?.();
    expect(detector.status).toBe("idle");
  });

  describe("CameraAIDemoScreen UI Regression Suites", () => {
    const globalActEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    let previousActEnv: boolean | undefined;

    beforeEach(() => {
      previousActEnv = globalActEnv.IS_REACT_ACT_ENVIRONMENT;
      globalActEnv.IS_REACT_ACT_ENVIRONMENT = true;
      loadTensorflowModelOverride = null;
      mockCameraState.reset();
    });

    afterEach(() => {
      loadTensorflowModelOverride = null;
      mockCameraState.reset();
      globalActEnv.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
    });

    test("7. Pausing clears HUD, hides DetectionOverlay bounding boxes, and ignores late onDetections", async () => {
      loadTensorflowModelOverride = async (_source, delegates) => ({
        runSync: () => buildSampleSSDTensors(),
        run: async () => buildSampleSSDTensors(),
        delegates: Array.isArray(delegates)
          ? delegates
          : delegates
            ? [delegates]
            : [],
      });

      const { default: CameraAIDemoScreen } = await import(
        "../../apps/expo-native/app/object-detection"
      );
      const renderer = createScreenTestRenderer();
      renderer.mount(React.createElement(CameraAIDemoScreen));

      await React.act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const layoutNode = findNodes(
        renderer.container,
        (node) => typeof node.props?.onLayout === "function",
      )[0];
      expect(layoutNode).toBeDefined();

      React.act(() => {
        const onLayout = layoutNode?.props?.onLayout as
          | ((event: {
              nativeEvent: { layout: { width: number; height: number } };
            }) => void)
          | undefined;
        onLayout?.({ nativeEvent: { layout: { width: 390, height: 844 } } });
      });

      const onFrameBeforePause = mockCameraState.lastFrameOutputOptions
        ?.onFrame as ((frame: unknown) => void) | undefined;
      expect(typeof onFrameBeforePause).toBe("function");

      const createMockFrame = () => ({
        width: 640,
        height: 480,
        orientation: "up",
        isMirrored: false,
        isValid: true,
        dispose: () => {},
      });

      React.act(() => {
        onFrameBeforePause?.(createMockFrame());
      });

      const activeTexts = collectTexts(renderer.container);
      expect(activeTexts).toContain("READY");
      expect(activeTexts.join("")).toContain("Detections (2)");
      expect(activeTexts.join("")).toContain("person 92%");
      expect(activeTexts.join("")).toContain("stop sign 62%");

      const pauseButton = findButtonByText(renderer.container, "Pause");
      expect(pauseButton).toBeDefined();

      React.act(() => {
        const onPress = pauseButton?.props?.onPress as (() => void) | undefined;
        onPress?.();
      });

      const pausedTexts = collectTexts(renderer.container);
      expect(pausedTexts.join("")).toContain("Detections (0)");
      expect(pausedTexts).toContain("Paused");
      expect(pausedTexts).toContain("Inference paused");
      expect(pausedTexts.join("")).not.toContain("person 92%");
      expect(pausedTexts.join("")).not.toContain("stop sign 62%");

      // Simulate a late frame/scheduleOnRN callback captured before pause
      React.act(() => {
        onFrameBeforePause?.(createMockFrame());
      });

      const afterLateFrameTexts = collectTexts(renderer.container);
      expect(afterLateFrameTexts.join("")).toContain("Detections (0)");
      expect(afterLateFrameTexts).toContain("Paused");
      expect(afterLateFrameTexts.join("")).not.toContain("person 92%");
      expect(afterLateFrameTexts.join("")).not.toContain("stop sign 62%");
      expect(afterLateFrameTexts).not.toContain("person");
      expect(afterLateFrameTexts).not.toContain("stop sign");

      renderer.unmount();
    });

    test("8. Confidence threshold selected during initial model load is applied upon detector resolution", async () => {
      let resolveModel!: (model: MockTFLiteModel) => void;
      loadTensorflowModelOverride = () =>
        new Promise<MockTFLiteModel>((resolve) => {
          resolveModel = resolve;
        });

      const { default: CameraAIDemoScreen } = await import(
        "../../apps/expo-native/app/object-detection"
      );
      const renderer = createScreenTestRenderer();
      renderer.mount(React.createElement(CameraAIDemoScreen));

      expect(collectTexts(renderer.container)).toContain("LOADING");

      const threshold70Button = findButtonByText(renderer.container, "70%");
      expect(threshold70Button).toBeDefined();

      React.act(() => {
        const onPress = threshold70Button?.props?.onPress as
          | (() => void)
          | undefined;
        onPress?.();
      });

      await React.act(async () => {
        resolveModel({
          runSync: () => buildSampleSSDTensors(),
          run: async () => buildSampleSSDTensors(),
          delegates: ["android-gpu"],
        });
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const layoutNode = findNodes(
        renderer.container,
        (node) => typeof node.props?.onLayout === "function",
      )[0];

      React.act(() => {
        const onLayout = layoutNode?.props?.onLayout as
          | ((event: {
              nativeEvent: { layout: { width: number; height: number } };
            }) => void)
          | undefined;
        onLayout?.({ nativeEvent: { layout: { width: 390, height: 844 } } });
      });

      React.act(() => {
        const onFrame = mockCameraState.lastFrameOutputOptions?.onFrame as
          | ((frame: unknown) => void)
          | undefined;
        onFrame?.({
          width: 640,
          height: 480,
          orientation: "up",
          isMirrored: false,
          isValid: true,
          dispose: () => {},
        });
      });

      const texts = collectTexts(renderer.container);
      expect(texts).toContain("READY");
      expect(texts.join("")).toContain("Detections (1)");
      expect(texts.join("")).toContain("person 92%");
      expect(texts).not.toContain("stop sign");
      expect(texts.join("")).not.toContain("stop sign 62%");

      renderer.unmount();
    });

    test("9. Error banner shows Retry only for model load failures and only Dismiss for camera errors", async () => {
      loadTensorflowModelOverride = async () => {
        throw new Error("Corrupt model asset");
      };

      const { default: CameraAIDemoScreen } = await import(
        "../../apps/expo-native/app/object-detection"
      );
      const renderer = createScreenTestRenderer();
      renderer.mount(React.createElement(CameraAIDemoScreen));

      await React.act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const modelErrorTexts = collectTexts(renderer.container);
      expect(modelErrorTexts).toContain("ERROR");
      expect(modelErrorTexts.join(" ")).toContain("Corrupt model asset");
      const retryButton = findButtonByText(renderer.container, "Retry");
      const dismissButton = findButtonByText(renderer.container, "Dismiss");
      expect(retryButton).toBeDefined();
      expect(dismissButton).toBeDefined();

      loadTensorflowModelOverride = async (_source, delegates) => ({
        runSync: () => buildSampleSSDTensors(),
        run: async () => buildSampleSSDTensors(),
        delegates: Array.isArray(delegates)
          ? delegates
          : delegates
            ? [delegates]
            : [],
      });

      await React.act(async () => {
        const onRetryPress = retryButton?.props?.onPress as
          | (() => void)
          | undefined;
        onRetryPress?.();
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const recoveredTexts = collectTexts(renderer.container);
      expect(recoveredTexts).toContain("READY");
      expect(recoveredTexts.join(" ")).not.toContain("Corrupt model asset");

      React.act(() => {
        const onCameraError = mockCameraState.lastCameraProps?.onError as
          | ((err: unknown) => void)
          | undefined;
        onCameraError?.(new Error("Simulated hardware disconnect"));
      });

      const cameraErrorTexts = collectTexts(renderer.container);
      expect(cameraErrorTexts.join(" ")).toContain(
        "CAMERA_HARDWARE_ERROR: Simulated hardware disconnect",
      );
      expect(findButtonByText(renderer.container, "Retry")).toBeUndefined();
      const cameraDismissButton = findButtonByText(
        renderer.container,
        "Dismiss",
      );
      expect(cameraDismissButton).toBeDefined();

      React.act(() => {
        const onDismissPress = cameraDismissButton?.props?.onPress as
          | (() => void)
          | undefined;
        onDismissPress?.();
      });

      const dismissedTexts = collectTexts(renderer.container);
      expect(dismissedTexts.join(" ")).not.toContain(
        "Simulated hardware disconnect",
      );
      expect(dismissedTexts).toContain("READY");

      renderer.unmount();
    });

    test("10. Feature Menu Hub (app/index.tsx) and FaceRecognitionScreen (app/face-recognition.tsx) render and validate BlazeFace model", async () => {
      const faceModelBuffer = fs.readFileSync(
        path.join(
          EXPO_NATIVE_DIR,
          "assets",
          "models",
          "face_detection_full_range.tflite",
        ),
      );
      expect(faceModelBuffer.byteLength).toBeGreaterThan(1_000_000);
      expect(faceModelBuffer.subarray(4, 8).toString("ascii")).toBe("TFL3");

      const mobileFaceNetBuffer = fs.readFileSync(
        path.join(
          EXPO_NATIVE_DIR,
          "assets",
          "models",
          "mobilefacenet.tflite",
        ),
      );
      expect(mobileFaceNetBuffer.byteLength).toBeGreaterThan(5_000_000);
      expect(mobileFaceNetBuffer.subarray(4, 8).toString("ascii")).toBe("TFL3");

      const { default: FeatureMenuScreen } = await import(
        "../../apps/expo-native/app/index"
      );
      const menuRenderer = createScreenTestRenderer();
      menuRenderer.mount(React.createElement(FeatureMenuScreen));
      const menuTexts = collectTexts(menuRenderer.container);
      expect(menuTexts).toContain("Camera AI Playground");
      expect(menuTexts).toContain("Object Detection");
      expect(menuTexts).toContain("Face Detection & Recognition");
      expect(menuTexts).toContain("Face Liveness & Anti-Spoofing");
      expect(menuTexts).toContain("Text Recognition & OCR Scanner");
      menuRenderer.unmount();

      const { default: OcrScannerScreen } = await import(
        "../../apps/expo-native/app/ocr-scanner"
      );
      const ocrRenderer = createScreenTestRenderer();
      ocrRenderer.mount(React.createElement(OcrScannerScreen));
      await React.act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      const ocrTexts = collectTexts(ocrRenderer.container);
      expect(ocrTexts).toContain("Smart Document Capture");
      expect(ocrTexts).toContain("READY");
      expect(ocrTexts).toContain("Capture Document");
      expect(ocrTexts).toContain("Background Framing Active");
      expect(ocrTexts.join(" ")).not.toContain("Live Scan");
      expect(mockCameraState.lastFrameOutputOptions?.pixelFormat).toBe("yuv");

      const activeOutputs = mockCameraState.lastCameraProps?.outputs as
        | Array<Record<string, unknown>>
        | undefined;
      expect(activeOutputs?.length).toBe(2);
      expect(activeOutputs?.[0]?.__mockFrameOutput).toBe(true);
      expect(activeOutputs?.[1]?.__mockPhotoOutput).toBe(true);

      // Build synthetic YUV planar frame with bright paper [0.12..0.88, 0.14..0.88] on dark background
      const w = 360;
      const h = 520;
      const yPlane = new Uint8Array(w * h);
      for (let r = 0; r < h; r++) {
        const ny = r / h;
        for (let c = 0; c < w; c++) {
          const nx = c / w;
          const onPaper = nx >= 0.12 && nx <= 0.88 && ny >= 0.14 && ny <= 0.88;
          let lum = onPaper ? 225 : 55;
          if (onPaper && ny < 0.65 && r % 10 < 4 && c % 14 < 7) {
            lum = 95;
          }
          yPlane[r * w + c] = lum;
        }
      }

      const onFrame = mockCameraState.lastFrameOutputOptions?.onFrame as
        | ((frame: Record<string, unknown>) => void)
        | undefined;
      expect(typeof onFrame).toBe("function");
      await React.act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 210));
        onFrame?.({
          width: w,
          height: h,
          orientation: "up",
          isMirrored: false,
          isPlanar: true,
          isValid: true,
          getPlanes: () => [
            {
              width: w,
              height: h,
              bytesPerRow: w,
              isValid: true,
              getPixelBuffer: () => yPlane.buffer,
            },
          ],
          dispose: () => {},
        });
      });

      const alignedTexts = collectTexts(ocrRenderer.container);
      expect(alignedTexts.join(" ")).toContain("Optimal Scan:");

      // Trigger Capture & Analyze -> laser animation runs & invokes ML Kit recognizeImage once
      const shutterButton = findButtonByText(
        ocrRenderer.container,
        "Capture",
      );
      expect(shutterButton).toBeDefined();
      await React.act(async () => {
        const onPress = shutterButton?.props?.onPress as
          | (() => Promise<void> | void)
          | undefined;
        await onPress?.();
        await new Promise((resolve) => setTimeout(resolve, 25));
      });

      expect(mockCameraState.capturePhotoCallCount).toBe(1);
      const analyzedTexts = collectTexts(ocrRenderer.container);
      expect(analyzedTexts).toContain("Retake Photo");
      expect(analyzedTexts).toContain("Export / Copy");
      expect(analyzedTexts.join(" ")).toContain("3273011505990001");
      expect(analyzedTexts.join(" ")).toContain("masum@example.com");

      // Switch UI customization preset (Studio -> Emerald -> Custom)
      const themeButton = findButtonByText(ocrRenderer.container, "Studio");
      expect(themeButton).toBeDefined();
      React.act(() => {
        const onPress = themeButton?.props?.onPress as (() => void) | undefined;
        onPress?.();
      });
      expect(collectTexts(ocrRenderer.container)).toContain("Emerald");

      // Retake returns cleanly to document alignment viewfinder
      const retakeButton = findButtonByText(
        ocrRenderer.container,
        "Retake Photo",
      );
      expect(retakeButton).toBeDefined();
      React.act(() => {
        const onPress = retakeButton?.props?.onPress as
          | (() => void)
          | undefined;
        onPress?.();
      });
      expect(collectTexts(ocrRenderer.container)).toContain("Capture Document");
      ocrRenderer.unmount();

      const { default: FaceLivenessScreen } = await import(
        "../../apps/expo-native/app/liveness-detection"
      );
      const livenessRenderer = createScreenTestRenderer();
      livenessRenderer.mount(React.createElement(FaceLivenessScreen));
      await React.act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      const livenessTexts = collectTexts(livenessRenderer.container);
      expect(livenessTexts).toContain("Liveness & Anti-Spoof");
      expect(livenessTexts).toContain("Live Telemetry HUD");
      expect(livenessTexts).toContain("e-KYC Challenge (4 Step)");
      livenessRenderer.unmount();

      const { default: FaceRecognitionScreen } = await import(
        "../../apps/expo-native/app/face-recognition"
      );
      const faceRenderer = createScreenTestRenderer();
      faceRenderer.mount(React.createElement(FaceRecognitionScreen));
      await React.act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
      const faceTexts = collectTexts(faceRenderer.container);
      expect(faceTexts).toContain("Face Recognition AI");
      expect(faceTexts).toContain("READY");
      expect(faceTexts).toContain("Enroll Face");
      expect(faceTexts).toContain("468 Mesh");
      faceRenderer.unmount();
    });
  });
});
