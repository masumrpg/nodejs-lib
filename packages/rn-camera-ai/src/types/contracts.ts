import type React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { CameraAIError } from './errors';

/**
 * Normalized bounding box in [0..1] relative coordinate space.
 */
export interface BoundingBox {
  /** Top-left horizontal coordinate [0, 1] */
  x: number;
  /** Top-left vertical coordinate [0, 1] */
  y: number;
  /** Width fraction [0, 1] */
  width: number;
  /** Height fraction [0, 1] */
  height: number;
}

/**
 * Pixel bounding box for screen layout and rendering.
 */
export interface PixelBoundingBox {
  /** Top-left horizontal coordinate in pixels */
  x: number;
  /** Top-left vertical coordinate in pixels */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * Semantic facial keypoint type emitted by face detectors.
 */
export type FaceLandmarkType =
  | 'leftEye'
  | 'rightEye'
  | 'noseTip'
  | 'mouth'
  | 'leftEar'
  | 'rightEar';

/**
 * Normalized 2D facial keypoint in [0..1] relative coordinate space.
 */
export interface FaceLandmark {
  /** Horizontal coordinate [0, 1] */
  x: number;
  /** Vertical coordinate [0, 1] */
  y: number;
  /** Optional semantic keypoint identifier */
  type?: FaceLandmarkType;
}

/**
 * Pixel-space 2D facial keypoint for screen overlay rendering.
 */
export interface PixelFaceLandmark {
  /** Horizontal coordinate in pixels */
  x: number;
  /** Vertical coordinate in pixels */
  y: number;
  /** Optional semantic keypoint identifier */
  type?: FaceLandmarkType;
}

/**
 * Matched face identity metadata from embedding similarity comparison.
 */
export interface FaceIdentityMatch {
  /** Enrolled face profile ID */
  id: string;
  /** Recognized person name */
  name: string;
  /** Cosine similarity score in range [0, 1] */
  similarity: number;
  /** Whether similarity met or exceeded the recognition threshold */
  isRecognized: boolean;
}

/**
 * Standard detection result returned by a camera processor.
 */
export interface DetectionResult {
  /** Unique identifier for keying rendering elements */
  id: string;
  /** Human-readable class label (e.g. 'person', 'Masum', 'Unknown Face') */
  label: string;
  /** Detection confidence score in range [0, 1] */
  confidence: number;
  /** Normalized bounding box [0, 1] */
  boundingBox: BoundingBox;
  /** Optional class index */
  classIndex?: number;
  /** Optional normalized facial landmarks [0, 1] */
  landmarks?: FaceLandmark[];
  /** Optional face recognition identity match metadata */
  identity?: FaceIdentityMatch;
  /** Optional raw vendor inference data */
  raw?: unknown;
}

/**
 * Status of the processor or model lifecycle.
 */
export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Worklet-readable boolean synchronizable reference.
 */
export interface WorkletBoolSync {
  getBlocking(): boolean;
  setBlocking(value: boolean): void;
}

/**
 * Pluggable camera processor contract for AI inference engines.
 */
export interface CameraProcessor {
  /** Unique identifier for the processor */
  readonly id?: string;
  /** Human-readable processor name */
  readonly name?: string;
  /** Current lifecycle status */
  readonly status: ModelStatus;
  /** Optional target frame rate limit */
  readonly targetFps?: number;
  /** Optional worklet-shared flag indicating whether the last processFrame call was throttled/skipped */
  readonly wasThrottledSync?: WorkletBoolSync;
  /** Frame processor callback executing synchronously or worklet-safe */
  processFrame(frame: unknown): DetectionResult[];
  /** Optional standalone worklet-safe frame processor callback without `this` capture */
  readonly processFrameWorklet?: (frame: unknown) => DetectionResult[];
  /** Optional asynchronous initialization hook */
  initialize?(): Promise<void> | void;
  /** Optional disposal and resource cleanup hook */
  dispose?(): void;
}

/**
 * Container view dimensions in density-independent pixels.
 */
export interface ViewDimensions {
  width: number;
  height: number;
}

/**
 * Camera stream dimensions in pixels.
 */
export interface StreamDimensions {
  width: number;
  height: number;
}

/**
 * Physical orientation of the camera sensor frame.
 */
export type FrameOrientation =
  | 'portrait'
  | 'portrait-upside-down'
  | 'landscape-left'
  | 'landscape-right';

/**
 * Options controlling normalization to pixel space projection.
 */
export interface TransformOptions {
  viewDimensions: ViewDimensions;
  streamDimensions: StreamDimensions;
  resizeMode: 'cover' | 'contain';
  isMirrored?: boolean;
  orientation?: FrameOrientation;
}

/**
 * Worklet-shared camera stream metadata used for 100% UI-thread coordinate projection.
 */
export interface OverlayFrameMeta {
  streamWidth: number;
  streamHeight: number;
  isMirrored: boolean;
  orientation: FrameOrientation;
}

/**
 * Result of scale and offset projection calculations.
 */
export interface ScaleAndOffsets {
  scale: number;
  offsetX: number;
  offsetY: number;
  renderedWidth: number;
  renderedHeight: number;
}

/**
 * Camera facing position.
 */
export type CameraFacing = 'back' | 'front';

/**
 * Bounding box visual rendering style.
 */
export type BoundingBoxVariant = 'solid' | 'corners' | 'dashed';

/**
 * Anchor position of the label badge relative to the bounding box.
 */
export type LabelBadgePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'inside-top';

/**
 * Granular styling and visibility controls for landmarks and 468-point Face Mesh wireframe.
 */
export interface FaceMeshStyleConfig {
  /** Show connected anatomical contour lines (eyes, brows, lips, nose, oval) (default: true) */
  showMeshLines?: boolean;
  /** Show interior cheek/forehead triangle tesselation web (default: true) */
  showTesselation?: boolean;
  /** Show landmark vertex dots (default: true) */
  showDots?: boolean;
  /** Base landmark dot radius in pixels (default: 3.5 for 6-pt, 1.8 for 468-mesh) */
  dotRadius?: number;
  /** Eye vertex dot radius in pixels (default: 2.4) */
  eyeDotRadius?: number;
  /** Line thickness multiplier (default: 1.0) */
  lineThickness?: number;
  /** General landmark dot color (default: '#38bdf8') */
  dotColor?: string;
  /** Eye landmark dot color (default: '#22d3ee') */
  eyeDotColor?: string;
  /** Face oval jawline contour color (default: 'rgba(56, 189, 248, 0.75)') */
  faceOvalColor?: string;
  /** Left & right eye contour color (default: '#22d3ee') */
  eyeContourColor?: string;
  /** Left & right eyebrow contour color (default: 'rgba(125, 211, 252, 0.85)') */
  eyebrowContourColor?: string;
  /** Outer lip contour color (default: '#34d399') */
  lipOuterContourColor?: string;
  /** Inner lip contour color (default: '#6ee7b7') */
  lipInnerContourColor?: string;
  /** Nose bridge & bottom contour color (default: '#38bdf8') */
  noseContourColor?: string;
  /** Interior triangle tesselation web color (default: 'rgba(56, 189, 248, 0.42)') */
  tesselationColor?: string;
}

/**
 * Unified declarative theme and customization configuration for DetectionOverlay.
 */
export interface OverlayThemeConfig {
  /** Whether to render bounding boxes around detections (default: true) */
  showBoxes?: boolean;
  /** Bounding box visual style: 'solid', 'corners' (scanner brackets), or 'dashed' (default: 'solid') */
  boxVariant?: BoundingBoxVariant;
  /** Primary bounding box & badge color (default: '#3da441') */
  boxColor?: string;
  /** Bounding box color for unrecognized faces when identity matching is active (default: '#f59e0b') */
  unrecognizedBoxColor?: string;
  /** Optional translucent background fill inside bounding box */
  boxBackgroundColor?: string;
  /** Border thickness in pixels (default: 2) */
  boxBorderWidth?: number;
  /** Border radius in pixels (default: 8) */
  boxBorderRadius?: number;
  /** Corner bracket arm length in pixels when boxVariant === 'corners' (default: 22) */
  cornerLength?: number;
  /** Corner bracket thickness in pixels when boxVariant === 'corners' (default: 3) */
  cornerThickness?: number;
  /** Custom ViewStyle applied to each bounding box container */
  boxStyle?: StyleProp<ViewStyle>;
  /** Whether to render class/identity label badges (default: true) */
  showLabels?: boolean;
  /** Whether to render confidence percentage inside default label badge (default: true) */
  showConfidence?: boolean;
  /** Anchor position of the label badge relative to the bounding box (default: 'top-left') */
  labelPosition?: LabelBadgePosition;
  /** Override label badge background color */
  labelBackgroundColor?: string;
  /** Override label badge text color (default: '#ffffff') */
  labelTextColor?: string;
  /** Custom ViewStyle applied to the label badge container */
  labelStyle?: StyleProp<ViewStyle>;
  /** Custom TextStyle applied to the label badge text */
  labelTextStyle?: StyleProp<TextStyle>;
  /** Custom formatter function for label text */
  formatLabel?: (detection: DetectionResult) => string;
  /** Fine-grained landmark dot & 468-point Face Mesh styling */
  meshStyle?: FaceMeshStyleConfig;
  /** Custom landmark dot ViewStyle */
  landmarkStyle?: StyleProp<ViewStyle>;
}

/**
 * Parameters passed to custom per-detection bounding box renderer.
 */
export interface RenderBoxParams {
  detection: DetectionResult;
  pixelBox: PixelBoundingBox;
  index: number;
  color: string;
}

/**
 * Parameters passed to custom per-detection label badge renderer.
 */
export interface RenderLabelParams {
  detection: DetectionResult;
  pixelBox: PixelBoundingBox;
  index: number;
  color: string;
  formattedText: string;
}

/**
 * Parameters passed to custom per-landmark dot renderer.
 */
export interface RenderLandmarkDotParams {
  detection: DetectionResult;
  point: PixelFaceLandmark;
  index: number;
  isDenseMesh: boolean;
  color: string;
  radius: number;
}

/**
 * Props for the CameraAI component.
 */
export interface CameraAIProps {
  /** Pluggable AI inference processor */
  processor?: CameraProcessor;
  /** Desired camera facing position (default: 'back') */
  cameraPosition?: CameraFacing;
  /** Video scaling mode inside container (default: 'cover') */
  resizeMode?: 'cover' | 'contain';
  /** Whether the camera session and frame processing are active (default: true) */
  isActive?: boolean;
  /** Frame rate limit in frames per second */
  fps?: number;
  /** Whether to render bounding boxes around detections (default: true) */
  showBoxes?: boolean;
  /** Bounding box visual style: 'solid', 'corners', or 'dashed' (default: 'solid') */
  boxVariant?: BoundingBoxVariant;
  /** Primary bounding box & badge accent color (default: '#3da441') */
  boxColor?: string;
  /** Facial landmark dot color (default: '#38bdf8') */
  landmarkColor?: string;
  /** Whether to show class/identity label badges (default: true) */
  showLabels?: boolean;
  /** Whether to show confidence percentage in label badges (default: true) */
  showConfidence?: boolean;
  /** Whether to render facial landmark dots & mesh when present on detections (default: true) */
  showLandmarks?: boolean;
  /** Whether to render connected 468-point Face Mesh contour lines (default: true) */
  showMeshLines?: boolean;
  /** Whether to render interior 468-point Face Mesh triangle tesselation grid (default: true) */
  showTesselation?: boolean;
  /** Declarative overlay theme and Face Mesh customization config */
  overlayTheme?: OverlayThemeConfig;
  /** Custom label text formatter */
  formatLabel?: (detection: DetectionResult) => string;
  /** Custom per-detection bounding box renderer receiving pre-projected screen pixel coordinates */
  renderBox?: (params: RenderBoxParams) => React.ReactNode;
  /** Custom per-detection label renderer receiving pre-projected screen pixel coordinates */
  renderLabel?: (params: RenderLabelParams) => React.ReactNode;
  /** Custom per-landmark dot renderer receiving pre-projected screen pixel coordinates */
  renderLandmarkDot?: (params: RenderLandmarkDotParams) => React.ReactNode;
  /** Full-canvas custom overlay renderer receiving detections and measured view dimensions */
  renderOverlay?: (detections: DetectionResult[], viewDimensions: ViewDimensions) => React.ReactNode;
  /** Worklet callback invoked directly on the FrameOutput worklet thread with 0 JS thread hops */
  onDetectionsWorklet?: (detections: DetectionResult[]) => void;
  /** Callback emitted on the JS thread when new detections arrive */
  onDetections?: (detections: DetectionResult[]) => void;
  /** Minimum interval in milliseconds between JS-thread onDetections invocations (default: 0) */
  onDetectionsThrottleMs?: number;
  /** Error callback emitted on camera, permission, or inference failures */
  onError?: (error: CameraAIError) => void;
  /** Custom view displayed when camera permission is denied */
  permissionFallback?: React.ReactNode;
  /** Custom view displayed when camera hardware device is unavailable */
  cameraUnavailableFallback?: React.ReactNode;
  /** Container styling */
  style?: StyleProp<ViewStyle>;
}
