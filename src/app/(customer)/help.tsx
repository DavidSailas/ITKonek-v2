import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const FAQS = [
  {
    q: "How do I cancel a booking?",
    a: "You can cancel from the Home screen as long as no technician has accepted the job yet. Once accepted, contact support to make changes.",
  },
  {
    q: "How do I know if my part is compatible?",
    a: "Our technicians confirm compatibility during the diagnostic step before any part is installed.",
  },
  {
    q: "What if I'm not satisfied with the repair?",
    a: "Reach out to support within 7 days of service completion and we'll help make it right.",
  },
];

export default function HelpScreen() {
  const router = useRouter();

  const handleContact = () => {
    Linking.openURL("mailto:support@itkonek.com").catch(() =>
      Alert.alert("Couldn't open email", "Please email support@itkonek.com directly.")
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.contactCard} onPress={handleContact}>
          <View style={styles.contactIcon}>
            <Ionicons name="headset-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactSubtitle}>support@itkonek.com — 24/7</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQS.map((item) => (
          <View key={item.q} style={styles.faqCard}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginLeft: 4 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 28,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2E2E2E",
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  contactSubtitle: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#111827", marginBottom: 12 },
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },
  faqQ: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 6 },
  faqA: { fontSize: 12, color: "#6B7280", lineHeight: 18 },
});
