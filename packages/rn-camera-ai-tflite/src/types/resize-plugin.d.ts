declare module 'vision-camera-resize-plugin' {
  export interface ResizeOptions {
    scale?: { width: number; height: number };
    pixelFormat?: 'rgb' | 'bgr' | 'rgba' | 'bgra';
    dataType?: 'uint8' | 'float32';
    crop?: { x: number; y: number; width: number; height: number };
  }

  export interface ResizedFrame {
    buffer: ArrayBuffer;
    byteOffset: number;
    byteLength: number;
    toArrayBuffer(): ArrayBuffer;
  }

  export function resize(
    frame: unknown,
    options: ResizeOptions
  ): ResizedFrame;
}
