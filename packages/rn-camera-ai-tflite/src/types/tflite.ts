import type {
  CameraProcessor,
  FaceLandmark,
} from '@masumdev/rn-camera-ai';

/**
 * Universal source specification for TensorFlow Lite models.
 * - number: Local asset bundle required via require('./model.tflite')
 * - { url: string }: Remote HTTPS URL or local file:/// URI
 * - string: Direct local filesystem path
 */
export type TFLiteModelSource = number | { url: string } | string;

/**
 * Minimal interface representing an active TensorFlow Lite interpreter instance.
 */
export interface TensorflowModel {
  runSync(inputs: (ArrayBuffer | ArrayBufferView)[]): (ArrayBuffer | Float32Array | number[])[];
  run?(inputs: (ArrayBuffer | ArrayBufferView)[]): Promise<(ArrayBuffer | Float32Array | number[])[]>;
  readonly delegates?: readonly string[];
}

/**
 * Options controlling model loading and hardware delegate resolution.
 */
export interface ModelLoaderOptions {
  /** Whether to request GPU delegate acceleration (default: true) */
  useGpu?: boolean;
  /** Explicit operating system platform ('android' or 'ios') */
  platform?: 'android' | 'ios' | string;
  /** Callback triggered when requested hardware delegate falls back to CPU */
  onDelegateFallback?: (requested: string, fallback: string) => void;
  /** Optional custom model loader function for dependency injection or testing */
  loadModel?: (source: TFLiteModelSource, delegates: string[]) => Promise<TensorflowModel>;
}

/**
 * Result returned upon successful model loading and delegate negotiation.
 */
export interface LoadedModelResult {
  /** Initialized model instance */
  model: TensorflowModel;
  /** Active hardware delegate negotiated */
  activeDelegate: 'gpu' | 'cpu';
  /** Validated model source */
  source: TFLiteModelSource;
}

/**
 * Configuration options for initializing a TFLiteObjectDetector instance.
 */
export interface TFLiteObjectDetectorConfig {
  /** Target TensorFlow Lite model source */
  model: TFLiteModelSource;
  /** Human-readable class labels as array or index-to-name dictionary */
  labels?: string[] | Record<number, string>;
  /** Optional offset applied to raw class index (e.g. -1 if index 0 is background) */
  labelOffset?: number;
  /** Minimum confidence threshold in range [0, 1] (default: 0.50) */
  confidenceThreshold?: number;
  /** Maximum number of top detections to return (default: 10) */
  maxResults?: number;
  /** Whether to attempt GPU acceleration (default: true) */
  useGpu?: boolean;
  /** Frame rate limit in frames per second (default: 15) */
  targetFps?: number;
  /** Target model input tensor width in pixels (default: 300) */
  inputWidth?: number;
  /** Target model input tensor height in pixels (default: 300) */
  inputHeight?: number;
  /** Callback triggered when GPU delegate fails and falls back to CPU */
  onDelegateFallback?: (requested: string, fallback: string) => void;
  /** Optional custom model loader function for testing or custom runtime */
  loadModel?: (source: TFLiteModelSource, delegates: string[]) => Promise<TensorflowModel>;
  /** Explicit platform target */
  platform?: 'android' | 'ios' | string;
  /** Optional custom resize plugin instance */
  resizePlugin?: {
    resize(frame: unknown, options: unknown): { buffer?: ArrayBuffer; toArrayBuffer?: () => ArrayBuffer };
  };
}

/**
 * Pluggable camera processor contract for TensorFlow Lite object detection.
 */
export interface TFLiteObjectDetector extends CameraProcessor {
  /** Active hardware delegate utilized for inference */
  readonly activeDelegate: 'gpu' | 'cpu';
  /** Current confidence threshold */
  readonly confidenceThreshold?: number;
  /** Current maximum results limit */
  readonly maxResults?: number;
  /** Dynamically updates the detection confidence threshold */
  setConfidenceThreshold(threshold: number): void;
  /** Dynamically updates the maximum results limit */
  setMaxResults(maxResults: number): void;
}

/**
 * Options controlling standard 4-tensor output decoding.
 */
export interface ParseOptions {
  /** Minimum detection confidence score (default: 0.50) */
  confidenceThreshold?: number;
  /** Maximum number of detections to retain (default: 10) */
  maxResults?: number;
  /** Class label array or dictionary mapping */
  labels?: string[] | Record<number, string>;
  /** Index offset applied before label lookup (default: 0) */
  labelOffset?: number;
}

/**
 * Alias for ParseOptions for backwards and contract compatibility.
 */
export type ParseDetectionOptions = ParseOptions;

/**
 * Accepted representation for the 4 standard TFLite output tensors.
 */
export type TFLiteOutputs =
  | [
      ArrayBuffer | Float32Array | number[],
      ArrayBuffer | Float32Array | number[],
      ArrayBuffer | Float32Array | number[],
      ArrayBuffer | Float32Array | number[] | number,
    ]
  | (ArrayBuffer | Float32Array | number[] | number | unknown[])[];

/**
 * 2D SSD anchor center coordinate in normalized [0..1] space for BlazeFace decoding.
 */
export interface BlazeFaceAnchor {
  /** Normalized horizontal center [0, 1] */
  x: number;
  /** Normalized vertical center [0, 1] */
  y: number;
}

/**
 * Options for decoding MediaPipe BlazeFace raw output tensors.
 */
export interface BlazeFaceDecodeOptions {
  /** Minimum face detection confidence score in [0, 1] (default: 0.5) */
  confidenceThreshold?: number;
  /** Non-Maximum Suppression IoU threshold in [0, 1] (default: 0.3) */
  iouThreshold?: number;
  /** Maximum number of faces to return (default: 5) */
  maxResults?: number;
  /** Model input width in pixels (default: 128) */
  inputWidth?: number;
  /** Model input height in pixels (default: 128) */
  inputHeight?: number;
  /** Camera source frame height / width aspect ratio for portrait de-squishing (e.g. 1280/720) */
  frameAspectRatio?: number;
}

/**
 * Enrolled face identity profile stored for real-time face recognition.
 */
export interface EnrolledFaceProfile {
  /** Unique profile identifier */
  id: string;
  /** Display name of the enrolled person */
  name: string;
  /** L2-normalized embedding vector */
  embedding: number[];
  /** Creation timestamp (epoch ms) */
  createdAt: number;
}

/**
 * Configuration options for initializing a TFLiteFaceRecognizer processor.
 */
export interface TFLiteFaceRecognizerConfig {
  /** MediaPipe BlazeFace detector model source (192x192 or 128x128) */
  model: TFLiteModelSource;
  /** Optional secondary TFLite face embedding model source (e.g. MobileFaceNet 112x112) */
  embeddingModel?: TFLiteModelSource;
  /** Optional MediaPipe 468-point 3D Face Mesh TFLite model source (face_landmark.tflite 192x192) */
  faceMeshModel?: TFLiteModelSource;
  /** Optional dedicated passive anti-spoofing TFLite model source (e.g. MiniFASNet 80x80 / 128x128) */
  antiSpoofModel?: TFLiteModelSource;
  /** Whether to compute hybrid active + passive liveness metrics per face (default: true) */
  enableLiveness?: boolean;
  /** Minimum passive liveness confidence threshold in [0, 1] to classify a face as live (default: 0.62) */
  livenessThreshold?: number;
  /** Minimum face detection confidence threshold in [0, 1] (default: 0.55) */
  confidenceThreshold?: number;
  /** Minimum cosine similarity threshold in [0, 1] to recognize an enrolled identity (default: 0.65) */
  similarityThreshold?: number;
  /** Non-Maximum Suppression IoU overlap threshold in [0, 1] (default: 0.3) */
  iouThreshold?: number;
  /** Maximum faces to detect per frame (default: 5) */
  maxResults?: number;
  /** Target frame rate in FPS (default: 24) */
  targetFps?: number;
  /** Detector model input width (default: 128) */
  inputWidth?: number;
  /** Detector model input height (default: 128) */
  inputHeight?: number;
  /** Whether to request GPU acceleration (default: true) */
  useGpu?: boolean;
  /** Initial list of enrolled face profiles */
  initialFaces?: EnrolledFaceProfile[];
  /** Callback triggered when hardware delegate falls back to CPU */
  onDelegateFallback?: (requested: string, fallback: string) => void;
  /** Optional custom model loader function for testing or custom runtime */
  loadModel?: (source: TFLiteModelSource, delegates: string[]) => Promise<TensorflowModel>;
  /** Explicit operating system platform target */
  platform?: 'android' | 'ios' | string;
}

/**
 * Pluggable camera processor for real-time Face Detection, 6 Facial Landmarks, and Identity Recognition.
 */
export interface TFLiteFaceRecognizer extends CameraProcessor {
  /** Active hardware delegate utilized for inference */
  readonly activeDelegate: 'gpu' | 'cpu';
  /** Current face detection confidence threshold */
  readonly confidenceThreshold: number;
  /** Current cosine similarity threshold for identity matching */
  readonly similarityThreshold: number;
  /** Current passive liveness threshold */
  readonly livenessThreshold: number;
  /** Dynamically updates face detection confidence threshold */
  setConfidenceThreshold(threshold: number): void;
  /** Dynamically updates cosine similarity threshold for identity matching */
  setSimilarityThreshold(threshold: number): void;
  /** Dynamically updates passive liveness verification threshold */
  setLivenessThreshold(threshold: number): void;
  /** Enrolls a face profile from the most recently detected face in the camera stream */
  enrollLastDetectedFace(name: string): EnrolledFaceProfile | null;
  /** Enrolls a face profile with an explicit embedding vector */
  enrollFace(name: string, embedding: Float32Array | number[]): EnrolledFaceProfile;
  /** Removes an enrolled face profile by ID */
  removeEnrolledFace(id: string): boolean;
  /** Clears all enrolled face profiles */
  clearEnrolledFaces(): void;
  /** Returns all currently enrolled face profiles */
  getEnrolledFaces(): EnrolledFaceProfile[];
  /** Returns whether a valid face embedding was captured from a recent camera frame */
  hasRecentFaceEmbedding(): boolean;
  /** Returns the most recently detected facial landmarks if available */
  getLastDetectedLandmarks?(): FaceLandmark[] | null;
}
