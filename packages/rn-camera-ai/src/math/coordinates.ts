import type { BoundingBox, PixelBoundingBox, ViewDimensions } from '../types/contracts';

/**
 * Clamps bounding box values so that x, y, width, and height remain validly within [0, 1].
 *
 * @param box - Raw bounding box in normalized coordinates.
 * @returns BoundingBox guaranteed to be within [0, 1].
 */
export function clampBox(box: BoundingBox): BoundingBox {
  'worklet';
  const rawX = Number.isFinite(box.x) ? box.x : 0;
  const rawY = Number.isFinite(box.y) ? box.y : 0;
  const x = Math.max(0, Math.min(1, rawX));
  const y = Math.max(0, Math.min(1, rawY));
  const maxWidth = Math.max(0, 1 - x);
  const maxHeight = Math.max(0, 1 - y);
  const rawWidth = Number.isFinite(box.width) ? box.width : 0;
  const rawHeight = Number.isFinite(box.height) ? box.height : 0;
  const width = Math.max(0, Math.min(maxWidth, rawWidth));
  const height = Math.max(0, Math.min(maxHeight, rawHeight));

  return { x, y, width, height };
}

/**
 * Normalizes pixel bounding box coordinates to [0, 1] relative to given container or frame dimensions.
 *
 * @param pixel - Bounding box in pixel dimensions.
 * @param bounds - Container or frame dimensions.
 * @returns Normalized BoundingBox clamped to [0, 1].
 */
export function normalizeCoordinates(
  pixel: PixelBoundingBox,
  bounds: ViewDimensions
): BoundingBox {
  'worklet';
  if (
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const rawX = Number.isFinite(pixel.x) ? pixel.x : 0;
  const rawY = Number.isFinite(pixel.y) ? pixel.y : 0;
  const rawWidth = Number.isFinite(pixel.width) ? pixel.width : 0;
  const rawHeight = Number.isFinite(pixel.height) ? pixel.height : 0;

  return clampBox({
    x: rawX / bounds.width,
    y: rawY / bounds.height,
    width: rawWidth / bounds.width,
    height: rawHeight / bounds.height,
  });
}

/**
 * Denormalizes a normalized bounding box [0, 1] to pixel dimensions.
 *
 * @param box - Normalized bounding box.
 * @param bounds - Container dimensions.
 * @returns PixelBoundingBox in pixel space.
 */
export function denormalizeCoordinates(
  box: BoundingBox,
  bounds: ViewDimensions
): PixelBoundingBox {
  'worklet';
  const clamped = clampBox(box);
  const width = Number.isFinite(bounds.width) ? Math.max(0, bounds.width) : 0;
  const height = Number.isFinite(bounds.height) ? Math.max(0, bounds.height) : 0;

  return {
    x: clamped.x * width,
    y: clamped.y * height,
    width: clamped.width * width,
    height: clamped.height * height,
  };
}
