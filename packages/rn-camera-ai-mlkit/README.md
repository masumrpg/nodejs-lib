# @masumdev/rn-camera-ai-mlkit

Google ML Kit on-device OCR & Text Recognition adapter for [`@masumdev/rn-camera-ai`](https://lib.masumdev.id/rn-camera-ai/) powered by [`react-native-vision-camera-mlkit`](https://github.com/pedrol2b/react-native-vision-camera-mlkit) (Nitro Modules + VisionCamera v5).

Provides synchronous, worklet-safe on-device text recognition across `block`, `line`, and `element` (word) granularities with zero-copy `yuv` camera buffers (`android.media.Image`), normalized `[0..1]` overlay coordinates, and built-in structured entity classification (Indonesian 16-digit NIK/KTP, Email, Phone, URL, Currency).

[![npm version](https://img.shields.io/npm/v/@masumdev/rn-camera-ai-mlkit.svg?style=flat-square)](https://www.npmjs.com/package/@masumdev/rn-camera-ai-mlkit)
[![license](https://img.shields.io/npm/l/@masumdev/rn-camera-ai-mlkit.svg?style=flat-square)](https://github.com/masumrpg/nodejs-lib/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Zero%20Any-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

---

## Key Features

- **⚡ Zero-Copy YUV Camera Pipeline (`preferredPixelFormat: 'yuv'`)**: Instructs `<CameraAI />` to stream native `YUV_420_888` buffers so Google ML Kit `InputImage.fromMediaImage` processes frames directly without CPU RGBA bitmap conversions.
- **🎛️ Live Granularity & Entity Filtering**: Dynamically switch bounding box granularity (`block`, `line`, `element`) and semantic entity filters (`all`, `nik`, `email`, `phone`, `url`, `currency`, `number`) at runtime without restarting the camera.
- **📐 Accurate `[0..1]` Overlay Projection**: Translates raw ML Kit `bounds.left/top` pixel coordinates and 4-point rotated corners into normalized `@masumdev/rn-camera-ai` boxes aligned identically across portrait, landscape, `cover`, `contain`, and front-camera mirroring.
- **🧠 Worklet-Safe Entity Classifier & Document Extractor**: Automatically tags scanned boxes (`NIK`, `EMAIL`, `PHONE`, `URL`, `CURRENCY`) and extracts deduplicated structured lists via `getLastStructuredEntities()` and `extractStructuredOcrData(fullText)`.
- **📄 Paper Corner Framing & Scan Optimality (`evaluateDocumentFraming`)**: Fits corner brackets onto outer document margins (`paperBox`, `paperCorners`), dampens jitter (`smoothPaperBox`), and scores read probability (`0-100%`) across `searching`, `clipped`, `tilted`, `too_far`, `too_close`, `off_center`, `low_clarity`, and `optimal`.
- **🖼️ Static Photo OCR (`recognizeImage` / `recognizeTextFromUri`)**: Supports capture-first still-photo scanning triggered cleanly with zero idle live box clutter.
- **🌍 5 Script Models Supported**: Latin (default, ~1-2 MB), Chinese, Devanagari, Japanese, and Korean.

---

## Installation

```bash
bun add @masumdev/rn-camera-ai @masumdev/rn-camera-ai-mlkit
# or
npm install @masumdev/rn-camera-ai @masumdev/rn-camera-ai-mlkit
```

### Native Peer Dependencies

```bash
bun add react-native-vision-camera react-native-vision-camera-mlkit react-native-vision-camera-worklets react-native-worklets react-native-nitro-modules react-native-nitro-image react-native-reanimated
```

### Expo Config Plugin Setup (`app.json`)

Configure selective Google ML Kit models in `app.json` (enable only Latin by default to keep APK binary size small) and rebuild your native development client:

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-vision-camera-mlkit",
        {
          "textRecognition": true,
          "textRecognitionChinese": false,
          "textRecognitionDevanagari": false,
          "textRecognitionJapanese": false,
          "textRecognitionKorean": false,
          "barcodeScanning": false
        }
      ]
    ]
  }
}
```

> **Note**: Adding native Google ML Kit libraries requires running `npx expo prebuild` / `npx expo run:android` (or EAS Build). Standard Expo Go cannot run native Nitro C++ modules.

---

## Quick Start (Capture-First Smart Document OCR)

Use `@masumdev/rn-camera-ai`'s zero-OCR `createDocumentAlignmentProcessor` for buttery preview corner tracking and run `recognizeImage` **once** after tapping Capture (recommended for battery & smooth FPS; you can also bind `ocrProcessor` directly for continuous live OCR):

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CameraAI,
  createDocumentAlignmentProcessor,
  type CameraAIRef,
  type DocumentGuideTarget,
} from '@masumdev/rn-camera-ai';
import {
  createMLKitTextRecognizer,
  type MLKitTextRecognizer,
} from '@masumdev/rn-camera-ai-mlkit';

export function OcrScannerScreen() {
  const cameraRef = useRef<CameraAIRef | null>(null);
  const alignmentProcessor = useMemo(
    () => createDocumentAlignmentProcessor({ targetFps: 5 }),
    []
  );
  const [ocrProcessor, setOcrProcessor] = useState<MLKitTextRecognizer | null>(null);
  const [guide, setGuide] = useState<DocumentGuideTarget>({
    box: { x: 0.08, y: 0.14, width: 0.84, height: 0.64 },
    readiness: 'searching',
    optimalityScore: 0,
    statusText: 'Arahkan kertas ke dalam bingkai',
  });
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    let active = true;
    let instance: MLKitTextRecognizer | null = null;

    async function setup() {
      const created = await createMLKitTextRecognizer({
        language: 'LATIN',
        granularity: 'line',
        entityFilter: 'all',
        minTextLength: 2,
      });

      if (active) {
        instance = created;
        setOcrProcessor(created);
      } else {
        created.dispose?.();
      }
    }

    setup();

    return () => {
      active = false;
      alignmentProcessor.dispose?.();
      instance?.dispose?.();
    };
  }, [alignmentProcessor]);

  const handleCapture = async () => {
    const photo = await cameraRef.current?.capturePhoto({ flashMode: 'off' });
    if (!photo || !ocrProcessor) return;
    const result = await ocrProcessor.recognizeImage(photo.uri);
    setTranscript(result?.text ?? '');
  };

  return (
    <View style={styles.container}>
      <CameraAI
        ref={cameraRef}
        processor={alignmentProcessor}
        enablePhotoCapture={true}
        showBoxes={false}
        showLabels={false}
        showLandmarks={false}
        documentGuide={guide}
        onDetections={(results) => {
          const align = results[0]?.documentAlignment;
          if (!align) return;
          setGuide({
            box: results[0].boundingBox,
            corners: align.corners,
            readiness: align.isOptimal ? 'optimal' : align.hasDocument ? 'adjusting' : 'searching',
            optimalityScore: align.optimalityScore,
            statusText: align.headline,
            hintText: align.hint,
          });
        }}
      />
      <View style={styles.transcriptBox}>
        <Text style={styles.transcriptText}>{transcript || guide.statusText}</Text>
        <Pressable onPress={handleCapture} style={styles.captureBtn}>
          <Text style={styles.captureText}>Capture Document</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  transcriptBox: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(5, 22, 30, 0.88)',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  transcriptText: { color: '#f8fafc', fontSize: 13 },
  captureBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  captureText: { color: '#05161E', fontWeight: '700' },
});
```

---

## Static Image / Photo OCR (`recognizeTextFromUri`)

For scanned documents, gallery photos, or ID card captures:

```typescript
import { recognizeTextFromUri } from '@masumdev/rn-camera-ai-mlkit';

const result = await recognizeTextFromUri('file:///storage/emulated/0/DCIM/ktp.jpg', {
  language: 'LATIN',
  granularity: 'line',
  imageWidth: 1280,
  imageHeight: 720,
});

console.log('Full Text:', result.fullText);
console.log('Extracted NIKs:', result.entities.niks);
console.log('Extracted Emails:', result.entities.emails);
console.log('Extracted Phones:', result.entities.phones);
```

---

## API Reference

### `createMLKitTextRecognizer(config?)`

#### Configuration Options (`MLKitTextRecognizerConfig`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `language` | `'LATIN' \| 'CHINESE' \| 'DEVANAGARI' \| 'JAPANESE' \| 'KOREAN'` | `'LATIN'` | Google ML Kit script recognition model. |
| `granularity` | `'block' \| 'line' \| 'element'` | `'line'` | Hierarchy level emitted as overlay bounding boxes. |
| `entityFilter` | `'all' \| 'nik' \| 'email' \| 'phone' \| 'url' \| 'currency' \| 'number' \| 'text'` | `'all'` | Filter detections to a specific semantic entity class. |
| `scaleFactor` | `number` | `1.0` | Optional image downscale factor (`0.9` - `1.0`). |
| `invertColors` | `boolean` | `false` | Invert dark-background / white-text images prior to OCR. |
| `roi` | `MLKitRegionOfInterest` | `undefined` | Restrict ML Kit processing to a crop rectangle. |
| `targetFps` | `number` | `10` | Frame rate throttling limit in FPS. |
| `minTextLength` | `number` | `1` | Minimum character count per emitted item. |
| `minConfidence` | `number` | `0` | Minimum confidence cutoff `[0, 1]` (Android). |
| `maxResults` | `number` | `30` | Maximum bounding boxes emitted per frame. |
| `preferredPixelFormat` | `'yuv' \| 'rgb' \| 'native'` | `'yuv'` | Camera frame pixel format (`yuv` enables Android ML Kit zero-copy). |

#### Runtime Methods (`MLKitTextRecognizer`)

- **`setGranularity(granularity)`**: Live switches `'block' | 'line' | 'element'`.
- **`setEntityFilter(filter)`**: Live filters detections to specific entity classes.
- **`setInvertColors(invert)`**: Recreates underlying native recognizer with color inversion enabled/disabled.
- **`setMinConfidence(confidence)`**: Dynamically sets confidence threshold.
- **`setMaxResults(maxResults)`**: Dynamically sets box limit per frame.
- **`getLastFullText()`**: Returns full recognized multi-line text string from the latest frame.
- **`getLastStructuredEntities()`**: Returns deduplicated `{ niks, emails, phones, urls, currencies }`.
- **`recognizeImage(uri, dims?)`**: Runs async OCR against a photo URI.

---

## License

MIT © [Ma'sum](https://github.com/masumrpg) — [masumdev.id](https://lib.masumdev.id)
