import { describe, test, expect } from "bun:test";
import {
  transformNormalizedToPixelBox,
  calculateScaleAndOffsets,
  createTFLiteObjectDetector,
  parseDetectionOutputs,
  type BoundingBox,
  type FrameOrientation,
} from "./helpers/adapter";
import { FIXTURE_STANDARD_TENSORS } from "./fixtures/ssd-tensors";
import { TEST_COCO_LABELS } from "./fixtures/labelmap";

describe("Tier 3: Pairwise Combinatorial Interaction Tests", () => {
  // ==========================================================================
  // Matrix 1: resizeMode x cameraPosition x orientation (2 x 2 x 4 = 16 tests)
  // ==========================================================================
  describe("Matrix 1: resizeMode x cameraPosition x orientation", () => {
    const resizeModes: ("cover" | "contain")[] = ["cover", "contain"];
    const cameraPositions: ("back" | "front")[] = ["back", "front"];
    const orientations: FrameOrientation[] = [
      "portrait",
      "landscape-left",
      "landscape-right",
      "portrait-upside-down",
    ];

    const viewDimensions = { width: 400, height: 800 };
    const streamDimensions = { width: 720, height: 1280 };
    const testBox: BoundingBox = { x: 0.2, y: 0.3, width: 0.4, height: 0.3 };

    for (const resizeMode of resizeModes) {
      for (const cameraPosition of cameraPositions) {
        for (const orientation of orientations) {
          const testName = `M1: mode=${resizeMode} | cam=${cameraPosition} | orient=${orientation}`;

          test(testName, () => {
            const isMirrored = cameraPosition === "front";

            const pixelBox = transformNormalizedToPixelBox(testBox, {
              viewDimensions,
              streamDimensions,
              resizeMode,
              isMirrored,
              orientation,
            });

            // Dimensions must always be positive and real numbers
            expect(pixelBox.width).toBeGreaterThan(0);
            expect(pixelBox.height).toBeGreaterThan(0);
            expect(Number.isNaN(pixelBox.x)).toBe(false);
            expect(Number.isNaN(pixelBox.y)).toBe(false);

            // Verify containment invariants for contain mode
            if (resizeMode === "contain") {
              const { offsetX, offsetY, renderedWidth, renderedHeight } =
                calculateScaleAndOffsets(
                  viewDimensions,
                  streamDimensions,
                  "contain",
                );

              expect(pixelBox.x).toBeGreaterThanOrEqual(offsetX - 0.1);
              expect(pixelBox.x + pixelBox.width).toBeLessThanOrEqual(
                offsetX + renderedWidth + 0.1,
              );
              expect(pixelBox.y).toBeGreaterThanOrEqual(offsetY - 0.1);
              expect(pixelBox.y + pixelBox.height).toBeLessThanOrEqual(
                offsetY + renderedHeight + 0.1,
              );
            }

            // Verify coverage invariants for cover mode
            if (resizeMode === "cover") {
              const { renderedWidth, renderedHeight } =
                calculateScaleAndOffsets(
                  viewDimensions,
                  streamDimensions,
                  "cover",
                );
              expect(renderedWidth).toBeGreaterThanOrEqual(
                viewDimensions.width - 0.1,
              );
              expect(renderedHeight).toBeGreaterThanOrEqual(
                viewDimensions.height - 0.1,
              );
            }
          });
        }
      }
    }
  });

  // ==========================================================================
  // Matrix 2: delegate x confidenceThreshold x maxResults (2 x 3 x 3 = 18 tests)
  // ==========================================================================
  describe("Matrix 2: delegate x confidenceThreshold x maxResults", () => {
    const delegates: ("gpu" | "cpu")[] = ["gpu", "cpu"];
    const thresholds = [0.25, 0.5, 0.85];
    const maxResultsLimits = [1, 5, 20];

    for (const delegate of delegates) {
      for (const threshold of thresholds) {
        for (const maxResults of maxResultsLimits) {
          const testName = `M2: delegate=${delegate} | threshold=${threshold} | maxResults=${maxResults}`;

          test(testName, async () => {
            const useGpu = delegate === "gpu";
            const detector = await createTFLiteObjectDetector({
              model: "model.tflite",
              useGpu,
              confidenceThreshold: threshold,
              maxResults,
            });

            if (!useGpu) {
              expect(detector.activeDelegate).toBe("cpu");
            } else {
              expect(["gpu", "cpu"]).toContain(detector.activeDelegate);
            }

            const results = parseDetectionOutputs(FIXTURE_STANDARD_TENSORS, {
              confidenceThreshold: threshold,
              maxResults,
              labels: TEST_COCO_LABELS,
            });

            // Length must not exceed maxResults
            expect(results.length).toBeLessThanOrEqual(maxResults);

            // Every detection must meet threshold
            for (const item of results) {
              expect(item.confidence).toBeGreaterThanOrEqual(threshold);
            }

            // Must be sorted in descending confidence order
            for (let i = 1; i < results.length; i++) {
              expect(results[i - 1].confidence).toBeGreaterThanOrEqual(
                results[i].confidence,
              );
            }
          });
        }
      }
    }
  });
});
