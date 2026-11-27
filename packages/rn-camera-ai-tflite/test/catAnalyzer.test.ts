import { describe, expect, test } from 'bun:test';
import { createTFLiteCatAnalyzer, type TFLiteModelSource } from '../src';

function createSampleRgbFrame(r: number, g: number, b: number, size = 300): ArrayBuffer {
  const bytes = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const o = i * 3;
    bytes[o] = r;
    bytes[o + 1] = g;
    bytes[o + 2] = b;
  }
  return bytes.buffer;
}

describe('packages/rn-camera-ai-tflite > TFLiteCatAnalyzer multi-model pipeline', () => {
  test('coordinates COCO SSD cat gate, dual breed ensemble, 48-pt face mood, DeepLab segmentation, and 1-tap enrollment', async () => {
    let emitCatInSsd = true;
    const labels91 = new Array<string>(91).fill('other');
    labels91[16] = 'cat'; // classIndex 16 + labelOffset 1 => index 17? Set explicit index alignment
    const explicitCocoLabels: Record<number, string> = {
      1: 'person',
      17: 'cat',
      63: 'couch',
    };

    const breed67Labels = Array.from({ length: 67 }, (_, i) => `Breed67-${i}`);
    breed67Labels[58] = 'Tabby';
    const breed12Labels = Array.from({ length: 12 }, (_, i) => `Breed12-${i}`);
    breed12Labels[6] = 'Abyssinian';

    const deepLabSize = 257;
    const deepLabLogits = new Float32Array(deepLabSize * deepLabSize * 21).fill(-4);
    for (let y = 0; y < deepLabSize; y++) {
      for (let x = 0; x < deepLabSize; x++) {
        const isCat = x >= 60 && x <= 190 && y >= 50 && y <= 210;
        deepLabLogits[(y * deepLabSize + x) * 21 + (isCat ? 8 : 0)] = 4.5;
      }
    }

    const landmarks96 = new Float32Array(96);
    for (let i = 0; i < 48; i++) {
      landmarks96[i * 2] = 0.5;
      landmarks96[i * 2 + 1] = 0.5;
    }
    landmarks96[4 * 2] = 0.35;
    landmarks96[4 * 2 + 1] = 0.44;
    landmarks96[8 * 2] = 0.65;
    landmarks96[8 * 2 + 1] = 0.44;
    landmarks96[36 * 2] = 0.3;
    landmarks96[36 * 2 + 1] = 0.14;
    landmarks96[45 * 2] = 0.7;
    landmarks96[45 * 2 + 1] = 0.14;

    const loadedSources: TFLiteModelSource[] = [];
    const fallbackEvents: Array<{ req: string; fb: string }> = [];

    const analyzer = await createTFLiteCatAnalyzer({
      detectorModel: 'detect.tflite',
      detectorLabels: explicitCocoLabels,
      detectorLabelOffset: 1,
      breed67Model: 'cat_breed_67.tflite',
      breed67Labels,
      breed12Model: 'cat_breed_oxford12.tflite',
      breed12Labels,
      catFaceLocalizerModel: 'cat_face_localizer.tflite',
      catFaceLandmarksModel: 'cat_face_landmarks_full.tflite',
      segmentationModel: 'deeplab_v3.tflite',
      targetFps: 0,
      useGpu: true,
      confidenceThreshold: 0.4,
      similarityThreshold: 0.72,
      onDelegateFallback: (req, fb) => fallbackEvents.push({ req, fb }),
      loadModel: async (source, delegates) => {
        loadedSources.push(source);
        // Simulate GPU failure on detector to validate graceful fallback to CPU
        if (source === 'detect.tflite' && delegates.some((d) => d !== 'default')) {
          throw new Error('GPU driver error');
        }
        return {
          runSync: () => {
            if (source === 'detect.tflite') {
              const boxes = new Float32Array([
                0.15, 0.15, 0.85, 0.85, // slot 0: cat or person
                0.2, 0.05, 0.9, 0.95,   // slot 1: couch context
              ]);
              const classes = new Float32Array([emitCatInSsd ? 16 : 0, 62]);
              const scores = new Float32Array([0.92, 0.78]);
              const count = new Float32Array([2]);
              return [boxes, classes, scores, count];
            }
            if (source === 'cat_breed_67.tflite') {
              const probs = new Float32Array(67).fill(0.001);
              probs[58] = 0.82; // Tabby
              return [probs];
            }
            if (source === 'cat_breed_oxford12.tflite') {
              const probs = new Uint8Array(12).fill(2);
              probs[6] = 220; // Abyssinian
              return [probs];
            }
            if (source === 'cat_face_localizer.tflite') {
              return [new Float32Array([0.22, 0.18, 0.78, 0.74])];
            }
            if (source === 'cat_face_landmarks_full.tflite') {
              return [landmarks96];
            }
            if (source === 'deeplab_v3.tflite') {
              return [deepLabLogits];
            }
            return [];
          },
        };
      },
    });

    expect(new Set(loadedSources).size).toBe(6);
    expect(analyzer.activeDelegate).toBe('cpu');
    expect(fallbackEvents.length).toBe(1);
    expect(analyzer.loadedModels.detector).toBe(true);
    expect(analyzer.loadedModels.breed67).toBe(true);
    expect(analyzer.loadedModels.breed12).toBe(true);
    expect(analyzer.loadedModels.catFaceLocalizer).toBe(true);
    expect(analyzer.loadedModels.catFaceLandmarks).toBe(true);
    expect(analyzer.loadedModels.segmentation).toBe(true);

    const frame = createSampleRgbFrame(215, 130, 58, 300);

    // Tick 0: SSD + Breed12 + Face Localizer & 48-pt Landmarks + DeepLab Segmentation
    const res0 = analyzer.processFrame(frame);
    // Tick 1: SSD + Breed67 fusion
    const res1 = analyzer.processFrame(frame);
    // Tick 2: Cat Face + DeepLab refresh
    const res2 = analyzer.processFrame(frame);

    expect(res0.length).toBe(1);
    const catResult = res2.find((d) => d.cat?.isCat);
    expect(catResult).toBeDefined();
    expect(catResult?.cat?.topBreeds.length).toBeGreaterThan(0);
    expect(catResult?.landmarks?.length).toBe(48);
    expect(catResult?.cat?.moodMetrics).toBeDefined();
    expect(catResult?.cat?.faceBoundingBox).toBeDefined();
    expect(catResult?.cat?.segmentation).toBeDefined();
    expect(catResult?.cat?.coatSwatches?.length).toBeGreaterThan(0);
    expect(catResult?.cat?.sceneContextTags).toContain('Resting Spot');

    // Verify 1-Tap Cat ID Enrollment & live recognition
    const enrolled = analyzer.enrollLastDetectedCat('Oyen', catResult?.cat?.topBreeds[0]?.breed);
    expect(enrolled).not.toBeNull();
    expect(enrolled?.name).toBe('Oyen');

    const res3 = analyzer.processFrame(frame);
    const recognized = res3.find((d) => d.cat?.isCat);
    expect(recognized?.identity?.isRecognized).toBe(true);
    expect(recognized?.identity?.name).toBe('Oyen');
    expect(recognized?.label).toContain('Oyen');

    // Verify dynamic controls & Close-Up fallback toggle
    analyzer.setAnalysisMode('breed');
    expect(analyzer.analysisMode).toBe('breed');
    analyzer.setBreedEngine('67');
    expect(analyzer.breedEngine).toBe('67');

    emitCatInSsd = false;
    analyzer.setCloseUpFallback(false);
    const nonCatOnly = analyzer.processFrame(frame);
    expect(nonCatOnly.some((d) => d.cat?.isCat)).toBe(false);

    // Enable Close-Up fallback and verify center close-up probe emits cat when face localizer locks on
    analyzer.setAnalysisMode('all');
    analyzer.setCloseUpFallback(true);
    const closeUpRes = analyzer.processFrame(frame);
    expect(closeUpRes.some((d) => d.cat?.isCat)).toBe(true);

    // Cleanup & disposal
    expect(analyzer.removeEnrolledCat(enrolled!.id)).toBe(true);
    analyzer.clearEnrolledCats();
    expect(analyzer.getEnrolledCats().length).toBe(0);
    analyzer.dispose();
    expect(analyzer.status).toBe('idle');
    expect(() => analyzer.processFrame(frame)).toThrow();
    expect(res1.length).toBeGreaterThan(0);
  });
});
