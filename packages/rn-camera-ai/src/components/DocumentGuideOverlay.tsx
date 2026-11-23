import React, { useEffect, useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { transformNormalizedPointToPixel } from '../math/transforms';
import { useCameraAITheme } from '../theme/context';
import type { CameraAITheme } from '../theme/types';
import type {
  DocumentCornerPosition,
  DocumentGuideTarget,
  DocumentGuideThemeConfig,
  DocumentQuad,
  DocumentReadinessState,
  FrameOrientation,
  PixelBoundingBox,
  Point2D,
  RenderDocumentCenterParams,
  RenderDocumentCornerParams,
  RenderDocumentGuideParams,
  RenderDocumentStatusParams,
  StreamDimensions,
  ViewDimensions,
} from '../types/contracts';

/**
 * Props for the customizable, Reanimated 4 UI-thread DocumentGuideOverlay component.
 * Supports 4 independent angled corner vertices so rotated/perspective paper quads track accurately.
 */
export interface DocumentGuideOverlayProps {
  /** Current paper/document quad/box target & scan optimality state */
  guide: DocumentGuideTarget;
  /** Measured camera/image container dimensions */
  viewDimensions: ViewDimensions;
  /** Physical stream dimensions used for cover/contain coordinate projection */
  streamDimensions?: StreamDimensions;
  /** Preview resize mode matching CameraAI ('cover' | 'contain') */
  resizeMode?: 'cover' | 'contain';
  /** Horizontally mirror coordinates if front camera preview is mirrored */
  isMirrored?: boolean;
  /** Orientation passed to projection math */
  orientation?: FrameOrientation;
  /** Declarative colors, corner dimensions, outer vignette mask, and timing config */
  theme?: DocumentGuideThemeConfig;
  /** Optional theme token binding override */
  cameraTheme?: CameraAITheme;
  /** Headless full-canvas custom renderer replacing the entire DocumentGuideOverlay chrome */
  renderGuide?: (params: RenderDocumentGuideParams) => React.ReactNode;
  /** Custom per-corner bracket renderer receiving fitted vertex point and edge angles */
  renderCorner?: (params: RenderDocumentCornerParams) => React.ReactNode;
  /** Custom readiness/optimality status pill renderer */
  renderStatus?: (params: RenderDocumentStatusParams) => React.ReactNode;
  /** Custom slot rendered centered inside the fitted paper region */
  renderCenterOverlay?: (params: RenderDocumentCenterParams) => React.ReactNode;
  /** Optional custom style for the overlay root */
  style?: StyleProp<ViewStyle>;
  /** Optional extra overlay children */
  children?: React.ReactNode;
}

const EASE_OUT =
  typeof Easing?.bezier === 'function' ? Easing.bezier(0.23, 1, 0.32, 1) : undefined;

const EDGE_MARGIN_PX = 10;

function resolveReadinessColor(
  readiness: DocumentReadinessState,
  theme?: DocumentGuideThemeConfig,
  cameraTheme?: CameraAITheme
): string {
  switch (readiness) {
    case 'optimal':
    case 'complete':
      return readiness === 'complete'
        ? (theme?.completeColor ?? cameraTheme?.success ?? '#22c55e')
        : (theme?.optimalColor ?? cameraTheme?.success ?? '#22c55e');
    case 'adjusting':
      return theme?.adjustingColor ?? cameraTheme?.warning ?? '#f59e0b';
    case 'analyzing':
      return theme?.analyzingColor ?? cameraTheme?.info ?? cameraTheme?.primary ?? '#38bdf8';
    case 'searching':
    default:
      return theme?.searchingColor ?? cameraTheme?.muted ?? '#94a3b8';
  }
}

function clampPointToViewport(pt: Point2D, view: ViewDimensions): Point2D {
  return {
    x: Math.min(Math.max(EDGE_MARGIN_PX, pt.x), Math.max(EDGE_MARGIN_PX, view.width - EDGE_MARGIN_PX)),
    y: Math.min(Math.max(EDGE_MARGIN_PX, pt.y), Math.max(EDGE_MARGIN_PX, view.height - EDGE_MARGIN_PX)),
  };
}

function boxToNormalizedQuad(guide: DocumentGuideTarget): DocumentQuad {
  if (guide.corners) {
    return guide.corners;
  }
  const b = guide.box;
  return {
    topLeft: { x: b.x, y: b.y },
    topRight: { x: b.x + b.width, y: b.y },
    bottomRight: { x: b.x + b.width, y: b.y + b.height },
    bottomLeft: { x: b.x, y: b.y + b.height },
  };
}

function quadBoundingBox(q: DocumentQuad): PixelBoundingBox {
  const minX = Math.min(q.topLeft.x, q.topRight.x, q.bottomRight.x, q.bottomLeft.x);
  const maxX = Math.max(q.topLeft.x, q.topRight.x, q.bottomRight.x, q.bottomLeft.x);
  const minY = Math.min(q.topLeft.y, q.topRight.y, q.bottomRight.y, q.bottomLeft.y);
  const maxY = Math.max(q.topLeft.y, q.topRight.y, q.bottomRight.y, q.bottomLeft.y);
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildEdgeArmStyle(
  ax: { get(): number },
  ay: { get(): number },
  bx: { get(): number },
  by: { get(): number },
  armLength: number,
  thickness: number
): ViewStyle {
  'worklet';
  const x1 = ax.get();
  const y1 = ay.get();
  const x2 = bx.get();
  const y2 = by.get();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const halfLen = armLength * 0.5;
  const halfThick = thickness * 0.5;
  const midX = x1 + halfLen * Math.cos(angle);
  const midY = y1 + halfLen * Math.sin(angle);
  return {
    transform: [
      { translateX: midX - halfLen },
      { translateY: midY - halfThick },
      { rotate: `${angle}rad` },
    ],
  };
}

function buildConnectingLineStyle(
  ax: { get(): number },
  ay: { get(): number },
  bx: { get(): number },
  by: { get(): number }
): ViewStyle {
  'worklet';
  const x1 = ax.get();
  const y1 = ay.get();
  const x2 = bx.get();
  const y2 = by.get();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const angle = Math.atan2(dy, dx);
  const midX = (x1 + x2) * 0.5;
  const midY = (y1 + y2) * 0.5;
  return {
    transform: [
      { translateX: midX - 0.5 },
      { translateY: midY - 0.6 },
      { rotate: `${angle}rad` },
      { scaleX: len },
    ],
  };
}

/**
 * Animated 4-corner quadrilateral guide that tracks independent document corners
 * with rotated corner arms on the Reanimated 4 UI thread and displays scan optimality.
 */
export const DocumentGuideOverlay: React.FC<DocumentGuideOverlayProps> = ({
  guide,
  viewDimensions,
  streamDimensions,
  resizeMode = 'cover',
  isMirrored = false,
  orientation = 'portrait',
  theme,
  cameraTheme,
  renderGuide,
  renderCorner,
  renderStatus,
  renderCenterOverlay,
  style,
  children,
}) => {
  const contextTheme = useCameraAITheme();
  const activeCameraTheme = cameraTheme ?? contextTheme;

  const reducedMotion =
    typeof useReducedMotion === 'function' ? useReducedMotion() : false;

  const cornerLength = theme?.cornerLength ?? 28;
  const cornerThickness = theme?.cornerThickness ?? 3.5;
  const cornerRadius = theme?.cornerRadius ?? 14;
  const showMask = theme?.showMask ?? true;
  const maskColor =
    theme?.maskColor ?? activeCameraTheme?.mask ?? 'rgba(5, 22, 30, 0.36)';
  const showGuideOutline = theme?.showGuideOutline ?? true;
  const outlineOpacity = theme?.outlineOpacity ?? 0.42;
  const showStatusPill = theme?.showStatusPill ?? true;
  const statusPosition = theme?.statusPosition ?? 'top';
  const snapDurationMs = theme?.snapDurationMs ?? 170;

  const activeColor = resolveReadinessColor(
    guide.readiness,
    theme,
    activeCameraTheme
  );

  const pixelQuad = useMemo<DocumentQuad>(() => {
    if (viewDimensions.width <= 0 || viewDimensions.height <= 0) {
      const zero = { x: 0, y: 0 };
      return { topLeft: zero, topRight: zero, bottomRight: zero, bottomLeft: zero };
    }
    const effectiveStream: StreamDimensions =
      streamDimensions && streamDimensions.width > 0 && streamDimensions.height > 0
        ? streamDimensions
        : { width: viewDimensions.width, height: viewDimensions.height };

    const transformOpts = {
      viewDimensions,
      streamDimensions: effectiveStream,
      resizeMode,
      isMirrored,
      orientation,
    };

    const norm = boxToNormalizedQuad(guide);
    const tl = clampPointToViewport(
      transformNormalizedPointToPixel(norm.topLeft, transformOpts),
      viewDimensions
    );
    const tr = clampPointToViewport(
      transformNormalizedPointToPixel(norm.topRight, transformOpts),
      viewDimensions
    );
    const br = clampPointToViewport(
      transformNormalizedPointToPixel(norm.bottomRight, transformOpts),
      viewDimensions
    );
    const bl = clampPointToViewport(
      transformNormalizedPointToPixel(norm.bottomLeft, transformOpts),
      viewDimensions
    );

    return { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl };
  }, [
    guide,
    isMirrored,
    orientation,
    resizeMode,
    streamDimensions,
    viewDimensions,
  ]);

  const pixelBox = useMemo<PixelBoundingBox>(
    () => quadBoundingBox(pixelQuad),
    [pixelQuad]
  );

  // 8 GPU-composited corner coordinates + layout dimensions stored as SharedValues so useAnimatedStyle needs 0 dependency arrays on native
  const tlX = useSharedValue<number>(pixelQuad.topLeft.x);
  const tlY = useSharedValue<number>(pixelQuad.topLeft.y);
  const trX = useSharedValue<number>(pixelQuad.topRight.x);
  const trY = useSharedValue<number>(pixelQuad.topRight.y);
  const brX = useSharedValue<number>(pixelQuad.bottomRight.x);
  const brY = useSharedValue<number>(pixelQuad.bottomRight.y);
  const blX = useSharedValue<number>(pixelQuad.bottomLeft.x);
  const blY = useSharedValue<number>(pixelQuad.bottomLeft.y);
  const cornerLenSv = useSharedValue<number>(cornerLength);
  const cornerThickSv = useSharedValue<number>(cornerThickness);

  useEffect(() => {
    cornerLenSv.set(cornerLength);
    cornerThickSv.set(cornerThickness);
  }, [cornerLenSv, cornerLength, cornerThickSv, cornerThickness]);

  useEffect(() => {
    if (viewDimensions.width <= 0 || viewDimensions.height <= 0) {
      return;
    }

    if (reducedMotion) {
      tlX.set(pixelQuad.topLeft.x);
      tlY.set(pixelQuad.topLeft.y);
      trX.set(pixelQuad.topRight.x);
      trY.set(pixelQuad.topRight.y);
      brX.set(pixelQuad.bottomRight.x);
      brY.set(pixelQuad.bottomRight.y);
      blX.set(pixelQuad.bottomLeft.x);
      blY.set(pixelQuad.bottomLeft.y);
      return;
    }

    const timingConfig = {
      duration: Math.max(80, snapDurationMs),
      easing: EASE_OUT,
      reduceMotion: ReduceMotion?.System,
    };

    tlX.set(withTiming(pixelQuad.topLeft.x, timingConfig));
    tlY.set(withTiming(pixelQuad.topLeft.y, timingConfig));
    trX.set(withTiming(pixelQuad.topRight.x, timingConfig));
    trY.set(withTiming(pixelQuad.topRight.y, timingConfig));
    brX.set(withTiming(pixelQuad.bottomRight.x, timingConfig));
    brY.set(withTiming(pixelQuad.bottomRight.y, timingConfig));
    blX.set(withTiming(pixelQuad.bottomLeft.x, timingConfig));
    blY.set(withTiming(pixelQuad.bottomLeft.y, timingConfig));

    return () => {
      cancelAnimation?.(tlX);
      cancelAnimation?.(tlY);
      cancelAnimation?.(trX);
      cancelAnimation?.(trY);
      cancelAnimation?.(brX);
      cancelAnimation?.(brY);
      cancelAnimation?.(blX);
      cancelAnimation?.(blY);
    };
  }, [
    blX,
    blY,
    brX,
    brY,
    pixelQuad,
    reducedMotion,
    snapDurationMs,
    tlX,
    tlY,
    trX,
    trY,
    viewDimensions.height,
    viewDimensions.width,
  ]);

  // Oriented corner arm styles (zero dependency arrays passed to useAnimatedStyle on Reanimated 4 native)
  const tlHorizArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(tlX, tlY, trX, trY, cornerLenSv.get(), cornerThickSv.get());
  });

  const tlVertArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(tlX, tlY, blX, blY, cornerLenSv.get(), cornerThickSv.get());
  });

  const trHorizArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(trX, trY, tlX, tlY, cornerLenSv.get(), cornerThickSv.get());
  });

  const trVertArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(trX, trY, brX, brY, cornerLenSv.get(), cornerThickSv.get());
  });

  const brHorizArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(brX, brY, blX, blY, cornerLenSv.get(), cornerThickSv.get());
  });

  const brVertArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(brX, brY, trX, trY, cornerLenSv.get(), cornerThickSv.get());
  });

  const blHorizArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(blX, blY, brX, brY, cornerLenSv.get(), cornerThickSv.get());
  });

  const blVertArmStyle = useAnimatedStyle(() => {
    'worklet';
    return buildEdgeArmStyle(blX, blY, tlX, tlY, cornerLenSv.get(), cornerThickSv.get());
  });

  const halfThick = cornerThickness * 0.5;
  const tlJointStyle = useAnimatedStyle(() => {
    'worklet';
    const ht = cornerThickSv.get() * 0.5;
    return { transform: [{ translateX: tlX.get() - ht }, { translateY: tlY.get() - ht }] };
  });
  const trJointStyle = useAnimatedStyle(() => {
    'worklet';
    const ht = cornerThickSv.get() * 0.5;
    return { transform: [{ translateX: trX.get() - ht }, { translateY: trY.get() - ht }] };
  });
  const brJointStyle = useAnimatedStyle(() => {
    'worklet';
    const ht = cornerThickSv.get() * 0.5;
    return { transform: [{ translateX: brX.get() - ht }, { translateY: brY.get() - ht }] };
  });
  const blJointStyle = useAnimatedStyle(() => {
    'worklet';
    const ht = cornerThickSv.get() * 0.5;
    return { transform: [{ translateX: blX.get() - ht }, { translateY: blY.get() - ht }] };
  });

  const topEdgeStyle = useAnimatedStyle(() => {
    'worklet';
    return buildConnectingLineStyle(tlX, tlY, trX, trY);
  });
  const rightEdgeStyle = useAnimatedStyle(() => {
    'worklet';
    return buildConnectingLineStyle(trX, trY, brX, brY);
  });
  const bottomEdgeStyle = useAnimatedStyle(() => {
    'worklet';
    return buildConnectingLineStyle(brX, brY, blX, blY);
  });
  const leftEdgeStyle = useAnimatedStyle(() => {
    'worklet';
    return buildConnectingLineStyle(blX, blY, tlX, tlY);
  });

  if (viewDimensions.width <= 0 || viewDimensions.height <= 0) {
    return null;
  }

  if (renderGuide) {
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        {renderGuide({
          readiness: guide.readiness,
          color: activeColor,
          optimalityScore: guide.optimalityScore,
          statusText: guide.statusText,
          hintText: guide.hintText,
          corners: pixelQuad,
          pixelBox,
          viewDimensions,
        })}
        {children}
      </View>
    );
  }

  const effectiveRadius = Math.max(0, Math.min(cornerRadius, cornerLength));
  const cornersSkewed =
    Math.abs(pixelQuad.topRight.y - pixelQuad.topLeft.y) > 4 ||
    Math.abs(pixelQuad.bottomRight.y - pixelQuad.bottomLeft.y) > 4 ||
    Math.abs(pixelQuad.bottomLeft.x - pixelQuad.topLeft.x) > 4 ||
    Math.abs(pixelQuad.bottomRight.x - pixelQuad.topRight.x) > 4;
  const shouldRenderAxisMask = showMask && !cornersSkewed;

  const hasScore = typeof guide.optimalityScore === 'number';
  const clampedScore = hasScore
    ? Math.max(0, Math.min(100, Math.round(guide.optimalityScore ?? 0)))
    : undefined;

  const canPlaceAbove = pixelBox.y >= 64;
  const resolvedTopPos =
    statusPosition === 'top' && canPlaceAbove
      ? pixelBox.y - 54
      : statusPosition === 'bottom' && viewDimensions.height - (pixelBox.y + pixelBox.height) >= 68
        ? pixelBox.y + pixelBox.height + 10
        : viewDimensions.height - (pixelBox.y + pixelBox.height) >= 68
          ? pixelBox.y + pixelBox.height + 10
          : Math.max(10, pixelBox.y + 10);

  const statusNode = renderStatus ? (
    renderStatus({
      readiness: guide.readiness,
      color: activeColor,
      optimalityScore: clampedScore,
      statusText: guide.statusText,
      hintText: guide.hintText,
      pixelBox,
    })
  ) : showStatusPill && (guide.statusText || guide.hintText || hasScore) ? (
    <View style={[styles.statusWrapper, { top: resolvedTopPos }]}>
      <View
        style={[
          styles.statusPill,
          { borderColor: activeColor },
          theme?.statusContainerStyle,
        ]}
      >
        <View style={styles.statusHeadlineRow}>
          <View style={[styles.statusDot, { backgroundColor: activeColor }]} />
          {guide.statusText ? (
            <Text
              numberOfLines={1}
              style={[styles.statusTitle, { color: activeColor }, theme?.statusTextStyle]}
            >
              {guide.statusText}
            </Text>
          ) : null}
          {clampedScore !== undefined ? (
            <View style={[styles.scoreBadge, { backgroundColor: activeColor }]}>
              <Text style={styles.scoreText}>{clampedScore}%</Text>
            </View>
          ) : null}
        </View>
        {guide.hintText ? (
          <Text numberOfLines={2} style={[styles.hintText, theme?.hintTextStyle]}>
            {guide.hintText}
          </Text>
        ) : null}
      </View>
    </View>
  ) : null;

  const cornerCustomSpecs: ReadonlyArray<{
    id: DocumentCornerPosition;
    point: Point2D;
    hNeighbor: Point2D;
    vNeighbor: Point2D;
    jointStyle: typeof tlJointStyle;
  }> = [
    {
      id: 'top-left',
      point: pixelQuad.topLeft,
      hNeighbor: pixelQuad.topRight,
      vNeighbor: pixelQuad.bottomLeft,
      jointStyle: tlJointStyle,
    },
    {
      id: 'top-right',
      point: pixelQuad.topRight,
      hNeighbor: pixelQuad.topLeft,
      vNeighbor: pixelQuad.bottomRight,
      jointStyle: trJointStyle,
    },
    {
      id: 'bottom-right',
      point: pixelQuad.bottomRight,
      hNeighbor: pixelQuad.bottomLeft,
      vNeighbor: pixelQuad.topRight,
      jointStyle: brJointStyle,
    },
    {
      id: 'bottom-left',
      point: pixelQuad.bottomLeft,
      hNeighbor: pixelQuad.bottomRight,
      vNeighbor: pixelQuad.topLeft,
      jointStyle: blJointStyle,
    },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]} pointerEvents="none">
      {/* Subtle outer frame mask enclosing the document envelope (suppressed when quad is tilted) */}
      {shouldRenderAxisMask ? (
        <>
          <View
            style={[
              styles.maskStrip,
              {
                top: 0,
                left: 0,
                right: 0,
                height: Math.max(0, pixelBox.y),
                backgroundColor: maskColor,
              },
            ]}
          />
          <View
            style={[
              styles.maskStrip,
              {
                top: pixelBox.y + pixelBox.height,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: maskColor,
              },
            ]}
          />
          <View
            style={[
              styles.maskStrip,
              {
                top: pixelBox.y,
                left: 0,
                width: Math.max(0, pixelBox.x),
                height: pixelBox.height,
                backgroundColor: maskColor,
              },
            ]}
          />
          <View
            style={[
              styles.maskStrip,
              {
                top: pixelBox.y,
                left: pixelBox.x + pixelBox.width,
                right: 0,
                height: pixelBox.height,
                backgroundColor: maskColor,
              },
            ]}
          />
        </>
      ) : null}

      {/* Connected 4-segment tilted quad hairline */}
      {showGuideOutline ? (
        <>
          <Animated.View
            style={[
              styles.outlineLine,
              { backgroundColor: activeColor, opacity: outlineOpacity },
              topEdgeStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.outlineLine,
              { backgroundColor: activeColor, opacity: outlineOpacity },
              rightEdgeStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.outlineLine,
              { backgroundColor: activeColor, opacity: outlineOpacity },
              bottomEdgeStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.outlineLine,
              { backgroundColor: activeColor, opacity: outlineOpacity },
              leftEdgeStyle,
            ]}
          />
        </>
      ) : null}

      {/* Custom center overlay inside the fitted document bounding region */}
      {renderCenterOverlay ? (
        <View
          style={{
            position: 'absolute',
            left: pixelBox.x,
            top: pixelBox.y,
            width: pixelBox.width,
            height: pixelBox.height,
          }}
        >
          {renderCenterOverlay({
            pixelBox,
            readiness: guide.readiness,
          })}
        </View>
      ) : null}

      {/* Custom corner slots OR GPU-animated angled L-corner arms */}
      {renderCorner ? (
        cornerCustomSpecs.map((spec) => (
          <Animated.View
            key={spec.id}
            style={[styles.customCornerAnchor, spec.jointStyle]}
          >
            {renderCorner({
              corner: spec.id,
              readiness: guide.readiness,
              color: activeColor,
              point: spec.point,
              corners: pixelQuad,
              pixelBox,
              angleHorizontalRad: Math.atan2(
                spec.hNeighbor.y - spec.point.y,
                spec.hNeighbor.x - spec.point.x
              ),
              angleVerticalRad: Math.atan2(
                spec.vNeighbor.y - spec.point.y,
                spec.vNeighbor.x - spec.point.x
              ),
              cornerLength,
              cornerThickness,
              cornerRadius: effectiveRadius,
            })}
          </Animated.View>
        ))
      ) : (
        <>
          {[
            tlHorizArmStyle,
            tlVertArmStyle,
            trHorizArmStyle,
            trVertArmStyle,
            brHorizArmStyle,
            brVertArmStyle,
            blHorizArmStyle,
            blVertArmStyle,
          ].map((armStyle, idx) => (
            <Animated.View
              key={`arm-${idx}`}
              style={[
                styles.cornerArmBar,
                {
                  width: cornerLength,
                  height: cornerThickness,
                  borderRadius: halfThick,
                  backgroundColor: activeColor,
                },
                armStyle,
              ]}
            />
          ))}

          {[tlJointStyle, trJointStyle, brJointStyle, blJointStyle].map(
            (jointStyle, idx) => (
              <Animated.View
                key={`joint-${idx}`}
                style={[
                  styles.cornerJointDot,
                  {
                    width: cornerThickness,
                    height: cornerThickness,
                    borderRadius: halfThick,
                    backgroundColor: activeColor,
                  },
                  jointStyle,
                ]}
              />
            )
          )}
        </>
      )}

      {statusNode}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    zIndex: 16,
  },
  maskStrip: {
    position: 'absolute',
  },
  outlineLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    height: 1.2,
  },
  cornerArmBar: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cornerJointDot: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  customCornerAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  statusWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  statusPill: {
    backgroundColor: 'rgba(5, 22, 30, 0.90)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 3,
    maxWidth: 340,
  },
  statusHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  scoreText: {
    color: '#05161E',
    fontSize: 10,
    fontWeight: '900',
  },
  hintText: {
    color: '#e2e8f0',
    fontSize: 11,
    textAlign: 'center',
  },
});
