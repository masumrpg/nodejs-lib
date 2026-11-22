import { describe, expect, test } from 'bun:test';
import {
  analyzeFrameDocumentWorklet,
  createDocumentAlignmentProcessor,
  smoothAlignedBoxWorklet,
} from '../src/math/documentDetector';

interface SyntheticYuvOptions {
  width: number;
  height: number;
  stride?: number;
  bgLuma: number;
  paperLuma: number;
  paperRect?: { x: number; y: number; width: number; height: number };
  bottomShadowLuma?: number;
  withTextTexture?: boolean;
  orientation?: 'up' | 'right' | 'left' | 'down';
}

function makeSyntheticYuvFrame(opts: SyntheticYuvOptions) {
  const {
    width,
    height,
    stride = width,
    bgLuma,
    paperLuma,
    paperRect,
    bottomShadowLuma,
    withTextTexture = true,
    orientation = 'up',
  } = opts;

  const yBytes = new Uint8Array(stride * height);
  for (let row = 0; row < height; row++) {
    const ny = row / height;
    for (let col = 0; col < width; col++) {
      const nx = col / width;
      let val = bgLuma;

      if (paperRect) {
        const insideX = nx >= paperRect.x && nx <= paperRect.x + paperRect.width;
        const insideY = ny >= paperRect.y && ny <= paperRect.y + paperRect.height;
        if (insideX && insideY) {
          // Simulate natural hand/phone shadow at lower third of sheet if requested
          const inBottomShadow =
            typeof bottomShadowLuma === 'number' &&
            ny > paperRect.y + paperRect.height * 0.72;
          val = inBottomShadow ? bottomShadowLuma : paperLuma;

          // Simulate crisp text lines in the upper 60% leaving blank footer whitespace
          if (
            withTextTexture &&
            nx > paperRect.x + 0.08 &&
            nx < paperRect.x + paperRect.width - 0.08 &&
            ny > paperRect.y + 0.1 &&
            ny < paperRect.y + paperRect.height * 0.65 &&
            row % 10 < 4 &&
            col % 14 < 7
          ) {
            val = Math.max(25, paperLuma - 120);
          }
        }
      }

      yBytes[row * stride + col] = val;
    }
  }

  return {
    width,
    height,
    orientation,
    isMirrored: false,
    isPlanar: true,
    isValid: true,
    getPlanes: () => [
      {
        width: stride,
        height,
        bytesPerRow: stride,
        isValid: true,
        getPixelBuffer: () => yBytes.buffer,
      },
    ],
  };
}

describe('Background Worklet YUV Document Detector', () => {
  test('accurately tracks all 4 paper edges including shadowed blank bottom margin with stride padding', () => {
    // Include row-stride alignment padding (width 720, stride 768) like Android Camera2 HAL
    const frame = makeSyntheticYuvFrame({
      width: 720,
      height: 1024,
      stride: 768,
      bgLuma: 60,
      paperLuma: 225,
      bottomShadowLuma: 155,
      paperRect: { x: 0.12, y: 0.14, width: 0.76, height: 0.74 },
      withTextTexture: true,
    });

    const result = analyzeFrameDocumentWorklet(frame);
    expect(result.hasDocument).toBe(true);
    expect(result.status).toBe('optimal');
    expect(result.isOptimal).toBe(true);
    expect(result.optimalityScore).toBeGreaterThanOrEqual(75);
    expect(result.paperBox.x).toBeGreaterThan(0.06);
    expect(result.paperBox.x).toBeLessThan(0.18);
    // Verify bottom edge extends smoothly past the text into the shadowed paper footer (~0.88)
    const bottomEdge = result.paperBox.y + result.paperBox.height;
    expect(bottomEdge).toBeGreaterThan(0.82);
    expect(bottomEdge).toBeLessThan(0.95);
  });

  test('detects low_light, clipped edges, and too_far accurately', () => {
    const darkFrame = makeSyntheticYuvFrame({
      width: 360,
      height: 520,
      bgLuma: 20,
      paperLuma: 28,
      withTextTexture: false,
    });
    expect(analyzeFrameDocumentWorklet(darkFrame).status).toBe('low_light');

    const clippedFrame = makeSyntheticYuvFrame({
      width: 360,
      height: 520,
      bgLuma: 55,
      paperLuma: 225,
      paperRect: { x: 0.0, y: 0.1, width: 0.9, height: 0.85 },
    });
    const clippedRes = analyzeFrameDocumentWorklet(clippedFrame);
    expect(clippedRes.status).toBe('clipped');
    expect(clippedRes.isOptimal).toBe(false);

    const farFrame = makeSyntheticYuvFrame({
      width: 360,
      height: 520,
      bgLuma: 55,
      paperLuma: 225,
      paperRect: { x: 0.38, y: 0.38, width: 0.24, height: 0.24 },
    });
    expect(analyzeFrameDocumentWorklet(farFrame).status).toBe('too_far');
  });

  test('createDocumentAlignmentProcessor throttles cleanly on worklet thread with preferredPixelFormat yuv', () => {
    const proc = createDocumentAlignmentProcessor({ targetFps: 5 });
    expect(proc.preferredPixelFormat).toBe('yuv');
    expect(proc.status).toBe('ready');

    const frame = makeSyntheticYuvFrame({
      width: 360,
      height: 520,
      bgLuma: 55,
      paperLuma: 225,
      paperRect: { x: 0.14, y: 0.14, width: 0.72, height: 0.70 },
    });

    const first = proc.processFrameWorklet?.(frame) ?? [];
    expect(first.length).toBe(1);
    expect(first[0].documentAlignment?.isOptimal).toBe(true);
    expect(proc.wasThrottledSync?.getBlocking()).toBe(false);

    const second = proc.processFrameWorklet?.(frame) ?? [];
    expect(second.length).toBe(0);
    expect(proc.wasThrottledSync?.getBlocking()).toBe(true);

    proc.dispose?.();
  });

  test('smoothAlignedBoxWorklet suppresses tiny jitter and lerps genuine motion', () => {
    const a = { x: 0.12, y: 0.14, width: 0.76, height: 0.72 };
    const tiny = { x: 0.124, y: 0.143, width: 0.758, height: 0.719 };
    expect(smoothAlignedBoxWorklet(a, tiny)).toEqual(a);

    const bigMove = { x: 0.22, y: 0.24, width: 0.56, height: 0.52 };
    const moved = smoothAlignedBoxWorklet(a, bigMove, 0.5, 0.01);
    expect(moved.x).toBeCloseTo(0.17, 4);
  });

  test('isolates paper from disconnected bright top floor tiles and right-side background patches', () => {
    // Reproduces tricky indoor scene: bright floor at top (y < 0.18), dark bed surround (L=58),
    // bright texture patch on right (x > 0.72, y: 0.4..0.8), and bright sheet inside (x: 0.12..0.64, y: 0.25..0.62)
    const width = 480;
    const height = 680;
    const yBytes = new Uint8Array(width * height);
    for (let r = 0; r < height; r++) {
      const ny = r / height;
      for (let c = 0; c < width; c++) {
        const nx = c / width;
        let lum = 58;
        if (ny < 0.17) {
          lum = 165; // Top gray ceramic tiles separated by dark bed rim
        } else if (nx > 0.74 && ny > 0.35 && ny < 0.85 && (r + c) % 4 < 2) {
          lum = 148; // Disconnected right-side embroidery highlights
        } else if (nx >= 0.12 && nx <= 0.64 && ny >= 0.25 && ny <= 0.62) {
          lum = 198; // Actual white printed flyer
          if (ny > 0.32 && ny < 0.58 && r % 8 < 2 && c % 10 < 5) {
            lum = 70; // Black text + borders inside flyer
          }
        }
        yBytes[r * width + c] = lum;
      }
    }

    const res = analyzeFrameDocumentWorklet({
      width,
      height,
      orientation: 'up',
      isMirrored: false,
      isPlanar: true,
      isValid: true,
      getPlanes: () => [
        { width, height, bytesPerRow: width, isValid: true, getPixelBuffer: () => yBytes.buffer },
      ],
    });

    expect(res.hasDocument).toBe(true);
    expect(res.status).not.toBe('clipped');
    // Top corner must stay at the paper top (~0.25) and never jump up to top tiles (~0.02)
    expect(res.corners.topLeft.y).toBeGreaterThan(0.20);
    expect(res.corners.topRight.y).toBeGreaterThan(0.20);
    // Right corner must lock around paper right edge (~0.64) and never leak onto right highlights (~0.95)
    expect(res.corners.topRight.x).toBeGreaterThan(0.56);
    expect(res.corners.topRight.x).toBeLessThan(0.72);
    expect(res.corners.bottomRight.y).toBeGreaterThan(0.56);
    expect(res.corners.bottomRight.y).toBeLessThan(0.68);
  });

  test('tracks 4 independent skewed corners when paper is tilted at an angle', () => {
    const width = 480;
    const height = 680;
    const yBytes = new Uint8Array(width * height);
    const cosA = Math.cos((16 * Math.PI) / 180);
    const sinA = Math.sin((16 * Math.PI) / 180);

    for (let r = 0; r < height; r++) {
      const ny = r / height - 0.5;
      for (let c = 0; c < width; c++) {
        const nx = c / width - 0.5;
        // Inverse-rotate into sheet local coordinates to render a 16-deg tilted paper rectangle
        const rx = nx * cosA + ny * sinA;
        const ry = -nx * sinA + ny * cosA;
        const onTiltedSheet = Math.abs(rx) <= 0.30 && Math.abs(ry) <= 0.24;
        let lum = 50;
        if (onTiltedSheet) {
          lum = r % 9 < 2 && c % 9 < 4 ? 75 : 215;
        }
        yBytes[r * width + c] = lum;
      }
    }

    const res = analyzeFrameDocumentWorklet({
      width,
      height,
      orientation: 'up',
      isMirrored: false,
      isPlanar: true,
      isValid: true,
      getPlanes: () => [
        { width, height, bytesPerRow: width, isValid: true, getPixelBuffer: () => yBytes.buffer },
      ],
    });

    expect(res.hasDocument).toBe(true);
    // Verify corners follow the 16-deg tilted geometry independently
    expect(Math.abs(res.corners.topRight.y - res.corners.topLeft.y)).toBeGreaterThan(0.08);
    expect(Math.abs(res.corners.bottomLeft.x - res.corners.topLeft.x)).toBeGreaterThan(0.06);
    expect(Math.abs(res.skewAngleDeg ?? 0)).toBeGreaterThan(8);
  });

  test('ignores near-black phone mount & bottom shadow so brown seam/floor tiles never leak above paper', () => {
    // Reproduces real screenshot scene:
    // - Black phone stand on left (x < 0.18, L=22)
    // - Dark blurred hand/leg across bottom (y > 0.72, L=32)
    // - Top ceramic floor tiles (y < 0.17, L=142) separated by brown mattress seam (y: 0.17..0.24, L=114)
    // - Slightly tilted white flyer (x: 0.21..0.71, y: 0.27..0.62, L=188) with dark table rule
    const width = 480;
    const height = 680;
    const yBytes = new Uint8Array(width * height);
    for (let r = 0; r < height; r++) {
      const ny = r / height;
      for (let c = 0; c < width; c++) {
        const nx = c / width;
        let lum = 68;
        if (nx < 0.18) {
          lum = 22; // Dark phone mount bezel
        } else if (ny > 0.72) {
          lum = 32; // Dark foreground hand/arm
        } else if (ny < 0.16) {
          lum = 142; // Gray ceramic floor tiles above mattress
        } else if (ny >= 0.16 && ny < 0.255) {
          // Shiny brown mattress piping + narrow darker bed shadow before paper edge
          lum = ny < 0.235 ? 114 : 74;
        } else if (nx >= 0.21 && nx <= 0.71 && ny >= 0.27 && ny <= 0.62) {
          // Real flyer white surface (slightly dimmer right side due to directional room lighting)
          lum = nx > 0.56 && ny > 0.48 ? 162 : 188;
          // Printed dark text & horizontal box rule near bottom
          if (ny > 0.34 && ny < 0.59 && ((r % 9 < 2 && c % 11 < 5) || Math.abs(ny - 0.585) < 0.004)) {
            lum = 48;
          }
        }
        yBytes[r * width + c] = lum;
      }
    }

    const res = analyzeFrameDocumentWorklet({
      width,
      height,
      orientation: 'up',
      isMirrored: false,
      isPlanar: true,
      isValid: true,
      getPlanes: () => [
        { width, height, bytesPerRow: width, isValid: true, getPixelBuffer: () => yBytes.buffer },
      ],
    });

    expect(res.hasDocument).toBe(true);
    expect(res.status).not.toBe('clipped');
    // Top corners must lock on top paper edge (~0.27) and never leap onto top floor tiles (0.02)
    expect(res.corners.topLeft.y).toBeGreaterThan(0.22);
    expect(res.corners.topLeft.y).toBeLessThan(0.32);
    expect(res.corners.topRight.y).toBeGreaterThan(0.22);
    expect(res.corners.topRight.x).toBeGreaterThan(0.64);
    expect(res.corners.topRight.x).toBeLessThan(0.76);
    expect(res.corners.bottomLeft.x).toBeGreaterThan(0.18);
    expect(res.corners.bottomRight.y).toBeGreaterThan(0.56);
    expect(res.corners.bottomRight.y).toBeLessThan(0.66);
  });
});
