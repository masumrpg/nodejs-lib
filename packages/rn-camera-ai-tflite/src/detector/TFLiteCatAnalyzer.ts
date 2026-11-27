import {
  type BoundingBox,
  type CatBreedCandidate,
  type CatCoatSwatch,
  type CatDetectionMetadata,
  type CatFACSMetrics,
  type CatSegmentationSummary,
  type DetectionResult,
  type FaceLandmark,
  type ModelStatus,
  type WorkletBoolSync,
  InferenceError,
} from '@masumdev/rn-camera-ai';
import {
  cosineSimilarity,
  cropAndResizeFaceToFloat32Buffer,
  cropAndResizeFaceToNormalized01Float32Buffer,
  expandFaceRoiBox,
} from '../parser/blazeFaceParser';
import {
  analyzeCatCoatAndColors,
  computeCatFACSMetrics,
  cropRgbToUint8Buffer,
  decodeBreedProbabilities,
  decodeCatFaceLandmarks,
  decodeDeepLabCatMask,
  deletterboxNormalizedBox,
  extractCatIdentityDescriptor,
  fuseBreedPredictions,
  letterboxRgbToFloat01Buffer,
} from '../parser/catParser';
import { parseDetectionOutputs } from '../parser/outputParser';
import type {
  CatAnalysisMode,
  CatBreedEngine,
  EnrolledCatProfile,
  TFLiteCatAnalyzer,
  TFLiteCatAnalyzerConfig,
} from '../types/cat';
import type { TFLiteOutputs, TensorflowModel } from '../types/tflite';
import { loadModelWithFallback } from './modelLoader';
import {
  type FrameConverterLike,
  type ResizerModuleLike,
  type WorkletSyncRef,
  createWorkletSyncRef,
  extractRgbUint8Frame,
  getOptionalFrameConverter,
  getOptionalResizePlugin,
} from './workletFrameHelper';

const FULL_FRAME_BOX: BoundingBox = { x: 0, y: 0, width: 1, height: 1 };
const CLOSEUP_ROI_BOX: BoundingBox = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };

interface CachedCatTelemetry {
  topBreeds: CatBreedCandidate[];
  emaMap: Record<string, number>;
  faceBoundingBox?: BoundingBox;
  landmarks48?: FaceLandmark[];
  moodMetrics?: CatFACSMetrics;
  segmentation?: CatSegmentationSummary;
  coatSwatches?: CatCoatSwatch[];
  coatPattern?: string;
  shotOptimalityScore?: number;
}

interface CatWorkletParams {
  disposedSync: WorkletSyncRef<boolean>;
  readySync: WorkletSyncRef<boolean>;
  detectorModelSync: WorkletSyncRef<TensorflowModel | null>;
  breed67ModelSync: WorkletSyncRef<TensorflowModel | null>;
  breed12ModelSync: WorkletSyncRef<TensorflowModel | null>;
  catFaceLocalizerSync: WorkletSyncRef<TensorflowModel | null>;
  catFaceLandmarksSync: WorkletSyncRef<TensorflowModel | null>;
  segmentationModelSync: WorkletSyncRef<TensorflowModel | null>;
  modeSync: WorkletSyncRef<CatAnalysisMode>;
  breedEngineSync: WorkletSyncRef<CatBreedEngine>;
  confidenceSync: WorkletSyncRef<number>;
  similaritySync: WorkletSyncRef<number>;
  closeUpFallbackSync: WorkletSyncRef<boolean>;
  lastFrameTimeSync: WorkletSyncRef<number>;
  tickCounterSync: WorkletSyncRef<number>;
  missCounterSync: WorkletSyncRef<number>;
  wasThrottledSync: WorkletBoolSync;
  enrolledCatsSync: WorkletSyncRef<EnrolledCatProfile[]>;
  lastEmbeddingSync: WorkletSyncRef<number[] | null>;
  lastBreedHintSync: WorkletSyncRef<string | undefined>;
  cacheSync: WorkletSyncRef<CachedCatTelemetry>;
  minFrameIntervalMs: number;
  detectorInputWidth: number;
  detectorInputHeight: number;
  detectorLabels: string[] | Record<number, string> | undefined;
  detectorLabelOffset: number;
  breed67Labels: readonly string[];
  breed12Labels: readonly string[];
  segmentationCatClassIndex: number;
  frameConverter: FrameConverterLike | null;
  resizePlugin: ResizerModuleLike | null;
}

function buildSceneContextTags(allDetections: DetectionResult[]): string[] {
  'worklet';
  const tags: string[] = [];
  const seen: Record<string, boolean> = {};
  for (let i = 0; i < allDetections.length; i++) {
    const lbl = allDetections[i].label.toLowerCase();
    let tag: string | null = null;
    if (lbl === 'bowl' || lbl === 'cup') tag = 'Bowl Nearby (Feeding)';
    else if (lbl === 'bed' || lbl === 'couch') tag = 'Resting Spot';
    else if (lbl === 'person') tag = 'With Owner';
    else if (lbl === 'bird' || lbl === 'mouse') tag = 'Prey Focus Alert';
    else if (lbl === 'dog') tag = 'Dog Companion';
    else if (lbl === 'potted plant') tag = 'Indoor Plant';

    if (tag && !seen[tag]) {
      seen[tag] = true;
      tags.push(tag);
    }
  }
  return tags;
}

function createCatWorkletProcessor(
  params: CatWorkletParams
): (frame: unknown) => DetectionResult[] {
  const {
    disposedSync,
    readySync,
    detectorModelSync,
    breed67ModelSync,
    breed12ModelSync,
    catFaceLocalizerSync,
    catFaceLandmarksSync,
    segmentationModelSync,
    modeSync,
    breedEngineSync,
    confidenceSync,
    similaritySync,
    closeUpFallbackSync,
    lastFrameTimeSync,
    tickCounterSync,
    missCounterSync,
    wasThrottledSync,
    enrolledCatsSync,
    lastEmbeddingSync,
    lastBreedHintSync,
    cacheSync,
    minFrameIntervalMs,
    detectorInputWidth,
    detectorInputHeight,
    detectorLabels,
    detectorLabelOffset,
    breed67Labels,
    breed12Labels,
    segmentationCatClassIndex,
    frameConverter,
    resizePlugin,
  } = params;

  return (frame: unknown): DetectionResult[] => {
    'worklet';
    if (disposedSync.getBlocking()) {
      throw new Error('Cannot process frame: cat analyzer is disposed');
    }

    const detectorModel = detectorModelSync.getBlocking();
    if (!readySync.getBlocking() || !detectorModel) {
      wasThrottledSync.setBlocking(false);
      return [];
    }

    if (minFrameIntervalMs > 0) {
      const now = Date.now();
      const prev = lastFrameTimeSync.getBlocking();
      if (prev > 0 && now - prev < minFrameIntervalMs) {
        wasThrottledSync.setBlocking(true);
        return [];
      }
      lastFrameTimeSync.setBlocking(now);
    }
    wasThrottledSync.setBlocking(false);

    const extracted = extractRgbUint8Frame(frame, 384, frameConverter, resizePlugin);
    if (!extracted) {
      return [];
    }

    const { buffer: rgbBuf, width: frameW, height: frameH, needs180Correction } = extracted;

    // Stage 1: COCO SSD Object Detection (finds cats + companion props)
    const ssdInput =
      frameW === detectorInputWidth && frameH === detectorInputHeight
        ? rgbBuf
        : cropRgbToUint8Buffer(
            rgbBuf,
            frameW,
            frameH,
            FULL_FRAME_BOX,
            detectorInputWidth,
            detectorInputHeight
          );
    const ssdOutputs = detectorModel.runSync([ssdInput]);
    const ssdDetections =
      Array.isArray(ssdOutputs) && ssdOutputs.length >= 3
        ? parseDetectionOutputs(ssdOutputs as TFLiteOutputs, {
            confidenceThreshold: Math.min(0.35, confidenceSync.getBlocking()),
            maxResults: 12,
            labels: detectorLabels,
            labelOffset: detectorLabelOffset,
          })
        : [];

    const confThreshold = confidenceSync.getBlocking();
    const catDetections: DetectionResult[] = [];
    for (let i = 0; i < ssdDetections.length; i++) {
      const d = ssdDetections[i];
      if (d.label.toLowerCase() === 'cat' && d.confidence >= confThreshold) {
        catDetections.push(d);
      }
    }

    const sceneContextTags = buildSceneContextTags(ssdDetections);
    const mode = modeSync.getBlocking();
    const breedEngine = breedEngineSync.getBlocking();
    const breed67Model = breed67ModelSync.getBlocking();
    const breed12Model = breed12ModelSync.getBlocking();
    const localizerModel = catFaceLocalizerSync.getBlocking();
    const landmarksModel = catFaceLandmarksSync.getBlocking();
    const segModel = segmentationModelSync.getBlocking();

    const cache = cacheSync.getBlocking();
    let activeTargetBox: BoundingBox | null =
      catDetections.length > 0 ? catDetections[0].boundingBox : null;
    let isSyntheticCloseUp = false;

    // Optional close-up fallback gated by DeepLab or strong breed classifier confidence
    if (!activeTargetBox && closeUpFallbackSync.getBlocking()) {
      let gatePassed = false;
      let segGateSummary: CatSegmentationSummary | undefined = undefined;

      if (segModel) {
        try {
          const segInput = cropAndResizeFaceToFloat32Buffer(
            rgbBuf,
            frameW,
            frameH,
            FULL_FRAME_BOX,
            257,
            257
          );
          const segOut = segModel.runSync([segInput]);
          const summary = decodeDeepLabCatMask(segOut, segmentationCatClassIndex, 24, 257, 21);
          if (summary && summary.coverageRatio >= 0.06) {
            segGateSummary = summary;
            gatePassed = true;
          }
        } catch {
          // Ignore segmentation error during close-up check
        }
      }

      if (!gatePassed && breed12Model) {
        try {
          const b12Input = cropRgbToUint8Buffer(rgbBuf, frameW, frameH, CLOSEUP_ROI_BOX, 224, 224);
          const b12Out = breed12Model.runSync([b12Input]);
          const top12 = decodeBreedProbabilities(b12Out, breed12Labels, 'oxford12', true, 1);
          if (top12.length > 0 && top12[0].confidence >= 0.52) {
            gatePassed = true;
          }
        } catch {
          // Ignore error during gate check
        }
      }

      if (gatePassed) {
        isSyntheticCloseUp = true;
        activeTargetBox = segGateSummary?.tightBounds ?? CLOSEUP_ROI_BOX;
        if (segGateSummary) {
          cache.segmentation = segGateSummary;
        }
        catDetections.push({
          id: 'cat-closeup-0',
          label: 'cat (Close-Up)',
          confidence: 0.85,
          boundingBox: activeTargetBox,
        });
      }
    }

    if (catDetections.length === 0 || !activeTargetBox) {
      const misses = missCounterSync.getBlocking() + 1;
      missCounterSync.setBlocking(misses);
      if (misses > 4) {
        cache.topBreeds = [];
        cache.emaMap = {};
        cache.faceBoundingBox = undefined;
        cache.landmarks48 = undefined;
        cache.moodMetrics = undefined;
        cache.segmentation = undefined;
        cache.coatSwatches = undefined;
        cache.coatPattern = undefined;
        cache.shotOptimalityScore = undefined;
      }
      return [];
    }

    missCounterSync.setBlocking(0);
    const tick = tickCounterSync.getBlocking();
    tickCounterSync.setBlocking(tick + 1);

    const runBreed = mode === 'breed' || (mode === 'all' && tick % 3 === 0);
    const runFaceMood =
      mode === 'face_mood' ||
      mode === 'identity' ||
      (mode === 'all' && tick % 3 === 1);
    const runSegmentation =
      mode === 'segmentation' ||
      mode === 'identity' ||
      (mode === 'all' && tick % 3 === 2);

    // Stage 2A: Cat Breed Classification (67-Class, 12-Class AutoML Edge, or Ensemble)
    if (runBreed && (breed67Model || breed12Model)) {
      let list67: CatBreedCandidate[] = [];
      let list12: CatBreedCandidate[] = [];

      if (breed67Model && (breedEngine === '67' || breedEngine === 'ensemble') && breed67Labels.length > 0) {
        try {
          const inp67 = cropAndResizeFaceToNormalized01Float32Buffer(
            rgbBuf,
            frameW,
            frameH,
            activeTargetBox,
            224,
            224
          );
          const out67 = breed67Model.runSync([inp67]);
          list67 = decodeBreedProbabilities(out67, breed67Labels, 'breed67', false, 5);
        } catch {
          list67 = [];
        }
      }

      if (breed12Model && (breedEngine === '12' || breedEngine === 'ensemble') && breed12Labels.length > 0) {
        try {
          const inp12 = cropRgbToUint8Buffer(rgbBuf, frameW, frameH, activeTargetBox, 224, 224);
          const out12 = breed12Model.runSync([inp12]);
          list12 = decodeBreedProbabilities(out12, breed12Labels, 'oxford12', true, 5);
        } catch {
          list12 = [];
        }
      }

      if (breedEngine === '67' && list67.length > 0) {
        cache.topBreeds = fuseBreedPredictions(list67, [], cache.emaMap, 0.42, 3);
      } else if (breedEngine === '12' && list12.length > 0) {
        cache.topBreeds = fuseBreedPredictions([], list12, cache.emaMap, 0.42, 3);
      } else if (list67.length > 0 || list12.length > 0) {
        cache.topBreeds = fuseBreedPredictions(list67, list12, cache.emaMap, 0.38, 3);
      }
    }

    // Stage 2B: Cat Face Localizer + 48 CatFLW Landmarks + CatFACS Mood
    if (runFaceMood && localizerModel) {
      try {
        const searchRoi = expandFaceRoiBox(activeTargetBox, 1.08);
        const { buffer: lbBuf, meta: lbMeta } = letterboxRgbToFloat01Buffer(
          rgbBuf,
          frameW,
          frameH,
          224,
          searchRoi
        );
        const locOut = localizerModel.runSync([lbBuf]);
        const faceBox = deletterboxNormalizedBox(locOut, lbMeta);
        if (faceBox) {
          cache.faceBoundingBox = faceBox;
          if (landmarksModel) {
            const cropBox = expandFaceRoiBox(faceBox, 1.2);
            const lmInput = cropAndResizeFaceToNormalized01Float32Buffer(
              rgbBuf,
              frameW,
              frameH,
              cropBox,
              384,
              384
            );
            const lmOut = landmarksModel.runSync([lmInput]);
            const pts48 = decodeCatFaceLandmarks(lmOut, cropBox);
            if (pts48 && pts48.length === 48) {
              cache.landmarks48 = pts48;
              cache.moodMetrics = computeCatFACSMetrics(pts48);
            }
          }
        }
      } catch {
        // Keep prior cached landmarks/mood gracefully on transient failure
      }
    }

    // Stage 2C: DeepLabV3 Cat Segmentation & Masked Coat Color/Pattern Analysis
    if (runSegmentation || !cache.coatSwatches) {
      if (segModel && runSegmentation && !isSyntheticCloseUp) {
        try {
          const segInp = cropAndResizeFaceToFloat32Buffer(
            rgbBuf,
            frameW,
            frameH,
            FULL_FRAME_BOX,
            257,
            257
          );
          const segOut = segModel.runSync([segInp]);
          const decodedMask = decodeDeepLabCatMask(
            segOut,
            segmentationCatClassIndex,
            24,
            257,
            21
          );
          if (decodedMask) {
            cache.segmentation = decodedMask;
          }
        } catch {
          // Retain cached mask if seg inference fails
        }
      }

      const coatAnalysis = analyzeCatCoatAndColors(
        rgbBuf,
        frameW,
        frameH,
        activeTargetBox,
        cache.segmentation
      );
      cache.coatSwatches = coatAnalysis.swatches;
      cache.coatPattern = coatAnalysis.coatPattern;
      cache.shotOptimalityScore = coatAnalysis.shotOptimalityScore;
    }

    // Stage 2D: 96-D Personal Cat Re-Identification Descriptor & Enrolled Match
    const descriptorRoi = cache.faceBoundingBox ?? activeTargetBox;
    const descriptor = extractCatIdentityDescriptor(
      rgbBuf,
      frameW,
      frameH,
      descriptorRoi,
      cache.landmarks48
    );
    if (descriptor.length > 0) {
      lastEmbeddingSync.setBlocking(descriptor);
      lastBreedHintSync.setBlocking(cache.topBreeds[0]?.breed);
    }

    const enrolledCats = enrolledCatsSync.getBlocking();
    const simThreshold = similaritySync.getBlocking();
    let matchedIdentity: DetectionResult['identity'] = undefined;

    if (enrolledCats.length > 0 && descriptor.length > 0) {
      let bestCat: EnrolledCatProfile | null = null;
      let bestSim = -1;
      for (let i = 0; i < enrolledCats.length; i++) {
        const sim = cosineSimilarity(descriptor, enrolledCats[i].embedding);
        if (sim > bestSim) {
          bestSim = sim;
          bestCat = enrolledCats[i];
        }
      }
      if (bestCat && bestSim >= simThreshold) {
        matchedIdentity = {
          id: bestCat.id,
          name: bestCat.name,
          similarity: bestSim,
          isRecognized: true,
        };
      } else {
        matchedIdentity = {
          id: 'unknown-cat',
          name: 'Unknown Cat',
          similarity: Math.max(0, bestSim),
          isRecognized: false,
        };
      }
    }

    const primaryMeta: CatDetectionMetadata = {
      isCat: true,
      faceBoundingBox: cache.faceBoundingBox,
      topBreeds: cache.topBreeds.slice(),
      moodMetrics: cache.moodMetrics,
      coatSwatches: cache.coatSwatches,
      coatPattern: cache.coatPattern,
      sceneContextTags,
      segmentation: cache.segmentation,
      shotOptimalityScore: cache.shotOptimalityScore,
    };

    const topBreedName = cache.topBreeds[0]?.breed;
    const primaryLabel = matchedIdentity?.isRecognized
      ? `${matchedIdentity.name}${topBreedName ? ` (${topBreedName})` : ''}`
      : topBreedName ?? catDetections[0].label;

    catDetections[0] = {
      ...catDetections[0],
      label: primaryLabel,
      confidence: cache.topBreeds[0]?.confidence ?? catDetections[0].confidence,
      landmarks: cache.landmarks48,
      identity: matchedIdentity,
      cat: primaryMeta,
    };

    if (needs180Correction) {
      for (let i = 0; i < catDetections.length; i++) {
        const b = catDetections[i].boundingBox;
        const fixedLandmarks = catDetections[i].landmarks?.map((lm) => ({
          ...lm,
          x: Math.max(0, Math.min(1, 1 - lm.x)),
          y: Math.max(0, Math.min(1, 1 - lm.y)),
        }));
        const fixedFaceBox = catDetections[i].cat?.faceBoundingBox
          ? {
              x: Math.max(
                0,
                Math.min(
                  1,
                  1 -
                    catDetections[i].cat!.faceBoundingBox!.x -
                    catDetections[i].cat!.faceBoundingBox!.width
                )
              ),
              y: Math.max(
                0,
                Math.min(
                  1,
                  1 -
                    catDetections[i].cat!.faceBoundingBox!.y -
                    catDetections[i].cat!.faceBoundingBox!.height
                )
              ),
              width: catDetections[i].cat!.faceBoundingBox!.width,
              height: catDetections[i].cat!.faceBoundingBox!.height,
            }
          : undefined;
        catDetections[i] = {
          ...catDetections[i],
          boundingBox: {
            x: Math.max(0, Math.min(1, 1 - b.x - b.width)),
            y: Math.max(0, Math.min(1, 1 - b.y - b.height)),
            width: b.width,
            height: b.height,
          },
          landmarks: fixedLandmarks,
          cat: catDetections[i].cat
            ? { ...catDetections[i].cat!, faceBoundingBox: fixedFaceBox }
            : undefined,
        };
      }
    }

    cacheSync.setBlocking(cache);
    return catDetections;
  };
}

class TFLiteCatAnalyzerImpl implements TFLiteCatAnalyzer {
  public readonly id: string;
  public readonly name = 'TFLiteCatAnalyzer';
  public readonly processFrameWorklet: (frame: unknown) => DetectionResult[];
  public readonly wasThrottledSync: WorkletBoolSync;
  public readonly loadedModels: TFLiteCatAnalyzer['loadedModels'];

  private _status: ModelStatus;
  private _activeDelegate: 'gpu' | 'cpu';
  private _analysisMode: CatAnalysisMode;
  private _breedEngine: CatBreedEngine;
  private _confidenceThreshold: number;
  private _similarityThreshold: number;
  private _closeUpFallback: boolean;
  private _config: TFLiteCatAnalyzerConfig;

  private _disposedSync: WorkletSyncRef<boolean>;
  private _readySync: WorkletSyncRef<boolean>;
  private _detectorModelSync: WorkletSyncRef<TensorflowModel | null>;
  private _breed67ModelSync: WorkletSyncRef<TensorflowModel | null>;
  private _breed12ModelSync: WorkletSyncRef<TensorflowModel | null>;
  private _catFaceLocalizerSync: WorkletSyncRef<TensorflowModel | null>;
  private _catFaceLandmarksSync: WorkletSyncRef<TensorflowModel | null>;
  private _segmentationModelSync: WorkletSyncRef<TensorflowModel | null>;

  private _modeSync: WorkletSyncRef<CatAnalysisMode>;
  private _breedEngineSync: WorkletSyncRef<CatBreedEngine>;
  private _confidenceSync: WorkletSyncRef<number>;
  private _similaritySync: WorkletSyncRef<number>;
  private _closeUpFallbackSync: WorkletSyncRef<boolean>;
  private _lastFrameTimeSync: WorkletSyncRef<number>;
  private _tickCounterSync: WorkletSyncRef<number>;
  private _missCounterSync: WorkletSyncRef<number>;
  private _enrolledCatsSync: WorkletSyncRef<EnrolledCatProfile[]>;
  private _lastEmbeddingSync: WorkletSyncRef<number[] | null>;
  private _lastBreedHintSync: WorkletSyncRef<string | undefined>;
  private _cacheSync: WorkletSyncRef<CachedCatTelemetry>;

  constructor(
    config: TFLiteCatAnalyzerConfig,
    models: {
      detector: TensorflowModel;
      activeDelegate: 'gpu' | 'cpu';
      breed67: TensorflowModel | null;
      breed12: TensorflowModel | null;
      catFaceLocalizer: TensorflowModel | null;
      catFaceLandmarks: TensorflowModel | null;
      segmentation: TensorflowModel | null;
    }
  ) {
    this.id = `tflite-cat-analyzer-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    this._config = config;
    this._activeDelegate = models.activeDelegate;
    this._status = 'ready';

    this.loadedModels = {
      detector: true,
      breed67: Boolean(models.breed67),
      breed12: Boolean(models.breed12),
      catFaceLocalizer: Boolean(models.catFaceLocalizer),
      catFaceLandmarks: Boolean(models.catFaceLandmarks),
      segmentation: Boolean(models.segmentation),
    };

    this._analysisMode = config.initialMode ?? 'all';
    this._breedEngine = config.initialBreedEngine ?? 'ensemble';
    this._confidenceThreshold =
      typeof config.confidenceThreshold === 'number' && Number.isFinite(config.confidenceThreshold)
        ? Math.max(0.1, Math.min(0.95, config.confidenceThreshold))
        : 0.42;
    this._similarityThreshold =
      typeof config.similarityThreshold === 'number' && Number.isFinite(config.similarityThreshold)
        ? Math.max(0.2, Math.min(0.99, config.similarityThreshold))
        : 0.72;
    this._closeUpFallback = config.closeUpFallback !== false;

    const fps = config.targetFps ?? 15;
    const minFrameIntervalMs = fps > 0 ? 1000 / fps : 0;

    this._disposedSync = createWorkletSyncRef(false, true);
    this._readySync = createWorkletSyncRef(true, true);
    this._detectorModelSync = createWorkletSyncRef<TensorflowModel | null>(models.detector, false);
    this._breed67ModelSync = createWorkletSyncRef<TensorflowModel | null>(models.breed67, false);
    this._breed12ModelSync = createWorkletSyncRef<TensorflowModel | null>(models.breed12, false);
    this._catFaceLocalizerSync = createWorkletSyncRef<TensorflowModel | null>(
      models.catFaceLocalizer,
      false
    );
    this._catFaceLandmarksSync = createWorkletSyncRef<TensorflowModel | null>(
      models.catFaceLandmarks,
      false
    );
    this._segmentationModelSync = createWorkletSyncRef<TensorflowModel | null>(
      models.segmentation,
      false
    );

    this._modeSync = createWorkletSyncRef<CatAnalysisMode>(this._analysisMode, false);
    this._breedEngineSync = createWorkletSyncRef<CatBreedEngine>(this._breedEngine, false);
    this._confidenceSync = createWorkletSyncRef(this._confidenceThreshold, true);
    this._similaritySync = createWorkletSyncRef(this._similarityThreshold, true);
    this._closeUpFallbackSync = createWorkletSyncRef(this._closeUpFallback, true);
    this._lastFrameTimeSync = createWorkletSyncRef(0, true);
    this._tickCounterSync = createWorkletSyncRef(0, true);
    this._missCounterSync = createWorkletSyncRef(0, true);
    this.wasThrottledSync = createWorkletSyncRef(false, true);
    this._enrolledCatsSync = createWorkletSyncRef<EnrolledCatProfile[]>(
      Array.isArray(config.initialCats) ? config.initialCats.slice() : [],
      false
    );
    this._lastEmbeddingSync = createWorkletSyncRef<number[] | null>(null, false);
    this._lastBreedHintSync = createWorkletSyncRef<string | undefined>(undefined, false);
    this._cacheSync = createWorkletSyncRef<CachedCatTelemetry>(
      { topBreeds: [], emaMap: {} },
      false
    );

    this.processFrameWorklet = createCatWorkletProcessor({
      disposedSync: this._disposedSync,
      readySync: this._readySync,
      detectorModelSync: this._detectorModelSync,
      breed67ModelSync: this._breed67ModelSync,
      breed12ModelSync: this._breed12ModelSync,
      catFaceLocalizerSync: this._catFaceLocalizerSync,
      catFaceLandmarksSync: this._catFaceLandmarksSync,
      segmentationModelSync: this._segmentationModelSync,
      modeSync: this._modeSync,
      breedEngineSync: this._breedEngineSync,
      confidenceSync: this._confidenceSync,
      similaritySync: this._similaritySync,
      closeUpFallbackSync: this._closeUpFallbackSync,
      lastFrameTimeSync: this._lastFrameTimeSync,
      tickCounterSync: this._tickCounterSync,
      missCounterSync: this._missCounterSync,
      wasThrottledSync: this.wasThrottledSync,
      enrolledCatsSync: this._enrolledCatsSync,
      lastEmbeddingSync: this._lastEmbeddingSync,
      lastBreedHintSync: this._lastBreedHintSync,
      cacheSync: this._cacheSync,
      minFrameIntervalMs,
      detectorInputWidth: config.detectorInputWidth ?? 300,
      detectorInputHeight: config.detectorInputHeight ?? 300,
      detectorLabels: config.detectorLabels,
      detectorLabelOffset: config.detectorLabelOffset ?? 1,
      breed67Labels: config.breed67Labels ?? [],
      breed12Labels: config.breed12Labels ?? [],
      segmentationCatClassIndex: config.segmentationCatClassIndex ?? 8,
      frameConverter: getOptionalFrameConverter(),
      resizePlugin: getOptionalResizePlugin(),
    });
  }

  get status(): ModelStatus {
    return this._status;
  }

  get activeDelegate(): 'gpu' | 'cpu' {
    return this._activeDelegate;
  }

  get analysisMode(): CatAnalysisMode {
    return this._analysisMode;
  }

  get breedEngine(): CatBreedEngine {
    return this._breedEngine;
  }

  get confidenceThreshold(): number {
    return this._confidenceThreshold;
  }

  get similarityThreshold(): number {
    return this._similarityThreshold;
  }

  get closeUpFallback(): boolean {
    return this._closeUpFallback;
  }

  get targetFps(): number | undefined {
    return this._config.targetFps ?? 15;
  }

  setAnalysisMode(mode: CatAnalysisMode): void {
    this._analysisMode = mode;
    this._modeSync.setBlocking(mode);
  }

  setBreedEngine(engine: CatBreedEngine): void {
    this._breedEngine = engine;
    this._breedEngineSync.setBlocking(engine);
  }

  setConfidenceThreshold(threshold: number): void {
    if (Number.isFinite(threshold)) {
      this._confidenceThreshold = Math.max(0.1, Math.min(0.95, threshold));
      this._confidenceSync.setBlocking(this._confidenceThreshold);
    }
  }

  setSimilarityThreshold(threshold: number): void {
    if (Number.isFinite(threshold)) {
      this._similarityThreshold = Math.max(0.2, Math.min(0.99, threshold));
      this._similaritySync.setBlocking(this._similarityThreshold);
    }
  }

  setCloseUpFallback(enabled: boolean): void {
    this._closeUpFallback = Boolean(enabled);
    this._closeUpFallbackSync.setBlocking(this._closeUpFallback);
  }

  enrollLastDetectedCat(name: string, breedHint?: string): EnrolledCatProfile | null {
    const lastEmb = this._lastEmbeddingSync.getBlocking();
    if (!lastEmb || lastEmb.length === 0) {
      return null;
    }
    const hint = breedHint ?? this._lastBreedHintSync.getBlocking();
    return this.enrollCat(name, lastEmb, hint);
  }

  enrollCat(
    name: string,
    embedding: Float32Array | number[],
    breedHint?: string
  ): EnrolledCatProfile {
    const cleanName = name.trim() || `Cat ${this._enrolledCatsSync.getBlocking().length + 1}`;
    const arr = Array.from(embedding);
    const profile: EnrolledCatProfile = {
      id: `cat-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: cleanName,
      breedHint,
      embedding: arr,
      createdAt: Date.now(),
    };
    const nextList = [...this._enrolledCatsSync.getBlocking(), profile];
    this._enrolledCatsSync.setBlocking(nextList);
    return profile;
  }

  removeEnrolledCat(id: string): boolean {
    const prev = this._enrolledCatsSync.getBlocking();
    const next = prev.filter((c) => c.id !== id);
    if (next.length === prev.length) return false;
    this._enrolledCatsSync.setBlocking(next);
    return true;
  }

  clearEnrolledCats(): void {
    this._enrolledCatsSync.setBlocking([]);
  }

  getEnrolledCats(): EnrolledCatProfile[] {
    return this._enrolledCatsSync.getBlocking().slice();
  }

  hasRecentCatEmbedding(): boolean {
    const emb = this._lastEmbeddingSync.getBlocking();
    return Boolean(emb && emb.length > 0);
  }

  processFrame(frame: unknown): DetectionResult[] {
    try {
      return this.processFrameWorklet(frame);
    } catch (err: unknown) {
      throw new InferenceError(
        err instanceof Error ? err.message : 'TFLite cat analyzer inference failed',
        'INFERENCE_ERROR',
        err
      );
    }
  }

  async initialize(): Promise<void> {
    if (this._disposedSync.getBlocking()) {
      const loaded = await loadCatModels(this._config);
      this._detectorModelSync.setBlocking(loaded.detector);
      this._breed67ModelSync.setBlocking(loaded.breed67);
      this._breed12ModelSync.setBlocking(loaded.breed12);
      this._catFaceLocalizerSync.setBlocking(loaded.catFaceLocalizer);
      this._catFaceLandmarksSync.setBlocking(loaded.catFaceLandmarks);
      this._segmentationModelSync.setBlocking(loaded.segmentation);
      this._activeDelegate = loaded.activeDelegate;
      this._disposedSync.setBlocking(false);
    }
    this._status = 'ready';
    this._readySync.setBlocking(true);
    this._lastFrameTimeSync.setBlocking(0);
    this.wasThrottledSync.setBlocking(false);
  }

  dispose(): void {
    this._disposedSync.setBlocking(true);
    this._readySync.setBlocking(false);
    this._status = 'idle';
    this._lastFrameTimeSync.setBlocking(0);
    this.wasThrottledSync.setBlocking(false);
  }
}

async function loadOptionalModel(
  source: TFLiteCatAnalyzerConfig['breed67Model'],
  opts: Parameters<typeof loadModelWithFallback>[1]
): Promise<TensorflowModel | null> {
  if (source === undefined || source === null) {
    return null;
  }
  try {
    const res = await loadModelWithFallback(source, opts);
    return res.model;
  } catch {
    return null;
  }
}

async function loadCatModels(config: TFLiteCatAnalyzerConfig) {
  const loaderOpts = {
    useGpu: config.useGpu,
    platform: config.platform,
    onDelegateFallback: config.onDelegateFallback,
    loadModel: config.loadModel,
  };

  const detectorLoaded = await loadModelWithFallback(config.detectorModel, loaderOpts);

  const [breed67, breed12, catFaceLocalizer, catFaceLandmarks, segmentation] =
    await Promise.all([
      loadOptionalModel(config.breed67Model, loaderOpts),
      loadOptionalModel(config.breed12Model, loaderOpts),
      loadOptionalModel(config.catFaceLocalizerModel, loaderOpts),
      loadOptionalModel(config.catFaceLandmarksModel, loaderOpts),
      loadOptionalModel(config.segmentationModel, loaderOpts),
    ]);

  return {
    detector: detectorLoaded.model,
    activeDelegate: detectorLoaded.activeDelegate,
    breed67,
    breed12,
    catFaceLocalizer,
    catFaceLandmarks,
    segmentation,
  };
}

/**
 * Creates and initializes a Multi-Model On-Device Feline Vision CameraProcessor.
 */
export async function createTFLiteCatAnalyzer(
  config: TFLiteCatAnalyzerConfig
): Promise<TFLiteCatAnalyzer> {
  const models = await loadCatModels(config);
  return new TFLiteCatAnalyzerImpl(config, models);
}
