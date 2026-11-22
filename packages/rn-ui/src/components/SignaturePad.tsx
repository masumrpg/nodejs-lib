import React, {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import { useTheme } from "../theme";
import { triggerHaptic } from "../utils/haptics";
import { Text } from "./Text";
import { type BaseHapticProps } from "./types";

export interface SignaturePadRef {
  clear: () => void;
  undo: () => void;
  getPaths: () => string[];
  getSvg: () => string;
  isEmpty: () => boolean;
}

export interface SignaturePadProps extends BaseHapticProps {
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  showGuideLine?: boolean;
  guideLineText?: string;
  onBegin?: () => void;
  onEnd?: () => void;
  onChange?: (paths: string[]) => void;
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

interface Point {
  x: number;
  y: number;
}

function fmtCoord(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

export const SignaturePad = React.forwardRef<SignaturePadRef, SignaturePadProps>(
  function SignaturePad(
    {
      strokeColor,
      strokeWidth = 3,
      backgroundColor,
      showGuideLine = true,
      guideLineText = "Sign Above This Line",
      onBegin,
      onEnd,
      onChange,
      haptic = true,
      height = 200,
      accessibilityLabel = "Signature pad",
      style,
    },
    ref,
  ) {
    const { colors, components, radii } = useTheme();
    const activeStrokeColor = strokeColor ?? colors.text;
    const activeBgColor = backgroundColor ?? colors.surface;

    const [paths, setPaths] = useState<string[]>([]);
    const [livePath, setLivePath] = useState("");
    const canvasSizeRef = useRef({ width: 300, height });

    const pathsRef = useRef<string[]>([]);
    const strokePointsRef = useRef<Point[]>([]);
    const prefixPathRef = useRef("");

    const beginStroke = useCallback(
      (x: number, y: number) => {
        if (haptic) triggerHaptic("selection");
        onBegin?.();

        const startPt = { x, y };
        strokePointsRef.current = [startPt];
        prefixPathRef.current = `M ${fmtCoord(x)} ${fmtCoord(y)}`;
        setLivePath(
          `${prefixPathRef.current} L ${fmtCoord(x + 0.1)} ${fmtCoord(y + 0.1)}`,
        );
      },
      [haptic, onBegin],
    );

    const appendStrokePoint = useCallback((x: number, y: number) => {
      const points = strokePointsRef.current;
      const prev = points[points.length - 1];
      if (!prev) return;
      if (Math.hypot(x - prev.x, y - prev.y) < 1.2) return;

      const midX = (prev.x + x) / 2;
      const midY = (prev.y + y) / 2;
      prefixPathRef.current += ` Q ${fmtCoord(prev.x)} ${fmtCoord(prev.y)}, ${fmtCoord(midX)} ${fmtCoord(midY)}`;
      points.push({ x, y });
      setLivePath(`${prefixPathRef.current} L ${fmtCoord(x)} ${fmtCoord(y)}`);
    }, []);

    const finishStroke = useCallback(() => {
      const points = strokePointsRef.current;
      if (points.length === 0) return;

      const last = points[points.length - 1];
      const finalPath =
        points.length === 1 && last
          ? `M ${fmtCoord(last.x)} ${fmtCoord(last.y)} L ${fmtCoord(last.x + 0.1)} ${fmtCoord(last.y + 0.1)}`
          : last
            ? `${prefixPathRef.current} L ${fmtCoord(last.x)} ${fmtCoord(last.y)}`
            : prefixPathRef.current;

      strokePointsRef.current = [];
      prefixPathRef.current = "";
      setLivePath("");

      if (finalPath) {
        const nextPaths = [...pathsRef.current, finalPath];
        pathsRef.current = nextPaths;
        setPaths(nextPaths);
        onChange?.(nextPaths);
      }

      onEnd?.();
    }, [onChange, onEnd]);

    const panConfig = useMemo(
      () => ({
        minDistance: 0,
        activeOffsetX: [-1, 1] as [number, number],
        activeOffsetY: [-1, 1] as [number, number],
        shouldCancelWhenOutside: false,
        onBegin: (event: { x: number; y: number }) => {
          "worklet";
          scheduleOnRN(beginStroke, event.x, event.y);
        },
        onUpdate: (event: { x: number; y: number }) => {
          "worklet";
          scheduleOnRN(appendStrokePoint, event.x, event.y);
        },
        onFinalize: () => {
          "worklet";
          scheduleOnRN(finishStroke);
        },
      }),
      [appendStrokePoint, beginStroke, finishStroke],
    );

    const panGesture = usePanGesture(panConfig);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          if (haptic) triggerHaptic("light");
          pathsRef.current = [];
          strokePointsRef.current = [];
          prefixPathRef.current = "";
          setPaths([]);
          setLivePath("");
          onChange?.([]);
        },
        undo: () => {
          if (pathsRef.current.length === 0) return;
          if (haptic) triggerHaptic("selection");
          const next = pathsRef.current.slice(0, -1);
          pathsRef.current = next;
          setPaths(next);
          onChange?.(next);
        },
        getPaths: () => pathsRef.current,
        getSvg: () => {
          const w = Math.max(1, Math.round(canvasSizeRef.current.width));
          const h = Math.max(1, Math.round(canvasSizeRef.current.height));
          const pathElements = pathsRef.current
            .map(
              (d) =>
                `<path d="${d}" fill="none" stroke="${activeStrokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`,
            )
            .join("\n  ");
          return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  ${pathElements}\n</svg>`;
        },
        isEmpty: () => pathsRef.current.length === 0 && strokePointsRef.current.length === 0,
      }),
      [activeStrokeColor, haptic, onChange, strokeWidth],
    );

    const handleLayout = useCallback((event: LayoutChangeEvent) => {
      const { width, height: layoutHeight } = event.nativeEvent.layout;
      if (width > 0 && layoutHeight > 0) {
        canvasSizeRef.current = { width, height: layoutHeight };
      }
    }, []);

    return (
      <View
        accessible
        accessibilityRole="none"
        accessibilityLabel={accessibilityLabel}
        onLayout={handleLayout}
        style={[
          styles.container,
          {
            height,
            backgroundColor: activeBgColor,
            borderRadius: radii.lg,
            borderWidth: components.borderWidth.default,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        {showGuideLine ? (
          <View pointerEvents="none" style={styles.guidelineContainer}>
            <View
              style={[
                styles.guidelineRule,
                { borderColor: colors.border },
              ]}
            />
            {guideLineText ? (
              <Text style={[styles.guidelineText, { color: colors.textMuted }]}>
                {guideLineText}
              </Text>
            ) : null}
          </View>
        ) : null}

        <GestureDetector gesture={panGesture}>
          <View style={StyleSheet.absoluteFill}>
            <Svg style={StyleSheet.absoluteFill}>
              {paths.map((d, idx) => (
                <Path
                  key={`sig-stroke-${idx}`}
                  d={d}
                  fill="none"
                  stroke={activeStrokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {livePath ? (
                <Path
                  d={livePath}
                  fill="none"
                  stroke={activeStrokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>
          </View>
        </GestureDetector>
      </View>
    );
  },
);

SignaturePad.displayName = "SignaturePad";

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    position: "relative",
  },
  guidelineContainer: {
    position: "absolute",
    bottom: 36,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  guidelineRule: {
    width: "100%",
    height: 1,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
  },
  guidelineText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: 6,
    textTransform: "uppercase",
  },
});
