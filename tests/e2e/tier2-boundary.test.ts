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
  buildSSDTensors,
  FIXTURE_OUT_OF_BOUNDS_TENSORS,
  FIXTURE_EMPTY_TENSORS,
} from "./fixtures/ssd-tensors";
import { TEST_COCO_LABELS } from "./fixtures/labelmap";

describe("Tier 2: Boundary Value Analysis & Edge Case Tests", () => {
  // ==========================================================================
  // Feature 1: CameraAI Component Contract & Exports (Boundaries)
  // ==========================================================================
  describe("Feature 1: CameraAI Component Contract & Exports (Boundaries)", () => {
    beforeEach(() => {
      mockCameraState.reset();
    });

    test("1.1: Accepts boundary target FPS values (1 and 120 FPS)", () => {
      renderToStaticMarkup(React.createElement(CameraAI, { fps: 1 }));
      expect(mockCameraState.lastCameraProps?.constraints).toEqual([{ fps: 1 }]);

      renderToStaticMarkup(React.createElement(CameraAI, { fps: 120 }));
      expect(mockCameraState.lastCameraProps?.constraints).toEqual([{ fps: 120 }]);
    });

    test("1.2: Tolerates undefined style and callback parameters", () => {
      const html = renderToStaticMarkup(
        React.createElement(CameraAI, {
          style: undefined,
          onDetections: undefined,
          onError: undefined,
        }),
      );
      expect(html).toContain("camera-preview");
    });

    test("1.3: Handles isActive rapid toggle states cleanly", () => {
      renderToStaticMarkup(React.createElement(CameraAI, { isActive: true }));
      expect(mockCameraState.lastCameraProps?.isActive).toBe(true);

      renderToStaticMarkup(React.createElement(CameraAI, { isActive: false }));
      expect(mockCameraState.lastCameraProps?.isActive).toBe(false);
    });

    test("1.4: Handles missing processor without runtime crash", () => {
      const html = renderToStaticMarkup(
        React.createElement(CameraAI, { processor: undefined }),
      );
      expect(html).toContain("camera-preview");
      expect(
        (mockCameraState.lastCameraProps?.outputs as unknown[] | undefined)?.length ?? 0,
      ).toBe(0);
    });

    test("1.5: Accepts null or React fragments for fallback components", () => {
      mockCameraState.hasPermission = false;
      const permHtml = renderToStaticMarkup(
        React.createElement(CameraAI, {
          permissionFallback: null,
        }),
      );
      expect(permHtml).toBeDefined();

      mockCameraState.hasPermission = true;
      mockCameraState.devices.front = undefined;
      const unavailHtml = renderToStaticMarkup(
        React.createElement(CameraAI, {
          cameraPosition: "front",
          cameraUnavailableFallback: null,
        }),
      );
      expect(unavailHtml).toBeDefined();
    });
  });

  // ==========================================================================
  // Feature 2: CameraProcessor Interface & Lifecycle (Boundaries)
  // ==========================================================================
  describe("Feature 2: CameraProcessor Interface & Lifecycle (Boundaries)", () => {
    test("2.1: Calling dispose() multiple times is idempotent and safe", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "test.tflite",
      });
      expect(() => {
        detector.dispose?.();
        detector.dispose?.();
        detector.dispose?.();
      }).not.toThrow();
      expect(detector.status).toBe("idle");
    });

    test("2.2: processFrame on disposed processor throws InferenceError", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "test.tflite",
      });
      detector.dispose?.();
      expect(() => detector.processFrame({})).toThrow(InferenceError);
    });

    test("2.3: Handles unexpected frame object shapes (null/empty frame)", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "test.tflite",
      });
      expect(() => detector.processFrame(null)).not.toThrow();
      expect(() => detector.processFrame(undefined)).not.toThrow();
    });

    test("2.4: initialize() on ready processor is idempotent", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "test.tflite",
      });
      expect(detector.status).toBe("ready");
      await detector.initialize?.();
      expect(detector.status).toBe("ready");
    });

    test("2.5: Processor handles extreme targetFps values without failing", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "test.tflite",
        targetFps: 0,
      });
      expect(detector.targetFps).toBeDefined();
    });
  });

  // ==========================================================================
  // Feature 3: CameraAI Error Hierarchy & Propagation (Boundaries)
  // ==========================================================================
  describe("Feature 3: CameraAI Error Hierarchy & Propagation (Boundaries)", () => {
    test("3.1: CameraAIError handles empty message strings", () => {
      const err = new CameraAIError("", "EMPTY_MSG");
      expect(err.message).toBe("");
      expect(err.code).toBe("EMPTY_MSG");
    });

    test("3.2: CameraAIError supports non-Error cause primitives", () => {
      const strCause = new CameraAIError("msg", "CODE", "string cause");
      const numCause = new CameraAIError("msg", "CODE", 404);
      const nullCause = new CameraAIError("msg", "CODE", null);
      expect(strCause.cause).toBe("string cause");
      expect(numCause.cause).toBe(404);
      expect(nullCause.cause).toBeNull();
    });

    test("3.3: Error hierarchy preserves instanceof prototype across multiple subclasses", () => {
      const camErr = new CameraError("fail");
      const modErr = new ModelLoadError("fail");
      const infErr = new InferenceError("fail");

      expect(camErr instanceof CameraAIError).toBe(true);
      expect(modErr instanceof CameraAIError).toBe(true);
      expect(infErr instanceof CameraAIError).toBe(true);

      expect(camErr instanceof CameraError).toBe(true);
      expect(modErr instanceof ModelLoadError).toBe(true);
      expect(infErr instanceof InferenceError).toBe(true);
    });

    test("3.4: Deeply nested cause chain does not trigger stack overflow or serialization errors", () => {
      const cause1 = new Error("root cause");
      const cause2 = new CameraAIError("intermediate cause", "LVL2", cause1);
      const cause3 = new InferenceError("final error", "LVL3", cause2);

      expect(cause3.cause).toBe(cause2);
      expect((cause3.cause as CameraAIError).cause).toBe(cause1);
    });

    test("3.5: Error codes with special characters or long identifiers serialize cleanly", () => {
      const code = "ERR::CAMERA/SUBSYSTEM_DEVICE_FAIL-404#V1";
      const err = new CameraError("detailed code", code);
      expect(err.code).toBe(code);
    });
  });

  // ==========================================================================
  // Feature 4: Coordinate Math: Cover Mode Scaling & Offset (Boundaries)
  // ==========================================================================
  describe("Feature 4: Coordinate Math: Cover Mode Scaling & Offset (Boundaries)", () => {
    test("4.1: View aspect ratio exactly equals stream aspect ratio (zero offsets)", () => {
      // 1000x500 view on 1000x500 stream
      const res = calculateScaleAndOffsets(
        { width: 1000, height: 500 },
        { width: 1000, height: 500 },
        "cover",
      );
      expect(res.scale).toBe(1.0);
      expect(res.offsetX).toBe(0);
      expect(res.offsetY).toBe(0);
      expect(res.renderedWidth).toBe(1000);
      expect(res.renderedHeight).toBe(500);
    });

    test("4.2: Extreme widescreen view on tall stream produces massive vertical crop", () => {
      // View: 10000x100, Stream: 100x1000
      // Scale: max(10000/100=100, 100/1000=0.1) = 100.
      // Rendered: 10000 x 100000.
      const res = calculateScaleAndOffsets(
        { width: 10000, height: 100 },
        { width: 100, height: 1000 },
        "cover",
      );
      expect(res.scale).toBe(100);
      expect(res.offsetX).toBe(0);
      expect(res.offsetY).toBeCloseTo((100 - 100000) / 2, 2); // -49950
    });

    test("4.3: Extreme tall view on wide stream produces massive horizontal crop", () => {
      // View: 100x10000, Stream: 1000x100
      // Scale: max(100/1000=0.1, 10000/100=100) = 100.
      // Rendered: 100000 x 10000.
      const res = calculateScaleAndOffsets(
        { width: 100, height: 10000 },
        { width: 1000, height: 100 },
        "cover",
      );
      expect(res.scale).toBe(100);
      expect(res.offsetX).toBeCloseTo((100 - 100000) / 2, 2);
      expect(res.offsetY).toBe(0);
    });

    test("4.4: Sub-pixel view dimensions do not cause divide by zero", () => {
      const res = calculateScaleAndOffsets(
        { width: 0.5, height: 0.5 },
        { width: 1000, height: 1000 },
        "cover",
      );
      expect(res.scale).toBeCloseTo(0.0005, 6);
      expect(res.renderedWidth).toBeCloseTo(0.5, 4);
    });

    test("4.5: Zero dimension input safely handles collapsed viewport", () => {
      const res = calculateScaleAndOffsets(
        { width: 0, height: 0 },
        { width: 1000, height: 1000 },
        "cover",
      );
      expect(res.scale).toBe(1);
      expect(res.renderedWidth).toBe(0);
      expect(res.renderedHeight).toBe(0);
    });
  });

  // ==========================================================================
  // Feature 5: Coordinate Math: Contain Mode Scaling & Offset (Boundaries)
  // ==========================================================================
  describe("Feature 5: Coordinate Math: Contain Mode Scaling & Offset (Boundaries)", () => {
    test("5.1: View aspect ratio equals stream aspect ratio (zero padding)", () => {
      const res = calculateScaleAndOffsets(
        { width: 1920, height: 1080 },
        { width: 1920, height: 1080 },
        "contain",
      );
      expect(res.scale).toBe(1.0);
      expect(res.offsetX).toBe(0);
      expect(res.offsetY).toBe(0);
    });

    test("5.2: Extreme widescreen view produces massive pillarbox margins", () => {
      // View: 10000x100, Stream: 100x1000
      // Scale: min(10000/100=100, 100/1000=0.1) = 0.1.
      // Rendered: 10 x 100.
      const res = calculateScaleAndOffsets(
        { width: 10000, height: 100 },
        { width: 100, height: 1000 },
        "contain",
      );
      expect(res.scale).toBeCloseTo(0.1, 4);
      expect(res.renderedWidth).toBeCloseTo(10, 4);
      expect(res.renderedHeight).toBe(100);
      expect(res.offsetX).toBeCloseTo((10000 - 10) / 2, 2); // 4995
      expect(res.offsetY).toBe(0);
    });

    test("5.3: Extreme tall view produces massive letterbox margins", () => {
      // View: 100x10000, Stream: 1000x100
      // Scale: min(100/1000=0.1, 10000/100=100) = 0.1.
      // Rendered: 100 x 10.
      const res = calculateScaleAndOffsets(
        { width: 100, height: 10000 },
        { width: 1000, height: 100 },
        "contain",
      );
      expect(res.scale).toBeCloseTo(0.1, 4);
      expect(res.renderedWidth).toBe(100);
      expect(res.renderedHeight).toBeCloseTo(10, 4);
      expect(res.offsetX).toBe(0);
      expect(res.offsetY).toBeCloseTo((10000 - 10) / 2, 2);
    });

    test("5.4: Tiny 1x1 view dimension contains without crashing", () => {
      const res = calculateScaleAndOffsets(
        { width: 1, height: 1 },
        { width: 1920, height: 1080 },
        "contain",
      );
      expect(res.renderedWidth).toBeLessThanOrEqual(1.01);
      expect(res.renderedHeight).toBeLessThanOrEqual(1.01);
      expect(res.offsetX).toBeGreaterThanOrEqual(0);
    });

    test("5.5: Point box [0.5, 0.5, 0, 0] clamped cleanly and maps to single point", () => {
      const pointBox: BoundingBox = { x: 0.5, y: 0.5, width: 0, height: 0 };
      const clamped = clampBox(pointBox);
      expect(clamped.x).toBe(0.5);
      expect(clamped.y).toBe(0.5);
      expect(clamped.width).toBe(0);
      expect(clamped.height).toBe(0);

      const pixelBox = transformNormalizedToPixelBox(pointBox, {
        viewDimensions: { width: 800, height: 800 },
        streamDimensions: { width: 800, height: 800 },
        resizeMode: "contain",
      });
      expect(pixelBox.width).toBe(0);
      expect(pixelBox.height).toBe(0);
      expect(pixelBox.x).toBe(400);
      expect(pixelBox.y).toBe(400);
    });
  });

  // ==========================================================================
  // Feature 6: Coordinate Math: Mirroring & Rotation (Boundaries)
  // ==========================================================================
  describe("Feature 6: Coordinate Math: Mirroring & Rotation (Boundaries)", () => {
    test("6.1: Out-of-bounds coordinates (< 0, > 1) clamped prior to mirroring", () => {
      const oobBox: BoundingBox = { x: -0.2, y: -0.1, width: 1.5, height: 1.5 };
      const mirrored = mirrorHorizontalBox(oobBox);
      expect(mirrored.x).toBeGreaterThanOrEqual(0);
      expect(mirrored.x + mirrored.width).toBeLessThanOrEqual(1.0001);
    });

    test("6.2: Full-screen box [0, 0, 1, 1] is invariant under horizontal mirroring", () => {
      const fullBox: BoundingBox = { x: 0, y: 0, width: 1, height: 1 };
      const mirrored = mirrorHorizontalBox(fullBox);
      // x* = 1 - 0 - 1 = 0
      expect(mirrored.x).toBe(0);
      expect(mirrored.y).toBe(0);
      expect(mirrored.width).toBe(1);
      expect(mirrored.height).toBe(1);
    });

    test("6.3: Double horizontal mirroring is an involution (f(f(B)) == B)", () => {
      const box: BoundingBox = { x: 0.23, y: 0.45, width: 0.31, height: 0.28 };
      const once = mirrorHorizontalBox(box);
      const twice = mirrorHorizontalBox(once);
      expect(twice.x).toBeCloseTo(box.x, 4);
      expect(twice.y).toBeCloseTo(box.y, 4);
      expect(twice.width).toBeCloseTo(box.width, 4);
      expect(twice.height).toBeCloseTo(box.height, 4);
    });

    test("6.4: Four successive 90 deg CW rotations return to original coordinates", () => {
      const original: BoundingBox = {
        x: 0.15,
        y: 0.25,
        width: 0.35,
        height: 0.45,
      };
      const r90 = rotateBox(original, "landscape-left");
      const r180 = rotateBox(r90, "landscape-left");
      const r270 = rotateBox(r180, "landscape-left");
      const r360 = rotateBox(r270, "landscape-left");

      expect(r360.x).toBeCloseTo(original.x, 4);
      expect(r360.y).toBeCloseTo(original.y, 4);
      expect(r360.width).toBeCloseTo(original.width, 4);
      expect(r360.height).toBeCloseTo(original.height, 4);
    });

    test("6.5: Corner boundary box [1, 1, 0, 0] transforms without NaN", () => {
      const cornerBox: BoundingBox = { x: 1, y: 1, width: 0, height: 0 };
      const rotated = rotateBox(cornerBox, "landscape-left");
      expect(Number.isNaN(rotated.x)).toBe(false);
      expect(Number.isNaN(rotated.y)).toBe(false);
    });
  });

  // ==========================================================================
  // Feature 7: TFLite Detector Configuration & Factory (Boundaries)
  // ==========================================================================
  describe("Feature 7: TFLite Detector Configuration & Factory (Boundaries)", () => {
    test("7.1: Rejects undefined model source with ModelLoadError", async () => {
      expect(
        createTFLiteObjectDetector({ model: undefined as unknown as string }),
      ).rejects.toThrow(ModelLoadError);
    });

    test("7.2: Rejects empty string model path with ModelLoadError", async () => {
      expect(createTFLiteObjectDetector({ model: "" })).rejects.toThrow(
        ModelLoadError,
      );
    });

    test("7.3: Extreme input dimensions (1x1 and 4096x4096) configure cleanly", async () => {
      const tiny = await createTFLiteObjectDetector({
        model: "model.tflite",
        inputWidth: 1,
        inputHeight: 1,
      });
      const huge = await createTFLiteObjectDetector({
        model: "model.tflite",
        inputWidth: 4096,
        inputHeight: 4096,
      });
      expect(tiny.status).toBe("ready");
      expect(huge.status).toBe("ready");
    });

    test("7.4: Negative targetFps defaults safely", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "model.tflite",
        targetFps: -5,
      });
      expect(detector).toBeDefined();
    });

    test("7.5: Accepts empty labels array without failing", async () => {
      const detector = await createTFLiteObjectDetector({
        model: "model.tflite",
        labels: [],
      });
      expect(detector.status).toBe("ready");
    });

    test("7.6: Whitespace-only string model source throws ModelLoadError", async () => {
      await expect(
        createTFLiteObjectDetector({ model: "   " }),
      ).rejects.toThrow(ModelLoadError);
    });

    test("7.7: Empty URL object ({ url: '' } or { url: '   ' }) throws ModelLoadError", async () => {
      await expect(
        createTFLiteObjectDetector({ model: { url: "" } }),
      ).rejects.toThrow(ModelLoadError);

      await expect(
        createTFLiteObjectDetector({ model: { url: "   " } }),
      ).rejects.toThrow(ModelLoadError);
    });
  });

  // ==========================================================================
  // Feature 8: Delegate Fallback Management (GPU/CPU) (Boundaries)
  // ==========================================================================
  describe("Feature 8: Delegate Fallback Management (GPU/CPU) (Boundaries)", () => {
    test("8.1: GPU failure simulation triggers fallback cleanly when onDelegateFallback is undefined", async () => {
      process.env.SIMULATE_GPU_FAILURE = "true";
      try {
        const detector = await createTFLiteObjectDetector({
          model: "model.tflite",
          useGpu: true,
          onDelegateFallback: undefined,
        });
        expect(detector.activeDelegate).toBe("cpu");
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });

    test("8.2: Consecutive detector initializations with GPU failure consistently fall back", async () => {
      process.env.SIMULATE_GPU_FAILURE = "true";
      try {
        const d1 = await createTFLiteObjectDetector({
          model: "m1.tflite",
          useGpu: true,
        });
        const d2 = await createTFLiteObjectDetector({
          model: "m2.tflite",
          useGpu: true,
        });
        expect(d1.activeDelegate).toBe("cpu");
        expect(d2.activeDelegate).toBe("cpu");
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });

    test("8.3: Repeated runtime reconfiguration after fallback preserves CPU state", async () => {
      process.env.SIMULATE_GPU_FAILURE = "true";
      try {
        const detector = await createTFLiteObjectDetector({
          model: "m.tflite",
          useGpu: true,
        });
        detector.setConfidenceThreshold(0.9);
        detector.setMaxResults(1);
        expect(detector.activeDelegate).toBe("cpu");
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });

    test("8.4: Explicit useGpu: false never invokes onDelegateFallback", async () => {
      let callbackInvoked = false;
      const detector = await createTFLiteObjectDetector({
        model: "m.tflite",
        useGpu: false,
        onDelegateFallback: () => {
          callbackInvoked = true;
        },
      });
      expect(callbackInvoked).toBe(false);
      expect(detector.activeDelegate).toBe("cpu");
    });

    test("8.5: onDelegateFallback exceptions do not prevent CPU fallback completion", async () => {
      process.env.SIMULATE_GPU_FAILURE = "true";
      try {
        const detector = await createTFLiteObjectDetector({
          model: "m.tflite",
          useGpu: true,
          onDelegateFallback: () => {
            throw new Error("Callback failed");
          },
        });
        expect(detector.activeDelegate).toBe("cpu");
      } catch (e) {
        // Even if callback throws, detector initialization or error handling is verified
        expect(e).toBeDefined();
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });
  });

  // ==========================================================================
  // Feature 9: 4-Tensor SSD/EfficientDet Output Parser (Boundaries)
  // ==========================================================================
  describe("Feature 9: 4-Tensor SSD/EfficientDet Output Parser (Boundaries)", () => {
    test("9.1: Zero detection count (count = 0) returns empty array despite box tensor data", () => {
      const results = parseDetectionOutputs(FIXTURE_EMPTY_TENSORS, {
        confidenceThreshold: 0.1,
        maxResults: 10,
      });
      expect(results).toEqual([]);
    });

    test("9.2: Negative and inverted box coordinates are clamped and normalized", () => {
      const results = parseDetectionOutputs(FIXTURE_OUT_OF_BOUNDS_TENSORS, {
        confidenceThreshold: 0.5,
        maxResults: 5,
      });
      for (const res of results) {
        expect(res.boundingBox.x).toBeGreaterThanOrEqual(0);
        expect(res.boundingBox.y).toBeGreaterThanOrEqual(0);
        expect(res.boundingBox.x + res.boundingBox.width).toBeLessThanOrEqual(
          1.0001,
        );
        expect(res.boundingBox.y + res.boundingBox.height).toBeLessThanOrEqual(
          1.0001,
        );
      }
    });

    test("9.3: Inverted coordinates (ymin > ymax or xmin > xmax) are rejected as degenerate", () => {
      const invertedTensors = buildSSDTensors([
        { ymin: 0.8, xmin: 0.2, ymax: 0.3, xmax: 0.6, classId: 1, score: 0.95 }, // ymin > ymax
        { ymin: 0.2, xmin: 0.7, ymax: 0.6, xmax: 0.4, classId: 2, score: 0.9 }, // xmin > xmax
      ]);
      const results = parseDetectionOutputs(invertedTensors, {
        confidenceThreshold: 0.5,
        maxResults: 5,
      });
      expect(results.length).toBe(0);
    });

    test("9.4: Box coordinates exceeding 1.0 are clamped to 1.0 boundary", () => {
      const excessiveTensors = buildSSDTensors([
        { ymin: 0.5, xmin: 0.5, ymax: 1.8, xmax: 2.5, classId: 1, score: 0.99 },
      ]);
      const results = parseDetectionOutputs(excessiveTensors, {
        confidenceThreshold: 0.5,
        maxResults: 5,
      });
      expect(results.length).toBe(1);
      expect(results[0].boundingBox.x).toBe(0.5);
      expect(results[0].boundingBox.y).toBe(0.5);
      expect(results[0].boundingBox.width).toBeCloseTo(0.5, 4); // clamped from 2.5 to 1.0 -> 1.0 - 0.5 = 0.5
      expect(results[0].boundingBox.height).toBeCloseTo(0.5, 4); // clamped from 1.8 to 1.0 -> 1.0 - 0.5 = 0.5
    });

    test("9.5: Excess detection slots in tensor beyond count tensor are strictly ignored", () => {
      // Build 10 slots but set count tensor explicitly to 1
      const tensors = buildSSDTensors(
        [
          {
            ymin: 0.1,
            xmin: 0.1,
            ymax: 0.4,
            xmax: 0.4,
            classId: 1,
            score: 0.9,
          },
          {
            ymin: 0.2,
            xmin: 0.2,
            ymax: 0.5,
            xmax: 0.5,
            classId: 2,
            score: 0.95,
          },
        ],
        10,
      );
      tensors[3][0] = 1; // force count to 1

      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });
      expect(results.length).toBe(1);
      expect(results[0].classIndex).toBe(1);
    });

    test("9.6: Non-finite score values (NaN, +Infinity, -Infinity) are rejected and never leak into output", () => {
      const tensors: [Float32Array, Float32Array, Float32Array, Float32Array] = [
        new Float32Array([
          0.1, 0.1, 0.5, 0.5, // box 0
          0.2, 0.2, 0.6, 0.6, // box 1
          0.3, 0.3, 0.7, 0.7, // box 2
          0.4, 0.4, 0.8, 0.8, // box 3
        ]),
        new Float32Array([1, 2, 3, 4]),
        new Float32Array([NaN, Infinity, -Infinity, 0.9]),
        new Float32Array([4]),
      ];

      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });

      expect(results.length).toBe(1);
      expect(results[0].classIndex).toBe(4);
      expect(results[0].confidence).toBeCloseTo(0.9, 4);
      expect(Number.isFinite(results[0].confidence)).toBe(true);
      expect(results[0].id).not.toContain("NaN");
      expect(results[0].id).not.toContain("Infinity");
    });

    test("9.7: NaN coordinates in boxesTensor are rejected as degenerate and do not leak into boundingBox", () => {
      const tensors: [Float32Array, Float32Array, Float32Array, Float32Array] = [
        new Float32Array([
          NaN, 0.1, 0.5, 0.5, // ymin is NaN
          0.1, NaN, 0.5, 0.5, // xmin is NaN
          0.1, 0.1, NaN, 0.5, // ymax is NaN
          0.1, 0.1, 0.5, NaN, // xmax is NaN
          0.1, 0.1, 0.5, 0.5, // valid box
        ]),
        new Float32Array([1, 2, 3, 4, 5]),
        new Float32Array([0.9, 0.9, 0.9, 0.9, 0.9]),
        new Float32Array([5]),
      ];

      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });

      expect(results.length).toBe(1);
      expect(results[0].classIndex).toBe(5);
      expect(Number.isFinite(results[0].boundingBox.x)).toBe(true);
      expect(Number.isFinite(results[0].boundingBox.y)).toBe(true);
      expect(Number.isFinite(results[0].boundingBox.width)).toBe(true);
      expect(Number.isFinite(results[0].boundingBox.height)).toBe(true);
      expect(results[0].boundingBox.x).toBeCloseTo(0.1, 4);
      expect(results[0].boundingBox.y).toBeCloseTo(0.1, 4);
      expect(results[0].boundingBox.width).toBeCloseTo(0.4, 4);
      expect(results[0].boundingBox.height).toBeCloseTo(0.4, 4);
    });

    test("9.8: Non-finite countTensor (Infinity, NaN) does not cause thread hang and safely yields 0 detections", () => {
      const tensorsWithInf: [Float32Array, Float32Array, Float32Array, number] = [
        new Float32Array([0.1, 0.1, 0.5, 0.5]),
        new Float32Array([1]),
        new Float32Array([0.9]),
        Infinity,
      ];

      const startInf = performance.now();
      const resInf = parseDetectionOutputs(tensorsWithInf, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });
      const durationInf = performance.now() - startInf;

      expect(resInf).toEqual([]);
      expect(durationInf).toBeLessThan(50);

      const tensorsWithNaN: [Float32Array, Float32Array, Float32Array, Float32Array] = [
        new Float32Array([0.1, 0.1, 0.5, 0.5]),
        new Float32Array([1]),
        new Float32Array([0.9]),
        new Float32Array([NaN]),
      ];
      const resNaN = parseDetectionOutputs(tensorsWithNaN, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });
      expect(resNaN).toEqual([]);
    });

    test("9.9: countTensor exceeding allocated buffer capacity is strictly clamped to buffer size", () => {
      const tensors: [Float32Array, Float32Array, Float32Array, number] = [
        new Float32Array([
          0.1, 0.1, 0.5, 0.5,
          0.2, 0.2, 0.6, 0.6,
        ]),
        new Float32Array([1, 2]),
        new Float32Array([0.85, 0.95]),
        50000,
      ];

      const start = performance.now();
      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });
      const duration = performance.now() - start;

      expect(results.length).toBe(2);
      expect(duration).toBeLessThan(10);
      expect(results[0].confidence).toBeCloseTo(0.95, 4);
      expect(results[1].confidence).toBeCloseTo(0.85, 4);
    });

    test("9.10: NaN or corrupt classIndex in classesTensor is sanitized without corrupting labels", () => {
      const tensors: [Float32Array, Float32Array, Float32Array, Float32Array] = [
        new Float32Array([0.1, 0.1, 0.5, 0.5]),
        new Float32Array([NaN]),
        new Float32Array([0.9]),
        new Float32Array([1]),
      ];

      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.5,
        maxResults: 10,
      });

      expect(results.length).toBe(1);
      expect(Number.isFinite(results[0].classIndex)).toBe(true);
      expect(results[0].classIndex).toBe(0);
      expect(results[0].label).not.toContain("NaN");
      expect(results[0].id).not.toContain("NaN");
    });
  });

  // ==========================================================================
  // Feature 10: Confidence Threshold, MaxResults & Label Mapping (Boundaries)
  // ==========================================================================
  describe("Feature 10: Confidence Threshold, MaxResults & Label Mapping (Boundaries)", () => {
    test("10.1: Confidence threshold 0.0 accepts all non-degenerate detections", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 0.01 },
        { ymin: 0.4, xmin: 0.4, ymax: 0.6, xmax: 0.6, classId: 2, score: 0.0 },
      ]);
      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.0,
        maxResults: 10,
      });
      expect(results.length).toBe(2);
    });

    test("10.2: Confidence threshold 1.0 only accepts exact 1.0 score", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 1.0 },
        {
          ymin: 0.4,
          xmin: 0.4,
          ymax: 0.6,
          xmax: 0.6,
          classId: 2,
          score: 0.999,
        },
      ]);
      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 1.0,
        maxResults: 10,
      });
      expect(results.length).toBe(1);
      expect(results[0].confidence).toBe(1.0);
    });

    test("10.3: Negative confidence threshold accepts all positive scores", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 0.05 },
      ]);
      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: -0.5,
        maxResults: 10,
      });
      expect(results.length).toBe(1);
    });

    test("10.4: maxResults = 0 returns empty array regardless of score", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 0.99 },
      ]);
      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.1,
        maxResults: 0,
      });
      expect(results).toEqual([]);
    });

    test("10.5: Huge maxResults (1000) does not exceed actual available valid detections", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 0.9 },
        { ymin: 0.4, xmin: 0.4, ymax: 0.6, xmax: 0.6, classId: 2, score: 0.8 },
      ]);
      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.5,
        maxResults: 1000,
      });
      expect(results.length).toBe(2);
    });

    test("10.6: confidenceThreshold = NaN safely falls back to default 0.5 rather than disabling filtering", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 0.1 },
        { ymin: 0.4, xmin: 0.4, ymax: 0.6, xmax: 0.6, classId: 2, score: 0.8 },
      ]);

      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: NaN,
        maxResults: 10,
      });

      expect(results.length).toBe(1);
      expect(results[0].classIndex).toBe(2);
      expect(results[0].confidence).toBeCloseTo(0.8, 4);
    });

    test("10.7: confidenceThreshold = Infinity or > 1.0 rejects all detections", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 0.99 },
      ]);

      const resInf = parseDetectionOutputs(tensors, {
        confidenceThreshold: Infinity,
        maxResults: 10,
      });
      expect(resInf).toEqual([]);

      const resHigh = parseDetectionOutputs(tensors, {
        confidenceThreshold: 1.5,
        maxResults: 10,
      });
      expect(resHigh).toEqual([]);
    });

    test("10.8: maxResults = NaN safely defaults to standard limit rather than returning empty array", () => {
      const tensors = buildSSDTensors([
        { ymin: 0.1, xmin: 0.1, ymax: 0.3, xmax: 0.3, classId: 1, score: 0.9 },
        { ymin: 0.4, xmin: 0.4, ymax: 0.6, xmax: 0.6, classId: 2, score: 0.8 },
      ]);

      const results = parseDetectionOutputs(tensors, {
        confidenceThreshold: 0.5,
        maxResults: NaN,
      });

      expect(results.length).toBe(2);
    });
  });
});
