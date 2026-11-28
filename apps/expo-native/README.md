# Expo Native Camera AI Playground (`apps/expo-native`)

Interactive on-device computer vision playground and native development build testing suite for `@masumdev/rn-camera-ai`, `@masumdev/rn-camera-ai-tflite`, and `@masumdev/rn-camera-ai-mlkit`.

Built with **Expo Development Builds** (`expo-dev-client`), **React Native Vision Camera v5** (Nitro C++), **React Native Fast-TFLite**, **Google ML Kit v2**, and **React Native Reanimated**.

---

## Features & Screens

```
apps/expo-native/
├── app/
│   ├── _layout.tsx            # Root Stack Navigator & dark theme wrapper
│   ├── index.tsx              # Feature Menu Hub (dashboard & status)
│   ├── object-detection.tsx   # MobileNet SSD object detection & live styling
│   ├── face-recognition.tsx   # 468 Face Mesh + MobileFaceNet face recognition
│   ├── liveness-detection.tsx # Hybrid Active + Passive Liveness & e-KYC Wizard
│   ├── ocr-scanner.tsx        # Single-Capture Smart Document OCR & Entity Extraction
│   └── cat-scanner.tsx        # Multi-Model Cat AI Studio (Breed, Mood, Seg, Cat ID)
├── src/
│   └── constants/
│       ├── cocoLabels.ts      # COCO SSD label map
│       └── catLabels.ts       # 67+12 Cat Breed catalogs & trait summaries
└── assets/
    └── models/                # Bundled local TFLite neural network models
```

### 1. Feature Menu Hub (`/`)
- Brand header and live device hardware status.
- One-tap navigation cards to all computer vision modules.
- Architectural summary highlighting Zero-JS worklet execution and GPU acceleration.

### 2. Real-Time Object Detection (`/object-detection`)
- Powered by `MobileNet SSD` (300×300, 2,304 anchors, 80 COCO classes).
- Live HUD displaying FPS, active detection count, and confidence scores.
- Interactive Box Variant toggle (`Corners` brackets vs `Solid Box`).
- Front / rear camera switching and pause/resume lifecycle controls.

### 3. Face Recognition & 468-Point 3D Face Mesh (`/face-recognition`)
- Cooperative 3-model on-device neural network pipeline:
  1. **MediaPipe BlazeFace (192×192)**: Full-range face detection with 896 SSD anchors.
  2. **MediaPipe Face Mesh (192×192)**: 468-point 3D landmark regression ($x, y, z$).
  3. **MobileFaceNet (112×112)**: 192-dimensional biometric embedding extraction.
- **Interactive Mesh Mode Switcher**:
  - `468 Mesh`: Full wireframe with anatomical contours and triangle tesselation web.
  - `Contours`: Clean anatomical contours (eyes, brows, lips, nose, jawline).
  - `Dots Only`: Individual landmark vertex points.
  - `Mesh Off`: Minimal HUD with bounding box only.
- **1-Tap On-Device Face Registration**:
  - Enter person name and enroll face profile directly from the live video stream.
  - Cosine similarity identity matching against registered profiles.

### 4. Hybrid Face Liveness & Anti-Spoofing (`/liveness-detection`)
- **Passive Anti-Spoofing Engine (`0% - 100%`)**:
  - **3D Z-Depth Relief**: Analyzes 3D nose-to-cheek protrusion from the 468-point 3D mesh to reject flat 2D photos/screens.
  - **Anti-Moiré & Specular Glare Texture Analysis**: Evaluates RGB surface naturalness and penalizes LCD/OLED screen grids.
- **Active Biometric Signals (`'worklet'`)**:
  - **Eye Blink Detection (EAR)**: Real-time Eye Aspect Ratio + cumulative blink counter.
  - **3D Head Pose Estimation**: Real-time `Yaw`, `Pitch`, `Roll` angles and semantic direction (`CENTER`, `LEFT`, `RIGHT`, `UP`, `DOWN`).
  - **Mouth & Smile Detection (MAR)**: Real-time Mouth Aspect Ratio for `MOUTH OPEN` and `SMILING`.
- **Interactive 4-Step e-KYC Challenge Wizard**:
  - Step-by-step interactive challenge verifying passive 3D depth, eye blink, head turn, and mouth expression.

### 5. Single-Capture Smart Document & OCR Scanner (`/ocr-scanner`)
- Uses zero-OCR background YUV paper corner detection (`createDocumentAlignmentProcessor`) with live 4-corner `DocumentQuad` tracking and capture optimality scoring, running Google ML Kit v2 (`@masumdev/rn-camera-ai-mlkit`) once after capture during Reanimated 4 laser animation.
- Post-capture review provides automatic **Fit Paper Zoom** (`Fit Zoom` / `1x Full`), clean non-obscuring text highlights (or collision-free `Smart Tags` via `avoidLabelOverlap`), tap-to-inspect selected box banners, an expandable **Full Text Reader (`Baca Penuh`)**, live **Granularity** switching (`Line`, `Block`, `Word`), `Studio` / `Emerald` / custom UI theme presets, and structured extraction chips (`NIK / KTP`, `Phone`, `Email`, `URL`, `Rp / Currency`) with 1-tap Share / Export.

### 6. Multi-Model Cat AI Studio & Breed Analyzer (`/cat-scanner`)
- **6-Model Cooperative On-Device Feline Pipeline (`createTFLiteCatAnalyzer`)**:
  1. **COCO SSD Cat Gate (`detect.tflite`)**: Isolates confirmed feline subjects and companion scene context cues (`couch`, `bowl`, `bed`, `bird`, `person`). Includes an automatic **Close-Up Portrait Fallback** gated by DeepLab & Oxford-12 when macro framing obscures the body silhouette.
  2. **Dual Breed Ensemble (`cat_breed_67.tflite` + `cat_breed_oxford12.tflite`)**: Fuses 67 fine-grained breeds/coat archetypes (plus Indonesian *Kucing Kampung* domestic lineage badges) with Oxford-IIIT 12-breed classification using EMA temporal smoothing across live ticks.
  3. **2-Stage CatFLW 48-Point Mesh & CatFACS Mood (`cat_face_localizer.tflite` -> `cat_face_landmarks_full.tflite`)**: Projects an anatomical 48-point feline face wireframe (ears, almond eyes, nose triangle, mouth/whiskers) and classifies affectionate slow-blink, airplane ears, vocalizing/meow, and curious head tilt.
  4. **DeepLabV3 Segmentation & Fur Palette (`deeplab_v3.tflite`)**: Masks PASCAL VOC class `8` (`cat`) into a 24x24 foreground grid, clusters top coat colors with hex swatches, and infers patterns (`Ginger / Oyen`, `Calico / Tricolor`, `Tuxedo`, `Tabby`).
  5. **1-Tap Cat ID & Cat Passport**: Enrolls custom cat profiles (96-D L2-normalized descriptor matching) and captures shareable Passport snapshots using `@masumdev/rn-ui` tokens.

---

## Bundled TFLite Models

All neural network models are pre-bundled in `assets/models/`:

| File | Size | Architecture / Source | Resolution | Purpose & License |
| :--- | :---: | :--- | :---: | :--- |
| `detect.tflite` | ~4.3 MB | MobileNet SSD v1 | 300x300 | 80-Class COCO Object Detection (Apache 2.0) |
| `face_detection_full_range.tflite` | ~900 KB | BlazeFace Full-Range | 192x192 | 896-Anchor Face Detection (Apache 2.0) |
| `face_landmark.tflite` | ~5.2 MB | MediaPipe FaceMesh | 192x192 | 468-Point 3D Facial Keypoints (Apache 2.0) |
| `mobilefacenet.tflite` | ~4.0 MB | MobileFaceNet | 112x112 | 192-D Biometric Face Embeddings (MIT / Apache 2.0) |
| `cat_breed_67.tflite` | ~2.2 MB | MobileNetV2 67-Class + `cat_breed_67_labels.txt` | 224x224 | 67-Class Feline Breed & Coat Classifier |
| `cat_breed_oxford12.tflite` | ~5.9 MB | MobileNet Quantized + `cat_breed_12_labels.txt` | 224x224 | 12-Class Oxford-IIIT Cat Breed Classifier |
| `deeplab_v3.tflite` | ~2.8 MB | MediaPipe DeepLab-V3 | 257x257 | Semantic Segmentation, Class 8 = Cat (Apache 2.0) |
| `cat_face_localizer.tflite` | ~17.2 MB | CatFLW YOLOv8n Export (Letterboxed) | 224x224 | Tight Feline Face Bounding Box (CC BY-NC 4.0) |
| `cat_face_landmarks_full.tflite` | ~11.6 MB | CatFLW-Full 48-Pt Estimator | 384x384 | 48-Point Feline Face Landmarks (CC BY-NC 4.0) |
| `labelmap.txt` | ~1.5 KB | Plain Text | N/A | 80 COCO Category Labels |

> **Research & Model Attribution Note**: The CatFLW face localizer and 48-point landmark weights (`cat_face_localizer.tflite` and `cat_face_landmarks_full.tflite`) are bundled in `apps/expo-native` for non-commercial demo & evaluation purposes under **CC BY-NC 4.0**. `@masumdev/*` TypeScript library code remains **MIT**.

---

## Getting Started

### Prerequisites

- Node.js 18+ or [Bun](https://bun.sh/)
- Android SDK & NDK configured (`ANDROID_HOME` set in environment)
- Physical Android device connected via USB with USB Debugging enabled

### 1. Install Dependencies

From the repository root:

```bash
bun install
```

### 2. Start Expo Metro Bundler

```bash
cd apps/expo-native
bun run start
# or
bun dev
```

### 3. Build & Run on Connected Android Device

To compile the native Android C++ dependencies (`react-native-vision-camera`, `react-native-fast-tflite`) into an Expo Development Build APK and install it onto your connected device:

```bash
cd apps/expo-native
bun run android
```

---

## Production / Standalone APK Build

### Local Gradle APK Build

```bash
cd apps/expo-native
# Generate android native project folder
npx expo prebuild --platform android

# Compile debug APK
cd android
./gradlew assembleDebug

# The compiled APK is located at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### EAS Build (Cloud or Local Worker)

```bash
cd apps/expo-native
# Local APK build via EAS CLI
eas build --platform android --profile development --local
```

---

## Monorepo Script Reference

- `bun run build`: Builds monorepo dependencies (`@masumdev/rn-camera-ai`, `@masumdev/rn-camera-ai-tflite`, `@masumdev/rn-camera-ai-mlkit`).
- `bun run audit`: Runs codebase verification (ensures zero `any`, zero unused imports/variables).
- `bun test`: Executes monorepo test suites including E2E integration tests.

---

## License

MIT © [Ma'sum](https://github.com/masumrpg) — [masumdev.id](https://lib.masumdev.id)
