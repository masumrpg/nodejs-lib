import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  type Constraint,
  type Frame,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';
import {
  createSynchronizable,
  isWorkletFunction,
  scheduleOnRN,
} from 'react-native-worklets';
import type {
  CameraAIProps,
  CameraFacing,
  DetectionResult,
  FaceMeshStyleConfig,
  StreamDimensions,
  ViewDimensions,
  WorkletBoolSync,
} from '../types/contracts';
import { CameraAIError, CameraError, InferenceError } from '../types/errors';
import {
  DetectionOverlay,
  projectDetectionsWorklet,
  type ProjectedDetectionItem,
  type WorkletOverlayConfig,
} from './DetectionOverlay';
import { PermissionFallbackView } from './PermissionFallbackView';

function createBoolSync(initial: boolean): WorkletBoolSync {
  try {
    return createSynchronizable(initial, { fixedType: true });
  } catch {
    let value = initial;
    return {
      getBlocking: () => value,
      setBlocking: (nextValue: boolean) => {
        value = nextValue;
      },
    };
  }
}

/**
 * CameraAI is the core camera preview and real-time AI overlay component.
 *
 * It wraps React Native Vision Camera v5 hardware preview, handles camera permissions,
 * executes pluggable AI processors AND pre-computes all screen-space bounding box,
 * corner bracket, 468-Point Face Mesh contour/tesselation trigonometry, and landmark
 * projections directly on the Background Camera Worklet Thread (0 JS coordinate math).
 */
export const CameraAI: React.FC<CameraAIProps> = ({
  processor,
  cameraPosition = 'back',
  resizeMode = 'cover',
  isActive = true,
  fps,
  showBoxes,
  boxVariant,
  boxColor,
  landmarkColor,
  showLabels,
  showConfidence,
  showLandmarks = true,
  showMeshLines,
  showTesselation,
  overlayTheme,
  formatLabel,
  renderBox,
  renderLabel,
  renderLandmarkDot,
  renderOverlay,
  onDetectionsWorklet,
  onDetections,
  onError,
  permissionFallback,
  cameraUnavailableFallback,
  style,
}) => {
  const resolvedFacing: CameraFacing = cameraPosition;
  const effectiveFps = fps ?? processor?.targetFps;

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(resolvedFacing);

  const [viewDimensions, setViewDimensions] = useState<ViewDimensions>({ width: 0, height: 0 });
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [projectedDetections, setProjectedDetections] = useState<
    ProjectedDetectionItem[] | undefined
  >(undefined);

  const onErrorRef = React.useRef(onError);
  onErrorRef.current = onError;
  const onDetectionsRef = React.useRef(onDetections);
  onDetectionsRef.current = onDetections;
  const requestPermissionRef = React.useRef(requestPermission);
  requestPermissionRef.current = requestPermission;

  // Build worklet-safe overlay projection config so all 468-mesh math runs on the Camera Worklet Thread
  const workletOverlayConfig = React.useMemo<WorkletOverlayConfig>(() => {
    const meshCfg: FaceMeshStyleConfig | undefined = overlayTheme?.meshStyle;
    return {
      boxColor: boxColor ?? overlayTheme?.boxColor ?? '#3da441',
      unrecognizedBoxColor: overlayTheme?.unrecognizedBoxColor ?? '#f59e0b',
      cornerLength: overlayTheme?.cornerLength ?? 22,
      showConfidence: showConfidence ?? overlayTheme?.showConfidence ?? true,
      showLandmarks,
      showMeshLines: showMeshLines ?? meshCfg?.showMeshLines ?? true,
      showTesselation: showTesselation ?? meshCfg?.showTesselation ?? true,
      showDots: meshCfg?.showDots ?? true,
      lineScale: meshCfg?.lineThickness ?? 1.0,
      tesselationColor: meshCfg?.tesselationColor ?? 'rgba(56, 189, 248, 0.42)',
      faceOvalColor: meshCfg?.faceOvalColor ?? 'rgba(56, 189, 248, 0.75)',
      eyeContourColor: meshCfg?.eyeContourColor ?? '#22d3ee',
      eyebrowContourColor:
        meshCfg?.eyebrowContourColor ?? 'rgba(125, 211, 252, 0.85)',
      lipOuterContourColor: meshCfg?.lipOuterContourColor ?? '#34d399',
      lipInnerContourColor: meshCfg?.lipInnerContourColor ?? '#6ee7b7',
      noseContourColor: meshCfg?.noseContourColor ?? '#38bdf8',
      eyeDotColor: meshCfg?.eyeDotColor ?? '#22d3ee',
      denseMeshDotColor: meshCfg?.dotColor ?? '#e0f2fe',
      landmarkColor: landmarkColor ?? meshCfg?.dotColor ?? '#38bdf8',
      eyeDotRadius: meshCfg?.eyeDotRadius ?? 2.4,
      denseMeshDotRadius: meshCfg?.dotRadius ?? 1.8,
      keypointDotRadius: meshCfg?.dotRadius ?? 3.5,
    };
  }, [
    boxColor,
    landmarkColor,
    showConfidence,
    showLandmarks,
    showMeshLines,
    showTesselation,
    overlayTheme,
  ]);

  useEffect(() => {
    if (!isActive) {
      setDetections((prev) => (prev.length === 0 ? prev : []));
      setProjectedDetections(undefined);
    }
  }, [isActive]);

  // Request permissions on mount if not yet granted
  useEffect(() => {
    if (!hasPermission) {
      requestPermissionRef
        .current()
        .then((granted) => {
          if (!granted) {
            onErrorRef.current?.(
              new CameraError(
                'Camera permission was denied',
                'PERMISSION_DENIED'
              )
            );
          }
        })
        .catch((err: unknown) => {
          onErrorRef.current?.(
            new CameraError(
              err instanceof Error ? err.message : 'Permission request failed',
              'PERMISSION_DENIED',
              err
            )
          );
        });
    }
  }, [hasPermission]);

  // Emit error if camera device is unavailable for requested position
  useEffect(() => {
    if (hasPermission && !device) {
      onErrorRef.current?.(
        new CameraError(
          `Camera device unavailable for position "${resolvedFacing}"`,
          'CAMERA_UNAVAILABLE'
        )
      );
    }
  }, [hasPermission, device, resolvedFacing]);

  // Initialize and dispose pluggable processor lifecycle
  useEffect(() => {
    let isMounted = true;

    if (processor?.initialize) {
      Promise.resolve(processor.initialize()).catch((err: unknown) => {
        if (isMounted) {
          onErrorRef.current?.(
            new InferenceError(
              err instanceof Error ? err.message : 'Processor initialization failed',
              'PROCESSOR_INIT_FAILED',
              err
            )
          );
        }
      });
    }

    return () => {
      isMounted = false;
      processor?.dispose?.();
    };
  }, [processor]);

  const handleDetections = React.useCallback(
    (results: DetectionResult[], projected?: ProjectedDetectionItem[]) => {
      setDetections(results);
      setProjectedDetections(projected);
      onDetectionsRef.current?.(results);
    },
    []
  );

  const handleWorkletError = React.useCallback((error: unknown) => {
    const cameraAIError =
      error instanceof CameraAIError
        ? error
        : new InferenceError(
            error instanceof Error ? error.message : 'Frame processing error',
            'INFERENCE_FAILED',
            error
          );
    onErrorRef.current?.(cameraAIError);
  }, []);

  // Resolve 3-tier worklet processor capability on JS thread so worklets never capture ES6 class `this`
  const workletProcessFn = React.useMemo<((frame: unknown) => DetectionResult[]) | undefined>(() => {
    if (!processor) {
      return undefined;
    }
    if (
      typeof processor.processFrameWorklet === 'function' &&
      isWorkletFunction(processor.processFrameWorklet)
    ) {
      return processor.processFrameWorklet;
    }
    if (isWorkletFunction(processor.processFrame)) {
      return processor.processFrame;
    }
    return undefined;
  }, [processor]);

  const wasThrottledSync = processor?.wasThrottledSync;
  const isJsBusy = React.useMemo(() => createBoolSync(false), []);

  const runNonWorkletProcessorOnJS = React.useCallback(
    (frame: Frame) => {
      try {
        if (!processor) {
          return;
        }
        const streamDims: StreamDimensions =
          frame.orientation === 'left' || frame.orientation === 'right'
            ? { width: frame.height, height: frame.width }
            : { width: frame.width, height: frame.height };
        const mirrored = Boolean(frame.isMirrored);
        const results = processor.processFrame(frame);
        if (wasThrottledSync?.getBlocking() === true) {
          return;
        }
        const projected =
          viewDimensions.width > 0 && viewDimensions.height > 0
            ? projectDetectionsWorklet(
                results,
                {
                  viewDimensions,
                  streamDimensions: streamDims,
                  resizeMode,
                  isMirrored: resolvedFacing === 'front' && !mirrored,
                  orientation: 'portrait',
                },
                workletOverlayConfig
              )
            : undefined;
        handleDetections(results, projected);
      } catch (err) {
        handleWorkletError(err);
      } finally {
        isJsBusy.setBlocking(false);
        if (typeof frame?.dispose === 'function') {
          frame.dispose();
        }
      }
    },
    [
      processor,
      wasThrottledSync,
      viewDimensions,
      resizeMode,
      resolvedFacing,
      workletOverlayConfig,
      isJsBusy,
      handleDetections,
      handleWorkletError,
    ]
  );

  // Vision Camera v5 frame output worklet
  const onFrame = React.useCallback(
    (frame: Frame) => {
      'worklet';
      if (!isActive) {
        if (typeof frame?.dispose === 'function') {
          frame.dispose();
        }
        return;
      }

      if (workletProcessFn) {
        try {
          const streamDims: StreamDimensions =
            frame.orientation === 'left' || frame.orientation === 'right'
              ? { width: frame.height, height: frame.width }
              : { width: frame.width, height: frame.height };
          const mirrored = Boolean(frame.isMirrored);
          const results = workletProcessFn(frame);
          if (wasThrottledSync && wasThrottledSync.getBlocking()) {
            return;
          }

          if (onDetectionsWorklet) {
            onDetectionsWorklet(results);
          }

          // Pre-compute all 468-Point Face Mesh contour/tesselation geometry & pixel boxes
          // directly on the Background Camera Worklet Thread (0 JS coordinate math!)
          const projected =
            viewDimensions.width > 0 && viewDimensions.height > 0
              ? projectDetectionsWorklet(
                  results,
                  {
                    viewDimensions,
                    streamDimensions: streamDims,
                    resizeMode,
                    isMirrored: resolvedFacing === 'front' && !mirrored,
                    orientation: 'portrait',
                  },
                  workletOverlayConfig
                )
              : undefined;

          scheduleOnRN(handleDetections, results, projected);
        } catch (err) {
          scheduleOnRN(handleWorkletError, err);
        } finally {
          if (typeof frame?.dispose === 'function') {
            frame.dispose();
          }
        }
        return;
      }

      if (isJsBusy.getBlocking()) {
        if (typeof frame?.dispose === 'function') {
          frame.dispose();
        }
        return;
      }

      isJsBusy.setBlocking(true);
      scheduleOnRN(runNonWorkletProcessorOnJS, frame);
    },
    [
      isActive,
      workletProcessFn,
      wasThrottledSync,
      onDetectionsWorklet,
      viewDimensions,
      resizeMode,
      resolvedFacing,
      workletOverlayConfig,
      isJsBusy,
      handleDetections,
      handleWorkletError,
      runNonWorkletProcessorOnJS,
    ]
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',
    dropFramesWhileBusy: true,
    enablePhysicalBufferRotation: true,
    enablePreviewSizedOutputBuffers: true,
    onFrame: processor ? onFrame : undefined,
  });

  const cameraOutputs = React.useMemo(
    () => (processor ? [frameOutput] : []),
    [processor, frameOutput]
  );

  const cameraConstraints = React.useMemo<Constraint[] | undefined>(
    () => (effectiveFps !== undefined ? [{ fps: effectiveFps }] : undefined),
    [effectiveFps]
  );

  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewDimensions({ width, height });
  }, []);

  const handleCameraError = React.useCallback((err: unknown) => {
    onErrorRef.current?.(
      new CameraError(
        err instanceof Error ? err.message : 'Camera hardware error',
        'CAMERA_HARDWARE_ERROR',
        err
      )
    );
  }, []);

  const handleRequestPermission = React.useCallback(() => {
    requestPermissionRef
      .current()
      .then((granted) => {
        if (!granted) {
          onErrorRef.current?.(
            new CameraError(
              'Camera permission was denied',
              'PERMISSION_DENIED'
            )
          );
        }
      })
      .catch((err: unknown) => {
        onErrorRef.current?.(
          new CameraError(
            err instanceof Error ? err.message : 'Permission request failed',
            'PERMISSION_DENIED',
            err
          )
        );
      });
  }, []);

  // Render permission denied fallback view
  if (!hasPermission) {
    if (permissionFallback) {
      return <View style={[styles.container, style]}>{permissionFallback}</View>;
    }
    return (
      <PermissionFallbackView
        onRequestPermission={handleRequestPermission}
        style={style}
      />
    );
  }

  // Render device unavailable fallback view
  if (!device) {
    if (cameraUnavailableFallback) {
      return <View style={[styles.container, style]}>{cameraUnavailableFallback}</View>;
    }
    return (
      <View style={[styles.container, styles.unavailableContainer, style]}>
        <View style={styles.unavailableCard}>
          <Text style={styles.unavailableTitle}>Camera Unavailable</Text>
          <Text style={styles.unavailableMessage}>
            No camera device found for position &quot;{resolvedFacing}&quot;.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <Camera
        device={device}
        isActive={isActive}
        resizeMode={resizeMode}
        outputs={cameraOutputs}
        constraints={cameraConstraints}
        onError={handleCameraError}
        style={StyleSheet.absoluteFill}
      />

      {viewDimensions.width > 0 && viewDimensions.height > 0 && (
        <>
          {renderOverlay ? (
            renderOverlay(detections, viewDimensions)
          ) : (
            <DetectionOverlay
              detections={detections}
              projectedDetections={projectedDetections}
              viewDimensions={viewDimensions}
              resizeMode={resizeMode}
              isMirrored={resolvedFacing === 'front'}
              showBoxes={showBoxes}
              boxVariant={boxVariant}
              boxColor={boxColor}
              landmarkColor={landmarkColor}
              showLabels={showLabels}
              showConfidence={showConfidence}
              showLandmarks={showLandmarks}
              showMeshLines={showMeshLines}
              showTesselation={showTesselation}
              overlayTheme={overlayTheme}
              formatLabel={formatLabel}
              renderBox={renderBox}
              renderLabel={renderLabel}
              renderLandmarkDot={renderLandmarkDot}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  unavailableContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  unavailableCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  unavailableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
  },
  unavailableMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
