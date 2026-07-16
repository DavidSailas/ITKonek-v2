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

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Acceptance of Terms">
          By registering as a technician and accessing or using the platform,
          you agree to be bound by these Terms of Service. If you do not agree
          to these terms, you may not use the platform.
        </Section>

        <Section title="2. Technician Eligibility">
          You must provide accurate, current, and complete information during
          registration, including identity verification and clearance documents.
          Continued access to job opportunities is conditioned on maintaining
          valid certifications and clearances as required by the platform.
        </Section>

        <Section title="3. Independent Contractor Status">
          You acknowledge that you are an independent contractor and not an
          employee of the platform. You are responsible for your own taxes,
          insurance, tools, and compliance with applicable local laws and
          regulations governing your trade.
        </Section>

        <Section title="4. Job Acceptance & Conduct">
          Toggling your availability to "Online" indicates you are ready to
          accept job requests. You agree to perform accepted jobs
          professionally, safely, and in accordance with any applicable
          licensing requirements. Repeated cancellations, no-shows, or reports
          of misconduct may result in suspension or termination of your account.
        </Section>

        <Section title="5. Payments & Payouts">
          Earnings are calculated based on completed jobs and disbursed to your
          registered payout method, subject to any applicable platform fees. You
          are responsible for reviewing your transaction history for accuracy.
        </Section>

        <Section title="6. Compliance & Background Checks">
          You consent to background verification, including clearance checks, as
          a condition of maintaining active status on the platform. The platform
          reserves the right to suspend accounts pending re-verification.
        </Section>

        <Section title="7. Termination">
          Either party may terminate this agreement at any time. The platform
          reserves the right to suspend or deactivate your account for
          violations of these terms, safety concerns, or fraudulent activity.
        </Section>

        <Section title="8. Limitation of Liability">
          The platform is not liable for indirect, incidental, or consequential
          damages arising from your use of the platform or performance of jobs,
          to the fullest extent permitted by law.
        </Section>

        <Section title="9. Changes to These Terms">
          These terms may be updated from time to time. Continued use of the
          platform after changes take effect constitutes acceptance of the
          revised terms.
        </Section>

        <Section title="10. Contact">
          Questions about these Terms of Service can be sent through the Send
          Feedback screen or to the support email listed on the Help page.
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
