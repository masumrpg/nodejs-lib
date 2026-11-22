import { describe, expect, test } from 'bun:test';
import { ModelLoadError } from '@masumdev/rn-camera-ai';
import {
  createMLKitTextRecognizer,
  recognizeTextFromUri,
  type MLKitNativeRecognizerOptions,
  type MLKitTextRecognitionResult,
} from '../src';

function createSampleMockResult(): MLKitTextRecognitionResult {
  return {
    text: 'Masum Dev\nmasum@example.com\n3273011505990001',
    blocks: [
      {
        text: 'Masum Dev\nmasum@example.com\n3273011505990001',
        bounds: {
          x: 360,
          y: 320,
          width: 480,
          height: 200,
          left: 120,
          top: 220,
          right: 600,
          bottom: 420,
        },
        languages: ['id', 'en'],
        lines: [
          {
            text: 'Masum Dev',
            bounds: { x: 240, y: 240, width: 220, height: 36, left: 130, top: 222 },
            confidence: 0.95,
            angle: 0,
            languages: ['en'],
            elements: [
              {
                text: 'Masum',
                bounds: { x: 180, y: 240, width: 100, height: 36, left: 130, top: 222 },
                confidence: 0.95,
              },
              {
                text: 'Dev',
                bounds: { x: 285, y: 240, width: 70, height: 36, left: 250, top: 222 },
                confidence: 0.94,
              },
            ],
          },
          {
            text: 'masum@example.com',
            bounds: { x: 300, y: 310, width: 320, height: 36, left: 140, top: 292 },
            confidence: 0.92,
            angle: 0,
            languages: ['en'],
            elements: [],
          },
          {
            text: '3273011505990001',
            bounds: { x: 300, y: 380, width: 320, height: 36, left: 140, top: 362 },
            confidence: 0.98,
            angle: 0,
            languages: ['id'],
            elements: [],
          },
        ],
      },
    ],
  };
}

describe('packages/rn-camera-ai-mlkit > MLKitTextRecognizer', () => {
  test('createMLKitTextRecognizer sets preferredPixelFormat to yuv and runs OCR in worklet mode', async () => {
    let recognizeCallCount = 0;
    let disposed = false;

    const recognizer = await createMLKitTextRecognizer({
      language: 'LATIN',
      granularity: 'line',
      targetFps: 0,
      createRecognizer: () => ({
        recognize: () => {
          recognizeCallCount += 1;
          return createSampleMockResult();
        },
        dispose: () => {
          disposed = true;
        },
      }),
    });

    expect(recognizer.status).toBe('ready');
    expect(recognizer.preferredPixelFormat).toBe('yuv');
    expect(recognizer.language).toBe('LATIN');
    expect(recognizer.granularity).toBe('line');

    const detections = recognizer.processFrame({
      width: 720,
      height: 1280,
      orientation: 'up',
      isValid: true,
    });

    expect(recognizeCallCount).toBe(1);
    expect(detections.length).toBe(3);
    expect(detections[0].label).toBe('Masum Dev');
    expect(detections[1].ocr?.category).toBe('email');
    expect(detections[2].ocr?.category).toBe('nik');
    expect(recognizer.getLastFullText()).toContain('masum@example.com');
    expect(recognizer.getLastStructuredEntities().niks).toEqual([
      '3273011505990001',
    ]);

    // Dynamic granularity switching at runtime
    recognizer.setGranularity('block');
    const blockDetections = recognizer.processFrame({
      width: 720,
      height: 1280,
      orientation: 'up',
    });
    expect(blockDetections.length).toBe(1);
    expect(blockDetections[0].ocr?.granularity).toBe('block');

    // Dynamic entity filter switching at runtime
    recognizer.setGranularity('line');
    recognizer.setEntityFilter('email');
    const emailOnly = recognizer.processFrame({
      width: 720,
      height: 1280,
      orientation: 'up',
    });
    expect(emailOnly.length).toBe(1);
    expect(emailOnly[0].label).toBe('masum@example.com');

    recognizer.dispose?.();
    expect(disposed).toBe(true);
    expect(recognizer.status).toBe('idle');
  });

  test('throttles frames according to targetFps and updates wasThrottledSync cleanly', async () => {
    let recognizeCalls = 0;
    const recognizer = await createMLKitTextRecognizer({
      targetFps: 5,
      createRecognizer: () => ({
        recognize: () => {
          recognizeCalls += 1;
          return createSampleMockResult();
        },
      }),
    });

    const first = recognizer.processFrame({ width: 720, height: 1280, orientation: 'up' });
    expect(first.length).toBe(3);
    expect(recognizer.wasThrottledSync?.getBlocking()).toBe(false);

    const second = recognizer.processFrame({ width: 720, height: 1280, orientation: 'up' });
    expect(second.length).toBe(0);
    expect(recognizer.wasThrottledSync?.getBlocking()).toBe(true);
    expect(recognizeCalls).toBe(1);
  });

  test('setInvertColors recreates underlying native recognizer and swaps worklet reference', async () => {
    const seenInvertFlags: Array<boolean | undefined> = [];
    const recognizer = await createMLKitTextRecognizer({
      invertColors: false,
      createRecognizer: (opts: MLKitNativeRecognizerOptions) => {
        seenInvertFlags.push(opts.invertColors);
        return {
          recognize: () => createSampleMockResult(),
        };
      },
    });

    await recognizer.setInvertColors(true);
    expect(recognizer.invertColors).toBe(true);
    expect(seenInvertFlags).toEqual([false, true]);
  });

  test('recognizeImage and recognizeTextFromUri return normalized detections and structured entities', async () => {
    const result = await recognizeTextFromUri('file:///tmp/ktp.jpg', {
      imageWidth: 800,
      imageHeight: 600,
      processImage: async () => createSampleMockResult(),
    });

    expect(result.fullText).toContain('3273011505990001');
    expect(result.entities.niks).toEqual(['3273011505990001']);
    expect(result.entities.emails).toEqual(['masum@example.com']);
    expect(result.detections.length).toBe(3);

    const processor = await createMLKitTextRecognizer({
      createRecognizer: () => ({
        recognize: () => createSampleMockResult(),
        recognizeImage: async () => createSampleMockResult(),
      }),
    });
    const docResult = await processor.recognizeImage('file:///tmp/receipt.jpg', {
      imageWidth: 720,
      imageHeight: 1280,
    });
    expect(docResult.detections.length).toBe(3);
  });

  test('throws ModelLoadError when native factory fails', async () => {
    let caughtError: unknown = null;
    try {
      await createMLKitTextRecognizer({
        createRecognizer: () => {
          throw new Error('Missing native MLKit binary');
        },
      });
    } catch (err: unknown) {
      caughtError = err;
    }
    expect(caughtError instanceof ModelLoadError).toBe(true);
  });
});
