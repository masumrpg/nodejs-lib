import type {
  BoundingBox,
  CatBreedCandidate,
  CatBreedSource,
  CatCoatSwatch,
  CatFACSMetrics,
  CatMoodState,
  CatSegmentationSummary,
  FaceLandmark,
} from '@masumdev/rn-camera-ai';
import { l2NormalizeEmbedding } from './blazeFaceParser';

export interface CatLetterboxMeta {
  roiBox: BoundingBox;
  normWidth: number;
  normHeight: number;
  padNormX: number;
  padNormY: number;
}

const CAT_RIGHT_EYE_SET = [3, 4, 5, 6, 7, 36, 37, 38];
const CAT_LEFT_EYE_SET = [1, 8, 9, 10, 11, 39, 40, 41];
const CAT_RIGHT_EAR_SET = [22, 23, 24, 25, 26];
const CAT_LEFT_EAR_SET = [27, 28, 29, 30, 31];
const CAT_MOUTH_CHIN_SET = [0, 2, 16, 17, 18, 19, 20, 21, 46, 47];

function extractNumericVector(tensor: unknown, isUint8 = false): ArrayLike<number> | null {
  'worklet';
  if (tensor === null || tensor === undefined) {
    return null;
  }
  if (isUint8) {
    if (tensor instanceof Uint8Array) {
      return tensor;
    }
    if (tensor instanceof ArrayBuffer) {
      return new Uint8Array(tensor);
    }
    if (ArrayBuffer.isView(tensor)) {
      const view = tensor as ArrayBufferView;
      return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
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
    if (view instanceof Uint8Array) {
      return view;
    }
    const usable = view.byteLength - (view.byteLength % 4);
    return usable > 0 ? new Float32Array(view.buffer, view.byteOffset, usable / 4) : [];
  }
  if (Array.isArray(tensor)) {
    if (tensor.length > 0 && Array.isArray(tensor[0])) {
      return tensor[0] as number[];
    }
    return tensor as number[];
  }
  return null;
}

function clamp01(val: number): number {
  'worklet';
  return val < 0 ? 0 : val > 1 ? 1 : val;
}

function normalizeBreedAlias(rawLabel: string): string {
  'worklet';
  const trimmed = rawLabel.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'sphynx - hairless' || lower === 'canadian hairless') {
    return 'Sphynx';
  }
  if (lower === 'applehead siamese') {
    return 'Siamese';
  }
  if (lower === 'tiger') {
    return 'Tabby';
  }
  return trimmed;
}

/**
 * Crops an RGB uint8 image buffer to a normalized ROI and scales into a uint8 [0, 255] tensor buffer.
 */
export function cropRgbToUint8Buffer(
  rgbBuffer: ArrayBuffer,
  imgWidth: number,
  imgHeight: number,
  roiBox: BoundingBox,
  targetWidth: number,
  targetHeight: number
): ArrayBuffer {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const out = new Uint8Array(targetWidth * targetHeight * 3);

  const x0 = clamp01(roiBox.x);
  const y0 = clamp01(roiBox.y);
  const bw = Math.max(0.04, Math.min(1 - x0, roiBox.width));
  const bh = Math.max(0.04, Math.min(1 - y0, roiBox.height));

  let dstIdx = 0;
  for (let ty = 0; ty < targetHeight; ty++) {
    const ny = y0 + ((ty + 0.5) / targetHeight) * bh;
    const sy = Math.max(0, Math.min(imgHeight - 1, Math.floor(ny * imgHeight)));
    const rowBase = sy * imgWidth;

    for (let tx = 0; tx < targetWidth; tx++) {
      const nx = x0 + ((tx + 0.5) / targetWidth) * bw;
      const sx = Math.max(0, Math.min(imgWidth - 1, Math.floor(nx * imgWidth)));
      const srcIdx = (rowBase + sx) * 3;

      if (srcIdx + 2 < bytes.byteLength) {
        out[dstIdx++] = bytes[srcIdx];
        out[dstIdx++] = bytes[srcIdx + 1];
        out[dstIdx++] = bytes[srcIdx + 2];
      } else {
        out[dstIdx++] = 128;
        out[dstIdx++] = 128;
        out[dstIdx++] = 128;
      }
    }
  }

  return out.buffer;
}

/**
 * Letterboxes an RGB uint8 image region preserving aspect ratio into a square Float32 [0.0, 1.0]
 * tensor expected by `cat_face_localizer.tflite` (224x224).
 */
export function letterboxRgbToFloat01Buffer(
  rgbBuffer: ArrayBuffer,
  imgWidth: number,
  imgHeight: number,
  targetSize = 224,
  roiBox: BoundingBox = { x: 0, y: 0, width: 1, height: 1 }
): { buffer: ArrayBuffer; meta: CatLetterboxMeta } {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const out = new Float32Array(targetSize * targetSize * 3);

  const x0 = clamp01(roiBox.x);
  const y0 = clamp01(roiBox.y);
  const bw = Math.max(0.04, Math.min(1 - x0, roiBox.width));
  const bh = Math.max(0.04, Math.min(1 - y0, roiBox.height));

  const roiPxW = Math.max(1, bw * imgWidth);
  const roiPxH = Math.max(1, bh * imgHeight);
  const scale = Math.min(targetSize / roiPxW, targetSize / roiPxH);
  const scaledW = Math.max(1, Math.round(roiPxW * scale));
  const scaledH = Math.max(1, Math.round(roiPxH * scale));
  const padX = Math.floor((targetSize - scaledW) / 2);
  const padY = Math.floor((targetSize - scaledH) / 2);

  for (let ty = 0; ty < scaledH; ty++) {
    const outY = padY + ty;
    if (outY < 0 || outY >= targetSize) continue;
    const ny = y0 + ((ty + 0.5) / scaledH) * bh;
    const sy = Math.max(0, Math.min(imgHeight - 1, Math.floor(ny * imgHeight)));
    const rowBase = sy * imgWidth;

    for (let tx = 0; tx < scaledW; tx++) {
      const outX = padX + tx;
      if (outX < 0 || outX >= targetSize) continue;
      const nx = x0 + ((tx + 0.5) / scaledW) * bw;
      const sx = Math.max(0, Math.min(imgWidth - 1, Math.floor(nx * imgWidth)));
      const srcIdx = (rowBase + sx) * 3;
      const dstIdx = (outY * targetSize + outX) * 3;

      if (srcIdx + 2 < bytes.byteLength) {
        out[dstIdx] = bytes[srcIdx] / 255.0;
        out[dstIdx + 1] = bytes[srcIdx + 1] / 255.0;
        out[dstIdx + 2] = bytes[srcIdx + 2] / 255.0;
      }
    }
  }

  return {
    buffer: out.buffer,
    meta: {
      roiBox: { x: x0, y: y0, width: bw, height: bh },
      normWidth: scaledW / targetSize,
      normHeight: scaledH / targetSize,
      padNormX: padX / targetSize,
      padNormY: padY / targetSize,
    },
  };
}

/**
 * Un-letterboxes [xmin, ymin, xmax, ymax] output from `cat_face_localizer.tflite` back into full-frame [0, 1] box.
 */
export function deletterboxNormalizedBox(
  rawOutputs: unknown[],
  meta: CatLetterboxMeta
): BoundingBox | null {
  'worklet';
  if (!rawOutputs || !Array.isArray(rawOutputs) || rawOutputs.length === 0) {
    return null;
  }
  const arr = extractNumericVector(rawOutputs[0], false);
  if (!arr || arr.length < 4) {
    return null;
  }

  const rx1 = Number.isFinite(arr[0]) ? clamp01(arr[0]) : 0;
  const ry1 = Number.isFinite(arr[1]) ? clamp01(arr[1]) : 0;
  const rx2 = Number.isFinite(arr[2]) ? clamp01(arr[2]) : 1;
  const ry2 = Number.isFinite(arr[3]) ? clamp01(arr[3]) : 1;

  const lx1 = Math.min(rx1, rx2);
  const lx2 = Math.max(rx1, rx2);
  const ly1 = Math.min(ry1, ry2);
  const ly2 = Math.max(ry1, ry2);

  const ux1 = clamp01((lx1 - meta.padNormX) / Math.max(0.01, meta.normWidth));
  const ux2 = clamp01((lx2 - meta.padNormX) / Math.max(0.01, meta.normWidth));
  const uy1 = clamp01((ly1 - meta.padNormY) / Math.max(0.01, meta.normHeight));
  const uy2 = clamp01((ly2 - meta.padNormY) / Math.max(0.01, meta.normHeight));

  const fw = ux2 - ux1;
  const fh = uy2 - uy1;
  if (fw < 0.04 || fh < 0.04) {
    return null;
  }

  const fullX = clamp01(meta.roiBox.x + ux1 * meta.roiBox.width);
  const fullY = clamp01(meta.roiBox.y + uy1 * meta.roiBox.height);
  const fullW = Math.min(1 - fullX, fw * meta.roiBox.width);
  const fullH = Math.min(1 - fullY, fh * meta.roiBox.height);

  if (fullW < 0.02 || fullH < 0.02) {
    return null;
  }

  return { x: fullX, y: fullY, width: fullW, height: fullH };
}

/**
 * Decodes top-K cat breed candidates from either Float32 or Quantized Uint8 softmax/logit output tensors.
 */
export function decodeBreedProbabilities(
  rawOutputs: unknown[],
  labels: readonly string[],
  source: CatBreedSource,
  isQuantizedUint8 = false,
  topK = 3
): CatBreedCandidate[] {
  'worklet';
  if (!rawOutputs || !Array.isArray(rawOutputs) || rawOutputs.length === 0 || !labels || labels.length === 0) {
    return [];
  }
  const vec = extractNumericVector(rawOutputs[0], isQuantizedUint8);
  if (!vec || vec.length === 0) {
    return [];
  }

  const count = Math.min(labels.length, vec.length);
  const scores: number[] = new Array(count);
  let sum = 0;
  let needsSoftmax = false;
  let maxVal = -Infinity;

  for (let i = 0; i < count; i++) {
    const raw = vec[i];
    const v = Number.isFinite(raw) ? (isQuantizedUint8 ? raw / 255.0 : raw) : 0;
    scores[i] = v;
    sum += v;
    if (v < 0 || v > 1.001) {
      needsSoftmax = true;
    }
    if (v > maxVal) {
      maxVal = v;
    }
  }

  if (needsSoftmax || sum <= 0.01) {
    let expSum = 0;
    for (let i = 0; i < count; i++) {
      const e = Math.exp(scores[i] - maxVal);
      scores[i] = e;
      expSum += e;
    }
    const denom = Math.max(1e-6, expSum);
    for (let i = 0; i < count; i++) {
      scores[i] /= denom;
    }
  } else if (Math.abs(sum - 1) > 0.01) {
    for (let i = 0; i < count; i++) {
      scores[i] /= sum;
    }
  }

  const ranked: CatBreedCandidate[] = new Array(count);
  for (let i = 0; i < count; i++) {
    ranked[i] = {
      breed: normalizeBreedAlias(labels[i]),
      confidence: clamp01(scores[i]),
      source,
    };
  }
  ranked.sort((a, b) => b.confidence - a.confidence);
  return ranked.slice(0, Math.max(1, topK));
}

/**
 * Merges and temporally smooths predictions across 67-breed and 12-pedigree breed engines.
 */
export function fuseBreedPredictions(
  breed67: CatBreedCandidate[],
  breed12: CatBreedCandidate[],
  emaMap: Record<string, number>,
  alpha = 0.38,
  topK = 3
): CatBreedCandidate[] {
  'worklet';
  const combined: Record<string, { score: number; weight: number; has67: boolean; has12: boolean }> = {};

  for (let i = 0; i < breed67.length; i++) {
    const c = breed67[i];
    const key = normalizeBreedAlias(c.breed);
    if (!combined[key]) {
      combined[key] = { score: 0, weight: 0, has67: false, has12: false };
    }
    combined[key].score += c.confidence * 0.48;
    combined[key].weight += 0.48;
    combined[key].has67 = true;
  }

  for (let i = 0; i < breed12.length; i++) {
    const c = breed12[i];
    const key = normalizeBreedAlias(c.breed);
    if (!combined[key]) {
      combined[key] = { score: 0, weight: 0, has67: false, has12: false };
    }
    combined[key].score += c.confidence * 0.52;
    combined[key].weight += 0.52;
    combined[key].has12 = true;
  }

  const allKeys = Object.keys(emaMap);
  for (let i = 0; i < allKeys.length; i++) {
    const k = allKeys[i];
    if (!combined[k]) {
      const decayed = emaMap[k] * (1 - alpha);
      if (decayed < 0.02) {
        delete emaMap[k];
      } else {
        emaMap[k] = decayed;
      }
    }
  }

  const nextKeys = Object.keys(combined);
  for (let i = 0; i < nextKeys.length; i++) {
    const k = nextKeys[i];
    const entry = combined[k];
    const inst = entry.weight > 0 ? entry.score / entry.weight : entry.score;
    const prev = emaMap[k] ?? inst;
    emaMap[k] = prev * (1 - alpha) + inst * alpha;
  }

  const out: CatBreedCandidate[] = [];
  const finalKeys = Object.keys(emaMap);
  for (let i = 0; i < finalKeys.length; i++) {
    const breed = finalKeys[i];
    const entry = combined[breed];
    const src: CatBreedSource =
      entry?.has67 && entry?.has12
        ? 'ensemble'
        : entry?.has12
          ? 'oxford12'
          : 'breed67';
    out.push({
      breed,
      confidence: clamp01(emaMap[breed]),
      source: src,
    });
  }

  out.sort((a, b) => b.confidence - a.confidence);
  return out.slice(0, Math.max(1, topK));
}

/**
 * Decodes [1, 96] normalized landmark outputs from `cat_face_landmarks_full.tflite` into 48 full-frame landmarks.
 */
export function decodeCatFaceLandmarks(
  rawOutputs: unknown[],
  cropBox: BoundingBox
): FaceLandmark[] | null {
  'worklet';
  if (!rawOutputs || !Array.isArray(rawOutputs) || rawOutputs.length === 0) {
    return null;
  }
  const vec = extractNumericVector(rawOutputs[0], false);
  if (!vec || vec.length < 96) {
    return null;
  }

  const landmarks: FaceLandmark[] = new Array(48);
  for (let i = 0; i < 48; i++) {
    const rx = vec[i * 2];
    const ry = vec[i * 2 + 1];
    const nx = Number.isFinite(rx) ? clamp01(rx) : 0.5;
    const ny = Number.isFinite(ry) ? clamp01(ry) : 0.5;

    let type: FaceLandmark['type'] = undefined;
    if (i === 4) type = 'rightEye';
    else if (i === 8) type = 'leftEye';
    else if (i === 13 || i === 43) type = 'noseTip';
    else if (i === 24) type = 'rightEar';
    else if (i === 29) type = 'leftEar';
    else if (i === 18) type = 'mouth';

    landmarks[i] = {
      x: clamp01(cropBox.x + nx * cropBox.width),
      y: clamp01(cropBox.y + ny * cropBox.height),
      type,
    };
  }

  return landmarks;
}

function measureClusterSpan(
  landmarks: FaceLandmark[],
  indices: readonly number[]
): { minX: number; maxX: number; minY: number; maxY: number; cx: number; cy: number } {
  'worklet';
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let i = 0; i < indices.length; i++) {
    const pt = landmarks[indices[i]];
    if (!pt) continue;
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
    sumX += pt.x;
    sumY += pt.y;
    count++;
  }
  const safeCount = Math.max(1, count);
  return {
    minX,
    maxX,
    minY,
    maxY,
    cx: sumX / safeCount,
    cy: sumY / safeCount,
  };
}

/**
 * Computes CatFACS facial muscle & posture metrics (slow-blink eyes, airplane ears, meow/mouth opening)
 * and synthesizes feline affective mood directly from 48 CatFLW landmarks.
 */
export function computeCatFACSMetrics(landmarks48: FaceLandmark[]): CatFACSMetrics {
  'worklet';
  const rOuter = landmarks48[4];
  const lOuter = landmarks48[8];
  const dxEyes = (lOuter?.x ?? 0.65) - (rOuter?.x ?? 0.35);
  const dyEyes = (lOuter?.y ?? 0.45) - (rOuter?.y ?? 0.45);
  const iod = Math.max(0.03, Math.sqrt(dxEyes * dxEyes + dyEyes * dyEyes));
  const headTiltDeg = Number(((Math.atan2(dyEyes, dxEyes) * 180) / Math.PI).toFixed(1));

  const eyeMidY = ((rOuter?.y ?? 0.45) + (lOuter?.y ?? 0.45)) * 0.5;
  const rEyeSpan = measureClusterSpan(landmarks48, CAT_RIGHT_EYE_SET);
  const lEyeSpan = measureClusterSpan(landmarks48, CAT_LEFT_EYE_SET);
  const rEyeOpen = (rEyeSpan.maxY - rEyeSpan.minY) / Math.max(0.01, rEyeSpan.maxX - rEyeSpan.minX);
  const lEyeOpen = (lEyeSpan.maxY - lEyeSpan.minY) / Math.max(0.01, lEyeSpan.maxX - lEyeSpan.minX);
  const eyeApertureRatio = Number(((rEyeOpen + lEyeOpen) * 0.5).toFixed(3));
  const isSlowBlinking = eyeApertureRatio < 0.29;

  const rEarSpan = measureClusterSpan(landmarks48, CAT_RIGHT_EAR_SET);
  const lEarSpan = measureClusterSpan(landmarks48, CAT_LEFT_EAR_SET);
  const avgEarTipHeight =
    ((eyeMidY - rEarSpan.minY) + (eyeMidY - lEarSpan.minY)) * 0.5;
  const earElevationRatio = Number(Math.max(0, avgEarTipHeight / iod).toFixed(3));
  const earOuterSpan = Math.abs(lEarSpan.maxX - rEarSpan.minX);
  const earSpreadRatio = Number((earOuterSpan / iod).toFixed(3));
  const isAirplaneEars = earElevationRatio < 0.42 || earSpreadRatio > 2.45;

  const mouthSpan = measureClusterSpan(landmarks48, CAT_MOUTH_CHIN_SET);
  const mouthOpenRatio = Number(
    ((mouthSpan.maxY - mouthSpan.minY) / Math.max(0.02, iod)).toFixed(3)
  );
  const isVocalizing = mouthOpenRatio >= 0.48;

  let mood: CatMoodState = 'alert_curious';
  let moodLabel = 'Alert & Curious';
  let moodConfidence = 0.78;

  if (isVocalizing) {
    mood = 'vocalizing';
    moodLabel = 'Vocalizing / Meow';
    moodConfidence = Math.min(0.95, 0.7 + (mouthOpenRatio - 0.48) * 0.6);
  } else if (isAirplaneEars) {
    mood = 'annoyed_defensive';
    moodLabel = 'Guarded (Airplane Ears)';
    moodConfidence = 0.84;
  } else if (eyeApertureRatio < 0.17) {
    mood = 'sleepy';
    moodLabel = 'Sleepy / Drowsy';
    moodConfidence = 0.86;
  } else if (isSlowBlinking) {
    mood = 'calm_affectionate';
    moodLabel = 'Relaxed (Slow-Blink)';
    moodConfidence = 0.88;
  } else if (eyeApertureRatio >= 0.50 && earElevationRatio >= 0.62) {
    mood = 'playful_hunting';
    moodLabel = 'Playful / Focused';
    moodConfidence = 0.82;
  }

  return {
    eyeApertureRatio,
    isSlowBlinking,
    earElevationRatio,
    earSpreadRatio,
    isAirplaneEars,
    mouthOpenRatio,
    isVocalizing,
    headTiltDeg,
    mood,
    moodLabel,
    moodConfidence: Number(moodConfidence.toFixed(2)),
  };
}

/**
 * Downsamples MediaPipe DeepLab-V3 [1, 257, 257, 21] semantic segmentation output into a compact
 * feline pixel mask (class 8 = cat) with tight bounding box and area coverage ratio.
 */
export function decodeDeepLabCatMask(
  rawOutputs: unknown[],
  catClassIndex = 8,
  gridSize = 24,
  tensorSize = 257,
  numClasses = 21
): CatSegmentationSummary | null {
  'worklet';
  if (!rawOutputs || !Array.isArray(rawOutputs) || rawOutputs.length === 0) {
    return null;
  }
  const vec = extractNumericVector(rawOutputs[0], false);
  if (!vec || vec.length < tensorSize * numClasses) {
    return null;
  }

  const mask: number[] = new Array(gridSize * gridSize);
  let fgCount = 0;
  let minGx = gridSize;
  let minGy = gridSize;
  let maxGx = -1;
  let maxGy = -1;

  for (let gy = 0; gy < gridSize; gy++) {
    const sy = Math.min(tensorSize - 1, Math.floor(((gy + 0.5) / gridSize) * tensorSize));
    for (let gx = 0; gx < gridSize; gx++) {
      const sx = Math.min(tensorSize - 1, Math.floor(((gx + 0.5) / gridSize) * tensorSize));
      const base = (sy * tensorSize + sx) * numClasses;
      if (base + numClasses > vec.length) {
        mask[gy * gridSize + gx] = 0;
        continue;
      }

      let bestCls = 0;
      let bestScore = vec[base];
      for (let c = 1; c < numClasses; c++) {
        const s = vec[base + c];
        if (s > bestScore) {
          bestScore = s;
          bestCls = c;
        }
      }

      const isCat = bestCls === catClassIndex ? 1 : 0;
      mask[gy * gridSize + gx] = isCat;
      if (isCat === 1) {
        fgCount++;
        if (gx < minGx) minGx = gx;
        if (gy < minGy) minGy = gy;
        if (gx > maxGx) maxGx = gx;
        if (gy > maxGy) maxGy = gy;
      }
    }
  }

  const totalCells = gridSize * gridSize;
  const coverageRatio = Number((fgCount / Math.max(1, totalCells)).toFixed(3));
  const tightBounds: BoundingBox | undefined =
    maxGx >= minGx && maxGy >= minGy
      ? {
          x: minGx / gridSize,
          y: minGy / gridSize,
          width: (maxGx - minGx + 1) / gridSize,
          height: (maxGy - minGy + 1) / gridSize,
        }
      : undefined;

  return {
    maskWidth: gridSize,
    maskHeight: gridSize,
    foregroundMask: mask,
    coverageRatio,
    tightBounds,
  };
}

function toHex2(v: number): string {
  'worklet';
  const clamped = Math.max(0, Math.min(255, Math.round(v)));
  const hex = clamped.toString(16).toUpperCase();
  return hex.length === 1 ? `0${hex}` : hex;
}

/**
 * Extracts dominant coat colors, pattern estimate, and shot sharpness optimality from an RGB cat region,
 * ignoring background pixels when DeepLab cat segmentation mask cells are available.
 */
export function analyzeCatCoatAndColors(
  rgbBuffer: ArrayBuffer,
  imgWidth: number,
  imgHeight: number,
  roiBox: BoundingBox,
  segMask?: CatSegmentationSummary
): {
  swatches: CatCoatSwatch[];
  coatPattern: string;
  shotOptimalityScore: number;
} {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const x0 = clamp01(roiBox.x);
  const y0 = clamp01(roiBox.y);
  const bw = Math.max(0.05, Math.min(1 - x0, roiBox.width));
  const bh = Math.max(0.05, Math.min(1 - y0, roiBox.height));

  const useMask =
    Boolean(segMask) &&
    segMask!.coverageRatio >= 0.04 &&
    segMask!.foregroundMask.length === segMask!.maskWidth * segMask!.maskHeight;

  const bucketNames = [
    'Orange / Ginger',
    'Cream / Fawn',
    'Snow White',
    'Ash / Grey',
    'Charcoal Black',
    'Chocolate / Brown',
  ];
  const counts = [0, 0, 0, 0, 0, 0];
  const sumR = [0, 0, 0, 0, 0, 0];
  const sumG = [0, 0, 0, 0, 0, 0];
  const sumB = [0, 0, 0, 0, 0, 0];

  const steps = 16;
  let totalPixels = 0;
  let lumSum = 0;
  let edgeEnergy = 0;
  let prevLum = -1;

  for (let gy = 0; gy < steps; gy++) {
    const ny = y0 + ((gy + 0.5) / steps) * bh;
    const py = Math.max(0, Math.min(imgHeight - 1, Math.floor(ny * imgHeight)));
    prevLum = -1;

    for (let gx = 0; gx < steps; gx++) {
      const nx = x0 + ((gx + 0.5) / steps) * bw;
      if (useMask && segMask) {
        const mx = Math.min(segMask.maskWidth - 1, Math.max(0, Math.floor(nx * segMask.maskWidth)));
        const my = Math.min(segMask.maskHeight - 1, Math.max(0, Math.floor(ny * segMask.maskHeight)));
        if (segMask.foregroundMask[my * segMask.maskWidth + mx] === 0) {
          continue;
        }
      } else {
        // Without segmentation mask, focus inside elliptical inner 75% core to avoid edges
        const rx = ((gx + 0.5) / steps - 0.5) * 2;
        const ry = ((gy + 0.5) / steps - 0.5) * 2;
        if (rx * rx + ry * ry > 0.92) {
          continue;
        }
      }

      const px = Math.max(0, Math.min(imgWidth - 1, Math.floor(nx * imgWidth)));
      const idx = (py * imgWidth + px) * 3;
      if (idx + 2 >= bytes.byteLength) continue;

      const r = bytes[idx];
      const g = bytes[idx + 1];
      const b = bytes[idx + 2];
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const sat = maxC > 0 ? (maxC - minC) / maxC : 0;

      lumSum += lum;
      if (prevLum >= 0) {
        edgeEnergy += Math.abs(lum - prevLum);
      }
      prevLum = lum;
      totalPixels++;

      let bucketIdx = 3; // Ash Grey default
      if (lum > 0.78 && sat < 0.22) {
        bucketIdx = 2; // Snow White
      } else if (lum < 0.25 && sat < 0.35) {
        bucketIdx = 4; // Charcoal Black
      } else if (r > g + 14 && r > b + 22 && sat >= 0.24) {
        if (lum >= 0.52) {
          bucketIdx = 0; // Orange / Ginger
        } else if (lum >= 0.36 && g - b < 35) {
          bucketIdx = 5; // Chocolate / Brown
        } else {
          bucketIdx = 0;
        }
      } else if (lum >= 0.60 && r >= b + 10) {
        bucketIdx = 1; // Cream / Fawn
      }

      counts[bucketIdx]++;
      sumR[bucketIdx] += r;
      sumG[bucketIdx] += g;
      sumB[bucketIdx] += b;
    }
  }

  const swatches: CatCoatSwatch[] = [];
  if (totalPixels > 0) {
    for (let i = 0; i < 6; i++) {
      if (counts[i] <= 0) continue;
      const pct = Math.round((counts[i] / totalPixels) * 100);
      if (pct < 8) continue;
      const avgR = sumR[i] / counts[i];
      const avgG = sumG[i] / counts[i];
      const avgB = sumB[i] / counts[i];
      swatches.push({
        hex: `#${toHex2(avgR)}${toHex2(avgG)}${toHex2(avgB)}`,
        name: bucketNames[i],
        percentage: pct,
      });
    }
    swatches.sort((a, b) => b.percentage - a.percentage);
  }

  const orangePct = totalPixels > 0 ? (counts[0] / totalPixels) * 100 : 0;
  const creamPct = totalPixels > 0 ? (counts[1] / totalPixels) * 100 : 0;
  const whitePct = totalPixels > 0 ? (counts[2] / totalPixels) * 100 : 0;
  const greyPct = totalPixels > 0 ? (counts[3] / totalPixels) * 100 : 0;
  const blackPct = totalPixels > 0 ? (counts[4] / totalPixels) * 100 : 0;
  const brownPct = totalPixels > 0 ? (counts[5] / totalPixels) * 100 : 0;
  const meanEdge = totalPixels > 0 ? edgeEnergy / totalPixels : 0;

  let coatPattern = 'Solid / Shaded Coat';
  if ((orangePct + creamPct) >= 15 && (blackPct + greyPct + brownPct) >= 15 && whitePct >= 14) {
    coatPattern = 'Calico / Tricolor';
  } else if ((blackPct + greyPct >= 22 || orangePct >= 22) && whitePct >= 20) {
    coatPattern = 'Bicolor / Tuxedo';
  } else if (orangePct >= 20 && creamPct >= 14) {
    coatPattern = 'Ginger / Oyen Tabby';
  } else if (orangePct >= 55) {
    coatPattern = 'Solid Ginger / Oyen';
  } else if (meanEdge >= 0.065) {
    coatPattern = 'Tabby / Mackerel Stripe';
  } else if (whitePct >= 65) {
    coatPattern = 'Solid Snow White';
  } else if (blackPct >= 60) {
    coatPattern = 'Solid Charcoal Black';
  } else if (greyPct >= 55) {
    coatPattern = 'Solid Ash / Blue';
  }

  const avgLum = totalPixels > 0 ? lumSum / totalPixels : 0.5;
  const lightScore = 1 - Math.min(1, Math.abs(avgLum - 0.5) * 1.9);
  const sharpScore = Math.min(1, meanEdge / 0.07);
  const framingScore = useMask && segMask ? Math.min(1, segMask.coverageRatio / 0.25) : 0.8;
  const shotOptimalityScore = Math.round(
    (lightScore * 0.4 + sharpScore * 0.35 + framingScore * 0.25) * 100
  );

  return {
    swatches: swatches.slice(0, 3),
    coatPattern,
    shotOptimalityScore: Math.max(0, Math.min(100, shotOptimalityScore)),
  };
}

/**
 * Extracts a compact 96-D L2-normalized feline appearance & landmark geometry embedding
 * for 1-tap personal Cat ID matching via cosine similarity.
 */
export function extractCatIdentityDescriptor(
  rgbBuffer: ArrayBuffer,
  imgWidth: number,
  imgHeight: number,
  catBox: BoundingBox,
  landmarks48?: FaceLandmark[] | null
): number[] {
  'worklet';
  const bytes = new Uint8Array(rgbBuffer);
  const features: number[] = [];

  const grid = 6;
  const x0 = clamp01(catBox.x);
  const y0 = clamp01(catBox.y);
  const bw = Math.max(0.05, Math.min(1 - x0, catBox.width));
  const bh = Math.max(0.05, Math.min(1 - y0, catBox.height));

  const lums: number[] = [];
  const rgDiffs: number[] = [];

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
      lums.push((0.299 * r + 0.587 * g + 0.114 * b) / 255);
      rgDiffs.push((r - b) / 255);
    }
  }

  let meanL = 0;
  for (let i = 0; i < lums.length; i++) meanL += lums[i];
  meanL /= Math.max(1, lums.length);
  for (let i = 0; i < lums.length; i++) {
    features.push(lums[i] - meanL);
    features.push(rgDiffs[i]);
  }

  if (landmarks48 && landmarks48.length >= 48) {
    const anchorIndices = [4, 8, 13, 18, 24, 29, 36, 40, 43, 46, 0, 2];
    const rEye = landmarks48[4];
    const lEye = landmarks48[8];
    const cx = ((rEye?.x ?? 0.5) + (lEye?.x ?? 0.5)) * 0.5;
    const cy = ((rEye?.y ?? 0.5) + (lEye?.y ?? 0.5)) * 0.5;
    const iod = Math.max(
      0.02,
      Math.hypot((lEye?.x ?? 0.6) - (rEye?.x ?? 0.4), (lEye?.y ?? 0.5) - (rEye?.y ?? 0.5))
    );
    for (let i = 0; i < anchorIndices.length; i++) {
      const lm = landmarks48[anchorIndices[i]];
      features.push(((lm?.x ?? cx) - cx) / iod);
      features.push(((lm?.y ?? cy) - cy) / iod);
    }
  } else {
    for (let i = 0; i < 24; i++) {
      features.push(0);
    }
  }

  return l2NormalizeEmbedding(features);
}
