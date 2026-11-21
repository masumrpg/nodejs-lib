import { describe, expect, it } from 'bun:test';
import {
  mirrorHorizontalBox,
  rotateBox,
  transformNormalizedToPixelBox,
} from '../src/math/transforms';

describe('Coordinate Transformation & Sensor Mapping', () => {
  describe('mirrorHorizontalBox', () => {
    it('mirrors left-hand box (x = 0.1, w = 0.2) to right-hand (x = 0.7, w = 0.2)', () => {
      const box = { x: 0.1, y: 0.3, width: 0.2, height: 0.4 };
      const mirrored = mirrorHorizontalBox(box);

      // x* = 1 - x - w = 1 - 0.1 - 0.2 = 0.7
      expect(mirrored.x).toBeCloseTo(0.7);
      expect(mirrored.y).toBeCloseTo(0.3);
      expect(mirrored.width).toBeCloseTo(0.2);
      expect(mirrored.height).toBeCloseTo(0.4);
    });

    it('mirrors right-hand box (x = 0.7, w = 0.2) to left-hand (x = 0.1, w = 0.2)', () => {
      const box = { x: 0.7, y: 0.2, width: 0.2, height: 0.5 };
      const mirrored = mirrorHorizontalBox(box);

      // x* = 1 - 0.7 - 0.2 = 0.1
      expect(mirrored.x).toBeCloseTo(0.1);
      expect(mirrored.y).toBeCloseTo(0.2);
      expect(mirrored.width).toBeCloseTo(0.2);
      expect(mirrored.height).toBeCloseTo(0.5);
    });

    it('leaves horizontally centered box at the same position', () => {
      // Centered: [0.4, 0.2, 0.2, 0.3] -> x* = 1 - 0.4 - 0.2 = 0.4
      const box = { x: 0.4, y: 0.2, width: 0.2, height: 0.3 };
      const mirrored = mirrorHorizontalBox(box);

      expect(mirrored.x).toBeCloseTo(0.4);
      expect(mirrored.width).toBeCloseTo(0.2);
    });

    it('handles flush left and flush right edge cases', () => {
      // Left flush: [0.0, 0.2, 0.3, 0.4] -> [0.7, 0.2, 0.3, 0.4]
      const leftFlush = mirrorHorizontalBox({ x: 0.0, y: 0.2, width: 0.3, height: 0.4 });
      expect(leftFlush.x).toBeCloseTo(0.7);

      // Right flush: [0.7, 0.2, 0.3, 0.4] -> [0.0, 0.2, 0.3, 0.4]
      const rightFlush = mirrorHorizontalBox({ x: 0.7, y: 0.2, width: 0.3, height: 0.4 });
      expect(rightFlush.x).toBeCloseTo(0.0);
    });

    it('preserves full-width bounding box', () => {
      const full = mirrorHorizontalBox({ x: 0, y: 0, width: 1, height: 1 });
      expect(full.x).toBe(0);
      expect(full.width).toBe(1);
    });
  });

  describe('rotateBox', () => {
    const original = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

    it('preserves box under portrait (0 deg) orientation', () => {
      const rotated = rotateBox(original, 'portrait');
      expect(rotated.x).toBeCloseTo(0.1);
      expect(rotated.y).toBeCloseTo(0.2);
      expect(rotated.width).toBeCloseTo(0.3);
      expect(rotated.height).toBeCloseTo(0.4);
    });

    it('rotates box correctly under landscape-left (90 deg CW)', () => {
      // 90 deg CW: x' = 1 - y - h, y' = x, w' = h, h' = w
      // x' = 1 - 0.2 - 0.4 = 0.4
      // y' = 0.1
      // w' = 0.4
      // h' = 0.3
      const rotated = rotateBox(original, 'landscape-left');
      expect(rotated.x).toBeCloseTo(0.4);
      expect(rotated.y).toBeCloseTo(0.1);
      expect(rotated.width).toBeCloseTo(0.4);
      expect(rotated.height).toBeCloseTo(0.3);
    });

    it('rotates box correctly under portrait-upside-down (180 deg)', () => {
      // 180 deg: x' = 1 - x - w, y' = 1 - y - h, w' = w, h' = h
      // x' = 1 - 0.1 - 0.3 = 0.6
      // y' = 1 - 0.2 - 0.4 = 0.4
      // w' = 0.3
      // h' = 0.4
      const rotated = rotateBox(original, 'portrait-upside-down');
      expect(rotated.x).toBeCloseTo(0.6);
      expect(rotated.y).toBeCloseTo(0.4);
      expect(rotated.width).toBeCloseTo(0.3);
      expect(rotated.height).toBeCloseTo(0.4);
    });

    it('rotates box correctly under landscape-right (270 deg CW)', () => {
      // 270 deg CW: x' = y, y' = 1 - x - w, w' = h, h' = w
      // x' = 0.2
      // y' = 1 - 0.1 - 0.3 = 0.6
      // w' = 0.4
      // h' = 0.3
      const rotated = rotateBox(original, 'landscape-right');
      expect(rotated.x).toBeCloseTo(0.2);
      expect(rotated.y).toBeCloseTo(0.6);
      expect(rotated.width).toBeCloseTo(0.4);
      expect(rotated.height).toBeCloseTo(0.3);
    });
  });

  describe('transformNormalizedToPixelBox', () => {
    it('projects normalized box into pixel coordinates with contain mode', () => {
      const box = { x: 0.1, y: 0.2, width: 0.5, height: 0.3 };
      const options = {
        viewDimensions: { width: 500, height: 1000 },
        streamDimensions: { width: 500, height: 500 },
        resizeMode: 'contain' as const,
      };

      // contain: scale = min(500/500, 1000/500) = 1
      // rendered: 500x500, offsetX = 0, offsetY = (1000 - 500)/2 = 250
      const pixel = transformNormalizedToPixelBox(box, options);

      expect(pixel.x).toBeCloseTo(0.1 * 500); // 50
      expect(pixel.y).toBeCloseTo(0.2 * 500 + 250); // 100 + 250 = 350
      expect(pixel.width).toBeCloseTo(0.5 * 500); // 250
      expect(pixel.height).toBeCloseTo(0.3 * 500); // 150
    });

    it('applies horizontal mirroring for front-facing camera in cover mode', () => {
      const box = { x: 0.1, y: 0.2, width: 0.2, height: 0.4 };
      const options = {
        viewDimensions: { width: 1000, height: 1000 },
        streamDimensions: { width: 1000, height: 1000 },
        resizeMode: 'cover' as const,
        isMirrored: true,
      };

      // Mirrored x* = 1 - 0.1 - 0.2 = 0.7
      const pixel = transformNormalizedToPixelBox(box, options);

      expect(pixel.x).toBeCloseTo(700);
      expect(pixel.y).toBeCloseTo(200);
      expect(pixel.width).toBeCloseTo(200);
      expect(pixel.height).toBeCloseTo(400);
    });

    it('combines rotation and mirroring and cover projection', () => {
      const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
      const options = {
        viewDimensions: { width: 1000, height: 1000 },
        streamDimensions: { width: 1000, height: 1000 },
        resizeMode: 'cover' as const,
        orientation: 'landscape-left' as const, // rotates to [0.4, 0.1, 0.4, 0.3]
        isMirrored: true, // then mirrors x: 1 - 0.4 - 0.4 = 0.2
      };

      const pixel = transformNormalizedToPixelBox(box, options);

      expect(pixel.x).toBeCloseTo(200);
      expect(pixel.y).toBeCloseTo(100);
      expect(pixel.width).toBeCloseTo(400);
      expect(pixel.height).toBeCloseTo(300);
    });

    it('safely handles NaN bounding box and dimensions without outputting NaN', () => {
      const box = { x: NaN, y: NaN, width: NaN, height: NaN };
      const options = {
        viewDimensions: { width: NaN, height: 800 },
        streamDimensions: { width: 1000, height: 1000 },
        resizeMode: 'cover' as const,
        isMirrored: true,
      };

      const pixel = transformNormalizedToPixelBox(box, options);

      expect(Number.isNaN(pixel.x)).toBe(false);
      expect(Number.isNaN(pixel.y)).toBe(false);
      expect(Number.isNaN(pixel.width)).toBe(false);
      expect(Number.isNaN(pixel.height)).toBe(false);
    });
  });
});
