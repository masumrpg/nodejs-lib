import type {
  BoundingBox,
  DetectionResult,
  OcrPoint,
} from '@masumdev/rn-camera-ai';

/**
 * Alignment & scan-readiness verdict emitted by `evaluateDocumentFraming`.
 */
export type DocumentFramingStatus =
  | 'searching'
  | 'too_far'
  | 'too_close'
  | 'off_center'
  | 'clipped'
  | 'tilted'
  | 'low_clarity'
  | 'optimal';

/**
 * Normalized paper corner bounds and scan-readiness evaluation produced from preview OCR detections.
 */
export interface DocumentFramingAssessment {
  /** Granular geometric and OCR clarity status */
  status: DocumentFramingStatus;
  /** Probability score (0-100) that capturing right now will yield clean OCR */
  optimalityScore: number;
  /** True when status === 'optimal' and score meets minimum threshold */
  isOptimal: boolean;
  /** Concise status headline suitable for UI status pills */
  headline: string;
  /** Actionable positioning instruction for the user */
  hint: string;
  /** True when at least one valid text/document region was detected */
  hasDocument: boolean;
  /** Normalized [0..1] estimated paper bounding box hugging outer document margins */
  paperBox: BoundingBox;
  /** Normalized [0..1] 4 corner coordinates [topLeft, topRight, bottomRight, bottomLeft] */
  paperCorners: readonly [OcrPoint, OcrPoint, OcrPoint, OcrPoint];
  /** Mean document baseline skew angle in degrees */
  skewAngleDeg: number;
  /** Normalized viewport area fraction covered by the estimated paper box (0..1) */
  coverageRatio: number;
  /** Number of detected boxes contributing to the paper envelope */
  blockCount: number;
  /** Detected line/box count */
  lineCount: number;
  /** Mean ML Kit confidence score [0..1] when reported by native recognizer */
  averageConfidence: number;
}

/**
 * Tuning options for `evaluateDocumentFraming`.
 */
export interface EvaluateDocumentFramingOptions {
  /** Baseline target guide box when searching for a document */
  guideBox?: BoundingBox;
  /** Minimum optimality score (0-100) required to report `isOptimal: true` (default: 75) */
  minOptimalityScore?: number;
  /** Maximum permitted tilt angle in degrees before flagging `'tilted'` (default: 10) */
  maxSkewDeg?: number;
}

/**
 * Default normalized paper viewfinder guide rectangle matching portrait document aspect.
 */
export const DEFAULT_DOCUMENT_GUIDE_BOX: BoundingBox = {
  x: 0.08,
  y: 0.14,
  width: 0.84,
  height: 0.64,
};

function clampUnit(value: number): number {
  'worklet';
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildCornersFromBox(
  box: BoundingBox,
  angleDeg: number
): readonly [OcrPoint, OcrPoint, OcrPoint, OcrPoint] {
  'worklet';
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.5;
  const hw = box.width * 0.5;
  const hh = box.height * 0.5;
  const rad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const rotatePoint = (dx: number, dy: number): OcrPoint => ({
    x: clampUnit(cx + dx * cosA - dy * sinA),
    y: clampUnit(cy + dx * sinA + dy * cosA),
  });

  return [
    rotatePoint(-hw, -hh),
    rotatePoint(hw, -hh),
    rotatePoint(hw, hh),
    rotatePoint(-hw, hh),
  ];
}

/**
 * Smoothly interpolates between consecutive detected paper rectangles with a small deadzone
 * so UI-thread corner brackets glide onto paper corners without micro-jitter.
 */
export function smoothPaperBox(
  previousBox: BoundingBox,
  nextBox: BoundingBox,
  alpha = 0.36,
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

  const clampedAlpha = Math.max(0.05, Math.min(1, alpha));
  return {
    x: previousBox.x + (nextBox.x - previousBox.x) * clampedAlpha,
    y: previousBox.y + (nextBox.y - previousBox.y) * clampedAlpha,
    width: previousBox.width + (nextBox.width - previousBox.width) * clampedAlpha,
    height: previousBox.height + (nextBox.height - previousBox.height) * clampedAlpha,
  };
}

/**
 * Evaluates detected OCR blocks/lines to fit outer paper corners, classify positioning
 * alignment, and predict capture OCR optimality (0-100%).
 */
export function evaluateDocumentFraming(
  detections: readonly DetectionResult[],
  options: EvaluateDocumentFramingOptions = {}
): DocumentFramingAssessment {
  'worklet';
  const guide = options.guideBox ?? DEFAULT_DOCUMENT_GUIDE_BOX;
  const minOptimalScore = options.minOptimalityScore ?? 75;
  const maxSkewDeg = options.maxSkewDeg ?? 10;

  if (!detections || detections.length === 0) {
    return {
      status: 'searching',
      optimalityScore: 0,
      isOptimal: false,
      headline: 'Arahkan kertas ke dalam sudut bingkai',
      hint: 'Pastikan teks dokumen terlihat jelas dan terang',
      hasDocument: false,
      paperBox: guide,
      paperCorners: buildCornersFromBox(guide, 0),
      skewAngleDeg: 0,
      coverageRatio: 0,
      blockCount: 0,
      lineCount: 0,
      averageConfidence: 0,
    };
  }

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let totalChars = 0;
  let angleSum = 0;
  let angleCount = 0;
  let confSum = 0;
  let confCount = 0;
  let lineHeightSum = 0;
  let validCount = 0;

  for (let i = 0; i < detections.length; i++) {
    const det = detections[i];
    const b = det?.boundingBox;
    if (!b || b.width <= 0 || b.height <= 0) {
      continue;
    }

    validCount += 1;
    const x1 = clampUnit(b.x);
    const y1 = clampUnit(b.y);
    const x2 = clampUnit(b.x + b.width);
    const y2 = clampUnit(b.y + b.height);

    if (x1 < minX) minX = x1;
    if (y1 < minY) minY = y1;
    if (x2 > maxX) maxX = x2;
    if (y2 > maxY) maxY = y2;

    if (det.ocr?.corners && det.ocr.corners.length > 0) {
      for (let c = 0; c < det.ocr.corners.length; c++) {
        const pt = det.ocr.corners[c];
        if (!pt) continue;
        const px = clampUnit(pt.x);
        const py = clampUnit(pt.y);
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
    }

    lineHeightSum += b.height;
    totalChars += (det.ocr?.text ?? det.label ?? '').trim().length;

    if (typeof det.ocr?.angle === 'number' && Number.isFinite(det.ocr.angle)) {
      angleSum += det.ocr.angle;
      angleCount += 1;
    }
    if (typeof det.ocr?.confidence === 'number' && Number.isFinite(det.ocr.confidence)) {
      confSum += det.ocr.confidence;
      confCount += 1;
    }
  }

  if (validCount === 0 || maxX <= minX || maxY <= minY) {
    return {
      status: 'searching',
      optimalityScore: 0,
      isOptimal: false,
      headline: 'Arahkan kertas ke dalam sudut bingkai',
      hint: 'Pastikan teks dokumen terlihat jelas dan terang',
      hasDocument: false,
      paperBox: guide,
      paperCorners: buildCornersFromBox(guide, 0),
      skewAngleDeg: 0,
      coverageRatio: 0,
      blockCount: 0,
      lineCount: 0,
      averageConfidence: 0,
    };
  }

  const hullW = Math.max(0.05, maxX - minX);
  const hullH = Math.max(0.05, maxY - minY);
  const padX = Math.max(0.032, Math.min(0.085, hullW * 0.095));
  const padY = Math.max(0.036, Math.min(0.095, hullH * 0.11));

  const paperX = Math.max(0.025, minX - padX);
  const paperY = Math.max(0.025, minY - padY);
  const paperRight = Math.min(0.975, maxX + padX);
  const paperBottom = Math.min(0.975, maxY + padY);
  const paperBox: BoundingBox = {
    x: paperX,
    y: paperY,
    width: Math.max(0.14, paperRight - paperX),
    height: Math.max(0.12, paperBottom - paperY),
  };

  const rawAngle = angleCount > 0 ? angleSum / angleCount : 0;
  // Normalize baseline skew into [-45, 45] range for display
  const clampedAngle =
    rawAngle > 45 ? ((rawAngle + 45) % 90) - 45 : rawAngle < -45 ? ((rawAngle - 45) % 90) + 45 : rawAngle;
  const absAngle = Math.abs(clampedAngle);
  const avgConfidence = confCount > 0 ? confSum / confCount : 0.88;
  const meanLineHeight = lineHeightSum / validCount;
  const coverageRatio = Math.max(0, Math.min(1, paperBox.width * paperBox.height));

  const cx = minX + hullW * 0.5;
  const cy = minY + hullH * 0.5;
  const guideCx = guide.x + guide.width * 0.5;
  const guideCy = guide.y + guide.height * 0.5;
  const offsetX = cx - guideCx;
  const offsetY = cy - guideCy;

  const isClipped = minX < 0.035 || maxX > 0.965 || minY < 0.035 || maxY > 0.965;
  const isTooFar =
    coverageRatio < 0.14 || (hullW < 0.28 && hullH < 0.24 && meanLineHeight < 0.02);
  const isTooClose = coverageRatio > 0.88 && !isClipped;
  const isTilted = absAngle > maxSkewDeg;
  const isOffCenter = Math.abs(offsetX) > 0.18 || Math.abs(offsetY) > 0.18;
  const isLowClarity =
    totalChars < 6 || (confCount > 0 && avgConfidence < 0.62);

  let score = 100;
  if (isClipped) score -= 32;
  if (isTooFar) score -= 28;
  if (isTooClose) score -= 22;
  if (isTilted) score -= Math.min(30, Math.round((absAngle - maxSkewDeg) * 2.2 + 8));
  if (isOffCenter) {
    score -= Math.min(22, Math.round((Math.abs(offsetX) + Math.abs(offsetY)) * 45));
  }
  if (isLowClarity) score -= 26;

  // Mild bonus penalty if text block area is smaller than ideal document ratio
  if (!isTooFar && coverageRatio < 0.22) {
    score -= Math.round((0.22 - coverageRatio) * 80);
  }
  if (confCount > 0 && avgConfidence < 0.85) {
    score -= Math.round((0.85 - avgConfidence) * 40);
  }

  const optimalityScore = Math.max(5, Math.min(100, Math.round(score)));

  let status: DocumentFramingStatus = 'optimal';
  let headline = 'Sudut Pas · Hasil Optimal';
  let hint = 'Tahan stabil lalu tekan tombol Capture';

  if (isClipped) {
    status = 'clipped';
    headline = 'Tepi kertas terpotong';
    hint = 'Mundurkan sedikit agar seluruh sudut dokumen masuk bingkai';
  } else if (isTilted) {
    status = 'tilted';
    headline = `Dokumen miring (${Math.round(absAngle)}°)`;
    hint = 'Luruskan sudut kertas agar sejajar dengan bingkai';
  } else if (isTooFar) {
    status = 'too_far';
    headline = 'Dokumen terlalu jauh';
    hint = 'Dekatkan kamera agar tulisan lebih tajam saat dipindai';
  } else if (isTooClose) {
    status = 'too_close';
    headline = 'Dokumen terlalu dekat';
    hint = 'Beri jarak sedikit agar pinggir kertas tidak terpotong';
  } else if (isOffCenter) {
    status = 'off_center';
    headline = 'Posisi belum di tengah';
    const dir =
      Math.abs(offsetX) >= Math.abs(offsetY)
        ? offsetX > 0
          ? 'kiri'
          : 'kanan'
        : offsetY > 0
          ? 'atas'
          : 'bawah';
    hint = `Geser dokumen ke arah ${dir} agar sudut pas`;
  } else if (isLowClarity || optimalityScore < minOptimalScore) {
    status = 'low_clarity';
    headline = 'Kurang Optimal · Perlu Penyesuaian';
    hint = 'Tambah cahaya atau tunggu kamera fokus sejenak';
  }

  const isOptimal = status === 'optimal' && optimalityScore >= minOptimalScore;

  return {
    status,
    optimalityScore,
    isOptimal,
    headline,
    hint,
    hasDocument: true,
    paperBox,
    paperCorners: buildCornersFromBox(paperBox, clampedAngle),
    skewAngleDeg: Math.round(clampedAngle * 10) / 10,
    coverageRatio,
    blockCount: validCount,
    lineCount: validCount,
    averageConfidence: Math.round(avgConfidence * 100) / 100,
  };
}

/**
 * Helper mapping `DocumentFramingAssessment` into `<DocumentGuideOverlay />` input shape.
 */
export function toDocumentGuideReadiness(
  assessment: DocumentFramingAssessment
): 'searching' | 'adjusting' | 'optimal' {
  'worklet';
  if (!assessment.hasDocument || assessment.status === 'searching') {
    return 'searching';
  }
  return assessment.isOptimal ? 'optimal' : 'adjusting';
}
