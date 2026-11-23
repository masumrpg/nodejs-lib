import type React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { CameraAITheme, ThemeColorsLike } from '../theme/types';
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
  /** Optional relative 3D depth coordinate from 468-point Face Mesh */
  z?: number;
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
  /** Optional relative 3D depth coordinate */
  z?: number;
  /** Optional semantic keypoint identifier */
  type?: FaceLandmarkType;
}

/**
 * Semantic 3D head pose facing direction.
 */
export type HeadPoseDirection = 'center' | 'left' | 'right' | 'up' | 'down';

/**
 * Passive anti-spoofing risk classification.
 */
export type SpoofRiskLevel = 'low' | 'medium' | 'high';

/**
 * Interactive active liveness challenge action type.
 */
export type LivenessChallengeAction =
  | 'blink'
  | 'mouth_open'
  | 'smile'
  | 'turn_left'
  | 'turn_right'
  | 'nod_up'
  | 'nod_down';

/**
 * Hybrid Active + Passive Face Liveness and Anti-Spoofing biometric telemetry.
 */
export interface FaceLivenessMetrics {
  /** Overall liveness verification status (true when passiveScore >= threshold) */
  isLive: boolean;
  /** Combined passive anti-spoofing confidence score in [0, 1] */
  passiveScore: number;
  /** Spoof risk classification based on passive depth + surface texture */
  spoofRisk: SpoofRiskLevel;
  /** 3D mesh Z-coordinate relief score [0, 1] (nose protrusion vs cheek/eye plane) */
  depthReliefScore: number;
  /** RGB surface texture & anti-Moiré/glare naturalness score [0, 1] */
  textureScore: number;
  /** Average Eye Aspect Ratio (EAR) across both eyes (~0.28 open, <0.19 closed) */
  eyeAspectRatio: number;
  /** Left eye openness ratio */
  leftEyeEAR: number;
  /** Right eye openness ratio */
  rightEyeEAR: number;
  /** True when an eye blink is actively occurring in the current frame */
  isBlinking: boolean;
  /** Mouth Aspect Ratio (MAR) measuring inner vertical lip opening */
  mouthAspectRatio: number;
  /** True when the mouth is clearly open (MAR >= 0.32) */
  isMouthOpen: boolean;
  /** Mouth width & corner elevation ratio indicating a smile */
  smileRatio: number;
  /** True when a smile expression is detected */
  isSmiling: boolean;
  /** Horizontal head rotation angle in degrees (-45° left to +45° right) */
  yawDeg: number;
  /** Vertical head nod angle in degrees (-35° down to +35° up) */
  pitchDeg: number;
  /** Head tilt angle in degrees */
  rollDeg: number;
  /** Semantic head facing direction */
  headDirection: HeadPoseDirection;
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
 * Preferred camera buffer pixel format requested by a CameraProcessor.
 */
export type CameraPixelFormatPreference = 'rgb' | 'yuv' | 'native';

/**
 * Granularity level for OCR text detection results.
 */
export type OcrGranularity = 'block' | 'line' | 'element';

/**
 * Semantic category classified from recognized OCR text.
 */
export type OcrEntityCategory =
  | 'text'
  | 'nik'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'number';

/**
 * Normalized 2D polygon corner point in [0..1] coordinate space.
 */
export interface OcrPoint {
  x: number;
  y: number;
}

/**
 * Structured OCR metadata attached to DetectionResult items emitted by text processors.
 */
export interface OcrDetectionMetadata {
  /** Recognized text content for this block, line, or word element */
  text: string;
  /** Hierarchy level emitted by the OCR parser */
  granularity: OcrGranularity;
  /** Semantic entity classification inferred from recognized text */
  category: OcrEntityCategory;
  /** ISO-639 / BCP-47 language codes detected on this segment */
  languages: string[];
  /** ML Kit confidence score in range [0, 1] when available */
  confidence?: number;
  /** Text baseline rotation angle in degrees when available */
  angle?: number;
  /** Normalized 4-point polygon corners [0, 1] */
  corners?: OcrPoint[];
  /** Full recognized text across the current camera frame */
  fullText?: string;
}

/**
 * 2D normalized or screen-pixel point coordinate.
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 4-corner quadrilateral representing a potentially rotated or perspective-tilted paper sheet.
 */
export interface DocumentQuad {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

/**
 * Classification status reported by lightweight background worklet document alignment.
 */
export type DocumentAlignmentStatus =
  | 'searching'
  | 'low_light'
  | 'glare'
  | 'blurry'
  | 'clipped'
  | 'too_far'
  | 'too_close'
  | 'off_center'
  | 'optimal';

/**
 * Compact numeric/status telemetry computed on the background Camera Worklet thread
 * without invoking heavy text OCR inference during camera preview.
 */
export interface DocumentAlignmentMetrics {
  /** Alignment & quality status classification */
  status: DocumentAlignmentStatus;
  /** Estimated OCR capture optimality percentage in range [0, 100] */
  optimalityScore: number;
  /** True when status === 'optimal' and framing + focus + light are ready for capture */
  isOptimal: boolean;
  /** True when a distinct document/paper region was found */
  hasDocument: boolean;
  /** Concise status headline */
  headline: string;
  /** Actionable alignment hint */
  hint: string;
  /** Average YUV luminance [0, 255] across the frame */
  meanBrightness: number;
  /** Edge sharpness / focus energy score */
  focusSharpness: number;
  /** Viewport area fraction covered by the fitted document quad [0, 1] */
  coverageRatio: number;
  /** Independent normalized [0..1] 4 corners allowing skewed/perspective tracking */
  corners?: DocumentQuad;
  /** Estimated sheet baseline tilt angle in degrees */
  skewAngleDeg?: number;
}

/**
 * Standard detection result returned by a camera processor.
 */
export interface DetectionResult {
  /** Unique identifier for keying rendering elements */
  id: string;
  /** Human-readable class label (e.g. 'person', 'Masum', 'Unknown Face', recognized OCR text) */
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
  /** Optional hybrid active + passive face liveness & anti-spoofing telemetry */
  liveness?: FaceLivenessMetrics;
  /** Optional OCR text recognition metadata */
  ocr?: OcrDetectionMetadata;
  /** Optional background worklet document alignment & framing metrics */
  documentAlignment?: DocumentAlignmentMetrics;
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
  /** Optional preferred VisionCamera buffer pixel format (defaults to 'rgb') */
  readonly preferredPixelFormat?: CameraPixelFormatPreference;
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
  /** Suppress overlapping label badges in dense text/object scenes so text stays unobstructed (default: false) */
  avoidLabelOverlap?: boolean;
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
 * Visual phase for the camera scanning animation overlay.
 */
export type ScannerAnimationState = 'idle' | 'scanning' | 'analyzing' | 'complete';

/**
 * Semantic readiness state of the smart document alignment guide.
 */
export type DocumentReadinessState =
  | 'searching'
  | 'adjusting'
  | 'optimal'
  | 'analyzing'
  | 'complete';

/**
 * Corner identifier for customizable document framing brackets.
 */
export type DocumentCornerPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Target normalized paper rectangle / 4-corner quad and readiness telemetry rendered by DocumentGuideOverlay.
 */
export interface DocumentGuideTarget {
  /** Normalized [0..1] axis-aligned fallback rectangle fitted to document bounds */
  box: BoundingBox;
  /** Optional independent normalized [0..1] 4 corners enabling angled/trapezoid paper tracking */
  corners?: DocumentQuad;
  /** Semantic readiness state determining corner color & status chrome */
  readiness: DocumentReadinessState;
  /** Optional 0..100 estimated OCR optimality percentage */
  optimalityScore?: number;
  /** Primary alignment status label */
  statusText?: string;
  /** Actionable alignment hint displayed below statusText */
  hintText?: string;
}

/**
 * Declarative visual theme and timing configuration for DocumentGuideOverlay.
 */
export interface DocumentGuideThemeConfig {
  /** Corner arm length in pixels (default: 28) */
  cornerLength?: number;
  /** Corner border thickness in pixels (default: 3.5) */
  cornerThickness?: number;
  /** Corner border radius in pixels (default: 14) */
  cornerRadius?: number;
  /** Translucent mask color outside the fitted paper region (default: 'rgba(5, 22, 30, 0.50)') */
  maskColor?: string;
  /** Whether to dim the area outside the paper rectangle (default: true) */
  showMask?: boolean;
  /** Whether to draw a subtle hairline connecting the 4 corners (default: true) */
  showGuideOutline?: boolean;
  /** Opacity of the connecting hairline outline (default: 0.28) */
  outlineOpacity?: number;
  /** Accent color when searching for document (default: '#94a3b8') */
  searchingColor?: string;
  /** Accent color when document needs repositioning (default: '#f59e0b') */
  adjustingColor?: string;
  /** Accent color when document alignment & clarity are optimal (default: '#22c55e') */
  optimalColor?: string;
  /** Accent color during post-capture AI analysis (default: '#38bdf8') */
  analyzingColor?: string;
  /** Accent color when capture analysis completes (default: '#22c55e') */
  completeColor?: string;
  /** Whether to render the default readiness & optimality status pill (default: true) */
  showStatusPill?: boolean;
  /** Position of the status pill relative to the paper frame (default: 'top') */
  statusPosition?: 'top' | 'bottom';
  /** Custom style applied to the default status pill container */
  statusContainerStyle?: StyleProp<ViewStyle>;
  /** Custom style applied to the default status headline text */
  statusTextStyle?: StyleProp<TextStyle>;
  /** Custom style applied to the default alignment hint text */
  hintTextStyle?: StyleProp<TextStyle>;
  /** Reanimated corner snap timing duration in milliseconds (default: 180) */
  snapDurationMs?: number;
}

/**
 * Parameters passed to custom corner bracket slot renderers.
 */
export interface RenderDocumentCornerParams {
  corner: DocumentCornerPosition;
  readiness: DocumentReadinessState;
  color: string;
  point: Point2D;
  corners: DocumentQuad;
  pixelBox: PixelBoundingBox;
  angleHorizontalRad: number;
  angleVerticalRad: number;
  cornerLength: number;
  cornerThickness: number;
  cornerRadius: number;
}

/**
 * Parameters passed to custom document readiness status pill renderers.
 */
export interface RenderDocumentStatusParams {
  readiness: DocumentReadinessState;
  color: string;
  optimalityScore?: number;
  statusText?: string;
  hintText?: string;
  pixelBox: PixelBoundingBox;
}

/**
 * Parameters passed to custom centered content renderers inside the fitted document box.
 */
export interface RenderDocumentCenterParams {
  pixelBox: PixelBoundingBox;
  readiness: DocumentReadinessState;
}

/**
 * Parameters passed to headless full-canvas document guide renderers.
 */
export interface RenderDocumentGuideParams {
  readiness: DocumentReadinessState;
  color: string;
  optimalityScore?: number;
  statusText?: string;
  hintText?: string;
  corners: DocumentQuad;
  pixelBox: PixelBoundingBox;
  viewDimensions: ViewDimensions;
}

/**
 * Parameters passed to custom laser bar renderers inside ScannerAnimationOverlay.
 */
export interface RenderScannerLaserParams {
  accentColor: string;
  state: ScannerAnimationState;
  regionWidth: number;
}

/**
 * Parameters passed to custom scanner status pill renderers.
 */
export interface RenderScannerStatusParams {
  statusLabel?: string;
  state: ScannerAnimationState;
  accentColor: string;
}

/**
 * Parameters passed to headless full-canvas ScannerAnimationOverlay renderers.
 */
export interface RenderScannerOverlayParams {
  active: boolean;
  state: ScannerAnimationState;
  accentColor: string;
  statusLabel?: string;
  region?: PixelBoundingBox;
}

/**
 * Configuration options for CameraAI's built-in animated scanner sweep overlay.
 */
export interface ScannerAnimationConfig {
  /** Whether the scanner animation is enabled (default: true when object is passed) */
  enabled?: boolean;
  /** Current visual state controlling sweep cadence and veil (default: 'scanning') */
  state?: ScannerAnimationState;
  /** Primary laser beam and reticle corner accent color (default: '#f59e0b') */
  accentColor?: string;
  /** Whether to draw viewfinder reticle corner brackets around the active zone (default: true) */
  showGridCorners?: boolean;
  /** Corner arm length in pixels (default: 24) */
  cornerLength?: number;
  /** Corner border thickness in pixels (default: 2.5) */
  cornerThickness?: number;
  /** Corner radius in pixels (default: 10) */
  cornerRadius?: number;
  /** Whether to draw the animated horizontal laser beam (default: true) */
  showLaser?: boolean;
  /** Optional explicit screen pixel region constraining the laser & reticle */
  scanRegion?: PixelBoundingBox;
  /** Translucent backdrop veil color active during 'analyzing' (default: 'rgba(5, 22, 30, 0.34)') */
  veilColor?: string;
  /** Optional status caption pill rendered inside the reticle zone */
  statusLabel?: string;
  /** Custom status pill container style */
  statusContainerStyle?: StyleProp<ViewStyle>;
  /** Custom status pill text style */
  statusTextStyle?: StyleProp<TextStyle>;
  /** Duration in milliseconds for one vertical sweep pass in 'scanning' state (default: 1700) */
  sweepDurationMs?: number;
  /** Headless full-canvas custom scanner animation renderer */
  renderOverlay?: (params: RenderScannerOverlayParams) => React.ReactNode;
  /** Custom laser beam renderer inside the Reanimated track */
  renderLaser?: (params: RenderScannerLaserParams) => React.ReactNode;
  /** Custom scanner status badge renderer */
  renderStatusBadge?: (params: RenderScannerStatusParams) => React.ReactNode;
}

/**
 * Camera capture mode determining active VisionCamera hardware outputs.
 * - 'live': Binds frame processor stream output for real-time per-frame AI.
 * - 'photo': Binds high-resolution PhotoOutput for capture-first-then-analyze workflows.
 */
export type CameraCaptureMode = 'live' | 'photo';

/**
 * Options passed to CameraAIRef.capturePhoto().
 */
export interface CapturePhotoOptions {
  /** Camera flash mode during photo capture (default: 'off') */
  flashMode?: 'off' | 'on' | 'auto';
  /** Whether to play the native hardware shutter sound (default: false) */
  enableShutterSound?: boolean;
}

/**
 * Metadata returned by CameraAIRef.capturePhoto().
 */
export interface CapturedPhotoResult {
  /** Normalized file:// URI ready for <Image source={{ uri }} /> and static OCR/AI analyzers */
  uri: string;
  /** Raw local filesystem path returned by VisionCamera PhotoOutput */
  filePath: string;
  /** Raw photo buffer width in pixels */
  width: number;
  /** Raw photo buffer height in pixels */
  height: number;
  /** Upright width in pixels after accounting for 90/270-degree orientation */
  uprightWidth: number;
  /** Upright height in pixels after accounting for 90/270-degree orientation */
  uprightHeight: number;
  /** Photo orientation string reported by VisionCamera */
  orientation: string;
  /** Whether the captured image buffer is horizontally mirrored */
  isMirrored: boolean;
}

/**
 * Imperative ref handle exposed by <CameraAI ref={...} />.
 */
export interface CameraAIRef {
  /**
   * Captures a high-resolution still photo using VisionCamera PhotoOutput.
   * Requires captureMode="photo" or enablePhotoCapture={true}.
   */
  capturePhoto: (options?: CapturePhotoOptions) => Promise<CapturedPhotoResult | null>;
}

/**
 * Props for the CameraAI component.
 */
export interface CameraAIProps {
  /** Imperative ref handle (React 19) exposing capturePhoto() */
  ref?: React.Ref<CameraAIRef>;
  /** Alternate imperative ref prop for React 18 environments without ref-as-prop support */
  cameraRef?: React.Ref<CameraAIRef>;
  /** Pluggable AI inference processor */
  processor?: CameraProcessor;
  /** Capture pipeline mode: 'live' for real-time frame processing or 'photo' for still photo capture (default: 'live') */
  captureMode?: CameraCaptureMode;
  /** Keep PhotoOutput bound alongside frame processor during live mode (default: false for max device compatibility) */
  enablePhotoCapture?: boolean;
  /** Target still-photo resolution when capturePhoto() is enabled (default: { width: 1440, height: 1920 } 4:3, <=4 MP for ML Kit compatibility) */
  photoResolution?: StreamDimensions;
  /** Photo quality vs speed prioritization for PhotoOutput captures (default: 'balanced') */
  photoQualityPrioritization?: 'speed' | 'balanced' | 'quality';
  /** Enable built-in GPU-composited laser scanner overlay or pass granular ScannerAnimationConfig */
  scanAnimation?: boolean | ScannerAnimationConfig;
  /** Incrementing shutter flash trigger pulse synchronized with ScannerAnimationOverlay */
  flashTrigger?: number;
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
  /**
   * Optional theme configuration or token map (e.g. from @masumdev/rn-ui useTheme().colors).
   * Automatically tints bounding boxes, facial landmarks, document guide overlays, laser scanners, and permission fallback cards.
   */
  theme?: CameraAITheme | ThemeColorsLike;
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
  /** Optional smart document corner guide target (renders DocumentGuideOverlay automatically) */
  documentGuide?: DocumentGuideTarget;
  /** Declarative theme customization for DocumentGuideOverlay */
  documentGuideTheme?: DocumentGuideThemeConfig;
  /** Headless full-canvas custom renderer replacing DocumentGuideOverlay */
  renderDocumentGuide?: (params: RenderDocumentGuideParams) => React.ReactNode;
  /** Custom per-corner bracket renderer for DocumentGuideOverlay */
  renderDocumentCorner?: (params: RenderDocumentCornerParams) => React.ReactNode;
  /** Custom readiness & optimality status pill renderer for DocumentGuideOverlay */
  renderDocumentStatus?: (params: RenderDocumentStatusParams) => React.ReactNode;
  /** Custom center content renderer inside the fitted document area */
  renderDocumentCenter?: (params: RenderDocumentCenterParams) => React.ReactNode;
  /** Headless full-canvas custom renderer replacing ScannerAnimationOverlay */
  renderAnimationOverlay?: (params: RenderScannerOverlayParams) => React.ReactNode;
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
