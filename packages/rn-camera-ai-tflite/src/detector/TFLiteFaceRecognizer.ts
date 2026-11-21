import {
  type DetectionResult,
  type FaceLandmark,
  type ModelStatus,
  type WorkletBoolSync,
  InferenceError,
} from '@masumdev/rn-camera-ai';
import {
  cosineSimilarity,
  cropAndResizeFaceToFloat32Buffer,
  cropAndResizeFaceToNormalized01Float32Buffer,
  decodeBlazeFaceOutputs,
  decodeFaceMeshOutputs,
  expandFaceRoiBox,
  extractFaceDescriptorFromRgbAndLandmarks,
  generateBlazeFaceAnchors,
  generateBlazeFaceFullRangeAnchors,
  l2NormalizeEmbedding,
} from '../parser/blazeFaceParser';
import type {
  BlazeFaceAnchor,
  EnrolledFaceProfile,
  TFLiteFaceRecognizer,
  TFLiteFaceRecognizerConfig,
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
    // Not installed
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
    // Not loaded
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
    // Fallback for test environments
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
  const count = Math.min(expectedPixels, Math.floor(src.byteLength / 4));

  if (pixelFormat === 'BGRA' || pixelFormat === 'BGRX') {
    for (let i = 0; i < count; i++) {
      const s = i * 4;
      const d = i * 3;
      out[d] = src[s + 2];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s];
    }
  } else {
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

function convertRgbUint8ToNormalizedFloat32Buffer(rgbBuffer: ArrayBuffer): ArrayBuffer {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const floats = new Float32Array(bytes.byteLength);
  for (let i = 0; i < bytes.byteLength; i++) {
    floats[i] = (bytes[i] - 127.5) / 127.5;
  }
  return floats.buffer;
}

interface WorkletFaceRecognizerParams {
  disposedSync: SyncRef<boolean>;
  readySync: SyncRef<boolean>;
  modelSync: SyncRef<TensorflowModel | null>;
  embeddingModelSync: SyncRef<TensorflowModel | null>;
  faceMeshModelSync: SyncRef<TensorflowModel | null>;
  confidenceSync: SyncRef<number>;
  similaritySync: SyncRef<number>;
  iouSync: SyncRef<number>;
  maxResultsSync: SyncRef<number>;
  lastFrameTimeSync: SyncRef<number>;
  wasThrottledSync: SyncRef<boolean>;
  enrolledFacesSync: SyncRef<EnrolledFaceProfile[]>;
  lastEmbeddingSync: SyncRef<number[] | null>;
  lastLandmarksSync: SyncRef<FaceLandmark[] | null>;
  minFrameIntervalMs: number;
  inputWidth: number;
  inputHeight: number;
  anchors: BlazeFaceAnchor[];
  frameConverter: FrameConverterLike | null;
  fallbackResizePlugin: ResizerModule | null;
}

function extractEmbeddingFromOutputs(rawEmbeddingOutputs: unknown[]): number[] {
  'worklet';
  if (!rawEmbeddingOutputs || !Array.isArray(rawEmbeddingOutputs) || rawEmbeddingOutputs.length === 0) {
    return [];
  }
  const first = rawEmbeddingOutputs[0];
  if (first instanceof Float32Array) {
    return l2NormalizeEmbedding(first);
  }
  if (first instanceof ArrayBuffer) {
    const usable = first.byteLength - (first.byteLength % 4);
    return usable > 0 ? l2NormalizeEmbedding(new Float32Array(first, 0, usable / 4)) : [];
  }
  if (ArrayBuffer.isView(first)) {
    const view = first as ArrayBufferView;
    const usable = view.byteLength - (view.byteLength % 4);
    return usable > 0
      ? l2NormalizeEmbedding(new Float32Array(view.buffer, view.byteOffset, usable / 4))
      : [];
  }
  if (Array.isArray(first)) {
    return l2NormalizeEmbedding(first as number[]);
  }
  return [];
}

function createTFLiteWorkletProcessFaceFrame(
  params: WorkletFaceRecognizerParams
): (frame: unknown) => DetectionResult[] {
  const {
    disposedSync,
    readySync,
    modelSync,
    embeddingModelSync,
    faceMeshModelSync,
    confidenceSync,
    similaritySync,
    iouSync,
    maxResultsSync,
    lastFrameTimeSync,
    wasThrottledSync,
    enrolledFacesSync,
    lastEmbeddingSync,
    lastLandmarksSync,
    minFrameIntervalMs,
    inputWidth,
    inputHeight,
    anchors,
    frameConverter,
    fallbackResizePlugin,
  } = params;

  return (frame: unknown): DetectionResult[] => {
    'worklet';
    if (disposedSync.getBlocking()) {
      throw new Error('Cannot process frame: face recognizer is disposed');
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

    let rgbBuffer: ArrayBuffer | null = null;
    let needs180Correction = false;
    let sourceAspectRatio = 1.0;
    const frameRecord =
      typeof frame === 'object' && frame !== null
        ? (frame as {
            isValid?: boolean;
            width?: number;
            height?: number;
            orientation?: string;
            getPixelBuffer?: unknown;
            buffer?: unknown;
            toArrayBuffer?: () => ArrayBuffer;
          })
        : null;

    if (
      frameRecord &&
      typeof frameRecord.width === 'number' &&
      typeof frameRecord.height === 'number' &&
      frameRecord.width > 0 &&
      frameRecord.height > 0
    ) {
      const longSide = Math.max(frameRecord.width, frameRecord.height);
      const shortSide = Math.min(frameRecord.width, frameRecord.height);
      sourceAspectRatio = longSide / shortSide;
    }

    const isVc5Frame =
      frameRecord !== null && typeof frameRecord.getPixelBuffer === 'function';

    if (!isVc5Frame && fallbackResizePlugin && frame) {
      try {
        const resized = fallbackResizePlugin.resize(frame, {
          scale: { width: inputWidth, height: inputHeight },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });
        if (resized?.buffer instanceof ArrayBuffer) {
          rgbBuffer = resized.buffer;
        } else if (resized?.buffer && ArrayBuffer.isView(resized.buffer)) {
          rgbBuffer = toArrayBuffer(resized.buffer as unknown as ArrayBufferView);
        } else if (typeof resized?.toArrayBuffer === 'function') {
          rgbBuffer = resized.toArrayBuffer();
        }
      } catch {
        // Fallback below
      }
    }

    if (!rgbBuffer && isVc5Frame && frameConverter) {
      if (frameRecord?.isValid === false) {
        return [];
      }
      if (frameRecord?.orientation === 'left' || frameRecord?.orientation === 'right') {
        needs180Correction = true;
      }
      let sourceImage: NitroImageLike | null = null;
      let resizedImage: NitroImageLike | null = null;
      try {
        sourceImage = frameConverter.convertFrameToImage(frame);
        if (sourceImage.width > 0 && sourceImage.height > 0) {
          const longSide = Math.max(sourceImage.width, sourceImage.height);
          const shortSide = Math.min(sourceImage.width, sourceImage.height);
          sourceAspectRatio = longSide / shortSide;
        }
        resizedImage =
          sourceImage.width !== inputWidth || sourceImage.height !== inputHeight
            ? sourceImage.resize(inputWidth, inputHeight)
            : sourceImage;
        const rawPixelData = resizedImage.toRawPixelData(false);
        rgbBuffer = convertRawPixelDataToRgb(
          rawPixelData.buffer,
          rawPixelData.pixelFormat,
          rawPixelData.width > 0 ? rawPixelData.width : inputWidth,
          rawPixelData.height > 0 ? rawPixelData.height : inputHeight
        );
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

    if (!rgbBuffer && frame) {
      if (frame instanceof ArrayBuffer) {
        rgbBuffer = frame;
      } else if (ArrayBuffer.isView(frame)) {
        rgbBuffer = toArrayBuffer(frame);
      } else if (frameRecord) {
        if (frameRecord.buffer instanceof ArrayBuffer) {
          rgbBuffer = frameRecord.buffer;
        } else if (frameRecord.buffer && ArrayBuffer.isView(frameRecord.buffer)) {
          rgbBuffer = toArrayBuffer(frameRecord.buffer);
        } else if (typeof frameRecord.toArrayBuffer === 'function') {
          rgbBuffer = frameRecord.toArrayBuffer();
        }
      }
    }

    if (!rgbBuffer) {
      rgbBuffer = new ArrayBuffer(inputWidth * inputHeight * 3);
    }

    // MediaPipe BlazeFace takes Float32 [-1, 1] input; fall back to raw buffer if model is quantized
    let rawOutputs: unknown[];
    const expectedUint8Bytes = inputWidth * inputHeight * 3;
    if (rgbBuffer.byteLength === expectedUint8Bytes) {
      const floatBuffer = convertRgbUint8ToNormalizedFloat32Buffer(rgbBuffer);
      try {
        rawOutputs = activeModel.runSync([floatBuffer]);
      } catch {
        rawOutputs = activeModel.runSync([rgbBuffer]);
      }
    } else {
      rawOutputs = activeModel.runSync([rgbBuffer]);
    }

    if (!rawOutputs || !Array.isArray(rawOutputs) || rawOutputs.length < 2) {
      return [];
    }

    const faces = decodeBlazeFaceOutputs(rawOutputs, anchors, {
      confidenceThreshold: confidenceSync.getBlocking(),
      iouThreshold: iouSync.getBlocking(),
      maxResults: maxResultsSync.getBlocking(),
      inputWidth,
      inputHeight,
      frameAspectRatio: sourceAspectRatio,
    });

    if (faces.length === 0) {
      return [];
    }

    const activeFaceMeshModel = faceMeshModelSync.getBlocking();
    if (activeFaceMeshModel) {
      for (let i = 0; i < faces.length; i++) {
        try {
          const roiBox = expandFaceRoiBox(faces[i].boundingBox, 1.28);
          const meshInputBuffer = cropAndResizeFaceToNormalized01Float32Buffer(
            rgbBuffer,
            inputWidth,
            inputHeight,
            roiBox,
            192,
            192
          );
          const rawMeshOutputs = activeFaceMeshModel.runSync([meshInputBuffer]);
          const meshDecoded = decodeFaceMeshOutputs(rawMeshOutputs, roiBox, 192);
          if (meshDecoded && meshDecoded.landmarks.length === 468) {
            faces[i] = {
              ...faces[i],
              boundingBox: meshDecoded.tightBox,
              landmarks: meshDecoded.landmarks,
            };
          }
        } catch {
          // Keep 6-point BlazeFace landmarks if mesh inference fails
        }
      }
    }

    if (needs180Correction) {
      for (let i = 0; i < faces.length; i++) {
        const box = faces[i].boundingBox;
        const correctedLandmarks = faces[i].landmarks?.map((lm) => ({
          ...lm,
          x: Math.max(0, Math.min(1, 1 - lm.x)),
          y: Math.max(0, Math.min(1, 1 - lm.y)),
        }));
        faces[i] = {
          ...faces[i],
          boundingBox: {
            x: Math.max(0, Math.min(1, 1 - box.x - box.width)),
            y: Math.max(0, Math.min(1, 1 - box.y - box.height)),
            width: box.width,
            height: box.height,
          },
          landmarks: correctedLandmarks,
        };
      }
    }

    const enrolledProfiles = enrolledFacesSync.getBlocking();
    const similarityThreshold = similaritySync.getBlocking();
    const activeEmbeddingModel = embeddingModelSync.getBlocking();

    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      let descriptor: number[] = [];

      if (activeEmbeddingModel) {
        try {
          const faceCropFloatBuffer = cropAndResizeFaceToFloat32Buffer(
            rgbBuffer,
            inputWidth,
            inputHeight,
            face.boundingBox,
            112,
            112
          );
          const embOutputs = activeEmbeddingModel.runSync([faceCropFloatBuffer]);
          descriptor = extractEmbeddingFromOutputs(embOutputs);
        } catch {
          descriptor = [];
        }
      }

      if (descriptor.length === 0) {
        descriptor = extractFaceDescriptorFromRgbAndLandmarks(
          rgbBuffer,
          inputWidth,
          inputHeight,
          face.boundingBox,
          face.landmarks
        );
      }

      // Cache primary (highest-confidence) face embedding for 1-tap enrollment
      if (i === 0 && descriptor.length > 0) {
        lastEmbeddingSync.setBlocking(descriptor);
        lastLandmarksSync.setBlocking(face.landmarks ?? null);
      }

      if (enrolledProfiles.length > 0 && descriptor.length > 0) {
        let bestProfile: EnrolledFaceProfile | null = null;
        let bestSimilarity = -1;

        for (let p = 0; p < enrolledProfiles.length; p++) {
          const sim = cosineSimilarity(descriptor, enrolledProfiles[p].embedding);
          if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestProfile = enrolledProfiles[p];
          }
        }

        if (bestProfile && bestSimilarity >= similarityThreshold) {
          faces[i] = {
            ...face,
            label: bestProfile.name,
            confidence: bestSimilarity,
            identity: {
              id: bestProfile.id,
              name: bestProfile.name,
              similarity: bestSimilarity,
              isRecognized: true,
            },
          };
        } else {
          faces[i] = {
            ...face,
            label: 'Unknown Face',
            identity: {
              id: 'unknown',
              name: 'Unknown Face',
              similarity: Math.max(0, bestSimilarity),
              isRecognized: false,
            },
          };
        }
      }
    }

    return faces;
  };
}

/**
 * Concrete implementation of the TFLite Face Detection & Recognition CameraProcessor.
 */
export class TFLiteFaceRecognizerImpl implements TFLiteFaceRecognizer {
  public readonly id: string;
  public readonly name = 'TFLiteFaceRecognizer';
  public readonly processFrameWorklet: (frame: unknown) => DetectionResult[];
  public readonly wasThrottledSync: WorkletBoolSync;
  private _status: ModelStatus;
  private _activeDelegate: 'gpu' | 'cpu';
  private _confidenceThreshold: number;
  private _similarityThreshold: number;
  private _iouThreshold: number;
  private _maxResults: number;
  private _config: TFLiteFaceRecognizerConfig;
  private _disposedSync: SyncRef<boolean>;
  private _readySync: SyncRef<boolean>;
  private _modelSync: SyncRef<TensorflowModel | null>;
  private _embeddingModelSync: SyncRef<TensorflowModel | null>;
  private _faceMeshModelSync: SyncRef<TensorflowModel | null>;
  private _confidenceSync: SyncRef<number>;
  private _similaritySync: SyncRef<number>;
  private _iouSync: SyncRef<number>;
  private _maxResultsSync: SyncRef<number>;
  private _lastFrameTimeSync: SyncRef<number>;
  private _enrolledFacesSync: SyncRef<EnrolledFaceProfile[]>;
  private _lastEmbeddingSync: SyncRef<number[] | null>;
  private _lastLandmarksSync: SyncRef<FaceLandmark[] | null>;

  constructor(
    config: TFLiteFaceRecognizerConfig,
    model: TensorflowModel,
    activeDelegate: 'gpu' | 'cpu',
    embeddingModel: TensorflowModel | null = null,
    faceMeshModel: TensorflowModel | null = null
  ) {
    this.id = `tflite-face-recognizer-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this._config = config;
    this._activeDelegate = activeDelegate;
    this._status = 'ready';

    this._confidenceThreshold =
      typeof config.confidenceThreshold === 'number' &&
      Number.isFinite(config.confidenceThreshold)
        ? Math.max(0.05, Math.min(0.99, config.confidenceThreshold))
        : 0.55;

    this._similarityThreshold =
      typeof config.similarityThreshold === 'number' &&
      Number.isFinite(config.similarityThreshold)
        ? Math.max(0.1, Math.min(0.99, config.similarityThreshold))
        : 0.75;

    this._iouThreshold =
      typeof config.iouThreshold === 'number' && Number.isFinite(config.iouThreshold)
        ? Math.max(0.05, Math.min(0.95, config.iouThreshold))
        : 0.3;

    this._maxResults =
      typeof config.maxResults === 'number' &&
      Number.isFinite(config.maxResults) &&
      config.maxResults >= 0
        ? Math.floor(config.maxResults)
        : 5;

    const fps = config.targetFps ?? 24;
    const minFrameIntervalMs = fps > 0 ? 1000 / fps : 0;
    const initialFaces = Array.isArray(config.initialFaces)
      ? config.initialFaces.slice()
      : [];

    this._disposedSync = createSafeSynchronizable(false, true);
    this._readySync = createSafeSynchronizable(true, true);
    this._modelSync = createSafeSynchronizable<TensorflowModel | null>(model, false);
    this._embeddingModelSync = createSafeSynchronizable<TensorflowModel | null>(
      embeddingModel,
      false
    );
    this._faceMeshModelSync = createSafeSynchronizable<TensorflowModel | null>(
      faceMeshModel,
      false
    );
    this._confidenceSync = createSafeSynchronizable(this._confidenceThreshold, true);
    this._similaritySync = createSafeSynchronizable(this._similarityThreshold, true);
    this._iouSync = createSafeSynchronizable(this._iouThreshold, true);
    this._maxResultsSync = createSafeSynchronizable(this._maxResults, true);
    this._lastFrameTimeSync = createSafeSynchronizable(0, true);
    this.wasThrottledSync = createSafeSynchronizable(false, true);
    this._enrolledFacesSync = createSafeSynchronizable<EnrolledFaceProfile[]>(
      initialFaces,
      false
    );
    this._lastEmbeddingSync = createSafeSynchronizable<number[] | null>(null, false);
    this._lastLandmarksSync = createSafeSynchronizable<FaceLandmark[] | null>(
      null,
      false
    );

    const resolvedInputW = config.inputWidth ?? 192;
    const resolvedInputH = config.inputHeight ?? 192;
    const anchors =
      resolvedInputW === 192
        ? generateBlazeFaceFullRangeAnchors()
        : generateBlazeFaceAnchors();

    this.processFrameWorklet = createTFLiteWorkletProcessFaceFrame({
      disposedSync: this._disposedSync,
      readySync: this._readySync,
      modelSync: this._modelSync,
      embeddingModelSync: this._embeddingModelSync,
      faceMeshModelSync: this._faceMeshModelSync,
      confidenceSync: this._confidenceSync,
      similaritySync: this._similaritySync,
      iouSync: this._iouSync,
      maxResultsSync: this._maxResultsSync,
      lastFrameTimeSync: this._lastFrameTimeSync,
      wasThrottledSync: this.wasThrottledSync,
      enrolledFacesSync: this._enrolledFacesSync,
      lastEmbeddingSync: this._lastEmbeddingSync,
      lastLandmarksSync: this._lastLandmarksSync,
      minFrameIntervalMs,
      inputWidth: resolvedInputW,
      inputHeight: resolvedInputH,
      anchors,
      frameConverter: tryGetFrameConverter(),
      fallbackResizePlugin: tryGetResizePlugin(),
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

  get similarityThreshold(): number {
    return this._similarityThreshold;
  }

  get targetFps(): number | undefined {
    return this._config.targetFps ?? 24;
  }

  setConfidenceThreshold(threshold: number): void {
    if (Number.isFinite(threshold)) {
      this._confidenceThreshold = Math.max(0.05, Math.min(0.99, threshold));
      this._confidenceSync.setBlocking(this._confidenceThreshold);
    }
  }

  setSimilarityThreshold(threshold: number): void {
    if (Number.isFinite(threshold)) {
      this._similarityThreshold = Math.max(0.1, Math.min(0.99, threshold));
      this._similaritySync.setBlocking(this._similarityThreshold);
    }
  }

  hasRecentFaceEmbedding(): boolean {
    const emb = this._lastEmbeddingSync.getBlocking();
    return Array.isArray(emb) && emb.length > 0;
  }

  getLastDetectedLandmarks(): FaceLandmark[] | null {
    return this._lastLandmarksSync.getBlocking();
  }

  enrollFace(
    name: string,
    embedding: Float32Array | number[]
  ): EnrolledFaceProfile {
    const trimmedName = name.trim() || 'Person';
    const normalized = l2NormalizeEmbedding(embedding);
    const profile: EnrolledFaceProfile = {
      id: `face-profile-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: trimmedName,
      embedding: normalized,
      createdAt: Date.now(),
    };
    const existing = this._enrolledFacesSync.getBlocking();
    const updated = [...existing, profile];
    this._enrolledFacesSync.setBlocking(updated);
    return profile;
  }

  enrollLastDetectedFace(name: string): EnrolledFaceProfile | null {
    const latestEmbedding = this._lastEmbeddingSync.getBlocking();
    if (!latestEmbedding || latestEmbedding.length === 0) {
      return null;
    }
    return this.enrollFace(name, latestEmbedding);
  }

  removeEnrolledFace(id: string): boolean {
    const existing = this._enrolledFacesSync.getBlocking();
    const filtered = existing.filter((item) => item.id !== id);
    if (filtered.length === existing.length) {
      return false;
    }
    this._enrolledFacesSync.setBlocking(filtered);
    return true;
  }

  clearEnrolledFaces(): void {
    this._enrolledFacesSync.setBlocking([]);
  }

  getEnrolledFaces(): EnrolledFaceProfile[] {
    return this._enrolledFacesSync.getBlocking().slice();
  }

  processFrame(frame: unknown): DetectionResult[] {
    try {
      return this.processFrameWorklet(frame);
    } catch (err: unknown) {
      throw new InferenceError(
        err instanceof Error ? err.message : 'Face inference execution failed',
        'INFERENCE_ERROR',
        err
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
 * Creates and initializes a MediaPipe BlazeFace + Identity Recognition processor.
 */
export async function createTFLiteFaceRecognizer(
  config: TFLiteFaceRecognizerConfig
): Promise<TFLiteFaceRecognizer> {
  const loaded = await loadModelWithFallback(config?.model, {
    useGpu: config?.useGpu,
    platform: config?.platform,
    onDelegateFallback: config?.onDelegateFallback,
    loadModel: config?.loadModel,
  });

  let loadedEmbeddingModel: TensorflowModel | null = null;
  if (config?.embeddingModel !== undefined && config?.embeddingModel !== null) {
    try {
      const embLoaded = await loadModelWithFallback(config.embeddingModel, {
        useGpu: config?.useGpu,
        platform: config?.platform,
        loadModel: config?.loadModel,
      });
      loadedEmbeddingModel = embLoaded.model;
    } catch {
      loadedEmbeddingModel = null;
    }
  }

  let loadedFaceMeshModel: TensorflowModel | null = null;
  if (config?.faceMeshModel !== undefined && config?.faceMeshModel !== null) {
    try {
      const meshLoaded = await loadModelWithFallback(config.faceMeshModel, {
        useGpu: config?.useGpu,
        platform: config?.platform,
        loadModel: config?.loadModel,
      });
      loadedFaceMeshModel = meshLoaded.model;
    } catch {
      loadedFaceMeshModel = null;
    }
  }

  return new TFLiteFaceRecognizerImpl(
    config,
    loaded.model,
    loaded.activeDelegate,
    loadedEmbeddingModel,
    loadedFaceMeshModel
  );
}
