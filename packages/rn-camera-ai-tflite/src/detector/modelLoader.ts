import { ModelLoadError } from '@masumdev/rn-camera-ai';
import type {
  LoadedModelResult,
  ModelLoaderOptions,
  TFLiteModelSource,
  TensorflowModel,
} from '../types/tflite';

/**
 * Validates that the provided model source conforms to supported TFLite model source representations.
 * Throws a typed ModelLoadError if the source is invalid or empty.
 */
export function validateModelSource(source: unknown): TFLiteModelSource {
  if (source === null || source === undefined) {
    throw new ModelLoadError('Model source cannot be null or undefined', 'MODEL_LOAD_ERROR');
  }

  if (typeof source === 'number') {
    if (!Number.isFinite(source) || source < 0 || !Number.isInteger(source)) {
      throw new ModelLoadError(
        'Invalid model source: asset ID must be a non-negative finite integer',
        'MODEL_LOAD_ERROR'
      );
    }
    return source;
  }

  if (typeof source === 'string') {
    if (source.trim().length === 0) {
      throw new ModelLoadError(
        'Invalid model source: model path or URL cannot be empty or whitespace-only',
        'MODEL_LOAD_ERROR'
      );
    }
    return source.trim();
  }

  if (typeof source === 'object' && 'url' in (source as Record<string, unknown>)) {
    const url = (source as { url: unknown }).url;
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new ModelLoadError(
        'Invalid model source: model URL cannot be empty or whitespace-only',
        'MODEL_LOAD_ERROR'
      );
    }
    return { url: url.trim() };
  }

  throw new ModelLoadError(
    'Invalid model source: expected asset ID number, file path string, or { url: string }',
    'MODEL_LOAD_ERROR'
  );
}

/**
 * Determines the target operating platform for delegate selection.
 */
export function getEffectivePlatform(platformOverride?: string): string {
  if (platformOverride && typeof platformOverride === 'string') {
    return platformOverride.toLowerCase();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native') as { Platform?: { OS?: string } };
    if (typeof rn?.Platform?.OS === 'string' && rn.Platform.OS.length > 0) {
      return rn.Platform.OS.toLowerCase();
    }
  } catch {
    // Fallback when react-native is not present
  }

  if (typeof process !== 'undefined' && process.env?.TEST_PLATFORM_OS) {
    return process.env.TEST_PLATFORM_OS.toLowerCase();
  }

  return 'android';
}

/**
 * Resolves the default model loader function using react-native-fast-tflite if available,
 * or provides a fallback runner for headless test environments.
 */
function resolveDefaultLoader(): (
  source: TFLiteModelSource,
  delegates: string[]
) => Promise<TensorflowModel> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fastTflite = require('react-native-fast-tflite') as {
      loadTensorflowModel?: (
        source: number | { url: string },
        delegates: string[]
      ) => Promise<TensorflowModel>;
    };
    if (typeof fastTflite?.loadTensorflowModel === 'function') {
      const loadFn = fastTflite.loadTensorflowModel;
      return (s, d) => {
        const normalizedSource: number | { url: string } =
          typeof s === 'string'
            ? {
                url:
                  s.startsWith('file://') ||
                  s.startsWith('http://') ||
                  s.startsWith('https://')
                    ? s
                    : `file://${s}`,
              }
            : s;
        return loadFn(normalizedSource, d);
      };
    }
  } catch {
    // Native runtime not loaded
  }

  return async (_source: TFLiteModelSource, delegates: string[]): Promise<TensorflowModel> => {
    if (
      typeof process !== 'undefined' &&
      process.env?.SIMULATE_GPU_FAILURE === 'true' &&
      delegates.length > 0
    ) {
      throw new Error('GPU delegate initialization failed: OpenCL unavailable');
    }

    return {
      runSync: () => [],
      run: async () => [],
      delegates,
    };
  };
}

/**
 * Loads a TensorFlow Lite model with automatic hardware delegate fallback.
 *
 * It attempts to initialize with GPU acceleration ('android-gpu' on Android, 'core-ml' on iOS).
 * If the GPU delegate fails (e.g., unsupported OpenCL/OpenGL ops), it falls back to CPU ([])
 * without throwing or crashing, safely emitting onDelegateFallback.
 *
 * @param source Model bundle ID, file path string, or URL object
 * @param options Loading options including GPU preference and fallback callback
 * @returns Initialized model and active delegate ('gpu' | 'cpu')
 */
export async function loadModelWithFallback(
  source: unknown,
  options?: ModelLoaderOptions
): Promise<LoadedModelResult> {
  const validSource = validateModelSource(source);
  const loader = options?.loadModel ?? resolveDefaultLoader();
  const platform = getEffectivePlatform(options?.platform);
  const useGpu = options?.useGpu !== false;

  if (useGpu) {
    const requestedDelegate = platform === 'android' ? 'android-gpu' : 'core-ml';
    try {
      const model = await loader(validSource, [requestedDelegate]);
      return {
        model,
        activeDelegate: 'gpu',
        source: validSource,
      };
    } catch {
      // GPU delegate failed to initialize: invoke fallback callback
      options?.onDelegateFallback?.(requestedDelegate, 'cpu');
    }
  }

  // Graceful CPU fallback
  try {
    const cpuModel = await loader(validSource, []);
    return {
      model: cpuModel,
      activeDelegate: 'cpu',
      source: validSource,
    };
  } catch (cpuError: unknown) {
    throw new ModelLoadError(
      cpuError instanceof Error ? cpuError.message : 'Failed to load TFLite model on CPU',
      'MODEL_LOAD_ERROR',
      cpuError
    );
  }
}
