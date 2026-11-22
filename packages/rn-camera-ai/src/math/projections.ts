import type { ScaleAndOffsets, StreamDimensions, ViewDimensions } from '../types/contracts';

/**
 * Calculates scaling factors, rendered dimensions, and centering offsets for
 * video streaming within a view container using either 'cover' or 'contain' resize modes.
 *
 * - 'cover': Scales stream to completely fill container. Symmetric crop margins (offsetX <= 0, offsetY <= 0).
 * - 'contain': Scales stream to fit entirely inside container. Pillarbox/letterbox margins (offsetX >= 0, offsetY >= 0).
 *
 * @param view - View dimensions of the preview container.
 * @param stream - Camera stream resolution.
 * @param resizeMode - Scaling strategy ('cover' or 'contain').
 * @returns ScaleAndOffsets object with scale, offsets, and rendered dimensions.
 */
export function calculateScaleAndOffsets(
  view: ViewDimensions,
  stream: StreamDimensions,
  resizeMode: 'cover' | 'contain'
): ScaleAndOffsets {
  'worklet';
  if (
    !Number.isFinite(view.width) ||
    !Number.isFinite(view.height) ||
    !Number.isFinite(stream.width) ||
    !Number.isFinite(stream.height) ||
    view.width <= 0 ||
    view.height <= 0 ||
    stream.width <= 0 ||
    stream.height <= 0
  ) {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      renderedWidth: Math.max(0, Number.isFinite(view.width) ? view.width : 0),
      renderedHeight: Math.max(0, Number.isFinite(view.height) ? view.height : 0),
    };
  }

  const scaleX = view.width / stream.width;
  const scaleY = view.height / stream.height;

  const scale = resizeMode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const renderedWidth = stream.width * scale;
  const renderedHeight = stream.height * scale;

  const offsetX = (view.width - renderedWidth) / 2;
  const offsetY = (view.height - renderedHeight) / 2;

  return {
    scale,
    offsetX,
    offsetY,
    renderedWidth,
    renderedHeight,
  };
}
