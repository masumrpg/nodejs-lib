import { describe, test, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as CameraAIPkg from "@masumdev/rn-camera-ai";
import * as TFLitePkg from "@masumdev/rn-camera-ai-tflite";
import {
  CameraAI,
  type CameraProcessor,
  CameraAIError,
  CameraError,
  ModelLoadError,
  InferenceError,
  calculateScaleAndOffsets,
  transformNormalizedToPixelBox,
  mirrorHorizontalBox,
  rotateBox,
  clampBox,
  createTFLiteObjectDetector,
  parseDetectionOutputs,
  type BoundingBox,
  type DetectionResult,
} from "./helpers/adapter";
import { FIXTURE_STANDARD_TENSORS } from "./fixtures/ssd-tensors";
import { TEST_COCO_LABELS } from "./fixtures/labelmap";

describe("Tier 4: Real-World Multi-Feature Application Scenarios", () => {
  // ==========================================================================
  // Scenario 1: Complete MobileNet SSD Detection Pipeline
  // ==========================================================================
  test("Scenario 1: Complete MobileNet SSD detection pipeline (decoding -> filtering -> mapping -> projection)", () => {
    // 1. Decode 4-tensors with threshold 0.60 and top 3 results
    const detections = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
      confidenceThreshold: 0.6,
      maxResults: 3,
      labels: TEST_COCO_LABELS,
      labelOffset: 0,
    });

    // Expect exactly 3 detections: person (0.94), bicycle (0.88), car (0.82)
    expect(detections.length).toBe(3);
    expect(detections[0].label).toBe("person");
    expect(detections[0].confidence).toBeCloseTo(0.94, 2);
    expect(detections[1].label).toBe("bicycle");
    expect(detections[1].confidence).toBeCloseTo(0.88, 2);
    expect(detections[2].label).toBe("car");
    expect(detections[2].confidence).toBeCloseTo(0.82, 2);

    // 2. Project detections onto mobile viewport in Cover mode
    // View: 1080x2400 (aspect 0.45), Stream: 1080x1920 (aspect 0.5625)
    // Scale = max(1080/1080=1.0, 2400/1920=1.25) = 1.25
    // Rendered = 1350 x 2400, offsetX = (1080 - 1350) / 2 = -135, offsetY = 0
    const viewDimensions = { width: 1080, height: 2400 };
    const streamDimensions = { width: 1080, height: 1920 };

    const topDetection = detections[0]; // normalized: [x: 0.2, y: 0.1, w: 0.4, h: 0.7]
    const pixelBox = transformNormalizedToPixelBox(topDetection.boundingBox, {
      viewDimensions,
      streamDimensions,
      resizeMode: "cover",
      isMirrored: false,
    });

    // Derived expected coordinates:
    // x = 0.2 * 1350 - 135 = 135
    // y = 0.1 * 2400 + 0 = 240
    // width = 0.4 * 1350 = 540
    // height = 0.7 * 2400 = 1680
    expect(pixelBox.x).toBeCloseTo(135, 1);
    expect(pixelBox.y).toBeCloseTo(240, 1);
    expect(pixelBox.width).toBeCloseTo(540, 1);
    expect(pixelBox.height).toBeCloseTo(1680, 1);

    // Bounding box must be within the viewport vertically and horizontally
    expect(pixelBox.y + pixelBox.height).toBeLessThanOrEqual(
      viewDimensions.height,
    );
  });

  // ==========================================================================
  // Scenario 2: Front Camera Video Stream Overlay Projection
  // ==========================================================================
  test("Scenario 2: Front camera video stream overlay projection (mirroring -> rotation -> cover scaling)", () => {
    // User face detected on left side of sensor frame: x=0.1, y=0.2, w=0.3, h=0.3
    const faceDetection: BoundingBox = {
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.3,
    };
    const viewDimensions = { width: 390, height: 844 };
    const streamDimensions = { width: 720, height: 1280 };

    // Portrait + Front Camera (Mirrored)
    const portraitMirroredBox = transformNormalizedToPixelBox(faceDetection, {
      viewDimensions,
      streamDimensions,
      resizeMode: "cover",
      isMirrored: true,
      orientation: "portrait",
    });

    // In mirrored coordinates: x* = 1 - 0.1 - 0.3 = 0.6 (moved to right side)
    // The rendered box x center should be in the right half (> width / 2)
    const boxCenterX = portraitMirroredBox.x + portraitMirroredBox.width / 2;
    expect(boxCenterX).toBeGreaterThan(viewDimensions.width / 2);

    // Test dynamic rotation to Landscape Left (90 deg CW)
    const landscapeRotatedBox = transformNormalizedToPixelBox(faceDetection, {
      viewDimensions,
      streamDimensions,
      resizeMode: "cover",
      isMirrored: false,
      orientation: "landscape-left",
    });

    // Must yield positive dimensions and finite coordinates
    expect(landscapeRotatedBox.width).toBeGreaterThan(0);
    expect(landscapeRotatedBox.height).toBeGreaterThan(0);
    expect(Number.isFinite(landscapeRotatedBox.x)).toBe(true);
    expect(Number.isFinite(landscapeRotatedBox.y)).toBe(true);
  });

  // ==========================================================================
  // Scenario 3: Dynamic Detector Reconfiguration & Lifecycle
  // ==========================================================================
  test("Scenario 3: Dynamic detector reconfiguration and lifecycle (init -> configure -> process -> reconfigure -> dispose)", async () => {
    // 1. Initialize detector
    const detector = await createTFLiteObjectDetector({
      model: "models/detect.tflite",
      confidenceThreshold: 0.5,
      maxResults: 10,
    });
    expect(detector.status).toBe("ready");

    // 2. Process frame with threshold 0.50 -> 5 detections
    const d1 = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
      confidenceThreshold: 0.5,
      maxResults: 10,
    });
    expect(d1.length).toBe(5);

    // 3. Dynamically tune sensitivity to 0.85
    detector.setConfidenceThreshold(0.85);
    const d2 = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
      confidenceThreshold: 0.85,
      maxResults: 10,
    });
    expect(d2.length).toBe(2); // Only person (0.94) and bicycle (0.88)

    // 4. Dynamically cap maxResults to 1
    detector.setMaxResults(1);
    const d3 = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
      confidenceThreshold: 0.85,
      maxResults: 1,
    });
    expect(d3.length).toBe(1);
    expect(d3[0].confidence).toBeCloseTo(0.94, 2);

    // 5. Dispose detector
    detector.dispose?.();
    expect(detector.status).toBe("idle");
    expect(() => detector.processFrame({})).toThrow(InferenceError);
  });

  // ==========================================================================
  // Scenario 4: Error Resilience & Fallback Handling
  // ==========================================================================
  test("Scenario 4: Error resilience & fallback handling (simulated GPU delegate fallback -> CPU inference)", async () => {
    let fallbackEmitted = false;
    let fallbackFrom = "";
    let fallbackTo = "";

    process.env.SIMULATE_GPU_FAILURE = "true";
    try {
      // 1. Attempt initialization with GPU enabled on unsupported device
      const detector = await createTFLiteObjectDetector({
        model: "models/detect.tflite",
        useGpu: true,
        onDelegateFallback: (requested, fallback) => {
          fallbackEmitted = true;
          fallbackFrom = requested;
          fallbackTo = fallback;
        },
      });

      // 2. Verify fallback callback details
      expect(fallbackEmitted).toBe(true);
      expect(fallbackFrom).toBe("android-gpu");
      expect(fallbackTo).toBe("cpu");
      expect(detector.activeDelegate).toBe("cpu");
      expect(detector.status).toBe("ready");

      // 3. Verify error hierarchy resilience
      const simulatedInferenceError = new InferenceError(
        "Frame buffer memory allocation failed",
        "ERR_BUFFER_ALLOC",
        new Error("POSIX ENOMEM"),
      );
      expect(simulatedInferenceError).toBeInstanceOf(CameraAIError);
      expect(simulatedInferenceError.code).toBe("ERR_BUFFER_ALLOC");
      expect(simulatedInferenceError.cause).toBeDefined();
    } finally {
      delete process.env.SIMULATE_GPU_FAILURE;
    }
  });

  // ==========================================================================
  // Scenario 5: Package Exports & TypeScript Contract Verification
  // ==========================================================================
  test("Scenario 5: Package exports and TypeScript contract verification matching PROJECT.md", () => {
    // Verify @masumdev/rn-camera-ai package exports contract directly
    expect(typeof CameraAIPkg.CameraAI).toBe("function");
    expect(typeof CameraAIPkg.DetectionOverlay).toBe("function");
    expect(typeof CameraAIPkg.PermissionFallbackView).toBe("function");
    expect(typeof CameraAIPkg.transformNormalizedToPixelBox).toBe("function");
    expect(typeof CameraAIPkg.calculateScaleAndOffsets).toBe("function");
    expect(typeof CameraAIPkg.mirrorHorizontalBox).toBe("function");
    expect(typeof CameraAIPkg.rotateBox).toBe("function");
    expect(typeof CameraAIPkg.clampBox).toBe("function");

    // Verify error class constructors directly on package exports
    expect(typeof CameraAIPkg.CameraAIError).toBe("function");
    expect(typeof CameraAIPkg.CameraError).toBe("function");
    expect(typeof CameraAIPkg.ModelLoadError).toBe("function");
    expect(typeof CameraAIPkg.InferenceError).toBe("function");

    // Verify @masumdev/rn-camera-ai-tflite package exports contract directly
    expect(typeof TFLitePkg.createTFLiteObjectDetector).toBe("function");
    expect(typeof TFLitePkg.parseDetectionOutputs).toBe("function");

    // Verify re-exported adapter matches package contracts
    expect(CameraAI).toBe(CameraAIPkg.CameraAI);
    expect(createTFLiteObjectDetector).toBe(TFLitePkg.createTFLiteObjectDetector);
    expect(parseDetectionOutputs).toBe(TFLitePkg.parseDetectionOutputs);

    // Check workspace packages if on disk
    const rootDir = path.resolve(__dirname, "../../");
    const packagesDir = path.join(rootDir, "packages");
    if (fs.existsSync(packagesDir)) {
      const entries = fs.readdirSync(packagesDir);
      expect(entries).toContain("rn-camera-ai");
      expect(entries).toContain("rn-camera-ai-tflite");
      expect(entries).toContain("rn-camera-ai-mlkit");
    }
  });
});
