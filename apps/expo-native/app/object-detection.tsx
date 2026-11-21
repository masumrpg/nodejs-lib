import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  SlidersHorizontal,
  SwitchCamera,
  Zap,
} from "lucide-react-native";
import {
  CameraAI,
  type BoundingBoxVariant,
  type CameraAIError,
  type CameraFacing,
  type DetectionResult,
  type ModelStatus,
} from "@masumdev/rn-camera-ai";
import {
  createTFLiteObjectDetector,
  type TFLiteObjectDetector,
} from "@masumdev/rn-camera-ai-tflite";
import {
  COCO_91_LABELS,
  MODEL_INPUT_HEIGHT,
  MODEL_INPUT_WIDTH,
  MODEL_LABEL_OFFSET,
} from "../src/constants/cocoLabels";

const EMERALD_ACCENT = "#3da441";
const THRESHOLD_PRESETS: readonly number[] = [0.35, 0.5, 0.7];
const MAX_SUMMARY_LABELS = 4;
const TARGET_FPS = 30;

interface FallbackInfo {
  requested: string;
  fallback: string;
}

type ErrorSource = "model" | "camera" | null;

function renderEmptyOverlay(): React.ReactNode {
  return null;
}

export default function ObjectDetectionScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [detector, setDetector] = useState<TFLiteObjectDetector | undefined>(
    undefined,
  );
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [activeDelegate, setActiveDelegate] = useState<"gpu" | "cpu" | null>(
    null,
  );
  const [fallbackInfo, setFallbackInfo] = useState<FallbackInfo | null>(null);
  const [cameraPosition, setCameraPosition] = useState<CameraFacing>("back");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [boxVariant, setBoxVariant] = useState<BoundingBoxVariant>("corners");
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [liveFps, setLiveFps] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorSource, setErrorSource] = useState<ErrorSource>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const initialThresholdRef = useRef<number>(confidenceThreshold);
  initialThresholdRef.current = confidenceThreshold;

  const isActiveRef = useRef<boolean>(isActive);
  isActiveRef.current = isActive;

  const frameTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    let isCancelled = false;
    let activeInstance: TFLiteObjectDetector | undefined;

    setModelStatus("loading");
    setDetector(undefined);
    setActiveDelegate(null);
    setFallbackInfo(null);
    setErrorMessage(null);
    setErrorSource(null);
    frameTimestampsRef.current = [];
    setLiveFps(0);

    const modelAsset = require("../assets/models/detect.tflite") as number;

    createTFLiteObjectDetector({
      model: modelAsset,
      labels: COCO_91_LABELS,
      labelOffset: MODEL_LABEL_OFFSET,
      inputWidth: MODEL_INPUT_WIDTH,
      inputHeight: MODEL_INPUT_HEIGHT,
      confidenceThreshold: initialThresholdRef.current,
      maxResults: 10,
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
        created.setConfidenceThreshold(initialThresholdRef.current);
        activeInstance = created;
        setDetector(created);
        setActiveDelegate(created.activeDelegate);
        setModelStatus(created.status);
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
            : "Failed to initialize TFLite object detector",
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

  const handleSelectThreshold = useCallback(
    (threshold: number) => {
      initialThresholdRef.current = threshold;
      setConfidenceThreshold(threshold);
      detector?.setConfidenceThreshold(threshold);
    },
    [detector],
  );

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

  const handleToggleBoxVariant = useCallback(() => {
    setBoxVariant((prev) => (prev === "corners" ? "solid" : "corners"));
  }, []);

  const topDetections = detections.slice(0, MAX_SUMMARY_LABELS);

  return (
    <View style={styles.root}>
      <CameraAI
        processor={detector}
        cameraPosition={cameraPosition}
        resizeMode="cover"
        isActive={isActive}
        boxVariant={boxVariant}
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
              <Eye size={16} color={EMERALD_ACCENT} />
            </View>
            <View style={styles.titleTextGroup}>
              <Text style={styles.title}>Camera AI Demo</Text>
              <Text style={styles.subtitle}>
                SSD MobileNet v1 ({MODEL_INPUT_WIDTH}x{MODEL_INPUT_HEIGHT})
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle box style"
              onPress={handleToggleBoxVariant}
              style={({ pressed }) => [
                styles.boxStyleToggle,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.boxStyleToggleText}>
                {boxVariant === "corners" ? "Corners" : "Solid Box"}
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
              <Text style={styles.badgeText}>
                {modelStatus.toUpperCase()}
              </Text>
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
                isActive && liveFps > 0 ? styles.badgeReady : styles.badgeNeutral,
              ]}
            >
              <Text style={styles.badgeText}>
                {isActive ? `${liveFps.toFixed(1)} FPS` : "0.0 FPS"}
              </Text>
            </View>
          </View>

          {fallbackInfo && (
            <Text style={styles.fallbackNote}>
              Delegate fallback: {fallbackInfo.requested} to{" "}
              {fallbackInfo.fallback}
            </Text>
          )}
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
                  accessibilityLabel="Retry model load"
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
                accessibilityLabel="Dismiss error"
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

      {/* Bottom Controls & Detections HUD */}
      <View
        pointerEvents="box-none"
        style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 14 }]}
      >
        <View style={styles.controlCard}>
          {/* Live Detections Summary */}
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>
              Detections ({detections.length})
            </Text>
            <Text style={styles.summaryMeta}>
              {isActive
                ? `Live ${liveFps.toFixed(1)} / ${TARGET_FPS} FPS`
                : "Paused"}
            </Text>
          </View>

          <View style={styles.detectionChipsRow}>
            {topDetections.length > 0 ? (
              topDetections.map((item) => (
                <View key={item.id} style={styles.detectionChip}>
                  <Text style={styles.detectionChipLabel}>{item.label}</Text>
                  <Text style={styles.detectionChipScore}>
                    {Math.round(item.confidence * 100)}%
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyDetectionsText}>
                {isActive
                  ? modelStatus === "ready"
                    ? "No objects above threshold"
                    : "Preparing inference model..."
                  : "Inference paused"}
              </Text>
            )}
          </View>

          {/* Confidence Threshold Presets */}
          <View style={styles.thresholdRow}>
            <View style={styles.thresholdLabelGroup}>
              <SlidersHorizontal size={14} color="#94a3b8" />
              <Text style={styles.thresholdLabel}>Threshold</Text>
            </View>
            <View style={styles.presetButtons}>
              {THRESHOLD_PRESETS.map((preset) => {
                const selected = Math.abs(confidenceThreshold - preset) < 0.01;
                return (
                  <Pressable
                    key={preset}
                    accessibilityRole="button"
                    accessibilityLabel={`Set confidence threshold ${Math.round(preset * 100)} percent`}
                    onPress={() => handleSelectThreshold(preset)}
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
                isActive ? "Pause detection" : "Resume detection"
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
    backgroundColor: "rgba(5, 22, 30, 0.84)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.14)",
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    backgroundColor: "rgba(61, 164, 65, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(61, 164, 65, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextGroup: {
    flex: 1,
  },
  title: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 12,
  },
  boxStyleToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(61, 164, 65, 0.2)",
    borderWidth: 1,
    borderColor: EMERALD_ACCENT,
  },
  boxStyleToggleText: {
    color: "#86efac",
    fontSize: 11,
    fontWeight: "700",
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
  fallbackNote: {
    color: "#cbd5e1",
    fontSize: 11,
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
    backgroundColor: "rgba(5, 22, 30, 0.88)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.14)",
    gap: 12,
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
    minHeight: 26,
    alignItems: "center",
  },
  detectionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(61, 164, 65, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(61, 164, 65, 0.45)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    backgroundColor: EMERALD_ACCENT,
    borderColor: EMERALD_ACCENT,
  },
  presetText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  presetTextSelected: {
    color: "#ffffff",
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
