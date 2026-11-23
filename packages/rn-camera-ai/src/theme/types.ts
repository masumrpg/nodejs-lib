/**
 * Neutral theme tokens contract for @masumdev/rn-camera-ai.
 * This contract has zero dependencies on any UI library.
 */

export interface CameraAITheme {
  /**
   * Primary accent color: Bounding box border, active action button, analyzing indicator.
   * Defaults to '#3da441'.
   */
  primary?: string;

  /**
   * Warning accent color: Unrecognized face bounding box, repositioning guide, scanner laser beam.
   * Defaults to '#f59e0b'.
   */
  warning?: string;

  /**
   * Success accent color: Optimal document alignment, verified identity match, ready status badge.
   * Defaults to '#22c55e'.
   */
  success?: string;

  /**
   * Information / Secondary accent color: Facial landmarks, dense 468 mesh contour lines and dots.
   * Defaults to '#38bdf8'.
   */
  info?: string;

  /**
   * Tertiary / High-visibility accent color: Eye contour rings and pupil tracking dots.
   * Defaults to '#22d3ee'.
   */
  accent?: string;

  /**
   * Muted text and guide color: Searching document state, subtext, inactive indicators.
   * Defaults to '#94a3b8'.
   */
  muted?: string;

  /**
   * Background color: Camera container and screen fallback background.
   * Defaults to '#000000'.
   */
  background?: string;

  /**
   * Surface color: Permission fallback card, HUD card surface.
   * Defaults to '#1e293b'.
   */
  surface?: string;

  /**
   * Primary text color on surface and fallback screens.
   * Defaults to '#f8fafc'.
   */
  text?: string;

  /**
   * Light/contrast text color for badge labels and filled buttons.
   * Defaults to '#ffffff'.
   */
  textLight?: string;

  /**
   * Border color for cards, buttons, and HUD panels.
   * Defaults to '#334155'.
   */
  border?: string;

  /**
   * Translucent backdrop mask: Document guide veil outside fitted paper, scanner analyzing backdrop.
   * Defaults to 'rgba(5, 22, 30, 0.50)'.
   */
  mask?: string;
}

/**
 * Loose shape representing arbitrary theme colors from an external UI kit (e.g. @masumdev/rn-ui).
 */
export interface ThemeColorsLike {
  primary?: string;
  warning?: string;
  success?: string;
  accent?: string;
  info?: string;
  text?: string;
  textMuted?: string;
  textLight?: string;
  muted?: string;
  background?: string;
  surface?: string;
  border?: string;
  backdrop?: string;
  mask?: string;
  [key: string]: string | undefined;
}

export const DEFAULT_CAMERA_THEME: Required<CameraAITheme> = {
  primary: '#3da441',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#38bdf8',
  accent: '#22d3ee',
  muted: '#94a3b8',
  background: '#000000',
  surface: '#1e293b',
  text: '#f8fafc',
  textLight: '#ffffff',
  border: '#334155',
  mask: 'rgba(5, 22, 30, 0.50)',
};
