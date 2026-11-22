import { describe, expect, it } from 'bun:test';
import { calculateScaleAndOffsets } from '../src/math/projections';

describe('Camera Projection Math (Cover & Contain)', () => {
  describe('Identical Aspect Ratio', () => {
    it('calculates 1:1 scale when view and stream dimensions match', () => {
      const view = { width: 1080, height: 1920 };
      const stream = { width: 1080, height: 1920 };

      const cover = calculateScaleAndOffsets(view, stream, 'cover');
      expect(cover.scale).toBe(1);
      expect(cover.offsetX).toBe(0);
      expect(cover.offsetY).toBe(0);
      expect(cover.renderedWidth).toBe(1080);
      expect(cover.renderedHeight).toBe(1920);

      const contain = calculateScaleAndOffsets(view, stream, 'contain');
      expect(contain.scale).toBe(1);
      expect(contain.offsetX).toBe(0);
      expect(contain.offsetY).toBe(0);
    });

    it('scales up uniformly without offset when ratios are identical', () => {
      const view = { width: 800, height: 800 };
      const stream = { width: 400, height: 400 };

      const result = calculateScaleAndOffsets(view, stream, 'cover');
      expect(result.scale).toBe(2);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
      expect(result.renderedWidth).toBe(800);
      expect(result.renderedHeight).toBe(800);
    });
  });

  describe('Cover Resize Mode', () => {
    it('crops horizontally (offsetX < 0) when view is taller than stream', () => {
      // View aspect = 400 / 800 = 0.5 (tall)
      // Stream aspect = 1000 / 1000 = 1.0 (square / wider)
      const view = { width: 400, height: 800 };
      const stream = { width: 1000, height: 1000 };

      const result = calculateScaleAndOffsets(view, stream, 'cover');

      // scale should be max(400/1000, 800/1000) = 0.8
      expect(result.scale).toBeCloseTo(0.8);
      expect(result.renderedWidth).toBeCloseTo(800);
      expect(result.renderedHeight).toBeCloseTo(800);
      // offsetX = (400 - 800) / 2 = -200 (symmetric horizontal crop)
      expect(result.offsetX).toBeCloseTo(-200);
      expect(result.offsetY).toBeCloseTo(0);
    });

    it('crops vertically (offsetY < 0) when view is wider than stream', () => {
      // View aspect = 800 / 400 = 2.0 (wide)
      // Stream aspect = 1000 / 1000 = 1.0 (square / taller)
      const view = { width: 800, height: 400 };
      const stream = { width: 1000, height: 1000 };

      const result = calculateScaleAndOffsets(view, stream, 'cover');

      // scale should be max(800/1000, 400/1000) = 0.8
      expect(result.scale).toBeCloseTo(0.8);
      expect(result.renderedWidth).toBeCloseTo(800);
      expect(result.renderedHeight).toBeCloseTo(800);
      expect(result.offsetX).toBeCloseTo(0);
      // offsetY = (400 - 800) / 2 = -200 (symmetric vertical crop)
      expect(result.offsetY).toBeCloseTo(-200);
    });

    it('accurately projects 9:16 portrait stream into 9:20 modern phone screen in cover mode', () => {
      // Phone screen: 360 x 800 (ratio 0.45)
      // Camera stream: 1080 x 1920 (ratio 0.5625)
      const view = { width: 360, height: 800 };
      const stream = { width: 1080, height: 1920 };

      const result = calculateScaleAndOffsets(view, stream, 'cover');

      // scale = max(360/1080, 800/1920) = max(0.3333, 0.41667) = 5/12
      expect(result.scale).toBeCloseTo(5 / 12);
      expect(result.renderedHeight).toBeCloseTo(800);
      expect(result.renderedWidth).toBeCloseTo(450);
      // Horizontal crop: (360 - 450) / 2 = -45 px
      expect(result.offsetX).toBeCloseTo(-45);
      expect(result.offsetY).toBeCloseTo(0);
    });
  });

  describe('Contain Resize Mode', () => {
    it('letterboxes vertically (offsetY > 0) when view is taller than stream', () => {
      // View aspect = 400 / 800 = 0.5 (tall)
      // Stream aspect = 1000 / 1000 = 1.0 (square)
      const view = { width: 400, height: 800 };
      const stream = { width: 1000, height: 1000 };

      const result = calculateScaleAndOffsets(view, stream, 'contain');

      // scale should be min(400/1000, 800/1000) = 0.4
      expect(result.scale).toBeCloseTo(0.4);
      expect(result.renderedWidth).toBeCloseTo(400);
      expect(result.renderedHeight).toBeCloseTo(400);
      expect(result.offsetX).toBeCloseTo(0);
      // offsetY = (800 - 400) / 2 = 200 (top/bottom letterbox margins)
      expect(result.offsetY).toBeCloseTo(200);
    });

    it('pillarboxes horizontally (offsetX > 0) when view is wider than stream', () => {
      // View aspect = 800 / 400 = 2.0 (wide)
      // Stream aspect = 1000 / 1000 = 1.0 (square)
      const view = { width: 800, height: 400 };
      const stream = { width: 1000, height: 1000 };

      const result = calculateScaleAndOffsets(view, stream, 'contain');

      // scale should be min(800/1000, 400/1000) = 0.4
      expect(result.scale).toBeCloseTo(0.4);
      expect(result.renderedWidth).toBeCloseTo(400);
      expect(result.renderedHeight).toBeCloseTo(400);
      // offsetX = (800 - 400) / 2 = 200 (left/right pillarbox margins)
      expect(result.offsetX).toBeCloseTo(200);
      expect(result.offsetY).toBeCloseTo(0);
    });

    it('accurately projects 9:16 portrait stream into 9:20 modern phone screen in contain mode', () => {
      const view = { width: 360, height: 800 };
      const stream = { width: 1080, height: 1920 };

      const result = calculateScaleAndOffsets(view, stream, 'contain');

      // scale = min(360/1080, 800/1920) = 1/3
      expect(result.scale).toBeCloseTo(1 / 3);
      expect(result.renderedWidth).toBeCloseTo(360);
      expect(result.renderedHeight).toBeCloseTo(640);
      expect(result.offsetX).toBeCloseTo(0);
      // Letterbox: (800 - 640) / 2 = 80 px top and bottom
      expect(result.offsetY).toBeCloseTo(80);
    });
  });

  describe('Degenerate & Zero Dimensions', () => {
    it('returns identity fallback when view width or height is 0', () => {
      const result = calculateScaleAndOffsets({ width: 0, height: 500 }, { width: 100, height: 100 }, 'cover');
      expect(result.scale).toBe(1);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('returns identity fallback when stream width or height is 0', () => {
      const result = calculateScaleAndOffsets({ width: 500, height: 500 }, { width: 0, height: 100 }, 'contain');
      expect(result.scale).toBe(1);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('returns fallback and never outputs NaN when view dimensions contain NaN or Infinity', () => {
      const result1 = calculateScaleAndOffsets(
        { width: NaN, height: 800 },
        { width: 1000, height: 1000 },
        'cover'
      );
      expect(Number.isNaN(result1.scale)).toBe(false);
      expect(Number.isNaN(result1.offsetX)).toBe(false);
      expect(Number.isNaN(result1.offsetY)).toBe(false);
      expect(Number.isNaN(result1.renderedWidth)).toBe(false);
      expect(Number.isNaN(result1.renderedHeight)).toBe(false);
      expect(result1.scale).toBe(1);
      expect(result1.offsetX).toBe(0);
      expect(result1.offsetY).toBe(0);
      expect(result1.renderedWidth).toBe(0);
      expect(result1.renderedHeight).toBe(800);

      const result2 = calculateScaleAndOffsets(
        { width: 800, height: Infinity },
        { width: 1000, height: 1000 },
        'contain'
      );
      expect(result2.scale).toBe(1);
      expect(result2.offsetX).toBe(0);
      expect(result2.offsetY).toBe(0);
    });

    it('returns fallback and never outputs NaN when stream dimensions contain NaN', () => {
      const result = calculateScaleAndOffsets(
        { width: 400, height: 800 },
        { width: NaN, height: NaN },
        'cover'
      );
      expect(Number.isNaN(result.scale)).toBe(false);
      expect(Number.isNaN(result.offsetX)).toBe(false);
      expect(Number.isNaN(result.offsetY)).toBe(false);
      expect(result.scale).toBe(1);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
      expect(result.renderedWidth).toBe(400);
      expect(result.renderedHeight).toBe(800);
    });
  });
});
