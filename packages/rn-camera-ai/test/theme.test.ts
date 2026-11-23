import { describe, expect, it } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CameraAIThemeProvider,
  createCameraAIThemeFromTokens,
  DEFAULT_CAMERA_THEME,
  useCameraAITheme,
} from '../src/theme';
import type { CameraAITheme, ThemeColorsLike } from '../src/theme/types';

describe('rn-camera-ai Theme System', () => {
  it('exposes robust default camera theme values', () => {
    expect(DEFAULT_CAMERA_THEME.primary).toBe('#3da441');
    expect(DEFAULT_CAMERA_THEME.warning).toBe('#f59e0b');
    expect(DEFAULT_CAMERA_THEME.success).toBe('#22c55e');
    expect(DEFAULT_CAMERA_THEME.info).toBe('#38bdf8');
    expect(DEFAULT_CAMERA_THEME.background).toBe('#000000');
    expect(DEFAULT_CAMERA_THEME.surface).toBe('#1e293b');
  });

  it('adapts rn-ui design tokens cleanly with createCameraAIThemeFromTokens', () => {
    const mockRnUiTokens: ThemeColorsLike = {
      primary: '#ec4899',
      warning: '#eab308',
      success: '#10b981',
      accent: '#a855f7',
      surface: '#18181b',
      background: '#09090b',
      border: '#27272a',
      text: '#fafafa',
      textMuted: '#71717a',
      textLight: '#ffffff',
    };

    const adapted = createCameraAIThemeFromTokens(mockRnUiTokens);

    expect(adapted.primary).toBe('#ec4899');
    expect(adapted.warning).toBe('#eab308');
    expect(adapted.success).toBe('#10b981');
    expect(adapted.accent).toBe('#a855f7');
    expect(adapted.info).toBe('#a855f7');
    expect(adapted.surface).toBe('#18181b');
    expect(adapted.background).toBe('#09090b');
    expect(adapted.border).toBe('#27272a');
    expect(adapted.text).toBe('#fafafa');
    expect(adapted.muted).toBe('#71717a');
    expect(adapted.textLight).toBe('#ffffff');
    expect(adapted.mask).toBe('#09090ba6');
  });

  it('safely falls back to default values when partial tokens are provided', () => {
    const partialTokens: ThemeColorsLike = {
      primary: '#3b82f6',
    };

    const adapted = createCameraAIThemeFromTokens(partialTokens);

    expect(adapted.primary).toBe('#3b82f6');
    expect(adapted.warning).toBe(DEFAULT_CAMERA_THEME.warning);
    expect(adapted.success).toBe(DEFAULT_CAMERA_THEME.success);
    expect(adapted.surface).toBe(DEFAULT_CAMERA_THEME.surface);
    expect(adapted.background).toBe(DEFAULT_CAMERA_THEME.background);
  });

  it('returns undefined from useCameraAITheme when not wrapped in provider', () => {
    let capturedTheme: CameraAITheme | undefined = DEFAULT_CAMERA_THEME;
    const TestComponent = () => {
      capturedTheme = useCameraAITheme();
      return React.createElement('div');
    };
    renderToStaticMarkup(React.createElement(TestComponent));
    expect(capturedTheme).toBeUndefined();
  });

  it('provides active theme through CameraAIThemeProvider context', () => {
    let capturedTheme: CameraAITheme | undefined;
    const TestComponent = () => {
      capturedTheme = useCameraAITheme();
      return React.createElement('div');
    };
    const customTheme: CameraAITheme = {
      ...DEFAULT_CAMERA_THEME,
      primary: '#f43f5e',
    };

    renderToStaticMarkup(
      React.createElement(
        CameraAIThemeProvider,
        { theme: customTheme },
        React.createElement(TestComponent)
      )
    );
    expect(capturedTheme?.primary).toBe('#f43f5e');
  });
});
