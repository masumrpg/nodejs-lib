import React from 'react';
import {
  Linking,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useCameraAITheme } from '../theme/context';
import type { CameraAITheme } from '../theme/types';

export interface PermissionFallbackViewProps {
  /** Optional custom title text */
  title?: string;
  /** Optional custom explanatory message */
  message?: string;
  /** Optional action button text */
  buttonText?: string;
  /** Optional custom permission request callback */
  onRequestPermission?: () => void;
  /** Optional custom open settings callback */
  onOpenSettings?: () => void;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
  /** Optional theme override */
  theme?: CameraAITheme;
}

/**
 * Fallback component rendered when camera permission is denied or restricted.
 * Provides explanatory text and a direct button to open system settings.
 */
export const PermissionFallbackView: React.FC<PermissionFallbackViewProps> = ({
  title = 'Camera Permission Required',
  message = 'Camera access is necessary to detect and classify objects in real time. Please grant camera permission in system settings.',
  buttonText = 'Open Settings',
  onRequestPermission,
  onOpenSettings,
  style,
  theme,
}) => {
  const contextTheme = useCameraAITheme();
  const activeTheme = theme ?? contextTheme;

  const handlePress = React.useCallback(async () => {
    if (onRequestPermission) {
      try {
        onRequestPermission();
      } catch {
        // In environment where callback fails, proceed to open settings
      }
    }

    if (onOpenSettings) {
      onOpenSettings();
      return;
    }

    try {
      await Linking.openSettings();
    } catch {
      // In environment where openSettings is unsupported, silently ignore
    }
  }, [onRequestPermission, onOpenSettings]);

  return (
    <View
      style={[
        styles.container,
        activeTheme ? { backgroundColor: activeTheme.background } : null,
        style,
      ]}
    >
      <View
        style={[
          styles.card,
          activeTheme
            ? {
                backgroundColor: activeTheme.surface,
                borderColor: activeTheme.border,
              }
            : null,
        ]}
      >
        <Text
          style={[
            styles.title,
            activeTheme ? { color: activeTheme.text } : null,
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.message,
            activeTheme ? { color: activeTheme.muted } : null,
          ]}
        >
          {message}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonText}
          onPress={handlePress}
          style={({ pressed }) => [
            styles.button,
            activeTheme ? { backgroundColor: activeTheme.primary } : null,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text
            style={[
              styles.buttonText,
              activeTheme ? { color: activeTheme.textLight } : null,
            ]}
          >
            {buttonText}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#94a3b8',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3da441',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
