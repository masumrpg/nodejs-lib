import type {
  BoundingBox,
  FaceLandmark,
  FrameOrientation,
  PixelBoundingBox,
  PixelFaceLandmark,
  TransformOptions,
} from '../types/contracts';
import { clampBox } from './coordinates';
import { calculateScaleAndOffsets } from './projections';

/**
 * Horizontally mirrors a normalized bounding box along the horizontal axis:
 * x* = 1 - x - width
 *
 * Used for front-facing camera previews to match the user's mirrored selfie perspective.
 *
 * @param box - Normalized bounding box.
 * @returns Mirrored normalized bounding box.
 */
export function mirrorHorizontalBox(box: BoundingBox): BoundingBox {
  'worklet';
  const clamped = clampBox(box);
  const mirroredX = Math.max(0, Math.min(1, 1 - clamped.x - clamped.width));

  return clampBox({
    x: mirroredX,
    y: clamped.y,
    width: clamped.width,
    height: clamped.height,
  });
}

/**
 * Rotates a normalized bounding box according to physical camera frame orientation.
 *
 * Orientations relative to upright portrait:
 * - 'portrait': 0 deg (unchanged)
 * - 'landscape-left': 90 deg clockwise (x' = 1 - y - h, y' = x, w' = h, h' = w)
 * - 'portrait-upside-down': 180 deg (x' = 1 - x - w, y' = 1 - y - h, w' = w, h' = h)
 * - 'landscape-right': 270 deg clockwise (x' = y, y' = 1 - x - w, w' = h, h' = w)
 *
 * @param box - Normalized bounding box.
 * @param orientation - Frame orientation offset.
 * @returns Rotated normalized bounding box clamped to [0, 1].
 */
export function rotateBox(
  box: BoundingBox,
  orientation: FrameOrientation
): BoundingBox {
  'worklet';
  const clamped = clampBox(box);

  switch (orientation) {
    case 'landscape-left': {
      // 90 deg clockwise
      const x = 1 - clamped.y - clamped.height;
      const y = clamped.x;
      const width = clamped.height;
      const height = clamped.width;
      return clampBox({ x, y, width, height });
    }
    case 'portrait-upside-down': {
      // 180 deg
      const x = 1 - clamped.x - clamped.width;
      const y = 1 - clamped.y - clamped.height;
      return clampBox({ x, y, width: clamped.width, height: clamped.height });
    }
    case 'landscape-right': {
      // 270 deg clockwise
      const x = clamped.y;
      const y = 1 - clamped.x - clamped.width;
      const width = clamped.height;
      const height = clamped.width;
      return clampBox({ x, y, width, height });
    }
    case 'portrait':
    default:
      return clamped;
  }
}

/**
 * Transforms a normalized bounding box [0, 1] to pixel coordinates in the container view space,
 * applying orientation rotation, horizontal mirroring, and scaling/centering offsets.
 *
 * @param box - Normalized bounding box [0, 1].
 * @param options - Transformation settings including view dimensions, stream dimensions, resize mode, orientation, and mirroring.
 * @returns PixelBoundingBox mapped to view coordinates.
 */
export function transformNormalizedToPixelBox(
  box: BoundingBox,
  options: TransformOptions
): PixelBoundingBox {
  'worklet';
  let transformed = clampBox(box);

  if (options.orientation && options.orientation !== 'portrait') {
    transformed = rotateBox(transformed, options.orientation);
  }

  if (options.isMirrored) {
    transformed = mirrorHorizontalBox(transformed);
  }

  const { renderedWidth, renderedHeight, offsetX, offsetY } = calculateScaleAndOffsets(
    options.viewDimensions,
    options.streamDimensions,
    options.resizeMode
  );

  return {
    x: transformed.x * renderedWidth + offsetX,
    y: transformed.y * renderedHeight + offsetY,
    width: transformed.width * renderedWidth,
    height: transformed.height * renderedHeight,
  };
}

/**
 * Transforms a normalized 2D landmark point [0, 1] to pixel coordinates in the container view space,
 * applying the exact same orientation rotation, front-camera mirroring, and scaling offsets as bounding boxes.
 *
 * @param point - Normalized 2D landmark point [0, 1].
 * @param options - Transformation settings including view dimensions, stream dimensions, resize mode, orientation, and mirroring.
 * @returns PixelFaceLandmark mapped to view coordinates.
 */
export function transformNormalizedPointToPixel(
  point: FaceLandmark,
  options: TransformOptions
): PixelFaceLandmark {
  'worklet';
  let x = Number.isFinite(point?.x) ? Math.max(0, Math.min(1, point.x)) : 0;
  let y = Number.isFinite(point?.y) ? Math.max(0, Math.min(1, point.y)) : 0;

  if (options.orientation && options.orientation !== 'portrait') {
    switch (options.orientation) {
      case 'landscape-left': {
        const nextX = 1 - y;
        const nextY = x;
        x = Math.max(0, Math.min(1, nextX));
        y = Math.max(0, Math.min(1, nextY));
        break;
      }
      case 'portrait-upside-down': {
        x = Math.max(0, Math.min(1, 1 - x));
        y = Math.max(0, Math.min(1, 1 - y));
        break;
      }
      case 'landscape-right': {
        const nextX = y;
        const nextY = 1 - x;
        x = Math.max(0, Math.min(1, nextX));
        y = Math.max(0, Math.min(1, nextY));
        break;
      }
      default:
        break;
    }
  }

  if (options.isMirrored) {
    x = Math.max(0, Math.min(1, 1 - x));
  }

  const { renderedWidth, renderedHeight, offsetX, offsetY } = calculateScaleAndOffsets(
    options.viewDimensions,
    options.streamDimensions,
    options.resizeMode
  );

  return {
    x: x * renderedWidth + offsetX,
    y: y * renderedHeight + offsetY,
    type: point?.type,
  };
}
