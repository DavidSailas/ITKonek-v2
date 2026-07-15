import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ShopScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ITKonek Shop</Text>
      </View>

      <View style={styles.maintenanceState}>
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={32} color="#111827" />
        </View>
        <Text style={styles.maintenanceTitle}>Coming Soon</Text>
        <Text style={styles.maintenanceText}>
          We are currently stocking our shelves with high-quality components and
          accessories. Stay tuned for the grand opening!
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  maintenanceState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  maintenanceTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  maintenanceText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  backButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
