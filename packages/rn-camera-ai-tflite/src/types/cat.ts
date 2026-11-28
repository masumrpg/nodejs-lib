import type {
  CameraProcessor,
} from '@masumdev/rn-camera-ai';
import type {
  TFLiteModelSource,
  TensorflowModel,
} from './tflite';

/**
 * Pipeline operating mode controlling which cat vision neural networks execute.
 */
export type CatAnalysisMode =
  | 'all'
  | 'breed'
  | 'face_mood'
  | 'segmentation'
  | 'identity';

/**
 * Active breed classification model engine selector.
 */
export type CatBreedEngine = '67' | '12' | 'ensemble';

/**
 * Enrolled personal cat identity profile stored for cosine similarity matching.
 */
export interface EnrolledCatProfile {
  /** Unique profile identifier */
  id: string;
  /** Custom cat nickname (e.g. 'Oyen', 'Mochi') */
  name: string;
  /** Optional detected or user-provided breed hint */
  breedHint?: string;
  /** L2-normalized 96-D feline descriptor embedding */
  embedding: number[];
  /** Creation timestamp (epoch ms) */
  createdAt: number;
}

/**
 * Configuration options for creating a Multi-Model TFLite Cat Vision Analyzer.
 */
export interface TFLiteCatAnalyzerConfig {
  /** Stage 1 COCO SSD object detector model (detect.tflite 300x300) */
  detectorModel: TFLiteModelSource;
  /** COCO labels array or index map */
  detectorLabels?: string[] | Record<number, string>;
  /** Index offset applied before COCO label lookup (default: 1) */
  detectorLabelOffset?: number;
  /** Detector input tensor width (default: 300) */
  detectorInputWidth?: number;
  /** Detector input tensor height (default: 300) */
  detectorInputHeight?: number;
  /** Extended 67-class Cat Breed & Coat Classifier model (224x224 float32 [0,1]) */
  breed67Model?: TFLiteModelSource;
  /** Label array for 67-class cat breed model */
  breed67Labels?: readonly string[];
  /** High-precision 12-class Oxford-IIIT Pet Cat Breed Classifier (224x224 uint8) */
  breed12Model?: TFLiteModelSource;
  /** Label array for 12-class breed model */
  breed12Labels?: readonly string[];
  /** Stage 2a Cat Face Localizer model (224x224 float32 [0,1] letterboxed) */
  catFaceLocalizerModel?: TFLiteModelSource;
  /** Stage 2b 48-point CatFLW Facial Landmarks model (384x384 float32 [0,1]) */
  catFaceLandmarksModel?: TFLiteModelSource;
  /** MediaPipe DeepLab-V3 21-class Semantic Segmenter (257x257 float32 [-1,1]) */
  segmentationModel?: TFLiteModelSource;
  /** Class index corresponding to 'cat' in segmentation outputs (default: 8) */
  segmentationCatClassIndex?: number;
  /** Initial active Cat AI pipeline mode (default: 'all') */
  initialMode?: CatAnalysisMode;
  /** Initial cat breed engine selection (default: 'ensemble') */
  initialBreedEngine?: CatBreedEngine;
  /** Minimum COCO SSD detection score threshold [0, 1] (default: 0.42) */
  confidenceThreshold?: number;
  /** Minimum cosine similarity threshold for Cat ID recognition [0, 1] (default: 0.72) */
  similarityThreshold?: number;
  /** Fall back to center close-up ROI when SSD misses an extreme close-up cat (default: true) */
  closeUpFallback?: boolean;
  /** Target FPS processing cap (default: 15) */
  targetFps?: number;
  /** Whether to prefer hardware GPU delegates before CPU fallback (default: true) */
  useGpu?: boolean;
  /** Optional initial list of enrolled cats */
  initialCats?: EnrolledCatProfile[];
  /** Delegate fallback callback */
  onDelegateFallback?: (requested: string, fallback: string) => void;
  /** Optional custom model loader function */
  loadModel?: (source: TFLiteModelSource, delegates: string[]) => Promise<TensorflowModel>;
  /** Platform override ('android' | 'ios') */
  platform?: 'android' | 'ios' | string;
}

/**
 * Pluggable multi-model feline vision CameraProcessor contract.
 */
export interface TFLiteCatAnalyzer extends CameraProcessor {
  readonly activeDelegate: 'gpu' | 'cpu';
  readonly analysisMode: CatAnalysisMode;
  readonly breedEngine: CatBreedEngine;
  readonly confidenceThreshold: number;
  readonly similarityThreshold: number;
  readonly closeUpFallback: boolean;
  readonly loadedModels: {
    readonly detector: boolean;
    readonly breed67: boolean;
    readonly breed12: boolean;
    readonly catFaceLocalizer: boolean;
    readonly catFaceLandmarks: boolean;
    readonly segmentation: boolean;
  };
  setAnalysisMode(mode: CatAnalysisMode): void;
  setBreedEngine(engine: CatBreedEngine): void;
  setConfidenceThreshold(threshold: number): void;
  setSimilarityThreshold(threshold: number): void;
  setCloseUpFallback(enabled: boolean): void;
  enrollLastDetectedCat(name: string, breedHint?: string): EnrolledCatProfile | null;
  enrollCat(
    name: string,
    embedding: Float32Array | number[],
    breedHint?: string
  ): EnrolledCatProfile;
  removeEnrolledCat(id: string): boolean;
  clearEnrolledCats(): void;
  getEnrolledCats(): EnrolledCatProfile[];
  hasRecentCatEmbedding(): boolean;
}
