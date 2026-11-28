import { describe, expect, test } from 'bun:test';
import type { FaceLandmark } from '@masumdev/rn-camera-ai';
import {
  analyzeCatCoatAndColors,
  computeCatFACSMetrics,
  cosineSimilarity,
  cropRgbToUint8Buffer,
  decodeBreedProbabilities,
  decodeCatFaceLandmarks,
  decodeDeepLabCatMask,
  deletterboxNormalizedBox,
  extractCatIdentityDescriptor,
  fuseBreedPredictions,
  letterboxRgbToFloat01Buffer,
} from '../src';

function createSolidRgbBuffer(width: number, height: number, r: number, g: number, b: number): ArrayBuffer {
  const bytes = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const o = i * 3;
    bytes[o] = r;
    bytes[o + 1] = g;
    bytes[o + 2] = b;
  }
  return bytes.buffer;
}

function createNeutral48CatLandmarks(): FaceLandmark[] {
  const pts: FaceLandmark[] = Array.from({ length: 48 }, () => ({ x: 0.5, y: 0.5, z: 0 }));

  // Face jaw/cheek contour (#0, #2, #12..#21, #46..#47)
  pts[0] = { x: 0.45, y: 0.61, z: 0 };
  pts[2] = { x: 0.55, y: 0.61, z: 0 };
  for (let i = 16; i <= 21; i++) {
    pts[i] = { x: 0.45 + ((i - 16) / 5) * 0.1, y: 0.615, z: 0 };
  }
  pts[46] = { x: 0.48, y: 0.62, z: 0 };
  pts[47] = { x: 0.52, y: 0.62, z: 0 };

  // Right eye cluster (#3, #4, #5, #6, #7, #36, #37, #38): open ~0.045 height across 0.08 width
  const rEyeCoords: Array<[number, number, number]> = [
    [3, 0.38, 0.43],
    [4, 0.36, 0.45],
    [5, 0.40, 0.425],
    [6, 0.44, 0.45],
    [7, 0.40, 0.47],
    [36, 0.38, 0.47],
    [37, 0.42, 0.43],
    [38, 0.42, 0.47],
  ];
  for (const [idx, x, y] of rEyeCoords) {
    pts[idx] = { x, y, z: 0 };
  }

  // Left eye cluster (#1, #8, #9, #10, #11, #39, #40, #41)
  const lEyeCoords: Array<[number, number, number]> = [
    [1, 0.58, 0.43],
    [8, 0.64, 0.45],
    [9, 0.60, 0.425],
    [10, 0.56, 0.45],
    [11, 0.60, 0.47],
    [39, 0.58, 0.47],
    [40, 0.62, 0.43],
    [41, 0.62, 0.47],
  ];
  for (const [idx, x, y] of lEyeCoords) {
    pts[idx] = { x, y, z: 0 };
  }

  // Nose triangle (#42..#45)
  pts[42] = { x: 0.50, y: 0.52, z: 0 };
  pts[43] = { x: 0.48, y: 0.55, z: 0 };
  pts[44] = { x: 0.52, y: 0.55, z: 0 };
  pts[45] = { x: 0.50, y: 0.57, z: 0 };

  // Right ear (#22..#26) upright
  pts[22] = { x: 0.33, y: 0.34, z: 0 };
  pts[23] = { x: 0.32, y: 0.24, z: 0 };
  pts[24] = { x: 0.31, y: 0.16, z: 0 };
  pts[25] = { x: 0.38, y: 0.24, z: 0 };
  pts[26] = { x: 0.41, y: 0.33, z: 0 };

  // Left ear (#27..#31) upright
  pts[27] = { x: 0.59, y: 0.33, z: 0 };
  pts[28] = { x: 0.62, y: 0.24, z: 0 };
  pts[29] = { x: 0.69, y: 0.16, z: 0 };
  pts[30] = { x: 0.68, y: 0.24, z: 0 };
  pts[31] = { x: 0.67, y: 0.34, z: 0 };

  // Whisker/cheek fill (#12..#15, #32..#35)
  for (const i of [12, 13, 14, 15, 32, 33, 34, 35]) {
    pts[i] = { x: 0.50, y: 0.54, z: 0 };
  }

  return pts;
}

describe('packages/rn-camera-ai-tflite > catParser', () => {
  test('cropRgbToUint8Buffer crops normalized ROI to exact RGB buffer byte size', () => {
    const src = createSolidRgbBuffer(40, 20, 220, 120, 40);
    const cropped = cropRgbToUint8Buffer(
      src,
      40,
      20,
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      16,
      16
    );
    expect(cropped.byteLength).toBe(16 * 16 * 3);
    const bytes = new Uint8Array(cropped);
    expect(bytes[0]).toBe(220);
    expect(bytes[1]).toBe(120);
    expect(bytes[2]).toBe(40);
  });

  test('letterboxRgbToFloat01Buffer & deletterboxNormalizedBox preserve box geometry across aspect ratios', () => {
    const rectSrc = createSolidRgbBuffer(160, 80, 128, 128, 128);
    const { buffer, meta } = letterboxRgbToFloat01Buffer(rectSrc, 160, 80, 224);
    expect(buffer.byteLength).toBe(224 * 224 * 3 * 4);
    expect(meta.padNormX).toBeCloseTo(0, 4);
    expect(meta.padNormY).toBeGreaterThan(0.2);

    // A square spanning horizontally [0.25, 0.75] and vertically centered [0.375, 0.625] in padded square
    // maps back to exact [0.25..0.75, 0.25..0.75] in 2:1 source frame
    const rawXyxy = new Float32Array([0.25, 0.375, 0.75, 0.625]);
    const unboxed = deletterboxNormalizedBox([rawXyxy], meta);
    expect(unboxed).not.toBeNull();
    expect(unboxed!.x).toBeCloseTo(0.25, 2);
    expect(unboxed!.y).toBeCloseTo(0.25, 2);
    expect(unboxed!.width).toBeCloseTo(0.5, 2);
    expect(unboxed!.height).toBeCloseTo(0.5, 2);
  });

  test('decodeBreedProbabilities supports float32 probabilities/logits and uint8 quantized tensors', () => {
    const labels67 = Array.from({ length: 67 }, (_, i) => `Breed-${i}`);
    labels67[7] = 'Bengal';
    labels67[47] = 'Ragdoll';

    const logits67 = new Float32Array(67).fill(-2);
    logits67[7] = 3.5;
    logits67[47] = 1.2;

    const top67 = decodeBreedProbabilities([logits67], labels67, 'breed_67', false, 3);
    expect(top67.length).toBe(3);
    expect(top67[0].breed).toBe('Bengal');
    expect(top67[0].source).toBe('breed_67');
    expect(top67[0].confidence).toBeGreaterThan(0.7);
    expect(top67[1].breed).toBe('Ragdoll');

    const labels12 = Array.from({ length: 12 }, (_, i) => `Oxford-${i}`);
    labels12[2] = 'Bengal';
    labels12[5] = 'Maine Coon';
    const quant12 = new Uint8Array(12).fill(5);
    quant12[2] = 200;
    quant12[5] = 45;

    const top12 = decodeBreedProbabilities([quant12], labels12, 'oxford_12', true, 2);
    expect(top12[0].breed).toBe('Bengal');
    expect(top12[0].source).toBe('oxford_12');
    expect(top12[0].confidence).toBeGreaterThan(0.65);
  });

  test('fuseBreedPredictions blends overlapping breeds into ensemble prediction with EMA continuity', () => {
    const ema: Record<string, number> = {};
    const fused1 = fuseBreedPredictions(
      [{ breed: 'Bengal', confidence: 0.72, source: 'breed_67' }],
      [{ breed: 'Bengal', confidence: 0.88, source: 'oxford_12' }],
      ema,
      0.5,
      3
    );
    expect(fused1[0].breed).toBe('Bengal');
    expect(fused1[0].source).toBe('ensemble');
    expect(fused1[0].confidence).toBeGreaterThan(0.75);

    // Verify EMA smoothing resists single-frame jitter
    const fused2 = fuseBreedPredictions(
      [{ breed: 'Abyssinian', confidence: 0.4, source: 'breed_67' }],
      [{ breed: 'Bengal', confidence: 0.6, source: 'oxford_12' }],
      ema,
      0.5,
      3
    );
    expect(fused2[0].breed).toBe('Bengal');
  });

  test('decodeCatFaceLandmarks maps 48 CatFLW normalized points inside face cropBox', () => {
    const raw = new Float32Array(96);
    for (let i = 0; i < 48; i++) {
      raw[i * 2] = 0.5;
      raw[i * 2 + 1] = 0.5;
    }
    raw[0] = 0.0;
    raw[1] = 0.0;
    raw[94] = 1.0;
    raw[95] = 1.0;

    const lm = decodeCatFaceLandmarks([raw], { x: 0.2, y: 0.3, width: 0.4, height: 0.4 });
    expect(lm).not.toBeNull();
    expect(lm!.length).toBe(48);
    expect(lm![0].x).toBeCloseTo(0.2, 4);
    expect(lm![0].y).toBeCloseTo(0.3, 4);
    expect(lm![47].x).toBeCloseTo(0.6, 4);
    expect(lm![47].y).toBeCloseTo(0.7, 4);
  });

  test('computeCatFACSMetrics differentiates slow-blink, airplane ears, vocalizing, and head tilt', () => {
    const slowBlinkPts = createNeutral48CatLandmarks();
    // Narrow upper & lower eyelid gap for slow-blink (~0.23 EAR -> between 0.17 and 0.29)
    for (const upperIdx of [3, 5, 37, 1, 9, 40]) slowBlinkPts[upperIdx].y = 0.441;
    for (const lowerIdx of [7, 36, 38, 11, 39, 41]) lowerIdx >= 0 && (slowBlinkPts[lowerIdx].y = 0.459);
    const happyMood = computeCatFACSMetrics(slowBlinkPts);
    expect(happyMood.isSlowBlinking).toBe(true);
    expect(happyMood.mood).toBe('calm_affectionate');

    const airplanePts = createNeutral48CatLandmarks();
    // Lower and flare ears sideways (#22..#26, #27..#31)
    for (let i = 22; i <= 26; i++) airplanePts[i] = { x: 0.20 - (i - 22) * 0.02, y: 0.43, z: 0 };
    for (let i = 27; i <= 31; i++) airplanePts[i] = { x: 0.80 + (i - 27) * 0.02, y: 0.43, z: 0 };
    const alertMood = computeCatFACSMetrics(airplanePts);
    expect(alertMood.isAirplaneEars).toBe(true);
    expect(alertMood.mood).toBe('annoyed_defensive');

    const vocalPts = createNeutral48CatLandmarks();
    vocalPts[0] = { x: 0.45, y: 0.58, z: 0 };
    vocalPts[19] = { x: 0.50, y: 0.76, z: 0 };
    vocalPts[46] = { x: 0.48, y: 0.74, z: 0 };
    const meowMood = computeCatFACSMetrics(vocalPts);
    expect(meowMood.isVocalizing).toBe(true);
    expect(meowMood.mood).toBe('vocalizing');

    const tiltPts = createNeutral48CatLandmarks();
    tiltPts[4] = { x: 0.36, y: 0.39, z: 0 };
    tiltPts[8] = { x: 0.64, y: 0.53, z: 0 };
    const curiousMood = computeCatFACSMetrics(tiltPts);
    expect(Math.abs(curiousMood.headTiltDeg)).toBeGreaterThan(14);
  });

  test('decodeDeepLabCatMask extracts Pascal VOC class 8 cat pixels & tight bounds', () => {
    const tensorSize = 32;
    const numClasses = 21;
    const logits = new Float32Array(tensorSize * tensorSize * numClasses).fill(-5);
    // Activate class 0 (background) everywhere except center [8..23, 8..23] which is class 8 (cat)
    for (let y = 0; y < tensorSize; y++) {
      for (let x = 0; x < tensorSize; x++) {
        const isCat = x >= 8 && x < 24 && y >= 8 && y < 24;
        logits[(y * tensorSize + x) * numClasses + (isCat ? 8 : 0)] = 4.0;
      }
    }

    const mask = decodeDeepLabCatMask([logits], 8, 16, tensorSize, numClasses);
    expect(mask).not.toBeNull();
    expect(mask!.maskWidth).toBe(16);
    expect(mask!.foregroundMask.length).toBe(256);
    expect(mask!.coverageRatio).toBeCloseTo(0.25, 1);
    expect(mask!.tightBounds).toBeDefined();
    expect(mask!.tightBounds!.x).toBeGreaterThanOrEqual(0.2);
    expect(mask!.tightBounds!.x).toBeLessThanOrEqual(0.3);
  });

  test('analyzeCatCoatAndColors classifies orange ginger coat and produces optimality score', () => {
    const rgb = createSolidRgbBuffer(64, 64, 224, 138, 62);
    const analysis = analyzeCatCoatAndColors(rgb, 64, 64, {
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8,
    });

    expect(analysis.swatches.length).toBeGreaterThanOrEqual(1);
    expect(analysis.coatPattern).toContain('Ginger');
    expect(analysis.shotOptimalityScore).toBeGreaterThan(0);
    expect(analysis.shotOptimalityScore).toBeLessThanOrEqual(100);
  });

  test('extractCatIdentityDescriptor creates L2 unit-norm 96-D vector with high self similarity', () => {
    const catA = createSolidRgbBuffer(48, 48, 210, 120, 45);
    const catB = createSolidRgbBuffer(48, 48, 30, 35, 42);
    const box = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
    const landmarks = createNeutral48CatLandmarks();

    const descA = extractCatIdentityDescriptor(catA, 48, 48, box, landmarks);
    const descB = extractCatIdentityDescriptor(catB, 48, 48, box, landmarks);

    expect(descA.length).toBe(96);
    const norm = Math.sqrt(descA.reduce((acc, v) => acc + v * v, 0));
    expect(norm).toBeCloseTo(1, 3);
    expect(cosineSimilarity(descA, descA)).toBeCloseTo(1, 4);
    expect(cosineSimilarity(descA, descB)).toBeLessThan(0.8);
  });
});
