import { describe, expect, test } from 'bun:test';
import type { DetectionResult } from '@masumdev/rn-camera-ai';
import {
  DEFAULT_DOCUMENT_GUIDE_BOX,
  evaluateDocumentFraming,
  smoothPaperBox,
  toDocumentGuideReadiness,
} from '../src';

function makeOcrBox(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text = 'Sample Document Text Line',
  angle = 0,
  confidence = 0.94
): DetectionResult {
  return {
    id,
    label: text,
    confidence,
    boundingBox: { x, y, width, height },
    ocr: {
      text,
      granularity: 'line',
      category: 'text',
      languages: ['id'],
      angle,
      confidence,
    },
  };
}

describe('packages/rn-camera-ai-mlkit > documentFraming', () => {
  test('reports searching when no detections are present', () => {
    const res = evaluateDocumentFraming([]);
    expect(res.status).toBe('searching');
    expect(res.hasDocument).toBe(false);
    expect(res.isOptimal).toBe(false);
    expect(res.optimalityScore).toBe(0);
    expect(res.paperBox).toEqual(DEFAULT_DOCUMENT_GUIDE_BOX);
    expect(toDocumentGuideReadiness(res)).toBe('searching');
  });

  test('fits paperBox cleanly around centered readable text and reports optimal', () => {
    const detections = [
      makeOcrBox('l1', 0.20, 0.24, 0.56, 0.05, 'PROVINSI JAWA BARAT'),
      makeOcrBox('l2', 0.20, 0.34, 0.60, 0.05, '3273011505990001'),
      makeOcrBox('l3', 0.20, 0.44, 0.50, 0.05, 'Nama : Masum Dev'),
      makeOcrBox('l4', 0.20, 0.56, 0.52, 0.05, 'Alamat : Bandung'),
    ];
    const res = evaluateDocumentFraming(detections);

    expect(res.hasDocument).toBe(true);
    expect(res.status).toBe('optimal');
    expect(res.isOptimal).toBe(true);
    expect(res.optimalityScore).toBeGreaterThanOrEqual(75);
    expect(toDocumentGuideReadiness(res)).toBe('optimal');

    // Fitted paperBox expands slightly outside the detected text hull
    expect(res.paperBox.x).toBeLessThan(0.20);
    expect(res.paperBox.y).toBeLessThan(0.24);
    expect(res.paperBox.x + res.paperBox.width).toBeGreaterThan(0.80);
    expect(res.paperBox.y + res.paperBox.height).toBeGreaterThan(0.61);
    expect(res.paperCorners.length).toBe(4);
  });

  test('flags clipped edge, tilted angle, too_far, and off_center accurately', () => {
    // 1. Clipped on left edge
    const clipped = evaluateDocumentFraming([
      makeOcrBox('c1', 0.01, 0.25, 0.65, 0.35),
    ]);
    expect(clipped.status).toBe('clipped');
    expect(clipped.isOptimal).toBe(false);
    expect(toDocumentGuideReadiness(clipped)).toBe('adjusting');

    // 2. Tilted document (> 10 deg)
    const tilted = evaluateDocumentFraming([
      makeOcrBox('t1', 0.20, 0.25, 0.60, 0.38, 'Dokumen Miring', 16),
    ]);
    expect(tilted.status).toBe('tilted');
    expect(tilted.isOptimal).toBe(false);
    expect(tilted.skewAngleDeg).toBe(16);

    // 3. Too far away (tiny area)
    const far = evaluateDocumentFraming([
      makeOcrBox('f1', 0.44, 0.42, 0.14, 0.015, 'Sample Small Document', 0),
    ]);
    expect(far.status).toBe('too_far');
    expect(far.isOptimal).toBe(false);

    // 4. Off-center shifted far left
    const offCenter = evaluateDocumentFraming([
      makeOcrBox('o1', 0.06, 0.22, 0.32, 0.44),
    ]);
    expect(offCenter.status).toBe('off_center');
    expect(offCenter.isOptimal).toBe(false);
  });

  test('smoothPaperBox dampens micro-jitter within deadzone and lerps large deltas', () => {
    const prev = { x: 0.1, y: 0.2, width: 0.7, height: 0.5 };
    const tinyJitter = { x: 0.104, y: 0.202, width: 0.703, height: 0.498 };
    expect(smoothPaperBox(prev, tinyJitter)).toEqual(prev);

    const moved = { x: 0.2, y: 0.3, width: 0.5, height: 0.4 };
    const lerped = smoothPaperBox(prev, moved, 0.5, 0.01);
    expect(lerped.x).toBeCloseTo(0.15, 5);
    expect(lerped.y).toBeCloseTo(0.25, 5);
    expect(lerped.width).toBeCloseTo(0.6, 5);
    expect(lerped.height).toBeCloseTo(0.45, 5);
  });
});
