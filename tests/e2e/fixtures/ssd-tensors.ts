/**
 * Test fixtures: 4-Tensor SSD/EfficientDet mock output generators and fixtures.
 */

export interface RawSSDOutputTuple {
  boxes: Float32Array;
  classes: Float32Array;
  scores: Float32Array;
  count: Float32Array;
}

export type RawSSDOutputs = [
  Float32Array,
  Float32Array,
  Float32Array,
  Float32Array,
];

export interface MockDetectionSpec {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  classId: number;
  score: number;
}

/**
 * Creates 4 standard TFLite output tensors from a list of detection specifications.
 */
export function buildSSDTensors(
  detections: MockDetectionSpec[],
  maxSlots: number = 10,
): RawSSDOutputs {
  const count = detections.length;
  const numSlots = Math.max(count, maxSlots);

  const boxes = new Float32Array(numSlots * 4);
  const classes = new Float32Array(numSlots);
  const scores = new Float32Array(numSlots);
  const countTensor = new Float32Array([count]);

  for (let i = 0; i < count; i++) {
    const d = detections[i];
    boxes[i * 4 + 0] = d.ymin;
    boxes[i * 4 + 1] = d.xmin;
    boxes[i * 4 + 2] = d.ymax;
    boxes[i * 4 + 3] = d.xmax;
    classes[i] = d.classId;
    scores[i] = d.score;
  }

  return [boxes, classes, scores, countTensor];
}

/**
 * Standard 10-detection mock representing high and low confidence objects.
 */
export const STANDARD_10_DETECTIONS: MockDetectionSpec[] = [
  { ymin: 0.1, xmin: 0.2, ymax: 0.8, xmax: 0.6, classId: 1, score: 0.94 }, // person
  { ymin: 0.3, xmin: 0.5, ymax: 0.7, xmax: 0.9, classId: 2, score: 0.88 }, // bicycle
  { ymin: 0.05, xmin: 0.05, ymax: 0.45, xmax: 0.45, classId: 3, score: 0.82 }, // car
  { ymin: 0.6, xmin: 0.1, ymax: 0.9, xmax: 0.4, classId: 17, score: 0.75 }, // dog
  { ymin: 0.2, xmin: 0.7, ymax: 0.5, xmax: 0.95, classId: 64, score: 0.67 }, // laptop
  { ymin: 0.4, xmin: 0.3, ymax: 0.6, xmax: 0.5, classId: 67, score: 0.48 }, // cell phone (below 0.5)
  { ymin: 0.7, xmin: 0.6, ymax: 0.85, xmax: 0.8, classId: 40, score: 0.35 }, // bottle
  { ymin: 0.15, xmin: 0.15, ymax: 0.25, xmax: 0.25, classId: 58, score: 0.21 }, // chair
  { ymin: 0.8, xmin: 0.8, ymax: 0.95, xmax: 0.95, classId: 74, score: 0.11 }, // book
  { ymin: 0.5, xmin: 0.0, ymax: 0.6, xmax: 0.1, classId: 44, score: 0.04 }, // cup
];

export const FIXTURE_STANDARD_TENSORS: RawSSDOutputs = buildSSDTensors(
  STANDARD_10_DETECTIONS,
  10,
);

/**
 * Empty detection output (0 objects detected).
 */
export const FIXTURE_EMPTY_TENSORS: RawSSDOutputs = [
  new Float32Array(40),
  new Float32Array(10),
  new Float32Array(10),
  new Float32Array([0]),
];

/**
 * Degenerate bounding boxes (zero width or zero height).
 */
export const FIXTURE_DEGENERATE_TENSORS: RawSSDOutputs = buildSSDTensors([
  { ymin: 0.2, xmin: 0.3, ymax: 0.2, xmax: 0.8, classId: 1, score: 0.95 }, // zero height
  { ymin: 0.1, xmin: 0.5, ymax: 0.6, xmax: 0.5, classId: 2, score: 0.91 }, // zero width
  { ymin: 0.4, xmin: 0.4, ymax: 0.4, xmax: 0.4, classId: 3, score: 0.89 }, // point box
  { ymin: 0.1, xmin: 0.1, ymax: 0.7, xmax: 0.7, classId: 1, score: 0.92 }, // valid box
]);

/**
 * Out-of-bounds coordinates (values < 0 or > 1).
 */
export const FIXTURE_OUT_OF_BOUNDS_TENSORS: RawSSDOutputs = buildSSDTensors([
  { ymin: -0.15, xmin: -0.2, ymax: 1.25, xmax: 1.3, classId: 1, score: 0.96 },
  { ymin: -0.05, xmin: 0.1, ymax: 0.8, xmax: 1.1, classId: 3, score: 0.85 },
]);

/**
 * All low confidence detections (scores < 0.2).
 */
export const FIXTURE_ALL_LOW_CONFIDENCE_TENSORS: RawSSDOutputs =
  buildSSDTensors([
    { ymin: 0.1, xmin: 0.1, ymax: 0.5, xmax: 0.5, classId: 1, score: 0.15 },
    { ymin: 0.2, xmin: 0.2, ymax: 0.6, xmax: 0.6, classId: 2, score: 0.12 },
    { ymin: 0.3, xmin: 0.3, ymax: 0.7, xmax: 0.7, classId: 3, score: 0.08 },
  ]);
