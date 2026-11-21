import { describe, expect, test } from 'bun:test';
import { parseDetectionOutputs } from '../src/parser/outputParser';

describe('packages/rn-camera-ai-tflite > outputParser', () => {
  test('parses standard SSD 4-tensor output accurately', () => {
    // 2 detections: [ymin, xmin, ymax, xmax]
    const boxes = new Float32Array([
      0.1, 0.2, 0.5, 0.6,
      0.05, 0.1, 0.8, 0.9,
    ]);
    const classes = new Float32Array([1, 2]);
    const scores = new Float32Array([0.92, 0.78]);
    const count = new Float32Array([2]);

    const results = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.5,
      maxResults: 10,
      labels: ['background', 'person', 'dog'],
    });

    expect(results.length).toBe(2);

    // Sorted descending by confidence
    expect(results[0].label).toBe('person');
    expect(results[0].confidence).toBeCloseTo(0.92, 2);
    expect(results[0].classIndex).toBe(1);
    expect(results[0].boundingBox.x).toBeCloseTo(0.2, 2);
    expect(results[0].boundingBox.y).toBeCloseTo(0.1, 2);
    expect(results[0].boundingBox.width).toBeCloseTo(0.4, 2);
    expect(results[0].boundingBox.height).toBeCloseTo(0.4, 2);

    expect(results[1].label).toBe('dog');
    expect(results[1].confidence).toBeCloseTo(0.78, 2);
    expect(results[1].classIndex).toBe(2);
    expect(results[1].boundingBox.x).toBeCloseTo(0.1, 2);
    expect(results[1].boundingBox.y).toBeCloseTo(0.05, 2);
    expect(results[1].boundingBox.width).toBeCloseTo(0.8, 2);
    expect(results[1].boundingBox.height).toBeCloseTo(0.75, 2);
  });

  test('parses nested 3D and 2D arrays', () => {
    // Shape [1, 2, 4] for boxes, [1, 2] for classes and scores
    const boxes = [[[0.2, 0.3, 0.7, 0.8], [0.1, 0.1, 0.4, 0.4]]];
    const classes = [[0, 1]];
    const scores = [[0.85, 0.65]];
    const count = [2];

    const results = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.6,
      maxResults: 5,
      labels: ['apple', 'banana'],
    });

    expect(results.length).toBe(2);
    expect(results[0].label).toBe('apple');
    expect(results[0].boundingBox.x).toBeCloseTo(0.3, 2);
    expect(results[0].boundingBox.y).toBeCloseTo(0.2, 2);
    expect(results[0].boundingBox.width).toBeCloseTo(0.5, 2);
    expect(results[0].boundingBox.height).toBeCloseTo(0.5, 2);

    expect(results[1].label).toBe('banana');
    expect(results[1].boundingBox.x).toBeCloseTo(0.1, 2);
    expect(results[1].boundingBox.y).toBeCloseTo(0.1, 2);
  });

  test('filters out detections below confidence threshold', () => {
    const boxes = new Float32Array([0.1, 0.2, 0.5, 0.6]);
    const classes = new Float32Array([1]);
    const scores = new Float32Array([0.35]);
    const count = 1;

    const results = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.5,
      maxResults: 10,
    });

    expect(results.length).toBe(0);
  });

  test('clamps out-of-bounds coordinates to [0, 1]', () => {
    const boxes = new Float32Array([-0.2, -0.3, 1.4, 1.5]);
    const classes = new Float32Array([0]);
    const scores = new Float32Array([0.9]);
    const count = 1;

    const results = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.5,
      maxResults: 10,
    });

    expect(results.length).toBe(1);
    expect(results[0].boundingBox.x).toBe(0);
    expect(results[0].boundingBox.y).toBe(0);
    expect(results[0].boundingBox.width).toBe(1);
    expect(results[0].boundingBox.height).toBe(1);
  });

  test('rejects degenerate and inverted bounding boxes', () => {
    // Inverted ymin > ymax
    const invertedY = parseDetectionOutputs(
      [
        new Float32Array([0.8, 0.1, 0.2, 0.5]),
        new Float32Array([0]),
        new Float32Array([0.9]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(invertedY.length).toBe(0);

    // Inverted xmin > xmax
    const invertedX = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.8, 0.5, 0.2]),
        new Float32Array([0]),
        new Float32Array([0.9]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(invertedX.length).toBe(0);

    // Zero width
    const zeroWidth = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.4, 0.5, 0.4]),
        new Float32Array([0]),
        new Float32Array([0.9]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(zeroWidth.length).toBe(0);

    // Zero height
    const zeroHeight = parseDetectionOutputs(
      [
        new Float32Array([0.4, 0.1, 0.4, 0.5]),
        new Float32Array([0]),
        new Float32Array([0.9]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(zeroHeight.length).toBe(0);
  });

  test('rejects non-finite score, non-finite coordinates, and non-finite count', () => {
    const resNaNScore = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.1, 0.5, 0.5]),
        new Float32Array([1]),
        new Float32Array([NaN]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resNaNScore.length).toBe(0);

    const resInfScore = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.1, 0.5, 0.5]),
        new Float32Array([1]),
        new Float32Array([Infinity]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resInfScore.length).toBe(0);

    const resNaNBox = parseDetectionOutputs(
      [
        new Float32Array([NaN, 0.1, 0.5, 0.5]),
        new Float32Array([1]),
        new Float32Array([0.9]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resNaNBox.length).toBe(0);

    const resInfBox = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.1, Infinity, 0.5]),
        new Float32Array([1]),
        new Float32Array([0.9]),
        1,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resInfBox.length).toBe(0);

    const resInfCount = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.1, 0.5, 0.5]),
        new Float32Array([1]),
        new Float32Array([0.9]),
        Infinity,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resInfCount.length).toBe(0);

    const resNegativeCount = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.1, 0.5, 0.5]),
        new Float32Array([1]),
        new Float32Array([0.9]),
        -5,
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resNegativeCount.length).toBe(0);
  });

  test('limits results to maxResults and sorts descending by confidence', () => {
    const boxes = new Float32Array([
      0.1, 0.1, 0.2, 0.2,
      0.2, 0.2, 0.3, 0.3,
      0.3, 0.3, 0.4, 0.4,
      0.4, 0.4, 0.5, 0.5,
    ]);
    const classes = new Float32Array([0, 1, 2, 3]);
    const scores = new Float32Array([0.6, 0.95, 0.7, 0.85]);
    const count = 4;

    const results = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.5,
      maxResults: 2,
    });

    expect(results.length).toBe(2);
    expect(results[0].confidence).toBeCloseTo(0.95, 2);
    expect(results[0].classIndex).toBe(1);
    expect(results[1].confidence).toBeCloseTo(0.85, 2);
    expect(results[1].classIndex).toBe(3);
  });

  test('resolves labels with array, dictionary record, and labelOffset', () => {
    const boxes = new Float32Array([
      0.1, 0.1, 0.3, 0.3,
      0.4, 0.4, 0.6, 0.6,
      0.7, 0.7, 0.9, 0.9,
    ]);
    const classes = new Float32Array([1, 2, 99]);
    const scores = new Float32Array([0.9, 0.85, 0.8]);
    const count = 3;

    // Test with array labels and offset -1 (index 1 is labels[0])
    const arrayResults = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.5,
      maxResults: 10,
      labels: ['pedestrian', 'bicycle'],
      labelOffset: -1,
    });

    expect(arrayResults[0].label).toBe('pedestrian');
    expect(arrayResults[1].label).toBe('bicycle');
    // Class 99 has no label in array -> fallback to class_99
    expect(arrayResults[2].label).toBe('class_99');

    // Test with dictionary map
    const dictResults = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.5,
      maxResults: 10,
      labels: {
        1: 'vehicle',
        99: 'traffic_sign',
      },
    });

    expect(dictResults[0].label).toBe('vehicle');
    expect(dictResults[1].label).toBe('class_2'); // missing in dict
    expect(dictResults[2].label).toBe('traffic_sign');
  });

  test('handles malformed, truncated, or empty tensor inputs safely', () => {
    // Empty array
    expect(parseDetectionOutputs([], { confidenceThreshold: 0.5, maxResults: 10 })).toEqual([]);

    // Missing tensors
    expect(
      parseDetectionOutputs(
        [new Float32Array([0.1, 0.1, 0.5, 0.5])] as unknown as [Float32Array, Float32Array, Float32Array, number],
        { confidenceThreshold: 0.5, maxResults: 10 }
      )
    ).toEqual([]);

    // Truncated boxes (not multiple of 4)
    const truncatedBoxes = new Float32Array([0.1, 0.2]); // only 2 numbers
    const resTruncated = parseDetectionOutputs(
      [truncatedBoxes, new Float32Array([1]), new Float32Array([0.9]), 1],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resTruncated.length).toBe(0);

    // Count is larger than available boxes
    const resOverCount = parseDetectionOutputs(
      [
        new Float32Array([0.1, 0.1, 0.4, 0.4]),
        new Float32Array([0]),
        new Float32Array([0.95]),
        100, // declares 100 detections, but buffer only has 1
      ],
      { confidenceThreshold: 0.5, maxResults: 10 }
    );
    expect(resOverCount.length).toBe(1);
    expect(resOverCount[0].confidence).toBeCloseTo(0.95, 2);
  });

  test('unwraps raw ArrayBuffer tensor outputs returned by fast-tflite v3', () => {
    const boxes = new Float32Array([0.1, 0.2, 0.5, 0.7]).buffer;
    const classes = new Float32Array([1]).buffer;
    const scores = new Float32Array([0.91]).buffer;
    const count = new Float32Array([1]).buffer;

    const results = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: 0.5,
      maxResults: 10,
      labels: ['background', 'cup'],
    });

    expect(results.length).toBe(1);
    expect(results[0].label).toBe('cup');
    expect(results[0].confidence).toBeCloseTo(0.91, 2);
    expect(results[0].boundingBox.x).toBeCloseTo(0.2, 2);
    expect(results[0].boundingBox.y).toBeCloseTo(0.1, 2);
    expect(results[0].boundingBox.width).toBeCloseTo(0.5, 2);
    expect(results[0].boundingBox.height).toBeCloseTo(0.4, 2);
  });

  test('returns empty array when confidenceThreshold exceeds 1 or is Infinity', () => {
    const boxes = new Float32Array([0.1, 0.1, 0.5, 0.5]);
    const classes = new Float32Array([0]);
    const scores = new Float32Array([1.0]);
    const count = 1;

    expect(
      parseDetectionOutputs([boxes, classes, scores, count], {
        confidenceThreshold: Infinity,
      })
    ).toEqual([]);

    expect(
      parseDetectionOutputs([boxes, classes, scores, count], {
        confidenceThreshold: 1.5,
      })
    ).toEqual([]);

    // NaN still falls back to default 0.5
    const nanFallback = parseDetectionOutputs([boxes, classes, scores, count], {
      confidenceThreshold: NaN,
    });
    expect(nanFallback.length).toBe(1);

    // -Infinity clamps to 0 consistently with negative finite thresholds
    const lowScore = new Float32Array([0.1]);
    const negInfResults = parseDetectionOutputs([boxes, classes, lowScore, count], {
      confidenceThreshold: -Infinity,
    });
    expect(negInfResults.length).toBe(1);
    expect(negInfResults[0].confidence).toBeCloseTo(0.1, 4);

    const negFiniteResults = parseDetectionOutputs([boxes, classes, lowScore, count], {
      confidenceThreshold: -0.5,
    });
    expect(negFiniteResults.length).toBe(1);
  });

  test('flattens heterogeneous arrays starting with a number followed by ArrayBuffer', () => {
    const remainingBoxCoords = new Float32Array([0.2, 0.5, 0.6]).buffer;
    const boxes = [0.1, remainingBoxCoords];
    const classes = [1];
    const scores = [0.9];
    const count = 1;

    const results = parseDetectionOutputs(
      [boxes, classes, scores, count] as unknown as Parameters<typeof parseDetectionOutputs>[0],
      {
        confidenceThreshold: 0.5,
        labels: ['background', 'person'],
      }
    );

    expect(results.length).toBe(1);
    expect(results[0].label).toBe('person');
    expect(results[0].boundingBox.y).toBeCloseTo(0.1, 4);
    expect(results[0].boundingBox.x).toBeCloseTo(0.2, 4);
    expect(results[0].boundingBox.height).toBeCloseTo(0.4, 4);
    expect(results[0].boundingBox.width).toBeCloseTo(0.4, 4);
  });
});
