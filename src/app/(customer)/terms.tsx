import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Section = {
  title: string;
  body: string[];
};

const SECTIONS: Section[] = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By creating an account or booking a service through ITKonek, you agree to these Terms of Service. If you don't agree with any part of these terms, please don't use the app.",
    ],
  },
  {
    title: "2. What ITKonek Does",
    body: [
      "ITKonek connects customers with independent technicians for device and hardware repair services. We facilitate bookings, payments, and communication between you and your assigned technician, but the repair work itself is performed by the technician.",
    ],
  },
  {
    title: "3. Your Account",
    body: [
      "You're responsible for keeping your login details secure and for all activity under your account. Please provide accurate information — your name, contact number, and service address — so technicians can reach you and complete jobs correctly.",
    ],
  },
  {
    title: "4. Bookings & Cancellations",
    body: [
      "When you book a repair, a technician is dispatched based on availability and location. You can cancel or reschedule from the Bookings tab. Repeated late cancellations may affect your ability to book future appointments.",
    ],
  },
  {
    title: "5. Payments",
    body: [
      "Prices shown at booking are estimates and may be adjusted once the technician assesses the issue in person. Any change will be confirmed with you before work continues. Supported payment methods, including GCash and card, are shown at checkout.",
    ],
  },
  {
    title: "6. Technician Conduct",
    body: [
      "Technicians on ITKonek are expected to follow our code of conduct and arrive as scheduled. If something feels off during a visit, you can report it directly from the booking screen and our support team will follow up.",
    ],
  },
  {
    title: "7. Cancellation by ITKonek",
    body: [
      "We may cancel or reassign a booking if a technician becomes unavailable, if we suspect fraudulent activity, or if the request falls outside the services we support. We'll notify you as soon as this happens.",
    ],
  },
  {
    title: "8. Limitation of Liability",
    body: [
      "ITKonek facilitates the connection between you and technicians but is not liable for indirect damages arising from a repair visit. Any warranty on parts or labor is provided by the technician or service partner, as stated on your invoice.",
    ],
  },
  {
    title: "9. Changes to These Terms",
    body: [
      "We may update these terms from time to time. If a change is significant, we'll let you know in the app before it takes effect. Continuing to use ITKonek after an update means you accept the revised terms.",
    ],
  },
  {
    title: "10. Contact Us",
    body: [
      "Questions about these terms? Reach us anytime through the Help section in Settings, or send feedback directly from the app.",
    ],
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
        translucent={false}
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push("/(customer)/(tabs)/settings")}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updatedText}>Last updated: July 2026</Text>
        <Text style={styles.intro}>
          These terms govern your use of ITKonek. Please read them carefully
          before booking a service.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph, idx) => (
              <Text key={idx} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.footerSpacer} />
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
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: { padding: 8 },
  title: { fontSize: 17, fontWeight: "800", color: "#111827" },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  updatedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  intro: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginBottom: 24,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 6,
  },
  footerSpacer: { height: 20 },
});
