import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ServiceCategory {
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
}

const CATEGORIES: ServiceCategory[] = [
  {
    name: "Laptops",
    description: "Screen, battery & repair",
    icon: "laptop-outline",
    color: "#2563EB",
    tint: "#EFF6FF",
  },
  {
    name: "Desktops",
    description: "Hardware & tune-ups",
    icon: "desktop-outline",
    color: "#7C3AED",
    tint: "#F5F3FF",
  },
  {
    name: "Networking",
    description: "Wi-Fi & connectivity",
    icon: "wifi-outline",
    color: "#0891B2",
    tint: "#ECFEFF",
  },
  {
    name: "Mobile",
    description: "Phones & tablets",
    icon: "phone-portrait-outline",
    color: "#DB2777",
    tint: "#FDF2F8",
  },
  {
    name: "Printers",
    description: "Setup & maintenance",
    icon: "print-outline",
    color: "#D97706",
    tint: "#FFFBEB",
  },
];

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }: { item: ServiceCategory }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(customer)/book",
          params: { category: item.name },
        })
      }
    >
      <View style={[styles.iconWrap, { backgroundColor: item.tint }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.serviceText}>{item.name}</Text>
      <Text style={styles.serviceSubtext}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.cardFooterText, { color: item.color }]}>
          Book now
        </Text>
        <Ionicons name="arrow-forward" size={13} color={item.color} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Services</Text>
          <Text style={styles.headerSubtitle}>
            Choose a category to get started
          </Text>
        </View>
      </View>

      <FlatList
        data={CATEGORIES}
        renderItem={renderItem}
        keyExtractor={(item) => item.name}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 2,
  },
  listContainer: { padding: 15, paddingTop: 18 },
  row: { gap: 12 },
  serviceCard: {
    flex: 1,
    marginBottom: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF0F2",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  serviceText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  serviceSubtext: {
    fontSize: 11.5,
    color: "#9CA3AF",
    fontWeight: "500",
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardFooterText: { fontSize: 12, fontWeight: "700" },
});
