import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CameraAI } from '../src/components/CameraAI';
import { DetectionOverlay } from '../src/components/DetectionOverlay';
import { DocumentGuideOverlay } from '../src/components/DocumentGuideOverlay';
import { ScannerAnimationOverlay } from '../src/components/ScannerAnimationOverlay';
import type {
  CameraAIRef,
  CameraProcessor,
  DetectionResult,
  FaceLandmark,
} from '../src/types/contracts';
import type { CameraAIError } from '../src/types/errors';
import { mockCameraState } from '../../../tests/e2e/setup/mock-native';

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
    transitionCallbacks: null
  ): unknown;
  updateContainer(
    element: React.ReactElement | null,
    container: unknown,
    parentComponent: null,
    callback: () => void
  ): void;
}

type ReconcilerFactory = (hostConfig: Record<string, unknown>) => ReconcilerInstance;

interface ReconcilerConstants {
  ConcurrentRoot: number;
  DefaultEventPriority: number;
}

const createReconciler = require('react-reconciler') as ReconcilerFactory;
const { ConcurrentRoot, DefaultEventPriority } =
  require('react-reconciler/constants') as ReconcilerConstants;

function createTestRenderer() {
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
    appendChildToContainer: (container: ReconcilerRootContainer, child: HostNode) => {
      container.children.push(child);
    },
    insertBefore: (parent: HostNode, child: HostNode) => {
      parent.children.push(child);
    },
    insertInContainerBefore: (container: ReconcilerRootContainer, child: HostNode) => {
      container.children.push(child);
    },
    removeChild: (parent: HostNode, child: HostNode) => {
      const idx = parent.children.indexOf(child);
      if (idx !== -1) parent.children.splice(idx, 1);
    },
    removeChildFromContainer: (container: ReconcilerRootContainer, child: HostNode) => {
      const idx = container.children.indexOf(child);
      if (idx !== -1) container.children.splice(idx, 1);
    },
    commitUpdate: (
      instance: HostNode,
      _type: string,
      _oldProps: Record<string, unknown>,
      newProps: Record<string, unknown>
    ) => {
      instance.props = newProps;
    },
    commitTextUpdate: (textInstance: HostNode, _oldText: string, newText: string) => {
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
    '',
    () => {},
    null
  );

  return {
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

describe('CameraAI React Lifecycle & Callback Refs', () => {
  const globalActEnv = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  let previousActEnv: boolean | undefined;

  beforeEach(() => {
    previousActEnv = globalActEnv.IS_REACT_ACT_ENVIRONMENT;
    globalActEnv.IS_REACT_ACT_ENVIRONMENT = true;
    mockCameraState.reset();
  });

  afterEach(() => {
    globalActEnv.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
  });

  it('initializes processor once and never disposes across parent re-renders with inline onError and onDetections', () => {
    let initCount = 0;
    let disposeCount = 0;
    const seenCounts: number[] = [];
    const seenErrors: CameraAIError[] = [];

    const processor: CameraProcessor = {
      id: 'lifecycle-proc',
      name: 'LifecycleProcessor',
      status: 'ready',
      initialize: async () => {
        initCount += 1;
      },
      dispose: () => {
        disposeCount += 1;
      },
      processFrame: (frame: unknown) => {
        const typedFrame = frame as { shouldThrow?: boolean };
        if (typedFrame.shouldThrow) {
          throw new Error('simulated frame failure');
        }
        return [
          {
            id: 'det-1',
            label: 'person',
            confidence: 0.92,
            boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.4 },
          },
        ];
      },
    };

    const Harness: React.FC = () => {
      const [renderTick, setRenderTick] = React.useState(0);
      return React.createElement(CameraAI, {
        processor,
        onDetections: (detections: DetectionResult[]) => {
          seenCounts.push(renderTick + detections.length);
          setRenderTick((prev) => prev + 1);
        },
        onError: (err: CameraAIError) => {
          seenErrors.push(err);
        },
      });
    };

    const renderer = createTestRenderer();
    renderer.mount(React.createElement(Harness));

    expect(initCount).toBe(1);
    expect(disposeCount).toBe(0);

    const initialOnFrame = mockCameraState.lastFrameOutputOptions?.onFrame as
      | ((frame: unknown) => void)
      | undefined;
    expect(typeof initialOnFrame).toBe('function');

    // Dispatch 3 valid frames, triggering parent state updates and new inline callback closures each render
    for (let i = 0; i < 3; i++) {
      React.act(() => {
        const onFrame = mockCameraState.lastFrameOutputOptions?.onFrame as
          | ((frame: unknown) => void)
          | undefined;
        expect(onFrame).toBe(initialOnFrame);
        onFrame?.({
          width: 640,
          height: 480,
          orientation: 'up',
          isMirrored: false,
          isValid: true,
          dispose: () => {},
        });
      });
    }

    expect(initCount).toBe(1);
    expect(disposeCount).toBe(0);
    // Latest inline onDetections closure observed incremented renderTick (0+1, 1+1, 2+1)
    expect(seenCounts).toEqual([1, 2, 3]);

    // Dispatch an error frame to verify latest inline onError ref is invoked without disposing processor
    React.act(() => {
      const onFrame = mockCameraState.lastFrameOutputOptions?.onFrame as
        | ((frame: unknown) => void)
        | undefined;
      onFrame?.({
        width: 640,
        height: 480,
        orientation: 'up',
        isMirrored: false,
        isValid: true,
        shouldThrow: true,
        dispose: () => {},
      });
    });

    expect(seenErrors.length).toBe(1);
    expect(seenErrors[0].message).toBe('simulated frame failure');
    expect(initCount).toBe(1);
    expect(disposeCount).toBe(0);

    // Unmount disposes processor exactly once
    renderer.unmount();
    expect(initCount).toBe(1);
    expect(disposeCount).toBe(1);
  });

  it('disposes previous processor and initializes new processor when processor prop changes', () => {
    let initA = 0;
    let disposeA = 0;
    let initB = 0;
    let disposeB = 0;

    const procA: CameraProcessor = {
      id: 'proc-a',
      name: 'ProcA',
      status: 'ready',
      initialize: async () => {
        initA += 1;
      },
      dispose: () => {
        disposeA += 1;
      },
      processFrame: () => [],
    };

    const procB: CameraProcessor = {
      id: 'proc-b',
      name: 'ProcB',
      status: 'ready',
      initialize: async () => {
        initB += 1;
      },
      dispose: () => {
        disposeB += 1;
      },
      processFrame: () => [],
    };

    const renderer = createTestRenderer();
    renderer.mount(
      React.createElement(CameraAI, {
        processor: procA,
        onError: () => {},
      })
    );
    expect(initA).toBe(1);
    expect(disposeA).toBe(0);

    renderer.mount(
      React.createElement(CameraAI, {
        processor: procB,
        onError: () => {},
      })
    );
    expect(disposeA).toBe(1);
    expect(initB).toBe(1);
    expect(disposeB).toBe(0);

    renderer.unmount();
    expect(disposeB).toBe(1);
  });

  it('supports declarative overlayTheme, boxVariant (corners/solid/dashed), 468-mesh toggles, and custom slot renderers', () => {
    const denseLandmarks: FaceLandmark[] = Array.from({ length: 468 }, (_, i) => ({
      x: (i % 20) / 20,
      y: Math.floor(i / 20) / 25,
    }));

    const sampleDetection: DetectionResult = {
      id: 'face-1',
      label: 'Masum',
      confidence: 0.96,
      boundingBox: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
      landmarks: denseLandmarks,
      identity: {
        id: 'id-1',
        name: 'Masum',
        similarity: 0.91,
        isRecognized: true,
      },
    };

    // 1. Corners variant + custom formatLabel + 468-point Face Mesh
    const cornersHtml = renderToStaticMarkup(
      React.createElement(DetectionOverlay, {
        detections: [sampleDetection],
        viewDimensions: { width: 400, height: 800 },
        boxVariant: 'corners',
        formatLabel: (det) => `VERIFIED: ${det.label}`,
        overlayTheme: {
          cornerLength: 24,
          cornerThickness: 3,
          labelPosition: 'top-right',
          meshStyle: {
            showMeshLines: true,
            showTesselation: true,
            showDots: true,
            eyeContourColor: '#00ffff',
          },
        },
      })
    );
    expect(cornersHtml).toContain('VERIFIED: Masum');

    // 2. Custom slot renderers (renderBox, renderLabel, renderLandmarkDot)
    let customBoxCalled = false;
    let customLabelCalled = false;
    let customDotCount = 0;

    const customSlotsHtml = renderToStaticMarkup(
      React.createElement(DetectionOverlay, {
        detections: [
          {
            ...sampleDetection,
            landmarks: [
              { x: 0.35, y: 0.35, type: 'leftEye' },
              { x: 0.65, y: 0.35, type: 'rightEye' },
            ],
          },
        ],
        viewDimensions: { width: 400, height: 800 },
        renderBox: ({ pixelBox, color }) => {
          customBoxCalled = pixelBox.width > 0 && color.length > 0;
          return React.createElement('div', { 'data-testid': 'custom-box' }, 'BOX');
        },
        renderLabel: ({ formattedText }) => {
          customLabelCalled = formattedText.includes('Masum');
          return React.createElement('div', { 'data-testid': 'custom-label' }, formattedText);
        },
        renderLandmarkDot: ({ point, radius }) => {
          if (point.x > 0 && radius > 0) {
            customDotCount += 1;
          }
          return React.createElement('span', { 'data-testid': 'custom-dot' });
        },
      })
    );

    expect(customBoxCalled).toBe(true);
    expect(customLabelCalled).toBe(true);
    expect(customDotCount).toBe(2);
    expect(customSlotsHtml).toContain('custom-box');
    expect(customSlotsHtml).toContain('custom-dot');

    // 3. 100% UI-Thread SharedValue mode (detectionsSharedValue + frameMetaSharedValue)
    const detectionsSV = {
      value: [sampleDetection],
    } as unknown as import('react-native-reanimated').SharedValue<DetectionResult[]>;
    const frameMetaSV = {
      value: {
        streamWidth: 720,
        streamHeight: 1280,
        isMirrored: true,
        orientation: 'portrait' as const,
      },
    } as unknown as import('react-native-reanimated').SharedValue<
      import('../src/types/contracts').OverlayFrameMeta
    >;

    const uiThreadHtml = renderToStaticMarkup(
      React.createElement(DetectionOverlay, {
        detectionsSharedValue: detectionsSV,
        frameMetaSharedValue: frameMetaSV,
        activeLabels: ['Masum 96%'],
        viewDimensions: { width: 400, height: 800 },
        boxVariant: 'corners',
      })
    );
    expect(uiThreadHtml).toContain('Masum 96%');
  });

  it('supports captureMode="photo", exposes capturePhoto() via ref with EXIF upright dimensions, and guards live mode', async () => {
    const cameraRef = React.createRef<CameraAIRef>();
    const processor: CameraProcessor = {
      id: 'photo-test-proc',
      name: 'PhotoTestProc',
      status: 'ready',
      initialize: async () => {},
      dispose: () => {},
      processFrame: () => [],
    };

    const renderer = createTestRenderer();

    // 1. Default live mode binds frameOutput and rejects capturePhoto() cleanly
    renderer.mount(
      React.createElement(CameraAI, {
        ref: cameraRef,
        processor,
        captureMode: 'live',
      })
    );

    const liveOutputs = mockCameraState.lastCameraProps?.outputs as
      | Array<Record<string, unknown>>
      | undefined;
    expect(liveOutputs?.length).toBe(1);
    expect(liveOutputs?.[0]?.__mockFrameOutput).toBe(true);
    expect(typeof mockCameraState.lastFrameOutputOptions?.onFrame).toBe('function');

    const blockedCapture = await cameraRef.current?.capturePhoto();
    expect(blockedCapture).toBeNull();
    expect(mockCameraState.capturePhotoCallCount).toBe(0);

    // 2. Switching to captureMode="photo" swaps VisionCamera outputs to photoOutput & detaches frameOutput
    renderer.mount(
      React.createElement(CameraAI, {
        ref: cameraRef,
        processor,
        captureMode: 'photo',
        scanAnimation: {
          state: 'scanning',
          accentColor: '#f59e0b',
          statusLabel: 'Align document & tap Capture',
        },
      })
    );

    const photoOutputs = mockCameraState.lastCameraProps?.outputs as
      | Array<Record<string, unknown>>
      | undefined;
    expect(photoOutputs?.length).toBe(1);
    expect(photoOutputs?.[0]?.__mockPhotoOutput).toBe(true);
    expect(mockCameraState.lastFrameOutputOptions?.onFrame).toBeUndefined();

    // capturePhoto() returns normalized file:// URI & swaps 90-deg oriented dimensions cleanly
    let captured: Awaited<ReturnType<CameraAIRef['capturePhoto']>> = null;
    await React.act(async () => {
      captured = (await cameraRef.current?.capturePhoto({ flashMode: 'off' })) ?? null;
    });

    expect(mockCameraState.capturePhotoCallCount).toBe(1);
    expect(captured).not.toBeNull();
    expect(captured?.uri).toBe('file:///data/user/0/app/cache/mock_capture.jpg');
    expect(captured?.width).toBe(1920);
    expect(captured?.height).toBe(1440);
    expect(captured?.uprightWidth).toBe(1440);
    expect(captured?.uprightHeight).toBe(1920);

    renderer.unmount();
  });

  it('renders ScannerAnimationOverlay across scanning/analyzing/complete states and honors reducedMotion', () => {
    const scanningHtml = renderToStaticMarkup(
      React.createElement(ScannerAnimationOverlay, {
        active: true,
        state: 'analyzing',
        accentColor: '#f59e0b',
        statusLabel: 'Analyzing photo with Google ML Kit...',
        flashTrigger: 1,
      })
    );
    expect(scanningHtml).toContain('Analyzing photo with Google ML Kit...');

    mockCameraState.reducedMotion = true;
    const reducedHtml = renderToStaticMarkup(
      React.createElement(ScannerAnimationOverlay, {
        active: true,
        state: 'scanning',
        statusLabel: 'Reduced Motion Ready',
      })
    );
    expect(reducedHtml).toContain('Reduced Motion Ready');

    const hiddenHtml = renderToStaticMarkup(
      React.createElement(ScannerAnimationOverlay, {
        active: false,
        flashTrigger: 0,
      })
    );
    expect(hiddenHtml).toBe('');

    const customScannerHtml = renderToStaticMarkup(
      React.createElement(ScannerAnimationOverlay, {
        active: true,
        state: 'analyzing',
        scanRegion: { x: 24, y: 80, width: 340, height: 420 },
        renderLaser: ({ accentColor, regionWidth }) =>
          React.createElement('div', { 'data-laser': `${accentColor}:${regionWidth}` }),
        renderStatusBadge: ({ statusLabel }) =>
          React.createElement('span', {}, `CUSTOM_STATUS:${statusLabel ?? ''}`),
        statusLabel: 'Scanning Sheet',
      })
    );
    expect(customScannerHtml).toContain('CUSTOM_STATUS:Scanning Sheet');
    expect(customScannerHtml).toContain('#f59e0b:340');
  });

  it('renders customizable DocumentGuideOverlay supporting paper bounds and custom slot renderers', () => {
    const defaultGuideHtml = renderToStaticMarkup(
      React.createElement(DocumentGuideOverlay, {
        guide: {
          box: { x: 0.12, y: 0.18, width: 0.76, height: 0.56 },
          readiness: 'optimal',
          optimalityScore: 92,
          statusText: 'Sudut Pas',
          hintText: 'Tekan Capture',
        },
        viewDimensions: { width: 400, height: 800 },
        streamDimensions: { width: 768, height: 1024 },
      })
    );
    expect(defaultGuideHtml).toContain('Sudut Pas');
    expect(defaultGuideHtml).toContain('92%');
    expect(defaultGuideHtml).toContain('Tekan Capture');

    let cornerCalls = 0;
    const seenAngles: number[] = [];
    const customSlotsGuideHtml = renderToStaticMarkup(
      React.createElement(DocumentGuideOverlay, {
        guide: {
          box: { x: 0.1, y: 0.2, width: 0.72, height: 0.56 },
          corners: {
            topLeft: { x: 0.14, y: 0.20 },
            topRight: { x: 0.80, y: 0.27 },
            bottomRight: { x: 0.75, y: 0.76 },
            bottomLeft: { x: 0.10, y: 0.69 },
          },
          readiness: 'adjusting',
          optimalityScore: 64,
          statusText: 'Dokumen Miring',
        },
        viewDimensions: { width: 400, height: 800 },
        renderCorner: ({ corner, color, angleHorizontalRad }) => {
          cornerCalls += 1;
          seenAngles.push(angleHorizontalRad);
          return React.createElement('div', { 'data-corner': `${corner}:${color}` });
        },
        renderStatus: ({ optimalityScore, statusText }) =>
          React.createElement('div', {}, `SLOT:${statusText}:${optimalityScore}`),
      })
    );
    expect(cornerCalls).toBe(4);
    expect(seenAngles.some((ang) => Math.abs(ang) > 0.05)).toBe(true);
    expect(customSlotsGuideHtml).toContain('SLOT:Dokumen Miring:64');
  });

  it('forwards custom photoResolution and avoids overlapping labels when avoidLabelOverlap is enabled', () => {
    const renderer = createTestRenderer();
    renderer.mount(
      React.createElement(CameraAI, {
        captureMode: 'photo',
        photoResolution: { width: 2448, height: 3264 },
        photoQualityPrioritization: 'quality',
      })
    );
    expect(mockCameraState.lastPhotoOutputOptions?.targetResolution).toEqual({
      width: 2448,
      height: 3264,
    });
    expect(mockCameraState.lastPhotoOutputOptions?.qualityPrioritization).toBe('quality');
    renderer.unmount();

    const stackedLines: DetectionResult[] = [
      {
        id: 'line-0',
        label: 'UNDANGAN',
        confidence: 0.96,
        boundingBox: { x: 0.25, y: 0.20, width: 0.40, height: 0.03 },
      },
      {
        id: 'line-1',
        label: 'BERAT BADAN IDEAL',
        confidence: 0.95,
        boundingBox: { x: 0.25, y: 0.215, width: 0.45, height: 0.025 },
      },
      {
        id: 'line-2',
        label: 'WIDIYA 082113838832',
        confidence: 0.94,
        boundingBox: { x: 0.25, y: 0.62, width: 0.45, height: 0.035 },
      },
    ];

    const antiOverlapHtml = renderToStaticMarkup(
      React.createElement(DetectionOverlay, {
        detections: stackedLines,
        viewDimensions: { width: 390, height: 520 },
        showLabels: true,
        avoidLabelOverlap: true,
        showConfidence: false,
      })
    );
    expect(antiOverlapHtml).toContain('UNDANGAN');
    expect(antiOverlapHtml).not.toContain('BERAT BADAN IDEAL');
    expect(antiOverlapHtml).toContain('WIDIYA 082113838832');
  });
});
