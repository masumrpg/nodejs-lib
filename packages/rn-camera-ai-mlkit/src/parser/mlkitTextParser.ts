import {
  type BoundingBox,
  type DetectionResult,
  type OcrEntityCategory,
  type OcrGranularity,
  type OcrPoint,
  clampBox,
} from '@masumdev/rn-camera-ai';
import type {
  MLKitBoundingBox,
  MLKitCorner,
  MLKitTextRecognitionResult,
  OcrEntityFilter,
  ParseMLKitTextOptions,
  StructuredOcrEntities,
} from '../types/mlkit';

function isDigitCharCode(code: number): boolean {
  'worklet';
  return code >= 48 && code <= 57;
}

function isAlphaNumOrDashDot(code: number): boolean {
  'worklet';
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 45 ||
    code === 46 ||
    code === 95 ||
    code === 43
  );
}

/**
 * Classifies a recognized OCR text snippet into semantic categories inside worklets
 * without depending on heavy regex allocations or non-serializable globals.
 */
export function classifyOcrEntity(rawText: string): OcrEntityCategory {
  'worklet';
  const text = rawText.trim();
  if (text.length === 0) {
    return 'text';
  }

  const lower = text.toLowerCase();

  // 1. Email detection (check before bare-domain URL suffix so user@example.com stays 'email')
  const atIdx = text.indexOf('@');
  if (atIdx > 0 && atIdx < text.length - 3) {
    const afterAt = text.slice(atIdx + 1);
    if (
      !text.includes(' ') &&
      !lower.startsWith('http://') &&
      !lower.startsWith('https://') &&
      afterAt.includes('.') &&
      isAlphaNumOrDashDot(text.charCodeAt(atIdx - 1))
    ) {
      return 'email';
    }
  }

  // 2. URL detection
  if (
    lower.includes('http://') ||
    lower.includes('https://') ||
    lower.includes('www.') ||
    (!text.includes(' ') &&
      !text.includes('@') &&
      (lower.endsWith('.com') ||
        lower.endsWith('.id') ||
        lower.endsWith('.org') ||
        lower.endsWith('.net') ||
        lower.endsWith('.io') ||
        lower.endsWith('.dev')))
  ) {
    return 'url';
  }

  // 3. Currency detection (IDR Rp, USD $, EUR)
  if (
    lower.startsWith('rp') ||
    lower.includes(' rp ') ||
    lower.startsWith('idr') ||
    text.startsWith('$') ||
    text.includes('€')
  ) {
    let hasDigit = false;
    for (let i = 0; i < text.length; i++) {
      if (isDigitCharCode(text.charCodeAt(i))) {
        hasDigit = true;
        break;
      }
    }
    if (hasDigit) {
      return 'currency';
    }
  }

  // Analyze digit & letter composition
  let digitCount = 0;
  let letterCount = 0;
  let maxContiguousDigits = 0;
  let currentDigits = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (isDigitCharCode(ch)) {
      digitCount++;
      currentDigits++;
      if (currentDigits > maxContiguousDigits) {
        maxContiguousDigits = currentDigits;
      }
    } else {
      if (ch !== 32 && ch !== 45) {
        currentDigits = 0;
      }
      if ((ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122)) {
        letterCount++;
      }
    }
  }

  // 4. Indonesian 16-digit NIK / KTP ID
  if (maxContiguousDigits === 16 || (digitCount === 16 && letterCount <= 3)) {
    return 'nik';
  }

  // 5. Phone number detection (+62 / 08 / international formats with 8-15 digits)
  if (
    letterCount <= 4 &&
    digitCount >= 8 &&
    digitCount <= 15 &&
    (text.startsWith('+') ||
      text.startsWith('08') ||
      text.startsWith('(0') ||
      text.startsWith('628') ||
      text.includes('-'))
  ) {
    return 'phone';
  }

  // 6. Pure numeric identifier / quantity / code
  if (digitCount > 0 && letterCount === 0 && text.length <= 24) {
    return 'number';
  }

  return 'text';
}

function normalizeMLKitBounds(
  bounds: MLKitBoundingBox | null | undefined,
  frameWidth: number,
  frameHeight: number
): BoundingBox | null {
  'worklet';
  if (!bounds || frameWidth <= 0 || frameHeight <= 0) {
    return null;
  }

  const w = Number.isFinite(bounds.width) ? bounds.width : 0;
  const h = Number.isFinite(bounds.height) ? bounds.height : 0;
  if (w <= 0 || h <= 0) {
    return null;
  }

  // react-native-vision-camera-mlkit populates bounds.left / bounds.top as top-left pixels
  // and bounds.x / bounds.y as exactCenterX / exactCenterY.
  const rawLeft =
    typeof bounds.left === 'number' && Number.isFinite(bounds.left)
      ? bounds.left
      : Number.isFinite(bounds.x)
        ? bounds.x - w * 0.5
        : 0;
  const rawTop =
    typeof bounds.top === 'number' && Number.isFinite(bounds.top)
      ? bounds.top
      : Number.isFinite(bounds.y)
        ? bounds.y - h * 0.5
        : 0;

  return clampBox({
    x: rawLeft / frameWidth,
    y: rawTop / frameHeight,
    width: w / frameWidth,
    height: h / frameHeight,
  });
}

function normalizeMLKitCorners(
  corners: MLKitCorner[] | null | undefined,
  frameWidth: number,
  frameHeight: number
): OcrPoint[] | undefined {
  'worklet';
  if (!corners || !Array.isArray(corners) || corners.length === 0) {
    return undefined;
  }
  if (frameWidth <= 0 || frameHeight <= 0) {
    return undefined;
  }

  const normalized: OcrPoint[] = [];
  for (let i = 0; i < corners.length; i++) {
    const pt = corners[i];
    if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
      normalized.push({
        x: Math.max(0, Math.min(1, pt.x / frameWidth)),
        y: Math.max(0, Math.min(1, pt.y / frameHeight)),
      });
    }
  }
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Worklet-safe parser translating raw Google ML Kit TextRecognitionResult objects
 * into normalized [0..1] @masumdev/rn-camera-ai DetectionResult arrays.
 */
export function parseMLKitTextResult(
  rawResult: MLKitTextRecognitionResult | null | undefined,
  frameWidth: number,
  frameHeight: number,
  options: ParseMLKitTextOptions = {}
): DetectionResult[] {
  'worklet';
  if (
    !rawResult ||
    !Array.isArray(rawResult.blocks) ||
    frameWidth <= 0 ||
    frameHeight <= 0
  ) {
    return [];
  }

  const granularity: OcrGranularity = options.granularity ?? 'line';
  const entityFilter: OcrEntityFilter = options.entityFilter ?? 'all';
  const minTextLength =
    typeof options.minTextLength === 'number' && options.minTextLength >= 0
      ? options.minTextLength
      : 1;
  const minConfidence =
    typeof options.minConfidence === 'number' &&
    Number.isFinite(options.minConfidence)
      ? Math.max(0, Math.min(1, options.minConfidence))
      : 0;
  const maxResults =
    typeof options.maxResults === 'number' && options.maxResults >= 0
      ? Math.floor(options.maxResults)
      : 30;
  const defaultConfidence =
    typeof options.defaultConfidence === 'number' &&
    Number.isFinite(options.defaultConfidence)
      ? Math.max(0, Math.min(1, options.defaultConfidence))
      : 0.92;

  if (maxResults === 0) {
    return [];
  }

  const fullText = typeof rawResult.text === 'string' ? rawResult.text : '';
  const results: DetectionResult[] = [];
  let itemIdx = 0;

  const pushCandidate = (
    textValue: string,
    bounds: MLKitBoundingBox | null | undefined,
    corners: MLKitCorner[] | null | undefined,
    rawConfidence: number | null | undefined,
    rawAngle: number | null | undefined,
    languages: string[] | undefined
  ) => {
    if (results.length >= maxResults) {
      return;
    }

    const trimmed = typeof textValue === 'string' ? textValue.trim() : '';
    if (trimmed.length < minTextLength) {
      return;
    }

    const resolvedConfidence =
      typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
        ? Math.max(0, Math.min(1, rawConfidence))
        : defaultConfidence;

    if (resolvedConfidence < minConfidence) {
      return;
    }

    const category = classifyOcrEntity(trimmed);
    if (entityFilter !== 'all' && category !== entityFilter) {
      return;
    }

    const normalizedBox = normalizeMLKitBounds(bounds, frameWidth, frameHeight);
    if (!normalizedBox || normalizedBox.width <= 0 || normalizedBox.height <= 0) {
      return;
    }

    const normalizedCorners = normalizeMLKitCorners(
      corners,
      frameWidth,
      frameHeight
    );

    const resolvedLanguages =
      Array.isArray(languages) && languages.length > 0 ? languages : ['und'];

    results.push({
      id: `ocr-${granularity}-${itemIdx++}`,
      label: trimmed,
      confidence: resolvedConfidence,
      boundingBox: normalizedBox,
      ocr: {
        text: trimmed,
        granularity,
        category,
        languages: resolvedLanguages,
        confidence:
          typeof rawConfidence === 'number' && Number.isFinite(rawConfidence)
            ? resolvedConfidence
            : undefined,
        angle:
          typeof rawAngle === 'number' && Number.isFinite(rawAngle)
            ? rawAngle
            : undefined,
        corners: normalizedCorners,
        fullText,
      },
    });
  };

  for (let b = 0; b < rawResult.blocks.length; b++) {
    const block = rawResult.blocks[b];
    if (!block) {
      continue;
    }

    if (granularity === 'block') {
      const firstLine = block.lines && block.lines[0];
      pushCandidate(
        block.text,
        block.bounds,
        block.corners,
        firstLine?.confidence,
        firstLine?.angle,
        block.languages
      );
      continue;
    }

    const lines = Array.isArray(block.lines) ? block.lines : [];
    for (let l = 0; l < lines.length; l++) {
      const line = lines[l];
      if (!line) {
        continue;
      }

      if (granularity === 'line') {
        pushCandidate(
          line.text,
          line.bounds,
          line.corners,
          line.confidence,
          line.angle,
          line.languages ?? block.languages
        );
        continue;
      }

      const elements = Array.isArray(line.elements) ? line.elements : [];
      for (let e = 0; e < elements.length; e++) {
        const element = elements[e];
        if (!element) {
          continue;
        }
        pushCandidate(
          element.text,
          element.bounds,
          element.corners,
          element.confidence,
          element.angle,
          element.languages ?? line.languages ?? block.languages
        );
      }
    }
  }

  return results;
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim();
    if (item.length > 0 && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/**
 * Extracts structured entities (NIK/KTP, Emails, Phone numbers, URLs, Currencies)
 * from raw recognized document transcript text.
 */
export function extractStructuredOcrData(fullText: string): StructuredOcrEntities {
  if (!fullText || typeof fullText !== 'string') {
    return { niks: [], emails: [], phones: [], urls: [], currencies: [] };
  }

  const emailMatches =
    fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const emailDomains = new Set<string>(
    emailMatches.map((em) => {
      const idx = em.indexOf('@');
      return idx >= 0 ? em.slice(idx + 1).toLowerCase() : '';
    })
  );

  const rawUrlMatches =
    fullText.match(
      /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|(?:^|[\s(])[a-zA-Z0-9-]+\.(?:com|id|org|net|io|dev|co\.id)(?:\/[^\s]*)?/gi
    ) ?? [];
  const urlMatches = rawUrlMatches
    .map((u) => u.trim().replace(/^[(\s]+/, ''))
    .filter((u) => {
      const lowerUrl = u.toLowerCase();
      return (
        lowerUrl.startsWith('http') ||
        lowerUrl.startsWith('www.') ||
        !emailDomains.has(lowerUrl)
      );
    });

  const nikMatches = fullText.match(/\b\d{16}\b/g) ?? [];

  const phoneMatches =
    fullText.match(/(?:\+62|62|08|\+\d{1,3})[\d\s-]{7,15}\d/g) ?? [];

  const currencyMatches =
    fullText.match(/(?:Rp\.?|IDR|\$|€)\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?/gi) ??
    [];

  return {
    niks: dedupeStrings(nikMatches),
    emails: dedupeStrings(emailMatches),
    phones: dedupeStrings(phoneMatches),
    urls: dedupeStrings(urlMatches),
    currencies: dedupeStrings(currencyMatches),
  };
}
