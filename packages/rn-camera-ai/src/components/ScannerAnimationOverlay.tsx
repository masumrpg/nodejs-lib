import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
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
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useCameraAITheme } from '../theme/context';
import type { CameraAITheme } from '../theme/types';
import type {
  PixelBoundingBox,
  RenderScannerLaserParams,
  RenderScannerOverlayParams,
  RenderScannerStatusParams,
  ScannerAnimationState,
} from '../types/contracts';

/**
 * Props for the hardware-accelerated, customizable ScannerAnimationOverlay component.
 */
export interface ScannerAnimationOverlayProps {
  /** Whether the scanner overlay and laser sweep are active (default: true) */
  active?: boolean;
  /** Visual phase controlling sweep cadence and status chrome (default: 'scanning') */
  state?: ScannerAnimationState;
  /** Accent color for the laser beam and reticle corner brackets (default: '#f59e0b') */
  accentColor?: string;
  /** Whether to draw viewfinder reticle corner brackets around the active zone (default: true) */
  showGridCorners?: boolean;
  /** Corner arm length in pixels (default: 24) */
  cornerLength?: number;
  /** Corner border thickness in pixels (default: 2.5) */
  cornerThickness?: number;
  /** Corner radius in pixels (default: 10) */
  cornerRadius?: number;
  /** Whether to draw the animated horizontal laser beam (default: true) */
  showLaser?: boolean;
  /** Optional explicit screen pixel region constraining the laser & reticle */
  scanRegion?: PixelBoundingBox;
  /** Translucent backdrop veil color rendered when state === 'analyzing' */
  veilColor?: string;
  /** Optional status caption pill rendered inside the bottom of the reticle zone */
  statusLabel?: string;
  /** Custom status badge container style */
  statusContainerStyle?: StyleProp<ViewStyle>;
  /** Custom status badge text style */
  statusTextStyle?: StyleProp<TextStyle>;
  /** Increment this counter to trigger a crisp 160ms shutter capture flash pulse */
  flashTrigger?: number;
  /** Duration in milliseconds for one vertical sweep pass in 'scanning' state (default: 1700) */
  sweepDurationMs?: number;
  /** Headless full-canvas custom renderer replacing scanner overlay chrome */
  renderOverlay?: (params: RenderScannerOverlayParams) => React.ReactNode;
  /** Custom laser beam renderer mounted inside the animated Reanimated track */
  renderLaser?: (params: RenderScannerLaserParams) => React.ReactNode;
  /** Custom status pill renderer */
  renderStatusBadge?: (params: RenderScannerStatusParams) => React.ReactNode;
  /** Optional custom container style */
  style?: StyleProp<ViewStyle>;
  /** Optional theme override */
  theme?: CameraAITheme;
}

const EASE_OUT =
  typeof Easing?.bezier === 'function' ? Easing.bezier(0.23, 1, 0.32, 1) : undefined;
const EASE_IN_OUT =
  typeof Easing?.bezier === 'function' ? Easing.bezier(0.77, 0, 0.175, 1) : undefined;

const LASER_HALO_HEIGHT = 44;
const DEFAULT_ZONE_MARGIN_X = 22;
const MIN_TRAVEL_PX = 80;

/**
 * GPU-composited viewfinder reticle and laser sweep overlay driven on the Reanimated UI thread.
 * Adheres strictly to zero-bounce cubic/quint timing curves and respects OS reduced-motion preferences.
 */
export const ScannerAnimationOverlay: React.FC<ScannerAnimationOverlayProps> = ({
  active = true,
  state = 'scanning',
  accentColor,
  showGridCorners = true,
  cornerLength = 24,
  cornerThickness = 2.5,
  cornerRadius = 10,
  showLaser = true,
  scanRegion,
  veilColor,
  statusLabel,
  statusContainerStyle,
  statusTextStyle,
  flashTrigger = 0,
  sweepDurationMs = 1700,
  renderOverlay,
  renderLaser,
  renderStatusBadge,
  style,
  theme,
}) => {
  const contextTheme = useCameraAITheme();
  const activeTheme = theme ?? contextTheme;

  const resolvedAccentColor =
    accentColor ?? activeTheme?.warning ?? activeTheme?.primary ?? '#f59e0b';
  const resolvedVeilColor =
    veilColor ?? activeTheme?.mask ?? 'rgba(5, 22, 30, 0.34)';
  const reducedMotion =
    typeof useReducedMotion === 'function' ? useReducedMotion() : false;

  const [zoneSize, setZoneSize] = useState<{ width: number; height: number }>({
    width: 300,
    height: 240,
  });
  const lastFlashTriggerRef = useRef<number>(flashTrigger);

  const sweepProgress = useSharedValue<number>(0);
  const laserOpacity = useSharedValue<number>(0);
  const flashOpacity = useSharedValue<number>(0);
  const badgeOpacity = useSharedValue<number>(0);
  const badgeScale = useSharedValue<number>(0.96);

  const handleZoneLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setZoneSize({ width, height });
    }
  }, []);

  // Trigger crisp shutter flash pulse whenever flashTrigger increments.
  useEffect(() => {
    if (flashTrigger > lastFlashTriggerRef.current) {
      lastFlashTriggerRef.current = flashTrigger;
      if (reducedMotion) {
        flashOpacity.set(0.35);
      } else {
        flashOpacity.set(0.85);
      }
      flashOpacity.set(
        withTiming(0, {
          duration: 160,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion?.System,
        })
      );
    } else {
      lastFlashTriggerRef.current = flashTrigger;
    }
  }, [flashTrigger, flashOpacity, reducedMotion]);

  // Coordinate laser sweep and opacity curve across scanning/analyzing/complete states.
  useEffect(() => {
    const shouldAnimateLaser =
      active && showLaser && (state === 'scanning' || state === 'analyzing');

    if (!shouldAnimateLaser) {
      cancelAnimation?.(sweepProgress);
      cancelAnimation?.(laserOpacity);
      laserOpacity.set(
        withTiming(0, {
          duration: 180,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion?.System,
        })
      );
      return;
    }

    laserOpacity.set(
      withTiming(state === 'analyzing' ? 1 : 0.92, {
        duration: 180,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion?.System,
      })
    );

    if (reducedMotion) {
      cancelAnimation?.(sweepProgress);
      sweepProgress.set(0.5);
      return;
    }

    const cycleMs =
      state === 'analyzing'
        ? Math.max(550, Math.round(sweepDurationMs * 0.56))
        : Math.max(700, sweepDurationMs);

    sweepProgress.set(0);
    sweepProgress.set(
      withRepeat(
        withTiming(1, {
          duration: cycleMs,
          easing: EASE_IN_OUT,
          reduceMotion: ReduceMotion?.System,
        }),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation?.(sweepProgress);
      cancelAnimation?.(laserOpacity);
    };
  }, [
    active,
    laserOpacity,
    reducedMotion,
    showLaser,
    state,
    sweepDurationMs,
    sweepProgress,
  ]);

  // Animate analyzing / status badge visibility smoothly without bounce or zero-scale collapse.
  useEffect(() => {
    const showBadge = active && Boolean(statusLabel);
    if (showBadge) {
      badgeOpacity.set(
        withTiming(1, {
          duration: 180,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion?.System,
        })
      );
      badgeScale.set(
        withTiming(1, {
          duration: 180,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion?.System,
        })
      );
    } else {
      badgeOpacity.set(
        withTiming(0, {
          duration: 140,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion?.System,
        })
      );
      badgeScale.set(
        withTiming(0.96, {
          duration: 140,
          easing: EASE_OUT,
          reduceMotion: ReduceMotion?.System,
        })
      );
    }
  }, [active, badgeOpacity, badgeScale, statusLabel]);

  const effectiveRegionHeight =
    scanRegion && scanRegion.height > 0 ? scanRegion.height : zoneSize.height;
  const effectiveRegionWidth =
    scanRegion && scanRegion.width > 0 ? scanRegion.width : zoneSize.width;
  const maxTravelPx = Math.max(
    MIN_TRAVEL_PX,
    effectiveRegionHeight - LASER_HALO_HEIGHT
  );
  const maxTravelSv = useSharedValue<number>(maxTravelPx);

  useEffect(() => {
    maxTravelSv.set(maxTravelPx);
  }, [maxTravelPx, maxTravelSv]);

  const laserAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: laserOpacity.get(),
      transform: [{ translateY: sweepProgress.get() * maxTravelSv.get() }],
    };
  });

  const flashAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: flashOpacity.get(),
    };
  });

  const badgeAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: badgeOpacity.get(),
      transform: [{ scale: badgeScale.get() }],
    };
  });

  if (!active && flashTrigger === 0) {
    return null;
  }

  const scanZoneStyle: ViewStyle = scanRegion
    ? {
        position: 'absolute',
        left: scanRegion.x,
        top: scanRegion.y,
        width: scanRegion.width,
        height: scanRegion.height,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }
    : styles.defaultScanZone;

  const effectiveCornerRadius = Math.max(
    0,
    Math.min(cornerRadius, cornerLength)
  );

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, style]} pointerEvents="none">
      {renderOverlay ? (
        renderOverlay({
          active,
          state,
          accentColor: resolvedAccentColor,
          statusLabel,
          region: scanRegion,
        })
      ) : (
        <>
          {/* Subtle tint veil while post-capture analysis runs */}
          {state === 'analyzing' ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: resolvedVeilColor }]}
            />
          ) : null}

          {/* Reticle / Laser Scan Zone */}
          <View style={scanZoneStyle} onLayout={handleZoneLayout}>
            {showGridCorners ? (
              <>
                <View
                  style={[
                    styles.cornerBracket,
                    {
                      top: 0,
                      left: 0,
                      width: cornerLength,
                      height: cornerLength,
                      borderColor: resolvedAccentColor,
                      borderTopWidth: cornerThickness,
                      borderLeftWidth: cornerThickness,
                      borderTopLeftRadius: effectiveCornerRadius,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.cornerBracket,
                    {
                      top: 0,
                      right: 0,
                      width: cornerLength,
                      height: cornerLength,
                      borderColor: resolvedAccentColor,
                      borderTopWidth: cornerThickness,
                      borderRightWidth: cornerThickness,
                      borderTopRightRadius: effectiveCornerRadius,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.cornerBracket,
                    {
                      bottom: 0,
                      left: 0,
                      width: cornerLength,
                      height: cornerLength,
                      borderColor: resolvedAccentColor,
                      borderBottomWidth: cornerThickness,
                      borderLeftWidth: cornerThickness,
                      borderBottomLeftRadius: effectiveCornerRadius,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.cornerBracket,
                    {
                      bottom: 0,
                      right: 0,
                      width: cornerLength,
                      height: cornerLength,
                      borderColor: resolvedAccentColor,
                      borderBottomWidth: cornerThickness,
                      borderRightWidth: cornerThickness,
                      borderBottomRightRadius: effectiveCornerRadius,
                    },
                  ]}
                />
              </>
            ) : null}

            {showLaser ? (
              <Animated.View style={[styles.laserTrack, laserAnimatedStyle]}>
                {renderLaser ? (
                  renderLaser({
                    accentColor: resolvedAccentColor,
                    state,
                    regionWidth: effectiveRegionWidth,
                  })
                ) : (
                  <>
                    <View
                      style={[
                        styles.laserHaloOuter,
                        { backgroundColor: resolvedAccentColor },
                      ]}
                    />
                    <View
                      style={[
                        styles.laserHaloMid,
                        { backgroundColor: resolvedAccentColor },
                      ]}
                    />
                    <View
                      style={[styles.laserCore, { backgroundColor: resolvedAccentColor }]}
                    >
                      <View style={styles.laserSpecular} />
                    </View>
                  </>
                )}
              </Animated.View>
            ) : null}

            {statusLabel ? (
              <Animated.View style={badgeAnimatedStyle}>
                {renderStatusBadge ? (
                  renderStatusBadge({
                    statusLabel,
                    state,
                    accentColor: resolvedAccentColor,
                  })
                ) : (
                  <View
                    style={[
                      styles.statusPill,
                      { borderColor: resolvedAccentColor },
                      statusContainerStyle,
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: resolvedAccentColor }]}
                    />
                    <Text
                      style={[styles.statusText, statusTextStyle]}
                      numberOfLines={1}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                )}
              </Animated.View>
            ) : null}
          </View>
        </>
      )}

      {/* Instant hardware-composited shutter flash veil */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flashVeil, flashAnimatedStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 18,
  },
  defaultScanZone: {
    position: 'absolute',
    top: '20%',
    bottom: '16%',
    left: DEFAULT_ZONE_MARGIN_X,
    right: DEFAULT_ZONE_MARGIN_X,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cornerBracket: {
    position: 'absolute',
  },
  laserTrack: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: LASER_HALO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserHaloOuter: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: LASER_HALO_HEIGHT,
    borderRadius: 22,
    opacity: 0.1,
  },
  laserHaloMid: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 14,
    borderRadius: 7,
    opacity: 0.26,
  },
  laserCore: {
    width: '100%',
    height: 2.5,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserSpecular: {
    width: '86%',
    height: 1,
    borderRadius: 1,
    backgroundColor: '#ffffff',
    opacity: 0.85,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
    backgroundColor: 'rgba(5, 22, 30, 0.88)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  flashVeil: {
    backgroundColor: '#ffffff',
  },
});
