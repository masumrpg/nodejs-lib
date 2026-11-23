import { DEFAULT_CAMERA_THEME, type CameraAITheme, type ThemeColorsLike } from './types';

/**
 * Adapter utility that safely transforms arbitrary theme token dictionaries
 * (e.g. from `@masumdev/rn-ui`'s `useTheme().colors`) into a typed `CameraAITheme`.
 *
 * @param colors Theme token dictionary containing standard semantic color keys.
 * @returns Fully normalized CameraAITheme object.
 */
export function createCameraAIThemeFromTokens(
  colors?: ThemeColorsLike | CameraAITheme
): Required<CameraAITheme> {
  if (!colors) return { ...DEFAULT_CAMERA_THEME };

  const c = colors as ThemeColorsLike;
  return {
    primary: c.primary ?? DEFAULT_CAMERA_THEME.primary,
    warning: c.warning ?? DEFAULT_CAMERA_THEME.warning,
    success: c.success ?? DEFAULT_CAMERA_THEME.success,
    info:
      c.info ??
      c.accent ??
      c.primary ??
      DEFAULT_CAMERA_THEME.info,
    accent: c.accent ?? DEFAULT_CAMERA_THEME.accent,
    muted: c.muted ?? c.textMuted ?? DEFAULT_CAMERA_THEME.muted,
    background: c.background ?? DEFAULT_CAMERA_THEME.background,
    surface: c.surface ?? DEFAULT_CAMERA_THEME.surface,
    text: c.text ?? DEFAULT_CAMERA_THEME.text,
    textLight:
      c.textLight ?? c.text ?? DEFAULT_CAMERA_THEME.textLight,
    border: c.border ?? DEFAULT_CAMERA_THEME.border,
    mask:
      c.mask ??
      c.backdrop ??
      (c.background
        ? `${c.background}a6`
        : DEFAULT_CAMERA_THEME.mask),
  };
}
