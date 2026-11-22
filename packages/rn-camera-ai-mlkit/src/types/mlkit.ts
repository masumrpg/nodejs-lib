import type {
  CameraPixelFormatPreference,
  CameraProcessor,
  DetectionResult,
  FrameOrientation,
  OcrEntityCategory,
  OcrGranularity,
} from '@masumdev/rn-camera-ai';

/**
 * Supported on-device Google ML Kit text recognition scripts.
 */
export type TextRecognitionLanguage =
  | 'LATIN'
  | 'CHINESE'
  | 'DEVANAGARI'
  | 'JAPANESE'
  | 'KOREAN';

/**
 * Filter restricting emitted OCR detections to a specific semantic entity class.
 */
export type OcrEntityFilter = 'all' | OcrEntityCategory;

/**
 * Region of interest crop specification matching react-native-vision-camera-mlkit.
 */
export interface MLKitRegionOfInterest {
  x: number;
  y: number;
  width: number;
  height: number;
  unit?: 'percentage' | 'pixel';
}

/**
 * Raw bounding box returned by ML Kit Nitro TextRecognizer.
 * Note: bounds.left / bounds.top represent top-left pixel coordinates, while
 * bounds.x / bounds.y represent center coordinates in MLKitTextAdapter.
 */
export interface MLKitBoundingBox {
  x: number;
  y: number;
  centerX?: number;
  centerY?: number;
  width: number;
  height: number;
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
}

/**
 * 2D pixel corner point emitted by ML Kit OCR elements and lines.
 */
export interface MLKitCorner {
  x: number;
  y: number;
}

/**
 * Character symbol prediction emitted by Google ML Kit on Android.
 */
export interface MLKitTextSymbol {
  text: string;
  bounds?: MLKitBoundingBox | null;
  corners?: MLKitCorner[] | null;
  confidence?: number | null;
  angle?: number | null;
  languages?: string[];
}

/**
 * Word/token element emitted by Google ML Kit text recognition.
 */
export interface MLKitTextElement {
  text: string;
  bounds?: MLKitBoundingBox | null;
  corners?: MLKitCorner[] | null;
  confidence?: number | null;
  angle?: number | null;
  languages?: string[];
  symbols?: MLKitTextSymbol[];
}

/**
 * Single text line emitted by Google ML Kit text recognition.
 */
export interface MLKitTextLine {
  text: string;
  bounds?: MLKitBoundingBox | null;
  corners?: MLKitCorner[] | null;
  confidence?: number | null;
  angle?: number | null;
  languages?: string[];
  elements?: MLKitTextElement[];
}

/**
 * Paragraph or block emitted by Google ML Kit text recognition.
 */
export interface MLKitTextBlock {
  text: string;
  bounds?: MLKitBoundingBox | null;
  corners?: MLKitCorner[] | null;
  languages?: string[];
  lines?: MLKitTextLine[];
}

/**
 * Root result returned by native ML Kit TextRecognizer.recognize(frame).
 */
export interface MLKitTextRecognitionResult {
  text: string | null | undefined;
  blocks: MLKitTextBlock[];
}

/**
 * Native options forwarded to VisionCameraMLKit.createTextRecognizer.
 */
export interface MLKitNativeRecognizerOptions {
  language?: TextRecognitionLanguage;
  scaleFactor?: number;
  invertColors?: boolean;
  frameProcessInterval?: number;
  roi?: MLKitRegionOfInterest;
  orientation?: FrameOrientation;
}

/**
 * Structural Nitro HybridObject interface compatible with react-native-vision-camera-mlkit TextRecognizer.
 */
export interface MLKitTextRecognizerNative {
  recognize(
    frame: unknown,
    args?: { orientation?: FrameOrientation }
  ): MLKitTextRecognitionResult;
  recognizeImage?(uri: string): Promise<MLKitTextRecognitionResult>;
  dispose?(): void;
}

/**
 * Native module shape resolved at runtime from react-native-vision-camera-mlkit.
 */
export interface MLKitNativeModuleLike {
  VisionCameraMLKit?: {
    isFeatureAvailable?: (feature: string) => boolean;
    createTextRecognizer?: (
      options: MLKitNativeRecognizerOptions
    ) => MLKitTextRecognizerNative;
  };
  PluginFactory?: {
    initPlugin?: (
      feature: string,
      options: MLKitNativeRecognizerOptions
    ) => MLKitTextRecognizerNative;
    isFeatureAvailable?: (feature: string) => boolean;
  };
  isFeatureAvailable?: (feature: string) => boolean;
  processImageTextRecognition?: (
    uri: string,
    options?: MLKitNativeRecognizerOptions & { language?: TextRecognitionLanguage }
  ) => Promise<MLKitTextRecognitionResult>;
}

/**
 * Options controlling worklet normalization and entity filtering of raw ML Kit OCR results.
 */
export interface ParseMLKitTextOptions {
  /** Hierarchy granularity for emitted DetectionResult bounding boxes (default: 'line') */
  granularity?: OcrGranularity;
  /** Semantic entity filter ('all', 'nik', 'email', 'phone', 'url', 'currency', 'number') */
  entityFilter?: OcrEntityFilter;
  /** Minimum trimmed character count required per item (default: 1) */
  minTextLength?: number;
  /** Minimum recognition confidence in [0, 1] when reported by Android ML Kit (default: 0) */
  minConfidence?: number;
  /** Maximum number of detections to emit per frame (default: 30) */
  maxResults?: number;
  /** Fallback default confidence when platform (e.g. iOS Vision) omits per-line confidence (default: 0.92) */
  defaultConfidence?: number;
}

/**
 * Deduplicated structured entities extracted from recognized OCR transcript text.
 */
export interface StructuredOcrEntities {
  niks: string[];
  emails: string[];
  phones: string[];
  urls: string[];
  currencies: string[];
}

/**
 * Combined static/live OCR document result with normalized detections and structured entities.
 */
export interface MLKitOcrDocumentResult {
  fullText: string;
  detections: DetectionResult[];
  entities: StructuredOcrEntities;
  rawResult: MLKitTextRecognitionResult;
}

/**
 * Configuration options for initializing createMLKitTextRecognizer.
 */
export interface MLKitTextRecognizerConfig {
  /** Text recognition script model (default: 'LATIN') */
  language?: TextRecognitionLanguage;
  /** Hierarchy level emitted as overlay bounding boxes: 'block' | 'line' | 'element' (default: 'line') */
  granularity?: OcrGranularity;
  /** Semantic entity filter (default: 'all') */
  entityFilter?: OcrEntityFilter;
  /** Optional downscale factor in [0.9, 1.0] before OCR processing (default: 1.0) */
  scaleFactor?: number;
  /** Invert image colors for light text on dark backgrounds (default: false) */
  invertColors?: boolean;
  /** Optional Region of Interest crop before running OCR */
  roi?: MLKitRegionOfInterest;
  /** Target OCR execution rate in FPS (default: 10) */
  targetFps?: number;
  /** Minimum trimmed character length per recognized segment (default: 1) */
  minTextLength?: number;
  /** Minimum confidence score in [0, 1] (default: 0) */
  minConfidence?: number;
  /** Maximum number of OCR boxes returned per frame (default: 30) */
  maxResults?: number;
  /** Preferred camera pixel format: 'yuv' (zero-copy ML Kit fast path on Android) or 'rgb' (default: 'yuv') */
  preferredPixelFormat?: CameraPixelFormatPreference;
  /** Optional dependency injection override returning an initialized native ML Kit recognizer */
  createRecognizer?: (
    options: MLKitNativeRecognizerOptions
  ) => MLKitTextRecognizerNative | Promise<MLKitTextRecognizerNative>;
}

/**
 * Configuration options for one-shot recognizeTextFromUri static photo OCR.
 */
export interface RecognizeTextFromUriOptions extends ParseMLKitTextOptions {
  language?: TextRecognitionLanguage;
  scaleFactor?: number;
  invertColors?: boolean;
  roi?: MLKitRegionOfInterest;
  orientation?: FrameOrientation;
  /** Known pixel width of the static image for normalized [0..1] box coordinates */
  imageWidth?: number;
  /** Known pixel height of the static image for normalized [0..1] box coordinates */
  imageHeight?: number;
  /** Optional DI override for testing static OCR */
  processImage?: (
    uri: string,
    options?: MLKitNativeRecognizerOptions
  ) => Promise<MLKitTextRecognitionResult>;
}

/**
 * Worklet-capable Google ML Kit OCR CameraProcessor returned by createMLKitTextRecognizer.
 */
export interface MLKitTextRecognizer extends CameraProcessor {
  readonly language: TextRecognitionLanguage;
  readonly granularity: OcrGranularity;
  readonly entityFilter: OcrEntityFilter;
  readonly invertColors: boolean;
  readonly minConfidence: number;
  /** Dynamically switch OCR box granularity ('block' | 'line' | 'element') at runtime */
  setGranularity(granularity: OcrGranularity): void;
  /** Dynamically switch semantic entity filter ('all' | 'nik' | 'email' | 'phone' | 'url' | 'currency' | 'number') */
  setEntityFilter(filter: OcrEntityFilter): void;
  /** Dynamically update color inversion for dark-background text */
  setInvertColors(invert: boolean): Promise<void> | void;
  /** Dynamically update minimum confidence cutoff [0, 1] */
  setMinConfidence(confidence: number): void;
  /** Dynamically update maximum emitted boxes per frame */
  setMaxResults(maxResults: number): void;
  /** Returns the full multi-line transcript recognized in the most recent active frame */
  getLastFullText(): string;
  /** Returns deduplicated structured entities extracted from the most recent frame */
  getLastStructuredEntities(): StructuredOcrEntities;
  /** Runs Google ML Kit text recognition on a static photo URI or local file path */
  recognizeImage(
    uri: string,
    options?: Pick<RecognizeTextFromUriOptions, 'imageWidth' | 'imageHeight'>
  ): Promise<MLKitOcrDocumentResult>;
}
