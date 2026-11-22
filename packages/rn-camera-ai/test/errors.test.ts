import { describe, expect, it } from 'bun:test';
import {
  CameraAIError,
  CameraError,
  InferenceError,
  ModelLoadError,
} from '../src/types/errors';

describe('Error Hierarchy', () => {
  it('creates base CameraAIError with code and optional cause', () => {
    const cause = new Error('Low level error');
    const error = new CameraAIError('Something failed', 'GENERIC_CODE', cause);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CameraAIError);
    expect(error.name).toBe('CameraAIError');
    expect(error.message).toBe('Something failed');
    expect(error.code).toBe('GENERIC_CODE');
    expect(error.cause).toBe(cause);
  });

  it('creates CameraError with default code and proper inheritance', () => {
    const error = new CameraError('Camera device not found');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CameraAIError);
    expect(error).toBeInstanceOf(CameraError);
    expect(error.name).toBe('CameraError');
    expect(error.code).toBe('CAMERA_ERROR');
    expect(error.message).toBe('Camera device not found');
  });

  it('creates ModelLoadError with default code and proper inheritance', () => {
    const error = new ModelLoadError('Model file not found');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CameraAIError);
    expect(error).toBeInstanceOf(ModelLoadError);
    expect(error.name).toBe('ModelLoadError');
    expect(error.code).toBe('MODEL_LOAD_ERROR');
    expect(error.message).toBe('Model file not found');
  });

  it('creates InferenceError with default code and proper inheritance', () => {
    const error = new InferenceError('Tensor output parsing failed');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CameraAIError);
    expect(error).toBeInstanceOf(InferenceError);
    expect(error.name).toBe('InferenceError');
    expect(error.code).toBe('INFERENCE_ERROR');
    expect(error.message).toBe('Tensor output parsing failed');
  });

  it('supports custom error codes and nested causes in subclasses', () => {
    const inner = new TypeError('Invalid tensor buffer');
    const customInference = new InferenceError(
      'Preprocessing failed',
      'INPUT_BUFFER_INVALID',
      inner
    );

    expect(customInference.code).toBe('INPUT_BUFFER_INVALID');
    expect(customInference.cause).toBe(inner);
  });
});
