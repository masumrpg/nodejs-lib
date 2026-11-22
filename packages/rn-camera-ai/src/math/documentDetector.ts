import type {
  BoundingBox,
  CameraProcessor,
  DetectionResult,
  DocumentAlignmentMetrics,
  DocumentAlignmentStatus,
  DocumentQuad,
  ModelStatus,
  Point2D,
  WorkletBoolSync,
} from '../types/contracts';

interface SyncScalarRef<T> {
  getBlocking(): T;
  setBlocking(value: T): void;
}

function createSafeSync<T>(initial: T, fixedType = false): SyncScalarRef<T> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const worklets = require('react-native-worklets') as {
      createSynchronizable?: <V>(
        value: V,
        config?: { fixedType?: boolean }
      ) => SyncScalarRef<V>;
    };
    if (typeof worklets?.createSynchronizable === 'function') {
      return fixedType
        ? worklets.createSynchronizable(initial, { fixedType: true })
        : worklets.createSynchronizable(initial);
    }
  } catch {
    // Fallback for non-worklet test environments
  }
  let value = initial;
  return {
    getBlocking: () => value,
    setBlocking: (nextValue: T) => {
      value = nextValue;
    },
  };
}

/**
 * Default normalized paper viewfinder guide rectangle.
 */
export const DEFAULT_ALIGNMENT_GUIDE_BOX: BoundingBox = {
  x: 0.10,
  y: 0.14,
  width: 0.80,
  height: 0.68,
};

/**
 * Default normalized 4-corner quadrilateral matching `DEFAULT_ALIGNMENT_GUIDE_BOX`.
 */
export const DEFAULT_ALIGNMENT_GUIDE_QUAD: DocumentQuad = {
  topLeft: { x: 0.10, y: 0.14 },
  topRight: { x: 0.90, y: 0.14 },
  bottomRight: { x: 0.90, y: 0.82 },
  bottomLeft: { x: 0.10, y: 0.82 },
};

/**
 * Configuration options for `analyzeFrameDocumentWorklet` and `createDocumentAlignmentProcessor`.
 */
export interface DocumentAlignmentOptions {
  /** Frame processing throttle rate in FPS during alignment preview (default: 5) */
  targetFps?: number;
  /** Minimum optimality score (0-100) to mark framing ready (default: 72) */
  minOptimalityScore?: number;
  /** Minimum YUV brightness (0-255) before flagging 'low_light' (default: 46) */
  minBrightness?: number;
  /** Minimum interior gradient sharpness before flagging 'blurry' (default: 4.5) */
  minFocusSharpness?: number;
  /** Exponential smoothing alpha in (0, 1] applied to consecutive fitted corners (default: 0.45) */
  smoothingAlpha?: number;
  /** Normalized deadzone threshold suppressing micro-jitter (default: 0.012) */
  jitterDeadzone?: number;
  /** Baseline normalized guide box displayed while searching */
  defaultGuideBox?: BoundingBox;
}

/**
 * Result returned by `analyzeFrameDocumentWorklet`.
 */
export interface FrameDocumentAnalysis extends DocumentAlignmentMetrics {
  paperBox: BoundingBox;
  corners: DocumentQuad;
}

interface FramePlaneLike {
  width?: number;
  height?: number;
  bytesPerRow?: number;
  isValid?: boolean;
  getPixelBuffer?: () => ArrayBuffer;
}

interface FrameLike {
  width?: number;
  height?: number;
  orientation?: string;
  isMirrored?: boolean;
  isPlanar?: boolean;
  isValid?: boolean;
  getPlanes?: () => FramePlaneLike[];
  getPixelBuffer?: () => ArrayBuffer;
}

const GRID_W = 48;
const GRID_H = 68;

/**
 * Converts a normalized rectangle into an explicit 4-corner `DocumentQuad`.
 */
export function quadFromBoundingBox(box: BoundingBox): DocumentQuad {
  'worklet';
  return {
    topLeft: { x: box.x, y: box.y },
    topRight: { x: box.x + box.width, y: box.y },
    bottomRight: { x: box.x + box.width, y: box.y + box.height },
    bottomLeft: { x: box.x, y: box.y + box.height },
  };
}

/**
 * Computes the axis-aligned bounding box tightly enclosing all 4 corners of a `DocumentQuad`.
 */
export function boundingBoxFromQuad(quad: DocumentQuad): BoundingBox {
  'worklet';
  const minX = Math.min(
    quad.topLeft.x,
    quad.topRight.x,
    quad.bottomRight.x,
    quad.bottomLeft.x
  );
  const maxX = Math.max(
    quad.topLeft.x,
    quad.topRight.x,
    quad.bottomRight.x,
    quad.bottomLeft.x
  );
  const minY = Math.min(
    quad.topLeft.y,
    quad.topRight.y,
    quad.bottomRight.y,
    quad.bottomLeft.y
  );
  const maxY = Math.max(
    quad.topLeft.y,
    quad.topRight.y,
    quad.bottomRight.y,
    quad.bottomLeft.y
  );

  return {
    x: minX,
    y: minY,
    width: Math.max(0.05, maxX - minX),
    height: Math.max(0.05, maxY - minY),
  };
}

function lerpPoint(
  prev: Point2D,
  next: Point2D,
  alpha: number,
  deadzone: number
): Point2D {
  'worklet';
  const dx = Math.abs(next.x - prev.x);
  const dy = Math.abs(next.y - prev.y);
  if (dx < deadzone && dy < deadzone) {
    return prev;
  }
  return {
    x: prev.x + (next.x - prev.x) * alpha,
    y: prev.y + (next.y - prev.y) * alpha,
  };
}

/**
 * Smoothly interpolates all 4 corners of consecutive detected `DocumentQuad`s independently
 * while suppressing tiny sub-pixel micro-jitter inside `deadzone`.
 */
export function smoothAlignedQuadWorklet(
  previousQuad: DocumentQuad,
  nextQuad: DocumentQuad,
  alpha = 0.45,
  deadzone = 0.012
): DocumentQuad {
  'worklet';
  const a = Math.max(0.05, Math.min(1, alpha));
  return {
    topLeft: lerpPoint(previousQuad.topLeft, nextQuad.topLeft, a, deadzone),
    topRight: lerpPoint(previousQuad.topRight, nextQuad.topRight, a, deadzone),
    bottomRight: lerpPoint(previousQuad.bottomRight, nextQuad.bottomRight, a, deadzone),
    bottomLeft: lerpPoint(previousQuad.bottomLeft, nextQuad.bottomLeft, a, deadzone),
  };
}

/**
 * Smoothly interpolates between previous and newly detected normalized paper boxes
 * while suppressing tiny sub-pixel micro-jitter inside `deadzone`.
 */
export function smoothAlignedBoxWorklet(
  previousBox: BoundingBox,
  nextBox: BoundingBox,
  alpha = 0.45,
  deadzone = 0.012
): BoundingBox {
  'worklet';
  const dx = Math.abs(nextBox.x - previousBox.x);
  const dy = Math.abs(nextBox.y - previousBox.y);
  const dw = Math.abs(nextBox.width - previousBox.width);
  const dh = Math.abs(nextBox.height - previousBox.height);

  if (dx < deadzone && dy < deadzone && dw < deadzone && dh < deadzone) {
    return previousBox;
  }

  const a = Math.max(0.05, Math.min(1, alpha));
  return {
    x: previousBox.x + (nextBox.x - previousBox.x) * a,
    y: previousBox.y + (nextBox.y - previousBox.y) * a,
    width: previousBox.width + (nextBox.width - previousBox.width) * a,
    height: previousBox.height + (nextBox.height - previousBox.height) * a,
  };
}

function quadArea(q: DocumentQuad): number {
  'worklet';
  const s1 =
    q.topLeft.x * q.topRight.y +
    q.topRight.x * q.bottomRight.y +
    q.bottomRight.x * q.bottomLeft.y +
    q.bottomLeft.x * q.topLeft.y;
  const s2 =
    q.topLeft.y * q.topRight.x +
    q.topRight.y * q.bottomRight.x +
    q.bottomRight.y * q.bottomLeft.x +
    q.bottomLeft.y * q.topLeft.x;
  return Math.abs(s1 - s2) * 0.5;
}

/**
 * Lightweight pure-worklet YUV Luma paper-quad, brightness, and sharpness analyzer.
 * Uses connected seeded region growing (flood-fill with 1-cell text-stroke bridging)
 * so surrounding bright objects (floor tiles, bed embroidery, desk glare) separated by
 * a background margin never leak into the extracted paper corners.
 * Extracts 4 independent skewed/perspective corner points [TL, TR, BR, BL].
 */
export function analyzeFrameDocumentWorklet(
  frame: unknown,
  options: DocumentAlignmentOptions = {}
): FrameDocumentAnalysis {
  'worklet';
  const defaultBox = options.defaultGuideBox ?? DEFAULT_ALIGNMENT_GUIDE_BOX;
  const defaultQuad = quadFromBoundingBox(defaultBox);
  const minOptimal = options.minOptimalityScore ?? 72;
  const minBrightness = options.minBrightness ?? 46;
  const minSharpness = options.minFocusSharpness ?? 4.5;

  if (!frame || typeof frame !== 'object') {
    return {
      hasDocument: false,
      status: 'searching',
      optimalityScore: 0,
      isOptimal: false,
      headline: 'Arahkan kertas ke dalam sudut bingkai',
      hint: 'Pastikan seluruh tepi kertas terlihat jelas',
      meanBrightness: 0,
      focusSharpness: 0,
      coverageRatio: 0,
      paperBox: defaultBox,
      corners: defaultQuad,
      skewAngleDeg: 0,
    };
  }

  const f = frame as FrameLike;
  if (f.isValid === false) {
    return {
      hasDocument: false,
      status: 'searching',
      optimalityScore: 0,
      isOptimal: false,
      headline: 'Arahkan kertas ke dalam sudut bingkai',
      hint: 'Pastikan seluruh tepi kertas terlihat jelas',
      meanBrightness: 0,
      focusSharpness: 0,
      coverageRatio: 0,
      paperBox: defaultBox,
      corners: defaultQuad,
      skewAngleDeg: 0,
    };
  }

  let lumaBytes: Uint8Array | null = null;
  let bufW = typeof f.width === 'number' && f.width > 0 ? Math.floor(f.width) : 768;
  let bufH = typeof f.height === 'number' && f.height > 0 ? Math.floor(f.height) : 1024;
  let stride = bufW;
  let bpp = 1;

  try {
    if (f.isPlanar && typeof f.getPlanes === 'function') {
      const planes = f.getPlanes();
      const yPlane = planes && planes.length > 0 ? planes[0] : undefined;
      if (yPlane && yPlane.isValid !== false && typeof yPlane.getPixelBuffer === 'function') {
        const rawBuf = yPlane.getPixelBuffer();
        if (rawBuf && rawBuf.byteLength > 0) {
          lumaBytes = new Uint8Array(rawBuf);
          stride =
            typeof yPlane.bytesPerRow === 'number' && yPlane.bytesPerRow >= bufW
              ? Math.floor(yPlane.bytesPerRow)
              : bufW;
          if (typeof f.height !== 'number' && typeof yPlane.height === 'number' && yPlane.height > 0) {
            bufH = Math.floor(yPlane.height);
          }
          bpp = 1;
        }
      }
    } else if (typeof f.getPixelBuffer === 'function') {
      const rawBuf = f.getPixelBuffer();
      if (rawBuf && rawBuf.byteLength > 0) {
        lumaBytes = new Uint8Array(rawBuf);
        bpp = lumaBytes.length >= bufW * bufH * 4 ? 4 : lumaBytes.length >= bufW * bufH * 3 ? 3 : 1;
        stride = bufW * bpp;
      }
    }
  } catch {
    lumaBytes = null;
  }

  if (!lumaBytes || lumaBytes.length === 0 || bufW <= 0 || bufH <= 0) {
    return {
      hasDocument: false,
      status: 'searching',
      optimalityScore: 0,
      isOptimal: false,
      headline: 'Menyiapkan deteksi sudut kertas...',
      hint: 'Posisikan dokumen datar menghadap kamera',
      meanBrightness: 128,
      focusSharpness: 0,
      coverageRatio: 0,
      paperBox: defaultBox,
      corners: defaultQuad,
      skewAngleDeg: 0,
    };
  }

  const orientation = f.orientation ?? 'up';
  const mirrored = Boolean(f.isMirrored);
  const totalGrid = GRID_W * GRID_H;
  const grid = new Uint8Array(totalGrid);
  const allSamples = new Uint8Array(totalGrid);

  let totalSum = 0;
  let overExposedCount = 0;

  for (let gy = 0; gy < GRID_H; gy++) {
    const ny = (gy + 0.5) / GRID_H;
    for (let gx = 0; gx < GRID_W; gx++) {
      const baseNx = (gx + 0.5) / GRID_W;
      const nx = mirrored ? 1 - baseNx : baseNx;

      let u = nx;
      let v = ny;
      if (orientation === 'right') {
        u = ny;
        v = 1 - nx;
      } else if (orientation === 'left') {
        u = 1 - ny;
        v = nx;
      } else if (orientation === 'down') {
        u = 1 - nx;
        v = 1 - ny;
      }

      const bx = Math.max(0, Math.min(bufW - 1, Math.floor(u * (bufW - 1))));
      const by = Math.max(0, Math.min(bufH - 1, Math.floor(v * (bufH - 1))));
      const offset = by * stride + bx * bpp;

      const stepX = Math.max(1, Math.min(3, Math.floor(bufW / (GRID_W * 4))));
      const stepY = Math.max(1, Math.min(3, Math.floor(bufH / (GRID_H * 4))));

      let luma = 0;
      if (bpp === 1) {
        const l0 = offset < lumaBytes.length ? lumaBytes[offset] : 0;
        const off1 =
          Math.max(0, by - stepY) * stride + Math.max(0, bx - stepX);
        const off2 =
          Math.min(bufH - 1, by + stepY) * stride + Math.min(bufW - 1, bx + stepX);
        const l1 = off1 < lumaBytes.length ? lumaBytes[off1] : l0;
        const l2 = off2 < lumaBytes.length ? lumaBytes[off2] : l0;
        // Median of 3 suppresses 1-2px dark printed rules on paper and bright specular noise on fabric
        const minL = l0 < l1 ? (l0 < l2 ? l0 : l2) : l1 < l2 ? l1 : l2;
        const maxL = l0 > l1 ? (l0 > l2 ? l0 : l2) : l1 > l2 ? l1 : l2;
        luma = l0 + l1 + l2 - minL - maxL;
      } else if (offset + 2 < lumaBytes.length) {
        const r = lumaBytes[offset];
        const g = lumaBytes[offset + 1];
        const b = lumaBytes[offset + 2];
        luma = (r * 77 + g * 150 + b * 29) >> 8;
      }

      const idx = gy * GRID_W + gx;
      grid[idx] = luma;
      allSamples[idx] = luma;
      totalSum += luma;
      if (luma > 242) overExposedCount += 1;
    }
  }

  const meanBrightness = Math.round(totalSum / totalGrid);

  // Use global brightness percentiles so bright peripheral floor tiles do not raise surround floor baseline
  allSamples.sort();
  const surroundLow = allSamples[Math.floor(totalGrid * 0.16)];
  const surroundHigh = allSamples[Math.floor(totalGrid * 0.88)];

  // Locate best cohesive bright sheet seed within interior [16%..84%]
  let bestSeedScore = -1;
  let bestSeedX = Math.floor(GRID_W * 0.5);
  let bestSeedY = Math.floor(GRID_H * 0.5);
  let bestSeedPaperLuma = 0;

  const yStart = Math.max(4, Math.floor(GRID_H * 0.16));
  const yEnd = Math.min(GRID_H - 5, Math.floor(GRID_H * 0.84));
  const xStart = Math.max(4, Math.floor(GRID_W * 0.15));
  const xEnd = Math.min(GRID_W - 5, Math.floor(GRID_W * 0.85));

  for (let sy = yStart; sy <= yEnd; sy += 2) {
    for (let sx = xStart; sx <= xEnd; sx += 2) {
      // Inspect 5x5 neighborhood; sort top values so black printed letters don't dilute white paper score
      const win: number[] = [];
      let sumGrad = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ci = (sy + dy) * GRID_W + (sx + dx);
          win.push(grid[ci]);
          if (dx > -2) {
            sumGrad += Math.abs(grid[ci] - grid[ci - 1]);
          }
        }
      }
      win.sort((a, b) => a - b);
      // Require both median & 80th percentile of 5x5 to exceed background (rejects sparse cloth lace)
      const surfaceMedian = win[12];
      const surfaceWhite = win[19];
      const uniformityScore = 255 - Math.abs(win[21] - win[14]);
      const avgGrad = sumGrad / 20;

      // Bias toward central paper interior over peripheral background tiles or curtains
      const distCx = Math.abs(sx / GRID_W - 0.5);
      const distCy = Math.abs(sy / GRID_H - 0.5);
      const centerBonus = 1 - 0.32 * (distCx + distCy);
      const docContrast = surfaceWhite - surroundLow;

      if (docContrast < 16 || surfaceMedian - surroundLow < 12) continue;

      const candidateScore =
        (surfaceWhite * 1.15 + uniformityScore * 0.35 + Math.min(35, avgGrad * 0.7)) *
        centerBonus;

      if (candidateScore > bestSeedScore) {
        bestSeedScore = candidateScore;
        bestSeedX = sx;
        bestSeedY = sy;
        bestSeedPaperLuma = surfaceWhite;
      }
    }
  }

  let hasDocument = false;
  let fittedQuad: DocumentQuad = defaultQuad;
  let mask = new Uint8Array(totalGrid);
  let compCount = 0;

  // Compute effective non-paper surround baseline ignoring near-black shadows/mounts (<65% paper white)
  let darkCutoffCount = 0;
  const darkCutoffCap = bestSeedPaperLuma * 0.65;
  while (darkCutoffCount < totalGrid && allSamples[darkCutoffCount] < darkCutoffCap) {
    darkCutoffCount += 1;
  }
  const effectiveSurround =
    darkCutoffCount >= Math.floor(totalGrid * 0.14)
      ? allSamples[Math.floor(darkCutoffCount * 0.65)]
      : surroundLow;

  const lightContrast = bestSeedPaperLuma - effectiveSurround;
  const darkContrast = surroundHigh - grid[Math.floor(GRID_H * 0.5) * GRID_W + Math.floor(GRID_W * 0.5)];

  // Strict 4-connected BFS Region Growing from Seed (no 2-cell bridge jumps over background rims)
  if (bestSeedScore > 0 && bestSeedPaperLuma - surroundLow >= 18) {
    const paperThresh = Math.max(
      effectiveSurround + Math.max(12, lightContrast) * 0.52,
      bestSeedPaperLuma * 0.675
    );

    const visited = new Uint8Array(totalGrid);
    const queue = new Int16Array(totalGrid);
    let head = 0;
    let tail = 0;

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const idx = (bestSeedY + dy) * GRID_W + (bestSeedX + dx);
        if (grid[idx] >= paperThresh * 0.92 && !visited[idx]) {
          visited[idx] = 1;
          mask[idx] = 1;
          queue[tail++] = idx;
          compCount += 1;
        }
      }
    }

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    while (head < tail) {
      const curr = queue[head++];
      const cy = Math.floor(curr / GRID_W);
      const cx = curr - cy * GRID_W;

      for (let d = 0; d < 4; d++) {
        const ddx = dirs[d][0];
        const ddy = dirs[d][1];
        const nx = cx + ddx;
        const ny = cy + ddy;
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;

        const nIdx = ny * GRID_W + nx;
        if (visited[nIdx]) continue;

        if (grid[nIdx] >= paperThresh) {
          visited[nIdx] = 1;
          mask[nIdx] = 1;
          queue[tail++] = nIdx;
          compCount += 1;
        }
      }
    }
  } else if (darkContrast >= 24) {
    // Inverted polarity support: dark passport / dark card on bright cream desk
    const cX = Math.floor(GRID_W * 0.5);
    const cY = Math.floor(GRID_H * 0.5);
    const centerDark = grid[cY * GRID_W + cX];
    const darkThresh = centerDark + (surroundHigh - centerDark) * 0.45;
    if (grid[cY * GRID_W + cX] <= darkThresh) {
      const visited = new Uint8Array(totalGrid);
      const queue = new Int16Array(totalGrid);
      let head = 0;
      let tail = 0;
      visited[cY * GRID_W + cX] = 1;
      mask[cY * GRID_W + cX] = 1;
      queue[tail++] = cY * GRID_W + cX;
      compCount = 1;

      while (head < tail) {
        const curr = queue[head++];
        const cy = Math.floor(curr / GRID_W);
        const cx = curr - cy * GRID_W;
        const neighbors = [cx - 1, cy, cx + 1, cy, cx, cy - 1, cx, cy + 1];
        for (let k = 0; k < 8; k += 2) {
          const nx = neighbors[k];
          const ny = neighbors[k + 1];
          if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
          const nIdx = ny * GRID_W + nx;
          if (!visited[nIdx] && grid[nIdx] <= darkThresh) {
            visited[nIdx] = 1;
            mask[nIdx] = 1;
            queue[tail++] = nIdx;
            compCount += 1;
          }
        }
      }
    }
  }

  // Morphological hole-fill + conditional opening (severs <=2-cell leak bridges to tiles/curtains)
  if (compCount >= 40) {
    const cleaned = new Uint8Array(totalGrid);
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const idx = y * GRID_W + x;
        let nbrs = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= GRID_H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            if (nx < 0 || nx >= GRID_W) continue;
            if (mask[ny * GRID_W + nx] === 1) nbrs += 1;
          }
        }
        if (mask[idx] === 1) {
          cleaned[idx] = nbrs >= 2 ? 1 : 0;
        } else {
          cleaned[idx] = nbrs >= 5 ? 1 : 0;
        }
      }
    }
    mask = cleaned;

    // Erode to 2D sheet core to sever thin <=2-cell leaks to peripheral bright objects,
    // keep only the connected core containing the seed, then conditionally dilate back inside `mask`.
    const core = new Uint8Array(totalGrid);
    for (let y = 1; y < GRID_H - 1; y++) {
      for (let x = 1; x < GRID_W - 1; x++) {
        const idx = y * GRID_W + x;
        if (mask[idx] !== 1) continue;
        const ortho =
          mask[idx - 1] + mask[idx + 1] + mask[idx - GRID_W] + mask[idx + GRID_W];
        if (ortho < 3) continue;
        let nbrs8 = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (mask[(y + dy) * GRID_W + (x + dx)] === 1) nbrs8 += 1;
          }
        }
        if (nbrs8 >= 6) {
          core[idx] = 1;
        }
      }
    }

    const coreVisited = new Uint8Array(totalGrid);
    const coreQueue = new Int16Array(totalGrid);
    let cHead = 0;
    let cTail = 0;
    const seedXStart = Math.max(1, bestSeedX - 3);
    const seedXEnd = Math.min(GRID_W - 2, bestSeedX + 3);
    const seedYStart = Math.max(1, bestSeedY - 3);
    const seedYEnd = Math.min(GRID_H - 2, bestSeedY + 3);

    for (let y = seedYStart; y <= seedYEnd; y++) {
      for (let x = seedXStart; x <= seedXEnd; x++) {
        const idx = y * GRID_W + x;
        if (core[idx] === 1 && !coreVisited[idx]) {
          coreVisited[idx] = 1;
          coreQueue[cTail++] = idx;
        }
      }
    }

    if (cTail > 0) {
      while (cHead < cTail) {
        const curr = coreQueue[cHead++];
        const cy = Math.floor(curr / GRID_W);
        const cx = curr - cy * GRID_W;
        if (cx > 1 && core[curr - 1] === 1 && !coreVisited[curr - 1]) {
          coreVisited[curr - 1] = 1;
          coreQueue[cTail++] = curr - 1;
        }
        if (cx < GRID_W - 2 && core[curr + 1] === 1 && !coreVisited[curr + 1]) {
          coreVisited[curr + 1] = 1;
          coreQueue[cTail++] = curr + 1;
        }
        if (cy > 1 && core[curr - GRID_W] === 1 && !coreVisited[curr - GRID_W]) {
          coreVisited[curr - GRID_W] = 1;
          coreQueue[cTail++] = curr - GRID_W;
        }
        if (cy < GRID_H - 2 && core[curr + GRID_W] === 1 && !coreVisited[curr + GRID_W]) {
          coreVisited[curr + GRID_W] = 1;
          coreQueue[cTail++] = curr + GRID_W;
        }
      }

      if (cTail >= 12) {
        const openedMask = new Uint8Array(totalGrid);
        for (let y = 0; y < GRID_H; y++) {
          for (let x = 0; x < GRID_W; x++) {
            const idx = y * GRID_W + x;
            if (mask[idx] !== 1) continue;
            if (coreVisited[idx] === 1) {
              openedMask[idx] = 1;
              continue;
            }
            let touchesCore = false;
            for (let dy = -1; dy <= 1 && !touchesCore; dy++) {
              const ny = y + dy;
              if (ny < 0 || ny >= GRID_H) continue;
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                if (nx < 0 || nx >= GRID_W) continue;
                if (coreVisited[ny * GRID_W + nx] === 1) {
                  touchesCore = true;
                  break;
                }
              }
            }
            if (touchesCore) {
              openedMask[idx] = 1;
            }
          }
        }
        mask = openedMask;
      }
    }

    // Extract boundary cells and project onto diagonal extrema to recover all 4 slanted quad corners
    let minSum = 1e9;
    let maxSum = -1e9;
    let maxDiff = -1e9;
    let minDiff = 1e9;

    let tlX = 0;
    let tlY = 0;
    let trX = 0;
    let trY = 0;
    let brX = 0;
    let brY = 0;
    let blX = 0;
    let blY = 0;
    let boundaryCount = 0;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const idx = y * GRID_W + x;
        if (mask[idx] !== 1) continue;

        const isBoundary =
          x === 0 ||
          x === GRID_W - 1 ||
          y === 0 ||
          y === GRID_H - 1 ||
          mask[idx - 1] === 0 ||
          mask[idx + 1] === 0 ||
          mask[idx - GRID_W] === 0 ||
          mask[idx + GRID_W] === 0;

        if (!isBoundary) continue;
        boundaryCount += 1;

        const sum = x + y;
        const diff = x - y;

        if (sum < minSum) {
          minSum = sum;
          tlX = x;
          tlY = y;
        }
        if (sum > maxSum) {
          maxSum = sum;
          brX = x;
          brY = y;
        }
        if (diff > maxDiff) {
          maxDiff = diff;
          trX = x;
          trY = y;
        }
        if (diff < minDiff) {
          minDiff = diff;
          blX = x;
          blY = y;
        }
      }
    }

    if (boundaryCount >= 12) {
      const candQuad: DocumentQuad = {
        topLeft: {
          x: Math.max(0.015, (tlX + 0.32) / GRID_W),
          y: Math.max(0.015, (tlY + 0.32) / GRID_H),
        },
        topRight: {
          x: Math.min(0.985, (trX + 0.68) / GRID_W),
          y: Math.max(0.015, (trY + 0.32) / GRID_H),
        },
        bottomRight: {
          x: Math.min(0.985, (brX + 0.68) / GRID_W),
          y: Math.min(0.985, (brY + 0.68) / GRID_H),
        },
        bottomLeft: {
          x: Math.max(0.015, (blX + 0.32) / GRID_W),
          y: Math.min(0.985, (blY + 0.68) / GRID_H),
        },
      };

      const area = quadArea(candQuad);
      const topWidth = Math.hypot(
        candQuad.topRight.x - candQuad.topLeft.x,
        candQuad.topRight.y - candQuad.topLeft.y
      );
      const botWidth = Math.hypot(
        candQuad.bottomRight.x - candQuad.bottomLeft.x,
        candQuad.bottomRight.y - candQuad.bottomLeft.y
      );
      const leftHeight = Math.hypot(
        candQuad.bottomLeft.x - candQuad.topLeft.x,
        candQuad.bottomLeft.y - candQuad.topLeft.y
      );

      if (area >= 0.045 && topWidth >= 0.15 && botWidth >= 0.15 && leftHeight >= 0.14) {
        fittedQuad = candQuad;
        hasDocument = true;
      }
    }
  }

  // Measure internal sharpness strictly inside detected sheet region (or center patch while searching)
  const box = boundingBoxFromQuad(fittedQuad);
  const sX1 = hasDocument ? Math.max(1, Math.floor(box.x * GRID_W) + 1) : 6;
  const sX2 = hasDocument
    ? Math.min(GRID_W - 2, Math.floor((box.x + box.width) * GRID_W) - 1)
    : GRID_W - 7;
  const sY1 = hasDocument ? Math.max(1, Math.floor(box.y * GRID_H) + 1) : 8;
  const sY2 = hasDocument
    ? Math.min(GRID_H - 2, Math.floor((box.y + box.height) * GRID_H) - 1)
    : GRID_H - 9;

  let sharpSum = 0;
  let sharpCnt = 0;
  for (let y = sY1; y <= sY2; y++) {
    for (let x = sX1; x <= sX2; x++) {
      if (hasDocument && mask[y * GRID_W + x] !== 1) continue;
      const idx = y * GRID_W + x;
      const gxGrad = Math.abs(grid[idx + 1] - grid[idx - 1]);
      const gyGrad = Math.abs(grid[idx + GRID_W] - grid[idx - GRID_W]);
      sharpSum += gxGrad + gyGrad;
      sharpCnt += 1;
    }
  }

  const focusSharpness =
    sharpCnt > 0 ? Math.round((sharpSum / sharpCnt) * 10) / 10 : 0;

  if (!hasDocument) {
    const noDocStatus: DocumentAlignmentStatus =
      meanBrightness < minBrightness
        ? 'low_light'
        : overExposedCount > totalGrid * 0.65 && focusSharpness < 5
          ? 'glare'
          : 'searching';
    return {
      hasDocument: false,
      status: noDocStatus,
      optimalityScore: noDocStatus === 'low_light' ? 12 : 18,
      isOptimal: false,
      headline:
        noDocStatus === 'low_light'
          ? 'Cahaya terlalu gelap'
          : noDocStatus === 'glare'
            ? 'Terlalu silau / pantulan kuat'
            : 'Arahkan kertas ke dalam sudut bingkai',
      hint:
        noDocStatus === 'low_light'
          ? 'Tambah pencahayaan agar kertas dan teks terbaca jelas'
          : noDocStatus === 'glare'
            ? 'Miringkan sedikit untuk mengurangi pantulan cahaya'
            : 'Posisikan dokumen di tengah bingkai kamera',
      meanBrightness,
      focusSharpness,
      coverageRatio: 0,
      paperBox: defaultBox,
      corners: defaultQuad,
      skewAngleDeg: 0,
    };
  }

  const coverageRatio = Math.max(0, Math.min(1, quadArea(fittedQuad)));
  const cx =
    (fittedQuad.topLeft.x +
      fittedQuad.topRight.x +
      fittedQuad.bottomRight.x +
      fittedQuad.bottomLeft.x) *
    0.25;
  const cy =
    (fittedQuad.topLeft.y +
      fittedQuad.topRight.y +
      fittedQuad.bottomRight.y +
      fittedQuad.bottomLeft.y) *
    0.25;

  const topAngle =
    (Math.atan2(
      fittedQuad.topRight.y - fittedQuad.topLeft.y,
      fittedQuad.topRight.x - fittedQuad.topLeft.x
    ) *
      180) /
    Math.PI;
  const botAngle =
    (Math.atan2(
      fittedQuad.bottomRight.y - fittedQuad.bottomLeft.y,
      fittedQuad.bottomRight.x - fittedQuad.bottomLeft.x
    ) *
      180) /
    Math.PI;
  const skewAngleDeg = Math.round(((topAngle + botAngle) * 0.5) * 10) / 10;

  const minCornerX = Math.min(
    fittedQuad.topLeft.x,
    fittedQuad.topRight.x,
    fittedQuad.bottomRight.x,
    fittedQuad.bottomLeft.x
  );
  const maxCornerX = Math.max(
    fittedQuad.topLeft.x,
    fittedQuad.topRight.x,
    fittedQuad.bottomRight.x,
    fittedQuad.bottomLeft.x
  );
  const minCornerY = Math.min(
    fittedQuad.topLeft.y,
    fittedQuad.topRight.y,
    fittedQuad.bottomRight.y,
    fittedQuad.bottomLeft.y
  );
  const maxCornerY = Math.max(
    fittedQuad.topLeft.y,
    fittedQuad.topRight.y,
    fittedQuad.bottomRight.y,
    fittedQuad.bottomLeft.y
  );

  const offsetX = cx - 0.5;
  const offsetY = cy - 0.5;

  const isLowLight = meanBrightness < minBrightness;
  const isGlare = meanBrightness > 238 && focusSharpness < 5.5;
  const isClipped =
    minCornerX <= 0.025 ||
    maxCornerX >= 0.975 ||
    minCornerY <= 0.025 ||
    maxCornerY >= 0.975;
  const isTooFar = coverageRatio < 0.16;
  const isTooClose = coverageRatio > 0.90 && !isClipped;
  const isOffCenter = Math.abs(offsetX) > 0.18 || Math.abs(offsetY) > 0.18;
  const isBlurry = focusSharpness < minSharpness;

  let score = 100;
  if (isLowLight) score -= 36;
  if (isGlare) score -= 30;
  if (isClipped) score -= 28;
  if (isTooFar) score -= 26;
  if (isTooClose) score -= 18;
  if (isOffCenter) {
    score -= Math.min(20, Math.round((Math.abs(offsetX) + Math.abs(offsetY)) * 42));
  }
  if (isBlurry) {
    score -= Math.min(24, Math.round((minSharpness - focusSharpness) * 5 + 8));
  }
  if (!isTooFar && coverageRatio < 0.25) {
    score -= Math.round((0.25 - coverageRatio) * 55);
  }
  if (Math.abs(skewAngleDeg) > 15) {
    score -= Math.min(16, Math.round((Math.abs(skewAngleDeg) - 15) * 1.2));
  }

  const optimalityScore = Math.max(5, Math.min(100, Math.round(score)));

  let status: DocumentAlignmentStatus = 'optimal';
  let headline = 'Sudut Kertas Pas · Optimal untuk Scan';
  let hint = 'Tahan stabil lalu tekan tombol Capture';

  if (isLowLight) {
    status = 'low_light';
    headline = 'Cahaya terlalu gelap';
    hint = 'Tambahkan cahaya agar hasil OCR tetap akurat';
  } else if (isGlare) {
    status = 'glare';
    headline = 'Pantulan cahaya terlalu kuat';
    hint = 'Ubah sudut kamera sedikit agar tidak silau';
  } else if (isClipped) {
    status = 'clipped';
    headline = 'Tepi kertas mepet / terpotong';
    hint = 'Mundurkan kamera sedikit agar 4 sudut kertas masuk penuh';
  } else if (isTooFar) {
    status = 'too_far';
    headline = 'Dokumen terlalu jauh';
    hint = 'Dekatkan kamera agar ukuran kertas lebih jelas';
  } else if (isTooClose) {
    status = 'too_close';
    headline = 'Dokumen terlalu dekat';
    hint = 'Beri jarak sedikit di sekeliling tepi kertas';
  } else if (isOffCenter) {
    status = 'off_center';
    headline = 'Posisi kertas belum di tengah';
    const dir =
      Math.abs(offsetX) >= Math.abs(offsetY)
        ? offsetX > 0
          ? 'kiri'
          : 'kanan'
        : offsetY > 0
          ? 'atas'
          : 'bawah';
    hint = `Geser dokumen ke arah ${dir} agar sudut seimbang`;
  } else if (isBlurry || optimalityScore < minOptimal) {
    status = 'blurry';
    headline = 'Fokus teks belum tajam';
    hint = 'Tahan kamera stabil 1 detik hingga teks fokus';
  }

  const isOptimal = status === 'optimal' && optimalityScore >= minOptimal;

  return {
    hasDocument: true,
    status,
    optimalityScore,
    isOptimal,
    headline,
    hint,
    meanBrightness,
    focusSharpness,
    coverageRatio,
    paperBox: box,
    corners: fittedQuad,
    skewAngleDeg,
  };
}

/**
 * Creates a lightweight CameraProcessor running paper-quad, brightness, and sharpness
 * analysis directly in the Camera Worklet thread without running heavy OCR text inference.
 */
export function createDocumentAlignmentProcessor(
  options: DocumentAlignmentOptions = {}
): CameraProcessor {
  const targetFps = Math.max(1, options.targetFps ?? 5);
  const smoothingAlpha = options.smoothingAlpha ?? 0.45;
  const jitterDeadzone = options.jitterDeadzone ?? 0.012;
  const minOptimalScore = options.minOptimalityScore ?? 72;
  const minBrightness = options.minBrightness ?? 46;
  const minFocusSharpness = options.minFocusSharpness ?? 4.5;
  const defaultBox = options.defaultGuideBox ?? DEFAULT_ALIGNMENT_GUIDE_BOX;
  const defaultQuad = quadFromBoundingBox(defaultBox);
  const minIntervalMs = 1000 / targetFps;

  const readySync = createSafeSync<boolean>(true, true);
  const wasThrottledSync: WorkletBoolSync = createSafeSync<boolean>(false, true);
  const lastFrameTimeSync = createSafeSync<number>(0, true);

  const tlXSync = createSafeSync<number>(defaultQuad.topLeft.x, true);
  const tlYSync = createSafeSync<number>(defaultQuad.topLeft.y, true);
  const trXSync = createSafeSync<number>(defaultQuad.topRight.x, true);
  const trYSync = createSafeSync<number>(defaultQuad.topRight.y, true);
  const brXSync = createSafeSync<number>(defaultQuad.bottomRight.x, true);
  const brYSync = createSafeSync<number>(defaultQuad.bottomRight.y, true);
  const blXSync = createSafeSync<number>(defaultQuad.bottomLeft.x, true);
  const blYSync = createSafeSync<number>(defaultQuad.bottomLeft.y, true);

  const status: ModelStatus = 'ready';

  const processFrameWorklet = (frame: unknown): DetectionResult[] => {
    'worklet';
    if (!readySync.getBlocking()) {
      wasThrottledSync.setBlocking(false);
      return [];
    }

    const now = Date.now();
    const lastTime = lastFrameTimeSync.getBlocking();
    if (lastTime > 0 && now - lastTime < minIntervalMs) {
      wasThrottledSync.setBlocking(true);
      return [];
    }
    wasThrottledSync.setBlocking(false);
    lastFrameTimeSync.setBlocking(now);

    const analysis = analyzeFrameDocumentWorklet(frame, {
      targetFps,
      minOptimalityScore: minOptimalScore,
      minBrightness,
      minFocusSharpness,
      smoothingAlpha,
      jitterDeadzone,
      defaultGuideBox: defaultBox,
    });

    const prevQuad: DocumentQuad = {
      topLeft: { x: tlXSync.getBlocking(), y: tlYSync.getBlocking() },
      topRight: { x: trXSync.getBlocking(), y: trYSync.getBlocking() },
      bottomRight: { x: brXSync.getBlocking(), y: brYSync.getBlocking() },
      bottomLeft: { x: blXSync.getBlocking(), y: blYSync.getBlocking() },
    };

    const smoothedQuad = analysis.hasDocument
      ? smoothAlignedQuadWorklet(
          prevQuad,
          analysis.corners,
          smoothingAlpha,
          jitterDeadzone
        )
      : smoothAlignedQuadWorklet(prevQuad, defaultQuad, 0.5, 0.005);

    tlXSync.setBlocking(smoothedQuad.topLeft.x);
    tlYSync.setBlocking(smoothedQuad.topLeft.y);
    trXSync.setBlocking(smoothedQuad.topRight.x);
    trYSync.setBlocking(smoothedQuad.topRight.y);
    brXSync.setBlocking(smoothedQuad.bottomRight.x);
    brYSync.setBlocking(smoothedQuad.bottomRight.y);
    blXSync.setBlocking(smoothedQuad.bottomLeft.x);
    blYSync.setBlocking(smoothedQuad.bottomLeft.y);

    const smoothedBox = boundingBoxFromQuad(smoothedQuad);

    return [
      {
        id: 'doc-alignment',
        label: analysis.headline,
        confidence: analysis.optimalityScore / 100,
        boundingBox: smoothedBox,
        documentAlignment: {
          status: analysis.status,
          optimalityScore: analysis.optimalityScore,
          isOptimal: analysis.isOptimal,
          hasDocument: analysis.hasDocument,
          headline: analysis.headline,
          hint: analysis.hint,
          meanBrightness: analysis.meanBrightness,
          focusSharpness: analysis.focusSharpness,
          coverageRatio: analysis.coverageRatio,
          corners: smoothedQuad,
          skewAngleDeg: analysis.skewAngleDeg,
        },
      },
    ];
  };

  return {
    id: `doc-align-${Date.now()}`,
    name: 'DocumentAlignmentWorklet',
    status,
    preferredPixelFormat: 'yuv',
    targetFps,
    wasThrottledSync,
    processFrameWorklet,
    initialize: async () => {
      readySync.setBlocking(true);
      lastFrameTimeSync.setBlocking(0);
      wasThrottledSync.setBlocking(false);
    },
    processFrame: (frame: unknown) => processFrameWorklet(frame),
    dispose: () => {
      readySync.setBlocking(false);
      lastFrameTimeSync.setBlocking(0);
      wasThrottledSync.setBlocking(false);
    },
  };
}
