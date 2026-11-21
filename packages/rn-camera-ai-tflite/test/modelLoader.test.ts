import { describe, expect, test } from 'bun:test';
import { ModelLoadError } from '@masumdev/rn-camera-ai';
import {
  getEffectivePlatform,
  loadModelWithFallback,
  validateModelSource,
} from '../src/detector/modelLoader';
import type { TensorflowModel } from '../src/types/tflite';

describe('packages/rn-camera-ai-tflite > modelLoader', () => {
  describe('validateModelSource', () => {
    test('accepts valid asset ID numbers, file paths, and URL objects', () => {
      expect(validateModelSource(42)).toBe(42);
      expect(validateModelSource('models/detect.tflite')).toBe('models/detect.tflite');
      expect(validateModelSource('file:///data/model.tflite')).toBe('file:///data/model.tflite');
      expect(validateModelSource({ url: 'https://example.com/model.tflite' })).toEqual({
        url: 'https://example.com/model.tflite',
      });
    });

    test('rejects null and undefined', () => {
      expect(() => validateModelSource(null)).toThrow(ModelLoadError);
      expect(() => validateModelSource(undefined)).toThrow(ModelLoadError);
    });

    test('rejects negative, NaN, Infinity, and non-integer numbers', () => {
      expect(() => validateModelSource(-1)).toThrow(ModelLoadError);
      expect(() => validateModelSource(NaN)).toThrow(ModelLoadError);
      expect(() => validateModelSource(Infinity)).toThrow(ModelLoadError);
      expect(() => validateModelSource(3.14)).toThrow(ModelLoadError);
    });

    test('rejects empty or whitespace-only strings and URL objects', () => {
      expect(() => validateModelSource('')).toThrow(ModelLoadError);
      expect(() => validateModelSource('   \t\n  ')).toThrow(ModelLoadError);
      expect(() => validateModelSource({ url: '' })).toThrow(ModelLoadError);
      expect(() => validateModelSource({ url: '   ' })).toThrow(ModelLoadError);
      expect(() => validateModelSource({ url: 123 as unknown as string })).toThrow(ModelLoadError);
      expect(() => validateModelSource({})).toThrow(ModelLoadError);
      expect(() => validateModelSource([1, 2, 3])).toThrow(ModelLoadError);
    });
  });

  describe('getEffectivePlatform', () => {
    test('respects explicit platform override', () => {
      expect(getEffectivePlatform('android')).toBe('android');
      expect(getEffectivePlatform('iOS')).toBe('ios');
    });

    test('defaults to android in absence of platform override or rn runtime', () => {
      expect(getEffectivePlatform()).toBe('android');
    });
  });

  describe('loadModelWithFallback', () => {
    test('loads successfully with GPU delegate when GPU is supported', async () => {
      const mockModel: TensorflowModel = {
        runSync: () => [],
        delegates: ['android-gpu'],
      };

      let requestedDelegates: string[] = [];
      const result = await loadModelWithFallback('detect.tflite', {
        useGpu: true,
        platform: 'android',
        loadModel: async (_source, delegates) => {
          requestedDelegates = delegates;
          return mockModel;
        },
      });

      expect(requestedDelegates).toEqual(['android-gpu']);
      expect(result.activeDelegate).toBe('gpu');
      expect(result.source).toBe('detect.tflite');
      expect(result.model).toBe(mockModel);
    });

    test('requests core-ml on iOS when GPU is requested', async () => {
      let requestedDelegates: string[] = [];
      await loadModelWithFallback({ url: 'https://cdn.example.com/net.tflite' }, {
        useGpu: true,
        platform: 'ios',
        loadModel: async (_source, delegates) => {
          requestedDelegates = delegates;
          return { runSync: () => [] };
        },
      });

      expect(requestedDelegates).toEqual(['core-ml']);
    });

    test('falls back to CPU and invokes callback when GPU initialization fails', async () => {
      let fallbackRequested = '';
      let fallbackTarget = '';
      const delegateCalls: string[][] = [];

      const cpuModel: TensorflowModel = {
        runSync: () => [],
        delegates: [],
      };

      const result = await loadModelWithFallback(101, {
        useGpu: true,
        platform: 'android',
        onDelegateFallback: (req, fallback) => {
          fallbackRequested = req;
          fallbackTarget = fallback;
        },
        loadModel: async (_source, delegates) => {
          delegateCalls.push(delegates);
          if (delegates.includes('android-gpu')) {
            throw new Error('OpenCL GPU delegate unsupported on this chipset');
          }
          return cpuModel;
        },
      });

      expect(delegateCalls.length).toBe(2);
      expect(delegateCalls[0]).toEqual(['android-gpu']);
      expect(delegateCalls[1]).toEqual([]);
      expect(fallbackRequested).toBe('android-gpu');
      expect(fallbackTarget).toBe('cpu');
      expect(result.activeDelegate).toBe('cpu');
      expect(result.model).toBe(cpuModel);
    });

    test('loads directly on CPU when useGpu is false without attempting GPU', async () => {
      const delegateCalls: string[][] = [];
      let callbackInvoked = false;

      const result = await loadModelWithFallback('detect.tflite', {
        useGpu: false,
        onDelegateFallback: () => {
          callbackInvoked = true;
        },
        loadModel: async (_source, delegates) => {
          delegateCalls.push(delegates);
          return { runSync: () => [] };
        },
      });

      expect(delegateCalls.length).toBe(1);
      expect(delegateCalls[0]).toEqual([]);
      expect(callbackInvoked).toBe(false);
      expect(result.activeDelegate).toBe('cpu');
    });

    test('throws ModelLoadError if CPU initialization also fails', async () => {
      await expect(
        loadModelWithFallback('detect.tflite', {
          useGpu: true,
          loadModel: async () => {
            throw new Error('Corrupted TFLite flatbuffer file');
          },
        })
      ).rejects.toThrow(ModelLoadError);
    });

    test('simulates GPU failure fallback in test environment via SIMULATE_GPU_FAILURE', async () => {
      process.env.SIMULATE_GPU_FAILURE = 'true';
      let fallbackTriggered = false;

      try {
        const result = await loadModelWithFallback('detect.tflite', {
          useGpu: true,
          onDelegateFallback: () => {
            fallbackTriggered = true;
          },
        });

        expect(fallbackTriggered).toBe(true);
        expect(result.activeDelegate).toBe('cpu');
      } finally {
        delete process.env.SIMULATE_GPU_FAILURE;
      }
    });
  });
});
