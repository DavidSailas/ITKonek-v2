import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
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

const HELP_SECTIONS = [
  {
    title: "Booking & Service",
    questions: [
      {
        q: "How do I cancel a booking?",
        a: "Cancel via 'My Bookings'. If a tech is en route, please call our emergency support line.",
      },
      {
        q: "Can I reschedule?",
        a: "Yes, you can reschedule up to 2 hours before the service in the booking details screen.",
      },
      {
        q: "What if I'm not at home?",
        a: "Please ensure someone is available at your location. If you are delayed, notify the technician directly through the in-app chat.",
      },
    ],
  },
  {
    title: "Pricing & Payments",
    questions: [
      {
        q: "Are there hidden fees?",
        a: "No. Our pricing is transparent. Any additional parts or labor required will be approved by you through the app before work begins.",
      },
      {
        q: "How do I get a receipt?",
        a: "A digital receipt is automatically sent to your registered email address once the job is marked as completed.",
      },
    ],
  },
  {
    title: "Safety & Privacy",
    questions: [
      {
        q: "Are technicians verified?",
        a: "Yes, all ITKonek technicians undergo rigorous background checks and government identity verification.",
      },
      {
        q: "How is my data used?",
        a: "We only use your location to connect you with the nearest tech and improve arrival accuracy. Your data is encrypted and never shared with third parties.",
      },
    ],
  },
  {
    title: "Post-Service",
    questions: [
      {
        q: "Is there a warranty for the repair?",
        a: "Yes, we offer a 7-day service guarantee. If the same issue persists, contact us within this period for a free follow-up visit.",
      },
    ],
  },
];

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with proper spacing for battery/status bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/(tabs)/settings")}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Urgent Support */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => Linking.openURL("contact:+63 993 850 7294")}
        >
          <Ionicons name="alert-circle" size={24} color="#DC2626" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.emergencyTitle}>Urgent Assistance</Text>
            <Text style={styles.emergencySub}>
              Available 24/7 for active bookings
            </Text>
          </View>
        </TouchableOpacity>

        {/* Standard Support */}
        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => Linking.openURL("mailto:support@itkonek.com")}
        >
          <View style={styles.contactIcon}>
            <Ionicons name="mail-outline" size={24} color="#FFF" />
          </View>
          <View>
            <Text style={styles.contactTitle}>Email Support</Text>
            <Text style={styles.contactSubtitle}>Response within 2 hours</Text>
          </View>
        </TouchableOpacity>

        {/* FAQs */}
        {HELP_SECTIONS.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.questions.map((item, qIdx) => (
              <View key={qIdx} style={styles.faqItem}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Text style={styles.faqA}>{item.a}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.versionText}>App Version 1.0.4 (Build 2026)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  title: { fontSize: 20, fontWeight: "800", marginLeft: 10 },
  content: { padding: 20 },
  emergencyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  emergencyTitle: { color: "#991B1B", fontWeight: "700" },
  emergencySub: { color: "#B91C1C", fontSize: 12 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2E2E2E",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  contactTitle: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  contactSubtitle: { color: "#9CA3AF", fontSize: 13 },
  section: { marginBottom: 25 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 15,
    color: "#111827",
  },
  faqItem: { marginBottom: 20 },
  faqQ: { fontWeight: "700", color: "#111827", marginBottom: 5 },
  faqA: { color: "#6B7280", lineHeight: 20 },
  versionText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 20,
  },
});
