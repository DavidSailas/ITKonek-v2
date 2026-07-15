import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const CATEGORIES = ["Laptops", "Desktops", "Networking", "Mobile", "Printers"];

export default function ServicesScreen() {
  const router = useRouter();

  const renderItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() =>
        router.push({
          pathname: "/(customer)/book",
          params: { category: item },
        })
      }
    >
      <Ionicons name="construct-outline" size={24} color="#111827" />
      <Text style={styles.serviceText}>{item} Repair</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Services</Text>
      </View>

      <FlatList
        data={CATEGORIES}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", padding: 20, gap: 15 },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  listContainer: { padding: 15 },
  serviceCard: {
    flex: 1,
    margin: 8,
    padding: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  serviceText: { marginTop: 10, fontWeight: "600", color: "#111827" },
});
