import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const LAST_UPDATED = "July 17, 2026";

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/(technician)/(tabs)/settings")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Information We Collect">
          We collect information you provide directly, such as your name,
          contact details, location, avatar, and professional credentials (rank,
          experience, specialization, certifications, and clearance status). We
          also collect data generated through your use of the platform, such as
          availability status, job history, and transactions.
        </Section>

        <Section title="2. How We Use Your Information">
          Your information is used to verify your identity and eligibility,
          match you with job opportunities, process payouts, communicate service
          updates, and maintain the safety and integrity of the platform.
        </Section>

        <Section title="3. Clearance & Background Data">
          Clearance status (such as NBI and police clearance) is collected to
          meet compliance requirements and is only shared with parties directly
          involved in verifying your eligibility to work on the platform.
        </Section>

        <Section title="4. Location Data">
          Your service location and online/offline status are used to match you
          with nearby job requests. You control your visibility through the
          availability toggle in your settings.
        </Section>

        <Section title="5. Sharing of Information">
          We do not sell your personal information. Limited data (such as your
          name, rating, and verification status) may be shared with clients to
          facilitate a job. Data may also be shared with service providers who
          help operate the platform, such as payment processors.
        </Section>

        <Section title="6. Data Security">
          We use industry-standard safeguards to protect your data, including
          encrypted storage and authenticated access controls. No system is
          completely secure, and we encourage you to keep your login credentials
          confidential.
        </Section>

        <Section title="7. Data Retention">
          We retain your information for as long as your account is active or as
          needed to comply with legal, tax, or compliance obligations.
        </Section>

        <Section title="8. Your Choices">
          You can review and update most of your information from the Personal
          Information and Professional Details screens. You may request account
          deletion by contacting support.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy periodically. Material changes will
          be communicated through the app.
        </Section>

        <Section title="10. Contact">
          Privacy questions or requests can be sent through the Send Feedback
          screen or to the support email listed on the Help page.
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  content: { padding: 20, paddingTop: 8, paddingBottom: 60 },
  updated: { color: "#666", fontSize: 12, marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  sectionBody: { color: "#AAA", fontSize: 13, lineHeight: 20 },
});
