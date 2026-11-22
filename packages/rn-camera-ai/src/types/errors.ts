/**
 * Base error class for all Camera AI operations.
 */
export class CameraAIError extends Error {
  public readonly code: string;
  public readonly cause?: unknown;

  constructor(message: string, code: string, cause?: unknown) {
    super(message);
    this.name = 'CameraAIError';
    this.code = code;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Errors related to camera hardware, permissions, and streaming.
 */
export class CameraError extends CameraAIError {
  constructor(message: string, code = 'CAMERA_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'CameraError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Errors occurring during model asset resolution, file reading, or delegate initialization.
 */
export class ModelLoadError extends CameraAIError {
  constructor(message: string, code = 'MODEL_LOAD_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'ModelLoadError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Errors occurring during frame preprocessing, tensor execution, or output decoding.
 */
export class InferenceError extends CameraAIError {
  constructor(message: string, code = 'INFERENCE_ERROR', cause?: unknown) {
    super(message, code, cause);
    this.name = 'InferenceError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
