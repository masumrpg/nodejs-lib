import { describe, expect, test } from 'bun:test';
import type { DetectionResult, FaceLandmark } from '@masumdev/rn-camera-ai';
import {
  projectDetectionsWorklet,
  type WorkletOverlayConfig,
} from '../src/components/DetectionOverlay';

const BASE_CONFIG: WorkletOverlayConfig = {
  boxColor: '#3da441',
  unrecognizedBoxColor: '#f59e0b',
  cornerLength: 22,
  showConfidence: true,
  showLandmarks: true,
  showMeshLines: true,
  showTesselation: false,
  showDots: true,
  lineScale: 1,
  tesselationColor: '#ffffff',
  faceOvalColor: '#38bdf8',
  eyeContourColor: '#10b981',
  eyebrowContourColor: '#f59e0b',
  lipOuterContourColor: '#f43f5e',
  lipInnerContourColor: '#fb7185',
  noseContourColor: '#22d3ee',
  eyeDotColor: '#10b981',
  denseMeshDotColor: '#38bdf8',
  landmarkColor: '#38bdf8',
  eyeDotRadius: 2.5,
  denseMeshDotRadius: 1.5,
  keypointDotRadius: 3,
};

function createCat48Landmarks(): FaceLandmark[] {
  return Array.from({ length: 48 }, (_, idx) => {
    const angle = (idx / 48) * Math.PI * 2;
    return {
      x: 0.5 + 0.14 * Math.cos(angle),
      y: 0.5 + 0.14 * Math.sin(angle),
      z: 0,
    };
  });
}

describe('packages/rn-camera-ai > CatFLW 48-pt overlay wireframe projection', () => {
  test('projects 48-pt CatFLW ears, eyes, nose, and mouth wireframe segments and dots', () => {
    const catDetection: DetectionResult = {
      id: 'cat-0',
      label: 'British Shorthair',
      confidence: 0.91,
      boundingBox: { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
      landmarks: createCat48Landmarks(),
      cat: {
        isCat: true,
        topBreeds: [{ breed: 'British Shorthair', confidence: 0.91, source: 'ensemble' }],
      },
    };

    const projected = projectDetectionsWorklet(
      [catDetection],
      {
        viewDimensions: { width: 400, height: 800 },
        streamDimensions: { width: 400, height: 800 },
        resizeMode: 'cover',
        isMirrored: false,
        orientation: 'portrait',
      },
      BASE_CONFIG
    );

    expect(projected.length).toBe(1);
    expect(projected[0].meshDots.length).toBe(48);
    expect(projected[0].meshSegments.length).toBeGreaterThan(25);
    expect(projected[0].formattedText).toBe('British Shorthair 91%');

    const eyeDots = projected[0].meshDots.filter(
      (dot) => dot.color === BASE_CONFIG.eyeDotColor
    );
    expect(eyeDots.length).toBeGreaterThanOrEqual(8);
  });

  test('respects showMeshLines and showLandmarks toggles for 48-pt cat landmarks', () => {
    const catDetection: DetectionResult = {
      id: 'cat-1',
      label: 'Tabby',
      confidence: 0.85,
      boundingBox: { x: 0.1, y: 0.1, width: 0.7, height: 0.7 },
      landmarks: createCat48Landmarks(),
    };

    const transform = {
      viewDimensions: { width: 400, height: 400 },
      streamDimensions: { width: 400, height: 400 },
      resizeMode: 'cover' as const,
    };

    const dotsOnly = projectDetectionsWorklet([catDetection], transform, {
      ...BASE_CONFIG,
      showMeshLines: false,
    });
    expect(dotsOnly[0].meshSegments.length).toBe(0);
    expect(dotsOnly[0].meshDots.length).toBe(48);

    const hidden = projectDetectionsWorklet([catDetection], transform, {
      ...BASE_CONFIG,
      showLandmarks: false,
    });
    expect(hidden[0].meshSegments.length).toBe(0);
    expect(hidden[0].meshDots.length).toBe(0);
  });
});
