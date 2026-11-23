import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Eye,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smile,
  SwitchCamera,
  Zap,
} from "lucide-react-native";
import {
  CameraAI,
  type BoundingBoxVariant,
  type CameraAIError,
  type CameraFacing,
  type DetectionResult,
  type FaceLivenessMetrics,
  type ModelStatus,
  type OverlayThemeConfig,
} from "@masumdev/rn-camera-ai";
import {
  createTFLiteFaceRecognizer,
  type TFLiteFaceRecognizer,
} from "@masumdev/rn-camera-ai-tflite";
import { useTheme } from "@masumdev/rn-ui";

const FACE_DETECTOR_MODEL_ASSET = require("../assets/models/face_detection_full_range.tflite");
const FACE_MESH_MODEL_ASSET = require("../assets/models/face_landmark.tflite");

const VIOLET_ACCENT = "#a855f7";
const EMERALD_ACCENT = "#22c55e";
const AMBER_ACCENT = "#f59e0b";
const CYAN_ACCENT = "#38bdf8";

type LivenessScreenMode = "telemetry" | "challenge";
type MeshRenderMode = "full" | "contours" | "dots" | "off";

interface ChallengeStepSpec {
  id: string;
  title: string;
  instruction: string;
}

const CHALLENGE_STEPS: readonly ChallengeStepSpec[] = [
  {
    id: "passive_center",
    title: "1. Verifikasi Pasif 3D & Tatap Lurus",
    instruction:
      "Arahkan wajah lurus ke tengah kamera. Sistem memeriksa relief kedalaman 3D dan tekstur anti-layar.",
  },
  {
    id: "blink_eyes",
    title: "2. Kedipkan Kedua Mata",
    instruction:
      "Kedipkan kedua mata Anda secara alami (Eye Aspect Ratio < 0.20).",
  },
  {
    id: "turn_head",
    title: "3. Tengok Kiri atau Kanan",
    instruction:
      "Putar kepala Anda perlahan ke arah KIRI atau KANAN (3D Head Yaw >= 14°).",
  },
  {
    id: "mouth_expression",
    title: "4. Buka Mulut atau Tersenyum",
    instruction:
      "Buka mulut Anda atau tersenyum lebar untuk menyelesaikan verifikasi e-KYC.",
  },
];

export default function FaceLivenessDetectionScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();

  const [recognizer, setRecognizer] = useState<TFLiteFaceRecognizer | null>(
    null
  );
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [activeDelegate, setActiveDelegate] = useState<"gpu" | "cpu">("gpu");
  const [delegateFallbackNotice, setDelegateFallbackNotice] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cameraPosition, setCameraPosition] = useState<CameraFacing>("front");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [screenMode, setScreenMode] =
    useState<LivenessScreenMode>("telemetry");

  const [meshMode, setMeshMode] = useState<MeshRenderMode>("full");
  const [boxStyleMode, setBoxStyleMode] = useState<"corners" | "solid" | "off">(
    "corners"
  );

  const [fps, setFps] = useState<number>(0);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [liveness, setLiveness] = useState<FaceLivenessMetrics | null>(null);
  const [blinkCount, setBlinkCount] = useState<number>(0);

  // e-KYC 4-step challenge state
  const [challengeStepIndex, setChallengeStepIndex] = useState<number>(0);
  const [challengeCompleted, setChallengeCompleted] = useState<boolean>(false);

  const frameTimestampsRef = useRef<number[]>([]);
  const lastUiSyncTimeRef = useRef<number>(0);
  const wasBlinkingRef = useRef<boolean>(false);
  const stepHoldCountRef = useRef<number>(0);

  const initRecognizer = useCallback(async () => {
    setModelStatus("loading");
    setErrorMessage(null);
    setDelegateFallbackNotice(null);

    try {
      const instance = await createTFLiteFaceRecognizer({
        model: FACE_DETECTOR_MODEL_ASSET,
        faceMeshModel: FACE_MESH_MODEL_ASSET,
        inputWidth: 192,
        inputHeight: 192,
        confidenceThreshold: 0.55,
        enableLiveness: true,
        livenessThreshold: 0.62,
        iouThreshold: 0.3,
        maxResults: 1,
        targetFps: 24,
        useGpu: true,
        onDelegateFallback: (requested, fallback) => {
          setDelegateFallbackNotice(
            `Hardware delegate '${requested}' unavailable — using '${fallback.toUpperCase()}'`
          );
        },
      });

      setRecognizer(instance);
      setActiveDelegate(instance.activeDelegate);
      setModelStatus(instance.status);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to initialize Face Liveness engine";
      setErrorMessage(msg);
      setModelStatus("error");
    }
  }, []);

  useEffect(() => {
    void initRecognizer();
  }, [initRecognizer]);

  useEffect(() => {
    return () => {
      recognizer?.dispose?.();
    };
  }, [recognizer]);

  const handleResetChallenge = useCallback(() => {
    setChallengeStepIndex(0);
    setChallengeCompleted(false);
    stepHoldCountRef.current = 0;
  }, []);

  const handleDetections = useCallback(
    (results: DetectionResult[]) => {
      const now = Date.now();
      const windowStart = now - 1000;
      const updatedTimestamps = frameTimestampsRef.current.filter(
        (t) => t >= windowStart
      );
      updatedTimestamps.push(now);
      frameTimestampsRef.current = updatedTimestamps;

      const primaryFace = results.length > 0 ? results[0] : null;
      const metrics = primaryFace?.liveness ?? null;

      // Track rising edge of eye blink immediately
      if (metrics) {
        if (metrics.isBlinking && !wasBlinkingRef.current) {
          wasBlinkingRef.current = true;
          setBlinkCount((prev) => prev + 1);
        } else if (!metrics.isBlinking && metrics.eyeAspectRatio > 0.215) {
          wasBlinkingRef.current = false;
        }
      }

      // Evaluate e-KYC challenge step progression
      if (screenMode === "challenge" && !challengeCompleted && metrics) {
        if (challengeStepIndex === 0) {
          if (metrics.isLive && metrics.headDirection === "center") {
            stepHoldCountRef.current += 1;
            if (stepHoldCountRef.current >= 4) {
              stepHoldCountRef.current = 0;
              setChallengeStepIndex(1);
            }
          }
        } else if (challengeStepIndex === 1) {
          if (metrics.isBlinking) {
            stepHoldCountRef.current = 0;
            setChallengeStepIndex(2);
          }
        } else if (challengeStepIndex === 2) {
          if (
            metrics.headDirection === "left" ||
            metrics.headDirection === "right"
          ) {
            stepHoldCountRef.current += 1;
            if (stepHoldCountRef.current >= 2) {
              stepHoldCountRef.current = 0;
              setChallengeStepIndex(3);
            }
          }
        } else if (challengeStepIndex === 3) {
          if (metrics.isMouthOpen || metrics.isSmiling) {
            stepHoldCountRef.current += 1;
            if (stepHoldCountRef.current >= 2) {
              stepHoldCountRef.current = 0;
              setChallengeCompleted(true);
            }
          }
        }
      }

      if (now - lastUiSyncTimeRef.current >= 140) {
        lastUiSyncTimeRef.current = now;
        setFps(updatedTimestamps.length);
        setFaceDetected(primaryFace !== null);
        setLiveness(metrics);
      }
    },
    [challengeCompleted, challengeStepIndex, screenMode]
  );

  const handleCameraError = useCallback((error: CameraAIError) => {
    setErrorMessage(`[${error.code}] ${error.message}`);
  }, []);

  const toggleCameraFacing = () => {
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
  };

  const toggleActive = () => {
    setIsActive((prev) => !prev);
  };

  const cycleMeshMode = () => {
    setMeshMode((prev) => {
      if (prev === "full") return "contours";
      if (prev === "contours") return "dots";
      if (prev === "dots") return "off";
      return "full";
    });
  };

  const cycleBoxStyleMode = () => {
    setBoxStyleMode((prev) => {
      if (prev === "corners") return "solid";
      if (prev === "solid") return "off";
      return "corners";
    });
  };

  const meshModeLabel =
    meshMode === "full"
      ? "468 Mesh"
      : meshMode === "contours"
        ? "Contours"
        : meshMode === "dots"
          ? "Dots"
          : "Mesh Off";

  const boxStyleLabel =
    boxStyleMode === "corners"
      ? "Corners"
      : boxStyleMode === "solid"
        ? "Solid"
        : "No Box";

  const resolvedBoxVariant: BoundingBoxVariant =
    boxStyleMode === "solid" ? "solid" : "corners";

  const overlayTheme = useMemo<OverlayThemeConfig>(
    () => ({
      showBoxes: boxStyleMode !== "off",
      boxVariant: resolvedBoxVariant,
      boxColor: liveness?.isLive ? theme.colors.success : theme.colors.warning,
      unrecognizedBoxColor: liveness?.isLive
        ? theme.colors.success
        : theme.colors.warning,
      cornerLength: 26,
      cornerThickness: 3.5,
      boxBorderWidth: 2,
      boxBorderRadius: 10,
      showLabels: true,
      labelPosition: "top-left",
      formatLabel: (detection: DetectionResult) => {
        const lv = detection.liveness;
        if (!lv) {
          return "SCANNING LIVENESS...";
        }
        const pct = Math.round(lv.passiveScore * 100);
        return lv.isLive
          ? `LIVE 3D (${pct}%) · ${lv.headDirection.toUpperCase()}`
          : `SPOOF RISK (${pct}%)`;
      },
      meshStyle: {
        showMeshLines: meshMode === "full" || meshMode === "contours",
        showTesselation: meshMode === "full",
        showDots: meshMode !== "off",
        lineThickness: 1.0,
        faceOvalColor: liveness?.isLive
          ? `${theme.colors.success}d9`
          : `${theme.colors.warning}d9`,
        eyeContourColor: theme.colors.accent,
        eyebrowContourColor: `${theme.colors.info ?? theme.colors.accent}e6`,
        lipOuterContourColor: theme.colors.primary,
        lipInnerContourColor: theme.colors.success,
        noseContourColor: theme.colors.info ?? theme.colors.accent,
        tesselationColor: `${theme.colors.info ?? theme.colors.accent}61`,
      },
    }),
    [boxStyleMode, liveness?.isLive, meshMode, resolvedBoxVariant, theme.colors]
  );

  const passivePct = liveness ? Math.round(liveness.passiveScore * 100) : 0;
  const depthPct = liveness ? Math.round(liveness.depthReliefScore * 100) : 0;
  const texturePct = liveness ? Math.round(liveness.textureScore * 100) : 0;

  return (
    <View style={styles.root}>
      {/* Live Camera Preview + 468 Face Mesh Liveness Overlay */}
      <View style={styles.cameraContainer}>
        <CameraAI
          processor={recognizer ?? undefined}
          cameraPosition={cameraPosition}
          resizeMode="cover"
          isActive={isActive}
          fps={24}
          showLandmarks={meshMode !== "off"}
          overlayTheme={overlayTheme}
          onDetections={handleDetections}
          onError={handleCameraError}
          style={styles.camera}
        />

        {/* Top Telemetry Header HUD */}
        <View style={[styles.topHud, { paddingTop: insets.top + 8 }]}>
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
              <ShieldCheck size={15} color={VIOLET_ACCENT} />
              <Text style={styles.brandTitle}>Liveness &amp; Anti-Spoof</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                modelStatus === "error"
                  ? styles.statusLoading
                  : liveness?.isLive
                    ? styles.statusReady
                    : faceDetected
                      ? styles.statusLoading
                      : styles.statusIdle,
              ]}
            >
              <Text style={styles.statusText}>
                {modelStatus === "loading"
                  ? "LOADING"
                  : modelStatus === "error"
                    ? "ERROR"
                    : !faceDetected
                      ? "NO FACE"
                      : liveness?.isLive
                        ? "LIVE 3D"
                        : "SPOOF RISK"}
              </Text>
            </View>
          </View>

          {/* Mode Switcher: Live Telemetry vs e-KYC Challenge */}
          <View style={styles.modeTabsRow}>
            <Pressable
              onPress={() => setScreenMode("telemetry")}
              style={[
                styles.modeTabButton,
                screenMode === "telemetry" && styles.modeTabButtonActive,
              ]}
            >
              <Eye
                size={13}
                color={screenMode === "telemetry" ? "#d8b4fe" : "#94a3b8"}
              />
              <Text
                style={[
                  styles.modeTabText,
                  screenMode === "telemetry" && styles.modeTabTextActive,
                ]}
              >
                Live Telemetry HUD
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setScreenMode("challenge");
                handleResetChallenge();
              }}
              style={[
                styles.modeTabButton,
                screenMode === "challenge" && styles.modeTabButtonActive,
              ]}
            >
              <ShieldCheck
                size={13}
                color={screenMode === "challenge" ? "#d8b4fe" : "#94a3b8"}
              />
              <Text
                style={[
                  styles.modeTabText,
                  screenMode === "challenge" && styles.modeTabTextActive,
                ]}
              >
                e-KYC Challenge (4 Step)
              </Text>
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricPill}>
              <Zap size={13} color={EMERALD_ACCENT} />
              <Text style={styles.metricText}>{fps} FPS</Text>
            </View>

            <View style={styles.metricPill}>
              <Cpu size={13} color={CYAN_ACCENT} />
              <Text style={styles.metricText}>
                {activeDelegate.toUpperCase()}
              </Text>
            </View>

            <View style={styles.metricPill}>
              <Eye size={13} color="#d8b4fe" />
              <Text style={styles.metricText}>Blinks: {blinkCount}</Text>
            </View>
          </View>

          {delegateFallbackNotice ? (
            <View style={styles.warningBanner}>
              <AlertTriangle size={14} color="#fbbf24" />
              <Text style={styles.warningText}>{delegateFallbackNotice}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <AlertTriangle size={14} color="#f87171" />
              <Text style={styles.errorText} numberOfLines={2}>
                {errorMessage}
              </Text>
              <Pressable onPress={() => void initRecognizer()}>
                <RefreshCw size={14} color="#f8fafc" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Bottom Panel: Either Live Telemetry Inspector OR Interactive e-KYC Challenge */}
      <View
        style={[
          styles.bottomPanel,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        {screenMode === "telemetry" ? (
          <View style={styles.telemetrySection}>
            {/* 1. Passive Anti-Spoofing Score Bar */}
            <View style={styles.passiveCard}>
              <View style={styles.passiveHeaderRow}>
                <View style={styles.passiveTitleGroup}>
                  {liveness?.isLive ? (
                    <ShieldCheck size={16} color={EMERALD_ACCENT} />
                  ) : (
                    <ShieldAlert size={16} color={AMBER_ACCENT} />
                  )}
                  <Text style={styles.passiveTitle}>
                    Passive Anti-Spoofing (Depth + Texture)
                  </Text>
                </View>
                <Text
                  style={[
                    styles.passivePctText,
                    {
                      color: liveness?.isLive ? EMERALD_ACCENT : AMBER_ACCENT,
                    },
                  ]}
                >
                  {passivePct}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(4, passivePct)}%`,
                      backgroundColor: liveness?.isLive
                        ? EMERALD_ACCENT
                        : AMBER_ACCENT,
                    },
                  ]}
                />
              </View>

              <View style={styles.passiveSubRow}>
                <Text style={styles.passiveSubText}>
                  3D Z-Relief: <Text style={styles.subStrong}>{depthPct}%</Text>
                </Text>
                <Text style={styles.passiveSubText}>
                  Anti-Moiré Texture:{" "}
                  <Text style={styles.subStrong}>{texturePct}%</Text>
                </Text>
                <Text style={styles.passiveSubText}>
                  Risk:{" "}
                  <Text
                    style={[
                      styles.subStrong,
                      {
                        color:
                          liveness?.spoofRisk === "low"
                            ? EMERALD_ACCENT
                            : AMBER_ACCENT,
                      },
                    ]}
                  >
                    {(liveness?.spoofRisk ?? "N/A").toUpperCase()}
                  </Text>
                </Text>
              </View>
            </View>

            {/* 2. Active Biometric Signals Grid (EAR, Head Pose, Mouth/Smile) */}
            <View style={styles.activeGridRow}>
              {/* Card A: Eye Blink (EAR) */}
              <View
                style={[
                  styles.signalCard,
                  liveness?.isBlinking && styles.signalCardHighlight,
                ]}
              >
                <View style={styles.signalHeader}>
                  <Eye size={13} color={CYAN_ACCENT} />
                  <Text style={styles.signalLabel}>EYES (EAR)</Text>
                </View>
                <Text style={styles.signalValue}>
                  {liveness ? liveness.eyeAspectRatio.toFixed(2) : "--"}
                </Text>
                <View
                  style={[
                    styles.signalBadge,
                    liveness?.isBlinking
                      ? styles.signalBadgeActive
                      : styles.signalBadgeNeutral,
                  ]}
                >
                  <Text style={styles.signalBadgeText}>
                    {!liveness
                      ? "IDLE"
                      : liveness.isBlinking
                        ? "BLINKED!"
                        : "EYES OPEN"}
                  </Text>
                </View>
              </View>

              {/* Card B: 3D Head Pose (Yaw/Pitch) */}
              <View
                style={[
                  styles.signalCard,
                  liveness &&
                    liveness.headDirection !== "center" &&
                    styles.signalCardHighlight,
                ]}
              >
                <View style={styles.signalHeader}>
                  <RotateCcw size={13} color={VIOLET_ACCENT} />
                  <Text style={styles.signalLabel}>3D HEAD POSE</Text>
                </View>
                <Text style={styles.signalValue}>
                  {liveness
                    ? `${liveness.yawDeg}° / ${liveness.pitchDeg}°`
                    : "--"}
                </Text>
                <View
                  style={[
                    styles.signalBadge,
                    liveness && liveness.headDirection !== "center"
                      ? styles.signalBadgeActive
                      : styles.signalBadgeNeutral,
                  ]}
                >
                  <Text style={styles.signalBadgeText}>
                    {liveness
                      ? `POSE: ${liveness.headDirection.toUpperCase()}`
                      : "IDLE"}
                  </Text>
                </View>
              </View>

              {/* Card C: Mouth & Smile (MAR) */}
              <View
                style={[
                  styles.signalCard,
                  (liveness?.isMouthOpen || liveness?.isSmiling) &&
                    styles.signalCardHighlight,
                ]}
              >
                <View style={styles.signalHeader}>
                  <Smile size={13} color={EMERALD_ACCENT} />
                  <Text style={styles.signalLabel}>MOUTH (MAR)</Text>
                </View>
                <Text style={styles.signalValue}>
                  {liveness ? liveness.mouthAspectRatio.toFixed(2) : "--"}
                </Text>
                <View
                  style={[
                    styles.signalBadge,
                    liveness?.isMouthOpen || liveness?.isSmiling
                      ? styles.signalBadgeActive
                      : styles.signalBadgeNeutral,
                  ]}
                >
                  <Text style={styles.signalBadgeText}>
                    {!liveness
                      ? "IDLE"
                      : liveness.isMouthOpen
                        ? "MOUTH OPEN"
                        : liveness.isSmiling
                          ? "SMILING"
                          : "NEUTRAL"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          /* Interactive 4-Step e-KYC Challenge Wizard */
          <View style={styles.challengeCard}>
            <View style={styles.challengeProgressRow}>
              {CHALLENGE_STEPS.map((step, idx) => {
                const isDone = challengeCompleted || idx < challengeStepIndex;
                const isCurrent =
                  !challengeCompleted && idx === challengeStepIndex;
                return (
                  <View
                    key={step.id}
                    style={[
                      styles.stepDot,
                      isDone && styles.stepDotDone,
                      isCurrent && styles.stepDotCurrent,
                    ]}
                  >
                    <Text style={styles.stepDotText}>{idx + 1}</Text>
                  </View>
                );
              })}
            </View>

            {challengeCompleted ? (
              <View style={styles.verifiedBox}>
                <View style={styles.verifiedHeaderRow}>
                  <CheckCircle2 size={22} color={EMERALD_ACCENT} />
                  <Text style={styles.verifiedTitle}>
                    e-KYC LIVENESS VERIFIED (100% HUMAN)
                  </Text>
                </View>
                <Text style={styles.verifiedSubtitle}>
                  Seluruh uji keaslian Passive 3D Depth, Kedip Mata, Rotasi
                  Kepala 3D, dan Ekspresi Mulut berhasil dilalui.
                </Text>
                <Pressable
                  onPress={handleResetChallenge}
                  style={styles.resetButton}
                >
                  <RotateCcw size={14} color="#f8fafc" />
                  <Text style={styles.resetButtonText}>
                    Ulangi Challenge e-KYC
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.activeChallengeBox}>
                <Text style={styles.challengeStepTitle}>
                  {CHALLENGE_STEPS[challengeStepIndex]?.title}
                </Text>
                <Text style={styles.challengeStepInstruction}>
                  {CHALLENGE_STEPS[challengeStepIndex]?.instruction}
                </Text>
                <View style={styles.challengeLiveFeedbackRow}>
                  <Text style={styles.challengeFeedbackText}>
                    Status Saat Ini:{" "}
                    {!faceDetected
                      ? "Wajah belum terdeteksi di kamera"
                      : `Passive ${passivePct}% · Pose ${liveness?.headDirection.toUpperCase() ?? "CENTER"} · EAR ${liveness?.eyeAspectRatio.toFixed(2) ?? "--"}`}
                  </Text>
                  <Pressable
                    onPress={handleResetChallenge}
                    style={styles.miniResetBtn}
                  >
                    <RotateCcw size={12} color="#cbd5e1" />
                    <Text style={styles.miniResetText}>Reset</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Action Controls Row */}
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={toggleCameraFacing}
            style={styles.actionButton}
          >
            <SwitchCamera size={15} color="#f8fafc" />
            <Text style={styles.actionButtonText}>
              {cameraPosition === "back" ? "Rear" : "Front"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={cycleMeshMode}
            style={[
              styles.actionButton,
              meshMode !== "off" && styles.actionButtonActiveViolet,
            ]}
          >
            <Eye
              size={15}
              color={meshMode !== "off" ? "#d8b4fe" : "#94a3b8"}
            />
            <Text
              style={[
                styles.actionButtonText,
                meshMode !== "off" && styles.actionButtonTextViolet,
              ]}
            >
              {meshModeLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={cycleBoxStyleMode}
            style={[
              styles.actionButton,
              boxStyleMode !== "off" && styles.actionButtonActiveViolet,
            ]}
          >
            <ShieldCheck
              size={15}
              color={boxStyleMode !== "off" ? "#d8b4fe" : "#94a3b8"}
            />
            <Text
              style={[
                styles.actionButtonText,
                boxStyleMode !== "off" && styles.actionButtonTextViolet,
              ]}
            >
              {boxStyleLabel}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={toggleActive}
            style={[
              styles.actionButton,
              !isActive && styles.actionButtonPaused,
            ]}
          >
            {isActive ? (
              <Pause size={15} color="#f8fafc" />
            ) : (
              <Play size={15} color="#f8fafc" />
            )}
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
  cameraContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  topHud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(5, 22, 30, 0.78)",
    gap: 8,
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
  statusIdle: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderColor: "#64748b",
  },
  statusText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  modeTabsRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(11, 32, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
  },
  modeTabButtonActive: {
    backgroundColor: "rgba(168, 85, 247, 0.22)",
    borderColor: VIOLET_ACCENT,
  },
  modeTabText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  modeTabTextActive: {
    color: "#e9d5ff",
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.12)",
  },
  metricText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "600",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(120, 53, 15, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  warningText: {
    color: "#fef3c7",
    fontSize: 11,
    flex: 1,
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
  bottomPanel: {
    backgroundColor: "#0B202A",
    borderTopWidth: 1,
    borderTopColor: "rgba(242, 251, 253, 0.12)",
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
  },
  telemetrySection: {
    gap: 9,
  },
  passiveCard: {
    backgroundColor: "#05161E",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    gap: 6,
  },
  passiveHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passiveTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  passiveTitle: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  passivePctText: {
    fontSize: 14,
    fontWeight: "800",
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  passiveSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  passiveSubText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
  },
  subStrong: {
    color: "#e2e8f0",
    fontWeight: "800",
  },
  activeGridRow: {
    flexDirection: "row",
    gap: 8,
  },
  signalCard: {
    flex: 1,
    backgroundColor: "#05161E",
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    alignItems: "center",
    gap: 4,
  },
  signalCardHighlight: {
    borderColor: VIOLET_ACCENT,
    backgroundColor: "rgba(168, 85, 247, 0.14)",
  },
  signalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signalLabel: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  signalValue: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  signalBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  signalBadgeNeutral: {
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },
  signalBadgeActive: {
    backgroundColor: "rgba(168, 85, 247, 0.35)",
  },
  signalBadgeText: {
    color: "#e2e8f0",
    fontSize: 9,
    fontWeight: "800",
  },
  challengeCard: {
    backgroundColor: "#05161E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.4)",
    gap: 10,
  },
  challengeProgressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotCurrent: {
    backgroundColor: "rgba(168, 85, 247, 0.3)",
    borderColor: VIOLET_ACCENT,
  },
  stepDotDone: {
    backgroundColor: "rgba(34, 197, 94, 0.3)",
    borderColor: EMERALD_ACCENT,
  },
  stepDotText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
  },
  activeChallengeBox: {
    gap: 6,
  },
  challengeStepTitle: {
    color: "#e9d5ff",
    fontSize: 14,
    fontWeight: "800",
  },
  challengeStepInstruction: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 17,
  },
  challengeLiveFeedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  challengeFeedbackText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
    flex: 1,
  },
  miniResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },
  miniResetText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700",
  },
  verifiedBox: {
    gap: 7,
    alignItems: "center",
  },
  verifiedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  verifiedTitle: {
    color: "#86efac",
    fontSize: 13,
    fontWeight: "800",
  },
  verifiedSubtitle: {
    color: "#cbd5e1",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: VIOLET_ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 7,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#05161E",
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
  actionButtonActiveViolet: {
    borderColor: VIOLET_ACCENT,
    backgroundColor: "rgba(168, 85, 247, 0.16)",
  },
  actionButtonTextViolet: {
    color: "#e9d5ff",
  },
  actionButtonPaused: {
    backgroundColor: "rgba(168, 85, 247, 0.28)",
    borderColor: VIOLET_ACCENT,
  },
  actionButtonText: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
  },
});
