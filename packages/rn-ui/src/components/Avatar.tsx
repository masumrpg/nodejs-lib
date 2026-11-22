import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Image,
  View,
  type ImageProps,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme } from "../theme";
import { Text } from "./Text";
import {
  resolveToneColors,
  type ComponentSize,
  type ComponentTone,
  type SizeProps,
  type ToneProps,
  type VariantProps,
} from "./types";

export type AvatarSize = ComponentSize | number;
export type AvatarShape = "circle" | "square" | "rounded";
export type AvatarStatus = "online" | "offline" | "busy" | "away";
export type AvatarVariant = "default" | "bordered" | "ring";
export type AvatarTone = ComponentTone;
export type AvatarBadgeTone = ComponentTone;
export type AvatarBadgePosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left";

const AVATAR_DIMENSIONS: Record<ComponentSize, number> = {
  xs: 24,
  sm: 28,
  md: 36,
  lg: 44,
  xl: 56,
};

function resolveAvatarDimension(size: AvatarSize): number {
  if (typeof size === "number") {
    return Number.isFinite(size) && size > 0 ? size : AVATAR_DIMENSIONS.md;
  }
  return AVATAR_DIMENSIONS[size] ?? AVATAR_DIMENSIONS.md;
}

function resolveAvatarShapeRadius(
  shape: AvatarShape,
  radii: ReturnType<typeof useTheme>["radii"],
): number {
  if (shape === "circle") return radii.full;
  if (shape === "square") return radii.xs;
  return radii.md;
}

function getSourceIdentity(source: ImageSourcePropType | undefined): unknown {
  if (source && typeof source === "object" && !Array.isArray(source) && "uri" in source) {
    return source.uri;
  }
  return source;
}

interface AvatarContextType {
  size: AvatarSize;
  shape: AvatarShape;
  variant: AvatarVariant;
  innerInset: number;
  hasLoaded: boolean;
  setHasLoaded: (value: boolean) => void;
  hasError: boolean;
  setHasError: (value: boolean) => void;
  inGroup: boolean;
}

const AvatarContext = createContext<AvatarContextType | null>(null);

function useAvatarContext() {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error(
      "Avatar components must be rendered within an Avatar provider",
    );
  }
  return context;
}

const GroupContext = createContext<{
  inGroup: boolean;
  size: AvatarSize;
  shape: AvatarShape;
} | null>(null);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    VariantProps<AvatarVariant>,
    ToneProps<AvatarTone>,
    SizeProps<AvatarSize> {
  shape?: AvatarShape;
  style?: StyleProp<ViewStyle>;
  badge?: React.ReactNode | number | string;
  badgeTone?: AvatarBadgeTone;
  badgePosition?: AvatarBadgePosition;
  badgeStatus?: AvatarStatus;
  maxBadgeCount?: number;
  frame?: React.ReactNode | ImageSourcePropType;
  frameScale?: number;
  children?: React.ReactNode;
}

function AvatarComponent({
  size = "md",
  shape = "circle",
  variant = "default",
  tone = "default",
  style,
  badge,
  badgeTone,
  badgePosition,
  badgeStatus,
  maxBadgeCount,
  frame,
  frameScale,
  children,
  ...props
}: AvatarProps) {
  const { colors, components, radii } = useTheme();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const group = useContext(GroupContext);
  const finalSize = group ? group.size : size;
  const finalShape = group ? group.shape : shape;
  const inGroup = !!group;

  const dimension = resolveAvatarDimension(finalSize);
  const borderRadius = resolveAvatarShapeRadius(finalShape, radii);
  const toneColors = resolveToneColors(tone, colors);

  let borderWidth = 0;
  let borderColor: string | undefined;
  let ringPadding = 0;

  if (variant === "bordered") {
    borderWidth = components.borderWidth.ring;
    borderColor = tone === "default" ? colors.border : toneColors.solid;
  } else if (variant === "ring") {
    borderWidth = components.borderWidth.ring;
    borderColor = tone === "default" ? colors.primary : toneColors.solid;
    ringPadding = 2;
  } else if (inGroup) {
    borderWidth = components.borderWidth.ring;
    borderColor = colors.background;
  }

  const innerInset = ringPadding + borderWidth;

  const rootStyle = useMemo<ViewStyle>(
    () => ({
      position: "relative",
      width: dimension,
      height: dimension,
      borderRadius,
      backgroundColor: colors.backgroundMuted,
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
      ...(borderWidth > 0 ? { borderWidth, borderColor } : null),
    }),
    [borderColor, borderRadius, borderWidth, colors.backgroundMuted, dimension],
  );

  const contextValue = useMemo<AvatarContextType>(
    () => ({
      size: finalSize,
      shape: finalShape,
      variant,
      innerInset,
      hasLoaded,
      setHasLoaded,
      hasError,
      setHasError,
      inGroup,
    }),
    [finalShape, finalSize, hasError, hasLoaded, inGroup, innerInset, variant],
  );

  const isImageSource = (val: unknown): val is ImageSourcePropType => {
    return (
      typeof val === "number" ||
      (typeof val === "object" &&
        val !== null &&
        ("uri" in val || "headers" in val))
    );
  };

  return (
    <AvatarContext.Provider value={contextValue}>
      <View
        accessibilityRole="image"
        style={[rootStyle, style]}
        {...props}
      >
        {children}
        {frame ? (
          isImageSource(frame) ? (
            <AvatarFrame source={frame} scale={frameScale} />
          ) : (
            <AvatarFrame scale={frameScale}>
              {frame as React.ReactNode}
            </AvatarFrame>
          )
        ) : null}
        {badge !== undefined ? (
          <AvatarBadge
            count={
              typeof badge === "number" || typeof badge === "string"
                ? badge
                : undefined
            }
            value={
              typeof badge !== "number" && typeof badge !== "string"
                ? badge
                : undefined
            }
            tone={badgeTone}
            position={badgePosition ?? "top-right"}
            max={maxBadgeCount}
          />
        ) : badgeStatus ? (
          <AvatarBadge
            status={badgeStatus}
            tone={badgeTone}
            position={badgePosition ?? "bottom-right"}
          />
        ) : null}
      </View>
    </AvatarContext.Provider>
  );
}

export const Avatar = React.memo(AvatarComponent);

export interface AvatarImageProps extends Omit<ImageProps, "style"> {
  style?: StyleProp<ImageStyle>;
}

export const AvatarImage = React.memo(function AvatarImage({
  source,
  style,
  onLoad,
  onError,
  ...props
}: AvatarImageProps) {
  const { setHasLoaded, setHasError, hasError, shape, innerInset } =
    useAvatarContext();
  const { radii } = useTheme();
  const sourceKey = getSourceIdentity(source);

  useEffect(() => {
    setHasLoaded(false);
    setHasError(false);
  }, [setHasError, setHasLoaded, sourceKey]);

  if (hasError) {
    return null;
  }

  const handleLoad = (e: Parameters<NonNullable<ImageProps["onLoad"]>>[0]) => {
    setHasLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e: Parameters<NonNullable<ImageProps["onError"]>>[0]) => {
    setHasError(true);
    onError?.(e);
  };

  const baseRadius = resolveAvatarShapeRadius(shape, radii);
  const borderRadius = Math.max(0, baseRadius - innerInset);
  const insetOffset = Math.max(0, innerInset - 2);

  const imageStyle: ImageStyle = {
    position: "absolute",
    top: insetOffset,
    left: insetOffset,
    right: insetOffset,
    bottom: insetOffset,
    borderRadius,
  };

  return (
    <Image
      accessibilityRole="image"
      source={source}
      style={[imageStyle, style]}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
});

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<
  typeof View
> {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

export const AvatarFallback = React.memo(function AvatarFallback({
  style,
  textStyle,
  children,
  ...props
}: AvatarFallbackProps) {
  const { hasLoaded, hasError, size, shape, innerInset } = useAvatarContext();
  const { colors, radii } = useTheme();

  if (hasLoaded && !hasError) {
    return null;
  }

  const baseRadius = resolveAvatarShapeRadius(shape, radii);
  const borderRadius = Math.max(0, baseRadius - innerInset);
  const insetOffset = Math.max(0, innerInset - 2);

  const fallbackStyle: ViewStyle = {
    position: "absolute",
    top: insetOffset,
    left: insetOffset,
    right: insetOffset,
    bottom: insetOffset,
    borderRadius,
    backgroundColor: colors.backgroundMuted,
    alignItems: "center",
    justifyContent: "center",
  };

  const dimension = resolveAvatarDimension(size);
  const fontSize = Math.max(9, Math.round(dimension * 0.36));

  return (
    <View style={[fallbackStyle, style]} {...props}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text
          numberOfLines={1}
          style={[
            {
              color: colors.textMuted,
              fontSize,
              lineHeight: Math.round(fontSize * 1.15),
              fontWeight: "600",
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
});

export interface AvatarBadgeProps
  extends React.ComponentPropsWithoutRef<typeof View>,
    ToneProps<AvatarBadgeTone> {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  status?: AvatarStatus;
  position?: AvatarBadgePosition;
  count?: number | string;
  value?: React.ReactNode;
  max?: number;
  children?: React.ReactNode;
}

export const AvatarBadge = React.memo(function AvatarBadge({
  style,
  textStyle,
  status,
  tone = "danger",
  position,
  count,
  value,
  max = 99,
  children,
  ...props
}: AvatarBadgeProps) {
  const { size, variant } = useAvatarContext();
  const { colors, components, radii } = useTheme();

  const isStatusDot =
    status !== undefined &&
    count === undefined &&
    value === undefined &&
    children === undefined;
  const finalPosition: AvatarBadgePosition =
    position ?? (isStatusDot ? "bottom-right" : "top-right");

  const toneColors = resolveToneColors(tone, colors);

  const statusColor =
    status === "online"
      ? colors.success
      : status === "busy"
        ? colors.danger
        : status === "away"
          ? colors.warning
          : status === "offline"
            ? colors.textMuted
            : toneColors.solid;

  const badgeBg = status ? statusColor : toneColors.solid;
  const dimension = resolveAvatarDimension(size);
  const borderShift = variant !== "default" ? -2 : 0;
  const baseOffset = dimension >= 48 ? 1 : dimension >= 40 ? 0 : -2;
  const offset = baseOffset + borderShift;

  const positionStyle: ViewStyle =
    finalPosition === "top-right"
      ? { top: offset, right: offset }
      : finalPosition === "top-left"
        ? { top: offset, left: offset }
        : finalPosition === "bottom-left"
          ? { bottom: offset, left: offset }
          : { bottom: offset, right: offset };

  if (isStatusDot) {
    const dotSize = Math.max(8, Math.round(dimension * 0.26));

    const dotStyle: ViewStyle = {
      position: "absolute",
      ...positionStyle,
      width: dotSize,
      height: dotSize,
      borderRadius: dotSize / 2,
      backgroundColor: statusColor,
      borderWidth: components.borderWidth.focus,
      borderColor: colors.surface,
      zIndex: 10,
    };

    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={props.accessibilityLabel ?? `Status: ${status}`}
        style={[dotStyle, style]}
        {...props}
      />
    );
  }

  const content =
    children ??
    value ??
    (typeof count === "number"
      ? count > max
        ? `${max}+`
        : String(count)
      : count);

  const isNumericOrShortText =
    typeof content === "string" || typeof content === "number";

  const minBadgeHeight = Math.min(20, Math.max(14, Math.round(dimension * 0.34)));
  const fontSize = Math.min(11, Math.max(8, Math.round(dimension * 0.2)));

  const customBadgeStyle: ViewStyle = {
    position: "absolute",
    ...positionStyle,
    minWidth: minBadgeHeight,
    height: minBadgeHeight,
    paddingHorizontal: isNumericOrShortText ? 5 : 2,
    borderRadius: radii.full,
    backgroundColor: badgeBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: components.borderWidth.focus,
    borderColor: colors.surface,
    zIndex: 10,
  };

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={
        props.accessibilityLabel ??
        (isNumericOrShortText ? `Notification count ${content}` : undefined)
      }
      style={[customBadgeStyle, style]}
      {...props}
    >
      {isNumericOrShortText ? (
        <Text
          numberOfLines={1}
          style={[
            {
              color: toneColors.on,
              fontSize,
              fontWeight: "700",
              lineHeight: fontSize + 2,
              includeFontPadding: false,
              textAlign: "center",
            },
            textStyle,
          ]}
        >
          {content}
        </Text>
      ) : (
        content
      )}
    </View>
  );
});

export interface AvatarGroupProps extends React.ComponentPropsWithoutRef<
  typeof View
> {
  size?: AvatarSize;
  shape?: AvatarShape;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const AvatarGroup = React.memo(function AvatarGroup({
  size = "md",
  shape = "circle",
  style,
  children,
  ...props
}: AvatarGroupProps) {
  const dimension = resolveAvatarDimension(size);
  const overlap = -Math.round(dimension * 0.24);
  const groupValue = useMemo(
    () => ({ inGroup: true, size, shape }),
    [shape, size],
  );
  const childCount = React.Children.count(children);

  return (
    <GroupContext.Provider value={groupValue}>
      <View
        accessibilityRole="list"
        style={[{ flexDirection: "row", alignItems: "center" }, style]}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement<{ style?: StyleProp<ViewStyle> }>(child)) {
            return child;
          }

          return React.cloneElement(child, {
            style: [
              {
                marginLeft: index === 0 ? 0 : overlap,
                zIndex: childCount - index,
              },
              child.props.style,
            ],
          });
        })}
      </View>
    </GroupContext.Provider>
  );
});

export interface AvatarGroupCountProps extends React.ComponentPropsWithoutRef<
  typeof View
> {
  count: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const AvatarGroupCount = React.memo(function AvatarGroupCount({
  count,
  style,
  textStyle,
  ...props
}: AvatarGroupCountProps) {
  const { colors, components, radii } = useTheme();
  const group = useContext(GroupContext);
  const size = group ? group.size : "md";
  const shape = group ? group.shape : "circle";

  const dimension = resolveAvatarDimension(size);
  const overlap = group ? -Math.round(dimension * 0.24) : 0;
  const fontSize = Math.max(10, Math.round(dimension * 0.33));
  const borderRadius = resolveAvatarShapeRadius(shape, radii);

  const countStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius,
    backgroundColor: colors.backgroundMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: components.borderWidth.ring,
    borderColor: colors.background,
    marginLeft: overlap,
  };

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Plus ${count} more`}
      style={[countStyle, style]}
      {...props}
    >
      <Text
        numberOfLines={1}
        style={[
          {
            color: colors.textMuted,
            fontSize,
            lineHeight: Math.round(fontSize * 1.15),
            fontWeight: "600",
          },
          textStyle,
        ]}
      >
        +{count}
      </Text>
    </View>
  );
});

export interface AvatarFrameProps
  extends Omit<React.ComponentPropsWithoutRef<typeof View>, "style"> {
  source?: ImageSourcePropType;
  scale?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  children?: React.ReactNode;
}

export const AvatarFrame = React.memo(function AvatarFrame({
  source,
  scale = 1.3,
  style,
  imageStyle,
  children,
  ...props
}: AvatarFrameProps) {
  const { size } = useAvatarContext();
  const dimension = resolveAvatarDimension(size);
  const frameDimension = dimension * scale;
  const frameOffset = (dimension - frameDimension) / 2;

  const frameStyle: ViewStyle = {
    position: "absolute",
    top: frameOffset,
    left: frameOffset,
    width: frameDimension,
    height: frameDimension,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
  };

  return (
    <View style={[frameStyle, style]} pointerEvents="none" {...props}>
      {source ? (
        <Image
          source={source}
          style={[
            {
              width: "100%",
              height: "100%",
              resizeMode: "contain",
            },
            imageStyle,
          ]}
        />
      ) : null}
      {children}
    </View>
  );
});
