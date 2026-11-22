import { describe, expect, test } from 'bun:test';
import type { FaceLandmark } from '@masumdev/rn-camera-ai';
import {
  computeFaceLivenessMetrics,
  cosineSimilarity,
  createTFLiteFaceRecognizer,
  decodeBlazeFaceOutputs,
  generateBlazeFaceAnchors,
  l2NormalizeEmbedding,
} from '../src';

function buildSyntheticBlazeFaceOutputs(
  anchorIndex: number,
  logitScore: number,
  boxOffsets: [number, number, number, number] = [0, 0, 48, 56]
): [Float32Array, Float32Array] {
  const regressors = new Float32Array(896 * 16);
  const classificators = new Float32Array(896);
  classificators.fill(-10);

  classificators[anchorIndex] = logitScore;
  const base = anchorIndex * 16;
  regressors[base + 0] = boxOffsets[0];
  regressors[base + 1] = boxOffsets[1];
  regressors[base + 2] = boxOffsets[2];
  regressors[base + 3] = boxOffsets[3];

  // 6 facial keypoints (rightEye, leftEye, noseTip, mouth, rightEar, leftEar)
  const keypointOffsets = [
    -10, -8,
    10, -8,
    0, 2,
    0, 14,
    -20, -4,
    20, -4,
  ];
  for (let k = 0; k < 12; k++) {
    regressors[base + 4 + k] = keypointOffsets[k];
  }

  return [regressors, classificators];
}

describe('packages/rn-camera-ai-tflite > faceRecognizer & blazeFaceParser', () => {
  test('generates 896 standard MediaPipe BlazeFace anchors in [0, 1]', () => {
    const anchors = generateBlazeFaceAnchors();
    expect(anchors.length).toBe(896);
    expect(anchors[0].x).toBeCloseTo(0.5 / 16, 5);
    expect(anchors[0].y).toBeCloseTo(0.5 / 16, 5);
    expect(anchors[895].x).toBeCloseTo(7.5 / 8, 5);
    expect(anchors[895].y).toBeCloseTo(7.5 / 8, 5);
  });

  test('decodes BlazeFace bounding box and 6 facial landmarks and applies NMS', () => {
    const anchors = generateBlazeFaceAnchors();
    const [regressors, classificators] = buildSyntheticBlazeFaceOutputs(200, 4.0);
    // Add overlapping duplicate anchor at 201 with lower logit score to test NMS suppression
    classificators[201] = 2.5;
    for (let j = 0; j < 16; j++) {
      regressors[201 * 16 + j] = regressors[200 * 16 + j];
    }

    const detections = decodeBlazeFaceOutputs([regressors, classificators], anchors, {
      confidenceThreshold: 0.5,
      iouThreshold: 0.3,
    });

    expect(detections.length).toBe(1);
    expect(detections[0].label).toBe('Face');
    expect(detections[0].confidence).toBeGreaterThan(0.95);
    expect(detections[0].landmarks?.length).toBe(6);
    expect(detections[0].landmarks?.[0].type).toBe('rightEye');
    expect(detections[0].landmarks?.[1].type).toBe('leftEye');
    expect(detections[0].landmarks?.[2].type).toBe('noseTip');
    expect(detections[0].landmarks?.[3].type).toBe('mouth');
  });

  test('l2NormalizeEmbedding and cosineSimilarity compute accurate unit-norm vectors', () => {
    const normA = l2NormalizeEmbedding([3, 4, 0]);
    expect(normA[0]).toBeCloseTo(0.6, 5);
    expect(normA[1]).toBeCloseTo(0.8, 5);
    expect(cosineSimilarity(normA, [3, 4, 0])).toBeCloseTo(1.0, 5);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0, 5);
  });

  test('createTFLiteFaceRecognizer detects face, enrolls identity, and recognizes enrolled person', async () => {
    const outputs = buildSyntheticBlazeFaceOutputs(136, 4.5);

    const recognizer = await createTFLiteFaceRecognizer({
      model: 'face_detection_short_range.tflite',
      targetFps: 0,
      confidenceThreshold: 0.5,
      similarityThreshold: 0.7,
      loadModel: async () => ({
        runSync: () => outputs,
      }),
    });

    const sampleRgbFrame = new Uint8Array(128 * 128 * 3);
    for (let i = 0; i < sampleRgbFrame.length; i++) {
      sampleRgbFrame[i] = (i * 17) % 255;
    }

    // 1. Before enrollment, face is detected as 'Face' with 6 landmarks
    const initialDetections = recognizer.processFrame(sampleRgbFrame.buffer);
    expect(initialDetections.length).toBe(1);
    expect(initialDetections[0].label).toBe('Face');
    expect(initialDetections[0].landmarks?.length).toBe(6);
    expect(recognizer.hasRecentFaceEmbedding()).toBe(true);

    // 2. Enroll current face as 'Masum'
    const profile = recognizer.enrollLastDetectedFace('Masum');
    expect(profile).not.toBeNull();
    expect(profile?.name).toBe('Masum');
    expect(recognizer.getEnrolledFaces().length).toBe(1);

    // 3. Subsequent frame with same face matches 'Masum' with ~100% cosine similarity
    const recognizedDetections = recognizer.processFrame(sampleRgbFrame.buffer);
    expect(recognizedDetections.length).toBe(1);
    expect(recognizedDetections[0].label).toBe('Masum');
    expect(recognizedDetections[0].identity?.isRecognized).toBe(true);
    expect(recognizedDetections[0].identity?.name).toBe('Masum');
    expect(recognizedDetections[0].identity?.similarity).toBeGreaterThan(0.95);

    // 4. Remove enrolled face and verify cleanup
    expect(recognizer.removeEnrolledFace(profile!.id)).toBe(true);
    expect(recognizer.getEnrolledFaces().length).toBe(0);
    recognizer.dispose?.();
    expect(recognizer.status).toBe('idle');
  });

  test('computeFaceLivenessMetrics accurately detects eye blink (EAR), mouth open (MAR), 3D head pose, and passive 3D depth relief', () => {
    const mesh468: FaceLandmark[] = Array.from({ length: 468 }, (_, i) => ({
      x: 0.3 + ((i % 20) / 20) * 0.4,
      y: 0.25 + (Math.floor(i / 20) / 24) * 0.5,
      z: 0.0,
    }));

    // Configure open eyes (#33, #160, #158, #133, #153, #144 and #362, #385, #387, #263, #373, #380)
    mesh468[33] = { x: 0.36, y: 0.42, z: 0.02 };
    mesh468[133] = { x: 0.44, y: 0.42, z: 0.02 };
    mesh468[160] = { x: 0.39, y: 0.405, z: 0.02 };
    mesh468[158] = { x: 0.41, y: 0.405, z: 0.02 };
    mesh468[144] = { x: 0.39, y: 0.435, z: 0.02 };
    mesh468[153] = { x: 0.41, y: 0.435, z: 0.02 };

    mesh468[362] = { x: 0.56, y: 0.42, z: 0.02 };
    mesh468[263] = { x: 0.64, y: 0.42, z: 0.02 };
    mesh468[385] = { x: 0.59, y: 0.405, z: 0.02 };
    mesh468[387] = { x: 0.61, y: 0.405, z: 0.02 };
    mesh468[380] = { x: 0.59, y: 0.435, z: 0.02 };
    mesh468[373] = { x: 0.61, y: 0.435, z: 0.02 };

    // Configure closed mouth (#13, #14, #78, #308, #61, #291)
    mesh468[78] = { x: 0.44, y: 0.62, z: 0.01 };
    mesh468[308] = { x: 0.56, y: 0.62, z: 0.01 };
    mesh468[13] = { x: 0.50, y: 0.618, z: 0.01 };
    mesh468[14] = { x: 0.50, y: 0.624, z: 0.01 };
    mesh468[61] = { x: 0.43, y: 0.62, z: 0.01 };
    mesh468[291] = { x: 0.57, y: 0.62, z: 0.01 };

    // Configure 3D head pose & nose protrusion (#1, #4, #10, #152, #234, #454)
    mesh468[1] = { x: 0.50, y: 0.52, z: -0.06 };
    mesh468[4] = { x: 0.50, y: 0.50, z: -0.06 };
    mesh468[10] = { x: 0.50, y: 0.30, z: 0.03 };
    mesh468[152] = { x: 0.50, y: 0.74, z: 0.03 };
    mesh468[234] = { x: 0.30, y: 0.52, z: 0.06 };
    mesh468[454] = { x: 0.70, y: 0.52, z: 0.06 };

    const faceBox = { x: 0.28, y: 0.25, width: 0.44, height: 0.52 };
    const openMetrics = computeFaceLivenessMetrics(
      null,
      192,
      192,
      faceBox,
      mesh468,
      0.62
    );

    expect(openMetrics.isLive).toBe(true);
    expect(openMetrics.isBlinking).toBe(false);
    expect(openMetrics.eyeAspectRatio).toBeGreaterThan(0.25);
    expect(openMetrics.isMouthOpen).toBe(false);
    expect(openMetrics.headDirection).toBe('center');
    expect(openMetrics.depthReliefScore).toBeGreaterThan(0.75);

    // Simulate eye blink (collapse upper & lower eyelids) and mouth open
    mesh468[160] = { x: 0.39, y: 0.419, z: 0.02 };
    mesh468[158] = { x: 0.41, y: 0.419, z: 0.02 };
    mesh468[144] = { x: 0.39, y: 0.422, z: 0.02 };
    mesh468[153] = { x: 0.41, y: 0.422, z: 0.02 };
    mesh468[385] = { x: 0.59, y: 0.419, z: 0.02 };
    mesh468[387] = { x: 0.61, y: 0.419, z: 0.02 };
    mesh468[380] = { x: 0.59, y: 0.422, z: 0.02 };
    mesh468[373] = { x: 0.61, y: 0.422, z: 0.02 };
    mesh468[13] = { x: 0.50, y: 0.59, z: 0.01 };
    mesh468[14] = { x: 0.50, y: 0.66, z: 0.01 };
    mesh468[1] = { x: 0.61, y: 0.52, z: -0.06 }; // Turn head right

    const activeMetrics = computeFaceLivenessMetrics(
      null,
      192,
      192,
      faceBox,
      mesh468,
      0.62
    );

    expect(activeMetrics.isBlinking).toBe(true);
    expect(activeMetrics.eyeAspectRatio).toBeLessThan(0.15);
    expect(activeMetrics.isMouthOpen).toBe(true);
    expect(activeMetrics.mouthAspectRatio).toBeGreaterThan(0.4);
    expect(activeMetrics.headDirection).toBe('left');
  });
});
