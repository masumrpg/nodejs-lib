export interface ResizerModuleLike {
  resize: (
    frame: unknown,
    options: unknown
  ) => { buffer?: ArrayBuffer; toArrayBuffer?: () => ArrayBuffer };
}

export interface NitroImageLike {
  readonly width: number;
  readonly height: number;
  resize(width: number, height: number): NitroImageLike;
  toRawPixelData(allowGpu?: boolean): {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    pixelFormat: string;
  };
  dispose?: () => void;
}

export interface FrameConverterLike {
  convertFrameToImage(frame: unknown): NitroImageLike;
}

export interface WorkletSyncRef<T> {
  getBlocking(): T;
  setBlocking(value: T): void;
}

let cachedResizer: ResizerModuleLike | null | undefined = undefined;
let cachedFrameConverter: FrameConverterLike | null | undefined = undefined;

export function getOptionalResizePlugin(): ResizerModuleLike | null {
  if (cachedResizer !== undefined) {
    return cachedResizer;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const plugin = require('vision-camera-resize-plugin') as ResizerModuleLike;
    if (typeof plugin?.resize === 'function') {
      cachedResizer = plugin;
      return plugin;
    }
  } catch {
    // vision-camera-resize-plugin not installed
  }
  cachedResizer = null;
  return null;
}

export function getOptionalFrameConverter(): FrameConverterLike | null {
  if (cachedFrameConverter !== undefined) {
    return cachedFrameConverter;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vc = require('react-native-vision-camera') as {
      HybridFrameConverter?: FrameConverterLike;
    };
    if (typeof vc?.HybridFrameConverter?.convertFrameToImage === 'function') {
      cachedFrameConverter = vc.HybridFrameConverter;
      return cachedFrameConverter;
    }
  } catch {
    // react-native-vision-camera HybridFrameConverter not loaded
  }
  cachedFrameConverter = null;
  return null;
}

export function createWorkletSyncRef<T>(initial: T, fixedType = false): WorkletSyncRef<T> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const worklets = require('react-native-worklets') as {
      createSynchronizable?: <V>(
        value: V,
        config?: { fixedType?: boolean }
      ) => WorkletSyncRef<V>;
    };
    if (typeof worklets?.createSynchronizable === 'function') {
      return fixedType
        ? worklets.createSynchronizable(initial, { fixedType: true })
        : worklets.createSynchronizable(initial);
    }
  } catch {
    // Fallback outside native runtime
  }
  let val = initial;
  return {
    getBlocking: () => val,
    setBlocking: (next: T) => {
      val = next;
    },
  };
}

function viewToArrayBuffer(view: ArrayBufferView): ArrayBuffer {
  'worklet';
  const underlying = view.buffer as ArrayBuffer;
  if (view.byteOffset === 0 && view.byteLength === underlying.byteLength) {
    return underlying;
  }
  return underlying.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

function normalizeRawPixelsToRgbUint8(
  buffer: ArrayBuffer,
  pixelFormat: string,
  width: number,
  height: number
): ArrayBuffer {
  'worklet';
  const src = new Uint8Array(buffer);
  const expectedPixels = Math.max(0, Math.floor(width) * Math.floor(height));

  if (pixelFormat === 'RGB') {
    const expectedBytes = expectedPixels * 3;
    if (src.byteLength === expectedBytes) {
      return buffer;
    }
    const copyLen = Math.min(src.byteLength, expectedBytes);
    const out = new Uint8Array(expectedBytes);
    out.set(src.subarray(0, copyLen));
    return out.buffer;
  }

  const out = new Uint8Array(expectedPixels * 3);
  const count = Math.min(expectedPixels, Math.floor(src.byteLength / 4));
  const isBgra = pixelFormat === 'BGRA' || pixelFormat === 'BGRX';

  if (isBgra) {
    for (let i = 0; i < count; i++) {
      const s = i * 4;
      const d = i * 3;
      out[d] = src[s + 2];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s];
    }
  } else {
    for (let i = 0; i < count; i++) {
      const s = i * 4;
      const d = i * 3;
      out[d] = src[s];
      out[d + 1] = src[s + 1];
      out[d + 2] = src[s + 2];
    }
  }

  return out.buffer;
}

export interface ExtractedRgbFrame {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  needs180Correction: boolean;
}

/**
 * Extracts a contiguous RGB uint8 buffer from VisionCamera v5 Nitro Frame,
 * vision-camera-resize-plugin, or direct ArrayBuffer inputs cleanly on the worklet thread.
 */
export function extractRgbUint8Frame(
  frame: unknown,
  targetSize: number,
  frameConverter: FrameConverterLike | null,
  resizePlugin: ResizerModuleLike | null
): ExtractedRgbFrame | null {
  'worklet';
  const frameRecord =
    typeof frame === 'object' && frame !== null
      ? (frame as {
          isValid?: boolean;
          orientation?: string;
          width?: number;
          height?: number;
          getPixelBuffer?: unknown;
          buffer?: unknown;
          toArrayBuffer?: () => ArrayBuffer;
        })
      : null;

  const isVc5Frame =
    frameRecord !== null && typeof frameRecord.getPixelBuffer === 'function';

  if (!isVc5Frame && resizePlugin && frame) {
    try {
      const resized = resizePlugin.resize(frame, {
        scale: { width: targetSize, height: targetSize },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });
      if (resized?.buffer instanceof ArrayBuffer) {
        return {
          buffer: resized.buffer,
          width: targetSize,
          height: targetSize,
          needs180Correction: false,
        };
      }
      if (resized?.buffer && ArrayBuffer.isView(resized.buffer)) {
        return {
          buffer: viewToArrayBuffer(resized.buffer as unknown as ArrayBufferView),
          width: targetSize,
          height: targetSize,
          needs180Correction: false,
        };
      }
      if (typeof resized?.toArrayBuffer === 'function') {
        return {
          buffer: resized.toArrayBuffer(),
          width: targetSize,
          height: targetSize,
          needs180Correction: false,
        };
      }
    } catch {
      // Continue to VC v5 or raw buffer extraction
    }
  }

  if (isVc5Frame && frameConverter) {
    if (frameRecord?.isValid === false) {
      return null;
    }
    const needs180 =
      frameRecord?.orientation === 'left' || frameRecord?.orientation === 'right';
    let sourceImage: NitroImageLike | null = null;
    let resizedImage: NitroImageLike | null = null;
    try {
      sourceImage = frameConverter.convertFrameToImage(frame);
      resizedImage =
        sourceImage.width !== targetSize || sourceImage.height !== targetSize
          ? sourceImage.resize(targetSize, targetSize)
          : sourceImage;
      const rawPixel = resizedImage.toRawPixelData(false);
      const w = rawPixel.width > 0 ? rawPixel.width : targetSize;
      const h = rawPixel.height > 0 ? rawPixel.height : targetSize;
      return {
        buffer: normalizeRawPixelsToRgbUint8(rawPixel.buffer, rawPixel.pixelFormat, w, h),
        width: w,
        height: h,
        needs180Correction: needs180,
      };
    } finally {
      if (
        resizedImage &&
        resizedImage !== sourceImage &&
        typeof resizedImage.dispose === 'function'
      ) {
        resizedImage.dispose();
      }
      if (sourceImage && typeof sourceImage.dispose === 'function') {
        sourceImage.dispose();
      }
    }
  }

  if (frame instanceof ArrayBuffer) {
    const inferredW = Math.max(1, Math.round(Math.sqrt(frame.byteLength / 3)));
    return {
      buffer: frame,
      width: inferredW,
      height: inferredW,
      needs180Correction: false,
    };
  }

  if (ArrayBuffer.isView(frame)) {
    const buf = viewToArrayBuffer(frame);
    const inferredW = Math.max(1, Math.round(Math.sqrt(buf.byteLength / 3)));
    return {
      buffer: buf,
      width: inferredW,
      height: inferredW,
      needs180Correction: false,
    };
  }

  if (frameRecord) {
    let rawBuf: ArrayBuffer | null = null;
    if (frameRecord.buffer instanceof ArrayBuffer) {
      rawBuf = frameRecord.buffer;
    } else if (frameRecord.buffer && ArrayBuffer.isView(frameRecord.buffer)) {
      rawBuf = viewToArrayBuffer(frameRecord.buffer);
    } else if (typeof frameRecord.toArrayBuffer === 'function') {
      rawBuf = frameRecord.toArrayBuffer();
    }
    if (rawBuf) {
      const w =
        typeof frameRecord.width === 'number' && frameRecord.width > 0
          ? frameRecord.width
          : targetSize;
      const h =
        typeof frameRecord.height === 'number' && frameRecord.height > 0
          ? frameRecord.height
          : targetSize;
      return {
        buffer: rawBuf,
        width: w,
        height: h,
        needs180Correction: false,
      };
    }
  }

  return {
    buffer: new ArrayBuffer(targetSize * targetSize * 3),
    width: targetSize,
    height: targetSize,
    needs180Correction: false,
  };
}
