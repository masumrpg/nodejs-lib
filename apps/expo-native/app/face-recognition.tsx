import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Eye,
  Pause,
  Play,
  RefreshCw,
  ScanFace,
  SlidersHorizontal,
  SwitchCamera,
  Trash2,
  UserPlus,
  Zap,
} from "lucide-react-native";
import {
  CameraAI,
  type BoundingBoxVariant,
  type CameraAIError,
  type CameraFacing,
  type DetectionResult,
  type ModelStatus,
  type OverlayThemeConfig,
} from "@masumdev/rn-camera-ai";
import {
  createTFLiteFaceRecognizer,
  type EnrolledFaceProfile,
  type TFLiteFaceRecognizer,
} from "@masumdev/rn-camera-ai-tflite";

const EMERALD_ACCENT = "#3da441";
const CYAN_ACCENT = "#38bdf8";
const SIMILARITY_PRESETS: readonly number[] = [0.65, 0.75, 0.85];
const TARGET_FPS = 30;
const FACE_INPUT_SIZE = 192;

interface FallbackInfo {
  requested: string;
  fallback: string;
}

type ErrorSource = "model" | "camera" | null;
type FaceBoxMode = "corners" | "solid" | "none";
type FaceMeshDisplayMode = "full" | "contours" | "dots" | "off";

const BOX_MODE_ORDER: readonly FaceBoxMode[] = ["corners", "solid", "none"];
const MESH_MODE_ORDER: readonly FaceMeshDisplayMode[] = [
  "full",
  "contours",
  "dots",
  "off",
];

function getBoxModeLabel(mode: FaceBoxMode): string {
  switch (mode) {
    case "corners":
      return "Corners";
    case "solid":
      return "Solid Box";
    case "none":
      return "No Box";
  }
}

function getMeshModeLabel(mode: FaceMeshDisplayMode): string {
  switch (mode) {
    case "full":
      return "468 Mesh";
    case "contours":
      return "Contours";
    case "dots":
      return "Dots Only";
    case "off":
      return "Mesh Off";
  }
}

function renderEmptyOverlay(): React.ReactNode {
  return null;
}

export default function FaceRecognitionScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [recognizer, setRecognizer] = useState<
    TFLiteFaceRecognizer | undefined
  >(undefined);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [activeDelegate, setActiveDelegate] = useState<"gpu" | "cpu" | null>(
    null,
  );
  const [fallbackInfo, setFallbackInfo] = useState<FallbackInfo | null>(null);
  const [cameraPosition, setCameraPosition] = useState<CameraFacing>("front");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [boxMode, setBoxMode] = useState<FaceBoxMode>("corners");
  const [meshMode, setMeshMode] = useState<FaceMeshDisplayMode>("full");
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.75);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [enrolledFaces, setEnrolledFaces] = useState<EnrolledFaceProfile[]>([]);
  const [enrollName, setEnrollName] = useState<string>("");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorSource, setErrorSource] = useState<ErrorSource>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const initialSimilarityRef = useRef<number>(similarityThreshold);
  initialSimilarityRef.current = similarityThreshold;

  const isActiveRef = useRef<boolean>(isActive);
  isActiveRef.current = isActive;

  const frameTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    let isCancelled = false;
    let activeInstance: TFLiteFaceRecognizer | undefined;

    setModelStatus("loading");
    setRecognizer(undefined);
    setActiveDelegate(null);
    setFallbackInfo(null);
    setErrorMessage(null);
    setErrorSource(null);
    frameTimestampsRef.current = [];
    setLiveFps(0);

    const faceModelAsset =
      require("../assets/models/face_detection_full_range.tflite") as number;
    const mobileFaceNetAsset =
      require("../assets/models/mobilefacenet.tflite") as number;
    const faceMeshAsset =
      require("../assets/models/face_landmark.tflite") as number;

    createTFLiteFaceRecognizer({
      model: faceModelAsset,
      embeddingModel: mobileFaceNetAsset,
      faceMeshModel: faceMeshAsset,
      inputWidth: FACE_INPUT_SIZE,
      inputHeight: FACE_INPUT_SIZE,
      confidenceThreshold: 0.55,
      similarityThreshold: initialSimilarityRef.current,
      maxResults: 5,
      targetFps: TARGET_FPS,
      useGpu: true,
      onDelegateFallback: (requested: string, fallback: string) => {
        if (!isCancelled) {
          setFallbackInfo({ requested, fallback });
        }
      },
    })
      .then((created) => {
        if (isCancelled) {
          created.dispose?.();
          return;
        }
        created.setSimilarityThreshold(initialSimilarityRef.current);
        activeInstance = created;
        setRecognizer(created);
        setActiveDelegate(created.activeDelegate);
        setModelStatus(created.status);
        setEnrolledFaces(created.getEnrolledFaces());
      })
      .catch((err: unknown) => {
        if (isCancelled) {
          return;
        }
        setModelStatus("error");
        setErrorSource("model");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Failed to initialize TFLite face recognizer",
        );
      });

    return () => {
      isCancelled = true;
      activeInstance?.dispose?.();
    };
  }, [reloadNonce]);

  const handleDetections = useCallback((results: DetectionResult[]) => {
    if (!isActiveRef.current) {
      return;
    }

    const now = Date.now();
    const timestamps = frameTimestampsRef.current;
    timestamps.push(now);
    while (timestamps.length > 0 && now - timestamps[0] > 1000) {
      timestamps.shift();
    }

    let measuredFps = 0;
    if (timestamps.length >= 2) {
      const elapsedMs = now - timestamps[0];
      measuredFps =
        elapsedMs > 0
          ? Math.min(
              60,
              Math.round(((timestamps.length - 1) * 10000) / elapsedMs) / 10,
            )
          : timestamps.length;
    } else {
      measuredFps = timestamps.length;
    }

    setLiveFps(measuredFps);
    setDetections(results);
  }, []);

  const handleCameraError = useCallback((error: CameraAIError) => {
    setErrorSource("camera");
    setErrorMessage(`${error.code}: ${error.message}`);
  }, []);

  const handleFlipCamera = useCallback(() => {
    frameTimestampsRef.current = [];
    setLiveFps(0);
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
  }, []);

  const handleToggleActive = useCallback(() => {
    const nextActive = !isActive;
    isActiveRef.current = nextActive;
    setIsActive(nextActive);
    if (!nextActive) {
      frameTimestampsRef.current = [];
      setLiveFps(0);
      setDetections([]);
    }
  }, [isActive]);

  const handleToggleLandmarks = useCallback(() => {
    setMeshMode((prev) => {
      const idx = MESH_MODE_ORDER.indexOf(prev);
      return MESH_MODE_ORDER[(idx + 1) % MESH_MODE_ORDER.length];
    });
  }, []);

  const handleCycleBoxMode = useCallback(() => {
    setBoxMode((prev) => {
      const idx = BOX_MODE_ORDER.indexOf(prev);
      return BOX_MODE_ORDER[(idx + 1) % BOX_MODE_ORDER.length];
    });
  }, []);

  const showBoxes = boxMode !== "none";
  const resolvedBoxVariant: BoundingBoxVariant =
    boxMode === "solid" ? "solid" : "corners";
  const showLandmarks = meshMode !== "off";
  const overlayTheme = useMemo<OverlayThemeConfig>(
    () => ({
      showBoxes,
      boxVariant: resolvedBoxVariant,
      boxColor: EMERALD_ACCENT,
      unrecognizedBoxColor: "#38bdf8",
      cornerLength: 24,
      cornerThickness: 3,
      meshStyle: {
        showMeshLines: meshMode === "full" || meshMode === "contours",
        showTesselation: meshMode === "full",
        showDots: meshMode === "full" || meshMode === "dots",
      },
    }),
    [showBoxes, resolvedBoxVariant, meshMode],
  );

  const handleSelectSimilarity = useCallback(
    (threshold: number) => {
      initialSimilarityRef.current = threshold;
      setSimilarityThreshold(threshold);
      recognizer?.setSimilarityThreshold(threshold);
    },
    [recognizer],
  );

  const handleEnrollCurrentFace = useCallback(() => {
    if (!recognizer) {
      return;
    }
    const targetName = enrollName.trim() || `Person ${enrolledFaces.length + 1}`;
    const profile = recognizer.enrollLastDetectedFace(targetName);
    if (!profile) {
      setStatusNotice("Arahkan kamera ke wajah terlebih dahulu sebelum Enroll.");
      return;
    }
    setEnrolledFaces(recognizer.getEnrolledFaces());
    setEnrollName("");
    setStatusNotice(`Wajah "${profile.name}" berhasil didaftarkan!`);
  }, [recognizer, enrollName, enrolledFaces.length]);

  const handleRemoveProfile = useCallback(
    (id: string) => {
      if (!recognizer) {
        return;
      }
      recognizer.removeEnrolledFace(id);
      setEnrolledFaces(recognizer.getEnrolledFaces());
    },
    [recognizer],
  );

  const handleClearProfiles = useCallback(() => {
    if (!recognizer) {
      return;
    }
    recognizer.clearEnrolledFaces();
    setEnrolledFaces([]);
    setStatusNotice("Semua data wajah terdaftar telah dihapus.");
  }, [recognizer]);

  const handleRetryLoad = useCallback(() => {
    setReloadNonce((prev) => prev + 1);
  }, []);

  const handleDismissError = useCallback(() => {
    setErrorMessage(null);
    setErrorSource(null);
  }, []);

  const handleBackToMenu = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [router]);

  return (
    <View style={styles.root}>
      <CameraAI
        processor={recognizer}
        cameraPosition={cameraPosition}
        resizeMode="cover"
        isActive={isActive}
        showBoxes={showBoxes}
        boxVariant={resolvedBoxVariant}
        showLandmarks={showLandmarks}
        overlayTheme={overlayTheme}
        renderOverlay={isActive ? undefined : renderEmptyOverlay}
        onDetections={handleDetections}
        onError={handleCameraError}
        style={styles.camera}
      />

      {/* Top Status HUD */}
      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { paddingTop: insets.top + 12 }]}
      >
        <View style={styles.headerCard}>
          <View style={styles.titleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to menu"
              onPress={handleBackToMenu}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <ArrowLeft size={16} color="#f8fafc" />
            </Pressable>

            <View style={styles.brandMark}>
              <ScanFace size={16} color={CYAN_ACCENT} />
            </View>
            <View style={styles.titleTextGroup}>
              <Text style={styles.title}>Face Recognition AI</Text>
              <Text style={styles.subtitle}>
                468-Pt Face Mesh + MobileFaceNet (192-D)
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cycle bounding box style"
              onPress={handleCycleBoxMode}
              style={({ pressed }) => [
                styles.landmarkToggle,
                showBoxes && styles.boxToggleActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.landmarkToggleText,
                  showBoxes && styles.boxToggleTextActive,
                ]}
              >
                {getBoxModeLabel(boxMode)}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle facial landmarks"
              onPress={handleToggleLandmarks}
              style={({ pressed }) => [
                styles.landmarkToggle,
                showLandmarks && styles.landmarkToggleActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Eye size={13} color={showLandmarks ? "#05161E" : "#cbd5e1"} />
              <Text
                style={[
                  styles.landmarkToggleText,
                  showLandmarks && styles.landmarkToggleTextActive,
                ]}
              >
                {getMeshModeLabel(meshMode)}
              </Text>
            </Pressable>
          </View>

          <View style={styles.badgesRow}>
            <View
              style={[
                styles.badge,
                modelStatus === "ready"
                  ? styles.badgeReady
                  : modelStatus === "error"
                    ? styles.badgeError
                    : styles.badgeNeutral,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  modelStatus === "ready"
                    ? styles.dotReady
                    : modelStatus === "error"
                      ? styles.dotError
                      : styles.dotLoading,
                ]}
              />
              <Text style={styles.badgeText}>{modelStatus.toUpperCase()}</Text>
            </View>

            <View style={[styles.badge, styles.badgeNeutral]}>
              {activeDelegate === "gpu" ? (
                <Zap size={12} color={EMERALD_ACCENT} />
              ) : (
                <Cpu size={12} color="#94a3b8" />
              )}
              <Text style={styles.badgeText}>
                {activeDelegate ? activeDelegate.toUpperCase() : "PENDING"}
                {fallbackInfo ? " (FALLBACK)" : ""}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                isActive && liveFps > 0
                  ? styles.badgeReady
                  : styles.badgeNeutral,
              ]}
            >
              <Text style={styles.badgeText}>
                {isActive ? `${liveFps.toFixed(1)} FPS` : "0.0 FPS"}
              </Text>
            </View>
          </View>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <View style={styles.errorHeader}>
              <AlertTriangle size={16} color="#fca5a5" />
              <Text style={styles.errorText} numberOfLines={3}>
                {errorMessage}
              </Text>
            </View>
            <View style={styles.errorActions}>
              {modelStatus === "error" && errorSource === "model" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry face model load"
                  onPress={handleRetryLoad}
                  style={({ pressed }) => [
                    styles.errorButton,
                    styles.errorRetryButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <RefreshCw size={13} color="#ffffff" />
                  <Text style={styles.errorButtonText}>Retry</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss face error"
                onPress={handleDismissError}
                style={({ pressed }) => [
                  styles.errorButton,
                  styles.errorDismissButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.errorButtonText}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Controls & Face Enrollment HUD */}
      <View
        pointerEvents="box-none"
        style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 14 }]}
      >
        <View style={styles.controlCard}>
          {/* Live Faces Summary */}
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>
              Faces ({detections.length}) • Enrolled ({enrolledFaces.length})
            </Text>
            <Text style={styles.summaryMeta}>
              {isActive
                ? `Live ${liveFps.toFixed(1)} / ${TARGET_FPS} FPS`
                : "Paused"}
            </Text>
          </View>

          <View style={styles.detectionChipsRow}>
            {detections.length > 0 ? (
              detections.map((item) => {
                const isKnown = item.identity?.isRecognized === true;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.detectionChip,
                      isKnown ? styles.chipRecognized : styles.chipDetected,
                    ]}
                  >
                    <Text style={styles.detectionChipLabel}>{item.label}</Text>
                    <Text style={styles.detectionChipScore}>
                      {Math.round(item.confidence * 100)}%
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyDetectionsText}>
                {isActive
                  ? modelStatus === "ready"
                    ? "Arahkan kamera ke wajah..."
                    : "Preparing BlazeFace model..."
                  : "Inference paused"}
              </Text>
            )}
          </View>

          {/* 1-Tap Face Enrollment Row */}
          <View style={styles.enrollRow}>
            <TextInput
              value={enrollName}
              onChangeText={setEnrollName}
              placeholder="Ketik nama wajah (mis. Masum)..."
              placeholderTextColor="#64748b"
              style={styles.nameInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enroll detected face"
              onPress={handleEnrollCurrentFace}
              style={({ pressed }) => [
                styles.enrollButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <UserPlus size={15} color="#05161E" />
              <Text style={styles.enrollButtonText}>Enroll Face</Text>
            </Pressable>
          </View>

          {statusNotice && (
            <Text style={styles.noticeText}>{statusNotice}</Text>
          )}

          {/* Enrolled Faces List */}
          {enrolledFaces.length > 0 && (
            <View style={styles.enrolledListRow}>
              {enrolledFaces.map((profile) => (
                <Pressable
                  key={profile.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove enrolled face ${profile.name}`}
                  onPress={() => handleRemoveProfile(profile.id)}
                  style={styles.enrolledProfileChip}
                >
                  <Text style={styles.enrolledProfileText}>
                    {profile.name} ×
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear all enrolled faces"
                onPress={handleClearProfiles}
                style={styles.clearAllChip}
              >
                <Trash2 size={12} color="#fca5a5" />
                <Text style={styles.clearAllText}>Clear</Text>
              </Pressable>
            </View>
          )}

          {/* Match Similarity Threshold Presets */}
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdLabelGroup}>
              <SlidersHorizontal size={14} color="#94a3b8" />
              <Text style={styles.thresholdLabel}>Match Similarity</Text>
            </View>
            <View style={styles.presetButtons}>
              {SIMILARITY_PRESETS.map((preset) => {
                const selected = Math.abs(similarityThreshold - preset) < 0.01;
                return (
                  <Pressable
                    key={preset}
                    accessibilityRole="button"
                    accessibilityLabel={`Set similarity threshold ${Math.round(preset * 100)} percent`}
                    onPress={() => handleSelectSimilarity(preset)}
                    style={({ pressed }) => [
                      styles.presetButton,
                      selected && styles.presetButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        selected && styles.presetTextSelected,
                      ]}
                    >
                      {Math.round(preset * 100)}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Camera & Session Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isActive ? "Pause face detection" : "Resume face detection"
              }
              onPress={handleToggleActive}
              style={({ pressed }) => [
                styles.actionButton,
                isActive ? styles.actionButtonActive : styles.actionButtonMuted,
                pressed && styles.buttonPressed,
              ]}
            >
              {isActive ? (
                <Pause size={16} color="#ffffff" />
              ) : (
                <Play size={16} color="#ffffff" />
              )}
              <Text style={styles.actionButtonText}>
                {isActive ? "Pause" : "Resume"}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch camera facing"
              onPress={handleFlipCamera}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionButtonSecondary,
                pressed && styles.buttonPressed,
              ]}
            >
              <SwitchCamera size={16} color="#f8fafc" />
              <Text style={styles.actionButtonText}>
                {cameraPosition === "back" ? "Back Camera" : "Front Camera"}
              </Text>
            </Pressable>
          </View>
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
  camera: {
    flex: 1,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    gap: 10,
  },
  headerCard: {
    backgroundColor: "rgba(5, 22, 30, 0.86)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.14)",
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#122B37",
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextGroup: {
    flex: 1,
  },
  title: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 11,
  },
  landmarkToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0B202A",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  landmarkToggleActive: {
    backgroundColor: CYAN_ACCENT,
    borderColor: CYAN_ACCENT,
  },
  boxToggleActive: {
    backgroundColor: "rgba(61, 164, 65, 0.22)",
    borderColor: EMERALD_ACCENT,
  },
  boxToggleTextActive: {
    color: "#86efac",
  },
  landmarkToggleText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "700",
  },
  landmarkToggleTextActive: {
    color: "#05161E",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeReady: {
    backgroundColor: "rgba(61, 164, 65, 0.16)",
    borderColor: "rgba(61, 164, 65, 0.55)",
  },
  badgeError: {
    backgroundColor: "rgba(239, 68, 68, 0.18)",
    borderColor: "rgba(239, 68, 68, 0.55)",
  },
  badgeNeutral: {
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotReady: {
    backgroundColor: EMERALD_ACCENT,
  },
  dotError: {
    backgroundColor: "#ef4444",
  },
  dotLoading: {
    backgroundColor: "#f59e0b",
  },
  badgeText: {
    color: "#f1f5f9",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  errorBanner: {
    backgroundColor: "rgba(127, 29, 29, 0.92)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.45)",
    gap: 10,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#fee2e2",
    fontSize: 12,
    lineHeight: 17,
  },
  errorActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  errorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorRetryButton: {
    backgroundColor: EMERALD_ACCENT,
  },
  errorDismissButton: {
    backgroundColor: "rgba(15, 23, 42, 0.65)",
  },
  errorButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
  },
  controlCard: {
    backgroundColor: "rgba(5, 22, 30, 0.90)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.14)",
    gap: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryMeta: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  detectionChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    minHeight: 24,
    alignItems: "center",
  },
  detectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipRecognized: {
    backgroundColor: "rgba(61, 164, 65, 0.2)",
    borderColor: "rgba(61, 164, 65, 0.55)",
  },
  chipDetected: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderColor: "rgba(56, 189, 248, 0.45)",
  },
  detectionChipLabel: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "600",
  },
  detectionChipScore: {
    color: "#86efac",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyDetectionsText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  enrollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: "#0B202A",
    color: "#f8fafc",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
  },
  enrollButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: CYAN_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  enrollButtonText: {
    color: "#05161E",
    fontSize: 12,
    fontWeight: "800",
  },
  noticeText: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "600",
  },
  enrolledListRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  enrolledProfileChip: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  enrolledProfileText: {
    color: "#e0f2fe",
    fontSize: 11,
    fontWeight: "700",
  },
  clearAllChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  clearAllText: {
    color: "#fca5a5",
    fontSize: 11,
    fontWeight: "700",
  },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  thresholdLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  thresholdLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  presetButtons: {
    flexDirection: "row",
    gap: 6,
  },
  presetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0B202A",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
  },
  presetButtonSelected: {
    backgroundColor: CYAN_ACCENT,
    borderColor: CYAN_ACCENT,
  },
  presetText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  presetTextSelected: {
    color: "#05161E",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  actionButtonActive: {
    backgroundColor: EMERALD_ACCENT,
  },
  actionButtonMuted: {
    backgroundColor: "#334155",
  },
  actionButtonSecondary: {
    backgroundColor: "#122B37",
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.16)",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
