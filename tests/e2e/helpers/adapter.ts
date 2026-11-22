/**
 * E2E Test Contract Adapter & Re-export Barrel.
 *
 * Imports directly from @masumdev/rn-camera-ai and @masumdev/rn-camera-ai-tflite packages.
 * No dummy stubs, facades, or rogue deliverable authoring.
 */

// Native mocking setup preload
import "../setup/mock-native";

// Re-export CameraAI component, overlay, and views from packages/rn-camera-ai
export {
  CameraAI,
  DetectionOverlay,
  PermissionFallbackView,
} from "@masumdev/rn-camera-ai";

// Re-export core coordinate math from packages/rn-camera-ai
export {
  clampBox,
  calculateScaleAndOffsets,
  mirrorHorizontalBox,
  rotateBox,
  transformNormalizedToPixelBox,
} from "@masumdev/rn-camera-ai";

// Re-export error hierarchy from packages/rn-camera-ai
export {
  CameraAIError,
  CameraError,
  ModelLoadError,
  InferenceError,
} from "@masumdev/rn-camera-ai";

// Re-export contract types from packages/rn-camera-ai
export type {
  BoundingBox,
  PixelBoundingBox,
  DetectionResult,
  ModelStatus,
  CameraProcessor,
  CameraAIProps,
  ViewDimensions,
  StreamDimensions,
  FrameOrientation,
  TransformOptions,
  ScaleAndOffsets,
} from "@masumdev/rn-camera-ai";

// Re-export detector factory, parser, and types from packages/rn-camera-ai-tflite
export {
  createTFLiteObjectDetector,
  parseDetectionOutputs,
} from "@masumdev/rn-camera-ai-tflite";

export type {
  TFLiteModelSource,
  TFLiteObjectDetectorConfig,
  TFLiteObjectDetector,
  ParseDetectionOptions,
} from "@masumdev/rn-camera-ai-tflite";

// Re-export ML Kit OCR adapter factory, parser, and types from packages/rn-camera-ai-mlkit
export {
  createMLKitTextRecognizer,
  parseMLKitTextResult,
  classifyOcrEntity,
  extractStructuredOcrData,
  recognizeTextFromUri,
} from "@masumdev/rn-camera-ai-mlkit";

export type {
  MLKitTextRecognizer,
  MLKitTextRecognizerConfig,
  MLKitTextRecognitionResult,
  OcrEntityFilter,
  StructuredOcrEntities,
} from "@masumdev/rn-camera-ai-mlkit";
