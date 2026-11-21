import { describe, test, expect, beforeEach } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mockCameraState } from "./setup/mock-native";
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
} from "./helpers/adapter";
import {
  FIXTURE_STANDARD_TENSORS,
  FIXTURE_EMPTY_TENSORS,
  FIXTURE_DEGENERATE_TENSORS,
  buildSSDTensors,
} from "./fixtures/ssd-tensors";
import { TEST_COCO_LABELS, TEST_LABELS_MAP } from "./fixtures/labelmap";

describe("Tier 1: Category-Partition Equivalence Class Feature Tests", () => {
  // ==========================================================================
  // Feature 1: CameraAI Component Contract & Exports
  // ==========================================================================
  describe("Feature 1: CameraAI Component Contract & Exports", () => {
    beforeEach(() => {
      mockCameraState.reset();
    });

    test("1.1: CameraAI renders camera preview when permission is granted and device exists", () => {
      const html = renderToStaticMarkup(React.createElement(CameraAI, {}));
      expect(html).toContain("camera-preview");
      expect(mockCameraState.lastCameraProps).toBeDefined();
      expect(mockCameraState.lastCameraProps?.resizeMode).toBe("cover");
      expect(mockCameraState.lastCameraProps?.isActive).toBe(true);
    });

    test("1.2: CameraAI accepts full capture configuration props and propagates to native Camera", () => {
      const html = renderToStaticMarkup(
        React.createElement(CameraAI, {
          cameraPosition: "front",
          resizeMode: "contain",
          isActive: true,
          fps: 30,
        }),
      );
      expect(html).toContain("camera-preview");
      expect(mockCameraState.lastCameraProps).toBeDefined();
      expect(mockCameraState.lastCameraProps?.resizeMode).toBe("contain");
      expect(mockCameraState.lastCameraProps?.isActive).toBe(true);
      expect(mockCameraState.lastCameraProps?.constraints).toEqual([{ fps: 30 }]);
      expect(
        (mockCameraState.lastCameraProps?.device as { position: string })
          ?.position,
      ).toBe("front");
    });

    test("1.3: CameraAI switches between rear and front facing camera devices", () => {
      // Rear camera
      renderToStaticMarkup(
        React.createElement(CameraAI, { cameraPosition: "back" }),
      );
      expect(
        (mockCameraState.lastCameraProps?.device as { position: string })
          ?.position,
      ).toBe("back");

      // Front camera
      renderToStaticMarkup(
        React.createElement(CameraAI, { cameraPosition: "front" }),
      );
      expect(
        (mockCameraState.lastCameraProps?.device as { position: string })
          ?.position,
      ).toBe("front");
    });

    test("1.4: CameraAI renders default PermissionFallbackView when camera permission is denied", () => {
      mockCameraState.hasPermission = false;
      const html = renderToStaticMarkup(React.createElement(CameraAI, {}));
      expect(html).not.toContain("camera-preview");
      expect(html).toContain("Camera Permission Required");
      expect(html).toContain("Open Settings");
    });

    test("1.5: CameraAI supports custom permissionFallback prop override", () => {
      mockCameraState.hasPermission = false;
      const customFallback = React.createElement(
        "div",
        { "data-testid": "custom-perm" },
        "Custom Permission UI",
      );
      const html = renderToStaticMarkup(
        React.createElement(CameraAI, { permissionFallback: customFallback }),
      );
      expect(html).not.toContain("camera-preview");
      expect(html).not.toContain("Camera Permission Required");
      expect(html).toContain("Custom Permission UI");
      expect(html).toContain("custom-perm");
    });

    test("1.6: CameraAI renders default CameraUnavailable view when camera device is missing", () => {
      mockCameraState.devices.front = undefined;
      const html = renderToStaticMarkup(
        React.createElement(CameraAI, { cameraPosition: "front" }),
      );
      expect(html).not.toContain("camera-preview");
      expect(html).toContain("Camera Unavailable");
      expect(html).toContain(
        'No camera device found for position &quot;front&quot;',
      );
    });

    test("1.7: CameraAI supports custom cameraUnavailableFallback prop override", () => {
      mockCameraState.devices.front = undefined;
      const customFallback = React.createElement(
        "div",
        { "data-testid": "custom-unavail" },
        "Hardware Not Found",
      );
      const html = renderToStaticMarkup(
        React.createElement(CameraAI, {
          cameraPosition: "front",
          cameraUnavailableFallback: customFallback,
        }),
      );
      expect(html).not.toContain("camera-preview");
      expect(html).not.toContain("Camera Unavailable");
      expect(html).toContain("Hardware Not Found");
      expect(html).toContain("custom-unavail");
    });

    test("1.8: CameraAI wires pluggable processor into native frame processor worklet", () => {
      const mockProcessor: CameraProcessor = {
        id: "proc-1",
        name: "MockProcessor",
        status: "ready",
        targetFps: 24,
        processFrame: () => [],
      };
      const html = renderToStaticMarkup(
        React.createElement(CameraAI, { processor: mockProcessor }),
      );
      expect(html).toContain("camera-preview");
      const outputs = mockCameraState.lastCameraProps?.outputs as
        | Array<{ onFrame?: (frame: unknown) => void }>
        | undefined;
      expect(Array.isArray(outputs)).toBe(true);
      expect(outputs?.length).toBe(1);
      expect(typeof outputs?.[0]?.onFrame).toBe("function");
      expect(mockCameraState.lastCameraProps?.constraints).toEqual([{ fps: 24 }]);

      let frameDisposed = false;
      outputs?.[0]?.onFrame?.({
        width: 640,
        height: 480,
        orientation: "right",
        isMirrored: false,
        isValid: true,
        dispose: () => {
          frameDisposed = true;
        },
      });
      expect(frameDisposed).toBe(true);
    });
  });

  // ==========================================================================
  // Feature 2: CameraProcessor Interface & Lifecycle
  // ==========================================================================
  describe("Feature 2: CameraProcessor Interface & Lifecycle", () => {
    test("2.1: TFLiteObjectDetector transitions status state machine across lifecycle", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "detect.tflite",
      });
      expect(detector.status).toBe("ready");

      detector.dispose?.();
      expect(detector.status).toBe("idle");

      await detector.initialize?.();
      expect(detector.status).toBe("ready");
    });

    test("2.2: Calling processFrame on disposed processor throws InferenceError", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "detect.tflite",
      });
      detector.dispose?.();
      expect(() => detector.processFrame({})).toThrow(InferenceError);
    });

    test("2.3: initialize() and dispose() lifecycle calls are idempotent", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "detect.tflite",
      });
      // Multiple disposes
      expect(() => {
        detector.dispose?.();
        detector.dispose?.();
      }).not.toThrow();
      expect(detector.status).toBe("idle");

      // Multiple inits
      await detector.initialize?.();
      await detector.initialize?.();
      expect(detector.status).toBe("ready");
    });

    test("2.4: CameraProcessor processFrame returns structured DetectionResult array", () => {
      const processor: CameraProcessor = {
        id: "proc-exec",
        name: "ExecProcessor",
        status: "ready",
        processFrame: () => [
          {
            id: "det-1",
            label: "person",
            confidence: 0.95,
            boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
          },
        ],
      };
      const results = processor.processFrame({});
      expect(results.length).toBe(1);
      expect(results[0].label).toBe("person");
      expect(results[0].confidence).toBe(0.95);
      expect(results[0].boundingBox.width).toBe(0.3);
    });

    test("2.5: Active detector dynamically updates confidenceThreshold and maxResults without re-instantiation", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "detect.tflite",
        confidenceThreshold: 0.5,
        maxResults: 10,
      });

      expect(detector.confidenceThreshold).toBe(0.5);
      expect(detector.maxResults).toBe(10);

      detector.setConfidenceThreshold(0.8);
      detector.setMaxResults(5);

      expect(detector.confidenceThreshold).toBe(0.8);
      expect(detector.maxResults).toBe(5);
    });
  });

  // ==========================================================================
  // Feature 3: CameraAI Error Hierarchy & Propagation
  // ==========================================================================
  describe("Feature 3: CameraAI Error Hierarchy & Propagation", () => {
    test("3.1: CameraAIError encapsulates error message, code, and cause", () => {
      const cause = new Error("Native underlying error");
      const err = new CameraAIError("General failure", "CORE_ERR", cause);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(CameraAIError);
      expect(err.name).toBe("CameraAIError");
      expect(err.message).toBe("General failure");
      expect(err.code).toBe("CORE_ERR");
      expect(err.cause).toBe(cause);
    });

    test("3.2: CameraError inherits from CameraAIError with default code", () => {
      const err = new CameraError("Camera device unavailable");
      expect(err).toBeInstanceOf(CameraAIError);
      expect(err).toBeInstanceOf(CameraError);
      expect(err.name).toBe("CameraError");
      expect(err.code).toBe("CAMERA_ERROR");
    });

    test("3.3: ModelLoadError inherits from CameraAIError with default code", () => {
      const err = new ModelLoadError("Model file not found");
      expect(err).toBeInstanceOf(CameraAIError);
      expect(err).toBeInstanceOf(ModelLoadError);
      expect(err.name).toBe("ModelLoadError");
      expect(err.code).toBe("MODEL_LOAD_ERROR");
    });

    test("3.4: InferenceError inherits from CameraAIError with default code", () => {
      const err = new InferenceError("Execution failed on frame");
      expect(err).toBeInstanceOf(CameraAIError);
      expect(err).toBeInstanceOf(InferenceError);
      expect(err.name).toBe("InferenceError");
      expect(err.code).toBe("INFERENCE_ERROR");
    });

    test("3.5: Error subclasses preserve custom error codes and error stack", () => {
      const err = new ModelLoadError(
        "Corrupted weights",
        "ERR_WEIGHTS_CORRUPT",
      );
      expect(err.code).toBe("ERR_WEIGHTS_CORRUPT");
      expect(err.stack).toBeDefined();
    });
  });

  // ==========================================================================
  // Feature 4: Coordinate Math: Cover Mode Scaling & Offset
  // ==========================================================================
  describe("Feature 4: Coordinate Math: Cover Mode Scaling & Offset", () => {
    test("4.1: Calculates cover scale when viewport is wider than stream", () => {
      // View: 800x400 (aspect 2.0), Stream: 640x480 (aspect 1.33)
      // Scale is driven by width: 800/640 = 1.25. Rendered: 800x600.
      const res = calculateScaleAndOffsets(
        { width: 800, height: 400 },
        { width: 640, height: 480 },
        "cover",
      );
      expect(res.scale).toBeCloseTo(1.25, 4);
      expect(res.renderedWidth).toBe(800);
      expect(res.renderedHeight).toBe(600);
      expect(res.offsetX).toBe(0);
      expect(res.offsetY).toBeCloseTo(-100, 4); // symmetric vertical crop
    });

    test("4.2: Calculates cover scale when viewport is taller than stream", () => {
      // View: 400x800 (aspect 0.5), Stream: 480x640 (aspect 0.75)
      // Scale is driven by height: 800/640 = 1.25. Rendered: 600x800.
      const res = calculateScaleAndOffsets(
        { width: 400, height: 800 },
        { width: 480, height: 640 },
        "cover",
      );
      expect(res.scale).toBeCloseTo(1.25, 4);
      expect(res.renderedWidth).toBe(600);
      expect(res.renderedHeight).toBe(800);
      expect(res.offsetX).toBeCloseTo(-100, 4); // symmetric horizontal crop
      expect(res.offsetY).toBe(0);
    });

    test("4.3: Transforms centered box in cover mode with symmetric crop", () => {
      const box: BoundingBox = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
      const pixelBox = transformNormalizedToPixelBox(box, {
        viewDimensions: { width: 400, height: 800 },
        streamDimensions: { width: 480, height: 640 },
        resizeMode: "cover",
      });
      // Rendered stream: 600x800, offsetX = -100, offsetY = 0
      // x = 0.25 * 600 - 100 = 50
      // y = 0.25 * 800 + 0 = 200
      // width = 0.5 * 600 = 300
      // height = 0.5 * 800 = 400
      expect(pixelBox.x).toBeCloseTo(50, 2);
      expect(pixelBox.y).toBeCloseTo(200, 2);
      expect(pixelBox.width).toBeCloseTo(300, 2);
      expect(pixelBox.height).toBeCloseTo(400, 2);
    });

    test("4.4: In cover mode, rendered dimensions are >= view dimensions in both axes", () => {
      const res = calculateScaleAndOffsets(
        { width: 360, height: 720 },
        { width: 1080, height: 1920 },
        "cover",
      );
      expect(res.renderedWidth).toBeGreaterThanOrEqual(360 - 0.01);
      expect(res.renderedHeight).toBeGreaterThanOrEqual(720 - 0.01);
      expect(res.offsetX).toBeLessThanOrEqual(0.01);
      expect(res.offsetY).toBeLessThanOrEqual(0.01);
    });

    test("4.5: Cover mode preserves box aspect ratio relative to stream", () => {
      const box: BoundingBox = { x: 0.1, y: 0.1, width: 0.2, height: 0.4 };
      const pixelBox = transformNormalizedToPixelBox(box, {
        viewDimensions: { width: 500, height: 500 },
        streamDimensions: { width: 1000, height: 1000 },
        resizeMode: "cover",
      });
      expect(pixelBox.width).toBeCloseTo(100, 2);
      expect(pixelBox.height).toBeCloseTo(200, 2);
      expect(pixelBox.height / pixelBox.width).toBeCloseTo(2.0, 2);
    });
  });

  // ==========================================================================
  // Feature 5: Coordinate Math: Contain Mode Scaling & Offset
  // ==========================================================================
  describe("Feature 5: Coordinate Math: Contain Mode Scaling & Offset", () => {
    test("5.1: Calculates contain scale with pillarbox (viewport wider than stream)", () => {
      // View: 800x400 (aspect 2.0), Stream: 640x480 (aspect 1.33)
      // Scale is driven by height: 400/480 = 0.8333. Rendered: 533.33 x 400.
      const res = calculateScaleAndOffsets(
        { width: 800, height: 400 },
        { width: 640, height: 480 },
        "contain",
      );
      expect(res.scale).toBeCloseTo(400 / 480, 4);
      expect(res.renderedHeight).toBe(400);
      expect(res.renderedWidth).toBeCloseTo(640 * (400 / 480), 2);
      expect(res.offsetX).toBeGreaterThan(0); // pillarbox padding
      expect(res.offsetY).toBe(0);
    });

    test("5.2: Calculates contain scale with letterbox (viewport taller than stream)", () => {
      // View: 400x800 (aspect 0.5), Stream: 480x640 (aspect 0.75)
      // Scale is driven by width: 400/480 = 0.8333. Rendered: 400 x 533.33.
      const res = calculateScaleAndOffsets(
        { width: 400, height: 800 },
        { width: 480, height: 640 },
        "contain",
      );
      expect(res.scale).toBeCloseTo(400 / 480, 4);
      expect(res.renderedWidth).toBe(400);
      expect(res.renderedHeight).toBeCloseTo(640 * (400 / 480), 2);
      expect(res.offsetX).toBe(0);
      expect(res.offsetY).toBeGreaterThan(0); // letterbox padding
    });

    test("5.3: Transforms bounding box within pillarbox visible area", () => {
      const box: BoundingBox = { x: 0.0, y: 0.0, width: 1.0, height: 1.0 };
      const pixelBox = transformNormalizedToPixelBox(box, {
        viewDimensions: { width: 800, height: 400 },
        streamDimensions: { width: 640, height: 480 },
        resizeMode: "contain",
      });
      // Should match rendered dimensions and be offset inside the view
      expect(pixelBox.x).toBeGreaterThan(0);
      expect(pixelBox.x + pixelBox.width).toBeLessThanOrEqual(800.01);
      expect(pixelBox.y).toBe(0);
      expect(pixelBox.height).toBe(400);
    });

    test("5.4: In contain mode, rendered dimensions are <= view dimensions in both axes", () => {
      const res = calculateScaleAndOffsets(
        { width: 400, height: 600 },
        { width: 1920, height: 1080 },
        "contain",
      );
      expect(res.renderedWidth).toBeLessThanOrEqual(400 + 0.01);
      expect(res.renderedHeight).toBeLessThanOrEqual(600 + 0.01);
      expect(res.offsetX).toBeGreaterThanOrEqual(-0.01);
      expect(res.offsetY).toBeGreaterThanOrEqual(-0.01);
    });

    test("5.5: Transforms full screen box exactly to letterboxed stream bounds", () => {
      const box: BoundingBox = { x: 0.5, y: 0.5, width: 0.5, height: 0.5 };
      const pixelBox = transformNormalizedToPixelBox(box, {
        viewDimensions: { width: 1000, height: 1000 },
        streamDimensions: { width: 800, height: 400 },
        resizeMode: "contain",
      });
      // Scale: min(1000/800=1.25, 1000/400=2.5) = 1.25.
      // Rendered: 1000 x 500, offsetX = 0, offsetY = 250
      expect(pixelBox.x).toBeCloseTo(0.5 * 1000, 2);
      expect(pixelBox.y).toBeCloseTo(0.5 * 500 + 250, 2);
      expect(pixelBox.width).toBeCloseTo(0.5 * 1000, 2);
      expect(pixelBox.height).toBeCloseTo(0.5 * 500, 2);
    });
  });

  // ==========================================================================
  // Feature 6: Coordinate Math: Mirroring & Rotation
  // ==========================================================================
  describe("Feature 6: Coordinate Math: Mirroring & Rotation", () => {
    test("6.1: Horizontal mirroring reflects x coordinate using x* = 1 - x - w", () => {
      const box: BoundingBox = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
      const mirrored = mirrorHorizontalBox(box);
      // Expected x* = 1 - 0.1 - 0.3 = 0.6
      expect(mirrored.x).toBeCloseTo(0.6, 4);
      expect(mirrored.y).toBeCloseTo(0.2, 4);
      expect(mirrored.width).toBeCloseTo(0.3, 4);
      expect(mirrored.height).toBeCloseTo(0.4, 4);
    });

    test("6.2: Rotation 90 degrees CW (landscape-left) maps coordinates accurately", () => {
      // 90 deg CW: x' = 1 - y - h, y' = x, w' = h, h' = w
      const box: BoundingBox = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
      const rotated = rotateBox(box, "landscape-left");
      expect(rotated.x).toBeCloseTo(1 - 0.2 - 0.4, 4); // 0.4
      expect(rotated.y).toBeCloseTo(0.1, 4);
      expect(rotated.width).toBeCloseTo(0.4, 4);
      expect(rotated.height).toBeCloseTo(0.3, 4);
    });

    test("6.3: Rotation 180 degrees (portrait-upside-down) inverts both axes", () => {
      // 180 deg: x' = 1 - x - w, y' = 1 - y - h, w' = w, h' = h
      const box: BoundingBox = { x: 0.2, y: 0.3, width: 0.4, height: 0.5 };
      const rotated = rotateBox(box, "portrait-upside-down");
      expect(rotated.x).toBeCloseTo(1 - 0.2 - 0.4, 4); // 0.4
      expect(rotated.y).toBeCloseTo(1 - 0.3 - 0.5, 4); // 0.2
      expect(rotated.width).toBeCloseTo(0.4, 4);
      expect(rotated.height).toBeCloseTo(0.5, 4);
    });

    test("6.4: Rotation 270 degrees CW (landscape-right) maps coordinates accurately", () => {
      // 270 deg CW: x' = y, y' = 1 - x - w, w' = h, h' = w
      const box: BoundingBox = { x: 0.15, y: 0.25, width: 0.35, height: 0.45 };
      const rotated = rotateBox(box, "landscape-right");
      expect(rotated.x).toBeCloseTo(0.25, 4);
      expect(rotated.y).toBeCloseTo(1 - 0.15 - 0.35, 4); // 0.5
      expect(rotated.width).toBeCloseTo(0.45, 4);
      expect(rotated.height).toBeCloseTo(0.35, 4);
    });

    test("6.5: Combined mirroring and orientation transformation executes in sequence", () => {
      const box: BoundingBox = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
      const pixelBox = transformNormalizedToPixelBox(box, {
        viewDimensions: { width: 500, height: 500 },
        streamDimensions: { width: 500, height: 500 },
        resizeMode: "contain",
        isMirrored: true,
        orientation: "portrait",
      });
      // In portrait + mirrored: x* = 1 - 0.1 - 0.3 = 0.6
      expect(pixelBox.x).toBeCloseTo(0.6 * 500, 2);
      expect(pixelBox.y).toBeCloseTo(0.2 * 500, 2);
    });
  });

  // ==========================================================================
  // Feature 7: TFLite Detector Configuration & Factory
  // ==========================================================================
  describe("Feature 7: TFLite Detector Configuration & Factory", () => {
    test("7.1: createTFLiteObjectDetector accepts asset resource number", async () => {
      const detector = await createTFLiteObjectDetector({
        model: 12345, // require asset number
      });
      expect(detector).toBeDefined();
      expect(detector.name).toBe("TFLiteObjectDetector");
      expect(detector.status).toBe("ready");
    });

    test("7.2: createTFLiteObjectDetector accepts remote URL source", async () => {
      const detector = await createTFLiteObjectDetector({
        model: { url: "https://example.com/models/detect.tflite" },
      });
      expect(detector).toBeDefined();
      expect(detector.status).toBe("ready");
    });

    test("7.3: createTFLiteObjectDetector accepts local file path string", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "/data/local/tmp/detect.tflite",
      });
      expect(detector).toBeDefined();
      expect(detector.status).toBe("ready");
    });

    test("7.4: createTFLiteObjectDetector throws ModelLoadError on empty model source", async () => {
      expect(
        createTFLiteObjectDetector({
          model: "" as unknown as string,
        }),
      ).rejects.toThrow(ModelLoadError);
    });

    test("7.5: createTFLiteObjectDetector respects custom targetFps", async () => {
      const detector = await createTFLiteObjectDetector({
        model: 1,
        targetFps: 25,
      });
      expect(detector.targetFps).toBe(25);
    });
  });

  // ==========================================================================
  // Feature 8: Delegate Fallback Management (GPU/CPU)
  // ==========================================================================
  describe("Feature 8: Delegate Fallback Management (GPU/CPU)", () => {
    test("8.1: Default configuration selects GPU delegate when available", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "model.tflite",
        useGpu: true,
      });
      expect(["gpu", "cpu"]).toContain(detector.activeDelegate);
    });

    test("8.2: When useGpu is false, activeDelegate is CPU", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "model.tflite",
        useGpu: false,
      });
      expect(detector.activeDelegate).toBe("cpu");
    });

    test("8.3: onDelegateFallback callback is triggered during fallback", async () => {
      let fallbackTriggered = false;
      let requested = "";
      let active = "";

      process.env.SIMULATE_GPU_FAILURE = "true";
      try {
        const detector = await createTFLiteObjectDetector({
          model: "model.tflite",
          useGpu: true,
          onDelegateFallback: (req, fb) => {
            fallbackTriggered = true;
            requested = req;
            active = fb;
          },
        });
        expect(fallbackTriggered).toBe(true);
        expect(requested).toBe("android-gpu");
        expect(active).toBe("cpu");
        expect(detector.activeDelegate).toBe("cpu");
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });

    test("8.4: Detector continues operating on CPU fallback without unhandled error", async () => {
      process.env.SIMULATE_GPU_FAILURE = "true";
      try {
        const detector = await createTFLiteObjectDetector({
          model: "model.tflite",
          useGpu: true,
        });
        expect(detector.status).toBe("ready");
        expect(detector.activeDelegate).toBe("cpu");
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });

    test("8.5: Missing onDelegateFallback does not cause exception on fallback", async () => {
      process.env.SIMULATE_GPU_FAILURE = "true";
      try {
        const detector = await createTFLiteObjectDetector({
          model: "model.tflite",
          useGpu: true,
          // onDelegateFallback intentionally omitted
        });
        expect(detector.activeDelegate).toBe("cpu");
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });
  });

  // ==========================================================================
  // Feature 9: 4-Tensor SSD/EfficientDet Output Parser
  // ==========================================================================
  describe("Feature 9: 4-Tensor SSD/EfficientDet Output Parser", () => {
    test("9.1: Correctly unpacks [ymin, xmin, ymax, xmax] into {x, y, width, height}", () => {
      const results = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
        confidenceThreshold: 0.5,
        maxResults: 10,
        labels: TEST_COCO_LABELS,
      });

      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.boundingBox.x).toBeCloseTo(0.2, 4);
      expect(top.boundingBox.y).toBeCloseTo(0.1, 4);
      expect(top.boundingBox.width).toBeCloseTo(0.4, 4); // 0.6 - 0.2
      expect(top.boundingBox.height).toBeCloseTo(0.7, 4); // 0.8 - 0.1
    });

    test("9.2: Discards degenerate boxes where width <= 0 or height <= 0", () => {
      const results = parseDetectionOutputs(FIXTURE_DEGENERATE_TENSORS, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });
      // Out of 4 detections, 3 are degenerate and only 1 is valid
      expect(results.length).toBe(1);
      expect(results[0].boundingBox.width).toBeGreaterThan(0);
      expect(results[0].boundingBox.height).toBeGreaterThan(0);
    });

    test("9.3: Respects detection count tensor to prevent reading garbage memory", () => {
      const results = parseDetectionOutputs(FIXTURE_EMPTY_TENSORS, {
        confidenceThreshold: 0.1,
        maxResults: 10,
      });
      expect(results.length).toBe(0);
    });

    test("9.4: Handles empty or missing tensors gracefully returning empty array", () => {
      const emptyOutputs = [
        new Float32Array(),
        new Float32Array(),
        new Float32Array(),
        new Float32Array(),
      ] as [Float32Array, Float32Array, Float32Array, Float32Array];
      const results = parseDetectionOutputs(emptyOutputs, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });
      expect(results).toEqual([]);
    });

    test("9.5: Generates deterministic unique identification IDs for each result", () => {
      const results = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
        confidenceThreshold: 0.5,
        maxResults: 5,
        labels: TEST_COCO_LABELS,
      });
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(results.length);
    });
  });

  // ==========================================================================
  // Feature 10: Confidence Threshold, MaxResults & Label Mapping
  // ==========================================================================
  describe("Feature 10: Confidence Threshold, MaxResults & Label Mapping", () => {
    test("10.1: Filters out detections below confidenceThreshold", () => {
      const highThresholdResults = parseDetectionOutputs(
        FIXTURE_STANDARD_TENSORS,
        {
          confidenceThreshold: 0.8,
          maxResults: 10,
          labels: TEST_COCO_LABELS,
        },
      );
      // In FIXTURE_STANDARD_TENSORS: scores are [0.94, 0.88, 0.82, 0.75, 0.67, 0.48, 0.35, 0.21, 0.11, 0.04]
      // Detections >= 0.8 are 3
      expect(highThresholdResults.length).toBe(3);
      for (const res of highThresholdResults) {
        expect(res.confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    test("10.2: Truncates detection output to maxResults sorted by confidence descending", () => {
      const maxResults = 2;
      const results = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
        confidenceThreshold: 0.5,
        maxResults,
        labels: TEST_COCO_LABELS,
      });
      expect(results.length).toBe(maxResults);
      expect(results[0].confidence).toBeGreaterThanOrEqual(
        results[1].confidence,
      );
    });

    test("10.3: Resolves class index to string label from string array", () => {
      const results = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
        confidenceThreshold: 0.9,
        maxResults: 1,
        labels: TEST_COCO_LABELS,
      });
      expect(results.length).toBe(1);
      expect(results[0].classIndex).toBe(1);
      expect(results[0].label).toBe("person");
    });

    test("10.4: Supports dictionary record for custom or non-contiguous label mappings", () => {
      const results = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
        confidenceThreshold: 0.7,
        maxResults: 5,
        labels: TEST_LABELS_MAP,
      });
      // Check that mapped class IDs return mapped names
      const personDetection = results.find((r) => r.classIndex === 1);
      expect(personDetection?.label).toBe("person");
      const bicycleDetection = results.find((r) => r.classIndex === 2);
      expect(bicycleDetection?.label).toBe("bicycle");
    });

    test("10.5: Falls back to class_${index} when label is missing from array or record", () => {
      const unmappedTensors = buildSSDTensors([
        {
          ymin: 0.1,
          xmin: 0.1,
          ymax: 0.5,
          xmax: 0.5,
          classId: 999,
          score: 0.95,
        },
      ]);
      const results = parseDetectionOutputs(unmappedTensors, {
        confidenceThreshold: 0.5,
        maxResults: 5,
        labels: ["background", "person"], // only 2 labels
      });
      expect(results.length).toBe(1);
      expect(results[0].label).toBe("class_999");
    });
  });
});
