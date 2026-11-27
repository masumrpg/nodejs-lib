# @masumdev/rn-camera-ai-tflite

High-performance TensorFlow Lite adapter for `@masumdev/rn-camera-ai` powered by `react-native-fast-tflite` (Nitro C++).

Provides worklet-safe, GPU-accelerated on-device machine learning inference for real-time **Object Detection** (MobileNet SSD / EfficientDet-Lite) and a state-of-the-art 3-model **Face Recognition & 468-Point 3D Face Mesh** pipeline.

[![npm version](https://img.shields.io/npm/v/@masumdev/rn-camera-ai-tflite.svg?style=flat-square)](https://www.npmjs.com/package/@masumdev/rn-camera-ai-tflite)
[![license](https://img.shields.io/npm/l/@masumdev/rn-camera-ai-tflite.svg?style=flat-square)](https://github.com/masumrpg/nodejs-lib/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Zero%20Any-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

---

## Key Features

- **⚡ Hardware Acceleration with Graceful CPU Fallback**:
  - Automatically requests GPU delegates (`android-gpu` OpenCL/OpenGL ES/NNAPI on Android, `core-ml` on iOS).
  - Gracefully falls back to optimized multi-threaded CPU execution without crashing if hardware delegates fail to initialize.
- **📦 Multi-Model Support**:
  1. **Object Detection**: MobileNet SSD, EfficientDet-Lite, and custom 4-tensor architectures (`boxes`, `classes`, `scores`, `num_detections`).
  2. **Face Detection**: MediaPipe BlazeFace (192×192 full-range or 128×128 short-range) with 896 custom SSD anchors.
  3. **3D Face Mesh**: MediaPipe 468-point 3D landmark regression (`face_landmark.tflite`, 192×192).
  4. **Face Recognition**: MobileFaceNet (112×112) generating 192-dimensional L2-normalized embeddings with Cosine Similarity identity matching.
- **👤 1-Tap Face Enrollment & Identification**:
  - Register new faces directly from the live camera stream (`enrollLastDetectedFace('Name')`).
  - Real-time identity matching against stored embedding profiles with configurable cosine similarity threshold.
- **🔄 Universal Asset Resolution**:
  - Supports Metro asset bundles (`require('./model.tflite')`), local filesystem URIs (`file:///...`), and remote URLs (`https://...`).
- **Worklet-Safe Execution**:
  - Implements the `CameraProcessor` interface from `@masumdev/rn-camera-ai`.
  - Runs in dedicated background worklet threads with zero garbage collection spikes and 0% JS-thread lag.
- **Multi-Model Cat Vision (`createTFLiteCatAnalyzer`)**:
  - Staggered 6-model feline pipeline (COCO SSD cat gate + Close-Up Fallback, Dual 67 + Oxford-12 Breed Ensemble, 2-stage 48-pt CatFLW face mesh & CatFACS mood, DeepLabV3 class-8 segmentation + fur coat color swatches, and 1-tap 96-D Cat ID).

---

## Installation

```bash
bun add @masumdev/rn-camera-ai @masumdev/rn-camera-ai-tflite
# or
npm install @masumdev/rn-camera-ai @masumdev/rn-camera-ai-tflite
```

### Peer Dependencies

```bash
bun add react-native-vision-camera react-native-vision-camera-worklets react-native-worklets react-native-nitro-modules react-native-nitro-image react-native-fast-tflite react-native-reanimated
```

### Metro Asset Configuration (`metro.config.js`)

Ensure Metro is configured to bundle `.tflite` model files:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('tflite');

module.exports = config;
```

---

## Usage 1: Real-Time Object Detection

```tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { CameraAI } from '@masumdev/rn-camera-ai';
import {
  createTFLiteObjectDetector,
  type TFLiteObjectDetector,
} from '@masumdev/rn-camera-ai-tflite';

const COCO_LABELS = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane',
  'bus', 'train', 'truck', 'boat', 'traffic light',
];

export function ObjectDetectionScreen() {
  const [detector, setDetector] = useState<TFLiteObjectDetector | null>(null);

  useEffect(() => {
    let isMounted = true;
    let instance: TFLiteObjectDetector | null = null;

    async function initDetector() {
      const created = await createTFLiteObjectDetector({
        model: require('../../assets/models/detect.tflite'),
        labels: COCO_LABELS,
        confidenceThreshold: 0.55,
        maxResults: 8,
        useGpu: true,
        targetFps: 20,
        onDelegateFallback: (requested, fallback) => {
          console.warn(`[TFLite] Delegate ${requested} unavailable, using ${fallback}`);
        },
      });

      if (isMounted) {
        instance = created;
        setDetector(created);
      } else {
        created.dispose?.();
      }
    }

    initDetector();

    return () => {
      isMounted = false;
      instance?.dispose?.();
    };
  }, []);

  if (!detector) return null;

  return (
    <View style={styles.container}>
      <CameraAI
        processor={detector}
        cameraPosition="back"
        resizeMode="cover"
        boxVariant="corners"
        boxColor="#3da441"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
```

---

## Usage 2: Face Recognition & 468-Point 3D Face Mesh

The face recognizer uses a cooperative 3-model pipeline:
1. **BlazeFace (192×192)** detects faces, bounding boxes, and initial landmarks.
2. **Face Mesh (192×192)** predicts 468 precise 3D facial mesh points (eyes, lips, brows, contours).
3. **MobileFaceNet (112×112)** generates 192-D biometric embeddings and performs Cosine Similarity comparison against enrolled profiles.

```tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput } from 'react-native';
import { CameraAI } from '@masumdev/rn-camera-ai';
import {
  createTFLiteFaceRecognizer,
  type TFLiteFaceRecognizer,
  type EnrolledFaceProfile,
} from '@masumdev/rn-camera-ai-tflite';

export function FaceRecognitionScreen() {
  const [recognizer, setRecognizer] = useState<TFLiteFaceRecognizer | null>(null);
  const [enrolledName, setEnrolledName] = useState('');
  const [profiles, setProfiles] = useState<EnrolledFaceProfile[]>([]);

  useEffect(() => {
    let isMounted = true;
    let instance: TFLiteFaceRecognizer | null = null;

    async function initRecognizer() {
      const created = await createTFLiteFaceRecognizer({
        // 1. Face Detector (BlazeFace 192x192 full range)
        model: require('../../assets/models/face_detection_full_range.tflite'),
        // 2. 468-Point 3D Face Mesh
        faceMeshModel: require('../../assets/models/face_landmark.tflite'),
        // 3. MobileFaceNet 192-D Face Embedder
        embeddingModel: require('../../assets/models/mobilefacenet.tflite'),
        confidenceThreshold: 0.55,
        similarityThreshold: 0.65,
        inputWidth: 192,
        inputHeight: 192,
        targetFps: 24,
        useGpu: true,
      });

      if (isMounted) {
        instance = created;
        setRecognizer(created);
      } else {
        created.dispose?.();
      }
    }

    initRecognizer();

    return () => {
      isMounted = false;
      instance?.dispose?.();
    };
  }, []);

  // 1-Tap Face Enrollment
  const handleRegisterFace = () => {
    if (!recognizer || !enrolledName.trim()) return;
    const profile = recognizer.enrollLastDetectedFace(enrolledName.trim());
    if (profile) {
      setProfiles(recognizer.getEnrolledFaces());
      setEnrolledName('');
    } else {
      alert('No face clearly visible to register.');
    }
  };

  if (!recognizer) return null;

  return (
    <View style={styles.container}>
      <CameraAI
        processor={recognizer}
        cameraPosition="front" // Front selfie camera
        resizeMode="cover"
        boxVariant="corners"
        showMeshLines={true}
        showTesselation={true}
        overlayTheme={{
          boxColor: '#3da441',
          unrecognizedBoxColor: '#f59e0b',
        }}
      />

      {/* Floating Enrollment Bar */}
      <View style={styles.floatingBar}>
        <TextInput
          style={styles.input}
          placeholder="Enter Person Name..."
          placeholderTextColor="#999"
          value={enrolledName}
          onChangeText={setEnrolledName}
        />
        <Pressable style={styles.button} onPress={handleRegisterFace}>
          <Text style={styles.buttonText}>Register Face</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  floatingBar: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#3da441',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
```

---

## API Reference

### `createTFLiteObjectDetector(config)`

Creates an object detector instance for MobileNet SSD / EfficientDet-Lite models.

#### Configuration Options (`TFLiteObjectDetectorConfig`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `model` | `TFLiteModelSource` | *Required* | Bundle require ID, file path, or `{ url: string }`. |
| `labels` | `string[] \| Record<number, string>` | `undefined` | Map of class IDs to class names. |
| `labelOffset` | `number` | `0` | Offset applied to class index (e.g. `-1` if index 0 is background). |
| `confidenceThreshold` | `number` | `0.50` | Minimum score threshold in `[0, 1]`. |
| `maxResults` | `number` | `10` | Maximum number of top detections returned per frame. |
| `useGpu` | `boolean` | `true` | Requests GPU hardware delegate. |
| `targetFps` | `number` | `15` | Frame rate throttling limit. |
| `inputWidth` | `number` | `300` | Input tensor width in pixels. |
| `inputHeight` | `number` | `300` | Input tensor height in pixels. |
| `onDelegateFallback` | `(requested, fallback) => void` | `undefined` | Callback invoked on fallback to CPU. |

---

### `createTFLiteFaceRecognizer(config)`

Creates a face detection, 468-point 3D face mesh, and biometric face recognition processor.

#### Configuration Options (`TFLiteFaceRecognizerConfig`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `model` | `TFLiteModelSource` | *Required* | BlazeFace detection model (`face_detection_full_range.tflite`). |
| `faceMeshModel` | `TFLiteModelSource` | `undefined` | MediaPipe 468-point 3D Face Mesh model (`face_landmark.tflite`). |
| `embeddingModel` | `TFLiteModelSource` | `undefined` | MobileFaceNet 192-D face embedding model (`mobilefacenet.tflite`). |
| `antiSpoofModel` | `TFLiteModelSource` | `undefined` | Optional passive anti-spoofing TFLite model (`MiniFASNet`). |
| `enableLiveness` | `boolean` | `true` | Computes hybrid Active (EAR, MAR, 3D Head Pose) + Passive (`3D Z-Relief` + `Anti-Moiré Texture`) liveness telemetry (`detection.liveness`). |
| `livenessThreshold` | `number` | `0.62` | Minimum passive liveness score in `[0, 1]` to classify a face as live (`isLive = true`). |
| `confidenceThreshold` | `number` | `0.55` | Minimum face detection score in `[0, 1]`. |
| `similarityThreshold` | `number` | `0.65` | Minimum cosine similarity to match an enrolled identity. |
| `iouThreshold` | `number` | `0.30` | Non-Maximum Suppression (NMS) IoU overlap limit. |
| `maxResults` | `number` | `5` | Maximum number of faces to detect simultaneously. |
| `inputWidth` | `number` | `192` | Detector input width in pixels (192 for full-range, 128 for short-range). |
| `inputHeight` | `number` | `192` | Detector input height in pixels. |
| `targetFps` | `number` | `24` | Target frame rate limit in FPS. |
| `useGpu` | `boolean` | `true` | Requests GPU hardware delegate. |
| `initialFaces` | `EnrolledFaceProfile[]` | `[]` | Pre-loaded list of enrolled face profiles. |

#### Methods on `TFLiteFaceRecognizer`

- **`enrollLastDetectedFace(name: string): EnrolledFaceProfile | null`**  
  Captures the most recent high-confidence face from the live stream, computes its 192-D embedding, and registers it under `name`.
- **`enrollFace(name: string, embedding: Float32Array | number[]): EnrolledFaceProfile`**  
  Registers a profile with an explicit 192-dimensional embedding vector.
- **`removeEnrolledFace(id: string): boolean`**  
  Removes an enrolled face profile by its unique ID.
- **`getEnrolledFaces(): EnrolledFaceProfile[]`**  
  Returns all currently enrolled biometric profiles.
- **`clearEnrolledFaces(): void`**  
  Deletes all enrolled profiles.
- **`setConfidenceThreshold(threshold: number): void`**  
  Dynamically updates the face detection confidence cutoff.
- **`setSimilarityThreshold(threshold: number): void`**  
  Dynamically updates the cosine similarity recognition threshold.
- **`setLivenessThreshold(threshold: number): void`**  
  Dynamically updates the passive anti-spoofing liveness threshold.

---

## Hybrid Face Liveness & Anti-Spoofing (`detection.liveness`)

When `enableLiveness: true` (default), every face detection includes `detection.liveness` (`FaceLivenessMetrics`), computed 100% on the **Camera Worklet Thread**:

- **Active Geometric Liveness (from 468-Point 3D Face Mesh)**:
  - `eyeAspectRatio`, `leftEyeEAR`, `rightEyeEAR`, `isBlinking`: Real-time Eye Aspect Ratio (EAR) blink detection.
  - `mouthAspectRatio`, `isMouthOpen`, `smileRatio`, `isSmiling`: Mouth opening and smile curvature detection.
  - `yawDeg`, `pitchDeg`, `rollDeg`, `headDirection` (`'center' | 'left' | 'right' | 'up' | 'down'`): 3D head pose estimation.
- **Passive Anti-Spoofing**:
  - `depthReliefScore`: 3D $Z$-depth nose-to-cheek protrusion check rejecting flat 2D photos/screens.
  - `textureScore`: RGB anti-Moiré screen subpixel and specular glare analysis.
  - `passiveScore`, `isLive`, `spoofRisk` (`'low' | 'medium' | 'high'`).

---

## Low-Level Parsing & Math Functions

Exported for building custom inference loops or testing:

- **`parseDetectionOutputs(tensors, options): DetectionResult[]`**  
  Decodes standard 4-tensor object detection outputs with NMS and coordinate clamping.
- **`decodeBlazeFaceOutputs(boxesRaw, scoresRaw, anchors, options): DetectionResult[]`**  
  Decodes BlazeFace SSD bounding boxes and 6 keypoints.
- **`decodeFaceMeshOutputs(meshRaw, box): { landmarks: FaceLandmark[]; tightBox: BoundingBox } | null`**  
  Decodes 468 3D landmarks ($x, y, z$) from raw tensor output into normalized coordinate space.
- **`computeFaceLivenessMetrics(rgbBuffer, width, height, box, landmarks, threshold, externalSpoofScore): FaceLivenessMetrics`**  
  Computes hybrid Active + Passive face liveness and anti-spoofing telemetry inside a worklet.
- **`cosineSimilarity(vectorA, vectorB): number`**  
  Computes the dot product of two L2-normalized embedding vectors in range `[-1.0, 1.0]`.

---

## Multi-Model Cat Vision Analyzer (`createTFLiteCatAnalyzer`)

Orchestrates up to 6 staggered on-device `.tflite` models inside a single worklet `CameraProcessor`:

- **`detectorModel`**: COCO SSD species & scene context gate (`detect.tflite`) with optional DeepLab/Oxford-12 **Close-Up Fallback**.
- **`breed67Model` & `breed12Model`**: Dual breed classifiers fused with Exponential Moving Average (EMA) smoothing (`'ensemble' | '67' | '12'`).
- **`catFaceLocalizerModel` & `catFaceLandmarksModel`**: 2-stage tight face ROI localization (letterboxed 224x224) + 48-point CatFLW keypoints (384x384) driving `CatFACSMetrics` (slow-blink, airplane ears, vocalizing, head tilt). *(Note: CatFLW weights are typically distributed under CC BY-NC 4.0 for non-commercial use while this library package remains MIT.)*
- **`segmentationModel`**: MediaPipe DeepLab-V3 (257x257, Pascal VOC class `8 = cat`) generating a downsampled silhouette mask, dominant fur hex swatches, coat pattern classification, and shot optimality score.
- **1-Tap Cat ID**: `enrollLastDetectedCat(name, breedHint)` captures a 96-D L2-normalized descriptor matching cats across sessions via cosine similarity.

```tsx
const analyzer = await createTFLiteCatAnalyzer({
  detectorModel: require('./assets/models/detect.tflite'),
  detectorLabels: COCO_91_LABELS,
  detectorLabelOffset: 1,
  breed67Model: require('./assets/models/cat_breed_67.tflite'),
  breed67Labels: CAT_BREED_67_LABELS,
  breed12Model: require('./assets/models/cat_breed_oxford12.tflite'),
  breed12Labels: CAT_BREED_12_LABELS,
  catFaceLocalizerModel: require('./assets/models/cat_face_localizer.tflite'),
  catFaceLandmarksModel: require('./assets/models/cat_face_landmarks_full.tflite'),
  segmentationModel: require('./assets/models/deeplab_v3.tflite'),
  initialMode: 'all',
  initialBreedEngine: 'ensemble',
});
```

---

## License

MIT © [Ma'sum](https://github.com/masumrpg) — [masumdev.id](https://lib.masumdev.id)
