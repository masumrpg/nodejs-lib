import {
  type DetectionResult,
  type ModelStatus,
  type WorkletBoolSync,
  InferenceError,
} from '@masumdev/rn-camera-ai';
import { parseDetectionOutputs } from '../parser/outputParser';
import type {
  TFLiteObjectDetector,
  TFLiteObjectDetectorConfig,
  TFLiteOutputs,
  TensorflowModel,
} from '../types/tflite';
import { loadModelWithFallback } from './modelLoader';

interface ResizerModule {
  resize: (
    frame: unknown,
    options: unknown
  ) => { buffer?: ArrayBuffer; toArrayBuffer?: () => ArrayBuffer };
}

interface NitroImageLike {
  readonly width: number;
  readonly height: number;
  resize(width: number, height: number): NitroImageLike;
  toRawPixelData(allowGpu?: boolean): {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    pixelFormat: string;
  };
  dispose?: () => void;
}

interface FrameConverterLike {
  convertFrameToImage(frame: unknown): NitroImageLike;
}

interface SyncRef<T> {
  getBlocking(): T;
  setBlocking(value: T): void;
}

let cachedResizer: ResizerModule | null | undefined = undefined;
let cachedFrameConverter: FrameConverterLike | null | undefined = undefined;

function tryGetResizePlugin(): ResizerModule | null {
  const current = cachedResizer;
  if (current !== undefined) {
    return current;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const plugin = require('vision-camera-resize-plugin') as ResizerModule;
    if (typeof plugin?.resize === 'function') {
      cachedResizer = plugin;
      return plugin;
    }
  } catch {
    // vision-camera-resize-plugin not loaded in runtime
  }
  cachedResizer = null;
  return null;
}

function tryGetFrameConverter(): FrameConverterLike | null {
  const current = cachedFrameConverter;
  if (current !== undefined) {
    return current;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const visionCamera = require('react-native-vision-camera') as {
      HybridFrameConverter?: FrameConverterLike;
    };
    if (typeof visionCamera?.HybridFrameConverter?.convertFrameToImage === 'function') {
      cachedFrameConverter = visionCamera.HybridFrameConverter;
      return cachedFrameConverter;
    }
  } catch {
    // react-native-vision-camera HybridFrameConverter not loaded in runtime
  }
  cachedFrameConverter = null;
  return null;
}

function createSafeSynchronizable<T>(initial: T, fixedType = false): SyncRef<T> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const worklets = require('react-native-worklets') as {
      createSynchronizable?: <V>(
        value: V,
        config?: { fixedType?: boolean }
      ) => SyncRef<V>;
    };
    if (typeof worklets?.createSynchronizable === 'function') {
      return fixedType
        ? worklets.createSynchronizable(initial, { fixedType: true })
        : worklets.createSynchronizable(initial);
    }
  } catch {
    // Fallback for non-native / Bun test environments
  }
  let value = initial;
  return {
    getBlocking: () => value,
    setBlocking: (nextValue: T) => {
      value = nextValue;
    },
  };
}

function toArrayBuffer(view: ArrayBufferView): ArrayBuffer {
  'worklet';
  const underlying = view.buffer as ArrayBuffer;
  if (view.byteOffset === 0 && view.byteLength === underlying.byteLength) {
    return underlying;
  }
  return underlying.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

function convertRawPixelDataToRgb(
  buffer: ArrayBuffer,
  pixelFormat: string,
  width: number,
  height: number
): ArrayBuffer {
  'worklet';
  const src = new Uint8Array(buffer);
  const expectedPixels = Math.max(0, Math.floor(width) * Math.floor(height));

  if (pixelFormat === 'RGB') {
    const expectedBytes = expectedPixels * 3;
    if (src.byteLength === expectedBytes) {
      return buffer;
    }
    const copyLen = Math.min(src.byteLength, expectedBytes);
    const out = new Uint8Array(expectedBytes);
    out.set(src.subarray(0, copyLen));
    return out.buffer;
  }

  const out = new Uint8Array(expectedPixels * 3);

  if (pixelFormat === 'BGR') {
    const count = Math.min(expectedPixels, Math.floor(src.byteLength / 3));
    for (let i = 0; i < count; i++) {
      const s = i * 3;
      const d = i * 3;
      out[d] = src[s + 2];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s];
    }
    return out.buffer;
  }

  const count = Math.min(expectedPixels, Math.floor(src.byteLength / 4));
  if (pixelFormat === 'BGRA' || pixelFormat === 'BGRX') {
    for (let i = 0; i < count; i++) {
      const s = i * 4;
      const d = i * 3;
      out[d] = src[s + 2];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s];
    }
  } else if (pixelFormat === 'ARGB' || pixelFormat === 'XRGB') {
    for (let i = 0; i < count; i++) {
      const s = i * 4;
      const d = i * 3;
      out[d] = src[s + 1];
      out[d + 1] = src[s + 2];
      out[d + 2] = src[s + 3];
    }
  } else if (pixelFormat === 'ABGR' || pixelFormat === 'XBGR') {
    for (let i = 0; i < count; i++) {
      const s = i * 4;
      const d = i * 3;
      out[d] = src[s + 3];
      out[d + 1] = src[s + 2];
      out[d + 2] = src[s + 1];
    }
  } else {
    // 'RGBA', 'RGBX', and default 4-channel layout
    for (let i = 0; i < count; i++) {
      const s = i * 4;
      const d = i * 3;
      out[d] = src[s];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s + 2];
    }
  }

  return out.buffer;
}

interface WorkletDetectorParams {
  disposedSync: SyncRef<boolean>;
  readySync: SyncRef<boolean>;
  modelSync: SyncRef<TensorflowModel | null>;
  confidenceSync: SyncRef<number>;
  maxResultsSync: SyncRef<number>;
  lastFrameTimeSync: SyncRef<number>;
  wasThrottledSync: SyncRef<boolean>;
  minFrameIntervalMs: number;
  inputWidth: number;
  inputHeight: number;
  labels: string[] | Record<number, string> | undefined;
  labelOffset: number | undefined;
  frameConverter: FrameConverterLike | null;
  explicitResizePlugin: ResizerModule | null;
  fallbackResizePlugin: ResizerModule | null;
}

function createTFLiteWorkletProcessFrame(
  params: WorkletDetectorParams
): (frame: unknown) => DetectionResult[] {
  const {
    disposedSync,
    readySync,
    modelSync,
    confidenceSync,
    maxResultsSync,
    lastFrameTimeSync,
    wasThrottledSync,
    minFrameIntervalMs,
    inputWidth,
    inputHeight,
    labels,
    labelOffset,
    frameConverter,
    explicitResizePlugin,
    fallbackResizePlugin,
  } = params;

  return (frame: unknown): DetectionResult[] => {
    'worklet';
    if (disposedSync.getBlocking()) {
      throw new Error('Cannot process frame: detector is disposed');
    }

    const activeModel = modelSync.getBlocking();
    if (!readySync.getBlocking() || !activeModel) {
      wasThrottledSync.setBlocking(false);
      return [];
    }

    if (minFrameIntervalMs > 0) {
      const now = Date.now();
      const prevTime = lastFrameTimeSync.getBlocking();
      if (prevTime > 0 && now - prevTime < minFrameIntervalMs) {
        wasThrottledSync.setBlocking(true);
        return [];
      }
      lastFrameTimeSync.setBlocking(now);
    }
    wasThrottledSync.setBlocking(false);

    let inputs: ArrayBuffer[] = [];
    let needs180Correction = false;
    const frameRecord =
      typeof frame === 'object' && frame !== null
        ? (frame as {
            isValid?: boolean;
            orientation?: string;
            getPixelBuffer?: unknown;
            buffer?: unknown;
            toArrayBuffer?: () => ArrayBuffer;
          })
        : null;

    const isVc5Frame =
      frameRecord !== null && typeof frameRecord.getPixelBuffer === 'function';

    const resizer =
      explicitResizePlugin ?? (!isVc5Frame ? fallbackResizePlugin : null);

    if (resizer && frame) {
      try {
        const resized = resizer.resize(frame, {
          scale: {
            width: inputWidth,
            height: inputHeight,
          },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });
        if (resized?.buffer instanceof ArrayBuffer) {
          inputs = [resized.buffer];
        } else if (resized?.buffer && ArrayBuffer.isView(resized.buffer)) {
          inputs = [toArrayBuffer(resized.buffer as unknown as ArrayBufferView)];
        } else if (typeof resized?.toArrayBuffer === 'function') {
          inputs = [resized.toArrayBuffer()];
        }
      } catch {
        // Fallback to VC v5 or direct buffer parsing if resizer throws
      }
    }

    if (inputs.length === 0 && isVc5Frame && frameConverter) {
      if (frameRecord?.isValid === false) {
        return [];
      }
      // In VisionCamera v5 on Android, when enablePhysicalBufferRotation is not active
      // and frame.orientation is 'left' or 'right', HybridFrameConverter's ImageProxy.toBitmap
      // rotates 90 deg by 270 deg (180 deg inverted). Counter-correct normalized coordinates.
      if (frameRecord?.orientation === 'left' || frameRecord?.orientation === 'right') {
        needs180Correction = true;
      }
      let sourceImage: NitroImageLike | null = null;
      let resizedImage: NitroImageLike | null = null;
      try {
        sourceImage = frameConverter.convertFrameToImage(frame);
        resizedImage =
          sourceImage.width !== inputWidth || sourceImage.height !== inputHeight
            ? sourceImage.resize(inputWidth, inputHeight)
            : sourceImage;
        const rawPixelData = resizedImage.toRawPixelData(false);
        const rgbBuffer = convertRawPixelDataToRgb(
          rawPixelData.buffer,
          rawPixelData.pixelFormat,
          rawPixelData.width > 0 ? rawPixelData.width : inputWidth,
          rawPixelData.height > 0 ? rawPixelData.height : inputHeight
        );
        inputs = [rgbBuffer];
      } finally {
        if (
          resizedImage &&
          resizedImage !== sourceImage &&
          typeof resizedImage.dispose === 'function'
        ) {
          resizedImage.dispose();
        }
        if (sourceImage && typeof sourceImage.dispose === 'function') {
          sourceImage.dispose();
        }
      }
    }

    if (inputs.length === 0 && frame) {
      if (frame instanceof ArrayBuffer) {
        inputs = [frame];
      } else if (ArrayBuffer.isView(frame)) {
        inputs = [toArrayBuffer(frame)];
      } else if (frameRecord) {
        if (frameRecord.buffer instanceof ArrayBuffer) {
          inputs = [frameRecord.buffer];
        } else if (
          frameRecord.buffer &&
          ArrayBuffer.isView(frameRecord.buffer)
        ) {
          inputs = [toArrayBuffer(frameRecord.buffer)];
        } else if (typeof frameRecord.toArrayBuffer === 'function') {
          inputs = [frameRecord.toArrayBuffer()];
        }
      }
    }

    const rawOutputs = activeModel.runSync(inputs);
    if (!rawOutputs || !Array.isArray(rawOutputs) || rawOutputs.length < 3) {
      return [];
    }

    const parsed = parseDetectionOutputs(rawOutputs as TFLiteOutputs, {
      confidenceThreshold: confidenceSync.getBlocking(),
      maxResults: maxResultsSync.getBlocking(),
      labels,
      labelOffset,
    });

    if (needs180Correction && parsed.length > 0) {
      for (let i = 0; i < parsed.length; i++) {
        const box = parsed[i].boundingBox;
        parsed[i] = {
          ...parsed[i],
          boundingBox: {
            x: Math.max(0, Math.min(1, 1 - box.x - box.width)),
            y: Math.max(0, Math.min(1, 1 - box.y - box.height)),
            width: box.width,
            height: box.height,
          },
        };
      }
    }

    return parsed;
  };
}

/**
 * Concrete implementation of the TFLite Object Detection CameraProcessor.
 */
export class TFLiteDetectorImpl implements TFLiteObjectDetector {
  public readonly id: string;
  public readonly name = 'TFLiteObjectDetector';
  public readonly processFrameWorklet: (frame: unknown) => DetectionResult[];
  public readonly wasThrottledSync: WorkletBoolSync;
  private _status: ModelStatus;
  private _activeDelegate: 'gpu' | 'cpu';
  private _confidenceThreshold: number;
  private _maxResults: number;
  private _config: TFLiteObjectDetectorConfig;
  private _disposedSync: SyncRef<boolean>;
  private _readySync: SyncRef<boolean>;
  private _modelSync: SyncRef<TensorflowModel | null>;
  private _confidenceSync: SyncRef<number>;
  private _maxResultsSync: SyncRef<number>;
  private _lastFrameTimeSync: SyncRef<number>;

  constructor(
    config: TFLiteObjectDetectorConfig,
    model: TensorflowModel,
    activeDelegate: 'gpu' | 'cpu'
  ) {
    this.id = `tflite-detector-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this._config = config;
    this._activeDelegate = activeDelegate;
    this._status = 'ready';

    this._confidenceThreshold =
      typeof config.confidenceThreshold === 'number' &&
      Number.isFinite(config.confidenceThreshold)
        ? Math.max(0, Math.min(1, config.confidenceThreshold))
        : 0.5;

    this._maxResults =
      typeof config.maxResults === 'number' &&
      Number.isFinite(config.maxResults) &&
      config.maxResults >= 0
        ? Math.floor(config.maxResults)
        : 10;

    const fps = config.targetFps ?? 15;
    const minFrameIntervalMs = fps > 0 ? 1000 / fps : 0;

    this._disposedSync = createSafeSynchronizable(false, true);
    this._readySync = createSafeSynchronizable(true, true);
    this._modelSync = createSafeSynchronizable<TensorflowModel | null>(model, false);
    this._confidenceSync = createSafeSynchronizable(this._confidenceThreshold, true);
    this._maxResultsSync = createSafeSynchronizable(this._maxResults, true);
    this._lastFrameTimeSync = createSafeSynchronizable(0, true);
    this.wasThrottledSync = createSafeSynchronizable(false, true);

    this.processFrameWorklet = createTFLiteWorkletProcessFrame({
      disposedSync: this._disposedSync,
      readySync: this._readySync,
      modelSync: this._modelSync,
      confidenceSync: this._confidenceSync,
      maxResultsSync: this._maxResultsSync,
      lastFrameTimeSync: this._lastFrameTimeSync,
      wasThrottledSync: this.wasThrottledSync,
      minFrameIntervalMs,
      inputWidth: config.inputWidth ?? 300,
      inputHeight: config.inputHeight ?? 300,
      labels: config.labels,
      labelOffset: config.labelOffset,
      frameConverter: tryGetFrameConverter(),
      explicitResizePlugin: config.resizePlugin ?? null,
      fallbackResizePlugin: config.resizePlugin ? null : tryGetResizePlugin(),
    });
  }

  get status(): ModelStatus {
    return this._status;
  }

  get activeDelegate(): 'gpu' | 'cpu' {
    return this._activeDelegate;
  }

  get confidenceThreshold(): number {
    return this._confidenceThreshold;
  }

  get maxResults(): number {
    return this._maxResults;
  }

  get targetFps(): number | undefined {
    return this._config.targetFps ?? 15;
  }

  setConfidenceThreshold(newThreshold: number): void {
    if (Number.isFinite(newThreshold)) {
      this._confidenceThreshold = Math.max(0, Math.min(1, newThreshold));
      this._confidenceSync.setBlocking(this._confidenceThreshold);
    }
  }

  setMaxResults(newMaxResults: number): void {
    if (Number.isFinite(newMaxResults) && newMaxResults >= 0) {
      this._maxResults = Math.floor(newMaxResults);
      this._maxResultsSync.setBlocking(this._maxResults);
    }
  }

  processFrame(frame: unknown): DetectionResult[] {
    try {
      return this.processFrameWorklet(frame);
    } catch (inferenceErr: unknown) {
      throw new InferenceError(
        inferenceErr instanceof Error
          ? inferenceErr.message
          : 'TFLite inference execution failed',
        'INFERENCE_ERROR',
        inferenceErr
      );
    }
  }

  async initialize(): Promise<void> {
    if (this._disposedSync.getBlocking()) {
      const loaded = await loadModelWithFallback(this._config.model, {
        useGpu: this._config.useGpu,
        platform: this._config.platform,
        onDelegateFallback: this._config.onDelegateFallback,
        loadModel: this._config.loadModel,
      });
      this._modelSync.setBlocking(loaded.model);
      this._activeDelegate = loaded.activeDelegate;
      this._disposedSync.setBlocking(false);
    }
    this._status = 'ready';
    this._readySync.setBlocking(true);
    this._lastFrameTimeSync.setBlocking(0);
    this.wasThrottledSync.setBlocking(false);
  }

  dispose(): void {
    this._disposedSync.setBlocking(true);
    this._readySync.setBlocking(false);
    this._status = 'idle';
    this._lastFrameTimeSync.setBlocking(0);
    this.wasThrottledSync.setBlocking(false);
  }
}

/**
 * Creates and initializes a TensorFlow Lite object detector processor.
 *
 * @param config Detector configuration parameters
 * @returns Fully initialized TFLiteObjectDetector instance
 */
export async function createTFLiteObjectDetector(
  config: TFLiteObjectDetectorConfig
): Promise<TFLiteObjectDetector> {
  const loaded = await loadModelWithFallback(config?.model, {
    useGpu: config?.useGpu,
    platform: config?.platform,
    onDelegateFallback: config?.onDelegateFallback,
    loadModel: config?.loadModel,
  });

  return new TFLiteDetectorImpl(config, loaded.model, loaded.activeDelegate);
}
