import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Image,
  type ImageLoadEvent,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Cpu,
  Eye,
  Palette,
  RefreshCw,
  RotateCcw,
  ScanText,
  Share2,
  SlidersHorizontal,
  Sparkles,
  SwitchCamera,
} from "lucide-react-native";
import {
  CameraAI,
  DEFAULT_ALIGNMENT_GUIDE_BOX,
  DEFAULT_ALIGNMENT_GUIDE_QUAD,
  DetectionOverlay,
  DocumentGuideOverlay,
  ScannerAnimationOverlay,
  createDocumentAlignmentProcessor,
  transformNormalizedToPixelBox,
  type BoundingBox,
  type BoundingBoxVariant,
  type CameraAIError,
  type CameraAIRef,
  type CameraFacing,
  type CapturedPhotoResult,
  type DetectionResult,
  type DocumentAlignmentMetrics,
  type DocumentGuideTarget,
  type DocumentGuideThemeConfig,
  type DocumentQuad,
  type DocumentReadinessState,
  type ModelStatus,
  type OcrGranularity,
  type OverlayThemeConfig,
  type PixelBoundingBox,
  type RenderDocumentStatusParams,
  type RenderScannerLaserParams,
  type StreamDimensions,
  type ViewDimensions,
} from "@masumdev/rn-camera-ai";
import {
  createMLKitTextRecognizer,
  parseMLKitTextResult,
  type MLKitTextRecognitionResult,
  type MLKitTextRecognizer,
  type OcrEntityFilter,
  type StructuredOcrEntities,
} from "@masumdev/rn-camera-ai-mlkit";

const AMBER_ACCENT = "#f59e0b";
const EMERALD_ACCENT = "#22c55e";
const CYAN_ACCENT = "#38bdf8";

const EASE_OUT =
  typeof Easing?.bezier === "function"
    ? Easing.bezier(0.23, 1, 0.32, 1)
    : undefined;

type UiThemePresetId = "gold" | "ktp" | "hud";

interface UiThemePresetSpec {
  id: UiThemePresetId;
  shortLabel: string;
  accent: string;
  guideTheme: DocumentGuideThemeConfig;
  useCustomSlots: boolean;
}

const UI_THEME_PRESETS: ReadonlyArray<UiThemePresetSpec> = [
  {
    id: "gold",
    shortLabel: "Studio",
    accent: AMBER_ACCENT,
    useCustomSlots: false,
    guideTheme: {
      cornerLength: 30,
      cornerThickness: 3.5,
      cornerRadius: 14,
      showMask: false,
      showGuideOutline: true,
      outlineOpacity: 0.50,
      searchingColor: "#94a3b8",
      adjustingColor: AMBER_ACCENT,
      optimalColor: EMERALD_ACCENT,
      analyzingColor: AMBER_ACCENT,
      completeColor: EMERALD_ACCENT,
      statusPosition: "top",
      snapDurationMs: 170,
    },
  },
  {
    id: "ktp",
    shortLabel: "Emerald",
    accent: EMERALD_ACCENT,
    useCustomSlots: false,
    guideTheme: {
      cornerLength: 32,
      cornerThickness: 4,
      cornerRadius: 10,
      showMask: true,
      maskColor: "rgba(3, 18, 22, 0.36)",
      showGuideOutline: true,
      outlineOpacity: 0.35,
      searchingColor: "#7dd3fc",
      adjustingColor: "#fb923c",
      optimalColor: EMERALD_ACCENT,
      analyzingColor: EMERALD_ACCENT,
      completeColor: EMERALD_ACCENT,
      statusPosition: "bottom",
      snapDurationMs: 160,
    },
  },
  {
    id: "hud",
    shortLabel: "Custom",
    accent: CYAN_ACCENT,
    useCustomSlots: true,
    guideTheme: {
      cornerLength: 24,
      cornerThickness: 2.5,
      cornerRadius: 3,
      showMask: false,
      showGuideOutline: true,
      outlineOpacity: 0.45,
      searchingColor: "#64748b",
      adjustingColor: AMBER_ACCENT,
      optimalColor: CYAN_ACCENT,
      analyzingColor: CYAN_ACCENT,
      completeColor: EMERALD_ACCENT,
      statusPosition: "top",
      snapDurationMs: 140,
    },
  },
];

const GRANULARITY_ORDER: readonly OcrGranularity[] = [
  "line",
  "block",
  "element",
];

const ENTITY_FILTERS: ReadonlyArray<{
  id: OcrEntityFilter;
  label: string;
}> = [
  { id: "all", label: "All Text" },
  { id: "nik", label: "NIK" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "url", label: "URL" },
  { id: "currency", label: "Rp" },
];

const EMPTY_ENTITIES: StructuredOcrEntities = {
  niks: [],
  emails: [],
  phones: [],
  urls: [],
  currencies: [],
};

interface AlignmentUiState {
  box: BoundingBox;
  corners: DocumentQuad;
  readiness: DocumentReadinessState;
  metrics: DocumentAlignmentMetrics;
}

const INITIAL_ALIGNMENT_STATE: AlignmentUiState = {
  box: DEFAULT_ALIGNMENT_GUIDE_BOX,
  corners: DEFAULT_ALIGNMENT_GUIDE_QUAD,
  readiness: "searching",
  metrics: {
    status: "searching",
    optimalityScore: 0,
    isOptimal: false,
    hasDocument: false,
    headline: "Arahkan kertas ke dalam sudut bingkai",
    hint: "Pastikan seluruh tepi kertas terlihat jelas",
    meanBrightness: 128,
    focusSharpness: 0,
    coverageRatio: 0,
    corners: DEFAULT_ALIGNMENT_GUIDE_QUAD,
    skewAngleDeg: 0,
  },
};

export default function OcrScannerScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reducedMotion =
    typeof useReducedMotion === "function" ? useReducedMotion() : false;

  const cameraRef = useRef<CameraAIRef | null>(null);

  // Pure worklet YUV background calculator — ZERO live ML Kit text scanning in preview
  const alignmentProcessor = useMemo(
    () => createDocumentAlignmentProcessor({ targetFps: 5 }),
    []
  );

  // Heavy ML Kit OCR engine kept idle & warm solely for 1-shot post-capture recognizeImage()
  const [ocrProcessor, setOcrProcessor] = useState<MLKitTextRecognizer | null>(
    null
  );
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forcePhotoOnlyFallback, setForcePhotoOnlyFallback] =
    useState<boolean>(false);

  const [cameraPosition, setCameraPosition] = useState<CameraFacing>("back");
  const [granularity, setGranularity] = useState<OcrGranularity>("line");
  const [entityFilter, setEntityFilter] = useState<OcrEntityFilter>("all");
  const [boxVariant, setBoxVariant] = useState<BoundingBoxVariant>("corners");
  const [invertColors, setInvertColors] = useState<boolean>(false);
  const [themeIndex, setThemeIndex] = useState<number>(0);

  // Lightweight background alignment state
  const [alignment, setAlignment] = useState<AlignmentUiState>(
    INITIAL_ALIGNMENT_STATE
  );
  const lastUiSyncRef = useRef<AlignmentUiState>(INITIAL_ALIGNMENT_STATE);

  // Captured Still Photo & 1-Shot OCR Result State (post-capture)
  const [viewportDims, setViewportDims] = useState<ViewDimensions>({
    width: 0,
    height: 0,
  });
  const [capturedPhoto, setCapturedPhoto] =
    useState<CapturedPhotoResult | null>(null);
  const [capturedStreamDims, setCapturedStreamDims] =
    useState<StreamDimensions>({ width: 1440, height: 1920 });
  const [capturedRawResult, setCapturedRawResult] =
    useState<MLKitTextRecognitionResult | null>(null);
  const [capturedDetections, setCapturedDetections] = useState<
    DetectionResult[]
  >([]);
  const [fullText, setFullText] = useState<string>("");
  const [entities, setEntities] =
    useState<StructuredOcrEntities>(EMPTY_ENTITIES);

  const [isCapturingPhoto, setIsCapturingPhoto] = useState<boolean>(false);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState<boolean>(false);
  const [captureFlashTick, setCaptureFlashTick] = useState<number>(0);

  const analysisRunIdRef = useRef<number>(0);
  const activePreset = UI_THEME_PRESETS[themeIndex] ?? UI_THEME_PRESETS[0];

  // Reanimated UI-thread press scale & transcript reveal (zero bounce)
  const shutterScale = useSharedValue<number>(1);
  const transcriptReveal = useSharedValue<number>(1);
  const transcriptTranslateY = useSharedValue<number>(0);

  const shutterAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ scale: shutterScale.get() }],
    };
  });

  const transcriptAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: transcriptReveal.get(),
      transform: [{ translateY: transcriptTranslateY.get() }],
    };
  });

  const triggerResultReveal = useCallback(() => {
    if (reducedMotion) {
      transcriptReveal.set(1);
      transcriptTranslateY.set(0);
      return;
    }
    transcriptReveal.set(0.35);
    transcriptTranslateY.set(6);
    transcriptReveal.set(
      withTiming(1, {
        duration: 200,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion?.System,
      })
    );
    transcriptTranslateY.set(
      withTiming(0, {
        duration: 200,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion?.System,
      })
    );
  }, [reducedMotion, transcriptReveal, transcriptTranslateY]);

  const initOcr = useCallback(async () => {
    setModelStatus("loading");
    setErrorMessage(null);
    try {
      const instance = await createMLKitTextRecognizer({
        language: "LATIN",
        granularity: "line",
        entityFilter: "all",
        minTextLength: 2,
        maxResults: 30,
        preferredPixelFormat: "yuv",
      });
      setOcrProcessor(instance);
      setModelStatus(instance.status);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to initialize Google ML Kit OCR";
      setErrorMessage(msg);
      setModelStatus("error");
    }
  }, []);

  useEffect(() => {
    void initOcr();
    return () => {
      alignmentProcessor.dispose?.();
    };
  }, [alignmentProcessor, initOcr]);

  useEffect(() => {
    return () => {
      ocrProcessor?.dispose?.();
    };
  }, [ocrProcessor]);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setViewportDims({ width, height });
    }
  }, []);

  // Receives only compact numeric worklet metrics (no text arrays, no heavy live ML Kit)
  const handleAlignmentDetections = useCallback(
    (results: DetectionResult[]) => {
      if (capturedPhoto !== null || isCapturingPhoto || isAnalyzingPhoto) {
        return;
      }
      const first = results[0];
      const metrics = first?.documentAlignment;
      if (!first || !metrics) {
        return;
      }

      const nextReadiness: DocumentReadinessState = !metrics.hasDocument
        ? "searching"
        : metrics.isOptimal
          ? "optimal"
          : "adjusting";

      const prev = lastUiSyncRef.current;
      const nextCorners = metrics.corners ?? DEFAULT_ALIGNMENT_GUIDE_QUAD;
      const cornerDelta =
        Math.abs(nextCorners.topLeft.x - prev.corners.topLeft.x) +
        Math.abs(nextCorners.topLeft.y - prev.corners.topLeft.y) +
        Math.abs(nextCorners.topRight.x - prev.corners.topRight.x) +
        Math.abs(nextCorners.topRight.y - prev.corners.topRight.y) +
        Math.abs(nextCorners.bottomRight.x - prev.corners.bottomRight.x) +
        Math.abs(nextCorners.bottomRight.y - prev.corners.bottomRight.y) +
        Math.abs(nextCorners.bottomLeft.x - prev.corners.bottomLeft.x) +
        Math.abs(nextCorners.bottomLeft.y - prev.corners.bottomLeft.y);

      // Skip redundant React renders when paper framing is stable
      if (
        prev.readiness === nextReadiness &&
        prev.metrics.status === metrics.status &&
        Math.abs(prev.metrics.optimalityScore - metrics.optimalityScore) < 3 &&
        cornerDelta < 0.024
      ) {
        return;
      }

      const nextState: AlignmentUiState = {
        box: first.boundingBox,
        corners: nextCorners,
        readiness: nextReadiness,
        metrics,
      };
      lastUiSyncRef.current = nextState;
      setAlignment(nextState);
    },
    [capturedPhoto, isAnalyzingPhoto, isCapturingPhoto]
  );

  const handleCameraError = useCallback(
    (error: CameraAIError) => {
      const lower = error.message.toLowerCase();
      if (
        !forcePhotoOnlyFallback &&
        (lower.includes("use case") ||
          lower.includes("use-case") ||
          lower.includes("session") ||
          lower.includes("surface") ||
          lower.includes("stream"))
      ) {
        setForcePhotoOnlyFallback(true);
        setAlignment({
          ...INITIAL_ALIGNMENT_STATE,
          metrics: {
            ...INITIAL_ALIGNMENT_STATE.metrics,
            headline: "Mode Capture Langsung Aktif",
            hint: "Paskan kertas di bingkai lalu ketuk Capture",
          },
        });
        return;
      }
      setErrorMessage(`[${error.code}] ${error.message}`);
    },
    [forcePhotoOnlyFallback]
  );

  const analyzeCapturedImage = useCallback(
    async (
      photo: CapturedPhotoResult,
      dims: StreamDimensions,
      processor: MLKitTextRecognizer
    ) => {
      const currentRun = ++analysisRunIdRef.current;
      setIsAnalyzingPhoto(true);
      setErrorMessage(null);
      try {
        const result = await processor.recognizeImage(photo.uri, {
          imageWidth: dims.width,
          imageHeight: dims.height,
        });
        if (currentRun !== analysisRunIdRef.current) {
          return;
        }
        setCapturedRawResult(result.rawResult);
        setCapturedDetections(result.detections);
        setFullText(result.fullText);
        setEntities(result.entities);
        triggerResultReveal();
      } catch (err: unknown) {
        if (currentRun !== analysisRunIdRef.current) {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to recognize text from captured photo";
        setErrorMessage(msg);
      } finally {
        if (currentRun === analysisRunIdRef.current) {
          setIsAnalyzingPhoto(false);
        }
      }
    },
    [triggerResultReveal]
  );

  const handleCapturePhotoPress = useCallback(async () => {
    if (
      !ocrProcessor ||
      !cameraRef.current ||
      isCapturingPhoto ||
      isAnalyzingPhoto
    ) {
      return;
    }

    setErrorMessage(null);
    setIsCapturingPhoto(true);
    setCaptureFlashTick((prev) => prev + 1);

    try {
      const photo = await cameraRef.current.capturePhoto({
        flashMode: "off",
        enableShutterSound: false,
      });

      if (!photo) {
        setErrorMessage("Photo output not ready. Please try again.");
        setIsCapturingPhoto(false);
        return;
      }

      const initialDims: StreamDimensions = {
        width: photo.uprightWidth > 0 ? photo.uprightWidth : 1440,
        height: photo.uprightHeight > 0 ? photo.uprightHeight : 1920,
      };
      setCapturedPhoto(photo);
      setCapturedStreamDims(initialDims);
      setCapturedRawResult(null);
      setCapturedDetections([]);
      setFullText("");
      setEntities(EMPTY_ENTITIES);
      setIsCapturingPhoto(false);

      await analyzeCapturedImage(photo, initialDims, ocrProcessor);
    } catch (err: unknown) {
      setIsCapturingPhoto(false);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to capture photo"
      );
    }
  }, [analyzeCapturedImage, isAnalyzingPhoto, isCapturingPhoto, ocrProcessor]);

  const handleCapturedImageLoad = useCallback(
    (event: ImageLoadEvent) => {
      const src = event.nativeEvent?.source;
      if (!src || src.width <= 0 || src.height <= 0) {
        return;
      }
      if (
        src.width !== capturedStreamDims.width ||
        src.height !== capturedStreamDims.height
      ) {
        const nextDims: StreamDimensions = {
          width: src.width,
          height: src.height,
        };
        setCapturedStreamDims(nextDims);
        if (capturedRawResult) {
          const reprojected = parseMLKitTextResult(
            capturedRawResult,
            nextDims.width,
            nextDims.height,
            {
              granularity,
              entityFilter,
              minTextLength: 2,
              maxResults: 30,
            }
          );
          setCapturedDetections(reprojected);
        }
      }
    },
    [
      capturedRawResult,
      capturedStreamDims.height,
      capturedStreamDims.width,
      entityFilter,
      granularity,
    ]
  );

  const handleRetakePhoto = useCallback(() => {
    analysisRunIdRef.current += 1;
    lastUiSyncRef.current = INITIAL_ALIGNMENT_STATE;
    setCapturedPhoto(null);
    setCapturedRawResult(null);
    setCapturedDetections([]);
    setAlignment(INITIAL_ALIGNMENT_STATE);
    setIsAnalyzingPhoto(false);
    setIsCapturingPhoto(false);
    setFullText("");
    setEntities(EMPTY_ENTITIES);
    setErrorMessage(null);
  }, []);

  const reparseCapturedResult = useCallback(
    (nextGranularity: OcrGranularity, nextFilter: OcrEntityFilter) => {
      if (!capturedRawResult) {
        return;
      }
      const nextDetections = parseMLKitTextResult(
        capturedRawResult,
        capturedStreamDims.width,
        capturedStreamDims.height,
        {
          granularity: nextGranularity,
          entityFilter: nextFilter,
          minTextLength: 2,
          maxResults: 30,
        }
      );
      setCapturedDetections(nextDetections);
    },
    [capturedRawResult, capturedStreamDims.height, capturedStreamDims.width]
  );

  const cycleGranularity = () => {
    const nextIdx =
      (GRANULARITY_ORDER.indexOf(granularity) + 1) % GRANULARITY_ORDER.length;
    const nextMode = GRANULARITY_ORDER[nextIdx];
    setGranularity(nextMode);
    ocrProcessor?.setGranularity(nextMode);
    if (capturedPhoto && capturedRawResult) {
      reparseCapturedResult(nextMode, entityFilter);
    }
  };

  const handleSelectEntityFilter = (filter: OcrEntityFilter) => {
    setEntityFilter(filter);
    ocrProcessor?.setEntityFilter(filter);
    if (capturedPhoto && capturedRawResult) {
      reparseCapturedResult(granularity, filter);
    }
  };

  const toggleBoxVariant = () => {
    setBoxVariant((prev) => (prev === "corners" ? "solid" : "corners"));
  };

  const cycleUiThemePreset = () => {
    setThemeIndex((prev) => (prev + 1) % UI_THEME_PRESETS.length);
  };

  const toggleInvertColors = async () => {
    const next = !invertColors;
    setInvertColors(next);
    if (!ocrProcessor) {
      return;
    }
    await ocrProcessor.setInvertColors(next);
    if (capturedPhoto) {
      await analyzeCapturedImage(capturedPhoto, capturedStreamDims, ocrProcessor);
    }
  };

  const toggleCameraFacing = () => {
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleShareTranscript = async () => {
    if (!fullText.trim()) {
      return;
    }
    try {
      await Share.share({
        message: fullText.trim(),
        title: "Hasil Scan OCR (Google ML Kit)",
      });
    } catch {
      // Share dismissed
    }
  };

  const isReviewingCapturedPhoto = capturedPhoto !== null;

  const documentGuide = useMemo<DocumentGuideTarget>(() => {
    if (isAnalyzingPhoto) {
      return {
        box: alignment.box,
        corners: alignment.corners,
        readiness: "analyzing",
        optimalityScore: alignment.metrics.optimalityScore || undefined,
        statusText: "Memindai Teks Dokumen...",
        hintText: "Google ML Kit memproses foto beresolusi tinggi",
      };
    }
    if (isReviewingCapturedPhoto) {
      return {
        box: alignment.box,
        corners: alignment.corners,
        readiness: "complete",
        optimalityScore: alignment.metrics.optimalityScore || 100,
        statusText: `Selesai · ${capturedDetections.length} Area Terbaca`,
        hintText: "Gunakan filter chip atau ambil ulang foto",
      };
    }
    return {
      box: alignment.box,
      corners: alignment.corners,
      readiness: alignment.readiness,
      optimalityScore: alignment.metrics.hasDocument
        ? alignment.metrics.optimalityScore
        : undefined,
      statusText: alignment.metrics.headline,
      hintText: alignment.metrics.hint,
    };
  }, [
    alignment,
    capturedDetections.length,
    isAnalyzingPhoto,
    isReviewingCapturedPhoto,
  ]);

  const fittedScanRegion = useMemo<PixelBoundingBox | undefined>(() => {
    if (viewportDims.width <= 0 || viewportDims.height <= 0) {
      return undefined;
    }
    return transformNormalizedToPixelBox(alignment.box, {
      viewDimensions: viewportDims,
      streamDimensions: capturedStreamDims,
      resizeMode: "cover",
      isMirrored: false,
      orientation: "portrait",
    });
  }, [alignment.box, capturedStreamDims, viewportDims]);

  const overlayTheme = useMemo<OverlayThemeConfig>(
    () => ({
      showBoxes: true,
      boxVariant,
      boxColor: activePreset.accent,
      boxBorderWidth: 1.8,
      boxBorderRadius: 6,
      cornerLength: 14,
      cornerThickness: 2.5,
      showLabels: granularity !== "element",
      showConfidence: false,
      labelPosition: "top-left",
      labelBackgroundColor: "rgba(5, 22, 30, 0.86)",
      labelTextColor: "#f8fafc",
      labelTextStyle: {
        fontSize: 10,
        fontWeight: "700",
      },
      formatLabel: (detection: DetectionResult) => {
        const cat = detection.ocr?.category;
        const prefix =
          cat && cat !== "text" ? `[${cat.toUpperCase()}] ` : "";
        const raw = detection.label;
        const trimmed = raw.length > 26 ? `${raw.slice(0, 26)}...` : raw;
        return `${prefix}${trimmed}`;
      },
    }),
    [activePreset.accent, boxVariant, granularity]
  );

  const customRenderDocumentStatus = useCallback(
    ({
      color,
      optimalityScore,
      statusText,
      pixelBox,
    }: RenderDocumentStatusParams) => (
      <View
        style={[
          styles.hudCustomStatusPill,
          {
            top: Math.max(10, pixelBox.y - 42),
            borderColor: color,
          },
        ]}
      >
        <Text style={[styles.hudCustomStatusText, { color }]} numberOfLines={1}>
          {statusText ?? "ALIGNING"}
        </Text>
        {typeof optimalityScore === "number" ? (
          <View style={[styles.hudScorePill, { backgroundColor: color }]}>
            <Text style={styles.hudScoreText}>FIT {optimalityScore}%</Text>
          </View>
        ) : null}
      </View>
    ),
    []
  );

  const customRenderLaser = useCallback(
    ({ accentColor }: RenderScannerLaserParams) => (
      <View style={styles.hudCustomLaserWrap}>
        <View
          style={[styles.hudCustomLaserBeam, { backgroundColor: accentColor }]}
        />
        <View style={styles.hudCustomLaserCore} />
      </View>
    ),
    []
  );

  const entityBadges = useMemo(() => {
    const list: Array<{ label: string; value: string }> = [];
    for (const v of entities.niks) list.push({ label: "NIK", value: v });
    for (const v of entities.phones) list.push({ label: "PHONE", value: v });
    for (const v of entities.emails) list.push({ label: "EMAIL", value: v });
    for (const v of entities.urls) list.push({ label: "URL", value: v });
    for (const v of entities.currencies) list.push({ label: "RP", value: v });
    return list;
  }, [entities]);

  const handleShutterPressIn = () => {
    if (reducedMotion) return;
    shutterScale.set(
      withTiming(0.97, {
        duration: 120,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion?.System,
      })
    );
  };

  const handleShutterPressOut = () => {
    shutterScale.set(
      withTiming(1, {
        duration: 120,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion?.System,
      })
    );
  };

  const isOptimalForCapture =
    !isReviewingCapturedPhoto &&
    alignment.metrics.hasDocument &&
    alignment.metrics.isOptimal;

  return (
    <View style={styles.root}>
      {/* Sleek Top Header sits ABOVE camera viewport so top document border is 100% unobstructed */}
      <View style={[styles.topHeader, { paddingTop: insets.top + 6 }]}>
        <View style={styles.brandRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Feature Menu"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={16} color="#f8fafc" />
          </Pressable>

          <View style={styles.brandBadge}>
            <ScanText size={15} color={activePreset.accent} />
            <Text numberOfLines={1} style={styles.brandTitle}>
              Smart Document Capture
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              modelStatus === "ready"
                ? styles.statusReady
                : modelStatus === "error"
                  ? styles.statusError
                  : styles.statusLoading,
            ]}
          >
            <Text style={styles.statusText}>{modelStatus.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View
            style={[
              styles.metricPill,
              isOptimalForCapture && styles.metricPillOptimal,
            ]}
          >
            {isOptimalForCapture ? (
              <CheckCircle2 size={12} color={EMERALD_ACCENT} />
            ) : (
              <Sparkles size={12} color={activePreset.accent} />
            )}
            <Text style={styles.metricText}>
              {isReviewingCapturedPhoto
                ? isAnalyzingPhoto
                  ? "Scanning Photo..."
                  : `${capturedDetections.length} Blocks`
                : alignment.metrics.hasDocument
                  ? `Optimal Scan: ${alignment.metrics.optimalityScore}%`
                  : "Background Framing Active"}
            </Text>
          </View>

          <View style={styles.metricPill}>
            <Cpu size={12} color={CYAN_ACCENT} />
            <Text style={styles.metricText}>
              {granularity.toUpperCase()} · {activePreset.shortLabel}
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <AlertTriangle size={14} color="#f87171" />
            <Text style={styles.errorText} numberOfLines={3}>
              {errorMessage}
            </Text>
            <Pressable onPress={() => void initOcr()}>
              <RefreshCw size={14} color="#f8fafc" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Unobstructed Edge-to-Edge Camera / Still Capture Stage (no overlapping HUDs over paper bottom!) */}
      <View style={styles.cameraContainer} onLayout={handleViewportLayout}>
        <CameraAI
          ref={cameraRef}
          processor={
            forcePhotoOnlyFallback || isReviewingCapturedPhoto
              ? undefined
              : alignmentProcessor
          }
          captureMode={forcePhotoOnlyFallback ? "photo" : "live"}
          enablePhotoCapture={true}
          showBoxes={false}
          showLabels={false}
          showLandmarks={false}
          scanAnimation={false}
          flashTrigger={captureFlashTick}
          cameraPosition={cameraPosition}
          resizeMode="cover"
          isActive={!isReviewingCapturedPhoto}
          fps={8}
          documentGuide={!isReviewingCapturedPhoto ? documentGuide : undefined}
          documentGuideTheme={activePreset.guideTheme}
          renderDocumentStatus={
            activePreset.useCustomSlots ? customRenderDocumentStatus : undefined
          }
          onDetections={handleAlignmentDetections}
          onError={handleCameraError}
          style={styles.camera}
        />

        {/* Post-Capture Review: Still Photo + Capture-Triggered Laser Sweep + Bounding Boxes */}
        {isReviewingCapturedPhoto && capturedPhoto ? (
          <View style={StyleSheet.absoluteFill}>
            <Image
              source={{ uri: capturedPhoto.uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onLoad={handleCapturedImageLoad}
            />

            {!isAnalyzingPhoto &&
            capturedDetections.length > 0 &&
            viewportDims.width > 0 &&
            viewportDims.height > 0 ? (
              <DetectionOverlay
                detections={capturedDetections}
                viewDimensions={viewportDims}
                streamDimensions={capturedStreamDims}
                resizeMode="cover"
                isMirrored={false}
                overlayTheme={overlayTheme}
              />
            ) : null}

            <DocumentGuideOverlay
              guide={documentGuide}
              viewDimensions={viewportDims}
              streamDimensions={capturedStreamDims}
              resizeMode="cover"
              isMirrored={false}
              theme={activePreset.guideTheme}
              renderStatus={
                activePreset.useCustomSlots
                  ? customRenderDocumentStatus
                  : undefined
              }
            />

            <ScannerAnimationOverlay
              active={isAnalyzingPhoto}
              state={isAnalyzingPhoto ? "analyzing" : "complete"}
              accentColor={activePreset.accent}
              showGridCorners={false}
              showLaser={isAnalyzingPhoto}
              scanRegion={fittedScanRegion}
              sweepDurationMs={950}
              flashTrigger={captureFlashTick}
              renderLaser={
                activePreset.useCustomSlots ? customRenderLaser : undefined
              }
              statusLabel={
                isAnalyzingPhoto
                  ? "Memindai teks dari kertas..."
                  : undefined
              }
            />
          </View>
        ) : null}
      </View>

      {/* Bottom Dock: Compact during viewfinder so paper fits vertically; expands seamlessly on capture */}
      <View
        style={[
          styles.bottomPanel,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {/* Primary Capture / Retake + Export Row positioned outside viewfinder */}
        {!isReviewingCapturedPhoto ? (
          <Animated.View style={shutterAnimatedStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Capture & Scan Document"
              disabled={!ocrProcessor || isCapturingPhoto}
              onPressIn={handleShutterPressIn}
              onPressOut={handleShutterPressOut}
              onPress={() => void handleCapturePhotoPress()}
              style={[
                styles.shutterButton,
                {
                  backgroundColor: isOptimalForCapture
                    ? EMERALD_ACCENT
                    : activePreset.accent,
                  borderColor: isOptimalForCapture ? "#bbf7d0" : "#fde68a",
                },
                (!ocrProcessor || isCapturingPhoto) &&
                  styles.shutterButtonDisabled,
              ]}
            >
              <View style={styles.shutterInnerRing}>
                <Camera size={17} color="#05161E" />
              </View>
              <Text style={styles.shutterLabel}>
                {isCapturingPhoto
                  ? "Capturing..."
                  : isOptimalForCapture
                    ? "Capture Optimal Scan"
                    : "Capture Document"}
              </Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <View style={styles.reviewPrimaryRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retake Document Photo"
                disabled={isAnalyzingPhoto}
                onPress={handleRetakePhoto}
                style={[
                  styles.retakeButton,
                  { borderColor: activePreset.accent },
                  isAnalyzingPhoto && styles.actionButtonDisabled,
                ]}
              >
                <RotateCcw size={14} color="#f8fafc" />
                <Text style={styles.retakeLabel}>Retake Photo</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleShareTranscript()}
                disabled={!fullText.trim()}
                style={[
                  styles.exportPrimaryBtn,
                  { backgroundColor: activePreset.accent },
                  !fullText.trim() && styles.shareBtnDisabled,
                ]}
              >
                <Share2 size={14} color="#05161E" />
                <Text style={styles.shareBtnText}>Export / Copy</Text>
              </Pressable>
            </View>

            {/* Entity Filter Strip */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterStrip}
            >
              {ENTITY_FILTERS.map((item) => {
                const active = entityFilter === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectEntityFilter(item.id)}
                    style={[
                      styles.filterChip,
                      active && {
                        backgroundColor: "rgba(245, 158, 11, 0.22)",
                        borderColor: activePreset.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Extracted Structured Entities Strip */}
            {entityBadges.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.entityStrip}
              >
                {entityBadges.map((ent, idx) => (
                  <View key={`${ent.label}-${idx}`} style={styles.entityBadge}>
                    <Text style={styles.entityType}>{ent.label}</Text>
                    <Text style={styles.entityValue} numberOfLines={1}>
                      {ent.value}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {/* Captured Document Transcript Card */}
            <Animated.View
              style={[styles.transcriptCard, transcriptAnimatedStyle]}
            >
              <View style={styles.transcriptHeader}>
                <Text style={styles.transcriptTitle}>
                  Scan Result ({fullText.trim().length} chars)
                </Text>
              </View>

              <ScrollView style={styles.transcriptScroll}>
                <Text style={styles.transcriptBody}>
                  {fullText.trim().length > 0
                    ? fullText.trim()
                    : isAnalyzingPhoto
                      ? "Sedang menjalankan laser scan & pengenalan teks resolusi tinggi..."
                      : "Tidak ada teks terbaca pada foto ini. Silakan ambil ulang foto."}
                </Text>
              </ScrollView>
            </Animated.View>
          </>
        )}

        {/* Compact Bottom Controls */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={toggleCameraFacing}
            disabled={isReviewingCapturedPhoto}
            style={[
              styles.actionButton,
              isReviewingCapturedPhoto && styles.actionButtonDisabled,
            ]}
          >
            <SwitchCamera size={14} color="#f8fafc" />
            <Text style={styles.actionButtonText}>
              {cameraPosition === "back" ? "Rear" : "Front"}
            </Text>
          </Pressable>

          <Pressable
            onPress={cycleGranularity}
            style={[
              styles.actionButton,
              {
                borderColor: activePreset.accent,
                backgroundColor: "rgba(245, 158, 11, 0.14)",
              },
            ]}
          >
            <SlidersHorizontal size={14} color="#fcd34d" />
            <Text style={styles.actionButtonTextAmber}>
              {granularity === "line"
                ? "Line"
                : granularity === "block"
                  ? "Block"
                  : "Word"}
            </Text>
          </Pressable>

          <Pressable onPress={toggleBoxVariant} style={styles.actionButton}>
            <Eye size={14} color="#cbd5e1" />
            <Text style={styles.actionButtonText}>
              {boxVariant === "corners" ? "Corners" : "Solid"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void toggleInvertColors()}
            style={[
              styles.actionButton,
              invertColors && styles.actionButtonAmber,
            ]}
          >
            <Text
              style={[
                styles.actionButtonText,
                invertColors && styles.actionButtonTextAmber,
              ]}
            >
              Invert
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Switch Custom UI Theme"
            onPress={cycleUiThemePreset}
            style={[
              styles.actionButton,
              { borderColor: activePreset.accent },
            ]}
          >
            <Palette size={14} color={activePreset.accent} />
            <Text style={styles.actionButtonText}>{activePreset.shortLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#05161E",
  },
  topHeader: {
    backgroundColor: "#05161E",
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242, 251, 253, 0.08)",
    gap: 6,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(11, 32, 42, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  brandTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusReady: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderColor: EMERALD_ACCENT,
  },
  statusLoading: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: AMBER_ACCENT,
  },
  statusError: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "#ef4444",
  },
  statusText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(11, 32, 42, 0.9)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.12)",
  },
  metricPillOptimal: {
    borderColor: EMERALD_ACCENT,
    backgroundColor: "rgba(34, 197, 94, 0.18)",
  },
  metricText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(127, 29, 29, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#fee2e2",
    fontSize: 11,
    flex: 1,
  },
  shutterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  shutterButtonDisabled: {
    opacity: 0.5,
  },
  shutterInnerRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterLabel: {
    color: "#05161E",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewPrimaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#05161E",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.2,
  },
  retakeLabel: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "800",
  },
  exportPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  hudCustomStatusPill: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(5, 22, 30, 0.92)",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hudCustomStatusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  hudScorePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hudScoreText: {
    color: "#05161E",
    fontSize: 10,
    fontWeight: "900",
  },
  hudCustomLaserWrap: {
    width: "100%",
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  hudCustomLaserBeam: {
    width: "100%",
    height: 3,
    opacity: 0.95,
  },
  hudCustomLaserCore: {
    position: "absolute",
    width: "92%",
    height: 1,
    backgroundColor: "#ffffff",
  },
  bottomPanel: {
    backgroundColor: "#0B202A",
    borderTopWidth: 1,
    borderTopColor: "rgba(242, 251, 253, 0.12)",
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
  },
  filterStrip: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#05161E",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  filterChipText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#fcd34d",
  },
  entityStrip: {
    gap: 6,
  },
  entityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  entityType: {
    color: "#86efac",
    fontSize: 9,
    fontWeight: "800",
  },
  entityValue: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 170,
  },
  transcriptCard: {
    backgroundColor: "#05161E",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    gap: 6,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  transcriptTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  shareBtnDisabled: {
    opacity: 0.45,
  },
  shareBtnText: {
    color: "#05161E",
    fontSize: 11,
    fontWeight: "800",
  },
  transcriptScroll: {
    maxHeight: 82,
  },
  transcriptBody: {
    color: "#e2e8f0",
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#05161E",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonAmber: {
    borderColor: AMBER_ACCENT,
    backgroundColor: "rgba(245, 158, 11, 0.16)",
  },
  actionButtonTextAmber: {
    color: "#fcd34d",
    fontSize: 11,
    fontWeight: "700",
  },
  actionButtonText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
  },
});
