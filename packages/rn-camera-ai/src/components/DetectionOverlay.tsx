import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import {
  transformNormalizedPointToPixel,
  transformNormalizedToPixelBox,
} from '../math/transforms';
import type {
  BoundingBoxVariant,
  DetectionResult,
  FaceMeshStyleConfig,
  FrameOrientation,
  LabelBadgePosition,
  OverlayFrameMeta,
  OverlayThemeConfig,
  PixelBoundingBox,
  PixelFaceLandmark,
  RenderBoxParams,
  RenderLabelParams,
  RenderLandmarkDotParams,
  StreamDimensions,
  TransformOptions,
  ViewDimensions,
} from '../types/contracts';

/**
 * Pre-computed screen-space geometry for a single mesh line segment,
 * calculated on the Background Camera Worklet Thread.
 */
export interface ProjectedMeshSegment {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  angleRad: number;
}

/**
 * Pre-computed screen-space geometry for a single landmark dot,
 * calculated on the Background Camera Worklet Thread.
 */
export interface ProjectedMeshDot {
  key: string;
  point: PixelFaceLandmark;
  index: number;
  left: number;
  top: number;
  size: number;
  radius: number;
  color: string;
  borderWidth: number;
}

/**
 * Pre-computed screen-space geometry for a single detection (box, corners, mesh segments, dots),
 * calculated on the Background Camera Worklet Thread so the JS Thread performs 0 coordinate math.
 */
export interface ProjectedDetectionItem {
  detection: DetectionResult;
  index: number;
  pixelBox: PixelBoundingBox;
  effectiveBoxColor: string;
  formattedText: string;
  armW: number;
  armH: number;
  isDenseFaceMesh: boolean;
  meshSegments: ProjectedMeshSegment[];
  meshDots: ProjectedMeshDot[];
}

/**
 * Worklet-safe resolved styling configuration used to pre-compute overlay geometry on the Worklet Thread.
 */
export interface WorkletOverlayConfig {
  boxColor: string;
  unrecognizedBoxColor: string;
  cornerLength: number;
  showConfidence: boolean;
  showLandmarks: boolean;
  showMeshLines: boolean;
  showTesselation: boolean;
  showDots: boolean;
  lineScale: number;
  tesselationColor: string;
  faceOvalColor: string;
  eyeContourColor: string;
  eyebrowContourColor: string;
  lipOuterContourColor: string;
  lipInnerContourColor: string;
  noseContourColor: string;
  eyeDotColor: string;
  denseMeshDotColor: string;
  landmarkColor: string;
  eyeDotRadius: number;
  denseMeshDotRadius: number;
  keypointDotRadius: number;
}

export interface DetectionOverlayProps {
  /** Array of detections for standard rendering */
  detections?: DetectionResult[];
  /** Pre-projected overlay geometry computed directly on the Background Camera Worklet Thread (0 JS math) */
  projectedDetections?: ProjectedDetectionItem[];
  /** Optional Reanimated SharedValue for bounding-box UI-thread overlay rendering */
  detectionsSharedValue?: SharedValue<DetectionResult[]>;
  /** Optional Reanimated SharedValue holding dynamic stream dimensions and mirroring state */
  frameMetaSharedValue?: SharedValue<OverlayFrameMeta>;
  /** Optional pre-formatted label strings corresponding to active detections */
  activeLabels?: readonly string[];
  /** Measured container view dimensions */
  viewDimensions: ViewDimensions;
  /** Effective stream resolution */
  streamDimensions?: StreamDimensions;
  /** Video resize mode ('cover' or 'contain') */
  resizeMode?: 'cover' | 'contain';
  /** Whether the stream is horizontally mirrored (front camera) */
  isMirrored?: boolean;
  /** Camera frame orientation */
  orientation?: FrameOrientation;
  /** Whether to render bounding boxes around detections (default: true) */
  showBoxes?: boolean;
  /** Bounding box visual style: 'solid', 'corners', or 'dashed' (default: 'solid') */
  boxVariant?: BoundingBoxVariant;
  /** Primary bounding box border and badge accent color (default: '#3da441') */
  boxColor?: string;
  /** Bounding box color for unrecognized faces when identity matching is active (default: '#f59e0b') */
  unrecognizedBoxColor?: string;
  /** Optional translucent background fill inside bounding box */
  boxBackgroundColor?: string;
  /** Bounding box border width in pixels (default: 2) */
  boxBorderWidth?: number;
  /** Bounding box border radius in pixels (default: 8) */
  boxBorderRadius?: number;
  /** Corner bracket arm length in pixels when boxVariant === 'corners' (default: 22) */
  cornerLength?: number;
  /** Corner bracket thickness in pixels when boxVariant === 'corners' (default: 3) */
  cornerThickness?: number;
  /** Custom ViewStyle applied to each bounding box container */
  boxStyle?: StyleProp<ViewStyle>;
  /** Facial landmark dot color (default: '#38bdf8') */
  landmarkColor?: string;
  /** Custom ViewStyle applied to each landmark dot */
  landmarkStyle?: StyleProp<ViewStyle>;
  /** Whether to show class/identity label badges (default: true) */
  showLabels?: boolean;
  /** Whether to show confidence percentage in label badges (default: true) */
  showConfidence?: boolean;
  /** Anchor position of the label badge relative to the bounding box (default: 'top-left') */
  labelPosition?: LabelBadgePosition;
  /** Override label badge background color */
  labelBackgroundColor?: string;
  /** Override label badge text color (default: '#ffffff') */
  labelTextColor?: string;
  /** Custom ViewStyle applied to the label badge container */
  labelStyle?: StyleProp<ViewStyle>;
  /** Custom TextStyle applied to the label badge text */
  labelTextStyle?: StyleProp<TextStyle>;
  /** Custom label text formatter */
  formatLabel?: (detection: DetectionResult) => string;
  /** Whether to render facial landmark dots & face mesh when present on detections (default: true) */
  showLandmarks?: boolean;
  /** Whether to render connected 468-point Face Mesh contour lines (default: true) */
  showMeshLines?: boolean;
  /** Whether to render interior 468-point Face Mesh triangle tesselation grid (default: true) */
  showTesselation?: boolean;
  /** Fine-grained landmark dot & 468-point Face Mesh styling */
  meshStyle?: FaceMeshStyleConfig;
  /** Unified declarative overlay theme configuration */
  overlayTheme?: OverlayThemeConfig;
  /** Custom per-detection bounding box renderer receiving pre-projected screen pixel coordinates */
  renderBox?: (params: RenderBoxParams) => React.ReactNode;
  /** Custom per-detection label badge renderer receiving pre-projected screen pixel coordinates */
  renderLabel?: (params: RenderLabelParams) => React.ReactNode;
  /** Custom per-landmark dot renderer receiving pre-projected screen pixel coordinates */
  renderLandmarkDot?: (params: RenderLandmarkDotParams) => React.ReactNode;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

const MAX_ANIMATED_BOXES = 5;
const LANDMARK_DOT_RADIUS = 3.5;
const MESH_DOT_RADIUS = 1.8;

/**
 * Canonical MediaPipe 468-Point Face Mesh contour polylines and tesselation edges.
 */
const FACE_OVAL_INDICES: readonly number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109, 10,
];

const LEFT_EYE_INDICES: readonly number[] = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33,
];

const RIGHT_EYE_INDICES: readonly number[] = [
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263,
];

const LEFT_EYEBROW_INDICES: readonly number[] = [
  46, 53, 52, 65, 55, 107, 66, 105, 63, 70, 46,
];

const RIGHT_EYEBROW_INDICES: readonly number[] = [
  276, 283, 282, 295, 285, 336, 296, 334, 293, 300, 276,
];

const LIPS_OUTER_INDICES: readonly number[] = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37,
  39, 40, 185, 61,
];

const LIPS_INNER_INDICES: readonly number[] = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82,
  81, 80, 191, 78,
];

const NOSE_BRIDGE_INDICES: readonly number[] = [168, 6, 197, 195, 5, 4, 1, 19, 94, 2];
const NOSE_BOTTOM_INDICES: readonly number[] = [98, 97, 2, 326, 327];

/**
 * Interior facial triangulation web edges connecting forehead, cheeks, eyes, nose, and jaw.
 */
const TESSELATION_EDGES: readonly [number, number][] = [
  [10, 151], [151, 9], [9, 168],
  [109, 151], [338, 151], [67, 105], [297, 334],
  [105, 9], [334, 9], [55, 168], [285, 168],
  [168, 133], [168, 362], [6, 133], [6, 362],
  [133, 195], [362, 195], [133, 98], [362, 327],
  [33, 234], [263, 454], [70, 234], [300, 454],
  [33, 50], [145, 50], [133, 50], [50, 234], [50, 93], [50, 98], [50, 205],
  [263, 280], [374, 280], [362, 280], [280, 454], [280, 323], [280, 327], [280, 425],
  [205, 98], [205, 61], [205, 58], [205, 132],
  [425, 327], [425, 291], [425, 288], [425, 361],
  [4, 98], [4, 327], [98, 61], [327, 291], [2, 0],
  [61, 172], [61, 136], [84, 150], [17, 152], [314, 379], [291, 365], [291, 397],
];

const KEY_MESH_VERTEX_INDICES: readonly number[] = [
  // Eyes (first 12 indices)
  33, 133, 159, 145, 158, 153, 263, 362, 386, 374, 385, 380,
  // Eyebrows
  70, 63, 105, 66, 107, 55, 300, 293, 334, 296, 336, 285,
  // Nose
  168, 6, 195, 4, 1, 2, 98, 327,
  // Lips
  61, 185, 40, 37, 0, 267, 270, 291, 375, 321, 314, 17, 84, 181, 91, 146,
  13, 14, 78, 308,
  // Face oval & cheeks
  10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149,
  176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454, 356, 389,
  251, 284, 332, 297, 338, 151, 9, 50, 280, 205, 425,
];

function appendProjectedPolyline(
  target: ProjectedMeshSegment[],
  points: PixelFaceLandmark[],
  indices: readonly number[],
  prefix: string,
  color: string,
  thickness: number
): void {
  'worklet';
  for (let i = 0; i < indices.length - 1; i++) {
    const a = points[indices[i]];
    const b = points[indices[i + 1]];
    if (a && b) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len >= 0.5) {
        const angleRad = Math.atan2(dy, dx);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        target.push({
          key: `${prefix}-${i}`,
          left: midX - len / 2,
          top: midY - thickness / 2,
          width: len,
          height: thickness,
          color,
          angleRad,
        });
      }
    }
  }
}

/**
 * Worklet function that projects all detections, 468-Point Face Mesh contour polylines,
 * tesselation edges, and landmark dots into screen-space pixel coordinates directly on
 * the Background Camera Worklet Thread (0 JS Thread math).
 */
export function projectDetectionsWorklet(
  detections: DetectionResult[],
  transformOptions: TransformOptions,
  config: WorkletOverlayConfig
): ProjectedDetectionItem[] {
  'worklet';
  const projected: ProjectedDetectionItem[] = [];

  for (let detIndex = 0; detIndex < detections.length; detIndex++) {
    const detection = detections[detIndex];
    const pixelBox = transformNormalizedToPixelBox(detection.boundingBox, transformOptions);
    const isRecognizedIdentity = detection.identity?.isRecognized === true;
    const effectiveBoxColor =
      detection.identity !== undefined && !isRecognizedIdentity
        ? config.unrecognizedBoxColor
        : config.boxColor;

    const formattedText = `${detection.label}${
      config.showConfidence ? ` ${Math.round(detection.confidence * 100)}%` : ''
    }`;

    const landmarks = detection.landmarks;
    const isDenseFaceMesh = Array.isArray(landmarks) && landmarks.length >= 468;

    const meshSegments: ProjectedMeshSegment[] = [];
    const meshDots: ProjectedMeshDot[] = [];

    if (config.showLandmarks && Array.isArray(landmarks) && landmarks.length > 0) {
      const pixelPoints: PixelFaceLandmark[] = new Array(landmarks.length);
      for (let p = 0; p < landmarks.length; p++) {
        pixelPoints[p] = transformNormalizedPointToPixel(landmarks[p], transformOptions);
      }

      if (isDenseFaceMesh) {
        if (config.showMeshLines && config.showTesselation) {
          const tessThickness = Math.max(0.8, 1 * config.lineScale);
          for (let e = 0; e < TESSELATION_EDGES.length; e++) {
            const edge = TESSELATION_EDGES[e];
            const ptA = pixelPoints[edge[0]];
            const ptB = pixelPoints[edge[1]];
            if (ptA && ptB) {
              const dx = ptB.x - ptA.x;
              const dy = ptB.y - ptA.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len >= 0.5) {
                const angleRad = Math.atan2(dy, dx);
                const midX = (ptA.x + ptB.x) / 2;
                const midY = (ptA.y + ptB.y) / 2;
                meshSegments.push({
                  key: `tess-${e}`,
                  left: midX - len / 2,
                  top: midY - tessThickness / 2,
                  width: len,
                  height: tessThickness,
                  color: config.tesselationColor,
                  angleRad,
                });
              }
            }
          }
        }

        if (config.showMeshLines) {
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            FACE_OVAL_INDICES,
            'oval',
            config.faceOvalColor,
            1.5 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            LEFT_EYE_INDICES,
            'leye',
            config.eyeContourColor,
            1.8 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            RIGHT_EYE_INDICES,
            'reye',
            config.eyeContourColor,
            1.8 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            LEFT_EYEBROW_INDICES,
            'lbrow',
            config.eyebrowContourColor,
            1.4 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            RIGHT_EYEBROW_INDICES,
            'rbrow',
            config.eyebrowContourColor,
            1.4 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            LIPS_OUTER_INDICES,
            'lipout',
            config.lipOuterContourColor,
            1.6 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            LIPS_INNER_INDICES,
            'lipin',
            config.lipInnerContourColor,
            1.2 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            NOSE_BRIDGE_INDICES,
            'noseb',
            config.noseContourColor,
            1.5 * config.lineScale
          );
          appendProjectedPolyline(
            meshSegments,
            pixelPoints,
            NOSE_BOTTOM_INDICES,
            'noset',
            config.noseContourColor,
            1.5 * config.lineScale
          );
        }

        if (config.showDots) {
          for (let k = 0; k < KEY_MESH_VERTEX_INDICES.length; k++) {
            const idx = KEY_MESH_VERTEX_INDICES[k];
            const pt = pixelPoints[idx];
            if (pt) {
              const isEyeVertex = k < 12;
              const radius = isEyeVertex ? config.eyeDotRadius : config.denseMeshDotRadius;
              meshDots.push({
                key: `${detection.id}-mesh-pt-${idx}`,
                point: pt,
                index: idx,
                left: pt.x - radius,
                top: pt.y - radius,
                size: radius * 2,
                radius,
                color: isEyeVertex ? config.eyeDotColor : config.denseMeshDotColor,
                borderWidth: 0,
              });
            }
          }
        }
      } else if (config.showDots) {
        for (let lmIdx = 0; lmIdx < pixelPoints.length; lmIdx++) {
          const pt = pixelPoints[lmIdx];
          const radius = config.keypointDotRadius;
          meshDots.push({
            key: `${detection.id}-lm-${pt.type ?? lmIdx}`,
            point: pt,
            index: lmIdx,
            left: pt.x - radius,
            top: pt.y - radius,
            size: radius * 2,
            radius,
            color: config.landmarkColor,
            borderWidth: 1,
          });
        }
      }
    }

    const armW = Math.max(8, Math.min(config.cornerLength, pixelBox.width / 2));
    const armH = Math.max(8, Math.min(config.cornerLength, pixelBox.height / 2));

    projected.push({
      detection,
      index: detIndex,
      pixelBox,
      effectiveBoxColor,
      formattedText,
      armW,
      armH,
      isDenseFaceMesh,
      meshSegments,
      meshDots,
    });
  }

  return projected;
}

function getLabelPositionStyle(
  position: LabelBadgePosition,
  pixelBox: PixelBoundingBox
): ViewStyle {
  const clampLeft = pixelBox.x < 8 ? Math.max(-2, 8 - pixelBox.x) : -2;
  const clampTop = pixelBox.y < 8 ? Math.max(-2, 8 - pixelBox.y) : -2;

  switch (position) {
    case 'top-right':
      return {
        alignSelf: 'flex-end',
        marginTop: clampTop,
        marginRight: -2,
      };
    case 'bottom-left':
      return {
        position: 'absolute',
        bottom: -2,
        left: clampLeft,
      };
    case 'bottom-right':
      return {
        position: 'absolute',
        bottom: -2,
        right: -2,
      };
    case 'inside-top':
      return {
        alignSelf: 'flex-start',
        marginTop: 6,
        marginLeft: 6,
      };
    case 'top-left':
    default:
      return {
        alignSelf: 'flex-start',
        marginTop: clampTop,
        marginLeft: clampLeft,
      };
  }
}

interface AnimatedDetectionBoxProps {
  index: number;
  sharedValue: SharedValue<DetectionResult[]>;
  frameMetaSharedValue?: SharedValue<OverlayFrameMeta>;
  labelText?: string;
  viewWidth: number;
  viewHeight: number;
  fallbackStreamWidth: number;
  fallbackStreamHeight: number;
  resizeMode: 'cover' | 'contain';
  fallbackMirrored: boolean;
  fallbackOrientation: FrameOrientation;
  showBoxes: boolean;
  boxVariant: BoundingBoxVariant;
  boxColor: string;
  unrecognizedBoxColor: string;
  boxBackgroundColor?: string;
  boxBorderWidth: number;
  boxBorderRadius: number;
  cornerLength: number;
  cornerThickness: number;
  boxStyle?: StyleProp<ViewStyle>;
  showLabels: boolean;
  labelPosition: LabelBadgePosition;
  labelBackgroundColor?: string;
  labelTextColor: string;
  labelStyle?: StyleProp<ViewStyle>;
  labelTextStyle?: StyleProp<TextStyle>;
}

const AnimatedDetectionBox: React.FC<AnimatedDetectionBoxProps> = ({
  index,
  sharedValue,
  frameMetaSharedValue,
  labelText,
  viewWidth,
  viewHeight,
  fallbackStreamWidth,
  fallbackStreamHeight,
  resizeMode,
  fallbackMirrored,
  fallbackOrientation,
  showBoxes,
  boxVariant,
  boxColor,
  unrecognizedBoxColor,
  boxBackgroundColor,
  boxBorderWidth,
  boxBorderRadius,
  cornerLength,
  cornerThickness,
  boxStyle,
  showLabels,
  labelPosition,
  labelBackgroundColor,
  labelTextColor,
  labelStyle,
  labelTextStyle,
}) => {
  const isSolidOrDashed =
    showBoxes && (boxVariant === 'solid' || boxVariant === 'dashed');
  const isCornersMode = showBoxes && boxVariant === 'corners';

  const boxAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const list = sharedValue.value;
    const item = list && list[index];

    if (!item || !item.boundingBox) {
      return {
        opacity: 0,
      };
    }

    const meta = frameMetaSharedValue ? frameMetaSharedValue.value : undefined;
    const streamW = meta && meta.streamWidth > 0 ? meta.streamWidth : fallbackStreamWidth;
    const streamH = meta && meta.streamHeight > 0 ? meta.streamHeight : fallbackStreamHeight;
    const mirrored = meta ? meta.isMirrored : fallbackMirrored;
    const orient = meta ? meta.orientation : fallbackOrientation;

    const pixelBox = transformNormalizedToPixelBox(item.boundingBox, {
      viewDimensions: { width: viewWidth, height: viewHeight },
      streamDimensions: { width: streamW, height: streamH },
      resizeMode,
      isMirrored: mirrored,
      orientation: orient,
    });

    const isRecognized = item.identity?.isRecognized === true;
    const effectiveColor =
      item.identity !== undefined && !isRecognized ? unrecognizedBoxColor : boxColor;

    return {
      opacity: 1,
      left: pixelBox.x,
      top: pixelBox.y,
      width: pixelBox.width,
      height: pixelBox.height,
      borderColor: effectiveColor,
      borderWidth: isSolidOrDashed ? boxBorderWidth : 0,
      borderRadius: boxBorderRadius,
    };
  });

  const resolvedText = labelText ?? '';
  const StaticPosStyle: ViewStyle =
    labelPosition === 'top-right'
      ? { alignSelf: 'flex-end', marginTop: -2, marginRight: -2 }
      : labelPosition === 'bottom-left'
        ? { position: 'absolute', bottom: -2, left: -2 }
        : labelPosition === 'bottom-right'
          ? { position: 'absolute', bottom: -2, right: -2 }
          : labelPosition === 'inside-top'
            ? { alignSelf: 'flex-start', marginTop: 6, marginLeft: 6 }
            : { alignSelf: 'flex-start', marginTop: -2, marginLeft: -2 };

  return (
    <Animated.View
      style={[
        styles.box,
        {
          borderStyle: boxVariant === 'dashed' ? 'dashed' : 'solid',
          backgroundColor: boxBackgroundColor,
        },
        boxStyle,
        boxAnimatedStyle,
      ]}
      pointerEvents="none"
    >
      {isCornersMode && (
        <>
          <View
            style={[
              styles.cornerArm,
              {
                top: 0,
                left: 0,
                width: cornerLength,
                height: cornerLength,
                borderColor: boxColor,
                borderTopWidth: cornerThickness,
                borderLeftWidth: cornerThickness,
                borderTopLeftRadius: boxBorderRadius,
              },
            ]}
          />
          <View
            style={[
              styles.cornerArm,
              {
                top: 0,
                right: 0,
                width: cornerLength,
                height: cornerLength,
                borderColor: boxColor,
                borderTopWidth: cornerThickness,
                borderRightWidth: cornerThickness,
                borderTopRightRadius: boxBorderRadius,
              },
            ]}
          />
          <View
            style={[
              styles.cornerArm,
              {
                bottom: 0,
                left: 0,
                width: cornerLength,
                height: cornerLength,
                borderColor: boxColor,
                borderBottomWidth: cornerThickness,
                borderLeftWidth: cornerThickness,
                borderBottomLeftRadius: boxBorderRadius,
              },
            ]}
          />
          <View
            style={[
              styles.cornerArm,
              {
                bottom: 0,
                right: 0,
                width: cornerLength,
                height: cornerLength,
                borderColor: boxColor,
                borderBottomWidth: cornerThickness,
                borderRightWidth: cornerThickness,
                borderBottomRightRadius: boxBorderRadius,
              },
            ]}
          />
        </>
      )}
      {showLabels && resolvedText.length > 0 && (
        <View
          style={[
            styles.labelBadge,
            StaticPosStyle,
            { backgroundColor: labelBackgroundColor ?? boxColor },
            labelStyle,
          ]}
        >
          <Text
            style={[
              styles.labelText,
              { color: labelTextColor },
              labelTextStyle,
            ]}
          >
            {resolvedText}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  projectedDetections,
  detectionsSharedValue,
  frameMetaSharedValue,
  activeLabels,
  viewDimensions,
  streamDimensions,
  resizeMode = 'cover',
  isMirrored = false,
  orientation = 'portrait',
  showBoxes,
  boxVariant,
  boxColor,
  unrecognizedBoxColor,
  boxBackgroundColor,
  boxBorderWidth,
  boxBorderRadius,
  cornerLength,
  cornerThickness,
  boxStyle,
  landmarkColor,
  landmarkStyle,
  showLabels,
  showConfidence,
  labelPosition,
  labelBackgroundColor,
  labelTextColor,
  labelStyle,
  labelTextStyle,
  formatLabel,
  showLandmarks = true,
  showMeshLines,
  showTesselation,
  meshStyle,
  overlayTheme,
  renderBox,
  renderLabel,
  renderLandmarkDot,
  style,
}) => {
  if (viewDimensions.width <= 0 || viewDimensions.height <= 0) {
    return null;
  }

  const resolvedShowBoxes = showBoxes ?? overlayTheme?.showBoxes ?? true;
  const resolvedBoxVariant: BoundingBoxVariant =
    boxVariant ?? overlayTheme?.boxVariant ?? 'solid';
  const resolvedBoxColor = boxColor ?? overlayTheme?.boxColor ?? '#3da441';
  const resolvedUnrecognizedColor =
    unrecognizedBoxColor ?? overlayTheme?.unrecognizedBoxColor ?? '#f59e0b';
  const resolvedBoxBg = boxBackgroundColor ?? overlayTheme?.boxBackgroundColor;
  const resolvedBoxBorderWidth = boxBorderWidth ?? overlayTheme?.boxBorderWidth ?? 2;
  const resolvedBoxBorderRadius = boxBorderRadius ?? overlayTheme?.boxBorderRadius ?? 8;
  const resolvedCornerLength = cornerLength ?? overlayTheme?.cornerLength ?? 22;
  const resolvedCornerThickness = cornerThickness ?? overlayTheme?.cornerThickness ?? 3;
  const resolvedBoxStyle = boxStyle ?? overlayTheme?.boxStyle;

  const resolvedShowLabels = showLabels ?? overlayTheme?.showLabels ?? true;
  const resolvedShowConfidence = showConfidence ?? overlayTheme?.showConfidence ?? true;
  const resolvedLabelPosition: LabelBadgePosition =
    labelPosition ?? overlayTheme?.labelPosition ?? 'top-left';
  const resolvedLabelBg = labelBackgroundColor ?? overlayTheme?.labelBackgroundColor;
  const resolvedLabelTextColor = labelTextColor ?? overlayTheme?.labelTextColor ?? '#ffffff';
  const resolvedLabelStyle = labelStyle ?? overlayTheme?.labelStyle;
  const resolvedLabelTextStyle = labelTextStyle ?? overlayTheme?.labelTextStyle;
  const resolvedFormatLabel = formatLabel ?? overlayTheme?.formatLabel;

  const resolvedMeshConfig: FaceMeshStyleConfig | undefined =
    meshStyle ?? overlayTheme?.meshStyle;
  const resolvedShowMeshLines =
    showMeshLines ?? resolvedMeshConfig?.showMeshLines ?? true;
  const resolvedShowTesselation =
    showTesselation ?? resolvedMeshConfig?.showTesselation ?? true;
  const resolvedShowDots = resolvedMeshConfig?.showDots ?? true;
  const resolvedLandmarkColor =
    landmarkColor ?? resolvedMeshConfig?.dotColor ?? '#38bdf8';
  const resolvedLandmarkStyle = landmarkStyle ?? overlayTheme?.landmarkStyle;

  const lineScale = resolvedMeshConfig?.lineThickness ?? 1.0;
  const tesselationColor =
    resolvedMeshConfig?.tesselationColor ?? 'rgba(56, 189, 248, 0.42)';
  const faceOvalColor =
    resolvedMeshConfig?.faceOvalColor ?? 'rgba(56, 189, 248, 0.75)';
  const eyeContourColor = resolvedMeshConfig?.eyeContourColor ?? '#22d3ee';
  const eyebrowContourColor =
    resolvedMeshConfig?.eyebrowContourColor ?? 'rgba(125, 211, 252, 0.85)';
  const lipOuterContourColor = resolvedMeshConfig?.lipOuterContourColor ?? '#34d399';
  const lipInnerContourColor = resolvedMeshConfig?.lipInnerContourColor ?? '#6ee7b7';
  const noseContourColor = resolvedMeshConfig?.noseContourColor ?? '#38bdf8';
  const eyeDotColor = resolvedMeshConfig?.eyeDotColor ?? '#22d3ee';
  const denseMeshDotColor = resolvedMeshConfig?.dotColor ?? '#e0f2fe';
  const eyeDotRadius = resolvedMeshConfig?.eyeDotRadius ?? 2.4;
  const denseMeshDotRadius = resolvedMeshConfig?.dotRadius ?? MESH_DOT_RADIUS;
  const keypointDotRadius = resolvedMeshConfig?.dotRadius ?? LANDMARK_DOT_RADIUS;

  const effectiveStream: StreamDimensions = streamDimensions ?? {
    width: viewDimensions.width,
    height: viewDimensions.height,
  };

  // Explicit SharedValue box mode (when caller passes detectionsSharedValue directly)
  if (detectionsSharedValue && !projectedDetections && !detections) {
    const boxIndices = Array.from({ length: MAX_ANIMATED_BOXES }, (_, i) => i);

    return (
      <View style={[StyleSheet.absoluteFill, styles.container, style]} pointerEvents="none">
        {boxIndices.map((i) => (
          <AnimatedDetectionBox
            key={`ui-box-${i}`}
            index={i}
            sharedValue={detectionsSharedValue}
            frameMetaSharedValue={frameMetaSharedValue}
            labelText={activeLabels ? activeLabels[i] : undefined}
            viewWidth={viewDimensions.width}
            viewHeight={viewDimensions.height}
            fallbackStreamWidth={effectiveStream.width}
            fallbackStreamHeight={effectiveStream.height}
            resizeMode={resizeMode}
            fallbackMirrored={isMirrored}
            fallbackOrientation={orientation}
            showBoxes={resolvedShowBoxes}
            boxVariant={resolvedBoxVariant}
            boxColor={resolvedBoxColor}
            unrecognizedBoxColor={resolvedUnrecognizedColor}
            boxBackgroundColor={resolvedBoxBg}
            boxBorderWidth={resolvedBoxBorderWidth}
            boxBorderRadius={resolvedBoxBorderRadius}
            cornerLength={resolvedCornerLength}
            cornerThickness={resolvedCornerThickness}
            boxStyle={resolvedBoxStyle}
            showLabels={resolvedShowLabels}
            labelPosition={resolvedLabelPosition}
            labelBackgroundColor={resolvedLabelBg}
            labelTextColor={resolvedLabelTextColor}
            labelStyle={resolvedLabelStyle}
            labelTextStyle={resolvedLabelTextStyle}
          />
        ))}
      </View>
    );
  }

  // Use pre-projected geometry from Background Camera Worklet Thread if available (0 JS math!),
  // otherwise compute projection on demand for static / SSR usage
  const items: ProjectedDetectionItem[] =
    projectedDetections ??
    (detections && detections.length > 0
      ? projectDetectionsWorklet(
          detections,
          {
            viewDimensions,
            streamDimensions: effectiveStream,
            resizeMode,
            isMirrored,
            orientation,
          },
          {
            boxColor: resolvedBoxColor,
            unrecognizedBoxColor: resolvedUnrecognizedColor,
            cornerLength: resolvedCornerLength,
            showConfidence: resolvedShowConfidence,
            showLandmarks,
            showMeshLines: resolvedShowMeshLines,
            showTesselation: resolvedShowTesselation,
            showDots: resolvedShowDots,
            lineScale,
            tesselationColor,
            faceOvalColor,
            eyeContourColor,
            eyebrowContourColor,
            lipOuterContourColor,
            lipInnerContourColor,
            noseContourColor,
            eyeDotColor,
            denseMeshDotColor,
            landmarkColor: resolvedLandmarkColor,
            eyeDotRadius,
            denseMeshDotRadius,
            keypointDotRadius,
          }
        )
      : []);

  if (items.length === 0) {
    return null;
  }

  const isCornersMode = resolvedShowBoxes && resolvedBoxVariant === 'corners';
  const isSolidOrDashed =
    resolvedShowBoxes &&
    (resolvedBoxVariant === 'solid' || resolvedBoxVariant === 'dashed');

  return (
    <View style={[StyleSheet.absoluteFill, styles.container, style]} pointerEvents="none">
      {items.map((item) => {
        const {
          detection,
          index: detIndex,
          pixelBox,
          effectiveBoxColor,
          armW,
          armH,
          isDenseFaceMesh,
          meshSegments,
          meshDots,
        } = item;

        const formattedText = resolvedFormatLabel
          ? resolvedFormatLabel(detection)
          : item.formattedText;

        const labelNode = renderLabel ? (
          renderLabel({
            detection,
            pixelBox,
            index: detIndex,
            color: effectiveBoxColor,
            formattedText,
          })
        ) : resolvedShowLabels ? (
          <View
            style={[
              styles.labelBadge,
              getLabelPositionStyle(resolvedLabelPosition, pixelBox),
              {
                backgroundColor: resolvedLabelBg ?? effectiveBoxColor,
              },
              resolvedLabelStyle,
            ]}
          >
            <Text
              style={[
                styles.labelText,
                { color: resolvedLabelTextColor },
                resolvedLabelTextStyle,
              ]}
            >
              {formattedText}
            </Text>
          </View>
        ) : null;

        return (
          <React.Fragment key={detection.id}>
            {renderBox ? (
              renderBox({
                detection,
                pixelBox,
                index: detIndex,
                color: effectiveBoxColor,
              })
            ) : (
              (resolvedShowBoxes || resolvedShowLabels || Boolean(renderLabel)) && (
                <View
                  style={[
                    styles.box,
                    {
                      left: pixelBox.x,
                      top: pixelBox.y,
                      width: pixelBox.width,
                      height: pixelBox.height,
                      borderColor: effectiveBoxColor,
                      borderRadius: resolvedBoxBorderRadius,
                      borderWidth: isSolidOrDashed ? resolvedBoxBorderWidth : 0,
                      borderStyle:
                        resolvedBoxVariant === 'dashed' ? 'dashed' : 'solid',
                      backgroundColor: resolvedBoxBg,
                    },
                    resolvedBoxStyle,
                  ]}
                >
                  {isCornersMode && (
                    <>
                      <View
                        style={[
                          styles.cornerArm,
                          {
                            top: 0,
                            left: 0,
                            width: armW,
                            height: armH,
                            borderColor: effectiveBoxColor,
                            borderTopWidth: resolvedCornerThickness,
                            borderLeftWidth: resolvedCornerThickness,
                            borderTopLeftRadius: resolvedBoxBorderRadius,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.cornerArm,
                          {
                            top: 0,
                            right: 0,
                            width: armW,
                            height: armH,
                            borderColor: effectiveBoxColor,
                            borderTopWidth: resolvedCornerThickness,
                            borderRightWidth: resolvedCornerThickness,
                            borderTopRightRadius: resolvedBoxBorderRadius,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.cornerArm,
                          {
                            bottom: 0,
                            left: 0,
                            width: armW,
                            height: armH,
                            borderColor: effectiveBoxColor,
                            borderBottomWidth: resolvedCornerThickness,
                            borderLeftWidth: resolvedCornerThickness,
                            borderBottomLeftRadius: resolvedBoxBorderRadius,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.cornerArm,
                          {
                            bottom: 0,
                            right: 0,
                            width: armW,
                            height: armH,
                            borderColor: effectiveBoxColor,
                            borderBottomWidth: resolvedCornerThickness,
                            borderRightWidth: resolvedCornerThickness,
                            borderBottomRightRadius: resolvedBoxBorderRadius,
                          },
                        ]}
                      />
                    </>
                  )}
                  {labelNode}
                </View>
              )
            )}

            {meshSegments.map((seg) => (
              <View
                key={`${detection.id}-${seg.key}`}
                style={[
                  styles.meshLine,
                  {
                    left: seg.left,
                    top: seg.top,
                    width: seg.width,
                    height: seg.height,
                    backgroundColor: seg.color,
                    transform: [{ rotate: `${seg.angleRad}rad` }],
                  },
                ]}
              />
            ))}

            {meshDots.map((dot) =>
              renderLandmarkDot ? (
                <React.Fragment key={dot.key}>
                  {renderLandmarkDot({
                    detection,
                    point: dot.point,
                    index: dot.index,
                    isDenseMesh: isDenseFaceMesh,
                    color: dot.color,
                    radius: dot.radius,
                  })}
                </React.Fragment>
              ) : (
                <View
                  key={dot.key}
                  style={[
                    styles.landmarkDot,
                    {
                      left: dot.left,
                      top: dot.top,
                      width: dot.size,
                      height: dot.size,
                      borderRadius: dot.radius,
                      backgroundColor: dot.color,
                      borderWidth: dot.borderWidth,
                    },
                    resolvedLandmarkStyle,
                  ]}
                />
              )
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  cornerArm: {
    position: 'absolute',
  },
  labelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: -2,
    marginLeft: -2,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  meshLine: {
    position: 'absolute',
    zIndex: 11,
  },
  landmarkDot: {
    position: 'absolute',
    borderColor: '#ffffff',
    zIndex: 12,
  },
});
