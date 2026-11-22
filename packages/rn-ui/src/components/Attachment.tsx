import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../theme";
import { AspectRatio } from "./AspectRatio";
import { Text } from "./Text";
import {
  minTouchHitSlop,
  renderIcon,
  type RenderIcon,
  type ThemeColorName,
} from "./types";

export type AttachmentLayout = "card" | "row";
export type AttachmentDescriptionTone =
  | "default"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface AttachmentProps
  extends Omit<PressableProps, "style" | "children"> {
  layout?: AttachmentLayout;
  name: string;
  description?: string;
  thumbnail?: string | RenderIcon;
  fileIcon?: RenderIcon;
  descriptionTone?: AttachmentDescriptionTone;
  loading?: boolean;
  onRemove?: () => void;
  closeIcon?: RenderIcon;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  nameStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}

const DESCRIPTION_TONES: Record<AttachmentDescriptionTone, ThemeColorName> = {
  default: "textMuted",
  info: "info",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export const Attachment = React.memo(function Attachment({
  layout = "row",
  name,
  description,
  thumbnail,
  loading = false,
  onRemove,
  closeIcon,
  fileIcon,
  descriptionTone = "default",
  onPress,
  style,
  nameStyle,
  descriptionStyle,
  ...props
}: AttachmentProps) {
  const { colors, components, radii, shadows, spacing } = useTheme();
  const descColor = colors[DESCRIPTION_TONES[descriptionTone]];

  const renderRemoveButton = (size: number, iconStroke = colors.textMuted) => {
    if (!onRemove) return null;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${name}`}
        hitSlop={minTouchHitSlop(24)}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeButton,
          {
            padding: spacing.xxs,
            borderRadius: radii.full,
            opacity: pressed ? 0.65 : 1,
          },
        ]}
      >
        {closeIcon ? (
          renderIcon(closeIcon, iconStroke, size)
        ) : (
          <Svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconStroke}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M18 6L6 18M6 6l12 12" />
          </Svg>
        )}
      </Pressable>
    );
  };

  const renderThumbnail = (fixedSize?: number) => {
    const dimensionStyle =
      fixedSize !== undefined
        ? { width: fixedSize, height: fixedSize }
        : styles.fill;
    const iconSize = fixedSize !== undefined ? fixedSize * 0.5 : 28;

    if (loading) {
      return (
        <View
          style={[
            styles.thumbnailPlaceholder,
            dimensionStyle,
            {
              backgroundColor: colors.backgroundMuted,
              borderRadius: radii.md,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      );
    }

    if (typeof thumbnail === "string") {
      return (
        <View
          style={[
            styles.imageWrapper,
            dimensionStyle,
            { borderRadius: radii.md },
          ]}
        >
          <Image
            source={{ uri: thumbnail }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </View>
      );
    }

    if (thumbnail) {
      return (
        <View
          style={[
            styles.thumbnailPlaceholder,
            dimensionStyle,
            {
              backgroundColor: colors.backgroundMuted,
              borderRadius: radii.md,
            },
          ]}
        >
          {renderIcon(thumbnail, colors.textMuted, iconSize)}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.thumbnailPlaceholder,
          dimensionStyle,
          {
            backgroundColor: colors.backgroundMuted,
            borderRadius: radii.md,
          },
        ]}
      >
        {fileIcon ? (
          renderIcon(fileIcon, colors.textMuted, iconSize)
        ) : (
          <Svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textMuted}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <Path d="M14 2v6h6" />
          </Svg>
        )}
      </View>
    );
  };

  if (layout === "card") {
    return (
      <Pressable
        accessibilityRole={onPress ? "button" : "none"}
        accessibilityLabel={name}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: components.borderWidth.default,
            borderRadius: radii.xl,
            padding: spacing.sm,
            gap: spacing.xs,
            opacity: pressed ? 0.85 : 1,
          },
          shadows.sm,
          style,
        ]}
        {...props}
      >
        <View style={styles.cardMediaWrap}>
          <AspectRatio ratio={1} radius="md">
            {renderThumbnail()}
          </AspectRatio>
          {onRemove ? (
            <View
              style={[
                styles.cardRemoveBadge,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: components.borderWidth.hairline,
                  borderRadius: radii.full,
                },
                shadows.sm,
              ]}
            >
              {renderRemoveButton(12, colors.text)}
            </View>
          ) : null}
        </View>

        <View style={styles.textContainer}>
          <Text
            variant="labelSmall"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[{ color: colors.text }, nameStyle]}
          >
            {name}
          </Text>
          {description ? (
            <Text
              variant="caption"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[{ color: descColor }, descriptionStyle]}
            >
              {description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "none"}
      accessibilityLabel={name}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: components.borderWidth.default,
          borderRadius: radii.xl,
          padding: spacing.md,
          gap: spacing.md,
          opacity: pressed ? 0.88 : 1,
        },
        shadows.sm,
        style,
      ]}
      {...props}
    >
      {renderThumbnail(40)}

      <View style={[styles.textContainer, styles.flexOne]}>
        <Text
          variant="label"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[{ color: colors.text }, nameStyle]}
        >
          {name}
        </Text>
        {description ? (
          <Text
            variant="bodySmall"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[{ color: descColor }, descriptionStyle]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      {renderRemoveButton(16)}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
  imageWrapper: {
    overflow: "hidden",
  },
  thumbnailPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    justifyContent: "center",
  },
  flexOne: {
    flex: 1,
  },
  card: {
    width: 120,
  },
  cardMediaWrap: {
    position: "relative",
    width: "100%",
  },
  cardRemoveBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 2,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
  },
  removeButton: {
    justifyContent: "center",
    alignItems: "center",
  },
});
