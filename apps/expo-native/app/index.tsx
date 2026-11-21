import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Box,
  ChevronRight,
  Cpu,
  Eye,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react-native";

const EMERALD_ACCENT = "#3da441";
const CYAN_ACCENT = "#38bdf8";
const VIOLET_ACCENT = "#a855f7";

export default function CameraAIFeatureMenuScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleOpenObjectDetection = () => {
    router.push("/object-detection");
  };

  const handleOpenFaceRecognition = () => {
    router.push("/face-recognition");
  };

  const handleOpenLivenessDetection = () => {
    router.push("/liveness-detection");
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        {/* Hero Brand Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Eye size={22} color={EMERALD_ACCENT} />
            </View>
            <View style={styles.heroBadge}>
              <Sparkles size={12} color={EMERALD_ACCENT} />
              <Text style={styles.heroBadgeText}>ON-DEVICE AI</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Camera AI Playground</Text>
          <Text style={styles.heroSubtitle}>
            Pilih mode fitur AI di bawah ini sebelum menyalakan kamera. Semua
            inferensi berjalan 100% lokal di perangkat melalui VisionCamera v5,
            FastTFLite, dan Worklets.
          </Text>

          <View style={styles.specsRow}>
            <View style={styles.specPill}>
              <Zap size={12} color={EMERALD_ACCENT} />
              <Text style={styles.specPillText}>Zero-JS Worklets</Text>
            </View>
            <View style={styles.specPill}>
              <Cpu size={12} color={CYAN_ACCENT} />
              <Text style={styles.specPillText}>GPU / CPU Fallback</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionHeading}>PILIH FITUR KAMERA AI</Text>

        {/* Feature 1: Object Detection */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Object Detection Camera"
          onPress={handleOpenObjectDetection}
          style={({ pressed }) => [
            styles.featureCard,
            styles.featureCardEmerald,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.featureIconWrap, styles.iconWrapEmerald]}>
              <Box size={22} color={EMERALD_ACCENT} />
            </View>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardTagRow}>
                <Text style={[styles.modelTag, { color: EMERALD_ACCENT }]}>
                  COCO SSD MOBILENET V1
                </Text>
                <Text style={styles.resolutionTag}>300x300</Text>
              </View>
              <Text style={styles.cardTitle}>Object Detection</Text>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </View>

          <Text style={styles.cardDescription}>
            Deteksi 80 kategori objek umum (manusia, kendaraan, laptop, HP,
            botol, furnitur, hewan) secara real-time lengkap dengan kontrol
            threshold dan Live FPS.
          </Text>

          <View style={styles.featureBulletsRow}>
            <View style={styles.bulletChip}>
              <Text style={styles.bulletChipText}>80 COCO Classes</Text>
            </View>
            <View style={styles.bulletChip}>
              <Text style={styles.bulletChipText}>Multi-Object Boxes</Text>
            </View>
            <View style={styles.bulletChip}>
              <Text style={styles.bulletChipText}>Live FPS Counter</Text>
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
            styles.featureCardCyan,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.featureIconWrap, styles.iconWrapCyan]}>
              <ScanFace size={22} color={CYAN_ACCENT} />
            </View>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardTagRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.modelTag, { color: CYAN_ACCENT }]}
                >
                  BLAZEFACE + 468 MESH + MOBILEFACENET
                </Text>
                <Text style={styles.resolutionTag}>192x192 · 192-D</Text>
              </View>
              <Text style={styles.cardTitle}>
                Face Detection &amp; Recognition
              </Text>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </View>

          <Text style={styles.cardDescription}>
            Bounding box presisi khusus di area wajah, 468 titik 3D Face Mesh
            (mata, alis, bibir, hidung, kontur rahang), serta pendaftaran &amp;
            pengenalan nama pemilik wajah (192-D MobileFaceNet) secara real-time.
          </Text>

          <View style={styles.featureBulletsRow}>
            <View style={styles.bulletChipCyan}>
              <Text style={styles.bulletChipTextCyan}>468 3D Face Mesh</Text>
            </View>
            <View style={styles.bulletChipCyan}>
              <Text style={styles.bulletChipTextCyan}>192-D MobileFaceNet</Text>
            </View>
            <View style={styles.bulletChipCyan}>
              <Text style={styles.bulletChipTextCyan}>1-Tap Face Enroll</Text>
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
            styles.featureCardViolet,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.featureIconWrap, styles.iconWrapViolet]}>
              <ShieldCheck size={22} color={VIOLET_ACCENT} />
            </View>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardTagRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.modelTag, { color: VIOLET_ACCENT }]}
                >
                  ACTIVE 3D MESH + PASSIVE DEPTH
                </Text>
                <Text style={styles.resolutionTag}>e-KYC</Text>
              </View>
              <Text style={styles.cardTitle}>
                Face Liveness &amp; Anti-Spoofing
              </Text>
            </View>
            <ChevronRight size={20} color="#94a3b8" />
          </View>

          <Text style={styles.cardDescription}>
            Verifikasi keaslian wajah gabungan Active Liveness (deteksi kedip
            mata EAR, buka mulut/senyum MAR, rotasi kepala 3D Yaw/Pitch/Roll)
            dan Passive Anti-Spoofing (3D Z-Depth Relief &amp; Anti-Moiré layar)
            lengkap dengan Wizard Challenge e-KYC 4 tahap.
          </Text>

          <View style={styles.featureBulletsRow}>
            <View style={styles.bulletChipViolet}>
              <Text style={styles.bulletChipTextViolet}>Eye Blink (EAR)</Text>
            </View>
            <View style={styles.bulletChipViolet}>
              <Text style={styles.bulletChipTextViolet}>3D Head Pose</Text>
            </View>
            <View style={styles.bulletChipViolet}>
              <Text style={styles.bulletChipTextViolet}>Passive Anti-Spoof</Text>
            </View>
            <View style={styles.bulletChipViolet}>
              <Text style={styles.bulletChipTextViolet}>e-KYC Wizard</Text>
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
    backgroundColor: "#05161E",
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 16,
  },
  heroCard: {
    backgroundColor: "#0B202A",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(242, 251, 253, 0.12)",
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
    borderRadius: 12,
    backgroundColor: "rgba(61, 164, 65, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(61, 164, 65, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(61, 164, 65, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(61, 164, 65, 0.4)",
  },
  heroBadgeText: {
    color: "#86efac",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 19,
  },
  specsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  specPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#05161E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  specPillText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeading: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  featureCard: {
    backgroundColor: "#0B202A",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  featureCardEmerald: {
    borderColor: "rgba(61, 164, 65, 0.4)",
  },
  featureCardCyan: {
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  featureCardViolet: {
    borderColor: "rgba(168, 85, 247, 0.45)",
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconWrapEmerald: {
    backgroundColor: "rgba(61, 164, 65, 0.16)",
    borderColor: "rgba(61, 164, 65, 0.45)",
  },
  iconWrapCyan: {
    backgroundColor: "rgba(56, 189, 248, 0.16)",
    borderColor: "rgba(56, 189, 248, 0.45)",
  },
  iconWrapViolet: {
    backgroundColor: "rgba(168, 85, 247, 0.16)",
    borderColor: "rgba(168, 85, 247, 0.45)",
  },
  cardTitleGroup: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 8,
    rowGap: 2,
  },
  modelTag: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  resolutionTag: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "700",
  },
  cardDescription: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 19,
  },
  featureBulletsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bulletChip: {
    backgroundColor: "rgba(61, 164, 65, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(61, 164, 65, 0.35)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bulletChipText: {
    color: "#86efac",
    fontSize: 11,
    fontWeight: "600",
  },
  bulletChipCyan: {
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.35)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bulletChipTextCyan: {
    color: "#7dd3fc",
    fontSize: 11,
    fontWeight: "600",
  },
  bulletChipViolet: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.38)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bulletChipTextViolet: {
    color: "#d8b4fe",
    fontSize: 11,
    fontWeight: "600",
  },
});
