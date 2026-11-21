import type {
  BoundingBox,
  DetectionResult,
  FaceLandmark,
  FaceLandmarkType,
} from '@masumdev/rn-camera-ai';
import type {
  BlazeFaceAnchor,
  BlazeFaceDecodeOptions,
} from '../types/tflite';

const LANDMARK_TYPES: readonly FaceLandmarkType[] = [
  'rightEye',
  'leftEye',
  'noseTip',
  'mouth',
  'rightEar',
  'leftEar',
];

/**
 * Generates the standard 896 SSD anchors for MediaPipe BlazeFace Short-Range (128x128):
 * - Layer 0: 16x16 grid (stride 8), 2 anchors per cell = 512 anchors
 * - Layer 1: 8x8 grid (stride 16), 6 anchors per cell = 384 anchors
 * Total = 896 anchors.
 */
export function generateBlazeFaceAnchors(): BlazeFaceAnchor[] {
  'worklet';
  const anchors: BlazeFaceAnchor[] = [];

  // Layer 0: 16x16 feature map, 2 anchors per grid point
  const grid0 = 16;
  for (let y = 0; y < grid0; y++) {
    const anchorY = (y + 0.5) / grid0;
    for (let x = 0; x < grid0; x++) {
      const anchorX = (x + 0.5) / grid0;
      anchors.push({ x: anchorX, y: anchorY });
      anchors.push({ x: anchorX, y: anchorY });
    }
  }

  // Layer 1: 8x8 feature map, 6 anchors per grid point
  const grid1 = 8;
  for (let y = 0; y < grid1; y++) {
    const anchorY = (y + 0.5) / grid1;
    for (let x = 0; x < grid1; x++) {
      const anchorX = (x + 0.5) / grid1;
      for (let a = 0; a < 6; a++) {
        anchors.push({ x: anchorX, y: anchorY });
      }
    }
  }

  return anchors;
}

/**
 * Generates the standard 2,304 SSD anchors for MediaPipe BlazeFace Full-Range (192x192):
 * - Single layer: 48x48 grid (stride 4), 1 anchor per cell = 2,304 anchors.
 */
export function generateBlazeFaceFullRangeAnchors(): BlazeFaceAnchor[] {
  'worklet';
  const anchors: BlazeFaceAnchor[] = [];
  const grid = 48;
  for (let y = 0; y < grid; y++) {
    const anchorY = (y + 0.5) / grid;
    for (let x = 0; x < grid; x++) {
      const anchorX = (x + 0.5) / grid;
      anchors.push({ x: anchorX, y: anchorY });
    }
  }
  return anchors;
}

function extractFloatArray(tensor: unknown): ArrayLike<number> | null {
  'worklet';
  if (tensor === null || tensor === undefined) {
    return null;
  }
  if (tensor instanceof Float32Array) {
    return tensor;
  }
  if (tensor instanceof ArrayBuffer) {
    const usable = tensor.byteLength - (tensor.byteLength % 4);
    return usable > 0 ? new Float32Array(tensor, 0, usable / 4) : [];
  }
  if (ArrayBuffer.isView(tensor)) {
    const view = tensor as ArrayBufferView;
    const usable = view.byteLength - (view.byteLength % 4);
    if (usable <= 0) {
      return [];
    }
    return new Float32Array(view.buffer, view.byteOffset, usable / 4);
  }
  if (Array.isArray(tensor)) {
    return tensor as number[];
  }
  return null;
}

function computeIoU(a: BoundingBox, b: BoundingBox): number {
  'worklet';
  const xA = Math.max(a.x, b.x);
  const yA = Math.max(a.y, b.y);
  const xB = Math.min(a.x + a.width, b.x + b.width);
  const yB = Math.min(a.y + a.height, b.y + b.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;
  if (interArea <= 0) {
    return 0;
  }

  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const unionArea = areaA + areaB - interArea;

  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Applies Greedy IoU Non-Maximum Suppression (NMS) to candidate face detections.
 */
export function nonMaxSuppression(
  candidates: DetectionResult[],
  iouThreshold = 0.3,
  maxResults = 5
): DetectionResult[] {
  'worklet';
  if (!candidates || candidates.length === 0 || maxResults <= 0) {
    return [];
  }

  const sorted = candidates.slice().sort((a, b) => b.confidence - a.confidence);
  const selected: DetectionResult[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const candidate = sorted[i];
    let shouldSuppress = false;

    for (let j = 0; j < selected.length; j++) {
      if (computeIoU(candidate.boundingBox, selected[j].boundingBox) > iouThreshold) {
        shouldSuppress = true;
        break;
      }
    }

    if (!shouldSuppress) {
      selected.push(candidate);
      if (selected.length >= maxResults) {
        break;
      }
    }
  }

  return selected;
}

/**
 * Decodes MediaPipe BlazeFace Short-Range output tensors:
 * - Output 0 (regressors): [1, 896, 16] -> (dx, dy, w, h, kp0_x, kp0_y, ..., kp5_x, kp5_y)
 * - Output 1 (classificators): [1, 896, 1] -> raw logit score
 */
export function decodeBlazeFaceOutputs(
  rawOutputs: unknown[],
  anchors: BlazeFaceAnchor[],
  options?: BlazeFaceDecodeOptions
): DetectionResult[] {
  'worklet';
  if (!rawOutputs || !Array.isArray(rawOutputs) || rawOutputs.length < 2 || !anchors || anchors.length === 0) {
    return [];
  }

  const first = extractFloatArray(rawOutputs[0]);
  const second = extractFloatArray(rawOutputs[1]);
  if (!first || !second) {
    return [];
  }

  // Determine which tensor is regressors (896 * 16 = 14336) and which is classificators (896)
  let regressors: ArrayLike<number>;
  let classificators: ArrayLike<number>;
  if (first.length >= second.length * 4) {
    regressors = first;
    classificators = second;
  } else {
    regressors = second;
    classificators = first;
  }

  const rawAnchorCount = Math.min(
    Math.floor(regressors.length / 16),
    classificators.length
  );
  const resolvedAnchors =
    rawAnchorCount === 2304 && anchors.length !== 2304
      ? generateBlazeFaceFullRangeAnchors()
      : anchors;

  const numAnchors = Math.min(resolvedAnchors.length, rawAnchorCount);
  if (numAnchors <= 0) {
    return [];
  }

  const defaultScale = rawAnchorCount === 2304 ? 192 : 128;
  const confidenceThreshold =
    typeof options?.confidenceThreshold === 'number' && Number.isFinite(options.confidenceThreshold)
      ? Math.max(0.01, Math.min(0.99, options.confidenceThreshold))
      : 0.55;
  const iouThreshold =
    typeof options?.iouThreshold === 'number' && Number.isFinite(options.iouThreshold)
      ? Math.max(0.05, Math.min(0.95, options.iouThreshold))
      : 0.3;
  const maxResults =
    typeof options?.maxResults === 'number' && Number.isFinite(options.maxResults) && options.maxResults >= 0
      ? Math.floor(options.maxResults)
      : 5;
  const scaleW =
    typeof options?.inputWidth === 'number' && options.inputWidth > 0
      ? options.inputWidth
      : defaultScale;
  const scaleH =
    typeof options?.inputHeight === 'number' && options.inputHeight > 0
      ? options.inputHeight
      : defaultScale;
  const aspectCorrection =
    typeof options?.frameAspectRatio === 'number' &&
    Number.isFinite(options.frameAspectRatio) &&
    options.frameAspectRatio > 1.05
      ? Math.min(1.75, options.frameAspectRatio * 0.95)
      : 1.0;

  // Convert threshold probability to logit threshold to skip Math.exp on low-confidence anchors
  const logitThreshold = Math.log(confidenceThreshold / (1 - confidenceThreshold));
  const candidates: DetectionResult[] = [];

  for (let i = 0; i < numAnchors; i++) {
    const rawLogit = classificators[i];
    if (typeof rawLogit !== 'number' || !Number.isFinite(rawLogit) || rawLogit < logitThreshold) {
      continue;
    }

    const clampedLogit = Math.max(-80, Math.min(80, rawLogit));
    const score = 1 / (1 + Math.exp(-clampedLogit));
    if (score < confidenceThreshold) {
      continue;
    }

    const base = i * 16;
    const dx = regressors[base + 0];
    const dy = regressors[base + 1];
    const rawW = regressors[base + 2];
    const rawH = regressors[base + 3];

    if (
      !Number.isFinite(dx) ||
      !Number.isFinite(dy) ||
      !Number.isFinite(rawW) ||
      !Number.isFinite(rawH) ||
      rawW <= 0 ||
      rawH <= 0
    ) {
      continue;
    }

    const anchor = resolvedAnchors[i];
    const cx = anchor.x + dx / scaleW;
    const cy = anchor.y + dy / scaleH;
    const w = (rawW / scaleW) * aspectCorrection;
    const h = (rawH / scaleH) * 1.06;

    const xmin = Math.max(0, Math.min(1, cx - w / 2));
    const ymin = Math.max(0, Math.min(1, cy - h / 2));
    const xmax = Math.max(0, Math.min(1, cx + w / 2));
    const ymax = Math.max(0, Math.min(1, cy + h / 2));

    const boxWidth = xmax - xmin;
    const boxHeight = ymax - ymin;
    if (boxWidth <= 0.01 || boxHeight <= 0.01) {
      continue;
    }

    const landmarks: FaceLandmark[] = [];
    for (let k = 0; k < 6; k++) {
      const kpDx = regressors[base + 4 + k * 2];
      const kpDy = regressors[base + 5 + k * 2];
      if (Number.isFinite(kpDx) && Number.isFinite(kpDy)) {
        const rawKpX = anchor.x + kpDx / scaleW;
        const correctedKpX = cx + (rawKpX - cx) * aspectCorrection;
        landmarks.push({
          x: Math.max(0, Math.min(1, correctedKpX)),
          y: Math.max(0, Math.min(1, anchor.y + kpDy / scaleH)),
          type: LANDMARK_TYPES[k],
        });
      }
    }

    candidates.push({
      id: `face-${i}-${score.toFixed(4)}`,
      label: 'Face',
      confidence: score,
      classIndex: 0,
      boundingBox: {
        x: xmin,
        y: ymin,
        width: boxWidth,
        height: boxHeight,
      },
      landmarks,
    });
  }

  return nonMaxSuppression(candidates, iouThreshold, maxResults);
}

/**
 * L2-normalizes a feature embedding vector so its Euclidean norm equals 1.0.
 */
export function l2NormalizeEmbedding(vector: ArrayLike<number>): number[] {
  'worklet';
  if (!vector || vector.length === 0) {
    return [];
  }

  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val === 'number' && Number.isFinite(val)) {
      sumSq += val * val;
    }
  }

  const norm = Math.sqrt(sumSq);
  const out: number[] = new Array(vector.length);
  if (norm <= 1e-12) {
    for (let i = 0; i < vector.length; i++) {
      out[i] = 0;
    }
    return out;
  }

  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    out[i] = typeof val === 'number' && Number.isFinite(val) ? val / norm : 0;
  }
  return out;
}

/**
 * Computes the Cosine Similarity in [0, 1] between two face embedding vectors.
 */
export function cosineSimilarity(
  a: ArrayLike<number>,
  b: ArrayLike<number>
): number {
  'worklet';
  if (!a || !b || a.length === 0 || b.length === 0) {
    return 0;
  }

  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    const va = typeof a[i] === 'number' && Number.isFinite(a[i]) ? a[i] : 0;
    const vb = typeof b[i] === 'number' && Number.isFinite(b[i]) ? b[i] : 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom <= 1e-12) {
    return 0;
  }

  const rawCos = dot / denom;
  return Math.max(0, Math.min(1, rawCos));
}

/**
 * Crops a detected face bounding box from an RGB uint8 image buffer and resizes it
 * to a normalized [-1, 1] Float32Array buffer (e.g. [1, 112, 112, 3] for MobileFaceNet).
 */
export function cropAndResizeFaceToFloat32Buffer(
  rgbBuffer: ArrayBuffer,
  imgWidth: number,
  imgHeight: number,
  box: BoundingBox,
  targetWidth = 112,
  targetHeight = 112
): ArrayBuffer {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const out = new Float32Array(targetWidth * targetHeight * 3);

  const x0 = Math.max(0, Math.min(1, box.x));
  const y0 = Math.max(0, Math.min(1, box.y));
  const bw = Math.max(0.05, Math.min(1 - x0, box.width));
  const bh = Math.max(0.05, Math.min(1 - y0, box.height));

  let dstIdx = 0;
  for (let ty = 0; ty < targetHeight; ty++) {
    const ny = y0 + ((ty + 0.5) / targetHeight) * bh;
    const sy = Math.max(0, Math.min(imgHeight - 1, Math.floor(ny * imgHeight)));
    const rowBase = sy * imgWidth;

    for (let tx = 0; tx < targetWidth; tx++) {
      const nx = x0 + ((tx + 0.5) / targetWidth) * bw;
      const sx = Math.max(0, Math.min(imgWidth - 1, Math.floor(nx * imgWidth)));
      const srcIdx = (rowBase + sx) * 3;

      const r = srcIdx + 2 < bytes.byteLength ? bytes[srcIdx] : 127.5;
      const g = srcIdx + 2 < bytes.byteLength ? bytes[srcIdx + 1] : 127.5;
      const b = srcIdx + 2 < bytes.byteLength ? bytes[srcIdx + 2] : 127.5;

      out[dstIdx++] = (r - 127.5) / 128.0;
      out[dstIdx++] = (g - 127.5) / 128.0;
      out[dstIdx++] = (b - 127.5) / 128.0;
    }
  }

  return out.buffer;
}

/**
 * Expands a normalized face bounding box by a padding factor around its center,
 * clamped to [0, 1], for feeding into the 468-point MediaPipe Face Mesh model.
 */
export function expandFaceRoiBox(box: BoundingBox, scaleFactor = 1.28): BoundingBox {
  'worklet';
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const newW = Math.min(1, box.width * scaleFactor);
  const newH = Math.min(1, box.height * scaleFactor);
  const x = Math.max(0, Math.min(1 - newW, cx - newW / 2));
  const y = Math.max(0, Math.min(1 - newH, cy - newH / 2));
  return {
    x,
    y,
    width: Math.max(0.05, Math.min(1 - x, newW)),
    height: Math.max(0.05, Math.min(1 - y, newH)),
  };
}

/**
 * Crops a face ROI from an RGB uint8 buffer and resizes it to a [0.0, 1.0] Float32Array
 * buffer ([1, 192, 192, 3]) expected by MediaPipe face_landmark.tflite.
 */
export function cropAndResizeFaceToNormalized01Float32Buffer(
  rgbBuffer: ArrayBuffer,
  imgWidth: number,
  imgHeight: number,
  roiBox: BoundingBox,
  targetWidth = 192,
  targetHeight = 192
): ArrayBuffer {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const out = new Float32Array(targetWidth * targetHeight * 3);

  const x0 = Math.max(0, Math.min(1, roiBox.x));
  const y0 = Math.max(0, Math.min(1, roiBox.y));
  const bw = Math.max(0.05, Math.min(1 - x0, roiBox.width));
  const bh = Math.max(0.05, Math.min(1 - y0, roiBox.height));

  let dstIdx = 0;
  for (let ty = 0; ty < targetHeight; ty++) {
    const ny = y0 + ((ty + 0.5) / targetHeight) * bh;
    const sy = Math.max(0, Math.min(imgHeight - 1, Math.floor(ny * imgHeight)));
    const rowBase = sy * imgWidth;

    for (let tx = 0; tx < targetWidth; tx++) {
      const nx = x0 + ((tx + 0.5) / targetWidth) * bw;
      const sx = Math.max(0, Math.min(imgWidth - 1, Math.floor(nx * imgWidth)));
      const srcIdx = (rowBase + sx) * 3;

      const r = srcIdx + 2 < bytes.byteLength ? bytes[srcIdx] : 128;
      const g = srcIdx + 2 < bytes.byteLength ? bytes[srcIdx + 1] : 128;
      const b = srcIdx + 2 < bytes.byteLength ? bytes[srcIdx + 2] : 128;

      out[dstIdx++] = r / 255.0;
      out[dstIdx++] = g / 255.0;
      out[dstIdx++] = b / 255.0;
    }
  }

  return out.buffer;
}

/**
 * Decodes the 1,404-float output tensor ([1, 1, 1, 1404] = 468 x (x, y, z)) from MediaPipe
 * face_landmark.tflite into 468 normalized full-frame FaceLandmark points and computes
 * the exact anatomical face bounding box from the 468-point mesh envelope.
 */
export function decodeFaceMeshOutputs(
  rawMeshOutputs: unknown[],
  roiBox: BoundingBox,
  meshInputSize = 192
): { landmarks: FaceLandmark[]; tightBox: BoundingBox } | null {
  'worklet';
  if (!rawMeshOutputs || !Array.isArray(rawMeshOutputs) || rawMeshOutputs.length === 0) {
    return null;
  }

  let meshFloats: ArrayLike<number> | null = null;
  for (let i = 0; i < rawMeshOutputs.length; i++) {
    const arr = extractFloatArray(rawMeshOutputs[i]);
    if (arr && (arr.length === 1404 || arr.length === 1434)) {
      meshFloats = arr;
      break;
    }
  }

  if (!meshFloats) {
    return null;
  }

  const landmarks: FaceLandmark[] = new Array(468);
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (let v = 0; v < 468; v++) {
    const rawX = meshFloats[v * 3];
    const rawY = meshFloats[v * 3 + 1];
    const normInRoiX = Number.isFinite(rawX) ? rawX / meshInputSize : 0.5;
    const normInRoiY = Number.isFinite(rawY) ? rawY / meshInputSize : 0.5;

    const fullX = Math.max(0, Math.min(1, roiBox.x + normInRoiX * roiBox.width));
    const fullY = Math.max(0, Math.min(1, roiBox.y + normInRoiY * roiBox.height));

    if (fullX < minX) minX = fullX;
    if (fullY < minY) minY = fullY;
    if (fullX > maxX) maxX = fullX;
    if (fullY > maxY) maxY = fullY;

    landmarks[v] = {
      x: fullX,
      y: fullY,
    };
  }

  const meshW = Math.max(0.04, maxX - minX);
  const meshH = Math.max(0.04, maxY - minY);
  const padX = meshW * 0.05;
  const padTop = meshH * 0.08;
  const padBottom = meshH * 0.04;

  const bx = Math.max(0, minX - padX);
  const by = Math.max(0, minY - padTop);
  const bxMax = Math.min(1, maxX + padX);
  const byMax = Math.min(1, maxY + padBottom);

  return {
    landmarks,
    tightBox: {
      x: bx,
      y: by,
      width: Math.max(0.04, bxMax - bx),
      height: Math.max(0.04, byMax - by),
    },
  };
}

/**
 * Extracts a 128-D L2-normalized illumination-invariant face signature combining
 * aligned facial ROI grid luminance/chrominance cells and Procrustes-normalized landmark geometry.
 */
export function extractFaceDescriptorFromRgbAndLandmarks(
  rgbBuffer: ArrayBuffer,
  imgWidth: number,
  imgHeight: number,
  box: BoundingBox,
  landmarks?: FaceLandmark[]
): number[] {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const descriptor: number[] = [];

  // 1. Sample 8x8 = 64 aligned facial appearance cells (luminance + R-G chrominance = 96 dims)
  const grid = 8;
  const x0 = Math.max(0, Math.min(1, box.x));
  const y0 = Math.max(0, Math.min(1, box.y));
  const bw = Math.max(0.05, Math.min(1 - x0, box.width));
  const bh = Math.max(0.05, Math.min(1 - y0, box.height));

  const lumValues: number[] = [];
  const rgValues: number[] = [];

  for (let gy = 0; gy < grid; gy++) {
    const ny = y0 + ((gy + 0.5) / grid) * bh;
    const py = Math.max(0, Math.min(imgHeight - 1, Math.floor(ny * imgHeight)));
    for (let gx = 0; gx < grid; gx++) {
      const nx = x0 + ((gx + 0.5) / grid) * bw;
      const px = Math.max(0, Math.min(imgWidth - 1, Math.floor(nx * imgWidth)));
      const idx = (py * imgWidth + px) * 3;
      const r = idx + 2 < bytes.byteLength ? bytes[idx] : 128;
      const g = idx + 2 < bytes.byteLength ? bytes[idx + 1] : 128;
      const b = idx + 2 < bytes.byteLength ? bytes[idx + 2] : 128;

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      lumValues.push(lum);
      if ((gy + gx) % 2 === 0) {
        rgValues.push((r - g) / 255);
      }
    }
  }

  // Zero-mean normalize luminance for illumination invariance
  let meanLum = 0;
  for (let i = 0; i < lumValues.length; i++) {
    meanLum += lumValues[i];
  }
  meanLum /= Math.max(1, lumValues.length);

  for (let i = 0; i < lumValues.length; i++) {
    descriptor.push(lumValues[i] - meanLum);
  }
  for (let i = 0; i < rgValues.length; i++) {
    descriptor.push(rgValues[i]);
  }

  // 2. Procrustes-normalized 6-landmark relative geometry & pairwise ratios (32 dims)
  if (landmarks && landmarks.length >= 6) {
    for (let i = 0; i < 6; i++) {
      const relX = (landmarks[i].x - x0) / bw - 0.5;
      const relY = (landmarks[i].y - y0) / bh - 0.5;
      descriptor.push(relX * 2);
      descriptor.push(relY * 2);
    }
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        const dx = (landmarks[i].x - landmarks[j].x) / bw;
        const dy = (landmarks[i].y - landmarks[j].y) / bh;
        descriptor.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
  }

  while (descriptor.length < 128) {
    descriptor.push((box.width / Math.max(0.05, box.height)) * 0.25);
  }

  return l2NormalizeEmbedding(descriptor.slice(0, 128));
}
