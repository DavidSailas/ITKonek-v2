import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const SUPPORT_EMAIL = "support@example.com";
const SUPPORT_PHONE = "+63 900 000 0000";

const FAQS: { question: string; answer: string }[] = [
  {
    question: "How do I go online to start receiving jobs?",
    answer:
      "From the Settings screen, use the availability toggle at the top. Switching it on makes you visible for new job requests in your service area.",
  },
  {
    question: "Why can't I go online?",
    answer:
      "You must have a verified profile and cleared compliance status (NBI and police clearance) before you can accept jobs. Check the Compliance & Clearance screen for your current status.",
  },
  {
    question: "How do I update my service location?",
    answer:
      "Go to Settings > Service Location to update the area where you'd like to receive job requests.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Payouts are sent to your registered payout method on a regular schedule. You can review completed transactions under Settings > Transaction History.",
  },
  {
    question: "How do I change my payout method?",
    answer:
      "Go to Settings > Payout Method to add or update your preferred payout account.",
  },
  {
    question: "How do I update my certifications or specialization?",
    answer:
      "Go to Settings > Professional Details to update your rank, years of experience, specialization, and certification level.",
  },
  {
    question: "I found a bug or have a suggestion — what do I do?",
    answer:
      "Use the Send Feedback screen from Settings to let us know. Include as much detail as you can so we can look into it quickly.",
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

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
        <Text style={styles.headerTitle}>Help</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={styles.card}>
          {FAQS.map((faq, index) => (
            <View key={faq.question}>
              {index > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.faqRow}
                activeOpacity={0.7}
                onPress={() => toggleFaq(index)}
              >
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={openIndex === index ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#555"
                />
              </TouchableOpacity>
              {openIndex === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>CONTACT SUPPORT</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            activeOpacity={0.7}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="mail-outline" size={18} color="#CCC" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
            activeOpacity={0.7}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name="call-outline" size={18} color="#CCC" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Call Support</Text>
              <Text style={styles.contactValue}>{SUPPORT_PHONE}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => router.push("/(technician)/feedback" as any)}
            activeOpacity={0.7}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#CCC"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Send Feedback</Text>
              <Text style={styles.contactValue}>
                Report a bug or share an idea
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#555" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  sectionLabel: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 14,
    marginBottom: 20,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: "#242424" },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  faqQuestion: {
    color: "#EEE",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 10,
  },
  faqAnswer: {
    color: "#999",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1F1F1F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  contactLabel: { color: "#EEE", fontSize: 14, fontWeight: "600" },
  contactValue: { color: "#888", fontSize: 12, marginTop: 2 },
});
