import { describe, expect, it } from 'bun:test';
import {
  clampBox,
  denormalizeCoordinates,
  normalizeCoordinates,
} from '../src/math/coordinates';

describe('Coordinate Normalization & Clamping Math', () => {
  describe('clampBox', () => {
    it('preserves valid normalized bounding boxes', () => {
      const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
      const clamped = clampBox(box);

      expect(clamped.x).toBeCloseTo(0.1);
      expect(clamped.y).toBeCloseTo(0.2);
      expect(clamped.width).toBeCloseTo(0.3);
      expect(clamped.height).toBeCloseTo(0.4);
    });

    it('clamps negative x and y coordinates to 0', () => {
      const box = { x: -0.25, y: -0.5, width: 0.4, height: 0.6 };
      const clamped = clampBox(box);

      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
      expect(clamped.width).toBeCloseTo(0.4);
      expect(clamped.height).toBeCloseTo(0.6);
    });

    it('clamps coordinates greater than 1 to 1 and limits width/height to 0', () => {
      const box = { x: 1.5, y: 2.0, width: 0.5, height: 0.5 };
      const clamped = clampBox(box);

      expect(clamped.x).toBe(1);
      expect(clamped.y).toBe(1);
      expect(clamped.width).toBe(0);
      expect(clamped.height).toBe(0);
    });

    it('clamps width when box overflows horizontal boundary (x + width > 1)', () => {
      const box = { x: 0.75, y: 0.1, width: 0.5, height: 0.3 };
      const clamped = clampBox(box);

      expect(clamped.x).toBeCloseTo(0.75);
      expect(clamped.width).toBeCloseTo(0.25);
    });

    it('clamps height when box overflows vertical boundary (y + height > 1)', () => {
      const box = { x: 0.1, y: 0.8, width: 0.3, height: 0.5 };
      const clamped = clampBox(box);

      expect(clamped.y).toBeCloseTo(0.8);
      expect(clamped.height).toBeCloseTo(0.2);
    });

    it('clamps negative width and height to 0', () => {
      const box = { x: 0.2, y: 0.3, width: -0.1, height: -0.2 };
      const clamped = clampBox(box);

      expect(clamped.width).toBe(0);
      expect(clamped.height).toBe(0);
    });

    it('handles full-canvas bounding box [0, 0, 1, 1]', () => {
      const box = { x: 0, y: 0, width: 1, height: 1 };
      const clamped = clampBox(box);

      expect(clamped).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    });

    it('sanitizes all-NaN bounding box to zero box without propagating NaN', () => {
      const box = { x: NaN, y: NaN, width: NaN, height: NaN };
      const clamped = clampBox(box);

      expect(Number.isNaN(clamped.x)).toBe(false);
      expect(Number.isNaN(clamped.y)).toBe(false);
      expect(Number.isNaN(clamped.width)).toBe(false);
      expect(Number.isNaN(clamped.height)).toBe(false);
      expect(clamped).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('sanitizes partial-NaN bounding boxes safely', () => {
      const box = { x: NaN, y: 0.25, width: 0.5, height: NaN };
      const clamped = clampBox(box);

      expect(clamped.x).toBe(0);
      expect(clamped.y).toBeCloseTo(0.25);
      expect(clamped.width).toBeCloseTo(0.5);
      expect(clamped.height).toBe(0);
    });

    it('sanitizes non-finite coordinates (NaN and Infinity) safely to 0', () => {
      const box = { x: -Infinity, y: Infinity, width: Infinity, height: -Infinity };
      const clamped = clampBox(box);

      expect(Number.isFinite(clamped.x)).toBe(true);
      expect(Number.isFinite(clamped.y)).toBe(true);
      expect(Number.isFinite(clamped.width)).toBe(true);
      expect(Number.isFinite(clamped.height)).toBe(true);
      expect(clamped).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });

  describe('normalizeCoordinates', () => {
    it('normalizes pixel coordinates to [0, 1]', () => {
      const pixel = { x: 100, y: 200, width: 300, height: 400 };
      const bounds = { width: 1000, height: 2000 };

      const normalized = normalizeCoordinates(pixel, bounds);

      expect(normalized.x).toBeCloseTo(0.1);
      expect(normalized.y).toBeCloseTo(0.1);
      expect(normalized.width).toBeCloseTo(0.3);
      expect(normalized.height).toBeCloseTo(0.2);
    });

    it('clamps normalized coordinates when pixel rect overflows bounds', () => {
      const pixel = { x: 800, y: 900, width: 500, height: 300 };
      const bounds = { width: 1000, height: 1000 };

      const normalized = normalizeCoordinates(pixel, bounds);

      expect(normalized.x).toBeCloseTo(0.8);
      expect(normalized.y).toBeCloseTo(0.9);
      expect(normalized.width).toBeCloseTo(0.2);
      expect(normalized.height).toBeCloseTo(0.1);
    });

    it('returns zero box when view dimensions are 0 or negative', () => {
      const pixel = { x: 50, y: 50, width: 100, height: 100 };

      expect(normalizeCoordinates(pixel, { width: 0, height: 500 })).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
      expect(normalizeCoordinates(pixel, { width: 500, height: -100 })).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    });

    it('returns zero box when view dimensions or pixel coordinates contain NaN', () => {
      expect(
        normalizeCoordinates({ x: 10, y: 10, width: 20, height: 20 }, { width: NaN, height: 100 })
      ).toEqual({ x: 0, y: 0, width: 0, height: 0 });

      const normalized = normalizeCoordinates(
        { x: NaN, y: 10, width: NaN, height: 20 },
        { width: 100, height: 100 }
      );
      expect(Number.isNaN(normalized.x)).toBe(false);
      expect(Number.isNaN(normalized.width)).toBe(false);
      expect(normalized.x).toBe(0);
      expect(normalized.width).toBe(0);
    });
  });

  describe('denormalizeCoordinates', () => {
    it('denormalizes normalized coordinates to pixel space', () => {
      const box = { x: 0.1, y: 0.2, width: 0.5, height: 0.4 };
      const bounds = { width: 1920, height: 1080 };

      const pixel = denormalizeCoordinates(box, bounds);

      expect(pixel.x).toBeCloseTo(192);
      expect(pixel.y).toBeCloseTo(216);
      expect(pixel.width).toBeCloseTo(960);
      expect(pixel.height).toBeCloseTo(432);
    });

    it('clamps box before denormalizing', () => {
      const box = { x: -0.1, y: 0.9, width: 0.5, height: 0.5 };
      const bounds = { width: 1000, height: 1000 };

      const pixel = denormalizeCoordinates(box, bounds);

      expect(pixel.x).toBe(0);
      expect(pixel.y).toBeCloseTo(900);
      expect(pixel.width).toBeCloseTo(500);
      expect(pixel.height).toBeCloseTo(100);
    });

    it('handles NaN bounding box and NaN bounds safely', () => {
      const pixel1 = denormalizeCoordinates(
        { x: NaN, y: NaN, width: NaN, height: NaN },
        { width: 1000, height: 1000 }
      );
      expect(pixel1).toEqual({ x: 0, y: 0, width: 0, height: 0 });

      const pixel2 = denormalizeCoordinates(
        { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
        { width: NaN, height: NaN }
      );
      expect(pixel2).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });
});
