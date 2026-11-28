import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Cat,
  CheckCircle2,
  Layers,
  Palette,
  Pause,
  Play,
  RefreshCw,
  ScanFace,
  Share2,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react-native';
import {
  CameraAI,
  type BoundingBoxVariant,
  type CameraAIError,
  type CameraAIRef,
  type CameraFacing,
  type CatMoodState,
  type DetectionResult,
  type ViewDimensions,
} from '@masumdev/rn-camera-ai';
import {
  createTFLiteCatAnalyzer,
  type CatAnalysisMode,
  type CatBreedEngine,
  type EnrolledCatProfile,
  type TFLiteCatAnalyzer,
} from '@masumdev/rn-camera-ai-tflite';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Input,
  Progress,
  SegmentedControl,
  Switch,
  Text,
  useTheme,
  type ComponentTone,
} from '@masumdev/rn-ui';
import { COCO_91_LABELS, MODEL_LABEL_OFFSET } from '../src/constants/cocoLabels';
import {
  CAT_BREED_12_LABELS,
  CAT_BREED_67_LABELS,
  getCatBreedProfile,
} from '../src/constants/catLabels';

const DETECT_MODEL = require('../assets/models/detect.tflite') as number;
const BREED_67_MODEL = require('../assets/models/cat_breed_67.tflite') as number;
const BREED_12_MODEL = require('../assets/models/cat_breed_oxford12.tflite') as number;
const CAT_FACE_LOCALIZER_MODEL = require('../assets/models/cat_face_localizer.tflite') as number;
const CAT_FACE_LANDMARKS_MODEL = require('../assets/models/cat_face_landmarks_full.tflite') as number;
const DEEPLAB_V3_MODEL = require('../assets/models/deeplab_v3.tflite') as number;

const ANALYSIS_MODES: { value: CatAnalysisMode; label: string }[] = [
  { value: 'all', label: 'All AI' },
  { value: 'breed', label: 'Breed' },
  { value: 'face_mood', label: 'Mood' },
  { value: 'segmentation', label: 'Coat' },
  { value: 'identity', label: 'Cat ID' },
];

const BREED_ENGINES: { value: CatBreedEngine; label: string }[] = [
  { value: 'ensemble', label: 'Ensemble' },
  { value: '67', label: '67 Breeds' },
  { value: '12', label: 'Oxford 12' },
];

const BOX_VARIANTS: { value: BoundingBoxVariant; label: string }[] = [
  { value: 'corners', label: 'Corners' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
];

const CONFIDENCE_OPTIONS = [0.35, 0.45, 0.6];
const SIMILARITY_OPTIONS = [0.62, 0.72, 0.85];

interface CatPassportSnapshot {
  capturedAt: string;
  photoUri: string;
  catName: string;
  primaryBreed: string;
  breedConfidence: number;
  coatPattern: string;
  moodLabel: string;
  shotOptimality: number;
  swatches: { hex: string; name: string; percentage: number }[];
  sceneTags: string[];
  topCandidates: { breed: string; confidence: number }[];
}

function getMoodTone(mood?: CatMoodState): ComponentTone {
  switch (mood) {
    case 'calm_affectionate':
      return 'success';
    case 'annoyed_defensive':
      return 'warning';
    case 'vocalizing':
      return 'info';
    case 'playful_hunting':
      return 'accent';
    case 'alert_curious':
      return 'primary';
    case 'sleepy':
    default:
      return 'default';
  }
}

export default function CatScannerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, radii, isDark, themeName } = useTheme();
  const cameraRef = useRef<CameraAIRef>(null);

  const [analyzer, setAnalyzer] = useState<TFLiteCatAnalyzer | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [delegateBadge, setDelegateBadge] = useState<'GPU' | 'CPU'>('GPU');
  const [loadedModelCount, setLoadedModelCount] = useState<number>(0);

  const [cameraPosition, setCameraPosition] = useState<CameraFacing>('back');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [fps, setFps] = useState<number>(0);
  const frameTimestampsRef = useRef<number[]>([]);

  const [analysisMode, setAnalysisMode] = useState<CatAnalysisMode>('all');
  const [breedEngine, setBreedEngine] = useState<CatBreedEngine>('ensemble');
  const [boxVariant, setBoxVariant] = useState<BoundingBoxVariant>('corners');
  const [showFaceMesh, setShowFaceMesh] = useState<boolean>(true);
  const [showSegMask, setShowSegMask] = useState<boolean>(true);
  const [closeUpFallback, setCloseUpFallback] = useState<boolean>(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.42);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.72);

  const [enrollName, setEnrollName] = useState<string>('');
  const [enrolledCats, setEnrolledCats] = useState<EnrolledCatProfile[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [flashTrigger, setFlashTrigger] = useState<number>(0);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [passport, setPassport] = useState<CatPassportSnapshot | null>(null);

  const isMinimal = themeName === 'minimal';
  const isBrutal = themeName === 'brutal';
  const cardBorderWidth = isMinimal ? 0 : isBrutal ? 2 : 1;

  useEffect(() => {
    let isMounted = true;
    let activeInstance: TFLiteCatAnalyzer | null = null;

    async function loadCatPipeline() {
      try {
        const instance = await createTFLiteCatAnalyzer({
          detectorModel: DETECT_MODEL,
          detectorLabels: COCO_91_LABELS,
          detectorLabelOffset: MODEL_LABEL_OFFSET,
          breed67Model: BREED_67_MODEL,
          breed67Labels: CAT_BREED_67_LABELS,
          breed12Model: BREED_12_MODEL,
          breed12Labels: CAT_BREED_12_LABELS,
          catFaceLocalizerModel: CAT_FACE_LOCALIZER_MODEL,
          catFaceLandmarksModel: CAT_FACE_LANDMARKS_MODEL,
          segmentationModel: DEEPLAB_V3_MODEL,
          segmentationCatClassIndex: 8,
          initialMode: 'all',
          initialBreedEngine: 'ensemble',
          confidenceThreshold: 0.42,
          similarityThreshold: 0.72,
          closeUpFallback: true,
          targetFps: 15,
          useGpu: true,
          platform: Platform.OS,
          onDelegateFallback: (_requested, fallback) => {
            if (isMounted) {
              setDelegateBadge(fallback === 'gpu' ? 'GPU' : 'CPU');
            }
          },
        });

        if (!isMounted) {
          instance.dispose?.();
          return;
        }

        activeInstance = instance;
        const count = Object.values(instance.loadedModels).filter(Boolean).length;
        setAnalyzer(instance);
        setLoadedModelCount(count);
        setDelegateBadge(instance.activeDelegate === 'gpu' ? 'GPU' : 'CPU');
        setEnrolledCats(instance.getEnrolledCats());
        setInitError(null);
      } catch (err) {
        if (isMounted) {
          setInitError(
            err instanceof Error ? err.message : 'Failed to initialize Cat AI models'
          );
        }
      }
    }

    loadCatPipeline();

    return () => {
      isMounted = false;
      activeInstance?.dispose?.();
    };
  }, []);

  const primaryCatDetection = useMemo(() => {
    return detections.find((det) => det.cat?.isCat) ?? null;
  }, [detections]);

  const contextDetections = useMemo(() => {
    return detections.filter((det) => !det.cat?.isCat);
  }, [detections]);

  const catMeta = primaryCatDetection?.cat;
  const topBreeds = catMeta?.topBreeds ?? [];
  const leadBreed = topBreeds[0];
  const leadProfile = leadBreed ? getCatBreedProfile(leadBreed.breed) : null;
  const moodMetrics = catMeta?.moodMetrics;
  const coatSwatches = catMeta?.coatSwatches ?? [];
  const sceneContextTags = catMeta?.sceneContextTags ?? [];
  const segmentation = catMeta?.segmentation;
  const shotOptimality = catMeta?.shotOptimalityScore ?? 0;

  const handleDetections = useCallback((results: DetectionResult[]) => {
    setDetections(results);
    const now = performance.now();
    const recent = frameTimestampsRef.current.filter((t) => now - t < 1000);
    recent.push(now);
    frameTimestampsRef.current = recent;
    setFps(recent.length);
  }, []);

  const handleCameraError = useCallback((error: CameraAIError) => {
    setStatusMessage(`Camera error: ${error.message}`);
  }, []);

  const handleModeChange = useCallback(
    (index: number) => {
      const next = ANALYSIS_MODES[index]?.value;
      if (!next) return;
      setAnalysisMode(next);
      analyzer?.setAnalysisMode(next);
    },
    [analyzer]
  );

  const handleBreedEngineChange = useCallback(
    (index: number) => {
      const next = BREED_ENGINES[index]?.value;
      if (!next) return;
      setBreedEngine(next);
      analyzer?.setBreedEngine(next);
    },
    [analyzer]
  );

  const handleBoxVariantChange = useCallback((index: number) => {
    const next = BOX_VARIANTS[index]?.value;
    if (next) setBoxVariant(next);
  }, []);

  const handleToggleCloseUp = useCallback(
    (enabled: boolean) => {
      setCloseUpFallback(enabled);
      analyzer?.setCloseUpFallback(enabled);
    },
    [analyzer]
  );

  const handleConfidenceSelect = useCallback(
    (value: number) => {
      setConfidenceThreshold(value);
      analyzer?.setConfidenceThreshold(value);
    },
    [analyzer]
  );

  const handleSimilaritySelect = useCallback(
    (value: number) => {
      setSimilarityThreshold(value);
      analyzer?.setSimilarityThreshold(value);
    },
    [analyzer]
  );

  const handleEnrollCat = useCallback(() => {
    if (!analyzer) return;
    const trimmed = enrollName.trim();
    if (!trimmed) {
      setStatusMessage('Enter a cat name before enrolling.');
      return;
    }

    const created = analyzer.enrollLastDetectedCat(trimmed, leadBreed?.breed);
    if (!created) {
      setStatusMessage('Point the camera at a cat first to extract its descriptor.');
      return;
    }

    setEnrolledCats(analyzer.getEnrolledCats());
    setEnrollName('');
    setStatusMessage(`Enrolled "${created.name}" (${created.breedHint ?? 'Cat'})`);
  }, [analyzer, enrollName, leadBreed?.breed]);

  const handleRemoveEnrolledCat = useCallback(
    (id: string) => {
      if (!analyzer) return;
      analyzer.removeEnrolledCat(id);
      setEnrolledCats(analyzer.getEnrolledCats());
    },
    [analyzer]
  );

  const handleClearEnrolledCats = useCallback(() => {
    if (!analyzer) return;
    analyzer.clearEnrolledCats();
    setEnrolledCats([]);
    setStatusMessage('Cleared all enrolled cat profiles.');
  }, [analyzer]);

  const handleCapturePassport = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      setFlashTrigger((n) => n + 1);
      const photo = await cameraRef.current.capturePhoto();
      if (!photo?.uri) {
        setStatusMessage('Capture cancelled or unavailable on this device.');
        return;
      }

      const matchedName = primaryCatDetection?.identity?.isRecognized
        ? primaryCatDetection.identity.name
        : leadBreed?.breed ?? 'Unidentified Cat';

      setPassport({
        capturedAt: new Date().toLocaleTimeString(),
        photoUri: photo.uri,
        catName: matchedName,
        primaryBreed: leadBreed?.breed ?? 'Unknown Breed',
        breedConfidence: leadBreed ? Math.round(leadBreed.confidence * 100) : 0,
        coatPattern: catMeta?.coatPattern ?? 'Mixed Pattern',
        moodLabel: moodMetrics?.moodLabel ?? 'Calm / Observing',
        shotOptimality,
        swatches: coatSwatches.slice(0, 4),
        sceneTags: sceneContextTags,
        topCandidates: topBreeds.slice(0, 3),
      });
      setStatusMessage(null);
    } catch (err) {
      setStatusMessage(
        err instanceof Error ? err.message : 'Unable to capture Cat Passport photo'
      );
    } finally {
      setIsCapturing(false);
    }
  }, [
    catMeta?.coatPattern,
    coatSwatches,
    isCapturing,
    leadBreed,
    moodMetrics?.moodLabel,
    primaryCatDetection?.identity?.isRecognized,
    primaryCatDetection?.identity?.name,
    sceneContextTags,
    shotOptimality,
    topBreeds,
  ]);

  const handleSharePassport = useCallback(async () => {
    if (!passport) return;
    const summaryLines = [
      `Cat AI Studio Passport (${passport.capturedAt})`,
      `Name / Match: ${passport.catName}`,
      `Primary Breed: ${passport.primaryBreed} (${passport.breedConfidence}%)`,
      `Coat Pattern: ${passport.coatPattern}`,
      `CatFACS Mood: ${passport.moodLabel}`,
      passport.swatches.length > 0
        ? `Coat Colors: ${passport.swatches.map((s) => `${s.name} ${s.hex}`).join(', ')}`
        : null,
      passport.sceneTags.length > 0
        ? `Scene Context: ${passport.sceneTags.join(', ')}`
        : null,
    ].filter(Boolean);

    await Share.share({
      title: `Cat Passport - ${passport.catName}`,
      message: summaryLines.join('\n'),
    });
  }, [passport]);

  const renderCatOverlay = useCallback(
    (frameDetections: DetectionResult[], viewDims: ViewDimensions) => {
      const catDet = frameDetections.find((d) => d.cat?.isCat);
      if (!catDet?.cat || viewDims.width <= 0 || viewDims.height <= 0) {
        return null;
      }

      const seg = catDet.cat.segmentation;
      const faceBox = catDet.cat.faceBoundingBox;

      const cellW = seg && seg.maskWidth > 0 ? viewDims.width / seg.maskWidth : 0;
      const cellH = seg && seg.maskHeight > 0 ? viewDims.height / seg.maskHeight : 0;

      return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {showSegMask && seg && seg.foregroundMask.length > 0
            ? seg.foregroundMask.map((val, idx) => {
                if (val < 0.5) return null;
                const gx = idx % seg.maskWidth;
                const gy = Math.floor(idx / seg.maskWidth);
                return (
                  <View
                    key={`seg-${idx}`}
                    style={{
                      position: 'absolute',
                      left: gx * cellW,
                      top: gy * cellH,
                      width: cellW + 0.5,
                      height: cellH + 0.5,
                      backgroundColor: `${colors.primary}2e`,
                    }}
                  />
                );
              })
            : null}

          {faceBox ? (
            <View
              style={{
                position: 'absolute',
                left: faceBox.x * viewDims.width,
                top: faceBox.y * viewDims.height,
                width: faceBox.width * viewDims.width,
                height: faceBox.height * viewDims.height,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: colors.accent,
                borderRadius: radii.sm,
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: -18,
                  left: 0,
                  backgroundColor: colors.accent,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: radii.xs,
                }}
              >
                <Text
                  style={{
                    color: colors.onAccent,
                    fontSize: 10,
                    fontWeight: '700',
                  }}
                >
                  CAT FACE ROI
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      );
    },
    [colors.accent, colors.onAccent, colors.primary, radii.sm, radii.xs, showSegMask]
  );

  const formatCatLabel = useCallback((det: DetectionResult) => {
    const pct = Math.round(det.confidence * 100);
    if (det.cat?.isCat) {
      return `${det.label} · ${pct}%`;
    }
    return `Cue: ${det.label} ${pct}%`;
  }, []);

  const topModeIndex = Math.max(
    0,
    ANALYSIS_MODES.findIndex((m) => m.value === analysisMode)
  );
  const breedEngineIndex = Math.max(
    0,
    BREED_ENGINES.findIndex((e) => e.value === breedEngine)
  );
  const boxVariantIndex = Math.max(
    0,
    BOX_VARIANTS.findIndex((b) => b.value === boxVariant)
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Live Multi-Model Camera Viewport */}
      <View
        style={[
          styles.cameraSection,
          {
            borderBottomColor: colors.border,
            borderBottomWidth: cardBorderWidth,
          },
        ]}
      >
        <CameraAI
          ref={cameraRef}
          processor={analyzer ?? undefined}
          cameraPosition={cameraPosition}
          captureMode="live"
          enablePhotoCapture={true}
          scanAnimation={isCapturing}
          flashTrigger={flashTrigger}
          isActive={!isPaused && !passport}
          boxVariant={boxVariant}
          showBoxes={true}
          showLandmarks={showFaceMesh}
          showMeshLines={showFaceMesh}
          showLabels={true}
          showConfidence={false}
          formatLabel={formatCatLabel}
          onDetections={handleDetections}
          onDetectionsThrottleMs={40}
          onError={handleCameraError}
          renderOverlay={renderCatOverlay}
          style={StyleSheet.absoluteFill}
        />

        {/* Floating Top HUD */}
        <View
          style={[
            styles.topHud,
            {
              paddingTop: insets.top + 8,
            },
          ]}
        >
          <View style={styles.hudRow}>
            <IconButton
              accessibilityLabel="Go back"
              size="sm"
              variant="soft"
              tone="default"
              icon={(iconProps) => <ArrowLeft {...iconProps} />}
              onPress={() => router.back()}
            />
            <View
              style={[
                styles.titlePill,
                {
                  backgroundColor: isDark ? colors.overlay : `${colors.surface}e8`,
                  borderColor: colors.border,
                  borderRadius: radii.full,
                },
              ]}
            >
              <Cat size={16} color={colors.primary} />
              <Text variant="caption" weight="700" style={{ color: colors.text }}>
                Cat AI Studio
              </Text>
              <Badge size="xs" tone="primary" variant="soft">
                {`${loadedModelCount}/6 Models`}
              </Badge>
            </View>
            <View style={styles.hudActions}>
              <IconButton
                accessibilityLabel={isPaused ? 'Resume camera' : 'Pause camera'}
                size="sm"
                variant="soft"
                tone={isPaused ? 'warning' : 'default'}
                icon={(iconProps) =>
                  isPaused ? <Play {...iconProps} /> : <Pause {...iconProps} />
                }
                onPress={() => setIsPaused((prev) => !prev)}
              />
              <IconButton
                accessibilityLabel="Flip camera"
                size="sm"
                variant="soft"
                tone="default"
                icon={(iconProps) => <RefreshCw {...iconProps} />}
                onPress={() =>
                  setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'))
                }
              />
            </View>
          </View>

          <View style={styles.telemetryStrip}>
            <Badge size="xs" tone={delegateBadge === 'GPU' ? 'success' : 'warning'} variant="filled">
              {delegateBadge}
            </Badge>
            <Badge size="xs" tone="default" variant="soft">
              {`${fps} FPS`}
            </Badge>
            {primaryCatDetection ? (
              <Badge size="xs" tone="primary" variant="filled">
                {`${primaryCatDetection.label}`}
              </Badge>
            ) : (
              <Badge size="xs" tone="default" variant="soft">
                Scanning for cats
              </Badge>
            )}
          </View>
        </View>

        {/* Bottom Camera Overlay Strip: Optimality + Capture Passport */}
        <View style={styles.bottomCameraHud}>
          <View
            style={[
              styles.optimalityPill,
              {
                backgroundColor: isDark ? colors.overlay : `${colors.surface}eb`,
                borderColor: colors.border,
                borderRadius: radii.full,
              },
            ]}
          >
            <Sparkles size={14} color={colors.primary} />
            <Text variant="caption" weight="600" style={{ color: colors.text }}>
              {primaryCatDetection
                ? `Shot Score ${shotOptimality}% · ${contextDetections.length} Cues`
                : 'Point camera at cat or close-up portrait'}
            </Text>
          </View>

          <Button
            size="sm"
            tone="primary"
            variant="filled"
            shape="pill"
            loading={isCapturing}
            leftIcon={(iconProps) => <Camera {...iconProps} />}
            onPress={handleCapturePassport}
          >
            Passport
          </Button>
        </View>
      </View>

      {/* Scrollable Multi-Model Studio Telemetry & Controls */}
      <ScrollView
        style={styles.studioScroll}
        contentContainerStyle={[
          styles.studioContent,
          { paddingBottom: Math.max(insets.bottom + 24, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {initError ? (
          <Card outlined style={{ borderColor: colors.danger, backgroundColor: colors.dangerSoft }}>
            <Text variant="caption" weight="700" style={{ color: colors.danger }}>
              Model Initialization Issue
            </Text>
            <Text variant="caption" style={{ color: colors.text, marginTop: 4 }}>
              {initError}
            </Text>
          </Card>
        ) : null}

        {statusMessage ? (
          <Card style={{ backgroundColor: colors.surfaceRaised }}>
            <Text variant="caption" style={{ color: colors.text }}>
              {statusMessage}
            </Text>
          </Card>
        ) : null}

        {/* Pipeline Mode & Breed Engine Selectors */}
        <Card>
          <Text variant="caption" weight="700" color="textMuted" style={styles.sectionLabel}>
            ACTIVE AI PIPELINE MODE
          </Text>
          <SegmentedControl
            size="sm"
            values={ANALYSIS_MODES.map((m) => m.label)}
            selectedIndex={topModeIndex}
            onChange={handleModeChange}
          />
          <Divider style={{ marginVertical: 12 }} />
          <View style={styles.inlineHeader}>
            <Text variant="caption" weight="700" color="textMuted">
              BREED ENGINE
            </Text>
            <Text variant="caption" color="textSubtle">
              EMA Temporal Fusion
            </Text>
          </View>
          <SegmentedControl
            size="sm"
            tone="accent"
            values={BREED_ENGINES.map((e) => e.label)}
            selectedIndex={breedEngineIndex}
            onChange={handleBreedEngineChange}
          />
        </Card>

        {/* Card 1: Cat Breed & Lineage Telemetry */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Cat size={18} color={colors.primary} />
              <Text variant="body" weight="700">
                Breed Recognition
              </Text>
            </View>
            {leadBreed ? (
              <Badge size="xs" tone="primary" variant="soft">
                {leadBreed.source.toUpperCase()}
              </Badge>
            ) : (
              <Badge size="xs" tone="default" variant="soft">
                Standby
              </Badge>
            )}
          </View>

          {topBreeds.length > 0 ? (
            <View style={styles.stackGapSm}>
              {leadProfile?.kampungAlias ? (
                <View style={styles.aliasRow}>
                  <Badge size="xs" tone="accent" variant="soft">
                    {leadProfile.kampungAlias}
                  </Badge>
                  <Text variant="caption" color="textMuted">
                    Matched domestic lineage
                  </Text>
                </View>
              ) : null}

              {topBreeds.map((candidate, idx) => {
                const pct = Math.round(candidate.confidence * 100);
                return (
                  <View key={`${candidate.breed}-${idx}`} style={styles.breedRow}>
                    <View style={styles.breedRowLabels}>
                      <Text
                        variant="caption"
                        weight={idx === 0 ? '700' : '500'}
                        style={{ color: colors.text }}
                      >
                        {`${idx + 1}. ${candidate.breed}`}
                      </Text>
                      <Text
                        variant="caption"
                        weight="700"
                        style={{ color: idx === 0 ? colors.primary : colors.textMuted }}
                      >
                        {`${pct}%`}
                      </Text>
                    </View>
                    <Progress
                      size={idx === 0 ? 'md' : 'sm'}
                      tone={idx === 0 ? 'primary' : 'default'}
                      value={pct}
                      max={100}
                    />
                  </View>
                );
              })}

              {leadProfile ? (
                <View
                  style={[
                    styles.traitBox,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Text variant="caption" weight="600" style={{ color: colors.text }}>
                    {`${leadProfile.origin} · Size: ${leadProfile.size} · ${leadProfile.coatStyle}`}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                    {leadProfile.summary}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text variant="caption" color="textMuted">
              Waiting for cat frame. Enable Close-Up Cat Gate below for close portrait shots where COCO SSD misses full-body silhouettes.
            </Text>
          )}
        </Card>

        {/* Card 2: 48-Pt CatFLW Landmarks & CatFACS Mood */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <ScanFace size={18} color={colors.accent} />
              <Text variant="body" weight="700">
                CatFACS Mood &amp; 48-Pt Face Mesh
              </Text>
            </View>
            <Badge size="xs" tone={getMoodTone(moodMetrics?.mood)} variant="soft">
              {moodMetrics?.moodLabel ?? 'No Face ROI'}
            </Badge>
          </View>

          {moodMetrics ? (
            <View style={styles.stackGapSm}>
              <View style={styles.metricsGrid}>
                <View
                  style={[
                    styles.metricTile,
                    { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
                  ]}
                >
                  <Text variant="caption" color="textMuted">
                    Eye Aperture
                  </Text>
                  <Text variant="body" weight="700">
                    {moodMetrics.eyeApertureRatio.toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.metricTile,
                    { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
                  ]}
                >
                  <Text variant="caption" color="textMuted">
                    Ear Elevation
                  </Text>
                  <Text variant="body" weight="700">
                    {moodMetrics.earElevationRatio.toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.metricTile,
                    { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
                  ]}
                >
                  <Text variant="caption" color="textMuted">
                    Mouth Open
                  </Text>
                  <Text variant="body" weight="700">
                    {moodMetrics.mouthOpenRatio.toFixed(2)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.metricTile,
                    { backgroundColor: colors.surfaceMuted, borderRadius: radii.md },
                  ]}
                >
                  <Text variant="caption" color="textMuted">
                    Head Tilt
                  </Text>
                  <Text variant="body" weight="700">
                    {`${Math.round(moodMetrics.headTiltDeg)} deg`}
                  </Text>
                </View>
              </View>

              <View style={styles.tagWrap}>
                <Badge
                  size="xs"
                  tone={moodMetrics.isSlowBlinking ? 'success' : 'default'}
                  variant={moodMetrics.isSlowBlinking ? 'filled' : 'outline'}
                >
                  {moodMetrics.isSlowBlinking ? 'Slow-Blink Active' : 'Eyes Open'}
                </Badge>
                <Badge
                  size="xs"
                  tone={moodMetrics.isAirplaneEars ? 'warning' : 'default'}
                  variant={moodMetrics.isAirplaneEars ? 'filled' : 'outline'}
                >
                  {moodMetrics.isAirplaneEars ? 'Airplane Ears' : 'Ears Upright'}
                </Badge>
                <Badge
                  size="xs"
                  tone={moodMetrics.isVocalizing ? 'info' : 'default'}
                  variant={moodMetrics.isVocalizing ? 'filled' : 'outline'}
                >
                  {moodMetrics.isVocalizing ? 'Meow / Yawn' : 'Mouth Closed'}
                </Badge>
              </View>
            </View>
          ) : (
            <Text variant="caption" color="textMuted">
              Align cat face inside the camera frame to activate the 2-stage localizer + 48-pt CatFLW landmark wireframe.
            </Text>
          )}
        </Card>

        {/* Card 3: DeepLab Segmentation, Fur Coat Colors & Scene Context */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Palette size={18} color={colors.success} />
              <Text variant="body" weight="700">
                Coat Colors &amp; Segmentation
              </Text>
            </View>
            <Badge size="xs" tone="success" variant="soft">
              {catMeta?.coatPattern ?? 'DeepLabV3 Class 8'}
            </Badge>
          </View>

          {coatSwatches.length > 0 ? (
            <View style={styles.stackGapSm}>
              {segmentation ? (
                <Text variant="caption" color="textMuted">
                  {`Mask Coverage: ${Math.round(segmentation.coverageRatio * 100)}% (${segmentation.maskWidth}x${segmentation.maskHeight} VOC Cat Class)`}
                </Text>
              ) : null}

              <View style={styles.swatchList}>
                {coatSwatches.map((swatch, idx) => (
                  <View
                    key={`${swatch.hex}-${idx}`}
                    style={[
                      styles.swatchPill,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.swatchDot,
                        { backgroundColor: swatch.hex, borderColor: colors.border },
                      ]}
                    />
                    <View>
                      <Text variant="caption" weight="600">
                        {swatch.name}
                      </Text>
                      <Text variant="caption" color="textSubtle">
                        {`${swatch.hex} · ${Math.round(swatch.percentage)}%`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text variant="caption" color="textMuted">
              Fur color clustering activates once DeepLabV3 segments foreground cat pixels cleanly.
            </Text>
          )}

          {sceneContextTags.length > 0 ? (
            <>
              <Divider style={{ marginVertical: 10 }} />
              <Text variant="caption" weight="700" color="textMuted" style={{ marginBottom: 6 }}>
                SCENE ENVIRONMENT CUES
              </Text>
              <View style={styles.tagWrap}>
                {sceneContextTags.map((tag) => (
                  <Badge key={tag} size="xs" tone="info" variant="soft">
                    {tag}
                  </Badge>
                ))}
              </View>
            </>
          ) : null}
        </Card>

        {/* Card 4: 1-Tap Personal Cat ID Enrollment */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <UserPlus size={18} color={colors.primary} />
              <Text variant="body" weight="700">
                Personal Cat Identity (1-Tap ID)
              </Text>
            </View>
            <Badge size="xs" tone="default" variant="soft">
              {`${enrolledCats.length} Saved`}
            </Badge>
          </View>

          <View style={styles.enrollRow}>
            <View style={styles.enrollInputWrap}>
              <Input
                size="sm"
                placeholder="Name (e.g. Oyen, Mochi)"
                value={enrollName}
                onChangeText={setEnrollName}
              />
            </View>
            <Button
              size="sm"
              tone="primary"
              disabled={!primaryCatDetection}
              onPress={handleEnrollCat}
            >
              Enroll
            </Button>
          </View>

          <View style={styles.chipRow}>
            <Text variant="caption" color="textMuted">
              Match Threshold:
            </Text>
            {SIMILARITY_OPTIONS.map((opt) => (
              <Chip
                key={`sim-${opt}`}
                size="sm"
                label={`${Math.round(opt * 100)}%`}
                selected={Math.abs(similarityThreshold - opt) < 0.01}
                onPress={() => handleSimilaritySelect(opt)}
              />
            ))}
          </View>

          {enrolledCats.length > 0 ? (
            <View style={styles.enrolledSection}>
              <View style={styles.inlineHeader}>
                <Text variant="caption" weight="700" color="textMuted">
                  ENROLLED PROFILES
                </Text>
                <Pressable onPress={handleClearEnrolledCats} style={styles.clearButton}>
                  <Trash2 size={13} color={colors.danger} />
                  <Text variant="caption" weight="600" style={{ color: colors.danger }}>
                    Clear All
                  </Text>
                </Pressable>
              </View>
              <View style={styles.tagWrap}>
                {enrolledCats.map((cat) => (
                  <Chip
                    key={cat.id}
                    size="sm"
                    tone="primary"
                    variant="soft"
                    label={
                      cat.breedHint ? `${cat.name} (${cat.breedHint})` : cat.name
                    }
                    onClose={() => handleRemoveEnrolledCat(cat.id)}
                  />
                ))}
              </View>
            </View>
          ) : (
            <Text variant="caption" color="textSubtle" style={{ marginTop: 6 }}>
              Capture any cat descriptor on-device (96-D fur + landmark signature) to recognize individual cats later in the session.
            </Text>
          )}
        </Card>

        {/* Card 5: Overlay & Runtime Tuning */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleWrap}>
              <Layers size={18} color={colors.text} />
              <Text variant="body" weight="700">
                Overlay &amp; Pipeline Settings
              </Text>
            </View>
          </View>

          <Text variant="caption" color="textMuted" style={{ marginBottom: 6 }}>
            Bounding Box Style
          </Text>
          <SegmentedControl
            size="sm"
            values={BOX_VARIANTS.map((b) => b.label)}
            selectedIndex={boxVariantIndex}
            onChange={handleBoxVariantChange}
          />

          <View style={styles.chipRow}>
            <Text variant="caption" color="textMuted">
              SSD Threshold:
            </Text>
            {CONFIDENCE_OPTIONS.map((opt) => (
              <Chip
                key={`conf-${opt}`}
                size="sm"
                label={`${Math.round(opt * 100)}%`}
                selected={Math.abs(confidenceThreshold - opt) < 0.01}
                onPress={() => handleConfidenceSelect(opt)}
              />
            ))}
          </View>

          <Divider style={{ marginVertical: 10 }} />

          <View style={styles.switchList}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text variant="caption" weight="600">
                  48-Point CatFLW Wireframe
                </Text>
                <Text variant="caption" color="textSubtle">
                  Ears, almond eyes, nose triangle &amp; whisker muzzle
                </Text>
              </View>
              <Switch value={showFaceMesh} onValueChange={setShowFaceMesh} />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text variant="caption" weight="600">
                  DeepLabV3 Semantic Silhouette
                </Text>
                <Text variant="caption" color="textSubtle">
                  24x24 foreground cat segmentation grid highlight
                </Text>
              </View>
              <Switch value={showSegMask} onValueChange={setShowSegMask} />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text variant="caption" weight="600">
                  Close-Up Portrait Fallback
                </Text>
                <Text variant="caption" color="textSubtle">
                  Probes Cat Face Localizer when macro zoom hides body
                </Text>
              </View>
              <Switch value={closeUpFallback} onValueChange={handleToggleCloseUp} />
            </View>
          </View>

          <Divider style={{ marginVertical: 10 }} />
          <Text variant="caption" color="textSubtle">
            Bundled on-device TFLite suite: COCO SSD Detect, 67-Breed Classifier, Oxford-12 Classifier, DeepLabV3 (Apache 2.0), plus CatFLW Face Localizer &amp; 48-pt Landmarks (CC BY-NC 4.0 demo evaluation only).
          </Text>
        </Card>
      </ScrollView>

      {/* Captured Cat Passport Card Modal */}
      <Modal
        visible={passport !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPassport(null)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Card
            elevated
            style={[
              styles.passportModalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.cardTitleWrap}>
                <CheckCircle2 size={18} color={colors.success} />
                <Text variant="title" weight="700">
                  Cat AI Passport
                </Text>
              </View>
              <IconButton
                accessibilityLabel="Close passport"
                size="xs"
                variant="ghost"
                tone="default"
                icon={(iconProps) => <X {...iconProps} />}
                onPress={() => setPassport(null)}
              />
            </View>

            {passport ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Image
                  source={{ uri: passport.photoUri }}
                  style={[styles.passportImage, { borderRadius: radii.md }]}
                  resizeMode="cover"
                />

                <View style={styles.passportMetaBlock}>
                  <Text variant="title" weight="700">
                    {passport.catName}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {`${passport.primaryBreed} (${passport.breedConfidence}% confidence) · ${passport.capturedAt}`}
                  </Text>
                </View>

                <View style={styles.tagWrap}>
                  <Badge size="xs" tone="primary" variant="soft">
                    {passport.moodLabel}
                  </Badge>
                  <Badge size="xs" tone="accent" variant="soft">
                    {passport.coatPattern}
                  </Badge>
                  <Badge size="xs" tone="success" variant="soft">
                    {`Score ${passport.shotOptimality}%`}
                  </Badge>
                </View>

                {passport.swatches.length > 0 ? (
                  <View style={styles.passportSwatches}>
                    {passport.swatches.map((sw, idx) => (
                      <View key={`p-sw-${idx}`} style={styles.passportSwatchItem}>
                        <View
                          style={[
                            styles.swatchDotSmall,
                            { backgroundColor: sw.hex, borderColor: colors.border },
                          ]}
                        />
                        <Text variant="caption" color="textMuted">
                          {sw.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {passport.topCandidates.length > 1 ? (
                  <View style={{ marginTop: 10 }}>
                    <Text variant="caption" weight="700" color="textMuted">
                      TOP BREED CANDIDATES
                    </Text>
                    {passport.topCandidates.map((cand) => (
                      <Text key={cand.breed} variant="caption" style={{ color: colors.text }}>
                        {`• ${cand.breed} (${Math.round(cand.confidence * 100)}%)`}
                      </Text>
                    ))}
                  </View>
                ) : null}

                <View style={styles.modalFooter}>
                  <Button
                    size="sm"
                    variant="outline"
                    tone="default"
                    onPress={() => setPassport(null)}
                    style={{ flex: 1 }}
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    variant="filled"
                    tone="primary"
                    leftIcon={(iconProps) => <Share2 {...iconProps} />}
                    onPress={handleSharePassport}
                    style={{ flex: 1 }}
                  >
                    Share
                  </Button>
                </View>
              </ScrollView>
            ) : null}
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  cameraSection: {
    height: '45%',
    minHeight: 300,
    position: 'relative',
    overflow: 'hidden',
  },
  topHud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    gap: 8,
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  hudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  bottomCameraHud: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optimalityPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
  },
  studioScroll: {
    flex: 1,
  },
  studioContent: {
    padding: 14,
    gap: 12,
  },
  sectionLabel: {
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stackGapSm: {
    gap: 8,
  },
  aliasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breedRow: {
    gap: 4,
  },
  breedRowLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  traitBox: {
    padding: 10,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTile: {
    width: '48%',
    padding: 10,
    gap: 2,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  swatchList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: '47%',
  },
  swatchDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
  },
  swatchDotSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  enrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enrollInputWrap: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  enrolledSection: {
    marginTop: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchList: {
    gap: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    gap: 2,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  passportModalCard: {
    maxHeight: '85%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  passportImage: {
    width: '100%',
    height: 220,
    marginBottom: 12,
  },
  passportMetaBlock: {
    marginBottom: 8,
    gap: 2,
  },
  passportSwatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  passportSwatchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});
