# Expo Native Camera AI Playground (`apps/expo-native`)

Interactive on-device computer vision playground and native development build testing suite for `@masumdev/rn-camera-ai` and `@masumdev/rn-camera-ai-tflite`.

Built with **Expo Development Builds** (`expo-dev-client`), **React Native Vision Camera v5** (Nitro C++), **React Native Fast-TFLite**, and **React Native Reanimated**.

---

## Features & Screens

```
apps/expo-native/
├── app/
│   ├── _layout.tsx            # Root Stack Navigator & dark theme wrapper
│   ├── index.tsx              # Feature Menu Hub (dashboard & status)
│   ├── object-detection.tsx   # MobileNet SSD object detection & live styling
│   └── face-recognition.tsx   # 468 Face Mesh + MobileFaceNet face recognition
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

---

## Bundled TFLite Models

All neural network models are pre-bundled in `assets/models/`:

| File | Size | Architecture | Resolution | Purpose |
| :--- | :---: | :--- | :---: | :--- |
| `detect.tflite` | ~4.3 MB | MobileNet SSD v1 | 300×300 | 80-Class COCO Object Detection |
| `face_detection_full_range.tflite` | ~900 KB | BlazeFace Full-Range | 192×192 | 896-Anchor Face Detection |
| `face_landmark.tflite` | ~5.2 MB | MediaPipe FaceMesh | 192×192 | 468-Point 3D Facial Keypoints |
| `mobilefacenet.tflite` | ~4.0 MB | MobileFaceNet | 112×112 | 192-D Biometric Face Embeddings |
| `labelmap.txt` | ~1.5 KB | Plain Text | N/A | 80 COCO Category Labels |

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

- `bun run build`: Builds monorepo dependencies (`@masumdev/rn-camera-ai`, `@masumdev/rn-camera-ai-tflite`).
- `bun run audit`: Runs codebase verification (ensures zero `any`, zero unused imports/variables).
- `bun test`: Executes monorepo test suites including E2E integration tests.

---

## License

MIT © [Ma'sum](https://github.com/masumrpg) — [masumdev.id](https://lib.masumdev.id)
