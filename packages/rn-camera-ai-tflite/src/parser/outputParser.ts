import type { DetectionResult } from '@masumdev/rn-camera-ai';
import type { ParseOptions, TFLiteOutputs } from '../types/tflite';

/**
 * Recursively extracts a flat numeric array-like buffer from ArrayBuffers, typed arrays, or nested numbers.
 */
function extractFlatNumbers(tensor: unknown): ArrayLike<number> | null {
  'worklet';
  if (tensor === null || tensor === undefined) return null;
  if (tensor instanceof ArrayBuffer) {
    const usableBytes = tensor.byteLength - (tensor.byteLength % 4);
    return usableBytes > 0 ? new Float32Array(tensor, 0, usableBytes / 4) : [];
  }
  if (ArrayBuffer.isView(tensor) && 'length' in tensor) {
    return tensor as unknown as ArrayLike<number>;
  }
  if (Array.isArray(tensor)) {
    if (tensor.length === 0) return [];
    const needsFlatten = tensor.some(
      (item) =>
        Array.isArray(item) ||
        item instanceof ArrayBuffer ||
        (item !== null && typeof item === 'object' && ArrayBuffer.isView(item))
    );
    if (needsFlatten) {
      const flattened: number[] = [];
      const stack: unknown[] = [tensor];
      while (stack.length > 0) {
        const item = stack.pop();
        if (item === null || item === undefined) continue;
        if (item instanceof ArrayBuffer) {
          const usableBytes = item.byteLength - (item.byteLength % 4);
          if (usableBytes > 0) {
            const view = new Float32Array(item, 0, usableBytes / 4);
            for (let i = 0; i < view.length; i++) {
              flattened.push(view[i]);
            }
          }
        } else if (ArrayBuffer.isView(item) && 'length' in item) {
          const view = item as unknown as ArrayLike<number>;
          for (let i = 0; i < view.length; i++) {
            flattened.push(view[i]);
          }
        } else if (Array.isArray(item)) {
          for (let i = item.length - 1; i >= 0; i--) {
            stack.push(item[i]);
          }
        } else if (typeof item === 'number') {
          flattened.push(item);
        }
      }
      return flattened;
    }
    return tensor as number[];
  }
  return null;
}

/**
 * Parses raw TFLite tensors from SSD or EfficientDet models into structured DetectionResult objects.
 *
 * Tensor Layout (standard TFLite SSD output):
 * 0: Detection Boxes   [1, N, 4] formatted as [ymin, xmin, ymax, xmax] normalized to [0, 1]
 * 1: Detection Classes [1, N] class indices
 * 2: Detection Scores  [1, N] confidence scores in [0, 1]
 * 3: Detection Count   [1] scalar total valid detections
 *
 * @param outputs The 4 TFLite output tensors (ArrayBuffers, flat Float32Arrays, nested number arrays, or count number)
 * @param options Configuration for threshold, maximum results, and label resolution
 * @returns Array of validated DetectionResult objects sorted by confidence descending
 */
export function parseDetectionOutputs(
  outputs: TFLiteOutputs,
  options?: ParseOptions
): DetectionResult[] {
  'worklet';
  if (!outputs || !Array.isArray(outputs) || outputs.length < 3) {
    return [];
  }

  const [boxesTensor, classesTensor, scoresTensor, countTensor] = outputs;
  if (!boxesTensor || !classesTensor || !scoresTensor) {
    return [];
  }

  const boxesArray = extractFlatNumbers(boxesTensor);
  const classesArray = extractFlatNumbers(classesTensor);
  const scoresArray = extractFlatNumbers(scoresTensor);

  if (!boxesArray || !classesArray || !scoresArray) {
    return [];
  }

  // 1. Buffer capacity boundary protection
  const numBoxes = Math.floor(boxesArray.length / 4);
  const numClasses = classesArray.length;
  const numScores = scoresArray.length;
  const maxPossible = Math.min(numBoxes, numClasses, numScores);

  if (maxPossible <= 0) {
    return [];
  }

  // 2. Count tensor sanitization & loop bounding (prevent unbounded loops / hang on Infinity)
  let count = maxPossible;
  if (typeof countTensor === 'number') {
    if (Number.isFinite(countTensor) && countTensor >= 0) {
      count = Math.min(Math.round(countTensor), maxPossible);
    } else {
      count = 0;
    }
  } else if (countTensor !== null && countTensor !== undefined) {
    const extractedCount = extractFlatNumbers(countTensor);
    if (extractedCount && extractedCount.length > 0) {
      const rawCountVal = extractedCount[0];
      if (typeof rawCountVal === 'number' && Number.isFinite(rawCountVal) && rawCountVal >= 0) {
        count = Math.min(Math.round(rawCountVal), maxPossible);
      } else {
        count = 0;
      }
    }
  }

  if (count <= 0) {
    return [];
  }

  // 3. Options sanitization
  const rawThreshold = options?.confidenceThreshold;
  if (
    typeof rawThreshold === 'number' &&
    !Number.isNaN(rawThreshold) &&
    rawThreshold > 1
  ) {
    return [];
  }
  const threshold =
    typeof rawThreshold === 'number' && !Number.isNaN(rawThreshold)
      ? rawThreshold === -Infinity
        ? 0
        : Math.max(0, Math.min(1, rawThreshold))
      : 0.5;

  const maxResults =
    options?.maxResults !== undefined &&
    typeof options.maxResults === 'number' &&
    Number.isFinite(options.maxResults) &&
    options.maxResults >= 0
      ? Math.floor(options.maxResults)
      : 10;

  const labelOffset =
    options?.labelOffset !== undefined &&
    typeof options.labelOffset === 'number' &&
    Number.isFinite(options.labelOffset)
      ? Math.round(options.labelOffset)
      : 0;

  const labels = options?.labels;
  const candidates: DetectionResult[] = [];

  for (let i = 0; i < count; i++) {
    // 4. Validate confidence score is finite and within [threshold, 1]
    const rawScore = scoresArray[i];
    if (
      typeof rawScore !== 'number' ||
      !Number.isFinite(rawScore) ||
      rawScore < threshold ||
      rawScore < 0 ||
      rawScore > 1
    ) {
      continue;
    }

    // 5. Validate bounding box coordinates are finite numbers
    const rawYmin = boxesArray[i * 4 + 0];
    const rawXmin = boxesArray[i * 4 + 1];
    const rawYmax = boxesArray[i * 4 + 2];
    const rawXmax = boxesArray[i * 4 + 3];

    if (
      typeof rawYmin !== 'number' ||
      !Number.isFinite(rawYmin) ||
      typeof rawXmin !== 'number' ||
      !Number.isFinite(rawXmin) ||
      typeof rawYmax !== 'number' ||
      !Number.isFinite(rawYmax) ||
      typeof rawXmax !== 'number' ||
      !Number.isFinite(rawXmax)
    ) {
      continue;
    }

    // Reject inverted boxes (ymin >= ymax or xmin >= xmax)
    if (rawYmin >= rawYmax || rawXmin >= rawXmax) {
      continue;
    }

    // Clamp coordinates to [0, 1]
    const ymin = Math.max(0, Math.min(1, rawYmin));
    const xmin = Math.max(0, Math.min(1, rawXmin));
    const ymax = Math.max(0, Math.min(1, rawYmax));
    const xmax = Math.max(0, Math.min(1, rawXmax));

    const width = xmax - xmin;
    const height = ymax - ymin;

    // Reject degenerate bounding boxes (zero or negative area)
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      continue;
    }

    // 6. Validate class index and resolve label
    const rawClass = classesArray[i];
    const classIdx =
      typeof rawClass === 'number' && Number.isFinite(rawClass) && rawClass >= 0
        ? Math.round(rawClass)
        : 0;

    const labelKey = classIdx + labelOffset;
    let label = `class_${classIdx}`;

    if (labels) {
      if (Array.isArray(labels)) {
        if (
          labelKey >= 0 &&
          labelKey < labels.length &&
          labels[labelKey] !== undefined
        ) {
          label = labels[labelKey];
        }
      } else if (
        typeof labels === 'object' &&
        labels !== null &&
        (labels as Record<number, string>)[labelKey] !== undefined
      ) {
        label = (labels as Record<number, string>)[labelKey];
      }
    }

    candidates.push({
      id: `${classIdx}-${i}-${rawScore.toFixed(4)}`,
      label,
      confidence: rawScore,
      classIndex: classIdx,
      boundingBox: {
        x: xmin,
        y: ymin,
        width,
        height,
      },
    });
  }

  // Sort descending by confidence
  candidates.sort((a, b) => b.confidence - a.confidence);

  return candidates.slice(0, maxResults);
}
