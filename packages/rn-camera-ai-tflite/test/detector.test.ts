import { describe, expect, test } from 'bun:test';
import { InferenceError, ModelLoadError } from '@masumdev/rn-camera-ai';
import { mockCameraState } from '../../../tests/e2e/setup/mock-native';
import { createTFLiteObjectDetector } from '../src/detector/TFLiteObjectDetector';
import type { TensorflowModel } from '../src/types/tflite';

describe('packages/rn-camera-ai-tflite > detector', () => {
  test('creates detector with valid model path and initializes to ready status', async () => {
    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      confidenceThreshold: 0.6,
      maxResults: 5,
      targetFps: 20,
    });

    expect(detector.id).toBeDefined();
    expect(detector.name).toBe('TFLiteObjectDetector');
    expect(detector.status).toBe('ready');
    expect(detector.activeDelegate).toBe('gpu');
    expect(detector.confidenceThreshold).toBe(0.6);
    expect(detector.maxResults).toBe(5);
    expect(detector.targetFps).toBe(20);
  });

  test('rejects empty or whitespace-only model source with ModelLoadError', async () => {
    await expect(
      createTFLiteObjectDetector({ model: '' })
    ).rejects.toThrow(ModelLoadError);

    await expect(
      createTFLiteObjectDetector({ model: '   ' })
    ).rejects.toThrow(ModelLoadError);

    await expect(
      createTFLiteObjectDetector({ model: { url: '' } })
    ).rejects.toThrow(ModelLoadError);

    await expect(
      createTFLiteObjectDetector({ model: { url: '   ' } })
    ).rejects.toThrow(ModelLoadError);
  });

  test('dynamically updates confidenceThreshold and maxResults', async () => {
    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      confidenceThreshold: 0.5,
      maxResults: 10,
    });

    detector.setConfidenceThreshold(0.75);
    expect(detector.confidenceThreshold).toBe(0.75);

    // Clamps out of range threshold
    detector.setConfidenceThreshold(1.5);
    expect(detector.confidenceThreshold).toBe(1);

    detector.setConfidenceThreshold(-0.5);
    expect(detector.confidenceThreshold).toBe(0);

    // Ignores NaN
    detector.setConfidenceThreshold(NaN);
    expect(detector.confidenceThreshold).toBe(0);

    detector.setMaxResults(3);
    expect(detector.maxResults).toBe(3);

    // Ignores negative maxResults
    detector.setMaxResults(-5);
    expect(detector.maxResults).toBe(3);
  });

  test('disposed detector throws InferenceError on processFrame and can be re-initialized', async () => {
    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
    });

    detector.dispose?.();
    expect(detector.status).toBe('idle');
    expect(() => detector.processFrame({})).toThrow(InferenceError);

    await detector.initialize?.();
    expect(detector.status).toBe('ready');
    expect(detector.processFrame({})).toEqual([]);
  });

  test('executes inference and parses outputs through processFrame', async () => {
    const mockBoxes = new Float32Array([0.1, 0.2, 0.6, 0.7]);
    const mockClasses = new Float32Array([1]);
    const mockScores = new Float32Array([0.88]);
    const mockCount = new Float32Array([1]);

    const mockModel: TensorflowModel = {
      runSync: () => [mockBoxes, mockClasses, mockScores, mockCount],
    };

    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      labels: ['bg', 'laptop'],
      confidenceThreshold: 0.5,
      maxResults: 5,
      loadModel: async () => mockModel,
    });

    const detections = detector.processFrame({});
    expect(detections.length).toBe(1);
    expect(detections[0].label).toBe('laptop');
    expect(detections[0].confidence).toBeCloseTo(0.88, 2);
    expect(detections[0].boundingBox.x).toBeCloseTo(0.2, 2);
    expect(detections[0].boundingBox.y).toBeCloseTo(0.1, 2);
    expect(detections[0].boundingBox.width).toBeCloseTo(0.5, 2);
    expect(detections[0].boundingBox.height).toBeCloseTo(0.5, 2);
  });

  test('throttles frame rate by dropping frames called within minFrameInterval', async () => {
    let inferenceCallCount = 0;
    const mockModel: TensorflowModel = {
      runSync: () => {
        inferenceCallCount++;
        return [
          new Float32Array([0.1, 0.1, 0.5, 0.5]),
          new Float32Array([0]),
          new Float32Array([0.9]),
          1,
        ];
      },
    };

    // 1 FPS -> 1000ms minimum interval
    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      targetFps: 1,
      loadModel: async () => mockModel,
    });

    // First call processes
    const res1 = detector.processFrame({});
    expect(res1.length).toBe(1);
    expect(inferenceCallCount).toBe(1);

    // Immediate second call should be throttled and dropped (returns [])
    const res2 = detector.processFrame({});
    expect(res2.length).toBe(0);
    expect(inferenceCallCount).toBe(1); // not incremented!
  });

  test('invokes resizePlugin with configured input dimensions', async () => {
    let capturedOptions: unknown = null;
    const dummyBuffer = new ArrayBuffer(300 * 300 * 3);

    const mockResizePlugin = {
      resize: (_frame: unknown, options: unknown) => {
        capturedOptions = options;
        return { buffer: dummyBuffer };
      },
    };

    let passedBuffer: unknown = null;
    const mockModel: TensorflowModel = {
      runSync: (inputs) => {
        passedBuffer = inputs[0];
        return [];
      },
    };

    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      inputWidth: 320,
      inputHeight: 240,
      targetFps: 0, // no throttling
      resizePlugin: mockResizePlugin,
      loadModel: async () => mockModel,
    });

    detector.processFrame({ fake: 'frame' });

    expect(capturedOptions).toEqual({
      scale: { width: 320, height: 240 },
      pixelFormat: 'rgb',
      dataType: 'uint8',
    });
    expect(passedBuffer).toBe(dummyBuffer);
  });

  test('wraps runSync errors into typed InferenceError', async () => {
    const mockModel: TensorflowModel = {
      runSync: () => {
        throw new Error('Tensor dimension mismatch in C++ interpreter');
      },
    };

    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      targetFps: 0,
      loadModel: async () => mockModel,
    });

    expect(() => detector.processFrame({})).toThrow(InferenceError);
  });

  test('preprocesses VisionCamera v5 Frame via HybridFrameConverter, converts RGBA to RGB ArrayBuffer, and disposes intermediate Nitro Images', async () => {
    mockCameraState.reset();
    let passedInput: unknown = null;

    const mockModel: TensorflowModel = {
      runSync: (inputs) => {
        passedInput = inputs[0];
        return [
          new Float32Array([0.1, 0.2, 0.5, 0.6]).buffer,
          new Float32Array([0]).buffer,
          new Float32Array([0.85]).buffer,
          new Float32Array([1]).buffer,
        ];
      },
    };

    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      inputWidth: 4,
      inputHeight: 4,
      targetFps: 0,
      labels: ['person'],
      loadModel: async () => mockModel,
    });

    const mockVc5Frame = {
      width: 8,
      height: 8,
      isValid: true,
      pixelFormat: 'RGBA',
      getPixelBuffer: () => new ArrayBuffer(8 * 8 * 4),
    };

    const results = detector.processFrame(mockVc5Frame);
    expect(mockCameraState.convertedImageCount).toBe(1);
    expect(mockCameraState.disposedImageCount).toBe(2);
    expect(passedInput).toBeInstanceOf(ArrayBuffer);
    expect((passedInput as ArrayBuffer).byteLength).toBe(4 * 4 * 3);
    expect(results.length).toBe(1);
    expect(results[0].label).toBe('person');
  });

  test('converts BGRA raw pixel data to packed RGB bytes in exact channel order and executes via processFrameWorklet', async () => {
    mockCameraState.reset();
    let capturedBytes: Uint8Array | null = null;

    const mockModel: TensorflowModel = {
      runSync: (inputs) => {
        if (inputs[0] instanceof ArrayBuffer) {
          capturedBytes = new Uint8Array(inputs[0]);
        }
        return [];
      },
    };

    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      inputWidth: 2,
      inputHeight: 1,
      targetFps: 0,
      loadModel: async () => mockModel,
    });

    // BGRA pixels: [B=10, G=20, R=30, A=255], [B=40, G=50, R=60, A=255]
    const bgra = new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]).buffer;
    const mockVc5Frame = {
      width: 2,
      height: 1,
      isValid: true,
      pixelFormat: 'BGRA',
      getPixelBuffer: () => bgra,
    };

    expect(typeof detector.processFrameWorklet).toBe('function');
    detector.processFrameWorklet?.(mockVc5Frame);

    // Same dimensions -> no resize allocation, only sourceImage disposed once
    expect(mockCameraState.convertedImageCount).toBe(1);
    expect(mockCameraState.disposedImageCount).toBe(1);
    expect(capturedBytes).not.toBeNull();
    expect(Array.from(capturedBytes as unknown as Uint8Array)).toEqual([
      30, 20, 10, 60, 50, 40,
    ]);
  });

  test('skips invalid VC v5 Frame without calling HybridFrameConverter', async () => {
    mockCameraState.reset();
    const detector = await createTFLiteObjectDetector({
      model: 'detect.tflite',
      targetFps: 0,
      loadModel: async () => ({ runSync: () => [] }),
    });

    const invalidFrame = {
      width: 640,
      height: 480,
      isValid: false,
      getPixelBuffer: () => new ArrayBuffer(0),
    };

    expect(detector.processFrame(invalidFrame)).toEqual([]);
    expect(mockCameraState.convertedImageCount).toBe(0);
  });
});
