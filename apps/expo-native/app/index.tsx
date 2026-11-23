import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Box,
  ChevronRight,
  Compass,
  Cpu,
  Eye,
  Moon,
  Palette,
  ScanFace,
  ScanText,
  ShieldCheck,
  Sun,
  Zap,
} from "lucide-react-native";
import { useTheme, type ColorSchemePreference } from "@masumdev/rn-ui";

interface ThemePresetOption {
  key: string;
  label: string;
  tagline: string;
}

const THEME_PRESETS: readonly ThemePresetOption[] = [
  { key: "default", label: "Default Clean", tagline: "Balanced modern UI" },
  { key: "minimal", label: "Minimal", tagline: "HeroUI 0px borderless" },
  { key: "brutal", label: "Neo-Brutalism", tagline: "High contrast borders" },
  { key: "glass", label: "Vision Glass", tagline: "Translucent glass" },
  { key: "editorial", label: "Editorial", tagline: "Classic serif warmth" },
  { key: "cyber", label: "Cyberpunk", tagline: "Neon high-tech glow" },
];

export default function CameraAIFeatureMenuScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    theme,
    themeName,
    setThemeName,
    setColorScheme,
    resolvedColorScheme,
  } = useTheme();

  const handleOpenObjectDetection = () => {
    router.push("/object-detection");
  };

  const handleOpenFaceRecognition = () => {
    router.push("/face-recognition");
  };

  const handleOpenLivenessDetection = () => {
    router.push("/liveness-detection");
  };

  const handleOpenOcrScanner = () => {
    router.push("/ocr-scanner");
  };

  const handleToggleColorScheme = () => {
    const next: ColorSchemePreference =
      resolvedColorScheme === "dark" ? "light" : "dark";
    setColorScheme(next);
  };

  const isMinimal = themeName === "minimal";
  const borderWidth = theme.components.borderWidth.default;
  const cardRadius = theme.radii.lg ?? 16;
  const pillRadius = theme.radii.full ?? 9999;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 32,
          },
        ]}
      >
        {/* Top Control Bar: Theme Preset & Color Scheme Switcher */}
        <View
          style={[
            styles.themeControlCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth,
              borderRadius: cardRadius,
            },
          ]}
        >
          <View style={styles.themeControlHeader}>
            <View style={styles.themeControlTitleGroup}>
              <Palette size={18} color={theme.colors.primary} />
              <Text style={[styles.themeControlTitle, { color: theme.colors.text }]}>
                Design System Theme
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Toggle color scheme, currently ${resolvedColorScheme}`}
              onPress={handleToggleColorScheme}
              style={({ pressed }) => [
                styles.modeToggleBtn,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: pillRadius,
                },
                pressed && styles.pressedState,
              ]}
            >
              {resolvedColorScheme === "dark" ? (
                <Moon size={14} color={theme.colors.primary} />
              ) : (
                <Sun size={14} color={theme.colors.warning} />
              )}
              <Text
                style={[
                  styles.modeToggleText,
                  { color: theme.colors.text },
                ]}
              >
                {resolvedColorScheme.toUpperCase()}
              </Text>
            </Pressable>
          </View>

          {/* Preset Buttons Grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetScroll}
          >
            {THEME_PRESETS.map((preset) => {
              const isSelected = themeName === preset.key;
              return (
                <Pressable
                  key={preset.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch theme preset to ${preset.label}`}
                  onPress={() => setThemeName(preset.key)}
                  style={({ pressed }) => [
                    styles.presetPill,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.surfaceRaised ?? theme.colors.surface,
                      borderColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.border,
                      borderWidth: isMinimal && !isSelected ? 0 : 1,
                      borderRadius: pillRadius,
                    },
                    pressed && styles.pressedState,
                  ]}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      {
                        color: isSelected
                          ? theme.colors.onPrimary ?? "#ffffff"
                          : theme.colors.text,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Active Palette Preview Swatches */}
          <View
            style={[
              styles.paletteSwatchesRow,
              {
                borderTopColor: isMinimal ? "transparent" : theme.colors.divider ?? theme.colors.border,
                borderTopWidth: isMinimal ? 0 : 1,
              },
            ]}
          >
            <View style={styles.swatchInfo}>
              <Text style={[styles.swatchLabel, { color: theme.colors.textMuted }]}>
                Token Binding:
              </Text>
              <Text style={[styles.swatchThemeName, { color: theme.colors.primary }]}>
                {themeName.toUpperCase()}
              </Text>
            </View>

            <View style={styles.swatchesGroup}>
              <View
                style={[
                  styles.swatchDot,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
              <View
                style={[
                  styles.swatchDot,
                  { backgroundColor: theme.colors.warning },
                ]}
              />
              <View
                style={[
                  styles.swatchDot,
                  { backgroundColor: theme.colors.success },
                ]}
              />
              <View
                style={[
                  styles.swatchDot,
                  { backgroundColor: theme.colors.info ?? theme.colors.accent },
                ]}
              />
              <View
                style={[
                  styles.swatchDot,
                  { backgroundColor: theme.colors.border },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Hero Brand Header */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth,
              borderRadius: cardRadius,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.heroIconBox,
                {
                  backgroundColor: `${theme.colors.primary}18`,
                  borderColor: theme.colors.primary,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: cardRadius * 0.75,
                },
              ]}
            >
              <Eye size={22} color={theme.colors.primary} />
            </View>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: `${theme.colors.primary}1a`,
                  borderColor: theme.colors.primary,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Compass size={12} color={theme.colors.primary} />
              <Text
                style={[
                  styles.heroBadgeText,
                  { color: theme.colors.primary },
                ]}
              >
                ON-DEVICE AI
              </Text>
            </View>
          </View>

          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
            Camera AI Playground
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>
            Pilih mode fitur AI di bawah ini sebelum menyalakan kamera. Semua
            inferensi berjalan 100% lokal di perangkat melalui VisionCamera v5,
            FastTFLite, dan Zero-JS Worklets.
          </Text>

          <View style={styles.specsRow}>
            <View
              style={[
                styles.specPill,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Zap size={12} color={theme.colors.primary} />
              <Text style={[styles.specPillText, { color: theme.colors.text }]}>
                Zero-JS Worklets
              </Text>
            </View>
            <View
              style={[
                styles.specPill,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Cpu size={12} color={theme.colors.info ?? theme.colors.accent} />
              <Text style={[styles.specPillText, { color: theme.colors.text }]}>
                GPU / CPU Fallback
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.sectionHeading,
            { color: theme.colors.textMuted },
          ]}
        >
          PILIH FITUR KAMERA AI
        </Text>

        {/* Feature 1: Object Detection */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Object Detection Camera"
          onPress={handleOpenObjectDetection}
          style={({ pressed }) => [
            styles.featureCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth,
              borderRadius: cardRadius,
            },
            pressed && styles.pressedState,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.featureIconWrap,
                {
                  backgroundColor: `${theme.colors.primary}18`,
                  borderColor: theme.colors.primary,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: cardRadius * 0.7,
                },
              ]}
            >
              <Box size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardTagRow}>
                <Text
                  style={[
                    styles.modelTag,
                    { color: theme.colors.primary },
                  ]}
                >
                  COCO SSD MOBILENET V1
                </Text>
                <Text
                  style={[
                    styles.resolutionTag,
                    {
                      backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                      color: theme.colors.textMuted,
                      borderRadius: 4,
                    },
                  ]}
                >
                  300x300
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Object Detection
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
          </View>

          <Text style={[styles.cardDescription, { color: theme.colors.textMuted }]}>
            Deteksi 80 kategori objek umum secara real-time lengkap dengan kontrol
            threshold, bounding boxes dinamis yang mengikuti tema, dan Live FPS.
          </Text>

          <View style={styles.featureBulletsRow}>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                80 COCO Classes
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                Multi-Object Boxes
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                Live FPS Counter
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Feature 2: Face Detection & Identity Recognition */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Face Detection and Recognition Camera"
          onPress={handleOpenFaceRecognition}
          style={({ pressed }) => [
            styles.featureCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth,
              borderRadius: cardRadius,
            },
            pressed && styles.pressedState,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.featureIconWrap,
                {
                  backgroundColor: `${theme.colors.info ?? theme.colors.primary}18`,
                  borderColor: theme.colors.info ?? theme.colors.primary,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: cardRadius * 0.7,
                },
              ]}
            >
              <ScanFace size={22} color={theme.colors.info ?? theme.colors.primary} />
            </View>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardTagRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.modelTag,
                    { color: theme.colors.info ?? theme.colors.primary },
                  ]}
                >
                  BLAZEFACE + 468 MESH + MOBILEFACENET
                </Text>
                <Text
                  style={[
                    styles.resolutionTag,
                    {
                      backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                      color: theme.colors.textMuted,
                      borderRadius: 4,
                    },
                  ]}
                >
                  192x192 · 192-D
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Face Detection &amp; Recognition
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
          </View>

          <Text style={[styles.cardDescription, { color: theme.colors.textMuted }]}>
            Bounding box presisi khusus di area wajah, 468 titik 3D Face Mesh
            (mata, alis, bibir, hidung, kontur rahang), serta pendaftaran &amp;
            pengenalan nama pemilik wajah (192-D MobileFaceNet) secara real-time.
          </Text>

          <View style={styles.featureBulletsRow}>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                468 3D Face Mesh
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                192-D MobileFaceNet
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                1-Tap Face Enroll
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Feature 3: Hybrid Face Liveness & Anti-Spoofing (e-KYC) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Face Liveness and Anti-Spoofing Camera"
          onPress={handleOpenLivenessDetection}
          style={({ pressed }) => [
            styles.featureCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth,
              borderRadius: cardRadius,
            },
            pressed && styles.pressedState,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.featureIconWrap,
                {
                  backgroundColor: `${theme.colors.warning}18`,
                  borderColor: theme.colors.warning,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: cardRadius * 0.7,
                },
              ]}
            >
              <ShieldCheck size={22} color={theme.colors.warning} />
            </View>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardTagRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.modelTag, { color: theme.colors.warning }]}
                >
                  ACTIVE 3D MESH + PASSIVE DEPTH
                </Text>
                <Text
                  style={[
                    styles.resolutionTag,
                    {
                      backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                      color: theme.colors.textMuted,
                      borderRadius: 4,
                    },
                  ]}
                >
                  e-KYC
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Face Liveness &amp; Anti-Spoofing
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
          </View>

          <Text style={[styles.cardDescription, { color: theme.colors.textMuted }]}>
            Verifikasi keaslian wajah gabungan Active Liveness (deteksi kedip
            mata EAR, buka mulut/senyum MAR, rotasi kepala 3D Yaw/Pitch/Roll)
            dan Passive Anti-Spoofing lengkap dengan Wizard Challenge e-KYC 4 tahap.
          </Text>

          <View style={styles.featureBulletsRow}>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                Eye Blink (EAR)
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                3D Head Pose
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                e-KYC Wizard
              </Text>
            </View>
          </View>
        </Pressable>

        {/* Feature 4: Text Recognition & OCR (Google ML Kit) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open ML Kit OCR Scanner Camera"
          onPress={handleOpenOcrScanner}
          style={({ pressed }) => [
            styles.featureCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth,
              borderRadius: cardRadius,
            },
            pressed && styles.pressedState,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.featureIconWrap,
                {
                  backgroundColor: `${theme.colors.success}18`,
                  borderColor: theme.colors.success,
                  borderWidth: isMinimal ? 0 : 1,
                  borderRadius: cardRadius * 0.7,
                },
              ]}
            >
              <ScanText size={22} color={theme.colors.success} />
            </View>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardTagRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.modelTag, { color: theme.colors.success }]}
                >
                  GOOGLE ML KIT V2 · TEXT RECOGNITION
                </Text>
                <Text
                  style={[
                    styles.resolutionTag,
                    {
                      backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                      color: theme.colors.textMuted,
                      borderRadius: 4,
                    },
                  ]}
                >
                  YUV ZERO-COPY
                </Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                Text Recognition &amp; OCR Scanner
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
          </View>

          <Text style={[styles.cardDescription, { color: theme.colors.textMuted }]}>
            Smart Document Capture Scanner dengan corner brackets yang otomatis
            menyesuaikan sudut kertas, indikator status optimalitas scan, serta
            animasi laser Reanimated 4 saat capture memakai Google ML Kit v2.
          </Text>

          <View style={styles.featureBulletsRow}>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                Google ML Kit v2
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                Paper Corner Fit
              </Text>
            </View>
            <View
              style={[
                styles.bulletChip,
                {
                  backgroundColor: theme.colors.surfaceRaised ?? theme.colors.surface,
                  borderRadius: pillRadius,
                },
              ]}
            >
              <Text style={[styles.bulletChipText, { color: theme.colors.text }]}>
                Theme Overlays
              </Text>
            </View>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  themeControlCard: {
    padding: 16,
    gap: 12,
  },
  themeControlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeControlTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeControlTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  modeToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  presetScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  presetPillText: {
    fontSize: 12,
  },
  paletteSwatchesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  swatchInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  swatchLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  swatchThemeName: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  swatchesGroup: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  heroCard: {
    padding: 18,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIconBox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  specsRow: {
    flexDirection: "row",
    gap: 8,
  },
  specPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  specPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 4,
    marginLeft: 2,
  },
  featureCard: {
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleGroup: {
    flex: 1,
    gap: 2,
  },
  cardTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modelTag: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  resolutionTag: {
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  featureBulletsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bulletChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  bulletChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  pressedState: {
    opacity: 0.85,
  },
});
