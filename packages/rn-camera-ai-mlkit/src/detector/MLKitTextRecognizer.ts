import {
  type CameraPixelFormatPreference,
  type DetectionResult,
  type FrameOrientation,
  type ModelStatus,
  type OcrGranularity,
  type WorkletBoolSync,
  InferenceError,
  ModelLoadError,
} from '@masumdev/rn-camera-ai';
import {
  extractStructuredOcrData,
  parseMLKitTextResult,
} from '../parser/mlkitTextParser';
import type {
  MLKitNativeModuleLike,
  MLKitNativeRecognizerOptions,
  MLKitOcrDocumentResult,
  MLKitTextRecognitionResult,
  MLKitTextRecognizer,
  MLKitTextRecognizerConfig,
  MLKitTextRecognizerNative,
  OcrEntityFilter,
  RecognizeTextFromUriOptions,
  StructuredOcrEntities,
  TextRecognitionLanguage,
} from '../types/mlkit';

interface SyncRef<T> {
  getBlocking(): T;
  setBlocking(value: T): void;
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
    // Fallback for Bun / Node test environments
  }
  let value = initial;
  return {
    getBlocking: () => value,
    setBlocking: (nextValue: T) => {
      value = nextValue;
    },
  };
}

function loadNativeMLKitModule(): MLKitNativeModuleLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-vision-camera-mlkit') as MLKitNativeModuleLike;
  } catch {
    return null;
  }
}

function createNativeTextRecognizerInstance(
  mlkitModule: MLKitNativeModuleLike | null,
  options: MLKitNativeRecognizerOptions
): MLKitTextRecognizerNative {
  if (!mlkitModule) {
    throw new ModelLoadError(
      'Native module "react-native-vision-camera-mlkit" is not available. Ensure it is installed and native binaries are rebuilt.',
      'MODEL_LOAD_FAILED'
    );
  }

  const featureAvailable =
    mlkitModule.isFeatureAvailable?.('TextRecognition') ??
    mlkitModule.PluginFactory?.isFeatureAvailable?.('TextRecognition') ??
    mlkitModule.VisionCameraMLKit?.isFeatureAvailable?.('TextRecognition') ??
    true;

  if (!featureAvailable) {
    throw new ModelLoadError(
      'Google ML Kit TextRecognition feature is disabled in native build configuration. Enable textRecognition: true in react-native-vision-camera-mlkit plugin config.',
      'MODEL_LOAD_FAILED'
    );
  }

  const initialized =
    mlkitModule.PluginFactory?.initPlugin?.('TextRecognition', options) ??
    mlkitModule.VisionCameraMLKit?.createTextRecognizer?.(options);

  if (!initialized || typeof initialized.recognize !== 'function') {
    throw new ModelLoadError(
      'Failed to instantiate ML Kit TextRecognizer native HybridObject.',
      'MODEL_LOAD_FAILED'
    );
  }

  return initialized;
}

interface WorkletOcrParams {
  disposedSync: SyncRef<boolean>;
  readySync: SyncRef<boolean>;
  recognizerSync: SyncRef<MLKitTextRecognizerNative | null>;
  granularitySync: SyncRef<OcrGranularity>;
  entityFilterSync: SyncRef<OcrEntityFilter>;
  minTextLengthSync: SyncRef<number>;
  minConfidenceSync: SyncRef<number>;
  maxResultsSync: SyncRef<number>;
  lastFrameTimeSync: SyncRef<number>;
  wasThrottledSync: SyncRef<boolean>;
  lastFullTextSync: SyncRef<string>;
  minFrameIntervalMs: number;
}

function createMLKitWorkletProcessFrame(
  params: WorkletOcrParams
): (frame: unknown) => DetectionResult[] {
  const {
    disposedSync,
    readySync,
    recognizerSync,
    granularitySync,
    entityFilterSync,
    minTextLengthSync,
    minConfidenceSync,
    maxResultsSync,
    lastFrameTimeSync,
    wasThrottledSync,
    lastFullTextSync,
    minFrameIntervalMs,
  } = params;

  return (frame: unknown): DetectionResult[] => {
    'worklet';
    if (disposedSync.getBlocking()) {
      throw new Error('Cannot process frame: MLKitTextRecognizer is disposed');
    }

    const activeRecognizer = recognizerSync.getBlocking();
    if (!readySync.getBlocking() || !activeRecognizer) {
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

    if (!frame || typeof frame !== 'object') {
      return [];
    }

    const frameRecord = frame as {
      isValid?: boolean;
      width?: number;
      height?: number;
      orientation?: string;
    };

    if (frameRecord.isValid === false) {
      return [];
    }

    const rawW =
      typeof frameRecord.width === 'number' && frameRecord.width > 0
        ? frameRecord.width
        : 720;
    const rawH =
      typeof frameRecord.height === 'number' && frameRecord.height > 0
        ? frameRecord.height
        : 1280;

    // ML Kit InputImage.fromMediaImage internally auto-rotates 90/270-deg sensor frames
    // so bounding boxes are returned in upright space.
    const isRotated90Or270 =
      frameRecord.orientation === 'left' || frameRecord.orientation === 'right';
    const uprightWidth = isRotated90Or270 ? rawH : rawW;
    const uprightHeight = isRotated90Or270 ? rawW : rawH;

    const rawResult = activeRecognizer.recognize(frame, {});
    const fullText =
      rawResult && typeof rawResult.text === 'string' ? rawResult.text : '';
    lastFullTextSync.setBlocking(fullText);

    return parseMLKitTextResult(rawResult, uprightWidth, uprightHeight, {
      granularity: granularitySync.getBlocking(),
      entityFilter: entityFilterSync.getBlocking(),
      minTextLength: minTextLengthSync.getBlocking(),
      minConfidence: minConfidenceSync.getBlocking(),
      maxResults: maxResultsSync.getBlocking(),
    });
  };
}

/**
 * Concrete CameraProcessor implementation adapting Google ML Kit Text Recognition v2.
 */
export class MLKitTextRecognizerImpl implements MLKitTextRecognizer {
  public readonly id: string;
  public readonly name = 'MLKitTextRecognizer';
  public readonly preferredPixelFormat: CameraPixelFormatPreference;
  public readonly processFrameWorklet: (frame: unknown) => DetectionResult[];
  public readonly wasThrottledSync: WorkletBoolSync;

  private _status: ModelStatus;
  private _language: TextRecognitionLanguage;
  private _granularity: OcrGranularity;
  private _entityFilter: OcrEntityFilter;
  private _invertColors: boolean;
  private _minConfidence: number;
  private _minTextLength: number;
  private _maxResults: number;
  private _config: MLKitTextRecognizerConfig;

  private _disposedSync: SyncRef<boolean>;
  private _readySync: SyncRef<boolean>;
  private _recognizerSync: SyncRef<MLKitTextRecognizerNative | null>;
  private _granularitySync: SyncRef<OcrGranularity>;
  private _entityFilterSync: SyncRef<OcrEntityFilter>;
  private _minTextLengthSync: SyncRef<number>;
  private _minConfidenceSync: SyncRef<number>;
  private _maxResultsSync: SyncRef<number>;
  private _lastFrameTimeSync: SyncRef<number>;
  private _lastFullTextSync: SyncRef<string>;

  constructor(
    config: MLKitTextRecognizerConfig,
    nativeRecognizer: MLKitTextRecognizerNative
  ) {
    this.id = `mlkit-ocr-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this._config = config;
    this._status = 'ready';
    this._language = config.language ?? 'LATIN';
    this._granularity = config.granularity ?? 'line';
    this._entityFilter = config.entityFilter ?? 'all';
    this._invertColors = Boolean(config.invertColors);
    this._minTextLength =
      typeof config.minTextLength === 'number' && config.minTextLength >= 0
        ? Math.floor(config.minTextLength)
        : 1;
    this._minConfidence =
      typeof config.minConfidence === 'number' &&
      Number.isFinite(config.minConfidence)
        ? Math.max(0, Math.min(1, config.minConfidence))
        : 0;
    this._maxResults =
      typeof config.maxResults === 'number' &&
      Number.isFinite(config.maxResults) &&
      config.maxResults >= 0
        ? Math.floor(config.maxResults)
        : 30;
    this.preferredPixelFormat = config.preferredPixelFormat ?? 'yuv';

    const fps = config.targetFps ?? 10;
    const minFrameIntervalMs = fps > 0 ? 1000 / fps : 0;

    this._disposedSync = createSafeSynchronizable(false, true);
    this._readySync = createSafeSynchronizable(true, true);
    this._recognizerSync = createSafeSynchronizable<MLKitTextRecognizerNative | null>(
      nativeRecognizer,
      false
    );
    this._granularitySync = createSafeSynchronizable(this._granularity, false);
    this._entityFilterSync = createSafeSynchronizable(this._entityFilter, false);
    this._minTextLengthSync = createSafeSynchronizable(this._minTextLength, true);
    this._minConfidenceSync = createSafeSynchronizable(this._minConfidence, true);
    this._maxResultsSync = createSafeSynchronizable(this._maxResults, true);
    this._lastFrameTimeSync = createSafeSynchronizable(0, true);
    this.wasThrottledSync = createSafeSynchronizable(false, true);
    this._lastFullTextSync = createSafeSynchronizable('', false);

    this.processFrameWorklet = createMLKitWorkletProcessFrame({
      disposedSync: this._disposedSync,
      readySync: this._readySync,
      recognizerSync: this._recognizerSync,
      granularitySync: this._granularitySync,
      entityFilterSync: this._entityFilterSync,
      minTextLengthSync: this._minTextLengthSync,
      minConfidenceSync: this._minConfidenceSync,
      maxResultsSync: this._maxResultsSync,
      lastFrameTimeSync: this._lastFrameTimeSync,
      wasThrottledSync: this.wasThrottledSync,
      lastFullTextSync: this._lastFullTextSync,
      minFrameIntervalMs,
    });
  }

  get status(): ModelStatus {
    return this._status;
  }

  get targetFps(): number | undefined {
    return this._config.targetFps ?? 10;
  }

  get language(): TextRecognitionLanguage {
    return this._language;
  }

  get granularity(): OcrGranularity {
    return this._granularity;
  }

  get entityFilter(): OcrEntityFilter {
    return this._entityFilter;
  }

  get invertColors(): boolean {
    return this._invertColors;
  }

  get minConfidence(): number {
    return this._minConfidence;
  }

  setGranularity(granularity: OcrGranularity): void {
    this._granularity = granularity;
    this._granularitySync.setBlocking(granularity);
  }

  setEntityFilter(filter: OcrEntityFilter): void {
    this._entityFilter = filter;
    this._entityFilterSync.setBlocking(filter);
  }

  setMinConfidence(confidence: number): void {
    if (Number.isFinite(confidence)) {
      this._minConfidence = Math.max(0, Math.min(1, confidence));
      this._minConfidenceSync.setBlocking(this._minConfidence);
    }
  }

  setMaxResults(maxResults: number): void {
    if (Number.isFinite(maxResults) && maxResults >= 0) {
      this._maxResults = Math.floor(maxResults);
      this._maxResultsSync.setBlocking(this._maxResults);
    }
  }

  async setInvertColors(invert: boolean): Promise<void> {
    if (this._invertColors === invert) {
      return;
    }
    this._invertColors = invert;

    const prev = this._recognizerSync.getBlocking();
    const nativeOptions: MLKitNativeRecognizerOptions = {
      language: this._language,
      scaleFactor: this._config.scaleFactor,
      invertColors: invert,
      roi: this._config.roi,
    };

    const next = this._config.createRecognizer
      ? await Promise.resolve(this._config.createRecognizer(nativeOptions))
      : createNativeTextRecognizerInstance(loadNativeMLKitModule(), nativeOptions);

    this._recognizerSync.setBlocking(next);
    prev?.dispose?.();
  }

  getLastFullText(): string {
    return this._lastFullTextSync.getBlocking();
  }

  getLastStructuredEntities(): StructuredOcrEntities {
    return extractStructuredOcrData(this.getLastFullText());
  }

  processFrame(frame: unknown): DetectionResult[] {
    try {
      return this.processFrameWorklet(frame);
    } catch (err: unknown) {
      throw new InferenceError(
        err instanceof Error ? err.message : 'ML Kit OCR execution failed',
        'INFERENCE_ERROR',
        err
      );
    }
  }

  async recognizeImage(
    uri: string,
    options?: Pick<RecognizeTextFromUriOptions, 'imageWidth' | 'imageHeight'>
  ): Promise<MLKitOcrDocumentResult> {
    const active = this._recognizerSync.getBlocking();
    if (!active || typeof active.recognizeImage !== 'function') {
      return recognizeTextFromUri(uri, {
        language: this._language,
        scaleFactor: this._config.scaleFactor,
        invertColors: this._invertColors,
        roi: this._config.roi,
        granularity: this._granularity,
        entityFilter: this._entityFilter,
        minTextLength: this._minTextLength,
        minConfidence: this._minConfidence,
        maxResults: this._maxResults,
        imageWidth: options?.imageWidth,
        imageHeight: options?.imageHeight,
      });
    }

    const rawResult = await active.recognizeImage(uri);
    return buildOcrDocumentResult(rawResult, {
      granularity: this._granularity,
      entityFilter: this._entityFilter,
      minTextLength: this._minTextLength,
      minConfidence: this._minConfidence,
      maxResults: this._maxResults,
      imageWidth: options?.imageWidth,
      imageHeight: options?.imageHeight,
    });
  }

  async initialize(): Promise<void> {
    if (this._disposedSync.getBlocking()) {
      const nativeOptions: MLKitNativeRecognizerOptions = {
        language: this._language,
        scaleFactor: this._config.scaleFactor,
        invertColors: this._invertColors,
        roi: this._config.roi,
      };
      const created = this._config.createRecognizer
        ? await Promise.resolve(this._config.createRecognizer(nativeOptions))
        : createNativeTextRecognizerInstance(loadNativeMLKitModule(), nativeOptions);
      this._recognizerSync.setBlocking(created);
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
    const active = this._recognizerSync.getBlocking();
    this._recognizerSync.setBlocking(null);
    active?.dispose?.();
  }
}

function inferImageDimensionsFromResult(
  rawResult: MLKitTextRecognitionResult,
  explicitWidth?: number,
  explicitHeight?: number
): { width: number; height: number } {
  if (
    typeof explicitWidth === 'number' &&
    explicitWidth > 0 &&
    typeof explicitHeight === 'number' &&
    explicitHeight > 0
  ) {
    return { width: explicitWidth, height: explicitHeight };
  }

  let maxRight = 1;
  let maxBottom = 1;
  for (let i = 0; i < rawResult.blocks.length; i++) {
    const bounds = rawResult.blocks[i]?.bounds;
    if (!bounds) {
      continue;
    }
    const right =
      typeof bounds.right === 'number'
        ? bounds.right
        : (bounds.left ?? 0) + bounds.width;
    const bottom =
      typeof bounds.bottom === 'number'
        ? bounds.bottom
        : (bounds.top ?? 0) + bounds.height;
    if (right > maxRight) maxRight = right;
    if (bottom > maxBottom) maxBottom = bottom;
  }

  return {
    width: Math.max(100, maxRight),
    height: Math.max(100, maxBottom),
  };
}

function buildOcrDocumentResult(
  rawResult: MLKitTextRecognitionResult,
  options: RecognizeTextFromUriOptions
): MLKitOcrDocumentResult {
  const fullText = typeof rawResult?.text === 'string' ? rawResult.text : '';
  const dims = inferImageDimensionsFromResult(
    rawResult,
    options.imageWidth,
    options.imageHeight
  );
  const detections = parseMLKitTextResult(rawResult, dims.width, dims.height, {
    granularity: options.granularity,
    entityFilter: options.entityFilter,
    minTextLength: options.minTextLength,
    minConfidence: options.minConfidence,
    maxResults: options.maxResults,
    defaultConfidence: options.defaultConfidence,
  });

  return {
    fullText,
    detections,
    entities: extractStructuredOcrData(fullText),
    rawResult,
  };
}

/**
 * Creates and initializes a worklet-capable Google ML Kit OCR processor for CameraAI.
 */
export async function createMLKitTextRecognizer(
  config: MLKitTextRecognizerConfig = {}
): Promise<MLKitTextRecognizer> {
  const nativeOptions: MLKitNativeRecognizerOptions = {
    language: config.language ?? 'LATIN',
    scaleFactor: config.scaleFactor,
    invertColors: config.invertColors,
    roi: config.roi,
  };

  try {
    const recognizer = config.createRecognizer
      ? await Promise.resolve(config.createRecognizer(nativeOptions))
      : createNativeTextRecognizerInstance(loadNativeMLKitModule(), nativeOptions);

    return new MLKitTextRecognizerImpl(config, recognizer);
  } catch (err: unknown) {
    if (err instanceof ModelLoadError) {
      throw err;
    }
    throw new ModelLoadError(
      err instanceof Error
        ? err.message
        : 'Failed to initialize ML Kit TextRecognizer',
      'MODEL_LOAD_FAILED',
      err
    );
  }
}

/**
 * Performs asynchronous Google ML Kit OCR on a static photo URI or local image path.
 */
export async function recognizeTextFromUri(
  uri: string,
  options: RecognizeTextFromUriOptions = {}
): Promise<MLKitOcrDocumentResult> {
  if (!uri || typeof uri !== 'string') {
    throw new InferenceError(
      'recognizeTextFromUri requires a valid image URI string',
      'INVALID_INPUT'
    );
  }

  const nativeOpts: MLKitNativeRecognizerOptions = {
    language: options.language ?? 'LATIN',
    scaleFactor: options.scaleFactor,
    invertColors: options.invertColors,
    roi: options.roi,
    orientation: options.orientation as FrameOrientation | undefined,
  };

  if (options.processImage) {
    const raw = await options.processImage(uri, nativeOpts);
    return buildOcrDocumentResult(raw, options);
  }

  const mlkitModule = loadNativeMLKitModule();
  if (typeof mlkitModule?.processImageTextRecognition === 'function') {
    const raw = await mlkitModule.processImageTextRecognition(uri, nativeOpts);
    return buildOcrDocumentResult(raw, options);
  }

  const instance = createNativeTextRecognizerInstance(mlkitModule, nativeOpts);
  try {
    if (typeof instance.recognizeImage !== 'function') {
      throw new InferenceError(
        'Native ML Kit TextRecognizer does not expose recognizeImage(uri).',
        'INFERENCE_ERROR'
      );
    }
    const raw = await instance.recognizeImage(uri);
    return buildOcrDocumentResult(raw, options);
  } finally {
    instance.dispose?.();
  }
}
