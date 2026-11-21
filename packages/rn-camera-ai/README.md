# @masumdev/rn-camera-ai

High-performance, worklet-accelerated React Native camera preview and real-time computer vision overlay engine powered by React Native Vision Camera v5 (Nitro) and React Native Reanimated.

Designed from the ground up for zero-JS-thread frame processing, sub-millisecond coordinate normalization, declarative UI theming (`solid`, `corners`, `dashed`), 468-point 3D Face Mesh wireframe rendering, and pluggable AI adapters.

[![npm version](https://img.shields.io/npm/v/@masumdev/rn-camera-ai.svg?style=flat-square)](https://www.npmjs.com/package/@masumdev/rn-camera-ai)
[![license](https://img.shields.io/npm/l/@masumdev/rn-camera-ai.svg?style=flat-square)](https://github.com/masumrpg/nodejs-lib/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Zero%20Any-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

---

## Key Features

- **🚀 VisionCamera v5 Hardware Pipeline**: Direct C++ Nitro module hardware preview using `useFrameOutput` and upright buffer transformation (`enablePhysicalBufferRotation`).
- **⚡ Zero-JS-Thread Architecture**: All screen-space coordinate projections (`cover`/`contain`, selfie horizontal mirroring, and sensor rotation) and trigonometry (`Math.atan2`, `Math.sqrt` for 178 mesh contour segments) execute on the background **Camera Worklet Thread** via `projectDetectionsWorklet`.
- **🎨 Full UI Customization & Bounding Box Styles**:
  - Declarative bounding box variants: `solid` (classic rectangle), `corners` (futuristic 4-bracket HUD scanner), `dashed`, or hidden.
  - Anchor positions for label badges: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `inside-top`.
  - Custom slot renderers: `renderBox`, `renderLabel`, `renderLandmarkDot`, and full-canvas `renderOverlay`.
- **🧬 468-Point 3D Face Mesh & Keypoints**: First-class rendering of MediaPipe 468-point facial mesh wireframes (contours, eyebrows, eyes, lips, jawline, and triangle tesselation web) or classic 6-point keypoints.
- **🔌 Pluggable Architecture**: Works out-of-the-box with `@masumdev/rn-camera-ai-tflite` (Fast-TFLite) or any custom computer vision model via the `CameraProcessor` interface.
- **🛡️ Production-Grade Error & Permission Handling**: Built-in permission fallback view (`PermissionFallbackView`), device orientation handling, and lifecycle control (`isActive`).
- **📐 Mathematical Precision**: Pure coordinate transformation engine mapping normalized `[0..1]` bounding boxes to physical screen pixels with aspect ratio preservation.

---

## Installation

```bash
bun add @masumdev/rn-camera-ai
# or
npm install @masumdev/rn-camera-ai
# or
yarn add @masumdev/rn-camera-ai
```

### Peer Dependencies

Install the required native peer dependencies in your application:

```bash
bun add react-native-vision-camera react-native-vision-camera-worklets react-native-worklets react-native-nitro-modules react-native-nitro-image react-native-reanimated
```

> **For Expo Users**: Because VisionCamera v5 and Fast-TFLite contain custom native C++ code, they require **Expo Development Builds** (`npx expo run:android` or EAS Build) and cannot run inside standard Expo Go.

---

## Quick Start

```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraAI, type DetectionResult } from '@masumdev/rn-camera-ai';
import { createTFLiteObjectDetector } from '@masumdev/rn-camera-ai-tflite';

export default function CameraScreen() {
  const [detections, setDetections] = useState<DetectionResult[]>([]);

  return (
    <View style={styles.container}>
      <CameraAI
        cameraPosition="back"
        resizeMode="cover"
        isActive={true}
        boxVariant="corners"
        boxColor="#3da441"
        onDetections={(results) => {
          setDetections(results);
        }}
        onError={(error) => {
          console.error('[CameraAI]', error.code, error.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
```

---

## Component API: `<CameraAI />`

The central coordinator component that renders native camera capture, executes frame processors, and renders the synchronized detection overlay.

### Props Specification

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `processor` | `CameraProcessor` | `undefined` | Pluggable vision engine (e.g. `TFLiteObjectDetector` or `TFLiteFaceRecognizer`). |
| `cameraPosition` | `'back' \| 'front'` | `'back'` | Camera facing sensor. Automatically handles horizontal mirroring for front-facing selfie mode. |
| `resizeMode` | `'cover' \| 'contain'` | `'cover'` | Stream scaling mode within view bounds. `cover` crops edges to fill; `contain` letterboxes. |
| `isActive` | `boolean` | `true` | Pauses/resumes camera streaming and processing without unmounting native resources. |
| `enableTorch` | `boolean` | `false` | Toggles flashlight on supported rear cameras. |
| `fps` | `number` | `undefined` | Target frame rate limit for frame processing worklet (e.g. `15` or `30`). |
| `showBoxes` | `boolean` | `true` | Toggles bounding box visibility. |
| `boxVariant` | `'solid' \| 'corners' \| 'dashed'` | `'solid'` | Visual style of bounding boxes. `'corners'` renders scanner brackets. |
| `boxColor` | `string` | `'#3da441'` | Primary bounding box border & badge background color. |
| `landmarkColor` | `string` | `'#38bdf8'` | Accent color for facial keypoints and mesh vertex dots. |
| `showLabels` | `boolean` | `true` | Toggles class or identity label badges. |
| `showConfidence` | `boolean` | `true` | Displays confidence percentage inside the default label badge. |
| `showLandmarks` | `boolean` | `true` | Renders facial keypoints or 468-point 3D Face Mesh when present. |
| `showMeshLines` | `boolean` | `true` | Renders connected anatomical contour polylines in 468-point Face Mesh mode. |
| `showTesselation`| `boolean` | `true` | Renders interior triangle tesselation web in 468-point Face Mesh mode. |
| `overlayTheme` | `OverlayThemeConfig` | `undefined` | Unified declarative theme object for granular styling. |
| `renderBox` | `(params: RenderBoxParams) => React.ReactNode` | `undefined` | Custom slot renderer for bounding boxes. |
| `renderLabel` | `(params: RenderLabelParams) => React.ReactNode` | `undefined` | Custom slot renderer for label badges. |
| `renderLandmarkDot` | `(params: RenderLandmarkDotParams) => React.ReactNode` | `undefined` | Custom slot renderer for individual landmark vertices. |
| `renderOverlay` | `(detections, viewDimensions) => React.ReactNode` | `undefined` | Full-canvas custom overlay replacing `<DetectionOverlay />`. |
| `onDetections` | `(detections: DetectionResult[]) => void` | `undefined` | Optional JS-thread callback fired when new detections arrive. |
| `onError` | `(error: CameraAIError) => void` | `undefined` | Error callback for permissions, hardware errors, or inference failures. |
| `permissionFallback` | `React.ReactNode` | `<PermissionFallbackView />` | Custom UI rendered when camera permission is denied. |
| `style` | `StyleProp<ViewStyle>` | `{ flex: 1 }` | Custom container style applied to the camera root view. |

---

## Declarative Theming & UI Customization

`CameraAI` allows you to customize the entire visual appearance of bounding boxes, label badges, and 468-point face meshes declaratively:

```tsx
<CameraAI
  processor={myProcessor}
  overlayTheme={{
    boxVariant: 'corners',
    boxColor: '#00e5ff',
    cornerLength: 26,
    cornerThickness: 3.5,
    boxBorderRadius: 10,
    showLabels: true,
    labelPosition: 'inside-top',
    labelBackgroundColor: 'rgba(0, 0, 0, 0.75)',
    labelTextColor: '#00e5ff',
    formatLabel: (d) => `${d.label.toUpperCase()} · ${(d.confidence * 100).toFixed(0)}%`,
    meshStyle: {
      showMeshLines: true,
      showTesselation: true,
      showDots: true,
      lineThickness: 1.2,
      faceOvalColor: '#38bdf8',
      eyeContourColor: '#22d3ee',
      eyebrowContourColor: '#7dd3fc',
      lipOuterContourColor: '#34d399',
      lipInnerContourColor: '#6ee7b7',
      tesselationColor: 'rgba(56, 189, 248, 0.40)',
    },
  }}
/>
```

---

## Custom Slot Renderers

When declarative styling isn't enough, inject custom React components directly into rendering slots:

```tsx
<CameraAI
  processor={myProcessor}
  // Custom bounding box renderer
  renderBox={({ detection, pixelBox, color }) => (
    <View
      style={{
        position: 'absolute',
        left: pixelBox.x,
        top: pixelBox.y,
        width: pixelBox.width,
        height: pixelBox.height,
        borderWidth: 2,
        borderColor: color,
        borderRadius: 12,
        backgroundColor: 'rgba(61, 164, 65, 0.08)',
      }}
    />
  )}
  // Custom label badge renderer
  renderLabel={({ detection, pixelBox, formattedText, color }) => (
    <View
      style={{
        position: 'absolute',
        left: pixelBox.x,
        top: Math.max(0, pixelBox.y - 28),
        backgroundColor: color,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
        {formattedText}
      </Text>
    </View>
  )}
/>
```

---

## Zero-JS Worklet Projection (`projectDetectionsWorklet`)

In high-framerate mobile vision, calculating aspect ratio scaling, letterboxing offsets, and trigonometry for 178 wireframe lines on the React Native JS thread causes severe thread choking.

`@masumdev/rn-camera-ai` solves this by computing everything inside a `'worklet'` function on the dedicated camera worker thread before passing pre-calculated pixel coordinates to the UI:

```tsx
import { projectDetectionsWorklet } from '@masumdev/rn-camera-ai';

// Executes inside VisionCamera worklet context
const projected = projectDetectionsWorklet(
  detections,
  containerWidth,
  containerHeight,
  streamWidth,
  streamHeight,
  resizeMode,
  isMirrored,
  orientation,
  themeConfig
);
```

- **0% JS Thread Overhead**: No `Math.atan2`, `Math.sqrt`, or bounding box clamping runs on JS.
- **100% Synchronized**: Overlay lines stick solidly to faces during fast movement without lagging behind the camera preview.
- **0 Reanimated Mapper Queue Delay**: Prevents UI-thread microtask queues from overflowing.

---

## Math & Transformation Utilities

Pure, worklet-safe utility functions are exported for custom computer vision pipelines:

```typescript
import {
  calculateScaleAndOffsets,
  transformNormalizedToPixelBox,
  mirrorHorizontalBox,
  rotateBox,
  clampBox,
  normalizeCoordinates,
  denormalizeCoordinates,
} from '@masumdev/rn-camera-ai';

// Compute cover/contain scaling factor and pillarbox/letterbox offsets
const { scale, offsetX, offsetY } = calculateScaleAndOffsets(
  viewDimensions,
  streamDimensions,
  'cover'
);

// Transform normalized [0..1] box to screen pixel coordinates
const pixelBox = transformNormalizedToPixelBox(
  normalizedBox,
  transformOptions
);
```

---

## Standalone `<DetectionOverlay />`

`<DetectionOverlay />` can also be used standalone over any video stream, canvas, or animated image:

```tsx
import { DetectionOverlay } from '@masumdev/rn-camera-ai';

<DetectionOverlay
  detections={detections} // Array or Reanimated SharedValue
  viewDimensions={{ width: 390, height: 844 }}
  streamDimensions={{ width: 1280, height: 720 }}
  resizeMode="cover"
  isMirrored={false}
  boxVariant="corners"
  boxColor="#3da441"
/>
```

---

## License

MIT © [Ma'sum](https://github.com/masumrpg) — [masumdev.id](https://lib.masumdev.id)
