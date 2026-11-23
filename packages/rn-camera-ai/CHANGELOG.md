# Changelog

All notable changes to **@masumdev/rn-camera-ai** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-11-23

### Added
- **Optional Design System Theme Token Binding**: Added neutral theme tokens contract (`CameraAITheme`, `ThemeColorsLike`, and `DEFAULT_CAMERA_THEME`) in `src/theme/types.ts` with zero forced coupling to any external UI library.
- **Dynamic Theme Adapter (`createCameraAIThemeFromTokens`)**: Added utility adapter in `src/theme/adapter.ts` to seamlessly map arbitrary theme color dictionaries (e.g. `@masumdev/rn-ui`'s `useTheme().colors`) into strongly-typed `CameraAITheme` instances with fallback defaults.
- **Context & Hook Infrastructure (`CameraAIThemeProvider`, `useCameraAITheme`)**: Added React Context provider and hook in `src/theme/context.tsx` allowing applications to set global camera overlay themes without manually threading props.
- **Direct Overlay Child Binding**:
  - `CameraAI`: Passes resolved `activeTheme` to child overlays and background worklet thread configuration.
  - `DetectionOverlay`: Dynamically binds box colors, unrecognized face highlights, 468-point face mesh lines, tesselation, and landmark dots to active theme tokens.
  - `DocumentGuideOverlay`: Dynamically binds corner brackets, readiness state colors (`optimal`, `adjusting`, `analyzing`, `searching`), and outer vignette mask.
  - `ScannerAnimationOverlay`: Dynamically binds reticle corner brackets, laser sweep beam, and analyzing tint veil.
  - `PermissionFallbackView`: Dynamically binds card surface, text, border, and primary action button to active theme.
- **Unit Test Suite**: Added 5 comprehensive theme tests in `test/theme.test.ts` validating token resolution, partial token fallback, adapter output, and context provider hierarchy.

## [0.3.0] - 2026-11-22

### Added
- **Label Collision Suppression (`avoidLabelOverlap`)**: Added collision avoidance inside `computeVisibleLabelIndices` on `DetectionOverlay`, suppressing overlapping label badges in dense text and document scenes.
- **Still Photo Capture Pipeline**: Added `captureMode="photo"` and `capturePhoto()` imperative ref API on `CameraAI` with configurable `photoResolution` and `photoQualityPrioritization`.

### Fixed
- **Reanimated 4 UI Thread Constants**: Migrated dynamic dimension and theme constants inside `DocumentGuideOverlay` and `ScannerAnimationOverlay` to synced `SharedValue`s, eliminating native dependency-array warnings.
- **Worklet Coordinate Projection**: Fixed letterbox and pillarbox coordinate offset math under portrait-upside-down and mirrored sensor orientations.

## [0.2.0] - 2026-11-22

### Added
- **468-Point 3D Face Mesh Wireframe**: Added MediaPipe facial mesh contour line rendering (eyes, brows, lips, nose, face oval) and interior triangle tesselation web.
- **Document Alignment Overlay (`DocumentGuideOverlay`)**: Added animated 4-corner quadrilateral tracking paper bounds with dynamic readiness state indicator.
- **Laser Scanner Overlay (`ScannerAnimationOverlay`)**: Added zero-bounce Reanimated 4 laser beam sweep and reticle corner brackets with shutter flash effect.

## [0.1.0] - 2026-11-15

### Added
- **Initial Release**: Unified React Native Vision Camera v5 preview, background frame worklet processing, zero-JS-thread coordinate normalization (`[0..1]`), and declarative bounding box overlays (`DetectionOverlay`).
